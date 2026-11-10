// KAR-99 P8: browser-origin Web Locks + durable MV3 admission proof.
// All locks are short critical sections; remote/long-running tasks never hold
// an origin lock. Unfinished starts survive worker termination and block reserve.
// This is NOT positive owner IDLE, NativeHost apply, or authorization to publish.
(() => {
  'use strict';
  const START_PREFIX='karAtomicAdmissionStartV1_';
  const FINISH_PREFIX='karAtomicAdmissionFinishV1_';
  const LOCK_NAME='kar-updater-global-admission-v1';
  const ID=/^[A-Za-z0-9_-]{1,128}$/;
  const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const denied=code=>Object.assign(new Error(code),{code});
  function create({storageLocal,lockManager,workerInstanceId,clock=()=>Date.now(),newToken}={}) {
    if(typeof storageLocal?.get!=='function'||typeof storageLocal?.set!=='function'
       ||typeof clock!=='function'||typeof newToken!=='function'||!ID.test(workerInstanceId))
      throw denied('KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE');
    const id=x=>typeof x==='string'&&ID.test(x);
    const same=(x,y)=>record(x)&&record(y)&&Object.keys(x).length===Object.keys(y).length
      &&Object.keys(x).every(k=>x[k]===y[k]);
    function checkStart(row,key) {
      return record(row)&&row.schema===1&&row.state==='admitted'
        &&id(row.token)&&id(row.workerInstanceId)
        &&typeof row.operationType==='string'&&row.operationType.length>0
        &&row.operationType.length<=128&&Number.isSafeInteger(row.startedAtMs)
        &&row.startedAtMs>=0&&key===START_PREFIX+row.token;
    }
    function checkFinish(row,key,start) {
      return record(row)&&row.schema===1&&row.state==='completed'
        &&id(row.token)&&id(row.workerInstanceId)
        &&Number.isSafeInteger(row.completedAtMs)&&row.completedAtMs>=0
        &&key===FINISH_PREFIX+row.token&&checkStart(start,START_PREFIX+row.token)
        &&row.workerInstanceId===start.workerInstanceId
        &&row.completedAtMs>=start.startedAtMs;
    }
    function now() {
      const x=clock();
      if(!Number.isSafeInteger(x)||x<0)throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');
      return x;
    }
    async function get(keys) {
      try {const rows=await storageLocal.get(keys);if(!record(rows))throw Error('bad response');return rows;}
      catch {throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');}
    }
    async function durable(key,value) {
      try {await storageLocal.set({[key]:value});}
      catch {throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');}
      const ack=(await get([key]))[key];
      if(!same(ack,value))throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');
    }
    async function scan() {
      const all=await get(null),starts=new Map(),finishes=new Map();
      for(const [key,v] of Object.entries(all)){
        if(key.startsWith(START_PREFIX)){
          if(!checkStart(v,key))throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');
          starts.set(v.token,v);
        }
        if(key.startsWith(FINISH_PREFIX)){
          if(!record(v)||!id(v.token)||key!==FINISH_PREFIX+v.token)
            throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');
          finishes.set(v.token,v);
        }
      }
      for(const [token,row] of finishes)
        if(!checkFinish(row,FINISH_PREFIX+token,starts.get(token)))
          throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');
      return {starts,finishes};
    }
    async function exclusive(task) {
      if(typeof lockManager?.request!=='function')
        throw denied('KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE');
      let entered=false,completed=false;
      try {
        const result=await lockManager.request(
          LOCK_NAME,{mode:'exclusive',ifAvailable:true},async lock=>{
            // A missing or nonconforming Web Locks implementation must not
            // resolve the critical section without invoking its callback.
            // Otherwise withAdmission could execute remote work with no
            // durable receipt (and outside the requested exclusive lock).
            if(entered)throw denied('KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE');
            entered=true;
            if(!lock)throw denied('KR_UPDATE_FENCE_ATOMIC_BUSY');
            if(lock.name!==LOCK_NAME||lock.mode!=='exclusive')
              throw denied('KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE');
            const value=await task();
            completed=true;
            return value;
          }
        );
        // Also reject a provider that resolves *before* the awaited callback
        // finishes: the lock must span journal writes and readback.
        if(!entered||!completed)throw denied('KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE');
        return result;
      }catch(error){
        if(typeof error?.code==='string'&&error.code.startsWith('KR_UPDATE_FENCE_'))throw error;
        throw denied('KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE');
      }
    }
    // A momentary journal/lock overlap must not reject legitimate routed
    // UI/profile messages. Retry ONLY Web Locks contention, never a held update
    // lease, corrupt storage, missing browser primitive, wrong profile or
    // unverified remote outcome. Every accepted start and finish is still
    // inside the exact exclusive Web Lock and durable journal readback.
    async function workflowExclusive(task) {
      const attempts=16;
      for(let i=0;i<attempts;i++){
        try {return await exclusive(task);}
        catch(error){
          if(error?.code!=='KR_UPDATE_FENCE_ATOMIC_BUSY'||i===attempts-1)
            throw error;
          await new Promise(resolve=>setTimeout(resolve,Math.min(20+i*10,100)));
        }
      }
      throw denied('KR_UPDATE_FENCE_ATOMIC_BUSY');
    }
    async function withAdmission(operationType,task) {
      if(typeof operationType!=='string'||!operationType||operationType.length>128
        ||typeof task!=='function')throw denied('KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE');
      let entry;
      await workflowExclusive(async()=>{
        const {starts,finishes}=await scan();
        let token;
        try {token=newToken();}catch{throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');}
        if(!id(token)||token.length<12||starts.has(token)||finishes.has(token))
          throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');
        entry=Object.freeze({
          schema:1,state:'admitted',token,operationType,workerInstanceId,
          startedAtMs:now()
        });
        await durable(START_PREFIX+token,entry);
      });
      try {return await task();}
      finally {
        // An interrupted worker never runs finally. Leave the start receipt
        // unresolved; an independent result probe is needed before clearance.
        await workflowExclusive(async()=>{
          const {starts,finishes}=await scan();
          if(!same(starts.get(entry.token),entry)||finishes.has(entry.token))
            throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');
          const completed=Object.freeze({
            schema:1,state:'completed',token:entry.token,workerInstanceId,
            completedAtMs:now()
          });
          await durable(FINISH_PREFIX+entry.token,completed);
        });
      }
    }
    async function guardReserve(task, expectedWorkerInstanceId) {
      if(typeof task!=='function')throw denied('KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE');
      // Fence.reserve supplies the request generation. Do not let a new MV3
      // worker reuse an old worker's all-idle observation or fake request even
      // if a test-only snapshot would otherwise pass the candidate policy.
      if(expectedWorkerInstanceId!==undefined&&expectedWorkerInstanceId!==workerInstanceId)
        throw denied('KR_UPDATE_FENCE_ATOMIC_GENERATION');
      return exclusive(async()=>{
        const {starts,finishes}=await scan();
        for(const token of starts.keys())
          if(!finishes.has(token))throw denied('KR_UPDATE_FENCE_BUSY');
        return task();
      });
    }
    return Object.freeze({withAdmission,guardReserve});
  }
  const API=Object.freeze({create,START_PREFIX,FINISH_PREFIX,LOCK_NAME});
  globalThis.KRDeps?.register?.('KRAtomicMV3Admission',API);
  if(typeof module!=='undefined'&&module?.exports)module.exports=API;
})();
