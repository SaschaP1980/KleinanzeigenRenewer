#!/usr/bin/env bash
# Detached release supervisor. Long-running release work must survive a chat/tool
# stream timeout; status checks are intentionally short and never sleep.
set +e
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cmd="${1:-status}"
release_dir="${2:-}"
work_dir="${3:-}"
if [[ -z "$release_dir" || -z "$work_dir" ]]; then
  echo "usage: $0 <start|status> <release-dir> <work-dir>" >&2
  exit 64
fi
version="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' "$project_dir/manifest.json")"
package_version="$(python3 -c 'import json,sys; m=json.load(open(sys.argv[1])); print(m.get("version_name") or m["version"])' "$project_dir/manifest.json")"
tag="v${package_version//./}"
run_dir="$project_dir/.run/$tag"
mkdir -p "$run_dir" "$release_dir" "$work_dir/checkpoints"
pid_file="$run_dir/release-supervisor.pid"
rc_file="$run_dir/release-supervisor.rc"
wall_file="$run_dir/release-supervisor.wall-ms"
log_file="$run_dir/release-supervisor.log"
runner="$run_dir/release-supervisor-worker.sh"
pipeline_pid_file="$run_dir/release-pipeline.pid"
status_snapshot="$run_dir/release-status-snapshot.json"
state="$release_dir/release-state.json"
checkpoint="$work_dir/checkpoints/v$package_version-source-before-release.zip"
checkpoint_sha="$work_dir/checkpoints/v$package_version-source-before-release.sha256"

write_source_dirty_state(){
  python3 - "$state" "$version" "$package_version" <<'PY'
import datetime,json,os,sys,tempfile
p,version,package_version=sys.argv[1:]
data={}
try:data=json.load(open(p,encoding='utf-8'))
except Exception:pass
data.update({'schema':1,'version':version,'versionName':package_version,'stage':'source-dirty','stage_status':'pending','pipeline_rc':None,'pipeline_updated_at':datetime.datetime.now(datetime.timezone.utc).isoformat()})
os.makedirs(os.path.dirname(p),exist_ok=True)
fd,tmp=tempfile.mkstemp(prefix='release-state.',suffix='.tmp',dir=os.path.dirname(p))
with os.fdopen(fd,'w',encoding='utf-8') as f:
    json.dump(data,f,ensure_ascii=False,indent=2,sort_keys=True);f.write('\n');f.flush();os.fsync(f.fileno())
os.replace(tmp,p)
PY
}

case "$cmd" in
  start)
    if [[ -f "$pid_file" && ! -f "$rc_file" ]]; then
      old_pid="$(cat "$pid_file" 2>/dev/null)"
      if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
        echo "release supervisor already running pid=$old_pid" >&2
        exit 73
      fi
    fi
    rm -f "$rc_file" "$wall_file" "$release_dir/RELEASE_GREEN"
    write_source_dirty_state || exit $?

    checkpoint_tmp="$work_dir/checkpoints/.pre-release-package"
    rm -rf "$checkpoint_tmp"; mkdir -p "$checkpoint_tmp"
    python3 "$project_dir/scripts/package.py" "$checkpoint_tmp" > "$run_dir/release-source-checkpoint.log" 2>&1
    checkpoint_rc=$?
    if [[ "$checkpoint_rc" -ne 0 ]]; then
      echo "$checkpoint_rc" > "$run_dir/release-source-checkpoint.rc"
      exit "$checkpoint_rc"
    fi
    cp "$checkpoint_tmp/kleinanzeigen-renewal-source-v$package_version.zip" "$checkpoint"
    sha256sum "$checkpoint" | awk '{print $1}' > "$checkpoint_sha"
    rm -rf "$checkpoint_tmp"

    cat > "$runner" <<RUNNER
#!/usr/bin/env bash
set +e
start_ms="\$(date +%s%3N)"
echo "\$\$" > $(printf '%q' "$pid_file")
bash $(printf '%q' "$project_dir/scripts/release-pipeline.sh") $(printf '%q' "$release_dir") $(printf '%q' "$work_dir") > $(printf '%q' "$log_file") 2>&1 &
pipeline_pid=\$!
echo "\$pipeline_pid" > $(printf '%q' "$pipeline_pid_file")
python3 $(printf '%q' "$project_dir/scripts/release-status-heartbeat.py") --pid "\$pipeline_pid" --state $(printf '%q' "$state") --log $(printf '%q' "$log_file") --output $(printf '%q' "$status_snapshot") --interval 120 &
heartbeat_pid=\$!
wait "\$pipeline_pid"
rc=\$?
kill "\$heartbeat_pid" 2>/dev/null || true
wait "\$heartbeat_pid" 2>/dev/null || true
python3 $(printf '%q' "$project_dir/scripts/release-status-heartbeat.py") --pid "\$pipeline_pid" --state $(printf '%q' "$state") --log $(printf '%q' "$log_file") --output $(printf '%q' "$status_snapshot") --once --final-rc "\$rc" >/dev/null 2>&1 || true
end_ms="\$(date +%s%3N)"
echo "\$rc" > $(printf '%q' "$rc_file")
echo "\$((end_ms-start_ms))" > $(printf '%q' "$wall_file")
exit "\$rc"
RUNNER
    nohup setsid bash "$runner" </dev/null >/dev/null 2>&1 &
    launched_pid=$!
    echo "$launched_pid" > "$pid_file"
    printf 'started pid=%s source_checkpoint=%s source_sha256=%s\n' "$launched_pid" "$checkpoint" "$(cat "$checkpoint_sha")"
    ;;
  status)
    pid="$(cat "$pid_file" 2>/dev/null)"
    if [[ -f "$rc_file" ]]; then
      printf 'status=finished pid=%s rc=%s wall_ms=%s\n' "$pid" "$(cat "$rc_file")" "$(cat "$wall_file" 2>/dev/null)"
    elif [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      printf 'status=running pid=%s\n' "$pid"
    elif [[ -n "$pid" ]]; then
      printf 'status=aborted-or-lost pid=%s rc=missing\n' "$pid"
    else
      printf 'status=not-started\n'
    fi
    if [[ -f "$state" ]]; then
      python3 - "$state" <<'PY'
import json,sys
try:
 d=json.load(open(sys.argv[1],encoding='utf-8'));print(f"stage={d.get('stage')} stage_status={d.get('stage_status')} pipeline_rc={d.get('pipeline_rc')}")
except Exception as e: print(f"stage_state_error={e}")
PY
    fi
    if [[ -f "$status_snapshot" ]]; then
      echo '--- persistent snapshot ---'
      python3 - "$status_snapshot" <<'PY'
import json,sys
try:
 d=json.load(open(sys.argv[1],encoding='utf-8'));print(f"checked_at={d.get('checkedAt')} pipeline_pid={d.get('pipelinePid')} pipeline_alive={d.get('pipelineAlive')} snapshot_stage={d.get('stage')} snapshot_status={d.get('stageStatus')} snapshot_rc={d.get('pipelineRc')}")
except Exception as e: print(f"snapshot_error={e}")
PY
    fi
    if [[ -f "$log_file" ]]; then
      echo '--- log tail ---'
      tail -n 20 "$log_file"
    fi
    ;;
  *) echo "unknown command: $cmd" >&2; exit 64 ;;
esac
