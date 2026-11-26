#!/usr/bin/env python3
"""Run actual atomic-builder workflow shell blocks with fake Git/node/build calls."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / '.github/workflows/kar-atomic-patch.yml').read_text(encoding='utf-8')


def command(name):
    block = SOURCE.split('      - name: ' + name, 1)[1].split('\n      - name:', 1)[0]
    return '\n'.join(line[10:] for line in block.split('        run: |\n', 1)[1].splitlines())


PREFLIGHT = command('Issue, SHA, main and canonical comment preflight')
BUILD = command('Independently rebuild ZIP')
STUBS = '''
git() {
  case "$1" in
    rev-parse) printf '%s\\n' "$GITHUB_SHA" ;;
    log) printf '%s\\n' "ci(KAR-210): atomic PATCH base=$DISPATCH_MAIN_SHA" ;;
    diff-tree) return 0 ;;
    *) return 98 ;;
  esac
}
node() { return 0; }
python3() { printf '%s\\n' "$*" >> "$TEST_CALLS"; }
'''


class WorkflowHotfix(unittest.TestCase):
    def execute(self, event, selection, expected):
        with tempfile.TemporaryDirectory() as tmp:
            env_file, calls_file = Path(tmp) / 'env', Path(tmp) / 'calls'
            env = {**os.environ, 'GITHUB_REF_NAME': 'work/KAR-210', 'GITHUB_SHA': 'a'*40,
                   'GITHUB_EVENT_NAME': event, 'DISPATCH_ISSUE': '210',
                   'DISPATCH_WORK_SHA': 'a'*40, 'DISPATCH_MAIN_SHA': 'b'*40,
                   'DISPATCH_CHANGE_CLASS': selection, 'GITHUB_ENV': str(env_file),
                   'TEST_CALLS': str(calls_file)}
            pre = subprocess.run(['bash', '-c', STUBS + PREFLIGHT], env=env,
                                 capture_output=True, text=True, timeout=15)
            if expected is None:
                self.assertNotEqual(pre.returncode, 0)
                self.assertFalse(calls_file.exists())
                return
            self.assertEqual(pre.returncode, 0, pre.stderr)
            exports = dict(line.split('=', 1) for line in env_file.read_text().splitlines())
            self.assertEqual(exports['KAR_CHANGE_CLASS'], expected)
            post = subprocess.run(['bash', '-c', STUBS + BUILD], env={**env, **exports},
                                  capture_output=True, text=True, timeout=15)
            self.assertEqual(post.returncode, 0, post.stderr)
            calls = calls_file.read_text().splitlines()
            self.assertEqual(len(calls), 2)
            for call, mode in zip(calls, ('plan', 'build')):
                self.assertIn('--mode ' + mode, call)
                self.assertIn('--change-class ' + expected, call)

    def test_dispatch_choices(self):
        for selection in ('patch', 'hotfix'):
            with self.subTest(selection=selection):
                self.execute('workflow_dispatch', selection, selection)

    def test_reject_missing_or_unknown_dispatch_class(self):
        for selection in ('', 'major', 'unexpected'):
            with self.subTest(selection=selection):
                self.execute('workflow_dispatch', selection, None)

    def test_push_is_patch_only(self):
        self.execute('push', 'hotfix', 'patch')


if __name__ == '__main__':
    unittest.main(verbosity=2)
