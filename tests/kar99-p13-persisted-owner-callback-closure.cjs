// KAR-99 P1.3: seven persisted owners' historical P8 callbacks, never update IDLE.
// Genuine RED against v1.23.81: public read-only witness does not yet exist.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Persisted=require('../src/background/services/persisted-owner-observer.js');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
const PROFILE='account-one';
const TYPES=Object.freeze({
 bulkInventory:'AUTONOMOUS:bulk-runtime-recovery',
 bulkReconciliation:'AUTONOMOUS:bulk-runtime-recovery',
 renewal:'AUTONOMOUS:renewal-detached-verify',
 massRenewal:'AUTONOMOUS:mass-renewal-next-item',
 templateFill:'AUTONOMOUS:archive-resume',
 archiveInsertion:'AUTONOMOUS:archive-resume',
 insertionLock:'AUTONOMOUS:renewal-detached-verify'
});
function disk(){
 const rows={activeDetectedProfileV1:{profileId:PROFILE},selectedInventoryProfileV1:{profileId:PROFILE}},
  session={},mutations=[];let n=0,after=null,fail=false;
 return {rows,session,mutations,afterRead(fn){after=fn},failRead(v=true){fail=v},
  local:{
   async get(keys){
    if(fail)throw Error('local unavailable');
    const names=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
    const out=Object.fromEntries(names.filter(k=>Object.hasOwn(rows,k)).map(k=>[k,structuredClone(rows[k])]));
    n++;after?.(n,rows,session,keys);return out;
   },
   async set(v){mutations.push(['local',v]);throw Error('read-only');}
  },
  sessionStore:{
   async get(keys){
    if(fail)throw Error('session unavailable');
    return Object.fromEntries(keys.filter(k=>Object.hasOwn(session,k)).map(k=>[k,structuredClone(session[k])]));
   },
   async set(v){mutations.push(['session',v]);throw Error('read-only');}
  }
 };
}
function observer(d){return Persisted.create({storageLocal:d.local,storageSession:d.sessionStore,
 clock:()=>100000,workerInstanceId:'new-worker'});}
