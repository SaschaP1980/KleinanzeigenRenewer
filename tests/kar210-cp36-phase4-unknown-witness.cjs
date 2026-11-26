'use strict';
// Retained A08/A12/A14 safety REDs, deliberately independent of excluded C04 journal.
const test=require('node:test'),assert=require('node:assert/strict');
const Remote=require('../src/background/services/remote-delete-replacement-service.js');
const session={renewalId:'r',sourceInventoryId:'old',skeletonInventoryId:'new',sourceAdId:'100',newAdId:'200',status:'verified',stage:'source-delete-verification-pending',sourceDeleteTransportInterrupted:true};
function fixture({lateSwitch=false,priorUnknown=false}={}){
 let profile='Owner',workers=0,attempts=0;const sent=[],closed=[],persisted=[],promotions=[];const row=structuredClone(session);
 const api=Remote.create({
  readRenewalSessions:async()=>({r:row}),getInventory:async id=>({inventoryId:id,adId:id==='old'?'100':'200',profileName:'Owner'}),getBulkRunState:async()=>({status:'complete'}),assertMassRenewalManualActionAllowed:async()=>{},normalBrowserWindowId:async()=>null,
  persistRenewalSession:async s=>{persisted.push(structuredClone(s));return s;},
  createManagedWorkerTab:async()=>({id:73+workers++}),waitForTabComplete:async()=>{},ensureContentConnection:async()=>{},closeManagedWorkerTab:async id=>closed.push(id),
  correlationContext:()=>({}),sessionCorrelationContext:()=>({}),normalizeProfileName:s=>String(s||'').trim(),assertEmergencyResetGeneration:()=>true,renewalMaxPhaseAttempts:()=>1,
  renewalPhaseAttemptAvailable:()=>attempts===0,renewalAttemptState:()=>({attempt:attempts}),logRenewalPhaseAttemptStarted:async()=>{attempts++;return {attempt:attempts,attemptId:'fixture-attempt'}},logRenewalPhaseAttemptFailed:async()=>{},isNonRetryableRenewalSafetyError:()=>true,renewalAttemptDetails:()=>({}),delay:async()=>{},
  logDiagnostic:async(_level,event)=>{if(lateSwitch&&event==='RENEWAL_PHASE4_ATOMIC_PREVERIFY_DELETE_STARTED')profile='Other';},
  isPhase4DeleteTransportInterruption:e=>/fixture response port closed/.test(String(e)),
  openDatabase:async()=>{promotions.push('attempted');throw Error('must not promote unresolved source')},
  sendTabRequestWithBootstrap:async(id,m)=>{sent.push({id,type:m.type,profile,adId:m.adId});
   if(m.type==='MY_ADS_STATUS')return {isMyAdsPage:true,isProjectsTab:true,profileName:profile};
   if(m.type==='DELETE_OWN_AD_BY_ID'){if(priorUnknown)throw Error('fixture response port closed');return {actionTriggered:true};}
   if(m.type==='VERIFY_OWN_AD_ABSENT_BY_ID')return {verified:false,foundPage:1};
   throw Error('unexpected request '+m.type);
  }
 });return {api,row,sent,closed,persisted,promotions};
}
test('KAR-128 product: account changes during awaited pre-delete diagnostic; no destructive dispatch under changed account',async()=>{
 const f=fixture({lateSwitch:true});
 const outcome=await f.api.preverifyAndTriggerRenewalSourceDeleteAttempt(f.row,'Owner',null,{attempt:1,attemptId:'a'},0).then(()=>null,e=>e);
 assert.equal(f.sent.filter(x=>x.type==='DELETE_OWN_AD_BY_ID').length,0,'late profile switch must not authorize DELETE');
 assert.ok(outcome,'changed account must refuse destructive attempt');assert.deepEqual(f.closed,[73]);
});
test('KAR-117/124 product: persisted unknown DELETE after worker restart must not automatically replay without independent proof',async()=>{
 const f=fixture({priorUnknown:true});
 await f.api.finishRenewalReplacement({renewalId:'r',automatic:true}).catch(()=>{});
 assert.equal(f.sent.filter(x=>x.type==='DELETE_OWN_AD_BY_ID').length,0,'persisted transport uncertainty cannot authorize a new automatic DELETE');
 assert.equal(f.promotions.length,0,'no promotion without verified absence');
 assert.equal(f.row.sourceDeleteTransportInterrupted,true,'unknown transport evidence must survive');
});
