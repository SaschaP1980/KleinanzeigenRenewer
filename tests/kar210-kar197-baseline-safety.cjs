'use strict';
// S02 archive and renewal safety without later journal status or schema proof.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
require('../src/shared/runtime-deps.js');
const UI=require('../src/app/archive-insertion-ui-controller.js');
const Archive=require('../src/background/services/archive-insertion-service.js');
const Lock=require('../src/background/services/insertion-lock-service.js');
const copy=x=>structuredClone(x);
function element(){const classes=new Set();return {textContent:'',classList:{add:(...names)=>names.forEach(n=>classes.add(n)),remove:(...names)=>names.forEach(n=>classes.delete(n)),contains:n=>classes.has(n),toggle(n,force){const yes=force===undefined?!classes.has(n):force;if(yes)classes.add(n);else classes.delete(n);return yes;}}};}
test('historical ZIP failed pre-publish rendering is not successful; mode and stale-revision rejection retained',()=>{
  for(const mode of ['fast','safe']){
    const elements=Object.fromEntries(['archiveInsertTitle','archiveProgressMessage','archiveProgressMessageTitle','archiveProgressMessageText','archiveBackgroundHint','archiveProgressView','archiveProgressEdit','archivePhase3Label'].map(k=>[k,element()]));
    const ui=UI.create({elements,normalizeRenewalMode:x=>x,fastMode:'fast'});
    const failed={archiveInsertionId:'a',status:'error',stage:'error-phase-1',revision:3,renewalMode:mode,failurePhase:1,newAdId:null};
    assert.equal(ui.applyArchiveInsertionSessionSnapshot(failed,{source:'test'}),true);
    assert.match(elements.archiveProgressMessageTitle.textContent,/Nicht neu inseriert/);
    assert.match(elements.archiveProgressMessageText.textContent,/nicht sicher bestätigt/);
    assert.equal(elements.archiveBackgroundHint.classList.contains('hidden'),true);
    const model=ui.archiveProgressModel(failed);
    assert.equal(model.fast,mode==='fast');assert.equal(model.states[1],'error');assert.equal(model.states[3],mode==='fast'?'skipped':'pending');assert.equal(model.states[4],'pending');
    assert.equal(ui.applyArchiveInsertionSessionSnapshot({...failed,status:'filling',revision:2},{source:'stale'}),false);
    assert.match(elements.archiveProgressMessageTitle.textContent,/Nicht neu inseriert/);
  }
});
test('historical submitted ZIP session persists with no invented ID and locks competing insertion',async()=>{
  const row={archiveInsertionId:'a',fillId:'f',status:'filling',stage:'publish-submitted',newAdId:null,createdAt:new Date().toISOString(),renewalMode:'fast',revision:3,targetTabId:42};
  const rows={archiveInsertionSessionsV1:{a:copy(row)}};
  const local={async get(k){return {[k]:copy(rows[k])};},async set(p){Object.assign(rows,copy(p));}};
  const archive=Archive.create({storageLocal:local,normalizeRenewalMode:x=>x});
  const observed=await archive.getArchiveInsertionStatus({archiveInsertionId:'a'});
  assert.equal(observed.stage,'publish-submitted');assert.equal(observed.newAdId,null);assert.equal(observed.revision,3);
  const lock=Lock.create({readRenewalSessions:async()=>({}),readArchiveInsertionSessions:archive.readArchiveInsertionSessions,readFillSessions:async()=>({}),readMassRenewalBatch:async()=>null,renewalHoldsInsertionLock:()=>false,templateFillHoldsInsertionLock:()=>false,getInventory:async()=>null,logDiagnostic:async()=>{}});
  const state=await lock.getInsertionLockState();assert.equal(state.locked,true);assert.equal(state.kind,'archive-insertion');assert.equal(state.ownerId,'a');
  for(const kind of ['archive-insertion','renewal','trash-template']) await assert.rejects(lock.assertInsertionStartAvailable({kind}),/läuft bereits/);
  assert.deepEqual(rows.archiveInsertionSessionsV1.a,row);
});
test('actual historical archive and renewal submitted/new-ID stages reject all stale pre-publish updates',async()=>{
  const source=fs.readFileSync('src/background/controllers/template-fill-controller.js','utf8');
  const start=source.indexOf('async function updateTemplateFillSession('),end=source.indexOf('async function terminalizeTemplateFillOnPlatformError(',start);
  assert.ok(start>=0&&end>start);
  for(const owner of ['archiveInsertionId','renewalId'])for(const current of ['publish-submitted','new-id-confirmed']){
    const initial={fillId:'f',targetTabId:42,[owner]:'a',status:'running',stage:current,result:{complete:true,issues:[]}};
    let fills={f:copy(initial)};let writes=0, retries=0,logs=[];
    const ctx={withTemplateFillMutation:async fn=>fn(),readFillSessions:async()=>copy(fills),writeFillSessions:async value=>{writes++;fills=copy(value);},logDiagnostic:async(...args)=>logs.push(args),sessionCorrelationContext:()=>({}),recordRenewalPhaseAttemptError:()=>{retries++;},canRetryRenewalPhase1:()=>{retries++;return true;},restartRenewalPhase1Attempt:()=>{retries++;},TERMINAL_TEMPLATE_FILL_STATUSES:new Set(['complete','needs-review','error'])};
    const update=vm.runInNewContext(source.slice(start,end)+'\nupdateTemplateFillSession;',ctx);
    for(const stage of ['form-verified','post-fill-continuing','awaiting-publish','awaiting-manual-publish','auto-publish-ready']){
      const result=await update({fillId:'f',status:'running',stage,result:{complete:true,issues:[]}},{tab:{id:42}});
      assert.equal(result.staleUpdateIgnored,true);assert.equal(result.stage,current);
    }
    await assert.rejects(()=>update({fillId:'f',status:'running',stage:'form-verified'},{tab:{id:43}}),/Tab/);
    assert.deepEqual(fills.f,initial);assert.equal(writes,0);assert.equal(retries,0);
    assert.equal(logs.filter(x=>x[1]==='TEMPLATE_FILL_STALE_PUBLISH_STAGE_IGNORED').length,5);
  }
});
