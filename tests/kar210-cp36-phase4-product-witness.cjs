'use strict';
// Actual historical product boundaries; no updater admission/receipt or journal simulation.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Remote=require('../src/background/services/remote-delete-replacement-service.js');
const controller=fs.readFileSync('src/background/controllers/renewal-workflow-controller.js','utf8'),bg=fs.readFileSync('src/background/background.js','utf8');
test('KAR-113 historical detached verification and retry sites remain wired at the real owner',()=>{
 const ok=(value,why)=>assert.ok(value,why);
 ok(controller.includes("const required = {"),"controller retains strict injected dependency contract");
 ok(bg.includes("renewalWorkflowController = RenewalWorkflowController.create({"),"real background constructs renewal controller");
 for(const [pattern,label] of [[/\bvoid\s+runFastRenewalVerification\(/g,'Fast'],[/\bvoid\s+runRenewalReinventory\(/g,'Safe'],[/\bvoid\s+retryRenewalVerification\(/g,'retry']])assert.equal((controller.match(pattern)||[]).length,2,label);
});
test('KAR-115 actual historical automatic replacement scheduler prevents duplicate in-process dispatch and releases guard after settlement',async()=>{
 const ctx=vm.createContext({console,Date,Promise,Set,Map,structuredClone,URL,setTimeout,clearTimeout});
 for(const path of ['src/shared/runtime-deps.js','src/background/services/renewal-verification-flow.js','src/background/services/renewal-reinventory-flow.js','src/background/services/paid-checkout-recovery-service.js','src/background/controllers/renewal-workflow-controller.js'])vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
 const API=ctx.KRDeps.require('KRRenewalWorkflowController'),block=controller.match(/const required = \{([\s\S]*?)\n      \};/);
 assert.ok(block,'real required dependency list');const deps=Object.fromEntries(block[1].split(',').map(s=>s.trim()).filter(Boolean).map(n=>[n,async()=>{}]));
 const stored={rid:{renewalId:'rid',status:'verified',stage:'replacement-ready',autoReplacementAllowed:true,newAdId:'12345'}};
 const calls=[];let writes=0,release;
 Object.assign(deps,{readRenewalSessions:async()=>structuredClone(stored),writeRenewalSessions:async()=>{writes++;},sessionCorrelationContext:()=>({}),finishRenewalReplacement:async message=>{calls.push(message);return new Promise(r=>release=r);},RENEWAL_MODE_FAST:'fast',RENEWAL_MODE_SAFE:'safe',RENEWAL_PHASE_ATTEMPTS_DEFAULT:3,MY_ADS_PROJECTS_URL:'https://www.kleinanzeigen.de/m-meine-anzeigen.html',BULK_RETRY_POLL_MS:1,BULK_RETRY_TIMEOUT_MS:10,TAB_LOAD_TIMEOUT_PHASE4_MS:100,TAB_LOAD_TIMEOUT_RENEWAL_MS:100});
 const api=API.create(deps),tick=()=>new Promise(setImmediate);
 assert.equal(api.scheduleAutomaticRenewalReplacement(''),false);assert.equal(calls.length,0);
 assert.equal(api.scheduleAutomaticRenewalReplacement('rid'),true);
 assert.equal(api.scheduleAutomaticRenewalReplacement('rid'),false);
 await tick();assert.equal(calls.length,1);assert.equal(calls[0].renewalId,'rid');assert.equal(calls[0].automatic,true);
 assert.equal(api.scheduleAutomaticRenewalReplacement('rid'),false);assert.equal(writes,0);
 release();await tick();
 assert.equal(api.scheduleAutomaticRenewalReplacement('rid'),true);await tick();assert.equal(calls.length,2);
 release();await tick();assert.equal(writes,0);assert.equal(stored.rid.stage,'replacement-ready');
});
test('KAR-117/128 actual Phase-4 refuses remote dispatch when initial persisted state write is unavailable',async()=>{
 const row={renewalId:'r',sourceInventoryId:'old',skeletonInventoryId:'new',sourceAdId:'100',newAdId:'200',status:'verified',stage:'replacement-ready'};
 let writes=0,remote=0,workers=0;const api=Remote.create({
  readRenewalSessions:async()=>({r:structuredClone(row)}),getInventory:async id=>({inventoryId:id,adId:id==='old'?'100':'200',profileName:'Owner'}),
  getBulkRunState:async()=>({status:'complete'}),normalizeProfileName:s=>String(s||'').trim(),assertMassRenewalManualActionAllowed:async()=>{},assertEmergencyResetGeneration:()=>true,
  persistRenewalSession:async()=>{writes++;throw Error('fixture storage unavailable');},normalBrowserWindowId:async()=>null,
  createManagedWorkerTab:async()=>{workers++;throw Error('must not create worker')},sendTabRequestWithBootstrap:async()=>{remote++;throw Error('must not dispatch')}
 });
 await assert.rejects(api.finishRenewalReplacement({renewalId:'r',automatic:true}),/fixture storage unavailable/);
 assert.equal(writes,1);assert.equal(workers,0);assert.equal(remote,0);assert.equal(row.stage,'replacement-ready');
});
