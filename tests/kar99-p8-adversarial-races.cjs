// KAR-99 P8: adversarial two-worker Web Locks / durable journal boundaries.
// No Chrome account, NativeHost apply, live network or transaction activation.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
const Fence=require('../src/background/services/update-workflow-fence.js');
const Policy=require('../lib/update-idle-policy.js');
const Persisted=require('../src/background/services/persisted-owner-observer.js');
const Additional=require('../src/background/services/additional-owner-observer.js');
let n=0,serial=0;
function pass(ok,label){assert.ok(ok,label);n++;console.log('PASS KAR99-P8-RACE '+label);}
async function deny(p,code,label){
 await assert.rejects(p,e=>e?.code===code,label);pass(true,label);
}
function disk(){
 const data=Object.create(null),control={beforeSet:null,afterWriteOnce:false,failWrite:false,failRead:false,badAck:false,failFinish:false};
 return {data,control,
   async get(keys){
     if(control.failRead)throw Error('storage inaccessible');
     const names=keys===null?Object.keys(data):Array.isArray(keys)?keys:[keys];
     if(control.badAck&&Array.isArray(keys)&&keys.length===1&&keys[0].startsWith(Atomic.START_PREFIX))
       return {};
     return Object.fromEntries(names.filter(k=>Object.hasOwn(data,k)).map(k=>[k,structuredClone(data[k])]));
   },
   async set(patch){
     const key=Object.keys(patch)[0];
     if(control.failWrite||(control.failFinish&&key.startsWith(Atomic.FINISH_PREFIX)))throw Error('storage write denied');
     if(control.beforeSet)await control.beforeSet(key);
     Object.assign(data,structuredClone(patch));
     if(control.afterWriteOnce){control.afterWriteOnce=false;throw Error('write succeeded but ACK was lost');}
   }
 };
}
function locks(){
 const held=new Set();
 return {async request(name,options,callback){
   assert.deepEqual(options,{mode:'exclusive',ifAvailable:true});
   if(held.has(name))return callback(null);
   held.add(name);
   try{return await callback({name,mode:'exclusive'});}
   finally{held.delete(name);}
 }};
}
function make(store,lockManager,worker='worker-current'){
 return Atomic.create({storageLocal:store,lockManager,workerInstanceId:worker,
   newToken:()=> 'unique_nonce_'+(++serial)+'_long',clock:()=>100000});
}
async function until(predicate){
 for(let i=0;i<300&&!predicate();i++)await Promise.resolve();
 assert.ok(predicate(),'test barrier was not entered');
}
function allIdle(worker='worker-current',profile='profile-A'){
 return {schema:1,workerGeneration:worker,profileId:profile,observedAtMs:100000,
  owners:Object.fromEntries(Policy.requiredOwners.map(name=>[name,{
    confirmed:true,state:'idle',workerGeneration:worker,profileId:profile,observedAtMs:100000
  }]))};
}
(async()=>{
 // Both cases are required to be actual RED on the original implementation:
 // a nonconforming Web Locks provider must never bypass the callback, nor
 // claim an unrelated lock name while the remote mutation runs.
 let remote=0;
 const neverCalls={async request(){return undefined;}};
 await deny(make(disk(),neverCalls).withAdmission('REMOTE',()=>{remote++;return true;}),
   'KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE',
   'lock provider that never invokes callback fails closed before remote work');
 pass(remote===0,'no remote callback executes without actual exclusive lock callback');
 const wrong={async request(name,options,callback){
   return callback({name:'foreign-lock',mode:'exclusive'});
 }};
 const badDisk=disk();
 await deny(make(badDisk,wrong).withAdmission('REMOTE',()=>{remote++;return true;}),
   'KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE',
   'lock provider returning the wrong lock identity cannot start workflow');
 pass(remote===0&&Object.keys(badDisk.data).length===0,
   'invalid lock leaves neither remote action nor forged durable admission');
 let fired=0;
 const missing=make(disk(),null);
 await deny(missing.withAdmission('REMOTE',()=>{fired++;}),
   'KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE','missing browser Web Locks rejects operation');
 pass(fired===0,'missing Web Locks never invokes callback');
 const aborted=disk();
 const abortLocks={async request(){throw Object.assign(Error('request aborted'),{name:'AbortError'});}};
 await deny(make(aborted,abortLocks).withAdmission('REMOTE',()=>{fired++;}),
   'KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE','aborted native Web Lock request fails closed');
 pass(fired===0&&Object.keys(aborted.data).length===0,
   'aborted request does not create an unverified remote action');
 pass(await make(aborted,locks()).withAdmission('RETRY_AFTER_ABORT',()=>17)===17,
   'new atomic lock attempt can retry after aborted unadmitted start');
 const shared=disk(),actualLocks=locks();
 let allowSet,insideWrite=false;
 const barrier=new Promise(resolve=>allowSet=resolve);
 shared.control.beforeSet=async key=>{
   if(!insideWrite&&key.startsWith(Atomic.START_PREFIX)){
     insideWrite=true;await barrier;
   }
 };
 const w1=make(shared,actualLocks,'worker-one'),w2=make(shared,actualLocks,'worker-two');
 let firstStarted=false,secondStarted=false;
 const first=w1.withAdmission('START_ONE',()=>{firstStarted=true;return 'one'});
 await until(()=>insideWrite);
 await deny(w2.withAdmission('START_TWO',()=>{secondStarted=true;return 'two'}),
   'KR_UPDATE_FENCE_ATOMIC_BUSY',
   'simultaneous two-worker starts serialize behind a single browser Web Lock');
 pass(!firstStarted&&!secondStarted,'no workflow starts before durable write and independent readback');
 allowSet();
 pass(await first==='one'&&firstStarted,'winning first start begins only after durable receipt');
 pass(await w2.withAdmission('START_TWO',()=>{secondStarted=true;return 'two'})==='two'&&secondStarted,
   'losing worker can safely retry after lock becomes available');
 pass(Object.keys(shared.data).filter(k=>k.startsWith(Atomic.START_PREFIX)).length===2
   &&Object.keys(shared.data).filter(k=>k.startsWith(Atomic.FINISH_PREFIX)).length===2,
   'two independent workers have distinct fully verified start/finish receipts');
 let unlockReserve,insideReserve=false,otherReserve=false;
 const reservedBarrier=new Promise(resolve=>unlockReserve=resolve);
 const reservation=w1.guardReserve(async()=>{insideReserve=true;await reservedBarrier;return 'winner'});
 await until(()=>insideReserve);
 await deny(w2.guardReserve(()=>{otherReserve=true;}),'KR_UPDATE_FENCE_ATOMIC_BUSY',
   'reserve/reserve arbitration admits exactly one worker to exclusive check');
 await deny(w2.withAdmission('START_DURING_RESERVE',()=>{secondStarted=true;}),
   'KR_UPDATE_FENCE_ATOMIC_BUSY',
   'start/reserve arbitration prevents new start during exclusive reserve');
 pass(!otherReserve,'losing reservation never enters mutation or lease callback');
 unlockReserve();pass(await reservation==='winner','exclusive reservation callback releases Web Lock');
 let finishRemote,ongoing=false;
 const unfinished=w1.withAdmission('REMOTE_PENDING',async()=>{
   ongoing=true;await new Promise(resolve=>finishRemote=resolve);
 });
 await until(()=>ongoing);
 let reserveRan=false;
 await deny(w2.guardReserve(()=>{reserveRan=true;}),
   'KR_UPDATE_FENCE_BUSY','outstanding cross-worker start receipt blocks reserve even after lock release');
 pass(!reserveRan,'no lease granted during previously admitted remote mutation');
 finishRemote();await unfinished;
 pass(await w2.guardReserve(()=> 'after-completion')==='after-completion',
   'completed immutable receipt permits separately gated read-only critical check');
 const badAfter=disk();badAfter.control.afterWriteOnce=true;let remoteAfter=0;
 await deny(make(badAfter,locks()).withAdmission('MUTATE',()=>{remoteAfter++;}),
   'KR_UPDATE_FENCE_ATOMIC_STORAGE',
   'crash/ACK-loss after journal set but before readback prevents remote mutation');
 pass(remoteAfter===0,'uncertain first receipt cannot begin side effect');
 await deny(make(badAfter,locks(),'worker-restarted').guardReserve(()=>true),
   'KR_UPDATE_FENCE_BUSY','restarted worker cannot reserve over durable uncertain start after ACK loss');
 const badRead=disk();badRead.control.badAck=true;let ranRead=false;
 await deny(make(badRead,locks()).withAdmission('MUTATE',()=>{ranRead=true;}),
   'KR_UPDATE_FENCE_ATOMIC_STORAGE','invalid journal readback prevents real callback');
 pass(!ranRead,'readback mismatch never begins unsafe remote action');
 await deny(make(badRead,locks(),'fresh-worker').guardReserve(()=>true),
   'KR_UPDATE_FENCE_BUSY','durable unreadable start survives and blocks later reserve');
 const badFinish=disk();badFinish.control.failFinish=true;let remoteFinish=0;
 await deny(make(badFinish,locks()).withAdmission('MUTATE',()=>{remoteFinish++;return true;}),
   'KR_UPDATE_FENCE_ATOMIC_STORAGE','finish receipt write failure is not treated as completed activity');
 pass(remoteFinish===1,'failing finish was attempted only after actual callback settlement');
 await deny(make(badFinish,locks(),'restarted-worker').guardReserve(()=>true),
   'KR_UPDATE_FENCE_BUSY','unresolved finished callback stays unsafe for update reserve');
 const broken=disk();broken.data[Atomic.START_PREFIX+'corrupt']={malformed:true};
 await deny(make(broken,locks()).guardReserve(()=>true),
   'KR_UPDATE_FENCE_ATOMIC_STORAGE','corrupted starts never become missing/idle');
 const lost=disk();lost.control.failRead=true;
 await deny(make(lost,locks()).guardReserve(()=>true),
   'KR_UPDATE_FENCE_ATOMIC_STORAGE','storage enumeration failure denies update reserve');
 // KAR-171 W3C RED: a restarted MV3 worker cannot trust a future-dated
 // durable start+finish pair, even though both rows are structurally valid.
 // The P8 origin Web Lock must reject the receipts BEFORE any reserve callback
 // or subsequent external mutation is entered.
 for (const [label,startedAtMs,completedAtMs] of [
   ['future prior-worker start and finish',100100,100200],
   ['future prior-worker finish with old start',99900,100200]
 ]) {
   const future=disk(),token='future_prior_worker_'+(++serial);
   future.data[Atomic.START_PREFIX+token]={
     schema:1,state:'admitted',token,
     operationType:'AUTONOMOUS:renewal-detached-verify',
     workerInstanceId:'worker-before-restart',startedAtMs
   };
   future.data[Atomic.FINISH_PREFIX+token]={
     schema:1,state:'completed',token,
     workerInstanceId:'worker-before-restart',completedAtMs
   };
   let entered=false,remoteMutation=0;
   const afterRestart=make(future,locks(),'worker-after-restart');
   await deny(afterRestart.guardReserve(()=>{entered=true;return true;}),
     'KR_UPDATE_FENCE_ATOMIC_STORAGE',
     label+' cannot be treated as completed prior-worker work');
   pass(!entered,'future prior-worker receipt never enters reserve callback');
   await deny(afterRestart.withAdmission('REMOTE',()=>{remoteMutation++;}),
     'KR_UPDATE_FENCE_ATOMIC_STORAGE',
     label+' prevents any later remote callback from starting');
   pass(remoteMutation===0 && Object.keys(future.data).length===2,
     'future receipt remains unresolved without new mutation or journal writes');
 }
 const noWrite=disk();noWrite.control.failWrite=true;let noWriteRemote=0;
 await deny(make(noWrite,locks()).withAdmission('REMOTE',()=>{noWriteRemote++;}),
   'KR_UPDATE_FENCE_ATOMIC_STORAGE','journal write failure denies remote start before callback');
 pass(noWriteRemote===0,'remote side effect cannot run after journal failure');
 const testOnly=disk(),testWorker=make(testOnly,locks(),'worker-current');
 const gate=Fence.create({storageLocal:testOnly,clock:()=>100000,
   newToken:()=> 'fence_nonce_'+(++serial)+'_unique',
   atomicCoordinator:testWorker,policy:Policy,getOwnerSnapshot:async()=>allIdle()});
 await deny(gate.reserve({profileId:'wrong-profile',workerGeneration:'worker-current',transactionId:'tx'}),
   'KR_UPDATE_FENCE_NOT_IDLE','conflicting actual profile and snapshot cannot reserve');
 pass(Object.keys(testOnly.data).length===0,'profile mismatch did not write lease');
 const unknownSnapshot=allIdle();
 unknownSnapshot.owners.nativeUpdateTransaction.state='unknown';
 const unknownGate=Fence.create({storageLocal:testOnly,clock:()=>100000,
   newToken:()=> 'fence_nonce_'+(++serial)+'_unique',
   atomicCoordinator:testWorker,policy:Policy,getOwnerSnapshot:async()=>unknownSnapshot});
 await deny(unknownGate.reserve({profileId:'profile-A',workerGeneration:'worker-current',transactionId:'tx'}),
   'KR_UPDATE_FENCE_NOT_IDLE','one unknown of fifteen owners blocks positive update permission');
 pass(!Object.hasOwn(testOnly.data,Fence.STORAGE_KEY),'unknown owner never creates lease');
 // KAR-171 W3D3A RED: the SAME trusted origin Web Lock must span the
 // entire actual 7+8 read-only owner capture, not just a preflight check.
 // These are isolated storage/Chrome fixtures; no live account or NativeHost.
 const lockedDisk=disk(),sharedOriginLocks=locks();
 lockedDisk.data.activeDetectedProfileV1={profileId:'profile-A'};
 lockedDisk.data.selectedInventoryProfileV1={profileId:'profile-A'};
 const readOnlySession={async get(){return {};}};
 const originCoordinator=make(lockedDisk,sharedOriginLocks,'worker-current');
 const originPersisted=Persisted.create({
   storageLocal:lockedDisk,storageSession:readOnlySession,
   workerInstanceId:'worker-current',clock:()=>100000
 });
 const originAdditional=Additional.create({
   storageLocal:lockedDisk,storageSession:readOnlySession,
   workerInstanceId:'worker-current',clock:()=>100000,
   getAtomicAdmissionCoordinator:()=>originCoordinator
 });
 let startedCapture=false,releaseCapture;
 const paused=new Promise(resolve=>releaseCapture=resolve);
 const waitingPersisted={
   ...originPersisted,
   async observe(){
     if(!startedCapture){startedCapture=true;await paused;}
     return originPersisted.observe();
   }
 };
 const protectedCapture=originAdditional.inspectAllOwnerClosureReadOnly(
   waitingPersisted,{requireAtomicAdmission:true}
 );
 await until(()=>startedCapture);
 let rivalStarted=0;
 await deny(make(lockedDisk,sharedOriginLocks,'rival-mv3-worker').withAdmission(
   'CONCURRENT_REMOTE_START',()=>{rivalStarted++;}),
   'KR_UPDATE_FENCE_ATOMIC_BUSY',
   'origin Web Lock excludes second MV3 remote start during all-15 source capture');
 pass(rivalStarted===0,'read-only 15-owner capture does not race new remote callback');
 releaseCapture();
 const protectedMatrix=await protectedCapture;
 pass(protectedMatrix.ownerCount===15&&protectedMatrix.eligibleForLease===false
   &&protectedMatrix.priorGenerationClosed===false
   &&protectedMatrix.nativeHostOutcomeVerified===false,
   'Web Lock-protected historical matrix cannot authorize idle or native update');
 pass(Object.keys(lockedDisk.data).filter(key=>
   key.startsWith(Atomic.START_PREFIX)||key.startsWith(Atomic.FINISH_PREFIX)).length===0,
   'read-only origin-locked 15-owner inspection writes no admission journal rows');
 pass(await make(lockedDisk,sharedOriginLocks,'rival-mv3-worker').withAdmission(
   'AFTER_OBSERVATION',()=>true)===true,
   'Web Lock is released when all 15 independent source reads finish');
 const noCoordinator=Additional.create({
   storageLocal:lockedDisk,storageSession:readOnlySession,
   workerInstanceId:'worker-current',clock:()=>100000
 });
 await deny(noCoordinator.inspectAllOwnerClosureReadOnly(originPersisted,
   {requireAtomicAdmission:true}), 'KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE',
   'missing real coordinator cannot turn an unlocked matrix into protected evidence');
 const mismatchedCoordinator=Additional.create({
   storageLocal:lockedDisk,storageSession:readOnlySession,
   workerInstanceId:'different-generation',clock:()=>100000,
   getAtomicAdmissionCoordinator:()=>originCoordinator
 });
 await deny(mismatchedCoordinator.inspectAllOwnerClosureReadOnly(originPersisted,
   {requireAtomicAdmission:true}), 'KR_UPDATE_FENCE_ATOMIC_GENERATION',
   'changed MV3 worker generation cannot borrow another worker Web Lock capture');
 const stillActive=disk(),activeToken='unfinished_worker_12345';
 stillActive.data.activeDetectedProfileV1={profileId:'profile-A'};
 stillActive.data.selectedInventoryProfileV1={profileId:'profile-A'};
 stillActive.data[Atomic.START_PREFIX+activeToken]={
   schema:1,state:'admitted',token:activeToken,
   operationType:'AUTONOMOUS:renewal-detached-verify',
   workerInstanceId:'previous-worker',startedAtMs:99999
 };
 const activeCoordinator=make(stillActive,sharedOriginLocks,'worker-current');
 const activePersisted=Persisted.create({storageLocal:stillActive,
   storageSession:readOnlySession,workerInstanceId:'worker-current',
   clock:()=>100000});
 const activeAdditional=Additional.create({storageLocal:stillActive,
   storageSession:readOnlySession,workerInstanceId:'worker-current',
   clock:()=>100000,getAtomicAdmissionCoordinator:()=>activeCoordinator});
 await deny(activeAdditional.inspectAllOwnerClosureReadOnly(activePersisted,
   {requireAtomicAdmission:true}),'KR_UPDATE_FENCE_BUSY',
   'unfinished prior-generation P8 callback blocks origin-locked owner capture');
 pass(Object.keys(stillActive.data).filter(key=>
   key.startsWith(Atomic.FINISH_PREFIX)).length===0,
   'unresolved previous-worker receipt remains untouched by read-only inspector');
 const background=fs.readFileSync('src/background/background.js','utf8');
 pass(background.includes('workerInstanceId:ownerWorkerInstanceId')
   &&!background.includes('getOwnerSnapshot: () => requireAdditionalOwnerObserver()'),
   'real MV3 admission and observer generation agree; no untrusted positive update snapshot is wired');
 console.log('PASS KAR99 P8 adversarial races '+n+' checked');
})().catch(e=>{console.error(e);process.exitCode=1});
