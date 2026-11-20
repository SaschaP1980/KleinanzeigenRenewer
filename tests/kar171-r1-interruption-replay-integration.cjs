// KAR-171 R1: cross-service read-only interruption / worker recreation / replay.
// Entirely synthetic account + P8 history + My Ads transport, NO live website.
// The actual production KRAdditionalOwnerObserver and Phase4 remote service are
// the units under test; a new create() simulates (not proves) MV3 re-bootstrap.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Owners=require('../src/background/services/additional-owner-observer.js');
const Remote=require('../src/background/services/remote-delete-replacement-service.js');

const NAME='synthetic-site-account',UUID='local-manager-profile-uuid';
const SOURCE='137000100',TARGET='137000200',RENEWAL='original-renewal';
const FILL='original-fill',PHASE_ATTEMPT='original-phase-attempt';
const PUB_ATTEMPT='original-publication-attempt';
const PHASE_TOKEN='original-phase-token-123',PUB_TOKEN='original-publication-token-123';
const PAGE='https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS';
const P='karPhase4UncertainAttemptV1_',PR='karPhase4VerifiedResolutionV1_';
const Q='karAutoPublishIntentV1_',QR='karAutoPublishVerifiedResolutionV1_';
const START='karAtomicAdmissionStartV1_',FINISH='karAtomicAdmissionFinishV1_';
const safeOutput=x=>{
 assert.equal(x.r1Accepted,false);
 assert.equal(x.eligibleForLease,false);
 assert.deepEqual(Object.keys(x).sort(),['eligibleForLease','liveRemoteVerified','r1Accepted','status']);
 for(const sensitive of [NAME,UUID,SOURCE,TARGET,RENEWAL,FILL,PHASE_TOKEN,PUB_TOKEN])
  assert.ok(!JSON.stringify(x).includes(sensitive),'private fixture evidence must never be printed');
};

