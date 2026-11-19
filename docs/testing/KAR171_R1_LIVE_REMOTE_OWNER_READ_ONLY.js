// KAR-171 R1 — owner-controlled REAL authenticated My Ads check, opt-in.
// Run ONCE in installed test build's SERVICE WORKER DevTools ONLY, after
// reviewing docs/testing/KAR171_R1_OWNER_PC_READ_ONLY_PROTOCOL.md.
// Unlike Stage0/1/2, this asks the trusted runtime to open and close its own
// read-only My Ads verification tabs; tab-registry bookkeeping may be written.
// It does not publish, delete, renew, reset or reserve/apply an updater.
// Never run just to create evidence: one original P8 Phase4 attempt must exist.
// Output contains only a bounded, sanitized status (no account/Ad/token/IDs).
(async () => {
  'use strict';
  const TAG='KAR171_R1_LIVE_REMOTE_OWNER_V1';
  const EXT='hafahjhhgiipdegfkgacchmnacgblnah';
  const PHASE='karPhase4UncertainAttemptV1_';
  const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
  const output=(status,verified=false)=>console.info(TAG,JSON.stringify({
    status,liveRemoteVerified:verified===true,
    r1Accepted:false,eligibleForLease:false
  }));
  if(typeof chrome==='undefined'||chrome?.runtime?.id!==EXT
    ||typeof location==='undefined'||location.protocol!=='chrome-extension:'
    ||location.hostname!==EXT||typeof chrome.storage?.local?.get!=='function'){
    output('WRONG_EXTENSION_CONTEXT');return;
  }
  if(typeof requireAdditionalOwnerObserver!=='function'){
    output('RUNTIME_NOT_READY');return;
  }
  let rows;
  try{
    rows=await chrome.storage.local.get(null);
    if(!rows||typeof rows!=='object'||Array.isArray(rows))throw Error('bad snapshot');
  }catch{output('READ_FAILED');return;}
  const origins=Object.entries(rows).filter(([key])=>key.startsWith(PHASE));
  if(origins.length!==1){output('ORIGINAL_PHASE4_NOT_UNIQUE');return;}
  const [key,original]=origins[0];
  if(!original||typeof original!=='object'||Array.isArray(original)
    ||!id(original.renewalId)||!id(original.attemptId)
    ||key!==PHASE+original.renewalId+'_'+original.attemptId){
    output('ORIGINAL_PHASE4_UNVERIFIED');return;
  }
  let observer;
  try{observer=requireAdditionalOwnerObserver();}
  catch{output('RUNTIME_NOT_READY');return;}
  if(typeof observer?.inspectOriginalRenewalRemoteLineageReadOnly!=='function'){
    output('RUNTIME_NOT_READY');return;
  }
  try {
    const checked=await observer.inspectOriginalRenewalRemoteLineageReadOnly({
      renewalId:original.renewalId,attemptId:original.attemptId
    });
    const allow=new Set([
      'ORIGINAL_ACCOUNT_REMOTE_VERIFIED','REMOTE_PROOF_PORT_UNAVAILABLE',
      'ORIGINAL_ID_UNVERIFIED','ORIGINAL_SNAPSHOT_UNAVAILABLE',
      'PHASE4_ORIGINAL_UNVERIFIED','PHASE4_OUTCOME_UNVERIFIED',
      'PUBLICATION_AMBIGUOUS_OR_MISSING','PUBLICATION_ORIGINAL_UNVERIFIED',
      'PUBLICATION_OUTCOME_UNVERIFIED','ORIGINAL_SESSION_STATE_UNVERIFIED',
      'LIVE_ACCOUNT_UUID_NAME_UNVERIFIED',
      'FRESH_SOURCE_TARGET_UNVERIFIED','LIVE_ACCOUNT_CHANGED_DURING_SCAN',
      'ORIGINAL_READBACK_FAILED','ORIGINAL_READBACK_UNAVAILABLE',
      'ORIGINAL_OR_PROFILE_CHANGED_DURING_SCAN',
      'R1_REMOTE_SCAN_NOT_STARTED','R1_REMOTE_TARGET_NOT_STARTED',
      'R1_REMOTE_FINAL_RESPONSE_FAILED',
      'R1_REMOTE_SOURCE_TAB_CREATE_FAILED',
      'R1_REMOTE_SOURCE_TAB_LOAD_FAILED',
      'R1_REMOTE_SOURCE_CONTENT_FAILED',
      'R1_REMOTE_SOURCE_ACCOUNT_FAILED',
      'R1_REMOTE_SOURCE_QUERY_FAILED',
      'R1_REMOTE_SOURCE_ACCOUNT_RECHECK_FAILED',
      'R1_REMOTE_SOURCE_EVIDENCE_FAILED',
      'R1_REMOTE_TARGET_TAB_CREATE_FAILED',
      'R1_REMOTE_TARGET_TAB_LOAD_FAILED',
      'R1_REMOTE_TARGET_CONTENT_FAILED',
      'R1_REMOTE_TARGET_ACCOUNT_FAILED',
      'R1_REMOTE_TARGET_QUERY_FAILED',
      'R1_REMOTE_TARGET_ACCOUNT_RECHECK_FAILED',
      'R1_REMOTE_TARGET_EVIDENCE_FAILED',
      'ORIGINAL_REMOTE_PROOF_UNAVAILABLE'
    ]);
    const status=allow.has(checked?.status)?checked.status:'REMOTE_PROOF_UNVERIFIED';
    output(status,status==='ORIGINAL_ACCOUNT_REMOTE_VERIFIED'
      &&checked?.liveRemoteVerified===true
      &&checked?.r1Accepted===false&&checked?.eligibleForLease===false);
  }catch{output('REMOTE_PROOF_UNAVAILABLE');}
})().catch(()=>{
  console.info('KAR171_R1_LIVE_REMOTE_OWNER_V1',JSON.stringify({
    status:'READ_FAILED',liveRemoteVerified:false,r1Accepted:false,eligibleForLease:false
  }));
});
