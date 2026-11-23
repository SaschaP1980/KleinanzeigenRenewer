// KAR-171 R1 — CONTROLLED 45-SECOND SOURCE HOLD for real original-P8 My Ads.
 // Intentional diagnostic failure if no owner-authorized worker interruption:
 // after a verified first page the content request stays pending for 45s,
 // then times out fail-closed; never creates an updater release certificate.
// PRIVATE R1 SOURCE HOLD; do not run until a separately approved, versioned
// owner-installed Work build and explicit reviewed native safety protocol.
// This invokes the real authenticated source/target read-only remote checker.
// It writes bounded diagnostic records to chrome.storage.local in the CONTENT
// contexts; NO remote listing mutation, updater lease/apply or Chrome reload.
// A worker's terminal output or lack thereof does NOT certify in-flight state.
// Run ONCE in installed test build's SERVICE WORKER DevTools ONLY, after
// reviewing docs/testing/KAR171_R1_OWNER_PC_READ_ONLY_PROTOCOL.md.
// Unlike Stage0/1/2, this asks the trusted runtime to open and close its own
// read-only My Ads verification tabs; tab-registry bookkeeping may be written.
// It does not publish, delete, renew, reset or reserve/apply an updater.
// Never run just to create evidence: one original P8 Phase4 attempt must exist.
// Output contains only a bounded, sanitized status (no account/Ad/token/IDs).
(async () => {
  'use strict';
  const TAG='KAR171_R1_CONTROLLED_SOURCE_HOLD_V1';
  const EXT='hafahjhhgiipdegfkgacchmnacgblnah';
  const PHASE='karPhase4UncertainAttemptV1_';
  // This source must never be invoked against the older archived v1.25.21.
  const MIN_VERSION='1.25.24';
  const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
  const runtimeVersion=()=>{
    try {
      const v=chrome?.runtime?.getManifest?.().version;
      return typeof v==='string'&&/^[0-9]{1,3}[.][0-9]{1,3}[.][0-9]{1,3}$/.test(v)?v:'UNKNOWN';
    }catch{return 'UNKNOWN';}
  };
  const output=(status,verified=false)=>console.info(TAG,JSON.stringify({
    status,runtimeVersion:runtimeVersion(),liveRemoteVerified:verified===true,
    r1Accepted:false,eligibleForLease:false
  }));
  if(typeof chrome==='undefined'||chrome?.runtime?.id!==EXT
    ||typeof location==='undefined'||location.protocol!=='chrome-extension:'
    ||location.hostname!==EXT||typeof chrome.storage?.local?.get!=='function'){
    output('WRONG_EXTENSION_CONTEXT');return;
  }
  if(runtimeVersion()!==MIN_VERSION){
    output('VERSIONED_WORK_BUILD_NOT_INSTALLED');return;
  }
  if(typeof crypto?.getRandomValues!=='function'){
    output('CRYPTO_NONCE_UNAVAILABLE');return;
  }
  const privateBytes=crypto.getRandomValues(new Uint8Array(16));
  const r1PrivateWitnessNonce=[...privateBytes]
    .map(x=>x.toString(16).padStart(2,'0')).join('');
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
      renewalId:original.renewalId,attemptId:original.attemptId,
      r1PrivateWitnessNonce,
      r1PrivateHoldKind:'source'
    });
    const allow=new Set([
      'ORIGINAL_ACCOUNT_REMOTE_VERIFIED','REMOTE_PROOF_PORT_UNAVAILABLE',
      'PRIVATE_WITNESS_CONTEXT_UNVERIFIED',
      'ORIGINAL_ID_UNVERIFIED','ORIGINAL_SNAPSHOT_UNAVAILABLE',
      'PHASE4_ORIGINAL_UNVERIFIED','PHASE4_OUTCOME_UNVERIFIED',
      'PUBLICATION_AMBIGUOUS_OR_MISSING','PUBLICATION_ORIGINAL_UNVERIFIED',
      'PUBLICATION_OUTCOME_UNVERIFIED','ORIGINAL_SESSION_STATE_UNVERIFIED',
      'LIVE_ACCOUNT_UUID_NAME_UNVERIFIED',
      'R1_ACCOUNT_ORIGINAL_CONTEXT_UNVERIFIED',
      'R1_ACCOUNT_CONTEXT_READ_UNAVAILABLE',
      'R1_ACCOUNT_PROFILE_CONTEXT_CHANGED',
      'R1_ACCOUNT_LIVE_SITE_OR_PROFILE_UNVERIFIED',
      'R1_ACCOUNT_LOCAL_UUID_UNVERIFIED',
      'R1_ACCOUNT_PHASE4_NAME_UNVERIFIED',
      'R1_ACCOUNT_PUBLICATION_UUID_UNVERIFIED',
      'R1_ACCOUNT_SESSION_CONTEXT_UNVERIFIED',
      'FRESH_SOURCE_TARGET_UNVERIFIED','LIVE_ACCOUNT_CHANGED_DURING_SCAN',
      'ORIGINAL_READBACK_FAILED','ORIGINAL_READBACK_UNAVAILABLE',
      'ORIGINAL_INITIAL_SNAPSHOT_UNAVAILABLE',
      'ORIGINAL_PHASE4_VALIDATION_UNAVAILABLE',
      'ORIGINAL_PUBLICATION_VALIDATION_UNAVAILABLE',
      'ORIGINAL_PRESCAN_ACCOUNT_UNAVAILABLE',
      'ORIGINAL_REMOTE_GATE_UNAVAILABLE',
      'ORIGINAL_POSTSCAN_ACCOUNT_UNAVAILABLE',
      'ORIGINAL_STABILITY_CHECK_UNAVAILABLE',
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
  console.info('KAR171_R1_CONTROLLED_SOURCE_HOLD_V1',JSON.stringify({
    status:'READ_FAILED',liveRemoteVerified:false,r1Accepted:false,eligibleForLease:false
  }));
});
