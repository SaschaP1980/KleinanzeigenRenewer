const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

let registered = null;
const modules = {};
const ctx = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  URL,
  structuredClone,
  TextEncoder,
  Date,
  Promise,
  Set,
  Map,
  Object,
  Array,
  String,
  Number,
  Boolean,
  RegExp,
  Error,
  encodeURIComponent,
  KRDeps: { register(name, api) { modules[name]=api; if (name === 'KRRenewalWorkflowController') registered = api; }, require(name) { if (!modules[name]) throw new Error('module not registered: '+name); return modules[name]; } }
});
for (const file of ['src/background/services/renewal-verification-flow.js','src/background/services/renewal-reinventory-flow.js','src/background/services/paid-checkout-recovery-service.js','src/background/controllers/renewal-workflow-controller.js']) {
  vm.runInContext(fs.readFileSync(file,'utf8'), ctx, { filename: file });
}
assert.ok(registered && typeof registered.create === 'function');

const calls = [];
const records = new Map();
let renewalSessions = {};
const fn = (name, value) => async (...args) => { calls.push([name, ...args]); return typeof value === 'function' ? value(...args) : value; };
const sync = (name, value) => (...args) => { calls.push([name, ...args]); return typeof value === 'function' ? value(...args) : value; };
const deps = {
  assertMassRenewalManualActionAllowed: fn('assertMassRenewalManualActionAllowed'),
  broadcastInventoryChanged: sync('broadcastInventoryChanged'),
  closeManagedWorkerTab: fn('closeManagedWorkerTab'),
  closeRegistryTab: fn('closeRegistryTab'),
  compareRenewalRecords: fn('compareRenewalRecords', { status: 'match', mismatches: [], uncertainties: [], matches: [] }),
  correlationContext: sync('correlationContext', (session, extra={}) => ({ renewalId: session?.renewalId || null, ...extra })),
  createManagedWorkerTab: fn('createManagedWorkerTab', { id: 90 }),
  delay: fn('delay'),
  detectPublishedAdForFill: fn('detectPublishedAdForFill', null),
  dropMassRenewalProgress: sync('dropMassRenewalProgress'),
  ensureContentConnection: fn('ensureContentConnection'),
  evaluateCheckoutRecoveryProof: sync('evaluateCheckoutRecoveryProof', { verified: false, reason: 'test', remoteIds: [], unknownIds: [], complete: true }),
  finishRenewalReplacement: fn('finishRenewalReplacement'),
  // Historical fixture contains no autonomous runtime: deny rather than executing untracked work.
  withAutonomousAdmission: () => Promise.reject(new Error('KR_TEST_AUTONOMOUS_ADMISSION_UNAVAILABLE')),
  beginPhase4Attempt: async () => { throw new Error('KR_PHASE4_JOURNAL_UNAVAILABLE'); },
  flushDiagnosticBuffer: fn('flushDiagnosticBuffer'),
  getInventory: fn('getInventory', id => records.get(String(id)) || null),
  isCheckoutAbortedRecoveryCandidate: sync('isCheckoutAbortedRecoveryCandidate', false),
  isNonRetryableRenewalSafetyError: sync('isNonRetryableRenewalSafetyError', false),
  isSafeLegacyManualEmergencyReset: sync('isSafeLegacyManualEmergencyReset', false),
  logDiagnostic: fn('logDiagnostic'),
  logRenewalPhaseAttemptFailed: fn('logRenewalPhaseAttemptFailed'),
  logRenewalPhaseAttemptStarted: fn('logRenewalPhaseAttemptStarted'),
  massRenewalBatchCounts: sync('massRenewalBatchCounts', { attention: 0 }),
  massRenewalTerminalOutcome: sync('massRenewalTerminalOutcome', null),
  mergeListingMetadata: sync('mergeListingMetadata', (a,b) => ({ ...(a||{}), ...(b||{}) })),
  mutateMassRenewalBatch: fn('mutateMassRenewalBatch'),
  normalBrowserWindowId: fn('normalBrowserWindowId', 1),
  normalizeKnownPublicAdUrl: sync('normalizeKnownPublicAdUrl', v => v || null),
  normalizeProfileName: sync('normalizeProfileName', v => String(v || '').trim()),
  normalizeRenewalMode: sync('normalizeRenewalMode', v => v === 'fast' ? 'fast' : 'safe'),
  normalizeRenewalPhaseAttempts: sync('normalizeRenewalPhaseAttempts', v => Math.max(1, Number(v || 3))),
  persistArchiveInsertionSession: fn('persistArchiveInsertionSession'),
  publicAvailabilitySnapshot: sync('publicAvailabilitySnapshot', {}),
  putInventoryRecordOnly: fn('putInventoryRecordOnly', record => { records.set(String(record.inventoryId), structuredClone(record)); return record; }),
  queueMassRenewalProgress: sync('queueMassRenewalProgress', true),
  readArchiveInsertionSessions: fn('readArchiveInsertionSessions', {}),
  readDiagnostics: fn('readDiagnostics', []),
  readFillSessions: fn('readFillSessions', {}),
  readInventoryRecordsForProfile: fn('readInventoryRecordsForProfile', []),
  readProfiles: fn('readProfiles', { profiles: [] }),
  readRenewalSessions: fn('readRenewalSessions', () => structuredClone(renewalSessions)),
  reconcileMassRenewalBatchSession: fn('reconcileMassRenewalBatchSession', false),
  renewalAttemptDetails: sync('renewalAttemptDetails', () => ({ phase: 3, attempt: 0, maxAttempts: 3 })),
  renewalAttemptState: sync('renewalAttemptState', () => ({ attempt: 0 })),
  renewalComparisonWaitsOnlyForOnline: sync('renewalComparisonWaitsOnlyForOnline', false),
  renewalInsertionMeta: sync('renewalInsertionMeta', {}),
  renewalMaxPhaseAttempts: sync('renewalMaxPhaseAttempts', 3),
  renewalOutcomeForComparison: sync('renewalOutcomeForComparison', 'verified'),
  renewalPhaseAttemptAvailable: sync('renewalPhaseAttemptAvailable', true),
  renewalPhaseRetryDelayMs: sync('renewalPhaseRetryDelayMs', 0),
  renewalPublicSnapshot: sync('renewalPublicSnapshot', s => ({ renewalId: s.renewalId, status: s.status, stage: s.stage, newAdId: s.newAdId || null })),
  resetRenewalPhaseAttempts: sync('resetRenewalPhaseAttempts'),
  resolveRenewalPublicEvidence: fn('resolveRenewalPublicEvidence', { found: false }),
  retirePublishedRenewalTargetTab: fn('retirePublishedRenewalTargetTab'),
  saveInventory: fn('saveInventory'),
  sendTabRequestWithBootstrap: fn('sendTabRequestWithBootstrap'),
  sessionCorrelationContext: sync('sessionCorrelationContext', (session, extra={}) => ({ renewalId: session?.renewalId || null, ...extra })),
  touchMassRenewalItemProgress: sync('touchMassRenewalItemProgress'),
  waitForTabComplete: fn('waitForTabComplete'),
  writeFillSessions: fn('writeFillSessions'),
  writeRenewalSessions: fn('writeRenewalSessions', sessions => { renewalSessions = structuredClone(sessions); }),
  BULK_RETRY_POLL_MS: 1,
  BULK_RETRY_TIMEOUT_MS: 10,
  MY_ADS_PROJECTS_URL: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS',
  RENEWAL_MODE_FAST: 'fast',
  RENEWAL_MODE_SAFE: 'safe',
  RENEWAL_PHASE_ATTEMPTS_DEFAULT: 3,
  TAB_LOAD_TIMEOUT_PHASE4_MS: 100,
  TAB_LOAD_TIMEOUT_RENEWAL_MS: 100
};

