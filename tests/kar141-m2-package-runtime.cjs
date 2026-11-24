'use strict';
// KAR-141 M2: test-first protection against duplicate Chrome ZIP members.
// A duplicate runtime entry silently corrupts the installable archive and must fail
// BEFORE the packaged Chromium job, without weakening KAR-48 source/ZIP parity.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const packageScript = fs.readFileSync('scripts/package.py', 'utf8');
const runtimeLine = packageScript.split(/\r?\n/).find(line => line.startsWith('runtime='));
assert.ok(runtimeLine, 'explicit runtime ZIP member list must exist');
const members = [...runtimeLine.matchAll(/'([^']+)'/g)].map(x => x[1]);
assert.ok(members.length > 90, 'runtime package closure must remain populated');
assert.equal(members.length, new Set(members).size,
  'Chrome runtime ZIP members must occur exactly once; duplicate paths are unsafe');
const required = [
  'src/background/services/update-workflow-fence.js',
  'src/background/services/persisted-owner-observer.js',
  'src/background/services/phase4-uncertainty-journal.js'
];
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const spec = JSON.parse(fs.readFileSync('release/release-spec.json', 'utf8'));
const generationTwo = typeof manifest.version === 'string' && Number(manifest.version.split('.')[0]) >= 2;
if (generationTwo) {
  // KAR-208/210: the later C owner/journal architecture is excluded. Retain
  // the packaging invariant, not an obligation to reintroduce those modules.
  assert.equal(execFileSync('python3', ['scripts/product_version.py'], {encoding:'utf8'}).trim(),
    manifest.version, 'canonical Chrome/npm/lock/release metadata must agree');
  for (const filename of required) {
    assert.ok(!members.includes(filename), 'excluded C module must not be packaged: ' + filename);
    assert.ok(!fs.existsSync(filename), 'excluded C module must not be active: ' + filename);
  }
  for (const filename of members) assert.ok(fs.statSync(filename).isFile(), 'missing package member: ' + filename);
  const target = JSON.parse(fs.readFileSync('docs/maintenance/KAR210_BASELINE_TARGET.json', 'utf8'));
  assert.equal(target.issue, 210);
  assert.equal(target.version, '2.0.0.0');
  if (manifest.version === target.version) {
    assert.deepEqual(members, target.packaged, 'exact KAR-210 baseline package scope');
    assert.equal(target.absent.length, 22, 'explicit baseline exclusions must remain complete');
    for (const filename of target.absent) {
      assert.ok(!members.includes(filename) && !fs.existsSync(filename), 'baseline-excluded source present: ' + filename);
    }
  }
} else {
  for (const filename of required) {
    assert.equal(members.filter(name => name === filename).length, 1,
      'consolidated safety runtime module must be listed exactly once: ' + filename);
    assert.ok(fs.existsSync(filename), 'consolidated safety module not present: ' + filename);
  }
  assert.equal(pkg.version, manifest.version, 'do not regress approved production version');
  assert.equal(spec.version, manifest.version, 'do not revert committed release metadata');
}
const historicalC = [
  'kar99-workflow-fence', 'kar101-autonomous-admission', 'kar103-startup-owner-map',
  'kar105-persisted-owner-observer', 'kar107-autonomous-owner-coverage',
  'kar109-routed-owner-inflight', 'kar111-identity-uncertainty',
  'kar113-renewal-detached-admission', 'kar115-automatic-phase4-admission',
  'kar117-uncertain-phase4-journal', 'kar124-phase4-journal-owner-observer',
  'kar128-manual-phase4-journal-boundary', 'kar130-archive-detached-admission'
];
const retainedProduct = [
  'kar132-modern-category-modal', 'kar132-wearables-attributes',
  'kar136-roster-assessment', 'kar138-complete-roster-integration'
];
for (const stem of [...historicalC, ...retainedProduct]) {
  const file = 'tests/' + stem + '.cjs';
  assert.ok(fs.existsSync(file), 'missing historical or new regression test: ' + file);
  // This is not an execution waiver for mixed product assertions. Their
  // disposition is owned by the KAR-210 test ledger, not this ZIP contract.
  if (!generationTwo || retainedProduct.includes(stem)) {
    assert.ok(pkg.scripts.test.includes('node ' + file),
      'required regression test is not included in mandatory npm test: ' + file);
  }
}
console.log('PASS KAR-141 M2 unique Chrome runtime entries, historical safety and current main tests');
