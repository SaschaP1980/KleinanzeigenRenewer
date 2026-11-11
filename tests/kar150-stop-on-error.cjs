'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const MassController = require(path.join(root, 'src/background/controllers/mass-renewal-controller.js'));
const WatchdogService = require(path.join(root, 'src/background/services/mass-renewal-watchdog-service.js'));
let WorkflowApi;
const context = vm.createContext({
  console, Date, Promise, Set, Map, Object, Array, String, Number, Boolean, RegExp, Error,
  KRDeps: { register(name, api) { if (name === 'KRMassRenewalWorkflowController') WorkflowApi = api; } }
});
vm.runInContext(fs.readFileSync(path.join(root, 'src/background/controllers/mass-renewal-workflow-controller.js'), 'utf8'), context);
assert.equal(typeof WorkflowApi?.create, 'function');

function harness({ preference, failures = [], savedBatch = null } = {}) {
  const items = ['one', 'two', 'three'].map((id, index) => ({
    inventoryId: id, adId: String(index + 101), profileId: 'p1', title: id,
    price: { displayed: '10 €' }, listingMeta: { endDateDisplay: 'morgen' }
  }));
  const state = new Map();
  const key = 'massRenewalStopOnErrorPreferenceV1';
  if (preference !== undefined) state.set(key, preference);
  if (savedBatch) state.set('massRenewalBatchV1', structuredClone(savedBatch));
  const local = {
    async get(k) { return { [k]: state.get(k) }; },
    async set(data) { for (const [k, v] of Object.entries(data)) state.set(k, structuredClone(v)); },
    async remove(k) { state.delete(k); }
  };
  const controller = MassController.create({
    storageLocal: local, progressFlushMs: 1e9,
    broadcastInventoryChanged: () => {},
    logDiagnostic: async () => {}
  });
  let count = 0;
  let startCount = 0;
  const scheduled = [];
  let sessions = {};
  const workflow = WorkflowApi.create({
    readRenewalSessions: async () => sessions,
    writeRenewalSessions: async x => { sessions = structuredClone(x); },
    mutateMassRenewalBatch: controller.mutateMassRenewalBatch,
    applyMassRenewalStopState: controller.applyMassRenewalStopState,
    applyMassRenewalFinalState: controller.applyMassRenewalFinalState,
    touchMassRenewalItemProgress: controller.touchMassRenewalItemProgress,
    massRenewalTerminalOutcome: controller.massRenewalTerminalOutcome,
    massRenewalPublicSnapshot: controller.massRenewalPublicSnapshot,
    readMassRenewalBatch: controller.readMassRenewalBatch,
    writeMassRenewalBatch: controller.writeMassRenewalBatch,
    withMassRenewalMutation: controller.withMassRenewalMutation,
    dropMassRenewalProgress: () => {},
    logDiagnostic: async () => {},
    sessionCorrelationContext: (s, extra = {}) => ({ ...extra }),
    normalizeRenewalPhaseAttempts: n => Number(n || 3),
    startTemplateFillUnlocked: async id => {
      startCount += 1;
      if (failures.includes(id)) throw Error('Failed to start ' + id);
      return { renewalId: 'renewal-' + id, operationId: 'op-' + id };
    },
    withInsertionStartGate: fn => fn(),
    assertInsertionStartAvailable: async () => {},
    getProfileState: async () => ({ selectedProfileId: 'p1', profiles: [{ profileId: 'p1', displayName: 'Example' }] }),
    assertSelectedProfileMatchesLiveAccount: async () => {},
    getInventory: async id => items.find(x => x.inventoryId === id) || null,
    isTrashRecord: () => false,
    assertTemplateSourceReady: () => {},
    getRenewalConfiguration: async () => ({ renewalMode: 'fast', maxPhaseAttempts: 3 }),
    normalizeRenewalMode: x => x === 'fast' ? 'fast' : 'safe',
    finishRenewalReplacement: async () => {},
    retryRenewalVerification: async () => {},
    discardRenewalDraft: async () => {},
    publicAvailabilityPending: () => false,
    readFillSessions: async () => ({}),
    classifyKleinanzeigenInsertionErrorUrl: () => ({ isError: false }),
    terminalizeTemplateFillOnPlatformError: async () => {},
    terminalizeTemplateFillForWatchdog: async () => {},
    persistRenewalSession: async () => {},
    cryptoApi: { randomUUID: () => 'uuid-' + ++count },
    chromeApi: { storage: { local }, tabs: { get: async () => null } },
    queueMicrotaskFn: fn => scheduled.push(fn),
    setTimeoutFn: () => 12345,
    clearTimeoutFn: () => {},
    MASS_RENEWAL_MAX_ITEMS: 10,
    MASS_RENEWAL_WATCHDOG_STALE_MS: 300000,
    MASS_RENEWAL_WATCHDOG_TICK_MS: 20000,
    UNASSIGNED_PROFILE_ID: '__unassigned__',
    massRenewalWatchdogServiceApi: WatchdogService
  });
  return { workflow, controller, local, key, scheduled, get starts() { return startCount; } };
}

