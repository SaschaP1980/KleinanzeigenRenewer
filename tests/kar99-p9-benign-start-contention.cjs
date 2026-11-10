// KAR-99 P9: a short-lived internal Web Lock collision must not break an
// otherwise legitimate background route such as RECOGNIZE_PROFILE.
// This is an isolated two-worker fixture, not a live Kleinanzeigen call.
'use strict';
const assert=require('node:assert/strict');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
const rows=Object.create(null);
let blocked=false,releaseFirst,first=true,starts=0,completed=0;
const disk={
 async get(keys){
   const ids=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
   return Object.fromEntries(ids.filter(k=>Object.hasOwn(rows,k)).map(k=>[k,structuredClone(rows[k])]));
 },
 async set(patch){
   const key=Object.keys(patch)[0];
   if(first && key.startsWith(Atomic.START_PREFIX)){
     first=false;blocked=true;
     await new Promise(resolve=>{releaseFirst=resolve;});
   }
   Object.assign(rows,structuredClone(patch));
 }
};
const held=new Set();
const browserLocks={
 async request(name,options,callback){
   assert.equal(name,Atomic.LOCK_NAME);
   assert.deepEqual(options,{mode:'exclusive',ifAvailable:true});
   if(held.has(name))return callback(null);
   held.add(name);
   try{return await callback({name,mode:'exclusive'});}
   finally{held.delete(name);}
 }
};
let serial=0;
function worker(instance){
 return Atomic.create({storageLocal:disk,lockManager:browserLocks,
  workerInstanceId:instance,clock:()=>123456,
  newToken:()=> 'stable_nonce_'+(++serial)+'_unique'});
}
async function entered(){for(let i=0;i<300&&!blocked;i++)await Promise.resolve();assert.ok(blocked,'first worker never entered journal write');}
(async()=>{
 const firstWorker=worker('worker-one'),secondWorker=worker('worker-two');
 const one=firstWorker.withAdmission('RECOGNIZE_PROFILE',async()=>{starts++;return 'alpha';});
 await entered();
 const two=secondWorker.withAdmission('RECOGNIZE_PROFILE',async()=>{starts++;return 'beta';});
 // The journal's disk write takes 50 ms, typical of a transient real MV3
 // startup/storage overlap. The competing route should wait for a bounded
 // retry rather than surfacing KR_UPDATE_FENCE_ATOMIC_BUSY to the app.
 setTimeout(()=>releaseFirst(),50);
 const result=await Promise.all([one,two]);
 assert.deepEqual(result,['alpha','beta']);
 assert.equal(starts,2,'both legitimate routes execute exactly once');
 assert.equal(Object.keys(rows).filter(k=>k.startsWith(Atomic.START_PREFIX)).length,2,
   'every distinct admission is recorded durably before its task starts');
 completed=Object.keys(rows).filter(k=>k.startsWith(Atomic.FINISH_PREFIX)).length;
 assert.equal(completed,2,'both legitimate routes complete with durable receipts');
 console.log('PASS KAR99 P9 benign routed start/start lock contention recovers without duplicate or unsafe bypass');
})().catch(e=>{console.error(e);process.exitCode=1});
