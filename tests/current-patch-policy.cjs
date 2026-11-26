'use strict';
// Test-only policy. Do not import from the Chrome extension runtime.
// Historical version lists remain historical facts; this policy only validates
// compatible *regular* PATCH releases of the approved 1.23, 1.24 and 1.25 series.
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const CURRENT_MINOR = '1.23';
const CURRENT_FEATURE_MINOR = '1.24';
const FIRST_CORRECTED_PATCH = 22;
const MANIFEST_KEY_SHA256 = '70507977688f3465a60227cd0261bd07d92fad620625cd7ebff8f0856d9c5ed3';
const PERMISSIONS = ['activeTab', 'scripting', 'storage', 'unlimitedStorage'];
const HOST_PERMISSIONS = [
  'https://www.kleinanzeigen.de/*',
  'https://kleinanzeigen.de/*',
  'https://img.kleinanzeigen.de/*'
];

function isCurrentPatchVersion(version) {
  if (typeof version !== 'string' || !/^1\.(23|24|25)\.(0|[1-9]\d*)$/.test(version)) return false;
  const minor = version.split('.').slice(0, 2).join('.');
  const patch = Number(version.slice(minor.length + 1));
  return Number.isSafeInteger(patch) &&
    (minor === CURRENT_MINOR ? patch >= FIRST_CORRECTED_PATCH :
      (minor === CURRENT_FEATURE_MINOR || minor === '1.25') && patch >= 1);
}

