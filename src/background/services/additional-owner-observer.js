// KAR-99 P7: eight real supplemental owner sources, strictly ACTIVE/UNKNOWN.
// Read-only evidence is never a trusted all-owner idle or update permission.
(() => {
  'use strict';
  const OWNERS = Object.freeze([
    'singleInventory','trashMutation','managedTabs','profileTransition',
    'accountTransition','emergencyRecovery','diagnosticExport','nativeUpdateTransaction'
  ]);
  const PROFILE_KEYS=Object.freeze(['activeDetectedProfileV1','selectedInventoryProfileV1']);
  const PROFILE=/^[A-Za-z0-9_-]{1,128}$/;
  const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const active=reason=>Object.freeze({state:'active',reason});
  const unknown=reason=>Object.freeze({state:'unknown',reason});
  function create({storageLocal,storageSession,workerInstanceId=null,clock=()=>Date.now()}={}) {
    if(typeof storageLocal?.get!=='function'||typeof storageSession?.get!=='function'
       ||typeof clock!=='function')throw Error('supplemental owner observer requires read-only storage and clock');
    const pending=new Map(OWNERS.map(n=>[n,0]));
    const worker=typeof workerInstanceId==='string'&&PROFILE.test(workerInstanceId)?workerInstanceId:null;
    function snapshotInFlight(){return Object.freeze(Object.fromEntries(OWNERS.map(n=>[n,pending.get(n)])));}
    async function track(owners,task){
      const names=Array.isArray(owners)?owners:[owners];
      if(!names.length||typeof task!=='function'||new Set(names).size!==names.length
        ||!names.every(n=>pending.has(n)))
        throw Error('additional owner tracker requires known owner(s) and task');
      for(const n of names)pending.set(n,pending.get(n)+1);
      try{return await task();}finally{for(const n of names)pending.set(n,pending.get(n)-1);}
    }
    async function observe(){
      // Do not call TabRegistry.snapshot(): its legacy migration can WRITE.
      const [l,s,l2]=await Promise.allSettled([
        storageLocal.get([...PROFILE_KEYS,'nativeUpdateWorkflowFenceV1']),
        storageSession.get(['tabRegistryV1','managedWorkerTabsV1']),
        storageLocal.get([...PROFILE_KEYS])
      ]);
      const local=l.status==='fulfilled'&&record(l.value)?l.value:null;
      const session=s.status==='fulfilled'&&record(s.value)?s.value:null;
      const later=l2.status==='fulfilled'&&record(l2.value)?l2.value:null;
      const o=Object.fromEntries(OWNERS.map(n=>[n,unknown('NO_AUTHORITATIVE_IDLE_PROOF')]));
      const set=(n,v)=>{if(pending.get(n)===0)o[n]=v;};
      if(session){
        const tabs=session.tabRegistryV1;
        if(tabs!==undefined&&!record(tabs))set('managedTabs',unknown('TAB_REGISTRY_CORRUPT'));
        else if(record(tabs)){
          const values=Object.values(tabs);
          if(values.some(x=>!record(x)||!Number.isSafeInteger(x.tabId)
             ||typeof x.lifecycleState!=='string'))
            set('managedTabs',unknown('TAB_REGISTRY_CORRUPT'));
          else if(values.some(x=>x.managed===true&&x.lifecycleState!=='gone'))
            set('managedTabs',active('MANAGED_TAB_PERSISTED_ACTIVE'));
        }
        const legacy=session.managedWorkerTabsV1;
        if(legacy!==undefined&&!record(legacy))set('managedTabs',unknown('LEGACY_TABS_CORRUPT'));
        else if(record(legacy)){
          const values=Object.values(legacy);
          if(values.some(x=>!record(x)))set('managedTabs',unknown('LEGACY_TABS_CORRUPT'));
          else if(values.some(x=>!x.closedAt))set('managedTabs',active('LEGACY_MANAGED_TAB_PRESENT'));
        }
      } else set('managedTabs',unknown('SESSION_STORAGE_UNAVAILABLE'));
      if(local){
        const txn=local.nativeUpdateWorkflowFenceV1;
        if(txn!==undefined&&txn!==null){
          if(!record(txn)||txn.schema!==1||typeof txn.state!=='string')
            set('nativeUpdateTransaction',unknown('NATIVE_TRANSACTION_CORRUPT'));
          else if(['reserved','cancelled'].includes(txn.state))
            set('nativeUpdateTransaction',active('PERSISTED_NATIVE_UPDATE_TRANSACTION'));
        }
      }
      const profiles=[local?.activeDetectedProfileV1,local?.selectedInventoryProfileV1,
                      later?.activeDetectedProfileV1,later?.selectedInventoryProfileV1];
      const valid=x=>record(x)&&typeof x.profileId==='string'&&PROFILE.test(x.profileId);
      let reason='PROFILE_MISSING_OR_INVALID',id=null;
      if(!local||!later)reason='PROFILE_STORAGE_UNAVAILABLE';
      else if(profiles.every(valid)){
        if(profiles[0].profileId!==profiles[2].profileId||profiles[1].profileId!==profiles[3].profileId)
          reason='PROFILE_CHANGED_DURING_READ';
        else if(profiles[0].profileId!==profiles[1].profileId)reason='PROFILE_MISMATCH';
        else{reason='STORED_PROFILES_MATCH_BUT_LIVE_UNVERIFIED';id=profiles[0].profileId;}
      }
      if(reason==='PROFILE_CHANGED_DURING_READ'||reason==='PROFILE_MISMATCH'){
        set('profileTransition',unknown(reason));set('accountTransition',unknown(reason));
      }
      for(const n of OWNERS)if(pending.get(n)>0)o[n]=active('ACTUAL_IN_FLIGHT_OPERATION');
      const tick=clock();
      return Object.freeze({
        schema:1,eligibleForLease:false,observedAtMs:Number.isSafeInteger(tick)&&tick>=0?tick:null,
        observations:Object.freeze(o),
        context:Object.freeze({
          profile:Object.freeze({state:'unverified',reason,profileId:id}),
          worker:Object.freeze({state:'unverified',reason:'NO_CROSS_WORKER_GENERATION_PROOF',
            workerInstanceId:worker})
        })
      });
    }
    return Object.freeze({observe,track,snapshotInFlight});
  }
  const API=Object.freeze({create,OWNERS});
  globalThis.KRDeps?.register?.('KRAdditionalOwnerObserver',API);
  if(typeof module!=='undefined'&&module?.exports)module.exports=API;
})();
