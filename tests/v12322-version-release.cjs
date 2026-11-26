'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const j = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const manifest = j('manifest.json');
const pkg = j('package.json');
const lock = j('package-lock.json');
const spec = j('release/release-spec.json');
const arch = j('docs/history/architecture/architecture-progress-v1.23.22.json');
const isFeature24 = /^1\.(?:24|25)\.(?:0|[1-9]\d*)$/.test(manifest.version);
const s05 = require('./current-patch-policy.cjs').isS05Version(manifest.version);
const s04 = require('./current-patch-policy.cjs').isS04Version(manifest.version);
const reviewedNative = /^1\.23\.(?:3\d|[4-9]\d|[1-9]\d{2,})$/.test(manifest.version) || isFeature24;
const reviewedFence = fs.existsSync('src/background/services/update-workflow-fence.js') && fs.readFileSync('src/background/background.js','utf8').includes('"services/update-workflow-fence.js"');
const reviewedPersistedObserver = fs.existsSync('src/background/services/persisted-owner-observer.js') && fs.readFileSync('src/background/background.js','utf8').includes('"services/persisted-owner-observer.js"');
const reviewedPhase4Journal = fs.existsSync('src/background/services/phase4-uncertainty-journal.js') && fs.readFileSync('src/background/background.js','utf8').includes('"services/phase4-uncertainty-journal.js"');
const reviewedAdditionalOwners = fs.existsSync('src/background/services/additional-owner-observer.js') && fs.readFileSync('src/background/background.js','utf8').includes('"services/additional-owner-observer.js"') && fs.readFileSync('src/background/background.js','utf8').includes("KRDeps.require('KRAdditionalOwnerObserver')");
const reviewedAtomicArbiter = fs.existsSync('src/background/services/cross-worker-atomic-admission.js') && fs.readFileSync('src/background/background.js','utf8').includes('"services/cross-worker-atomic-admission.js"') && fs.readFileSync('src/background/background.js','utf8').includes("KRDeps.require('KRAtomicMV3Admission')");
const reviewedAutoPublishIntent = fs.existsSync('src/background/services/auto-publish-intent-journal.js') && fs.readFileSync('src/background/background.js','utf8').includes('"services/auto-publish-intent-journal.js"') && fs.readFileSync('src/background/background.js','utf8').includes("KRDeps.require('KRAutoPublishIntentJournal')");
const reviewedTrustedOwner = fs.existsSync('src/background/services/trusted-owner-authority.js') && fs.readFileSync('src/background/background.js','utf8').includes('"services/trusted-owner-authority.js"') && fs.readFileSync('src/background/background.js','utf8').includes("KRDeps.require('KRTrustedOwnerAuthority')") && fs.readFileSync('scripts/package.py','utf8').includes("'src/background/services/trusted-owner-authority.js'");
const { assertCompatibleCurrentPatch, assertRestoredBaselineVersion } = require('./current-patch-policy.cjs');

const restoredBaseline = require('./current-patch-policy.cjs').isReviewedRestoreVersion(manifest.version);
if (restoredBaseline) {
  assertRestoredBaselineVersion();
  // Exact 122 historical blobs, 124 package entries, active JS closure and 22 absences.
  // Do not compare the restored v1.23.48 runtime to the older v1.23.22 hashes.
  require('node:child_process').execFileSync('python3',['tests/kar210-baseline-restore.py'],{stdio:'inherit'});
} else if (manifest.version === '1.24.0' || manifest.version === '1.25.0') {
  for (const version of [pkg.version, pkg.displayVersion, lock.version, lock.packages[''].version, spec.version, spec.packageVersion]) {
    assert.equal(version, manifest.version, 'minor-version metadata parity');
  }
  assert.match(spec.scope.join('\n'), /Dynamic Public Function Coverage 100 %/);
  assert.match(spec.scope.join('\n'), /Architecture-No-Regression/);
} else assert.equal(assertCompatibleCurrentPatch({ manifest, pkg, lock, spec }), manifest.version);
assert.equal(manifest.version_name, undefined);

