const fs=require('fs'); const vm=require('vm'); const assert=require('assert');
if(!fs.existsSync('bulk-run-guard.js')) throw new Error('bulk-run-guard.js missing');
function load(){ const regs={}; const ctx={console,setTimeout,clearTimeout,globalThis:null}; ctx.globalThis=ctx; ctx.crypto={randomUUID:()=> 'epoch-1'}; ctx.KRDeps={register:(n,a)=>regs[n]=a}; vm.createContext(ctx); vm.runInContext(fs.readFileSync('bulk-run-guard.js','utf8'),ctx); return regs.KRBulkRunGuard||ctx.KRBulkRunGuard; }
let pass=0; async function ok(name,fn){await fn(); console.log('PASS '+name); pass++;}
(async()=>{
 await ok('terminal bulk state cannot be resurrected by a stale running writer', async()=>{
  let local={bulk:{runId:'r1',status:'running',stage:'worker-open',updatedAt:'2026-01-01T00:00:00.000Z'}}; let session={};
  const storageLocal={get:async k=>({[k]:local[k]}),set:async o=>Object.assign(local,o)};
  const storageSession={get:async k=>({[k]:session[k]}),set:async o=>Object.assign(session,o),remove:async k=>{delete session[k];}};
  const guard=load().create({storageLocal,storageSession,runKey:'bulk',leaseKey:'lease',epochKey:'epoch',now:()=>Date.parse('2026-01-01T00:00:10.000Z')});
  await guard.mutate(s=>({...s,status:'needs-review',stage:'source-tab-closed'}));
  const result=await guard.write({runId:'r1',status:'running',stage:'worker-open'});
  assert.equal(result.status,'needs-review'); assert.equal(local.bulk.status,'needs-review');
 });
 await ok('missing session lease recovers a persisted running bulk run', async()=>{
  let local={bulk:{runId:'r2',status:'running',stage:'worker-open',workerTabId:5,metadataTabId:6,sourceTabId:4,issues:[]}}; let session={};
  const storageLocal={get:async k=>({[k]:local[k]}),set:async o=>Object.assign(local,o)};
  const storageSession={get:async k=>({[k]:session[k]}),set:async o=>Object.assign(session,o),remove:async k=>{delete session[k];}};
  const guard=load().create({storageLocal,storageSession,runKey:'bulk',leaseKey:'lease',epochKey:'epoch',now:()=>Date.parse('2026-01-01T00:00:10.000Z')});
  const recovery=await guard.recoverOrphanedRun();
  assert.equal(recovery.recovered,true); assert.equal(recovery.state.status,'needs-review'); assert.equal(recovery.state.stage,'runtime-session-lost');
  assert.deepStrictEqual(Array.from(recovery.tabIds),[4,5,6]);
 });
 await ok('worker watchdog terminalizes an item past its absolute hard deadline', async()=>{
  let local={bulk:{runId:'r3',status:'running',stage:'worker-open',currentItemStartedAt:'2026-01-01T00:00:00.000Z',workerTabId:5,metadataTabId:6,issues:[]}}; let session={lease:{runId:'r3',runtimeEpoch:'epoch-1'},epoch:'epoch-1'};
  const storageLocal={get:async k=>({[k]:local[k]}),set:async o=>Object.assign(local,o)};
  const storageSession={get:async k=>({[k]:session[k]}),set:async o=>Object.assign(session,o),remove:async k=>{delete session[k];}};
  const guard=load().create({storageLocal,storageSession,runKey:'bulk',leaseKey:'lease',epochKey:'epoch',itemHardTimeoutMs:90000,now:()=>Date.parse('2026-01-01T00:02:00.000Z')});
  const recovery=await guard.recoverExpiredWorkerRun();
  assert.equal(recovery.recovered,true); assert.equal(recovery.state.status,'needs-review'); assert.equal(recovery.state.stage,'worker-timeout');
 });
 console.log(`${pass}/3 PASS v1.22.13 bulk deadlock runtime`);
})().catch(e=>{console.error(e);process.exit(1);});
