#!/usr/bin/env bash
# End-to-end release orchestration. The final fresh-source E2E is directly chained
# to release-finalize; no interactive/manual gap exists between those stages.
set +e
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
release_dir="${1:-}"
work_dir="${2:-}"
if [[ -z "$release_dir" || -z "$work_dir" ]]; then
  echo "usage: $0 <release-dir> <work-dir>" >&2
  exit 64
fi
version="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' "$project_dir/manifest.json")"
package_version="$(python3 -c 'import json,sys; m=json.load(open(sys.argv[1])); print(m.get("version_name") or m["version"])' "$project_dir/manifest.json")"
tag="v${package_version//./}"
run_dir="$project_dir/.run/$tag"
mkdir -p "$run_dir" "$release_dir" "$work_dir"
state="$release_dir/release-state.json"
policy="${KR_CHROMIUM_POLICY_FILE:-/etc/chromium/policies/managed/000_policy_merge.json}"

write_pipeline_state(){
  local stage="$1" status="$2" rc="${3:-null}"
  python3 - "$state" "$version" "$package_version" "$stage" "$status" "$rc" <<'PY'
import json,os,sys,tempfile,datetime
p,version,package_version,stage,status,rc=sys.argv[1:]
data={}
try: data=json.load(open(p,encoding='utf-8'))
except Exception: pass
data.update({'schema':1,'version':version,'versionName':package_version,'stage':stage,'stage_status':status,'pipeline_updated_at':datetime.datetime.now(datetime.timezone.utc).isoformat()})
data['pipeline_rc']=None if rc=='null' else int(rc)
os.makedirs(os.path.dirname(p),exist_ok=True)
fd,tmp=tempfile.mkstemp(prefix='release-state.',suffix='.tmp',dir=os.path.dirname(p))
with os.fdopen(fd,'w',encoding='utf-8') as f:
    json.dump(data,f,ensure_ascii=False,indent=2,sort_keys=True); f.write('\n'); f.flush(); os.fsync(f.fileno())
os.replace(tmp,p)
PY
}

run_gate(){
  local name="$1"; shift
  local log="$run_dir/$name.log" rc_file="$run_dir/$name.rc" wall_file="$run_dir/$name.wall-ms" pid_file="$run_dir/$name.pid"
  local start end rc
  start="$(date +%s%3N)"
  echo "$$" > "$pid_file"
  "$@" > "$log" 2>&1
  rc=$?
  end="$(date +%s%3N)"
  echo "$rc" > "$rc_file"
  echo "$((end-start))" > "$wall_file"
  return "$rc"
}

write_e2e_evidence(){
  local gate="$1" zip="$2" report="$3" rc_file="$4" wall_file="$5" before="$6" after="$7" out="$8" reused="${9:-false}"
  python3 - "$gate" "$zip" "$report" "$rc_file" "$wall_file" "$before" "$after" "$out" "$reused" <<'PY'
import hashlib,json,sys,pathlib,datetime
(gate,zip_s,report_s,rc_s,wall_s,before_s,after_s,out_s,reused_s)=sys.argv[1:]
def sha(p): return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
report=json.load(open(report_s,encoding='utf-8'))
data={
 'schema':1,'gate':gate,'extensionVersion':report.get('extensionVersion'),
 'testedChromeZip':str(pathlib.Path(zip_s).resolve()),'testedChromeSha256':sha(zip_s),
 'reportPath':str(pathlib.Path(report_s).resolve()),'reportSha256':sha(report_s),
 'rc':int(pathlib.Path(rc_s).read_text().strip()),'wallMs':int(pathlib.Path(wall_s).read_text().strip()),
 'policyBeforeSha256':pathlib.Path(before_s).read_text().strip(),'policyAfterSha256':pathlib.Path(after_s).read_text().strip(),
 'reusedBecauseRuntimeHashIdentical': reused_s.lower()=='true',
 'recordedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()
}
pathlib.Path(out_s).write_text(json.dumps(data,ensure_ascii=False,indent=2,sort_keys=True)+'\n',encoding='utf-8')
PY
}

run_e2e_gate(){
  local name="$1" root="$2" report="$3" evidence="$4" zip="$5"
  local backup="$run_dir/$name.policy.backup" before="$run_dir/$name-policy-before.sha256" after="$run_dir/$name-policy-after.sha256"
  local log="$run_dir/$name.log" rc_file="$run_dir/$name.rc" wall_file="$run_dir/$name.wall-ms" pid_file="$run_dir/$name.pid"
  local start end rc restored=0
  start="$(date +%s%3N)"; echo "$$" > "$pid_file"
  if [[ ! -f "$policy" ]]; then echo "Chromium policy file missing: $policy" > "$log"; echo 94 > "$rc_file"; echo 0 > "$wall_file"; return 94; fi
  sha256sum "$policy" | awk '{print $1}' > "$before"
  cp -p "$policy" "$backup"
  restore_policy(){
    if [[ -f "$backup" ]]; then cp -p "$backup" "$policy"; fi
    sha256sum "$policy" | awk '{print $1}' > "$after" 2>/dev/null || true
    restored=1
  }
  trap restore_policy EXIT INT TERM HUP
  printf '{}\n' > "$policy"
  KR_E2E_EXTENSION_ROOT="$root" node "$project_dir/tests/e2e/run.cjs" --report "$report" > "$log" 2>&1
  rc=$?
  restore_policy
  trap - EXIT INT TERM HUP
  [[ "$(cat "$before" 2>/dev/null)" == "$(cat "$after" 2>/dev/null)" ]] || rc=96
  end="$(date +%s%3N)"; echo "$rc" > "$rc_file"; echo "$((end-start))" > "$wall_file"
  if [[ "$rc" -eq 0 ]]; then write_e2e_evidence "$name" "$zip" "$report" "$rc_file" "$wall_file" "$before" "$after" "$evidence" false; fi
  return "$rc"
}

