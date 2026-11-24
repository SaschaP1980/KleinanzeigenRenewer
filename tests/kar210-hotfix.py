#!/usr/bin/env python3
"""KAR-210: explicit HOTFIX authorization and exact metadata/archive scope."""
import copy
import importlib.util
import json
import os
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('builder', ROOT / 'scripts/kar-atomic-patch.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def metadata(version):
    npm = '.'.join(version.split('.')[:3])
    return {
        'manifest.json': {'version': version, 'key': 'fixture'},
        'package.json': {'version': npm, 'displayVersion': version},
        'package-lock.json': {'version': npm, 'packages': {'': {'version': npm}}},
        'release/release-spec.json': {'version': version, 'packageVersion': version,
                                      'directBasis': '1.23.48', 'nextPlannedBuild': 'TBD'},
    }


class Hotfix(unittest.TestCase):
    def test_hotfix_plan(self):
        original = metadata('2.0.0.9')
        snapshot = copy.deepcopy(original)
        self.assertEqual(builder.metadata_plan(original, 'hotfix'),
                         ('2.0.0.9', '2.0.0.10', metadata('2.0.0.10')))
        self.assertEqual(original, snapshot)
        self.assertEqual(builder.metadata_plan(original)[1], '2.0.1.0')

    def test_invalid_hotfix(self):
        for version, kind in [('1.25.12', 'hotfix'), ('2.0.0.65535', 'hotfix'),
                              ('2.0.0.0', 'major'), ('2.0.0.0', 'unknown')]:
            with self.subTest(version=version, kind=kind), self.assertRaises(ValueError):
                builder.metadata_plan(metadata(version), kind)

    def test_collect_exact_scope(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name, value in metadata('2.0.0.9').items():
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(json.dumps(value), encoding='utf-8')
            old = root / 'release/kleinanzeigen-renewal-chrome-v2.0.0.9.zip'
            old.write_bytes(b'fixture')
            with patch.object(builder, 'ROOT', root), patch.object(builder, 'assert_lease'), \
                    patch.object(builder, 'sealed_prior_archive', return_value=(b'fixture', 'main')), \
                    patch.object(builder.subprocess, 'run', return_value=SimpleNamespace(returncode=1)):
                plan, future = builder.collect(210, 'work/KAR-210', 'a'*40, 'b'*40, 'hotfix')
                self.assertEqual(plan['changeClass'], 'hotfix')
                self.assertEqual(set(plan['metadataPaths']), set(builder.META) - {'package-lock.json'})
                self.assertEqual(set(plan['changedPaths']), set(plan['metadataPaths']) | {plan['newZip']})
                self.assertEqual(len(plan['changedPaths']), 4)
                self.assertEqual(future['package-lock.json'], metadata('2.0.0.9')['package-lock.json'])
                patch_plan, _ = builder.collect(210, 'work/KAR-210', 'a'*40, 'b'*40)
                self.assertEqual(set(patch_plan['fivePaths']), set(builder.META) | {patch_plan['newZip']})

    def test_explicit_dispatch_only(self):
        plan = {'branch': 'work/KAR-210', 'sourceSha': 'a'*40, 'mainSha': 'b'*40,
                'issue': 210, 'changeClass': 'hotfix'}
        env = {'GITHUB_EVENT_NAME': 'workflow_dispatch', 'GITHUB_REPOSITORY': 'SaschaP1980/KleinanzeigenRenewer',
               'GITHUB_REF_NAME': plan['branch'], 'GITHUB_SHA': plan['sourceSha']}
        with patch.dict(os.environ, env, clear=True):
            with self.assertRaises(ValueError):
                builder.assert_build_entry(plan)
            os.environ['KAR_CHANGE_CLASS'] = 'hotfix'
            builder.assert_build_entry(plan)
            os.environ['GITHUB_EVENT_NAME'] = 'push'
            with patch.object(builder, 'git', side_effect=['ci(KAR-210): atomic PATCH base=' + 'b'*40, '']):
                with self.assertRaises(ValueError):
                    builder.assert_build_entry(plan)

    def test_hotfix_seal(self):
        base, seal, head = 'a'*40, 'b'*40, 'c'*40
        version = '2.0.0.10'
        name = 'release/kleinanzeigen-renewal-chrome-v' + version + '.zip'
        meta = metadata(version)
        paths = (set(builder.META) - {'package-lock.json'}) | {name}

        def git(*args):
            if args[0] == 'log': return seal
            if args[0:2] == ('show', '-s'): return 'build(KAR-210): atomic HOTFIX ' + version + ' plus ZIP'
            if args[0] == 'diff-tree': return '\n'.join(sorted(paths))
            if args[0] == 'merge-base': return ''
            raise AssertionError(args)

        def run(*args, **kwargs):
            return b'fixture' if kwargs.get('binary') else json.dumps(meta[args[2].split(':', 1)[1]])

        with patch.object(builder, 'git', side_effect=git), patch.object(builder, 'run', side_effect=run), \
                patch.object(builder.subprocess, 'run', return_value=SimpleNamespace(returncode=1)):
            self.assertEqual(builder.sealed_prior_archive(210, base, head, name, version), (b'fixture', 'work'))
            paths.add('package-lock.json')
            with self.assertRaises(ValueError):
                builder.sealed_prior_archive(210, base, head, name, version)


if __name__ == '__main__':
    unittest.main(verbosity=2)