assert.equal(spec.directBasis, restoredBaseline ? (s05?'2.0.3.0':s04?'2.0.2.0':manifest.version==='2.0.2.0'?'2.0.1.0':manifest.version==='2.0.1.0'?'2.0.0.1':'1.23.48') : '1.23.20_c1');
assert.equal(spec.nextPlannedBuild, restoredBaseline || isFeature24 ? 'TBD' : '1.24.0');
assert.equal(arch.packageVersion, '1.23.22');
assert.equal(arch.fix.newRuntimeBoundary, false);
assert.equal(arch.fix.newMessageType, false);
assert.equal(arch.fix.exactTitleEqualityPreserved, true);
assert.equal(arch.testFirst.baselineResult, 'RED');
assert.equal(arch.testFirst.fixedResult, 'GREEN');
assert.deepEqual(arch.runtime.changedVsV12320c1.sort(), ['src/content/template-filler.js','src/content/template-verification.js'].sort());
// KAR-150 extends only the app composition bindings for the new durable
// stop-on-error control. Preserve a precise SHA pin and executable UI fixture,
// rather than dropping the historical composition-root integrity invariant.
const kar150App = fs.readFileSync('src/app/app.js', 'utf8');
const kar150Ui = fs.readFileSync('src/app/mass-renewal-ui-controller.js', 'utf8');
if (restoredBaseline) {
  assert.ok(!kar150App.includes('massRenewalStopOnError'));
  assert.ok(!kar150Ui.includes('massRenewalStopOnErrorPreferenceV1'));
} else if (isFeature24) {
  assert.match(kar150App, /KRTrashRetentionSettingsController/);
  assert.match(pkg.scripts.test, /kar161-trash-retention\.cjs/);
  assert.match(fs.readFileSync('src/app/app-elements.js','utf8'), /trashRetentionRange/);
} else if (kar150App.includes('massRenewalOrderList, massRenewalStopOnError, massRenewalStopOnErrorStatus')) {
  assert.match(pkg.scripts.test, /tests\/kar150-stop-on-error\.cjs/);
  assert.match(pkg.scripts.test, /tests\/kar150-ui-preference\.cjs/);
  assert.match(kar150Ui, /massRenewalStopOnErrorPreferenceV1/);
  if (kar150App.includes('massRenewalSearchInput, massRenewalSearchClear')) {
    assert.ok(pkg.scripts.test.includes('tests/kar151-mass-title-search.cjs'));
    assert.ok(kar150Ui.includes('inventoryView.deriveInventoryView(eligible'));
    assert.equal(sha('src/app/app.js'), '893a7b5c5ed5188dc8ff96f6fdb85fd31b6c2c7ed3c1c79eda022ee2cff1311d');
  } else assert.equal(sha('src/app/app.js'), '501a26974b107dd27e843dde75b68a2535429da5d86f0bd9f40cbd206a665e08');
} else assert.equal(sha('src/app/app.js'), arch.runtime.appJsSha256);
if(!reviewedNative && !restoredBaseline)assert.equal(sha('src/background/background.js'), arch.runtime.backgroundJsSha256);
else if(s04) { assert.doesNotMatch(fs.readFileSync('src/background/background.js','utf8'),/NativeStatusBridge|sendNativeMessage/); }
else {
  const worker=fs.readFileSync('src/background/background.js','utf8');
  assert.match(worker, /services\/native-update-status-gateway\.js/);
  assert.match(worker, /services\/native-status-bridge\.js/);
  assert.match(worker, /requireNativeStatusBridge\(\)\.status\(message, sender\)/);
}
// KAR-132: keep the v1.23.22 exact historical SHA unless the later,
// independently tested modern category-modal fix intentionally changes the
// template filler. A marker alone is not sufficient: require the guarded
// modal workflow, unchanged legacy path and new exact postcommit readback.
const categoryFiller = fs.readFileSync('src/content/template-filler.js', 'utf8');
const categoryAdapter = fs.readFileSync('src/content/template-category-flow.js', 'utf8');
if (categoryFiller.includes('if (categoryState?.confirmed) form = resolveActivePostingForm(form);')) {
  assert.match(categoryAdapter, /if \(opening\.modernDialog\) return await selectModernCategory/);
  assert.match(categoryAdapter, /function runLegacyCategorySelection\(session\)/);
  assert.match(categoryAdapter, /CATEGORY_MODAL_LEAF_CONFIRMED/);
  assert.match(categoryAdapter, /CATEGORY_MODAL_COMMIT_VERIFIED/);
  assert.match(categoryAdapter, /inputs\.length === 1 && String\(inputs\[0\]\.value\) === wanted/);
  assert.match(categoryAdapter, /confirm\.getAttribute\('aria-disabled'\) !== 'false'/);
  assert.match(categoryFiller, /if \(categoryState\?\.pendingNavigation\) return \{ pending: true, issues \}/);
} else {
  assert.equal(sha('src/content/template-filler.js'), arch.runtime.templateFillerSha256);
}
// The 2026 KAR-132 native Smartwatches form uses real checkbox inputs rather
// than hidden technical fields. Preserve the exact historic verifier SHA for
// earlier sources; when the new field adapter is present require the gated
// checked-state contract and its independent RED/GREEN runtime tests.
const verifier = fs.readFileSync('src/content/template-verification.js', 'utf8');
if (verifier.includes("matching[0].type === 'checkbox'")) {
  assert.match(pkg.scripts.test, /kar132-wearables-attributes\.cjs/);
  assert.match(verifier, /expectValue\('input\[name="categoryId"\]', template\.categoryId, 'Kategorie'\)/);
  assert.match(verifier, /matching\.length === 1 && matching\[0\]\.type === 'checkbox'/);
  assert.match(verifier, /matching\[0\]\.checked === wantedChecked/);
  assert.match(verifier, /wantedChecked !== null/);
  if (s05) {
    assert.match(verifier, /attribute\.technicalValue === null \|\| attribute\.technicalValue === undefined \|\| attribute\.technicalValue === ''/);
    assert.match(verifier, /attribute\.required \|\| \['captured', 'technical-only'\]\.includes\(attribute\.status\)/);
    assert.match(verifier, /if \(matches && attribute\.recoveredDisplayValue\)/);
    assert.match(verifier, /=== attribute\.recoveredDisplayValue/);
    assert.match(pkg.scripts.test, /kar220-field-transfer\.cjs/);
  } else assert.match(verifier, /attribute\.technicalValue === ''\) continue/);
  assert.match(verifier, /if \(!matches\) issues\.push/);
  assert.match(fs.readFileSync('src/content/template-form-fields.js', 'utf8'),
    /input\.click\(\); \/\/ React-owned native change/);
} else assert.equal(sha('src/content/template-verification.js'), arch.runtime.templateVerificationSha256);
assert.equal(spec.performanceGoldlines.length, 2);
assert.deepEqual(spec.performanceGoldlines.map(x => [x.totalSeconds, x.averageSeconds]), [[61.277,20.426],[110.34,36.771]]);
assert.match(fs.readFileSync('scripts/release_finalize.py','utf8'), /Goldlinien-Performance-Matrix/);
assert.match(pkg.scripts.test, /v12322-title-field-stability\.cjs/);
assert.match(pkg.scripts.test, /v12322-version-release\.cjs/);

