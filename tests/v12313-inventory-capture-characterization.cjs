const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const read = rel => fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : '';
const controller = read('src/app/inventory-capture-controller.js');
const candidateModel = read('src/app/inventory-candidate-model.js');
const view = read('src/app/inventory-capture-view.js');
const combined = `${controller}\n${candidateModel}\n${view}`;
let n = 0; const pass = m => { n += 1; console.log(`PASS ${m}`); };
function extract(src, name, nextName) {
  const start = src.indexOf(`function ${name}`);
  assert.ok(start >= 0, `missing ${name}`);
  const end = nextName ? src.indexOf(`\nfunction ${nextName}`, start) : -1;
  return end > start ? src.slice(start, end) : src.slice(start);
}

for (const token of ['CAPTURE_SINGLE_INVENTORY','START_BULK_INVENTORY_OPERATION','REQUEST_BULK_INVENTORY_STOP_AFTER_CURRENT','USER_INVENTORY_CAPTURE_REOPENED']) assert.ok(controller.includes(token), `missing lifecycle token ${token}`);
assert.match(controller, /async function startSingleInventoryCapture\(/);
assert.match(controller, /async function startBulkInventoryCapture\(/);
assert.match(controller, /async function requestBulkInventoryStopAfterCurrent\(/);
pass('single/bulk start, controlled stop and re-entry lifecycle remain controller-owned');

let build;
if (candidateModel) build = require(path.join(root, 'src/app/inventory-candidate-model.js')).buildSingleInventoryCandidates;
else {
  const buildText = extract(controller, 'buildSingleInventoryCandidates', 'inventoryCaptureCandidateStorageState');
  const candidateCtx = vm.createContext({ Map, Set, Number, String, Boolean, RegExp });
  vm.runInContext(`${buildText}; this.build = buildSingleInventoryCandidates;`, candidateCtx);
  build = candidateCtx.build;
}
const built = build([
  { tab: { id: 11, active: true, lastAccessed: 100 }, preview: { adId: '123456', title: 'Public', thumbnailUrl: 'https://img.kleinanzeigen.de/a.jpg', viewMode: 'public' } },
  { tab: { id: 12, active: false, lastAccessed: 90 }, preview: { adId: '123456', title: 'Edit', viewMode: 'edit' } },
  { tab: { id: 13, active: false, lastAccessed: 80 }, preview: { adId: '777777', title: 'Second', viewMode: 'public' } }
]);
assert.equal(built.length, 2);
const first = built.find(x => x.adId === '123456');
assert.equal(first.sourceTabId, 12);
assert.equal(first.thumbnailUrl, 'https://img.kleinanzeigen.de/a.jpg');
assert.equal(first.active, true);
pass('candidate dedupe preserves edit-source preference, public thumbnail complement and active association');

if (candidateModel) {
  const mod = require(path.join(root, 'src/app/inventory-candidate-model.js'));
  const snapshot = mod.createMembershipSnapshot([{adId:'123'}],[{adId:'456'}]);
  assert.equal(mod.storageState('123', snapshot), 'inventory');
  assert.equal(mod.storageState('456', snapshot), 'trash');
  assert.equal(mod.storageState('789', snapshot), 'new');
  assert.equal(mod.storageState('x', snapshot), 'unknown');
} else {
  const membershipText = controller.slice(controller.indexOf('function inventoryCaptureCandidateStorageState'), controller.indexOf('\nfunction createInventoryCandidateVisual'));
  const ctx = vm.createContext({ Set, String, Array, RegExp, inventoryCaptureMembershipSnapshot: { inventoryIds: new Set(), trashIds: new Set() } });
  vm.runInContext(`${membershipText}; this.storageState=inventoryCaptureCandidateStorageState; this.setSnapshot=setInventoryCaptureMembershipSnapshot;`, ctx);
  ctx.setSnapshot([{adId:'123'}],[{adId:'456'}]);
  assert.equal(ctx.storageState('123'), 'inventory'); assert.equal(ctx.storageState('456'), 'trash'); assert.equal(ctx.storageState('789'), 'new'); assert.equal(ctx.storageState('x'), 'unknown');
}
pass('candidate membership remains stable-id based with inventory/trash/new/unknown classification');

let bulkModel;
if (view) bulkModel = require(path.join(root, 'src/app/inventory-capture-view.js')).inventoryCaptureBulkProgressModel;
else {
  const bulkText = extract(controller, 'inventoryCaptureBulkProgressModel', 'syncInventoryCaptureBulkModal');
  const bulkCtx = vm.createContext({ Number, String, Array, Math });
  vm.runInContext(`${bulkText}; this.model = inventoryCaptureBulkProgressModel;`, bulkCtx);
  bulkModel = bulkCtx.model;
}
const running = bulkModel({status:'running',successCount:2,failedCount:1,expectedTotal:7,currentTitle:'X'});
assert.equal(running.terminal,false); assert.equal(running.processed,3); assert.equal(running.title,'Wird gerade erfasst');
const complete = bulkModel({status:'complete',successCount:7,failedCount:0,expectedTotal:7});
assert.equal(complete.terminal,true); assert.equal(complete.kind,'success'); assert.equal(complete.percent,100);
const review = bulkModel({status:'needs-review',successCount:5,failedCount:0,expectedTotal:7});
assert.equal(review.kind,'waiting');
pass('bulk progress/result presentation model preserves running, success and review semantics');

for (const token of ['USER_SINGLE_INVENTORY_CANDIDATES_READY','candidateStorageStates','membershipInventoryCount','membershipTrashCount']) assert.ok(combined.includes(token), `missing candidate diagnostic token ${token}`);
pass('candidate-ready diagnostics retain membership evidence');

assert.match(controller, /startSingle:\s*startSingleInventoryCapture/);
assert.match(controller, /startBulk:\s*startBulkInventoryCapture/);
assert.match(controller, /requestStopAfterCurrent:\s*requestBulkInventoryStopAfterCurrent/);
assert.match(controller, /reopenFromShortcut:\s*reopenInventoryCaptureFromShortcut/);
pass('public controller lifecycle API remains stable for app composition');
console.log(`${n}/${n} PASS v1.23.13 inventory capture characterization`);
