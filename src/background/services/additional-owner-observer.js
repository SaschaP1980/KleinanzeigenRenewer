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
  function create({storageLocal,storageSession,workerInstanceId=null,clock=()=>Date.now(),
    queryBrowserTabsReadOnly=null,readAccountPageStatusReadOnly=null}={}) {
    if(typeof storageLocal?.get!=='function'||typeof storageSession?.get!=='function'
       ||typeof clock!=='function')throw Error('supplemental owner observer requires read-only storage and clock');
    const pending=new Map(OWNERS.map(n=>[n,0]));
    const worker=typeof workerInstanceId==='string'&&PROFILE.test(workerInstanceId)?workerInstanceId:null;
    function snapshotInFlight(){return Object.freeze(Object.fromEntries(OWNERS.map(n=>[n,pending.get(n)])));}
    const label=value=>typeof value==='string'?value.replace(/\s+/g,' ').trim().toLocaleLowerCase('de-DE'):'';
    function isMyAdsTab(tab){
      if(!record(tab)||typeof tab.url!=='string')return false;
      try{
        const url=new URL(tab.url);
        return url.protocol==='https:'&&['www.kleinanzeigen.de','kleinanzeigen.de'].includes(url.hostname)
          &&url.pathname==='/m-meine-anzeigen.html';
      }catch{return false;}
    }
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
        storageLocal.get([...PROFILE_KEYS,'profilesV1','nativeUpdateWorkflowFenceV1']),
        storageSession.get(['tabRegistryV1','managedWorkerTabsV1']),
        storageLocal.get([...PROFILE_KEYS,'profilesV1'])
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
      // P1.3-E1: A persisted GONE tab is not necessarily closed in Chrome.
      // Compare the *real* read-only browser snapshot to the raw registry,
      // then re-read the registry to detect a concurrent lifecycle update.
      // No writable TabRegistry getter, recovery, tab creation or navigation.
      const [browserRead, sessionRecheck] = await Promise.allSettled([
        Promise.resolve().then(() => {
          if (typeof queryBrowserTabsReadOnly !== 'function')
            throw Error('no trusted browser enumeration source');
          return queryBrowserTabsReadOnly();
        }),
        storageSession.get(['tabRegistryV1','managedWorkerTabsV1'])
      ]);
      const rechecked = sessionRecheck.status === 'fulfilled'
        && record(sessionRecheck.value) ? sessionRecheck.value : null;
      if (session && o.managedTabs.state !== 'active'
          && !['TAB_REGISTRY_CORRUPT','LEGACY_TABS_CORRUPT']
            .includes(o.managedTabs.reason)) {
        if (!rechecked ||
            JSON.stringify(session.tabRegistryV1 ?? null) !==
              JSON.stringify(rechecked.tabRegistryV1 ?? null) ||
            JSON.stringify(session.managedWorkerTabsV1 ?? null) !==
              JSON.stringify(rechecked.managedWorkerTabsV1 ?? null))
          set('managedTabs',unknown('TAB_REGISTRY_CHANGED_DURING_READ'));
        else if (browserRead.status !== 'fulfilled')
          set('managedTabs',unknown('LIVE_TABS_QUERY_FAILED'));
        else {
          const tabs = browserRead.value;
          const valid = Array.isArray(tabs) && tabs.every(tab => record(tab)
            && Number.isSafeInteger(tab.id) && tab.id > 0);
          const liveIds = valid ? new Set(tabs.map(tab => tab.id)) : null;
          if (!valid || liveIds.size !== tabs.length)
            set('managedTabs',unknown('LIVE_TABS_INVALID'));
          else if (record(session.tabRegistryV1) &&
              Object.values(session.tabRegistryV1).some(tab =>
                record(tab) && tab.managed === true &&
                tab.lifecycleState === 'gone' && liveIds.has(tab.tabId)))
            set('managedTabs',unknown('GONE_MANAGED_TAB_STILL_OPEN'));
          // No positive IDLE even when browser and storage agree:
          // old Worker generations, pending tab creation and account identity
          // still lack independently authoritative completion receipts.
        }
      }
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
      // P1.3-E2: observe only already-open My Ads content, never create a tab,
      // bootstrap a script, navigate the website, or mutate a stored profile.
      // A matching display name is NOT a stable/authenticated account ID.
      if(reason==='STORED_PROFILES_MATCH_BUT_LIVE_UNVERIFIED'){
        const browser=browserRead.status==='fulfilled'?browserRead.value:null;
        const ids=Array.isArray(browser)?new Set(browser.map(t=>t?.id)):null;
        if(!Array.isArray(browser)||browser.some(t=>!record(t)
            ||!Number.isSafeInteger(t.id)||t.id<=0)||ids.size!==browser.length)
          reason='LIVE_ACCOUNT_TABS_UNAVAILABLE';
        else {
          const candidates=browser.filter(isMyAdsTab);
          if(!candidates.length)reason='LIVE_ACCOUNT_MY_ADS_TAB_ABSENT';
          else if(typeof readAccountPageStatusReadOnly!=='function')
            reason='LIVE_ACCOUNT_SOURCE_UNAVAILABLE';
          else {
            let initialNames=null;
            const pageResults=await Promise.allSettled(candidates.map(tab=>
              Promise.resolve().then(()=>readAccountPageStatusReadOnly(tab.id))));
            if(pageResults.some(r=>r.status!=='fulfilled'||!record(r.value)))
              reason='LIVE_ACCOUNT_STATUS_UNAVAILABLE';
            else {
              const pages=pageResults.map(r=>r.value);
              if(pages.some((p,i)=>p.pageType!=='my-ads'||p.url!==candidates[i].url
                  ||p.auth?.loggedIn!==true||!label(p.profileName)))
                reason='LIVE_ACCOUNT_STATUS_UNVERIFIED';
              else if(pages.some(p=>label(p.profileName)!==label(pages[0].profileName)))
                reason='LIVE_ACCOUNT_TABS_DISAGREE';
              else {
                initialNames=pages.map(p=>label(p.profileName));
                // Reuse the live account/profile comparison used by the
                // existing application gate. Kleinanzeigen owns account
                // authentication; no extra seller ID or email syntax check.
                const profile=Array.isArray(local.profilesV1)
                  ?local.profilesV1.find(p=>record(p)&&p.profileId===id):null;
                reason=!label(profile?.displayName)||
                  label(profile.displayName)!==label(pages[0].profileName)
                  ?'LIVE_ACCOUNT_PROFILE_NAME_MISMATCH'
                  :'LIVE_ACCOUNT_PROFILE_MATCH';
              }
            }
            // Re-evaluate presence and identity of the same live tabs, plus
            // all profile hints after the asynchronous content responses.
            const [newTabs,newProfiles]=await Promise.allSettled([
              Promise.resolve().then(()=>queryBrowserTabsReadOnly()),
              storageLocal.get([...PROFILE_KEYS,'profilesV1'])
            ]);
            const stableProfile=v=>JSON.stringify([
              v?.activeDetectedProfileV1??null,v?.selectedInventoryProfileV1??null,
              v?.profilesV1??null
            ]);
            const tabList=v=>Array.isArray(v)
              &&v.every(t=>record(t)&&Number.isSafeInteger(t.id)&&t.id>0)
              &&new Set(v.map(t=>t.id)).size===v.length
              ?JSON.stringify(v.filter(isMyAdsTab).map(t=>[t.id,t.url]).sort((a,b)=>a[0]-b[0]))
              :null;
            const prior=tabList(browser);
            const current=newTabs.status==='fulfilled'?tabList(newTabs.value):null;
            if(prior===null||current===null||prior!==current)
              reason='LIVE_ACCOUNT_TABS_CHANGED';
            if(newProfiles.status!=='fulfilled'||!record(newProfiles.value)
              ||stableProfile(local)!==stableProfile(later)
              ||stableProfile(local)!==stableProfile(newProfiles.value))
              reason='LIVE_ACCOUNT_PROFILE_CHANGED_DURING_READ';
            // The stored profile and tab URL can stay unchanged while the
            // authenticated web session switches accounts or logs out.
            // Re-read PAGE_STATUS from the same existing content scripts.
            // This is the existing application account/profile match.
            // Other owner workflows still require separate durable IDLE proof.
            if(reason==='LIVE_ACCOUNT_PROFILE_MATCH'){
              const secondPages=await Promise.allSettled(candidates.map(tab=>
                Promise.resolve().then(()=>readAccountPageStatusReadOnly(tab.id))));
              if(!initialNames||secondPages.some((r,i)=>r.status!=='fulfilled'
                  ||!record(r.value)||r.value.pageType!=='my-ads'
                  ||r.value.url!==candidates[i].url
                  ||r.value.auth?.loggedIn!==true
                  ||label(r.value.profileName)!==initialNames[i]))
                reason='LIVE_ACCOUNT_STATUS_CHANGED_DURING_READ';
            }
          }
        }
      }
      if(reason==='PROFILE_CHANGED_DURING_READ'||reason==='PROFILE_MISMATCH'
         ||reason.startsWith('LIVE_ACCOUNT_')){
        set('profileTransition',unknown(reason));set('accountTransition',unknown(reason));
      }
      for(const n of OWNERS)if(pending.get(n)>0)o[n]=active('ACTUAL_IN_FLIGHT_OPERATION');
      const tick=clock();
      return Object.freeze({
        schema:1,eligibleForLease:false,observedAtMs:Number.isSafeInteger(tick)&&tick>=0?tick:null,
        observations:Object.freeze(o),
        context:Object.freeze({
          // Matched account/profile is a distinct fact from 15-owner IDLE.
          // This observation NEVER grants an updater lease by itself.
          profile:Object.freeze({state:reason==='LIVE_ACCOUNT_PROFILE_MATCH'
            ?'matched':'unverified',reason,profileId:id}),
          worker:Object.freeze({state:'unverified',reason:'NO_CROSS_WORKER_GENERATION_PROOF',
            workerInstanceId:worker})
        })
      });
    }
    // P1.3-F1: read-only, independently corroborated CURRENT Chrome tab
    // ownership. This proves only that enumerated tabs are not managed. It
    // does not certify that a prior worker completed all its callbacks, and
    // never grants a 15-owner IDLE snapshot or updater lease by itself.
    async function readVerifiedUnmanagedTabsReadOnly() {
      const fail = () => {
        const error = new Error('KR_OWNER_TABS_UNVERIFIED');
        error.code = 'KR_OWNER_TABS_UNVERIFIED';
        throw error;
      };
      if (typeof queryBrowserTabsReadOnly !== 'function') fail();
      const keys = ['tabRegistryV1', 'managedWorkerTabsV1'];
      // Read twice on BOTH sides: a GONE tombstone alone is not Chrome
      // evidence, while a single live tab list can race a new tab creation.
      let first, liveOne, second, liveTwo;
      try {
        first = await storageSession.get(keys);
        liveOne = await queryBrowserTabsReadOnly();
        second = await storageSession.get(keys);
        liveTwo = await queryBrowserTabsReadOnly();
      } catch { fail(); }
      if (!record(first) || !record(second) ||
          !record(first.tabRegistryV1) || !record(second.tabRegistryV1) ||
          !record(first.managedWorkerTabsV1) ||
          !record(second.managedWorkerTabsV1) ||
          JSON.stringify(first) !== JSON.stringify(second)) fail();

      function checkTabList(rows) {
        if (!Array.isArray(rows) || !rows.every(tab =>
            record(tab) && Number.isSafeInteger(tab.id) && tab.id > 0 &&
            typeof tab.url === 'string' && tab.url.length > 0)) fail();
        const byId = new Map(rows.map(tab => [tab.id, tab]));
        if (byId.size !== rows.length) fail();
        return byId;
      }
      const one = checkTabList(liveOne);
      const two = checkTabList(liveTwo);
      const fingerprint = rows => JSON.stringify([...rows.values()]
        .map(tab => [tab.id, tab.url, tab.windowId ?? null])
        .sort((a,b) => a[0] - b[0]));
      if (fingerprint(one) !== fingerprint(two)) fail();

      const registry = first.tabRegistryV1;
      for (const [key,entry] of Object.entries(registry)) {
        const id = Number(key);
        if (!/^[1-9]\d*$/.test(key) || !Number.isSafeInteger(id) ||
            !record(entry) || entry.tabId !== id ||
            typeof entry.managed !== 'boolean' ||
            !['active','discarded','gone'].includes(entry.lifecycleState))
          fail();
        const live = one.has(id);
        // Any live or not-yet-acknowledged managed tab blocks. For a GONE
        // managed tab require a real close timestamp AND Chrome absence.
        if (entry.managed === true &&
            (entry.lifecycleState !== 'gone' || live ||
             typeof entry.closedAt !== 'string' ||
             !Number.isFinite(Date.parse(entry.closedAt)))) fail();
        if (entry.lifecycleState === 'gone' && live) fail();
        // A stored active user tab missing in the live browser is ambiguous
        // until the normal tab lifecycle observer reconciles it.
        if (entry.lifecycleState !== 'gone' && !live) fail();
      }
      const legacy = first.managedWorkerTabsV1;
      for (const [key,entry] of Object.entries(legacy)) {
        const id = Number(key);
        if (!/^[1-9]\d*$/.test(key) || !Number.isSafeInteger(id) ||
            !record(entry) || typeof entry.closedAt !== 'string' ||
            !Number.isFinite(Date.parse(entry.closedAt)) || one.has(id))
          fail();
      }
      // Any unregistered tab, browser-owned managed tab, or incomplete
      // lifecycle row remains UNKNOWN. Never trust the page URL or a
      // caller-supplied "managed:false" as a proof of ownership.
      for (const [id] of one) {
        const entry = registry[String(id)];
        if (!record(entry) || entry.managed !== false ||
            !['user','source'].includes(entry.role) ||
            !['active','discarded'].includes(entry.lifecycleState) ||
            entry.closeIntentAt || entry.closeIntentReason)
          fail();
      }
      return Object.freeze([...one.keys()].sort((a,b) => a-b).map(id =>
        Object.freeze({id, managed:false, ownershipVerified:true,
          sourceRevision:'chrome-tabs-session-registry-two-read-v1'})));
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
    return Object.freeze({observe,observeAll,track,snapshotInFlight,readVerifiedUnmanagedTabsReadOnly});
  }
  const API=Object.freeze({create,OWNERS,ownersForOperation});
  globalThis.KRDeps?.register?.('KRAdditionalOwnerObserver',API);
  if(typeof module!=='undefined'&&module?.exports)module.exports=API;
})();
