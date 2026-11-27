#!/usr/bin/env python3
"""KAR-210: product version and metadata contract, no repository writes."""
import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'scripts'))
import product_version as v


def metadata(product, npm):
    return {
        'manifest.json': {'version': product},
        'package.json': {'version': npm, 'displayVersion': product},
        'package-lock.json': {'version': npm, 'packages': {'': {'version': npm}}},
        'release/release-spec.json': {'version': product, 'packageVersion': product},
    }


class ProductVersion(unittest.TestCase):
    def test_numeric_order(self):
        self.assertEqual(v.parse('1.23.88'), v.parse('1.23.88.0'))
        self.assertLess(v.parse('1.25.36'), v.parse('2.0.0.0'))
        self.assertLess(v.parse('2.0.0.9'), v.parse('2.0.0.10'))
        self.assertEqual(v.parse('65535.65535.65535.65535'), (65535,) * 4)

    def test_invalid_versions(self):
        for version in (None, '', '0.0.0.0', '2.0', '2.0.0.01', '2.0.0.65536',
                        '2.0.-1.0', '2.0.0.0.1', ' 2.0.0.0', '1.23.20_c1',
                        '2.0.0.0\n', '٢.0.0.0'):
            with self.subTest(version=version), self.assertRaises(ValueError):
                v.parse(version)

    def test_change_classes(self):
        for kind, expected in (('major', '3.0.0.0'), ('minor', '2.5.0.0'),
                               ('patch', '2.4.6.0'), ('hotfix', '2.4.5.7')):
            self.assertEqual(v.advance('2.4.5.6', kind), expected)
        self.assertEqual(v.advance('1.23.88', 'major'), '2.0.0.0')
        with self.assertRaises(ValueError):
            v.advance('2.0.0.65535', 'hotfix')
        with self.assertRaises(ValueError):
            v.advance('2.0.0.0', 'unknown')

    def test_archive_labels(self):
        self.assertEqual(v.archive_version({'version': '2.0.0.0'}), '2.0.0.0')
        self.assertEqual(v.archive_version({'version': '1.23.21', 'version_name': '1.23.20_c1'}), '1.23.20_c1')
        for manifest in ({'version': '2.0.0'}, {'version': '2.0.0.0', 'version_name': '2.0.0.1'},
                         {'version': '2.0.0.0', 'version_name': '1.23.20_c1'},
                         {'version': '1.23.48', 'version_name': '../bad'}):
            with self.subTest(manifest=manifest), self.assertRaises(ValueError):
                v.archive_version(manifest)

    def test_metadata_and_bumps(self):
        original = metadata('2.0.0.9', '2.0.0')
        self.assertEqual(v.validate_metadata(original), '2.0.0.9')
        for kind, product, npm in (('hotfix', '2.0.0.10', '2.0.0'), ('patch', '2.0.1.0', '2.0.1')):
            future = v.bump_metadata(original, kind)
            self.assertEqual(future, metadata(product, npm))
        self.assertEqual(original, metadata('2.0.0.9', '2.0.0'))
        self.assertEqual(v.validate_metadata(metadata('1.25.12', '1.25.12')), '1.25.12')
        for path, field, wrong in (('package.json', 'version', '2.0.0.9'),
                                   ('package.json', 'displayVersion', '2.0.0'),
                                   ('package-lock.json', 'version', '2.0.1'),
                                   ('release/release-spec.json', 'packageVersion', '2.0.0')):
            bad = copy.deepcopy(original)
            bad[path][field] = wrong
            with self.subTest(path=path, field=field), self.assertRaises(ValueError):
                v.validate_metadata(bad)
        bad = copy.deepcopy(original)
        bad['package-lock.json']['packages']['']['version'] = '2.0.1'
        with self.assertRaises(ValueError):
            v.validate_metadata(bad)


if __name__ == '__main__':
    unittest.main(verbosity=2)
