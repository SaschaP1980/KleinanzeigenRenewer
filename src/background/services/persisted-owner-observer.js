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
      // A receipt from an earlier Worker generation is positive BUSY evidence
      // even if the renewal session no longer appears in this process.
      // Corruption and read failure must never masquerade as an empty journal.
      const prefix = 'karPhase4UncertainAttemptV1_';
      let journalEvidence = 'missing';
      if (journalRead.status !== 'fulfilled' || !isRecord(journalRead.value)) {
        journalEvidence = 'unavailable';
      } else {
        const remoteRows = Object.entries(journalRead.value)
          .filter(([key]) => key.startsWith(prefix));
        const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
        const ad = value => typeof value === 'string' && /^\d+$/.test(value);
        const valid = ([key, row]) => isRecord(row) && row.schema === 1
          && row.state === 'outcome-unverified' && id(row.renewalId)
          && id(row.attemptId) && id(row.workerInstanceId)
          && typeof row.profileId === 'string' && row.profileId.trim().length > 0
          && row.profileId.length <= 256 && ad(row.sourceAdId) && ad(row.newAdId)
          && row.sourceAdId !== row.newAdId && Number.isSafeInteger(row.createdAtMs)
          && row.createdAtMs >= 0
          && key === prefix + row.renewalId + '_' + row.attemptId;
        journalEvidence = remoteRows.every(valid)
          ? (remoteRows.length ? 'unresolved' : 'missing') : 'corrupt';
      }
      if (journalEvidence === 'unresolved') {
        set('renewal', active('PHASE4_JOURNAL_UNRESOLVED'));
        set('insertionLock', active('PHASE4_JOURNAL_UNRESOLVED'));
      } else if (journalEvidence === 'corrupt' || journalEvidence === 'unavailable') {
        const reason = journalEvidence === 'corrupt'
          ? 'PHASE4_JOURNAL_CORRUPT' : 'PHASE4_JOURNAL_STORAGE_UNAVAILABLE';
        // Independent positive BUSY evidence always takes precedence.
        for (const name of ['renewal', 'insertionLock'])
          if (result[name].state !== 'active') set(name, unknown(reason));
      }
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
        context
      });
    }
    return Object.freeze({observe, track, snapshotInFlight});
  }
  const API = Object.freeze({create, OWNERS});
  globalThis.KRDeps?.register?.('KRPersistedOwnerObserver', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
