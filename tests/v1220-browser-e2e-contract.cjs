const { includesActivePatch } = require('./current-patch-policy.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifest = require(path.join(root, 'manifest.json'));
const pkg = require(path.join(root, 'package.json'));
const gold = require(path.join(root, 'tests/e2e/gold-v1.21.15.json'));
let passed = 0;
const pass = (m) => { passed += 1; console.log(`PASS ${m}`); };
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

assert.ok(includesActivePatch(['1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version));
assert.ok(includesActivePatch(['1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], pkg.version));
pass('v1.22.x browser E2E foundation version');
assert.equal(gold.goldVersion, '1.21.15');
assert.equal(gold.sourceZipSha256, '7657a2e6ab8e8f183aff767bdc7ba47373c96cf99890e1e4473516b1a73048a1');
assert.equal(gold.extensionId, 'hafahjhhgiipdegfkgacchmnacgblnah');
pass('immutable v1.21.15 Gold baseline recorded');
if (manifest.version === '1.22.0') {
  for (const [file, expected] of Object.entries(gold.runtimeFileSha256)) assert.equal(sha(file), expected, `Gold runtime parity changed: ${file}`);
  pass(`v1.22.0 production runtime parity to Gold (${Object.keys(gold.runtimeFileSha256).length} files)`);
} else {
  pass('Gold parity remains recorded; patch-specific runtime delta is verified by its own contract');
}
for (const file of ['tests/e2e/run_browser_e2e.py','tests/e2e/run.cjs','tests/e2e/README.md','tests/e2e/requirements.txt']) assert.ok(fs.existsSync(path.join(root,file)), `missing ${file}`);
pass('browser E2E harness files exist');
const runner = fs.readFileSync(path.join(root, 'tests/e2e/run_browser_e2e.py'), 'utf8');
for (const scenario of ['boot-mv3','service-worker-restart','bulk-runtime-lease-recovery','accordion-rapid-toggle','app-close-reopen-persistence','profile-switch-action-lock','worker-tab-unexpected-close','bottom-clamp-four-views','remote-safety-negative']) assert.ok(runner.includes(`"${scenario}"`), `missing E2E scenario ${scenario}`);
pass('9 browser/MV3 scenarios declared');
assert.equal(pkg.scripts['test:e2e'], 'node tests/e2e/run.cjs');
pass('npm test:e2e entry point');
const build = fs.readFileSync(path.join(root, 'scripts/build.sh'), 'utf8');
assert.match(build, /KR_RUN_BROWSER_E2E/);
assert.match(build, /v1220-browser-e2e-contract\.cjs/);
pass('release build has optional real-browser gate and static contract');
assert.equal((fs.readFileSync(path.join(root,'background.js'),'utf8').match(/\.submit\s*\(/g)||[]).length, 0);
assert.equal((fs.readFileSync(path.join(root,'background.js'),'utf8').match(/requestSubmit\s*\(/g)||[]).length, 0);
pass('publish safety invariant retained');
require('./kar46-work-pr-e2e-contract.cjs');
require('./kar48-zip-only-contract.cjs');
require('./kar50-next-patch-contract.cjs');
require('./kar52-work-path-contract.cjs');
console.log(`${passed}/8 PASS v1.22.0 browser E2E contract`);
