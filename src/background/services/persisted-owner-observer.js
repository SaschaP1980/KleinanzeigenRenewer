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
  const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const active = reason => Object.freeze({state: 'active', reason});
  const unknown = reason => Object.freeze({state: 'unknown', reason});

  function create({storageLocal, storageSession, clock = () => Date.now()} = {}) {
    if (typeof storageLocal?.get !== 'function' || typeof storageSession?.get !== 'function'
      || typeof clock !== 'function') throw new Error('persisted owner observer requires read-only storage and clock');
    const pending = new Map(OWNERS.map(name => [name, 0]));
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
      const [localRead, sessionRead] = await Promise.allSettled([
        storageLocal.get([...LOCAL_KEYS]), storageSession.get([...SESSION_KEYS])
      ]);
      const local = localRead.status === 'fulfilled' && isRecord(localRead.value) ? localRead.value : null;
      const session = sessionRead.status === 'fulfilled' && isRecord(sessionRead.value) ? sessionRead.value : null;
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
      // All results are explicitly non-authoritative. They cannot be fed into
      // KRUpdateIdlePolicy's confirmed owner records or production reserve().
      return Object.freeze({
        schema: 1,
        eligibleForLease: false,
        observedAtMs: Number.isSafeInteger(observedAtMs) ? observedAtMs : null,
        observations: Object.freeze({...result})
      });
    }
    return Object.freeze({observe, track, snapshotInFlight});
  }
  const API = Object.freeze({create, OWNERS});
  globalThis.KRDeps?.register?.('KRPersistedOwnerObserver', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
