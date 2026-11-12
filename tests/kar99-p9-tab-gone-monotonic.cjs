// KAR-99/P9: real packaged Chromium account-probe tab close must remain GONE.
// Source-first RED: stale Chrome onUpdated and simultaneous tab registry writes
// cannot resurrect a GONE tombstone or silently drop a distinct tab ID.
'use strict';
const assert=require('node:assert/strict');
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
(async()=>{
  const store=sessionStorage(),r=registry(store);
  await r.registerManagedWorker(70001,'account-probe',{ownerId:'probe-A',operationId:'probe-A'});
  let initial=await r.get(70001);
  ok(initial.lifecycleState==='active'&&initial.managed===true,
    'real managed account-probe worker first tracked ACTIVE');
  await r.markGone(70001,'tabs.onRemoved');
  let dead=await r.get(70001);
  ok(dead.lifecycleState==='gone'&&dead.closedAt&&dead.goneReason==='tabs.onRemoved',
    'actual tabs.onRemoved records terminal GONE with durable timestamp and reason');
  await r.observeTab({id:70001,url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html',
    windowId:34,discarded:false},{role:'worker',kind:'account-probe',managed:true,owner:{ownerId:'probe-A'}});
  dead=await r.get(70001);
  ok(dead.lifecycleState==='gone'&&dead.closedAt&&dead.goneReason==='tabs.onRemoved',
    'delayed onUpdated observation cannot revive GONE with inherited goneReason');
  await r.registerManagedWorker(70001,'account-probe',{ownerId:'probe-A'});
  dead=await r.get(70001);
  ok(dead.lifecycleState==='gone'&&dead.closedAt,
    'late account-probe registration cannot resurrect a closed tab ID');
  await Promise.all([
    r.registerManagedWorker(70002,'account-probe',{ownerId:'probe-B'}),
    r.registerManagedWorker(70003,'account-probe',{ownerId:'probe-C'})
  ]);
  const records=await r.snapshot();
  ok(records.some(x=>x.tabId===70002&&x.lifecycleState==='active')
    &&records.some(x=>x.tabId===70003&&x.lifecycleState==='active'),
    'simultaneous different-tab registrations retain both registry rows');
  ok(records.find(x=>x.tabId===70001)?.lifecycleState==='gone',
    'concurrent new-tab writes cannot replace previously persisted GONE');
  const jobs=Array.from({length:7},(_,i)=>
    r.registerManagedWorker(71000+i,'account-probe',{ownerId:'batch-'+i}));
  await Promise.all(jobs);
  const after=await r.snapshot();
  ok(Array.from({length:7},(_,i)=>71000+i).every(id=>
    after.some(e=>e.tabId===id&&e.managed&&e.lifecycleState==='active')),
    'seven concurrent managed tab writes preserve the complete registry set');
  const removed=await r.markGone(70002,'tabs.onRemoved');
  const touched=await r.observeTab({id:70002,windowId:34,discarded:false});
  ok(removed.lifecycleState==='gone'&&touched.lifecycleState==='gone',
    'terminal removal and subsequent non-owning observation preserve GONE');
  console.log('PASS KAR99 P9 tab-registry monotonicity '+checks+' assertions');
})().catch(error=>{console.error(error);process.exitCode=1});
