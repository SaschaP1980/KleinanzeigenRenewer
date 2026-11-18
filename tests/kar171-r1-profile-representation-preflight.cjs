// KAR-171 R1: independent adversarial profile-representation checks.
// Synthetic local records only. No network, remote account or listing mutation.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const script=fs.readFileSync(path.resolve(__dirname,
  '../docs/testing/KAR171_R1_PHASE4_LINEAGE_READ_ONLY.js'),'utf8');
const EXT='hafahjhhgiipdegfkgacchmnacgblnah';
const P8S='karAtomicAdmissionStartV1_',P8F='karAtomicAdmissionFinishV1_';
const P='karPhase4UncertainAttemptV1_',R='karPhase4VerifiedResolutionV1_';
const U='karAutoPublishIntentV1_',V='karAutoPublishVerifiedResolutionV1_';
function rows(variant={}){
 const t='phase-token-synthetic-123',p='pub-token-synthetic-123';
 const w='phase-worker',pw='publish-worker',rid='renewal-proof';
 const source='1111111',target=variant.target||'2222222';
 const phaseProfile='public-name-on-my-ads',pubProfile=variant.pubProfile||phaseProfile;
 const f='fill-proof',a='phase-attempt',b='publish-attempt';
 const r={
  [P8S+t]:{schema:1,state:'admitted',token:t,workerInstanceId:w,
    operationType:'AUTONOMOUS:renewal-auto-phase4',startedAtMs:100},
  [P8F+t]:{schema:1,state:'completed',token:t,workerInstanceId:w,completedAtMs:500},
  [P8S+p]:{schema:1,state:'admitted',token:p,workerInstanceId:pw,
    operationType:'AUTONOMOUS:renewal-publish-detection',startedAtMs:100},
  [P8F+p]:{schema:1,state:'completed',token:p,workerInstanceId:pw,completedAtMs:350},
  [P+rid+'_'+a]:{schema:1,state:'outcome-unverified',renewalId:rid,attemptId:a,
    workerInstanceId:w,profileId:phaseProfile,sourceAdId:source,newAdId:'2222222',
    admissionToken:t,createdAtMs:200},
  [R+rid+'_'+a]:{schema:1,state:'resolved-confirmed',renewalId:rid,attemptId:a,
    workerInstanceId:'verifying-worker',profileId:phaseProfile,sourceAdId:source,
    newAdId:'2222222',sourceEvidence:'not-in-my-ads-full-pagination-scan',
    targetEvidence:'found-in-my-ads-full-pagination-scan',sourcePagesScanned:2,
    targetPagesScanned:2,targetFoundPage:1,verifiedAtMs:400},
  [U+f+'_'+b]:{schema:1,state:'outcome-unverified',fillId:f,workflowId:rid,
    attemptId:b,workerInstanceId:pw,kind:'renewal',profileId:pubProfile,
    sourceAdId:source,targetTabId:13,createdAtMs:200,admissionToken:p},
  [V+f+'_'+b]:{schema:1,state:'resolved-confirmed',fillId:f,workflowId:rid,
    attemptId:b,kind:'renewal',profileId:pubProfile,sourceAdId:source,targetTabId:13,
    newAdId:target,targetPresent:true,
    targetEvidence:'found-in-my-ads-full-pagination-scan',
    targetPagesScanned:2,targetFoundPage:1,verifiedAtMs:300}
 };
 if(variant.removePublishResult) delete r[V+f+'_'+b];
 if(variant.removePublishAdmission) delete r[P8S+p];
 if(variant.otherSource){
  r[U+f+'_'+b].sourceAdId=variant.otherSource;
  r[V+f+'_'+b].sourceAdId=variant.otherSource;
 }
 return r;
}
async function execute(data){
 const output=[];let reads=0;
 const context={
  location:{protocol:'chrome-extension:',hostname:EXT},
  chrome:{runtime:{id:EXT,getManifest:()=>({version:'fixture'})},
   storage:{local:{get:async key=>{assert.equal(key,null);reads++;return data;},
     set(){throw Error('NOT_ALLOWED');},remove(){throw Error('NOT_ALLOWED');},
     clear(){throw Error('NOT_ALLOWED');}}}},
  console:{info:(tag,val)=>output.push([tag,JSON.parse(val)]),
    error:()=>{throw Error('NOT_ALLOWED');}}
 };
 await vm.runInNewContext(script,context,{filename:'KAR171_R1_PHASE4_LINEAGE_READ_ONLY.js',timeout:4000});
 assert.equal(reads,1);
 assert.equal(output.length,1);
 assert.equal(output[0][0],'KAR171_R1_PHASE4_LINEAGE_V1');
 const result=output[0][1];
 assert.equal(result.liveRemoteVerified,false);
 assert.equal(result.r1Accepted,false);
 return result;
}
(async()=>{
 const same=await execute(rows());
 assert.equal(same.status,'PHASE4_P8_PUBLISH_LINEAGE_MATCHED');
 assert.equal(same.matchedPublishedTargets,1);
 const dual=await execute(rows({pubProfile:'uuid-account-reference'}));
 assert.equal(dual.status,'PHASE4_LINEAGE_NOT_CONFIRMED');
 assert.equal(dual.matchedPublishedTargets,0);
 assert.equal(dual.publishCandidatesSameProfile,0);
 assert.equal(dual.publishCandidatesCrossRepresentationSameTarget,1);
 assert.equal(dual.publishJoinReason,'PUBLISH_PROFILE_UNBOUND_DUAL_REMOTE_TARGET');
 const otherTarget=await execute(rows({pubProfile:'uuid-account-reference',target:'3333333'}));
 assert.equal(otherTarget.publishCandidatesCrossRepresentationSameTarget,0);
 assert.equal(otherTarget.publishJoinReason,'PUBLISH_PROFILE_MISMATCH');
 const noResult=await execute(rows({pubProfile:'uuid-account-reference',removePublishResult:true}));
 assert.equal(noResult.publishCandidatesCrossRepresentationSameTarget,0);
 assert.equal(noResult.publishJoinReason,'PUBLISH_PROFILE_MISMATCH');
 const noAdmission=await execute(rows({pubProfile:'uuid-account-reference',removePublishAdmission:true}));
 assert.equal(noAdmission.publishCandidatesCrossRepresentationSameTarget,0);
 const otherSource=await execute(rows({pubProfile:'uuid-account-reference',otherSource:'3333333'}));
 assert.equal(otherSource.publishCandidatesCrossRepresentationSameTarget,0);
 console.log('PASS KAR171 R1 profile-representation cases 6/6, all fail closed');
})().catch(e=>{console.error(e);process.exitCode=1;});
