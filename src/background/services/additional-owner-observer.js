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
  // P1.3-F2C: independently map EXISTING immutable P8 journal records to
  // the eight real supplemental owner classes. Completing a JavaScript
  // callback is NOT independent confirmation of a remote Kleinanzeigen result.
  const ADMISSION_START='karAtomicAdmissionStartV1_';
  const ADMISSION_FINISH='karAtomicAdmissionFinishV1_';
  const RECEIPT_ID=/^[A-Za-z0-9_-]{1,128}$/;
  const validReceiptId=x=>typeof x==='string'&&RECEIPT_ID.test(x);
  function ownerReceiptEvidence(first,second,inspectedAtMs){
    if(!Number.isSafeInteger(inspectedAtMs)||inspectedAtMs<0)return null;
    if(!first||!second||typeof first!=='object'||typeof second!=='object'
      ||Array.isArray(first)||Array.isArray(second))return null;
    const select=rows=>Object.entries(rows).filter(([key])=>
      key.startsWith(ADMISSION_START)||key.startsWith(ADMISSION_FINISH))
      .sort(([a],[b])=>a.localeCompare(b));
    const one=select(first),two=select(second);
    if(JSON.stringify(one)!==JSON.stringify(two))return null;
    const starts=new Map(),finishes=new Map();
    for(const [key,row] of two){
      if(!row||typeof row!=='object'||Array.isArray(row)||row.schema!==1
        ||!validReceiptId(row.token)||!validReceiptId(row.workerInstanceId))return null;
      if(key.startsWith(ADMISSION_START)){
        if(key!==ADMISSION_START+row.token||row.state!=='admitted'
          ||typeof row.operationType!=='string'||!row.operationType
          ||row.operationType.length>128
          ||!Number.isSafeInteger(row.startedAtMs)||row.startedAtMs<0
          ||row.startedAtMs>inspectedAtMs)return null;
        starts.set(row.token,row);
      }else{
        if(key!==ADMISSION_FINISH+row.token||row.state!=='completed'
          ||!Number.isSafeInteger(row.completedAtMs)||row.completedAtMs<0
          ||row.completedAtMs>inspectedAtMs)return null;
        finishes.set(row.token,row);
      }
    }
    for(const [token,finish] of finishes){
      const start=starts.get(token);
      if(!start||finish.workerInstanceId!==start.workerInstanceId
        ||finish.completedAtMs<start.startedAtMs)return null;
    }
    const pending=new Set(),completed=new Set();
    for(const [token,start] of starts){
      const kind=start.operationType;
      const autonomous=kind.startsWith('AUTONOMOUS:');
      const operation=autonomous?kind.slice('AUTONOMOUS:'.length):kind;
      const names=ownersForOperation(operation,autonomous?'autonomous':'routed');
      const target=finishes.has(token)?completed:pending;
      for(const owner of names)target.add(owner);
    }
    // F2E2D1: preserve exact, immutable P8 callback history for the eight
    // supplemental owners. No callback receipt is remote-outcome authority.
    const entries=[...starts].sort(([a],[b])=>a.localeCompare(b)).map(([token,start])=>{
      const autonomous=start.operationType.startsWith('AUTONOMOUS:');
      const kind=autonomous?start.operationType.slice('AUTONOMOUS:'.length)
        :start.operationType;
      const names=ownersForOperation(kind,autonomous?'autonomous':'routed');
      const finish=finishes.get(token);
      return Object.freeze({
        token,operationType:start.operationType,
        workerInstanceId:start.workerInstanceId,startedAtMs:start.startedAtMs,
        completedAtMs:finish?.completedAtMs ?? null,
        state:finish?'callback-finished':'unfinished',
        owners:Object.freeze([...names])
      });
    });
    return {pending,completed,entries:Object.freeze(entries),
      journalRevision:JSON.stringify(two)};
  }
  const PROFILE_KEYS=Object.freeze(['activeDetectedProfileV1','selectedInventoryProfileV1']);
  const PROFILE=/^[A-Za-z0-9_-]{1,128}$/;
  const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const active=reason=>Object.freeze({state:'active',reason});
  const unknown=reason=>Object.freeze({state:'unknown',reason});
  function create({storageLocal,storageSession,workerInstanceId=null,clock=()=>Date.now(),
    queryBrowserTabsReadOnly=null,readAccountPageStatusReadOnly=null,
    createManagedWorkerTab=null,waitForTabComplete=null,
    ensureContentConnection=null,closeManagedWorkerTab=null,
    myAdsProjectsUrl=null,tabLoadTimeoutMs=null,
    readNativeTransactionReadOnly=null,getAtomicAdmissionCoordinator=null,
    verifyFreshPhase4RemoteOutcomeReadOnly=null}={}) {
    if(typeof storageLocal?.get!=='function'||typeof storageSession?.get!=='function'
       ||typeof clock!=='function')throw Error('supplemental owner observer requires read-only storage and clock');
    const pending=new Map(OWNERS.map(n=>[n,0]));
    const worker=typeof workerInstanceId==='string'&&PROFILE.test(workerInstanceId)?workerInstanceId:null;
    const preparedRemoteWitnesses=new WeakMap();
    // A private capability usable only after immutable original P8 validation.
    // Never export this Symbol or accept it from a message or DevTools script.
    const originalCompletedHistory=Symbol('kar171-r1-completed-original-history');
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
              // KAR-171 W3D3B3: second PAGE_STATUS can itself race a tab
              // replacement or selected-profile change. Close that terminal
              // read gap with independent fresh Chrome and storage witnesses.
              // This is still ONLY a read-only historical account observation,
              // not an atomic remote mutation check or updater IDLE proof.
              if(reason==='LIVE_ACCOUNT_PROFILE_MATCH'){
                const [finalTabs,finalProfiles]=await Promise.allSettled([
                  Promise.resolve().then(()=>queryBrowserTabsReadOnly()),
                  storageLocal.get([...PROFILE_KEYS,'profilesV1'])
                ]);
                const finalTabList=finalTabs.status==='fulfilled'
                  ?tabList(finalTabs.value):null;
                if(prior===null||finalTabList===null||prior!==finalTabList)
                  reason='LIVE_ACCOUNT_TABS_CHANGED';
                if(finalProfiles.status!=='fulfilled'||!record(finalProfiles.value)
                  ||stableProfile(local)!==stableProfile(finalProfiles.value))
                  reason='LIVE_ACCOUNT_PROFILE_CHANGED_DURING_READ';
              }
            }
          }
        }
      }
      if(reason==='PROFILE_CHANGED_DURING_READ'||reason==='PROFILE_MISMATCH'
         ||reason.startsWith('LIVE_ACCOUNT_')){
        set('profileTransition',unknown(reason));set('accountTransition',unknown(reason));
      }
      // Historical prior-worker starts are actual durable evidence: a current
      // in-memory Map cannot see tasks abandoned by a terminated MV3 worker.
      // Double-read the raw journal; malformed/torn/unavailable stays UNKNOWN.
      let receiptProof=null;
      // KAR-171 W3C: a historical source's time is sampled AFTER both
      // independent reads. Future old-worker starts/finishes remain UNKNOWN.
      const receiptClock=()=>{try{return clock();}catch{return null;}};
      try {
        const firstReceipts=await storageLocal.get(null);
        const secondReceipts=await storageLocal.get(null);
        receiptProof=ownerReceiptEvidence(firstReceipts,secondReceipts,receiptClock());
      }catch { /* no positive receipt authority from an unavailable source */ }
      if(!receiptProof){
        for(const n of OWNERS)if(o[n].state!=='active')
          o[n]=unknown('DURABLE_ADMISSION_UNVERIFIED');
      }else{
        for(const n of receiptProof.pending)o[n]=active('DURABLE_ADMISSION_UNFINISHED');
        for(const n of receiptProof.completed){
          if(o[n].state!=='active'&&o[n].reason==='NO_AUTHORITATIVE_IDLE_PROOF')
            o[n]=unknown('DURABLE_CALLBACK_SETTLED_REMOTE_UNVERIFIED');
        }
      }
      for(const n of OWNERS)if(pending.get(n)>0)o[n]=active('ACTUAL_IN_FLIGHT_OPERATION');
      const admissionHistory=Object.freeze(Object.fromEntries(OWNERS.map(name=>{
        const entries=receiptProof?.entries.filter(row=>row.owners.includes(name))||[];
        return [name,Object.freeze({
          state:!receiptProof?'unverified':entries.some(x=>x.state==='unfinished')
            ?'unfinished':entries.length?'callback-finished':'no-records',
          historicalOnly:true,generationAuthority:'unverified',
          remoteOutcome:'unverified',
          sourceRevision:receiptProof?JSON.stringify(entries):null,
          entries:Object.freeze(entries)
        })];
      })));
      const tick=clock();
      return Object.freeze({
        schema:1,eligibleForLease:false,observedAtMs:Number.isSafeInteger(tick)&&tick>=0?tick:null,
        observations:Object.freeze(o),
        admissionJournalRevision:receiptProof?.journalRevision ?? null,
        admissionHistory,
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
      // Two read-only owner observers must independently see the SAME
      // immutable P8 ledger; neither one can attest completeness alone.
      // A drift, missing producer or malformed source destroys ALL positive
      // historical callback claims, while ACTIVE observations remain intact.
      const revision=persisted?.admissionJournalRevision;
      const consistent=typeof revision==='string'
        &&revision===additional?.admissionJournalRevision;
      const admissionHistory=Object.freeze(Object.fromEntries(
        [...PERSISTED_OWNERS,...OWNERS].map(name=>{
          const source=PERSISTED_OWNERS.includes(name)?persisted:additional;
          const item=source?.admissionHistory?.[name];
          const valid=consistent&&record(item)&&item.historicalOnly===true
            &&item.generationAuthority==='unverified'
            &&item.remoteOutcome==='unverified'
            &&Array.isArray(item.entries)
            &&['callback-finished','unfinished','no-records'].includes(item.state)
            &&typeof item.sourceRevision==='string';
          return [name,valid?item:Object.freeze({
            state:'unverified',historicalOnly:true,
            generationAuthority:'unverified',remoteOutcome:'unverified',
            sourceRevision:null,entries:Object.freeze([])
          })];
        })
      ));
      // F2E2D2A: correlate real remote-journal terminal receipts with actual
      // P8 start/finish history. The two producers each independently re-read
      // their immutable rows. Worker generation + chronological overlap are
      // only NECESSARY evidence, NEVER sufficient to identify an operation:
      // remote intents do not carry P8 admission tokens. Do not report an
      // exact link, prior-worker closure, a current live site result, or IDLE.
      const remote=persisted?.remoteOutcomeEvidence;
      const validRemote=consistent&&record(remote)&&remote.historicalOnly===true
        &&remote.liveAccountVerified===false
        &&record(remote.phase4)&&record(remote.publish)
        &&Array.isArray(remote.phase4.revisions)
        &&Array.isArray(remote.publish.revisions);
      // This is strictly a historical LOCAL selected/detected-profile check.
      // The source does not certify a live authenticated account at this time.
      const sourceProfile=persisted?.context?.profile;
      const sameStoredProfile=record(sourceProfile)
        &&sourceProfile.reason==='STORED_PROFILES_MATCH_BUT_LIVE_UNVERIFIED'
        &&typeof sourceProfile.profileId==='string'
        &&PROFILE.test(sourceProfile.profileId);
      function lineageFor(owner){
        const history=admissionHistory[owner];
        const sources=owner==='renewal'
          ?[remote?.phase4,remote?.publish]:[remote?.publish];
        const base={historicalOnly:true,eligibleForLease:false,
          exactAttemptBound:false,priorGenerationClosed:false,
          liveRemoteVerified:false};
        if(!validRemote||!sameStoredProfile
          ||!['callback-finished','no-records'].includes(history?.state)
          ||sources.some(source=>!['missing','resolved'].includes(source?.state)))
          return Object.freeze({...base,state:'unverified',entries:Object.freeze([])});
        const resolutions=sources.flatMap(source=>source.revisions)
          .filter(row=>row?.owner===owner);
        if(!resolutions.length)
          return Object.freeze({...base,state:'no-evidence',entries:Object.freeze([])});
        const validRow=row=>record(row)&&row.owner===owner
          &&typeof row.profileId==='string'&&row.profileId===sourceProfile.profileId
          &&typeof row.intentWorkerInstanceId==='string'
          &&PROFILE.test(row.intentWorkerInstanceId)
          &&typeof row.attemptId==='string'&&PROFILE.test(row.attemptId)
          &&(row.admissionToken===null
            ||(typeof row.admissionToken==='string'
              &&PROFILE.test(row.admissionToken)
              &&row.admissionToken.length>=12))
          &&typeof row.sourceRevision==='string'&&row.sourceRevision.length>0
          &&Number.isSafeInteger(row.intentCreatedAtMs)&&row.intentCreatedAtMs>=0
          &&Number.isSafeInteger(row.verifiedAtMs)
          &&row.verifiedAtMs>=row.intentCreatedAtMs
          &&typeof row.sourceAdId==='string'
          &&typeof row.newAdId==='string'&&/^\d+$/.test(row.newAdId)
          &&(owner==='archiveInsertion'||/^\d+$/.test(row.sourceAdId));
        if(!resolutions.every(validRow))
          return Object.freeze({...base,state:'unverified',entries:Object.freeze([])});
        const entries=resolutions.map(row=>{
          const candidates=history.entries.filter(receipt=>
            receipt.workerInstanceId===row.intentWorkerInstanceId
            &&(row.admissionToken===null||receipt.token===row.admissionToken)
            &&Number.isSafeInteger(receipt.startedAtMs)
            &&receipt.startedAtMs<=row.intentCreatedAtMs
            // A matching token with an unfinished P8 admission is not an
            // old-worker completion. The independently verified remote
            // result must also have existed no later than P8 finally().
            &&receipt.state==='callback-finished'
            &&Number.isSafeInteger(receipt.completedAtMs)
            &&receipt.completedAtMs>=row.verifiedAtMs
          );
          return Object.freeze({
            owner,attemptId:row.attemptId,profileId:row.profileId,
            sourceAdId:row.sourceAdId,newAdId:row.newAdId,
            intentWorkerInstanceId:row.intentWorkerInstanceId,
            intentCreatedAtMs:row.intentCreatedAtMs,
            remoteSourceRevision:row.sourceRevision,
            admissionToken:row.admissionToken,
            candidateCount:candidates.length,
            // This is an exact HISTORIC original token readback only. No
            // current account / prior-generation-closure / updater authority.
            exactAttemptBound:row.admissionToken!==null&&candidates.length===1,
            state:row.admissionToken!==null
              ?(candidates.length===1?'token-bound-historical':'unverified')
              :candidates.length>1?'ambiguous-generation-overlap'
                :candidates.length===1?'possible-generation-overlap'
                  :'no-generation-overlap'
          });
        });
        // An unmatched explicit token is a hard contradiction, not permission
        // to fall back to generation/time overlap or to present partial proof.
        if(entries.some(entry=>entry.admissionToken!==null&&entry.state==='unverified'))
          return Object.freeze({...base,state:'unverified',entries:Object.freeze([])});
        const distinct=new Set(entries.map(entry=>entry.state));
        return Object.freeze({
          ...base,
          state:distinct.size===1?[...distinct][0]:'mixed-unbound',
          entries:Object.freeze(entries)
        });
      }
      const remoteAdmissionLineage=Object.freeze({
        historicalOnly:true,eligibleForLease:false,
        exactAttemptBound:false,priorGenerationClosed:false,
        liveRemoteVerified:false,
        renewal:lineageFor('renewal'),
        archiveInsertion:lineageFor('archiveInsertion')
      });
      const tick=clock();
      return Object.freeze({
        schema:1,eligibleForLease:false,
        observedAtMs:Number.isSafeInteger(tick)&&tick>=0?tick:null,
        observations:Object.freeze(observations),
        admissionJournalRevision:consistent?revision:null,
        admissionHistory,
        remoteAdmissionLineage,
        context:Object.freeze({
          profile:Object.freeze({state:'unverified',reason:'LIVE_ACCOUNT_NOT_ATOMICALLY_BOUND'}),
          worker:Object.freeze({state:'unverified',reason:workerReason,workerInstanceId:worker||null})
        })
      });
    }
    // KAR-99 P1.3: narrowly scoped, non-authorizing local completion evidence.
    // GET_DIAGNOSTIC_EXPORT is an awaited routed handler. Its P8 finish is
    // proof of callback settlement, never of consumer delivery or 15-owner
    // IDLE. Re-read the real durable P8 journal and local in-flight tracker;
    // missing/altered history must remain unverified across worker restarts.
    async function inspectDiagnosticExportClosureReadOnly() {
      const denied=reason=>Object.freeze({schema:1,owner:'diagnosticExport',
        status:'unverified',reason,eligibleForLease:false,sourceRevision:null});
      if(pending.get('diagnosticExport')!==0)
        return denied('ACTUAL_IN_FLIGHT_OPERATION');
      let first,second;
      try {first=await observe();second=await observe();}
      catch {return denied('SOURCE_UNAVAILABLE');}
      if(pending.get('diagnosticExport')!==0)
        return denied('ACTUAL_IN_FLIGHT_OPERATION');
      const a=first?.admissionHistory?.diagnosticExport;
      const b=second?.admissionHistory?.diagnosticExport;
      if(!record(a)||!record(b)||!first.admissionJournalRevision
        ||first.admissionJournalRevision!==second.admissionJournalRevision
        ||typeof a.sourceRevision!=='string'||!a.sourceRevision
        ||a.sourceRevision!==b.sourceRevision)
        return denied('DURABLE_ADMISSION_UNVERIFIED');
      if(a.state!=='callback-finished'||b.state!=='callback-finished'
        ||!Array.isArray(a.entries)||a.entries.length===0
        ||!Array.isArray(b.entries)||b.entries.length!==a.entries.length)
        return denied(a.state==='unfinished'||b.state==='unfinished'
          ?'DURABLE_ADMISSION_UNFINISHED':'NO_COMPLETION_RECEIPT');
      if(first.observations?.diagnosticExport?.state==='active'
        ||second.observations?.diagnosticExport?.state==='active')
        return denied('ACTUAL_IN_FLIGHT_OPERATION');
      // The generic/unknown operation fallback maps to all eight owners.
      // Do not misattribute its callback-finish receipt to an export.
      if(!a.entries.every(row=>record(row)&&row.operationType==='GET_DIAGNOSTIC_EXPORT'
        &&row.state==='callback-finished'
        &&typeof row.workerInstanceId==='string'&&PROFILE.test(row.workerInstanceId)
        &&Number.isSafeInteger(row.startedAtMs)&&row.startedAtMs>=0
        &&Number.isSafeInteger(row.completedAtMs)
        &&row.completedAtMs>=row.startedAtMs))
        return denied('OWNER_PROVENANCE_UNVERIFIED');
      return Object.freeze({schema:1,owner:'diagnosticExport',
        status:'callback-settled',reason:'DURABLE_P8_CALLBACK_FINISHED',
        eligibleForLease:false,sourceRevision:a.sourceRevision,
        completedReceiptCount:a.entries.length,
        priorGenerationClosed:false,consumerDeliveryVerified:false});
    }
    // P1.3 trashMutation: classify only already-finished LOCAL P8 callbacks.
    // A callback finish is not an IndexedDB transaction readback, an account
    // or prior-worker generation attestation, and NEVER grants updater IDLE.
    // FINISH_RENEWAL_REPLACEMENT and backup imports share this owner but may
    // have independent remote/multi-owner effects: deliberately exclude them.
    async function inspectTrashMutationClosureReadOnly() {
      const denied=reason=>Object.freeze({schema:1,owner:'trashMutation',
        status:'unverified',reason,eligibleForLease:false,sourceRevision:null});
      if(pending.get('trashMutation')!==0)
        return denied('ACTUAL_IN_FLIGHT_OPERATION');
      let first,second;
      try {first=await observe();second=await observe();}
      catch {return denied('SOURCE_UNAVAILABLE');}
      if(pending.get('trashMutation')!==0)
        return denied('ACTUAL_IN_FLIGHT_OPERATION');
      const a=first?.admissionHistory?.trashMutation;
      const b=second?.admissionHistory?.trashMutation;
      if(!record(a)||!record(b)||!first.admissionJournalRevision
        ||first.admissionJournalRevision!==second.admissionJournalRevision
        ||typeof a.sourceRevision!=='string'||!a.sourceRevision
        ||a.sourceRevision!==b.sourceRevision)
        return denied('DURABLE_ADMISSION_UNVERIFIED');
      if(a.state!=='callback-finished'||b.state!=='callback-finished'
        ||!Array.isArray(a.entries)||a.entries.length===0
        ||!Array.isArray(b.entries)||b.entries.length!==a.entries.length)
        return denied(a.state==='unfinished'||b.state==='unfinished'
          ?'DURABLE_ADMISSION_UNFINISHED':'NO_COMPLETION_RECEIPT');
      if(first.observations?.trashMutation?.state==='active'
        ||second.observations?.trashMutation?.state==='active')
        return denied('ACTUAL_IN_FLIGHT_OPERATION');
      const localOperations=new Set([
        'DELETE_INVENTORY','DELETE_TRASH_ENTRY','RESET_TRASH_RETENTION',
        'CLEAR_INVENTORIES','REMOVE_REPLACEMENT_READY_LOCAL',
        'DISCARD_RENEWAL_DRAFT','AUTONOMOUS:trash-purge-boot',
        'AUTONOMOUS:trash-purge-startup','AUTONOMOUS:trash-purge-installed'
      ]);
      if(!a.entries.every(row=>record(row)&&localOperations.has(row.operationType)
        &&row.state==='callback-finished'
        &&typeof row.workerInstanceId==='string'&&PROFILE.test(row.workerInstanceId)
        &&Number.isSafeInteger(row.startedAtMs)&&row.startedAtMs>=0
        &&Number.isSafeInteger(row.completedAtMs)
        &&row.completedAtMs>=row.startedAtMs))
        return denied('OWNER_PROVENANCE_UNVERIFIED');
      return Object.freeze({schema:1,owner:'trashMutation',
        status:'callback-settled',reason:'DURABLE_P8_LOCAL_CALLBACK_FINISHED',
        eligibleForLease:false,sourceRevision:a.sourceRevision,
        completedReceiptCount:a.entries.length,
        indexedDbCommitVerified:false,priorGenerationClosed:false});
    }
    // P1.3 singleInventory: historical P8 callbacks only. Some admitted
    // operations can outlive the handler through tabs, content scripts or
    // remote listing reads; no result, database or generation authority here.
    async function inspectSingleInventoryClosureReadOnly() {
      const denied=reason=>Object.freeze({schema:1,owner:'singleInventory',
        status:'unverified',reason,eligibleForLease:false,sourceRevision:null});
      if(pending.get('singleInventory')!==0)
        return denied('ACTUAL_IN_FLIGHT_OPERATION');
      let first,second;
      try {first=await observe();second=await observe();}
      catch {return denied('SOURCE_UNAVAILABLE');}
      if(pending.get('singleInventory')!==0)
        return denied('ACTUAL_IN_FLIGHT_OPERATION');
      const a=first?.admissionHistory?.singleInventory;
      const b=second?.admissionHistory?.singleInventory;
      if(!record(a)||!record(b)||!first.admissionJournalRevision
        ||first.admissionJournalRevision!==second.admissionJournalRevision
        ||typeof a.sourceRevision!=='string'||!a.sourceRevision
        ||a.sourceRevision!==b.sourceRevision)
        return denied('DURABLE_ADMISSION_UNVERIFIED');
      if(a.state!=='callback-finished'||b.state!=='callback-finished'
        ||!Array.isArray(a.entries)||a.entries.length===0
        ||!Array.isArray(b.entries)||b.entries.length!==a.entries.length)
        return denied(a.state==='unfinished'||b.state==='unfinished'
          ?'DURABLE_ADMISSION_UNFINISHED':'NO_COMPLETION_RECEIPT');
      if(first.observations?.singleInventory?.state==='active'
        ||second.observations?.singleInventory?.state==='active')
        return denied('ACTUAL_IN_FLIGHT_OPERATION');
      // Only explicit, audited single-inventory routed operations qualify
      // for historical callback attribution. A generic/unknown route
      // conservatively maps to ALL owners and cannot qualify for any one.
      const routed=new Set([
        'SAVE_INVENTORY','CAPTURE_SINGLE_INVENTORY',
        'REFRESH_INVENTORY','CHECK_INVENTORY_ONLINE_STATUS'
      ]);
      if(!a.entries.every(row=>record(row)&&routed.has(row.operationType)
        &&row.state==='callback-finished'
        &&typeof row.workerInstanceId==='string'&&PROFILE.test(row.workerInstanceId)
        &&Number.isSafeInteger(row.startedAtMs)&&row.startedAtMs>=0
        &&Number.isSafeInteger(row.completedAtMs)
        &&row.completedAtMs>=row.startedAtMs))
        return denied('OWNER_PROVENANCE_UNVERIFIED');
      return Object.freeze({schema:1,owner:'singleInventory',
        status:'callback-settled',reason:'DURABLE_P8_CALLBACK_FINISHED',
        eligibleForLease:false,sourceRevision:a.sourceRevision,
        completedReceiptCount:a.entries.length,
        localCommitVerified:false,remoteListingVerified:false,
        priorGenerationClosed:false,detachedTabWorkVerified:false});
    }
    // P1.3: an immutable P8 callback finish is merely historical evidence.
    // It does NOT attest profile commit, the authenticated live Kleinanzeigen
    // account, consumer delivery, previous MV3 worker clearance, or IDLE.
    async function inspectTransitionCallbackClosureReadOnly(owner,operations) {
      const denied=reason=>Object.freeze({schema:1,owner,status:'unverified',
        reason,eligibleForLease:false,sourceRevision:null});
      if(pending.get(owner)!==0)return denied('ACTUAL_IN_FLIGHT_OPERATION');
      let first,second;
      try {first=await observe();second=await observe();}
      catch {return denied('SOURCE_UNAVAILABLE');}
      if(pending.get(owner)!==0)return denied('ACTUAL_IN_FLIGHT_OPERATION');
      const a=first?.admissionHistory?.[owner];
      const b=second?.admissionHistory?.[owner];
      if(!record(a)||!record(b)||!first.admissionJournalRevision
        ||first.admissionJournalRevision!==second.admissionJournalRevision
        ||typeof a.sourceRevision!=='string'||!a.sourceRevision
        ||a.sourceRevision!==b.sourceRevision)
        return denied('DURABLE_ADMISSION_UNVERIFIED');
      if(a.state!=='callback-finished'||b.state!=='callback-finished'
        ||!Array.isArray(a.entries)||a.entries.length===0
        ||!Array.isArray(b.entries)||b.entries.length!==a.entries.length)
        return denied(a.state==='unfinished'||b.state==='unfinished'
          ?'DURABLE_ADMISSION_UNFINISHED':'NO_COMPLETION_RECEIPT');
      if(first.observations?.[owner]?.state==='active'
        ||second.observations?.[owner]?.state==='active')
        return denied('ACTUAL_IN_FLIGHT_OPERATION');
      // Managed tabs have an additional independent physical Chrome source.
      // Historical callback evidence cannot override a registry/browser
      // contradiction found during either read-only owner observation.
      if(owner==='managedTabs'){
        const accepted=v=>v?.state==='unknown'
          &&['NO_AUTHORITATIVE_IDLE_PROOF',
            'DURABLE_CALLBACK_SETTLED_REMOTE_UNVERIFIED'].includes(v.reason);
        if(!accepted(first.observations?.managedTabs)
          ||!accepted(second.observations?.managedTabs))
          return denied('CURRENT_TABS_OBSERVER_UNVERIFIED');
      }
      // Two source observations must agree about profile context. A known
      // account/profile mismatch must never become positive source evidence.
      const p=first.context?.profile,q=second.context?.profile;
      if(!record(p)||!record(q)||p.reason!==q.reason||p.profileId!==q.profileId)
        return denied('ACCOUNT_PROFILE_CONTEXT_DRIFT');
      if(['PROFILE_MISMATCH','PROFILE_CHANGED_DURING_READ',
        'LIVE_ACCOUNT_PROFILE_NAME_MISMATCH','LIVE_ACCOUNT_TABS_DISAGREE',
        'LIVE_ACCOUNT_PROFILE_CHANGED_DURING_READ',
        'LIVE_ACCOUNT_STATUS_CHANGED_DURING_READ'].includes(p.reason))
        return denied('ACCOUNT_PROFILE_CONTRADICTION');
      if(!a.entries.every(row=>record(row)&&operations.has(row.operationType)
        &&row.state==='callback-finished'
        &&typeof row.workerInstanceId==='string'&&PROFILE.test(row.workerInstanceId)
        &&Number.isSafeInteger(row.startedAtMs)&&row.startedAtMs>=0
        &&Number.isSafeInteger(row.completedAtMs)
        &&row.completedAtMs>=row.startedAtMs))
        return denied('OWNER_PROVENANCE_UNVERIFIED');
      return Object.freeze({schema:1,owner,status:'callback-settled',
        reason:'DURABLE_P8_CALLBACK_FINISHED',eligibleForLease:false,
        sourceRevision:a.sourceRevision,completedReceiptCount:a.entries.length,
        priorGenerationClosed:false,liveAccountVerified:false,
        profileCommitVerified:false,consumerDeliveryVerified:false});
    }
    async function inspectProfileTransitionClosureReadOnly() {
      // Exclude multi-owner recognition, backup import/delete and assignment.
      return inspectTransitionCallbackClosureReadOnly('profileTransition',
        new Set(['SET_SELECTED_PROFILE']));
    }
    async function inspectAccountTransitionClosureReadOnly() {
      // Site authentication and the existing profile gate remain authoritative.
      return inspectTransitionCallbackClosureReadOnly('accountTransition',
        new Set(['RECOGNIZE_PROFILE','PROBE_LIVE_KLEINANZEIGEN_ACCOUNT']));
    }
    // KAR-99 P1.3: exact historical autonomous bulk-recovery callbacks.
    // Reuse the double-read, same-revision P8 source/provenance checks;
    // callback settlement does not prove any durable recovery result.
    // Routed emergency resets, remote/detached renewals and every unknown
    // operation are deliberately not eligible for this finite evidence.
    async function inspectEmergencyRecoveryClosureReadOnly() {
      const historical=await inspectTransitionCallbackClosureReadOnly(
        'emergencyRecovery',new Set([
          'AUTONOMOUS:bulk-runtime-recovery',
          'AUTONOMOUS:bulk-watchdog'
        ]));
      return Object.freeze({...historical,
        eligibleForLease:false,recoveryStateVerified:false,
        priorGenerationClosed:false,detachedWorkVerified:false});
    }
    // KAR-99 P1.3: two INDEPENDENT real tab sources are necessary even
    // for classifying historical tab-close callbacks. This method observes
    // actual Chrome tabs and the raw session registry; it creates no tabs,
    // navigates no page, performs no recovery and grants no updater authority.
    // A completed P8 handler is not proof that detached work or any previous
    // MV3 worker generation has finished all its operations.
    async function inspectManagedTabsClosureReadOnly() {
      const owner='managedTabs';
      const denied=reason=>Object.freeze({schema:1,owner,status:'unverified',
        reason,eligibleForLease:false,sourceRevision:null,
        liveTabsReconciled:false,verifiedUnmanagedTabCount:null,
        priorGenerationClosed:false,detachedWorkVerified:false,
        remoteWorkVerified:false});
      if(pending.get(owner)!==0)return denied('ACTUAL_IN_FLIGHT_OPERATION');
      // A registry may change BETWEEN two individually self-consistent
      // observations. Pin the actual raw session source across the entire
      // P8 plus Chrome verification interval, not merely within each pass.
      const keys=['tabRegistryV1','managedWorkerTabsV1'];
      let initialRegistry;
      try {initialRegistry=await storageSession.get(keys);}
      catch {return denied('CURRENT_TABS_UNVERIFIED');}
      if(!record(initialRegistry)||!record(initialRegistry.tabRegistryV1)
        ||!record(initialRegistry.managedWorkerTabsV1))
        return denied('CURRENT_TABS_UNVERIFIED');
      const registryRevision=JSON.stringify([
        initialRegistry.tabRegistryV1,initialRegistry.managedWorkerTabsV1
      ]);
      const history=await inspectTransitionCallbackClosureReadOnly(owner,
        new Set(['BULK_CLOSE_WORKER','AUTONOMOUS:tab-removed']));
      if(history.status!=='callback-settled')
        return denied(history.reason||'DURABLE_ADMISSION_UNVERIFIED');
      if(pending.get(owner)!==0)return denied('ACTUAL_IN_FLIGHT_OPERATION');
      let first,second,final,again;
      try {
        first=await readVerifiedUnmanagedTabsReadOnly();
        second=await readVerifiedUnmanagedTabsReadOnly();
        // Re-read immutable P8 owner journal AFTER Chrome/session checks so
        // a new admitted callback cannot race a formerly completed receipt.
        again=await observe();
        final=await readVerifiedUnmanagedTabsReadOnly();
      } catch {return denied('CURRENT_TABS_UNVERIFIED');}
      if(pending.get(owner)!==0)return denied('ACTUAL_IN_FLIGHT_OPERATION');
      const signature=tabs=>JSON.stringify(tabs.map(tab=>[
        tab.id,tab.managed,tab.ownershipVerified,tab.sourceRevision]));
      if(signature(first)!==signature(second)
        ||signature(first)!==signature(final))
        return denied('CURRENT_TABS_CHANGED_DURING_READ');
      const receipt=again?.admissionHistory?.[owner];
      if(!record(receipt)||receipt.state!=='callback-finished'
        ||receipt.sourceRevision!==history.sourceRevision
        ||again.observations?.managedTabs?.state!=='unknown'
        ||!['NO_AUTHORITATIVE_IDLE_PROOF',
          'DURABLE_CALLBACK_SETTLED_REMOTE_UNVERIFIED']
          .includes(again.observations?.managedTabs?.reason))
        return denied('DURABLE_ADMISSION_CHANGED_DURING_TABS_READ');
      const profile=again.context?.profile;
      if(!record(profile)||
        ['PROFILE_MISMATCH','PROFILE_CHANGED_DURING_READ',
          'LIVE_ACCOUNT_PROFILE_NAME_MISMATCH',
          'LIVE_ACCOUNT_TABS_DISAGREE',
          'LIVE_ACCOUNT_PROFILE_CHANGED_DURING_READ',
          'LIVE_ACCOUNT_STATUS_CHANGED_DURING_READ'].includes(profile.reason))
        return denied('ACCOUNT_PROFILE_CONTEXT_UNVERIFIED');
      let finalRegistry;
      try {finalRegistry=await storageSession.get(keys);}
      catch {return denied('CURRENT_TABS_UNVERIFIED');}
      if(!record(finalRegistry)||!record(finalRegistry.tabRegistryV1)
        ||!record(finalRegistry.managedWorkerTabsV1)
        ||JSON.stringify([
          finalRegistry.tabRegistryV1,finalRegistry.managedWorkerTabsV1
        ])!==registryRevision)
        return denied('SESSION_REGISTRY_CHANGED_DURING_READ');
      return Object.freeze({
        ...history,reason:'DURABLE_P8_CALLBACK_AND_LIVE_TABS_RECONCILED',
        eligibleForLease:false,liveTabsReconciled:true,
        verifiedUnmanagedTabCount:first.length,priorGenerationClosed:false,
        detachedWorkVerified:false,remoteWorkVerified:false
      });
    }
    // KAR-99 P1.3: actual persisted local NativeHost update fence lifecycle.
    // A read-only released tombstone is not an independently inspected
    // host transaction, rollback completion, or an all-owner IDLE lease.
    // Production NativeHost only supports health/check. Do not call recover(),
    // request native transport, write storage, or promote local release to IDLE.
    async function inspectNativeUpdateTransactionClosureReadOnly() {
      const owner='nativeUpdateTransaction';
      // The actual Windows inspector is independent of Chrome's local fence.
      // Only a *negative* authenticated NativeHost result can strengthen a
      // BLOCKED observation. Neither a legacy receipt nor a missing journal
      // supplies MV3 transaction ID, Worker generation, rollback or IDLE.
      // The trusted private NativeHost transport is checked *before* and
      // *after* the independently repeated local fence/profile observations.
      // A transaction that appears, disappears, or changes between these
      // read-only probes must never be laundered through a stale local tombstone.
      const readNativeEvidence=async()=>{
        if(typeof readNativeTransactionReadOnly!=='function')return null;
        try{
          const h=await readNativeTransactionReadOnly();
          if(h?.ok===true&&h.operation==='inspect_transaction'
            &&['blocked','unverified'].includes(h.status)
            &&['present','absent','unknown'].includes(h.journal)
            &&['present','absent','unknown'].includes(h.lock)
            &&['present','absent','unknown'].includes(h.receipt)
            &&h.identityBound===false&&h.nativeOutcomeVerified===false
            &&h.rollbackVerified===false&&h.eligibleForLease===false){
            return Object.freeze({
              status:h.status,journal:h.journal,lock:h.lock,receipt:h.receipt,
              transactionPhase:h.transactionPhase,
              journalFingerprint:h.journalFingerprint,
              receiptFingerprint:h.receiptFingerprint,
              // Manual updater evidence is separate from the immutable MV3
              // origin token, P8 record and prior Worker generation.
              manualTransaction:h.manualTransaction ?? null,
              manualTransactionId:h.manualTransactionId ?? null,
              manualTransactionFingerprint:h.manualTransactionFingerprint ?? null,
              manualTransactionOrigin:h.manualTransactionOrigin ?? null,
              manualReceiptMatches:h.manualReceiptMatches === true,
              identityBound:false
            });
          }
        }catch{/* Unavailable native source is unknown, never IDLE. */}
        return null;
      };
      let nativeHostEvidence=await readNativeEvidence();
      const result=(status,reason,more={})=>Object.freeze({
        schema:1,owner,
        status:nativeHostEvidence?.status==='blocked'?'blocked':status,
        reason:nativeHostEvidence?.status==='blocked'
          ?'NATIVE_HOST_TRANSACTION_BLOCKED':reason,
        eligibleForLease:false,nativeHostEvidence,
        transactionState:null,sourceRevision:null,localReleaseRecorded:false,
        nativeHostOutcomeVerified:false,noPendingApplyVerified:false,
        noPendingRollbackVerified:false,priorGenerationClosed:false,...more
      });
      if(pending.get(owner)!==0)
        return result('blocked','ACTUAL_IN_FLIGHT_OPERATION');
      const keys=['nativeUpdateWorkflowFenceV1',...PROFILE_KEYS];
      let initial,prior,following,again,final;
      try {
        initial=await storageLocal.get(keys);
        prior=await observe();
        following=await storageLocal.get(keys);
        again=await observe();
        final=await storageLocal.get(keys);
      } catch {return result('unverified','NATIVE_FENCE_SOURCE_UNAVAILABLE');}
      if(pending.get(owner)!==0)
        return result('blocked','ACTUAL_IN_FLIGHT_OPERATION');
      if(!record(initial)||!record(following)||!record(final)
        ||JSON.stringify(initial)!==JSON.stringify(following)
        ||JSON.stringify(initial)!==JSON.stringify(final))
        return result('unverified','NATIVE_FENCE_SOURCE_CHANGED_DURING_READ');
      const fence=initial.nativeUpdateWorkflowFenceV1;
      if(fence===undefined||fence===null)
        return result('unverified','NATIVE_FENCE_ABSENT');
      if(!record(fence)||fence.schema!==1
        ||!['reserved','cancelled','released'].includes(fence.state))
        return result('unverified','NATIVE_FENCE_RECORD_CORRUPT');
      const required=['schema','state','token','profileId','workerGeneration',
        'transactionId','createdAtMs','expiresAtMs'];
      if(fence.state!=='reserved')required.push('cancelledAtMs');
      if(fence.state==='released')required.push('releasedAtMs');
      const validId=x=>typeof x==='string'&&PROFILE.test(x);
      const validTime=x=>Number.isSafeInteger(x)&&x>=0;
      if(Object.keys(fence).length!==required.length
        ||!required.every(k=>Object.hasOwn(fence,k))
        ||!validId(fence.token)||fence.token.length<12
        ||!validId(fence.profileId)||!validId(fence.workerGeneration)
        ||!validId(fence.transactionId)
        ||!validTime(fence.createdAtMs)||!validTime(fence.expiresAtMs)
        ||fence.expiresAtMs<fence.createdAtMs
        ||(fence.state!=='reserved'
          &&(!validTime(fence.cancelledAtMs)
            ||fence.cancelledAtMs<fence.createdAtMs)))
        return result('unverified','NATIVE_FENCE_RECORD_CORRUPT');
      if(fence.state==='reserved'||fence.state==='cancelled')
        return result('blocked','PERSISTED_NATIVE_UPDATE_TRANSACTION',{
          transactionState:fence.state
        });
      let tick;
      try {tick=clock();}
      catch {return result('unverified','NATIVE_FENCE_TIME_UNVERIFIED');}
      if(!validTime(fence.releasedAtMs)
        ||fence.releasedAtMs<fence.cancelledAtMs
        ||!validTime(tick)||fence.releasedAtMs>tick)
        return result('unverified','NATIVE_FENCE_RECORD_CORRUPT');
      const selected=initial.selectedInventoryProfileV1;
      const detected=initial.activeDetectedProfileV1;
      if(!record(selected)||!record(detected)
        ||!validId(selected.profileId)||!validId(detected.profileId)
        ||selected.profileId!==fence.profileId
        ||detected.profileId!==fence.profileId)
        return result('unverified','NATIVE_FENCE_PROFILE_UNVERIFIED');
      const previous=prior?.context?.profile;
      const current=again?.context?.profile;
      const forbidden=new Set([
        'PROFILE_MISMATCH','PROFILE_CHANGED_DURING_READ',
        'LIVE_ACCOUNT_PROFILE_NAME_MISMATCH','LIVE_ACCOUNT_TABS_DISAGREE',
        'LIVE_ACCOUNT_PROFILE_CHANGED_DURING_READ',
        'LIVE_ACCOUNT_STATUS_CHANGED_DURING_READ'
      ]);
      if(!record(previous)||!record(current)
        ||previous.reason!==current.reason
        ||previous.profileId!==current.profileId
        ||forbidden.has(previous.reason)
        ||prior?.observations?.nativeUpdateTransaction?.state==='active'
        ||again?.observations?.nativeUpdateTransaction?.state==='active')
        return result('unverified','NATIVE_FENCE_CONTEXT_UNVERIFIED');
      // A local release is historical only. Still re-read the independent
      // NativeHost source after storage/profile/tab reads: file-state changes,
      // transport loss or a new pending Windows update invalidate that view.
      if(typeof readNativeTransactionReadOnly==='function'){
        const after=await readNativeEvidence();
        if(nativeHostEvidence?.status==='blocked'||after?.status==='blocked'){
          nativeHostEvidence=after?.status==='blocked'?after:nativeHostEvidence;
          return result('blocked','NATIVE_HOST_TRANSACTION_BLOCKED');
        }
        if(!nativeHostEvidence||!after){
          const changed=Boolean(nativeHostEvidence);
          nativeHostEvidence=null;
          return result('unverified',changed
            ?'NATIVE_HOST_SOURCE_CHANGED_DURING_READ'
            :'NATIVE_HOST_SOURCE_UNAVAILABLE');
        }
        if(JSON.stringify(nativeHostEvidence)!==JSON.stringify(after)){
          nativeHostEvidence=null;
          return result('unverified','NATIVE_HOST_SOURCE_CHANGED_DURING_READ');
        }
        nativeHostEvidence=after;
      }
      return result('local-release-recorded',
        'DURABLE_LOCAL_NATIVE_FENCE_RELEASE_TOMBSTONE',{
          transactionState:'released',localReleaseRecorded:true,
          sourceRevision:JSON.stringify([fence,detected.profileId,selected.profileId])
        });
    }
    // KAR-171 W3D1: compose the actual seven persisted and eight supplemental
    // owner witnesses into a single READ-ONLY historical closure matrix. This
    // is intentionally NOT an all-idle producer, update lease, apply route,
    // authenticated current account certificate or old-worker termination
    // oracle. Each owner still requires independent positive sources later.
    async function inspectAllOwnerClosureReadOnly(persistedObserver,request=undefined) {
      const capture=async()=>{
      const names=[...PERSISTED_OWNERS,...OWNERS];
      // Bracket all 15 independent owner inspectors with fresh, actual
      // P8/remote observations plus both stored and live-profile producers.
      // A worker restart, profile switch or remote admission during this
      // interval invalidates every historical callback claim.
      const safe=async action=>{
        try {return typeof action==='function'?await action():null;}
        catch {return null;}
      };
      // KAR-171 W3D2B: independently bracket the real persisted workflow
      // and MV3 session stores used by the seven-owner inspectors. Their
      // serialized local/session witness cannot substitute unrelated rows.
      const persistedLocalKeys=[
        'bulkInventoryRun','renewalSessionsV1','massRenewalBatchV1',
        'templateFillSessions','archiveInsertionSessionsV1',
        'activeDetectedProfileV1','selectedInventoryProfileV1'
      ];
      const persistedSessionKeys=['bulkRunRuntimeLeaseV1','runtimeEpochV1'];
      const firstPersistedLocal=await safe(()=>storageLocal.get(persistedLocalKeys));
      const firstPersistedSession=await safe(()=>storageSession.get(persistedSessionKeys));
      const firstProfile=await safe(persistedObserver?.observe?.bind(persistedObserver));
      const firstSite=await safe(observe);
      const firstTabs=await safe(readVerifiedUnmanagedTabsReadOnly);
      const first=await safe(()=>observeAll(persistedObserver));
      // Each supplemental inspector is closed over first-party Chrome and
      // durable storage ports; no user-controlled callback can impersonate it.
      const supplementalInspectors=Object.freeze({
        singleInventory:inspectSingleInventoryClosureReadOnly,
        trashMutation:inspectTrashMutationClosureReadOnly,
        managedTabs:inspectManagedTabsClosureReadOnly,
        profileTransition:inspectProfileTransitionClosureReadOnly,
        accountTransition:inspectAccountTransitionClosureReadOnly,
        diagnosticExport:inspectDiagnosticExportClosureReadOnly,
        emergencyRecovery:inspectEmergencyRecoveryClosureReadOnly,
        nativeUpdateTransaction:inspectNativeUpdateTransactionClosureReadOnly
      });
      const persistedInspector=persistedObserver?.inspectPersistedOwnerCallbackClosureReadOnly;
      const individual=Object.create(null);
      for(const name of names) {
        const inspector=PERSISTED_OWNERS.includes(name)
          ? (typeof persistedInspector==='function'
            ?()=>persistedInspector.call(persistedObserver,name):null)
          : supplementalInspectors[name];
        individual[name]=await safe(inspector);
      }
      const last=await safe(()=>observeAll(persistedObserver));
      const lastTabs=await safe(readVerifiedUnmanagedTabsReadOnly);
      const lastProfile=await safe(persistedObserver?.observe?.bind(persistedObserver));
      const lastSite=await safe(observe);
      const lastPersistedLocal=await safe(()=>storageLocal.get(persistedLocalKeys));
      const lastPersistedSession=await safe(()=>storageSession.get(persistedSessionKeys));
      const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
      const persistedSourcesStable=record(firstPersistedLocal)
        &&record(lastPersistedLocal)
        &&record(firstPersistedSession)&&record(lastPersistedSession)
        &&same(firstPersistedLocal,lastPersistedLocal)
        &&same(firstPersistedSession,lastPersistedSession);
      const observedProfile=record(firstProfile?.context?.profile)
        &&record(lastProfile?.context?.profile)
        &&same(firstProfile.context.profile,lastProfile.context.profile);
      const observedSite=record(firstSite?.context?.profile)
        &&record(lastSite?.context?.profile)
        &&same(firstSite.context.profile,lastSite.context.profile);
      const browserTabsReconciled=Array.isArray(firstTabs)
        &&Array.isArray(lastTabs)&&same(firstTabs,lastTabs);
      // A stable *wrong* authenticated account is still a contradiction.
      // Historical P8 closure must not be presented as reconciled with the
      // owner's current profile when PAGE_STATUS explicitly disagrees.
      const contradictoryAccount=new Set([
        'PROFILE_MISMATCH','PROFILE_CHANGED_DURING_READ',
        'LIVE_ACCOUNT_PROFILE_NAME_MISMATCH','LIVE_ACCOUNT_TABS_DISAGREE',
        'LIVE_ACCOUNT_PROFILE_CHANGED_DURING_READ',
        'LIVE_ACCOUNT_STATUS_CHANGED_DURING_READ','LIVE_ACCOUNT_TABS_CHANGED'
      ]);
      const profileNotContradicted=observedProfile&&observedSite
        &&firstProfile.context.profile.reason==='STORED_PROFILES_MATCH_BUT_LIVE_UNVERIFIED'
        &&firstSite.context.profile.profileId===firstProfile.context.profile.profileId
        &&!contradictoryAccount.has(firstSite.context.profile.reason);
      const historicalStable=first?.schema===1&&last?.schema===1
        &&typeof first.admissionJournalRevision==='string'
        &&first.admissionJournalRevision===last.admissionJournalRevision
        &&record(first.admissionHistory)&&record(last.admissionHistory)
        &&same(first.admissionHistory,last.admissionHistory)
        &&record(first.remoteAdmissionLineage)&&record(last.remoteAdmissionLineage)
        &&same(first.remoteAdmissionLineage,last.remoteAdmissionLineage)
        &&same(first.context?.worker,last.context?.worker)
        &&profileNotContradicted&&persistedSourcesStable;
      // KAR-171 W3D2A: an owner-specific historical callback is acceptable
      // as HISTORY only if its independent inspector attests the exact same
      // P8 journal/owner-subset revision as both aggregate observations.
      // A matching callback count or a truthy sourceRevision is not identity.
      // Persisted inspectors encode [P8 revision, owner revision, profile,
      // local snapshot, session snapshot], while supplemental inspectors
      // return the owner revision directly. Neither is a positive IDLE proof.
      const witnessMatchesHistory=(name,witness,history)=>{
        if(!record(witness)||typeof witness.sourceRevision!=='string'
          ||typeof history?.sourceRevision!=='string'
          ||!history.sourceRevision)return false;
        if(!PERSISTED_OWNERS.includes(name))
          return witness.sourceRevision===history.sourceRevision;
        try {
          const parts=JSON.parse(witness.sourceRevision);
          return Array.isArray(parts)&&parts.length===5
            &&parts[0]===first.admissionJournalRevision
            &&parts[1]===history.sourceRevision
            &&parts[2]===firstProfile?.context?.profile?.profileId
            &&record(parts[3])&&record(parts[4])
            &&same(parts[3],firstPersistedLocal)
            &&same(parts[4],firstPersistedSession);
        }catch{return false;}
      };
      const owners=Object.create(null);
      for(const name of names){
        const witness=individual[name];
        const before=first?.admissionHistory?.[name];
        const after=last?.admissionHistory?.[name];
        const states=[first?.observations?.[name]?.state,
          last?.observations?.[name]?.state,
          firstProfile?.observations?.[name]?.state,
          lastProfile?.observations?.[name]?.state,
          firstSite?.observations?.[name]?.state,
          lastSite?.observations?.[name]?.state];
        const active=states.includes('active')
          ||before?.state==='unfinished'||after?.state==='unfinished'
          ||witness?.status==='blocked';
        // KAR-171 W3D3B1: a completed P8 callback is historical ONLY;
        // if the same owner has real remote intent/resolution evidence,
        // do not classify its ownership as reconciled merely because a
        // previous worker and remote journal overlap in time. Require
        // the observer's own independent immutable P8-token binding.
        // Even token-bound-history NEVER proves current remote/account IDLE.
        const remoteSensitive=name==='renewal'||name==='archiveInsertion';
        const lineage=remoteSensitive?first?.remoteAdmissionLineage?.[name]:null;
        const remoteLineageState=remoteSensitive
          ?(historicalStable&&typeof lineage?.state==='string'
            ?lineage.state:'unverified'):null;
        const remoteHistoryCompatible=!remoteSensitive
          ||remoteLineageState==='no-evidence'
          ||(remoteLineageState==='token-bound-historical'
            &&Array.isArray(lineage?.entries)&&lineage.entries.length>0
            &&lineage.entries.every(entry=>entry?.owner===name
              &&entry.exactAttemptBound===true
              &&entry.state==='token-bound-historical'
              &&typeof entry.admissionToken==='string'
              &&entry.admissionToken.length>=12));
        const complete=historicalStable&&remoteHistoryCompatible&&record(witness)
          &&witness.schema===1&&witness.owner===name
          &&witness.status==='callback-settled'&&witness.eligibleForLease===false
          &&witnessMatchesHistory(name,witness,before)
          &&before?.state==='callback-finished'
          &&Array.isArray(before.entries)&&before.entries.length>0
          &&before.entries.length===witness.completedReceiptCount
          &&after?.state==='callback-finished'
          &&before.entries.every(row=>row.state==='callback-finished'
            &&Array.isArray(row.owners)&&row.owners.includes(name));
        const status=active?'blocked':complete?'historical-callback-settled':'unverified';
        owners[name]=Object.freeze({
          owner:name,status,
          reason:active?'ACTIVE_OR_UNFINISHED_OWNER'
            :remoteSensitive&&!remoteHistoryCompatible?'REMOTE_LINEAGE_UNVERIFIED'
              :complete?'DURABLE_HISTORICAL_CALLBACK_ONLY'
                :'OWNER_OR_CROSS_SOURCE_UNVERIFIED',
          remoteLineageState,
          sourceRevision:complete?witness.sourceRevision:null,
          completedReceiptCount:complete?before.entries.length:0,
          eligibleForLease:false,priorGenerationClosed:false,
          currentLiveAccountVerified:false,remoteOutcomeVerified:false,
          nativeHostOutcomeVerified:false
        });
      }
      const blocked=names.some(name=>owners[name].status==='blocked');
      return Object.freeze({
        schema:1,status:blocked?'blocked':'unverified',
        ownerCount:names.length,owners:Object.freeze(owners),
        sourcesStable:Boolean(historicalStable),
        // Independent current Chrome/session evidence stays separate from
        // historical P8 callbacks; missing/drifting tabs can never be IDLE.
        browserTabsReconciled:Boolean(browserTabsReconciled),
        historicalCallbackCount:names.filter(name=>
          owners[name].status==='historical-callback-settled').length,
        sourceRevision:historicalStable?first.admissionJournalRevision:null,
        storedProfileId:historicalStable?firstProfile.context.profile.profileId??null:null,
        liveAccountStatus:historicalStable?firstSite.context.profile.reason:null,
        eligibleForLease:false,priorGenerationClosed:false,
        currentLiveAccountVerified:false,remoteOutcomeVerified:false,
        nativeHostOutcomeVerified:false
      });
      };
      // KAR-171 W3D3A: default remains historical-only and may be inspected
      // without a lock; a caller explicitly requiring the real origin lock
      // must not fall back to an unguarded snapshot on any failure.
      if(request===undefined)return capture();
      const unavailable=()=>{
        const error=new Error('KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE');
        error.code='KR_UPDATE_FENCE_ATOMIC_UNAVAILABLE';
        return error;
      };
      if(!record(request)||Object.keys(request).length!==1
        ||request.requireAtomicAdmission!==true
        ||!worker||typeof getAtomicAdmissionCoordinator!=='function')
        throw unavailable();
      let coordinator;
      try{coordinator=getAtomicAdmissionCoordinator();}
      catch{throw unavailable();}
      if(typeof coordinator?.guardReserve!=='function')throw unavailable();
      // P8 guardReserve owns the existing exact origin Web Lock, double-reads
      // immutable journals, rejects prior unfinished starts and checks Worker
      // identity. Keep the entire 15-owner/account/Chrome capture INSIDE its
      // callback; this is never a positive update lease.
      return coordinator.guardReserve(capture,worker);
    }
    // R1: prepare a fresh, owned, authenticated My Ads context BEFORE the
    // shared origin Web Lock is entered. No navigation or remote mutation is
    // allowed while the lock is held. The short-lived handle never persists
    // to storage, crosses a message boundary or authorizes updater IDLE.
    function remoteCommitIdentity(original,sourceKind){
      if(!record(original)||!['phase4','publish'].includes(sourceKind))return null;
      const workflowId=sourceKind==='phase4'?original.renewalId:original.workflowId;
      if(typeof workflowId!=='string'||!PROFILE.test(workflowId)||
         typeof original.profileId!=='string'||!original.profileId.trim()||
         typeof original.sourceAdId!=='string')return null;
      const workerId=original.workerInstanceId??null;
      const p8Token=original.admissionToken??null;
      if((workerId!==null&&(!PROFILE.test(workerId)||typeof workerId!=='string'))||
         (p8Token!==null&&(!PROFILE.test(p8Token)||typeof p8Token!=='string')))
        return null;
      // The staged witness is owned by this EXACT persisted remote attempt.
      // Origin Worker and P8 token cannot be substituted while reusing its tab.
      return JSON.stringify([sourceKind,workflowId,original.attemptId??null,
        workerId,p8Token,original.fillId??null,
        original.profileId,original.sourceAdId,
        original.newAdId??null,original.targetTabId??null]);
    }
    async function prepareRemoteCommitContextReadOnly(original,sourceKind){
      const identity=remoteCommitIdentity(original,sourceKind);
      if(!identity||typeof myAdsProjectsUrl!=='string'||!isMyAdsTab({url:myAdsProjectsUrl})||
          !Number.isSafeInteger(tabLoadTimeoutMs)||tabLoadTimeoutMs<=0||
          [createManagedWorkerTab,waitForTabComplete,ensureContentConnection,
            closeManagedWorkerTab,readAccountPageStatusReadOnly,
            queryBrowserTabsReadOnly].some(fn=>typeof fn!=='function'))
        throw Error('KR_REMOTE_COMMIT_WITNESS_UNAVAILABLE');
      let tabId=null;
      try{
        const archive=sourceKind==='publish'&&original.kind==='archive';
        const t=await createManagedWorkerTab({
          url:myAdsProjectsUrl,active:false
        },'r1-independent-commit-account',{
          ownerType:archive?'archive-insertion':'renewal',
          ownerId:sourceKind==='phase4'?original.renewalId:original.workflowId,
          phaseAttemptId:original.attemptId,readOnly:true
        });
        if(!Number.isSafeInteger(t?.id)||t.id<=0)
          throw Error('KR_REMOTE_COMMIT_WITNESS_UNVERIFIED');
        tabId=t.id;
        await waitForTabComplete(tabId,{timeoutMs:tabLoadTimeoutMs,
          purpose:'r1-independent-commit-account',
          label:'Unabhängiger Kontonachweis',operation:'read-only-account',
          context:{workerTabId:tabId}});
        await ensureContentConnection({tabId});
        const status=await readAccountPageStatusReadOnly(tabId);
        if(!record(status)||status.pageType!=='my-ads'||
          status.auth?.loggedIn!==true||!label(status.profileName)||
          !isMyAdsTab({url:status.url}))
          throw Error('KR_REMOTE_COMMIT_WITNESS_UNVERIFIED');
        let closed=false;
        const witness=Object.freeze({tabId,close:async()=>{
          if(closed)return;
          closed=true;
          preparedRemoteWitnesses.delete(witness);
          await closeManagedWorkerTab(tabId);
        }});
        preparedRemoteWitnesses.set(witness,Object.freeze({
          identity,url:status.url,profileName:label(status.profileName)
        }));
        return witness;
      }catch(e){
        if(tabId)await Promise.resolve().then(()=>closeManagedWorkerTab(tabId)).catch(()=>{});
        throw e;
      }
    }
    async function stagedTabIsCurrent(witness,identity){
      const binding=record(witness)?preparedRemoteWitnesses.get(witness):null;
      if(!binding||binding.identity!==identity||
          !Number.isSafeInteger(witness.tabId)||witness.tabId<=0||
          typeof queryBrowserTabsReadOnly!=='function')return false;
      try{
        const tabs=await queryBrowserTabsReadOnly();
        if(!Array.isArray(tabs)||tabs.filter(t=>record(t)&&
          t.id===witness.tabId&&t.url===binding.url&&isMyAdsTab(t)).length!==1)
          return false;
        // Browser URL identity alone is insufficient: the authenticated
        // account may change while the same My Ads tab URL stays unchanged.
        const status=await readAccountPageStatusReadOnly(witness.tabId);
        return record(status)&&status.pageType==='my-ads'&&
          status.url===binding.url&&status.auth?.loggedIn===true&&
          label(status.profileName)===binding.profileName;
      }catch{return false;}
    }
// R1 private, read-only COMMIT witness: this is account/profile continuity,
// NEVER a 15-owner IDLE certificate or permission to reserve/apply updates.
// It reads already-open authenticated My Ads tabs through the established
// owner observer. No tab creation, profile mutation, NativeHost or IPC.
async function verifyRemoteCommitContextReadOnly(original, sourceKind, witness=null, historyProof=null, onRejected=null) {
  // The Kleinanzeigen-authenticated PAGE_STATUS.profileName is the site-account
  // authority (KAR-99). Local UUIDs bind immutable Manager/P8 provenance; they
  // must never be reported as an independent website login identity.
  // This optional, fixed-code rejection observer is used ONLY by the private
  // R1 read-only check. Normal remote commit callers still receive a boolean.
  const reject=code=>{
    if(typeof onRejected==='function') {
      try { onRejected(code); } catch { /* diagnostics never affect admission */ }
    }
    return false;
  };
  const originalCompletedOnly=historyProof===originalCompletedHistory;
  const isRecord = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  if(!isRecord(original)||!['phase4','publish'].includes(sourceKind))
    return reject('R1_ACCOUNT_ORIGINAL_CONTEXT_UNVERIFIED');
  const identity=remoteCommitIdentity(original,sourceKind);
  if(!identity||(witness!==null&&!(await stagedTabIsCurrent(witness,identity))))
    return reject('R1_ACCOUNT_ORIGINAL_CONTEXT_UNVERIFIED');
  const keys=['profilesV1','activeDetectedProfileV1',
    'selectedInventoryProfileV1','renewalSessionsV1',
    'archiveInsertionSessionsV1','templateFillSessions'];
  let first, observed, last;
  try {
    first=await storageLocal.get(keys);
    observed=await observe();
    last=await storageLocal.get(keys);
  } catch {
    return reject('R1_ACCOUNT_CONTEXT_READ_UNAVAILABLE');
  }
  if(!isRecord(first)||!isRecord(last)||
      (witness!==null&&!(await stagedTabIsCurrent(witness,identity)))||
      JSON.stringify(first)!==JSON.stringify(last))
    return reject('R1_ACCOUNT_PROFILE_CONTEXT_CHANGED');
  if(observed?.schema!==1||observed.eligibleForLease!==false||
      observed.context?.profile?.state!=='matched'||
      observed.context.profile.reason!=='LIVE_ACCOUNT_PROFILE_MATCH'||
      observed.context.worker?.workerInstanceId!==worker)
    return reject('R1_ACCOUNT_LIVE_SITE_OR_PROFILE_UNVERIFIED');
  const profileId=observed.context.profile.profileId;
  const selected=first.selectedInventoryProfileV1;
  const detected=first.activeDetectedProfileV1;
  const profiles=first.profilesV1;
  if(!isRecord(selected)||!isRecord(detected)||
      selected.profileId!==profileId||detected.profileId!==profileId||
      !Array.isArray(profiles))
    return reject('R1_ACCOUNT_LOCAL_UUID_UNVERIFIED');
  const matchingProfiles=profiles.filter(p=>isRecord(p)&&p.profileId===profileId);
  if(matchingProfiles.length!==1)
    return reject('R1_ACCOUNT_LOCAL_UUID_UNVERIFIED');
  const profile=matchingProfiles[0];
  const normalize=x=>label(x);
  if(sourceKind==='phase4') {
    // Original Phase4 records store the site account label; Manager workflow
    // sessions store the internal UUID. This is not a second site account ID.
    const session=first.renewalSessionsV1?.[original.renewalId];
    const sourceNameMatches=normalize(original.profileId)!==''
      &&normalize(profile.displayName)===normalize(original.profileId);
    if(!sourceNameMatches)
      return reject('R1_ACCOUNT_PHASE4_NAME_UNVERIFIED');
    if(originalCompletedOnly)
      return session===undefined?true:reject('R1_ACCOUNT_SESSION_CONTEXT_UNVERIFIED');
    return isRecord(session)&&session.profileId===profileId
      &&String(session.sourceAdId||'')===original.sourceAdId
      &&String(session.newAdId||'')===original.newAdId
      ?true:reject('R1_ACCOUNT_SESSION_CONTEXT_UNVERIFIED');
  }
  // The original publish UUID is immutable P8/workflow correlation, NOT an
  // authentication ID. Preserve the fail-closed binding if it differs.
  if(original.profileId!==profileId)
    return reject('R1_ACCOUNT_PUBLICATION_UUID_UNVERIFIED');
  const archive=original.kind==='archive';
  if(!archive&&original.kind!=='renewal')
    return reject('R1_ACCOUNT_ORIGINAL_CONTEXT_UNVERIFIED');
  const sessions=archive?first.archiveInsertionSessionsV1:first.renewalSessionsV1;
  const session=sessions?.[original.workflowId];
  const fill=first.templateFillSessions?.[original.fillId];
  if(originalCompletedOnly) {
    // Completed Phase4 removes both temporary rows. The private caller
    // separately proves both immutable P8s and both remote resolutions.
    return !archive&&session===undefined&&fill===undefined
      ?true:reject('R1_ACCOUNT_SESSION_CONTEXT_UNVERIFIED');
  }
  return isRecord(session)&&isRecord(fill)&&
    session.fillId===original.fillId&&fill.fillId===original.fillId&&
    String((archive?session.targetProfileId:session.profileId)||'')===profileId&&
    String(session.sourceAdId||'')===original.sourceAdId&&
    Number(session.targetTabId)===original.targetTabId&&
    Number(fill.targetTabId)===original.targetTabId&&
    String(fill.sourceAdId||'')===original.sourceAdId
    ?true:reject('R1_ACCOUNT_SESSION_CONTEXT_UNVERIFIED');
}


    // KAR-171 R1: private, owner-controlled, READ-ONLY original P8 + authenticated
    // source/target proof. Never exposed via Chrome messages, updater policy or
    // an automatic lifecycle call. No journal writes or replayed deletion.
    async function inspectOriginalRenewalRemoteLineageReadOnly({
      renewalId,attemptId,r1PrivateWitnessNonce=null,r1PrivateHoldKind=null
    }={}) {
      const output=(status,liveRemoteVerified=false)=>Object.freeze({
        status,liveRemoteVerified,r1Accepted:false,eligibleForLease:false
      });
      // The owner-only DevTools invocation must explicitly generate a fresh
      // private nonce. This adds no routed/automatic producer or success path.
      if ((r1PrivateWitnessNonce!==null && (
          !/^[0-9a-f]{32}$/.test(r1PrivateWitnessNonce)
          || !worker))
          || (r1PrivateHoldKind!==null && (
            r1PrivateWitnessNonce===null
            || !['source','target'].includes(r1PrivateHoldKind))))
        return output('PRIVATE_WITNESS_CONTEXT_UNVERIFIED');
      const privateR1Witness = r1PrivateWitnessNonce===null ? null : Object.freeze({
        schema:1,nonce:r1PrivateWitnessNonce,workerId:worker,
        ...(r1PrivateHoldKind===null ? {} : {holdKind:r1PrivateHoldKind})
      });
      if(typeof verifyFreshPhase4RemoteOutcomeReadOnly!=='function')
        return output('REMOTE_PROOF_PORT_UNAVAILABLE');
      if(typeof renewalId!=='string'||!PROFILE.test(renewalId)
         ||typeof attemptId!=='string'||!PROFILE.test(attemptId))
        return output('ORIGINAL_ID_UNVERIFIED');
      const PHASE='karPhase4UncertainAttemptV1_';
      const PHASE_RESULT='karPhase4VerifiedResolutionV1_';
      const PUB='karAutoPublishIntentV1_';
      const PUB_RESULT='karAutoPublishVerifiedResolutionV1_';
      const pKey=PHASE+renewalId+'_'+attemptId,prKey=PHASE_RESULT+renewalId+'_'+attemptId;
      const goodId=x=>typeof x==='string'&&PROFILE.test(x);
      const ad=x=>typeof x==='string'&&/^\d+$/.test(x);
      const ms=x=>Number.isSafeInteger(x)&&x>=0;
      const phaseOps=new Set(['AUTONOMOUS:renewal-auto-phase4','AUTONOMOUS:renewal-resume',
        'AUTONOMOUS:renewal-detached-retry','AUTONOMOUS:renewal-detached-verify',
        'AUTONOMOUS:mass-renewal-next-item','RETRY_RENEWAL_VERIFICATION',
        'RETRY_MASS_RENEWAL_ITEM','FINISH_RENEWAL_REPLACEMENT']);
      const pubOps=new Set(['AUTONOMOUS:renewal-publish-detection',
        'AUTONOMOUS:trash-publish-detection','AUTONOMOUS:archive-postpublish-detached',
        'AUTHORIZE_AUTOMATIC_PUBLISH']);
      const hasP8=(rows,intent,allowed)=>{
        const token=intent?.admissionToken;
        if(!goodId(token)||token.length<12||!goodId(intent.workerInstanceId)
            ||!ms(intent.createdAtMs))return false;
        const s=rows[ADMISSION_START+token],f=rows[ADMISSION_FINISH+token];
        return record(s)&&Object.keys(s).length===6&&s.schema===1&&s.state==='admitted'
          &&s.token===token&&s.workerInstanceId===intent.workerInstanceId
          &&goodId(s.token)&&goodId(s.workerInstanceId)
          &&allowed.has(s.operationType)&&ms(s.startedAtMs)&&s.startedAtMs<=intent.createdAtMs
          &&record(f)&&Object.keys(f).length===5&&f.schema===1&&f.state==='completed'
          &&f.token===token&&f.workerInstanceId===intent.workerInstanceId
          &&ms(f.completedAtMs)&&f.completedAtMs>=intent.createdAtMs;
      };
      // Exception phases are diagnostic only. Even a correctly classified
      // failure is never a verified remote outcome or update authority.
      let exceptionPhase='INITIAL_SNAPSHOT';
      try {
        const first=await storageLocal.get(null);
        if(!record(first))return output('ORIGINAL_SNAPSHOT_UNAVAILABLE');
        exceptionPhase='PHASE4_EVIDENCE';
        const phase=first[pKey],resolution=first[prKey];
        if(!record(phase)||phase.schema!==1||phase.state!=='outcome-unverified'
          ||phase.renewalId!==renewalId||phase.attemptId!==attemptId
          ||!goodId(phase.workerInstanceId)||!label(phase.profileId)
          ||!ad(phase.sourceAdId)||!ad(phase.newAdId)||phase.sourceAdId===phase.newAdId
          ||!hasP8(first,phase,phaseOps))
          return output('PHASE4_ORIGINAL_UNVERIFIED');
        if(!record(resolution)||resolution.schema!==1||resolution.state!=='resolved-confirmed'
          ||!goodId(resolution.workerInstanceId)
          ||resolution.renewalId!==renewalId||resolution.attemptId!==attemptId
          ||resolution.profileId!==phase.profileId
          ||resolution.sourceAdId!==phase.sourceAdId||resolution.newAdId!==phase.newAdId
          ||!(resolution.sourceEvidence==='not-in-my-ads-full-pagination-scan'&&Number.isSafeInteger(resolution.sourcePagesScanned)&&resolution.sourcePagesScanned>=1
            ||resolution.sourceEvidence==='detail-page-explicit-deleted'&&resolution.sourcePagesScanned===0)
          ||resolution.targetEvidence!=='found-in-my-ads-full-pagination-scan'
          ||!Number.isSafeInteger(resolution.targetPagesScanned)||resolution.targetPagesScanned<1
          ||!Number.isSafeInteger(resolution.targetFoundPage)||resolution.targetFoundPage<1
          ||resolution.targetFoundPage>resolution.targetPagesScanned
          ||!ms(resolution.verifiedAtMs)||resolution.verifiedAtMs<phase.createdAtMs)
          return output('PHASE4_OUTCOME_UNVERIFIED');
        exceptionPhase='PUBLICATION_EVIDENCE';
        const relevant=Object.entries(first).filter(([key,row])=>
          key.startsWith(PUB)&&record(row)&&row.workflowId===renewalId);
        // Never choose an apparently convenient published attempt among
        // ambiguous same-workflow receipts.
        if(relevant.length!==1)return output('PUBLICATION_AMBIGUOUS_OR_MISSING');
        const [pubKey,publish]=relevant[0];
        if(publish.schema!==1||publish.state!=='outcome-unverified'
          ||publish.kind!=='renewal'||!goodId(publish.fillId)
          ||!goodId(publish.attemptId)||!goodId(publish.workerInstanceId)
          ||pubKey!==PUB+publish.fillId+'_'+publish.attemptId
          ||!goodId(publish.profileId)||!Number.isSafeInteger(publish.targetTabId)
          ||publish.targetTabId<=0||publish.sourceAdId!==phase.sourceAdId
          ||!hasP8(first,publish,pubOps))
          return output('PUBLICATION_ORIGINAL_UNVERIFIED');
        const pubResultKey=PUB_RESULT+publish.fillId+'_'+publish.attemptId;
        const pubResult=first[pubResultKey];
        if(!record(pubResult)||pubResult.schema!==1
          ||pubResult.state!=='resolved-confirmed'||pubResult.kind!=='renewal'
          ||pubResult.fillId!==publish.fillId||pubResult.workflowId!==renewalId
          ||pubResult.attemptId!==publish.attemptId
          ||pubResult.profileId!==publish.profileId
          ||pubResult.sourceAdId!==publish.sourceAdId
          ||pubResult.targetTabId!==publish.targetTabId
          ||pubResult.newAdId!==phase.newAdId||pubResult.targetPresent!==true
          ||!((
            pubResult.targetEvidence==='found-in-my-ads-full-pagination-scan'
            &&Number.isSafeInteger(pubResult.targetPagesScanned)&&pubResult.targetPagesScanned>=1
            &&Number.isSafeInteger(pubResult.targetFoundPage)&&pubResult.targetFoundPage>=1
            &&pubResult.targetFoundPage<=pubResult.targetPagesScanned
            &&!Object.hasOwn(pubResult,'targetEditAdId')&&!Object.hasOwn(pubResult,'targetPublicAdId')
          )||(
            pubResult.targetEvidence==='verified-edit-and-public-listing'
            &&pubResult.targetEditAdId===phase.newAdId&&pubResult.targetPublicAdId===phase.newAdId
            &&!Object.hasOwn(pubResult,'targetPagesScanned')&&!Object.hasOwn(pubResult,'targetFoundPage')
          ))
          ||!ms(pubResult.verifiedAtMs)||pubResult.verifiedAtMs<publish.createdAtMs)
          return output('PUBLICATION_OUTCOME_UNVERIFIED');
        // Completed renewals remove their transient sessions. Only a pair
        // of ABSENT rows qualifies, never a partial/malformed survivor.
        const renewalSession=first.renewalSessionsV1?.[renewalId];
        const fillSession=first.templateFillSessions?.[publish.fillId];
        const bothActive=record(renewalSession)&&record(fillSession);
        const bothRemoved=renewalSession===undefined&&fillSession===undefined;
        if(!bothActive&&!bothRemoved)
          return output('ORIGINAL_SESSION_STATE_UNVERIFIED');
        const historyProof=bothRemoved?originalCompletedHistory:null;
        // The private completed-history capability is obtained only after
        // BOTH original immutable P8s, independent verified outcomes, and
        // exact renewal/source/target/unique publication have passed above.
        // The live UUID/name checks and subsequent fresh scan remain required.
        exceptionPhase='PRESCAN_ACCOUNT';
        let prescanRejected=null;
        const capturePrescanRejection=code=>{if(prescanRejected===null)prescanRejected=code;};
        if(!(await verifyRemoteCommitContextReadOnly(
          phase,'phase4',null,historyProof,capturePrescanRejection)))
          return output(prescanRejected||'LIVE_ACCOUNT_UUID_NAME_UNVERIFIED');
        if(!(await verifyRemoteCommitContextReadOnly(
          publish,'publish',null,historyProof,capturePrescanRejection)))
          return output(prescanRejected||'LIVE_ACCOUNT_UUID_NAME_UNVERIFIED');
        exceptionPhase='REMOTE_SCAN';
        // Independently captured read-only milestones distinguish unavailable
        // My Ads tabs/content/account/roster scans from a later storage readback.
        // Never expose exception text, ad IDs, token, profile or tab data.
        const stageStatus=Object.freeze({
          START:'R1_REMOTE_SCAN_NOT_STARTED',
          SOURCE_TAB_REQUESTED:'R1_REMOTE_SOURCE_TAB_CREATE_FAILED',
          SOURCE_TAB_CREATED:'R1_REMOTE_SOURCE_TAB_LOAD_FAILED',
          SOURCE_TAB_LOADED:'R1_REMOTE_SOURCE_CONTENT_FAILED',
          SOURCE_CONTENT_READY:'R1_REMOTE_SOURCE_ACCOUNT_FAILED',
          SOURCE_ACCOUNT_OK:'R1_REMOTE_SOURCE_QUERY_FAILED',
          SOURCE_QUERY_RETURNED:'R1_REMOTE_SOURCE_ACCOUNT_RECHECK_FAILED',
          SOURCE_ACCOUNT_RECHECKED:'R1_REMOTE_SOURCE_EVIDENCE_FAILED',
          SOURCE_RESULT_VERIFIED:'R1_REMOTE_TARGET_NOT_STARTED',
          TARGET_TAB_REQUESTED:'R1_REMOTE_TARGET_TAB_CREATE_FAILED',
          TARGET_TAB_CREATED:'R1_REMOTE_TARGET_TAB_LOAD_FAILED',
          TARGET_TAB_LOADED:'R1_REMOTE_TARGET_CONTENT_FAILED',
          TARGET_CONTENT_READY:'R1_REMOTE_TARGET_ACCOUNT_FAILED',
          TARGET_ACCOUNT_OK:'R1_REMOTE_TARGET_QUERY_FAILED',
          TARGET_QUERY_RETURNED:'R1_REMOTE_TARGET_ACCOUNT_RECHECK_FAILED',
          TARGET_ACCOUNT_RECHECKED:'R1_REMOTE_TARGET_EVIDENCE_FAILED',
          TARGET_RESULT_VERIFIED:'R1_REMOTE_FINAL_RESPONSE_FAILED'
        });
        let lastStage='START',fresh;
        try {
          fresh=await verifyFreshPhase4RemoteOutcomeReadOnly(
            Object.freeze({...phase}),stage=>{
              if(Object.hasOwn(stageStatus,stage))lastStage=stage;
            },privateR1Witness);
        }catch{
          return output(stageStatus[lastStage]);
        }
        if(!record(fresh)||fresh.profileId!==phase.profileId
          ||fresh.sourceAdId!==phase.sourceAdId||fresh.newAdId!==phase.newAdId
          ||fresh.sourceAbsent!==true||fresh.targetPresent!==true
          ||fresh.sourceEvidence!=='not-in-my-ads-full-pagination-scan'
          ||fresh.targetEvidence!=='found-in-my-ads-full-pagination-scan'
          ||!Number.isSafeInteger(fresh.sourcePagesScanned)||fresh.sourcePagesScanned<1
          ||!Number.isSafeInteger(fresh.targetPagesScanned)||fresh.targetPagesScanned<1
          ||!Number.isSafeInteger(fresh.targetFoundPage)||fresh.targetFoundPage<1
          ||fresh.targetFoundPage>fresh.targetPagesScanned)
          return output('FRESH_SOURCE_TARGET_UNVERIFIED');
        // A genuine tab account switch can race the asynchronous complete
        // roster scan; verify both identities AGAIN, then verify origin rows
        // have not been rewritten or detached from their sessions.
        exceptionPhase='POSTSCAN_ACCOUNT';
        if(!(await verifyRemoteCommitContextReadOnly(phase,'phase4',null,historyProof))
          ||!(await verifyRemoteCommitContextReadOnly(publish,'publish',null,historyProof)))
          return output('LIVE_ACCOUNT_CHANGED_DURING_SCAN');
        exceptionPhase='ORIGINAL_READBACK';
        let last;
        try {last=await storageLocal.get(null);}
        catch {return output('ORIGINAL_READBACK_UNAVAILABLE');}
        if(!record(last))return output('ORIGINAL_READBACK_FAILED');
        exceptionPhase='STABILITY_COMPARE';
        const stableKeys=[pKey,prKey,pubKey,pubResultKey,
          ADMISSION_START+phase.admissionToken,ADMISSION_FINISH+phase.admissionToken,
          ADMISSION_START+publish.admissionToken,ADMISSION_FINISH+publish.admissionToken,
          'profilesV1','activeDetectedProfileV1','selectedInventoryProfileV1',
          'renewalSessionsV1','templateFillSessions'];
        // Repeat PAGE_STATUS and exact P8/session checks are authoritative.
        // Same-account recognition refreshes only these volatile timestamps:
        // ProfileRepository.ensure -> profilesV1.lastSeenAt and
        // activeDetectedProfileV1.detectedAt; a same-ID re-selection can update
        // selectedInventoryProfileV1.selectedAt. They do NOT change identity.
        // Compare every other original/profile field unchanged, including all
        // names, UUIDs, journal receipts, sessions and unknown metadata.
        const stableProfileView=(rows,key)=>{
          const value=rows[key]??null;
          if(key==='profilesV1'&&Array.isArray(value))
            return value.map(item=>{
              if(!record(item))return item;
              const {lastSeenAt,...persistent}=item;
              return persistent;
            });
          if(key==='activeDetectedProfileV1'&&record(value)){
            const {detectedAt,...persistent}=value;
            return persistent;
          }
          if(key==='selectedInventoryProfileV1'&&record(value)){
            const {selectedAt,...persistent}=value;
            return persistent;
          }
          return value;
        };
        if(stableKeys.some(key=>
          JSON.stringify(stableProfileView(first,key))!==
          JSON.stringify(stableProfileView(last,key))))
          return output('ORIGINAL_OR_PROFILE_CHANGED_DURING_SCAN');
        return output('ORIGINAL_ACCOUNT_REMOTE_VERIFIED',true);
      }catch{
        const failClosedStatus={
          INITIAL_SNAPSHOT:'ORIGINAL_INITIAL_SNAPSHOT_UNAVAILABLE',
          PHASE4_EVIDENCE:'ORIGINAL_PHASE4_VALIDATION_UNAVAILABLE',
          PUBLICATION_EVIDENCE:'ORIGINAL_PUBLICATION_VALIDATION_UNAVAILABLE',
          PRESCAN_ACCOUNT:'ORIGINAL_PRESCAN_ACCOUNT_UNAVAILABLE',
          REMOTE_SCAN:'ORIGINAL_REMOTE_GATE_UNAVAILABLE',
          POSTSCAN_ACCOUNT:'ORIGINAL_POSTSCAN_ACCOUNT_UNAVAILABLE',
          ORIGINAL_READBACK:'ORIGINAL_READBACK_UNAVAILABLE',
          STABILITY_COMPARE:'ORIGINAL_STABILITY_CHECK_UNAVAILABLE'
        };
        return output(failClosedStatus[exceptionPhase]||'ORIGINAL_REMOTE_PROOF_UNAVAILABLE');
      }
    }

    return Object.freeze({observe,observeAll,prepareRemoteCommitContextReadOnly,verifyRemoteCommitContextReadOnly,inspectOriginalRenewalRemoteLineageReadOnly,inspectAllOwnerClosureReadOnly,track,snapshotInFlight,readVerifiedUnmanagedTabsReadOnly,inspectDiagnosticExportClosureReadOnly,inspectTrashMutationClosureReadOnly,inspectSingleInventoryClosureReadOnly,inspectProfileTransitionClosureReadOnly,inspectAccountTransitionClosureReadOnly,inspectEmergencyRecoveryClosureReadOnly,inspectManagedTabsClosureReadOnly,inspectNativeUpdateTransactionClosureReadOnly});
  }
  const API=Object.freeze({create,OWNERS,ownersForOperation});
  globalThis.KRDeps?.register?.('KRAdditionalOwnerObserver',API);
  if(typeof module!=='undefined'&&module?.exports)module.exports=API;
})();
