#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import platform
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHILD = Path(__file__).with_name('run_browser_e2e.py')
SCENARIOS = [
    'boot-mv3', 'service-worker-restart', 'bulk-runtime-lease-recovery',
    'accordion-rapid-toggle', 'app-close-reopen-persistence', 'profile-switch-action-lock',
    'worker-tab-unexpected-close', 'bottom-clamp-four-views', 'remote-safety-negative',
]


def read_json(path: Path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return None


def terminate_process_tree(process: subprocess.Popen) -> bool:
    if process.poll() is not None:
        return True
    try:
        if os.name == 'nt':
            result = subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], capture_output=True, text=True, timeout=10)
            return result.returncode == 0 or process.poll() is not None
        os.killpg(process.pid, signal.SIGTERM)
        try:
            process.wait(timeout=3)
            return True
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait(timeout=3)
            return True
    except Exception:
        try:
            process.kill()
            process.wait(timeout=3)
            return True
        except Exception:
            return False


def run_scenario(name: str, args) -> dict:
    started = time.time()
    with tempfile.TemporaryDirectory(prefix=f'kr-e2e-supervisor-{name}-') as scratch:
        scratch_path = Path(scratch)
        child_report = scratch_path / 'child-report.json'
        child_log = scratch_path / 'child.log'
        profile_parent = scratch_path / 'profiles'
        profile_parent.mkdir(parents=True, exist_ok=True)
        child_script = Path(os.environ.get('KR_E2E_CHILD_SCRIPT') or CHILD)
        cmd = [sys.executable, str(child_script), '--scenario', name, '--report', str(child_report)]
        if args.browser:
            cmd += ['--browser', args.browser]
        if args.headed:
            cmd.append('--headed')
        env = os.environ.copy()
        env['KR_E2E_PROFILE_PARENT'] = str(profile_parent)
        popen_kwargs = dict(cwd=str(ROOT), env=env)
        if os.name == 'nt':
            popen_kwargs['creationflags'] = subprocess.CREATE_NEW_PROCESS_GROUP
        else:
            popen_kwargs['start_new_session'] = True
        with child_log.open('w', encoding='utf-8') as log:
            process = subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT, text=True, **popen_kwargs)
            checkpoint_at = None
            checkpoint_result = None
            cleanup_status = None
            force_kill_succeeded = None
            while True:
                current = read_json(child_report)
                if current and current.get('results'):
                    checkpoint_result = current['results'][-1]
                    if checkpoint_at is None:
                        checkpoint_at = time.time()
                rc = process.poll()
                now = time.time()
                if rc is not None:
                    cleanup_status = 'PASS'
                    break
                if checkpoint_at is not None and now - checkpoint_at >= args.cleanup_timeout:
                    force_kill_succeeded = terminate_process_tree(process)
                    cleanup_status = 'TIMEOUT' if force_kill_succeeded else 'FAILED'
                    break
                if checkpoint_at is None and now - started >= args.scenario_timeout:
                    force_kill_succeeded = terminate_process_tree(process)
                    cleanup_status = 'FORCED' if force_kill_succeeded else 'FAILED'
                    break
                time.sleep(0.05)
        logs = child_log.read_text(encoding='utf-8', errors='replace')[-12000:]
        if checkpoint_result:
            scenario_status = checkpoint_result.get('status', 'FAIL')
            details = checkpoint_result.get('details')
            error = checkpoint_result.get('error')
        else:
            rc = process.poll()
            scenario_status = 'TIMEOUT' if cleanup_status == 'FORCED' else ('INFRA' if rc == 2 else 'FAIL')
            details = None
            error = f'Kein Szenario-Checkpoint vor Prozessende (rc={rc}).'
        profile_cleanup_status = 'PASS'
        try:
            if profile_parent.exists():
                shutil.rmtree(profile_parent)
        except Exception as exc:
            profile_cleanup_status = f'FAILED: {exc}'
            if cleanup_status == 'PASS':
                cleanup_status = 'FAILED'
        return {
            'name': name,
            'scenarioStatus': scenario_status,
            'cleanupStatus': cleanup_status or 'FAILED',
            'profileCleanupStatus': profile_cleanup_status,
            'elapsedSeconds': round(time.time() - started, 3),
            'details': details,
            'error': error,
            'forceKillSucceeded': force_kill_succeeded,
            'logTail': logs,
        }


def main():
    parser = argparse.ArgumentParser(description='Supervisor für isolierte Chrome/MV3-E2E-Szenarien')
    parser.add_argument('--browser', help='Pfad/Name von Chrome oder Chromium (alternativ KR_CHROME_BINARY)')
    parser.add_argument('--headed', action='store_true')
    parser.add_argument('--scenario', action='append', help='Nur ausgewählte Szenarien ausführen (mehrfach möglich)')
    parser.add_argument('--report', help='Aggregierten JSON-Report schreiben')
    parser.add_argument('--scenario-timeout', type=float, default=float(os.environ.get('KR_E2E_SCENARIO_TIMEOUT', '90')))
    parser.add_argument('--cleanup-timeout', type=float, default=float(os.environ.get('KR_E2E_CLEANUP_TIMEOUT', '10')))
    args = parser.parse_args()
    selected = args.scenario or SCENARIOS
    unknown = sorted(set(selected) - set(SCENARIOS))
    if unknown:
        raise SystemExit(f"Unbekannte Szenarien: {', '.join(unknown)}")
    started = time.time()
    results = []
    for name in selected:
        result = run_scenario(name, args)
        results.append(result)
        print(f"{result['scenarioStatus']} {name} / cleanup={result['cleanupStatus']} ({result['elapsedSeconds']:.3f}s)", flush=True)
    passed = sum(1 for r in results if r['scenarioStatus'] == 'PASS')
    failed = len(results) - passed
    cleanup_failed = sum(1 for r in results if r['cleanupStatus'] != 'PASS')
    manifest = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
    report = {
        'schema': 2,
        'runner': 'supervisor-child-process',
        'extensionVersion': manifest.get('version_name') or manifest.get('version'),
        'scenarioCount': len(results),
        'passed': passed,
        'failed': failed,
        'cleanupFailed': cleanup_failed,
        'elapsedSeconds': round(time.time() - started, 3),
        'scenarioTimeoutSeconds': args.scenario_timeout,
        'cleanupTimeoutSeconds': args.cleanup_timeout,
        'results': results,
    }
    if args.report:
        path = Path(args.report)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: report[k] for k in ['extensionVersion','scenarioCount','passed','failed','cleanupFailed','elapsedSeconds']}, ensure_ascii=False), flush=True)
    if failed:
        raise SystemExit(1)
    if cleanup_failed:
        raise SystemExit(2)


if __name__ == '__main__':
    main()
