// KAR-99 P1.3 trashMutation: real P8 receipts are only local callback settlement,
// not successful IndexedDB commit, prior-generation clearance, or updater IDLE.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Additional=require('../src/background/services/additional-owner-observer.js');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
function disk() {
 const rows={};let reads=0,writes=0,mutation=null,fail=false;
 return {rows,get writes(){return writes;},failReads(v){fail=v;},afterRead(fn){mutation=fn;},
  async get(keys){
   if(fail)throw Error('storage unavailable');
   const names=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
   const out=Object.fromEntries(names.filter(k=>Object.hasOwn(rows,k)).map(k=>[k,structuredClone(rows[k])]));
   if(keys===null){reads++;mutation?.(reads,rows);}
   return out;
  },async set(v){writes++;Object.assign(rows,structuredClone(v));}};
}
function observer(db){return Additional.create({storageLocal:db,
 storageSession:{async get(){return {}}},workerInstanceId:'current-worker',clock:()=>5000});}
function receipt(db,token,type='DELETE_TRASH_ENTRY',finish=1200){
 db.rows[Atomic.START_PREFIX+token]={schema:1,state:'admitted',token,operationType:type,
  workerInstanceId:'old-worker',startedAtMs:1000};
 if(finish!==null)db.rows[Atomic.FINISH_PREFIX+token]={
  schema:1,state:'completed',token,workerInstanceId:'old-worker',completedAtMs:finish};
}
test('old-worker routed trash action reports callback settlement but never IDLE',async()=>{
 const db=disk();receipt(db,'trash_routed_001');const o=observer(db);
 const proof=await o.inspectTrashMutationClosureReadOnly();
 assert.equal(proof.owner,'trashMutation');assert.equal(proof.status,'callback-settled');
 assert.equal(proof.completedReceiptCount,1);assert.equal(proof.eligibleForLease,false);
 assert.equal(proof.indexedDbCommitVerified,false);assert.equal(proof.priorGenerationClosed,false);
 assert.equal(db.writes,0);assert.ok(Object.isFrozen(proof));
 assert.equal((await o.observe()).observations.trashMutation.state,'unknown');
});
test('genuine autonomous trash-purge closure can be classified locally',async()=>{
 const db=disk();receipt(db,'trash_auto_001','AUTONOMOUS:trash-purge-boot');
 const proof=await observer(db).inspectTrashMutationClosureReadOnly();
 assert.equal(proof.status,'callback-settled');assert.equal(proof.eligibleForLease,false);
});
test('all approved local trash operations may coexist with settled callbacks',async()=>{
 const db=disk();
 for(const [i,type] of ['DELETE_INVENTORY','DELETE_TRASH_ENTRY','RESET_TRASH_RETENTION',
  'CLEAR_INVENTORIES','REMOVE_REPLACEMENT_READY_LOCAL','DISCARD_RENEWAL_DRAFT',
  'AUTONOMOUS:trash-purge-startup','AUTONOMOUS:trash-purge-installed'].entries())
  receipt(db,'trash_allowed_'+i,type);
 const proof=await observer(db).inspectTrashMutationClosureReadOnly();
 assert.equal(proof.status,'callback-settled');assert.equal(proof.completedReceiptCount,8);
});
test('no completed trash receipt is not a positive claim',async()=>{
 const proof=await observer(disk()).inspectTrashMutationClosureReadOnly();
 assert.equal(proof.status,'unverified');assert.equal(proof.eligibleForLease,false);
});
test('unfinished old worker cannot be considered callback-settled',async()=>{
 const db=disk();receipt(db,'trash_unfinished_1','DELETE_TRASH_ENTRY',null);
 const proof=await observer(db).inspectTrashMutationClosureReadOnly();
 assert.equal(proof.status,'unverified');assert.equal(proof.reason,'DURABLE_ADMISSION_UNFINISHED');
});
test('remote-phase4 replacement receipt must not attest local-only trash mutation',async()=>{
 const db=disk();receipt(db,'remote_phase4_001','FINISH_RENEWAL_REPLACEMENT');
 const proof=await observer(db).inspectTrashMutationClosureReadOnly();
 assert.equal(proof.status,'unverified');assert.equal(proof.reason,'OWNER_PROVENANCE_UNVERIFIED');
});
test('profile import receipt cannot impersonate independently verified trash commit',async()=>{
 const db=disk();receipt(db,'profile_import_1','FINALIZE_PROFILE_BACKUP_IMPORT');
 assert.equal((await observer(db).inspectTrashMutationClosureReadOnly()).status,'unverified');
});
test('unknown operation fallback is not an owner-specific completion',async()=>{
 const db=disk();receipt(db,'unknown_route_01','NO_SUCH_MESSAGE_TYPE');
 assert.equal((await observer(db).inspectTrashMutationClosureReadOnly()).status,'unverified');
});
test('mixed local trash with remote or unknown receipt stays unverified',async()=>{
 const db=disk();receipt(db,'trash_good_001');receipt(db,'trash_bad_001','FINISH_RENEWAL_REPLACEMENT');
 assert.equal((await observer(db).inspectTrashMutationClosureReadOnly()).status,'unverified');
});
test('current in-flight trash callback supersedes prior settled receipt',async()=>{
 const db=disk();receipt(db,'trash_done_001');const o=observer(db);
 let release;const hold=new Promise(resolve=>{release=resolve;});
 const task=o.track('trashMutation',()=>hold);
 const proof=await o.inspectTrashMutationClosureReadOnly();
 assert.equal(proof.status,'unverified');assert.equal(proof.reason,'ACTUAL_IN_FLIGHT_OPERATION');
 release();await task;assert.equal((await o.inspectTrashMutationClosureReadOnly()).status,'callback-settled');
});
test('receipt changed across independent observations fails closed',async()=>{
 const db=disk();receipt(db,'trash_race_001');
 db.afterRead((n,rows)=>{if(n===2)rows[Atomic.FINISH_PREFIX+'trash_race_001'].completedAtMs=1300});
 assert.equal((await observer(db).inspectTrashMutationClosureReadOnly()).status,'unverified');
});
test('orphan and unavailable journal cannot yield settled proof',async()=>{
 const db=disk();db.rows[Atomic.FINISH_PREFIX+'orphan']={
  schema:1,state:'completed',token:'orphan',workerInstanceId:'old-worker',completedAtMs:1200};
 assert.equal((await observer(db).inspectTrashMutationClosureReadOnly()).status,'unverified');
 const unavailable=disk();unavailable.failReads(true);
 assert.equal((await observer(unavailable).inspectTrashMutationClosureReadOnly()).status,'unverified');
});
