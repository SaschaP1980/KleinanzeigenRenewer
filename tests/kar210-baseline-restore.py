#!/usr/bin/env python3
"""Verify the exact KAR-210 historical baseline source snapshot, not a release."""
import ast
import hashlib
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
TARGET = json.loads((ROOT / 'docs/maintenance/KAR210_BASELINE_TARGET.json').read_text(encoding='utf-8'))
VERSION = json.loads((ROOT / 'manifest.json').read_text())['version']
HOTFIX = {'manifest.json': ('d0d3038800b5ebc01ed1e39ea4533beed6fc8089', 'a7376f5782888fac78d51c567cd7699e82705a2c'),
          'src/background/background.js': ('bbdeee5b2c6125545b22de209c4d52fd1bdeb9ad', 'f75e6e9dfb1bb2491c8a7d9bd5932c53baf99998')}



def blob(path):
    data = path.read_bytes()
    return hashlib.sha1(b'blob ' + str(len(data)).encode('ascii') + b'\0' + data).hexdigest()


class BaselineRestore(unittest.TestCase):
    def test_historical_runtime_blob_identity(self):
        for row in TARGET['expected']:
            with self.subTest(path=row['path']):
                path = ROOT / row['path']
                self.assertTrue(path.is_file())
                self.assertIn(VERSION, ('2.0.0.0', '2.0.0.1'))
                expected = row['sha']
                if VERSION == '2.0.0.1' and row['path'] in HOTFIX:
                    before, after = HOTFIX[row['path']]
                    self.assertEqual(expected, before)
                    expected = after
                self.assertEqual(blob(path), expected)

    def test_exact_package_and_active_js_scope(self):
        tree = ast.parse((ROOT / 'scripts/package.py').read_text(encoding='utf-8'))
        runtime = next(node for node in tree.body if isinstance(node, ast.Assign)
                       and any(isinstance(t, ast.Name) and t.id == 'runtime' for t in node.targets))
        paths = ast.literal_eval(runtime.value)
        self.assertEqual(len(paths), len(set(paths)))
        self.assertEqual(paths, TARGET['packaged'])
        for path in paths:
            self.assertTrue((ROOT / path).is_file(), path)
        active = {p.relative_to(ROOT).as_posix() for folder in ('src', 'lib')
                  for p in (ROOT / folder).rglob('*.js')}
        self.assertEqual(active, {p for p in paths if p.endswith('.js')})
        for path in TARGET['absent']:
            self.assertFalse((ROOT / path).exists(), path)

    def test_product_version_and_metadata(self):
        import sys
        sys.path.insert(0, str(ROOT / 'scripts'))
        import product_version
        documents = {p: json.loads((ROOT / p).read_text(encoding='utf-8')) for p in product_version.META}
        self.assertEqual(TARGET['version'], '2.0.0.0')
        self.assertIn(VERSION, ('2.0.0.0', '2.0.0.1'))
        self.assertEqual(product_version.validate_metadata(documents), VERSION)
        if VERSION == '2.0.0.1':
            self.assertEqual(documents['release/release-spec.json']['hotfix'], {"issue":212,"directBasis":"2.0.0.0","sourceCommit":"f659c85d704d641f07cdd5b1cb89de685c5f0a5d","archiveSha256":"cc9ec37d0e9bf3c7688438ad04e9df0983a71d54b0802833906d8580d5902839","runtimeBlob":"f75e6e9dfb1bb2491c8a7d9bd5932c53baf99998","manifestBlob":"a7376f5782888fac78d51c567cd7699e82705a2c"})
        else:
            self.assertNotIn('hotfix', documents['release/release-spec.json'])
        self.assertEqual(documents['release/release-spec.json']['directBasis'], '1.23.48')


if __name__ == '__main__':
    unittest.main(verbosity=2)
