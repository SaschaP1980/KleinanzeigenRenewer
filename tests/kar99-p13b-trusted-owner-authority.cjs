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
function liveSiteObservation(profileId = PROFILE, workerId = WORKER,
                             observedAtMs = NOW, matched = true) {
  // PRIVATE source-contract fixture. Real production must inject the actual
  // read-only KRAdditionalOwnerObserver, never accept caller-provided facts.
  return {schema: 1, eligibleForLease: false, observedAtMs,
    observations: {},
    context: {
      profile: {state: matched ? 'matched' : 'unverified',
        reason: matched ? 'LIVE_ACCOUNT_PROFILE_MATCH' : 'LIVE_ACCOUNT_STATUS_UNVERIFIED',
        profileId},
      worker: {state: 'unverified', reason: 'NO_CROSS_WORKER_GENERATION_PROOF',
        workerInstanceId: workerId}
    }
  };
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
  const live = options.live || [liveSiteObservation(PROFILE, options.workerId || WORKER)];
  const myAdsUrl = 'https://www.kleinanzeigen.de/m-meine-anzeigen.html';
  let siteReads = 0;
  const siteObserver = options.site ? Additional.create({
    storageLocal: local, storageSession: session, clock: () => NOW,
    workerInstanceId: options.siteWorker || options.workerId || WORKER,
    queryBrowserTabsReadOnly: async () => options.site.tabs === false ? []
      : [{id: 77, url: myAdsUrl}],
    readAccountPageStatusReadOnly: async () => {
      const index = siteReads++;
      return {pageType: 'my-ads', url: myAdsUrl,
        auth: {loggedIn: options.site.loggedIn !== false},
        profileName: (options.site.names || ['Fixture account'])[
          Math.min(index, (options.site.names || ['Fixture account']).length - 1)]};
    }
  }) : null;
  let accountCalls = 0;
  let tabCalls = 0;
  let proofCalls = 0;
  const observers = {
    async readLiveAccountReadOnly() {
      const answer = live[Math.min(accountCalls++, live.length - 1)];
      if (answer instanceof Error) throw answer;
      if (siteObserver) return siteObserver.observe();
      return clone(answer);
    },
    async readBrowserTabsReadOnly() {
      tabCalls++;
      if (options.tabs instanceof Error) throw options.tabs;
      return clone(typeof options.tabs === 'function' ? options.tabs(tabCalls) : (options.tabs || []));
    },
    async readOwnerSourceProofsReadOnly() {
      proofCalls++;
      const result = {};
      for (const name of Policy.requiredOwners) result[name] = await sourceProofs[name]();
      const override=typeof options.ownerProofs==='function'
        ?options.ownerProofs(proofCalls):null;
      if(override)for(const [name,changes] of Object.entries(override)){
        if(changes===null)delete result[name];
        else result[name]={...result[name],...changes};
      }
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
    clock: () => typeof options.clock === 'function' ? options.clock() : (options.now ?? NOW),
    newToken: nonce, ownerPolicy: Policy,
    ...observers
  });
  assert.equal(typeof gate.captureForReserve, 'function',
    'private read-only 15-owner captureForReserve is required');
  return {gate, local, session,
    calls: () => ({accountCalls, tabCalls, proofCalls, siteReads})};
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

// P1.3-E3D: exercise the ACTUAL established first-party account/profile
// observer, rather than inventing an independent accountId or email parser.
// Positive test owner receipts remain deliberately test-controlled: these
// tests prove only site identity plumbing, NOT production updater permission.
test('P1.3-E3D / RED: private gate accepts real existing site account/profile observation without seller ID', async () => {
  const {gate, calls} = fixture({site: {names: ['Fixture account']}});
  const answer = await gate.captureForReserve(request());
  assert.equal(answer.status, 'candidate-idle');
  assert.equal(answer.snapshot.profileId, PROFILE);
  assert.equal(calls().siteReads, 4, 'two actual PAGE_STATUS reads on each of two snapshots');
});
test('P1.3-E3D / RED: private gate denies changed site login during PAGE_STATUS verification', async () => {
  const {gate} = fixture({site: {names: ['Fixture account', 'Different account']}});
  await denied(() => gate.captureForReserve(request()), 'account changes during live read');
});
test('P1.3-E3D / RED: private gate denies different logged-in site profile', async () => {
  const {gate} = fixture({site: {names: ['Other account']}});
  await denied(() => gate.captureForReserve(request()), 'selected profile disagrees with Kleinanzeigen account');
});
test('P1.3-E3D / RED: private gate denies missing authenticated My Ads tab', async () => {
  const {gate} = fixture({site: {tabs: false}});
  await denied(() => gate.captureForReserve(request()), 'no authenticated My Ads view');
});
test('P1.3-E3D / RED: private gate denies prior worker generation site observation', async () => {
  const {gate} = fixture({site: {names: ['Fixture account']}, siteWorker: 'worker-older'});
  await denied(() => gate.captureForReserve(request()), 'old worker account observation');
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
// P1.3-F2E2B: a first snapshot of source-completion claims cannot outlive
// a changed source revision during remote/Chrome/account verification.
test('P1.3-F2E2B: re-read all fifteen owner source revisions at end of capture',async()=>{
  const {gate,calls}=fixture();
  const result=await gate.captureForReserve(request());
  assert.equal(result.status,'candidate-idle');
  assert.equal(calls().proofCalls,2,
    'first and final independently obtained owner-source snapshots required');
});
// KAR-171 W3: independent source readers observe at different real times.
// A source refreshed AFTER the first await is not "future" evidence, but a
// modified durable source revision or a regressing observedAtMs still denies.
test('KAR-171 W3 RED: fresh independent 15-owner observations retain identical durable revisions',async()=>{
  let wall=NOW;
  const {gate,calls}=fixture({
    clock:()=>wall,
    ownerProofs:read=>{
      wall=NOW+read;
      return Object.fromEntries(Policy.requiredOwners.map(owner=>[
        owner,{observedAtMs:wall}
      ]));
    }
  });
  const result=await gate.captureForReserve(request());
  assert.equal(result.status,'candidate-idle','private fixture only; no NativeHost apply');
  assert.equal(calls().proofCalls,2,'both source observations remain mandatory');
  assert.equal(result.snapshot.observedAtMs,NOW+2);
});
test('KAR-171 W3: same-revision source clock regression denies candidate',async()=>{
  let wall=NOW;
  const {gate}=fixture({
    clock:()=>wall,
    ownerProofs:read=>{
      wall=NOW+2;
      return {renewal:{observedAtMs:read===1?NOW+1:NOW}};
    }
  });
  await denied(()=>gate.captureForReserve(request()),'owner timestamp regressed despite stable revision');
});
test('KAR-171 W3: post-read future source time remains untrusted',async()=>{
  let wall=NOW;
  const {gate}=fixture({
    clock:()=>wall,
    ownerProofs:()=>({renewal:{observedAtMs:NOW+5000}})
  });
  await denied(()=>gate.captureForReserve(request()),'future owner-proof time');
});
test('P1.3-F2E2B RED: a new source revision while reading remote state denies reserve',async()=>{
  let ownerReads=0;
  const {gate}=fixture({ownerProofs:read=>{
    ownerReads=read;
    return {renewal:{sourceRevision:read===1?'remote-proof-rev-1':'remote-proof-rev-2'}};
  }});
  await denied(()=>gate.captureForReserve(request()),'changed owner source revision');
  assert.equal(ownerReads,2);
});
test('P1.3-F2E2B RED: a source provenance change with same revision still denies',async()=>{
  const {gate}=fixture({ownerProofs:read=>({
    archiveInsertion:{sourceRevision:'same-revision',noPriorGenerationTask:read===1}
  })});
  await denied(()=>gate.captureForReserve(request()),'changed prior-generation source status');
});
test('P1.3-F2E2B RED: disappearance of an independently verified owner source denies',async()=>{
  const {gate}=fixture({ownerProofs:read=>read===2?{templateFill:null}:{}});
  await denied(()=>gate.captureForReserve(request()),'owner source disappeared');
});
test('P1.3-F2E2B RED: changed source profile after worker restart denies',async()=>{
  const {gate}=fixture({workerId:'fresh-worker',ownerProofs:read=>({
    renewal:{profileId:read===1?PROFILE:'other-profile'}
  })});
  await denied(()=>gate.captureForReserve(request()),'historical source profile changed');
});
// P1.3-F2E1: a valid historical remote outcome receipt is NOT permission to
// cross the current authenticated Kleinanzeigen inventory profile boundary.
// These PRIVATE positive fixtures still have test-controlled owner adapters;
// production must supply all 15 independent positive completion producers.
function remoteReceipts(profileId, kind) {
  if(kind==='phase4') {
    const attempt={schema:1,state:'outcome-unverified',renewalId:'renewalA',
      attemptId:'attemptA',workerInstanceId:'previous-worker',profileId,
      sourceAdId:'123',newAdId:'456',createdAtMs:NOW-900};
    return {
      karPhase4UncertainAttemptV1_renewalA_attemptA:attempt,
      karPhase4VerifiedResolutionV1_renewalA_attemptA:{
        schema:1,state:'resolved-confirmed',renewalId:'renewalA',
        attemptId:'attemptA',workerInstanceId:'previous-worker',profileId,
        sourceAdId:'123',newAdId:'456',
        sourceEvidence:'not-in-my-ads-full-pagination-scan',
        targetEvidence:'found-in-my-ads-full-pagination-scan',
        sourcePagesScanned:2,targetPagesScanned:2,targetFoundPage:1,
        verifiedAtMs:NOW-800
      }
    };
  }
  const attempt={schema:1,state:'outcome-unverified',fillId:'fillA',
    workflowId:'renewalA',attemptId:'attemptA',workerInstanceId:'previous-worker',
    kind:'renewal',profileId,sourceAdId:'123',targetTabId:10,
    createdAtMs:NOW-900};
  return {
    karAutoPublishIntentV1_fillA_attemptA:attempt,
    karAutoPublishVerifiedResolutionV1_fillA_attemptA:{
      schema:1,state:'resolved-confirmed',fillId:'fillA',workflowId:'renewalA',
      attemptId:'attemptA',kind:'renewal',profileId,sourceAdId:'123',
      targetTabId:10,newAdId:'456',targetPresent:true,
      targetEvidence:'found-in-my-ads-full-pagination-scan',
      targetPagesScanned:2,targetFoundPage:1,verifiedAtMs:NOW-800
    }
  };
}
for(const kind of ['phase4','publish']) {
  test('P1.3-F2E1: independently structured '+kind+' resolution matches current selected profile',async()=>{
    const {gate}=fixture({local:tokenBoundRemote(kind).rows});
    const answer=await gate.captureForReserve(request());
    assert.equal(answer.status,'candidate-idle',
      'only the fixture-controlled 15-owner sources can produce this candidate');
  });
  test('P1.3-F2E1 RED: historical '+kind+' resolution for a different account profile blocks capture',async()=>{
    const {gate}=fixture({local:remoteReceipts('other-profile',kind)});
    await assert.rejects(gate.captureForReserve(request()),e=>
      e?.code==='KR_OWNER_JOURNAL_PROFILE_MISMATCH');
  });
  test('P1.3-F2E1 RED: foreign '+kind+' receipt cannot be inherited by matching session after worker restart',async()=>{
    const other=remoteReceipts('prior-profile',kind);
    const {gate}=fixture({local:other,workerId:'fresh-worker'});
    await assert.rejects(gate.captureForReserve(request()),e=>
      e?.code==='KR_OWNER_JOURNAL_PROFILE_MISMATCH');
  });
}
// P1.3-F2 next: independently bind explicit remote-admission tokens to the
// immutable P8 start+finish rows. A resolved remote journal with a forged,
// reused, wrong-owner, or non-overlapping token is NOT generation closure.
function tokenBoundRemote(kind) {
  const rows=remoteReceipts(PROFILE,kind);
  const intentKey=Object.keys(rows).find(k=>k.startsWith(
    kind==='phase4'?'karPhase4UncertainAttemptV1_':'karAutoPublishIntentV1_'));
  const intent=rows[intentKey];
  const token='p8-remote-bound-token-00001';
  intent.admissionToken=token;
  rows['karAtomicAdmissionStartV1_'+token]={
    schema:1,state:'admitted',token,
    operationType:kind==='phase4'
      ?'AUTONOMOUS:renewal-auto-phase4':'AUTONOMOUS:renewal-publish-detection',
    workerInstanceId:intent.workerInstanceId,startedAtMs:NOW-1200
  };
  rows['karAtomicAdmissionFinishV1_'+token]={
    schema:1,state:'completed',token,
    workerInstanceId:intent.workerInstanceId,completedAtMs:NOW-850
  };
  return {rows,intentKey,token};
}
for (const kind of ['phase4','publish']) {
  test('P1.3-F2 token-bound '+kind+' remote history matches real P8 start+finish structure (fixture only)',async()=>{
    const {rows}=tokenBoundRemote(kind);
    const {gate}=fixture({local:rows});
    const proof=await gate.captureForReserve(request());
    assert.equal(proof.status,'candidate-idle',
      'PRIVATE fully mocked owner-source fixture only, not production update permission');
  });
  for(const [label,mutate] of [
    ['missing P8 start and finish',({rows,token})=>{
      delete rows['karAtomicAdmissionStartV1_'+token];
      delete rows['karAtomicAdmissionFinishV1_'+token];
    }],
    ['token points to another completed P8 admission',({rows,intentKey})=>{
      rows[intentKey].admissionToken='different-p8-remote-token';
    }],
    ['admitted P8 operation belongs to unrelated remote flow',({rows,token})=>{
      rows['karAtomicAdmissionStartV1_'+token].operationType='CAPTURE_SINGLE_INVENTORY';
    }],
    ['admitted P8 generation is different from remote intent',({rows,token})=>{
      rows['karAtomicAdmissionStartV1_'+token].workerInstanceId='unrelated-worker';
      rows['karAtomicAdmissionFinishV1_'+token].workerInstanceId='unrelated-worker';
    }],
    ['P8 admission starts after remote intent',({rows,token})=>{
      rows['karAtomicAdmissionStartV1_'+token].startedAtMs=NOW-875;
    }],
    ['P8 callback finishes before remote intent was written',({rows,token})=>{
      rows['karAtomicAdmissionFinishV1_'+token].completedAtMs=NOW-950;
    }],
    ['invalid token in otherwise resolved remote journal',({rows,intentKey})=>{
      rows[intentKey].admissionToken='../forged-token';
    }]
  ]) {
    test('P1.3-F2 RED: '+kind+' '+label+' must reject private owner capture',async()=>{
      const caseData=tokenBoundRemote(kind);
      mutate(caseData);
      const {gate}=fixture({local:caseData.rows});
      await assert.rejects(gate.captureForReserve(request()),
        e=>e?.code==='KR_OWNER_JOURNAL_ADMISSION_UNVERIFIED');
    });
  }
}
test('P1.3-F2 RED: one P8 token cannot authorize two remote journal families',async()=>{
  const p=tokenBoundRemote('phase4');
  const other=remoteReceipts(PROFILE,'publish');
  const intent=other.karAutoPublishIntentV1_fillA_attemptA;
  intent.admissionToken=p.token;
  const {gate}=fixture({local:{...p.rows,...other}});
  await assert.rejects(gate.captureForReserve(request()),
    e=>e?.code==='KR_OWNER_JOURNAL_ADMISSION_UNVERIFIED');
});

// P1.3-F2 legacy data is not transaction provenance: a terminal remote
// scan without an origin/worker-bound P8 token remains historical only.
for (const kind of ['phase4','publish']) {
  test('P1.3-F2 LEGACY RED: resolved tokenless '+kind+
    ' cannot produce a private update candidate',async()=>{
    const {gate}=fixture({local:remoteReceipts(PROFILE,kind)});
    await assert.rejects(gate.captureForReserve(request()),
      e=>e?.code==='KR_OWNER_JOURNAL_ADMISSION_UNVERIFIED');
  });
  test('P1.3-F2 LEGACY RED: unrelated finished P8 receipt cannot retroactively '+kind+
    ' bind a tokenless historical result',async()=>{
    const {rows,token}=tokenBoundRemote(kind);
    const intentKey=Object.keys(rows).find(key=>key.startsWith(
      kind==='phase4'?'karPhase4UncertainAttemptV1_':'karAutoPublishIntentV1_'));
    delete rows[intentKey].admissionToken;
    assert.ok(rows['karAtomicAdmissionStartV1_'+token]&&rows['karAtomicAdmissionFinishV1_'+token]);
    const {gate}=fixture({local:rows});
    await assert.rejects(gate.captureForReserve(request()),
      e=>e?.code==='KR_OWNER_JOURNAL_ADMISSION_UNVERIFIED');
  });
  test('P1.3-F2 LEGACY RED: one tokenless '+kind+
    ' remote result blocks otherwise correctly token-bound other family',async()=>{
    const otherKind=kind==='phase4'?'publish':'phase4';
    const {gate}=fixture({local:{...tokenBoundRemote(otherKind).rows,
      ...remoteReceipts(PROFILE,kind)}});
    await assert.rejects(gate.captureForReserve(request()),
      e=>e?.code==='KR_OWNER_JOURNAL_ADMISSION_UNVERIFIED');
  });
}
const negativeCases = [
  ['wrong selected profile', {local: {selectedInventoryProfileV1: {profileId: 'other'}}}],
  ['missing selected profile', {local: {selectedInventoryProfileV1: null}}],
  ['changed live account during double-read', {live: [
    liveSiteObservation(PROFILE),
    liveSiteObservation('other')
  ]}],
  ['logged-out current account', {live: [liveSiteObservation(PROFILE, WORKER, NOW, false)]}],
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
    liveSiteObservation(PROFILE),
    liveSiteObservation(PROFILE),
    liveSiteObservation('other')
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


// P1.3-F1: real managed-tab ownership readback source, not an IDLE
// attestation. This must fail before the strict Chrome/session reader exists.
function actualTabSource({registry,legacy = {},tabs = [],mutateAfterRead,
                          browserFailure = false,sessionFailure = false} = {}) {
  const local = storage({});
  let sessionReads = 0, browserReads = 0, writes = 0;
  const session = storage({
    ...(registry === undefined ? {} : {tabRegistryV1: registry}),
    managedWorkerTabsV1: legacy
  }, {
    afterRead: async () => {
      sessionReads++;
      if (typeof mutateAfterRead === 'function') mutateAfterRead(session.rows, sessionReads);
    }
  });
  if (sessionFailure) session.get = async () => { throw Error('SESSION_UNREADABLE'); };
  session.set = async () => { writes++; throw Error('READ_ONLY_REQUIRED'); };
  const browser = async () => {
    browserReads++;
    if (browserFailure) throw Error('CHROME_TABS_UNAVAILABLE');
    return clone(typeof tabs === 'function' ? tabs(browserReads) : tabs);
  };
  const owner = Additional.create({
    storageLocal: local, storageSession: session, workerInstanceId: WORKER,
    clock: () => NOW, queryBrowserTabsReadOnly: browser
  });
  return {owner, local, session, browser, stats: () => ({sessionReads,browserReads,writes})};
}
function userTab(id, url = 'https://www.kleinanzeigen.de/m-meine-anzeigen.html') {
  return {id,url};
}
function userEntry(id) {
  return {tabId:id,managed:false,role:'source',lifecycleState:'active'};
}
async function tabSourceDenied(config, reason) {
  const {owner} = actualTabSource(config);
  await assert.rejects(
    () => owner.readVerifiedUnmanagedTabsReadOnly(),
    error => error?.code === 'KR_OWNER_TABS_UNVERIFIED', reason);
}

test('P1.3-F1 RED: strict live Chrome+session positive unmanaged-tab provenance', async () => {
  const src=actualTabSource({
    registry:{'77':userEntry(77),'18':{
      tabId:18,managed:true,role:'worker',lifecycleState:'gone',
      closedAt:'2026-11-10T00:00:00.000Z'
    }},
    tabs:[userTab(77)]
  });
  const rows=await src.owner.readVerifiedUnmanagedTabsReadOnly();
  assert.equal(rows.length,1);
  assert.equal(rows[0].id,77);
  assert.equal(rows[0].managed,false);
  assert.equal(rows[0].ownershipVerified,true);
  assert.equal(typeof rows[0].sourceRevision,'string');
  assert.ok(rows[0].sourceRevision.length > 0);
  assert.equal(src.stats().sessionReads,2);
  assert.equal(src.stats().browserReads,2);
  assert.equal(src.stats().writes,0,'read-only proof never migrates tab registry');
});
test('P1.3-F1 RED: a tab with no registry owner remains unverifiable', async () => {
  await tabSourceDenied({registry:{},tabs:[userTab(77)]},'untracked user-looking tab');
});
test('P1.3-F1 RED: a live managed worker blocks verified unmanaged classification', async () => {
  await tabSourceDenied({registry:{'77':{
    tabId:77,managed:true,role:'worker',lifecycleState:'active'
  }},tabs:[userTab(77)]},'managed tab present');
});
test('P1.3-F1 RED: gone managed tombstone contradicted by live Chrome tab fails closed', async () => {
  await tabSourceDenied({registry:{'77':{
    tabId:77,managed:true,role:'worker',lifecycleState:'gone',
    closedAt:'2026-11-10T00:00:00.000Z'
  }},tabs:[userTab(77)]},'tombstone contradicted');
});
test('P1.3-F1 RED: missing or malformed registry never yields positive tab provenance', async () => {
  await tabSourceDenied({tabs:[]},'absent full registry');
  await tabSourceDenied({registry:{'77':{tabId:77,managed:'false',role:'user',
    lifecycleState:'active'}},tabs:[userTab(77)]},'string ownership flag');
});
test('P1.3-F1 RED: live legacy managed-tab entry remains unsafe', async () => {
  await tabSourceDenied({registry:{},legacy:{'91':{kind:'worker'}},tabs:[]},
    'unclosed legacy worker');
});
test('P1.3-F1 RED: registry changed during Chrome enumeration remains unsafe', async () => {
  await tabSourceDenied({registry:{'77':userEntry(77)},tabs:[userTab(77)],
    mutateAfterRead:(rows,reads)=>{
      if(reads===1)rows.tabRegistryV1['77'].managed=true;
    }},'torn session registry');
});
test('P1.3-F1 RED: browser tab set changed between readbacks remains unsafe', async () => {
  await tabSourceDenied({registry:{'77':userEntry(77)},tabs:read=>
    read===1?[userTab(77)]:[userTab(77),userTab(78)]},'torn browser');
});
test('P1.3-F1 RED: unavailable session or Chrome API remains unsafe', async () => {
  await tabSourceDenied({registry:{},tabs:[],browserFailure:true},'no browser evidence');
  await tabSourceDenied({registry:{},tabs:[],sessionFailure:true},'no session evidence');
});

// P1.3-F2A: verified tab ownership must remain stable for the entire
// origin-locked candidate capture, not only during its first browser read.
test('P1.3-F2A RED: final browser source readback must occur', async () => {
  const {gate,calls} = fixture({tabs:[{id:71,managed:false,
    ownershipVerified:true,sourceRevision:'chrome-tabs-session-registry-two-read-v1'}]});
  assert.equal((await gate.captureForReserve(request())).status,'candidate-idle');
  assert.equal(calls().tabCalls,2,'initial and final independent ownership checks');
});
test('P1.3-F2A RED: a newly opened tab between owner proofs and final capture blocks', async () => {
  const good={id:71,managed:false,ownershipVerified:true,
    sourceRevision:'chrome-tabs-session-registry-two-read-v1'};
  const {gate}=fixture({tabs:call=>call===1?[good]:[good,{...good,id:72}]});
  await denied(()=>gate.captureForReserve(request()),'browser changed before snapshot');
});
test('P1.3-F2A RED: duplicate supposedly verified Chrome tab IDs never prove ownership', async () => {
  const good={id:71,managed:false,ownershipVerified:true,
    sourceRevision:'chrome-tabs-session-registry-two-read-v1'};
  const {gate}=fixture({tabs:[good,{...good}]});
  await denied(()=>gate.captureForReserve(request()),'duplicate Chrome tab ID');
});

// P1.3-F4: a claimed full-pagination verification cannot locate a result on
// a page it never scanned. The immutable receipt must remain fail-closed.
for (const kind of ['phase4', 'publish']) {
  test('P1.3-F4 RED: '+kind+' rejects target found beyond scanned pages', async () => {
    const {rows} = tokenBoundRemote(kind);
    const key = Object.keys(rows).find(name => name.startsWith(kind === 'phase4'
      ? 'karPhase4VerifiedResolutionV1_' : 'karAutoPublishVerifiedResolutionV1_'));
    assert.ok(key && rows[key], 'concrete immutable verified remote journal required');
    // Positive control: all other owner and Web Lock evidence is genuinely
    // sufficient to produce a test-only candidate before corrupting this row.
    const {gate:validGate} = fixture({local:rows});
    assert.equal((await validGate.captureForReserve(request())).status,
      'candidate-idle', 'unchanged P8-bound remote evidence must be accepted');
    rows[key].targetPagesScanned = 1;
    rows[key].targetFoundPage = 2;
    const {gate} = fixture({local:rows});
    // The private journal rejects the impossible page interval; the outer
    // atomic exclusive lock deliberately translates most nested errors into
    // its own fail-closed typed boundary. Never require an internal code to
    // escape through this boundary, and never treat the denial as IDLE.
    await assert.rejects(gate.captureForReserve(request()),
      error => error?.code === 'KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE',
      'contradictory remote page evidence must stop owner reserve capture');
  });
}
