// KAR-99 P1.3-B: executable RED-first, non-authorizing positive owner-IDLE contract.
//
// IMPORTANT: This intentionally fails before P1.3-C implements a trusted producer.
// Do NOT convert it to a fixture-only policy PASS, suppress this suite, invent
// an all-IDLE source, or enable NativeHost apply. No external network/account I/O.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Policy = require('../lib/update-idle-policy.js');
const Fence = require('../src/background/services/update-workflow-fence.js');
const Atomic = require('../src/background/services/cross-worker-atomic-admission.js');
const Persisted = require('../src/background/services/persisted-owner-observer.js');
const Additional = require('../src/background/services/additional-owner-observer.js');

const PROFILE = 'profile-A';
const WORKER = 'worker-current';
const NOW = 120000;
let sequence = 0;
const nonce = () => 'server-created-nonce-' + (++sequence) + '-long';
const clone = value => structuredClone(value);

function storage(seed = {}, config = {}) {
  const rows = clone(seed);
  return {
    rows,
    async get(keys) {
      if (config.failRead === true) throw Error('STORAGE_READ_FAILED');
      const names = keys === null ? Object.keys(rows) : Array.isArray(keys) ? keys : [keys];
      const result = Object.fromEntries(names.filter(key => Object.hasOwn(rows, key))
        .map(key => [key, clone(rows[key])]));
      if (typeof config.afterRead === 'function') await config.afterRead(keys);
      return result;
    },
    async set(patch) {
      if (config.failWrite === true) throw Error('STORAGE_WRITE_FAILED');
      Object.assign(rows, clone(patch));
    },
    async remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete rows[key];
    }
  };
}
function locks() {
  const busy = new Set();
  return {
    async request(name, settings, callback) {
      assert.deepEqual(settings, {mode: 'exclusive', ifAvailable: true});
      if (busy.has(name)) return callback(null);
      busy.add(name);
      try { return await callback({name, mode: 'exclusive'}); }
      finally { busy.delete(name); }
    }
  };
}
function idleSnapshot(worker = WORKER, profile = PROFILE, time = NOW) {
  return {schema: 1, workerGeneration: worker, profileId: profile, observedAtMs: time,
    owners: Object.fromEntries(Policy.requiredOwners.map(owner => [owner, {
      confirmed: true, state: 'idle', workerGeneration: worker, profileId: profile,
      observedAtMs: time
    }]))};
}
function fixture(options = {}) {
  // The future module must obtain owner proofs from *private, actual-source*
  // adapters. Each adapter's evidence represents a distinct completed source;
  // a caller-supplied snapshot or a bare "idle" string is NEVER authority.
  const local = storage({
    profilesV1: [{profileId: PROFILE, displayName: 'Fixture account'}],
    activeDetectedProfileV1: {profileId: PROFILE},
    selectedInventoryProfileV1: {profileId: PROFILE},
    bulkInventoryRun: {status: 'complete', runId: 'completed-run'},
    renewalSessionsV1: {},
    massRenewalBatchV1: {status: 'complete', items: []},
    templateFillSessions: {},
    archiveInsertionSessionsV1: {},
    nativeUpdateWorkflowFenceV1: null,
    ...options.local
  }, options.localConfig);
  const session = storage({
    tabRegistryV1: {},
    managedWorkerTabsV1: {},
    bulkRunRuntimeLeaseV1: null,
    runtimeEpochV1: 'bulk-session-epoch-not-worker-generation',
    ...options.session
  }, options.sessionConfig);
  const sourceProofs = Object.fromEntries(Policy.requiredOwners.map(owner => [owner, async () => ({
    owner, type: 'source-completion', verified: true,
    workerGeneration: options.workerId || WORKER,
    profileId: PROFILE, observedAtMs: NOW,
    unfinishedOperationCount: 0,
    durableCompletionVerified: true,
    noUnresolvedRemoteMutation: true,
    noPriorGenerationTask: true,
    // Strong provenance must be validated by the concrete production source,
    // not simply copied from these *test-controlled* reader return values.
    sourceRevision: 'source-revision-' + owner
  })]));
  if (options.owner) {
    sourceProofs[options.owner] = async () => options.ownerEvidence;
  }
  const live = options.live || [{profileId: PROFILE, accountId: 'fixture-account-001', loggedIn: true, current: true, observedAtMs: NOW}];
  let accountCalls = 0;
  let tabCalls = 0;
  let proofCalls = 0;
  const observers = {
    async readLiveAccountReadOnly() {
      const answer = live[Math.min(accountCalls++, live.length - 1)];
      if (answer instanceof Error) throw answer;
      return clone(answer);
    },
    async readBrowserTabsReadOnly() {
      tabCalls++;
      if (options.tabs instanceof Error) throw options.tabs;
      return clone(options.tabs || []);
    },
    async readOwnerSourceProofsReadOnly() {
      proofCalls++;
      const result = {};
      for (const name of Policy.requiredOwners) result[name] = await sourceProofs[name]();
      return result;
    }
  };
  // This module is intentionally absent at the P1.3-B RED checkpoint.
  // P1.3-C must provide a real background-owned, read-only producer and bind
  // these ports to actual repositories/Chrome state, not public message input.
  const Trusted = require('../src/background/services/trusted-owner-authority.js');
  assert.equal(typeof Trusted.create, 'function', 'trusted owner producer factory required');
  const gate = Trusted.create({
    storageLocal: local, storageSession: session, workerInstanceId: options.workerId || WORKER,
    lockManager: options.lockManager === undefined ? locks() : options.lockManager,
    clock: () => options.now ?? NOW, newToken: nonce, ownerPolicy: Policy,
    ...observers
  });
  assert.equal(typeof gate.captureForReserve, 'function',
    'private read-only 15-owner captureForReserve is required');
  return {gate, local, session,
    calls: () => ({accountCalls, tabCalls, proofCalls})};
}
async function denied(work, reason) {
  let output;
  try {output = await work();}
  catch (error) {
    assert.match(String(error?.code || error?.message || error),
      /^KR_(?:UPDATE|OWNER|ACCOUNT|PROFILE|ATOMIC)_/,
      reason + ': denial must use a typed safety error, not a missing import');
    return;
  }
  assert.equal(output?.status, 'blocked', reason + ': not candidate-idle');
  assert.equal(typeof output.reason, 'string', reason + ': explicit denial reason');
  assert.ok(output.reason, reason + ': no silent/empty reason');
}
function request(options = {}) {
  return {expectedProfileId: PROFILE, transactionId: 'tx-a', ...options};
}

