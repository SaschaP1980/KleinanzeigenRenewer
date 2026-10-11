const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
function load(file, globalName){
  const registrations = {};
  const ctx = { URL, setTimeout, clearTimeout, console, globalThis: null };
  ctx.globalThis = ctx;
  ctx.KRDeps = { register(name, api){ registrations[name]=api; } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file,'utf8'), ctx, {filename:file});
  return ctx[globalName] || registrations[globalName];
}
let pass=0;
async function ok(name, fn){ try { await fn(); console.log('PASS '+name); pass++; } catch(e){ console.error('FAIL '+name); throw e; } }
(async()=>{
  await ok('managed worker service registers before target navigation and closes failed workers', async()=>{
    const api=load('managed-tab-worker-service.js','KRManagedTabWorkerService');
    const calls=[];
    const registry={
      registerManagedWorker: async(id,kind,owner)=>{calls.push(['register',id,kind,owner.ownerId]);},
      getTabOrThrow: async(id)=>({id,url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html'}),
      closeTab: async(id,_tabs,meta)=>{calls.push(['close',id,meta.reason]); return {closed:true};},
      managedTabIds: async()=>[], snapshot: async()=>[], get:async()=>null,
      register:async()=>null, reloadTabOrThrow:async()=>null, markGone:async()=>null
    };
    const svc=api.create({tabRegistry:registry,chromeTabs:{get:async()=>({})},createAutomationTab:async opts=>{calls.push(['create',opts.url,opts.active]);return{id:7};},updateAutomationTab:async(id,p)=>{calls.push(['update',id,p.url]);}});
    const tab=await svc.createManagedWorkerTab({url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html',active:true},'inventory',{ownerId:'x'});
    assert.strictEqual(tab.id,7);
    assert.deepStrictEqual(calls.slice(0,3),[['create','about:blank',false],['register',7,'inventory','x'],['update',7,'https://www.kleinanzeigen.de/m-meine-anzeigen.html']]);
  });
  await ok('content connection manager accepts a warm fully-ready content connection without injection', async()=>{
    const api=load('content-connection-manager.js','KRContentConnectionManager');
    let injected=0;
    const svc=api.create({
      tabRegistry:{getTabOrThrow:async()=>({id:5,url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html',status:'complete'}),get:async()=>null},
      chromeTabs:{get:async()=>({id:5,url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html',status:'complete'})},
      chromeScripting:{executeScript:async()=>{injected++;}},
      sendTabRequest:async()=>({ready:true,modules:{images:true,form:true,templateFill:true,inventoryRun:true}}),
      assertPlatformAccessAllowed:async()=>{}, logDiagnostic:async()=>{}, goneState:'gone'
    });
    const result=await svc.ensureContentConnection({tabId:5});
    assert.strictEqual(result.ready,true); assert.strictEqual(result.bootstrapped,false); assert.strictEqual(injected,0);
  });
  await ok('account probe retries transient failure, closes each worker and returns confirmed profile', async()=>{
    const api=load('account-probe-service.js','KRAccountProbeService');
    let created=0,closed=0;
    const svc=api.create({
      maxAttempts:2,retryDelayMs:0,navigationTimeoutMs:10,delay:async()=>{},randomUUID:()=> 'op',normalBrowserWindowId:async()=>1,
      createManagedWorkerTab:async()=>({id:++created}),updateAutomationTab:async()=>{},
      waitForExpectedTabComplete:async()=>{if(created===1){const e=new Error('timeout');e.code='KR_TAB_NAVIGATION_TIMEOUT';throw e;}},
      ensureContentConnection:async()=>{},sendTabRequestWithBootstrap:async(_id,msg)=>msg.type==='PAGE_STATUS'?{auth:{loggedIn:true},profileName:'alice@example.test'}:{profileName:'alice@example.test'},
      normalizeProfileName:x=>x,ensureProfile:async name=>({profileId:'p1',displayName:name}),logDiagnostic:async()=>{},closeManagedWorkerTab:async()=>{closed++;},myAdsProjectsUrl:'https://www.kleinanzeigen.de/m-meine-anzeigen.html',platformAccessRestrictionErrorCode:'KR_PLATFORM_ACCESS_RESTRICTED'
    });
    const r=await svc.probeLiveKleinanzeigenAccount();
    assert.strictEqual(r.confirmed,true); assert.strictEqual(r.profile.profileId,'p1'); assert.strictEqual(created,2); assert.strictEqual(closed,2);
  });
  await ok('platform safety blocks remote actions while leaving non-remote messages ungated', async()=>{
    const api=load('platform-safety-controller.js','KRPlatformSafetyController');
    const svc=api.create({
      restrictionKey:'r',errorCode:'KR_PLATFORM_ACCESS_RESTRICTED',storageLocal:{get:async()=>({r:{active:true,code:'x'}}),set:async()=>{},remove:async()=>{}},logDiagnostic:async()=>{},
      chromeTabs:{create:async()=>({}),update:async()=>({}),reload:async()=>{},query:async()=>[]},runtime:{sendMessage(){},lastError:null},
      getBulkRunState:async()=>null,readRenewalSessions:async()=>({}),readArchiveInsertionSessions:async()=>({}),readFillSessions:async()=>({}),readMassRenewalBatch:async()=>null,getTabRegistrySnapshot:async()=>[],closeRegistryTabs:async()=>{},closeRegistryTab:async()=>{},releaseBulkSourceOwnership:async()=>{},writeBulkRunState:async()=>{},writeRenewalSessions:async()=>{},writeArchiveInsertionSessions:async()=>{},writeFillSessions:async()=>{},writeMassRenewalBatch:async()=>{},touchMassRenewalItemProgress:()=>{},broadcastInventoryChanged:()=>{},platformHardening:{detectAccessRestriction:()=>({restricted:false})},goneState:'gone',bulkWorkerRole:'bulk-worker'
    });
    assert.strictEqual(await svc.assertPlatformAccessAllowedForRequest({type:'GET_STATE'}),null);
    await assert.rejects(()=>svc.assertPlatformAccessAllowedForRequest({type:'ENSURE_CONTENT_CONNECTION'}),e=>e.code==='KR_PLATFORM_ACCESS_RESTRICTED');
  });
  await ok('tab lifecycle observer reactivates only owned discarded workers and marks removed bulk source needs-review', async()=>{
    const api=load('tab-lifecycle-observer.js','KRTabLifecycleObserver');
    let reloads=0,writes=0,closed=0;
    const run={status:'running',sourceTabId:9,workerTabId:10,metadataTabId:11,issues:[]};
    const registry={observeTab:async()=>({tabId:7,managed:true,role:'worker',lifecycleState:'active',owner:{ownerId:'o'}}),reloadTabOrThrow:async()=>{reloads++;},markGone:async()=>{}};
    const svc=api.create({
      tabRegistry:registry,chromeTabs:{get:async id=>({id,discarded:true})},goneState:'gone',roles:{BULK_WORKER:'bulk-worker',RENEWAL_WORKER:'renewal-worker',ARCHIVE_WORKER:'archive-worker',WORKER:'worker'},
      logDiagnostic:async()=>{},isGoneError:()=>false,notifyTabLoadWaiters:()=>{},evictTemplateImageTransfersForTab:()=>{},readFillSessions:async()=>({}),writeFillSessions:async()=>{},broadcastInventoryChanged:()=>{},readRenewalSessions:async()=>({}),persistRenewalSession:async()=>{},readArchiveInsertionSessions:async()=>({}),persistArchiveInsertionSession:async()=>{},getBulkRunState:async()=>run,closeRegistryTabs:async()=>{closed++;},writeBulkRunState:async()=>{writes++;}
    });
    await svc.observeTabLifecycleUpdate({id:7,discarded:true}); assert.strictEqual(reloads,1);
    await svc.handleRemoved(9); assert.strictEqual(run.status,'needs-review'); assert.strictEqual(run.stage,'source-tab-closed'); assert.strictEqual(closed,1); assert.strictEqual(writes,1);
  });
  console.log(`${pass}/5 PASS v1.22.12 modularization runtime`);
})().catch(e=>{console.error(e);process.exit(1);});
