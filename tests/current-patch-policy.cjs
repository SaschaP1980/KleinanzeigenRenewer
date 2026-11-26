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
  if(isS04Version(version)) return historic;
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
const S09_VERSION = '2.0.1.0';
const S09_SCOPE = require('../docs/maintenance/KAR214_SUCCESSOR_SCOPE.json');
const S09_ALLOWED = Object.freeze(["manifest.json","src/app/app-elements.js","src/app/app.css","src/app/app.html","src/app/app.js","src/app/inventory-card-renderer.js","src/app/inventory-formatting.js","src/app/inventory-view.js","src/app/record-card-view.js","src/app/renewal-dialog-controller.js","src/app/trash-card-renderer.js","src/app/trash-retention-settings-controller.js","src/background/background-message-router.js","src/background/background.js","src/background/repositories/inventory-repository.js","src/background/services/bulk-reconciliation-service.js","src/background/services/remote-delete-replacement-service.js","src/background/services/trash-service.js","src/shared/message-contract-registry.js"]);
const S09_ADDED = 'src/app/trash-retention-settings-controller.js';
assert.equal(S09_SCOPE.schemaVersion,1);
assert.equal(S09_SCOPE.version,S09_VERSION);
assert.equal(S09_SCOPE.issue,214);
assert.equal(S09_SCOPE.step,'S09');
assert.equal(S09_SCOPE.directBasis,'2.0.0.1');
assert.equal(S09_SCOPE.sourceCommit,'3457cc52fbd90515d47fa4a4c180fde6361b1f27');
assert.equal(S09_SCOPE.archiveSha256,'e4ec9da3cb6604e807b640169dd2df849a9a444eb95f268c627e835f8dfe1383');
assert.deepEqual(S09_SCOPE.runtimeChanges.map(r=>r.path).sort(),S09_ALLOWED);
assert.deepEqual(S09_SCOPE.addedRuntime,[S09_ADDED]);
const S09_METADATA=Object.freeze({"issue":214,"step":"S09","directBasis":"2.0.0.1","sourceCommit":"3457cc52fbd90515d47fa4a4c180fde6361b1f27","archiveSha256":"e4ec9da3cb6604e807b640169dd2df849a9a444eb95f268c627e835f8dfe1383"});
const S03_VERSION = '2.0.2.0';
const S03_SCOPE = require('../docs/maintenance/KAR213_SUCCESSOR_SCOPE.json');
const S03_METADATA=Object.freeze({"issue":213,"step":"S03","directBasis":"2.0.1.0","sourceCommit":"61f917d384cdce0fc191188e5a99515907967dbe","archiveSha256":"15e58983d23a0706a301e161c76bf52c4e2885667fb7214b6f80b8f1209c798a"});
const S03_ALLOWED=Object.freeze(["manifest.json","src/app/profile-backup-controller.js","src/app/profile-backup-storage-service.js","src/background/controllers/mass-renewal-controller.js","src/background/controllers/mass-renewal-workflow-controller.js","src/background/controllers/profile-management-controller.js","src/background/controllers/renewal-workflow-controller.js","src/background/controllers/template-fill-controller.js","src/background/repositories/profile-repository.js","src/background/repositories/renewal-state-repository.js","src/background/services/archive-insertion-recovery-service.js","src/background/services/archive-insertion-service.js","src/background/services/mass-renewal-watchdog-service.js","src/background/services/remote-delete-replacement-service.js","src/background/services/template-fill-service.js"]);
assert.equal(S03_SCOPE.schemaVersion,1);
assert.equal(S03_SCOPE.version,S03_VERSION);
for(const [key,value] of Object.entries(S03_METADATA))assert.equal(S03_SCOPE[key],value);
assert.equal(S03_SCOPE.sourceCheckpoint,'89d225a48c5c863687fecbabc910693b5e1a1fd1');
assert.deepEqual(S03_SCOPE.runtimeChanges.map(r=>r.path).sort(),S03_ALLOWED);
assert.deepEqual(S03_SCOPE.addedRuntime,[]);
assert.deepEqual(S03_SCOPE.reactivatedTests,[]);
// Explicit S04 successor, retaining S03 and S09 capability contracts.
const S04_VERSION = '2.0.3.0';
const S04_SCOPE = require('../docs/maintenance/KAR217_SUCCESSOR_SCOPE.json');
const S04_METADATA=Object.freeze({"issue":217,"step":"S04","directBasis":"2.0.2.0","sourceCommit":"a88a3446560cb36c87a3ace599a0bbd0549c6f41","archiveSha256":"46cb5860015965fee5323dcedd290862672cc97e03e880180afc464ff3bf89ee"});
const S04_CHANGED=Object.freeze(['manifest.json','src/app/app.css','src/app/app.html','src/background/background-message-router.js','src/background/background.js','src/shared/message-contract-registry.js']);
const S04_REMOVED=Object.freeze(['src/app/native-update-check-ui.js','src/background/services/native-status-bridge.js','src/background/services/native-update-status-gateway.js']);
assert.equal(S04_SCOPE.schemaVersion,1);
assert.equal(S04_SCOPE.version,S04_VERSION);
for(const [key,value] of Object.entries(S04_METADATA))assert.equal(S04_SCOPE[key],value);
assert.equal(S04_SCOPE.sourceCheckpoint,'2a59e9c670845760e4df3ac71b01fde48ecb206f');
assert.deepEqual(S04_SCOPE.runtimeChanges.map(r=>r.path).sort(),S04_CHANGED);
assert.deepEqual(S04_SCOPE.removedRuntime.map(r=>r.path).sort(),S04_REMOVED);
assert.deepEqual(S04_SCOPE.addedRuntime,[]);
assert.deepEqual(S04_SCOPE.reactivatedTests,[]);
function isS04Version(version) { return version === S04_VERSION; }
// These predicates denote reviewed capability lineage, never arbitrary future versions.
function isS03Version(version) { return version === S03_VERSION || isS04Version(version); }
function isS09Version(version) { return version === S09_VERSION || isS03Version(version); }
function isReviewedRestoreVersion(version) { return version === '2.0.0.0' || version === '2.0.0.1' || isS09Version(version); }
function expectedRestoredPackage(version,target) {
  if(!isS09Version(version)) return target.packaged;
  assert.ok(target.absent.includes(S09_ADDED));
  const paths=[...target.packaged], index=paths.indexOf('src/app/renewal-settings-controller.js');
  assert.ok(index>=0&&!paths.includes(S09_ADDED));
  paths.splice(index+1,0,S09_ADDED);
  return isS04Version(version)?paths.filter(p=>!S04_REMOVED.includes(p)):paths;
}
function expectedRestoredAbsent(version,target) {
  const paths=isS09Version(version)?target.absent.filter(p=>p!==S09_ADDED):target.absent;
  return isS04Version(version)?[...paths,...S04_REMOVED]:paths;
}
function expectedRestoredBlob(version, file, historicalBlob) {
  assert.ok(isReviewedRestoreVersion(version), 'unreviewed restored runtime');
  if(isS04Version(version)) {
    const before=expectedRestoredBlob(S03_VERSION,file,historicalBlob);
    const removed=S04_SCOPE.removedRuntime.find(row=>row.path===file);
    if(removed){assert.equal(removed.before,before,'S04 exact retired blob changed: '+file);return null;}
    const entry=S04_SCOPE.runtimeChanges.find(row=>row.path===file);
    if(!entry)return before;
    assert.equal(entry.before,before,'S04 exact predecessor blob changed: '+file);
    assert.match(entry.after,/^[a-f0-9]{40}$/);
    return entry.after;
  }
  if(isS03Version(version)) {
    const before=expectedRestoredBlob(S09_VERSION,file,historicalBlob);
    const entry=S03_SCOPE.runtimeChanges.find(row=>row.path===file);
    if(!entry)return before;
    assert.equal(entry.before,before,'S03 exact predecessor blob changed: '+file);
    assert.match(entry.after,/^[a-f0-9]{40}$/);
    return entry.after;
  }
  if(isS09Version(version)) {
    const entry=S09_SCOPE.runtimeChanges.find(row=>row.path===file);
    if(entry) {
      assert.equal(historicalBlob,entry.historicalBlob ?? undefined,'historical source pin changed: '+file);
      assert.match(entry.after,/^[a-f0-9]{40}$/);
      return entry.after;
    }
    return historicalBlob;
  }
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
  else assert.equal(spec.hotfix,undefined,'baseline must not carry active hotfix metadata');
  if(isS09Version(actual)) assert.deepEqual(spec.s09,S09_METADATA);
  else assert.equal(spec.s09,undefined,'baseline must not carry S09 successor metadata');
  if(isS03Version(actual)) assert.deepEqual(spec.s03,S03_METADATA);
  else assert.equal(spec.s03,undefined,'older baseline must not carry S03 successor metadata');
  if(isS04Version(actual)) assert.deepEqual(spec.s04,S04_METADATA);
  else assert.equal(spec.s04,undefined,'older baseline must not carry S04 successor metadata');
  assert.equal(manifest.version,actual);
  assert.equal(manifest.manifest_version,3);
  assert.equal(manifest.version_name,undefined);
  assert.equal(pkg.version,isS04Version(actual)?'2.0.3':isS03Version(actual)?'2.0.2':isS09Version(actual)?'2.0.1':'2.0.0');
  assert.equal(pkg.displayVersion,actual);
  assert.equal(spec.directBasis,isS04Version(actual)?'2.0.2.0':isS03Version(actual)?'2.0.1.0':isS09Version(actual)?'2.0.0.1':'1.23.48');
  assert.equal(spec.goldBaseline,'1.21.15');
  assert.equal(spec.performanceRunRequired,true);
  assert.deepEqual([...manifest.permissions].sort(),(isS04Version(actual)?[...PERMISSIONS]:[...PERMISSIONS,'nativeMessaging']).sort());
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

module.exports = { S04_SCOPE, isS04Version, S03_SCOPE, isS03Version, S09_SCOPE, isS09Version, expectedRestoredPackage, expectedRestoredAbsent, isReviewedRestoreVersion, expectedRestoredBlob, assertRestoredBaselineVersion, isCurrentPatchVersion, assertCompatibleCurrentPatch, includesActivePatch, includesSupportedRelease, expectedManifestPermissions };
