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
