// KAR-171 R1 — original Phase4+publish P8, live account and fresh My Ads.
// Fake account + scans ONLY; no real browser/network/storage mutation.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Owners=require('../src/background/services/additional-owner-observer.js');
const NAME='test-owner',UUID='stable-profile-uuid',SOURCE='123456789',TARGET='987654321';
const RENEWAL='renewal-original',FILL='fill-original',PHASE_ATTEMPT='phase-attempt';
const PUB_ATTEMPT='publish-attempt',PHASE_TOKEN='phase-token-original123',PUB_TOKEN='publish-token-original123';
const URL='https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS';
const PHASE='karPhase4UncertainAttemptV1_',RESULT='karPhase4VerifiedResolutionV1_';
const PUB='karAutoPublishIntentV1_',PUBRESULT='karAutoPublishVerifiedResolutionV1_';
const START='karAtomicAdmissionStartV1_',FINISH='karAtomicAdmissionFinishV1_';
function fixture(){
 const phase={schema:1,state:'outcome-unverified',renewalId:RENEWAL,attemptId:PHASE_ATTEMPT,
  workerInstanceId:'old-worker-phase',profileId:NAME,sourceAdId:SOURCE,newAdId:TARGET,
  createdAtMs:200,admissionToken:PHASE_TOKEN};
 const publish={schema:1,state:'outcome-unverified',fillId:FILL,workflowId:RENEWAL,
  attemptId:PUB_ATTEMPT,workerInstanceId:'old-worker-publish',kind:'renewal',
  profileId:UUID,sourceAdId:SOURCE,targetTabId:11,createdAtMs:100,
  admissionToken:PUB_TOKEN};
 const rows={
  profilesV1:[{profileId:UUID,displayName:NAME,normalizedName:NAME}],
  activeDetectedProfileV1:{profileId:UUID},
  selectedInventoryProfileV1:{profileId:UUID},
  renewalSessionsV1:{[RENEWAL]:{renewalId:RENEWAL,profileId:UUID,fillId:FILL,
    sourceAdId:SOURCE,newAdId:TARGET,targetTabId:11}},
  templateFillSessions:{[FILL]:{fillId:FILL,renewalId:RENEWAL,
    sourceAdId:SOURCE,targetTabId:11}},
  [PHASE+RENEWAL+'_'+PHASE_ATTEMPT]:phase,
  [RESULT+RENEWAL+'_'+PHASE_ATTEMPT]:{schema:1,state:'resolved-confirmed',
    renewalId:RENEWAL,attemptId:PHASE_ATTEMPT,workerInstanceId:'later-verifier',
    profileId:NAME,sourceAdId:SOURCE,newAdId:TARGET,
    sourceEvidence:'not-in-my-ads-full-pagination-scan',
    targetEvidence:'found-in-my-ads-full-pagination-scan',
    sourcePagesScanned:2,targetPagesScanned:2,targetFoundPage:1,verifiedAtMs:550},
  [PUB+FILL+'_'+PUB_ATTEMPT]:publish,
  [PUBRESULT+FILL+'_'+PUB_ATTEMPT]:{schema:1,state:'resolved-confirmed',
    fillId:FILL,workflowId:RENEWAL,attemptId:PUB_ATTEMPT,kind:'renewal',
    profileId:UUID,sourceAdId:SOURCE,newAdId:TARGET,targetTabId:11,
    targetPresent:true,targetEvidence:'found-in-my-ads-full-pagination-scan',
    targetPagesScanned:2,targetFoundPage:1,verifiedAtMs:450},
  [START+PHASE_TOKEN]:{schema:1,state:'admitted',token:PHASE_TOKEN,
    workerInstanceId:'old-worker-phase',operationType:'AUTONOMOUS:renewal-auto-phase4',startedAtMs:170},
  [FINISH+PHASE_TOKEN]:{schema:1,state:'completed',token:PHASE_TOKEN,
    workerInstanceId:'old-worker-phase',completedAtMs:600},
  [START+PUB_TOKEN]:{schema:1,state:'admitted',token:PUB_TOKEN,
    workerInstanceId:'old-worker-publish',operationType:'AUTONOMOUS:renewal-publish-detection',startedAtMs:90},
  [FINISH+PUB_TOKEN]:{schema:1,state:'completed',token:PUB_TOKEN,
    workerInstanceId:'old-worker-publish',completedAtMs:500}
 };
 const state={rows,remoteCalls:0,writes:0,accountName:NAME,tabs:[{id:7,url:URL}],
  failRemote:false,afterRemote:null};
 const local={
  async get(keys){
   const names=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
   return Object.fromEntries(names.filter(k=>Object.hasOwn(rows,k))
     .map(k=>[k,structuredClone(rows[k])]));
  },set(){state.writes++;throw Error('STORAGE_WRITE_FORBIDDEN');}
 };
 const observer=Owners.create({
  storageLocal:local,storageSession:{async get(){return {};}},
  workerInstanceId:'current-worker',clock:()=>2000,
  queryBrowserTabsReadOnly:async()=>structuredClone(state.tabs),
  readAccountPageStatusReadOnly:async()=>({
   pageType:'my-ads',url:URL,auth:{loggedIn:true},profileName:state.accountName
  }),
  verifyFreshPhase4RemoteOutcomeReadOnly:async()=>{
   state.remoteCalls++;
   if(state.afterRemote)state.afterRemote(rows,state);
   if(state.failRemote)throw Error('UNVERIFIED_NETWORK');
   return {profileId:NAME,sourceAdId:SOURCE,newAdId:TARGET,
    sourceAbsent:true,targetPresent:true,
    sourceEvidence:'not-in-my-ads-full-pagination-scan',
    targetEvidence:'found-in-my-ads-full-pagination-scan',
    sourcePagesScanned:2,targetPagesScanned:2,targetFoundPage:1};
  }
 });
 return {state,observer};
}
const inspect=f=>f.observer.inspectOriginalRenewalRemoteLineageReadOnly({
 renewalId:RENEWAL,attemptId:PHASE_ATTEMPT});
