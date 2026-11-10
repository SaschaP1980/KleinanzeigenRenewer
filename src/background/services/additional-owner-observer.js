// KAR-99 P7: eight real supplemental owner sources, strictly ACTIVE/UNKNOWN.
// Read-only evidence is never a trusted all-owner idle or update permission.
(() => {
  'use strict';
  const OWNERS = Object.freeze([
    'singleInventory','trashMutation','managedTabs','profileTransition',
    'accountTransition','emergencyRecovery','diagnosticExport','nativeUpdateTransaction'
  ]);
  // Seven pre-existing read-only producers form the other half of the P7 view.
  // These sightings never create a trusted worker-generation IDLE attestation.
  const PERSISTED_OWNERS=Object.freeze([
    'bulkInventory','bulkReconciliation','renewal','massRenewal',
    'templateFill','archiveInsertion','insertionLock'
  ]);
  const ROUTED=Object.freeze({
    CAPTURE_SINGLE_INVENTORY:['singleInventory','managedTabs'],
    REFRESH_INVENTORY:['singleInventory','managedTabs'],
    CHECK_INVENTORY_ONLINE_STATUS:['singleInventory','managedTabs'],
    SAVE_INVENTORY:['singleInventory'],
    DELETE_INVENTORY:['trashMutation'],
    DELETE_TRASH_ENTRY:['trashMutation'],
    RESET_TRASH_RETENTION:['trashMutation'],
    CLEAR_INVENTORIES:['trashMutation'],
    REMOVE_REPLACEMENT_READY_LOCAL:['trashMutation'],
    DISCARD_RENEWAL_DRAFT:['trashMutation'],
    FINISH_RENEWAL_REPLACEMENT:['trashMutation','managedTabs'],
    SET_SELECTED_PROFILE:['profileTransition'],
    RECOGNIZE_PROFILE:['accountTransition','profileTransition'],
    PROBE_LIVE_KLEINANZEIGEN_ACCOUNT:['accountTransition','profileTransition'],
    PREPARE_PROFILE_BACKUP_IMPORT:['profileTransition'],
    FINALIZE_PROFILE_BACKUP_IMPORT:['profileTransition','trashMutation'],
    DELETE_PROFILE:['profileTransition','trashMutation'],
    ASSIGN_UNPROFILED_INVENTORIES:['profileTransition','singleInventory'],
    RESET_ACTIVE_WORKFLOWS:['emergencyRecovery','managedTabs'],
    GET_DIAGNOSTIC_EXPORT:['diagnosticExport'],
    OPEN_EDIT_AD:['managedTabs'],
    OPEN_READONLY_AD:['managedTabs'],
    ENSURE_CONTENT_CONNECTION:['managedTabs'],
    REACTIVATE_DISCARDED_TABS:['managedTabs'],
    START_BULK_INVENTORY_OPERATION:['managedTabs'],
    BULK_OPEN_WORKER:['managedTabs'],
    BULK_EXTRACT_SAVE_WORKER:['managedTabs'],
    BULK_CLOSE_WORKER:['managedTabs'],
    START_MASS_RENEWAL_BATCH:['managedTabs'],
    START_TEMPLATE_FILL:['managedTabs'],
    START_TRASH_TEMPLATE_FILL:['managedTabs'],
    START_ARCHIVE_INSERTION:['managedTabs'],
    RETRY_RENEWAL_VERIFICATION:['managedTabs'],
    RETRY_MASS_RENEWAL_ITEM:['managedTabs'],
    RETRY_BULK_FAILURE:['managedTabs'],
    PREPARE_TRASH_TEMPLATE_INVENTORY_CAPTURE:['managedTabs'],
    // NativeHost currently offers only health/check and is not a fenced
    // mutation route. Persistent reserved/cancelled transactions stay BUSY.
    GET_NATIVE_UPDATE_STATUS:[]
  });
  const AUTONOMOUS=Object.freeze({
    'tab-registry-boot':['managedTabs'],
    'tab-registry-startup':['managedTabs'],
    'tab-lifecycle-update':['managedTabs'],
    'tab-activated':['managedTabs'],
    'tab-removed':['managedTabs'],
    'trash-publish-detection':['managedTabs'],
    'trash-purge-boot':['trashMutation'],
    'trash-purge-startup':['trashMutation'],
    'trash-purge-installed':['trashMutation'],
    'bulk-runtime-recovery':['emergencyRecovery','managedTabs'],
    'bulk-watchdog':['emergencyRecovery'],
    'renewal-resume':['emergencyRecovery','managedTabs'],
    'archive-resume':['emergencyRecovery','managedTabs'],
    'mass-resume':['emergencyRecovery','managedTabs'],
    'renewal-phase1-retry':['emergencyRecovery','managedTabs'],
    'renewal-detached-verify':['managedTabs'],
    'renewal-detached-retry':['managedTabs'],
    'renewal-auto-phase4':['managedTabs'],
    'renewal-publish-detection':['managedTabs'],
    'archive-postpublish-detached':['managedTabs'],
    'mass-renewal-next-item':['managedTabs'],
    'mass-renewal-watchdog-timer':['emergencyRecovery','managedTabs'],
    'template-error-terminalize':['emergencyRecovery','managedTabs']
  });
  function ownersForOperation(kind,source){
    if(typeof kind!=='string'||!kind)return OWNERS;
    const table=source==='routed'?ROUTED:source==='autonomous'?AUTONOMOUS:null;
    if(!table||!Object.hasOwn(table,kind))return OWNERS;
    return Object.freeze([...table[kind]]);
  }
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
    async function observeAll(persistedObserver){
      // Read both actual observers independently: one broken source must
      // not hide a positively observed ACTIVE operation from the other.
      const [p,a]=await Promise.allSettled([
        Promise.resolve().then(()=>persistedObserver?.observe?.()),
        Promise.resolve().then(()=>observe())
      ]);
      const persisted=p.status==='fulfilled'?p.value:null;
      const additional=a.status==='fulfilled'?a.value:null;
      const observations=Object.create(null);
      for(const name of [...PERSISTED_OWNERS,...OWNERS]){
        const source=PERSISTED_OWNERS.includes(name)?persisted:additional;
        const item=source?.schema===1&&record(source?.observations)?source.observations[name]:null;
        observations[name]=Object.freeze(
          item?.state==='active'&&typeof item.reason==='string'&&item.reason
            ? {state:'active',reason:item.reason}
            : {state:'unknown',reason:item?.state==='idle'?'UNVERIFIED_IDLE_ATTESTATION'
              :source?'OWNER_NOT_AUTHORITATIVE':'OWNER_SOURCE_UNAVAILABLE'}
        );
      }
      const workerIds=[persisted?.context?.worker?.workerInstanceId,
        additional?.context?.worker?.workerInstanceId];
      const workerReason=workerIds.every(x=>typeof x==='string'&&PROFILE.test(x))
        &&workerIds[0]!==workerIds[1]?'WORKER_GENERATION_MISMATCH'
        :'NO_CROSS_WORKER_GENERATION_PROOF';
      const tick=clock();
      return Object.freeze({
        schema:1,eligibleForLease:false,
        observedAtMs:Number.isSafeInteger(tick)&&tick>=0?tick:null,
        observations:Object.freeze(observations),
        context:Object.freeze({
          profile:Object.freeze({state:'unverified',reason:'LIVE_ACCOUNT_NOT_ATOMICALLY_BOUND'}),
          worker:Object.freeze({state:'unverified',reason:workerReason,workerInstanceId:worker||null})
        })
      });
    }
    return Object.freeze({observe,observeAll,track,snapshotInFlight});
  }
  const API=Object.freeze({create,OWNERS,ownersForOperation});
  globalThis.KRDeps?.register?.('KRAdditionalOwnerObserver',API);
  if(typeof module!=='undefined'&&module?.exports)module.exports=API;
})();
