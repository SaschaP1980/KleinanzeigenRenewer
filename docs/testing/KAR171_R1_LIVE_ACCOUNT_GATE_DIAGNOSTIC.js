// KAR-171 R1 — read-only privacy-safe reason for LIVE_ACCOUNT_UUID_NAME_UNVERIFIED.
// Run ONLY in the installed v1.25.14 Kleinanzeigen Manager service worker DevTools.
// No tabs created, no messages, no ad changes, no updater authority.
// This script observes preconditions; it is NOT the Stage3 remote proof.
(async () => {
  'use strict';
  const TAG='KAR171_R1_ACCOUNT_GATE_DIAGNOSTIC_V1';
  const EXT='hafahjhhgiipdegfkgacchmnacgblnah';
  const pfx='karPhase4UncertainAttemptV1_';
  const pub='karAutoPublishIntentV1_';
  const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
  const known=new Set([
    'PROFILE_MISSING_OR_INVALID','PROFILE_STORAGE_UNAVAILABLE',
    'PROFILE_CHANGED_DURING_READ','PROFILE_MISMATCH',
    'STORED_PROFILES_MATCH_BUT_LIVE_UNVERIFIED','LIVE_ACCOUNT_TABS_UNAVAILABLE',
    'LIVE_ACCOUNT_MY_ADS_TAB_ABSENT','LIVE_ACCOUNT_SOURCE_UNAVAILABLE',
    'LIVE_ACCOUNT_STATUS_UNAVAILABLE','LIVE_ACCOUNT_STATUS_UNVERIFIED',
    'LIVE_ACCOUNT_TABS_DISAGREE','LIVE_ACCOUNT_PROFILE_NAME_MISMATCH',
    'LIVE_ACCOUNT_PROFILE_MATCH','LIVE_ACCOUNT_TABS_CHANGED',
    'LIVE_ACCOUNT_PROFILE_CHANGED_DURING_READ',
    'LIVE_ACCOUNT_STATUS_CHANGED_DURING_READ'
  ]);
  const base={status:'ACCOUNT_GATE_UNVERIFIED',accountReason:'ACCOUNT_REASON_UNVERIFIED',
    phase4Context:'NOT_RUN',publicationContext:'NOT_RUN',
    liveRemoteVerified:false,r1Accepted:false,eligibleForLease:false};
  const output=v=>console.info(TAG,JSON.stringify({...base,...v,
    liveRemoteVerified:false,r1Accepted:false,eligibleForLease:false}));
  if(typeof chrome==='undefined'||chrome?.runtime?.id!==EXT
    ||typeof location==='undefined'||location.protocol!=='chrome-extension:'
    ||location.hostname!==EXT){
    output({status:'WRONG_EXTENSION_CONTEXT'});return;
  }
  if(typeof requireAdditionalOwnerObserver!=='function'){
    output({status:'RUNTIME_NOT_READY'});return;
  }
  let obs;
  try {obs=requireAdditionalOwnerObserver();}
  catch {output({status:'RUNTIME_NOT_READY'});return;}
  if(typeof obs?.observe!=='function'
    ||typeof obs?.verifyRemoteCommitContextReadOnly!=='function'){
    output({status:'RUNTIME_NOT_READY'});return;
  }
  let observed;
  try {observed=await obs.observe();}
  catch {output({status:'ACCOUNT_OBSERVATION_UNAVAILABLE'});return;}
  const raw=observed?.context?.profile?.reason;
  const reason=known.has(raw)?raw:'ACCOUNT_REASON_UNVERIFIED';
  if(observed?.schema!==1||observed?.eligibleForLease!==false
    ||reason!=='LIVE_ACCOUNT_PROFILE_MATCH'
    ||observed?.context?.profile?.state!=='matched'){
    output({status:reason==='LIVE_ACCOUNT_MY_ADS_TAB_ABSENT'
      ?'LIVE_MY_ADS_TAB_REQUIRED':'ACCOUNT_GATE_UNVERIFIED',accountReason:reason});
    return;
  }
  if(typeof chrome.storage?.local?.get!=='function'){
    output({status:'ORIGINAL_STORAGE_UNAVAILABLE',accountReason:reason});return;
  }
  let rows;
  try {rows=await chrome.storage.local.get(null);}
  catch {output({status:'ORIGINAL_STORAGE_UNAVAILABLE',accountReason:reason});return;}
  if(!rows||typeof rows!=='object'||Array.isArray(rows)){
    output({status:'ORIGINAL_STORAGE_UNAVAILABLE',accountReason:reason});return;
  }
  const phases=Object.entries(rows).filter(([k])=>k.startsWith(pfx));
  if(phases.length!==1){
    output({status:'HISTORICAL_ORIGIN_UNVERIFIED',accountReason:reason});return;
  }
  const [key,phase]=phases[0];
  const pubs=Object.entries(rows).filter(([k,v])=>k.startsWith(pub)
    &&v&&typeof v==='object'&&v.workflowId===phase?.renewalId);
  if(!phase||!id(phase.renewalId)||!id(phase.attemptId)
      ||key!==pfx+phase.renewalId+'_'+phase.attemptId
      ||pubs.length!==1||!pubs[0][1]||pubs[0][1].kind!=='renewal'){
    output({status:'HISTORICAL_ORIGIN_UNVERIFIED',accountReason:reason});return;
  }
  const publication=pubs[0][1];
  let phaseOK=false,publishOK=false;
  try {phaseOK=await obs.verifyRemoteCommitContextReadOnly(phase,'phase4')===true;}
  catch {/* Failure stays UNVERIFIED. */}
  try {publishOK=await obs.verifyRemoteCommitContextReadOnly(publication,'publish')===true;}
  catch {/* Failure stays UNVERIFIED. */}
  output({status:phaseOK&&publishOK?'HISTORICAL_CONTEXTS_MATCHED_READ_ONLY'
    :'HISTORICAL_CONTEXT_UNVERIFIED',accountReason:reason,
    phase4Context:phaseOK?'MATCHED':'UNVERIFIED',
    publicationContext:publishOK?'MATCHED':'UNVERIFIED'});
})().catch(()=>{
  console.info('KAR171_R1_ACCOUNT_GATE_DIAGNOSTIC_V1',JSON.stringify({
    status:'DIAGNOSTIC_UNAVAILABLE',accountReason:'ACCOUNT_REASON_UNVERIFIED',
    phase4Context:'NOT_RUN',publicationContext:'NOT_RUN',
    liveRemoteVerified:false,r1Accepted:false,eligibleForLease:false
  }));
});
