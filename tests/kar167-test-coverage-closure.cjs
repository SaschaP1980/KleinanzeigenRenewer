'use strict';
// KAR-167 T1 — immutable historical test-path and coverage Gold baseline closure.
// New tests may be added if they are wired to a live entrypoint. Removing an old
// test requires a separately reviewed inventory update backed by deletion proof.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const full = rel => path.join(root, rel);
const read = rel => fs.readFileSync(full(rel), 'utf8');
const registry = JSON.parse(read('docs/maintenance/TEST_COVERAGE_INVENTORY.json'));
assert.equal(registry.schema, 1);
assert.equal(registry.issue, 167);
assert.equal(registry.counts.baselineTests, 506);
assert.equal(registry.tests.length, 506, 'Historical T1 baseline inventory truncated');
assert.deepEqual(registry.counts.byRole, {
  'indirect-fixture': 2,
  'standalone-historical': 6,
  'indirect-helper': 13,
  'direct-or-hosted': 483,
  'gold-reference': 1,
  'documentation': 1
});
assert.equal(registry.coverageContracts.length, 2, 'Both tracked coverage contracts are required');

const ownerPaths = {
  'npm test / npm run test:e2e': 'package.json',
  'scripts/build.sh core tests': 'scripts/build.sh',
  'mandatory coverage gate': 'scripts/coverage-gate.sh',
  'KAR Work PR hosted CI': '.github/workflows/kar-work-pr.yml',
  'KAR main CI': '.github/workflows/kar-ci.yml',
  'KAR Release hosted CI': '.github/workflows/kar-release.yml'
};
const referencedByOwner = new Map();
const pattern = /tests\/[A-Za-z0-9_.\/-]+\.(?:cjs|mjs|js|py|ps1|json|sh|txt)/g;
for (const [owner, file] of Object.entries(ownerPaths)) {
  // Windows PowerShell uses backslash; convert for path comparisons only.
  referencedByOwner.set(owner, new Set([...read(file).replace(/\\/g, '/').matchAll(pattern)].map(m => m[0])));
}
const records = new Map();
for (const r of registry.tests) {
  assert.match(r.path, /^tests\/[A-Za-z0-9_.\/-]+\.(?:cjs|js|mjs|py|ps1|json|md|txt)$/);
  assert.match(r.gitBlobSha, /^[a-f0-9]{40}$/);
  assert.ok(!records.has(r.path), 'Duplicate historical test: ' + r.path);
  records.set(r.path, r);
  assert.ok(fs.statSync(full(r.path)).isFile(), 'Previously tracked test/fixture removed without proof: ' + r.path);
  assert.ok(r.bytes > 0, 'Baseline file was empty: ' + r.path);
  assert.ok(typeof r.keepReason === 'string' && r.keepReason.length > 35,
    'Missing specific historical owner or KEEP decision: ' + r.path);
  if (r.role === 'direct-or-hosted') {
    assert.ok(r.entrypoints.length > 0, 'Active test has no entrypoint evidence: ' + r.path);
    for (const owner of r.entrypoints) {
      assert.ok(referencedByOwner.has(owner), 'Unrecognized owner: ' + owner);
      assert.ok(referencedByOwner.get(owner).has(r.path),
        'Baseline invocation vanished from ' + owner + ': ' + r.path);
    }
  } else {
    assert.ok(r.entrypoints.length === 0, 'Classify directly invoked file as direct: ' + r.path);
    assert.ok(['indirect-helper','indirect-fixture','standalone-historical','gold-reference','documentation'].includes(r.role),
      'Ambiguous historic helper/fixture status: ' + r.path);
  }
}

function walk(dir) {
  return fs.readdirSync(full(dir), {withFileTypes:true}).flatMap(e => {
    const p=dir+'/'+e.name;
    return e.isDirectory() ? walk(p) : e.isFile() ? [p] : [];
  });
}
const actual = walk('tests');
const additions = actual.filter(p => !records.has(p));
for (const addition of additions) {
  // Future new test programs must be reachable from a real entrypoint, or
  // explicitly added to this T1 registry with proven test-only helper ownership.
  if (!/\.(?:cjs|js|mjs|py|ps1)$/.test(addition)) continue;
  assert.ok([...referencedByOwner.values()].some(set => set.has(addition)),
    'Unregistered new executable test/fixture with no top-level invocation: ' + addition);
}
for (const paths of referencedByOwner.values()) for (const p of paths) {
  assert.ok(fs.existsSync(full(p)), 'Stale top-level test reference: ' + p);
}

