#!/usr/bin/env python3
"""Check both Work PR archive-name assignments with disposable metadata."""
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / '.github/workflows/kar-work-pr.yml').read_text(encoding='utf-8')
STEPS = ('Build installable package once',
         'Rebuild, verify committed ZIP, and reject version-path collisions')


def version_command(step):
    block = SOURCE.split('      - name: ' + step + '\n', 1)[1].split('\n      - name:', 1)[0]
    commands = re.findall(r'^          (VERSION=.*)$', block, re.M)
    assert len(commands) == 1, (step, commands)
    return commands[0]


class WorkPRVersion(unittest.TestCase):
    def run_assignment(self, step, version, npm, corrupt=False):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'scripts').mkdir()
            (root / 'release').mkdir()
            shutil.copyfile(ROOT / 'scripts/product_version.py', root / 'scripts/product_version.py')
            documents = {
                'manifest.json': {'version': version},
                'package.json': {'version': npm, 'displayVersion': version},
                'package-lock.json': {'version': npm, 'packages': {'': {'version': npm}}},
                'release/release-spec.json': {'version': version, 'packageVersion': version},
            }
            if corrupt:
                documents['release/release-spec.json']['packageVersion'] = '1.0.0'
            for path, data in documents.items():
                (root / path).write_text(json.dumps(data), encoding='utf-8')
            command = 'set -euo pipefail\n' + version_command(step) + '\nprintf "%s\\n" "$VERSION"'
            return subprocess.run(['bash', '-c', command], cwd=root, capture_output=True,
                                  text=True, timeout=15)

    def test_correct_product_version(self):
        for step in STEPS:
            for version, npm in (('1.25.12', '1.25.12'), ('2.0.0.0', '2.0.0'), ('2.0.0.9', '2.0.0')):
                with self.subTest(step=step, version=version):
                    result = self.run_assignment(step, version, npm)
                    self.assertEqual(result.returncode, 0, result.stderr)
                    self.assertEqual(result.stdout, version + '\n')

    def test_mismatched_metadata_rejected(self):
        for step in STEPS:
            for version, npm, corrupt in (('1.25.12', '1.25.12', True), ('2.0.0.9', '2.0.0.9', False),
                                          ('2.0.0', '2.0.0', False)):
                with self.subTest(step=step, version=version, corrupt=corrupt):
                    result = self.run_assignment(step, version, npm, corrupt)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertEqual(result.stdout, '')


if __name__ == '__main__':
    unittest.main(verbosity=2)
