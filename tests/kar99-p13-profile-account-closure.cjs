// KAR-99 P1.3: historical P8 callbacks for profile and account owner classes.
// A completed handler is NOT a persisted profile commit, authenticated live
// Kleinanzeigen account match, consumer delivery, prior generation closure, or IDLE.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Owners=require('../src/background/services/additional-owner-observer.js');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');

function disk(){
 const rows={};let writes=0,reads=0,afterRead=null,broken=false;
 return {rows,get writes(){return writes},fail(v){broken=v},onRead(fn){afterRead=fn},
  async get(keys){
   if(broken)throw Error('storage unavailable');
   const selected=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
   const result=Object.fromEntries(selected.filter(k=>Object.hasOwn(rows,k))
     .map(k=>[k,structuredClone(rows[k])]));
   if(keys===null){reads++;afterRead?.(reads,rows)}
   return result;
  },
  async set(values){writes++;Object.assign(rows,structuredClone(values))}
 };
}
function observer(storageLocal){
 return Owners.create({storageLocal,storageSession:{async get(){return {}}},
  clock:()=>5000,workerInstanceId:'current-worker'});
}
function receipt(d,token,operationType,finish=1200,worker='previous-worker'){
 d.rows[Atomic.START_PREFIX+token]={schema:1,state:'admitted',token,operationType,
  workerInstanceId:worker,startedAtMs:1000};
 if(finish!==null)d.rows[Atomic.FINISH_PREFIX+token]={schema:1,state:'completed',
  token,workerInstanceId:worker,completedAtMs:finish};
}
const CASES=[
 {owner:'profileTransition',method:'inspectProfileTransitionClosureReadOnly',
  operation:'SET_SELECTED_PROFILE',other:'PREPARE_PROFILE_BACKUP_IMPORT',
  blocked:'DELETE_PROFILE'},
 {owner:'accountTransition',method:'inspectAccountTransitionClosureReadOnly',
  operation:'RECOGNIZE_PROFILE',other:'PROBE_LIVE_KLEINANZEIGEN_ACCOUNT',
  blocked:'SET_SELECTED_PROFILE'}
];
for(const c of CASES){
 const inspect=d=>observer(d)[c.method]();
 test(c.owner+': prior-worker exact callback is only historical, never trusted IDLE',async()=>{
  const d=disk();receipt(d,c.owner+'_finish',c.operation);
  const o=observer(d),p=await o[c.method]();
  assert.equal(p.schema,1);assert.equal(p.owner,c.owner);
  assert.equal(p.status,'callback-settled');assert.equal(p.completedReceiptCount,1);
  assert.equal(p.eligibleForLease,false);assert.equal(p.priorGenerationClosed,false);
  assert.equal(p.liveAccountVerified,false);assert.equal(p.profileCommitVerified,false);
  assert.equal(p.consumerDeliveryVerified,false);assert.equal(d.writes,0);
  assert.ok(Object.isFrozen(p));
  assert.notEqual((await o.observe()).observations[c.owner].state,'idle');
 });
 test(c.owner+': empty journal is not proof',async()=>{
  const p=await inspect(disk());
  assert.equal(p.status,'unverified');assert.equal(p.eligibleForLease,false);
 });
 test(c.owner+': unfinished earlier-worker start blocks',async()=>{
  const d=disk();receipt(d,c.owner+'_pending',c.operation,null);
  const p=await inspect(d);
  assert.equal(p.status,'unverified');assert.equal(p.reason,'DURABLE_ADMISSION_UNFINISHED');
 });
 test(c.owner+': no unknown routed fallback may be attributed to this owner',async()=>{
  const d=disk();receipt(d,c.owner+'_unknown','FUTURE_UNREGISTERED_ROUTE');
  assert.equal((await inspect(d)).status,'unverified');
 });
 test(c.owner+': exact plus unknown routes never give partial completion',async()=>{
  const d=disk();receipt(d,c.owner+'_exact',c.operation);
  receipt(d,c.owner+'_unknown','FUTURE_UNREGISTERED_ROUTE');
  assert.equal((await inspect(d)).status,'unverified');
 });
 test(c.owner+': concurrent in-process callback blocks completed prior history',async()=>{
  const d=disk();receipt(d,c.owner+'_prior',c.operation);
  const o=observer(d);let done;const held=new Promise(resolve=>{done=resolve});
  const work=o.track(c.owner,()=>held);
  const p=await o[c.method]();
  assert.equal(p.status,'unverified');assert.equal(p.reason,'ACTUAL_IN_FLIGHT_OPERATION');
  done();await work;
  assert.equal((await o[c.method]()).status,'callback-settled');
 });
 test(c.owner+': durable journal changing during second observation fails closed',async()=>{
  const d=disk();receipt(d,c.owner+'_drift',c.operation);
  d.onRead((n,rows)=>{if(n===2)rows[Atomic.FINISH_PREFIX+c.owner+'_drift'].completedAtMs=1400});
  const p=await inspect(d);
  assert.equal(p.status,'unverified');assert.equal(p.eligibleForLease,false);
 });
 test(c.owner+': orphan finish fails closed',async()=>{
  const d=disk();d.rows[Atomic.FINISH_PREFIX+c.owner+'_orphan']={
   schema:1,state:'completed',token:c.owner+'_orphan',
   workerInstanceId:'previous-worker',completedAtMs:1200};
  assert.equal((await inspect(d)).status,'unverified');
 });
 test(c.owner+': inaccessible source fails closed',async()=>{
  const d=disk();d.fail(true);
  const p=await inspect(d);
  assert.equal(p.status,'unverified');assert.equal(p.eligibleForLease,false);
 });
 test(c.owner+': inappropriate other owner source is excluded',async()=>{
  const d=disk();receipt(d,c.owner+'_other',c.blocked);
  assert.equal((await inspect(d)).status,'unverified');
 });
 test(c.owner+': malformed generation and finish do not certify closure',async()=>{
  const d=disk();receipt(d,c.owner+'_bad',c.operation);
  d.rows[Atomic.FINISH_PREFIX+c.owner+'_bad'].workerInstanceId='wrong-worker';
  assert.equal((await inspect(d)).status,'unverified');
 });
 test(c.owner+': mismatched stored profiles cannot certify transition outcome',async()=>{
  const d=disk();receipt(d,c.owner+'_mismatch',c.operation);
  d.rows.activeDetectedProfileV1={profileId:'user-A'};
  d.rows.selectedInventoryProfileV1={profileId:'user-B'};
  const p=await inspect(d);
  assert.equal(p.status,'unverified');assert.equal(p.eligibleForLease,false);
 });
}
test('accountTransition two genuine exact producers establish only callback settlement',async()=>{
 const d=disk();receipt(d,'account_recognize','RECOGNIZE_PROFILE');
 receipt(d,'account_probe','PROBE_LIVE_KLEINANZEIGEN_ACCOUNT');
 const p=await observer(d).inspectAccountTransitionClosureReadOnly();
 assert.equal(p.status,'callback-settled');assert.equal(p.completedReceiptCount,2);
 assert.equal(p.liveAccountVerified,false);assert.equal(p.eligibleForLease,false);
});
test('accountTransition cannot be certified by local profile selection alone',async()=>{
 const d=disk();receipt(d,'account_only_select','SET_SELECTED_PROFILE');
 assert.equal((await observer(d).inspectAccountTransitionClosureReadOnly()).status,'unverified');
});
test('profileTransition excludes a profile import even with finished callback',async()=>{
 const d=disk();receipt(d,'profile_prepare','PREPARE_PROFILE_BACKUP_IMPORT');
 assert.equal((await observer(d).inspectProfileTransitionClosureReadOnly()).status,'unverified');
});
test('profileTransition excludes mixed account detection callback',async()=>{
 const d=disk();receipt(d,'profile_recognize','RECOGNIZE_PROFILE');
 assert.equal((await observer(d).inspectProfileTransitionClosureReadOnly()).status,'unverified');
});
