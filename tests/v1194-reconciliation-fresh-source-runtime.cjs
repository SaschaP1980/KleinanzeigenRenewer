const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = process.env.KR_ROOT ? path.resolve(process.env.KR_ROOT) : path.resolve(__dirname, '..');
const BulkReconciliationService = require(path.join(root, 'src/background/services/bulk-reconciliation-service.js'));
const R = require(path.join(root, 'inventory-reconciliation.js'));

async function scenario(statuses) {
  let nextTab = 200;
  const created = [];
  const updates = [];
  const closes = [];
  const starts = [];
  const writes = [];
  const scheduled = [];
  const diagnostics = [];
  const broadcasts = [];
  const order = [];
  const state = {
    runId:'run-1', bulkRunId:'run-1', operationId:'op-1', sourceTabId:100, sourceAutoCreated:true,
    status:'running', stage:'reconciliation-preparing', expectedTotal:64, remoteRosterIds:Array.from({length:64},(_,i)=>String(1000+i)),
    profileName:'Alice', profileId:'p1', processedIds:Array.from({length:64},(_,i)=>String(1000+i)), successCount:64, failedCount:0, issues:[]
  };
  const service = BulkReconciliationService.create({
    getBulkRunState: async()=>state,
    normalizeProfileName: value=>String(value||'').trim(),
    writeBulkRunState: async s => { writes.push(JSON.parse(JSON.stringify(s))); return s; },
    logDiagnostic: async (level,event,details)=>{ diagnostics.push({level,event,details}); },
    sessionCorrelationContext: ()=>({}),
    releaseBulkSourceOwnership: async()=>({released:true}),
    readRenewalSessions: async()=>({}),
    readFillSessions: async()=>({}),
    readMassRenewalBatch: async()=>null,
    isTrashRecord: ()=>false,
    readInventoryRecordsForProfile: async()=>[],
    openDatabase: async()=>({close(){}}),
    trashRecordFrom: record=>record,
    broadcastInventoryChanged:(reason,details)=>broadcasts.push({reason,details}),
    normalBrowserWindowId: async()=>9,
    bulkRunOwnerExpectation: ()=>({ownerType:'bulk',ownerId:'run-1'}),
    assertPlatformAccessAllowed: async()=>null,
    createAutomationTab: async opts => { const id=++nextTab; created.push({id,opts}); return {id,windowId:9,url:opts.url}; },
    registerShadowTab: async()=>null,
    updateAutomationTab: async (id, props)=>{ updates.push({id,props}); return {id,url:props.url}; },
    waitForTabComplete: async()=>({}),
    ensureContentConnection: async()=>true,
    sendTabRequestWithBootstrap: async (id,msg)=>{
      if (msg.type === 'WAIT_FOR_MY_ADS_READY') { const value=statuses.shift(); if (value instanceof Error) throw value; return value; }
      if (msg.type === 'START_BULK_RECONCILIATION_SCAN') { order.push('start'); starts.push({id,msg}); return {started:true}; }
      throw new Error('unexpected message '+msg.type);
    },
    closeRegistryTab: async (id,reason)=>{ closes.push({id,reason}); return {closed:true}; },
    scheduleBulkSourceTabClose:(id,reason)=>{ order.push('schedule-close'); scheduled.push({id,reason,ms:250}); return scheduled.length; },
    inventoryReconciliationApi:R,
    freshReconciliationSourceMaxAttempts:2,
    tabLoadTimeoutDefaultMs:30000,
    platformAccessRestrictionErrorCode:'KR_PLATFORM_ACCESS_RESTRICTED',
    myAdsProjectsUrl:'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS',
    tabRoles:{BULK_SOURCE:'bulk-source'}
  });
  const result = await service.prepareFreshBulkReconciliationSource(state,{tab:{id:100,windowId:9}});
  return {result,state,created,updates,closes,starts,writes,scheduled,diagnostics,broadcasts,order};
}

(async()=>{
  let pass=0; const ok=n=>{pass++;console.log('PASS '+n);};
  const recovered = await scenario([
    new Error('MyAds-Readiness Timeout'),
    {isMyAdsPage:true,isProjectsTab:true,currentPage:1,expectedOnline:64,profileName:'Alice',listingCount:25,hasNext:true,observedAt:'2026-09-21T00:00:00.000Z',readinessWaitMs:420}
  ]);
  assert.equal(recovered.created.length,2);
  assert.ok(recovered.created.every(x=>x.opts.url==='about:blank'));
  assert.equal(recovered.closes.some(x=>x.id===201),true);
  assert.equal(recovered.result.sourceTabId,202);
  assert.equal(recovered.result.stage,'reconciliation-ready');
  assert.equal(recovered.starts.length,1);
  assert.equal(recovered.starts[0].id,202);
  assert.equal(recovered.starts[0].msg.readySnapshot.expectedOnline,64);
  assert.equal(recovered.scheduled.length,1);
  assert.equal(recovered.scheduled[0].id,100);
  assert.ok(recovered.order.indexOf('start') >= 0 && recovered.order.indexOf('schedule-close') > recovered.order.indexOf('start'), 'previous source close must only be scheduled after the new source accepted the scan start');
  ok('transient readiness timeout is discarded and one fresh page-1 recovery source is used');

  const failed = await scenario([
    new Error('MyAds-Readiness Timeout 1'),
    new Error('MyAds-Readiness Timeout 2')
  ]);
  assert.equal(failed.created.length,2);
  assert.equal(failed.result.status,'needs-review');
  assert.equal(failed.result.stage,'reconciliation-interrupted');
  assert.equal(failed.result.reconciliationSummary.movedToTrash,0);
  assert.equal(failed.starts.length,0);
  assert.ok(failed.diagnostics.some(x=>x.event==='BULK_RECONCILIATION_SOURCE_PREPARE_FAILED'));
  ok('two transient readiness failures end safely without reconciliation mutation');

  const invalid = new Error('Falsche Meine-Anzeigen-Seite'); invalid.code='KR_MY_ADS_INVALID';
  const invalidResult = await scenario([invalid]);
  assert.equal(invalidResult.created.length,1);
  assert.equal(invalidResult.result.status,'needs-review');
  assert.equal(invalidResult.result.reconciliationSummary.movedToTrash,0);
  assert.equal(invalidResult.starts.length,0);
  ok('semantic invalid state fails immediately without burning a second fresh source');
  console.log(`v1.19.4 fresh source lifecycle runtime: ${pass}/3 PASS`);
})().catch(error=>{console.error(error.stack||error);process.exit(1);});
