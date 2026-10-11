const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app/app.js'), 'utf8');
const capture = fs.readFileSync(path.join(root, 'src/app/inventory-capture-controller.js'), 'utf8');
const combined = `${app}\n${capture}`;
let n = 0; const pass = m => { n += 1; console.log(`PASS ${m}`); };

assert.match(combined, /USER_SINGLE_INVENTORY_CONFIRMED/);
assert.match(combined, /USER_SINGLE_INVENTORY_PROFILE_BOUND/);
assert.match(combined, /CAPTURE_SINGLE_INVENTORY/);
assert.match(combined, /USER_SINGLE_INVENTORY_SUCCEEDED/);
assert.match(combined, /USER_SINGLE_INVENTORY_FAILED/);
pass('single capture keeps profile binding, capture request and success/failure diagnostics');

assert.match(combined, /USER_BULK_INVENTORY_CONFIRMED/);
assert.match(combined, /START_BULK_INVENTORY_OPERATION/);
assert.match(combined, /USER_BULK_INVENTORY_STARTED/);
assert.match(combined, /USER_BULK_INVENTORY_FAILED_TO_START/);
assert.match(combined, /inventoryScope/);
assert.match(combined, /verificationMode/);
pass('bulk start keeps profile/scope/verification binding and diagnostics');

assert.match(combined, /REQUEST_BULK_INVENTORY_STOP_AFTER_CURRENT/);
assert.match(combined, /USER_BULK_INVENTORY_STOP_AFTER_CURRENT_REQUESTED/);
assert.match(combined, /Stopp vorgemerkt/);
assert.match(combined, /aktuelle Anzeige wird noch vollständig erfasst/);
pass('controlled stop remains stop-after-current and reports pending state');

assert.match(combined, /function reopenInventoryCaptureDialog\(target = inventoryCaptureReentryTarget\)/);
assert.doesNotMatch(capture.match(/function reopenInventoryCaptureDialog[\s\S]*?\n\}/)?.[0] || '', /CAPTURE_SINGLE_INVENTORY|START_BULK_INVENTORY_OPERATION/);
assert.match(combined, /USER_INVENTORY_CAPTURE_REOPENED/);
pass('re-entry restores existing workflow without starting a duplicate capture');

assert.match(combined, /singleInventoryCaptureBusy\(\)/);
assert.match(combined, /bulkStartInFlight/);
assert.match(combined, /syncInventoryActionStates\('bulk-start/);
pass('single and bulk capture retain mutual UI/action locking');

console.log(`${n} v1.23.10 inventory capture characterization groups passed`);
