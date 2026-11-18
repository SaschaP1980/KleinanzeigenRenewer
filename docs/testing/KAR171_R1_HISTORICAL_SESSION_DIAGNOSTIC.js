// KAR-171 R1 — historical session lifetime diagnostic (owner opt-in).
// Paste ONCE into the existing v1.25.14 SERVICE WORKER DevTools.
// Existing local storage + already-open authenticated My Ads only.
// No external requests, tab creation, storage mutation, publish/delete/renew,
// updater lease or Chrome reload. Output has fixed enums, NO private values.
(async () => {
  'use strict';
  const TAG='KAR171_R1_HISTORICAL_SESSION_V1';
  const EXT='hafahjhhgiipdegfkgacchmnacgblnah';
  const PHASE='karPhase4UncertainAttemptV1_';
  const PUB='karAutoPublishIntentV1_';
  const BASE=Object.freeze({
    status:'UNVERIFIED',
    account:'UNVERIFIED',phase4Name:'NOT_CHECKED',publicationUuid:'NOT_CHECKED',
    renewalSession:'NOT_CHECKED',fillSession:'NOT_CHECKED',
    liveRemoteVerified:false,r1Accepted:false,eligibleForLease:false
  });
  const emit=fields=>console.info(TAG,JSON.stringify({...BASE,...fields,
    liveRemoteVerified:false,r1Accepted:false,eligibleForLease:false}));
  const rec=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const norm=x=>typeof x==='string'?x.replace(/\s+/g,' ').trim().toLocaleLowerCase('de-DE'):'';
  if(typeof chrome==='undefined'||chrome.runtime?.id!==EXT
    ||typeof location==='undefined'||location.protocol!=='chrome-extension:'
    ||location.hostname!==EXT){
    emit({status:'WRONG_EXTENSION_CONTEXT'});return;
  }
  if(typeof chrome.storage?.local?.get!=='function'
    ||typeof requireAdditionalOwnerObserver!=='function'){
    emit({status:'RUNTIME_NOT_READY'});return;
  }
  let obs,prior;
  try{
    obs=requireAdditionalOwnerObserver();
    if(typeof obs?.observe!=='function')throw Error('missing');
    prior=await obs.observe();
  }catch{emit({status:'ACCOUNT_OBSERVATION_UNAVAILABLE'});return;}
  if(prior?.schema!==1||prior.eligibleForLease!==false
    ||prior.context?.profile?.state!=='matched'
    ||prior.context.profile.reason!=='LIVE_ACCOUNT_PROFILE_MATCH'
    ||typeof prior.context.profile.profileId!=='string'){
    emit({status:'LIVE_ACCOUNT_NOT_MATCHED'});return;
  }
  const currentId=prior.context.profile.profileId;
  let rows;
  try{rows=await chrome.storage.local.get(null);}
  catch{emit({status:'STORAGE_UNAVAILABLE',account:'MATCHED'});return;}
  if(!rec(rows)){emit({status:'STORAGE_UNAVAILABLE',account:'MATCHED'});return;}
  const phases=Object.entries(rows).filter(([key])=>key.startsWith(PHASE));
  if(phases.length!==1){
    emit({status:'ORIGINAL_PHASE4_NOT_UNIQUE',account:'MATCHED'});return;
  }
  const [phaseKey,phase]=phases[0];
  if(!rec(phase)||typeof phase.renewalId!=='string'
    ||typeof phase.attemptId!=='string'
    ||phaseKey!==PHASE+phase.renewalId+'_'+phase.attemptId){
    emit({status:'ORIGINAL_PHASE4_INVALID',account:'MATCHED'});return;
  }
  const pubs=Object.entries(rows).filter(([key,row])=>key.startsWith(PUB)
    &&rec(row)&&row.workflowId===phase.renewalId);
  if(pubs.length!==1||pubs[0][1].kind!=='renewal'
    ||typeof pubs[0][1].fillId!=='string'){
    emit({status:'PUBLICATION_NOT_UNIQUE',account:'MATCHED'});return;
  }
  const publication=pubs[0][1];
  const matchedProfiles=Array.isArray(rows.profilesV1)
    ?rows.profilesV1.filter(p=>rec(p)&&p.profileId===currentId):[];
  if(matchedProfiles.length!==1
    ||rows.activeDetectedProfileV1?.profileId!==currentId
    ||rows.selectedInventoryProfileV1?.profileId!==currentId){
    emit({status:'PROFILE_RECORDS_UNVERIFIED',account:'MATCHED'});return;
  }
  const nameOK=norm(phase.profileId)!==''
    &&norm(matchedProfiles[0].displayName)===norm(phase.profileId);
  const uuidOK=publication.profileId===currentId;
  const sessions=rows.renewalSessionsV1;
  const session=rec(sessions)?sessions[phase.renewalId]:undefined;
  const renewal= !rec(session)?'ABSENT':(
    session.profileId===currentId
    &&String(session.sourceAdId??'')===String(phase.sourceAdId??'')
    &&String(session.newAdId??'')===String(phase.newAdId??'')
    &&session.fillId===publication.fillId
    &&session.targetTabId===publication.targetTabId?'MATCHED':'MISMATCHED');
  const fills=rows.templateFillSessions;
  const fill=rec(fills)?fills[publication.fillId]:undefined;
  const fillStatus=!rec(fill)?'ABSENT':(
    fill.fillId===publication.fillId
    &&fill.renewalId===phase.renewalId
    &&String(fill.sourceAdId??'')===String(phase.sourceAdId??'')
    &&fill.targetTabId===publication.targetTabId?'MATCHED':'MISMATCHED');
  // Two independent local reads + live account recheck: never claim stability
  // from a single snapshot or an account that changes while inspecting it.
  const keys=['profilesV1','activeDetectedProfileV1',
    'selectedInventoryProfileV1','renewalSessionsV1','templateFillSessions',
    phaseKey,pubs[0][0]];
  let latest,after;
  try{
    latest=await chrome.storage.local.get(keys);
    after=await obs.observe();
  }catch{emit({status:'RECHECK_UNAVAILABLE'});return;}
  if(!rec(latest)||keys.some(key=>JSON.stringify(rows[key]??null)
       !==JSON.stringify(latest[key]??null))
     ||after?.schema!==1||after.eligibleForLease!==false
     ||after.context?.profile?.state!=='matched'
     ||after.context.profile.reason!=='LIVE_ACCOUNT_PROFILE_MATCH'
     ||after.context.profile.profileId!==currentId){
    emit({status:'CONTEXT_CHANGED_DURING_READ'});return;
  }
  emit({
    status:renewal==='ABSENT'&&fillStatus==='ABSENT'
      ?'HISTORICAL_SESSIONS_ABSENT'
      :renewal==='MATCHED'&&fillStatus==='MATCHED'
        ?'HISTORICAL_SESSIONS_MATCHED'
        :'HISTORICAL_SESSIONS_INCOMPLETE_OR_MISMATCHED',
    account:'MATCHED',
    phase4Name:nameOK?'MATCHED':'MISMATCHED',
    publicationUuid:uuidOK?'MATCHED':'MISMATCHED',
    renewalSession:renewal,fillSession:fillStatus
  });
})().catch(()=>{
  console.info('KAR171_R1_HISTORICAL_SESSION_V1',JSON.stringify({
    status:'DIAGNOSTIC_UNAVAILABLE',account:'UNVERIFIED',
    phase4Name:'NOT_CHECKED',publicationUuid:'NOT_CHECKED',
    renewalSession:'NOT_CHECKED',fillSession:'NOT_CHECKED',
    liveRemoteVerified:false,r1Accepted:false,eligibleForLease:false
  }));
});
