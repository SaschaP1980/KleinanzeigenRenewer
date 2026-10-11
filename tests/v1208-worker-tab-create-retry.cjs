const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = process.env.KR_ROOT ? path.resolve(process.env.KR_ROOT) : process.cwd();
const controller = fs.readFileSync(path.join(root, 'bulk-inventory-controller.js'), 'utf8');
const workerSource = fs.readFileSync(path.join(root, 'src/background/services/bulk-worker-service.js'), 'utf8');
const bg = [controller, workerSource].join('\n');
const BulkWorkerService = require(path.join(root, 'src/background/services/bulk-worker-service.js'));

let pass = 0;
const ok = name => { pass += 1; console.log('PASS ' + name); };

assert.match(bg, /bulkWorkerTabCreateMaxAttempts \|\| 2/);
assert.match(bg, /bulkWorkerTabCreateRetryMs \|\| 200/);
ok('worker creation has one bounded retry with a short fixed delay');

const retryStart = controller.indexOf('async function retryBulkFailure');
assert.ok(retryStart >= 0, 'retryBulkFailure source missing');
let retryBrace = controller.indexOf('{', retryStart), retryDepth = 0, retryEnd = -1;
for (let i = retryBrace; i < controller.length; i += 1) {
  if (controller[i] === '{') retryDepth += 1;
  else if (controller[i] === '}') { retryDepth -= 1; if (retryDepth === 0) { retryEnd = i + 1; break; } }
}
const retrySlice = controller.slice(retryStart, retryEnd);
assert.match(retrySlice, /createBulkEditWorkerTabWithRetry/);
assert.match(retrySlice, /bulk-retry-worker-create-failed/);
ok('manual single-item retry reuses the same bounded create recovery and counterpart cleanup');

async function scenario({ editOutcomes, metadataOutcome = { id: 302 }, platformRestricted = false }) {
  const state = {
    runId: 'run-1', bulkRunId: 'run-1', operationId: 'op-1', sourceTabId: 100, status: 'running',
    verificationMode: 'safe', workerTabId: null, metadataTabId: null,
    currentAdId: '', currentTitle: '', profileName: 'Alice'
  };
  const diagnostics = [];
  const closes = [];
  const delays = [];
  const editQueue = [...editOutcomes];
  let editCalls = 0;
  let metadataCalls = 0;
  const service = BulkWorkerService.create({
    getBulkRunState: async () => state,
    tabRegistry: { get: async()=>null, getTabOrThrow: async()=>null },
    tabRegistryApi: { isGoneError:()=>false, isDiscardedError:()=>false },
    normalizeRenewalMode: value => value || 'safe',
    registerShadowTab: async () => null,
    writeBulkRunState: async s => s,
    mutateBulkRunState: async fn => fn(state),
    logDiagnostic: async (level, event, details) => { diagnostics.push({ level, event, details }); },
    sessionCorrelationContext: () => ({ operationId: 'op-1', bulkRunId: 'run-1', runId: 'run-1' }),
    closeRegistryTabs: async () => [],
    closeRegistryTab: async (id, reason, label) => { closes.push({ id, reason, label }); return { closed: true }; },
    createAutomationTab: async opts => {
      if (String(opts.url).includes('/p-anzeige-bearbeiten.html?')) {
        editCalls += 1;
        const outcome = editQueue.shift();
        if (outcome instanceof Error) throw outcome;
        return outcome;
      }
      metadataCalls += 1;
      if (metadataOutcome instanceof Error) throw metadataOutcome;
      return metadataOutcome;
    },
    delay: async ms => { delays.push(ms); },
    sendTabRequestWithBootstrap: async()=>({}),
    correlationContext: () => ({ operationId: 'op-1', bulkRunId: 'run-1', runId: 'run-1' }),
    getInventory: async()=>null,
    deriveListingDateFromEndDate: ()=>null,
    mergeListingMetadata: (...args)=>args[0]?.listingMeta || {},
    saveInventory: async x=>x,
    tabRoles: { BULK_WORKER: 'bulk-worker' },
    tabStates: {},
    fastRenewalMode: 'fast',
    platformAccessRestrictionErrorCode: 'KR_PLATFORM_ACCESS_RESTRICTED',
    bulkWorkerTabCreateMaxAttempts: 2,
    bulkWorkerTabCreateRetryMs: 200,
    readOnlyMetadataTimeoutMs: 15000,
    chromeTabs: {},
    URL,
    setTimeout
  });
  const sender = { tab: { id: 100, windowId: 9 } };
  const message = {
    adId: '3518930192',
    url: 'https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=3518930192',
    publicUrl: 'https://www.kleinanzeigen.de/s-anzeige/test/3518930192-82-1759',
    title: 'Testanzeige', endDateDisplay: '20.11.2026', endDateIso: '2026-11-20'
  };
  let result = null;
  let error = null;
  try { result = await service.openBulkWorker(message, sender); } catch (err) { error = err; }
  return { result, error, state, diagnostics, closes, delays, editCalls, metadataCalls };
}

