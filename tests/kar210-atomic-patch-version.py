#!/usr/bin/env python3
"""Exercise the real atomic PATCH planner and prior-archive contract without writes."""
import copy
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('kar52', ROOT / 'scripts/kar-atomic-patch.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def metadata(product, npm, basis, next_build='TBD'):
    return {
        'manifest.json': {'version': product, 'key': 'fixture-key', 'permissions': ['storage']},
        'package.json': {'version': npm, 'displayVersion': product},
        'package-lock.json': {'version': npm, 'packages': {'': {'version': npm}}},
        'release/release-spec.json': {'version': product, 'packageVersion': product,
                                      'directBasis': basis, 'nextPlannedBuild': next_build},
    }


class AtomicPatchVersion(unittest.TestCase):
    def test_legacy_patch(self):
        for before, after, next_build in (('1.23.48', '1.23.49', '1.24.0'),
                                          ('1.25.12', '1.25.13', 'TBD')):
            original = metadata(before, before, '1.23.20_c1', next_build)
            self.assertEqual(builder.metadata_plan(original),
                             (before, after, metadata(after, after, '1.23.20_c1', next_build)))

    def test_four_part_patch(self):
        for before, after in (('2.0.0.0', '2.0.1.0'), ('2.4.5.6', '2.4.6.0')):
            with self.subTest(before=before):
                original = metadata(before, '.'.join(before.split('.')[:3]), '1.23.48')
                snapshot = copy.deepcopy(original)
                self.assertEqual(builder.successor(before), after)
                self.assertEqual(builder.metadata_plan(original),
                                 (before, after, metadata(after, '.'.join(after.split('.')[:3]), '1.23.48')))
                self.assertEqual(original, snapshot)

    def test_fail_closed(self):
        for version in ('2.0.0', '2.0.0.01', '2.0.65535.0', '2.0.0.65536', '1.26.0', '1.23.65535'):
            with self.subTest(version=version), self.assertRaises(ValueError):
                builder.successor(version)
        valid = metadata('2.0.0.9', '2.0.0', '1.23.48')
        for path, field, invalid in (('package.json', 'version', '2.0.0.9'),
                                     ('package.json', 'displayVersion', '2.0.0'),
                                     ('release/release-spec.json', 'directBasis', '1.25.36'),
                                     ('release/release-spec.json', 'nextPlannedBuild', '3.0.0.0')):
            bad = copy.deepcopy(valid)
            bad[path][field] = invalid
            with self.subTest(path=path, field=field), self.assertRaises(ValueError):
                builder.metadata_plan(bad)

    def test_four_part_work_seal(self):
        base, seal, head = 'a' * 40, 'b' * 40, 'c' * 40
        version = '2.0.1.0'
        relative = 'release/kleinanzeigen-renewal-chrome-v' + version + '.zip'
        meta = metadata(version, '2.0.1', '1.23.48')
        expected_paths = set(builder.META) | {relative}

        def git(*args):
            if args[0] == 'log':
                return seal
            if args == ('show', '-s', '--format=%s', seal):
                return 'build(KAR-210): atomic PATCH ' + version + ' plus ZIP'
            if args[0] == 'diff-tree':
                return '\n'.join(sorted(expected_paths))
            if args in (('merge-base', '--is-ancestor', base, head),
                        ('merge-base', '--is-ancestor', seal, head)):
                return ''
            raise AssertionError(args)

        def run(*args, **kwargs):
            self.assertEqual(args[:2], ('git', 'show'))
            path = args[2].split(':', 1)[1]
            return b'sealed fixture' if kwargs.get('binary') else json.dumps(meta[path])

        with patch.object(builder, 'git', side_effect=git), patch.object(builder, 'run', side_effect=run), \
                patch.object(builder.subprocess, 'run', return_value=SimpleNamespace(returncode=1)):
            self.assertEqual(builder.sealed_prior_archive(210, base, head, relative, version),
                             (b'sealed fixture', 'work'))
            meta['package-lock.json']['packages']['']['version'] = '2.0.0'
            with self.assertRaises(ValueError):
                builder.sealed_prior_archive(210, base, head, relative, version)


if __name__ == '__main__':
    unittest.main(verbosity=2)
