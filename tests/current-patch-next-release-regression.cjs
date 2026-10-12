'use strict';
// KAR-46: Execute real full regression and coverage gates on a throwaway
// prospective 1.23.25 fixture; never change checked-out product metadata.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

if (process.env.KAR46_SYNTHETIC_PATCH !== '1') {
  const sourceRoot = path.resolve(__dirname, '..');
  const snapshotPaths = [
    'manifest.json', 'package.json', 'package-lock.json',
    'release/release-spec.json'
  ];
  const snapshots = Object.fromEntries(snapshotPaths.map(file =>
    [file, fs.readFileSync(path.join(sourceRoot, file), 'utf8')]));
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'kar46-next-patch-'));
  const fixtureRoot = path.join(staging, 'fixture');
  let completed = false;
  try {
    fs.cpSync(sourceRoot, fixtureRoot, {
      recursive: true,
      filter: item => {
        const rel = path.relative(sourceRoot, item).split(path.sep);
        return !rel.some(segment => ['.git', 'node_modules', 'build', '.run'].includes(segment)) &&
          !(rel[0] === 'coverage' && rel[1] === 'raw');
      }
    });
    if (fs.existsSync(path.join(sourceRoot, 'node_modules'))) {
      fs.symlinkSync(path.join(sourceRoot, 'node_modules'),
        path.join(fixtureRoot, 'node_modules'), 'dir');
    }
    const next = '1.23.25';
    const manifest = JSON.parse(snapshots['manifest.json']);
    const pkg = JSON.parse(snapshots['package.json']);
    const lock = JSON.parse(snapshots['package-lock.json']);
    const spec = JSON.parse(snapshots['release/release-spec.json']);
    assert.equal(manifest.version, '1.23.24',
      'synthetic PATCH requires an unchanged, explicitly pinned product source');
    for (const item of [manifest, pkg, lock, spec]) item.version = next;
    pkg.displayVersion = next;
    lock.packages[''].version = next;
    spec.packageVersion = next;
    for (const [file, value] of Object.entries({
      'manifest.json': manifest, 'package.json': pkg,
      'package-lock.json': lock, 'release/release-spec.json': spec
    })) fs.writeFileSync(path.join(fixtureRoot, file),
      JSON.stringify(value, null, 2) + '\n');
    const result = execFileSync('bash', ['scripts/coverage-gate.sh'], {
      cwd: fixtureRoot,
      env: { ...process.env, KAR46_SYNTHETIC_PATCH: '1',
        NODE_V8_COVERAGE: path.join(staging, 'synthetic-node-coverage') },
      encoding: 'utf8', stdio: 'pipe', maxBuffer: 32 * 1024 * 1024,
      timeout: 240000
    });
    assert.match(result, /PASS coverage no-regression: public 100%/);
    assert.match(result, /PASS v1\.23\.19 coverage gate/);
    completed = true;
    console.log('PASS KAR-46 full synthetic 1.23.25 npm regression + dynamic public coverage + line/branch + architecture gates');
  } catch (error) {
    const stdout = String(error.stdout || '');
    const stderr = String(error.stderr || '');
    console.error('KAR46_SYNTHETIC_PATCH_FAILED: ' + error.message);
    console.error('Synthetic stdout tail:\n' + stdout.slice(-10000));
    console.error('Synthetic stderr tail:\n' + stderr.slice(-8000));
    throw error;
  } finally {
    for (const [file, text] of Object.entries(snapshots)) {
      assert.equal(fs.readFileSync(path.join(sourceRoot, file), 'utf8'), text,
        'synthetic test must not mutate checked-out metadata: ' + file);
    }
    fs.rmSync(staging, { recursive: true, force: true });
  }
  assert.equal(completed, true);
}
