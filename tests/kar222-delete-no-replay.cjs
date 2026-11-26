'use strict';
// KAR-222: two owner-approved no-replay boundaries. Actual production service,
// synthetic transport/DB ports only. No Kleinanzeigen account or remote action.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const Remote=require('../src/background/services/remote-delete-replacement-service.js');
const bg=fs.readFileSync('src/background/background.js','utf8');
const helper=bg.match(/^async function sendTabRequestWithBootstrap\(tabId, message\) \{\n[\s\S]*?^\}/m);
assert.ok(helper,'actual production transport helper');
const classify=vm.runInNewContext('('+bg.match(/^function isPhase4DeleteTransportInterruption\(error\) \{\n[\s\S]*?^\}/m)[0]+')');
const closedPort='The message port closed before a response was received.';
const bfcache='The page keeping the extension port is moved into back/forward cache, so the message channel is closed.';
async function transport(type,message){
  const calls=[];let bootstraps=0;
  const error=new Error(message);
  const fn=vm.runInNewContext('('+helper[0]+')',{sendTabRequest:async(_id,m)=>{calls.push(m.type);if(calls.length===1)throw error;return {ok:true};},ensureContentConnection:async()=>{bootstraps++;}});
  return {promise:fn(73,{type,adId:'100'}),calls,bootstraps:()=>bootstraps,error};
}
test('KAR222 transport: DELETE never bootstraps or replays on connection/response errors; original rejection survives',async()=>{
  for(const message of [closedPort,bfcache,'Receiving end does not exist.','Could not establish connection.','HTTP 403']){
    const f=await transport('DELETE_OWN_AD_BY_ID',message);
    await assert.rejects(f.promise,e=>e===f.error);
    assert.deepEqual(f.calls,['DELETE_OWN_AD_BY_ID']);
    assert.equal(f.bootstraps(),0);
  }
});
test('KAR222 transport: read-only recovery retains its bootstrap retry',async()=>{
  for(const type of ['MY_ADS_STATUS','VERIFY_OWN_AD_ABSENT_BY_ID']){
    const f=await transport(type,closedPort);
    assert.equal((await f.promise).ok,true);
    assert.deepEqual(f.calls,[type,type]);
    assert.equal(f.bootstraps(),1);
  }
});
function fixture({prior={},outcome='normal',proofs=[true],max=3,preflightFailure=false,resetAfterProof=false}={}){
  const row={renewalId:'r',sourceInventoryId:'old',skeletonInventoryId:'new',sourceAdId:'100',newAdId:'200',status:'verified',stage:'replacement-ready',renewalMode:'fast',...prior};
  const sent=[],workers=[],closed=[],persisted=[],logs=[];
  let attempts=0,deleteCount=0,proofCount=0,promotions=0,proven=false,failedPreflight=false;
  const promotionSentinel=new Error('fixture reached guarded local promotion');
  const resetError=new Error('fixture reset generation mismatch');
  const api=Remote.create({
    readRenewalSessions:async()=>({r:row}),
    getInventory:async id=>({inventoryId:id,adId:id==='old'?'100':'200',profileName:'Owner'}),
    getBulkRunState:async()=>({status:'complete'}),assertMassRenewalManualActionAllowed:async()=>{},
    normalizeProfileName:s=>String(s||'').trim(),normalBrowserWindowId:async()=>1,
    assertEmergencyResetGeneration:(_generation,purpose)=>{if(resetAfterProof&&purpose==='renewal-phase4-before-promotion')throw resetError;},
    persistRenewalSession:async s=>{persisted.push(structuredClone(s));return s;},
    renewalMaxPhaseAttempts:()=>max,renewalPhaseAttemptAvailable:()=>attempts<max,
    renewalAttemptState:()=>({attempt:attempts}),renewalAttemptDetails:()=>({attempt:attempts}),
    delay:async()=>{},renewalPhaseRetryDelayMs:()=>0,
    logRenewalPhaseAttemptStarted:async()=>({attempt:++attempts,attemptId:'a'+attempts}),
    logRenewalPhaseAttemptFailed:async()=>{},isNonRetryableRenewalSafetyError:e=>e===resetError,
    logDiagnostic:async(...a)=>logs.push(a),sessionCorrelationContext:()=>({}),correlationContext:()=>({}),
    createManagedWorkerTab:async(_opts,kind)=>{const id=1000+workers.length;workers.push({id,kind});return{id};},
    waitForTabComplete:async()=>{},ensureContentConnection:async()=>{},closeManagedWorkerTab:async id=>closed.push(id),
    isPhase4DeleteTransportInterruption:classify,
    sendTabRequestWithBootstrap:async(id,m)=>{
      const kind=workers.find(w=>w.id===id).kind;sent.push({id,type:m.type,adId:m.adId,kind});
      if(m.type==='MY_ADS_STATUS'){
        if(preflightFailure&&kind==='renewal-phase4-delete'&&!failedPreflight){failedPreflight=true;throw Error('fixture temporary status unavailable');}
        return {isMyAdsPage:true,isProjectsTab:true,profileName:'Owner'};
      }
      if(m.type==='DELETE_OWN_AD_BY_ID'){
        assert.equal(kind,'renewal-phase4-delete');assert.equal(m.adId,'100');deleteCount++;
        if(outcome==='closed')throw Error(closedPort);
        if(outcome==='bfcache')throw Error(bfcache);
        if(outcome==='other')throw Error('HTTP 403');
        return {actionTriggered:true};
      }
      if(m.type==='VERIFY_OWN_AD_ABSENT_BY_ID'){
        assert.equal(m.adId,'100');assert.notEqual(kind,'renewal-phase4-delete');
        const result=proofs[Math.min(proofCount++,proofs.length-1)];
        if(result instanceof Error)throw result;
        proven=result===true;
        return {verified:proven,adId:'100',pagesScanned:1,foundPage:proven?null:1};
      }
      throw Error('unexpected command '+m.type);
    },
    openDatabase:async()=>{promotions++;assert.equal(proven,true);assert.equal(row.stage,'source-delete-verified');throw promotionSentinel;}
  });
  return {api,row,sent,workers,closed,persisted,logs,promotionSentinel,stats:()=>({attempts,deleteCount,proofCount,promotions})};
}
const automatic={renewalId:'r',automatic:true};
async function reachesPromotion(f,message=automatic){
  await assert.rejects(f.api.finishRenewalReplacement(message),e=>e===f.promotionSentinel);
  assert.deepEqual(f.closed,f.workers.map(w=>w.id));
}
async function unresolved(f,message=automatic){
  await assert.rejects(f.api.finishRenewalReplacement(message));
  assert.equal(f.stats().promotions,0);
  assert.deepEqual(f.closed,f.workers.map(w=>w.id));
}
test('KAR222 normal success: same two fresh workers, same four messages, one delete and one proof',async()=>{
  for(const mode of ['fast','safe']){
    const f=fixture({prior:{renewalMode:mode}});
    await reachesPromotion(f);
    assert.deepEqual(f.sent.map(m=>m.type),['MY_ADS_STATUS','DELETE_OWN_AD_BY_ID','MY_ADS_STATUS','VERIFY_OWN_AD_ABSENT_BY_ID']);
    assert.deepEqual(f.stats(),{attempts:1,deleteCount:1,proofCount:1,promotions:1});
  }
});
test('KAR222 BFCache success: one delete and one independent proof, no extra normal worker',async()=>{
  const f=fixture({outcome:'bfcache'});await reachesPromotion(f);
  assert.deepEqual(f.stats(),{attempts:1,deleteCount:1,proofCount:1,promotions:1});
  assert.equal(f.row.sourceDeleteTransportInterrupted,true);
});
test('KAR222 closed response, repeated present proof: only one DELETE; remaining attempts read-only',async()=>{
  const f=fixture({outcome:'closed',proofs:[false]});await unresolved(f);
  assert.deepEqual(f.stats(),{attempts:3,deleteCount:1,proofCount:3,promotions:0});
  assert.equal(f.row.sourceDeleteTransportInterrupted,true);
});
test('KAR222 acknowledged DELETE but proof initially missing: next attempt read-only and promotes only after absence',async()=>{
  const f=fixture({proofs:[new Error('fixture read failure'),true]});await reachesPromotion(f);
  assert.deepEqual(f.stats(),{attempts:2,deleteCount:1,proofCount:2,promotions:1});
});
test('KAR222 acknowledged DELETE but persistent presence: never replay automatically',async()=>{
  const f=fixture({proofs:[false]});await unresolved(f);
  assert.deepEqual(f.stats(),{attempts:3,deleteCount:1,proofCount:3,promotions:0});
  assert.ok(f.row.sourceDeleteVerificationPendingAt);
});
test('KAR222 restart: persisted stages, transport flag, action or pending timestamp permit only independent read-only resolution',async()=>{
  for(const prior of [{stage:'source-delete-started'},{stage:'source-delete-verification-pending'},{stage:'source-delete-retry-pending'},{stage:'source-delete-verified'},{sourceDeleteTransportInterrupted:true},{sourceDeleteAction:{actionTriggered:true}},{sourceDeleteVerificationPendingAt:'2026-11-26T19:00:00Z'}]){
    const f=fixture({prior});await reachesPromotion(f);
    assert.deepEqual(f.stats(),{attempts:1,deleteCount:0,proofCount:1,promotions:1},JSON.stringify(prior));
    assert.deepEqual(f.sent.map(m=>m.type),['MY_ADS_STATUS','VERIFY_OWN_AD_ABSENT_BY_ID']);
  }
});
test('KAR222 explicit retry with prior unknown and source still present stays read-only and never promotes',async()=>{
  const f=fixture({prior:{sourceDeleteTransportInterrupted:true},proofs:[false],max:1});
  await unresolved(f,{renewalId:'r',type:'FINISH_RENEWAL_REPLACEMENT'});
  assert.deepEqual(f.stats(),{attempts:1,deleteCount:0,proofCount:1,promotions:0});
});
test('KAR222 known pre-dispatch temporary status failure still permits a normal bounded retry',async()=>{
  const f=fixture({preflightFailure:true});await reachesPromotion(f);
  assert.deepEqual(f.stats(),{attempts:2,deleteCount:1,proofCount:1,promotions:1});
});
test('KAR222 persisted boundary before first dispatch survives a restart even if post-response persistence is lost',async()=>{
  const f=fixture({outcome:'closed',proofs:[false],max:1});await unresolved(f);
  const saved=f.persisted[0];
  assert.equal(saved.stage,'source-delete-started');
  assert.ok(saved.sourceDeleteVerificationPendingAt,'durable existing pending marker before dispatch also survives generic stage reset');
  const resumed=fixture({prior:{...saved,stage:'replacement-ready'},proofs:[false],max:1});
  await unresolved(resumed);
  assert.deepEqual(resumed.stats(),{attempts:1,deleteCount:0,proofCount:1,promotions:0});
});
test('KAR222 reset after proof rejects before promotion; proof may not survive failed generation guard',async()=>{
  const f=fixture({resetAfterProof:true});await unresolved(f);
  assert.equal(f.stats().deleteCount,1);
  assert.equal(f.stats().proofCount,1);
});
