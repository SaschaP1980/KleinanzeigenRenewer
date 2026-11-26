'use strict';
// Actual product boundary independent of P8 admission and journal schema.
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),vm=require('node:vm');
const Remote=require('../src/background/services/remote-delete-replacement-service.js');
const Router=require('../src/background/background-message-router.js');
const read=p=>fs.readFileSync(p,'utf8');
test('historical registry and router deny absent P8 publication authorization and forged receipt before handler',async()=>{
 const ctx=vm.createContext({console});
 for(const file of ['runtime-deps.js','message-contract-registry.js'])vm.runInContext(read('src/shared/'+file),ctx,{filename:file});
 const registry=ctx.KRDeps.require('KRMessageContractRegistry');
 const sender={tab:{id:77},url:'https://www.kleinanzeigen.de/p-anzeige-aufgeben'};
 let guards=0,handlers=0,reads=0;
 const router=Router.create({MessageContractRegistry:registry,assertPlatformAccessAllowedForRequest:async()=>{guards++;},handlers:{AUTHORIZE_AUTOMATIC_PUBLISH:()=>{handlers++;},GET_BACKGROUND_EPOCH:()=>{reads++;return {epoch:'fixture'};}}});
 for(const type of ['AUTHORIZE_AUTOMATIC_PUBLISH','INJECTED_PUBLISH_AUTHORITY']){
  assert.equal(registry.route(type,'background').action,'reject');
  assert.equal(registry.has(type,'background'),false);
  await assert.rejects(router.dispatch({type,fillId:'fill-002',admissionReceipt:{token:'attacker-controlled-token',operationType:type}},sender),e=>e.code==='KR_MESSAGE_CONTRACT_UNKNOWN');
 }
 assert.equal(guards,0);assert.equal(handlers,0);assert.equal(reads,0);
 const wrong=registry.route('PAGE_STATUS','background');assert.equal(wrong.action,'ignore');
 const err=registry.errorFor(wrong);assert.equal(err.code,'KR_MESSAGE_CONTRACT_TARGET_MISMATCH');assert.equal(err.details.type,'PAGE_STATUS');assert.ok(Object.isFrozen(err.details));
 assert.equal(registry.snapshot().enforcement,true);
 assert.ok(!registry.groups.background.includes('AUTHORIZE_AUTOMATIC_PUBLISH'));
 assert.deepEqual(await router.dispatch({type:'GET_BACKGROUND_EPOCH'},sender),{epoch:'fixture'});
 assert.equal(reads,1);assert.equal(handlers,0);
});
function fixture({source=true,candidate=true,candidateId='200',profile='Owner',verifyProfile='Owner',verify='present',bulk=false}={}){
 const row={renewalId:'r',sourceInventoryId:'old',skeletonInventoryId:'new',sourceAdId:'100',newAdId:'200',status:'verified',stage:'replacement-ready'};
 const sent=[],closed=[],persisted=[],opened=[],promotions=[],notices=[];let attempts=0;
 const api=Remote.create({
  TRASH_RETENTION_MS:30*24*60*60*1000, // exact historical production retention constant
  readRenewalSessions:async()=>({r:row}),getInventory:async id=>id==='old'?(source?{inventoryId:id,adId:'100',profileName:profile}:null):(candidate?{inventoryId:id,adId:candidateId,profileName:profile}:null),getBulkRunState:async()=>({status:bulk?'running':'complete'}),
  assertMassRenewalManualActionAllowed:async()=>{},normalBrowserWindowId:async()=>null,persistRenewalSession:async s=>{persisted.push(structuredClone(s));return s;},
  createManagedWorkerTab:async(_opts,kind)=>{const id=73+opened.length;opened.push({id,kind});return {id};},waitForTabComplete:async()=>{},ensureContentConnection:async()=>{},closeManagedWorkerTab:async id=>closed.push(id),
  correlationContext:()=>({}),sessionCorrelationContext:()=>({}),normalizeProfileName:s=>String(s||'').trim(),assertEmergencyResetGeneration:()=>true,renewalMaxPhaseAttempts:()=>1,renewalPhaseAttemptAvailable:()=>attempts===0,renewalAttemptState:()=>({attempt:attempts}),logRenewalPhaseAttemptStarted:async()=>{attempts++;return {attempt:attempts,attemptId:'fixture-attempt'}},logRenewalPhaseAttemptFailed:async()=>{},isNonRetryableRenewalSafetyError:()=>true,renewalAttemptDetails:()=>({}),delay:async()=>{},logDiagnostic:async()=>{},isPhase4DeleteTransportInterruption:()=>false,
  openDatabase:async()=>{promotions.push(structuredClone(row));throw Error('fixture stops at atomic promotion boundary');},setAppNotice:async notice=>{notices.push(notice);return notice;},
  sendTabRequestWithBootstrap:async(id,m)=>{sent.push({id,type:m.type,adId:m.adId});
   if(m.type==='MY_ADS_STATUS')return {isMyAdsPage:true,isProjectsTab:true,profileName:id===73?'Owner':verifyProfile};
   if(m.type==='DELETE_OWN_AD_BY_ID')return {actionTriggered:true};
   if(m.type==='VERIFY_OWN_AD_ABSENT_BY_ID'){if(verify==='unavailable')throw Error('fixture readback unavailable');return {verified:verify==='absent',foundPage:verify==='present'?2:null,evidence:verify==='absent'?'not-in-my-ads-full-pagination-scan':null,pagesScanned:3};}
   throw Error('unexpected fixture request '+m.type);
  }
 });return {row,sent,closed,persisted,opened,promotions,notices,finish:()=>api.finishRenewalReplacement({renewalId:'r',automatic:true})};
}
test('actual finish requires existing local source and exact verified candidate before destructive dispatch',async()=>{
 for(const options of [{source:false},{candidate:false},{candidateId:'999'},{profile:''},{bulk:true}]){
  const f=fixture(options);await assert.rejects(f.finish());assert.equal(f.sent.length,0);assert.equal(f.opened.length,0);assert.equal(f.promotions.length,0);assert.equal(f.notices.length,0);assert.equal(f.row.stage,'replacement-ready');
 }
});
test('actual finish never promotes without independent same-account exact-source absence',async()=>{
 for(const options of [{verify:'present'},{verify:'unavailable'},{verifyProfile:'Other'},{verifyProfile:''}]){
  const f=fixture(options);await assert.rejects(f.finish());assert.equal(f.promotions.length,0);assert.equal(f.notices.length,0);assert.equal(f.row.status,'verified');assert.equal(f.row.stage,'replacement-ready');assert.equal(f.row.sourceDeletedAt,undefined);
  assert.equal(f.sent.filter(x=>x.type==='DELETE_OWN_AD_BY_ID').length,1);assert.equal(f.sent.find(x=>x.type==='DELETE_OWN_AD_BY_ID').adId,'100');assert.deepEqual(f.closed,[73,74]);
  if(options.verifyProfile!==undefined)assert.equal(f.sent.filter(x=>x.type==='VERIFY_OWN_AD_ABSENT_BY_ID').length,0);
  else assert.deepEqual(f.sent.filter(x=>x.type==='VERIFY_OWN_AD_ABSENT_BY_ID'),[{id:74,type:'VERIFY_OWN_AD_ABSENT_BY_ID',adId:'100'}]);
 }
});
test('positive control: independent exact absence reaches real atomic promotion entry, not an invented successful exchange',async()=>{
 const f=fixture({verify:'absent'});
 await assert.rejects(f.finish(),/fixture stops at atomic promotion boundary/);
 assert.deepEqual(f.opened,[{id:73,kind:'renewal-phase4-delete'},{id:74,kind:'renewal-phase4-verify'}]);
 assert.deepEqual(f.sent,[{id:73,type:'MY_ADS_STATUS',adId:undefined},{id:73,type:'DELETE_OWN_AD_BY_ID',adId:'100'},{id:74,type:'MY_ADS_STATUS',adId:undefined},{id:74,type:'VERIFY_OWN_AD_ABSENT_BY_ID',adId:'100'}]);
 assert.equal(f.promotions.length,1);assert.equal(f.promotions[0].stage,'source-delete-verified');assert.equal(f.promotions[0].sourceAdId,'100');assert.equal(f.promotions[0].newAdId,'200');assert.equal(f.promotions[0].sourceDeleteEvidence,'not-in-my-ads-full-pagination-scan');assert.equal(f.notices.length,0);
});
