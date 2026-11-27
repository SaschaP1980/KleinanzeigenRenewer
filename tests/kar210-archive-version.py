#!/usr/bin/env python3
"""Exercise archive shell input and ZIP identity gates before any Git/GH operation."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'scripts/archive-release-zip.sh').read_text(encoding='utf-8')
PREFIX, boundary, _ = SOURCE.partition('test "$(git rev-parse HEAD)" = "$GITHUB_SHA"')
assert boundary, 'Git identity boundary not found'


class ArchiveVersion(unittest.TestCase):
    def check_archive(self, version, manifest_version=None, wrong_digest=False):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            script = root / 'archive-release-zip.sh'
            script.write_text(PREFIX + '\nprintf "LOCAL_ZIP_CHECKS_PASSED\\n"\n', encoding='utf-8')
            shutil.copyfile(ROOT / 'scripts/product_version.py', root / 'product_version.py')
            archive = root / ('kleinanzeigen-renewal-chrome-v' + version + '.zip')
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr('manifest.json', json.dumps({'version': manifest_version or version}))
            digest = hashlib.sha256(archive.read_bytes()).hexdigest()
            env = {**os.environ, 'GITHUB_REPOSITORY': 'fixture/repo', 'GITHUB_SHA': 'a' * 40,
                   'GH_TOKEN': 'fixture-only'}
            return subprocess.run(['bash', str(script), str(archive), version,
                                   'b' * 64 if wrong_digest else digest,
                                   str(archive.stat().st_size), 'a' * 40],
                                  env=env, cwd=root, capture_output=True, text=True, timeout=15)

    def test_valid_versions(self):
        for version in ('1.23.48', '2.0.0.0', '2.0.0.65535'):
            with self.subTest(version=version):
                result = self.check_archive(version)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn('LOCAL_ZIP_CHECKS_PASSED', result.stdout)

    def test_invalid_versions_and_zip_identity(self):
        for version in ('2.0.0', '2.0.0.01', '2.0.0.65536', '1.23.048'):
            with self.subTest(version=version):
                self.assertNotEqual(self.check_archive(version).returncode, 0)
        self.assertNotEqual(self.check_archive('2.0.0.0', '2.0.0.1').returncode, 0)
        self.assertNotEqual(self.check_archive('2.0.0.0', wrong_digest=True).returncode, 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)
