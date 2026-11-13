'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/background/services/renewal-phase1-retry-service.js','utf8');
const bg=fs.readFileSync('src/background/background.js','utf8');
let owner=null;
vm.runInNewContext(source,{KRDeps:{register(n,x){assert.equal(n,'KRRenewalPhase1RetryService');owner=x;}}});
assert.throws(()=>owner.create({}),/requires fail-closed/);
assert.match(bg,/return requireRenewalPhase1RetryService\(\)\.canRetryRenewalPhase1\(renewal, fill\)/);
assert.match(bg,/return requireRenewalPhase1RetryService\(\)\.restartRenewalPhase1Attempt\(renewalId, failedFillId, reason\)/);
assert.match(bg,/automaticReplacementInFlight, renewalPhase1RetryInFlight, renewalPublishDetectionInFlight/,
  'emergency reset must retain the identical in-flight Set');
const inFlight=new Set(),events=[],tabs=[],stored=[],filled=[],closed=[];
const renewals={r1:{renewalId:'r1',fillId:'f1',targetTabId:200,status:'draft',stage:'phase1-started',
  sourceAdId:'123',sourceInventoryId:'inv',skeletonInventoryId:'skel',renewalMode:'safe',
  phaseAttempts:{},autoReplacementAllowed:false}};
const fills={f1:{fillId:'f1',renewalId:'r1',targetTabId:200,status:'failed',result:{issues:['fixture failure']}}};
let tabFail=false,renewalAvailable=true;
const options={
 sessionPort:{readRenewalSessions:async()=>renewals,readFillSessions:async()=>fills,
   writeFillSessions:async x=>{filled.push(x);},
   persistRenewalSession:async row=>{stored.push({...row});}},
 policyPort:{renewalPhaseAttemptAvailable:()=>renewalAvailable,renewalAttemptState:()=>({attempt:1}),
   beginRenewalPhaseAttempt:()=>({attempt:2,attemptId:'attempt-2'}),
   normalizeRenewalMode:x=>x,renewalMaxPhaseAttempts:()=>3},
 tabPort:{createAutomationTab:async opts=>{if(tabFail)throw Error('fixture tab creation failed');tabs.push(opts);return {id:201};},
   registerShadowTab:async()=>{},closeRegistryTab:async id=>{closed.push(id);},
   updateAutomationTab:async(id,opts)=>{tabs.push({id,...opts});}},
 diagnosticsPort:{correlationContext:()=>({}),sessionCorrelationContext:()=>({}),
   logDiagnostic:async (_level,event)=>{events.push(event);}},
 configPort:{crypto:{randomUUID:()=> 'new-fill-uuid'},TEMPLATE_TARGET_URL:'https://www.kleinanzeigen.de/p-anzeige-aufgeben.html',
    TAB_ROLES:{RENEWAL_TARGET:'renewal-target'}},
 statePort:{renewalPhase1RetryInFlight:inFlight}
};
const svc=owner.create(options);
assert.deepEqual(Object.keys(svc).sort(),['canRetryRenewalPhase1','restartRenewalPhase1Attempt']);
assert.equal(svc.canRetryRenewalPhase1({renewalId:'r1',status:'draft'}),true);
assert.equal(svc.canRetryRenewalPhase1({renewalId:'r1',status:'draft',newAdId:'345'}),false);
assert.equal(svc.canRetryRenewalPhase1({renewalId:'r1',status:'draft'},{publishClickedAt:'date'}),false);
assert.equal(svc.canRetryRenewalPhase1({renewalId:'r1',status:'replaced'}),false);
renewalAvailable=false;assert.equal(svc.canRetryRenewalPhase1({renewalId:'r1',status:'draft'}),false);
renewalAvailable=true;
(async()=>{
  inFlight.add('r1');assert.equal(await svc.restartRenewalPhase1Attempt('r1','f1'),false);
  inFlight.delete('r1');
  assert.equal(await svc.restartRenewalPhase1Attempt('r1','missing'),false);
  assert.equal(inFlight.size,0);
  assert.equal(await svc.restartRenewalPhase1Attempt('r1','f1'),true);
  assert.equal(inFlight.size,0);
  assert.equal(renewals.r1.fillId,'new-fill-uuid');assert.equal(renewals.r1.targetTabId,201);
  assert.equal(renewals.r1.stage,'phase1-retry-started');
  assert.equal(fills['new-fill-uuid'].renewalId,'r1');
  assert.equal(closed[0],200);assert.equal(tabs[0].url,'about:blank');
  assert.ok(events.includes('RENEWAL_PHASE1_ATTEMPT_RESTARTED'));
  // Failed new-tab acquisition must not claim success and must clear in-flight.
  renewals.r1.fillId='f1';renewals.r1.targetTabId=200;renewals.r1.status='draft';
  fills.f1.targetTabId=200;tabFail=true;
  assert.equal(await svc.restartRenewalPhase1Attempt('r1','f1'),false);
  assert.equal(inFlight.size,0);assert.equal(renewals.r1.status,'verification-failed');
  assert.ok(events.includes('RENEWAL_PHASE1_RETRY_START_FAILED'));
  console.log('PASS KAR-175 Wave 4: publish-boundary hard-stop, attempt budget, shared emergency-set, tab replacement and failure cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
