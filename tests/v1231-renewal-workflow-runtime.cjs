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
})().catch(error => { console.error(error); process.exitCode = 1; });
