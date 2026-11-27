'use strict';
// CP35 product witnesses independent of removed updater lease/census mechanisms.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),test=require('node:test');
const read=p=>fs.readFileSync(p,'utf8');
const worker=read('src/background/background.js'),mass=read('src/background/controllers/mass-renewal-workflow-controller.js'),fill=read('src/background/controllers/template-fill-controller.js'),watchdog=read('src/background/services/mass-renewal-watchdog-service.js'),lifecycle=read('src/background/controllers/tab-lifecycle-observer.js'),template=fill;
test('historical autonomous product ingress and lifecycle persistence are present',()=>{
 const confirm=(condition,msg)=>assert.ok(condition,msg),ok=confirm;
confirm(worker.includes('ensureBulkRuntimeRecovery()'), 'service worker boot asynchronously starts bulk runtime recovery');
confirm(worker.includes('bulkRunWatchdogTick()'), 'service worker boot starts the bulk worker watchdog');
confirm(worker.includes('resumePendingRenewals()'), 'service worker boot resumes renewals without router dispatch');
confirm(worker.includes('resumePendingArchiveInsertions()'), 'service worker boot resumes archive insertion');
confirm(worker.includes('maybeDetectTrashTemplatePublishedAd('), 'tabs listener directly starts trash publish detection');
confirm(worker.includes('observeTabLifecycleUpdate(tab)'), 'tabs listener directly invokes lifecycle mutator');

  ok(lifecycle.includes('persistRenewalSession(renewal)'), 'removed-tab path updates renewal state');
  ok(lifecycle.includes('persistArchiveInsertionSession(archive)'), 'removed-tab path updates archive state');
  ok(lifecycle.includes('writeFillSessions(sessions)'), 'removed-tab path updates fill state');
  ok(lifecycle.includes('mutateBulkRunState(run =>'), 'removed-tab path updates bulk state');
  ok(template.includes('await persistRenewalSession(renewal)'),'platform-error terminalization updates renewal');
  ok(template.includes('await persistArchiveInsertionSession(archive)'),'platform-error terminalization updates archive');
  ok(worker.includes('await confirmPublishedArchiveInsertion(fill, detected)'),'publish detection updates archive state');
  ok(worker.includes('await confirmPublishedRenewal(fill, detected)'),'publish detection updates renewal state');
  ok(worker.includes('async function maybeDetectTrashTemplatePublishedAd'),'independent trash-template publish detection exists');

 if(require('./current-patch-policy.cjs').isS06Version(require('../manifest.json').version)){
   confirm((mass.match(/queueMicrotaskFn\(\(\) => \{ void startNextMassRenewalItem\(/g)||[]).length===6,'six S06 continuations; uncertain restart no blind requeue');
   confirm(!mass.includes("item.stage = 'recovery-starting-requeued'"),'uncertain starting path not silently requeued');
 }else{
 confirm((mass.match(/queueMicrotaskFn\(\(\) => \{ void startNextMassRenewalItem\(/g)||[]).length===7,'seven mass continuations at actual historical owner');
 }
 confirm((fill.match(/queueMicrotaskFn\(\(\) => \{ void restartRenewalPhase1Attempt\(/g)||[]).length===2,'both phase-one retry continuations at actual historical owner');
 confirm(/massRenewalWatchdogTimer\s*=\s*setTimeoutFn\(async\s*\(\)\s*=>/.test(watchdog),'actual watchdog timer');
 confirm(watchdog.includes('queueMicrotaskFn(() => { void startNextMassRenewalItem(batch.batchId)'), 'actual watchdog continuation');
 confirm(worker.includes('const backgroundMessageRouter = BackgroundMessageRouter.create('),'actual background router');
});
test('actual historical router: all eight original routes reject platform denial before handler; settlement and failure propagate',async()=>{
 // Use the same real classic-script VM filenames as the existing shared registry
 // tests; the coverage reporter prefers exact filesystem URLs over VM basenames.
 const ctx=vm.createContext({console});
 for(const file of ['runtime-deps.js','message-contract-registry.js'])vm.runInContext(read('src/shared/'+file),ctx,{filename:file});
 const Registry=ctx.KRDeps.require('KRMessageContractRegistry'),Router=require('../src/background/background-message-router.js');
 const rejected=Router.create({MessageContractRegistry:Registry,assertPlatformAccessAllowedForRequest:async()=>assert.fail('invalid route must not enter platform guard'),handlers:{PAGE_STATUS:()=>assert.fail('wrong-target handler must not run')}});
 for(const [type,code] of [['NOT_A_REGISTERED_REQUEST','KR_MESSAGE_CONTRACT_UNKNOWN'],['PAGE_STATUS','KR_MESSAGE_CONTRACT_TARGET_MISMATCH']])await assert.rejects(rejected.dispatch({type},{}),e=>e.code===code);
 // Reinjection must preserve the identical dependency object and reject replacement.
 vm.runInContext(read('src/shared/runtime-deps.js'),ctx,{filename:'runtime-deps.js'});vm.runInContext(read('src/shared/message-contract-registry.js'),ctx,{filename:'message-contract-registry.js'});
 assert.equal(ctx.KRDeps.require('KRMessageContractRegistry'),Registry);
 assert.throws(()=>ctx.KRDeps.register('KRMessageContractRegistry',{}),/Duplicate dependency/);
 const routed=['START_BULK_INVENTORY_OPERATION','START_MASS_RENEWAL_BATCH','START_TEMPLATE_FILL','START_ARCHIVE_INSERTION','RETRY_RENEWAL_VERIFICATION','DELETE_TRASH_ENTRY','GET_MASS_RENEWAL_BATCH_STATUS','UPDATE_TEMPLATE_FILL_SESSION'];
 for(const type of routed){
  let calls=0,checks=0,release;const sender={tab:{id:11}},message={type};
  const make=(guard,handler)=>Router.create({MessageContractRegistry:Registry,assertPlatformAccessAllowedForRequest:guard,handlers:{[type]:handler}});
  const denied=make(async()=>{checks++;throw Error('platform denied')},()=>{calls++;});
  await assert.rejects(denied.dispatch(message,sender),/platform denied/);assert.equal(calls,0);assert.equal(checks,1);
  const allowed=make(async()=>{checks++;},(m,s)=>{assert.equal(m,message);assert.equal(s,sender);calls++;return new Promise(r=>release=r);});
  const pending=allowed.dispatch(message,sender);for(let t=0;t<10&&!release;t++)await Promise.resolve();
  assert.equal(calls,1);assert.equal(checks,2);assert.equal(typeof release,'function');release('done');assert.equal(await pending,'done');
  await assert.rejects(make(async()=>{},async()=>{throw Error('handler rejected')}).dispatch(message,sender),/handler rejected/);
 }
});
test('actual account authority rejects unavailable or unconfirmed profile and live evidence before positive authorization',async()=>{
 const ctx=vm.createContext({console});vm.runInContext(read('src/shared/runtime-deps.js'),ctx,{filename:'runtime-deps.js'});vm.runInContext(read('src/background/controllers/account-session-controller.js'),ctx,{filename:'account-session-controller.js'});
 const C=ctx.KRDeps.require('KRAccountSessionController'),p={profileId:'p1',displayName:'Alpha'},good={selectedProfileId:'p1',profiles:[p]},live={confirmed:true,profile:p},noop=async()=>{};
 let logs=[],probes=0,reads=0,writes=0;
 const make=(state,probe)=>C.create({AccountProbeService:{create:()=>({probeLiveKleinanzeigenAccount:async()=>{probes++;return probe();}})},storageSession:{set:async()=>{writes++;}},accountGateDiagnosticStateKey:'gate',maxAttempts:2,retryDelayMs:250,navigationTimeoutMs:12000,myAdsProjectsUrl:'https://www.kleinanzeigen.de/m-meine-anzeigen.html',platformAccessRestrictionErrorCode:'KR_PLATFORM_ACCESS_RESTRICTED',randomUUID:()=> 'fixture',normalBrowserWindowId:()=>1,createManagedWorkerTab:noop,closeManagedWorkerTab:noop,updateAutomationTab:noop,waitForExpectedTabComplete:noop,ensureContentConnection:noop,sendTabRequestWithBootstrap:noop,normalizeProfileName:v=>String(v||'').trim(),ensureProfile:noop,logDiagnostic:async(...a)=>logs.push(a),delay:noop,getProfileState:async()=>{reads++;return state();},unassignedProfileId:'__unassigned__'});
 const run=(state,probe)=>make(state,probe).assertSelectedProfileMatchesLiveAccount({expectedProfileId:'p1'});
 const throwRead=()=>{throw Error('profile read unavailable')},throwProbe=()=>{throw Error('live probe unavailable')};
 await assert.rejects(run(throwRead,()=>live),/profile read unavailable/);
 await assert.rejects(run(()=>({selectedProfileId:'p1',profiles:[]}),()=>live));
 await assert.rejects(run(()=>({selectedProfileId:'p2',profiles:[{profileId:'p2',displayName:'Beta'}]}),()=>live));
 assert.equal(probes,0);
 await assert.rejects(run(()=>good,throwProbe),/live probe unavailable/);
 await assert.rejects(run(()=>good,()=>({confirmed:false,profile:p})));
 await assert.rejects(run(()=>good,()=>({confirmed:true,profile:{profileId:'p2',displayName:'Beta'}})));
 assert.equal(logs.length,0);assert.equal(writes,0);assert.equal(reads,6);assert.equal(probes,3);
 assert.equal((await run(()=>good,()=>live)).profileId,'p1');assert.equal(logs.length,1);assert.equal(logs[0][1],'ACCOUNT_BOUND_ACTION_ALLOWED');assert.equal(writes,0);
});
