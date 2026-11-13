// KAR-99 P1.3-F2E2D2A: RED-first, actual immutable P8 and real verified
// remote journal correlation. A worker/time overlap is NEVER a transaction link.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Persisted=require('../src/background/services/persisted-owner-observer.js');
const Additional=require('../src/background/services/additional-owner-observer.js');
const Phase4=require('../src/background/services/phase4-uncertainty-journal.js');
const Publish=require('../src/background/services/auto-publish-intent-journal.js');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
const PROFILE='profile-one',OLD='worker-before-restart',NOW='worker-restarted';
function store() {
 const rows={activeDetectedProfileV1:{profileId:PROFILE},
  selectedInventoryProfileV1:{profileId:PROFILE},renewalSessionsV1:{},
  archiveInsertionSessionsV1:{},templateFillSessions:{}};
 let writes=0;
 return {rows,get writes(){return writes;},
  async get(keys) {
   const names=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
   return Object.fromEntries(names.filter(k=>Object.hasOwn(rows,k))
    .map(k=>[k,structuredClone(rows[k])]));
  },async set(patch){writes++;Object.assign(rows,structuredClone(patch));}};
}
const session={async get(){return {};}};
function consumers(s) {
 const p=Persisted.create({storageLocal:s,storageSession:session,
  workerInstanceId:NOW,clock:()=>6000});
 const a=Additional.create({storageLocal:s,storageSession:session,
  workerInstanceId:NOW,clock:()=>6000});
 return {p,a,read:()=>a.observeAll(p)};
}
function admission(s,token,worker=OLD,start=500,end=2200,kind='AUTONOMOUS:renewal-auto-phase4') {
 s.rows[Atomic.START_PREFIX+token]={schema:1,state:'admitted',token,
  operationType:kind,workerInstanceId:worker,startedAtMs:start};
 if(end!==null)s.rows[Atomic.FINISH_PREFIX+token]={schema:1,state:'completed',
  token,workerInstanceId:worker,completedAtMs:end};
}
function assertNonAuthorizing(all) {
 assert.equal(all.eligibleForLease,false);
 assert.ok(Object.values(all.observations).every(v=>v.state!=='idle'));
 assert.equal(all.remoteAdmissionLineage.historicalOnly,true);
 assert.equal(all.remoteAdmissionLineage.eligibleForLease,false);
 assert.equal(all.remoteAdmissionLineage.exactAttemptBound,false);
 assert.equal(all.remoteAdmissionLineage.priorGenerationClosed,false);
 assert.equal(all.remoteAdmissionLineage.liveRemoteVerified,false);
}
async function resolvedPhase4(s,worker=OLD) {
 const journal=Phase4.create({storageLocal:s,clock:()=>1000,newToken:()=> 'attempt-001',
  workerInstanceId:worker,...require('./helpers/phase4-locks.cjs')(),
  verifyRemoteOutcome:x=>({profileId:x.profileId,sourceAdId:x.sourceAdId,
   newAdId:x.newAdId,sourceAbsent:true,targetPresent:true,
   sourceEvidence:'not-in-my-ads-full-pagination-scan',
   targetEvidence:'found-in-my-ads-full-pagination-scan',
   sourcePagesScanned:3,targetPagesScanned:3,targetFoundPage:2})});
 const receipt=await journal.begin({renewalId:'renewal-001',profileId:PROFILE,
  sourceAdId:'12345',newAdId:'56789'});
 await journal.resolveVerified({renewalId:receipt.renewalId,attemptId:receipt.attemptId});
 return receipt;
}
function lockManager() {
 let held=false;
 return {async request(name,options,fn) {
  assert.equal(name,Atomic.LOCK_NAME);
  assert.deepEqual(options,{mode:'exclusive',ifAvailable:true});
  if(held)return fn(null);
  held=true;try{return await fn({name});}finally{held=false;}
 }};
}
async function resolvedPublish(s) {
 const journal=Publish.create({storageLocal:s,lockManager:lockManager(),
  lockName:Atomic.LOCK_NAME,workerInstanceId:OLD,clock:()=>1000,
  newToken:()=> 'publish-001',verifyRemoteOutcome:(i,newAdId)=>({
   fillId:i.fillId,workflowId:i.workflowId,kind:i.kind,profileId:i.profileId,
   sourceAdId:i.sourceAdId,newAdId,targetPresent:true,
   targetEvidence:'found-in-my-ads-full-pagination-scan',
   targetPagesScanned:2,targetFoundPage:1})});
 await journal.begin({fillId:'fill-001',workflowId:'archive-001',
  kind:'archive',profileId:PROFILE,sourceAdId:'',targetTabId:22});
 await journal.resolveVerified({fillId:'fill-001',newAdId:'98765'});
}
test('F2E2D2A RED: real Phase4 remote resolution + old P8 worker overlap is only a candidate',async()=>{
 const s=store();admission(s,'old-token-001');await resolvedPhase4(s);
 const before=s.writes,all=await consumers(s).read();
 assertNonAuthorizing(all);assert.equal(s.writes,before);
 assert.equal(all.remoteAdmissionLineage.renewal.state,'possible-generation-overlap');
 const one=all.remoteAdmissionLineage.renewal.entries[0];
 assert.equal(one.owner,'renewal');assert.equal(one.attemptId,'attempt-001');
 assert.equal(one.profileId,PROFILE);assert.equal(one.sourceAdId,'12345');
 assert.equal(one.newAdId,'56789');assert.equal(one.intentWorkerInstanceId,OLD);
 assert.equal(one.intentCreatedAtMs,1000);
 assert.equal(one.candidateCount,1);assert.equal(one.exactAttemptBound,false);
 assert.equal(one.state,'possible-generation-overlap');
 assert.equal(all.admissionHistory.renewal.state,'callback-finished');
 assert.equal(all.observations.renewal.state,'unknown');
});
// KAR-171 W3D3B1: independently verified P8 callback completion and even
// verified REMOTE journal rows must not become reconciled old-worker ownership
// when their transaction's P8 admission token is absent or ambiguous.
test('KAR-171 W3D3B1 RED: tokenless Phase4 resolution never claims historical remote owner closure',async()=>{
 const s=store();admission(s,'old-token-001');await resolvedPhase4(s);
 const {p,a}=consumers(s);
 const matrix=await a.inspectAllOwnerClosureReadOnly(p);
 assert.equal(matrix.sourcesStable,true,'both real P8/owner observers remain stable');
 assert.equal(matrix.owners.renewal.remoteLineageState,'possible-generation-overlap');
 assert.equal(matrix.owners.renewal.status,'unverified',
   'a worker/time overlap without an exact token cannot reconcile remote owner closure');
 assert.equal(matrix.owners.renewal.remoteOutcomeVerified,false);
 assert.equal(matrix.eligibleForLease,false);
});
test('KAR-171 W3D3B1 RED: ambiguous matching workers cannot claim historical remote owner closure',async()=>{
 const s=store();admission(s,'ambiguous-001');admission(s,'ambiguous-002');
 await resolvedPhase4(s);
 const {p,a}=consumers(s),matrix=await a.inspectAllOwnerClosureReadOnly(p);
 assert.equal(matrix.owners.renewal.remoteLineageState,'ambiguous-generation-overlap');
 assert.equal(matrix.owners.renewal.status,'unverified');
 assert.equal(matrix.eligibleForLease,false);
});
test('KAR-171 W3D3B1 RED: archive publication requires exact old-worker remote lineage',async()=>{
 const s=store();admission(s,'archive-token-001',OLD,500,2200,
  'AUTONOMOUS:archive-postpublish-detached');
 await resolvedPublish(s);
 const {p,a}=consumers(s),matrix=await a.inspectAllOwnerClosureReadOnly(p);
 assert.equal(matrix.owners.archiveInsertion.remoteLineageState,'possible-generation-overlap');
 assert.equal(matrix.owners.archiveInsertion.status,'unverified');
 assert.equal(matrix.owners.archiveInsertion.remoteOutcomeVerified,false);
 assert.equal(matrix.eligibleForLease,false);
});
test('KAR-171 W3D3B1: purely local callback with no remote intent stays historical only',async()=>{
 const s=store();admission(s,'no-remote-001');
 const {p,a}=consumers(s),matrix=await a.inspectAllOwnerClosureReadOnly(p);
 assert.equal(matrix.owners.renewal.remoteLineageState,'no-evidence');
 assert.equal(matrix.owners.renewal.status,'historical-callback-settled');
 assert.equal(matrix.owners.renewal.remoteOutcomeVerified,false);
 assert.equal(matrix.eligibleForLease,false);
});
test('F2E2D2A RED: different worker cannot borrow independently verified remote evidence',async()=>{
 const s=store();admission(s,'new-token-001',NOW);await resolvedPhase4(s,OLD);
 const all=await consumers(s).read();assertNonAuthorizing(all);
 assert.equal(all.remoteAdmissionLineage.renewal.state,'no-generation-overlap');
 assert.equal(all.remoteAdmissionLineage.renewal.entries[0].candidateCount,0);
});
test('F2E2D2A RED: matching worker but callback already finished before remote intent is not a source match',async()=>{
 const s=store();admission(s,'stale-token-001',OLD,200,800);await resolvedPhase4(s);
 const all=await consumers(s).read();assertNonAuthorizing(all);
 assert.equal(all.remoteAdmissionLineage.renewal.state,'no-generation-overlap');
});
test('F2E2D2A RED: two indistinguishable P8 candidates cannot become unique operation identity',async()=>{
 const s=store();admission(s,'ambiguous-001');admission(s,'ambiguous-002');
 await resolvedPhase4(s);
 const all=await consumers(s).read();assertNonAuthorizing(all);
 assert.equal(all.remoteAdmissionLineage.renewal.state,'ambiguous-generation-overlap');
 assert.equal(all.remoteAdmissionLineage.renewal.entries[0].candidateCount,2);
 assert.equal(all.remoteAdmissionLineage.renewal.exactAttemptBound,false);
});
test('F2E2D2A RED: a real verified archive publish is scoped to archive owner only',async()=>{
 const s=store();admission(s,'archive-token-001',OLD,500,2200,
  'AUTONOMOUS:archive-postpublish-detached');
 await resolvedPublish(s);
 const all=await consumers(s).read();assertNonAuthorizing(all);
 assert.equal(all.remoteAdmissionLineage.archiveInsertion.state,'possible-generation-overlap');
 assert.equal(all.remoteAdmissionLineage.archiveInsertion.entries[0].newAdId,'98765');
 assert.equal(all.remoteAdmissionLineage.archiveInsertion.entries[0].intentCreatedAtMs,1000);
 assert.equal(all.remoteAdmissionLineage.archiveInsertion.entries[0].candidateCount,1);
 assert.equal(all.remoteAdmissionLineage.archiveInsertion.exactAttemptBound,false);
 assert.equal(all.remoteAdmissionLineage.renewal.state,'no-evidence');
});
test('F2E2D2A RED: missing remote terminal result cannot be reconciled by a completed callback',async()=>{
 const s=store();admission(s,'unverified-token-001');
 const journal=Phase4.create({storageLocal:s,clock:()=>1000,
  newToken:()=> 'attempt-001',workerInstanceId:OLD,
  ...require('./helpers/phase4-locks.cjs')()});
 await journal.begin({renewalId:'renewal-001',profileId:PROFILE,
  sourceAdId:'12345',newAdId:'56789'});
 const all=await consumers(s).read();assertNonAuthorizing(all);
 assert.equal(all.remoteAdmissionLineage.renewal.state,'unverified');
 assert.deepEqual(all.remoteAdmissionLineage.renewal.entries,[]);
});
test('F2E2D2A RED: changed local account profile cannot associate remote old-profile resolution',async()=>{
 const s=store();admission(s,'profile-token-001');await resolvedPhase4(s);
 s.rows.selectedInventoryProfileV1={profileId:'different-profile'};
 const all=await consumers(s).read();assertNonAuthorizing(all);
 assert.equal(all.remoteAdmissionLineage.renewal.state,'unverified');
 assert.deepEqual(all.remoteAdmissionLineage.renewal.entries,[]);
});
test('F2E2D2A RED: mismatched independent P8 owner revisions suppress all lineage',async()=>{
 const s=store();admission(s,'original-001');await resolvedPhase4(s);
 const sources=consumers(s);const valid=await sources.p.observe();
 const spoof={observe:async()=>({...valid,admissionJournalRevision:'changed'})};
 const all=await sources.a.observeAll(spoof);
 assertNonAuthorizing(all);
 assert.equal(all.remoteAdmissionLineage.renewal.state,'unverified');
 assert.deepEqual(all.remoteAdmissionLineage.renewal.entries,[]);
});
