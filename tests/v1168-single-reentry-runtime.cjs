const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = fs.readFileSync(path.join(__dirname, '../inventory-capture-controller.js'), 'utf8');
function extract(name, next) {
  const start = src.indexOf(`function ${name}`);
  const end = src.indexOf(`\nfunction ${next}`, start);
  assert.ok(start >= 0 && end > start, `${name} missing`);
  return src.slice(start, end);
}
const busyFn = extract('singleInventoryCaptureBusy', 'activeSingleInventoryCandidate');
const syncFn = extract('syncSingleInventoryButtonState', 'isInventoryCaptureDialogVisible');
const state = { bulkStartInFlight: false, currentBulkRunState: null };
const ctx = {
  inventoryCaptureMode: 'single',
  inventoryCaptureDialogState: 'progress',
  inventoryButton: { dataset: { pageReady: 'true' }, disabled: false, title: '' },
  isBulkStartInFlight: () => state.bulkStartInFlight,
  getCurrentBulkRunState: () => state.currentBulkRunState,
  accountGateModel: () => ({ allowed: true, tooltip: '' }),
  actionDisableModel: (buttonId) => {
    if (buttonId !== 'inventoryButton') return { disabled: false, reason: 'ready' };
    const pageReady = ctx.inventoryButton.dataset.pageReady === 'true';
    const singleBusy = ctx.inventoryCaptureMode === 'single' && ctx.inventoryCaptureDialogState === 'progress';
    const bulkBusy = state.bulkStartInFlight || String(state.currentBulkRunState?.status || '') === 'running' || Boolean(state.currentBulkRunState?.retryAdId);
    if (!pageReady) return { disabled: true, reason: 'page-not-ready' };
    if (singleBusy) return { disabled: true, reason: 'single-busy' };
    if (bulkBusy) return { disabled: true, reason: 'bulk-busy' };
    return { disabled: false, reason: 'ready' };
  },
  syncActionsActivityIndicator: () => {},
  scheduleActionsStateSnapshot: () => {}
};
vm.createContext(ctx);
vm.runInContext(`${busyFn}\n${syncFn}`, ctx);
ctx.syncSingleInventoryButtonState();
assert.equal(ctx.inventoryButton.disabled, true, 'ready health state must not enable the button while capture is running');
ctx.inventoryCaptureDialogState = 'result';
ctx.syncSingleInventoryButtonState();
assert.equal(ctx.inventoryButton.disabled, false, 'terminal result may restore button from pageReady');
ctx.inventoryButton.dataset.pageReady = 'false';
ctx.syncSingleInventoryButtonState();
assert.equal(ctx.inventoryButton.disabled, true, 'unready page still disables the button');
console.log('PASS single-inventory button lock survives health readiness and releases only after progress ends');
