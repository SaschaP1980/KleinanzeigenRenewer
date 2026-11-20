// KAR-171 R1 / v1.25.21 owner-opt-in worker continuity script safety.
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {TextEncoder}=require('node:util');
const SRC=fs.readFileSync('docs/testing/KAR171_R1_MV3_RESTART_WITNESS_READ_ONLY.js','utf8');
const EXT='hafahjhhgiipdegfkgacchmnacgblnah';
const NAME='fixture-private-email@example.invalid',UUID='fixture-internal-uuid-111';
const PHASE='karPhase4UncertainAttemptV1_',PHASE_RESULT='karPhase4VerifiedResolutionV1_';
const PUB='karAutoPublishIntentV1_',PUB_RESULT='karAutoPublishVerifiedResolutionV1_';
const START='karAtomicAdmissionStartV1_',FINISH='karAtomicAdmissionFinishV1_';
const PHASE_TOKEN='fixture-phase-p8-token-111',PUB_TOKEN='fixture-publish-p8-token-111';
const RENEWAL='fixture-renewal-original',FILL='fixture-fill-original';
const P_ATTEMPT='fixture-phase-attempt',U_ATTEMPT='fixture-publish-attempt';
const SOURCE='123400001',TARGET='987600002';
const PHASE_KEY=PHASE+RENEWAL+'_'+P_ATTEMPT;
const PUBLISH_KEY=PUB+FILL+'_'+U_ATTEMPT;
const RESULT_KEY=PHASE_RESULT+RENEWAL+'_'+P_ATTEMPT;
const PUB_RESULT_KEY=PUB_RESULT+FILL+'_'+U_ATTEMPT;
function rows(){
 return {
  profilesV1:[{profileId:UUID,displayName:NAME,normalizedName:NAME,lastSeenAt:'timestamp-1'}],
  activeDetectedProfileV1:{profileId:UUID,detectedAt:'timestamp-1'},
  selectedInventoryProfileV1:{profileId:UUID,selectedAt:'timestamp-1'},
  renewalSessionsV1:{},templateFillSessions:{},
  [PHASE_KEY]:{schema:1,state:'outcome-unverified',renewalId:RENEWAL,attemptId:P_ATTEMPT,
   workerInstanceId:'old-original-worker-phase',profileId:NAME,sourceAdId:SOURCE,newAdId:TARGET,
   createdAtMs:200,admissionToken:PHASE_TOKEN},
  [RESULT_KEY]:{schema:1,state:'resolved-confirmed',renewalId:RENEWAL,attemptId:P_ATTEMPT,
   profileId:NAME,sourceAdId:SOURCE,newAdId:TARGET,
   sourceEvidence:'not-in-my-ads-full-pagination-scan',
   targetEvidence:'found-in-my-ads-full-pagination-scan',
   sourcePagesScanned:2,targetPagesScanned:2,targetFoundPage:1,verifiedAtMs:400},
  [PUBLISH_KEY]:{schema:1,state:'outcome-unverified',fillId:FILL,workflowId:RENEWAL,
   kind:'renewal',attemptId:U_ATTEMPT,workerInstanceId:'old-original-worker-publish',
   profileId:UUID,sourceAdId:SOURCE,targetTabId:12,createdAtMs:100,admissionToken:PUB_TOKEN},
  [PUB_RESULT_KEY]:{schema:1,state:'resolved-confirmed',workflowId:RENEWAL,fillId:FILL,
   attemptId:U_ATTEMPT,profileId:UUID,sourceAdId:SOURCE,newAdId:TARGET,
   targetPresent:true,verifiedAtMs:300},
  [START+PHASE_TOKEN]:{schema:1,state:'admitted',token:PHASE_TOKEN,
   workerInstanceId:'old-original-worker-phase',
   operationType:'AUTONOMOUS:renewal-auto-phase4',startedAtMs:170},
  [FINISH+PHASE_TOKEN]:{schema:1,state:'completed',token:PHASE_TOKEN,
   workerInstanceId:'old-original-worker-phase',completedAtMs:500},
  [START+PUB_TOKEN]:{schema:1,state:'admitted',token:PUB_TOKEN,
   workerInstanceId:'old-original-worker-publish',
   operationType:'AUTONOMOUS:renewal-publish-detection',startedAtMs:90},
  [FINISH+PUB_TOKEN]:{schema:1,state:'completed',token:PUB_TOKEN,
   workerInstanceId:'old-original-worker-publish',completedAtMs:350}
 };
}
async function invoke({snapshot=rows(),worker='current-worker-111',expected=null,
 extension=EXT,protocol='chrome-extension:',version='1.25.21',
 readingError=false,observerError=false,observerProfile='matched',mutateOnObserve=null,
 noObserver=false,noCrypto=false}={}){
 const result=[],audit={reads:0,writes:0,tabs:0,network:0,observe:0};
 const code=expected===null?SRC:SRC.replace('const EXPECTED=null;',
   'const EXPECTED='+JSON.stringify(expected)+';');
 if(expected!==null)assert.notEqual(code,SRC,'baseline injection anchor');
 const ctx={
  location:{protocol,hostname:extension},
  crypto:noCrypto?{}:webcrypto,TextEncoder,Uint8Array,
  console:{info:(tag,body)=>result.push({tag,data:JSON.parse(body)}),
    error:()=>{throw Error('NO_CONSOLE_ERROR');}},
  fetch(){audit.network++;throw Error('NETWORK_FORBIDDEN');},
  chrome:{runtime:{id:extension,getManifest:()=>({version})},storage:{local:{
   async get(key){
    audit.reads++;assert.equal(key,null);
    if(readingError)throw Error('SECRET_PRIVATE_STORAGE_ERROR');
    return structuredClone(snapshot);
   },
   set(){audit.writes++;throw Error('STORAGE_WRITE_FORBIDDEN');},
   remove(){audit.writes++;throw Error('STORAGE_WRITE_FORBIDDEN');},
   clear(){audit.writes++;throw Error('STORAGE_WRITE_FORBIDDEN');}
  }},tabs:{create(){audit.tabs++;throw Error('TABS_FORBIDDEN')},
    remove(){audit.tabs++;throw Error('TABS_FORBIDDEN')}},
   runtimeSendMessage(){throw Error('FORBIDDEN')}
  }
 };
 if(!noObserver)ctx.requireAdditionalOwnerObserver=()=>({
  async observe(){
   audit.observe++;
   if(observerError)throw Error('SECRET_OBSERVER_ERROR');
   if(mutateOnObserve)mutateOnObserve(snapshot);
   return {schema:1,eligibleForLease:false,
    context:{profile:{state:observerProfile},worker:{workerInstanceId:worker}}};
  }
 });
 await vm.runInNewContext(code,ctx,{filename:'R1-owner-MV3-witness.js',timeout:5000});
 assert.equal(result.length,1,'single bounded output');
 assert.equal(result[0].tag,'KAR171_R1_MV3_RESTART_WITNESS_V1');
 const o=result[0].data;
 assert.equal(o.r1Accepted,false);assert.equal(o.eligibleForLease,false);
 assert.equal(audit.writes,0);assert.equal(audit.tabs,0);assert.equal(audit.network,0);
 const safe=JSON.stringify(result);
 for(const secret of [NAME,UUID,RENEWAL,FILL,SOURCE,TARGET,PHASE_TOKEN,PUB_TOKEN,
  'SECRET_PRIVATE_STORAGE_ERROR','SECRET_OBSERVER_ERROR'])
  assert.equal(safe.includes(secret),false,'no private value in output');
 assert.deepEqual(Object.keys(o).sort(),
  o.status==='BASELINE_READY'
   ?['eligibleForLease','originFingerprint','r1Accepted','runtimeVersion','status','workerFingerprint']
   :o.status==='WORKER_RESTART_PROVEN_P8_UNCHANGED'
     ?['eligibleForLease','originalP8Unchanged','r1Accepted','runtimeVersion','status','workerChanged']
     :['eligibleForLease','r1Accepted','runtimeVersion','status']);
 return {o,audit};
}
test('step A returns only two bounded hashed witnesses, never site or P8 secrets',async()=>{
 const a=await invoke();
 assert.equal(a.o.status,'BASELINE_READY');
 assert.match(a.o.originFingerprint,/^[a-f0-9]{24}$/);
 assert.match(a.o.workerFingerprint,/^[a-f0-9]{24}$/);
 assert.equal(a.audit.reads,2);assert.equal(a.audit.observe,1);
});
test('same original P8 and actually changed worker generation proves bounded restart only',async()=>{
 const snapshot=rows();
 const a=await invoke({snapshot,worker:'current-worker-one'});
 const b=await invoke({snapshot,worker:'current-worker-two',expected:{
  originFingerprint:a.o.originFingerprint,workerFingerprint:a.o.workerFingerprint}});
 assert.equal(b.o.status,'WORKER_RESTART_PROVEN_P8_UNCHANGED');
 assert.equal(b.o.workerChanged,true);assert.equal(b.o.originalP8Unchanged,true);
 assert.equal(b.audit.reads,2);
});
test('a second invocation with the SAME worker never falsely claims restart',async()=>{
 const a=await invoke();
 const b=await invoke({expected:{
  originFingerprint:a.o.originFingerprint,workerFingerprint:a.o.workerFingerprint}});
 assert.equal(b.o.status,'WORKER_NOT_RESTARTED');
});
test('repeated account recognition timestamps do not alter immutable continuity proof',async()=>{
 const snapshot=rows();
 const a=await invoke({snapshot,worker:'current-worker-one'});
 snapshot.profilesV1[0].lastSeenAt='new-time';
 snapshot.selectedInventoryProfileV1.selectedAt='new-time';
 snapshot.activeDetectedProfileV1.detectedAt='new-time';
 const b=await invoke({snapshot,worker:'current-worker-two',expected:{
  originFingerprint:a.o.originFingerprint,workerFingerprint:a.o.workerFingerprint}});
 assert.equal(b.o.status,'WORKER_RESTART_PROVEN_P8_UNCHANGED');
});
for(const kind of ['phase','phase4-receipt','publish','publish-receipt','original-worker',
 'selected-profile','site-name']){
 test('original provenance drift rejects a changed worker even when before/after each stabilize: '+kind,async()=>{
  const a=await invoke({worker:'current-worker-one'});
  const snapshot=rows();
  if(kind==='phase')snapshot[PHASE_KEY].createdAtMs++;
  if(kind==='phase4-receipt')snapshot[RESULT_KEY].verifiedAtMs++;
  if(kind==='publish')snapshot[PUBLISH_KEY].createdAtMs++;
  if(kind==='publish-receipt')snapshot[PUB_RESULT_KEY].verifiedAtMs++;
  if(kind==='original-worker'){
   snapshot[PHASE_KEY].workerInstanceId='different-old-worker';
   snapshot[START+PHASE_TOKEN].workerInstanceId='different-old-worker';
   snapshot[FINISH+PHASE_TOKEN].workerInstanceId='different-old-worker';
  }
  if(kind==='selected-profile')snapshot.selectedInventoryProfileV1.profileId='other-uuid';
  if(kind==='site-name'){
   snapshot[PHASE_KEY].profileId='other-site-name';
   snapshot[RESULT_KEY].profileId='other-site-name';
   snapshot.profilesV1[0].displayName='other-site-name';
  }
  const b=await invoke({snapshot,worker:'current-worker-two',expected:{
   originFingerprint:a.o.originFingerprint,workerFingerprint:a.o.workerFingerprint}});
  assert.ok(['ORIGINAL_P8_OR_PROFILE_CHANGED','ORIGINAL_P8_CONTEXT_UNVERIFIED'].includes(b.o.status));
 });
}
test('mutation of historical receipt during observe cannot pass within-run double read',async()=>{
 const b=await invoke({mutateOnObserve:x=>{x[PUB_RESULT_KEY].verifiedAtMs++;}});
 assert.equal(b.o.status,'ORIGINAL_P8_CHANGED_DURING_READ');
});
test('missing, ambiguous, incomplete original P8 all fail before any worker restart claim',async()=>{
 for(const tweak of [
  x=>delete x[FINISH+PHASE_TOKEN],
  x=>{x[PHASE+'another_extra']={...x[PHASE_KEY]};},
  x=>{x[START+PUB_TOKEN].workerInstanceId='other-original-worker';},
  x=>{x[PUB_RESULT_KEY].newAdId='other-target';}
 ]){
  const snapshot=rows();tweak(snapshot);
  const b=await invoke({snapshot});
  assert.equal(b.o.status,'ORIGINAL_P8_CONTEXT_UNVERIFIED');
 }
});
for(const opts of [
 {extension:'wrong-extension'},{protocol:'https:'},{version:'1.25.19'},
 {version:'1.25.20'},
 {noObserver:true},{noCrypto:true},{observerProfile:'unverified'},
 {readingError:true},{observerError:true}
]){
 test('unavailable/unsafe context never claims restart '+JSON.stringify(opts),async()=>{
  const b=await invoke(opts);
  assert.notEqual(b.o.status,'BASELINE_READY');
  assert.notEqual(b.o.status,'WORKER_RESTART_PROVEN_P8_UNCHANGED');
 });
}
test('tampered baseline is rejected before reading storage',async()=>{
 const b=await invoke({expected:{originFingerprint:'not-a-fingerprint',
  workerFingerprint:'000000000000000000000000'}});
 assert.equal(b.o.status,'INVALID_BASELINE');assert.equal(b.audit.reads,0);
});
test('source is owner-only, contains no worker-stop/storage mutator/new public IPC',()=>{
 const forbidden=[
  /chrome\.storage\.(local|session)\.(set|remove|clear)\s*\(/,
  /chrome\.runtime\.(sendMessage|reload)\s*\(/,
  /chrome\.tabs\.(create|remove|update)\s*\(/,
  /serviceworker-internals|\.unregister\s*\(|DELETE_OWN_AD_BY_ID|requestSubmit\s*\(/,
  /navigator\.locks\.request\s*\(/
 ];
 for(const re of forbidden)assert.doesNotMatch(SRC,re);
 assert.match(SRC,/const EXPECTED=null;/);
});
