'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { isCurrentPatchVersion, assertCompatibleCurrentPatch, includesActivePatch, includesSupportedRelease, expectedManifestPermissions } = require('./current-patch-policy.cjs');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const canonical = {
  manifest: read('manifest.json'),
  pkg: read('package.json'),
  lock: read('package-lock.json'),
  spec: read('release/release-spec.json')
};
const clone = value => JSON.parse(JSON.stringify(value));
const historicalEra = ['1.23.20', '1.23.22', '1.23.23', '1.23.24'];
assert.equal(includesActivePatch(historicalEra, '1.23.25'), true);
assert.equal(includesActivePatch(historicalEra, '1.23.23'), true);
assert.equal(includesActivePatch(historicalEra, '1.23.21'), false);
assert.equal(includesActivePatch(['1.23.22', '1.23.23'], '1.23.25'), false);
assert.equal(includesActivePatch(historicalEra, '1.24.0'), false);
assert.equal(includesActivePatch(historicalEra, '1.24.1'), true,
  'historical release allowlists continue accepting strict PATCH successors');
assert.equal(includesSupportedRelease(historicalEra, '1.24.1'), true,
  'approved 1.24.x PATCH must still satisfy historical UI/runtime gates');
assert.equal(includesSupportedRelease(historicalEra, '1.24.01'), false,
  'malformed 1.24 PATCH must remain rejected');
assert.deepEqual(expectedManifestPermissions('1.24.0').sort(), canonical.manifest.permissions.slice().sort(),
  'approved minor must preserve the already granted nativeMessaging permission');
assert.equal(expectedManifestPermissions('1.24.01').includes('nativeMessaging'), false,
  'do not accept malformed MINOR values');
assert.equal(includesActivePatch(historicalEra, '1.23.025'), false);
assert.deepEqual(historicalEra, ['1.23.20', '1.23.22', '1.23.23', '1.23.24']);
// The live product has moved to MINOR 1.24.0 under KAR-161. Preserve the
// correction-era PATCH policy as a synthetic historical fixture, not by trying
// to validate the current MINOR release through the obsolete PATCH predicate.
const validCorrectionEra = clone(canonical);
for (const name of ['manifest', 'pkg', 'lock', 'spec']) validCorrectionEra[name].version = '1.23.92';
validCorrectionEra.pkg.displayVersion = '1.23.92';
validCorrectionEra.lock.packages[''].version = '1.23.92';
validCorrectionEra.spec.packageVersion = '1.23.92';
validCorrectionEra.spec.nextPlannedBuild = '1.24.0';
validCorrectionEra.spec.nextPlannedBuildGoal = 'EPIC-REF-003 – Mass Renewal Lifecycle Separation.';
validCorrectionEra.spec.performanceRunRequired = true;
validCorrectionEra.spec.performanceRule = 'v1.23.22 Fast-3er historical performance regression rule';
assert.equal(assertCompatibleCurrentPatch(validCorrectionEra), '1.23.92');

const validNextPatch = clone(validCorrectionEra);
for (const name of ['manifest', 'pkg', 'lock', 'spec']) validNextPatch[name].version = '1.23.25';
validNextPatch.pkg.displayVersion = '1.23.25';
validNextPatch.lock.packages[''].version = '1.23.25';
validNextPatch.spec.packageVersion = '1.23.25';
// Historical 1.23.25 fixture predates the reviewed v1.23.30 nativeMessaging permission.
validNextPatch.manifest.permissions = validNextPatch.manifest.permissions.filter(p => p !== 'nativeMessaging');

const isSyntheticNextPatch = process.env.KAR46_SYNTHETIC_PATCH === '1';
assert.ok(['1.24.0', '1.24.1', ...(isSyntheticNextPatch ? ['1.24.2'] : [])].includes(canonical.manifest.version),
  'only the approved KAR-161 MINOR, KAR-185 PATCH, or isolated next-PATCH fixture are current');
