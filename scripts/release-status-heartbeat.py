#!/usr/bin/env python3
import argparse, datetime, json, os, pathlib, tempfile, time

def alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False

def load_state(path: pathlib.Path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return None

def tail(path: pathlib.Path, count: int = 20):
    try:
        return path.read_text(encoding='utf-8', errors='replace').splitlines()[-count:]
    except Exception:
        return []

def write_snapshot(args, final_rc=None):
    state = load_state(args.state)
    data = {
        'schema': 1,
        'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'pipelinePid': args.pid,
        'pipelineAlive': alive(args.pid),
        'pipelineRc': final_rc,
        'stage': state.get('stage') if isinstance(state, dict) else None,
        'stageStatus': state.get('stage_status') if isinstance(state, dict) else None,
        'statePipelineRc': state.get('pipeline_rc') if isinstance(state, dict) else None,
        'logTail': tail(args.log),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix='release-status-snapshot.', suffix='.tmp', dir=args.output.parent)
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write('\n'); f.flush(); os.fsync(f.fileno())
    os.replace(tmp, args.output)

parser=argparse.ArgumentParser()
parser.add_argument('--pid', type=int, required=True)
parser.add_argument('--state', type=pathlib.Path, required=True)
parser.add_argument('--log', type=pathlib.Path, required=True)
parser.add_argument('--output', type=pathlib.Path, required=True)
parser.add_argument('--interval', type=int, default=120)
parser.add_argument('--once', action='store_true')
parser.add_argument('--final-rc', type=int)
args=parser.parse_args()
write_snapshot(args, args.final_rc)
if not args.once:
    while alive(args.pid):
        time.sleep(max(1, args.interval))
        write_snapshot(args, args.final_rc)