async function run() {
  let checks = 0;
  const check = (label, fn) => { fn(); checks += 1; console.log('PASS ' + label); };

  {
    const h = harness({ failures: ['one'] });
    const created = await h.workflow.startMassRenewalBatch({ inventoryIds: ['one', 'two'] });
    check('initial missing preference defaults to enabled and frozen in the batch', () => assert.equal(created.stopOnError, true));
    await h.workflow.startNextMassRenewalItem(created.batchId);
    const batch = await h.controller.readMassRenewalBatch();
    check('first start failure atomically stops and preserves unstarted item', () => {
      assert.equal(batch.status, 'stopped-with-attention');
      assert.deepEqual(batch.items.map(x => x.status), ['error', 'cancelled']);
      assert.equal(batch.stopOnErrorTriggered, true);
      assert.equal(batch.stopOnErrorFailureIndex, 0);
      assert.match(batch.stopOnErrorReason, /Failed to start one/);
    });
    await h.workflow.startNextMassRenewalItem(created.batchId);
    check('repeated next-item admission cannot restart a stopped batch', () => assert.equal(h.starts, 2));
    await h.local.set({ [h.key]: false });
    check('a preference change does not change a frozen running or stopped batch', () => assert.equal(batch.stopOnError, true));
  }

  {
    const h = harness({ preference: false, failures: ['one'] });
    const created = await h.workflow.startMassRenewalBatch({ inventoryIds: ['one', 'two'], stopOnError: false });
    await h.workflow.startNextMassRenewalItem(created.batchId);
    check('saved disabled preference preserves best-effort continuation', () => {
      const s = created; assert.equal(s.stopOnError, false);
    });
    const middle = await h.controller.readMassRenewalBatch();
    check('OFF does not stop for an ordinary first-item error', () => {
      assert.equal(middle.status, 'running');
      assert.deepEqual(middle.items.map(x => x.status), ['error', 'queued']);
    });
    await h.workflow.startNextMassRenewalItem(created.batchId);
    const after = await h.controller.readMassRenewalBatch();
    check('OFF admits next queued item', () => assert.deepEqual(after.items.map(x => x.status), ['error', 'running']));
    await h.workflow.reconcileMassRenewalBatchSession({
      massBatchId: created.batchId, massBatchItemIndex: 1, renewalId: 'renewal-two',
      stage: 'paid-insertion-required', status: 'verification-failed', lastError: 'Payment required'
    });
    const terminal = await h.controller.readMassRenewalBatch();
    check('paid checkout unconditionally stops even with option disabled', () => {
      assert.equal(terminal.status, 'stopped-with-attention');
      assert.equal(terminal.stopAfterCurrentRequested, true);
      assert.equal(terminal.items[1].status, 'needs-review');
    });
  }

  {
    const h = harness({ preference: true });
    await assert.rejects(h.workflow.startMassRenewalBatch({ inventoryIds: ['one'], stopOnError: false }), /zwischenzeitlich geändert/);
    check('stale UI choice is refused before any batch is created', () => assert.equal(h.scheduled.length, 0));
    await h.local.set({ [h.key]: 'false' });
    await assert.rejects(h.workflow.startMassRenewalBatch({ inventoryIds: ['one'] }), /ungültig/);
    check('corrupt persisted preference fails closed', () => assert.equal(h.scheduled.length, 0));
  }

  {
    const h = harness({ preference: true });
    const created = await h.workflow.startMassRenewalBatch({ inventoryIds: ['one', 'two', 'three'] });
    await h.workflow.startNextMassRenewalItem(created.batchId);
    await h.workflow.reconcileMassRenewalBatchSession({
      massBatchId: created.batchId, massBatchItemIndex: 0, renewalId: 'renewal-one',
      stage: 'verification-failed', status: 'verification-failed', lastError: 'Needs manual review'
    });
    const after = await h.controller.readMassRenewalBatch();
    check('terminal verification failure stops and marks later items not executed', () => {
      assert.equal(after.status, 'stopped-with-attention');
      assert.deepEqual(after.items.map(x => x.status), ['error', 'cancelled', 'cancelled']);
      assert.equal(after.stopOnErrorFailureIndex, 0);
    });
    const snapshot = h.controller.massRenewalPublicSnapshot(after);
    check('public summary includes frozen stop decision and failure reason', () => {
      assert.equal(snapshot.stopOnErrorTriggered, true);
      assert.equal(snapshot.counts.cancelled, 2);
      assert.equal(snapshot.stopOnErrorReason, 'Needs manual review');
    });
  }

  {
    const h = harness({ preference: true, failures: ['one'] });
    const created = await h.workflow.startMassRenewalBatch({ inventoryIds: ['one', 'two', 'three'] });
    await h.workflow.startNextMassRenewalItem(created.batchId);
    const previous = await h.controller.readMassRenewalBatch();
    const restored = harness({ preference: false, savedBatch: previous, failures: ['one'] });
    await restored.workflow.startNextMassRenewalItem(previous.batchId);
    const after = await restored.controller.readMassRenewalBatch();
    check('MV3 restart honors persisted batch policy instead of new user preference', () => {
      assert.equal(after.stopOnError, true);
      assert.deepEqual(after.items.map(x => x.status), ['error', 'cancelled', 'cancelled']);
    });
    await restored.workflow.retryMassRenewalItem({ batchId: previous.batchId, index: 0 }).catch(() => {});
    const retry = await restored.controller.readMassRenewalBatch();
    check('explicit item retry does not resurrect unrelated cancelled queue', () => {
      assert.deepEqual(retry.items.slice(1).map(x => x.status), ['cancelled', 'cancelled']);
    });
  }

  {
    const h = harness({ preference: true });
    const created = await h.workflow.startMassRenewalBatch({ inventoryIds: ['one', 'two'] });
    await h.controller.mutateMassRenewalBatch(created.batchId, batch => {
      batch.items[0].status = 'running'; batch.items[0].stage = 'starting'; batch.currentIndex = 0;
      return { changed: true };
    });
    await h.workflow.resumeMassRenewalBatch();
    const after = await h.controller.readMassRenewalBatch();
    check('uncertain restart start state does not automatically re-publish the item', () => {
      assert.equal(after.items[0].status, 'needs-review');
      assert.equal(after.items[1].status, 'cancelled');
      assert.equal(after.status, 'stopped-with-attention');
    });
  }

  const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'src/app/mass-renewal-ui-controller.js'), 'utf8');
  check('Step 2 exposes an accessible stop-on-error switch', () => {
    assert.match(html, /id="massRenewalStopOnError"[^>]*role="switch"/);
    assert.match(html, /Bei Fehler anhalten/);
  });
  check('UI freezes chosen preference at start and validates storage readback', () => {
    assert.match(app, /START_MASS_RENEWAL_BATCH', inventoryIds, stopOnError: stopOnErrorPreference/);
    assert.match(app, /readback\?\.\[stopOnErrorPreferenceKey\] !== value/);
  });
  console.log(checks + ' KAR-150 assertions PASS');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
