'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const TabRegistry=require('../src/background/services/tab-registry.js');
const t0=Date.parse('2026-11-26T20:00:00Z');
function fixture({seed={},ioDelay=0}={}){
 let state=structuredClone(seed),reads=0,writes=0,active=0,maxActive=0,clock=t0,failClock=false;
 async function io(){active++;maxActive=Math.max(maxActive,active);if(ioDelay)await new Promise(r=>setTimeout(r,ioDelay));else await Promise.resolve();active--;}
 const storageSession={async get(keys){reads++;const result=Object.fromEntries(keys.filter(k=>Object.hasOwn(state,k)).map(k=>[k,structuredClone(state[k])]));await io();return result;},async set(patch){writes++;await io();Object.assign(state,structuredClone(patch));}};
 const r=TabRegistry.create({storageSession,now:()=>{if(failClock){failClock=false;throw Error('clock fixture failure');}return clock;}});
 return {r,counts:()=>({reads,writes,maxActive}),rows:()=>structuredClone(state.tabRegistryV1||{}),tick:ms=>clock+=ms,failClock:()=>{failClock=true;}};
}
test('observe on existing managed tab uses one read and one write; preserves owner',async()=>{
 const h=fixture();await h.r.registerManagedWorker(1,'renewal-fast-presence',{ownerId:'r'});
 const before=h.counts();await h.r.observeTab({id:1,url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS',windowId:3});
 const after=h.counts();assert.equal(after.reads-before.reads,1);assert.equal(after.writes-before.writes,1);assert.equal(h.rows()['1'].owner.ownerId,'r');
});
test('late observation or registration within tombstone retention does not rewrite GONE metadata',async()=>{
 const h=fixture();await h.r.registerManagedWorker(1,'renewal-fast-presence',{ownerId:'r'});await h.r.markGone(1,'tabs.onRemoved');
 const before=h.counts(),dead=h.rows()['1'];await h.r.observeTab({id:1,discarded:true,url:'about:blank'});await h.r.registerManagedWorker(1,'renewal-fast-presence',{ownerId:'other'});
 assert.deepEqual(h.rows()['1'],dead);assert.equal(h.counts().writes,before.writes);
});
test('concurrent observation and owner release cannot restore released metadata; distinct registration survives',async()=>{
 const h=fixture();await h.r.registerManagedWorker(1,'renewal-fast-presence',{ownerId:'r'});
 await Promise.all([h.r.observeTab({id:1,url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS'}),h.r.releaseOwnership(1,{ownerId:'r'},{managed:false}),h.r.registerManagedWorker(2,'account-probe',{ownerId:'p'})]);
 const rows=h.rows();assert.deepEqual(rows['1'].owner,{});assert.equal(rows['1'].managed,false);assert.equal(rows['2'].owner.ownerId,'p');
});
test('prune and migration read paths cannot overwrite concurrent registry writes',async()=>{
 const h=fixture({seed:{tabRegistryV1:{'1':{tabId:1,lifecycleState:'gone',closedAt:new Date(t0-31000).toISOString()}},managedWorkerTabsV1:{'3':{kind:'account-probe',createdAt:new Date(t0).toISOString()}}}});
 await Promise.all([h.r.snapshot(),h.r.registerManagedWorker(2,'account-probe',{ownerId:'p'}),h.r.read()]);
 const rows=h.rows();assert.equal(rows['1'],undefined);assert.equal(rows['2'].owner.ownerId,'p');assert.equal(rows['3'].managed,true);
});
test('failed local task does not poison next operation',async()=>{
 const h=fixture();h.failClock();await assert.rejects(h.r.registerManagedWorker(1),/clock fixture failure/);await h.r.registerManagedWorker(2);assert.equal(h.rows()['2'].lifecycleState,'active');
});
test('Chrome remove wait does not hold local registry queue',async()=>{
 const h=fixture();await h.r.registerManagedWorker(1);let release,entered;
 const started=new Promise(r=>entered=r);
 const closing=h.r.closeTab(1,{remove:async()=>{entered();await new Promise(r=>release=r);}});
 await started;try{await h.r.registerManagedWorker(2);assert.equal(h.rows()['2'].lifecycleState,'active');}finally{release();await closing;}
 assert.equal(h.rows()['1'].lifecycleState,'gone');
});
test('seven concurrent registrations measure storage count, overlap and wall time under fixed synthetic I/O',async()=>{
 const h=fixture({ioDelay:2}),start=performance.now(),latencies=[];
 await Promise.all(Array.from({length:7},(_,i)=>{const at=performance.now();return h.r.registerManagedWorker(i+1,'account-probe',{ownerId:String(i+1)}).then(()=>latencies.push(performance.now()-at));}));
 const wall=performance.now()-start,c=h.counts(),retained=Object.keys(h.rows()).length;
 console.log('KAR222_REGISTRY_COST '+JSON.stringify({...c,retained,wallMs:+wall.toFixed(3),latenciesMs:latencies.map(n=>+n.toFixed(3)),fixtureDelayMs:2}));
 assert.equal(c.reads,7);assert.equal(c.writes,7);assert.equal(c.maxActive,1);assert.equal(retained,7);
});
