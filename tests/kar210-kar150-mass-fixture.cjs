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
  const items = ['one', 'two', 'three', 'four', 'five', 'six'].map((id, index) => ({
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
      if (failures.includes(id)) throw Error(id === 'four' ? 'Kategorie konnte nicht ausgewählt werden' : 'Failed to start ' + id);
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


module.exports={harness};