// Existing executable negative boundaries: GREEN even before the positive
// owner contract exists. They prevent any fake candidate from becoming a lease.
test('P1.3-B / baseline: a synthetic all-idle policy candidate is NOT updater authorization', async () => {
  assert.equal(Policy.requiredOwners.length, 15);
  assert.deepEqual([...Persisted.OWNERS, ...Additional.OWNERS].sort(),
    [...Policy.requiredOwners].sort(), 'exactly the canonical 15 owner names');
  const candidate = idleSnapshot();
  assert.equal(Policy.evaluate(candidate, {nowMs: NOW}).status, 'candidate-idle');
  const local = storage({nativeUpdateWorkflowFenceV1: null});
  const fence = Fence.create({storageLocal: local, clock: () => NOW, newToken: nonce});
  await assert.rejects(fence.reserve({
    profileId: PROFILE, workerGeneration: WORKER, transactionId: 'tx-a',
    snapshot: candidate
  }), error => error?.code === 'KR_UPDATE_FENCE_OWNER_UNAVAILABLE');
  assert.equal(typeof fence.apply, 'undefined', 'no NativeHost apply API');
});
test('P1.3-B / baseline: wrong identity, stale and missing owner are policy BLOCKED', () => {
  const wrong = idleSnapshot(); wrong.owners.renewal.profileId = 'other';
  assert.equal(Policy.evaluate(wrong, {nowMs: NOW}).status, 'blocked');
  const stale = idleSnapshot(WORKER, PROFILE, NOW - 2001);
  assert.equal(Policy.evaluate(stale, {nowMs: NOW}).reason, 'STALE_SNAPSHOT');
  const missing = idleSnapshot(); delete missing.owners.nativeUpdateTransaction;
  assert.equal(Policy.evaluate(missing, {nowMs: NOW}).reason, 'OWNER_MISSING');
});
test('P1.3-B / baseline: actual 7+8 observers never invent IDLE from empty storage', async () => {
  const a = Persisted.create({storageLocal: storage({}), storageSession: storage({}),
    clock: () => NOW, workerInstanceId: WORKER});
  const b = Additional.create({storageLocal: storage({}), storageSession: storage({}),
    clock: () => NOW, workerInstanceId: WORKER});
  const all = await b.observeAll(a);
  assert.equal(all.eligibleForLease, false);
  assert.deepEqual(Object.keys(all.observations).sort(), [...Policy.requiredOwners].sort());
  assert.ok(Object.values(all.observations).every(x => x.state === 'unknown' || x.state === 'active'));
  assert.equal(all.context.profile.state, 'unverified');
});
test('P1.3-B / baseline: missing Web Locks and stale generation block the actual atomic boundary', async () => {
  const db = storage();
  const absent = Atomic.create({storageLocal: db, lockManager: null,
    workerInstanceId: WORKER, clock: () => NOW, newToken: nonce});
  await assert.rejects(absent.guardReserve(() => 'danger', WORKER),
    e => e?.code === 'KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE');
  const current = Atomic.create({storageLocal: db, lockManager: locks(),
    workerInstanceId: WORKER, clock: () => NOW, newToken: nonce});
  await assert.rejects(current.guardReserve(() => 'danger', 'worker-older'),
    e => e?.code === 'KR_UPDATE_FENCE_ATOMIC_GENERATION');
});
test('P1.3-B / baseline: durable unfinished admission survives a different worker', async () => {
  const token = 'unresolved_receipt_nonce_123';
  const db = storage({[Atomic.START_PREFIX + token]: {
    schema: 1, state: 'admitted', token, operationType: 'REMOTE_PUBLISH',
    workerInstanceId: 'worker-before-crash', startedAtMs: NOW - 10
  }});
  let invoked = false;
  const next = Atomic.create({storageLocal: db, lockManager: locks(),
    workerInstanceId: WORKER, clock: () => NOW, newToken: nonce});
  await assert.rejects(next.guardReserve(() => {invoked = true;}, WORKER),
    e => e?.code === 'KR_UPDATE_FENCE_BUSY');
  assert.equal(invoked, false, 'no reservation callback runs after lost worker');
});