function denied(result){
 assert.equal(result.liveRemoteVerified,false);
 assert.equal(result.r1Accepted,false);
 assert.equal(result.eligibleForLease,false);
}
test('two original completed P8s, verified same account and fresh source/target can prove ONLY R1 remote subcase',async()=>{
 const f=fixture();const x=await inspect(f);
 assert.equal(x.status,'ORIGINAL_ACCOUNT_REMOTE_VERIFIED');
 assert.equal(x.liveRemoteVerified,true);
 assert.equal(x.r1Accepted,false);
 assert.equal(x.eligibleForLease,false);
 assert.equal(f.state.remoteCalls,1);
 assert.equal(f.state.writes,0);
 for(const secret of [NAME,UUID,SOURCE,TARGET,RENEWAL,FILL,PHASE_TOKEN,PUB_TOKEN])
  assert.ok(!JSON.stringify(x).includes(secret),'sanitized result');
});
test('historical target receipts alone are insufficient without live account',async()=>{
 const f=fixture();f.state.tabs=[];const x=await inspect(f);
 denied(x);assert.equal(f.state.remoteCalls,0);
});
test('different live My Ads account fails before remote scan',async()=>{
 const f=fixture();f.state.accountName='another-owner';const x=await inspect(f);
 denied(x);assert.equal(f.state.remoteCalls,0);
});
test('missing or unfinished old Phase4 P8 cannot be repaired by fresh remote listing',async()=>{
 const f=fixture();delete f.state.rows[FINISH+PHASE_TOKEN];const x=await inspect(f);
 denied(x);assert.equal(f.state.remoteCalls,0);
});
test('missing old publish P8 cannot be borrowed from Phase4',async()=>{
 const f=fixture();delete f.state.rows[START+PUB_TOKEN];const x=await inspect(f);
 denied(x);assert.equal(f.state.remoteCalls,0);
});
test('changed worker identity prevents original publish matching',async()=>{
 const f=fixture();f.state.rows[FINISH+PUB_TOKEN].workerInstanceId='other-worker';const x=await inspect(f);
 denied(x);assert.equal(f.state.remoteCalls,0);
});
test('wrong published target prevents original same-target provenance',async()=>{
 const f=fixture();f.state.rows[PUBRESULT+FILL+'_'+PUB_ATTEMPT].newAdId='999999999';const x=await inspect(f);
 denied(x);assert.equal(f.state.remoteCalls,0);
});
test('wrong original Phase4 account is not replaced with mutable profile label',async()=>{
 const f=fixture();f.state.rows[PHASE+RENEWAL+'_'+PHASE_ATTEMPT].profileId='other-account';const x=await inspect(f);
 denied(x);assert.equal(f.state.remoteCalls,0);
});
test('changed selected UUID fails closed',async()=>{
 const f=fixture();f.state.rows.selectedInventoryProfileV1.profileId='different-uuid';const x=await inspect(f);
 denied(x);assert.equal(f.state.remoteCalls,0);
});
test('missing or contradictory renewal/fill session fails closed',async()=>{
 const f=fixture();f.state.rows.templateFillSessions[FILL].targetTabId=99;const x=await inspect(f);
 denied(x);assert.equal(f.state.remoteCalls,0);
});
test('fresh remote target absent always fails even with valid old resolution',async()=>{
 const f=fixture();f.state.failRemote=true;const x=await inspect(f);
 denied(x);assert.equal(f.state.remoteCalls,1);
});
test('identity changing during asynchronous fresh scan fails at final live recheck',async()=>{
 const f=fixture();f.state.afterRemote=(_,s)=>{s.accountName='other-owner';};
 const x=await inspect(f);denied(x);assert.equal(f.state.remoteCalls,1);
});
test('original storage changing during remote scan fails immutable double-read',async()=>{
 const f=fixture();f.state.afterRemote=rows=>{
  rows[PUBRESULT+FILL+'_'+PUB_ATTEMPT].verifiedAtMs++;
 };
 const x=await inspect(f);denied(x);assert.equal(f.state.remoteCalls,1);
});
test('original remote response mismatch cannot manufacture success',async()=>{
 const f=fixture();f.state.afterRemote=null;
 const first=f.observer;
 // Testing a missing remote port requires a separate observer with default options.
 const unknown=Owners.create({storageLocal:{get:async keys=>keys===null?f.state.rows:{}},
  storageSession:{get:async()=>({})},workerInstanceId:'current-worker'});
 const x=await unknown.inspectOriginalRenewalRemoteLineageReadOnly({renewalId:RENEWAL,attemptId:PHASE_ATTEMPT});
 denied(x);assert.equal(f.state.remoteCalls,0);
});
