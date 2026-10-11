const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const WatchdogService = require('../src/background/services/mass-renewal-watchdog-service.js');
let registered = null;
const ctx = vm.createContext({
  console, Date, Promise, Set, Map, Object, Array, String, Number, Boolean, RegExp, Error,
  KRDeps: { register(name, api) { if (name === 'KRMassRenewalWorkflowController') registered = api; } }
});
vm.runInContext(fs.readFileSync('mass-renewal-workflow-controller.js','utf8'), ctx, { filename:'mass-renewal-workflow-controller.js' });
assert.ok(registered && typeof registered.create === 'function');
let storedBatch = null;
let uuid = 0;
const record = { inventoryId:'inv-1', adId:'123', profileId:'p1', title:'Test', price:{displayed:'10 €'}, listingMeta:{endDateDisplay:'morgen'} };
const noopAsync = async () => {};
const deps = {
  readRenewalSessions: async () => ({}), writeRenewalSessions: noopAsync,
  mutateMassRenewalBatch: async (id, mutator) => { if (!storedBatch || storedBatch.batchId !== id) return {batch:storedBatch,changed:false}; const r=mutator(storedBatch)||{}; return {batch:storedBatch,changed:r.changed!==false}; },
  applyMassRenewalStopState: batch => ({stopped:false,cancelled:0,counts:{total:batch.items.length,success:0,attention:0,cancelled:0}}),
  applyMassRenewalFinalState: batch => ({completed:false,stopped:false,counts:{total:batch.items.length,success:0,attention:0,cancelled:0}}),
  touchMassRenewalItemProgress: (item, now=new Date().toISOString()) => { item.lastProgressAt=now; },
  massRenewalTerminalOutcome: () => null,
  massRenewalPublicSnapshot: batch => batch ? {batchId:batch.batchId,status:batch.status,items:batch.items.map(x=>({...x}))}:null,
  readMassRenewalBatch: async () => storedBatch,
  writeMassRenewalBatch: async batch => { storedBatch=structuredClone(batch); return storedBatch; },
  withMassRenewalMutation: task => Promise.resolve().then(task),
  dropMassRenewalProgress: () => {},
  logDiagnostic: async () => {},
  sessionCorrelationContext: (x, extra={}) => ({...extra}),
  normalizeRenewalPhaseAttempts: v => Number(v||3),
  startTemplateFillUnlocked: async () => ({renewalId:'r1',operationId:'op1'}),
  withInsertionStartGate: fn => fn(),
  assertInsertionStartAvailable: noopAsync,
  getProfileState: async () => ({selectedProfileId:'p1',profiles:[{profileId:'p1',displayName:'Profil'}]}),
  assertSelectedProfileMatchesLiveAccount: noopAsync,
  getInventory: async id => id==='inv-1' ? structuredClone(record) : null,
  isTrashRecord: () => false,
  assertTemplateSourceReady: () => true,
  getRenewalConfiguration: async () => ({renewalMode:'fast',maxPhaseAttempts:3}),
  normalizeRenewalMode: v => v==='fast'?'fast':'safe',
  finishRenewalReplacement: noopAsync,
  retryRenewalVerification: noopAsync,
  discardRenewalDraft: noopAsync,
  publicAvailabilityPending: () => false,
  readFillSessions: async () => ({}),
  classifyKleinanzeigenInsertionErrorUrl: () => ({isError:false}),
  terminalizeTemplateFillOnPlatformError: noopAsync,
  terminalizeTemplateFillForWatchdog: noopAsync,
  persistRenewalSession: noopAsync,
  cryptoApi: { randomUUID: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12,'0')}` },
  chromeApi: { tabs: { get: async () => null } },
  queueMicrotaskFn: () => {},
  setTimeoutFn: () => 1, clearTimeoutFn: () => {},
  MASS_RENEWAL_MAX_ITEMS: 10,
  MASS_RENEWAL_WATCHDOG_STALE_MS: 300000,
  MASS_RENEWAL_WATCHDOG_TICK_MS: 20000,
  UNASSIGNED_PROFILE_ID: '__unassigned__',
  massRenewalWatchdogServiceApi: WatchdogService
};
const controller = registered.create(deps);
assert.ok(controller && typeof controller.startMassRenewalBatch === 'function');
(async()=>{
  const snap = await controller.startMassRenewalBatch({inventoryIds:['inv-1']});
  assert.equal(snap.status,'running');
  assert.equal(storedBatch.items.length,1);
  assert.equal(storedBatch.items[0].inventoryId,'inv-1');
  assert.equal(storedBatch.renewalMode,'fast');
  const ms = controller.latestMassRenewalProgressMs({startedAt:'2026-01-01T00:00:00Z'},{updatedAt:'2026-01-01T00:00:02Z'},null);
  assert.equal(ms, Date.parse('2026-01-01T00:00:02Z'));
  console.log('6/6 PASS v1.23.3 mass renewal workflow runtime');
})().catch(e=>{console.error(e);process.exitCode=1;});
