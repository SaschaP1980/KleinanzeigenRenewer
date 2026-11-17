// KAR-199: lock contention after verified target and account is not
// evidence of a remote DELETE. Synthetic no-account P8-shared Web Locks tests.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Journal=require('../src/background/services/phase4-uncertainty-journal.js');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
const req={renewalId:'fixture-199',profileId:'fixture-account',sourceAdId:'111111',newAdId:'222222'};
function db(corrupt=false){
  const map=Object.create(null);let writes=0;
  return {map,get writes(){return writes;},
    async get(keys){if(corrupt)throw Error('read unavailable');
      const names=keys===null?Object.keys(map):Array.isArray(keys)?keys:[keys];
      return Object.fromEntries(names.filter(k=>Object.hasOwn(map,k)).map(k=>[k,structuredClone(map[k])]));},
    async set(fields){writes++;Object.assign(map,structuredClone(fields));}
  };
}
function locks(busyCount=0){
  let calls=0;
  return {get calls(){return calls;},async request(name,opts,callback){
    assert.equal(name,Atomic.LOCK_NAME);
    assert.deepEqual(opts,{mode:'exclusive',ifAvailable:true});
    calls++;
    if(calls<=busyCount)return callback(null);
    return callback({name,mode:'exclusive'});
  }};
}
function fixture({busyCount=0,corrupt=false,lockManager=locks(busyCount)}={}){
  const store=db(corrupt),samples=[];let n=0;
  const journal=Journal.create({
    storageLocal:store,lockManager,lockName:Atomic.LOCK_NAME,
    workerInstanceId:'worker-199',clock:()=>1700000000000,
    newToken:()=> 'unique-attempt-'+(++n),
    verifyRemoteOutcome:x=>({profileId:x.profileId,sourceAdId:x.sourceAdId,newAdId:x.newAdId,
      sourceAbsent:true,targetPresent:true,
      sourceEvidence:'not-in-my-ads-full-pagination-scan',
      targetEvidence:'found-in-my-ads-full-pagination-scan',
      sourcePagesScanned:1,targetPagesScanned:1,targetFoundPage:1}),
    onSample:s=>samples.push(s)
  });
  return {journal,store,samples,lockManager};
}
test('three transient BUSY lock attempts retry before a single durable journal entry',async()=>{
  const f=fixture({busyCount:3});
  const entry=await f.journal.begin(req);
  assert.equal(entry.state,'outcome-unverified');
  assert.equal(f.store.writes,1);
  assert.equal(f.lockManager.calls,4);
  assert.equal((await f.journal.observe(req.renewalId)).attempts.length,1);
  assert.equal(f.samples.length,1);
  assert.deepEqual({phase:f.samples[0].phase,busyAttempts:f.samples[0].busyAttempts,outcome:f.samples[0].outcome},
    {phase:'begin',busyAttempts:3,outcome:'ok'});
  assert.equal('sourceAdId' in f.samples[0],false);
});
test('persistent BUSY remains fail-closed: no journal write or remote authorization',async()=>{
  const f=fixture({busyCount:100});
  await assert.rejects(f.journal.begin(req),e=>e?.code==='KR_PHASE4_JOURNAL_ATOMIC_BUSY');
  assert.equal(f.store.writes,0);
  assert.equal(f.lockManager.calls,16);
  assert.equal(f.samples[0].busyAttempts,16);
  assert.equal(f.samples[0].outcome,'denied');
});
test('real storage failure after a lock acquisition cannot be retried',async()=>{
  const f=fixture({corrupt:true});
  await assert.rejects(f.journal.begin(req),e=>e?.code==='KR_PHASE4_JOURNAL_STORAGE');
  assert.equal(f.lockManager.calls,1);
  assert.equal(f.store.writes,0);
});
test('repeating an already acknowledged intent can never admit another DELETE',async()=>{
  const f=fixture({busyCount:2});
  await f.journal.begin(req);
  await assert.rejects(f.journal.begin(req),e=>e?.code==='KR_PHASE4_JOURNAL_UNRESOLVED');
  assert.equal(f.store.writes,1);
  assert.equal(f.lockManager.calls,4);
});
test('a transient lock collision on independent outcome resolution is safely retried',async()=>{
  const l=locks(),f=fixture({lockManager:l});
  const receipt=await f.journal.begin(req);
  const original=l.request.bind(l);let remaining=2;
  l.request=async(name,opts,callback)=>{
    if(remaining-->0)return callback(null);
    return original(name,opts,callback);
  };
  const resolution=await f.journal.resolveVerified({renewalId:req.renewalId,attemptId:receipt.attemptId});
  assert.equal(resolution.state,'resolved-confirmed');
  assert.equal(f.store.writes,2);
});
test('a broken Web Lock implementation cannot admit an intent',async()=>{
  const f=fixture({lockManager:{async request(){return undefined;}}});
  await assert.rejects(f.journal.begin(req),e=>e?.code==='KR_PHASE4_JOURNAL_ATOMIC_UNAVAILABLE');
  assert.equal(f.store.writes,0);
});
