const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let n=0; const pass=m=>{n++; console.log('PASS '+m)};

function storageMock() {
  const state = {};
  return {
    state,
    async get(key) {
      if (Array.isArray(key)) return Object.fromEntries(key.map(k=>[k,state[k]]));
      if (typeof key === 'string') return { [key]: state[key] };
      return { ...state };
    },
    async set(value) { Object.assign(state,value); },
    async remove(key) { for (const k of (Array.isArray(key)?key:[key])) delete state[k]; }
  };
}

async function testDiagnostics() {
  const source=fs.readFileSync('diagnostics-service.js','utf8');
  let uuid=0;
  const ctx={console,Date,Promise,Object,String,Number,Array,Math,Map,Set,URL,setTimeout,clearTimeout,module:{exports:{}}}; ctx.globalThis=ctx;
  vm.createContext(ctx); vm.runInContext(source,ctx);
  const storage=storageMock();
  let blocker='';
  const service=ctx.KRDiagnosticsService.create({
    storageLocal:storage,
    randomUUID:()=>`session-${++uuid}`,
    correlationContext:(...values)=>Object.assign({},...values.filter(v=>v&&typeof v==='object')),
    getResetBlocker:async()=>blocker,
    batchFlushMs:100000,
    batchMaxPending:99
  });
  assert.equal(service.sessionId(),'session-1');
  await service.log('info','PROFILE_RECOGNIZED',{profileId:'p1',unprofiledCount:0});
  await service.log('info','PROFILE_RECOGNIZED',{profileId:'p1',unprofiledCount:0});
  assert.equal(service.state().pendingCount,2);
  await service.flush();
  assert.equal(storage.state.diagnosticsV2.length,1);
  assert.equal(storage.state.diagnosticsV2[0].occurrences,2);
  pass('diagnostics service owns batching, persistence and aggregation');

  await service.log('error','SOME_ERROR',{password:'secret',url:'https://example.invalid/path?q=secret'});
  const events=await service.read();
  const error=events.at(-1);
  assert.equal(error.details.password,'[REDACTED]');
  assert.equal(error.details.url,'https://example.invalid/path');
  pass('diagnostics service preserves immediate flush and redaction');

  blocker='busy';
  await assert.rejects(()=>service.reset(),e=>e?.code==='KR_DIAGNOSTIC_RESET_BUSY');
  blocker='';
  const reset=await service.reset();
  assert.equal(reset.diagnosticBoundaryId,'session-2');
  assert.equal(service.sessionId(),'session-2');
  const after=await service.read();
  assert.ok(after.some(e=>e.event==='DIAGNOSTIC_SESSION_RESET'));
  pass('diagnostics reset boundary and blocker semantics remain intact');
}

function fakeButton(id,{disabled=false}={}) {
  return {
    id, disabled, title:'', dataset:{}, tagName:'BUTTON', className:'primary',
    getAttribute(){return null;},
    getBoundingClientRect(){return {left:0,top:0,right:100,bottom:30,width:100,height:30};},
    closest(selector){ if(selector==='.control-action-attempt-shell') return null; return null; },
    contains(value){return value===this;}
  };
}

async function testActionsController() {
  const source=fs.readFileSync('actions-diagnostics-controller.js','utf8');
  const ctx={console,Date,Promise,Object,String,Number,Array,Math,Map,Set,setTimeout,clearTimeout,performance:{now:()=>Date.now()},module:{exports:{}}}; ctx.globalThis=ctx;
  vm.createContext(ctx); vm.runInContext(source,ctx);
  const button=fakeButton('inventoryButton');
  const logs=[];
  let epoch='e1'; let applyCount=0;
  const controller=ctx.KRActionsDiagnosticsController.create({
    document:{}, window:{getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1',pointerEvents:'auto'})},
    logEvent:async(...args)=>logs.push(args),
    sidebarActionEntries:()=>[['inventoryButton',button]],
    actionDisableModel:()=>({disabled:false,reason:'ready'}),
    snapshotContext:()=>({gateKind:'ready',gateAllowed:true,selectedProfileId:'p1',liveProfileId:'p1',pageReady:true,singleBusy:false,bulkBusy:false,insertionLock:{locked:false},mass:{status:null},archiveDialogMode:'closed',renewalDialogMode:'closed',inventoryCapture:{mode:null,state:null}}),
    accordionSnapshot:()=>null,
    readBackgroundEpoch:async()=>epoch,
    fetchResyncState:async()=>({value:1}),
    applyResyncState:async()=>{applyCount++;}
  });
  controller.markSynced('test');
  const snap=controller.recordSnapshot('runtime',{force:true});
  assert.equal(snap.actions[0].disabled,false);
  assert.ok(logs.some(x=>x[0]==='UI_ACTIONS_STATE_SNAPSHOT'));
  pass('actions controller owns snapshots and sync metadata');

  await controller.detectEpoch('first');
  epoch='e2';
  const changed=await controller.detectEpoch('second');
  assert.equal(changed.changed,true);
  controller.scheduleResync('runtime', 0);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(applyCount,1);
  assert.ok(logs.some(x=>x[0]==='UI_ACTIONS_BACKGROUND_EPOCH_CHANGED'));
  assert.ok(logs.some(x=>x[0]==='UI_ACTIONS_RESYNC_COMPLETED'));
  pass('actions controller preserves background-epoch detection and resync lifecycle');
}

(async()=>{await testDiagnostics(); await testActionsController(); console.log(`${n}/5 PASS`);})().catch(e=>{console.error(e.stack||e);process.exit(1)});
