// KAR-99 P1.3-F2E2C: test-first real, read-only historical remote outcomes.
// Callback completion is not remote settlement and neither implies owner IDLE.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Observer=require('../src/background/services/persisted-owner-observer.js');
const Phase4=require('../src/background/services/phase4-uncertainty-journal.js');
const Publish=require('../src/background/services/auto-publish-intent-journal.js');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
const PROFILE='profile-1';
function store(){
 const rows={activeDetectedProfileV1:{profileId:PROFILE},
   selectedInventoryProfileV1:{profileId:PROFILE},renewalSessionsV1:{},
   archiveInsertionSessionsV1:{},templateFillSessions:{}};
 let writes=0,remoteReads=0,onSecond=null;
 return {rows,get writes(){return writes;},
  onSecond(fn){onSecond=fn;remoteReads=0;},
  async get(keys){
   if(keys===null&&++remoteReads===2&&onSecond)onSecond(rows);
   const names=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
   return Object.fromEntries(names.filter(k=>Object.hasOwn(rows,k))
     .map(k=>[k,structuredClone(rows[k])]));
  },
  async set(value){writes++;Object.assign(rows,structuredClone(value));}
 };
}
function observer(s){return Observer.create({
 storageLocal:s,storageSession:{get:async()=>({})},clock:()=>4500,
 workerInstanceId:'worker-after-restart'
});}
const remoteProof=r=>({
 profileId:r.profileId,sourceAdId:r.sourceAdId,newAdId:r.newAdId,
 sourceAbsent:true,targetPresent:true,
 sourceEvidence:'not-in-my-ads-full-pagination-scan',
 targetEvidence:'found-in-my-ads-full-pagination-scan',
 sourcePagesScanned:3,targetPagesScanned:2,targetFoundPage:2
});
async function phase4(s){
 const journal=Phase4.create({
  storageLocal:s,clock:()=>1000,newToken:()=> 'attempt-id-1',
  workerInstanceId:'original-worker',
  verifyRemoteOutcome:remoteProof,
  ...require('./helpers/phase4-locks.cjs')()
 });
 const intent=await journal.begin({renewalId:'renewal-1',profileId:PROFILE,
  sourceAdId:'12345',newAdId:'67890'});
 return {journal,intent};
}
function nonAuthorizing(o){
 assert.equal(o.eligibleForLease,false);
 assert.equal(o.remoteOutcomeEvidence.historicalOnly,true);
 assert.equal(o.remoteOutcomeEvidence.liveAccountVerified,false);
 assert.ok(Object.values(o.observations).every(r=>r.state==='active'||r.state==='unknown'));
}
test('F2E2C RED: independently verified Phase-4 exact-Ad-ID and worker revision survives restart',async()=>{
 const s=store(),{journal,intent}=await phase4(s);
 const unfinished=await observer(s).observe();
 assert.equal(unfinished.remoteOutcomeEvidence.phase4.state,'unresolved');
 assert.deepEqual(unfinished.remoteOutcomeEvidence.phase4.revisions,[]);
 await journal.resolveVerified({renewalId:intent.renewalId,attemptId:intent.attemptId});
 const writes=s.writes,done=await observer(s).observe();
 nonAuthorizing(done);
 assert.equal(done.remoteOutcomeEvidence.phase4.state,'resolved');
 const rows=done.remoteOutcomeEvidence.phase4.revisions;
 assert.equal(rows.length,1);
 assert.equal(rows[0].owner,'renewal');
 assert.equal(rows[0].profileId,PROFILE);
 assert.equal(rows[0].sourceAdId,'12345');
 assert.equal(rows[0].newAdId,'67890');
 assert.equal(rows[0].intentWorkerInstanceId,'original-worker');
 assert.equal(rows[0].resolverWorkerInstanceId,'original-worker');
 assert.equal(rows[0].attemptId,'attempt-id-1');
 assert.ok(rows[0].sourceRevision.includes('67890'));
 assert.equal(done.observations.renewal.state,'unknown');
 assert.equal(s.writes,writes);
});
test('F2E2C RED: tampered terminal Ad-ID or account profile cannot provide a revision',async()=>{
 const s=store(),{journal,intent}=await phase4(s);
 await journal.resolveVerified({renewalId:intent.renewalId,attemptId:intent.attemptId});
 s.rows[Phase4.RESOLUTION_KEY_PREFIX+'renewal-1_attempt-id-1'].newAdId='99999';
 const tampered=await observer(s).observe();
 nonAuthorizing(tampered);
 assert.equal(tampered.remoteOutcomeEvidence.phase4.state,'corrupt');
 assert.deepEqual(tampered.remoteOutcomeEvidence.phase4.revisions,[]);
 s.rows[Phase4.RESOLUTION_KEY_PREFIX+'renewal-1_attempt-id-1'].newAdId='67890';
 s.rows.selectedInventoryProfileV1={profileId:'other-profile'};
 const switched=await observer(s).observe();
 nonAuthorizing(switched);
 assert.notEqual(switched.remoteOutcomeEvidence.phase4.state,'resolved');
 assert.deepEqual(switched.remoteOutcomeEvidence.phase4.revisions,[]);
});
test('F2E2C RED: changed independent remote journal between two reads is UNKNOWN',async()=>{
 const s=store(),{journal,intent}=await phase4(s);
 await journal.resolveVerified({renewalId:intent.renewalId,attemptId:intent.attemptId});
 s.onSecond(rows=>{rows[Phase4.RESOLUTION_KEY_PREFIX+'renewal-1_attempt-id-1'].targetFoundPage=3;});
 const changed=await observer(s).observe();
 nonAuthorizing(changed);
 assert.equal(changed.remoteOutcomeEvidence.phase4.state,'changed');
 assert.deepEqual(changed.remoteOutcomeEvidence.phase4.revisions,[]);
});
test('F2E2C RED: independently verified archive publish revision retains source, target and worker',async()=>{
 const s=store();
 let held=false;
 const lockManager={async request(name,opts,cb){
   assert.equal(name,Atomic.LOCK_NAME);
   assert.deepEqual(opts,{mode:'exclusive',ifAvailable:true});
   if(held)return cb(null);
   held=true;try{return await cb({name});}finally{held=false;}
 }};
 const journal=Publish.create({
  storageLocal:s,lockManager,lockName:Atomic.LOCK_NAME,
  workerInstanceId:'publish-worker',clock:()=>2000,
  newToken:()=> 'publish-attempt-1',
  verifyRemoteOutcome:(intent,newAdId)=>({
   fillId:intent.fillId,workflowId:intent.workflowId,
   kind:intent.kind,profileId:intent.profileId,
   sourceAdId:intent.sourceAdId,newAdId,
   targetPresent:true,targetEvidence:'found-in-my-ads-full-pagination-scan',
   targetPagesScanned:3,targetFoundPage:1
  })
 });
 await journal.begin({fillId:'fill-1',workflowId:'archive-1',kind:'archive',
  profileId:PROFILE,sourceAdId:'',targetTabId:18});
 const pending=await observer(s).observe();
 nonAuthorizing(pending);
 assert.equal(pending.remoteOutcomeEvidence.publish.state,'unresolved');
 assert.deepEqual(pending.remoteOutcomeEvidence.publish.revisions,[]);
 await journal.resolveVerified({fillId:'fill-1',newAdId:'99887'});
 const writes=s.writes,done=await observer(s).observe();
 nonAuthorizing(done);
 assert.equal(done.remoteOutcomeEvidence.publish.state,'resolved');
 const rows=done.remoteOutcomeEvidence.publish.revisions;
 assert.equal(rows.length,1);
 assert.equal(rows[0].owner,'archiveInsertion');
 assert.equal(rows[0].kind,'archive');
 assert.equal(rows[0].fillId,'fill-1');
 assert.equal(rows[0].workflowId,'archive-1');
 assert.equal(rows[0].profileId,PROFILE);
 assert.equal(rows[0].newAdId,'99887');
 assert.equal(rows[0].intentWorkerInstanceId,'publish-worker');
 assert.equal(rows[0].resolverWorkerInstanceId,null);
 assert.ok(rows[0].sourceRevision.includes('99887'));
 assert.equal(done.observations.archiveInsertion.state,'unknown');
 assert.equal(writes,s.writes);
});
test('F2E2C RED: historical settlement does not hide independently running renewal',async()=>{
 const s=store(),{journal,intent}=await phase4(s);
 await journal.resolveVerified({renewalId:intent.renewalId,attemptId:intent.attemptId});
 s.rows.renewalSessionsV1={next:{status:'verifying'}};
 const o=await observer(s).observe();
 nonAuthorizing(o);
 assert.equal(o.remoteOutcomeEvidence.phase4.state,'resolved');
 assert.equal(o.observations.renewal.state,'active');
});
