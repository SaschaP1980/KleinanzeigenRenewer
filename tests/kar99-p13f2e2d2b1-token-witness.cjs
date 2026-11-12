// KAR-99 P1.3-F2E2D2B1: RED-first, actual P8 admission token source
// and irreversible Phase-4 / publish intent journal binding.
// Historical callback + remote result NEVER authorizes an updater lease.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const P8=require('../src/background/services/cross-worker-atomic-admission.js');
const Fence=require('../src/background/services/update-workflow-fence.js');
const Phase4=require('../src/background/services/phase4-uncertainty-journal.js');
const Publish=require('../src/background/services/auto-publish-intent-journal.js');
const Persisted=require('../src/background/services/persisted-owner-observer.js');
const Additional=require('../src/background/services/additional-owner-observer.js');
const WORKER='worker-same-real-instance',PROFILE='profile-A';
function db(){
 const rows={activeDetectedProfileV1:{profileId:PROFILE},
  selectedInventoryProfileV1:{profileId:PROFILE},renewalSessionsV1:{},
  archiveInsertionSessionsV1:{},templateFillSessions:{}};
 let writes=0;
 return {rows,get writes(){return writes;},
  async get(keys){
   const names=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
   return Object.fromEntries(names.filter(k=>Object.hasOwn(rows,k))
     .map(k=>[k,structuredClone(rows[k])]));
  },
  async set(patch){writes++;Object.assign(rows,structuredClone(patch));}
 };
}
function locks(){
 const held=new Set();
 return {async request(name,opts,fn){
   assert.equal(name,P8.LOCK_NAME);
   assert.deepEqual(opts,{mode:'exclusive',ifAvailable:true});
   if(held.has(name))return fn(null);
   held.add(name);try{return await fn({name,mode:'exclusive'});}
   finally{held.delete(name);}
 }};
}
let serial=0;
function env(){
 const storage=db(),lockManager=locks();let time=100;
 const clock=()=>time,token=()=>'admission-token-'+(++serial)+'-long';
 const atomic=P8.create({storageLocal:storage,lockManager,clock,
  newToken:token,workerInstanceId:WORKER});
 const opts={storageLocal:storage,lockManager,lockName:P8.LOCK_NAME,
  workerInstanceId:WORKER,clock};
 const phase=Phase4.create({...opts,newToken:()=> 'phase-attempt-1',
  verifyRemoteOutcome:row=>({profileId:row.profileId,sourceAdId:row.sourceAdId,
   newAdId:row.newAdId,sourceAbsent:true,targetPresent:true,
   sourceEvidence:'not-in-my-ads-full-pagination-scan',
   targetEvidence:'found-in-my-ads-full-pagination-scan',
   sourcePagesScanned:2,targetPagesScanned:2,targetFoundPage:1})});
 const publish=Publish.create({...opts,newToken:()=> 'publish-attempt-1',
  verifyRemoteOutcome:(intent,newAdId)=>({
   fillId:intent.fillId,workflowId:intent.workflowId,kind:intent.kind,
   profileId:intent.profileId,sourceAdId:intent.sourceAdId,newAdId,
   targetPresent:true,targetEvidence:'found-in-my-ads-full-pagination-scan',
   targetPagesScanned:2,targetFoundPage:1})});
 const later=()=>{time+=40;return time;};
 return {storage,atomic,phase,publish,later};
}
const phaseArgs=admissionReceipt=>({renewalId:'renewal-001',
 profileId:PROFILE,sourceAdId:'12345',newAdId:'56789',admissionReceipt});
const publishArgs=admissionReceipt=>({fillId:'fill-001',workflowId:'renewal-001',
 kind:'renewal',profileId:PROFILE,sourceAdId:'12345',targetTabId:12,admissionReceipt});
