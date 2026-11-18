// KAR-171 R1 — Stage 2: original Phase4 P8 historical remote outcome lineage.
// Inspect source, then execute ONCE only in the installed extension's SERVICE
// WORKER DevTools console (extension ID below). No production integration.
// Exactly ONE chrome.storage.local.get(null) snapshot, no writes / tab access /
// network / Web Locks / updater or remote deletion. Prints ONLY redacted counts.
// A positive HISTORICAL match is NOT a current authenticated My Ads recheck,
// a live account IDLE certificate, or full R1 acceptance.
(async () => {
  'use strict';
  const TAG='KAR171_R1_PHASE4_LINEAGE_V1';
  const EXT='hafahjhhgiipdegfkgacchmnacgblnah';
  const START='karAtomicAdmissionStartV1_';
  const FINISH='karAtomicAdmissionFinishV1_';
  const PHASE='karPhase4UncertainAttemptV1_';
  const RESULT='karPhase4VerifiedResolutionV1_';
  const PUBLISH='karAutoPublishIntentV1_';
  const PUBRES='karAutoPublishVerifiedResolutionV1_';
  const PHASE_OPS=new Set([
    'AUTONOMOUS:renewal-auto-phase4','AUTONOMOUS:renewal-resume',
    'AUTONOMOUS:renewal-detached-retry','AUTONOMOUS:renewal-detached-verify',
    'AUTONOMOUS:mass-renewal-next-item','RETRY_RENEWAL_VERIFICATION',
    'RETRY_MASS_RENEWAL_ITEM','FINISH_RENEWAL_REPLACEMENT'
  ]);
  const PUB_OPS=new Set([
    'AUTONOMOUS:renewal-publish-detection','AUTONOMOUS:trash-publish-detection',
    'AUTONOMOUS:archive-postpublish-detached','AUTHORIZE_AUTOMATIC_PUBLISH'
  ]);
  const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
  const ad=x=>typeof x==='string'&&/^\d+$/.test(x);
  const time=x=>Number.isSafeInteger(x)&&x>=0;
  const print=x=>console.info(TAG,JSON.stringify(x));
  if(typeof chrome==='undefined'||chrome?.runtime?.id!==EXT
    ||typeof location==='undefined'||location.protocol!=='chrome-extension:'
    ||location.hostname!==EXT||typeof chrome.storage?.local?.get!=='function'){
    print({status:'WRONG_EXTENSION_CONTEXT',r1Accepted:false,liveRemoteVerified:false});
    return;
  }
  let rows;
  try {
    rows=await chrome.storage.local.get(null);
    if(!record(rows))throw Error('invalid storage snapshot');
  }catch{
    print({status:'READ_FAILED',r1Accepted:false,liveRemoteVerified:false});
    return;
  }
  const result={
    status:'NO_PHASE4_INTENT',
    version:String(chrome.runtime.getManifest?.()?.version||'unknown'),
    scope:'one-local-storage-read; historical-origin-only; NOT live My Ads',
    phase4Intents:0,
    completedPhase4P8:0,
    validPhase4Resolutions:0,
    matchedPublishedTargets:0,
    publishIntentsExamined:0,
    publishCandidatesValidShape:0,
    publishCandidatesSameRenewal:0,
    publishCandidatesSameProfile:0,
    publishCandidatesSameSource:0,
    publishCandidatesCompletedP8:0,
    publishCandidatesVerifiedOutcome:0,
    publishCandidatesSameTarget:0,
    publishCandidatesCrossRepresentationSameTarget:0,
    publishJoinReason:'NOT_EVALUATED',
    legacyPhase4Intents:0,
    missingOrIncompletePhase4P8:0,
    missingOrInvalidPhase4Results:0,
    orphanPhase4Resolutions:0,
    invalidPhase4Intents:0,
    liveRemoteVerified:false,
    r1Accepted:false
  };
  const validP8=(ref,ops)=>{
    if(!id(ref?.admissionToken)||ref.admissionToken.length<12
      ||!id(ref?.workerInstanceId)||!time(ref?.createdAtMs))return false;
    const token=ref.admissionToken;
    const start=rows[START+token],finish=rows[FINISH+token];
    return record(start)&&Object.keys(start).length===6
      &&start.schema===1&&start.state==='admitted'
      &&start.token===token&&start.workerInstanceId===ref.workerInstanceId
      &&id(start.token)&&id(start.workerInstanceId)
      &&ops.has(start.operationType)&&time(start.startedAtMs)
      &&start.startedAtMs<=ref.createdAtMs
      &&record(finish)&&Object.keys(finish).length===5
      &&finish.schema===1&&finish.state==='completed'
      &&finish.token===token&&finish.workerInstanceId===ref.workerInstanceId
      &&time(finish.completedAtMs)&&finish.completedAtMs>=ref.createdAtMs;
  };
  const validPhase=(key,row)=>record(row)
    &&row.schema===1&&row.state==='outcome-unverified'
    &&id(row.renewalId)&&id(row.attemptId)&&id(row.workerInstanceId)
    &&typeof row.profileId==='string'&&Boolean(row.profileId.trim())
    &&row.profileId.length<=256
    &&ad(row.sourceAdId)&&ad(row.newAdId)&&row.sourceAdId!==row.newAdId
    &&time(row.createdAtMs)&&key===PHASE+row.renewalId+'_'+row.attemptId;
  const validResolution=(key,out,origin)=>record(out)
    &&out.schema===1&&out.state==='resolved-confirmed'
    &&id(out.workerInstanceId)
    &&out.renewalId===origin.renewalId&&out.attemptId===origin.attemptId
    &&out.profileId===origin.profileId
    &&out.sourceAdId===origin.sourceAdId&&out.newAdId===origin.newAdId
    &&out.sourceEvidence==='not-in-my-ads-full-pagination-scan'
    &&out.targetEvidence==='found-in-my-ads-full-pagination-scan'
    &&Number.isSafeInteger(out.sourcePagesScanned)&&out.sourcePagesScanned>=1
    &&Number.isSafeInteger(out.targetPagesScanned)&&out.targetPagesScanned>=1
    &&Number.isSafeInteger(out.targetFoundPage)&&out.targetFoundPage>=1
    &&out.targetFoundPage<=out.targetPagesScanned
    &&time(out.verifiedAtMs)&&out.verifiedAtMs>=origin.createdAtMs
    &&key===RESULT+origin.renewalId+'_'+origin.attemptId;
  const validPublish=(key,row)=>record(row)&&row.schema===1
    &&row.state==='outcome-unverified'&&row.kind==='renewal'
    &&id(row.fillId)&&id(row.workflowId)&&id(row.attemptId)
    &&id(row.workerInstanceId)
    &&typeof row.profileId==='string'&&Boolean(row.profileId.trim())
    &&row.profileId.length<=256
    &&ad(row.sourceAdId)
    &&Number.isSafeInteger(row.targetTabId)&&row.targetTabId>0
    &&time(row.createdAtMs)
    &&key===PUBLISH+row.fillId+'_'+row.attemptId;
  const validPublishedResult=(key,row,intent)=>record(row)
    &&row.schema===1&&row.state==='resolved-confirmed'
    &&row.fillId===intent.fillId&&row.workflowId===intent.workflowId
    &&row.attemptId===intent.attemptId&&row.kind==='renewal'
    &&row.profileId===intent.profileId&&row.sourceAdId===intent.sourceAdId
    &&row.targetTabId===intent.targetTabId
    &&ad(row.newAdId)&&row.newAdId!==intent.sourceAdId
    &&row.targetPresent===true
    &&row.targetEvidence==='found-in-my-ads-full-pagination-scan'
    &&Number.isSafeInteger(row.targetPagesScanned)&&row.targetPagesScanned>=1
    &&Number.isSafeInteger(row.targetFoundPage)&&row.targetFoundPage>=1
    &&row.targetFoundPage<=row.targetPagesScanned
    &&time(row.verifiedAtMs)&&row.verifiedAtMs>=intent.createdAtMs
    &&key===PUBRES+intent.fillId+'_'+intent.attemptId;
  const publishIntents=Object.entries(rows).filter(([key])=>key.startsWith(PUBLISH));
  result.publishIntentsExamined=publishIntents.length;
  // The existing strict join is unchanged. Record only a monotonic,
  // anonymous diagnostic funnel to explain WHERE its predicates fail.
  // Never output account/Ad/workflow/fill/token IDs, row samples or hashes.
  const matchingPublication=phase=>{
    for(const [key,publication] of publishIntents){
      if(!validPublish(key,publication))continue;
      result.publishCandidatesValidShape++;
      if(publication.workflowId!==phase.renewalId)continue;
      result.publishCandidatesSameRenewal++;
      if(publication.profileId!==phase.profileId){
        // Two separately verified historical My Ads target receipts can be
        // correlated by immutable renewal/source/target and original P8.
        // This is NOT a trusted UUID-to-display-name account binding and
        // must never increment matchedPublishedTargets or accept R1.
        if(publication.sourceAdId!==phase.sourceAdId
            || !validP8(publication,PUB_OPS))continue;
        const crossKey=PUBRES+publication.fillId+'_'+publication.attemptId;
        const cross=rows[crossKey];
        if(!validPublishedResult(crossKey,cross,publication)
            || cross.newAdId!==phase.newAdId)continue;
        result.publishCandidatesCrossRepresentationSameTarget++;
        continue;
      }
      result.publishCandidatesSameProfile++;
      if(publication.sourceAdId!==phase.sourceAdId)continue;
      result.publishCandidatesSameSource++;
      if(!validP8(publication,PUB_OPS))continue;
      result.publishCandidatesCompletedP8++;
      const resultKey=PUBRES+publication.fillId+'_'+publication.attemptId;
      const confirmation=rows[resultKey];
      if(!validPublishedResult(resultKey,confirmation,publication))continue;
      result.publishCandidatesVerifiedOutcome++;
      if(confirmation.newAdId!==phase.newAdId)continue;
      result.publishCandidatesSameTarget++;
      return true;
    }
    return false;
  };
  const entries=Object.entries(rows).filter(([key])=>key.startsWith(PHASE));
  result.phase4Intents=entries.length;
  const existingOrigins=new Set(entries.map(([key])=>key.slice(PHASE.length)));
  result.orphanPhase4Resolutions=Object.keys(rows)
    .filter(key=>key.startsWith(RESULT)&&!existingOrigins.has(key.slice(RESULT.length))).length;
  for(const [key,origin] of entries){
    if(!validPhase(key,origin)){
      result.invalidPhase4Intents++;
      continue;
    }
    if(!Object.hasOwn(origin,'admissionToken')){
      result.legacyPhase4Intents++;
      continue;
    }
    if(!validP8(origin,PHASE_OPS)){
      result.missingOrIncompletePhase4P8++;
      continue;
    }
    result.completedPhase4P8++;
    const resolutionKey=RESULT+origin.renewalId+'_'+origin.attemptId;
    if(!validResolution(resolutionKey,rows[resolutionKey],origin)){
      result.missingOrInvalidPhase4Results++;
      continue;
    }
    result.validPhase4Resolutions++;
    if(matchingPublication(origin))result.matchedPublishedTargets++;
  }
  if(result.matchedPublishedTargets>0&&result.orphanPhase4Resolutions===0)
    result.status='PHASE4_P8_PUBLISH_LINEAGE_MATCHED';
  else if(result.phase4Intents>0||result.orphanPhase4Resolutions>0)
    result.status='PHASE4_LINEAGE_NOT_CONFIRMED';

  // A reason is a local *structural observation*, never a causal diagnosis
  // of a software upgrade, a remote deletion failure or a missing listing.
  // All reasons fail closed; none sets r1Accepted or liveRemoteVerified true.
  if(result.status==='PHASE4_P8_PUBLISH_LINEAGE_MATCHED')
    result.publishJoinReason='MATCHED';
  else if(result.orphanPhase4Resolutions>0)
    result.publishJoinReason='ORPHAN_PHASE4_RESOLUTION';
  else if(result.phase4Intents===0)
    result.publishJoinReason='NO_PHASE4_INTENT';
  else if(result.validPhase4Resolutions===0)
    result.publishJoinReason='NO_VALID_PHASE4_RESOLUTION';
  else if(result.publishIntentsExamined===0)
    result.publishJoinReason='NO_PUBLISH_INTENT';
  else if(result.publishCandidatesValidShape===0)
    result.publishJoinReason='NO_VALID_RENEWAL_PUBLISH_INTENT';
  else if(result.publishCandidatesSameRenewal===0)
    result.publishJoinReason='PUBLISH_WORKFLOW_MISMATCH';
  else if(result.publishCandidatesSameProfile===0)
    result.publishJoinReason=result.publishCandidatesCrossRepresentationSameTarget>0
      ?'PUBLISH_PROFILE_UNBOUND_DUAL_REMOTE_TARGET':'PUBLISH_PROFILE_MISMATCH';
  else if(result.publishCandidatesSameSource===0)
    result.publishJoinReason='PUBLISH_SOURCE_MISMATCH';
  else if(result.publishCandidatesCompletedP8===0)
    result.publishJoinReason='PUBLISH_P8_NOT_COMPLETED';
  else if(result.publishCandidatesVerifiedOutcome===0)
    result.publishJoinReason='PUBLISH_RESOLUTION_MISSING_OR_INVALID';
  else if(result.publishCandidatesSameTarget===0)
    result.publishJoinReason='PUBLISH_TARGET_MISMATCH';
  else
    result.publishJoinReason='UNMATCHED_ORIGIN';

  // No account, email, Ad IDs, profiles, attempt/workflow/fill IDs, tokens,
  // raw records or exceptions are emitted. Historical evidence only.
  print(result);
})().catch(()=>{
  console.info('KAR171_R1_PHASE4_LINEAGE_V1',
    JSON.stringify({status:'READ_FAILED',r1Accepted:false,liveRemoteVerified:false}));
});
