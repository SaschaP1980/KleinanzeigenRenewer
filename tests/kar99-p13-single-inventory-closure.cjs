// KAR-99 P1.3 singleInventory: real durable P8 callback history, never IDLE.
// Remote listing, tab lifetime and database commit remain independently unverified.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Additional=require('../src/background/services/additional-owner-observer.js');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
function db(){
 const rows={};let reads=0,writes=0,after=null,broken=false;
 return {rows,get writes(){return writes},afterRead(fn){after=fn},failReads(v){broken=v},
  async get(keys){
   if(broken)throw Error('storage unavailable');
   const selected=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
   const out=Object.fromEntries(selected.filter(k=>Object.hasOwn(rows,k))
    .map(k=>[k,structuredClone(rows[k])]));
   if(keys===null){reads++;after?.(reads,rows)}return out;
  },async set(value){writes++;Object.assign(rows,structuredClone(value))}};
}
function observer(storageLocal){return Additional.create({
 storageLocal,storageSession:{async get(){return {}}},clock:()=>5000,workerInstanceId:'this-worker'
})}
function receipt(storage,token,operationType='SAVE_INVENTORY',finish=1200){
 storage.rows[Atomic.START_PREFIX+token]={schema:1,state:'admitted',token,
  operationType,workerInstanceId:'earlier-worker',startedAtMs:1000};
 if(finish!==null)storage.rows[Atomic.FINISH_PREFIX+token]={schema:1,state:'completed',
  token,workerInstanceId:'earlier-worker',completedAtMs:finish};
}
test('prior-worker SAVE_INVENTORY completion is historical callback-settled, never IDLE',async()=>{
 const d=db();receipt(d,'single_save_001');const o=observer(d);
 const v=await o.inspectSingleInventoryClosureReadOnly();
 assert.equal(v.owner,'singleInventory');assert.equal(v.status,'callback-settled');
 assert.equal(v.completedReceiptCount,1);assert.equal(v.eligibleForLease,false);
 assert.equal(v.localCommitVerified,false);assert.equal(v.remoteListingVerified,false);
 assert.equal(v.priorGenerationClosed,false);assert.equal(v.detachedTabWorkVerified,false);
 assert.equal(d.writes,0);assert.ok(Object.isFrozen(v));
 assert.equal((await o.observe()).observations.singleInventory.state,'unknown');
});
test('all four explicit inventory routes yield only callback-settled evidence',async()=>{
 const d=db();for(const [i,type] of ['SAVE_INVENTORY','CAPTURE_SINGLE_INVENTORY',
 'REFRESH_INVENTORY','CHECK_INVENTORY_ONLINE_STATUS'].entries())
 receipt(d,'single_allowed_'+i,type);
 const v=await observer(d).inspectSingleInventoryClosureReadOnly();
 assert.equal(v.status,'callback-settled');assert.equal(v.completedReceiptCount,4);
 assert.equal(v.eligibleForLease,false);
});
test('empty journal cannot certify completion',async()=>{
 const v=await observer(db()).inspectSingleInventoryClosureReadOnly();
 assert.equal(v.status,'unverified');assert.equal(v.eligibleForLease,false);
});
test('unfinished original worker remains unverified on restart',async()=>{
 const d=db();receipt(d,'single_unfinished','SAVE_INVENTORY',null);
 const v=await observer(d).inspectSingleInventoryClosureReadOnly();
 assert.equal(v.status,'unverified');assert.equal(v.reason,'DURABLE_ADMISSION_UNFINISHED');
});
test('multi-owner ASSIGN_UNPROFILED_INVENTORIES cannot become single-owner attestation',async()=>{
 const d=db();receipt(d,'single_profile_assign','ASSIGN_UNPROFILED_INVENTORIES');
 const v=await observer(d).inspectSingleInventoryClosureReadOnly();
 assert.equal(v.status,'unverified');assert.equal(v.reason,'OWNER_PROVENANCE_UNVERIFIED');
});
test('unknown routed operation remains unverified despite P8 finish',async()=>{
 const d=db();receipt(d,'unknown_routed','UNKNOWN_INVENTORY_HANDLER');
 assert.equal((await observer(d).inspectSingleInventoryClosureReadOnly()).status,'unverified');
});
test('generic unknown mixed with exact source cannot be cleared',async()=>{
 const d=db();receipt(d,'single_exact');receipt(d,'single_unknown','UNREGISTERED_MESSAGE');
 assert.equal((await observer(d).inspectSingleInventoryClosureReadOnly()).status,'unverified');
});
test('active in-worker singleInventory work supersedes older completed receipt',async()=>{
 const d=db();receipt(d,'single_prior');const o=observer(d);
 let finish;const pending=new Promise(resolve=>{finish=resolve});
 const task=o.track('singleInventory',()=>pending);
 const v=await o.inspectSingleInventoryClosureReadOnly();
 assert.equal(v.status,'unverified');assert.equal(v.reason,'ACTUAL_IN_FLIGHT_OPERATION');
 finish();await task;assert.equal((await o.inspectSingleInventoryClosureReadOnly()).status,'callback-settled');
});
test('durable finish mutation during the two observations fails closed',async()=>{
 const d=db();receipt(d,'single_changed');
 d.afterRead((n,rows)=>{if(n===2)rows[Atomic.FINISH_PREFIX+'single_changed'].completedAtMs=1350});
 const v=await observer(d).inspectSingleInventoryClosureReadOnly();
 assert.equal(v.status,'unverified');assert.equal(v.eligibleForLease,false);
});
test('orphan P8 finish never establishes callback completion',async()=>{
 const d=db();d.rows[Atomic.FINISH_PREFIX+'single_orphan']={schema:1,state:'completed',
  token:'single_orphan',workerInstanceId:'earlier-worker',completedAtMs:1200};
 assert.equal((await observer(d).inspectSingleInventoryClosureReadOnly()).status,'unverified');
});
test('storage read failure must remain unverified',async()=>{
 const d=db();d.failReads(true);
 const v=await observer(d).inspectSingleInventoryClosureReadOnly();
 assert.equal(v.status,'unverified');assert.equal(v.eligibleForLease,false);
});
test('remote-success-looking routed callback is never recognized as local single inventory',async()=>{
 const d=db();receipt(d,'single_remote_delete','FINISH_RENEWAL_REPLACEMENT');
 const v=await observer(d).inspectSingleInventoryClosureReadOnly();
 assert.equal(v.status,'unverified');assert.equal(v.eligibleForLease,false);
});