// Git SHA-1 blob identity is used only for immutable historical Gold files;
// active regression tests must remain editable by later issue-backed changes.
function gitBlobSha(p) {
  const data = fs.readFileSync(full(p));
  return crypto.createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
}
const goldTest = records.get('tests/e2e/gold-v1.21.15.json');
assert.equal(goldTest?.role, 'gold-reference');
assert.equal(gitBlobSha(goldTest.path), goldTest.gitBlobSha,
  'v1.21.15 browser Gold evidence changed unexpectedly');
const gold = JSON.parse(read(goldTest.path));
assert.equal(gold.goldVersion, '1.21.15');
assert.equal(gold.extensionId, 'hafahjhhgiipdegfkgacchmnacgblnah');
assert.ok(Object.keys(gold.runtimeFileSha256 || {}).length >= 20, 'Gold runtime SHA contract lost');

const coverage = new Map(registry.coverageContracts.map(item => [item.path, item]));
const baselinePath = 'coverage/coverage-baseline-v1.23.19.json';
const criticalPath = 'coverage/safety-critical-public-apis.json';
assert.equal(coverage.get(baselinePath)?.role, 'immutable-coverage-gold-floor');
assert.equal(coverage.get(criticalPath)?.role, 'safety-critical-negative-evidence-map');
assert.equal(gitBlobSha(baselinePath), coverage.get(baselinePath).gitBlobSha,
  'Checked-in v1.23.19 Gold floor changed without a new acceptance baseline');
const floor = JSON.parse(read(baselinePath));
assert.equal(floor.version, '1.23.19');
assert.equal(floor.publicFunctions.percent, 100);
for (const area of ['app','background','content','shared']) {
  assert.equal(floor.areas[area].public.percent, 100,
    'Safety baseline lost 100% dynamic public API coverage in ' + area);
  assert.ok(floor.areas[area].lines.percent >= 0 && floor.areas[area].branches.percent >= 0,
    'Missing area-level non-regression floor: ' + area);
}
const safety = JSON.parse(read(criticalPath));
assert.equal(safety.schemaVersion, 1);
assert.ok(safety.apis.length >= 15, 'Safety-critical public API owners were silently reduced');
let criticalRefs = 0;
for (const api of safety.apis) {
  assert.ok(/^src\/.+\.js$/.test(api.module) && api.method && api.contract, 'Invalid safety API owner');
  assert.ok(fs.existsSync(full(api.module)), 'Safety-critical API source module removed: ' + api.module);
  assert.ok(api.tests?.length, 'Safety critical method missing negative test: ' + api.method);
  for (const p of api.tests) {
    criticalRefs++;
    assert.ok(records.has(p) && fs.existsSync(full(p)),
      'Safety-critical negative/fail-closed test missing: ' + p);
  }
}
const ignored = read('.gitignore');
for (const fragment of [
  'coverage/raw/', 'coverage/public-api-manifest.json', 'coverage/coverage-summary.json',
  'coverage/coverage-summary.md', 'coverage/line-coverage.json', 'coverage/branch-coverage.json',
  'coverage/module-coverage.json', 'coverage/architecture-audit.json'
]) assert.ok(ignored.includes(fragment), 'Generated coverage accidentally tracked: ' + fragment);
const gate = read('scripts/coverage-gate.sh');
for (const name of [
  'tests/kar167-file-layout.cjs','tests/kar167-script-closure.cjs',
  'tests/kar167-icons-closure.cjs','tests/kar167-test-coverage-closure.cjs',
  'scripts/v12319-coverage-report.cjs','scripts/coverage-no-regression.cjs'
]) assert.ok(gate.includes(name), 'Mandatory coverage/T1 gate silently removed: ' + name);
const noRegression = read('scripts/coverage-no-regression.cjs');
assert.ok(noRegression.includes(baselinePath) && noRegression.includes('true') &&
  noRegression.includes('COVERAGE_NO_REGRESSION_FAILED'), 'Coverage regression guard weakened');
assert.ok(fs.existsSync(full('tests/e2e/run_browser_e2e_supervisor.py')),
  'Nine-scenario isolated Chromium supervisor missing');
console.log('PASS KAR-167 T1 test/coverage closure: '+records.size+
  ' historical test/fixture paths preserved, '+registry.counts.byRole['direct-or-hosted']+
  ' top-level referenced, '+additions.length+' registered new source additions, 2 durable coverage contracts,'+
  ' 1 unchanged E2E Gold, '+safety.apis.length+' safety-critical APIs / '+criticalRefs+
  ' explicit negative test references; runtime/Gold/100%-public no-regression contracts intact');
