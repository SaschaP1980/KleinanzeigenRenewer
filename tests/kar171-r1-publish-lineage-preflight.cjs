// KAR-171 R1: original P8 publish lineage -> immutable remote-publish resolution
// -> same persisted renewal/fill IDs. No live account modification.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const scriptPath = path.resolve(__dirname,'../docs/testing/KAR171_R1_PUBLISH_LINEAGE_READ_ONLY.js');
const EXT='hafahjhhgiipdegfkgacchmnacgblnah';
const token='private-p8-token-123456789',wid='worker-ONE',src='123456789',target='987654321';
const renew='renewal-alpha',fill='fill-alpha',att='attempt-alpha';
const intent={schema:1,state:'outcome-unverified',fillId:fill,workflowId:renew,
  attemptId:att,workerInstanceId:wid,kind:'renewal',profileId:'local-profile-PRIVATE',
  sourceAdId:src,targetTabId:31,createdAtMs:1100,admissionToken:token};
const start={schema:1,state:'admitted',token,workerInstanceId:wid,
  operationType:'AUTHORIZE_AUTOMATIC_PUBLISH',startedAtMs:1000};
const finish={schema:1,state:'completed',token,workerInstanceId:wid,completedAtMs:1300};
const resolution={schema:1,state:'resolved-confirmed',fillId:fill,workflowId:renew,
  attemptId:att,kind:'renewal',profileId:intent.profileId,sourceAdId:src,
  targetTabId:31,newAdId:target,targetPresent:true,
  targetEvidence:'found-in-my-ads-full-pagination-scan',
  targetPagesScanned:2,targetFoundPage:2,verifiedAtMs:1400};
const renewal={renewalId:renew,profileId:intent.profileId,sourceAdId:src,
  newAdId:target,status:'cancelled',stage:'emergency-reset-unverified'};
const filling={fillId:fill,renewalId:renew,sourceAdId:src,status:'complete',stage:'new-id-confirmed'};
const keys={start:'karAtomicAdmissionStartV1_'+token,
 finish:'karAtomicAdmissionFinishV1_'+token,
 intent:'karAutoPublishIntentV1_'+fill+'_'+att,
 result:'karAutoPublishVerifiedResolutionV1_'+fill+'_'+att};
const records=()=>({[keys.start]:start,[keys.finish]:finish,[keys.intent]:intent,
 [keys.result]:resolution,renewalSessionsV1:{[renew]:renewal},templateFillSessions:{[fill]:filling}});
