'use strict';
// Independent B08 product witnesses; historical bootstrap executes in synthetic VM.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/app/app.js','utf8');
const start=source.indexOf('Promise.all([ensureUiActivityLoaded(), loadListViewModes(), refreshProfileState(), refreshRenewalConfiguration(), primeManagedWorkerTabCache()])');
const end=source.indexOf('schedulePageInspect(ACCOUNT_HEALTH_FALLBACK_MS);',start);
assert.ok(start>=0&&end>start,'actual historical startup slice');
async function run(failure=''){
 const calls=[],notices=[];
 const op=name=>async()=>{calls.push(name);if(name===failure)throw Error('fixture '+name+' failed');};
 const ctx={ensureUiActivityLoaded:op('activity'),loadListViewModes:op('view'),refreshProfileState:op('profile'),refreshRenewalConfiguration:op('configuration'),primeManagedWorkerTabCache:op('worker-cache'),inspectPage:op('inspection'),refreshInventories:op('inventories'),refreshBulkStatus:op('bulk'),refreshMassRenewalBatchStatus:op('mass'),setStatus:(...x)=>notices.push(x),friendlyErrorMessage:e=>e.message};
 await vm.runInNewContext(source.slice(start,end),ctx);
 return {calls,notices};
}
test('historical startup success attempts inventory, account inspection and both status reads',async()=>{
 const r=await run();for(const op of ['inventories','inspection','bulk','mass'])assert.ok(r.calls.includes(op));assert.deepEqual(r.notices,[]);
});
test('KAR-185 independent product witness: failed optional configuration must not prevent local inventory read',async()=>{
 const r=await run('configuration');assert.ok(r.calls.includes('inventories'),'optional configuration blocked local inventory read');
 assert.ok(!r.notices.some(n=>/Inventar.*nicht geladen/.test(n[1])),'optional failure mislabeled as inventory failure');
});
test('KAR-185 independent product witness: inspection failure must not be reported as inventory failure',async()=>{
 const r=await run('inspection');assert.ok(r.calls.includes('inventories'));assert.ok(!r.notices.some(n=>/Inventar.*nicht geladen/.test(n[1])),'account inspection failure mislabeled as inventory failure');
});
test('historical startup genuine inventory failure is visibly reported',async()=>{
 const r=await run('inventories');assert.ok(r.calls.includes('inventories'));assert.ok(r.notices.some(n=>/Inventar.*nicht geladen/.test(n[1])&&n[2]==='fixture inventories failed'));
});
