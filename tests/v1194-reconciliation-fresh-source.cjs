const { includesActivePatch } = require('./current-patch-policy.cjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const bg = [
  fs.readFileSync(path.join(root, 'background.js'), 'utf8'),
  fs.readFileSync(path.join(root, 'bulk-inventory-controller.js'), 'utf8'),
  fs.readFileSync(path.join(root, 'src/background/services/bulk-reconciliation-service.js'), 'utf8')
].join('\n');
const runner = fs.readFileSync(path.join(root, 'inventory-runner.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
let pass = 0;
function check(name, fn) { try { fn(); pass++; console.log('PASS ' + name); } catch (e) { console.error('FAIL ' + name + ': ' + e.message); process.exitCode = 1; } }

check('v1.19.4 reconciliation contract remains active', () => {
  assert.ok(includesActivePatch(['1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version));
  assert.ok(includesActivePatch(['1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], pkg.version));
});
check('phase 3 opens a fresh managed Meine Anzeigen source instead of reusing the paginated source', () => {
  assert.match(bg, /async function prepareFreshBulkReconciliationSource/);
  assert.match(bg, /url:\s*['"]about:blank['"]/);
  assert.match(bg, /bulk-reconciliation-source/);
  assert.match(bg, /TAB_ROLES\.BULK_SOURCE/);
  assert.match(bg, /MY_ADS_PROJECTS_URL/);
});
check('fresh phase 3 source is explicitly verified before the second scan', () => {
  assert.match(bg, /type:\s*['"]WAIT_FOR_MY_ADS_READY['"]/);
  assert.match(bg, /expectedProfileName:\s*state\.profileName/);
  assert.match(bg, /expectedOnline:\s*Number\(state\.expectedTotal\s*\|\|\s*0\)/);
  assert.match(bg, /START_BULK_RECONCILIATION_SCAN[^}]*readySnapshot:\s*status/s);
  assert.match(runner, /reconciliation-ready/);
  assert.match(runner, /waitForMyAdsReady\(/);
  assert.match(runner, /readySnapshot/);
});
check('reconciliation source recovery is capped and uses another fresh tab', () => {
  assert.match(bg, /FRESH_RECONCILIATION_SOURCE_MAX_ATTEMPTS/);
  assert.match(bg, /for\s*\([^;]*attempt[^;]*;[^;]*FRESH_RECONCILIATION_SOURCE_MAX_ATTEMPTS/);
  assert.match(bg, /BULK_RECONCILIATION_SOURCE_ATTEMPT_FAILED/);
});
check('legacy page-1 reload loop is removed', () => {
  assert.doesNotMatch(runner, /BULK_RECONCILIATION_RELOAD_PAGE1/);
  assert.doesNotMatch(runner, /location\.replace\(MY_ADS_PROJECTS_URL\)/);
});
check('failed fresh-source preparation ends safely without reconciliation mutation', () => {
  assert.match(bg, /BULK_RECONCILIATION_SOURCE_PREPARE_FAILED/);
  assert.match(bg, /reconciliation-interrupted/);
  assert.match(bg, /movedToTrash:\s*0/);
  assert.match(bg, /Prüfung erforderlich|nicht zuverlässig bestätigt/i);
});
check('new source has an explicit start message for the second scan', () => {
  assert.match(bg, /START_BULK_RECONCILIATION_SCAN/);
  assert.match(runner, /message\?\.type === ['"]START_BULK_RECONCILIATION_SCAN['"]/);
});

if (!process.exitCode) console.log(`v1.19.4 fresh reconciliation source: ${pass}/7 PASS`);
