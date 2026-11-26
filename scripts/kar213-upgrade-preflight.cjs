#!/usr/bin/env node
'use strict';
// S03 offline review ONLY. No Chrome APIs, writes, network, locks or runtime admission.
// The receipt formats below are read-only compatibility checks against donor 1.25.36.
// A consistent historical receipt does not prove the current remote listing state.
const fs=require('node:fs');
const VERSIONS=new Set(['1.23.48','1.25.36','2.0.1.0']);
const PREFIX={
  publish:['karAutoPublishIntentV1_','karAutoPublishVerifiedResolutionV1_'],
  phase4:['karPhase4UncertainAttemptV1_','karPhase4VerifiedResolutionV1_'],
  admission:['karAtomicAdmissionStartV1_','karAtomicAdmissionFinishV1_']
};
const PUBLISH_OPERATIONS=new Set(['AUTONOMOUS:renewal-publish-detection','AUTONOMOUS:trash-publish-detection','AUTONOMOUS:archive-postpublish-detached','AUTHORIZE_AUTOMATIC_PUBLISH']);
const PHASE4_OPERATIONS=new Set(['AUTONOMOUS:renewal-auto-phase4','AUTONOMOUS:renewal-resume','AUTONOMOUS:renewal-detached-retry','AUTONOMOUS:renewal-detached-verify','AUTONOMOUS:mass-renewal-next-item','RETRY_RENEWAL_VERIFICATION','RETRY_MASS_RENEWAL_ITEM','FINISH_RENEWAL_REPLACEMENT']);
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
const ad=x=>typeof x==='string'&&/^\d+$/.test(x);
const profile=x=>typeof x==='string'&&x.trim().length>0&&x.length<=256;
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const equal=(a,b,keys)=>keys.every(k=>a[k]===b[k]);
const own=(o,k)=>Object.hasOwn(o,k);
const roster=r=>r.targetEvidence==='found-in-my-ads-full-pagination-scan'&&integer(r.targetPagesScanned)&&r.targetPagesScanned>=1&&integer(r.targetFoundPage)&&r.targetFoundPage>=1&&r.targetFoundPage<=r.targetPagesScanned;
const targetProof=r=>roster(r)&&!own(r,'targetEditAdId')&&!own(r,'targetPublicAdId')||
  r.kind==='renewal'&&r.targetEvidence==='verified-edit-and-public-listing'&&ad(r.newAdId)&&r.targetEditAdId===r.newAdId&&r.targetPublicAdId===r.newAdId&&!own(r,'targetPagesScanned')&&!own(r,'targetFoundPage');
const sourceProof=r=>r.sourceEvidence==='not-in-my-ads-full-pagination-scan'&&integer(r.sourcePagesScanned)&&r.sourcePagesScanned>=1||
  r.sourceEvidence==='detail-page-explicit-deleted'&&r.sourcePagesScanned===0;
