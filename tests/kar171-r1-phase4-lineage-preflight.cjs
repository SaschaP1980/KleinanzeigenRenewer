// KAR-171 R1 Stage 2 — no-mutation local Phase4 P8 + publication lineage.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const SCRIPT=path.resolve(__dirname,'../docs/testing/KAR171_R1_PHASE4_LINEAGE_READ_ONLY.js');
const EXT='hafahjhhgiipdegfkgacchmnacgblnah';
const token='phase4-private-token-123456',pubToken='publish-private-token-123456';
const worker='original-worker',pubWorker='publish-worker',renewal='renewal-ORIG';
const phaseAttempt='phase-attempt-ORIG',fill='fill-ORIG',pubAttempt='pub-attempt-ORIG';
const profile='private-profile',source='123456789',target='987654321';
const START='karAtomicAdmissionStartV1_',FINISH='karAtomicAdmissionFinishV1_';
const PHASE='karPhase4UncertainAttemptV1_',RESULT='karPhase4VerifiedResolutionV1_';
const PUB='karAutoPublishIntentV1_',PUBRES='karAutoPublishVerifiedResolutionV1_';
const pKey=PHASE+renewal+'_'+phaseAttempt,prKey=RESULT+renewal+'_'+phaseAttempt;
const pubKey=PUB+fill+'_'+pubAttempt,pubResult=PUBRES+fill+'_'+pubAttempt;
const p8={schema:1,state:'admitted',token,workerInstanceId:worker,
 operationType:'AUTONOMOUS:renewal-auto-phase4',startedAtMs:100};
const p8Finish={schema:1,state:'completed',token,workerInstanceId:worker,completedAtMs:500};
const intent={schema:1,state:'outcome-unverified',renewalId:renewal,attemptId:phaseAttempt,
 workerInstanceId:worker,profileId:profile,sourceAdId:source,newAdId:target,
 createdAtMs:200,admissionToken:token};
const resolved={schema:1,state:'resolved-confirmed',renewalId:renewal,attemptId:phaseAttempt,
 workerInstanceId:'new-worker-after-restart',profileId:profile,sourceAdId:source,
 newAdId:target,sourceEvidence:'not-in-my-ads-full-pagination-scan',
 targetEvidence:'found-in-my-ads-full-pagination-scan',sourcePagesScanned:2,
 targetPagesScanned:3,targetFoundPage:1,verifiedAtMs:400};
const pubStart={schema:1,state:'admitted',token:pubToken,workerInstanceId:pubWorker,
 operationType:'AUTONOMOUS:renewal-publish-detection',startedAtMs:100};
const pubFinish={schema:1,state:'completed',token:pubToken,workerInstanceId:pubWorker,completedAtMs:320};
const published={schema:1,state:'outcome-unverified',fillId:fill,workflowId:renewal,
 attemptId:pubAttempt,workerInstanceId:pubWorker,kind:'renewal',profileId:profile,
 sourceAdId:source,targetTabId:2,createdAtMs:200,admissionToken:pubToken};
const publicationResult={schema:1,state:'resolved-confirmed',fillId:fill,workflowId:renewal,
 attemptId:pubAttempt,kind:'renewal',profileId:profile,sourceAdId:source,targetTabId:2,
 newAdId:target,targetPresent:true,targetEvidence:'found-in-my-ads-full-pagination-scan',
 targetPagesScanned:2,targetFoundPage:1,verifiedAtMs:300};
