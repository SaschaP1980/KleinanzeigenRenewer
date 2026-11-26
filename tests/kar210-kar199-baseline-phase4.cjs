'use strict';
// S02 historical service boundaries only; no claim that transport bootstrap is replay-safe.
const test=require('node:test');
const assert=require('node:assert/strict');
const Remote=require('../src/background/services/remote-delete-replacement-service.js');
const Formatting=require('../src/app/inventory-formatting.js');
const fmt=Formatting.create({sharedUiHelpers:{}});
const session={renewalId:'r199',sourceAdId:'100',newAdId:'200'};
const attempt={attempt:1,attemptId:'attempt-1'};
function fixture({profile='Owner',validPage=true,interrupted=false,reset=false,verified=true,verifyProfile=profile}={}){
  const sent=[],closed=[],created=[],logs=[];
  const api=Remote.create({
    createManagedWorkerTab:async(_options,kind,owner)=>{const id=73+created.length;created.push({id,kind,owner});return {id};},
    waitForTabComplete:async()=>{},ensureContentConnection:async()=>{},correlationContext:()=>({}),sessionCorrelationContext:()=>({}),
    normalizeProfileName:x=>String(x).trim(),closeManagedWorkerTab:async id=>closed.push(id),
    renewalMaxPhaseAttempts:()=>3,logDiagnostic:async(...args)=>logs.push(args),
    assertEmergencyResetGeneration:()=>{if(reset)throw Error('fixture reset generation mismatch');},
    isPhase4DeleteTransportInterruption:e=>/fixture response port closed/.test(String(e)),
    sendTabRequestWithBootstrap:async(id,m)=>{
      sent.push({id,type:m.type,adId:m.adId});
      if(m.type==='MY_ADS_STATUS')return {isMyAdsPage:validPage,isProjectsTab:validPage,profileName:id===73?profile:verifyProfile};
      if(m.type==='DELETE_OWN_AD_BY_ID'){if(interrupted)throw Error('fixture response port closed');return {actionTriggered:true};}
      if(m.type==='VERIFY_OWN_AD_ABSENT_BY_ID')return {verified,foundPage:verified?null:1};
      throw Error('Unexpected command');
    }
  });
  return {api,sent,closed,created,logs};
}
test('historical Phase-4 service refuses wrong/absent profile, wrong page and stale generation before destructive dispatch',async()=>{
  for(const options of [{profile:'Other'},{profile:''},{validPage:false},{reset:true}]){
    const f=fixture(options);
    await assert.rejects(f.api.preverifyAndTriggerRenewalSourceDeleteAttempt(session,'Owner',1,attempt,0));
    assert.deepEqual(f.sent.map(x=>x.type),['MY_ADS_STATUS']);
    assert.deepEqual(f.closed,[73]);
  }
});
test('historical Phase-4 dispatch uses exact old ID; independent fresh worker is read-only and cannot fabricate absence',async()=>{
  for(const verified of [true,false]){
    const f=fixture({verified});
    const result=await f.api.preverifyAndTriggerRenewalSourceDeleteAttempt(session,'Owner',1,attempt,0);
    assert.equal(result.deletion.actionTriggered,true);assert.equal(result.transportInterrupted,false);
    const proof=await f.api.verifyRenewalSourceAbsenceFresh(session,'Owner',1,attempt);
    assert.equal(proof.verified,verified);
    assert.deepEqual(f.sent,[{id:73,type:'MY_ADS_STATUS',adId:undefined},{id:73,type:'DELETE_OWN_AD_BY_ID',adId:'100'},{id:74,type:'MY_ADS_STATUS',adId:undefined},{id:74,type:'VERIFY_OWN_AD_ABSENT_BY_ID',adId:'100'}]);
    assert.deepEqual(f.closed,[73,74]);
    assert.equal(f.created[0].kind,'renewal-phase4-delete');assert.equal(f.created[1].kind,'renewal-phase4-verify');
  }
});
test('historical Phase-4 service reports transport uncertainty and requires separate read-only proof (mock transport boundary)',async()=>{
  const f=fixture({interrupted:true,verified:false});
  const result=await f.api.preverifyAndTriggerRenewalSourceDeleteAttempt(session,'Owner',1,attempt,0);
  assert.equal(result.transportInterrupted,true);assert.equal(result.deletion,null);
  assert.equal((await f.api.verifyRenewalSourceAbsenceFresh(session,'Owner',1,attempt)).verified,false);
  assert.equal(f.sent.filter(x=>x.type==='DELETE_OWN_AD_BY_ID').length,1);
  assert.ok(f.logs.some(x=>x[1]==='RENEWAL_SOURCE_DELETE_TRANSPORT_INTERRUPTED'));
  const wrong=fixture({verifyProfile:'Other'});
  await wrong.api.preverifyAndTriggerRenewalSourceDeleteAttempt(session,'Owner',1,attempt,0);
  await assert.rejects(wrong.api.verifyRenewalSourceAbsenceFresh(session,'Owner',1,attempt),/Kleinanzeigen-Konto/);
  assert.equal(wrong.sent.filter(x=>x.type==='VERIFY_OWN_AD_ABSENT_BY_ID').length,0);
  assert.deepEqual(wrong.closed,[73,74]);
});
test('KAR-199 normal verified handoff remains unchanged', () => {
  const record={adId:'200',renewal:{renewalId:'r199',status:'verified',
    stage:'source-delete-started',newAdId:'200',autoReplacementAllowed:true}};
  assert.equal(fmt.renewalAutoCompletionPending(record),true);
  assert.equal(fmt.renewalStatusLabel(record),'AUSTAUSCH LÄUFT');
});

