'use strict';
// KAR-210 S02: historical reset contract, independent of S06/B14 candidate adoption.
const test=require('node:test');
const assert=require('node:assert/strict');
const Repo=require('../src/background/repositories/renewal-state-repository.js');
const Reset=require('../src/background/controllers/workflow-emergency-reset-controller.js');
const copy=x=>structuredClone(x);
function fixture(mode,postPublish=true) {
  const initial={renewalId:'r',sourceInventoryId:'100',skeletonInventoryId:'renewal:r',sourceAdId:'100',profileId:'p',status:postPublish?'verified':'running',stage:postPublish?'source-delete-started':'filling',renewalMode:mode,createdAt:new Date().toISOString(),...(postPublish?{newAdId:'200',newIdConfirmedAt:new Date().toISOString(),comparison:{ownAdsPresence:true}}:{})};
  const data={renewalSessionsV1:{r:copy(initial)}};
  const storage={async get(k){return {[k]:copy(data[k])};},async set(p){Object.assign(data,copy(p));}};
  const repo=Repo.create({storageLocal:storage});
  let generation=0;
  const logs=[], broadcasts=[],closed=[];
  const noop=async()=>{};
  const reset=Reset.create({
    bumpEmergencyResetGeneration:()=>++generation,resetMassRenewalWorkflowRuntimeState:()=>{},
    automaticReplacementInFlight:new Set(['r']),renewalPhase1RetryInFlight:new Set(),renewalPublishDetectionInFlight:new Set(),trashTemplatePublishDetectionInFlight:new Set(),
    mutateBulkRunState:async fn=>fn(null),closeRegistryTabs:async ids=>closed.push(...ids),closeRegistryTab:noop,releaseBulkSourceOwnership:noop,
    readFillSessions:async()=>({}),writeFillSessions:noop,requireTemplateFillService:()=>({isEmergencyResettableSession:()=>false}),
    RenewalStateRepository:Repo,readRenewalSessions:repo.readRenewalSessions,writeRenewalSessions:repo.writeRenewalSessions,
    renewalHoldsInsertionLock:Repo.renewalHoldsInsertionLock,isSafeLegacyManualEmergencyReset:Repo.isSafeLegacyManualEmergencyReset,isSafePrePublishPaidInsertion:Repo.isSafePrePublishPaidInsertion,emergencyResetRenewalState:Repo.emergencyResetRenewalState,
    readArchiveInsertionSessions:async()=>({}),writeArchiveInsertionSessions:noop,readMassRenewalBatch:async()=>null,writeMassRenewalBatch:noop,touchMassRenewalItemProgress:()=>{},
    getTabRegistrySnapshot:async()=>[{tabId:73,managed:true,lifecycleState:'active'},{tabId:99,managed:false,lifecycleState:'active'}],TAB_STATES:{GONE:'gone'},
    logDiagnostic:async (...args)=>logs.push(args),sessionCorrelationContext:()=>({}),broadcastInventoryChanged:(...args)=>broadcasts.push(args)
  });
  return {initial,repo,reset,logs,broadcasts,closed};
}
for(const mode of ['fast','safe']) test('historical '+mode+' post-publish reset retains identity, uncertainty and stale-write protection',async()=>{
  const f=fixture(mode);
  const outcome=await f.reset.resetActiveWorkflows();
  assert.equal(outcome.reset,true);assert.equal(outcome.affected,1);assert.equal(outcome.accountIndependent,true);assert.equal(outcome.remoteVerificationAttempted,false);
  const cancelled=(await f.repo.readRenewalSessions()).r;
  for(const key of ['sourceInventoryId','skeletonInventoryId','sourceAdId','newAdId','profileId','comparison','renewalMode']) assert.deepEqual(cancelled[key],f.initial[key],key);
  assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.stage,'emergency-reset-unverified');assert.equal(cancelled.remoteVerification,'unverified');assert.equal(cancelled.remoteVerificationRequired,true);
  assert.equal(Repo.renewalHoldsInsertionLock(cancelled),false);assert.deepEqual(f.closed,[73]);
  assert.equal(f.logs.at(-1)[2].remoteVerificationAttempted,false);
  assert.equal(f.broadcasts.at(-1)[0],'workflow-emergency-reset');
  await f.repo.writeRenewalSessions({r:{...f.initial,status:'replaced',stage:'source-delete-verified'}});
  assert.deepEqual((await f.repo.readRenewalSessions()).r,cancelled);
  await f.repo.writeRenewalSessions({});
  assert.deepEqual((await f.repo.readRenewalSessions()).r,cancelled);
  assert.equal((await f.reset.resetActiveWorkflows()).affected,0);
  assert.deepEqual((await f.repo.readRenewalSessions()).r,cancelled);
});
test('historical pre-publish reset does not invent remote identity or outcome',async()=>{
  const f=fixture('fast',false);
  await f.reset.resetActiveWorkflows();
  const current=(await f.repo.readRenewalSessions()).r;
  assert.equal(current.status,'cancelled');assert.equal(current.stage,'manual-emergency-reset');
  assert.equal(current.newAdId,undefined);assert.notEqual(current.remoteVerificationRequired,true);
  assert.equal(Repo.renewalHoldsInsertionLock(current),false);
});
