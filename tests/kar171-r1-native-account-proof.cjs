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
  failRemote:false,afterRemote:null,remoteStages:[],storageUnavailableAfterRemote:false,
  failInitialOriginalSnapshot:false};
 const local={
  async get(keys){
   if(state.failInitialOriginalSnapshot && keys===null && state.remoteCalls===0)
     throw Error('SENSITIVE_INITIAL_STORAGE_ERROR');
   if(state.storageUnavailableAfterRemote && keys===null)throw Error('PRIVATE_STORAGE_ERROR');
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
  verifyFreshPhase4RemoteOutcomeReadOnly:async(_receipt,onStage)=>{
   state.remoteCalls++;
   for(const code of state.remoteStages)onStage(code);
   if(state.afterRemote)state.afterRemote(rows,state);
   if(state.failRemote)throw Error('UNVERIFIED_NETWORK_PRIVATE_PROFILE');
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
test('R1 original snapshot read error gets bounded phase-specific status',async()=>{
 const f=fixture();f.state.failInitialOriginalSnapshot=true;
 const x=await inspect(f);
 assert.equal(x.status,'ORIGINAL_INITIAL_SNAPSHOT_UNAVAILABLE');
 denied(x);assert.equal(f.state.remoteCalls,0);assert.equal(f.state.writes,0);
 assert.ok(!JSON.stringify(x).includes('SENSITIVE_INITIAL_STORAGE_ERROR'));
});
test('R1 completed history original snapshot failure stays blocked before source scan',async()=>{
 const f=completedOriginal();f.state.failInitialOriginalSnapshot=true;
 const x=await inspect(f);
 assert.equal(x.status,'ORIGINAL_INITIAL_SNAPSHOT_UNAVAILABLE');
 denied(x);assert.equal(f.state.remoteCalls,0);
});
test('R1 postscan serialisation failure returns bounded stability exception, never storage data',async()=>{
 const f=completedOriginal();
 f.state.afterRemote=rows=>{rows[PHASE+RENEWAL+'_'+PHASE_ATTEMPT].createdAtMs=BigInt(202);};
 const x=await inspect(f);
 assert.equal(x.status,'ORIGINAL_STABILITY_CHECK_UNAVAILABLE');
 denied(x);assert.equal(f.state.remoteCalls,1);assert.equal(f.state.writes,0);
 for(const secret of [NAME,UUID,SOURCE,TARGET,RENEWAL,FILL,PHASE_TOKEN,PUB_TOKEN])
   assert.ok(!JSON.stringify(x).includes(secret));
});
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
function completedOriginal(){
 const f=fixture();
 // Production successful Phase4 promotes inventory and removes these two
 // transient session records; the original P8 + remote receipts must survive.
 delete f.state.rows.renewalSessionsV1[RENEWAL];
 delete f.state.rows.templateFillSessions[FILL];
 return f;
}
test('completed original P8 + BOTH removed temporary sessions can retain historical proof',async()=>{
 const f=completedOriginal(),x=await inspect(f);
 assert.equal(x.status,'ORIGINAL_ACCOUNT_REMOTE_VERIFIED');
 assert.equal(x.liveRemoteVerified,true);
 assert.equal(x.r1Accepted,false);
 assert.equal(x.eligibleForLease,false);
 assert.equal(f.state.remoteCalls,1);
 assert.equal(f.state.writes,0);
 for(const secret of [NAME,UUID,SOURCE,TARGET,RENEWAL,FILL,PHASE_TOKEN,PUB_TOKEN])
   assert.ok(!JSON.stringify(x).includes(secret));
});
test('R1 classifies missing authenticated live My Ads separately from internal UUID',async()=>{
 const f=completedOriginal();f.state.tabs=[];
 const x=await inspect(f);assert.equal(x.status,'R1_ACCOUNT_LIVE_SITE_OR_PROFILE_UNVERIFIED');
 denied(x);assert.equal(f.state.remoteCalls,0);assert.equal(f.state.writes,0);
});
test('R1 does not confuse original publish UUID mismatch with a site-account name mismatch',async()=>{
 const f=completedOriginal();
 f.state.rows[PUB+FILL+'_'+PUB_ATTEMPT].profileId='other-private-profile-uuid';
 f.state.rows[PUBRESULT+FILL+'_'+PUB_ATTEMPT].profileId='other-private-profile-uuid';
 const x=await inspect(f);assert.equal(x.status,'R1_ACCOUNT_PUBLICATION_UUID_UNVERIFIED');
 denied(x);assert.equal(f.state.remoteCalls,0);assert.equal(f.state.writes,0);
 for(const secret of [NAME,UUID,SOURCE,TARGET,'other-private-profile-uuid'])
  assert.ok(!JSON.stringify(x).includes(secret));
});
test('R1 distinguishes mismatched historical Phase4 name from live matched account',async()=>{
 const f=completedOriginal();
 f.state.rows[PHASE+RENEWAL+'_'+PHASE_ATTEMPT].profileId='other-original-account';
 f.state.rows[RESULT+RENEWAL+'_'+PHASE_ATTEMPT].profileId='other-original-account';
 const x=await inspect(f);assert.equal(x.status,'R1_ACCOUNT_PHASE4_NAME_UNVERIFIED');
 denied(x);assert.equal(f.state.remoteCalls,0);assert.equal(f.state.writes,0);
});
test('R1 internal selected UUID mismatch is distinct and never creates remote approval',async()=>{
 const f=completedOriginal();
 f.state.rows.selectedInventoryProfileV1.profileId='other-local-uuid';
 const x=await inspect(f);assert.equal(x.status,'R1_ACCOUNT_LIVE_SITE_OR_PROFILE_UNVERIFIED');
 denied(x);assert.equal(f.state.remoteCalls,0);assert.equal(f.state.writes,0);
});
test('generic runtime remote commit gate cannot borrow original completed-history path',async()=>{
 const f=completedOriginal();
 const phase=f.state.rows[PHASE+RENEWAL+'_'+PHASE_ATTEMPT];
 const pub=f.state.rows[PUB+FILL+'_'+PUB_ATTEMPT];
 assert.equal(await f.observer.verifyRemoteCommitContextReadOnly(phase,'phase4'),false);
 assert.equal(await f.observer.verifyRemoteCommitContextReadOnly(pub,'publish'),false);
 assert.equal(await f.observer.verifyRemoteCommitContextReadOnly(phase,'phase4',null,Symbol.for('completed')),false);
 assert.equal(f.state.remoteCalls,0);
});
test('partial deleted renewal session is not completed-history proof',async()=>{
 const f=fixture(); delete f.state.rows.renewalSessionsV1[RENEWAL];
 const x=await inspect(f);denied(x);assert.equal(f.state.remoteCalls,0);
});
test('partial deleted fill session is not completed-history proof',async()=>{
 const f=fixture();delete f.state.rows.templateFillSessions[FILL];
 const x=await inspect(f);denied(x);assert.equal(f.state.remoteCalls,0);
});
test('sessionless original with unverifiable Phase4 P8 remains blocked',async()=>{
 const f=completedOriginal();delete f.state.rows[FINISH+PHASE_TOKEN];
 const x=await inspect(f);denied(x);assert.equal(f.state.remoteCalls,0);
});
test('sessionless original with unverifiable publication P8 remains blocked',async()=>{
 const f=completedOriginal();delete f.state.rows[FINISH+PUB_TOKEN];
 const x=await inspect(f);denied(x);assert.equal(f.state.remoteCalls,0);
});
test('sessionless original with changed original Phase4 verification remains blocked',async()=>{
 const f=completedOriginal();f.state.rows[RESULT+RENEWAL+'_'+PHASE_ATTEMPT].newAdId='3333333';
 const x=await inspect(f);denied(x);assert.equal(f.state.remoteCalls,0);
});
test('sessionless original with changed published target remains blocked',async()=>{
 const f=completedOriginal();f.state.rows[PUBRESULT+FILL+'_'+PUB_ATTEMPT].newAdId='3333333';
 const x=await inspect(f);denied(x);assert.equal(f.state.remoteCalls,0);
});
test('sessionless original with different original profile display name remains blocked',async()=>{
 const f=completedOriginal();f.state.rows[PHASE+RENEWAL+'_'+PHASE_ATTEMPT].profileId='different-owner';
 const x=await inspect(f);denied(x);assert.equal(f.state.remoteCalls,0);
});
test('sessionless original with different original publication UUID remains blocked',async()=>{
 const f=completedOriginal();
 f.state.rows[PUB+FILL+'_'+PUB_ATTEMPT].profileId='different-uuid';
 f.state.rows[PUBRESULT+FILL+'_'+PUB_ATTEMPT].profileId='different-uuid';
 const x=await inspect(f);denied(x);assert.equal(f.state.remoteCalls,0);
});
test('sessionless original cannot verify when current live account is different',async()=>{
 const f=completedOriginal();f.state.accountName='different-owner';
 const x=await inspect(f);denied(x);assert.equal(f.state.remoteCalls,0);
});
test('sessionless original requires fresh remote scan and rejects unavailable outcome',async()=>{
 const f=completedOriginal();f.state.failRemote=true;
 const x=await inspect(f);denied(x);assert.equal(f.state.remoteCalls,1);
});
test('sessionless original rejects a live account switch during fresh scan',async()=>{
 const f=completedOriginal();f.state.afterRemote=(_,s)=>{s.accountName='different-owner';};
 const x=await inspect(f);denied(x);assert.equal(f.state.remoteCalls,1);
});
test('sessionless original rejects original P8 changes during remote scan',async()=>{
 const f=completedOriginal();f.state.afterRemote=rows=>{
  rows[FINISH+PUB_TOKEN].completedAtMs++;
 };
 const x=await inspect(f);denied(x);assert.equal(f.state.remoteCalls,1);
});
test('sessionless original rejects new transient session appearing during remote scan',async()=>{
 const f=completedOriginal();f.state.afterRemote=rows=>{
  rows.renewalSessionsV1[RENEWAL]={profileId:UUID};
 };
 const x=await inspect(f);denied(x);assert.equal(f.state.remoteCalls,1);
});
test('sessionless original rejects publication ambiguity rather than picking convenient receipt',async()=>{
 const f=completedOriginal();f.state.rows[PUB+'different-fill_second-attempt']={
  ...f.state.rows[PUB+FILL+'_'+PUB_ATTEMPT],fillId:'different-fill',attemptId:'second-attempt'
 };
 const x=await inspect(f);denied(x);assert.equal(f.state.remoteCalls,0);
});
test('remote exception is diagnosed by closed enum milestone, never exception text or IDs',async()=>{
 const cases=[
  ['START','R1_REMOTE_SCAN_NOT_STARTED'],
  ['SOURCE_TAB_REQUESTED','R1_REMOTE_SOURCE_TAB_CREATE_FAILED'],
  ['SOURCE_TAB_CREATED','R1_REMOTE_SOURCE_TAB_LOAD_FAILED'],
  ['SOURCE_TAB_LOADED','R1_REMOTE_SOURCE_CONTENT_FAILED'],
  ['SOURCE_CONTENT_READY','R1_REMOTE_SOURCE_ACCOUNT_FAILED'],
  ['SOURCE_ACCOUNT_OK','R1_REMOTE_SOURCE_QUERY_FAILED'],
  ['SOURCE_QUERY_RETURNED','R1_REMOTE_SOURCE_ACCOUNT_RECHECK_FAILED'],
  ['SOURCE_ACCOUNT_RECHECKED','R1_REMOTE_SOURCE_EVIDENCE_FAILED'],
  ['SOURCE_RESULT_VERIFIED','R1_REMOTE_TARGET_NOT_STARTED'],
  ['TARGET_TAB_REQUESTED','R1_REMOTE_TARGET_TAB_CREATE_FAILED'],
  ['TARGET_TAB_CREATED','R1_REMOTE_TARGET_TAB_LOAD_FAILED'],
  ['TARGET_TAB_LOADED','R1_REMOTE_TARGET_CONTENT_FAILED'],
  ['TARGET_CONTENT_READY','R1_REMOTE_TARGET_ACCOUNT_FAILED'],
  ['TARGET_ACCOUNT_OK','R1_REMOTE_TARGET_QUERY_FAILED'],
  ['TARGET_QUERY_RETURNED','R1_REMOTE_TARGET_ACCOUNT_RECHECK_FAILED'],
  ['TARGET_ACCOUNT_RECHECKED','R1_REMOTE_TARGET_EVIDENCE_FAILED'],
  ['TARGET_RESULT_VERIFIED','R1_REMOTE_FINAL_RESPONSE_FAILED']
 ];
 for(const [stage,status] of cases) {
   const f=completedOriginal();f.state.remoteStages=stage==='START'?[]:[stage];
   f.state.failRemote=true;
   const result=await inspect(f);
   assert.equal(result.status,status,stage);
   denied(result);
   assert.equal(f.state.remoteCalls,1);
   assert.equal(f.state.writes,0);
   const output=JSON.stringify(result);
   for(const secret of [NAME,UUID,SOURCE,TARGET,RENEWAL,FILL,
     PHASE_TOKEN,PUB_TOKEN,'UNVERIFIED_NETWORK_PRIVATE_PROFILE'])
      assert.ok(!output.includes(secret),'no origin or remote exception exposure');
 }
});
test('unknown injected milestone cannot manufacture success or disclose arbitrary status',async()=>{
 const f=completedOriginal();f.state.remoteStages=['PERSONAL_EMAIL_EXPOSED'];
 f.state.failRemote=true;const result=await inspect(f);
 assert.equal(result.status,'R1_REMOTE_SCAN_NOT_STARTED');
 denied(result);assert.equal(f.state.remoteCalls,1);
});
test('storage readback exception after successful source+target is independently diagnosed and denied',async()=>{
 const f=completedOriginal();
 f.state.remoteStages=['SOURCE_RESULT_VERIFIED','TARGET_RESULT_VERIFIED'];
 f.state.afterRemote=(_,state)=>{state.storageUnavailableAfterRemote=true;};
 const result=await inspect(f);
 assert.equal(result.status,'ORIGINAL_READBACK_UNAVAILABLE');
 denied(result);assert.equal(f.state.remoteCalls,1);
});
test('remote scan milestones cannot turn an account switch into success',async()=>{
 const f=completedOriginal();
 f.state.remoteStages=['SOURCE_RESULT_VERIFIED','TARGET_RESULT_VERIFIED'];
 f.state.afterRemote=(_,s)=>{s.accountName='different-owner';};
 const result=await inspect(f);
 assert.equal(result.status,'LIVE_ACCOUNT_CHANGED_DURING_SCAN');
 denied(result);
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
