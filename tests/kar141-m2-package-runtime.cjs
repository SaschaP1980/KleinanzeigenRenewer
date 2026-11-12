'use strict';
// KAR-141 M2: test-first protection against duplicate Chrome ZIP members.
// A duplicate runtime entry silently corrupts the installable archive and must fail
// BEFORE the packaged Chromium job, without weakening KAR-48 source/ZIP parity.
const fs = require('node:fs');
const assert = require('node:assert/strict');
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
for (const filename of required) {
  assert.equal(members.filter(name => name === filename).length, 1,
    'consolidated safety runtime module must be listed exactly once: ' + filename);
  assert.ok(fs.existsSync(filename), 'consolidated safety module not present: ' + filename);
}
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const spec = JSON.parse(fs.readFileSync('release/release-spec.json', 'utf8'));
assert.equal(pkg.version, manifest.version, 'do not regress approved production version');
assert.equal(spec.version, manifest.version, 'do not revert committed release metadata');
for (const stem of [
  'kar99-workflow-fence', 'kar101-autonomous-admission', 'kar103-startup-owner-map',
  'kar105-persisted-owner-observer', 'kar107-autonomous-owner-coverage',
  'kar109-routed-owner-inflight', 'kar111-identity-uncertainty',
  'kar113-renewal-detached-admission', 'kar115-automatic-phase4-admission',
  'kar117-uncertain-phase4-journal', 'kar124-phase4-journal-owner-observer',
  'kar128-manual-phase4-journal-boundary', 'kar130-archive-detached-admission',
  'kar132-modern-category-modal', 'kar132-wearables-attributes',
  'kar136-roster-assessment', 'kar138-complete-roster-integration'
]) {
  const file = 'tests/' + stem + '.cjs';
  assert.ok(fs.existsSync(file), 'missing historical or new regression test: ' + file);
  assert.ok(pkg.scripts.test.includes('node ' + file),
    'required regression test is not included in mandatory npm test: ' + file);
}
console.log('PASS KAR-141 M2 unique Chrome runtime entries, historical safety and current main tests');