// KAR-212: execute the actual historical background classifier, not a mock
// predicate. No browser, live account or production database is accessed.
const fs212=require('node:fs'),vm212=require('node:vm'),path212=require('node:path');
const bg212=fs212.readFileSync(path212.join(__dirname,'../src/background/background.js'),'utf8');
const function212=bg212.match(/^function isPhase4DeleteTransportInterruption\(error\) \{\n[\s\S]*?^\}/m);
assert.ok(function212,'actual classifier source must exist');
const classify212=vm212.runInNewContext('('+function212[0]+')');
const bf212='The page keeping the extension port is moved into back/forward cache, so the message channel is closed.';
const unrelated212='The page is unavailable because the server returned HTTP 403.';
test('KAR-212 original transport error variants remain recognized; unrelated errors remain failures',()=>{
  for(const message of ['A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received','The message channel closed before a response was received.','The message port closed before a response was received.','No tab with id: 123.']) {
    assert.equal(classify212(new Error(message)),true,message);
  }
  for(const message of [unrelated212,'back/forward cache','message channel is closed','Permission denied','']) assert.equal(classify212(new Error(message)),false,message);
});
test('KAR-212 exact observed BFCache error is a Phase-4 transport interruption',()=>{
  assert.equal(classify212(new Error(bf212)),true,'real Chrome BFCache error must enter the existing transport-uncertainty branch');
  assert.equal(classify212(bf212),true);
});
function finishFixture212({mode='bfcache',absent=true,max=3,verifyProfile='Owner'}={}){
  const row={renewalId:'r212',sourceInventoryId:'old',skeletonInventoryId:'new',sourceAdId:'100',newAdId:'200',status:'verified',stage:'replacement-ready',renewalMode:'fast'};
  const records={old:{inventoryId:'old',adId:'100',profileName:'Owner'},new:{inventoryId:'new',adId:'200',profileName:'Owner'}};
  const sent=[],workers=[],closed=[],logs=[],stages=[];
  let count=0,clicks=0,promotion=0,proven=false;
  const stopAtPromotion=new Error('fixture reached guarded local promotion');
  const api=Remote.create({
    readRenewalSessions:async()=>({r212:row}),getInventory:async id=>records[id],
    getBulkRunState:async()=>({status:'complete'}),normalizeProfileName:s=>String(s||'').trim(),
    assertMassRenewalManualActionAllowed:async()=>{},assertEmergencyResetGeneration:()=>true,
    persistRenewalSession:async s=>stages.push(s.stage),normalBrowserWindowId:async()=>1,
    renewalMaxPhaseAttempts:()=>max,renewalPhaseAttemptAvailable:()=>count<max,
    renewalAttemptState:()=>({attempt:count,attemptId:'attempt-'+count}),delay:async()=>{},
    renewalPhaseRetryDelayMs:()=>0,renewalAttemptDetails:()=>({attempt:count}),
    logRenewalPhaseAttemptStarted:async()=>({attempt:++count,attemptId:'attempt-'+count}),
    logRenewalPhaseAttemptFailed:async(_s,_p,event,_op,e,details)=>logs.push(['warning',event,{message:e.message,...details}]),
    isNonRetryableRenewalSafetyError:()=>false,logDiagnostic:async(...args)=>logs.push(args),
    sessionCorrelationContext:()=>({}),correlationContext:()=>({}),
    createManagedWorkerTab:async(_opts,kind)=>{const id=1000+workers.length;workers.push({id,kind});return {id};},
    waitForTabComplete:async()=>{},ensureContentConnection:async()=>{},closeManagedWorkerTab:async id=>closed.push(id),
    isPhase4DeleteTransportInterruption:classify212,TRASH_RETENTION_MS:30*86400000,
    sendTabRequestWithBootstrap:async(id,m)=>{
      sent.push({id,type:m.type,adId:m.adId});
      const kind=workers.find(w=>w.id===id).kind;
      if(m.type==='MY_ADS_STATUS')return {isMyAdsPage:true,isProjectsTab:true,profileName:kind==='renewal-phase4-verify'?verifyProfile:'Owner'};
      if(m.type==='DELETE_OWN_AD_BY_ID'){
        assert.equal(kind,'renewal-phase4-delete');assert.equal(m.adId,'100');
        if(mode==='unrelated')throw Error(unrelated212);
        if(clicks===0){clicks++;if(mode==='bfcache')throw Error(bf212);return {actionTriggered:true};}
        return {actionTriggered:false,alreadyAbsentCandidate:true};
      }
      if(m.type==='VERIFY_OWN_AD_ABSENT_BY_ID'){
        assert.equal(kind,'renewal-phase4-verify');assert.equal(m.adId,'100');
        proven=absent;return {verified:absent,pagesScanned:1,foundPage:absent?null:1};
      }
      throw Error('unexpected request '+m.type);
    },
    openDatabase:async()=>{promotion++;assert.equal(proven,true,'independent absence is mandatory before local promotion');assert.equal(row.stage,'source-delete-verified');throw stopAtPromotion;}
  });
  return {api,row,sent,workers,closed,logs,stages,stopAtPromotion,stats:()=>({count,clicks,promotion,proven})};
}
test('KAR-212 real Phase-4 orchestration uses one DELETE dispatch and one fresh read-only verification for observed BFCache error',async()=>{
  const f=finishFixture212();
  await assert.rejects(f.api.finishRenewalReplacement({renewalId:'r212',automatic:true}),e=>e===f.stopAtPromotion);
  assert.deepEqual(f.stats(),{count:1,clicks:1,promotion:1,proven:true});
  assert.equal(f.row.sourceDeleteTransportInterrupted,true);
  assert.deepEqual(f.sent.map(x=>x.type),['MY_ADS_STATUS','DELETE_OWN_AD_BY_ID','MY_ADS_STATUS','VERIFY_OWN_AD_ABSENT_BY_ID']);
  assert.notEqual(f.sent[1].id,f.sent[3].id);
  assert.deepEqual(f.closed,f.workers.map(w=>w.id));
  assert.ok(f.logs.some(x=>x[1]==='RENEWAL_SOURCE_DELETE_TRANSPORT_INTERRUPTED'));
  assert.ok(f.logs.some(x=>x[1]==='RENEWAL_SOURCE_DELETE_TRANSPORT_INTERRUPTION_VERIFIED'));
  assert.ok(!f.logs.some(x=>x[1]==='RENEWAL_PHASE4_ATTEMPT_FAILED'));
});
test('KAR-212 BFCache interruption never substitutes for independent absence proof',async()=>{
  const f=finishFixture212({absent:false,max:1});
  await assert.rejects(f.api.finishRenewalReplacement({renewalId:'r212',automatic:true}),/weiterhin/);
  assert.deepEqual(f.stats(),{count:1,clicks:1,promotion:0,proven:false});
  assert.equal(f.row.stage,'replacement-ready');
  assert.equal(f.sent.filter(x=>x.type==='VERIFY_OWN_AD_ABSENT_BY_ID').length,1);
});
test('KAR-212 regular response still reaches promotion only after fresh proof; unrelated errors remain terminal with no promotion',async()=>{
  const good=finishFixture212({mode:'normal'});
  await assert.rejects(good.api.finishRenewalReplacement({renewalId:'r212',automatic:true}),e=>e===good.stopAtPromotion);
  assert.deepEqual(good.stats(),{count:1,clicks:1,promotion:1,proven:true});
  assert.equal(good.row.sourceDeleteTransportInterrupted,false);
  const bad=finishFixture212({mode:'unrelated',max:1});
  await assert.rejects(bad.api.finishRenewalReplacement({renewalId:'r212',automatic:true}),/HTTP 403/);
  assert.deepEqual(bad.stats(),{count:1,clicks:0,promotion:0,proven:false});
  assert.ok(!bad.logs.some(x=>x[1]==='RENEWAL_SOURCE_DELETE_TRANSPORT_INTERRUPTED'));
});
