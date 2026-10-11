const assert=require('assert'),fs=require('fs'),vm=require('vm');let API=null;
const ctx=vm.createContext({console,Date,Promise,Set,Map,Object,Array,String,Number,Boolean,RegExp,Error,KRDeps:{register(n,a){if(n==='KRInsertionLockService')API=a;}}});
vm.runInContext(fs.readFileSync('insertion-lock-service.js','utf8'),ctx,{filename:'insertion-lock-service.js'});
assert.ok(API?.create);let renewals={},archives={},fills={},mass=null,logs=[];
const deps={readRenewalSessions:async()=>renewals,readArchiveInsertionSessions:async()=>archives,readFillSessions:async()=>fills,readMassRenewalBatch:async()=>mass,
renewalHoldsInsertionLock:s=>s?.status==='draft',templateFillHoldsInsertionLock:s=>s?.templateOnly&&s?.status==='running',getInventory:async id=>({inventoryId:id,title:'Titel',adId:'42'}),logDiagnostic:async(...a)=>logs.push(a)};
const svc=API.create(deps);
(async()=>{
 let n=0;const pass=x=>{n++;console.log('PASS '+x)};
 let state=await svc.getInsertionLockState();assert.equal(state.locked,false);pass('empty state unlocked');
 renewals={r:{renewalId:'r',sourceInventoryId:'inv',sourceAdId:'1',status:'draft',stage:'x',createdAt:'2026-01-01T00:00:00Z'}};
 state=await svc.getInsertionLockState();assert.equal(state.kind,'renewal');assert.equal(state.ownerId,'r');pass('renewal owns lock');
 renewals={};fills={f:{fillId:'f',inventoryId:'inv',templateOnly:true,status:'running',stage:'tab-opened',createdAt:'2026-01-02T00:00:00Z'}};
 state=await svc.getInsertionLockState();assert.equal(state.kind,'trash-template');pass('template owns lock');
 let threw=false;try{await svc.assertInsertionStartAvailable({kind:'renewal'});}catch(e){threw=/anderer Inserierungs/.test(e.message)}assert.ok(threw);assert.ok(logs.length);pass('conflicting start blocked and diagnosed');
 fills={};const order=[];let release;const p1=svc.withInsertionStartGate(async()=>{order.push('a1');await new Promise(r=>release=r);order.push('a2');});const p2=svc.withInsertionStartGate(async()=>{order.push('b');});await new Promise(r=>setImmediate(r));assert.deepEqual(order,['a1']);release();await Promise.all([p1,p2]);assert.deepEqual(order,['a1','a2','b']);pass('start gate serializes callers');
 console.log(`${n}/5 PASS v1.23.4 insertion lock runtime`);
})().catch(e=>{console.error(e);process.exitCode=1});