rm -f "$release_dir/RELEASE_GREEN"
write_pipeline_state source-dirty pending
write_pipeline_state regression running
run_gate release-regression bash -lc "cd '$project_dir' && bash scripts/coverage-gate.sh" || { rc=$?; write_pipeline_state regression failed "$rc"; exit "$rc"; }
write_pipeline_state build running
rm -rf "$release_dir"/kleinanzeigen-renewal-{chrome,source}-v"$package_version".zip
run_gate release-build bash "$project_dir/scripts/build.sh" "$release_dir" || { rc=$?; write_pipeline_state build failed "$rc"; exit "$rc"; }

chrome="$release_dir/kleinanzeigen-renewal-chrome-v$package_version.zip"
source="$release_dir/kleinanzeigen-renewal-source-v$package_version.zip"
packaged_root="$run_dir/e2e-packaged-root-final"
rm -rf "$packaged_root"; mkdir -p "$packaged_root"; unzip -q "$chrome" -d "$packaged_root"
write_pipeline_state packaged-e2e running
run_e2e_gate packaged-e2e "$packaged_root" "$release_dir/Browser-E2E-Packaged-v$package_version.json" "$release_dir/Browser-E2E-Packaged-v$package_version.evidence.json" "$chrome" || { rc=$?; write_pipeline_state packaged-e2e failed "$rc"; exit "$rc"; }

rm -rf "$work_dir/build2-final"; mkdir -p "$work_dir/build2-final"
write_pipeline_state reproducibility-build2 running
run_gate release-build2 bash "$project_dir/scripts/build.sh" "$work_dir/build2-final" || { rc=$?; write_pipeline_state reproducibility-build2 failed "$rc"; exit "$rc"; }

fresh_root="$work_dir/fresh-source-final"
rm -rf "$fresh_root"; mkdir -p "$fresh_root"; unzip -q "$source" -d "$fresh_root"
rm -rf "$work_dir/fresh-build-final"; mkdir -p "$work_dir/fresh-build-final"
write_pipeline_state reproducibility-fresh-build running
run_gate release-fresh-build bash "$fresh_root/scripts/build.sh" "$work_dir/fresh-build-final" || { rc=$?; write_pipeline_state reproducibility-fresh-build failed "$rc"; exit "$rc"; }

for kind in chrome source; do
  a="$release_dir/kleinanzeigen-renewal-$kind-v$package_version.zip"
  b="$work_dir/build2-final/kleinanzeigen-renewal-$kind-v$package_version.zip"
  c="$work_dir/fresh-build-final/kleinanzeigen-renewal-$kind-v$package_version.zip"
  [[ "$(sha256sum "$a" | awk '{print $1}')" == "$(sha256sum "$b" | awk '{print $1}')" && "$(sha256sum "$a" | awk '{print $1}')" == "$(sha256sum "$c" | awk '{print $1}')" ]] || { write_pipeline_state reproducibility failed 93; exit 93; }
done

fresh_chrome="$work_dir/fresh-build-final/kleinanzeigen-renewal-chrome-v$package_version.zip"
fresh_e2e_root="$run_dir/e2e-fresh-root-final"
rm -rf "$fresh_e2e_root"; mkdir -p "$fresh_e2e_root"; unzip -q "$fresh_chrome" -d "$fresh_e2e_root"
write_pipeline_state fresh-packaged-e2e running
run_e2e_gate fresh-packaged-e2e "$fresh_e2e_root" "$release_dir/Browser-E2E-Fresh-Source-Packaged-v$package_version.json" "$release_dir/Browser-E2E-Fresh-Source-Packaged-v$package_version.evidence.json" "$fresh_chrome" || { rc=$?; write_pipeline_state fresh-packaged-e2e failed "$rc"; exit "$rc"; }

# Critical hardening: finalization starts in this same process immediately after Fresh E2E.
write_pipeline_state finalizing running
bash "$project_dir/scripts/release-finalize-gate.sh" "$release_dir" "$work_dir"
rc=$?
if [[ "$rc" -ne 0 ]]; then write_pipeline_state finalizing failed "$rc"; exit "$rc"; fi
[[ -f "$release_dir/RELEASE_GREEN" ]] || { write_pipeline_state finalizing failed 95; exit 95; }
exit 0
