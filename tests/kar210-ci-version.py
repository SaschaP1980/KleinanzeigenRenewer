#!/usr/bin/env python3
"""Execute the real main CI version-identity shell block on disposable metadata."""
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
CI = (ROOT / '.github/workflows/kar-ci.yml').read_text(encoding='utf-8')
STEP = re.search(r'^      - name: Verify CI separation and version identity\n'
                 r'        shell: bash\n        run: \|\n((?:          [^\n]*\n)+)', CI, re.M)
assert STEP, 'CI version identity step not found'
COMMAND = '\n'.join(line[10:] for line in STEP.group(1).splitlines())


class CIVersion(unittest.TestCase):
    def run_step(self, version, npm, corrupt=None):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'scripts').mkdir()
            (root / 'tests').mkdir()
            (root / 'release').mkdir()
            shutil.copyfile(ROOT / 'scripts/product_version.py', root / 'scripts/product_version.py')
            # Stub the separate CI separation test; this fixture exercises only version identity.
            (root / 'tests/kar-ci-contract.cjs').write_text('// independent contract tested separately\n')
            documents = {
                'manifest.json': {'version': version},
                'package.json': {'version': npm, 'displayVersion': version},
                'package-lock.json': {'version': npm, 'packages': {'': {'version': npm}}},
                'release/release-spec.json': {'version': version, 'packageVersion': version},
            }
            if corrupt:
                path, key, value = corrupt
                documents[path][key] = value
            for path, document in documents.items():
                (root / path).write_text(json.dumps(document), encoding='utf-8')
            env_path = root / 'github.env'
            result = subprocess.run(['bash', '-c', COMMAND], cwd=root,
                                    env={**os.environ, 'GITHUB_ENV': str(env_path)},
                                    capture_output=True, text=True, timeout=15)
            return result, env_path.read_text() if env_path.exists() else ''

    def test_legacy_and_four_component_identity(self):
        for version, npm in (('1.25.12', '1.25.12'), ('2.0.0.0', '2.0.0'), ('2.0.0.9', '2.0.0')):
            with self.subTest(version=version):
                result, exported = self.run_step(version, npm)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(exported, 'VERSION=' + version + '\n')

    def test_mismatched_metadata_rejected_before_export(self):
        for version, npm, corrupt in (
                ('1.25.12', '1.25.12', ('package-lock.json', 'version', '1.25.11')),
                ('1.25.12', '1.25.12', ('release/release-spec.json', 'packageVersion', '1.25.11')),
                ('2.0.0', '2.0.0', None),
                ('2.0.0.9', '2.0.0.9', None),
                ('2.0.0.01', '2.0.0', None)):
            with self.subTest(version=version, corrupt=corrupt):
                result, exported = self.run_step(version, npm, corrupt)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(exported, '')


if __name__ == '__main__':
    unittest.main(verbosity=2)
