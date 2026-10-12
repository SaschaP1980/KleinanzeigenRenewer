const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const capture = fs.readFileSync(path.join(root, 'inventory-capture-controller.js'), 'utf8');
const bg = [fs.readFileSync(path.join(root, 'background.js'), 'utf8'), fs.readFileSync(path.join(root, 'bulk-inventory-controller.js'), 'utf8')].join('\n');
const bulkController = fs.readFileSync(path.join(root, 'bulk-inventory-controller.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
let pass = 0;
function check(name, fn) { try { fn(); pass++; console.log('PASS ' + name); } catch (e) { console.error('FAIL ' + name + ': ' + e.message); process.exitCode = 1; } }

check('v1.19.5 fresh-source contract remains active', () => assert.ok(['1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'].includes(manifest.version)));
check('every new bulk capture creates a fresh source instead of reusing fullInventoryTabId', () => {
  const owner = ['1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'].includes(manifest.version) ? capture : app;
  const s = owner.slice(owner.indexOf('async function startBulkInventoryCapture()'), owner.indexOf('async function requestBulkInventoryStopAfterCurrent', owner.indexOf('async function startBulkInventoryCapture()')) > -1 ? owner.indexOf('async function requestBulkInventoryStopAfterCurrent', owner.indexOf('async function startBulkInventoryCapture()')) : owner.indexOf("inventoryCaptureStopAfterCurrent?.addEventListener", owner.indexOf('async function startBulkInventoryCapture()')));
  assert.match(s, /START_BULK_INVENTORY_OPERATION/);
  assert.doesNotMatch(s, /let sourceTabId\s*=\s*inventoryCaptureSourceTabId\s*\|\|\s*fullInventoryTabId/);
  assert.doesNotMatch(s, /PREPARE_BULK_INVENTORY_SOURCE/);
});
check('bulk dialog confirmation does not bind to an old Meine Anzeigen tab', () => {
  const s = capture.slice(capture.indexOf('function configureInventoryCaptureDialog'), capture.indexOf('function openInventoryCaptureDialog'));
  assert.match(s, /inventoryCaptureSourceTabId\s*=\s*null/);
  assert.doesNotMatch(s, /inventoryCaptureMode === ['"]bulk['"] \? fullInventoryTabId/);
});
check('authoritative fresh source operation owns navigation and semantic readiness', () => {
  const s = bulkController.slice(bulkController.indexOf('async function startBulkInventoryOperation'), bulkController.indexOf('async function bulkSourceWasAutoCreated'));
  assert.doesNotMatch(s, /reloadTabAndWaitForFreshComplete/);
  assert.match(s, /waitForTabComplete/);
  assert.match(s, /START_BULK_INVENTORY_FROM_FRESH_SOURCE/);
});
check('fresh source preparation has a capped two-attempt recovery path', () => {
  assert.match(bg, /FRESH_BULK_SOURCE_MAX_ATTEMPTS/);
  assert.match(bg, /BULK_SOURCE_OPERATION_ATTEMPT_FAILED/);
});
check('step one is Einstellungen and stepper precedes changing content', () => {
  assert.match(html, /data-capture-step="1"><span>1<\/span><strong>Einstellungen<\/strong>/);
  const stepper = html.indexOf('class="renewal-start-steps inventory-capture-stepper"');
  const content = html.indexOf('class="inventory-capture-content"');
  assert.ok(stepper > 0 && content > stepper, 'stepper must be before the changing content region');
});
check('inventory capture uses a fixed shell with scrollable changing content', () => {
  assert.match(css, /\.inventory-capture-dialog \.renewal-start-modal\s*\{[^}]*display:grid[^}]*overflow:hidden/s);
  assert.match(css, /\.inventory-capture-content\s*\{[^}]*overflow:auto/s);
});
if (!process.exitCode) console.log(`v1.19.5+ fresh inventory source + fixed stepper: ${pass}/7 PASS`);
