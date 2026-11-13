'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { nextPatch } = require('./kar50-next-patch.cjs');
const root = path.resolve(__dirname, '..');
const current = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')).version;
// Historical PATCH successor logic is exercised against a synthetic historical
// version after KAR-161 advances the active release to the approved 1.24 MINOR.
const patchSeriesFixture = current === '1.24.0' ? '1.23.92' : current;
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
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,f),'utf8'))[key],current);
}
console.log('PASS KAR-50 dynamic PATCH fixture: '+patchSeriesFixture+' -> '+next+' (active '+current+')');
