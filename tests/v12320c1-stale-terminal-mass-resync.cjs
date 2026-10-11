const assert = require('assert');
const fs = require('fs');
const path = require('path');
const MassRenewalUiController = require('../src/app/mass-renewal-ui-controller.js');

function batch(batchId, status, itemStatus = 'success') {
  return {
    batchId,
    status,
    renewalMode: 'fast',
    items: [{ index: 0, inventoryId: 'inv-1', title: 'Test', status: itemStatus }]
  };
}

const events = [];
const controller = MassRenewalUiController.create({
  document: {},
  elements: {},
  syncActionsActivityIndicator: () => {},
  logAppEvent: async (event, details) => { events.push({ event, details }); }
});

// Automatic recovery must never resurrect a historical terminal batch when no
// active batch is being tracked. This is the exact v1.23.20 native regression:
// a local, not-yet-started draft must remain authoritative in the UI.
const staleTerminal = batch('historic-complete', 'complete');
controller.applyBatchSnapshot(staleTerminal, { forceOpen: false, recoveryOnly: true, source: 'actions-resync' });
assert.equal(controller.status().currentBatch, null,
  'automatic resync must ignore an unrelated terminal historical mass batch');

// An actually active batch remains recoverable.
const active = batch('active-batch', 'running', 'running');
controller.applyBatchSnapshot(active, { forceOpen: false, recoveryOnly: true, source: 'storage-change' });
assert.equal(controller.status().currentBatch?.batchId, 'active-batch');
assert.equal(controller.status().currentBatch?.status, 'running');

// When the same tracked batch reaches a terminal state, its completion must
// still propagate automatically to the open UI.
const completedSameBatch = batch('active-batch', 'complete');
controller.applyBatchSnapshot(completedSameBatch, { forceOpen: false, recoveryOnly: true, source: 'storage-change' });
assert.equal(controller.status().currentBatch?.batchId, 'active-batch');
assert.equal(controller.status().currentBatch?.status, 'complete');

// A different historical terminal batch still must not replace that tracked batch.
controller.applyBatchSnapshot(batch('other-old-batch', 'stopped', 'cancelled'), { forceOpen: false, recoveryOnly: true, source: 'actions-resync' });
assert.equal(controller.status().currentBatch?.batchId, 'active-batch');
assert.equal(controller.status().currentBatch?.status, 'complete');

// Explicit review/history application remains possible when intentionally requested.
controller.applyBatchSnapshot(staleTerminal, { forceOpen: false, recoveryOnly: false, source: 'explicit-review' });
assert.equal(controller.status().currentBatch?.batchId, 'historic-complete');

const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'app.js'), 'utf8');
assert.match(app, /applyMassRenewalBatchSnapshot\(state\?\.massState \|\| null, \{[^}]*recoveryOnly:\s*true[^}]*source:\s*`resync:\$\{source\}`[^}]*\}\)/s,
  'actions resync must use recovery-only mass-batch rehydration');
assert.match(app, /changes\[MASS_RENEWAL_BATCH_STORAGE_KEY\][\s\S]{0,500}applyMassRenewalBatchSnapshot\([^;]+\{[^}]*recoveryOnly:\s*true[^}]*source:\s*'storage-change'[^}]*\}\)/s,
  'storage-change rehydration must use recovery-only semantics');
assert.match(app, /refreshMassRenewalBatchStatus\(\{[^}]*forceOpen:\s*false[^}]*recoveryOnly:\s*true[^}]*source:\s*'startup'[^}]*\}\)/s,
  'startup refresh must not resurrect terminal historical mass batches');

console.log('PASS v1.23.20_c1 stale terminal mass-renewal rehydration regression');
