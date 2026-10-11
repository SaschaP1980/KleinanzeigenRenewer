#!/usr/bin/env bash
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
mkdir -p "$run_dir" "$release_dir"
log="$run_dir/release-finalize.log"
rc_file="$run_dir/release-finalize.rc"
wall_file="$run_dir/release-finalize.wall-ms"
pid_file="$run_dir/release-finalize.pid"
start_ms="$(date +%s%3N)"
echo "$$" > "$pid_file"
finished=0
write_result(){
  local rc="${1:-130}"
  if [[ "$finished" == "1" ]]; then return; fi
  local end_ms
  end_ms="$(date +%s%3N)"
  echo "$rc" > "$rc_file"
  echo "$((end_ms-start_ms))" > "$wall_file"
  finished=1
}
on_signal(){
  write_result 130
  exit 130
}
trap on_signal INT TERM HUP
python3 "$project_dir/scripts/release_finalize.py" \
  --release-dir "$release_dir" \
  --work-dir "$work_dir" \
  --run-dir "$run_dir" > "$log" 2>&1
rc=$?
write_result "$rc"
trap - INT TERM HUP
if [[ "$rc" -eq 0 ]]; then
  if [[ ! -f "$release_dir/RELEASE_GREEN" ]]; then
    echo "release-finalize returned RC0 without RELEASE_GREEN sentinel" >> "$log"
    rc=95
    echo "$rc" > "$rc_file"
  fi
fi
exit "$rc"
