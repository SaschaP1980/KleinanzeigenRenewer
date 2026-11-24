#!/usr/bin/env python3
"""Execute the actual release version preflight with fake read-only Git/GH commands."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
workflow = (ROOT / '.github/workflows/kar-release.yml').read_text(encoding='utf-8')
step = workflow.split('      - name: Validate release identity and path\n', 1)[1]
step = step.split('        run: |\n', 1)[1].split('          if [ "$MODE" = work ]; then\n', 1)[0]
COMMAND = '\n'.join(line[10:] for line in step.splitlines())
# No release, fetch, tag creation, push or remote API is actually executed.
STUBS = '''
git() {
  case "$1" in
    fetch) return 0 ;;
    tag) printf '%s\\n' "$TEST_TAGS" ;;
    *) return 98 ;;
  esac
}
gh() {
  if [ "$1 $2" = 'release view' ]; then return 1; fi
  return 98
}
'''


class ReleaseVersion(unittest.TestCase):
    def run_step(self, product, npm, mode, tags, corrupt=False):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'scripts').mkdir()
            (root / 'release').mkdir()
            shutil.copyfile(ROOT / 'scripts/product_version.py', root / 'scripts/product_version.py')
            data = {
                'manifest.json': {'version': product},
                'package.json': {'version': npm, 'displayVersion': product},
                'package-lock.json': {'version': npm, 'packages': {'': {'version': npm}}},
                'release/release-spec.json': {'version': product, 'packageVersion': product},
            }
            if corrupt:
                data['package-lock.json']['packages']['']['version'] = '0.0.1'
            for path, doc in data.items():
                (root / path).write_text(json.dumps(doc), encoding='utf-8')
            env = root / 'github.env'
            result = subprocess.run(['bash', '-c', STUBS + COMMAND], cwd=root,
                                    env={**os.environ, 'MODE': mode, 'TEST_TAGS': '\n'.join(tags),
                                         'GITHUB_ENV': str(env)}, capture_output=True, text=True, timeout=15)
            return result, env.read_text() if env.exists() else ''

    def test_valid_release(self):
        for version, npm, mode, tags in (
                ('1.25.13', '1.25.13', 'fast', ['v1.25.12']),
                ('2.0.0.0', '2.0.0', 'work', ['v1.23.20_c1', 'v1.25.36', 'v1.23.48']),
                ('2.0.0.10', '2.0.0', 'fast', ['v2.0.0.2', 'v2.0.0.9']),
                ('2.0.1.0', '2.0.1', 'fast', ['v2.0.0.10']),
                ('2.1.0.0', '2.1.0', 'work', ['v2.0.1.0'])):
            with self.subTest(version=version):
                result, exported = self.run_step(version, npm, mode, tags)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(exported, 'VERSION=' + version + '\n')

    def test_rejected_release(self):
        for version, npm, mode, tags, corrupt in (
                ('1.25.13', '1.25.13', 'fast', ['v1.25.12'], True),
                ('2.0.0', '2.0.0', 'work', ['v1.25.36'], False),
                ('2.0.0.2', '2.0.0', 'fast', ['v2.0.0.1', 'v2.0.0.10'], False),
                ('2.0.0.9', '2.0.0', 'fast', ['v2.0.0.9'], False),
                ('2.1.0.0', '2.1.0', 'fast', ['v2.0.1.0'], False),
                ('2.0.1.0', '2.0.1', 'work', ['v2.0.0.0'], False),
                ('2.0.0.0', '2.0.0', 'work', ['v1.25.36_c1'], False),
                ('2.0.0.0', '2.0.0', 'work', ['v1.25.36', 'v1.25.37_c1'], False)):
            with self.subTest(version=version, tags=tags, mode=mode, corrupt=corrupt):
                result, _ = self.run_step(version, npm, mode, tags, corrupt)
                self.assertNotEqual(result.returncode, 0, result.stdout)


if __name__ == '__main__':
    unittest.main(verbosity=2)
