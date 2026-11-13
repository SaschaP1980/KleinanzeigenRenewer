'use strict';
// KAR-167 S1: fail-closed script/workflow owner inventory and retired-CLI reachability.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const abs = p => path.join(root, p);
const inventory = JSON.parse(fs.readFileSync(abs('docs/maintenance/SCRIPT_WORKFLOW_INVENTORY.json'), 'utf8'));
assert.equal(inventory.schema, 1);
assert.equal(inventory.issue, 167);
assert.equal(inventory.scripts.length, 24, 'S1 preserves exactly 24 current script files');
assert.equal(inventory.workflows.length, 6, 'All 5 generic workflows and KAR-178 historic publication workflow are registered');
assert.ok(fs.existsSync(abs('scripts/README.md')), 'scripts/ consumer index missing');
const actualScripts = fs.readdirSync(abs('scripts'), {withFileTypes:true})
  .filter(e => e.isFile() && e.name !== 'README.md').map(e => 'scripts/' + e.name).sort();
const recordedScripts = inventory.scripts.map(s => s.path).sort();
assert.deepEqual(actualScripts, recordedScripts, 'Every retained script must be individually inventoried');
const actualWorkflows = fs.readdirSync(abs('.github/workflows'), {withFileTypes:true})
  .filter(e => e.isFile()).map(e => '.github/workflows/' + e.name).sort();
const recordedWorkflows = inventory.workflows.map(w => w.path).sort();
assert.deepEqual(actualWorkflows, recordedWorkflows, 'All workflows must have an individual owner/consumer record');

for (const item of [...inventory.scripts, ...inventory.workflows]) {
  assert.match(item.path, /^(?:scripts|\.github\/workflows)\/[A-Za-z0-9._-]+$/);
  assert.ok(/^(?:ci-active|release-active|runtime-test-support|support-standalone|legacy-but-required)$/.test(item.status),
    'Unclassified script or workflow: ' + item.path);
  assert.ok(typeof item.evidence === 'string' && item.evidence.length > 45,
    'Owner/consumer evidence missing for ' + item.path);
  assert.ok(fs.existsSync(abs(item.path)), 'Inventoried current path missing: ' + item.path);
}

const retiredAnalyzer = ['coverage','analyze.cjs'].join('-');
const retirees = [
  'scripts/' + retiredAnalyzer,
  'scripts/kar50-atomic-patch.py',
  '.github/workflows/kar50-atomic-next-patch.yml'
];
for (const retired of retirees) {
  assert.ok(!fs.existsSync(abs(retired)), 'Retired fixed-version / superseded tool was resurrected: ' + retired);
  assert.ok(inventory.retired.some(r => r.path === retired),
    'Retired tool missing exact Git-history / replacement record: ' + retired);
}

const currentGate = fs.readFileSync(abs('scripts/coverage-gate.sh'), 'utf8');
for (const required of [
  'scripts/runtime-api-inventory.cjs',
  'scripts/v12319-coverage-report.cjs',
  'scripts/v12319-architecture-audit.cjs',
  'scripts/coverage-no-regression.cjs',
  'tests/kar167-file-layout.cjs',
  'tests/kar167-script-closure.cjs'
]) assert.ok(currentGate.includes(required), 'Mandatory coverage/architecture/script guard removed: ' + required);
const releaseFinalizer = fs.readFileSync(abs('scripts/release_finalize.py'), 'utf8');
assert.ok(releaseFinalizer.includes("'scripts' / 'source-layout.json'"),
  'Historic source-layout path is still required by release finalizer');
const layout = JSON.parse(fs.readFileSync(abs('scripts/source-layout.json'), 'utf8'));
assert.ok(Object.keys(layout.mapping || {}).length >= 64, 'Historical layout ownership contract corrupted');
for (const dest of Object.values(layout.mapping)) {
  assert.ok(typeof dest === 'string' && dest.startsWith('src/') && fs.existsSync(abs(dest)),
    'Historical source-layout target missing: ' + dest);
}

const workflows = Object.fromEntries(inventory.workflows.map(item => [
  path.basename(item.path), fs.readFileSync(abs(item.path), 'utf8')
]));
for (const [wf, required] of Object.entries({
  'kar-ci.yml': ['scripts/coverage-gate.sh', 'scripts/verify_committed_chrome_zip.py'],
  'kar-work-pr.yml': ['scripts/kar-work-pr-contract.cjs', 'scripts/coverage-gate.sh'],
  'kar-atomic-patch.yml': ['scripts/kar-atomic-patch.py', 'scripts/kar-work-pr-preflight.cjs'],
  'kar-fast-patch.yml': ['scripts/kar-fast-patch.py'],
  'kar-release.yml': ['scripts/coverage-gate.sh', 'scripts/archive-release-zip.sh']
})) for (const script of required) {
  assert.ok(workflows[wf].includes(script), 'Active CI/release consumer contract missing: ' + wf + ' -> ' + script);
}

const executableExt = /\.(?:js|cjs|mjs|py|sh|yml|yaml|ps1|cmd|cs)$/i;
const sourceDirs = ['src', 'tests', 'scripts', '.github/workflows', 'tools/windows'];
let codeFiles = 0;
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => {
    const p=path.join(dir,e.name);
    return e.isDirectory() ? walk(p) : e.isFile() && executableExt.test(e.name) ? [p] : [];
  });
}
for (const dir of sourceDirs) for (const file of walk(abs(dir))) {
  if (path.basename(file) === 'kar167-script-closure.cjs') continue;
  codeFiles++;
  assert.ok(!fs.readFileSync(file, 'utf8').includes(retiredAnalyzer),
    'An executable repository source still references superseded coverage-analyze CLI: ' + path.relative(root,file));
}
assert.ok(!fs.readFileSync(abs('package.json'), 'utf8').includes(retiredAnalyzer),
  'Package scripts still invoke retired coverage analyzer');
console.log('PASS KAR-167 S1 script/workflow closure: ' + inventory.scripts.length +
  ' live scripts, ' + inventory.workflows.length + ' workflows, 3 retired paths, ' +
  codeFiles + ' source files free of superseded CLI references; layout and safety gates intact');
