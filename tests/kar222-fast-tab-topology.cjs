'use strict';
// KAR-222 W2: actual production orchestration and registry, synthetic browser,
// remote replies and persistence only. Characterization, not native timing.
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),vm=require('node:vm');
const TabRegistry=require('../src/background/services/tab-registry.js');
const Navigation=require('../src/shared/managed-navigation.js');
const Remote=require('../src/background/services/remote-delete-replacement-service.js');
const read=p=>fs.readFileSync(p,'utf8');
const URL_MY_ADS='https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS';
const noop=async()=>{},empty=()=>({});
function actualAsync(file,name,context){
 const match=read(file).match(new RegExp('^async function '+name+'\\([^\\n]*\\) \\{\\n[\\s\\S]*?^\\}','m'));
 assert.ok(match,'actual function '+name);
 return vm.runInNewContext('('+match[0]+')',context);
}
function browserFixture(){
 const tabs=new Map([[99,{id:99,url:URL_MY_ADS,active:true,status:'complete',windowId:1}]]),events=[],state={};
 let next=100,reads=0,writes=0,peak=0;
 const registry=TabRegistry.create({storageSession:{
  async get(keys){reads++;return Object.fromEntries(keys.filter(k=>Object.hasOwn(state,k)).map(k=>[k,structuredClone(state[k])]));},
  async set(patch){writes++;Object.assign(state,structuredClone(patch));}
 }});
 const chromeTabs={
  async get(id){const tab=tabs.get(id);if(!tab)throw Error('No tab with id: '+id);return {...tab};},
  async remove(id){assert.notEqual(id,99,'never close user tab');assert.ok(tabs.delete(id),'exact live tab');events.push(['close',id]);}
 };
 const createAutomationTab=async opts=>{
  assert.equal(opts.active,false);assert.equal(opts.url,'about:blank');
  const id=++next,tab={id,status:'complete',windowId:1,...opts};tabs.set(id,tab);
  peak=Math.max(peak,tabs.size-1);events.push(['create',id,opts.url]);return {...tab};
 };
 const updateAutomationTab=async(id,patch)=>{
  assert.notEqual(id,99,'never navigate user tab');assert.ok(tabs.has(id));Object.assign(tabs.get(id),patch);
  events.push(['navigate',id,patch.url]);return {...tabs.get(id)};
 };
 const ctx=vm.createContext({console});
 for(const p of ['src/shared/runtime-deps.js','src/background/services/managed-tab-worker-service.js','src/background/services/renewal-verification-flow.js'])
  vm.runInContext(read(p),ctx,{filename:p});
 const workers=ctx.KRDeps.require('KRManagedTabWorkerService').create({tabRegistry:registry,chromeTabs,createAutomationTab,updateAutomationTab});
 return {registry,chromeTabs,createAutomationTab,updateAutomationTab,workers,Fast:ctx.KRDeps.require('KRRenewalVerificationFlow'),tabs,events,stats:()=>({reads,writes,peak})};
}
test('S06 Fast normal path: actual creation, retirement, presence and Phase4 use four distinct sequential tabs in fixture; user tab untouched',async()=>{
 const b=browserFixture(),sent=[],waits=[],connections=[],scheduled=[],attempts={3:0,4:0};
 const row={renewalId:'r',fillId:'f',sourceInventoryId:'old',skeletonInventoryId:'new',sourceAdId:'100',newAdId:null,renewalMode:'fast',status:'submitted',stage:'publish-submitted',autoReplacementAllowed:true};
 const createTarget=actualAsync('src/background/controllers/template-fill-controller.js','createRenewalTargetTab',{createAutomationTab:b.createAutomationTab});
 const target=await createTarget(row);row.targetTabId=target.id;
 await b.workers.registerShadowTab(target.id,TabRegistry.ROLES.RENEWAL_TARGET,{ownerType:'renewal',ownerId:'r',renewalId:'r',adId:'100'});
 const targetEntry=await b.registry.get(target.id);assert.equal(targetEntry.managed,false,'insertion target is shadow, not a background worker');
 // Platform publication itself is not executed. Model the already confirmed
 // landing URL; only actual confirmation and later workflow code are run.
 await b.updateAutomationTab(target.id,{url:'https://www.kleinanzeigen.de/s-anzeige/fixture/200-1-2'});
 const fills={f:{fillId:'f',renewalId:'r',sourceAdId:'100',targetTabId:target.id,status:'running',stage:'publish-submitted'}};
 const records={old:{inventoryId:'old',adId:'100',profileName:'Owner',profileId:'p'},new:{inventoryId:'new',adId:null,profileName:'Owner',profileId:'p'}};
 const getInventory=async id=>records[id],readRenewalSessions=async()=>({r:row}),readFillSessions=async()=>fills;
 const persistRenewalSession=async s=>s,writeFillSessions=async()=>{};
 const logRenewalPhaseAttemptStarted=async(_s,phase)=>({attempt:++attempts[phase],attemptId:'a'+phase});
 const renewalPhaseAttemptAvailable=(_s,phase)=>attempts[phase]<1;
 const renewalAttemptState=(_s,phase)=>({attempt:attempts[phase]});
 const waitForTabComplete=async id=>{assert.equal((await b.chromeTabs.get(id)).url,URL_MY_ADS);waits.push(id);};
 const ensureContentConnection=async({tabId})=>{assert.equal((await b.chromeTabs.get(tabId)).status,'complete');connections.push(tabId);};
 let deleteId=null,absenceId=null,proof=false;
 const sendTabRequestWithBootstrap=async(id,m)=>{
  const entry=await b.registry.get(id);assert.ok(entry.managed);assert.equal(entry.owner.ownerId,'r');
  assert.equal((await b.chromeTabs.get(id)).url,URL_MY_ADS);
  sent.push({id,kind:entry.kind,type:m.type,adId:m.adId||null});
  if(m.type==='MY_ADS_STATUS')return {isMyAdsPage:true,isProjectsTab:true,profileName:'Owner'};
  if(m.type==='FIND_OWN_AD_BY_ID'){assert.equal(m.adId,'200');assert.equal(entry.kind,'renewal-fast-presence');return {found:true,adId:m.adId,page:1,pagesScanned:1};}
  if(m.type==='DELETE_OWN_AD_BY_ID'){assert.equal(m.adId,'100');assert.equal(entry.kind,'renewal-phase4-delete');deleteId=id;return {actionTriggered:true};}
  if(m.type==='VERIFY_OWN_AD_ABSENT_BY_ID'){assert.equal(m.adId,'100');assert.equal(entry.kind,'renewal-phase4-verify');assert.notEqual(id,deleteId);assert.ok(!b.tabs.has(deleteId));absenceId=id;proof=true;return {verified:true,adId:m.adId,pagesScanned:1,evidence:'synthetic-independent-absence'};}
  assert.fail('unexpected message '+m.type);
 };
 const promotionSentinel=Error('fixture entered guarded promotion, no database mutation');
 const remote=Remote.create({
  readRenewalSessions,readFillSessions,writeFillSessions,getInventory,getBulkRunState:async()=>({status:'complete'}),
  tabRegistry:b.registry,TabRegistry,chromeApi:{tabs:b.chromeTabs},
  closeRegistryTab:b.workers.closeRegistryTab,createManagedWorkerTab:b.workers.createManagedWorkerTab,closeManagedWorkerTab:b.workers.closeManagedWorkerTab,
  waitForTabComplete,ensureContentConnection,sendTabRequestWithBootstrap,normalBrowserWindowId:async()=>1,
  logDiagnostic:noop,sessionCorrelationContext:empty,correlationContext:empty,normalizeProfileName:String,
  persistRenewalSession,assertMassRenewalManualActionAllowed:noop,assertEmergencyResetGeneration:()=>{},
  renewalMaxPhaseAttempts:()=>1,renewalPhaseAttemptAvailable,renewalAttemptState,renewalAttemptDetails:empty,delay:noop,renewalPhaseRetryDelayMs:()=>0,
  logRenewalPhaseAttemptStarted,logRenewalPhaseAttemptFailed:noop,isNonRetryableRenewalSafetyError:()=>true,isPhase4DeleteTransportInterruption:()=>false,
  openDatabase:async()=>{assert.equal(proof,true);assert.equal(row.stage,'source-delete-verified');throw promotionSentinel;}
 });
 const fast=b.Fast.create({
  sessionPort:{readRenewalSessions},
  inventoryPort:{getInventory,putInventoryRecordOnly:async r=>{records[r.inventoryId]=r;},broadcastInventoryChanged:()=>{}},
  tabPort:{ensureContentConnection,createManagedWorkerTab:b.workers.createManagedWorkerTab,retirePublishedRenewalTargetTab:remote.retirePublishedRenewalTargetTab,normalBrowserWindowId:async()=>1,sendTabRequestWithBootstrap,closeManagedWorkerTab:b.workers.closeManagedWorkerTab,waitForTabComplete},
  diagnosticsPort:{logDiagnostic:noop,sessionCorrelationContext:empty,logRenewalPhaseAttemptFailed:noop,correlationContext:empty,logRenewalPhaseAttemptStarted},
  policyPort:{normalizeRenewalMode:x=>x,isNonRetryableRenewalSafetyError:()=>true,renewalMaxPhaseAttempts:()=>1,renewalPhaseRetryDelayMs:()=>0,renewalAttemptState,normalizeProfileName:String,renewalAttemptDetails:empty,renewalPhaseAttemptAvailable},
  validationPort:{renewalInsertionMeta:empty,renewalPublicSnapshot:s=>structuredClone(s)},
  flowPort:{persistRenewalSession,scheduleAutomaticRenewalReplacement:(...args)=>{assert.equal(row.workerTabId,null);scheduled.push(args);},sendRenewalFeedback:noop},
  configPort:{TAB_LOAD_TIMEOUT_RENEWAL_MS:100,RENEWAL_MODE_FAST:'fast',MY_ADS_PROJECTS_URL:URL_MY_ADS},miscPort:{delay:noop}
 });
 let fastPromise;
 const confirm=actualAsync('src/background/controllers/renewal-workflow-controller.js','confirmPublishedRenewal',{
  readFillSessions,writeFillSessions,legacyOutcomeBlocked:()=>false,readRenewalSessions,persistRenewalSession,normalizeRenewalMode:x=>x,
  RENEWAL_MODE_FAST:'fast',sendRenewalFeedback:noop,logDiagnostic:noop,sessionCorrelationContext:empty,
  retirePublishedRenewalTargetTab:remote.retirePublishedRenewalTargetTab,
  runFastRenewalVerification:id=>{fastPromise=fast.runFastRenewalVerification(id);return fastPromise;},
  renewalPublicSnapshot:s=>structuredClone(s)
 });
 await confirm(fills.f,{adId:'200'});assert.ok(fastPromise);await fastPromise;
 assert.equal(row.targetTabId,null);assert.equal(fills.f.targetTabId,null);assert.equal(row.workerTabId,null);
 assert.deepEqual(scheduled,[['r','fast-mode-presence-verified']]);assert.equal(records.new.adId,'200');
 // Scheduler admission is stubbed here; Phase4 is the real service, invoked
 // after Fast settles. This does not claim simultaneous-tab scheduling bounds.
 await assert.rejects(remote.finishRenewalReplacement({renewalId:'r',automatic:true}),e=>e===promotionSentinel);
 const created=b.events.filter(e=>e[0]==='create').map(e=>e[1]),closed=b.events.filter(e=>e[0]==='close').map(e=>e[1]);
 assert.equal(created.length,4);assert.deepEqual(closed,created);assert.deepEqual([...b.tabs.keys()],[99]);
 assert.equal(new Set(created).size,4);assert.notEqual(deleteId,absenceId);
 assert.deepEqual(waits,created.slice(1));assert.deepEqual(connections,created.slice(1));
 assert.deepEqual(sent.map(e=>[e.id,e.type,e.adId]),[[created[1],'MY_ADS_STATUS',null],[created[1],'FIND_OWN_AD_BY_ID','200'],[created[2],'MY_ADS_STATUS',null],[created[2],'DELETE_OWN_AD_BY_ID','100'],[created[3],'MY_ADS_STATUS',null],[created[3],'VERIFY_OWN_AD_ABSENT_BY_ID','100']]);
 const registryEntries=await b.registry.snapshot();assert.equal(registryEntries.length,4);assert.ok(registryEntries.every(e=>e.lifecycleState==='gone'));
 console.log('KAR222_FAST_TOPOLOGY '+JSON.stringify({created:created.length,closed:closed.length,workerNavigations:b.events.filter(e=>e[0]==='navigate'&&e[2]===URL_MY_ADS).length,waits:waits.length,connectionCalls:connections.length,workflowRequests:sent.length,profileRequests:sent.filter(e=>e.type==='MY_ADS_STATUS').length,deleteRequests:sent.filter(e=>e.type==='DELETE_OWN_AD_BY_ID').length,independentProofRequests:sent.filter(e=>e.type==='VERIFY_OWN_AD_ABSENT_BY_ID').length,fixtureRegistry:b.stats(),native:false}));
});
test('S06 reuse characterization: URL readiness and registry correlation do not themselves prove fresh document or exact attempt',async()=>{
 const b=browserFixture(),oldDoc={id:101,url:URL_MY_ADS,status:'complete',documentId:'old'},newDoc={...oldDoc,documentId:'new'};
 assert.equal(Navigation.assess(oldDoc,URL_MY_ADS).state,Navigation.STATES.READY);
 assert.deepEqual(Navigation.assess(oldDoc,URL_MY_ADS),Navigation.assess(newDoc,URL_MY_ADS));
 const tab=await b.workers.createManagedWorkerTab({url:URL_MY_ADS,active:false},'renewal-fast-presence',{ownerType:'renewal',ownerId:'r',phaseAttemptId:'a3'});
 const entry=await b.registry.get(tab.id);
 assert.equal(entry.owner.phaseAttemptId,undefined);
 assert.equal(TabRegistry.ownerMatches(entry.owner,{ownerType:'renewal',ownerId:'r',phaseAttemptId:'a4'}),true);
 assert.equal(TabRegistry.ownerMatches(entry.owner,{ownerType:'renewal',ownerId:'different'}),false);
 await b.workers.closeManagedWorkerTab(tab.id);
 assert.equal((await b.registry.get(tab.id)).lifecycleState,'gone');
});