const tokenValid=r=>!own(r,'admissionToken')||id(r.admissionToken)&&r.admissionToken.length>=12;
const uncertain=r=>['source-delete-outcome-unverified','source-delete-status-unverified','publish-intent-blocked'].includes(r?.stage)||r?.status==='publish-blocked'||r?.remoteVerificationRequired===true;
function inspectSnapshot(snapshot,{nowMs=Date.now()}={}){
  const findings=new Map();
  const flag=code=>findings.set(code,(findings.get(code)||0)+1);
  const receipts={publish:0,phase4:0,admission:0};
  const report=()=>({schema:1,status:findings.size?'BLOCKED':'READY_FOR_OFFLINE_REVIEW',activationAuthorized:false,receipts,findings:[...findings].sort(([a],[b])=>a.localeCompare(b)).map(([code,count])=>({code,count}))});
  if(!record(snapshot)||snapshot.schema!==1||!record(snapshot.storageLocal)||!integer(nowMs)){flag('INVALID_SNAPSHOT');return report();}
  if(!VERSIONS.has(snapshot.sourceVersion)){flag('SOURCE_VERSION_UNVERIFIED');return report();}
  const captured=typeof snapshot.capturedAt==='string'?Date.parse(snapshot.capturedAt):NaN;
  if(!integer(captured)||captured>nowMs){flag('INVALID_CAPTURE_TIME');return report();}
  const time=x=>integer(x)&&x<=captured;
  const local=snapshot.storageLocal;
  const families=Object.entries(PREFIX);
  for(const key of Object.keys(local)){
    if(/^(karAutoPublish|karPhase4|karAtomicAdmission|nativeUpdateWorkflowFence)/.test(key)&&key!=='nativeUpdateWorkflowFenceV1'&&!families.some(([,ps])=>ps.some(p=>key.startsWith(p))))flag('UNKNOWN_RECEIPT_KEY');
  }
  const rows=(prefix)=>new Map(Object.entries(local).filter(([key])=>key.startsWith(prefix)).map(([key,row])=>[key.slice(prefix.length),row]));
  function pairs(family,validStart,validResolution,onValid=()=>{}){
    const label=family.toUpperCase(),[p,r]=PREFIX[family],starts=rows(p),resolutions=rows(r),valid=new Map();
    for(const [suffix,start] of starts){
      if(!validStart(suffix,start)){flag(label+'_INVALID');continue;}
      onValid(start);
      if(!resolutions.has(suffix)){flag(label+'_UNRESOLVED');continue;}
      const resolution=resolutions.get(suffix);
      if(!validResolution(suffix,resolution,start)){flag(label+'_INVALID_RESOLUTION');continue;}
      receipts[family]++;
      valid.set(suffix,{start,resolution});
    }
    for(const suffix of resolutions.keys())if(!starts.has(suffix))flag(label+'_ORPHAN_RESOLUTION');
    return valid;
  }
  const admissions=pairs('admission',(suffix,r)=>record(r)&&r.schema===1&&r.state==='admitted'&&id(r.token)&&suffix===r.token&&id(r.workerInstanceId)&&typeof r.operationType==='string'&&r.operationType.length>0&&r.operationType.length<=128&&time(r.startedAtMs),
    (suffix,r,s)=>record(r)&&r.schema===1&&r.state==='completed'&&r.token===suffix&&r.workerInstanceId===s.workerInstanceId&&time(r.completedAtMs)&&r.completedAtMs>=s.startedAtMs);
  function admissionLink(r,allowed){
    if(!own(r,'admissionToken'))return true; // legacy receipt schema permits no token.
    const pair=admissions.get(r.admissionToken);
    return Boolean(pair&&pair.start.workerInstanceId===r.workerInstanceId&&allowed.has(pair.start.operationType)&&pair.start.startedAtMs<=r.createdAtMs&&r.createdAtMs<=pair.resolution.completedAtMs);
  }
  const fillsSeen=new Set();
  const publication=pairs('publish',(suffix,r)=>record(r)&&r.schema===1&&r.state==='outcome-unverified'&&id(r.fillId)&&id(r.workflowId)&&id(r.attemptId)&&id(r.workerInstanceId)&&suffix===r.fillId+'_'+r.attemptId&&profile(r.profileId)&&['renewal','archive'].includes(r.kind)&&integer(r.targetTabId)&&r.targetTabId>0&&(ad(r.sourceAdId)||r.kind==='archive'&&r.sourceAdId==='')&&time(r.createdAtMs)&&tokenValid(r),
    (suffix,r,s)=>record(r)&&r.schema===1&&r.state==='resolved-confirmed'&&equal(r,s,['fillId','workflowId','attemptId','kind','profileId','sourceAdId','targetTabId'])&&ad(r.newAdId)&&r.newAdId!==s.sourceAdId&&r.targetPresent===true&&targetProof(r)&&time(r.verifiedAtMs)&&r.verifiedAtMs>=s.createdAtMs,
    r=>{if(fillsSeen.has(r.fillId))flag('PUBLISH_DUPLICATE_ATTEMPT');fillsSeen.add(r.fillId);if(!admissionLink(r,PUBLISH_OPERATIONS))flag('PUBLISH_INVALID_ADMISSION_LINK');});
  const phase4=pairs('phase4',(suffix,r)=>record(r)&&r.schema===1&&r.state==='outcome-unverified'&&id(r.renewalId)&&id(r.attemptId)&&id(r.workerInstanceId)&&suffix===r.renewalId+'_'+r.attemptId&&profile(r.profileId)&&ad(r.sourceAdId)&&ad(r.newAdId)&&r.sourceAdId!==r.newAdId&&time(r.createdAtMs)&&tokenValid(r),
    (suffix,r,s)=>record(r)&&r.schema===1&&r.state==='resolved-confirmed'&&id(r.workerInstanceId)&&equal(r,s,['renewalId','attemptId','profileId','sourceAdId','newAdId'])&&time(r.verifiedAtMs)&&r.verifiedAtMs>=s.createdAtMs&&sourceProof(r)&&roster(r),
    r=>{if(!admissionLink(r,PHASE4_OPERATIONS))flag('PHASE4_INVALID_ADMISSION_LINK');});
  const map=(key,label)=>{
    if(!own(local,key))return {};
    if(!record(local[key])){flag(label+'_INVALID_MAP');return {};}
    return local[key];
  };
  const renewals=map('renewalSessionsV1','RENEWAL'),archive=map('archiveInsertionSessionsV1','ARCHIVE'),fills=map('templateFillSessions','FILL');
  const cancelledBeforeStart=r=>r.status==='cancelled'&&r.stage==='target-tab-create-failed'&&!r.newAdId&&!r.publishClickedAt&&!r.sourceDeleteAction&&!r.sourceDeletedAt;
  const renewalSettled=r=>record(r)&&!uncertain(r)&&(r.status==='replaced'&&r.stage==='complete'&&ad(r.sourceAdId)&&ad(r.newAdId)&&r.newAdId!==r.sourceAdId||cancelledBeforeStart(r));
  const archiveSettled=r=>record(r)&&!uncertain(r)&&(r.status==='complete'&&r.stage==='complete'&&ad(r.newAdId)||cancelledBeforeStart(r));
  for(const [key,r] of Object.entries(renewals))if(!renewalSettled(r)||r.renewalId!==key)flag('RENEWAL_NOT_SETTLED');
  for(const [key,r] of Object.entries(archive))if(!archiveSettled(r)||r.archiveInsertionId!==key)flag('ARCHIVE_NOT_SETTLED');
  for(const [key,r] of Object.entries(fills)){
    let settled=false;
    if(record(r)&&r.fillId===key&&!uncertain(r)){
      settled=cancelledBeforeStart(r)||r.status==='complete'&&r.stage==='template-only-inventoried'&&ad(r.newAdId);
      if(r.status==='complete'&&r.stage==='new-id-confirmed'&&ad(r.newAdId)){
        const parent=r.renewalId?renewals[r.renewalId]:archive[r.archiveInsertionId];
        settled=Boolean(parent&&(r.renewalId?renewalSettled(parent):archiveSettled(parent))&&parent.newAdId===r.newAdId);
      }
    }
    if(!settled)flag('FILL_NOT_SETTLED');
  }
  // If a matching workflow still exists, it may not contradict the receipt.
  // Absence is normal after successful promotion; unresolved receipt pairs still block.
  for(const {start:s,resolution:r} of publication.values()){
    const parent=s.kind==='renewal'?renewals[s.workflowId]:archive[s.workflowId];
    if(parent&&(!record(parent)||parent.newAdId!==r.newAdId||parent.sourceAdId&&parent.sourceAdId!==s.sourceAdId||parent.profileId&&parent.profileId!==s.profileId||parent.targetProfileId&&parent.targetProfileId!==s.profileId))flag('PUBLISH_SESSION_CONFLICT');
    const fill=fills[s.fillId];
    if(fill&&(!record(fill)||fill.newAdId!==r.newAdId||fill.renewalId&&fill.renewalId!==s.workflowId||fill.archiveInsertionId&&fill.archiveInsertionId!==s.workflowId))flag('PUBLISH_SESSION_CONFLICT');
  }
  for(const {start:s} of phase4.values()){
    const parent=renewals[s.renewalId];
    if(parent&&(!record(parent)||!equal(parent,s,['sourceAdId','newAdId'])||parent.profileId&&parent.profileId!==s.profileId))flag('PHASE4_SESSION_CONFLICT');
  }
  const batch=local.massRenewalBatchV1;
  if(own(local,'massRenewalBatchV1')&&batch!==null&&(!record(batch)||!id(batch.batchId)||!['complete','stopped'].includes(batch.status)||batch.currentIndex!=null||!Array.isArray(batch.items)||batch.items.some(r=>!record(r)||uncertain(r)||!(r.status==='success'&&r.stage==='complete'||r.status==='cancelled'&&r.stage==='not-started-after-stop'))))flag('MASS_NOT_SETTLED');
  const bulk=local.bulkInventoryRun;
  if(own(local,'bulkInventoryRun')&&bulk!==null&&(!record(bulk)||bulk.retryAdId||!(bulk.status==='complete'&&bulk.stage==='finished'||bulk.status==='stopped'&&bulk.stage==='stopped-after-current')))flag('BULK_NOT_SETTLED');
  const fence=local.nativeUpdateWorkflowFenceV1;
  if(own(local,'nativeUpdateWorkflowFenceV1')&&fence!==null&&!(record(fence)&&fence.schema===1&&fence.state==='released'&&Object.keys(fence).length===10&&['transactionId','profileId','workerGeneration','token'].every(k=>id(fence[k]))&&time(fence.createdAtMs)&&integer(fence.expiresAtMs)&&fence.expiresAtMs>=fence.createdAtMs&&time(fence.cancelledAtMs)&&fence.cancelledAtMs>=fence.createdAtMs&&time(fence.releasedAtMs)&&fence.releasedAtMs>=fence.cancelledAtMs))flag('FENCE_NOT_RELEASED');
  for(const key of ['globalListViewModeV1','inventoryListViewModeV1','trashListViewModeV1'])if(own(local,key)&&!['compact','detailed'].includes(local[key]))flag('VIEW_MODE_UNKNOWN');
  const retention=local.trashRetentionDaysV1,revision=local.trashRetentionRevisionV1;
  const validRetention=[10,30,60,90,180,360,'infinite'].includes(retention);
  if(own(local,'trashRetentionDaysV1')&&!validRetention||revision!=null&&(!validRetention||typeof revision!=='string'||!revision.trim()))flag('RETENTION_UNKNOWN');
  return report();
}
if(require.main===module){
  const args=process.argv.slice(2);
  if(args.length!==1){console.error('Usage: node scripts/kar213-upgrade-preflight.cjs <local-snapshot.json>');process.exitCode=2;}
  else {
    try{
      const result=inspectSnapshot(JSON.parse(fs.readFileSync(args[0],'utf8')));
      console.log(JSON.stringify(result,null,2));
      process.exitCode=result.status==='READY_FOR_OFFLINE_REVIEW'?0:1;
    }catch{
      // Do not print file paths, JSON content, receipt IDs or private metadata.
      console.error('Snapshot could not be read or parsed.');process.exitCode=2;
    }
  }
}
module.exports={inspectSnapshot};
