const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app/app.js'), 'utf8');
const capture = fs.readFileSync(path.join(root, 'src/app/inventory-capture-controller.js'), 'utf8');
let n = 0; const pass = m => { n += 1; console.log(`PASS ${m}`); };

assert.match(capture, /async function startSingleInventoryCapture\(/);
assert.match(capture, /async function startBulkInventoryCapture\(/);
assert.match(capture, /async function requestBulkInventoryStopAfterCurrent\(/);
assert.match(capture, /function reopenInventoryCaptureFromShortcut\(/);
pass('Inventory Capture Controller owns start, stop and re-entry orchestration');

assert.doesNotMatch(app, /async function startSingleInventoryCapture\(/);
assert.doesNotMatch(app, /async function startBulkInventoryCapture\(/);
assert.doesNotMatch(app, /REQUEST_BULK_INVENTORY_STOP_AFTER_CURRENT/);
assert.doesNotMatch(app, /USER_INVENTORY_CAPTURE_REOPENED/);
pass('app.js no longer owns inventory capture start, stop or re-entry orchestration');

assert.match(capture, /startSingle: startSingleInventoryCapture/);
assert.match(capture, /startBulk: startBulkInventoryCapture/);
assert.match(capture, /requestStopAfterCurrent: requestBulkInventoryStopAfterCurrent/);
assert.match(capture, /reopenFromShortcut: reopenInventoryCaptureFromShortcut/);
pass('controller public API exposes lifecycle ownership through thin app delegation');

console.log(`${n} v1.23.10 inventory capture ownership groups passed`);
