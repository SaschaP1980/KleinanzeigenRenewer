'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./kar210-kar150-mass-fixture.cjs');
test('historical ordinary failure advances in order, paid checkout always stops before another item',async()=>{
 const h=harness({failures:['one']});const created=await h.workflow.startMassRenewalBatch({inventoryIds:['one','two','two','three']});
 assert.deepEqual(created.items.map(x=>x.inventoryId),['one','two','three']);
 await h.workflow.startNextMassRenewalItem(created.batchId);
 let batch=await h.controller.readMassRenewalBatch();assert.equal(batch.status,'running');assert.deepEqual(batch.items.map(x=>x.status),['error','queued','queued']);
 await h.workflow.startNextMassRenewalItem(created.batchId);
 await h.workflow.reconcileMassRenewalBatchSession({massBatchId:created.batchId,massBatchItemIndex:1,renewalId:'renewal-two',stage:'paid-insertion-required',status:'verification-failed',lastError:'Payment required'});
 await h.workflow.startNextMassRenewalItem(created.batchId);
 batch=await h.controller.readMassRenewalBatch();assert.equal(batch.status,'stopped-with-attention');assert.equal(batch.stopAfterCurrentRequested,true);
 assert.deepEqual(batch.items.map(x=>x.status),['error','needs-review','cancelled']);assert.equal(h.starts,2);
 await h.workflow.startNextMassRenewalItem(created.batchId);assert.equal(h.starts,2);
});
test('explicit historical stop after current survives terminalization and does not restart queue',async()=>{
 const h=harness();const created=await h.workflow.startMassRenewalBatch({inventoryIds:['one','two','three']});
 await h.workflow.startNextMassRenewalItem(created.batchId);await h.workflow.requestMassRenewalStopAfterCurrent({batchId:created.batchId});
 await h.workflow.markMassRenewalItemSucceeded({massBatchId:created.batchId,massBatchItemIndex:0,renewalId:'renewal-one',newAdId:'200'},{inventoryId:'saved-one'});
 await h.workflow.startNextMassRenewalItem(created.batchId);const after=await h.controller.readMassRenewalBatch();
 assert.deepEqual(after.items.map(x=>x.status),['success','cancelled','cancelled']);assert.equal(after.status,'stopped');assert.equal(h.starts,1);
 await h.workflow.startNextMassRenewalItem(created.batchId);assert.equal(h.starts,1);
});