const files=[];
(function walk(dir){ for(const e of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir,e.name); if(e.isDirectory()) walk(p); else if(p.endsWith('.js')) files.push(p.replace(/\\/g,'/')); } })('src');
files.sort();
const tree=crypto.createHash('sha256');
for(const p of files){ tree.update(p); tree.update('\0'); tree.update(Buffer.from(sha(p),'hex')); }
const kar134SchemaRuntime = files.includes('src/shared/template-schema-core.js') && files.includes('src/content/template-schema-preflight.js') ? 2 : 0;
const kar175InventoryOwners = [
  ['src/background/services/inventory-capture-service.js','KRInventoryCaptureService'],
  ['src/background/services/inventory-refresh-service.js','KRInventoryRefreshService'],
  ['src/background/services/renewal-public-evidence-coordinator.js','KRRenewalPublicEvidenceCoordinator'],
  ['src/background/services/renewal-phase1-retry-service.js','KRRenewalPhase1RetryService'],
  ['src/background/services/publish-intent-authorization-service.js','KRPublishIntentAuthorizationService'],
  ['src/background/controllers/manual-listing-navigation-controller.js','KRManualListingNavigationController'],
  ['src/background/services/diagnostic-correlation-service.js','KRDiagnosticCorrelationService'],
  ['src/background/services/listing-url-evidence-service.js','KRListingUrlEvidenceService'],
  ['src/background/services/trash-template-publish-detection-service.js','KRTrashTemplatePublishDetectionService']
].filter(([file, provider]) => files.includes(file) &&
  fs.readFileSync('src/background/background.js','utf8').includes("KRDeps.require('"+provider+"')") &&
  fs.readFileSync('scripts/package.py','utf8').includes("'"+file+"'")).length;