function assertCompatibleCurrentPatch({ manifest, pkg, lock, spec } = {}) {
  assert.ok(isCurrentPatchVersion(manifest?.version),
    'Only strict, regular 1.23.22+, 1.24.1+ or 1.25.1+ PATCH versions qualify; not a correction or another minor');
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
  if (version.startsWith(CURRENT_MINOR + '.')) {
    assert.equal(spec?.nextPlannedBuild, '1.24.0', 'historical next-minor scope must remain pinned');
    assert.match(spec?.nextPlannedBuildGoal || '', /EPIC-REF-003|Mass Renewal Lifecycle Separation/);
  } else {
    assert.equal(spec?.nextPlannedBuild, 'TBD', 'future minor scope must not be silently scheduled');
    assert.match(spec?.nextPlannedBuildGoal || '', /Determined by separately authorized open GitHub Issues/);
  }
  assert.equal(spec?.goldBaseline, '1.21.15', 'historical Gold baseline must not drift');
  if (version.startsWith(CURRENT_MINOR + '.')) {
    assert.equal(spec?.performanceRunRequired, true);
    assert.match(spec?.performanceRule || '', /1\.23\.22|Fast-3er/,
      'correction-series performance comparison must stay relevant');
  } else {
    assert.equal(spec?.performanceRunRequired, false);
    assert.match(spec?.performanceRule || '', /KAR-161 trash retention/,
      'the 1.24 source safety/performance baseline must remain unchanged');
  }
  const minor = Number(version.split('.')[1]);
  const requiredPermissions = minor >= 24 || Number(version.split('.')[2]) >= 30
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

// Historical 1.23 correction gates must not classify approved 1.24.x
// feature-series releases as part of the older correction/performance run.
function includesSupportedRelease(knownVersions, version) {
  return includesActivePatch(knownVersions, version) || version === '1.24.0' || version === '1.25.0' ||
    (typeof version === 'string' && (version.startsWith('1.24.') || version.startsWith('1.25.')) &&
      isCurrentPatchVersion(version));
}

function expectedManifestPermissions(version) {
  const historic = ['activeTab', 'storage', 'unlimitedStorage', 'scripting'];
  return (version === '1.24.0' || version === '1.25.0' || (isCurrentPatchVersion(version) &&
    (Number(version.split('.')[1]) >= 24 || Number(version.split('.')[2]) >= 30)))
    ? [...historic, 'nativeMessaging'] : historic;
}

function includesActivePatch(knownVersions, version) {
  assert.ok(Array.isArray(knownVersions), 'historical release predicate must remain an array');
  return knownVersions.includes(version) ||
    (knownVersions.includes('1.23.24') && isCurrentPatchVersion(version));
}

// KAR-210 exact baseline and KAR-212 explicitly authorized one-line successor.
const REVIEWED_HOTFIX = Object.freeze({"issue":212,"directBasis":"2.0.0.0","sourceCommit":"f659c85d704d641f07cdd5b1cb89de685c5f0a5d","archiveSha256":"cc9ec37d0e9bf3c7688438ad04e9df0983a71d54b0802833906d8580d5902839","runtimeBlob":"f75e6e9dfb1bb2491c8a7d9bd5932c53baf99998","manifestBlob":"a7376f5782888fac78d51c567cd7699e82705a2c"});
function isReviewedRestoreVersion(version) { return version === '2.0.0.0' || version === '2.0.0.1'; }
function expectedRestoredBlob(version, file, historicalBlob) {
  assert.ok(isReviewedRestoreVersion(version), 'unreviewed restored runtime');
  if(version==='2.0.0.1' && file==='src/background/background.js') {
    assert.equal(historicalBlob,'bbdeee5b2c6125545b22de209c4d52fd1bdeb9ad');
    return REVIEWED_HOTFIX.runtimeBlob;
  }
  if(version==='2.0.0.1' && file==='manifest.json') {
    assert.equal(historicalBlob,'d0d3038800b5ebc01ed1e39ea4533beed6fc8089');
    return REVIEWED_HOTFIX.manifestBlob;
  }
  return historicalBlob;
}
// Never alias to legacy PATCH or authorize arbitrary successors.
function assertRestoredBaselineVersion(root = require('node:path').resolve(__dirname,'..')) {
  const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
  const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
  const manifest=read('manifest.json'), pkg=read('package.json'), spec=read('release/release-spec.json');
  const actual=execFileSync('python3',[path.join(root,'scripts/product_version.py'),'--root',root],{encoding:'utf8'}).trim();
  assert.ok(isReviewedRestoreVersion(actual),'Only exact KAR-210 baseline or KAR-212 reviewed hotfix qualifies');
  if(actual==='2.0.0.1') assert.deepEqual(spec.hotfix,REVIEWED_HOTFIX);
  else assert.equal(spec.hotfix,undefined,'baseline must not carry successor metadata');
  assert.equal(manifest.version,actual);
  assert.equal(manifest.manifest_version,3);
  assert.equal(manifest.version_name,undefined);
  assert.equal(pkg.version,'2.0.0');
  assert.equal(pkg.displayVersion,actual);
  assert.equal(spec.directBasis,'1.23.48');
  assert.equal(spec.goldBaseline,'1.21.15');
  assert.equal(spec.performanceRunRequired,true);
  assert.deepEqual([...manifest.permissions].sort(),[...PERMISSIONS,'nativeMessaging'].sort());
  assert.deepEqual([...manifest.host_permissions].sort(),[...HOST_PERMISSIONS].sort());
  assert.equal(createHash('sha256').update(Buffer.from(manifest.key||'','base64')).digest('hex'),MANIFEST_KEY_SHA256);
  assert.equal(spec.safety.runtimeSubmitCalls,0);
  assert.equal(spec.safety.runtimeRequestSubmitCalls,0);
  assert.equal(spec.safety.noNewRuntimeBoundary,true);
  assert.equal(spec.safety.publishViaVisibleGuardedControlOnly,true);
  assert.equal(spec.safety.unsafePostPublishRemainsFailClosed,true);
  // Real coverage and native acceptance are separate gates, never inferred from a version.
  return actual;
}

module.exports = { isReviewedRestoreVersion, expectedRestoredBlob, assertRestoredBaselineVersion, isCurrentPatchVersion, assertCompatibleCurrentPatch, includesActivePatch, includesSupportedRelease, expectedManifestPermissions };
