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



S09 = json.loads((ROOT / 'docs/maintenance/KAR214_SUCCESSOR_SCOPE.json').read_text(encoding='utf-8'))
S09_CHANGES = {row['path']: row for row in S09['runtimeChanges']}
S03 = json.loads((ROOT / 'docs/maintenance/KAR213_SUCCESSOR_SCOPE.json').read_text(encoding='utf-8'))
S03_CHANGES = {row['path']: row for row in S03['runtimeChanges']}
S03_PATHS = ["manifest.json","src/app/profile-backup-controller.js","src/app/profile-backup-storage-service.js","src/background/controllers/mass-renewal-controller.js","src/background/controllers/mass-renewal-workflow-controller.js","src/background/controllers/profile-management-controller.js","src/background/controllers/renewal-workflow-controller.js","src/background/controllers/template-fill-controller.js","src/background/repositories/profile-repository.js","src/background/repositories/renewal-state-repository.js","src/background/services/archive-insertion-recovery-service.js","src/background/services/archive-insertion-service.js","src/background/services/mass-renewal-watchdog-service.js","src/background/services/remote-delete-replacement-service.js","src/background/services/template-fill-service.js"]
S04 = json.loads((ROOT / 'docs/maintenance/KAR217_SUCCESSOR_SCOPE.json').read_text(encoding='utf-8'))
S04_CHANGES = {row['path']: row for row in S04['runtimeChanges']}
S04_REMOVED = {row['path']: row for row in S04['removedRuntime']}
S05 = json.loads((ROOT / 'docs/maintenance/KAR220_SUCCESSOR_SCOPE.json').read_text(encoding='utf-8'))
S05_CHANGES = {row['path']: row for row in S05['runtimeChanges']}
S06 = json.loads((ROOT / 'docs/maintenance/KAR222_SUCCESSOR_SCOPE.json').read_text(encoding='utf-8'))
S06_CHANGES = {row['path']: row for row in S06['runtimeChanges']}
S06_PATHS = ["manifest.json","src/app/app.js","src/app/inventory-card-renderer.js","src/app/inventory-formatting.js","src/app/mass-renewal-ui-controller.js","src/app/renewal-dialog-controller.js","src/background/background.js","src/background/controllers/mass-renewal-controller.js","src/background/controllers/mass-renewal-workflow-controller.js","src/background/controllers/renewal-workflow-controller.js","src/background/controllers/workflow-emergency-reset-controller.js","src/background/repositories/renewal-state-repository.js","src/background/services/remote-delete-replacement-service.js","src/background/services/renewal-verification-flow.js","src/background/services/tab-registry.js","src/content/inventory-delete-operations.js","src/content/template-filler.js","src/content/template-publish-flow.js"]
S06_HOTFIX = {"issue":222,"directBasis":"2.0.5.0","sourceCommit":"90b0999d5f4a2b3caa2c09d7cb5c30bff0edbd12","archiveSha256":"5155f5e3863291994318c54b2f1ec3765c4278de741df9cfe3ebdfba2740024f","fixCommit":"c43502ab6582a3b9ec9229864d2552194f02b8d1","runtimeChanges":[{"path":"manifest.json","before":"348fefe57b548c79ccabe72e5079592aeb34a865","after":"3631798c04bdfa1cc2f0a829f7a41f95e4c1906f"},{"path":"src/background/services/remote-delete-replacement-service.js","before":"f41490351e833568fe11e93f1e53e9765681aea6","after":"042d4c111b7ae32b997727c61bc5aafc32f53e63"},{"path":"src/content/inventory-delete-operations.js","before":"81f94ef16b015193700ed7b2de5edbe67d13c108","after":"c2571309116f2a8c3be6f3dd1d42cc644a1c38d3"}]}
S06_HOTFIX_CHANGES = {row['path']: row for row in S06_HOTFIX['runtimeChanges']}
S07 = {"issue":224,"directBasis":"2.0.5.1","sourceCommit":"6b1e8442c88791b87b826101a66d44fc8053ae09","archiveSha256":"91cd8e6b9219daac26560c5d78ba260d62a34b062b52245a51e451ff81f05f10","fixCommit":"d513b1fe6085799850cd434219f7f5892181c470","runtimeChanges":[{"path":"manifest.json","before":"3631798c04bdfa1cc2f0a829f7a41f95e4c1906f","after":"913d19148f2012a412161e9873b1ff2addd78a95"},{"path":"src/app/archive-insertion-ui-controller.js","before":"08688155593fff5fadf7ea4add280909b7724bac","after":"3c40e94a7763ccc0b6aa74da4ca116df5692163f"},{"path":"src/app/trash-template-ui-controller.js","before":"d8a1858f647e893c02d2bddc94b8bc48fa164677","after":"74762e2da0069716883d084afb959518f6a808ad"},{"path":"src/background/controllers/template-fill-controller.js","before":"cea111834e279b8a3cd6b6e1bfbcc65975a2d97e","after":"c5df136f528117ee10e5a74501c1e3143a01b6ad"},{"path":"src/background/services/archive-insertion-recovery-service.js","before":"5b1e64993f0039465d05da8bdfae44844903ac30","after":"234dbffe0d0f1c4586b15b08f01ac81359399657"},{"path":"src/background/services/template-fill-service.js","before":"50425d9923131ff17ddfb5075c1cab87cb1c8e37","after":"df41d6cb7837fe8153c22043233430580611f894"},{"path":"src/content/template-filler.js","before":"0ff704a8f14a8b700a0de7d62ebe42327cc8ec50","after":"1281e2c514cc7a412bbd5f6fca45d0454cd2d445"},{"path":"src/content/template-publish-flow.js","before":"f4dd2a6b7b0965d8d5a2e28039a40350df9e958b","after":"4b0a100e546113624339c28f762f6d979e896825"}]}
S07_CHANGES = {row['path']: row for row in S07['runtimeChanges']}
HAS_S07 = VERSION == '2.0.6.0'
HAS_S06_HOTFIX = VERSION in ('2.0.5.1', '2.0.6.0')
HAS_S06 = VERSION in ('2.0.5.0', '2.0.5.1', '2.0.6.0')
HAS_S05 = VERSION in ('2.0.4.0', '2.0.5.0', '2.0.5.1', '2.0.6.0')
HAS_S04 = VERSION in ('2.0.3.0', '2.0.4.0', '2.0.5.0', '2.0.5.1', '2.0.6.0')
HAS_S03 = VERSION in ('2.0.2.0', '2.0.3.0', '2.0.4.0', '2.0.5.0', '2.0.5.1', '2.0.6.0')
HAS_S09 = VERSION in ('2.0.1.0', '2.0.2.0', '2.0.3.0', '2.0.4.0', '2.0.5.0', '2.0.5.1', '2.0.6.0')
S09_ADDED = 'src/app/trash-retention-settings-controller.js'
S09_PATHS = ["manifest.json","src/app/app-elements.js","src/app/app.css","src/app/app.html","src/app/app.js","src/app/inventory-card-renderer.js","src/app/inventory-formatting.js","src/app/inventory-view.js","src/app/record-card-view.js","src/app/renewal-dialog-controller.js","src/app/trash-card-renderer.js","src/app/trash-retention-settings-controller.js","src/background/background-message-router.js","src/background/background.js","src/background/repositories/inventory-repository.js","src/background/services/bulk-reconciliation-service.js","src/background/services/remote-delete-replacement-service.js","src/background/services/trash-service.js","src/shared/message-contract-registry.js"]


