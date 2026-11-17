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
  function create({storageLocal,lockManager,workerInstanceId,clock=()=>Date.now(),newToken,onSample=null}={}) {
    if(typeof storageLocal?.get!=='function'||typeof storageLocal?.set!=='function'
       ||typeof clock!=='function'||typeof newToken!=='function'||!ID.test(workerInstanceId))
      throw denied('KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE');
    const id=x=>typeof x==='string'&&ID.test(x);
    // Bounded, callback-only, privacy-safe measurements. Never include a token,
    // worker identifier, profile, tab, URL or raw error message. The sink
    // executes only after the actual Web Lock request has settled.
    const measuredMs=value=>Math.max(0,Math.min(60000,Math.round(Number(value)||0)));
    function reportSample(route,phase,stats,outcome) {
      if(typeof onSample!=='function')return;
      const label=typeof route==='string'&&/^(?:[A-Z][A-Z0-9_]{0,63}|AUTONOMOUS:[a-z0-9-]{1,48})$/.test(route)
        ?route:'OTHER';
      const sample=Object.freeze({
        phase,route:label,
        holdMs:measuredMs(stats.holdMs),waitMs:measuredMs(stats.waitMs),
        busyAttempts:Math.max(0,Math.min(16,Number(stats.busyAttempts)||0)),
        outcome:outcome==='ok'?'ok':'denied'
      });
      try {onSample(sample);} catch { /* diagnostics cannot break P8 */ }
    }
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
      const all=await get(null);
      // KAR-171 W3C: take the clock AFTER the durable source read, not before
      // it. A complete historical prior-worker P8 record dated later than
      // the actual inspection is UNKNOWN, never already-settled work.
      const inspectedAtMs=now(),starts=new Map(),finishes=new Map();
      for(const [key,v] of Object.entries(all)){
        if(key.startsWith(START_PREFIX)){
          if(!checkStart(v,key)||v.startedAtMs>inspectedAtMs)
            throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');
          starts.set(v.token,v);
        }
        if(key.startsWith(FINISH_PREFIX)){
          if(!record(v)||!id(v.token)||key!==FINISH_PREFIX+v.token)
            throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');
          finishes.set(v.token,v);
        }
      }
      for(const [token,row] of finishes)
        if(!checkFinish(row,FINISH_PREFIX+token,starts.get(token))
          ||row.completedAtMs>inspectedAtMs)
          throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');
      return {starts,finishes};
    }
    async function exclusive(task,stats=null) {
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
            const heldAt=Date.now();
            try {
              const value=await task();
              completed=true;
              return value;
            } finally {
              if(stats)stats.holdMs=measuredMs(Date.now()-heldAt);
            }
          }
        );
        // Also reject a provider that resolves *before* the awaited callback
        // finishes: the lock must span journal writes and readback.
        if(!entered||!completed)throw denied('KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE');
        return result;
      }catch(error){
        // F2E1: preserve this one exact, private, fail-closed remote journal
        // profile mismatch. Rewriting it to a generic lock outage hides the
        // actual account-bound evidence rejection after worker restart.
        if(error?.code==='KR_OWNER_JOURNAL_PROFILE_MISMATCH'
          ||error?.code==='KR_OWNER_JOURNAL_ADMISSION_UNVERIFIED')throw error;
        if(typeof error?.code==='string'&&error.code.startsWith('KR_UPDATE_FENCE_'))throw error;
        throw denied('KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE');
      }
    }
    // A momentary journal/lock overlap must not reject legitimate routed
    // UI/profile messages. Retry ONLY Web Locks contention, never a held update
    // lease, corrupt storage, missing browser primitive, wrong profile or
    // unverified remote outcome. Every accepted start and finish is still
    // inside the exact exclusive Web Lock and durable journal readback.
    // Only the short P8 journal start/finish critical sections are queued.
    // Concurrent requests from this SAME MV3 worker must not race each other
    // through the 16-attempt Web Lock retry budget. Every queued operation
    // still acquires the real origin-exclusive Web Lock and verifies its own
    // durable receipts; remote handlers execute OUTSIDE this local queue.
    // A rejected entry must not poison or stall its successors.
    let workflowQueue=Promise.resolve();
    function workflowExclusive(task,route,phase) {
      const enqueuedAt=Date.now();
      const run=async()=>{
        const stats={holdMs:0,waitMs:Date.now()-enqueuedAt,busyAttempts:0};
        let outcome='ok';
        try {
          const attempts=16;
          for(let i=0;i<attempts;i++){
            try {return await exclusive(task,stats);}
            catch(error){
              if(error?.code==='KR_UPDATE_FENCE_ATOMIC_BUSY')stats.busyAttempts++;
              if(error?.code!=='KR_UPDATE_FENCE_ATOMIC_BUSY'||i===attempts-1)
                throw error;
              await new Promise(resolve=>setTimeout(resolve,Math.min(20+i*10,100)));
            }
          }
          throw denied('KR_UPDATE_FENCE_ATOMIC_BUSY');
        } catch(error) {
          outcome='denied';
          throw error;
        } finally {
          reportSample(route,phase,stats,outcome);
        }
      };
      const current=workflowQueue.then(run,run);
      // Let the admitted handler schedule any immediately nested P8-shared
      // journal lock (e.g. before-click publish intent) before admitting
      // another same-worker start. The yield is OUTSIDE the Web Lock, so
      // unrelated operations and independent workers remain protected.
      const handoff=()=>new Promise(resolve=>setTimeout(resolve,0));
      workflowQueue=current.then(handoff,handoff);
      return current;
    }
    async function withAdmission(operationType,task) {
      if(typeof operationType!=='string'||!operationType||operationType.length>128
        ||typeof task!=='function')throw denied('KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE');
      let entry;
      await workflowExclusive(async()=>{
        // KAR-195: a routine admitted request only needs to protect the two
        // slots of its own collision-resistant receipt. Enumerating every
        // diagnostic, inventory and image-storage key here held the origin
        // Web Lock ~250ms per start on the owner's Windows/Chrome machine.
        // The safety-critical reserve path BELOW still scans the complete
        // cross-worker journal twice independently before granting idle.
        let token;
        try {token=newToken();}catch{throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');}
        if(!id(token)||token.length<12)throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');
        const startKey=START_PREFIX+token,finishKey=FINISH_PREFIX+token;
        const prior=await get([startKey,finishKey]);
        if(Object.hasOwn(prior,startKey)||Object.hasOwn(prior,finishKey))
          throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');
        entry=Object.freeze({
          schema:1,state:'admitted',token,operationType,workerInstanceId,
          startedAtMs:now()
        });
        await durable(startKey,entry);
      },operationType,'start');
      // Only the admitted closure receives this frozen, storage-acknowledged
      // origin-Web-Lock receipt. No global mutable current token: concurrent
      // MV3 handlers must never borrow each other's operation provenance.
      try {return await task(entry);}
      finally {
        // An interrupted worker never runs finally. Leave the start receipt
        // unresolved; an independent result probe is needed before clearance.
        await workflowExclusive(async()=>{
          // Validate the exact source start and absence of any finish under
          // the same origin Web Lock; a changed, missing or already finished
          // receipt denies completion rather than inventing a clean outcome.
          const startKey=START_PREFIX+entry.token,finishKey=FINISH_PREFIX+entry.token;
          const prior=await get([startKey,finishKey]);
          if(!same(prior[startKey],entry)||Object.hasOwn(prior,finishKey))
            throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');
          const completed=Object.freeze({
            schema:1,state:'completed',token:entry.token,workerInstanceId,
            completedAtMs:now()
          });
          await durable(finishKey,completed);
        },operationType,'finish');
      }
    }
    async function guardReserve(task, expectedWorkerInstanceId) {
      if(typeof task!=='function')throw denied('KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE');
      // Fence.reserve supplies the request generation. Do not let a new MV3
      // worker reuse an old worker's all-idle observation or fake request even
      // if a test-only snapshot would otherwise pass the candidate policy.
      if(expectedWorkerInstanceId!==undefined&&expectedWorkerInstanceId!==workerInstanceId)
        throw denied('KR_UPDATE_FENCE_ATOMIC_GENERATION');
      const stats={holdMs:0,waitMs:0,busyAttempts:0};
      let outcome='ok';
      try {
        return await exclusive(async()=>{
        // P1.3-F2B: the raw crash-durable receipts must agree across two
        // complete independent reads while this origin Web Lock is held.
        // A new/removed/rewritten start or finish is UNKNOWN, never IDLE.
        // Structural receipt closure proves callback settlement only; it is
        // not independent remote-outcome or all-owner completion evidence.
        const first=await scan();
        const second=await scan();
        const signature=rows=>JSON.stringify([...rows.entries()]
          .sort(([a],[b])=>a.localeCompare(b)));
        if(signature(first.starts)!==signature(second.starts)
          ||signature(first.finishes)!==signature(second.finishes))
          throw denied('KR_UPDATE_FENCE_ATOMIC_STORAGE');
        for(const token of second.starts.keys())
          if(!second.finishes.has(token))throw denied('KR_UPDATE_FENCE_BUSY');
        return task();
        },stats);
      } catch(error) {
        outcome='denied';
        if(error?.code==='KR_UPDATE_FENCE_ATOMIC_BUSY')stats.busyAttempts++;
        throw error;
      } finally {
        reportSample('RESERVE','reserve',stats,outcome);
      }
    }
    return Object.freeze({withAdmission,guardReserve});
  }
  const API=Object.freeze({create,START_PREFIX,FINISH_PREFIX,LOCK_NAME});
  globalThis.KRDeps?.register?.('KRAtomicMV3Admission',API);
  if(typeof module!=='undefined'&&module?.exports)module.exports=API;
})();
