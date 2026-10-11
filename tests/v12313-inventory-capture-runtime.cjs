const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, '..');
const Model = require(path.join(root, 'src/app/inventory-candidate-model.js'));
const View = require(path.join(root, 'src/app/inventory-capture-view.js'));
const Controller = require(path.join(root, 'src/app/inventory-capture-controller.js'));
let n=0; const p=(m,f)=>{f();n++;console.log('PASS '+m)};

p('candidate model keeps pure stable-id merge and membership behavior',()=>{
  const candidates = Model.buildSingleInventoryCandidates([
    {tab:{id:1,active:true,lastAccessed:10},preview:{adId:'111',title:'Public',viewMode:'public',thumbnailUrl:'https://img.kleinanzeigen.de/a.jpg'}},
    {tab:{id:2,active:false,lastAccessed:9},preview:{adId:'111',title:'Edit',viewMode:'edit'}}
  ]);
  assert.equal(candidates.length,1); assert.equal(candidates[0].sourceTabId,2); assert.equal(candidates[0].thumbnailUrl,'https://img.kleinanzeigen.de/a.jpg');
  const snapshot=Model.createMembershipSnapshot([{adId:'111'}],[{adId:'222'}]);
  assert.equal(Model.storageState('111',snapshot),'inventory'); assert.equal(Model.storageState('222',snapshot),'trash'); assert.equal(Model.storageState('333',snapshot),'new'); assert.equal(Model.storageState('x',snapshot),'unknown');
});

p('capture view keeps bulk presentation model semantics',()=>{
  const running=View.inventoryCaptureBulkProgressModel({status:'running',successCount:1,failedCount:0,expectedTotal:4,currentAdId:'111'});
  assert.equal(running.terminal,false); assert.equal(running.processed,1); assert.equal(running.percent,25); assert.equal(running.title,'Wird gerade erfasst');
  const done=View.inventoryCaptureBulkProgressModel({status:'complete',successCount:4,failedCount:0,expectedTotal:4});
  assert.equal(done.terminal,true); assert.equal(done.kind,'success'); assert.equal(done.percent,100);
});

p('controller composes real view and candidate model without a new runtime boundary',()=>{
  const view=View.create({document:{},elements:{},safeMode:'safe',fastMode:'fast',scopeAll:'all',scopeNewOnly:'new-only',normalizeRenewalMode:v=>v==='fast'?'fast':'safe'});
  const controller=Controller.create({
    document:{}, elements:{}, inventoryCaptureView:view, inventoryCandidateModel:Model,
    safeMode:'safe', fastMode:'fast', scopeAll:'all', scopeNewOnly:'new-only', normalizeRenewalMode:v=>v==='fast'?'fast':'safe',
    accountGateModel:()=>({allowed:true,tooltip:''}), getCurrentRenewalConfiguration:()=>({renewalMode:'safe'})
  });
  assert.equal(typeof controller.startSingle,'function'); assert.equal(typeof controller.startBulk,'function'); assert.equal(typeof controller.requestStopAfterCurrent,'function'); assert.equal(typeof controller.reopenFromShortcut,'function');
  assert.deepEqual(controller.status().candidates,[]);
  assert.equal(controller.buildCandidates([{tab:{id:7},preview:{adId:'700',viewMode:'public'}}])[0].adId,'700');
  assert.equal(controller.bulkProgressModel({status:'complete',successCount:1,expectedTotal:1}).kind,'success');
});
console.log(`${n}/${n} PASS v1.23.13 inventory capture runtime`);