const records=()=>({
 [START+token]:{...p8},[FINISH+token]:{...p8Finish},
 [pKey]:{...intent},[prKey]:{...resolved},
 [START+pubToken]:{...pubStart},[FINISH+pubToken]:{...pubFinish},
 [pubKey]:{...published},[pubResult]:{...publicationResult}
});
async function execute(rows={},flags={}){
 const seen=[];let reads=0,writes=0,requests=0;
 const context={
  location:{protocol:flags.web?'https:':'chrome-extension:',hostname:flags.web?'example.org':EXT},
  chrome:{runtime:{id:flags.foreign?'not-this-extension':EXT,getManifest:()=>({version:'1.25.8'})},
   storage:{local:{
    get:async key=>{reads++;assert.equal(key,null);if(flags.readFails)throw Error('PRIVATE_STORAGE_ERROR');return rows;},
    set(){writes++;throw Error('MUTATION_NOT_ALLOWED');},
    remove(){writes++;throw Error('MUTATION_NOT_ALLOWED');},
    clear(){writes++;throw Error('MUTATION_NOT_ALLOWED');}
   }}},
  console:{info(...args){seen.push(args);},error(){throw Error('console.error would leak details');}},
  fetch(){requests++;throw Error('NETWORK_NOT_ALLOWED');}
 };
 const code=fs.readFileSync(SCRIPT,'utf8');
 assert.doesNotMatch(code,/\.(?:set|remove|clear)\s*\(/,'no local storage write calls');
 await vm.runInNewContext(code,context,{filename:path.basename(SCRIPT),timeout:4000});
 assert.equal(seen.length,1,'one redacted line');
 assert.equal(seen[0][0],'KAR171_R1_PHASE4_LINEAGE_V1');
 const printed=JSON.stringify(seen);
 for(const secret of [token,pubToken,worker,pubWorker,renewal,phaseAttempt,pubAttempt,
  fill,profile,source,target,'PRIVATE_STORAGE_ERROR']){
  assert.ok(!printed.includes(secret),'no private value in console: '+secret);
 }
 assert.equal(writes,0);assert.equal(requests,0);
 return {result:JSON.parse(seen[0][1]),reads};
}
(async()=>{
 let n=0;const check=(condition,message)=>{assert.ok(condition,message);n++;};
 const none=await execute();
 check(none.reads===1&&none.result.status==='NO_PHASE4_INTENT',
  'empty data cannot claim historical remote outcome');
 const positive=await execute(records());
 check(positive.result.status==='PHASE4_P8_PUBLISH_LINEAGE_MATCHED'
  &&positive.result.phase4Intents===1&&positive.result.completedPhase4P8===1
  &&positive.result.validPhase4Resolutions===1&&positive.result.matchedPublishedTargets===1,
  'original Phase4 P8, historical resolution and original publication match');
 check(positive.result.liveRemoteVerified===false&&positive.result.r1Accepted===false,
  'historical journal never certifies current remote account or full R1');
 const noP8=records();delete noP8[START+token];
 check((await execute(noP8)).result.validPhase4Resolutions===0,
  'missing original P8 start cannot make a valid outcome');
 const noFinish=records();delete noFinish[FINISH+token];
 check((await execute(noFinish)).result.validPhase4Resolutions===0,
  'unfinished original P8 cannot make completed proof');
 const wrongWorker=records();wrongWorker[START+token].workerInstanceId='other';
 check((await execute(wrongWorker)).result.completedPhase4P8===0,
  'wrong original worker fails');
 const wrongOp=records();wrongOp[START+token].operationType='UNRELATED_APPLY';
 check((await execute(wrongOp)).result.completedPhase4P8===0,
  'unrelated origin action fails');
 const staleStart=records();staleStart[START+token].startedAtMs=999;
 check((await execute(staleStart)).result.completedPhase4P8===0,
  'admission after original intent fails');
 const staleFinish=records();staleFinish[FINISH+token].completedAtMs=101;
 check((await execute(staleFinish)).result.completedPhase4P8===0,
  'finish before original intent fails');
 const corruptToken=records();corruptToken[pKey].admissionToken='a';
 check((await execute(corruptToken)).result.completedPhase4P8===0,
  'short P8 reference does not match stored receipt');
 const tokenless=records();delete tokenless[pKey].admissionToken;
 check((await execute(tokenless)).result.legacyPhase4Intents===1,
  'tokenless legacy Phase4 cannot be upgraded retroactively');
 const noResolution=records();delete noResolution[prKey];
 check((await execute(noResolution)).result.validPhase4Resolutions===0,
  'a completed callback never proves actual source absence');
 const badSource=records();badSource[prKey].sourceAdId='222222';
 check((await execute(badSource)).result.validPhase4Resolutions===0,
  'wrong remote source not accepted');
 const badTarget=records();badTarget[prKey].newAdId='222222';
 check((await execute(badTarget)).result.validPhase4Resolutions===0,
  'wrong target is not a verified original replacement');
 const partialPage=records();partialPage[prKey].targetFoundPage=4;
 check((await execute(partialPage)).result.validPhase4Resolutions===0,
  'target found outside verified pagination fails');
 const wrongEvidence=records();wrongEvidence[prKey].sourceEvidence='source-card-removed-locally';
 check((await execute(wrongEvidence)).result.validPhase4Resolutions===0,
  'local trash does not mean remote source absence');
 const wrongProfile=records();wrongProfile[prKey].profileId='other';
 check((await execute(wrongProfile)).result.validPhase4Resolutions===0,
  'different account/profile fails');
 const absentPublication=records();delete absentPublication[pubResult];
 check((await execute(absentPublication)).result.matchedPublishedTargets===0,
  'phase4 alone cannot infer matching historical publication');
 const pubNoP8=records();delete pubNoP8[START+pubToken];
 check((await execute(pubNoP8)).result.matchedPublishedTargets===0,
  'unadmitted publication cannot certify Phase4-to-publish lineage');
 const pubOther=records();pubOther[pubResult].newAdId='22222';
 check((await execute(pubOther)).result.matchedPublishedTargets===0,
  'published target mismatch fails');
 const pubOtherRenewal=records();pubOtherRenewal[pubKey].workflowId='other-renewal';
 check((await execute(pubOtherRenewal)).result.matchedPublishedTargets===0,
  'wrong publication workflow fails');
 const orphan=records();delete orphan[pKey];
 check((await execute(orphan)).result.validPhase4Resolutions===0
  &&(await execute(orphan)).result.orphanPhase4Resolutions===1,
  'orphan result cannot replace immutable original');
 const wrongContext=await execute(records(),{foreign:true});
 check(wrongContext.reads===0&&wrongContext.result.status==='WRONG_EXTENSION_CONTEXT',
  'wrong extension cannot read any private data');
 const web=await execute(records(),{web:true});
 check(web.reads===0&&web.result.status==='WRONG_EXTENSION_CONTEXT',
  'website context cannot read extension storage');
 const readFailure=await execute(records(),{readFails:true});
 check(readFailure.reads===1&&readFailure.result.status==='READ_FAILED',
  'read error never becomes successful empty storage');
 console.log('PASS KAR171 R1 Phase4 historical P8 lineage '+n+' adversarial assertions');
})().catch(error=>{console.error(error);process.exitCode=1;});
