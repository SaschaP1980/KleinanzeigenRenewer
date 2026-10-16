// KAR-97 Wave 03A: pure fail-closed, non-authorizing update-idle candidate policy.
// No Chrome calls, no filesystem/Native Messaging actions, no update permission.
// A future authoritative worker owner + persisted start fence must precede any host handoff.
(() => {
  'use strict';
  const requiredOwners = Object.freeze([
    'bulkInventory', 'bulkReconciliation', 'singleInventory', 'renewal',
    'massRenewal', 'templateFill', 'archiveInsertion', 'trashMutation',
    'insertionLock', 'managedTabs', 'profileTransition', 'accountTransition',
    'emergencyRecovery', 'diagnosticExport', 'nativeUpdateTransaction'
  ]);
  const MAX_AGE_MS = 2000;
  const FIELDS = ['schema', 'workerGeneration', 'profileId', 'observedAtMs', 'owners'];
  const OWNER_FIELDS = ['confirmed', 'state', 'workerGeneration', 'profileId', 'observedAtMs'];
  const identity = /^[A-Za-z0-9_-]{1,128}$/;

  const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const sameKeys = (v, names) => isRecord(v)
    && Object.keys(v).length === names.length
    && names.every(k => Object.prototype.hasOwnProperty.call(v, k));
  const blocked = reason => Object.freeze({ status: 'blocked', reason });
  const candidate = Object.freeze({ status: 'candidate-idle', reason: 'ALL_OWNERS_IDLE' });

  // Snapshot is an asserted observation, NOT a trusted lease or host authorization.
  // Candidate must never be reinterpreted as permission to alter extension files.
  function evaluate(snapshot, options = {}) {
    try {
      if (!isRecord(options) || !Number.isSafeInteger(options.nowMs) || options.nowMs < 0
        || Object.keys(options).length !== 1) return blocked('INVALID_TIME');
      const nowMs = options.nowMs;
      if (!sameKeys(snapshot, FIELDS) || snapshot.schema !== 1
        || typeof snapshot.workerGeneration !== 'string' || !identity.test(snapshot.workerGeneration)
        || typeof snapshot.profileId !== 'string' || !identity.test(snapshot.profileId)
        || !Number.isSafeInteger(snapshot.observedAtMs) || snapshot.observedAtMs < 0)
        return blocked('INVALID_SNAPSHOT');
      if (snapshot.observedAtMs > nowMs) return blocked('FUTURE_SNAPSHOT');
      if (nowMs - snapshot.observedAtMs > MAX_AGE_MS) return blocked('STALE_SNAPSHOT');
      if (!isRecord(snapshot.owners)) return blocked('INVALID_SNAPSHOT');
      for (const name of requiredOwners) {
        if (!Object.prototype.hasOwnProperty.call(snapshot.owners, name))
          return blocked('OWNER_MISSING');
      }
      if (Object.keys(snapshot.owners).length !== requiredOwners.length)
        return blocked('OWNER_SET_INVALID');
      for (const name of requiredOwners) {
        const owner = snapshot.owners[name];
        if (!sameKeys(owner, OWNER_FIELDS) || owner.confirmed !== true
          || typeof owner.state !== 'string' || !owner.state)
          return blocked('OWNER_UNKNOWN');
        if (owner.workerGeneration !== snapshot.workerGeneration)
          return blocked('OWNER_GENERATION_MISMATCH');
        if (owner.profileId !== snapshot.profileId)
          return blocked('OWNER_PROFILE_MISMATCH');
        if (!Number.isSafeInteger(owner.observedAtMs) || owner.observedAtMs < 0)
          return blocked('OWNER_UNKNOWN');
        if (owner.observedAtMs > nowMs || owner.observedAtMs > snapshot.observedAtMs)
          return blocked('OWNER_FUTURE');
        if (nowMs - owner.observedAtMs > MAX_AGE_MS) return blocked('OWNER_STALE');
        if (owner.state === 'active') return blocked('OWNER_ACTIVE');
        if (owner.state === 'unknown') return blocked('OWNER_UNKNOWN');
        if (owner.state !== 'idle') return blocked('OWNER_NOT_IDLE');
      }
      return candidate;
    } catch {
      return blocked('INVALID_SNAPSHOT');
    }
  }
  const api = Object.freeze({ requiredOwners, evaluate });
  if (globalThis.KRDeps?.register) globalThis.KRDeps.register('KRUpdateIdlePolicy', api);
  if (typeof module !== 'undefined' && module?.exports) module.exports = api;
})();
