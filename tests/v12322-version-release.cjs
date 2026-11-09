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
const arch = j('architecture-progress-v1.23.22.json');
const reviewedNative = /^1\.23\.(?:3\d|[4-9]\d|[1-9]\d{2,})$/.test(manifest.version);
const reviewedFence = fs.existsSync('src/background/services/update-workflow-fence.js') && fs.readFileSync('src/background/background.js','utf8').includes('"services/update-workflow-fence.js"');
const reviewedPersistedObserver = fs.existsSync('src/background/services/persisted-owner-observer.js') && fs.readFileSync('src/background/background.js','utf8').includes('"services/persisted-owner-observer.js"');
const reviewedPhase4Journal = fs.existsSync('src/background/services/phase4-uncertainty-journal.js') && fs.readFileSync('src/background/background.js','utf8').includes('"services/phase4-uncertainty-journal.js"');
const { assertCompatibleCurrentPatch } = require('./current-patch-policy.cjs');

assert.equal(assertCompatibleCurrentPatch({ manifest, pkg, lock, spec }), manifest.version);
assert.equal(manifest.version_name, undefined);

assert.equal(spec.directBasis, '1.23.20_c1');
assert.equal(spec.nextPlannedBuild, '1.24.0');
assert.equal(arch.packageVersion, '1.23.22');
assert.equal(arch.fix.newRuntimeBoundary, false);
assert.equal(arch.fix.newMessageType, false);
assert.equal(arch.fix.exactTitleEqualityPreserved, true);
assert.equal(arch.testFirst.baselineResult, 'RED');
assert.equal(arch.testFirst.fixedResult, 'GREEN');
assert.deepEqual(arch.runtime.changedVsV12320c1.sort(), ['src/content/template-filler.js','src/content/template-verification.js'].sort());
assert.equal(sha('src/app/app.js'), arch.runtime.appJsSha256);
if(!reviewedNative)assert.equal(sha('src/background/background.js'), arch.runtime.backgroundJsSha256);
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
  assert.match(verifier, /attribute\.technicalValue === ''\) continue/);
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
assert.equal(files.length, (reviewedPhase4Journal ? 106 : reviewedPersistedObserver ? 105 : reviewedFence ? 104 : reviewedNative ? 103 : 100));
if(reviewedNative) {
  if(reviewedFence){ assert.ok(files.includes('src/background/services/update-workflow-fence.js')); assert.match(fs.readFileSync('src/background/background.js','utf8'), /KRDeps\.require\('KRUpdateWorkflowFence'\)/); }
  const allowedAdditions=['src/app/native-update-check-ui.js','src/background/services/native-status-bridge.js','src/background/services/native-update-status-gateway.js'];
  for(const name of allowedAdditions)assert.ok(files.includes(name),name);
  assert.equal(files.filter(x=>allowedAdditions.includes(x)).length,3);
  assert.match(fs.readFileSync('app.html','utf8'),/src\/app\/native-update-check-ui\.js/);
} else assert.equal(tree.digest('hex'), arch.runtime.treeSha256);
console.log('PASS v1.23.22 version, narrow correction scope, goldlines and runtime hashes');