// RED-first future production authority contract. A single policy-shaped
// asserted snapshot or source "idle" answer must never bypass provenance.
test('P1.3-B / RED: a fully independently reconciled source set yields all 15 *private* candidate records', async () => {
  const {gate, calls} = fixture();
  const answer = await gate.captureForReserve(request());
  assert.equal(answer.status, 'candidate-idle');
  assert.ok(answer.snapshot && typeof answer.nonce === 'string' && answer.nonce.length >= 12);
  assert.equal(answer.snapshot.schema, 1);
  assert.equal(answer.snapshot.workerGeneration, WORKER);
  assert.equal(answer.snapshot.profileId, PROFILE);
  assert.deepEqual(Object.keys(answer.snapshot.owners), Policy.requiredOwners);
  assert.ok(Policy.requiredOwners.every(owner => {
    const record = answer.snapshot.owners[owner];
    return record?.confirmed === true && record.state === 'idle'
      && record.workerGeneration === WORKER && record.profileId === PROFILE;
  }));
  assert.equal(Policy.evaluate(answer.snapshot, {nowMs: NOW}).status, 'candidate-idle');
  assert.ok(calls().accountCalls >= 2, 'independent live-account readback');
  assert.ok(calls().tabCalls >= 1 && calls().proofCalls >= 1,
    'actual source/tab evidence required, not caller-owned data');
});
test('P1.3-B / RED: a caller-provided all-idle snapshot or nonce never becomes trusted', async () => {
  const {gate} = fixture({owner: 'renewal', ownerEvidence: {state: 'unknown'}});
  await denied(() => gate.captureForReserve(request({
    snapshot: idleSnapshot(), owners: idleSnapshot().owners,
    nonce: 'user_selected_nonce'
  })), 'caller-forged owner snapshot');
  await denied(() => gate.captureForReserve(request()), 'unproven renewal owner');
});
const negativeCases = [
  ['wrong selected profile', {local: {selectedInventoryProfileV1: {profileId: 'other'}}}],
  ['missing selected profile', {local: {selectedInventoryProfileV1: null}}],
  ['changed live account during double-read', {live: [
    {profileId: PROFILE, accountId: 'fixture-account-001', loggedIn: true, current: true, observedAtMs: NOW},
    {profileId: 'other', accountId: 'fixture-account-002', loggedIn: true, current: true, observedAtMs: NOW}
  ]}],
  ['logged-out current account', {live: [{profileId: null, loggedIn: false}]}],
  ['live-account probe failure', {live: [Error('LIVE_ACCOUNT_UNAVAILABLE')]}],
  ['missing owner evidence', {owner: 'templateFill', ownerEvidence: null}],
  ['unverified owner state', {owner: 'diagnosticExport', ownerEvidence: {state: 'unknown'}}],
  ['misbound owner generation', {owner: 'massRenewal', ownerEvidence: {
    owner: 'massRenewal', verified: true, state: 'idle', workerGeneration: 'prior-worker',
    profileId: PROFILE, observedAtMs: NOW, unfinishedOperationCount: 0
  }}],
  ['expired owner evidence', {owner: 'nativeUpdateTransaction', ownerEvidence: {
    owner: 'nativeUpdateTransaction', verified: true, state: 'idle',
    workerGeneration: WORKER, profileId: PROFILE, observedAtMs: NOW - 2001,
    unfinishedOperationCount: 0
  }}],
  ['corrupt workflow storage', {local: {renewalSessionsV1: 'corrupt'}}],
  ['storage local read rejection', {localConfig: {failRead: true}}],
  ['storage session read rejection', {sessionConfig: {failRead: true}}],
  ['Chrome tab enumeration rejection', {tabs: Error('TABS_QUERY_REJECTED')}],
  ['live managed tab still present', {tabs: [{id: 12, url: 'about:blank', managed: true}]}],
  ['missing browser-origin exclusive Web Locks', {lockManager: null}],
  ['unresolved Phase-4 remote delete attempt', {local: {
    karPhase4UncertainAttemptV1_renewalA_attemptA: {
      schema: 1, state: 'outcome-unverified', renewalId: 'renewalA',
      attemptId: 'attemptA', workerInstanceId: 'prior', profileId: PROFILE,
      sourceAdId: '123', newAdId: '456', createdAtMs: NOW - 1000
    }
  }}],
  ['unresolved post-publish intent', {local: {
    karAutoPublishIntentV1_fillA_attemptA: {
      schema: 1, state: 'outcome-unverified', fillId: 'fillA',
      workflowId: 'renewalA', attemptId: 'attemptA', workerInstanceId: 'prior',
      kind: 'renewal', profileId: PROFILE, targetTabId: 10,
      sourceAdId: '123', createdAtMs: NOW - 1000
    }
  }}],
  ['outstanding first-worker start receipt', {local: {
    karAtomicAdmissionStartV1_token_abc123456: {
      schema: 1, state: 'admitted', token: 'token_abc123456',
      operationType: 'PUBLISH', workerInstanceId: 'worker-before-crash',
      startedAtMs: NOW - 100
    }
  }}],
  ['reserved prior transaction', {local: {nativeUpdateWorkflowFenceV1: {
    schema: 1, state: 'reserved', token: 'old-reservation-123',
    workerGeneration: 'worker-before-crash', profileId: PROFILE,
    transactionId: 'old-transaction', createdAtMs: NOW - 3000,
    expiresAtMs: NOW - 100
  }}}],
  ['cancelled lease tombstone', {local: {nativeUpdateWorkflowFenceV1: {
    schema: 1, state: 'cancelled', token: 'old-reservation-123',
    workerGeneration: 'worker-before-crash', profileId: PROFILE,
    transactionId: 'old-transaction', createdAtMs: NOW - 3000,
    expiresAtMs: NOW - 100, cancelledAtMs: NOW - 200
  }}}]
];
for (const [name, config] of negativeCases) {
  test('P1.3-B / RED: deny ' + name, async () => {
    const {gate} = fixture(config);
    await denied(() => gate.captureForReserve(request()), name);
  });
}
test('P1.3-B / RED: no two workers can reserve over an existing transaction', async () => {
  const {gate, local} = fixture();
  const first = await gate.captureForReserve(request());
  assert.equal(first.status, 'candidate-idle');
  // Production reservation authority must remain inside the one existing
  // cross-worker fence; no constructor-supplied all-idle candidate suffices.
  assert.equal(typeof gate.reserveThroughFence, 'function');
  const lease = await gate.reserveThroughFence(request());
  assert.equal(lease?.state, 'reserved');
  const reused = fixture({local: local.rows, workerId: 'second-worker'});
  await denied(() => reused.gate.reserveThroughFence(request()), 'second reservation');
});
test('P1.3-B / RED: live identity changes between capture and reservation', async () => {
  const {gate} = fixture({live: [
    {profileId: PROFILE, accountId: 'fixture-account-001', loggedIn: true, current: true, observedAtMs: NOW},
    {profileId: PROFILE, accountId: 'fixture-account-001', loggedIn: true, current: true, observedAtMs: NOW},
    {profileId: 'other', accountId: 'fixture-account-002', loggedIn: true, current: true, observedAtMs: NOW}
  ]});
  const first = await gate.captureForReserve(request());
  assert.equal(first.status, 'candidate-idle');
  await denied(() => gate.reserveThroughFence(request()), 'account changed before commit');
});
test('P1.3-B / RED: worker restart cannot reuse a prior capture nonce or generation', async () => {
  const older = fixture();
  const captured = await older.gate.captureForReserve(request());
  assert.equal(captured.status, 'candidate-idle');
  const fresh = fixture({local: older.local.rows, session: older.session.rows,
    workerId: 'worker-after-restart'});
  await denied(() => fresh.gate.reserveThroughFence(request({
    workerGeneration: WORKER, nonce: captured.nonce
  })), 'replayed pre-restart capture');
});
test('P1.3-B / RED: production cannot expose a content/API/native updater apply path', () => {
  const {gate} = fixture();
  assert.equal(typeof gate.apply, 'undefined');
  assert.equal(typeof gate.nativeApply, 'undefined');
  assert.equal(typeof gate.installExtension, 'undefined');
});

test('P1.3-D / RED: a raw Chrome tab with no ownership classification cannot prove no managed tab', async () => {
  const {gate} = fixture({tabs:[{id:42,url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html'}]});
  await denied(() => gate.captureForReserve(request()), 'unclassified Chrome tab');
});
test('P1.3-D / RED: ambiguous managed-tab classification cannot be considered idle', async () => {
  const {gate} = fixture({tabs:[{id:43,managed:'unknown',url:'https://www.kleinanzeigen.de'}]});
  await denied(() => gate.captureForReserve(request()), 'ambiguous tab ownership');
});
test('P1.3-D / RED: an unverified unmanaged assertion is not independent registry evidence', async () => {
  const {gate} = fixture({tabs:[{id:44,managed:false,url:'https://www.kleinanzeigen.de'}]});
  await denied(() => gate.captureForReserve(request()), 'unverified false tab ownership');
});
test('P1.3-D / source-proof fixture: a verified non-managed tab may be considered by the private test gate', async () => {
  const {gate} = fixture({tabs:[{
    id:45,managed:false,ownershipVerified:true,sourceRevision:'tab-registry-checked-v1'
  }]});
  assert.equal((await gate.captureForReserve(request())).status,'candidate-idle');
});
