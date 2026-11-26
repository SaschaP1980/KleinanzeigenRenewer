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

function harness({ failures = [], savedBatch = null, savedSessions = {}, extraRecords = [], failSessionRead = false } = {}) {
  const items = ['one', 'two', 'three', 'four', 'five', 'six'].map((id, index) => ({
    inventoryId: id, adId: String(index + 101), profileId: 'p1', title: id,
    price: { displayed: '10 €' }, listingMeta: { endDateDisplay: 'morgen' }
  }));
  const state = new Map();
  const key = 'massRenewalStopOnErrorPreferenceV1';
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
  let sessions = structuredClone(savedSessions);
  const calls = [];
  let rejectSessionRead = failSessionRead;
  const workflow = WorkflowApi.create({
    readRenewalSessions: async () => { if(rejectSessionRead) throw Error('fixture session storage unavailable'); return structuredClone(sessions); },
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
      calls.push(['start',id]);
      if (failures.includes(id)) throw Error(id === 'four' ? 'Kategorie konnte nicht ausgewählt werden' : 'Failed to start ' + id);
      return { renewalId: 'renewal-' + id, operationId: 'op-' + id };
    },
    withInsertionStartGate: fn => fn(),
    assertInsertionStartAvailable: async () => {},
    getProfileState: async () => ({ selectedProfileId: 'p1', profiles: [{ profileId: 'p1', displayName: 'Example' }] }),
    assertSelectedProfileMatchesLiveAccount: async () => {},
    getInventory: async id => structuredClone([...extraRecords,...items].find(x => x.inventoryId === id) || null),
    isTrashRecord: row => row?.recordKind === 'trash',
    assertTemplateSourceReady: () => {},
    getRenewalConfiguration: async () => ({ renewalMode: 'fast', maxPhaseAttempts: 3 }),
    normalizeRenewalMode: x => x === 'fast' ? 'fast' : 'safe',
    finishRenewalReplacement: async message => {calls.push(['finish',structuredClone(message)]);},
    retryRenewalVerification: async message => {calls.push(['verify',structuredClone(message)]);},
    discardRenewalDraft: async message => {calls.push(['discard',structuredClone(message)]);},
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
  return { workflow, controller, local, key, scheduled, calls, setReadFailure(value){rejectSessionRead=value;}, get starts() { return startCount; } };
}




const test = require('node:test');
const when = new Date().toISOString();
const baseItem={index:0,inventoryId:'one',sourceAdId:'101',status:'needs-review',stage:'recovery-session-missing',renewalId:'r',renewalStatus:'verified',newAdId:'200',operationId:'op',startAttemptId:'attempt',lastError:'missing session',startedAt:when,completedAt:when,lastProgressAt:when};
function batch(item={},patch={}) {return {batchId:'b',profileId:'p1',profileName:'Example',operationId:'bop',renewalMode:'fast',maxPhaseAttempts:3,status:'complete-with-attention',currentIndex:null,createdAt:when,startedAt:when,completedAt:when,items:[{...baseItem,...item}],...patch};}
function session(patch={}) {return {renewalId:'r',massBatchId:'b',massBatchItemIndex:0,sourceInventoryId:'one',sourceAdId:'101',profileId:'p1',newAdId:'200',status:'verified',stage:'replacement-ready',lastError:'proof pending',massBatchTerminal:true,createdAt:when,updatedAt:when,...patch};}
async function stored(h){return (await h.controller.readMassRenewalBatch()).items[0];}
const retry={batchId:'b',index:0};
test('S06 actual manual retry with known new ID and lost renewal session cannot admit another insertion or erase identity',async()=>{
 const h=harness({savedBatch:batch()});
 await h.workflow.retryMassRenewalItem(retry).catch(()=>{});
 const row=await stored(h);
 assert.equal(h.starts,0,'a second insertion was admitted');
 assert.equal(row.newAdId,'200');
 assert.equal(row.renewalId,'r');
 assert.equal(row.status,'needs-review');
});
test('S06 uncertain interrupted start without session remains reviewable, even after next-queue processing',async()=>{
 const h=harness({savedBatch:batch({status:'running',stage:'starting',renewalId:null,renewalStatus:null,newAdId:null,operationId:null,completedAt:null},{status:'running',currentIndex:0,completedAt:null})});
 await h.workflow.resumeMassRenewalBatch();
 await h.workflow.startNextMassRenewalItem('b');
 assert.equal(h.starts,0,'interrupted item automatically re-admitted');
 assert.equal((await stored(h)).status,'needs-review');
});
test('S06 B14 standalone recovered target is not evidence that old source was deleted or exchange completed',async()=>{
 const h=harness({savedBatch:batch({status:'running',stage:'replacement-ready',completedAt:null},{status:'running',currentIndex:0,completedAt:null}),extraRecords:[{inventoryId:'200',adId:'200',profileId:'p1',recordKind:'inventory',recovery:{kind:'emergency-reset-candidate',remoteVerification:'unverified',renewalId:'r',sourceAdId:'101'}}]});
 await h.workflow.resumeMassRenewalBatch();
 assert.equal((await stored(h)).status,'needs-review','standalone target was treated as successful exchange');
 assert.equal(h.starts,0);
});
test('S06 unknown storage read leaves terminal item reviewable with identity intact, not indefinitely retrying',async()=>{
 const h=harness({savedBatch:batch(),failSessionRead:true});
 await h.workflow.retryMassRenewalItem(retry).catch(()=>{});
 const row=await stored(h);
 assert.equal(row.status,'needs-review');
 assert.equal(row.newAdId,'200');assert.equal(row.renewalId,'r');assert.equal(h.starts,0);
});
test('S06 known new ID on item must not be overwritten by a conflicting renewal-session ID',async()=>{
 const h=harness({savedBatch:batch(),savedSessions:{r:session({newAdId:'999'})}});
 await h.workflow.retryMassRenewalItem(retry).catch(()=>{});
 assert.deepEqual(h.calls,[],'conflicting ID admitted into verification or replacement');
 assert.equal((await stored(h)).newAdId,'200');
});
test('S06 valid existing verified renewal reuses existing phase 4 rather than restarting publication',async()=>{
 const h=harness({savedBatch:batch(),savedSessions:{r:session()}});
 await h.workflow.retryMassRenewalItem(retry);
 assert.deepEqual(h.calls,[['finish',{renewalId:'r',automatic:false,massBatchRetry:true}]]);
 assert.equal(h.starts,0);assert.equal((await stored(h)).newAdId,'200');
});
test('S06 valid pre-publish draft retry retains local discard then ordinary start',async()=>{
 const h=harness({savedBatch:batch({stage:'target-tab-opened',renewalStatus:'draft',newAdId:null}),savedSessions:{r:session({newAdId:null,status:'draft',stage:'target-tab-opened',lastError:'fixture prepublish error'})}});
 await h.workflow.retryMassRenewalItem(retry);
 assert.deepEqual(h.calls,[['discard',{renewalId:'r'}],['start','one']]);assert.equal(h.starts,1);
});
test('S06 ordinary explicit start failure with no identity is still retryable',async()=>{
 const h=harness({savedBatch:batch({status:'error',stage:'start-failed',renewalId:null,renewalStatus:null,newAdId:null,operationId:null})});
 await h.workflow.retryMassRenewalItem(retry);
 assert.deepEqual(h.calls,[['start','one']]);assert.equal(h.starts,1);
});
test('S06 startup rebinds positively correlated persisted session instead of replaying start',async()=>{
 const h=harness({savedBatch:batch({status:'running',stage:'starting',renewalId:null,renewalStatus:null,newAdId:null,completedAt:null},{status:'running',currentIndex:0,completedAt:null}),savedSessions:{r:session({status:'new-id-confirmed',stage:'new-id-confirmed',lastError:null})}});
 await h.workflow.resumeMassRenewalBatch();await h.workflow.startNextMassRenewalItem('b');
 const row=await stored(h);assert.equal(row.renewalId,'r');assert.equal(row.newAdId,'200');assert.equal(h.starts,0);
});