(async () => {
  const transient = await scenario({ editOutcomes: [new Error('Tabs cannot be edited right now'), { id: 303, windowId: 9 }] });
  assert.equal(transient.error, null);
  assert.deepEqual(JSON.parse(JSON.stringify(transient.result)), { tabId: 303, metadataTabId: 302 });
  assert.equal(transient.editCalls, 2);
  assert.equal(transient.metadataCalls, 1, 'metadata tab must not be duplicated by the edit retry');
  assert.deepEqual(transient.delays, [200]);
  assert.equal(transient.closes.length, 0);
  const retryEvent = transient.diagnostics.find(x => x.event === 'BULK_WORKER_TAB_CREATE_RETRY');
  assert.ok(retryEvent, 'retry diagnostic missing');
  assert.equal(retryEvent.level, 'info');
  assert.match(String(retryEvent.details.error || ''), /Tabs cannot be edited right now/);
  assert.ok(transient.diagnostics.some(x => x.event === 'BULK_WORKER_TAB_CREATE_RECOVERED'));
  ok('one transient edit-tab creation failure recovers on the same inventory item');

  const persistent = await scenario({ editOutcomes: [new Error('first create failed'), new Error('second create failed')] });
  assert.ok(persistent.error);
  assert.equal(persistent.editCalls, 2, 'retry must be bounded to exactly two total attempts');
  assert.deepEqual(persistent.delays, [200]);
  assert.ok(persistent.closes.some(x => x.id === 302 && x.reason === 'bulk-worker-create-failed'), 'successful metadata counterpart must be closed on terminal edit create failure');
  const failedEvent = persistent.diagnostics.find(x => x.event === 'BULK_WORKER_TAB_CREATE_FAILED');
  assert.ok(failedEvent, 'terminal create failure diagnostic missing');
  assert.match(String(failedEvent.details.error || ''), /second create failed/);
  assert.match(String(persistent.error.message || ''), /Worker-Tab konnte nicht geöffnet werden/);
  ok('persistent failure remains fail-closed and cleans up the already-created metadata tab');

  const platform = new Error('restricted');
  platform.code = 'KR_PLATFORM_ACCESS_RESTRICTED';
  const restricted = await scenario({ editOutcomes: [platform, { id: 304 }] });
  assert.ok(restricted.error);
  assert.equal(restricted.error.code, 'KR_PLATFORM_ACCESS_RESTRICTED');
  assert.equal(restricted.editCalls, 1, 'platform safety restriction must never be retried');
  assert.equal(restricted.delays.length, 0);
  assert.ok(restricted.closes.some(x => x.id === 302), 'metadata tab must be cleaned up when platform safety interrupts worker creation');
  ok('H1/H2 platform safety failure bypasses retry and remains authoritative');

  const metadataFailure = await scenario({ editOutcomes: [{ id: 305, windowId: 9 }], metadataOutcome: new Error('metadata create failed') });
  assert.equal(metadataFailure.error, null);
  assert.deepEqual(JSON.parse(JSON.stringify(metadataFailure.result)), { tabId: 305, metadataTabId: null });
  assert.equal(metadataFailure.editCalls, 1);
  assert.equal(metadataFailure.metadataCalls, 1);
  assert.equal(metadataFailure.delays.length, 0);
  ok('optional metadata-tab failure does not duplicate or block a valid edit worker');

  console.log(`v1.20.8 worker tab create retry: ${pass}/6 PASS`);
})().catch(error => { console.error(error.stack || error); process.exit(1); });
