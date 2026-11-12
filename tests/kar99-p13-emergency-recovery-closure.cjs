// KAR-99 P1.3 emergencyRecovery: actual immutable P8 autonomous bulk callbacks.
// A finished callback does not certify recovered persisted state, detached work,
// prior MV3 Worker generations, account context, or a trusted update lease.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Owners=require('../src/background/services/additional-owner-observer.js');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
function disk(){
 const rows={};let writes=0,reads=0,mutation=null,broken=false;
 return {rows,get writes(){return writes},onRead(fn){mutation=fn},fail(v){broken=v},
  async get(keys){
   if(broken)throw Error('local storage unavailable');
   const names=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
   const result=Object.fromEntries(names.filter(k=>Object.hasOwn(rows,k))
    .map(k=>[k,structuredClone(rows[k])]));
   if(keys===null){reads++;mutation?.(reads,rows)}
   return result;
  },async set(values){writes++;Object.assign(rows,structuredClone(values))}
 };
}
const observer=storageLocal=>Owners.create({storageLocal,
 storageSession:{async get(){return {}}},clock:()=>5000,
 workerInstanceId:'current-generation'});
const inspect=d=>observer(d).inspectEmergencyRecoveryClosureReadOnly();
function receipt(d,token,operationType='AUTONOMOUS:bulk-watchdog',finish=1200){
 d.rows[Atomic.START_PREFIX+token]={schema:1,state:'admitted',token,
  operationType,workerInstanceId:'prior-generation',startedAtMs:1000};
 if(finish!==null)d.rows[Atomic.FINISH_PREFIX+token]={schema:1,state:'completed',
  token,workerInstanceId:'prior-generation',completedAtMs:finish};
}
test('prior-worker bulk watchdog callback is historical only, never an update IDLE',async()=>{
 const d=disk();receipt(d,'watchdog_001');const o=observer(d);
 const p=await o.inspectEmergencyRecoveryClosureReadOnly();
 assert.equal(p.schema,1);assert.equal(p.owner,'emergencyRecovery');
 assert.equal(p.status,'callback-settled');
 assert.equal(p.completedReceiptCount,1);
 assert.equal(p.eligibleForLease,false);
 assert.equal(p.recoveryStateVerified,false);
 assert.equal(p.priorGenerationClosed,false);
 assert.equal(p.detachedWorkVerified,false);
 assert.equal(d.writes,0);assert.ok(Object.isFrozen(p));
 assert.notEqual((await o.observe()).observations.emergencyRecovery.state,'idle');
});
test('two exact autonomous bulk callback producers are finite historical only',async()=>{
 const d=disk();receipt(d,'watchdog_002');
 receipt(d,'bulk_restart_001','AUTONOMOUS:bulk-runtime-recovery');
 const p=await inspect(d);
 assert.equal(p.status,'callback-settled');assert.equal(p.completedReceiptCount,2);
 assert.equal(p.eligibleForLease,false);
});
test('missing P8 starts never certify recovery',async()=>{
 const p=await inspect(disk());
 assert.equal(p.status,'unverified');assert.equal(p.eligibleForLease,false);
});
test('prior-worker admitted but unfinished recovery stays unverified',async()=>{
 const d=disk();receipt(d,'bulk_unfinished','AUTONOMOUS:bulk-runtime-recovery',null);
 const p=await inspect(d);assert.equal(p.status,'unverified');
 assert.equal(p.reason,'DURABLE_ADMISSION_UNFINISHED');
});
test('finished exact callback cannot cover concurrently unfinished recovery',async()=>{
 const d=disk();receipt(d,'bulk_finished');receipt(d,'bulk_pending','AUTONOMOUS:bulk-runtime-recovery',null);
 assert.equal((await inspect(d)).status,'unverified');
});
test('routed emergency RESET_ACTIVE_WORKFLOWS is excluded from bulk proof',async()=>{
 const d=disk();receipt(d,'routed_reset','RESET_ACTIVE_WORKFLOWS');
 const p=await inspect(d);assert.equal(p.status,'unverified');
 assert.equal(p.reason,'OWNER_PROVENANCE_UNVERIFIED');
});
test('remote renewal resume may not masquerade as a completed bulk recovery',async()=>{
 const d=disk();receipt(d,'renewal_resume','AUTONOMOUS:renewal-resume');
 assert.equal((await inspect(d)).status,'unverified');
});
test('mass-renewal watchdog cannot certify local bulk recovery',async()=>{
 const d=disk();receipt(d,'mass_wdog','AUTONOMOUS:mass-renewal-watchdog-timer');
 assert.equal((await inspect(d)).status,'unverified');
});
test('template error handling cannot certify independent recovery completion',async()=>{
 const d=disk();receipt(d,'template_error','AUTONOMOUS:template-error-terminalize');
 assert.equal((await inspect(d)).status,'unverified');
});
test('unknown routed or autonomous fallback may not certify exact recovery source',async()=>{
 for(const kind of ['FUTURE_RESET','AUTONOMOUS:unregistered-recovery']){
  const d=disk();receipt(d,'unknown_recovery',kind);
  assert.equal((await inspect(d)).status,'unverified');
 }
});
test('mixed exact and unknown sources prevent partial positive callback attribution',async()=>{
 const d=disk();receipt(d,'exact_bulk');receipt(d,'unknown_bulk','AUTONOMOUS:unknown-work');
 assert.equal((await inspect(d)).status,'unverified');
});
test('in-flight emergency owner supersedes historical finished callback',async()=>{
 const d=disk();receipt(d,'prior_bulk');const o=observer(d);
 let finish;const held=new Promise(r=>{finish=r});
 const task=o.track('emergencyRecovery',()=>held);
 const p=await o.inspectEmergencyRecoveryClosureReadOnly();
 assert.equal(p.status,'unverified');
 assert.equal(p.reason,'ACTUAL_IN_FLIGHT_OPERATION');
 finish();await task;
 assert.equal((await o.inspectEmergencyRecoveryClosureReadOnly()).status,'callback-settled');
});
test('changed original receipt between independent observations fails closed',async()=>{
 const d=disk();receipt(d,'changed_bulk');
 d.onRead((count,rows)=>{
  if(count===2)rows[Atomic.FINISH_PREFIX+'changed_bulk'].completedAtMs=1300;
 });
 const p=await inspect(d);assert.equal(p.status,'unverified');
 assert.equal(p.eligibleForLease,false);
});
test('orphan P8 finish cannot attest callback settlement',async()=>{
 const d=disk();d.rows[Atomic.FINISH_PREFIX+'orphan_bulk']={schema:1,
  state:'completed',token:'orphan_bulk',workerInstanceId:'prior-generation',
  completedAtMs:1200};
 assert.equal((await inspect(d)).status,'unverified');
});
test('corrupt original worker or finish timestamp fails closed',async()=>{
 const d=disk();receipt(d,'broken_bulk');
 d.rows[Atomic.FINISH_PREFIX+'broken_bulk'].workerInstanceId='other-generation';
 assert.equal((await inspect(d)).status,'unverified');
});
test('invalid start receipt fails closed even when callback finish appears intact',async()=>{
 const d=disk();receipt(d,'invalid_bulk');
 d.rows[Atomic.START_PREFIX+'invalid_bulk'].state='maybe-admitted';
 assert.equal((await inspect(d)).status,'unverified');
});
test('missing storage source is unverified, not IDLE',async()=>{
 const d=disk();d.fail(true);
 const p=await inspect(d);assert.equal(p.status,'unverified');
 assert.equal(p.eligibleForLease,false);assert.equal(d.writes,0);
});
test('known profile mismatch cannot be used to imply a recovered account scope',async()=>{
 const d=disk();receipt(d,'profile_change_bulk');
 d.rows.activeDetectedProfileV1={profileId:'account-A'};
 d.rows.selectedInventoryProfileV1={profileId:'account-B'};
 const p=await inspect(d);assert.equal(p.status,'unverified');
 assert.equal(p.eligibleForLease,false);
});