const controller = registered.create(deps);
assert.ok(controller && typeof controller.persistRenewalSession === 'function');

(async () => {
  const source = { inventoryId: 'src-1', adId: '123', title: 'Test', images: [{ imageKey: 'i1' }], imageSummary: { count: 1 } };
  const skeleton = await controller.createRenewalSkeleton(source, 'r1', { renewalMode: 'fast', maxPhaseAttempts: 3 });
  assert.equal(skeleton.inventoryId, 'renewal:r1');
  assert.equal(skeleton.renewal.renewalId, 'r1');
  assert.equal(skeleton.renewal.renewalMode, 'fast');
  assert.ok(records.has('renewal:r1'));

  const session = { renewalId: 'r1', skeletonInventoryId: 'renewal:r1', status: 'draft', stage: 'draft-created', newAdId: null };
  await controller.persistRenewalSession(session);
  assert.equal(renewalSessions.r1.renewalId, 'r1');
  const updated = records.get('renewal:r1');
  assert.equal(updated.renewal.status, 'draft');

  assert.equal(controller.scheduleAutomaticRenewalReplacement('', 'test'), false);
  assert.ok(calls.some(([name]) => name === 'broadcastInventoryChanged'));
  console.log('6/6 PASS v1.23.1 renewal workflow runtime');

  // Actual startup recovery: exact submitted source/target/fill only. The
  // journal deliberately denies the probe here, so nothing can be committed
  // or advance to Phase 3/4, and there is never a second publish.
  const submitted = {renewalId:'r2',fillId:'f2',targetTabId:42,sourceAdId:'123',
    status:'submitted',stage:'publish-submitted',newAdId:null};
  const original = {fillId:'f2',renewalId:'r2',targetTabId:42,sourceAdId:'123',
    status:'running',stage:'publish-submitted'};
  let rows={f2:original}, detections=0, journalReads=0;
  renewalSessions={r2:submitted};
  const resumed=registered.create({...deps,readFillSessions:async()=>structuredClone(rows),
    detectPublishedAdForFill:async(tab,id)=>{assert.equal(tab,42);assert.equal(id,'123');detections++;return {adId:'456'};},
    resolvePublishIntent:async(fill,detected)=>{assert.equal(fill.fillId,'f2');assert.equal(detected.adId,'456');journalReads++;throw Error('KR_PUBLISH_INTENT_UNVERIFIED');}});
  calls.length=0;
  await resumed.resumePendingRenewals();
  assert.equal(detections,1);assert.equal(journalReads,1);
  assert.equal(renewalSessions.r2.newAdId,null);
  assert.equal(renewalSessions.r2.publishResolutionState,'blocked');
  assert.equal(renewalSessions.r2.publishResolutionReason,'verification-failed');
  const blockedWrites=calls.filter(([name])=>name==='writeRenewalSessions').length;
  assert.equal(blockedWrites,1,'only the local UI outcome is persisted after denied proof');
  for(const invalid of [{...original,sourceAdId:'999'},{...original,targetTabId:43},
      {...original,fillId:'other'},{...original,status:'cancelled'},{...original,stage:'auto-publish-ready'},
      {...original,archiveInsertionId:'archive'}]){
    rows={f2:invalid};await resumed.resumePendingRenewals();
  }
  rows={f2:original};renewalSessions={r2:{...submitted,stage:'other'}};
  await resumed.resumePendingRenewals();
  assert.equal(detections,1);assert.equal(journalReads,1);
  assert.equal(calls.filter(([name])=>name==='writeRenewalSessions').length,blockedWrites,'invalid binding must not write');
  assert.ok(!calls.some(([name])=>['writeFillSessions','finishRenewalReplacement','createManagedWorkerTab','sendTabRequestWithBootstrap','retirePublishedRenewalTargetTab'].includes(name)));
  console.log('PASS KAR-206 exact submitted Renewal recovery and invalid binding denial; only local blocked UI state, no replay or remote mutation');

  const busy=()=>Object.assign(Error('KR_PUBLISH_INTENT_ATOMIC_BUSY'),{code:'KR_PUBLISH_INTENT_ATOMIC_BUSY'});
  async function exercise(mode){
    renewalSessions={r2:{...submitted}};
    rows={f2:{...original}};
    const attempts=[],delays=[],states=[];
    const d=registered.create({...deps,
      readFillSessions:async()=>structuredClone(rows),
      writeFillSessions:async value=>{rows=structuredClone(value);},
      delay:async ms=>{delays.push(ms);if(mode==='cancel')renewalSessions.r2={...submitted,status:'cancelled',stage:'emergency-reset-unverified',emergencyResetAt:'now'};},
      resolvePublishIntent:async(fill,detected)=>{
        attempts.push([fill.fillId,detected.adId]);
        states.push(renewalSessions.r2.publishResolutionState||null);
        if(mode==='non-retryable')throw Error('KR_PUBLISH_INTENT_UNVERIFIED');
        if(mode!=='success'||attempts.length<3)throw busy();
        return {state:'resolved-confirmed',newAdId:'456',fillId:'f2'};
      }});
    const outcome=await d.confirmPublishedRenewal(original,{adId:'456'}).then(v=>({v}),e=>({e}));
    return {outcome,attempts,delays,states,session:renewalSessions.r2,fill:rows.f2};
  }
  const success=await exercise('success');
  assert.equal(success.attempts.length,3);assert.deepEqual(success.delays,[1000,2000]);
  assert.deepEqual(success.states,[null,'retrying','retrying']);
  assert.equal(success.session.newAdId,'456');assert.equal(success.fill.stage,'new-id-confirmed');
  assert.equal(success.session.publishResolutionState,null);
  const exhausted=await exercise('exhausted');
  assert.equal(exhausted.attempts.length,3);assert.equal(exhausted.outcome.e.code,'KR_PUBLISH_INTENT_ATOMIC_BUSY');
  assert.equal(exhausted.session.publishResolutionState,'blocked');assert.equal(exhausted.session.publishResolutionReason,'lock-busy');
  assert.equal(exhausted.session.newAdId,null);assert.equal(exhausted.fill.stage,'publish-submitted');
  const hard=await exercise('non-retryable');
  assert.equal(hard.attempts.length,1);assert.equal(hard.delays.length,0);
  assert.equal(hard.session.publishResolutionState,'blocked');assert.equal(hard.session.publishResolutionReason,'verification-failed');
  const cancelled=await exercise('cancel');
  assert.equal(cancelled.attempts.length,1);assert.equal(cancelled.session.status,'cancelled');
  assert.equal(cancelled.session.newAdId,null);assert.equal(cancelled.fill.stage,'publish-submitted');
  console.log('PASS KAR-206 bounded read-only busy retry, final blocked state, success clearing, nonretryable denial and cancellation safety');
})().catch(error => { console.error(error); process.exitCode = 1; });