function receipt(d,token,kind,complete=true){
 d.rows[Atomic.START_PREFIX+token]={schema:1,state:'admitted',token,operationType:kind,
 workerInstanceId:'old-worker',startedAtMs:900};
 if(complete)d.rows[Atomic.FINISH_PREFIX+token]={schema:1,state:'completed',token,
 workerInstanceId:'old-worker',completedAtMs:1200};
}
function neverAuthorizes(v,owner){
 assert.equal(v.schema,1);assert.equal(v.owner,owner);
 for(const k of ['eligibleForLease','currentLiveAccountVerified','priorGenerationClosed',
 'remoteOutcomeVerified','localCommitVerified','noPendingDetachedWorkVerified'])
  assert.equal(v[k],false,'forbidden positive flag '+k);
 assert.ok(Object.isFrozen(v));assert.ok(['callback-settled','blocked','unverified'].includes(v.status));
}
for(const [owner,kind] of Object.entries(TYPES)){
 test('known autonomous '+owner+' prior-worker callback yields historical-only settlement',async()=>{
  const d=disk();receipt(d,'token_'+owner,kind);
  const p=await observer(d).inspectPersistedOwnerCallbackClosureReadOnly(owner);
  neverAuthorizes(p,owner);
  assert.equal(p.status,'callback-settled');
  assert.equal(p.completedReceiptCount,1);
  assert.equal(p.storedProfileStable,true);
  assert.equal(typeof p.sourceRevision,'string');
  assert.equal(d.mutations.length,0);
 });
}
test('KAR-171 W3C RED: future prior-worker P8 receipts never claim callback settlement',async()=>{
 for(const [label,startAt,finishAt] of [
  ['future-start',100100,100200],['future-finish',900,100200]
 ]) {
  const d=disk(),token='future_'+label;
  receipt(d,token,TYPES.renewal);
  d.rows[Atomic.START_PREFIX+token].startedAtMs=startAt;
  d.rows[Atomic.FINISH_PREFIX+token].completedAtMs=finishAt;
  const o=observer(d);
  const observed=await o.observe();
  assert.equal(observed.eligibleForLease,false);
  assert.equal(observed.admissionHistory.renewal.state,'unverified',
    label+': raw prior-generation durable timestamps are not trusted evidence');
  const closure=await o.inspectPersistedOwnerCallbackClosureReadOnly('renewal');
  neverAuthorizes(closure,'renewal');
  assert.equal(closure.status,'unverified',
    label+': future prior-worker receipt cannot claim callback settlement');
  assert.equal(d.mutations.length,0,'read-only source must never mutate receipts');
 }
});
test('empty P8 journal cannot prove any persisted owner closure',async()=>{
 const d=disk(),o=observer(d);
 for(const owner of Persisted.OWNERS){
  const p=await o.inspectPersistedOwnerCallbackClosureReadOnly(owner);
  neverAuthorizes(p,owner);assert.equal(p.status,'unverified');
 }
});
test('unrecognized autonomous and generic routed callbacks do not prove ownership',async()=>{
 for(const kind of ['AUTONOMOUS:new-unknown-owner','START_TEMPLATE_FILL']){
  const d=disk();receipt(d,'unknown_123',kind);
  const p=await observer(d).inspectPersistedOwnerCallbackClosureReadOnly('templateFill');
  neverAuthorizes(p,'templateFill');assert.equal(p.status,'unverified');
 }
});
test('valid completion mixed with unknown fallback is never owner-specific',async()=>{
 const d=disk();receipt(d,'known_1',TYPES.renewal);receipt(d,'unknown_1','UNRECOGNIZED_ACTION');
 const p=await observer(d).inspectPersistedOwnerCallbackClosureReadOnly('renewal');
 neverAuthorizes(p,'renewal');assert.equal(p.status,'unverified');
});
test('unfinished old-worker callback blocks observed owner after restart',async()=>{
 const d=disk();receipt(d,'held_1',TYPES.massRenewal,false);
 const p=await observer(d).inspectPersistedOwnerCallbackClosureReadOnly('massRenewal');
 neverAuthorizes(p,'massRenewal');assert.equal(p.status,'blocked');
});
test('persisted active work blocks historical finished callback',async()=>{
 const d=disk();receipt(d,'finished_1',TYPES.renewal);
 d.rows.renewalSessionsV1={one:{status:'running',profileId:PROFILE}};
 const p=await observer(d).inspectPersistedOwnerCallbackClosureReadOnly('renewal');
 neverAuthorizes(p,'renewal');assert.equal(p.status,'blocked');
});
test('in-process tracked owner blocks settled callback until completion',async()=>{
 const d=disk();receipt(d,'finished_1',TYPES.bulkInventory);
 const o=observer(d);let resume;
 const held=new Promise(resolve=>{resume=resolve});
 const task=o.track('bulkInventory',()=>held);
 const p=await o.inspectPersistedOwnerCallbackClosureReadOnly('bulkInventory');
 neverAuthorizes(p,'bulkInventory');assert.equal(p.status,'blocked');
 resume();await task;
 const later=await o.inspectPersistedOwnerCallbackClosureReadOnly('bulkInventory');
 assert.equal(later.status,'callback-settled');
});
test('wrong and missing stored profile cannot certify scoped callback',async()=>{
 for(const broken of ['missing','mismatch']){
  const d=disk();receipt(d,'profile_1',TYPES.bulkReconciliation);
  if(broken==='missing')delete d.rows.selectedInventoryProfileV1;
  else d.rows.selectedInventoryProfileV1={profileId:'another-account'};
  const p=await observer(d).inspectPersistedOwnerCallbackClosureReadOnly('bulkReconciliation');
  neverAuthorizes(p,'bulkReconciliation');assert.equal(p.status,'unverified');
 }
});
test('changed local persisted state across observation fails closed',async()=>{
 const d=disk();receipt(d,'changed_1',TYPES.renewal);
 d.afterRead((n,rows)=>{if(n===3)rows.massRenewalBatchV1={status:'running'}});
 const p=await observer(d).inspectPersistedOwnerCallbackClosureReadOnly('renewal');
 neverAuthorizes(p,'renewal');assert.equal(p.status,'unverified');
});
test('changed P8 completion between independent observations fails closed',async()=>{
 const d=disk();receipt(d,'changed_1',TYPES.archiveInsertion);
 d.afterRead((n,rows,session,keys)=>{
  if(keys===null&&rows[Atomic.FINISH_PREFIX+'changed_1'].completedAtMs===1200)
   rows[Atomic.FINISH_PREFIX+'changed_1'].completedAtMs=1300;
 });
 const p=await observer(d).inspectPersistedOwnerCallbackClosureReadOnly('archiveInsertion');
 neverAuthorizes(p,'archiveInsertion');assert.equal(p.status,'unverified');
});
test('session epoch drift cannot certify a stable owner source',async()=>{
 const d=disk();receipt(d,'drift_1',TYPES.bulkInventory);d.session.runtimeEpochV1='epoch-a';
 d.afterRead((n,rows,session)=>{if(n===3)session.runtimeEpochV1='epoch-b'});
 const p=await observer(d).inspectPersistedOwnerCallbackClosureReadOnly('bulkInventory');
 neverAuthorizes(p,'bulkInventory');assert.equal(p.status,'unverified');
});
test('unavailable local or session storage, orphan finish, and unknown owner stay unverified',async()=>{
 const unavailable=disk();receipt(unavailable,'some_1',TYPES.templateFill);
 unavailable.failRead();
 const p=await observer(unavailable).inspectPersistedOwnerCallbackClosureReadOnly('templateFill');
 neverAuthorizes(p,'templateFill');assert.equal(p.status,'unverified');
 const orphan=disk();orphan.rows[Atomic.FINISH_PREFIX+'orphan_1']={
  schema:1,state:'completed',token:'orphan_1',workerInstanceId:'old-worker',completedAtMs:1200};
 const q=await observer(orphan).inspectPersistedOwnerCallbackClosureReadOnly('templateFill');
 neverAuthorizes(q,'templateFill');assert.equal(q.status,'unverified');
 const invalid=await observer(disk()).inspectPersistedOwnerCallbackClosureReadOnly('unlisted-owner');
 neverAuthorizes(invalid,'unlisted-owner');assert.equal(invalid.status,'unverified');
});
