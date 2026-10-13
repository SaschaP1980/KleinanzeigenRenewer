'use strict';
// Test-only policy. Do not import from the Chrome extension runtime.
// Historical version lists remain historical facts; this policy only validates
// compatible *regular* PATCH releases of the current 1.23 correction series.
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const CURRENT_MINOR = '1.23';
const FIRST_CORRECTED_PATCH = 22;
const MANIFEST_KEY_SHA256 = '70507977688f3465a60227cd0261bd07d92fad620625cd7ebff8f0856d9c5ed3';
const PERMISSIONS = ['activeTab', 'scripting', 'storage', 'unlimitedStorage'];
const HOST_PERMISSIONS = [
  'https://www.kleinanzeigen.de/*',
  'https://kleinanzeigen.de/*',
  'https://img.kleinanzeigen.de/*'
];

function isCurrentPatchVersion(version) {
  if (typeof version !== 'string' || !/^1\.23\.(0|[1-9]\d*)$/.test(version)) return false;
  const patch = Number(version.slice(CURRENT_MINOR.length + 1));
  return Number.isSafeInteger(patch) && patch >= FIRST_CORRECTED_PATCH;
}

function assertCompatibleCurrentPatch({ manifest, pkg, lock, spec } = {}) {
  assert.ok(isCurrentPatchVersion(manifest?.version),
    'Only strict, regular 1.23.22+ PATCH versions qualify; not a correction or another minor');
  const version = manifest.version;
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version_name, undefined,
    'Corrections require their historical, explicitly versioned compatibility path');
  assert.equal(pkg?.version, version, 'package version must match manifest');
  assert.equal(pkg?.displayVersion, version, 'display version must match manifest');
  assert.equal(lock?.version, version, 'lock version must match manifest');
  assert.equal(lock?.packages?.['']?.version, version, 'lock root version must match manifest');
  assert.equal(spec?.version, version, 'release spec version must match manifest');
  assert.equal(spec?.packageVersion, version, 'release package version must match manifest');
  assert.equal(spec?.directBasis, '1.23.20_c1', 'correction direct basis must not drift');
  assert.equal(spec?.directBasisNativeGreen, true, 'verified direct basis must remain GREEN');
  assert.equal(spec?.nextPlannedBuild, '1.24.0', 'next minor/EPIC scope must remain pinned');
  assert.match(spec?.nextPlannedBuildGoal || '', /EPIC-REF-003|Mass Renewal Lifecycle Separation/);
  assert.equal(spec?.goldBaseline, '1.21.15', 'historical Gold baseline must not drift');
  assert.equal(spec?.performanceRunRequired, true);
  assert.match(spec?.performanceRule || '', /1\.23\.22|Fast-3er/,
    'correction-series performance comparison must stay relevant');
  const requiredPermissions = Number(version.split('.')[2]) >= 30
    ? [...PERMISSIONS, 'nativeMessaging'].sort()
    : PERMISSIONS;
  assert.deepEqual([...(manifest.permissions || [])].sort(), requiredPermissions);
  assert.deepEqual([...(manifest.host_permissions || [])].sort(), [...HOST_PERMISSIONS].sort());
  assert.equal(createHash('sha256').update(Buffer.from(manifest.key || '', 'base64')).digest('hex'),
    MANIFEST_KEY_SHA256, 'extension identity key must remain unchanged');
  assert.equal(spec?.safety?.runtimeSubmitCalls, 0);
  assert.equal(spec?.safety?.runtimeRequestSubmitCalls, 0);
  assert.equal(spec?.safety?.noNewRuntimeBoundary, true);
  assert.equal(spec?.safety?.publishViaVisibleGuardedControlOnly, true);
  assert.equal(spec?.safety?.unsafePostPublishRemainsFailClosed, true);
  assert.equal(spec?.coverage?.publicFunctions?.percent, 100);
  assert.equal(spec?.coverage?.publicFunctions?.covered,
    spec?.coverage?.publicFunctions?.total, 'all public functions require execution evidence');
  return version;
}

function expectedManifestPermissions(version) {
  const historic = ['activeTab', 'storage', 'unlimitedStorage', 'scripting'];
  return isCurrentPatchVersion(version) && Number(version.split('.')[2]) >= 30
    ? [...historic, 'nativeMessaging'] : historic;
}

function includesActivePatch(knownVersions, version) {
  assert.ok(Array.isArray(knownVersions), 'historical release predicate must remain an array');
  return knownVersions.includes(version) ||
    (knownVersions.includes('1.23.24') && isCurrentPatchVersion(version));
}

module.exports = { isCurrentPatchVersion, assertCompatibleCurrentPatch, includesActivePatch, expectedManifestPermissions };
