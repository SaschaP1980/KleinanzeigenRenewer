'use strict';
// Execute immutable original next-PATCH test against a *coherent* v1.23.25
// fixture. An authentic failed child assertion, not a grep or mocked exit,
// is mandatory evidence. No main, Work archive, or source metadata mutations.
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const BASE = '723f64e7e8713a003d17c9a69f0610a6b6624509';
const OLD = '1.23.24';
const NEW = '1.23.25';
const files = ['manifest.json', 'package.json', 'package-lock.json',
  'release/release-spec.json'];

function baseline(p) {
  return execFileSync('git', ['show', BASE + ':' + p], {
    cwd: root, encoding: 'utf8', timeout: 30000
  });
}

const original = baseline('tests/current-patch-next-release-regression.cjs');
assert.match(original, /const next = ['"]1\.23\.25['"]/);
assert.match(original, /assert\.equal\(manifest\.version, ['"]1\.23\.24['"]/);
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'kar50-executed-unfixed-red-'));
const modified = {};
try {
  fs.mkdirSync(path.join(fixture, 'tests'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'release'), { recursive: true });
  const oldPath = path.join(fixture, 'tests', 'current-patch-next-release-regression.cjs');
  fs.writeFileSync(oldPath, original);
  for (const file of files) {
    const value = JSON.parse(baseline(file));
    assert.equal(value.version, OLD, 'immutable old metadata must be consistent');
    value.version = NEW;
    if (file === 'package.json') value.displayVersion = NEW;
    if (file === 'package-lock.json') value.packages[''].version = NEW;
    if (file === 'release/release-spec.json') value.packageVersion = NEW;
    const dest = path.join(fixture, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const bytes = JSON.stringify(value, null, 2) + '\n';
    fs.writeFileSync(dest, bytes);
    modified[file] = bytes;
  }
  const result = spawnSync(process.execPath, [oldPath], {
    cwd: fixture, encoding: 'utf8', timeout: 30000,
    env: { ...process.env, KAR46_SYNTHETIC_PATCH: '0' }
  });
  assert.equal(result.error, undefined, 'original runner must actually launch');
  assert.equal(result.signal, null, 'original runner must fail via assertion, not signal');
  assert.notEqual(result.status, 0, 'old runner unexpectedly accepted 1.23.25 current metadata');
  assert.match(result.stderr, /KAR46_SYNTHETIC_PATCH_FAILED:/,
    'old runner must itself report the failed future-PATCH gate');
  assert.match(result.stderr, /synthetic PATCH requires an unchanged, explicitly pinned product source/,
    'failure must come from original current-version assertion, not unrelated I/O');
  assert.match(result.stderr, /AssertionError/,
    'must be a real unmodified runner assertion failure');
  for (const file of files) {
    assert.equal(fs.readFileSync(path.join(fixture, file), 'utf8'), modified[file],
      'original runner must not mutate the source metadata on RED');
  }
  const hash = crypto.createHash('sha256').update(original).digest('hex');
  console.log('PASS KAR-50 executed original unfixed future-PATCH RED: pinned source ' +
    BASE + ', old runner sha256=' + hash + ', coherent 1.23.25 four-file fixture, ' +
    'child exit=' + result.status + ', failure=original pinned-version AssertionError; ' +
    'source unchanged and original historic RED independently reproducible');
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
