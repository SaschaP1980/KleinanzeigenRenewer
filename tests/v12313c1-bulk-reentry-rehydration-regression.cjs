const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app/app.js'), 'utf8');
const capture = fs.readFileSync(path.join(root, 'src/app/inventory-capture-controller.js'), 'utf8');
let n = 0; const pass = m => { n += 1; console.log('PASS ' + m); };

const renderBulk = app.match(/function renderBulkState\(state\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.ok(renderBulk, 'renderBulkState must exist');
assert.match(renderBulk, /bindExistingBulkInventoryCapture\(currentBulkRunState, \{ setReentryTarget: true \}\)/,
  'active persisted bulk state must rehydrate the capture controller, not only remember a run id');
pass('active bulk state rehydrates capture controller after app restart');

assert.match(renderBulk, /captureState\.mode !== 'bulk'/);
assert.match(renderBulk, /captureState\.dialogState === 'closed'/);
assert.match(renderBulk, /String\(captureState\.trackedRunId \|\| ''\) !== currentRunId/,
  'rehydration must be limited to an unbound/stale capture UI state');
pass('normal in-session bulk progress is not rebound on every update');

assert.match(capture, /inventoryCaptureMode === 'bulk' && inventoryCaptureDialogState === 'progress'/,
  'restored bulk progress state must qualify for a visible compact re-entry control');
assert.match(capture, /persistentCardHidden \|\| captureProgressAvailable/,
  'compact re-entry must remain available after restart even when the persistent card was not previously minimized');
pass('restored running bulk progress always exposes a re-entry control');

assert.match(renderBulk, /UI_INVENTORY_CAPTURE_BULK_REENTRY_BOUND/,
  'successful startup rebind must be diagnosable');
pass('startup bulk rebind emits diagnostic evidence');

console.log(`${n}/${n} PASS v1.23.13_c1 bulk re-entry rehydration`);
