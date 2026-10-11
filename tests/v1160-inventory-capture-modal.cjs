const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'inventory-capture-controller.js'), 'utf8');
let n = 0; const pass = name => { n += 1; console.log('PASS ' + name); };

assert.ok(['1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(manifest.version));
pass('minor version is 1.16.0');

for (const id of [
  'inventoryCaptureDialog','inventoryCaptureClose','inventoryCaptureKicker','inventoryCaptureTitle','inventoryCaptureIntro',
  'inventoryCaptureConfirmPanel','inventoryCaptureProgressPanel','inventoryCaptureResultPanel','inventoryCaptureStart',
  'inventoryCaptureCancel','inventoryCaptureDone','inventoryCaptureProgressTitle','inventoryCaptureProgressText',
  'inventoryCaptureProgressFill','inventoryCaptureProgressCount','inventoryCaptureResultTitle','inventoryCaptureResultText'
]) assert.match(html, new RegExp(`id="${id}"`));
assert.match(html, /data-capture-step="1"/);
assert.match(html, /data-capture-step="2"/);
assert.match(html, /data-capture-step="3"/);
pass('shared inventory capture modal has confirmation progress and result stages');

assert.match(app, /function openInventoryCaptureDialog\(mode\)/);
assert.match(app, /function startSingleInventoryCapture\(/);
assert.match(app, /function startBulkInventoryCapture\(/);
assert.match(app, /function syncInventoryCaptureBulkModal\(state\)/);
assert.match(app, /function inventoryCaptureBulkProgressModel\(state\)/);
assert.match(app, /inventoryCaptureStart\?\.addEventListener\('click'/);
pass('single and bulk inventory actions are orchestrated by the shared modal');
if (['1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(manifest.version)) {
  assert.match(app, /inventoryCaptureSourceTabId = null/);
  assert.match(app, /inventoryCaptureSourceTabId = Number\(candidate\.sourceTabId/);
  assert.match(app, /const captureTabId = Number\(selectedCandidate\?\.sourceTabId/);
} else {
  assert.match(app, /inventoryCaptureSourceTabId = inventoryCaptureMode === 'bulk' \? fullInventoryTabId : activeTabId/);
  assert.match(app, /const captureTabId = inventoryCaptureSourceTabId \|\| activeTabId/);
}
assert.match(app, /let sourceTabId = null/);
assert.match(app, /START_BULK_INVENTORY_OPERATION/);
pass('confirmation pins the intended source tab so later health refreshes cannot retarget the capture');

const singleHandler = app.match(/inventoryButton\.addEventListener\('click',[\s\S]*?\n\}\);/)?.[0] || '';
const bulkHandler = app.match(/fullInventoryButton\.addEventListener\('click',[\s\S]*?\n\}\);/)?.[0] || '';
assert.match(singleHandler, /openInventoryCaptureDialog\('single'\)/);
assert.doesNotMatch(singleHandler, /EXTRACT_CURRENT_AD/);
assert.match(bulkHandler, /openInventoryCaptureDialog\('bulk'\)/);
assert.doesNotMatch(bulkHandler, /START_BULK_INVENTORY_FRESH/);
pass('action buttons ask for confirmation before starting the existing workflows');

assert.match(app, /syncInventoryCaptureBulkModal\(state\)/);
assert.match(app, /status === 'complete-with-errors'/);
assert.match(app, /setInventoryCaptureResult\(/);
pass('bulk modal follows live persisted progress through terminal summary');

assert.match(css, /\.inventory-capture-stepper/);
assert.match(css, /\.inventory-capture-progress-track/);
assert.match(css, /\.inventory-capture-progress-fill/);
assert.match(css, /\.inventory-capture-result/);
pass('capture modal has dedicated progress and result styling');

console.log(`${n} v1.16.0 inventory capture modal contract groups passed`);
