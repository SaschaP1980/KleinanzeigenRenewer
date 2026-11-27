#!/usr/bin/env python3
"""Execute the actual packager on a disposable, synthetic runtime tree."""
import ast
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parent.parent


class PackagerVersion(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / 'source'
        (self.root / 'scripts').mkdir(parents=True)
        for script in ('package.py', 'product_version.py'):
            shutil.copyfile(ROOT / 'scripts' / script, self.root / 'scripts' / script)
        tree = ast.parse((ROOT / 'scripts/package.py').read_text(encoding='utf-8'))
        declaration = next(node for node in tree.body if isinstance(node, ast.Assign)
                           and any(isinstance(t, ast.Name) and t.id == 'runtime' for t in node.targets))
        self.runtime = ast.literal_eval(declaration.value)
        for name in self.runtime:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b'')

    def build(self, manifest, name):
        (self.root / 'manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
        output = self.base / name
        result = subprocess.run([sys.executable, str(self.root / 'scripts/package.py'), str(output)],
                                capture_output=True, text=True, timeout=20)
        return result, output

    def test_valid_product_and_legacy_labels(self):
        for manifest, label in (({'version': '2.0.0.0'}, '2.0.0.0'),
                                ({'version': '1.23.21', 'version_name': '1.23.20_c1'}, '1.23.20_c1')):
            with self.subTest(label=label):
                result, output = self.build(manifest, 'first-' + label)
                self.assertEqual(result.returncode, 0, result.stderr)
                path = output / ('kleinanzeigen-renewal-chrome-v' + label + '.zip')
                with zipfile.ZipFile(path) as archive:
                    self.assertEqual(set(archive.namelist()), set(self.runtime))
                    self.assertEqual(json.loads(archive.read('manifest.json')), manifest)
                    self.assertIsNone(archive.testzip())
                repeat, second = self.build(manifest, 'second-' + label)
                self.assertEqual(repeat.returncode, 0, repeat.stderr)
                self.assertEqual(path.read_bytes(), (second / path.name).read_bytes())

    def test_reject_bad_label_before_writing_zip(self):
        for i, manifest in enumerate(({'version': '2.0.0'},
                                      {'version': '2.0.0.01'},
                                      {'version': '2.0.0.0', 'version_name': '1.23.48'},
                                      {'version': '2.0.0.0', 'version_name': '2.0.0.1'})):
            with self.subTest(manifest=manifest):
                result, output = self.build(manifest, 'bad-' + str(i))
                self.assertNotEqual(result.returncode, 0, result.stdout)
                self.assertEqual(list(output.glob('*.zip')), [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
