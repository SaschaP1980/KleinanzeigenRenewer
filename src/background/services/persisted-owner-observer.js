// KAR-105: raw, non-mutating persisted workflow evidence.
// This is intentionally NOT a KAR-97 owner attestation or an update lease source.
// Until complete cross-worker in-flight, profile and generation closure exists,
// it can report positively observed ACTIVE or UNKNOWN, never IDLE.
(() => {
  'use strict';
  const OWNERS = Object.freeze([
    'bulkInventory', 'bulkReconciliation', 'renewal', 'massRenewal',
    'templateFill', 'archiveInsertion', 'insertionLock'
  ]);
  const LOCAL_KEYS = Object.freeze([
    'bulkInventoryRun', 'renewalSessionsV1', 'massRenewalBatchV1',
    'templateFillSessions', 'archiveInsertionSessionsV1'
  ]);
  const SESSION_KEYS = Object.freeze(['bulkRunRuntimeLeaseV1', 'runtimeEpochV1']);

  // KAR-99 P1.3-F2D: this table MUST match the actual background autonomous
  // admission owner mapping. A routed admission holds all seven owners.
  // Treat any new/unknown autonomous operation as all-seven until audited.
  const AUTONOMOUS_RECEIPT_OWNERS = Object.freeze({
  'bulk-runtime-recovery': ['bulkInventory', 'bulkReconciliation'],
  'bulk-watchdog': ['bulkInventory'],
  'renewal-resume': ['renewal', 'insertionLock'],
  'renewal-detached-verify': ['renewal', 'insertionLock'],
  'renewal-detached-retry': ['renewal', 'insertionLock'],
  'renewal-auto-phase4': ['renewal', 'insertionLock'],
  'renewal-publish-detection': ['renewal', 'templateFill', 'archiveInsertion', 'insertionLock'],
  'mass-resume': ['massRenewal', 'insertionLock'],
  'mass-renewal-next-item': ['massRenewal', 'insertionLock'],
  'mass-renewal-watchdog-timer': ['massRenewal', 'insertionLock'],
  'renewal-phase1-retry': ['renewal', 'templateFill', 'insertionLock'],
  'archive-resume': ['archiveInsertion', 'templateFill', 'insertionLock'],
  'archive-postpublish-detached': ['archiveInsertion', 'templateFill', 'insertionLock'],
  'template-error-terminalize': ['renewal', 'templateFill', 'archiveInsertion', 'insertionLock'],
  // Tab-driven paths can update several persisted sessions or reload a managed
  // worker; conservatively hold every candidate owner until the handler settles.
  'trash-publish-detection': ['templateFill', 'insertionLock'],
  'tab-removed': ['bulkInventory', 'bulkReconciliation', 'renewal', 'templateFill', 'archiveInsertion', 'insertionLock'],
  'tab-lifecycle-update': ['bulkInventory', 'bulkReconciliation', 'renewal', 'massRenewal', 'templateFill', 'archiveInsertion', 'insertionLock']
});
  const ADMISSION_START = 'karAtomicAdmissionStartV1_';
  const ADMISSION_FINISH = 'karAtomicAdmissionFinishV1_';
  const RECEIPT_ID = /^[A-Za-z0-9_-]{1,128}$/;
  function immutableOwnerReceipts(first, second) {
    if (!isRecord(first) || !isRecord(second)) return null;
    const pick = rows => Object.entries(rows)
      .filter(([key]) => key.startsWith(ADMISSION_START) || key.startsWith(ADMISSION_FINISH))
      .sort(([a],[b]) => a.localeCompare(b));
    const a = pick(first), b = pick(second);
    // No storage write, expiry or migration. A torn/altered journal is UNKNOWN.
    if (JSON.stringify(a) !== JSON.stringify(b)) return null;
    const starts = new Map(), finishes = new Map();
    const valid = v => typeof v === 'string' && RECEIPT_ID.test(v);
    for (const [key, row] of b) {
      if (!isRecord(row) || row.schema !== 1 || !valid(row.token)
        || !valid(row.workerInstanceId)) return null;
      if (key.startsWith(ADMISSION_START)) {
        if (key !== ADMISSION_START + row.token || row.state !== 'admitted'
          || typeof row.operationType !== 'string' || !row.operationType
          || row.operationType.length > 128
          || !Number.isSafeInteger(row.startedAtMs) || row.startedAtMs < 0)
          return null;
        starts.set(row.token, row);
      } else {
        if (key !== ADMISSION_FINISH + row.token || row.state !== 'completed'
          || !Number.isSafeInteger(row.completedAtMs) || row.completedAtMs < 0)
          return null;
        finishes.set(row.token, row);
      }
    }
    for (const [token, row] of finishes) {
      const start = starts.get(token);
      if (!start || row.workerInstanceId !== start.workerInstanceId
        || row.completedAtMs < start.startedAtMs) return null;
    }
    const pending = new Set(), completed = new Set();
    for (const [token, start] of starts) {
      const autonomous = start.operationType.startsWith('AUTONOMOUS:');
      const kind = autonomous ? start.operationType.slice('AUTONOMOUS:'.length) : '';
      const names = autonomous && Object.hasOwn(AUTONOMOUS_RECEIPT_OWNERS, kind)
        ? AUTONOMOUS_RECEIPT_OWNERS[kind] : OWNERS;
      for (const name of names) (finishes.has(token) ? completed : pending).add(name);
    }
    // F2E2D1: the real double-read P8 journal supplies historic start/finish
    // provenance, not a certificate that an old worker or remote job is idle.
    const entries = [...starts].sort(([a],[b])=>a.localeCompare(b))
      .map(([token, start]) => {
        const autonomous = start.operationType.startsWith('AUTONOMOUS:');
        const kind = autonomous ? start.operationType.slice('AUTONOMOUS:'.length) : '';
        const owners = autonomous && Object.hasOwn(AUTONOMOUS_RECEIPT_OWNERS,kind)
          ? AUTONOMOUS_RECEIPT_OWNERS[kind] : OWNERS;
        const finish = finishes.get(token);
        return Object.freeze({
          token, operationType:start.operationType,
          workerInstanceId:start.workerInstanceId,
          startedAtMs:start.startedAtMs,
          completedAtMs:finish?.completedAtMs ?? null,
          state:finish?'callback-finished':'unfinished',
          owners:Object.freeze([...owners])
        });
      });
    return {pending, completed, entries:Object.freeze(entries),
      journalRevision:JSON.stringify(b)};
  }
  const PROFILE_KEYS = Object.freeze(['activeDetectedProfileV1', 'selectedInventoryProfileV1']);
  const PROFILE_ID = /^[A-Za-z0-9_-]{1,128}$/;
  const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const active = reason => Object.freeze({state: 'active', reason});
  const unknown = reason => Object.freeze({state: 'unknown', reason});

  function create({storageLocal, storageSession, clock = () => Date.now(), workerInstanceId = null} = {}) {
    if (typeof storageLocal?.get !== 'function' || typeof storageSession?.get !== 'function'
      || typeof clock !== 'function') throw new Error('persisted owner observer requires read-only storage and clock');
    const pending = new Map(OWNERS.map(name => [name, 0]));
    // A fresh *in-process* ID is not a persisted MV3-generation attestation.
    const localInstanceId = typeof workerInstanceId === 'string' && PROFILE_ID.test(workerInstanceId)
      ? workerInstanceId : null;
    function snapshotInFlight() {
      return Object.freeze(Object.fromEntries(OWNERS.map(name => [name, pending.get(name)])));
    }
    async function track(owners, task) {
      const names = Array.isArray(owners) ? owners : [owners];
      if (!names.length || typeof task !== 'function' || new Set(names).size !== names.length
        || !names.every(name => pending.has(name)))
        throw new Error('persisted owner tracker requires known owner(s) and task');
      // Entry is synchronous even though track() returns a Promise.
      for (const name of names) pending.set(name, pending.get(name) + 1);
      try {
        return await task();
      } finally {
        for (const name of names) pending.set(name, pending.get(name) - 1);
      }
    }
    function hasLiveSession(v) {
      if (!isRecord(v)) return null;
      for (const session of Object.values(v)) {
        if (!isRecord(session) || typeof session.status !== 'string' || !session.status)
          return null;
        if (!['complete', 'cancelled', 'replaced'].includes(session.status)) return true;
        // A terminal persisted session is NOT a proof of no in-flight callbacks.
      }
      return false;
    }
    function inspectSessions(value, label) {
      const ongoing = hasLiveSession(value);
      return ongoing === true ? active(label + '_NONTERMINAL') : unknown(
        ongoing === null ? label + '_INVALID_OR_ABSENT' : label + '_NO_AUTHORITATIVE_IDLE_PROOF'
      );
    }
    async function observe() {
      // This is an observation only: no storage writes, sweeps, expiries,
      // account probing or auto-recovery mutating getters.
      const [localRead, sessionRead, journalRead] = await Promise.allSettled([
        storageLocal.get([...LOCAL_KEYS, ...PROFILE_KEYS]), storageSession.get([...SESSION_KEYS]),
        // Dynamic immutable attempt keys require read-only enumeration.
        storageLocal.get(null)
      ]);
      const local = localRead.status === 'fulfilled' && isRecord(localRead.value) ? localRead.value : null;
      const session = sessionRead.status === 'fulfilled' && isRecord(sessionRead.value) ? sessionRead.value : null;
      // A second profile read detects a change during the observation. Identical
      // reads are NOT atomic and cannot certify the live website account or
      // that a prior Service Worker has completed all detached work.
      const profileRecheck = await Promise.allSettled([storageLocal.get([...PROFILE_KEYS])]);
      const laterProfiles = profileRecheck[0].status === 'fulfilled' && isRecord(profileRecheck[0].value)
        ? profileRecheck[0].value : null;
      const observedAtMs = clock();
      const counts = snapshotInFlight();
      const result = Object.create(null);
      const set = (name, evidence) => {
        result[name] = counts[name] > 0 ? active('IN_FLIGHT_ADMISSION') : evidence;
      };
      if (!local) {
        for (const name of OWNERS) set(name, unknown('STORAGE_UNAVAILABLE'));
      } else {
        const bulk = local.bulkInventoryRun;
        const lease = session?.bulkRunRuntimeLeaseV1;
        const sessionEpoch = session?.runtimeEpochV1;
        if (!session) {
          set('bulkInventory', unknown('SESSION_STORAGE_UNAVAILABLE'));
        } else if (isRecord(bulk) && (bulk.status === 'running' || Boolean(bulk.retryAdId))) {
          // A worker restart does not erase an observed persisted running run.
          set('bulkInventory', active('PERSISTED_BULK_RUNNING'));
        } else if (isRecord(lease) && lease.runId && isRecord(bulk) && lease.runId === bulk.runId
          && typeof sessionEpoch === 'string' && sessionEpoch === lease.runtimeEpoch) {
          set('bulkInventory', active('PERSISTED_BULK_LEASE'));
        } else {
          set('bulkInventory', unknown('BULK_NO_AUTHORITATIVE_IDLE_PROOF'));
        }
        if (isRecord(bulk) && (/reconcil/i.test(String(bulk.stage || ''))
          || (isRecord(bulk.reconciliation) && !['complete', 'cancelled'].includes(String(bulk.reconciliation.status || ''))))) {
          set('bulkReconciliation', active('PERSISTED_RECONCILIATION'));
        } else {
          set('bulkReconciliation', unknown('RECONCILIATION_NO_AUTHORITATIVE_IDLE_PROOF'));
        }
        set('renewal', inspectSessions(local.renewalSessionsV1, 'RENEWAL'));
        const mass = local.massRenewalBatchV1;
        if (isRecord(mass) && (mass.status === 'running'
          || (Array.isArray(mass.items) && mass.items.some(item =>
            isRecord(item) && ['queued', 'running', 'retrying'].includes(item.status))))) {
          set('massRenewal', active('PERSISTED_MASS_PENDING'));
        } else {
          set('massRenewal', unknown('MASS_NO_AUTHORITATIVE_IDLE_PROOF'));
        }
        set('templateFill', inspectSessions(local.templateFillSessions, 'TEMPLATE_FILL'));
        set('archiveInsertion', inspectSessions(local.archiveInsertionSessionsV1, 'ARCHIVE_INSERTION'));
        const insertionBusy = ['renewal', 'massRenewal', 'templateFill', 'archiveInsertion']
          .some(name => result[name].state === 'active');
        set('insertionLock', insertionBusy
          ? active('PERSISTED_INSERTION_OWNER_ACTIVE')
          : unknown('INSERTION_LOCK_NO_AUTHORITATIVE_IDLE_PROOF'));
      }
      // F2E2: independently re-read the actual immutable remote intent and
      // verified-resolution journals. The first and second complete snapshots
      // must agree on EVERY remote journal row, including old-worker entries.
      // These durable receipts are read-only historical evidence, not a fresh
      // authenticated Kleinanzeigen outcome or permission to mark an owner IDLE.
      let remoteRecheck = null;
      try {
        const value = await storageLocal.get(null);
        if (isRecord(value)) remoteRecheck = value;
      } catch { /* no positive remote proof when storage is unavailable */ }
      const remotePrefixes = [
        'karPhase4UncertainAttemptV1_', 'karPhase4VerifiedResolutionV1_',
        'karAutoPublishIntentV1_', 'karAutoPublishVerifiedResolutionV1_'
      ];
      const remoteEntries = rows => Object.entries(rows)
        .filter(([key]) => remotePrefixes.some(prefix => key.startsWith(prefix)))
        .sort(([a],[b]) => a.localeCompare(b));
      const firstRemote = journalRead.status === 'fulfilled' && isRecord(journalRead.value)
        ? journalRead.value : null;
      const remoteState = !firstRemote || !remoteRecheck ? 'unavailable'
        : JSON.stringify(remoteEntries(firstRemote)) ===
          JSON.stringify(remoteEntries(remoteRecheck)) ? 'stable' : 'changed';
      const sourceProfile = value => isRecord(value) && typeof value.profileId === 'string'
        && PROFILE_ID.test(value.profileId) ? value.profileId : null;
      const firstActive = sourceProfile(local?.activeDetectedProfileV1);
      const firstSelected = sourceProfile(local?.selectedInventoryProfileV1);
      const laterActive = sourceProfile(laterProfiles?.activeDetectedProfileV1);
      const laterSelected = sourceProfile(laterProfiles?.selectedInventoryProfileV1);
      const stableProfile = firstActive && firstActive === firstSelected
        && firstActive === laterActive && firstActive === laterSelected
        ? firstActive : null;
      // A receipt from an earlier Worker generation is positive BUSY evidence
      // even if the renewal session no longer appears in this process.
      // Corruption and read failure must never masquerade as an empty journal.
      // Original immutable intent is NEVER cleared. Only a second, independently
      // verified, exact-identity immutable receipt can classify it as resolved.
      const prefix = 'karPhase4UncertainAttemptV1_';
      const resolutionPrefix = 'karPhase4VerifiedResolutionV1_';
      // F2E2C: expose concrete historical independently verified terminal
      // source revisions, NEVER an all-owner IDLE or current-account proof.
      // A revision covers the complete immutable intent and remote resolution
      // record; one callback-finish record cannot enter this collection.
      let phase4Revisions = [];
      let journalEvidence = 'missing';
      if (remoteState !== 'stable') {
        journalEvidence = remoteState;
      } else {
        const rows = journalRead.value;
        const original = Object.entries(rows).filter(([key]) => key.startsWith(prefix));
        const resolved = Object.entries(rows).filter(([key]) => key.startsWith(resolutionPrefix));
        const id = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(v);
        const ad = v => typeof v === 'string' && /^\d+$/.test(v);
        const validIntent = ([key, row]) => isRecord(row) && row.schema === 1
          && row.state === 'outcome-unverified' && id(row.renewalId)
          && id(row.attemptId) && id(row.workerInstanceId)
          && typeof row.profileId === 'string' && row.profileId.trim().length > 0
          && row.profileId.length <= 256 && ad(row.sourceAdId) && ad(row.newAdId)
          && row.sourceAdId !== row.newAdId && Number.isSafeInteger(row.createdAtMs)
          && row.createdAtMs >= 0 && key === prefix + row.renewalId + '_' + row.attemptId;
        const validCompletion = ([key, row]) => {
          if (!isRecord(row) || row.schema !== 1 || row.state !== 'resolved-confirmed'
              || !id(row.renewalId) || !id(row.attemptId) || !id(row.workerInstanceId)
              || key !== resolutionPrefix + row.renewalId + '_' + row.attemptId
              || !ad(row.sourceAdId) || !ad(row.newAdId) || row.sourceAdId === row.newAdId
              || row.sourceEvidence !== 'not-in-my-ads-full-pagination-scan'
              || row.targetEvidence !== 'found-in-my-ads-full-pagination-scan'
              || !Number.isSafeInteger(row.sourcePagesScanned) || row.sourcePagesScanned < 1
              || !Number.isSafeInteger(row.targetPagesScanned) || row.targetPagesScanned < 1
              || !Number.isSafeInteger(row.targetFoundPage) || row.targetFoundPage < 1
              || !Number.isSafeInteger(row.verifiedAtMs) || row.verifiedAtMs < 0)
            return false;
          const originalKey = prefix + row.renewalId + '_' + row.attemptId;
          const intent = rows[originalKey];
          return validIntent([originalKey, intent])
            && row.profileId === intent.profileId
            && row.sourceAdId === intent.sourceAdId
            && row.newAdId === intent.newAdId
            && row.verifiedAtMs >= intent.createdAtMs;
        };
        if (!original.every(validIntent) || !resolved.every(validCompletion))
          journalEvidence = 'corrupt';
        else if (original.some(([key]) =>
          !Object.prototype.hasOwnProperty.call(rows,
            resolutionPrefix + key.slice(prefix.length))))
          journalEvidence = 'unresolved';
        else if (original.some(([, row]) => row.profileId !== stableProfile))
          journalEvidence = stableProfile ? 'profile-mismatch' : 'profile-unverified';
        else {
          journalEvidence = original.length > 0 ? 'resolved' : 'missing';
          if (journalEvidence === 'resolved') {
            phase4Revisions = original.map(([key, intent]) => {
              const resolution = rows[resolutionPrefix + key.slice(prefix.length)];
              return Object.freeze({
                owner: 'renewal', renewalId: intent.renewalId,
                attemptId: intent.attemptId, profileId: intent.profileId,
                sourceAdId: intent.sourceAdId, newAdId: intent.newAdId,
                intentWorkerInstanceId: intent.workerInstanceId,
                admissionToken: intent.admissionToken ?? null,
                intentCreatedAtMs: intent.createdAtMs,
                resolverWorkerInstanceId: resolution.workerInstanceId,
                verifiedAtMs: resolution.verifiedAtMs,
                sourceRevision: JSON.stringify([key, intent, resolution])
              });
            });
          }
        }
      }
      if (journalEvidence === 'unresolved') {
        set('renewal', active('PHASE4_JOURNAL_UNRESOLVED'));
        set('insertionLock', active('PHASE4_JOURNAL_UNRESOLVED'));
      } else if (journalEvidence !== 'missing' && journalEvidence !== 'resolved') {
        const reasons = {
          corrupt: 'PHASE4_JOURNAL_CORRUPT',
          unavailable: 'PHASE4_JOURNAL_STORAGE_UNAVAILABLE',
          changed: 'PHASE4_JOURNAL_CHANGED_DURING_READ',
          'profile-mismatch': 'PHASE4_JOURNAL_PROFILE_MISMATCH',
          'profile-unverified': 'PHASE4_JOURNAL_PROFILE_UNVERIFIED'
        };
        const reason = reasons[journalEvidence] || 'PHASE4_JOURNAL_UNVERIFIED';
        // Independent positive BUSY evidence always takes precedence.
        for (const name of ['renewal', 'insertionLock'])
          if (result[name].state !== 'active') set(name, unknown(reason));
      }
      // Only an immutable independently verified outcome can resolve a
      // previously recorded publication attempt. Unknown/corrupt stays UNKNOWN.
      const publishPrefix='karAutoPublishIntentV1_';
      const publishResolutionPrefix='karAutoPublishVerifiedResolutionV1_';
      let publishRevisions=[];
      let publishEvidence='missing';
      let publishKinds=new Set();
      if(remoteState!=='stable'){
        publishEvidence=remoteState;
      }else{
        const rows=journalRead.value;
        const attempts=Object.entries(rows).filter(([key])=>key.startsWith(publishPrefix));
        const resolutions=Object.entries(rows).filter(([key])=>key.startsWith(publishResolutionPrefix));
        const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
        const ad=v=>typeof v==='string'&&/^\d+$/.test(v);
        const validIntent=([key,row])=>isRecord(row)&&row.schema===1
          &&row.state==='outcome-unverified'&&id(row.fillId)&&id(row.workflowId)
          &&id(row.attemptId)&&id(row.workerInstanceId)
          &&['renewal','archive'].includes(row.kind)
          &&typeof row.profileId==='string'&&Boolean(row.profileId.trim())
          &&row.profileId.length<=256&&Number.isSafeInteger(row.targetTabId)&&row.targetTabId>0
          &&(ad(row.sourceAdId)||(row.kind==='archive'&&row.sourceAdId===''))
          &&Number.isSafeInteger(row.createdAtMs)&&row.createdAtMs>=0
          &&key===publishPrefix+row.fillId+'_'+row.attemptId;
        const validResolution=([key,row])=>{
          if(!isRecord(row)||row.schema!==1||row.state!=='resolved-confirmed'
             ||!id(row.fillId)||!id(row.attemptId)
             ||key!==publishResolutionPrefix+row.fillId+'_'+row.attemptId
             ||!ad(row.newAdId)||row.targetPresent!==true
             ||row.targetEvidence!=='found-in-my-ads-full-pagination-scan'
             ||!Number.isSafeInteger(row.targetPagesScanned)||row.targetPagesScanned<1
             ||!Number.isSafeInteger(row.targetFoundPage)||row.targetFoundPage<1
             ||!Number.isSafeInteger(row.verifiedAtMs))return false;
          const intentKey=publishPrefix+row.fillId+'_'+row.attemptId;
          const original=rows[intentKey];
          return validIntent([intentKey,original])
            &&row.workflowId===original.workflowId&&row.kind===original.kind
            &&row.profileId===original.profileId&&row.sourceAdId===original.sourceAdId
            &&row.targetTabId===original.targetTabId&&row.newAdId!==original.sourceAdId
            &&row.verifiedAtMs>=original.createdAtMs;
        };
        const unresolved=attempts.filter(([key])=>
          !Object.prototype.hasOwnProperty.call(rows,
            publishResolutionPrefix+key.slice(publishPrefix.length)));
        if(!attempts.every(validIntent)||!resolutions.every(validResolution)
           ||new Set(attempts.map(([,row])=>row.fillId)).size!==attempts.length)
          publishEvidence='corrupt';
        else if(unresolved.length){
          publishEvidence='unresolved';
          publishKinds=new Set(unresolved.map(([,row])=>row.kind));
        }else if(attempts.some(([,row])=>row.profileId!==stableProfile))
          publishEvidence=stableProfile?'profile-mismatch':'profile-unverified';
        else {
          publishEvidence=attempts.length?'resolved':'missing';
          if(publishEvidence==='resolved') {
            publishRevisions=attempts.map(([key,intent])=>{
              const resolution=rows[publishResolutionPrefix+key.slice(publishPrefix.length)];
              return Object.freeze({
                owner:intent.kind==='renewal'?'renewal':'archiveInsertion',
                kind:intent.kind,fillId:intent.fillId,workflowId:intent.workflowId,
                attemptId:intent.attemptId,profileId:intent.profileId,
                sourceAdId:intent.sourceAdId,newAdId:resolution.newAdId,
                intentWorkerInstanceId:intent.workerInstanceId,
                admissionToken:intent.admissionToken??null,
                intentCreatedAtMs:intent.createdAtMs,
                // This historical publication resolution schema does not
                // record the resolving worker. Do not fabricate provenance.
                resolverWorkerInstanceId:null,
                verifiedAtMs:resolution.verifiedAtMs,
                sourceRevision:JSON.stringify([key,intent,resolution])
              });
            });
          }
        }
      }
      if(publishEvidence==='unresolved'){
        if(publishKinds.has('renewal'))set('renewal',active('PUBLISH_INTENT_UNRESOLVED'));
        if(publishKinds.has('archive'))set('archiveInsertion',active('PUBLISH_INTENT_UNRESOLVED'));
        set('templateFill',active('PUBLISH_INTENT_UNRESOLVED'));
        set('insertionLock',active('PUBLISH_INTENT_UNRESOLVED'));
      }else if(publishEvidence!=='missing'&&publishEvidence!=='resolved'){
        const reasons={
          corrupt:'PUBLISH_INTENT_CORRUPT',
          unavailable:'PUBLISH_INTENT_STORAGE_UNAVAILABLE',
          changed:'PUBLISH_INTENT_CHANGED_DURING_READ',
          'profile-mismatch':'PUBLISH_INTENT_PROFILE_MISMATCH',
          'profile-unverified':'PUBLISH_INTENT_PROFILE_UNVERIFIED'
        };
        for(const name of ['renewal','archiveInsertion','templateFill','insertionLock'])
          // Multiple independent unresolved sources may affect one owner.
          // Never erase an earlier concrete Phase4 denial with a later
          // publication-journal denial; both remain fail-closed UNKNOWN.
          if(result[name].state!=='active'
             &&!String(result[name].reason||'').startsWith('PHASE4_JOURNAL_'))
            set(name,unknown(reasons[publishEvidence]||'PUBLISH_INTENT_UNVERIFIED'));
      }
      // F2D: independently re-read the actual immutable P8 journal. A
      // callback's stored finish certifies neither a remote result nor IDLE.
      const receiptProof = immutableOwnerReceipts(firstRemote, remoteRecheck);
      if (!receiptProof) {
        for (const name of OWNERS) {
          if (result[name].state !== 'active') set(name, unknown('DURABLE_ADMISSION_UNVERIFIED'));
        }
      } else {
        for (const name of receiptProof.pending) set(name, active('DURABLE_ADMISSION_UNFINISHED'));
        for (const name of receiptProof.completed) {
          if (result[name].state !== 'active')
            set(name, unknown('DURABLE_CALLBACK_SETTLED_REMOTE_UNVERIFIED'));
        }
      }
      // This is an independently double-read, read-only witness for the
      // SEVEN persisted owner classes. Even callback-finished only proves
      // P8 finally() wrote its row; it cannot prove remote success, all
      // historical ingress coverage or absence of prior Worker callbacks.
      const admissionHistory = Object.freeze(Object.fromEntries(OWNERS.map(name => {
        const entries = receiptProof?.entries.filter(row=>row.owners.includes(name)) || [];
        return [name,Object.freeze({
          state:!receiptProof?'unverified':entries.some(e=>e.state==='unfinished')
            ?'unfinished':entries.length?'callback-finished':'no-records',
          historicalOnly:true,generationAuthority:'unverified',
          remoteOutcome:'unverified',
          sourceRevision:receiptProof?JSON.stringify(entries):null,
          entries:Object.freeze(entries)
        })];
      })));
      const validProfile = value => isRecord(value) && typeof value.profileId === 'string'
        && PROFILE_ID.test(value.profileId);
      const priorActive = local?.activeDetectedProfileV1;
      const priorSelected = local?.selectedInventoryProfileV1;
      const nextActive = laterProfiles?.activeDetectedProfileV1;
      const nextSelected = laterProfiles?.selectedInventoryProfileV1;
      let profileReason = 'PROFILE_MISSING_OR_INVALID';
      let groundedProfileId = null;
      if (!local || !laterProfiles) profileReason = 'PROFILE_STORAGE_UNAVAILABLE';
      else if ([priorActive, priorSelected, nextActive, nextSelected].every(validProfile)) {
        if (priorActive.profileId !== nextActive.profileId || priorSelected.profileId !== nextSelected.profileId)
          profileReason = 'PROFILE_CHANGED_DURING_READ';
        else if (priorActive.profileId !== priorSelected.profileId)
          profileReason = 'PROFILE_MISMATCH';
        else {
          profileReason = 'STORED_PROFILES_MATCH_BUT_LIVE_UNVERIFIED';
          groundedProfileId = priorActive.profileId;
        }
      }
      const context = Object.freeze({
        profile: Object.freeze({ state: 'unverified', reason: profileReason, profileId: groundedProfileId }),
        // runtimeEpochV1 belongs to the bulk-run session lease, not this
        // Worker instance: even equal/matching epochs never prove an MV3 owner.
        worker: Object.freeze({ state: 'unverified', reason: 'NO_CROSS_WORKER_GENERATION_PROOF',
          workerInstanceId: localInstanceId })
      });
      // All results are explicitly non-authoritative. They cannot be fed into
      // KRUpdateIdlePolicy's confirmed owner records or production reserve().
      return Object.freeze({
        schema: 1,
        eligibleForLease: false,
        observedAtMs: Number.isSafeInteger(observedAtMs) ? observedAtMs : null,
        observations: Object.freeze({...result}),
        admissionJournalRevision:receiptProof?.journalRevision ?? null,
        admissionHistory,
        // Same-profile locally persisted remote settlement is historical
        // evidence only: it does not prove a current live Kleinanzeigen login,
        // a finished previous Worker, or any of the 15 positive IDLE sources.
        remoteOutcomeEvidence: Object.freeze({
          historicalOnly:true,liveAccountVerified:false,
          phase4:Object.freeze({
            state:journalEvidence,revisions:Object.freeze(phase4Revisions)
          }),
          publish:Object.freeze({
            state:publishEvidence,revisions:Object.freeze(publishRevisions)
          })
        }),
        context
      });
    }
    return Object.freeze({observe, track, snapshotInFlight});
  }
  const API = Object.freeze({create, OWNERS});
  globalThis.KRDeps?.register?.('KRPersistedOwnerObserver', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
