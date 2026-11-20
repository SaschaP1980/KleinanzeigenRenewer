// KAR-171 R1 / v1.25.20: PRIVATE OWNER OPT-IN MV3 restart continuity witness.
// Run ONLY from the installed extension's own SERVICE-WORKER DevTools console.
// This script does NOT stop/restart a worker; the owner separately confirms
// actual Chrome "service worker (inactive)" between two invocations.
// Step A: leave EXPECTED = null. Copy ONLY the two bounded fingerprint strings.
// Step B: paste those strings into EXPECTED below, after a real MV3 idle/restart.
// No network/fetch, storage writes, new tabs, P8 mutation, update lease or apply.
// Hashes are *pseudonymous*, not proof of login/remote outcome; keep private.
(async()=>{
 'use strict';
 const TAG='KAR171_R1_MV3_RESTART_WITNESS_V1';
 const EXT='hafahjhhgiipdegfkgacchmnacgblnah';
 const VERSION='1.25.20';
 // Step B example: {originFingerprint:'<24 lower-case hex>',workerFingerprint:'<24 lower-case hex>'}.
 const EXPECTED=null;
 const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
 const ad=x=>typeof x==='string'&&/^\d+$/.test(x);
 const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const ms=x=>Number.isSafeInteger(x)&&x>=0;
 const output=(status,extras={})=>{
   console.info(TAG,JSON.stringify({
     status,runtimeVersion:VERSION,...extras,
     r1Accepted:false,eligibleForLease:false
   }));
 };
 try{
   if(typeof chrome==='undefined'||chrome?.runtime?.id!==EXT
       ||typeof location==='undefined'||location.protocol!=='chrome-extension:'
       ||location.hostname!==EXT||chrome.runtime.getManifest?.().version!==VERSION
       ||typeof chrome.storage?.local?.get!=='function'){
     output('WRONG_RUNTIME_OR_EXTENSION');return;
   }
   if(EXPECTED!==null&&(!record(EXPECTED)
       ||Object.keys(EXPECTED).sort().join(',')!=='originFingerprint,workerFingerprint'
       ||!['originFingerprint','workerFingerprint'].every(k=>
         typeof EXPECTED[k]==='string'&&/^[0-9a-f]{24}$/.test(EXPECTED[k])))){
     output('INVALID_BASELINE');return;
   }
   if(typeof requireAdditionalOwnerObserver!=='function'
       ||typeof crypto?.subtle?.digest!=='function'
       ||typeof TextEncoder!=='function'){
     output('RUNTIME_PROOF_UNAVAILABLE');return;
   }
   const PHASE='karPhase4UncertainAttemptV1_';
   const PHASE_RESULT='karPhase4VerifiedResolutionV1_';
   const PUB='karAutoPublishIntentV1_';
   const PUB_RESULT='karAutoPublishVerifiedResolutionV1_';
   const START='karAtomicAdmissionStartV1_';
   const FINISH='karAtomicAdmissionFinishV1_';
   const PHASE_OPS=new Set(['AUTONOMOUS:renewal-auto-phase4','AUTONOMOUS:renewal-resume',
     'AUTONOMOUS:renewal-detached-retry','AUTONOMOUS:renewal-detached-verify',
     'AUTONOMOUS:mass-renewal-next-item','RETRY_RENEWAL_VERIFICATION',
     'RETRY_MASS_RENEWAL_ITEM','FINISH_RENEWAL_REPLACEMENT']);
   const PUB_OPS=new Set(['AUTONOMOUS:renewal-publish-detection',
     'AUTONOMOUS:trash-publish-detection','AUTONOMOUS:archive-postpublish-detached',
     'AUTHORIZE_AUTOMATIC_PUBLISH']);
   function stable(x){
     if(Array.isArray(x))return x.map(stable);
     if(record(x))return Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
     return x;
   }
   async function fingerprint(domain,value){
     const input=JSON.stringify([domain,stable(value)]);
     const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));
     return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,24);
   }
   // Inspect exactly ONE historical original renewal: no invented P8, no
   // account UUID = site-name assumption, no remote outcome inference.
   function origin(rows){
     if(!record(rows))return null;
     const phaseKeys=Object.keys(rows).filter(k=>k.startsWith(PHASE));
     if(phaseKeys.length!==1)return null;
     const key=phaseKeys[0],phase=rows[key];
     if(!record(phase)||phase.schema!==1||phase.state!=='outcome-unverified'
       ||!id(phase.renewalId)||!id(phase.attemptId)||!id(phase.workerInstanceId)
       ||key!==PHASE+phase.renewalId+'_'+phase.attemptId
       ||typeof phase.profileId!=='string'||!phase.profileId.trim()
       ||!ad(phase.sourceAdId)||!ad(phase.newAdId)
       ||phase.sourceAdId===phase.newAdId)return null;
     const pr=rows[PHASE_RESULT+phase.renewalId+'_'+phase.attemptId];
     if(!record(pr)||pr.state!=='resolved-confirmed'||pr.schema!==1
       ||pr.renewalId!==phase.renewalId||pr.attemptId!==phase.attemptId
       ||pr.profileId!==phase.profileId||pr.sourceAdId!==phase.sourceAdId
       ||pr.newAdId!==phase.newAdId)return null;
     const pubs=Object.entries(rows).filter(([k,v])=>
       k.startsWith(PUB)&&record(v)&&v.workflowId===phase.renewalId);
     if(pubs.length!==1)return null;
     const [pubKey,pub]=pubs[0];
     if(pub.schema!==1||pub.state!=='outcome-unverified'
       ||pub.kind!=='renewal'||!id(pub.fillId)||!id(pub.attemptId)
       ||!id(pub.workerInstanceId)||!id(pub.profileId)
       ||pubKey!==PUB+pub.fillId+'_'+pub.attemptId
       ||pub.sourceAdId!==phase.sourceAdId)return null;
     const pubResult=rows[PUB_RESULT+pub.fillId+'_'+pub.attemptId];
     if(!record(pubResult)||pubResult.schema!==1
       ||pubResult.state!=='resolved-confirmed'
       ||pubResult.workflowId!==phase.renewalId||pubResult.fillId!==pub.fillId
       ||pubResult.attemptId!==pub.attemptId||pubResult.profileId!==pub.profileId
       ||pubResult.sourceAdId!==phase.sourceAdId
       ||pubResult.newAdId!==phase.newAdId||pubResult.targetPresent!==true)return null;
     function p8(intent,allowed){
       if(!id(intent.admissionToken)||intent.admissionToken.length<12
         ||!ms(intent.createdAtMs))return null;
       const s=rows[START+intent.admissionToken],f=rows[FINISH+intent.admissionToken];
       if(!record(s)||Object.keys(s).length!==6||s.schema!==1||s.state!=='admitted'
         ||s.token!==intent.admissionToken||s.workerInstanceId!==intent.workerInstanceId
         ||!allowed.has(s.operationType)||!ms(s.startedAtMs)||s.startedAtMs>intent.createdAtMs
         ||!record(f)||Object.keys(f).length!==5||f.schema!==1||f.state!=='completed'
         ||f.token!==intent.admissionToken||f.workerInstanceId!==intent.workerInstanceId
         ||!ms(f.completedAtMs)||f.completedAtMs<intent.createdAtMs)return null;
       return {start:s,finish:f};
     }
     const phaseP8=p8(phase,PHASE_OPS),pubP8=p8(pub,PUB_OPS);
     if(!phaseP8||!pubP8)return null;
     const selected=rows.selectedInventoryProfileV1,detected=rows.activeDetectedProfileV1;
     if(!record(selected)||!record(detected)||selected.profileId!==pub.profileId
       ||detected.profileId!==pub.profileId||!Array.isArray(rows.profilesV1))return null;
     const matches=rows.profilesV1.filter(p=>record(p)&&p.profileId===pub.profileId);
     if(matches.length!==1||typeof matches[0].displayName!=='string'
       ||matches[0].displayName.trim().toLocaleLowerCase('de-DE')!==
         phase.profileId.trim().toLocaleLowerCase('de-DE'))return null;
     // Include every immutable field of both original P8s and historical
     // resolutions, plus only stable selected-profile identity, not lastSeenAt.
     return {phase,phaseResult:pr,publish:pub,publishResult:pubResult,
       phaseP8,pubP8,
       selectedProfileId:selected.profileId,detectedProfileId:detected.profileId,
       selectedDisplayName:matches[0].displayName};
   }
   const before=origin(await chrome.storage.local.get(null));
   if(!before){output('ORIGINAL_P8_CONTEXT_UNVERIFIED');return;}
   const observer=requireAdditionalOwnerObserver();
   const observed=await observer?.observe?.();
   const worker=observed?.context?.worker?.workerInstanceId;
   if(observed?.schema!==1||observed.eligibleForLease!==false
     ||observed.context?.profile?.state!=='matched'||!id(worker)){
     output('LIVE_PROFILE_OR_WORKER_UNVERIFIED');return;
   }
   const after=origin(await chrome.storage.local.get(null));
   if(!after){output('ORIGINAL_P8_CONTEXT_UNVERIFIED');return;}
   const first=await fingerprint('KAR171_R1_ORIGINAL_P8_V1',before);
   const second=await fingerprint('KAR171_R1_ORIGINAL_P8_V1',after);
   if(first!==second){output('ORIGINAL_P8_CHANGED_DURING_READ');return;}
   const currentWorker=await fingerprint('KAR171_R1_CURRENT_WORKER_V1',
     [worker,before.phase.admissionToken,before.publish.admissionToken]);
   if(EXPECTED===null){
     output('BASELINE_READY',{originFingerprint:first,workerFingerprint:currentWorker});
     return;
   }
   if(EXPECTED.originFingerprint!==first){
     output('ORIGINAL_P8_OR_PROFILE_CHANGED');return;
   }
   if(EXPECTED.workerFingerprint===currentWorker){
     output('WORKER_NOT_RESTARTED');return;
   }
   // Independent owner observation alone cannot guarantee a remote outcome
   // or full R1 acceptance. The original successful Stage3 stands separately.
   output('WORKER_RESTART_PROVEN_P8_UNCHANGED',{
     workerChanged:true,originalP8Unchanged:true
   });
 }catch{
   output('READ_ONLY_WITNESS_UNAVAILABLE');
 }
})().catch(()=>console.info('KAR171_R1_MV3_RESTART_WITNESS_V1',
 JSON.stringify({status:'READ_ONLY_WITNESS_UNAVAILABLE',runtimeVersion:'1.25.20',
 r1Accepted:false,eligibleForLease:false})));
