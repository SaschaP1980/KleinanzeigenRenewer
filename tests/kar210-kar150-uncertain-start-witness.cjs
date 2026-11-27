'use strict';
// Isolate the independent product no-replay requirement from later stop preference.
const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./kar210-kar150-mass-fixture.cjs');
test('uncertain restart without persisted renewal session must not re-admit the starting item',async()=>{
 const h=harness();const created=await h.workflow.startMassRenewalBatch({inventoryIds:['one','two']});
 await h.controller.mutateMassRenewalBatch(created.batchId,batch=>{batch.items[0].status='running';batch.items[0].stage='starting';batch.currentIndex=0;return {changed:true};});
 await h.workflow.resumeMassRenewalBatch();
 const after=await h.controller.readMassRenewalBatch();
 assert.equal(after.items[0].status, 'needs-review');
});
