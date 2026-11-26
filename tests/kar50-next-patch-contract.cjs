'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { nextPatch } = require('./kar50-next-patch.cjs');
const root = path.resolve(__dirname, '..');
const current = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')).version;
const historical = require('./kar210-historical-contract-context.cjs');
const restored = historical.isRestored(root);
// Historical PATCH successor logic is exercised against a synthetic historical
// version after KAR-161 advances the active release to the approved 1.24 MINOR.
const patchSeriesFixture = (restored || current === '1.24.0' || current.startsWith('1.25.')) ? '1.23.92' : current;
if (restored) {
  // Legacy helper must remain narrow; generation-two metadata is validated
  // by the exact restored version contract, not by pretending it is 1.x.
  assert.throws(() => nextPatch(current), /PATCH|regular/);
  const meta = historical.legacyPatchMetadata(root);
  assert.equal(meta.manifest.version, '1.25.12');
}
const next = nextPatch(patchSeriesFixture);
assert.equal(nextPatch('1.23.24'), '1.23.25');
assert.equal(nextPatch('1.23.25'), '1.23.26');
assert.equal(nextPatch('1.23.26'), '1.23.27');
assert.equal(next, patchSeriesFixture.split('.').slice(0, 2).join('.') + '.' +
  (Number(patchSeriesFixture.split('.')[2]) + 1));
assert.equal(nextPatch('1.24.0'), '1.24.1');
assert.equal(nextPatch('1.24.1'), '1.24.2');
for (const invalid of ['1.23.21', '1.23.24_c1', '1.24.01', '1.25.0', '1.22.99',
 '1.23.-1', '1.23.025', '1.24.2147483647', '1.23.9007199254740991', null, 123, {}, '']) {
  assert.throws(() => nextPatch(invalid), /PATCH|regular/);
}
const runner = fs.readFileSync(path.join(root,'tests/current-patch-next-release-regression.cjs'),'utf8');
assert.match(runner, /nextPatch\(manifest\.version\)/);
assert.doesNotMatch(runner, /const next = ['"]1\.23\.25['"]/);
assert.doesNotMatch(runner, /assert\.equal\(manifest\.version, ['"]1\.23\.24['"]/);
for (const [f,key] of [['manifest.json','version'],['package.json','version'],
 ['package-lock.json','version'],['release/release-spec.json','version']]) {
 const value = JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
 assert.equal(value[key], restored && (f === 'package.json' || f === 'package-lock.json') ? '2.0.0' : current);
 if (restored && f === 'package.json') assert.equal(value.displayVersion,current);
 if (restored && f === 'package-lock.json') assert.equal(value.packages[''].version,'2.0.0');
 if (restored && f === 'release/release-spec.json') assert.equal(value.packageVersion,current);
}
console.log('PASS KAR-50 dynamic PATCH fixture: '+patchSeriesFixture+' -> '+next+' (active '+current+')');
