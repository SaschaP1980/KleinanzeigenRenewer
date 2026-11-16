// KAR-197: publish-intent Web Lock safety at the exact before-click boundary.
// Account-free deterministic fixture: no Kleinanzeigen connection or remote click.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Journal = require('../src/background/services/auto-publish-intent-journal.js');

const LOCK = 'kar-updater-global-admission-v1';
const PREFIX = Journal.KEY_PREFIX;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function fixture() {
  const rows = Object.create(null);
  let busy = false;
  let writes = 0;
  let sequence = 0;
  let lockRequests = 0;
  let denyReads = false;
  const storageLocal = {
    async get(keys) {
      if (denyReads) throw Error('fixture storage read unavailable');
      const names = keys === null ? Object.keys(rows) : Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(names.filter(k => Object.hasOwn(rows, k))
        .map(k => [k, structuredClone(rows[k])]));
    },
    async set(patch) { writes++; Object.assign(rows, structuredClone(patch)); }
  };
  const lockManager = {async request(name, options, fn) {
    assert.equal(name, LOCK);
    assert.deepEqual(options, {mode:'exclusive', ifAvailable:true});
    lockRequests++;
    if (busy) return fn(null);
    busy = true;
    try { return await fn({name, mode:'exclusive'}); }
    finally { busy = false; }
  }};
  const workerInstanceId = 'synthetic_worker_197';
  const reference = Object.freeze({schema:1, state:'admitted',
    token:'synthetic_p8_token_197_long', operationType:'AUTHORIZE_AUTOMATIC_PUBLISH',
    workerInstanceId, startedAtMs:1000});
  rows['karAtomicAdmissionStartV1_' + reference.token] = reference;
  const journal = Journal.create({storageLocal, lockManager, lockName:LOCK,
    workerInstanceId, clock:()=>2000, newToken:()=> 'attempt197' + (++sequence)});
  const begin = (fillId='fill197') => journal.begin({fillId,workflowId:'archive197',kind:'archive',
    profileId:'synthetic-profile',sourceAdId:'',targetTabId:42,admissionReceipt:reference});
  return {rows, journal, begin, reference, get writes() {return writes;},
    get lockRequests() {return lockRequests;}, hold() {busy=true;},
    release() {busy=false;}, denyReads() {denyReads=true;}};
}

test('KAR-197 transient P8 Web Lock occupant yields exactly one durable before-click intent', async () => {
  const f=fixture();
  f.hold();
  const outcome=f.begin().then(value=>({value}),error=>({error}));
  await sleep(70); // another owner finishes an earlier P8 start/finish.
  f.release();
  const settled=await outcome;
  assert.equal(settled.error,undefined,
    'transient lock overlap must not fail a verified authorization immediately');
  assert.equal(settled.value?.state,'outcome-unverified');
  assert.equal(f.lockRequests>1,true,'the independent journal participant must wait in bounded fashion');
  const observed=await f.journal.observe('fill197');
  assert.equal(observed.attempts.length,1);
  assert.equal(observed.state,'unverified');
  assert.equal(f.writes,1,'one durable pre-click receipt, no duplicate');
  await assert.rejects(f.begin(),e=>e?.code==='KR_PUBLISH_INTENT_UNRESOLVED',
    'replay after an intent receipt must remain blocked even when Web Lock is now free');
  assert.equal(f.writes,1);
});

test('KAR-197 persistent contention fails closed without recording a phantom permit', async () => {
  const f=fixture(); f.hold();
  await assert.rejects(f.begin(),e=>e?.code==='KR_PUBLISH_INTENT_ATOMIC_BUSY');
  assert.equal(f.writes,0);
  f.release();
  assert.equal((await f.journal.observe('fill197')).state,'missing');
});

test('KAR-197 a previous intent always wins over a later lock retry', async () => {
  const f=fixture();
  await f.begin();
  const prior=await f.journal.observe('fill197');
  f.hold();
  const outcome=f.begin().then(value=>({value}),error=>({error}));
  await sleep(45); f.release();
  const settled=await outcome;
  assert.equal(settled.error?.code,'KR_PUBLISH_INTENT_UNRESOLVED');
  assert.equal((await f.journal.observe('fill197')).attempts.length,1);
  assert.deepEqual((await f.journal.observe('fill197')).attempts,prior.attempts);
  assert.equal(f.writes,1,'neither a second intent nor a second click can be authorized');
});

test('KAR-197 corrupt or unavailable journal readback is never retried as a fresh permit', async () => {
  const f=fixture();
  f.denyReads();
  await assert.rejects(f.begin(),e=>e?.code==='KR_PUBLISH_INTENT_STORAGE');
  assert.equal(f.writes,0);
});
