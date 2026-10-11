const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
function load(file){const registry=new Map();const ctx={console,Date,Intl,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>{}},crypto:{randomUUID:()=> 'uuid-1'},Error,setTimeout,clearTimeout,Set,Map,Object,Array,String,Number,Boolean,Math,Promise};ctx.globalThis=ctx;ctx.KRDeps={register:(n,v)=>registry.set(n,v),optional:n=>registry.get(n),require:n=>{if(!registry.has(n))throw new Error('missing dependency '+n);return registry.get(n)}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(file,'utf8'),ctx);return registry;}
let n=0;const pass=m=>{n++;console.log('PASS '+m)};
{
 const api=load('mass-renewal-ui-controller.js').get('KRMassRenewalUiController');
 const c=api.create({normalizeRenewalMode:v=>String(v)==='fast'?'fast':'safe',accountGateModel:()=>({allowed:true,tooltip:''}),renewalProgressModel:()=>({states:{}})});
 c.updateContext({records:[{inventoryId:'2',title:'B'},{inventoryId:'1',title:'A'}],renewalConfiguration:{renewalMode:'fast'},insertionLock:{locked:false}});
 let s=c.status();assert.equal(s.currentBatch,null);assert.deepEqual(Array.from(s.selectedIds),[]);assert.deepEqual(Array.from(s.orderedIds),[]);
 c.applyBatchSnapshot({batchId:'b1',status:'running',revision:2,items:[],counts:{total:2,success:0,attention:0},renewalMode:'fast'});s=c.status();assert.equal(s.currentBatch.batchId,'b1');assert.equal(s.currentBatch.revision,2);
 pass('mass controller owns batch snapshot state through its public contract');
}
{
 const api=load('archive-trash-insertion-ui-controller.js').get('KRArchiveTrashInsertionUiController');
 const c=api.create({normalizeRenewalMode:v=>String(v)==='fast'?'fast':'safe',accountGateModel:()=>({allowed:true,tooltip:''}),InventoryImport:{parseInventoryArchive:async()=>({record:{adId:'123',title:'X'},images:[],archiveVersion:1})}});
 c.updateContext({renewalConfiguration:{renewalMode:'fast'},selectedProfileId:'p1',insertionLock:{locked:false}});
 c.setTrackedArchiveInsertionId('a1');
 let s=c.status();assert.equal(s.trackedArchiveInsertionId,'a1');assert.equal(s.archiveDialogMode,'closed');
 const model=c.archiveProgressModel({renewalMode:'fast',status:'complete',stage:'complete',newAdId:'456'});assert.equal(model.states[3],'skipped');assert.equal(model.states[4],'success');
 pass('archive-trash controller owns insertion tracking and fast-mode phase semantics');
}
{
 const api=load('archive-trash-insertion-ui-controller.js').get('KRArchiveTrashInsertionUiController');
 const c=api.create({normalizeRenewalMode:v=>String(v)==='fast'?'fast':'safe',accountGateModel:()=>({allowed:true,tooltip:''})});
 c.updateContext({selectedProfileId:'p1'});
 assert.equal(c.trashTemplateInventoryGate().allowed,false);
 c.openTrashTemplateDialog({inventoryId:'i1',adId:'10',profileId:'p1',title:'X'});
 assert.equal(c.trashTemplateInventoryGate().allowed,false);
 pass('trash template controller remains fail-closed until a published ad identity exists');
}
console.log(`${n}/3 PASS`);
