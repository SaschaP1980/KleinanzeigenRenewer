const fs=require('fs'),vm=require('vm'),assert=require('assert');
function load(file,name){const regs={};const c={console,URL,setTimeout,clearTimeout,globalThis:null};c.globalThis=c;c.KRDeps={register(n,a){regs[n]=a;}};vm.createContext(c);vm.runInContext(fs.readFileSync(file,'utf8'),c,{filename:file});return c[name]||regs[name];}
let p=0;async function ok(n,f){try{await f();p++;console.log('PASS '+n)}catch(e){console.error('FAIL '+n);throw e}}
(async()=>{
 await ok('single controller captures a public own ad and always cleans managed edit worker',async()=>{
  const api=load('single-inventory-controller.js','KRSingleInventoryController'); let closed=[]; let saved=null;
  const svc=api.create({
   getBulkRunState:async()=>null, randomUUID:()=> 'op1', tabRegistry:{getTabOrThrow:async()=>({id:5,url:'https://www.kleinanzeigen.de/s-anzeige/test/123'})},chromeTabs:{},
   singleInventorySourceFromUrl:()=>({adId:'123',mode:'public',publicUrl:'https://www.kleinanzeigen.de/s-anzeige/test/123'}),sendTabRequestWithBootstrap:async()=>({auth:{loggedIn:true,ownAd:true},adId:'123',profileName:'alice'}),
   normalizeProfileName:x=>String(x||'').trim(),assertSelectedProfileMatchesLiveAccount:async()=>{},logDiagnostic:async()=>{},correlationContext:(...xs)=>Object.assign({},...xs),normalBrowserWindowId:async()=>1,
   createManagedWorkerTab:async()=>({id:9}),getInventory:async()=>null,publicUrlForInventoryRecord:()=>'',extractReadOnlyMetadata:async()=>({ok:true,metadata:{sourceUrl:'https://www.kleinanzeigen.de/s-anzeige/test/123'},durationMs:1}),
   directPublicUrlForAdId:id=>`https://www.kleinanzeigen.de/s-anzeige/x/${id}`,extractSingleInventoryEdit:async()=>({adId:'123',listingMeta:{},imageSummary:{discovered:1}}),mergeListingMetadata:(e,_x,_r,f)=>({...e.listingMeta,...f}),
   saveInventory:async rec=>(saved={...rec,inventoryId:'123',imageSummary:{discovered:1}}),closeManagedWorkerTab:async id=>closed.push(id),readOnlyMetadataTimeoutMs:10
  });
  const r=await svc.captureSingleInventory({sourceTabId:5,profileId:'p1',profileName:'alice'});assert.strictEqual(r.inventoryId,'123');assert.strictEqual(saved.profileId,'p1');assert.deepStrictEqual(closed,[9]);
 });
 await ok('bulk controller initializes scoped run and persists source ownership',async()=>{
  const api=load('bulk-inventory-controller.js','KRBulkInventoryController');let written=null,registered=null;
  const scope={activeInventoryAdIds:()=>['7'],shouldSkipExisting:()=>false};
  const svc=api.create({getBulkRunState:async()=>null,tabRegistry:{get:async()=>({kind:'bulk-source-auto'}),getTabOrThrow:async()=>({})},tabRegistryApi:{isGoneError:()=>false},chromeTabs:{},tabRoles:{BULK_SOURCE:'bulk-source'},bulkRunOwnerExpectation:s=>({ownerId:s.runId}),normalizeProfileName:x=>x,ensureProfile:async()=>({profileId:'p',displayName:'alice'}),randomUUID:(()=>{let i=0;return()=>`00000000-0000-4000-8000-00000000000${++i}`})(),normalizeCorrelationId:()=>'',normalizeInventoryScope:x=>x||'new-only',inventoryScopeApi:scope,inventoryScopeNewOnly:'new-only',readInventoryRecordsForProfile:async()=>[],normalizeRenewalMode:x=>x||'safe',registerShadowTab:async(...x)=>{registered=x;},writeBulkRunState:async s=>(written={...s}),logDiagnostic:async()=>{},sessionCorrelationContext:x=>x,requireBulkSource:()=>{},closeRegistryTabs:async()=>{},releaseBulkSourceOwnership:async()=>{},scheduleAutoBulkSourceClose:()=>{},broadcastInventoryChanged:()=>{}});
  const r=await svc.initBulkRun({sourceFresh:true,expectedTotal:3,currentPage:1,profileName:'alice',inventoryScope:'new-only',verificationMode:'safe'},{tab:{id:4,url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html'}});assert.strictEqual(r.status,'running');assert.strictEqual(r.sourceAutoCreated,true);assert.deepStrictEqual(Array.from(r.existingInventoryIds),['7']);assert.strictEqual(written.runId,r.runId);assert.strictEqual(registered[0],4);
 });
 await ok('bulk controller controlled stop closes workers and terminalizes run',async()=>{
  const api=load('bulk-inventory-controller.js','KRBulkInventoryController');const state={runId:'r',sourceTabId:1,status:'running',stage:'worker-open',workerTabId:10,metadataTabId:11,processedIds:['1'],expectedTotal:3,successCount:1,failedCount:0,remoteRosterIds:['1','2','3']};let closed=null,written=null,released=false;
  const svc=api.create({getBulkRunState:async()=>state,tabRegistry:{},tabRegistryApi:{},chromeTabs:{},tabRoles:{},bulkRunOwnerExpectation:()=>({}),normalizeProfileName:x=>x,ensureProfile:async()=>null,randomUUID:()=>'',normalizeCorrelationId:x=>x,normalizeInventoryScope:x=>x,inventoryScopeApi:{},inventoryScopeNewOnly:'new-only',readInventoryRecordsForProfile:async()=>[],normalizeRenewalMode:x=>x,registerShadowTab:async()=>{},writeBulkRunState:async s=>(written={...s}),logDiagnostic:async()=>{},sessionCorrelationContext:x=>x,requireBulkSource:()=>{},closeRegistryTabs:async ids=>{closed=ids;},releaseBulkSourceOwnership:async()=>{released=true;},scheduleAutoBulkSourceClose:()=>{},broadcastInventoryChanged:()=>{}});
  const r=await svc.finishBulkRunControlledStop({lastPage:1},{tab:{id:1}});assert.strictEqual(r.status,'stopped');assert.strictEqual(r.reconciliationStatus,'skipped-controlled-stop');assert.deepStrictEqual(Array.from(closed),[10,11]);assert.strictEqual(released,true);assert.strictEqual(written.status,'stopped');
 });
 await ok('bulk controller stale result cannot bypass source identity guard',async()=>{
  const api=load('bulk-inventory-controller.js','KRBulkInventoryController');const state={runId:'r',sourceTabId:1,status:'running',processedIds:[],failures:[],successCount:0,failedCount:0};
  const svc=api.create({getBulkRunState:async()=>state,tabRegistry:{},tabRegistryApi:{},chromeTabs:{},tabRoles:{},bulkRunOwnerExpectation:()=>({}),normalizeProfileName:x=>x,ensureProfile:async()=>null,randomUUID:()=>'',normalizeCorrelationId:x=>x,normalizeInventoryScope:x=>x,inventoryScopeApi:{shouldSkipExisting:()=>false},inventoryScopeNewOnly:'new-only',readInventoryRecordsForProfile:async()=>[],normalizeRenewalMode:x=>x,registerShadowTab:async()=>{},writeBulkRunState:async s=>s,logDiagnostic:async()=>{},sessionCorrelationContext:x=>x,closeRegistryTabs:async()=>{},releaseBulkSourceOwnership:async()=>{},scheduleAutoBulkSourceClose:()=>{},broadcastInventoryChanged:()=>{}});
  await assert.rejects(()=>svc.recordBulkResult({adId:'1',ok:true},{tab:{id:99}}),/anderen „Meine Anzeigen“-Tab/);assert.deepStrictEqual(Array.from(state.processedIds),[]);
 });
 console.log(`${p}/4 PASS v1.22.14 modularization runtime`);
})().catch(e=>{console.error(e);process.exit(1)});
