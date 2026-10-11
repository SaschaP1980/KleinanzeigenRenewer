const assert = require('assert');
const fs = require('fs');
const crypto = require('crypto');

let passed = 0;
const ok = (name, fn) => { try { fn(); passed++; console.log('PASS ' + name); } catch (error) { console.error('FAIL ' + name); throw error; } };
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const baselinePath = 'architecture-baseline-v1.23.0.json';

ok('release remains within the planned v1.23.x EPIC-REF-002 wave', () => {
  assert.match(manifest.version, /^1\.23\.\d+$/);
  assert.equal(pkg.version, manifest.version);
  assert.equal(pkg.displayVersion, manifest.version);
});
ok('EPIC-REF-002 architecture baseline is shipped in source', () => assert.ok(fs.existsSync(baselinePath)));

if (fs.existsSync(baselinePath)) {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  ok('architecture baseline identifies the exact v1.22.30 source', () => {
    assert.equal(baseline.baseVersion, '1.22.30');
    assert.equal(baseline.baseSourceSha256, '6f34e313180fe63c3fe22ee3eedf1a1d2448c49d91fdcf67c40ba8dace50fc02');
  });
  ok('all fourteen extraction spots are explicitly planned', () => {
    assert.equal(baseline.extractionSpots.length, 14);
    const ids = new Set(baseline.extractionSpots.map(x => x.id));
    for (const id of ['renewal-workflow','mass-renewal-workflow','template-fill-orchestration','insertion-lock','archive-insertion','bulk-inventory-workflow','public-listing-evidence','diagnostic-export','account-session','profile-management','control-accordion','diagnostics-controls','renewal-settings','inventory-capture-orchestration']) assert.ok(ids.has(id), id);
  });
  ok('planned wave spans v1.23.1 through v1.23.11', () => {
    assert.equal(baseline.plan.firstExtractionVersion, '1.23.1');
    assert.equal(baseline.plan.finalSoakVersion, '1.23.11');
  });
  ok('modularization may not add Chrome runtime IPC boundaries', () => {
    assert.equal(baseline.invariants.noNewRuntimeBoundaryForModularization, true);
    assert.equal(baseline.invariants.keepAppAsUiEntrypoint, true);
    assert.equal(baseline.invariants.keepBackgroundAsServiceWorkerLifecycleBoundary, true);
  });
  ok('real three-listing performance run is reserved for final gate unless suspicion exists', () => {
    assert.equal(baseline.performance.realThreeListingGate.mandatoryVersion, '1.23.11');
    assert.equal(baseline.performance.realThreeListingGate.intermediatePolicy, 'only-on-concrete-performance-suspicion');
    assert.equal(baseline.performance.reproduced.v1203Seconds, 93.744);
    assert.equal(baseline.performance.reproduced.v12230Seconds, 99.332);
  });
  ok('v1.23.0 records unchanged entry-point hashes from v1.22.30', () => {
    assert.equal(baseline.entryPointBaseline.appJs.sha256, '0c9fdbd23c72db746494a535854e722685d2128658018847d6f3d7066d5de599');
    assert.equal(baseline.entryPointBaseline.backgroundJs.sha256, 'd1443315fcd1ed97a3c6d7c6254c1cca392b79c6983a8666604ccb47bf5fd7c9');
  });
  if (manifest.version === '1.23.0') {
    ok('v1.23.0 itself does not refactor app/background runtime code', () => {
      const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      assert.equal(hash('app.js'), baseline.entryPointBaseline.appJs.sha256);
      assert.equal(hash('background.js'), baseline.entryPointBaseline.backgroundJs.sha256);
    });
  } else {
    ok('later v1.23.x releases retain the immutable v1.23.0 entry-point baseline while allowing planned extraction', () => {
      assert.equal(baseline.entryPointBaseline.appJs.sha256, '0c9fdbd23c72db746494a535854e722685d2128658018847d6f3d7066d5de599');
      assert.equal(baseline.entryPointBaseline.backgroundJs.sha256, 'd1443315fcd1ed97a3c6d7c6254c1cca392b79c6983a8666604ccb47bf5fd7c9');
      assert.notEqual(crypto.createHash('sha256').update(fs.readFileSync('background.js')).digest('hex'), baseline.entryPointBaseline.backgroundJs.sha256);
    });
  }
}
console.log(`${passed} PASS v1.23.0 EPIC-REF-002 contract`);