async function rejected(p,code){
 await assert.rejects(p,e=>e?.code===code,code);
}
test('B1 RED: genuine exclusive P8 start is provided in-band as frozen task admission receipt',async()=>{
 const e=env();let entry;
 const result=await e.atomic.withAdmission('AUTONOMOUS:renewal-auto-phase4',async proof=>{
  entry=proof;
  assert.ok(Object.isFrozen(proof));
  assert.equal(proof.workerInstanceId,WORKER);
  assert.equal(proof.operationType,'AUTONOMOUS:renewal-auto-phase4');
  assert.deepEqual(e.storage.rows[P8.START_PREFIX+proof.token],proof);
  assert.equal(e.storage.rows[P8.FINISH_PREFIX+proof.token],undefined);
  e.later();return 'done';
 });
 assert.equal(result,'done');
 assert.equal(e.storage.rows[P8.FINISH_PREFIX+entry.token].state,'completed');
});
test('B1 RED: actual Work fence forwards its P8 admission receipt without exposing a message route',async()=>{
 const e=env();
 const fence=Fence.create({storageLocal:e.storage,clock:()=>100,
  newToken:()=> 'unused-fence-token',atomicCoordinator:e.atomic});
 await fence.withAdmission('AUTONOMOUS:renewal-auto-phase4',async proof=>{
  assert.equal(proof.workerInstanceId,WORKER);
  assert.deepEqual(proof,e.storage.rows[P8.START_PREFIX+proof.token]);
 });
});
test('B1 RED: Phase4 before-delete intent binds the exact durable still-open P8 token',async()=>{
 const e=env();let receipt;
 await e.atomic.withAdmission('AUTONOMOUS:renewal-auto-phase4',async proof=>{
  e.later();receipt=await e.phase.begin(phaseArgs(proof));
  assert.equal(receipt.admissionToken,proof.token);
  assert.equal(e.storage.rows[Phase4.KEY_PREFIX+'renewal-001_phase-attempt-1'].admissionToken,proof.token);
  e.later();
  await e.phase.resolveVerified({renewalId:'renewal-001',attemptId:'phase-attempt-1'});
 });
 assert.equal(e.storage.rows[Phase4.RESOLUTION_KEY_PREFIX+'renewal-001_phase-attempt-1'].state,'resolved-confirmed');
 assert.equal(receipt.workerInstanceId,WORKER);
});
test('B1 RED: Publish before-click intent binds original P8 token without trusting client claims',async()=>{
 const e=env();let entry;
 await e.atomic.withAdmission('AUTONOMOUS:renewal-publish-detection',async proof=>{
  e.later();entry=await e.publish.begin(publishArgs(proof));
  assert.equal(entry.admissionToken,proof.token);
  e.later();await e.publish.resolveVerified({fillId:'fill-001',newAdId:'56789'});
 });
 assert.equal(e.storage.rows[Publish.RESOLUTION_KEY_PREFIX+'fill-001_publish-attempt-1'].state,'resolved-confirmed');
});
test('B1 RED: changed token and forged P8 receipt fail before Phase4 remote intent write',async()=>{
 const e=env();
 await e.atomic.withAdmission('AUTONOMOUS:renewal-auto-phase4',async proof=>{
  e.later();
  const forged={...proof,token:'invented-other-token'};
  const before=e.storage.writes;
  await rejected(e.phase.begin(phaseArgs(forged)),'KR_PHASE4_JOURNAL_ADMISSION_UNVERIFIED');
  assert.equal(e.storage.rows[Phase4.KEY_PREFIX+'renewal-001_phase-attempt-1'],undefined);
  assert.equal(e.storage.writes,before);
 });
});
test('B1 RED: wrong worker P8 record or unrelated owner is denied before publication',async()=>{
 const e=env();
 await e.atomic.withAdmission('AUTONOMOUS:renewal-auto-phase4',async proof=>{
  e.later();
  await rejected(e.publish.begin(publishArgs(proof)),'KR_PUBLISH_INTENT_ADMISSION_UNVERIFIED');
 });
 const other=Publish.create({storageLocal:e.storage,lockManager:locks(),
  lockName:P8.LOCK_NAME,workerInstanceId:'another-worker',clock:()=>200,
  newToken:()=> 'publish-attempt-2'});
 await e.atomic.withAdmission('AUTONOMOUS:renewal-publish-detection',async proof=>{
  e.later();
  await rejected(other.begin(publishArgs(proof)),'KR_PUBLISH_INTENT_ADMISSION_UNVERIFIED');
 });
 assert.equal(e.storage.rows[Publish.KEY_PREFIX+'fill-001_publish-attempt-1'],undefined);
});
test('B1 RED: finished P8 token replay fails closed at both real journal begin boundaries',async()=>{
 const e=env();let old;
 await e.atomic.withAdmission('AUTONOMOUS:renewal-auto-phase4',async proof=>{old=proof;e.later();});
 e.later();
 await rejected(e.phase.begin(phaseArgs(old)),'KR_PHASE4_JOURNAL_ADMISSION_UNVERIFIED');
 await rejected(e.publish.begin(publishArgs(old)),'KR_PUBLISH_INTENT_ADMISSION_UNVERIFIED');
 assert.equal(e.storage.rows[Phase4.KEY_PREFIX+'renewal-001_phase-attempt-1'],undefined);
});
test('B1 RED: real deployed worker uses exactly one P8 generation ID for both remote writers',()=>{
 const background=fs.readFileSync('src/background/background.js','utf8');
 const phase=background.slice(background.indexOf('function requirePhase4UncertaintyJournal()'),
  background.indexOf('let autoPublishIntentJournal = null'));
 const publish=background.slice(background.indexOf('function requireAutoPublishIntentJournal()'),
  background.indexOf('// A caller-supplied new-ID redirect'));
 assert.match(phase,/workerInstanceId:\s*ownerWorkerInstanceId/);
 assert.match(publish,/workerInstanceId:\s*ownerWorkerInstanceId/);
});
test('B1 RED: real old-worker bound remote resolution is recognized as exact historical token, not IDLE',async()=>{
 const e=env();let admission;
 await e.atomic.withAdmission('AUTONOMOUS:renewal-auto-phase4',async proof=>{
  admission=proof;e.later();await e.phase.begin(phaseArgs(proof));
  e.later();await e.phase.resolveVerified({renewalId:'renewal-001',attemptId:'phase-attempt-1'});
 });
 const session={async get(){return {};}},opts={
  storageLocal:e.storage,storageSession:session,workerInstanceId:'worker-after-restart',clock:()=>6000};
 const a=Additional.create(opts),p=Persisted.create(opts);
 const all=await a.observeAll(p);
 assert.equal(all.remoteAdmissionLineage.renewal.state,'token-bound-historical');
 assert.equal(all.remoteAdmissionLineage.renewal.entries[0].admissionToken,admission.token);
 assert.equal(all.remoteAdmissionLineage.renewal.entries[0].exactAttemptBound,true);
 assert.equal(all.remoteAdmissionLineage.exactAttemptBound,false);
 assert.equal(all.remoteAdmissionLineage.eligibleForLease,false);
 assert.equal(all.remoteAdmissionLineage.priorGenerationClosed,false);
 assert.equal(all.remoteAdmissionLineage.liveRemoteVerified,false);
 assert.notEqual(all.observations.renewal.state,'idle');
});
