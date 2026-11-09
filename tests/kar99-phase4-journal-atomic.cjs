// KAR-99 P6/P8 test-first: immutable Phase-4 writes must use SAME origin-wide
// Web Lock as atomic workflow start/reserve. Two workers cannot both admit
// a DELETE attempt for the same renewal via chrome.storage read/check/write.
'use strict';
const assert=require('node:assert/strict');
const Journal=require('../src/background/services/phase4-uncertainty-journal.js');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
const bg=require('node:fs').readFileSync('src/background/background.js','utf8');
let count=0;
const ok=(v,why)=>{assert.ok(v,why);count++;console.log('PASS KAR99-P6-ATOMIC '+why)};
function locks() {
 const held=new Set();
 return {
  held,
  async request(name,opts,callback){
   assert.equal(name,Atomic.LOCK_NAME,'single shared KAR-99 origin-wide lock name');
   assert.equal(opts.mode,'exclusive');
   assert.equal(opts.ifAvailable,true);
   if(held.has(name))return callback(null);
   held.add(name);
   try{return await callback({name,mode:'exclusive'})}finally{held.delete(name)}
  }
 };
}
function disk() {
 const map=Object.create(null);let writes=0;
 return {
  map, get writes(){return writes},
  async get(keys){
   const kk=keys===null?Object.keys(map):Array.isArray(keys)?keys:[keys];
   return Object.fromEntries(kk.filter(x=>Object.hasOwn(map,x)).map(x=>[x,structuredClone(map[x])]));
  },
  async set(record){writes++;Object.assign(map,structuredClone(record))}
 };
}
const req={renewalId:'renewal-0001',profileId:'Same Real Profile',
 sourceAdId:'123123',newAdId:'456456'};
const proof=x=>({profileId:x.profileId,sourceAdId:x.sourceAdId,newAdId:x.newAdId,
 sourceAbsent:true,targetPresent:true,
 sourceEvidence:'not-in-my-ads-full-pagination-scan',
 targetEvidence:'found-in-my-ads-full-pagination-scan',
 sourcePagesScanned:3,targetPagesScanned:2,targetFoundPage:2});
let sequence=0;
function worker(store,manager,workerInstanceId) {
 return Journal.create({
   storageLocal:store,lockManager:manager,lockName:Atomic.LOCK_NAME,
   clock:()=>10000+sequence++,newToken:()=> 'attempt-'+(++sequence)+'-unique',
   workerInstanceId,verifyRemoteOutcome:proof
 });
}
const deny=async(p,code,label)=>{
 await assert.rejects(p,e=>e?.code===code,label);
 ok(true,label);
};
async function acquire(manager) {
 let release;const pending=new Promise(r=>release=r);
 let ready=false;
 const holding=manager.request(Atomic.LOCK_NAME,{mode:'exclusive',ifAvailable:true},async lock=>{
  assert.ok(lock);ready=true;await pending;
 });
 while(!ready)await Promise.resolve();
 return async()=>{release();await holding};
}
(async()=>{
 const store=disk(),manager=locks(),first=worker(store,manager,'worker-one'),second=worker(store,manager,'worker-two');
 const before=store.writes;
 const release=await acquire(manager);
 await deny(first.begin(req),'KR_PHASE4_JOURNAL_ATOMIC_BUSY',
   'real origin lock held by another worker prevents a remote DELETE intent');
 ok(store.writes===before,'busy critical section cannot persist an apparently admitted remote attempt');
 await release();
 const intent=await first.begin(req);
 ok(intent.state==='outcome-unverified','first worker writes and acknowledges exactly one durable intent');
 await deny(second.begin(req),'KR_PHASE4_JOURNAL_UNRESOLVED',
    'second worker cannot admit concurrent duplicate DELETE after first lock release');
 const release2=await acquire(manager);
 const beforeResolve=store.writes;
 await deny(second.resolveVerified({renewalId:req.renewalId,attemptId:intent.attemptId}),
   'KR_PHASE4_JOURNAL_ATOMIC_BUSY',
   'independent verification cannot commit outcome while shared Web Lock held');
 ok(store.writes===beforeResolve,'busy resolution leaves immutable journal unchanged');
 await release2();
 const verified=await second.resolveVerified({renewalId:req.renewalId,attemptId:intent.attemptId});
 ok(verified.state==='resolved-confirmed'&&verified.sourceAdId===req.sourceAdId,
    'separate worker commits independently verified exact-attempt outcome under lock');
 const rebooted=worker(store,manager,'worker-after-restart');
 const observed=await rebooted.observe(req.renewalId);
 ok(observed.attempts.length===1&&observed.resolutions.length===1,
    'actual immutable remote intent and outcome survive worker reentry');
 const without=Journal.create({
  storageLocal:disk(),clock:()=>10000,newToken:()=> 'attempt-fail-1',
  workerInstanceId:'worker-unprotected',verifyRemoteOutcome:proof
 });
 await deny(without.begin(req),'KR_PHASE4_JOURNAL_ATOMIC_UNAVAILABLE',
  'missing actual lock manager cannot silently fall back to unsafe local CAS');
 ok(bg.includes('lockName: AtomicMV3Admission.LOCK_NAME')
   &&bg.includes('lockManager: globalThis.navigator?.locks'),
   'production Phase-4 journal uses same Web Lock name and actual navigator.locks as workflow fence');
 console.log('PASS KAR99 P6 cross-worker journal '+count+' assertions');
})().catch(e=>{console.error(e);process.exitCode=1});
