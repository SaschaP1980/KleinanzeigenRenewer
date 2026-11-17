// KAR-171 R1 — Stage 1: historical publication provenance ONLY.
// Paste manually in the installed extension SERVICE WORKER DevTools console.
// Exactly one chrome.storage.local.get(null). No writes, network, Web Locks,
// tabs, publication, deletion, updater actions or private IDs in output.
// This checks persisted original P8 START/FINISH, original publish intent,
// verified historical My Ads target resolution and the SAME renewal+fill.
// It does NOT independently recheck a CURRENT live My Ads page, certify
// remote source deletion, or accept R1.
(async () => {
  'use strict';
  const TAG='KAR171_R1_PUBLISH_LINEAGE_V1';
  const EXT='hafahjhhgiipdegfkgacchmnacgblnah';
  const START='karAtomicAdmissionStartV1_';
  const FINISH='karAtomicAdmissionFinishV1_';
  const INTENT='karAutoPublishIntentV1_';
  const RESULT='karAutoPublishVerifiedResolutionV1_';
  const OPERATIONS=new Set([
    'AUTONOMOUS:renewal-publish-detection',
    'AUTONOMOUS:trash-publish-detection',
    'AUTONOMOUS:archive-postpublish-detached',
    'AUTHORIZE_AUTOMATIC_PUBLISH'
  ]);
  const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
  const ad=x=>typeof x==='string'&&/^\d+$/.test(x);
  const time=x=>Number.isSafeInteger(x)&&x>=0;
  const print=x=>console.info(TAG,JSON.stringify(x));
  if(typeof chrome==='undefined'||chrome?.runtime?.id!==EXT
    ||typeof location==='undefined'||location.protocol!=='chrome-extension:'
    ||location.hostname!==EXT||typeof chrome.storage?.local?.get!=='function'){
    print({status:'WRONG_EXTENSION_CONTEXT',r1Accepted:false,sourceDeletionVerified:false});
    return;
  }
  let data;
  try {
    data=await chrome.storage.local.get(null);
    if(!record(data))throw Error('invalid storage');
  } catch {
    print({status:'READ_FAILED',r1Accepted:false,sourceDeletionVerified:false});
    return;
  }
  const summary={
    status:'NO_P8_PUBLICATION_INTENT',
    version:String(chrome.runtime.getManifest?.()?.version||'unknown'),
    scope:'persisted-historical-publication-lineage-only; one-local-read',
    intentsExamined:0,
    completedP8PublicationIntents:0,
    validPublishedResolutions:0,
    matchedRenewalLineages:0,
    missingOrIncompleteP8:0,
    missingOrInvalidResolutions:0,
    missingOrContradictorySessions:0,
    invalidOrLegacyIntents:0,
    orphanResolutions:0,
    sourceDeletionVerified:false,
    r1Accepted:false
  };
  const validIntent=(key,row)=>
    record(row)&&row.schema===1&&row.state==='outcome-unverified'
    &&id(row.fillId)&&id(row.workflowId)&&id(row.attemptId)&&id(row.workerInstanceId)
    &&['renewal','archive'].includes(row.kind)
    &&typeof row.profileId==='string'&&Boolean(row.profileId.trim())
    &&row.profileId.length<=256&&Number.isSafeInteger(row.targetTabId)&&row.targetTabId>0
    &&(ad(row.sourceAdId)||(row.kind==='archive'&&row.sourceAdId===''))
    &&time(row.createdAtMs)
    &&key===INTENT+row.fillId+'_'+row.attemptId;
  const hasCompletedP8=row=>{
    if(!id(row.admissionToken)||row.admissionToken.length<12)return false;
    const start=data[START+row.admissionToken];
    const finish=data[FINISH+row.admissionToken];
    return record(start)&&Object.keys(start).length===6
      &&start.schema===1&&start.state==='admitted'
      &&start.token===row.admissionToken&&start.workerInstanceId===row.workerInstanceId
      &&id(start.token)&&id(start.workerInstanceId)
      &&OPERATIONS.has(start.operationType)&&time(start.startedAtMs)
      &&start.startedAtMs<=row.createdAtMs
      &&record(finish)&&Object.keys(finish).length===5
      &&finish.schema===1&&finish.state==='completed'
      &&finish.token===row.admissionToken&&finish.workerInstanceId===row.workerInstanceId
      &&time(finish.completedAtMs)&&finish.completedAtMs>=row.createdAtMs;
  };
  const validResult=(key,row,intent)=>record(row)
    &&row.schema===1&&row.state==='resolved-confirmed'
    &&row.fillId===intent.fillId&&row.workflowId===intent.workflowId
    &&row.attemptId===intent.attemptId&&row.kind===intent.kind
    &&row.profileId===intent.profileId&&row.sourceAdId===intent.sourceAdId
    &&row.targetTabId===intent.targetTabId&&ad(row.newAdId)
    &&row.newAdId!==intent.sourceAdId&&row.targetPresent===true
    &&row.targetEvidence==='found-in-my-ads-full-pagination-scan'
    &&Number.isSafeInteger(row.targetPagesScanned)&&row.targetPagesScanned>=1
    &&Number.isSafeInteger(row.targetFoundPage)&&row.targetFoundPage>=1
    &&row.targetFoundPage<=row.targetPagesScanned
    &&time(row.verifiedAtMs)&&row.verifiedAtMs>=intent.createdAtMs
    &&key===RESULT+intent.fillId+'_'+intent.attemptId;
  const renewals=data.renewalSessionsV1;
  const fills=data.templateFillSessions;
  const sameRenewal=(intent,result)=>{
    if(intent.kind!=='renewal'||!record(renewals)||!record(fills))return false;
    const renewal=renewals[intent.workflowId],fill=fills[intent.fillId];
    return record(renewal)&&record(fill)
      &&renewal.renewalId===intent.workflowId
      &&renewal.profileId===intent.profileId
      &&renewal.sourceAdId===intent.sourceAdId
      &&renewal.newAdId===result.newAdId
      &&(!Object.hasOwn(renewal,'fillId')||renewal.fillId===intent.fillId)
      &&fill.fillId===intent.fillId&&fill.renewalId===intent.workflowId
      &&fill.sourceAdId===intent.sourceAdId
      &&fill.status==='complete'&&fill.stage==='new-id-confirmed'
      &&(!Number.isSafeInteger(fill.targetTabId)||fill.targetTabId===intent.targetTabId);
  };
  const intents=Object.entries(data).filter(([key])=>key.startsWith(INTENT));
  const resolutionKeys=Object.keys(data).filter(key=>key.startsWith(RESULT));
  summary.intentsExamined=intents.length;
  const knownResults=new Set();
  for(const [key,row] of intents){
    if(!validIntent(key,row)||!Object.hasOwn(row,'admissionToken')){
      summary.invalidOrLegacyIntents++;continue;
    }
    if(!hasCompletedP8(row)){
      summary.missingOrIncompleteP8++;continue;
    }
    summary.completedP8PublicationIntents++;
    const resultKey=RESULT+row.fillId+'_'+row.attemptId;
    knownResults.add(resultKey);
    const resolved=data[resultKey];
    if(!validResult(resultKey,resolved,row)){
      summary.missingOrInvalidResolutions++;continue;
    }
    summary.validPublishedResolutions++;
    if(sameRenewal(row,resolved))summary.matchedRenewalLineages++;
    else if(row.kind==='renewal')summary.missingOrContradictorySessions++;
  }
  summary.orphanResolutions=resolutionKeys.filter(key=>
    !Object.hasOwn(data,INTENT+key.slice(RESULT.length))).length;
  if(summary.matchedRenewalLineages>0&&summary.orphanResolutions===0){
    summary.status='PUBLISH_LINEAGE_MATCHED';
  } else if(intents.length>0||resolutionKeys.length>0){
    summary.status='PUBLISH_LINEAGE_NOT_CONFIRMED';
  }
  // Deliberately do not output account/profile, URLs, old/new Ad IDs,
  // intent/attempt/fill/renewal IDs, P8 tokens, or raw exceptions.
  print(summary);
})().catch(()=>{
  console.info('KAR171_R1_PUBLISH_LINEAGE_V1',
    JSON.stringify({status:'READ_FAILED',r1Accepted:false,sourceDeletionVerified:false}));
});
