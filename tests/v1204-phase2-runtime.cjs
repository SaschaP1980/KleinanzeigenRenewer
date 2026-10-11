const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const TemplateFillService = require('../template-fill-service.js');
const tabLoad = fs.readFileSync('tab-load-coordinator.js', 'utf8');
let n = 0; const pass = label => { n += 1; console.log(`PASS ${n}: ${label}`); };

async function testTabSignals() {
  const ctx = { setTimeout, clearTimeout, Map, Set, Number, Promise, Object, String, Math, Date, console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(tabLoad, ctx);
  assert.ok(ctx.KRTabLoadCoordinator?.create);
  const coordinator = ctx.KRTabLoadCoordinator.create({
    safetyPollMs: 2000,
    assertPlatformAccessAllowed: async () => {},
    getTabOrThrow: async () => ({ status: 'loading' }),
    getTab: async () => null,
    logDiagnostic: async () => {},
    tabMeta: () => ({}),
    assessNavigation: () => ({ state: 'pending', reason: 'test' }),
    readyState: 'ready',
    offTargetState: 'off-target'
  });
  const version = coordinator.signalVersion(77);
  const started = Date.now();
  const pending = coordinator.waitForSignal(77, version, 500);
  setTimeout(() => coordinator.notify(77, { kind: 'updated', status: 'complete' }), 10);
  const signal = await pending;
  assert.equal(signal.kind, 'updated');
  assert.equal(signal.status, 'complete');
  assert.ok(Date.now() - started < 200, 'event must wake waiter before safety timeout');
  pass('tab readiness event wakes a waiter immediately instead of waiting for safety poll');

  const nextVersion = coordinator.signalVersion(77);
  coordinator.notify(77, { kind: 'updated', status: 'loading' });
  const immediate = await coordinator.waitForSignal(77, nextVersion, 500);
  assert.equal(immediate.kind, 'event');
  pass('signal generation closes the get-to-arm race without an extra polling delay');
}

async function testImageTransferCache() {
  let sessionReads = 0;
  let imageReads = 0;
  const now = new Date().toISOString();
  const state = {
    templateFillSessions: {
      f1: { fillId: 'f1', targetTabId: 9, status: 'running', inventoryId: 'inv1', createdAt: now, updatedAt: now }
    }
  };
  const storageLocal = {
    async get(key) { sessionReads += 1; return { [key]: state[key] }; },
    async set(patch) { Object.assign(state, patch); }
  };
  const blob = new Blob([Uint8Array.from([1,2,3,4])], { type: 'image/jpeg' });
  const service = TemplateFillService.create({
    storageLocal,
    getInventoryImage: async () => { imageReads += 1; return { inventoryId: 'inv1', blob, mimeType: 'image/jpeg' }; },
    btoaFn: binary => Buffer.from(binary, 'binary').toString('base64')
  });
  const sender = { tab: { id: 9 } };
  const first = await service.templateImageChunk({ fillId: 'f1', imageKey: 'img1', offset: 0, length: 2 }, sender);
  const second = await service.templateImageChunk({ fillId: 'f1', imageKey: 'img1', offset: 2, length: 2 }, sender);
  assert.equal(first.end, 2);
  assert.equal(second.end, 4);
  assert.equal(sessionReads, 1);
  assert.equal(imageReads, 1);
  pass('multiple chunks of one image perform one session validation and one IndexedDB image read');

  await service.templateImageChunk({ fillId: 'f1', imageKey: 'img1', offset: 0, length: 4 }, sender);
  assert.equal(sessionReads, 2);
  assert.equal(imageReads, 2);
  pass('completed transfer is not reused across a later image transfer');
}

(async () => {
  await testTabSignals();
  await testImageTransferCache();
  console.log(`${n}/4 PASS`);
})().catch(error => { console.error(error.stack || error); process.exit(1); });