def blob(path):
    data = path.read_bytes()
    return hashlib.sha1(b'blob ' + str(len(data)).encode('ascii') + b'\0' + data).hexdigest()


class BaselineRestore(unittest.TestCase):
    def test_historical_runtime_blob_identity(self):
        for row in TARGET['expected']:
            with self.subTest(path=row['path']):
                path = ROOT / row['path']
                self.assertIn(VERSION, ('2.0.0.0', '2.0.0.1', '2.0.1.0', '2.0.2.0', '2.0.3.0', '2.0.4.0', '2.0.5.0', '2.0.5.1', '2.0.6.0'))
                expected = row['sha']
                if VERSION == '2.0.0.1' and row['path'] in HOTFIX:
                    before, after = HOTFIX[row['path']]
                    self.assertEqual(expected, before)
                    expected = after
                if HAS_S09 and row['path'] in S09_CHANGES:
                    entry = S09_CHANGES[row['path']]
                    self.assertEqual(entry['historicalBlob'], expected)
                    expected = entry['after']
                if HAS_S03 and row['path'] in S03_CHANGES:
                    entry = S03_CHANGES[row['path']]
                    self.assertEqual(entry['before'], expected)
                    expected = entry['after']
                if HAS_S04 and row['path'] in S04_REMOVED:
                    entry = S04_REMOVED[row['path']]
                    self.assertEqual(entry['before'], expected)
                    self.assertFalse(path.exists())
                    self.assertEqual(blob(ROOT / entry['archive']), expected)
                    continue
                if HAS_S04 and row['path'] in S04_CHANGES:
                    entry = S04_CHANGES[row['path']]
                    self.assertEqual(entry['before'], expected)
                    expected = entry['after']
                if HAS_S05 and row['path'] in S05_CHANGES:
                    entry = S05_CHANGES[row['path']]
                    self.assertEqual(entry['before'], expected)
                    expected = entry['after']
                if HAS_S06 and row['path'] in S06_CHANGES:
                    entry = S06_CHANGES[row['path']]
                    self.assertEqual(entry['before'], expected)
                    expected = entry['after']
                if HAS_S06_HOTFIX and row['path'] in S06_HOTFIX_CHANGES:
                    entry = S06_HOTFIX_CHANGES[row['path']]
                    self.assertEqual(entry['before'], expected)
                    expected = entry['after']
                if HAS_S07 and row['path'] in S07_CHANGES:
                    entry = S07_CHANGES[row['path']]
                    self.assertEqual(entry['before'], expected)
                    expected = entry['after']
                self.assertTrue(path.is_file())
                self.assertEqual(blob(path), expected)
        if HAS_S09:
            self.assertEqual(S09['version'], '2.0.1.0')
            self.assertEqual(S09['issue'], 214)
            self.assertEqual(sorted(S09_CHANGES), S09_PATHS)
            self.assertEqual(S09['addedRuntime'], [S09_ADDED])
            self.assertEqual(blob(ROOT / S09_ADDED), S09_CHANGES[S09_ADDED]['after'])

        if HAS_S03:
            self.assertEqual(S03['version'], '2.0.2.0')
            self.assertEqual(S03['issue'], 213)
            self.assertEqual(S03['step'], 'S03')
            self.assertEqual(S03['directBasis'], '2.0.1.0')
            self.assertEqual(S03['sourceCommit'], '61f917d384cdce0fc191188e5a99515907967dbe')
            self.assertEqual(S03['archiveSha256'], '15e58983d23a0706a301e161c76bf52c4e2885667fb7214b6f80b8f1209c798a')
            self.assertEqual(sorted(S03_CHANGES), S03_PATHS)
            self.assertEqual(S03['addedRuntime'], [])
            self.assertEqual(S03['reactivatedTests'], [])
            self.assertTrue(set(S03_CHANGES) <= {row['path'] for row in TARGET['expected']})
        if HAS_S04:
            self.assertEqual(S04['version'], '2.0.3.0')
            self.assertEqual(S04['issue'], 217)
            self.assertEqual(S04['step'], 'S04')
            self.assertEqual(S04['directBasis'], '2.0.2.0')
            self.assertEqual(S04['sourceCommit'], 'a88a3446560cb36c87a3ace599a0bbd0549c6f41')
            self.assertEqual(S04['archiveSha256'], '46cb5860015965fee5323dcedd290862672cc97e03e880180afc464ff3bf89ee')
            self.assertEqual(sorted(S04_CHANGES), ['manifest.json','src/app/app.css','src/app/app.html','src/background/background-message-router.js','src/background/background.js','src/shared/message-contract-registry.js'])
            self.assertEqual(sorted(S04_REMOVED), ['src/app/native-update-check-ui.js','src/background/services/native-status-bridge.js','src/background/services/native-update-status-gateway.js'])
            self.assertEqual(S04['addedRuntime'], [])
            self.assertTrue((set(S04_CHANGES) | set(S04_REMOVED)) <= {row['path'] for row in TARGET['expected']})

        if HAS_S05:
            self.assertEqual(S05['version'], '2.0.4.0')
            self.assertEqual(S05['issue'], 220)
            self.assertEqual(S05['step'], 'S05')
            self.assertEqual(S05['directBasis'], '2.0.3.0')
            self.assertEqual(S05['sourceCommit'], '514c3dcdaae09b7e583326089316ada59c229e9f')
            self.assertEqual(S05['archiveSha256'], '36041055ed9c9aec30edda9605bc229251f25bd1e47f796476ff59881460ee43')
            self.assertEqual(sorted(S05_CHANGES), ["manifest.json","src/background/services/template-fill-service.js","src/content/template-filler.js","src/content/template-form-fields.js","src/content/template-verification.js"])
            self.assertEqual(S05['addedRuntime'], [])
            self.assertEqual(S05['removedRuntime'], [])
            self.assertTrue(set(S05_CHANGES) <= {row['path'] for row in TARGET['expected']})

        if HAS_S06:
            self.assertEqual(S06['version'], '2.0.5.0')
            self.assertEqual(S06['issue'], 222)
            self.assertEqual(S06['step'], 'S06')
            self.assertEqual(S06['directBasis'], '2.0.4.0')
            self.assertEqual(S06['sourceCommit'], '5d650e288ef2cea615f17717ebb1531b1cc4b4ae')
            self.assertEqual(S06['archiveSha256'], 'b44c07e1dd19cef1ec5416ab86f621dc12822d22ac6dbd83d72821938c5350cd')
            self.assertEqual(sorted(S06_CHANGES), S06_PATHS)
            self.assertEqual(S06['addedRuntime'], [])
            self.assertEqual(S06['removedRuntime'], [])
            self.assertTrue(set(S06_CHANGES) <= {row['path'] for row in TARGET['expected']})

        if HAS_S06_HOTFIX:
            self.assertEqual(sorted(S06_HOTFIX_CHANGES), ['manifest.json','src/background/services/remote-delete-replacement-service.js','src/content/inventory-delete-operations.js'])
            self.assertTrue(set(S06_HOTFIX_CHANGES) <= set(S06_CHANGES))

        if HAS_S07:
            self.assertEqual(sorted(S07_CHANGES), ["manifest.json","src/app/archive-insertion-ui-controller.js","src/app/trash-template-ui-controller.js","src/background/controllers/template-fill-controller.js","src/background/services/archive-insertion-recovery-service.js","src/background/services/template-fill-service.js","src/content/template-filler.js","src/content/template-publish-flow.js"])
            self.assertTrue(set(S07_CHANGES) <= {row['path'] for row in TARGET['expected']})

    def test_exact_package_and_active_js_scope(self):
        tree = ast.parse((ROOT / 'scripts/package.py').read_text(encoding='utf-8'))
        runtime = next(node for node in tree.body if isinstance(node, ast.Assign)
                       and any(isinstance(t, ast.Name) and t.id == 'runtime' for t in node.targets))
        paths = ast.literal_eval(runtime.value)
        self.assertEqual(len(paths), len(set(paths)))
        expected = list(TARGET['packaged'])
        if HAS_S09:
            expected.insert(expected.index('src/app/renewal-settings-controller.js') + 1, S09_ADDED)
        if HAS_S04:
            expected = [p for p in expected if p not in S04_REMOVED]
        self.assertEqual(paths, expected)
        for path in paths:
            self.assertTrue((ROOT / path).is_file(), path)
        active = {p.relative_to(ROOT).as_posix() for folder in ('src', 'lib')
                  for p in (ROOT / folder).rglob('*.js')}
        self.assertEqual(active, {p for p in paths if p.endswith('.js')})
        for path in TARGET['absent']:
            if HAS_S09 and path == S09_ADDED:
                self.assertTrue((ROOT / path).is_file(), path)
            else:
                self.assertFalse((ROOT / path).exists(), path)

    def test_product_version_and_metadata(self):
        import sys
        sys.path.insert(0, str(ROOT / 'scripts'))
        import product_version
        documents = {p: json.loads((ROOT / p).read_text(encoding='utf-8')) for p in product_version.META}
        self.assertEqual(TARGET['version'], '2.0.0.0')
        self.assertIn(VERSION, ('2.0.0.0', '2.0.0.1', '2.0.1.0', '2.0.2.0', '2.0.3.0', '2.0.4.0', '2.0.5.0', '2.0.5.1', '2.0.6.0'))
        self.assertEqual(product_version.validate_metadata(documents), VERSION)
        if VERSION == '2.0.0.1':
            self.assertEqual(documents['release/release-spec.json']['hotfix'], {"issue":212,"directBasis":"2.0.0.0","sourceCommit":"f659c85d704d641f07cdd5b1cb89de685c5f0a5d","archiveSha256":"cc9ec37d0e9bf3c7688438ad04e9df0983a71d54b0802833906d8580d5902839","runtimeBlob":"f75e6e9dfb1bb2491c8a7d9bd5932c53baf99998","manifestBlob":"a7376f5782888fac78d51c567cd7699e82705a2c"})
        else:
            self.assertNotIn('hotfix', documents['release/release-spec.json'])
        if HAS_S09:
            self.assertEqual(documents['release/release-spec.json']['s09'], {"issue":214,"step":"S09","directBasis":"2.0.0.1","sourceCommit":"3457cc52fbd90515d47fa4a4c180fde6361b1f27","archiveSha256":"e4ec9da3cb6604e807b640169dd2df849a9a444eb95f268c627e835f8dfe1383"})
            self.assertEqual(documents['release/release-spec.json']['directBasis'], '2.0.5.1' if HAS_S07 else '2.0.5.0' if HAS_S06_HOTFIX else '2.0.4.0' if HAS_S06 else '2.0.3.0' if HAS_S05 else '2.0.2.0' if HAS_S04 else '2.0.1.0' if HAS_S03 else '2.0.0.1')
            if HAS_S03:
                self.assertEqual(documents['release/release-spec.json']['s03'], {k:S03[k] for k in ('issue','step','directBasis','sourceCommit','archiveSha256')})
            else:
                self.assertNotIn('s03', documents['release/release-spec.json'])
        else:
            self.assertEqual(documents['release/release-spec.json']['directBasis'], '1.23.48')
        if HAS_S04:
            self.assertEqual(documents['release/release-spec.json']['s04'], {k:S04[k] for k in ('issue','step','directBasis','sourceCommit','archiveSha256')})
        else:
            self.assertNotIn('s04', documents['release/release-spec.json'])

        if HAS_S05:
            self.assertEqual(documents['release/release-spec.json']['s05'], {k:S05[k] for k in ('issue','step','directBasis','sourceCommit','archiveSha256')})
        else:
            self.assertNotIn('s05', documents['release/release-spec.json'])

        if HAS_S06:
            self.assertEqual(documents['release/release-spec.json']['s06'], {k:S06[k] for k in ('issue','step','directBasis','sourceCommit','archiveSha256')})
        else:
            self.assertNotIn('s06', documents['release/release-spec.json'])
        if HAS_S06_HOTFIX:
            self.assertEqual(documents['release/release-spec.json']['s06Hotfix'], S06_HOTFIX)
        else:
            self.assertNotIn('s06Hotfix', documents['release/release-spec.json'])
        if HAS_S07:
            self.assertEqual(documents['release/release-spec.json']['s07'], S07)
        else:
            self.assertNotIn('s07', documents['release/release-spec.json'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