async function run(rows={},opts={}){
 const lines=[];let reads=0,writes=0,requests=0;
 const ctx={
  location:{protocol:opts.web?'https:':'chrome-extension:',hostname:opts.web?'www.kleinanzeigen.de':EXT},
  chrome:{
   runtime:{id:opts.other?'different-extension':EXT,getManifest:()=>({version:'1.25.7'})},
   storage:{local:{
    get:async key=>{reads++;assert.equal(key,null);if(opts.failRead)throw Error('PRIVATE_SECRET');return rows;},
    set(){writes++;throw Error('WRITE_FORBIDDEN');},
    clear(){writes++;throw Error('WRITE_FORBIDDEN');},
    remove(){writes++;throw Error('WRITE_FORBIDDEN');}
   }}
  },
  fetch(){requests++;throw Error('NETWORK_FORBIDDEN');},
  console:{info(...args){lines.push(args);},error(){throw Error('raw-error');}}
 };
 const s=fs.readFileSync(scriptPath,'utf8');
 assert.doesNotMatch(s,/\.(?:set|clear|remove)\s*\(/,'source never writes storage');
 await vm.runInNewContext(s,ctx,{filename:path.basename(scriptPath),timeout:3000});
 assert.equal(writes,0);assert.equal(requests,0);assert.equal(lines.length,1);
 assert.equal(lines[0][0],'KAR171_R1_PUBLISH_LINEAGE_V1');
 const printable=JSON.stringify(lines);
 for(const secret of [token,wid,src,target,renew,fill,att,'local-profile-PRIVATE','PRIVATE_SECRET']){
  assert.ok(!printable.includes(secret),'no secret exposed: '+secret);
 }
 return {result:JSON.parse(lines[0][1]),reads};
}
(async()=>{
 let n=0;
 const check=(condition,message)=>{assert.ok(condition,message);n++;};
 const empty=await run();
 check(empty.result.status==='NO_P8_PUBLICATION_INTENT'&&empty.reads===1,
  'no P8 lineage is not false acceptance');
 const good=await run(records());
 check(good.result.status==='PUBLISH_LINEAGE_MATCHED'&&good.result.matchedRenewalLineages===1,
  'legitimate immutable publish resolution and same stored renewal lineage');
 check(good.result.completedP8PublicationIntents===1&&good.result.validPublishedResolutions===1,
  'distinct completed admission and historically verified remote publication');
 check(good.result.r1Accepted===false&&good.result.sourceDeletionVerified===false,
  'does not equate publication with remote deletion / R1 acceptance');
 const noResult=records();delete noResult[keys.result];
 check((await run(noResult)).result.matchedRenewalLineages===0,
  'P8 admission alone does not prove published outcome');
 const noFinish=records();delete noFinish[keys.finish];
 check((await run(noFinish)).result.matchedRenewalLineages===0,
  'unclosed P8 never counts as completed original admission');
 const badWorker=records();badWorker[keys.start]={...start,workerInstanceId:'other-worker'};
 check((await run(badWorker)).result.matchedRenewalLineages===0,
  'wrong worker cannot claim original P8');
 const missingStart=records();delete missingStart[keys.start];
 check((await run(missingStart)).result.matchedRenewalLineages===0,
  'no original P8 START means no lineage');
 const badFinish=records();badFinish[keys.finish]={...finish,completedAtMs:500};
 check((await run(badFinish)).result.matchedRenewalLineages===0,
  'chronologically invalid P8 finish fails closed');
 const badOperation=records();badOperation[keys.start]={...start,operationType:'FINISH_RENEWAL_REPLACEMENT'};
 check((await run(badOperation)).result.matchedRenewalLineages===0,
  'unrelated P8 operation disallowed');
 const badTarget=records();badTarget[keys.result]={...resolution,newAdId:'987650000'};
 check((await run(badTarget)).result.matchedRenewalLineages===0,
  'published target different from persisted renewal');
 const badSource=records();badSource.renewalSessionsV1[renew]={...renewal,sourceAdId:'123450000'};
 check((await run(badSource)).result.matchedRenewalLineages===0,
  'persisted source must match immutable publish intent');
 const mismatchedFill=records();mismatchedFill.templateFillSessions[fill]={...filling,renewalId:'another-renewal'};
 check((await run(mismatchedFill)).result.matchedRenewalLineages===0,
  'fill session must refer to same renewal');
 const wrongProfile=records();wrongProfile.renewalSessionsV1[renew]={...renewal,profileId:'another-profile'};
 check((await run(wrongProfile)).result.matchedRenewalLineages===0,
  'original profile identity cannot drift');
 const wrongResolution=records();wrongResolution[keys.result]={...resolution,targetEvidence:'locally-seen-only'};
 check((await run(wrongResolution)).result.matchedRenewalLineages===0,
  'remote evidence must be independently scanned');
 const corruptIntent=records();corruptIntent[keys.intent]={...intent,targetTabId:0};
 check((await run(corruptIntent)).result.matchedRenewalLineages===0,
  'malformed source intent fails closed');
 const other=await run(records(),{other:true});
 check(other.result.status==='WRONG_EXTENSION_CONTEXT'&&other.reads===0,
  'wrong extension avoids any read');
 const web=await run(records(),{web:true});
 check(web.result.status==='WRONG_EXTENSION_CONTEXT'&&web.reads===0,
  'wrong origin avoids any read');
 const badRead=await run(records(),{failRead:true});
 check(badRead.result.status==='READ_FAILED'&&badRead.reads===1,
  'storage failure is never a confirmed zero');
 const lostFill=records();delete lostFill.templateFillSessions[fill];
 check((await run(lostFill)).result.matchedRenewalLineages===0,
  'missing live fill session never becomes positive correlation');
 const legacy=records();legacy[keys.intent]=(({admissionToken,...rest})=>rest)(intent);
 check((await run(legacy)).result.matchedRenewalLineages===0,
  'tokenless legacy publication cannot claim P8');
 console.log('PASS KAR171 R1 publish lineage read-only '+n+' adversarial assertions');
})().catch(err=>{console.error(err);process.exitCode=1;});