if (canonical.manifest.version === '1.24.0') {
  assert.equal(isCurrentPatchVersion(canonical.manifest.version), false,
    'the approved initial MINOR is not retroactively a PATCH');
} else {
  assert.equal(isCurrentPatchVersion(canonical.manifest.version), true,
    'the follow-up 1.24.1 version is a strict PATCH');
  assert.equal(assertCompatibleCurrentPatch(canonical), canonical.manifest.version,
    'current feature-series PATCH must satisfy exact existing safety metadata');
}
assert.equal(assertCompatibleCurrentPatch(validNextPatch), '1.23.25',
  'compatible future PATCH must not require editing historical version lists');
for (const [version, allowed] of [
  ['1.23.22', true], ['1.23.23', true], ['1.23.24', true], ['1.23.25', true],
  ['1.23.26', true], ['1.23.21', false], ['1.23.20_c1', false],
  ['1.24.0', false], ['1.24.1', true], ['1.24.2', true],
  ['1.24.01', false], ['1.25.0', false], ['2.0.0', false], ['1.23.025', false],
  ['1.23.-1', false], ['1.23.25-rc.1', false], ['1.23.25+meta', false],
  ['1.23.9007199254740992', false], ['', false], [null, false]
]) assert.equal(isCurrentPatchVersion(version), allowed, String(version));

const mutationCases = [
  ['manifest version malformed', x => { x.manifest.version = '1.23.025'; }],
  ['manifest version another minor', x => { x.manifest.version = '1.24.0'; }],
  ['manifest version older than correction', x => { x.manifest.version = '1.23.21'; }],
  ['package version mismatch', x => { x.pkg.version = '1.23.24'; }],
  ['display version mismatch', x => { x.pkg.displayVersion = '1.23.24'; }],
  ['lock version mismatch', x => { x.lock.version = '1.23.24'; }],
  ['lock root mismatch', x => { x.lock.packages[''].version = '1.23.24'; }],
  ['release spec version mismatch', x => { x.spec.version = '1.23.24'; }],
  ['release artifact version mismatch', x => { x.spec.packageVersion = '1.23.24'; }],
  ['correction suffix rejected', x => { x.manifest.version_name = '1.23.25_c1'; }],
  ['stale direct basis rejected', x => { x.spec.directBasis = '1.23.24'; }],
  ['unverified direct basis rejected', x => { x.spec.directBasisNativeGreen = false; }],
  ['incorrect next minor target', x => { x.spec.nextPlannedBuild = '1.24.1'; }],
  ['incorrect next minor goal', x => { x.spec.nextPlannedBuildGoal = 'Unrelated release'; }],
  ['historical Gold changed', x => { x.spec.goldBaseline = '1.23.24'; }],
  ['performance gate removed', x => { x.spec.performanceRunRequired = false; }],
  ['performance rule drift', x => { x.spec.performanceRule = 'No measurements'; }],
  ['manifest identity changed', x => { x.manifest.key = Buffer.from('other').toString('base64'); }],
  ['browser permissions changed', x => { x.manifest.permissions.push('tabs'); }],
  ['host permissions changed', x => { x.manifest.host_permissions.push('https://example.com/*'); }],
  ['unsafe submit accepted', x => { x.spec.safety.runtimeSubmitCalls = 1; }],
  ['unsafe requestSubmit accepted', x => { x.spec.safety.runtimeRequestSubmitCalls = 1; }],
  ['new runtime boundary', x => { x.spec.safety.noNewRuntimeBoundary = false; }],
  ['unguarded publish', x => { x.spec.safety.publishViaVisibleGuardedControlOnly = false; }],
  ['unsafe post-publish', x => { x.spec.safety.unsafePostPublishRemainsFailClosed = false; }],
  ['public function coverage removed', x => { x.spec.coverage.publicFunctions.percent = 99; }],
  ['public function total mismatch', x => { x.spec.coverage.publicFunctions.covered -= 1; }]
];
for (const [name, mutate] of mutationCases) {
  const fixture = clone(validNextPatch);
  mutate(fixture);
  assert.throws(() => assertCompatibleCurrentPatch(fixture), undefined, name);
}
console.log('PASS KAR-46 current PATCH policy: valid next version, historical boundaries and ' +
  mutationCases.length + ' fail-closed negative cases');
