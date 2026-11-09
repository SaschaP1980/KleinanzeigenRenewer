const assert=require('assert'),fs=require('fs'),vm=require('vm');let API=null;
const ctx=vm.createContext({console,Date,Promise,Set,Map,Object,Array,String,Number,Boolean,RegExp,Error,structuredClone,KRDeps:{register(n,a){if(n==='KRTemplateFillController')API=a;}}});
vm.runInContext(fs.readFileSync('template-fill-controller.js','utf8'),ctx,{filename:'template-fill-controller.js'});assert.ok(API?.create);
let sessions={f:{fillId:'f',templateOnly:true,inventoryId:'trash',trashInventoryId:'trash',sourceAdId:'10',targetTabId:7,status:'complete',stage:'template-only-published',newAdId:'99',updatedAt:'2026-01-01T00:00:00Z'}};let broadcasts=[];let uuid=0;let renewals={};let archives={};
const noop=()=>{};const noopAsync=async()=>{};
const deps={readFillSessions:async()=>sessions,writeFillSessions:async s=>{sessions=s},withTemplateFillMutation:fn=>Promise.resolve().then(fn),isRecoverableTrashTemplateSession:s=>s?.templateOnly===true,resolvePublishedInventory:async x=>({resolved:true,...x}),broadcastInventoryChanged:(...a)=>broadcasts.push(a),getInventory:async id=>({inventoryId:id,adId:'10',profileId:'p1',title:'T',images:[],imageSummary:{explicitlyEmpty:true}}),isTrashRecord:()=>true,assertTemplateSourceReady:noop,createAutomationTab:async()=>({id:11}),deleteInventoryStorageRecord:noopAsync,delay:noopAsync,registerShadowTab:noopAsync,updateAutomationTab:noopAsync,logDiagnostic:noopAsync,correlationContext:(...xs)=>Object.assign({},...xs.filter(x=>x&&typeof x==='object')),sessionCorrelationContext:(s,e={})=>({...e}),assertSelectedProfileMatchesLiveAccount:noopAsync,getInsertionLockState:async()=>({locked:true,kind:'trash-template'}),assertInsertionStartAvailable:noopAsync,withInsertionStartGate:fn=>fn(),getRenewalConfiguration:async()=>({renewalMode:'safe',maxPhaseAttempts:3}),normalizeRenewalMode:v=>v==='fast'?'fast':'safe',normalizeRenewalPhaseAttempts:v=>Number(v||3),readRenewalSessions:async()=>renewals,writeRenewalSessions:async r=>{renewals=r},createRenewalSkeleton:async(r,id)=>({inventoryId:'renewal:'+id}),persistRenewalSession:noopAsync,isTransientTemplateFillProgress:()=>false,templateFillProgressSnapshot:()=>({}),queueMassRenewalProgress:noop,readArchiveInsertionSessions:async()=>archives,persistArchiveInsertionSession:async a=>{archives[a.archiveInsertionId]=a},recordRenewalPhaseAttemptError:noop,canRetryRenewalPhase1:()=>false,restartRenewalPhase1Attempt:noopAsync,evictTemplateImageTransfersForFill:noop,classifyKleinanzeigenInsertionErrorUrl:()=>({isError:false}),cryptoApi:{randomUUID:()=>`00000000-0000-4000-8000-${String(++uuid).padStart(12,'0')}`},chromeApi:{tabs:{remove:noopAsync}},queueMicrotaskFn:noop,TEMPLATE_TARGET_URL:'https://example.test/new',TAB_ROLES:{TEMPLATE_TARGET:'template',RENEWAL_TARGET:'renewal'},TERMINAL_TEMPLATE_FILL_STATUSES:new Set(['complete','needs-review','error'])};
const ctl=API.create(deps);
(async()=>{let n=0;const pass=x=>{n++;console.log('PASS '+x)};
 const status=await ctl.getTrashTemplateFillStatus({fillId:'f'});assert.equal(status.newAdId,'99');pass('status snapshot');
 const prepared=await ctl.prepareTrashTemplateInventoryCapture({fillId:'f',tabId:7,adId:'99'});assert.equal(prepared.resolved,true);pass('published capture preparation');
 const done=await ctl.completeTrashTemplateFlow({fillId:'f',adId:'99'});assert.equal(done,true);assert.equal(sessions.f.stage,'template-only-inventoried');pass('trash template completion');
 sessions={};const started=await ctl.startTrashTemplateFillUnlocked('trash');assert.equal(started.templateOnly,true);assert.equal(Object.values(sessions)[0].status,'waiting');pass('trash template start persists session');
 const wrapped=await ctl.startTrashTemplateFill('trash');assert.equal(wrapped.insertionLock.kind,'trash-template');pass('gated trash template start returns lock');
 const renewalStarted=await ctl.startTemplateFillUnlocked('inv',{autoReplacementAllowed:true});assert.ok(renewalStarted.renewalId);assert.equal(renewalStarted.renewalMode,'safe');pass('renewal template start persists workflow');
 renewals={};const gatedRenewal=await ctl.startTemplateFill('inv',{});assert.ok(gatedRenewal.insertionLock);pass('gated renewal start returns lock');
 const noError=await ctl.terminalizeTemplateFillOnPlatformError(11,'https://x',{});assert.equal(noError,false);pass('non-error navigation ignored');

 // KAR-143 native acceptance blocker: the real Windows/Chrome profile can
 // reject a new tab briefly while its tab strip is busy. One failed local
 // creation must not abandon an orphan prepublication renewal/skeleton.
 {
   renewals={};let attempts=0;let skeletonCreates=0;
   const priorSkeleton=deps.createRenewalSkeleton;
   deps.createRenewalSkeleton=async(...args)=>{skeletonCreates+=1;return priorSkeleton(...args)};
   deps.delay=async()=>{};
   deps.deleteInventoryStorageRecord=async()=>{};
   deps.createAutomationTab=async()=>{if(++attempts===1)throw new Error('Tabs cannot be edited right now (user may be dragging a tab).');return{id:56}};
   const transient=API.create(deps);
   const got=await transient.startTemplateFillUnlocked('inv',{autoReplacementAllowed:true,massBatchId:'batch-race',massBatchItemIndex:0});
   assert.equal(attempts,2,'only one retry of known Chrome tab-strip-busy error');
   assert.equal(skeletonCreates,1,'a local transient must not spawn duplicate skeletons');
   assert.equal(Object.values(renewals).length,1,'recovered start persists one renewal only');
   assert.equal(renewals[got.renewalId]?.targetTabId,56);
   pass('transient Chrome tab-strip busy recovers with one draft and one tab');
   deps.createRenewalSkeleton=priorSkeleton;
 }
 {
   renewals={};let attempts=0;const removed=[];
   deps.createAutomationTab=async()=>{attempts+=1;throw new Error('Tabs cannot be edited right now (user may be dragging a tab).')};
   deps.deleteInventoryStorageRecord=async id=>removed.push(id);
   const persistent=API.create(deps);
   await assert.rejects(persistent.startTemplateFillUnlocked('inv',{autoReplacementAllowed:true,massBatchId:'batch-stuck',massBatchItemIndex:0}),
     /Tabs cannot be edited right now/);
   assert.ok(attempts>=2&&attempts<=3,'persistent Chrome busy must have bounded retries');
   assert.equal(Object.keys(renewals).length,0,'terminal pre-tab failure must not retain insertion lock');
   assert.equal(removed.length,1,'orphan skeleton must be removed locally');
   assert.match(removed[0],/^renewal:/);
   pass('persistent Chrome busy safely rolls back only the unstarted local renewal');
 }
 {
   renewals={};let attempts=0;const removed=[];
   deps.createAutomationTab=async()=>{attempts+=1;throw Object.assign(new Error('Kleinanzeigen hat den Zugriff vorübergehend eingeschränkt.'),{code:'PLATFORM_ACCESS_RESTRICTED'})};
   deps.deleteInventoryStorageRecord=async id=>removed.push(id);
   const blocked=API.create(deps);
   await assert.rejects(blocked.startTemplateFillUnlocked('inv',{autoReplacementAllowed:true}),
     /Zugriff vorübergehend eingeschränkt/);
   assert.equal(attempts,1,'platform restriction must never be retried');
   assert.equal(Object.keys(renewals).length,0,'platform stop must not strand a local lock');
   assert.equal(removed.length,1);
   pass('platform safety refusal remains authoritative and also rolls back local draft');
 }
 console.log(`${n}/11 PASS v1.23.4/KAR-143 template fill controller runtime`);
})().catch(e=>{console.error(e);process.exitCode=1});
