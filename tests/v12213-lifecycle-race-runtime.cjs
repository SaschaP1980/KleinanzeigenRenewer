const fs=require('fs'),vm=require('vm'),assert=require('assert');
function loadFile(file,name,extra={}){const regs={};const ctx={console,setTimeout,clearTimeout,URL,globalThis:null,...extra};ctx.globalThis=ctx;ctx.KRDeps={register:(n,a)=>regs[n]=a};vm.createContext(ctx);vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});return regs[name]||ctx[name];}
(async()=>{
 let local={bulkInventoryRun:{runId:'race',status:'running',stage:'worker-open',sourceTabId:9,workerTabId:10,metadataTabId:11,issues:[]}};
 let session={runtimeEpochV1:'e',bulkRunRuntimeLeaseV1:{runId:'race',runtimeEpoch:'e'}};
 const storageLocal={get:async k=>({[k]:local[k]}),set:async o=>Object.assign(local,o)};
 const storageSession={get:async k=>({[k]:session[k]}),set:async o=>Object.assign(session,o),remove:async k=>{delete session[k];}};
 const guard=loadFile('bulk-run-guard.js','KRBulkRunGuard',{crypto:{randomUUID:()=> 'e'}}).create({storageLocal,storageSession,runKey:'bulkInventoryRun',leaseKey:'bulkRunRuntimeLeaseV1',epochKey:'runtimeEpochV1'});
 const observer=loadFile('tab-lifecycle-observer.js','KRTabLifecycleObserver').create({
   tabRegistry:{markGone:async()=>{},observeTab:async()=>null},chromeTabs:{get:async id=>({id})},goneState:'gone',roles:{BULK_WORKER:'bulk-worker',RENEWAL_WORKER:'renewal-worker',ARCHIVE_WORKER:'archive-worker',WORKER:'worker'},
   logDiagnostic:async()=>{},isGoneError:()=>false,notifyTabLoadWaiters:()=>{},evictTemplateImageTransfersForTab:()=>{},readFillSessions:async()=>({}),writeFillSessions:async()=>{},broadcastInventoryChanged:()=>{},readRenewalSessions:async()=>({}),persistRenewalSession:async()=>{},readArchiveInsertionSessions:async()=>({}),persistArchiveInsertionSession:async()=>{},
   getBulkRunState:()=>guard.read(),writeBulkRunState:s=>guard.write(s),mutateBulkRunState:m=>guard.mutate(m),closeRegistryTabs:async()=>{}
 });
 await Promise.all([observer.handleRemoved(9),observer.handleRemoved(10),observer.handleRemoved(11)]);
 assert.equal(local.bulkInventoryRun.status,'needs-review');
 assert.equal(local.bulkInventoryRun.stage,'source-tab-closed');
 assert.equal(local.bulkInventoryRun.workerTabId,null);
 assert.equal(local.bulkInventoryRun.metadataTabId,null);
 console.log('1/1 PASS v1.22.13 lifecycle race runtime');
})().catch(e=>{console.error(e);process.exit(1)});
