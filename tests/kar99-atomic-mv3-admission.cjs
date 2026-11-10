// KAR-99 P8 test-first: two independent worker arrivals, persistent receipts and Web Locks.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
const Fence=require('../src/background/services/update-workflow-fence.js');
const Policy=require('../lib/update-idle-policy.js');
const bg=fs.readFileSync('src/background/background.js','utf8');
let n=0,serial=0;
const ok=(a,s)=>{assert.ok(a,s);n++;console.log('PASS KAR99-P8 '+s)};
const reject=async(p,code,s)=>{await assert.rejects(p,e=>e?.code===code,s);ok(true,s)};
function disk(){const data=Object.create(null);let readFail=false,writeFail=false;
 return {data,failRead:x=>readFail=x,failWrite:x=>writeFail=x,
 async get(k){if(readFail)throw Error('disk');const keys=k===null?Object.keys(data):Array.isArray(k)?k:[k];
 return Object.fromEntries(keys.filter(x=>Object.hasOwn(data,x)).map(x=>[x,structuredClone(data[x])]));},
 async set(v){if(writeFail)throw Error('disk');Object.assign(data,structuredClone(v));}};}
function webLocks(){const owned=new Set();return {async request(name,options,fn){
 assert.equal(options.mode,'exclusive');assert.equal(options.ifAvailable,true);
 if(owned.has(name))return fn(null);
 owned.add(name);try{return await fn({name,mode:'exclusive'})}finally{owned.delete(name)}
}}}
function make(store,lock,worker='worker-one'){return Atomic.create({storageLocal:store,lockManager:lock,
 workerInstanceId:worker,clock:()=>123000,newToken:()=> 'nonce_'+(++serial)+'_unique'});}
function snapshot(){const gen='worker-one',profile='profile-one',now=123000;
 return {schema:1,workerGeneration:gen,profileId:profile,observedAtMs:now,
 owners:Object.fromEntries(Policy.requiredOwners.map(name=>[name,{confirmed:true,state:'idle',
 workerGeneration:gen,profileId:profile,observedAtMs:now}]))};}
(async()=>{
 const store=disk(),locks=webLocks(),a=make(store,locks),b=make(store,locks,'worker-two');
 await reject(make(disk(),null).withAdmission('START_ARCHIVE',()=>true),
   'KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE','missing real Web Locks fails closed before callback');
 let release,entered=false;const pending=new Promise(resolve=>release=resolve);
 const one=a.withAdmission('START_RENEWAL',async()=>{entered=true;await pending;return 42;});
 for(let i=0;i<100&&!entered;i++)await Promise.resolve();
 ok(entered,'start only executes after durable admission');
 ok(Object.keys(store.data).filter(x=>x.startsWith(Atomic.START_PREFIX)).length===1,
    'first worker wrote persistent start intent');
 await reject(b.guardReserve(async()=>true),'KR_UPDATE_FENCE_BUSY','other worker reserve blocked during active start');
 ok(await b.withAdmission('START_ARCHIVE',async()=>17)===17,'second worker start can complete without journal overwrite');
 release();ok(await one===42,'first start returns original result');
 ok(Object.keys(store.data).filter(x=>x.startsWith(Atomic.START_PREFIX)).length===2
   &&Object.keys(store.data).filter(x=>x.startsWith(Atomic.FINISH_PREFIX)).length===2,
   'two atomic unique starts have two verified completion records');
 ok(await b.guardReserve(async()=>99)===99,'resolved starts allow atomic callback only');
 let done;const barrier=new Promise(resolve=>done=resolve);
 const reservation=a.guardReserve(async()=>{await barrier;return 'exclusive'});
 await reject(b.guardReserve(async()=>true),'KR_UPDATE_FENCE_ATOMIC_BUSY',
   'simultaneous cross-worker reserve/reserve has one winner');
 done();ok(await reservation==='exclusive','first critical section releases normally');
 const unresolved=disk(),old=make(unresolved,locks,'old-worker');let started=false;
 void old.withAdmission('START_REMOTE',()=>{started=true;return new Promise(()=>{})});
 for(let i=0;i<100&&!started;i++)await Promise.resolve();
 ok(started,'worker crash leaves started record without completed receipt');
 await reject(make(unresolved,locks,'new-worker').guardReserve(()=>true),'KR_UPDATE_FENCE_BUSY',
   'restart cannot infer previous remote work finished');
 const corrupt=disk();corrupt.data[Atomic.START_PREFIX+'broken']={junk:true};
 await reject(make(corrupt,locks).guardReserve(()=>true),'KR_UPDATE_FENCE_ATOMIC_STORAGE',
   'corrupt journal never becomes idle');
 const unreadable=disk();unreadable.failRead(true);
 await reject(make(unreadable,locks).guardReserve(()=>true),'KR_UPDATE_FENCE_ATOMIC_STORAGE',
   'storage read failure blocks reserve');
 const unwritable=disk();unwritable.failWrite(true);let action=false;
 await reject(make(unwritable,locks).withAdmission('START',()=>{action=true}),
   'KR_UPDATE_FENCE_ATOMIC_STORAGE','storage write fails before operation');
 ok(!action,'failed durability cannot trigger operation');
 const gateOne=Fence.create({storageLocal:store,clock:()=>123000,
   newToken:()=> 'fence_'+(++serial)+'_unique',atomicCoordinator:a,
   policy:Policy,getOwnerSnapshot:async()=>snapshot()});
 const gateTwo=Fence.create({storageLocal:store,clock:()=>123000,
   newToken:()=> 'fence_'+(++serial)+'_unique',atomicCoordinator:b,
   policy:Policy,getOwnerSnapshot:async()=>snapshot()});
 const request={profileId:'profile-one',workerGeneration:'worker-one',transactionId:'tx-one'};
 // P8 RED: a forged/stale all-IDLE observation from worker-one must not
 // authorize worker-two to reserve under an unrelated worker generation.
 const staleStore=disk(),staleWorker=make(staleStore,locks,'worker-two');
 const staleGate=Fence.create({storageLocal:staleStore,clock:()=>123000,
   newToken:()=> 'fake_stale_generation_987654321',
   atomicCoordinator:staleWorker,policy:Policy,getOwnerSnapshot:async()=>snapshot()});
 await reject(staleGate.reserve(request),'KR_UPDATE_FENCE_ATOMIC_GENERATION',
   'a different MV3 worker cannot reserve using a stale all-idle generation');
 ok(Object.keys(staleStore.data).length===0,
   'stale worker denial leaves no durable reserved transaction');
 const approved=await gateOne.reserve(request);
 ok(approved.state==='reserved','positive test-only fake owner snapshot serialized');
 await reject(gateTwo.withAdmission('START_ARCHIVE',()=>true),'KR_UPDATE_FENCE_HELD',
   'second worker cannot start during reserved update');
 await reject(gateTwo.reserve({...request,workerGeneration:'worker-two'}),'KR_UPDATE_FENCE_HELD',
   'second worker cannot double-reserve');
 ok(bg.includes('atomicCoordinator:')&&bg.includes('navigator?.locks'),
   'real worker passes navigator.locks rather than storage-only pseudo-CAS');
 ok(!bg.includes('getOwnerSnapshot: () => requireAdditionalOwnerObserver()'),
   'UNKNOWN P7 evidence never converted into positive IDLE');
 console.log('PASS KAR99-P8 '+n+' checked');
})().catch(error=>{console.error(error);process.exitCode=1});
