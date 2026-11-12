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
  function ownerReceiptEvidence(first,second){
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
          ||!Number.isSafeInteger(row.startedAtMs)||row.startedAtMs<0)return null;
        starts.set(row.token,row);
      }else{
        if(key!==ADMISSION_FINISH+row.token||row.state!=='completed'
          ||!Number.isSafeInteger(row.completedAtMs)||row.completedAtMs<0)return null;
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
      // Historical prior-worker starts are actual durable evidence: a current
      // in-memory Map cannot see tasks abandoned by a terminated MV3 worker.
      // Double-read the raw journal; malformed/torn/unavailable stays UNKNOWN.
      let receiptProof=null;
      try {
        const firstReceipts=await storageLocal.get(null);
        const secondReceipts=await storageLocal.get(null);
        receiptProof=ownerReceiptEvidence(firstReceipts,secondReceipts);
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
        if(!validRemote||!sameStoredProfile||history?.state==='unverified'
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
            &&(receipt.completedAtMs===null
              ||(Number.isSafeInteger(receipt.completedAtMs)
                &&receipt.completedAtMs>=row.intentCreatedAtMs))
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
    return Object.freeze({observe,observeAll,track,snapshotInFlight,readVerifiedUnmanagedTabsReadOnly,inspectDiagnosticExportClosureReadOnly,inspectTrashMutationClosureReadOnly,inspectSingleInventoryClosureReadOnly,inspectProfileTransitionClosureReadOnly,inspectAccountTransitionClosureReadOnly});
  }
  const API=Object.freeze({create,OWNERS,ownersForOperation});
  globalThis.KRDeps?.register?.('KRAdditionalOwnerObserver',API);
  if(typeof module!=='undefined'&&module?.exports)module.exports=API;
})();
