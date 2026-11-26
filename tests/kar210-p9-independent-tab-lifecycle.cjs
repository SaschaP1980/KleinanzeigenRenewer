// KAR-99/P9: real packaged Chromium account-probe tab close must remain GONE.
// Source-first RED: stale Chrome onUpdated and simultaneous tab registry writes
// cannot resurrect a GONE tombstone or silently drop a distinct tab ID.
'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const TabRegistry=require('../src/background/services/tab-registry.js');
let checks=0;
function ok(value,label){assert.ok(value,label);checks++;console.log('PASS KAR99-P9-TAB '+label);}
function sessionStorage(){
  const state=Object.create(null);
  return {
    state,
    async get(keys){
      const items=keys===null?Object.keys(state):Array.isArray(keys)?keys:[keys];
      return Object.fromEntries(items.filter(k=>Object.hasOwn(state,k))
        .map(k=>[k,structuredClone(state[k])]));
    },
    async set(patch){
      await Promise.resolve();
      Object.assign(state,structuredClone(patch));
    }
  };
}
function registry(store){
  return TabRegistry.create({storageSession:store,now:()=>Date.parse('2026-11-10T06:13:00.000Z')});
}

test('independent original P9 delayed onUpdated cannot revive GONE',async()=>{
 const store=sessionStorage(),r=registry(store);
 await r.registerManagedWorker(70001,'account-probe',{ownerId:'probe-A',operationId:'probe-A'});
 await r.markGone(70001,'tabs.onRemoved');
 await r.observeTab({id:70001,url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html',windowId:34,discarded:false},{role:'worker',kind:'account-probe',managed:true,owner:{ownerId:'probe-A'}});
 const dead=await r.get(70001);
 ok(dead.lifecycleState==='gone'&&dead.closedAt&&dead.goneReason==='tabs.onRemoved','delayed onUpdated observation cannot revive GONE with inherited goneReason');
});
test('independent original P9 late registration cannot resurrect GONE',async()=>{
 const store=sessionStorage(),r=registry(store);
 await r.registerManagedWorker(70001,'account-probe',{ownerId:'probe-A'});await r.markGone(70001,'tabs.onRemoved');
 await r.registerManagedWorker(70001,'account-probe',{ownerId:'probe-A'});const dead=await r.get(70001);
 ok(dead.lifecycleState==='gone'&&dead.closedAt,'late account-probe registration cannot resurrect a closed tab ID');
});
test('independent original P9 concurrent distinct managed tabs retain both registry rows',async()=>{
 const store=sessionStorage(),r=registry(store);
 await Promise.all([r.registerManagedWorker(70002,'account-probe',{ownerId:'probe-B'}),r.registerManagedWorker(70003,'account-probe',{ownerId:'probe-C'})]);
 const records=await r.snapshot();
 ok(records.some(x=>x.tabId===70002&&x.lifecycleState==='active')&&records.some(x=>x.tabId===70003&&x.lifecycleState==='active'),'simultaneous different-tab registrations retain both registry rows');
});
test('independent original P9 seven concurrent registrations retain complete registry',async()=>{
 const store=sessionStorage(),r=registry(store);
 const jobs=Array.from({length:7},(_,i)=>r.registerManagedWorker(71000+i,'account-probe',{ownerId:'batch-'+i}));await Promise.all(jobs);
 const after=await r.snapshot();
 ok(Array.from({length:7},(_,i)=>71000+i).every(id=>after.some(e=>e.tabId===id&&e.managed&&e.lifecycleState==='active')),'seven concurrent managed tab writes preserve the complete registry set');
});