function originalRows(){
 return {
  profilesV1:[{profileId:UUID,displayName:NAME,normalizedName:NAME}],
  activeDetectedProfileV1:{profileId:UUID},selectedInventoryProfileV1:{profileId:UUID},
  // Successful Phase4 removes BOTH transient sessions; completed original
  // P8 and both independent verified resolutions remain immutable.
  renewalSessionsV1:{},templateFillSessions:{},
  [P+RENEWAL+'_'+PHASE_ATTEMPT]:{
   schema:1,state:'outcome-unverified',renewalId:RENEWAL,attemptId:PHASE_ATTEMPT,
   workerInstanceId:'original-phase-worker',profileId:NAME,
   sourceAdId:SOURCE,newAdId:TARGET,createdAtMs:200,admissionToken:PHASE_TOKEN
  },
  [PR+RENEWAL+'_'+PHASE_ATTEMPT]:{
   schema:1,state:'resolved-confirmed',renewalId:RENEWAL,attemptId:PHASE_ATTEMPT,
   workerInstanceId:'separate-history-verifier',profileId:NAME,
   sourceAdId:SOURCE,newAdId:TARGET,sourceEvidence:'not-in-my-ads-full-pagination-scan',
   targetEvidence:'found-in-my-ads-full-pagination-scan',
   sourcePagesScanned:2,targetPagesScanned:2,targetFoundPage:2,verifiedAtMs:600
  },
  [Q+FILL+'_'+PUB_ATTEMPT]:{
   schema:1,state:'outcome-unverified',fillId:FILL,workflowId:RENEWAL,
   attemptId:PUB_ATTEMPT,workerInstanceId:'original-publish-worker',kind:'renewal',
   profileId:UUID,sourceAdId:SOURCE,targetTabId:11,createdAtMs:100,
   admissionToken:PUB_TOKEN
  },
  [QR+FILL+'_'+PUB_ATTEMPT]:{
   schema:1,state:'resolved-confirmed',fillId:FILL,workflowId:RENEWAL,
   attemptId:PUB_ATTEMPT,kind:'renewal',profileId:UUID,sourceAdId:SOURCE,
   newAdId:TARGET,targetTabId:11,targetPresent:true,
   targetEvidence:'found-in-my-ads-full-pagination-scan',
   targetPagesScanned:2,targetFoundPage:2,verifiedAtMs:500
  },
  [START+PHASE_TOKEN]:{schema:1,state:'admitted',token:PHASE_TOKEN,
   workerInstanceId:'original-phase-worker',operationType:'AUTONOMOUS:renewal-auto-phase4',
   startedAtMs:170},
  [FINISH+PHASE_TOKEN]:{schema:1,state:'completed',token:PHASE_TOKEN,
   workerInstanceId:'original-phase-worker',completedAtMs:700},
  [START+PUB_TOKEN]:{schema:1,state:'admitted',token:PUB_TOKEN,
   workerInstanceId:'original-publish-worker',operationType:'AUTONOMOUS:renewal-publish-detection',
   startedAtMs:90},
  [FINISH+PUB_TOKEN]:{schema:1,state:'completed',token:PUB_TOKEN,
   workerInstanceId:'original-publish-worker',completedAtMs:550}
 };
}
function fixture(){
 const state={rows:originalRows(),siteName:NAME,mode:'ok',created:[],closed:[],
   requests:[],storageWrites:0,remoteInvocations:0,workerNumber:0,nextTabId:80,
  duringTargetRequest:null};
 const storageLocal={
  async get(keys){
   const all=state.rows;
   const names=keys===null?Object.keys(all):Array.isArray(keys)?keys:[keys];
   return Object.fromEntries(names.filter(k=>Object.hasOwn(all,k))
    .map(k=>[k,structuredClone(all[k])]));
  },
  set(){state.storageWrites++;throw Error('STORAGE_MUTATION_FORBIDDEN');},
  remove(){state.storageWrites++;throw Error('STORAGE_MUTATION_FORBIDDEN');},
  clear(){state.storageWrites++;throw Error('STORAGE_MUTATION_FORBIDDEN');}
 };
 function restart(){
  const newWorkerId='current-worker-'+(++state.workerNumber);
  // A new instance has no inherited in-memory decision or receipt capability.
  const scanner=Remote.create({
   createManagedWorkerTab:async(_options,kind)=>{
    const tab={id:++state.nextTabId,kind};
    state.created.push(tab);return tab;
   },
   waitForTabComplete:async()=>({status:'complete'}),
   ensureContentConnection:async()=>({ready:true}),
   closeManagedWorkerTab:async id=>{state.closed.push(id);},
   sendTabRequestWithBootstrap:async(id,msg)=>{
    const tab=state.created.find(t=>t.id===id);
    assert.ok(tab,'request must use freshly created managed R1 tab');
    state.requests.push({id,kind:tab.kind,type:msg.type});
    const source=tab.kind.endsWith('source'),target=tab.kind.endsWith('target');
    assert.equal(source||target,true);
    assert.ok(['MY_ADS_STATUS','WAIT_FOR_MY_ADS_READY',
      'VERIFY_OWN_AD_ABSENT_BY_ID','FIND_OWN_AD_BY_ID'].includes(msg.type),
      'forbidden remote method requested: '+msg.type);
    if(msg.type==='MY_ADS_STATUS'){
     if(target && state.mode==='interrupt-target-account')
       throw Error('TARGET_TAB_INTERRUPTED_PRIVATE');
     return {isMyAdsPage:true,isProjectsTab:true,profileName:state.siteName};
    }
    if(msg.type==='WAIT_FOR_MY_ADS_READY')
     return {isMyAdsPage:true,isProjectsTab:true,profileName:state.siteName,
       currentPage:1,expectedOnline:2,listingCount:2,hasNext:false};
    if(msg.type==='VERIFY_OWN_AD_ABSENT_BY_ID'){
     assert.equal(source,true);assert.equal(msg.adId,SOURCE);
     if(state.mode==='interrupt-source-query')throw Error('SOURCE_INTERRUPTED_PRIVATE');
     if(state.mode==='switch-after-source-query')state.siteName='other-site-account';
     return {verified:state.mode!=='source-reappeared',adId:SOURCE,
      evidence:'not-in-my-ads-full-pagination-scan',pagesScanned:2};
    }
    if(msg.type==='FIND_OWN_AD_BY_ID'){
     assert.equal(target,true);assert.equal(msg.adId,TARGET);
     assert.equal(msg.requireCompleteRoster,true);
     if(state.mode==='interrupt-target-query')throw Error('TARGET_INTERRUPTED_PRIVATE');
     if(state.mode==='switch-after-target-query')state.siteName='other-site-account';
     if(typeof state.duringTargetRequest==='function')state.duringTargetRequest(state.rows);
     return {found:state.mode!=='target-absent',adId:TARGET,
      evidence:'found-in-my-ads-full-pagination-scan',pagesScanned:2,page:2};
    }
    throw Error('UNREACHABLE');
   },
   normalizeProfileName:x=>String(x||'').trim(),
   phase4StatusRequestTimeoutMs:1000,phase4ReadOnlyRequestTimeoutMs:1000,
   logDiagnostic:async()=>{}
  });
  const observer=Owners.create({
   storageLocal,storageSession:{async get(){return {};}},
   workerInstanceId:newWorkerId,clock:()=>2000,
   queryBrowserTabsReadOnly:async()=>[{id:7,url:PAGE}],
   readAccountPageStatusReadOnly:async()=>({
    pageType:'my-ads',url:PAGE,auth:{loggedIn:true},profileName:state.siteName
   }),
   verifyFreshPhase4RemoteOutcomeReadOnly:async(...args)=>{
    state.remoteInvocations++;
    return scanner.verifyPhase4RemoteOutcomeFresh(...args);
   }
  });
  return observer;
 }
 return {state,restart,inspect:observer=>observer.inspectOriginalRenewalRemoteLineageReadOnly({
  renewalId:RENEWAL,attemptId:PHASE_ATTEMPT})};
}
function noRemoteMutations(state){
 assert.equal(state.storageWrites,0);
 assert.equal(state.requests.some(x=>/DELETE|PUBLISH|SUBMIT|REQUEST_SUBMIT|UPDATE_APPLY/.test(x.type)),false);
 assert.equal(state.closed.length,state.created.length,
  'all tabs created by a settled simulated scan must close');
 assert.deepEqual(state.closed.slice().sort((a,b)=>a-b),
  state.created.map(t=>t.id).sort((a,b)=>a-b));
}
function denied(x,state){
 safeOutput(x);assert.equal(x.liveRemoteVerified,false);
 assert.notEqual(x.status,'ORIGINAL_ACCOUNT_REMOTE_VERIFIED');
 noRemoteMutations(state);
}
function positive(x,state){
 safeOutput(x);
 assert.equal(x.status,'ORIGINAL_ACCOUNT_REMOTE_VERIFIED');
 assert.equal(x.liveRemoteVerified,true);
 noRemoteMutations(state);
}
test('real R1 scanner/observer positive uses two independent fresh tabs and only read commands',async()=>{
 const f=fixture();const x=await f.inspect(f.restart());positive(x,f.state);
 assert.equal(f.state.remoteInvocations,1);
 assert.equal(f.state.created.length,2);
 assert.notEqual(f.state.created[0].id,f.state.created[1].id);
 for(const t of f.state.created){
  const commands=f.state.requests.filter(r=>r.id===t.id).map(r=>r.type);
  assert.deepEqual(commands,['MY_ADS_STATUS','WAIT_FOR_MY_ADS_READY','MY_ADS_STATUS',
   t.kind.endsWith('source')?'VERIFY_OWN_AD_ABSENT_BY_ID':'FIND_OWN_AD_BY_ID','MY_ADS_STATUS']);
 }
});
for(const [mode,expectedTabs] of [
 ['interrupt-source-query',1],['interrupt-target-account',2],['interrupt-target-query',2],
 ['source-reappeared',1],['target-absent',2],
 ['switch-after-source-query',1],['switch-after-target-query',2]
]){
 test('interrupted/changed independent R1 source-target rejects: '+mode,async()=>{
  const f=fixture();f.state.mode=mode;
  const x=await f.inspect(f.restart());denied(x,f.state);
  assert.equal(f.state.remoteInvocations,1);
  assert.equal(f.state.created.length,expectedTabs);
  assert.ok(!JSON.stringify(x).includes('PRIVATE'));
 });
}
test('interrupted target cannot donate cached source proof to a re-created worker',async()=>{
 const f=fixture();
 f.state.mode='interrupt-target-query';
 const first=await f.inspect(f.restart());denied(first,f.state);
 assert.equal(f.state.created.length,2);
 f.state.mode='ok';
 const second=await f.inspect(f.restart());positive(second,f.state);
 assert.equal(f.state.remoteInvocations,2);
 assert.equal(f.state.created.length,4,'fresh source and target are mandatory after restart');
 assert.equal(f.state.workerNumber,2);
 assert.equal(f.state.rows[FINISH+PHASE_TOKEN].workerInstanceId,'original-phase-worker');
 assert.equal(f.state.rows[FINISH+PUB_TOKEN].workerInstanceId,'original-publish-worker');
});
test('resolved original P8 history cannot replay stale remote success after target disappears',async()=>{
 const f=fixture();
 const first=await f.inspect(f.restart());positive(first,f.state);
 f.state.mode='target-absent';
 const second=await f.inspect(f.restart());denied(second,f.state);
 assert.equal(f.state.remoteInvocations,2);
 assert.equal(f.state.created.length,4);
 assert.equal(f.state.requests.filter(r=>r.type==='VERIFY_OWN_AD_ABSENT_BY_ID').length,2);
 assert.equal(f.state.requests.filter(r=>r.type==='FIND_OWN_AD_BY_ID').length,2);
});
test('new worker cannot replace original P8 worker identity to legitimize historical outcome',async()=>{
 const f=fixture();
 const good=await f.inspect(f.restart());positive(good,f.state);
 f.state.rows[FINISH+PHASE_TOKEN].workerInstanceId='current-worker-2';
 const deniedResult=await f.inspect(f.restart());denied(deniedResult,f.state);
 assert.equal(f.state.remoteInvocations,1,'original P8 mismatch must block before remote scan');
 assert.equal(f.state.created.length,2);
});
test('concurrent original publication evidence rewrite in fresh scan fails final P8 readback',async()=>{
 const f=fixture();
 const first=await f.inspect(f.restart());positive(first,f.state);
 f.state.duringTargetRequest=rows=>{
  rows[QR+FILL+'_'+PUB_ATTEMPT].verifiedAtMs++;
 };
 const second=await f.inspect(f.restart());denied(second,f.state);
 assert.equal(second.status,'ORIGINAL_OR_PROFILE_CHANGED_DURING_SCAN');
 assert.equal(f.state.remoteInvocations,2);
 assert.equal(f.state.created.length,4,'new source/target must be fresh despite valid old P8');
 assert.equal(f.state.rows[FINISH+PHASE_TOKEN].workerInstanceId,'original-phase-worker');
});