if(s04) assert.equal(files.length,101);
else if(restoredBaseline) assert.equal(files.length,require('./current-patch-policy.cjs').isS09Version(manifest.version)?104:103);
else assert.equal(files.length, (reviewedAutoPublishIntent ? 109 : reviewedAtomicArbiter ? 108 : reviewedAdditionalOwners ? 107 : reviewedPhase4Journal ? 106 : reviewedPersistedObserver ? 105 : reviewedFence ? 104 : reviewedNative ? 103 : 100) + (reviewedTrustedOwner ? 1 : 0) + kar134SchemaRuntime + kar175InventoryOwners + (isFeature24 ? 2 : 0) + (files.includes('src/app/inventory-loading-state.js') ? 1 : 0));
if(s04) {
  for(const name of require('./current-patch-policy.cjs').S04_SCOPE.removedRuntime)assert.ok(!files.includes(name.path),name.path);
  assert.doesNotMatch(fs.readFileSync('src/app/app.html','utf8'),/native-update-check-ui\.js/);
} else if(reviewedNative || restoredBaseline) {
  if(reviewedFence){ assert.ok(files.includes('src/background/services/update-workflow-fence.js')); assert.match(fs.readFileSync('src/background/background.js','utf8'), /KRDeps\.require\('KRUpdateWorkflowFence'\)/); }
  if(reviewedAdditionalOwners){ assert.ok(files.includes('src/background/services/additional-owner-observer.js')); assert.match(fs.readFileSync('src/background/background.js','utf8'), /KRDeps\.require\('KRAdditionalOwnerObserver'\)/); }
  if(reviewedAutoPublishIntent){ assert.ok(files.includes('src/background/services/auto-publish-intent-journal.js')); assert.match(fs.readFileSync('src/background/background.js','utf8'), /KRDeps\.require\('KRAutoPublishIntentJournal'\)/); }
  if(reviewedAtomicArbiter){ assert.ok(files.includes('src/background/services/cross-worker-atomic-admission.js')); assert.match(fs.readFileSync('src/background/background.js','utf8'), /KRDeps\.require\('KRAtomicMV3Admission'\)/); }
  const allowedAdditions=['src/app/native-update-check-ui.js','src/background/services/native-status-bridge.js','src/background/services/native-update-status-gateway.js'];
  for(const name of allowedAdditions)assert.ok(files.includes(name),name);
  assert.equal(files.filter(x=>allowedAdditions.includes(x)).length,3);
  assert.match(fs.readFileSync('src/app/app.html','utf8'),/<script src="native-update-check-ui\.js"><\/script>/);
} else assert.equal(tree.digest('hex'), arch.runtime.treeSha256);
console.log('PASS v1.23.22 version, narrow correction scope, goldlines and runtime hashes');
