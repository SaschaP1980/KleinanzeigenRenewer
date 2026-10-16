// KAR-117 — immutable persistent evidence of potentially interrupted Phase-4
// remote work. NOT a cross-worker mutex, CAS, clearance, or idle attestation.
(() => {
  'use strict';
  const PREFIX = 'karPhase4UncertainAttemptV1_';
  const SCHEMA = 1;
  const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const denied = code => Object.assign(new Error(code), {code});
  const safeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
  const adId = value => typeof value === 'string' && /^\d+$/.test(value);
  function create({storageLocal, clock, newToken, workerInstanceId} = {}) {
    if (typeof storageLocal?.get !== 'function' || typeof storageLocal?.set !== 'function'
        || typeof clock !== 'function' || typeof newToken !== 'function')
      throw denied('KR_PHASE4_JOURNAL_STORAGE');
    if (!safeId(workerInstanceId)) throw denied('KR_PHASE4_JOURNAL_IDENTITY');
    async function read(keys) {
      try {
        const value = await storageLocal.get(keys);
        if (!isRecord(value)) throw Error('malformed read');
        return value;
      } catch { throw denied('KR_PHASE4_JOURNAL_STORAGE'); }
    }
    function validate(row, key) {
      return isRecord(row) && row.schema === SCHEMA && row.state === 'outcome-unverified'
        && safeId(row.renewalId) && safeId(row.attemptId) && safeId(row.workerInstanceId)
        && typeof row.profileId === 'string' && row.profileId.trim().length > 0
        && row.profileId.length <= 256 && adId(row.sourceAdId) && adId(row.newAdId)
        && row.sourceAdId !== row.newAdId && Number.isSafeInteger(row.createdAtMs)
        && row.createdAtMs >= 0 && key === PREFIX + row.renewalId + '_' + row.attemptId;
    }
    async function observe(renewalId) {
      if (!safeId(renewalId)) throw denied('KR_PHASE4_JOURNAL_IDENTITY');
      // get(null) exposes independently keyed attempts, without a lossy
      // read-modify-write shared map. A storage read failure is not "empty".
      const all = await read(null);
      const attempts = [];
      for (const [key, row] of Object.entries(all)) {
        if (!key.startsWith(PREFIX)) continue;
        if (!validate(row, key)) throw denied('KR_PHASE4_JOURNAL_CORRUPT');
        if (row.renewalId === renewalId) attempts.push(Object.freeze({...row}));
      }
      return Object.freeze({state: 'unverified', attempts: Object.freeze(attempts)});
    }
    async function begin({renewalId, profileId, sourceAdId, newAdId} = {}) {
      if (!safeId(renewalId) || typeof profileId !== 'string' || !profileId.trim()
          || profileId.length > 256 || !adId(String(sourceAdId || ''))
          || !adId(String(newAdId || '')) || String(sourceAdId) === String(newAdId))
        throw denied('KR_PHASE4_JOURNAL_IDENTITY');
      if ((await observe(renewalId)).attempts.length)
        throw denied('KR_PHASE4_JOURNAL_UNRESOLVED');
      let attemptId;
      try { attemptId = newToken(); }
      catch { throw denied('KR_PHASE4_JOURNAL_IDENTITY'); }
      if (!safeId(attemptId)) throw denied('KR_PHASE4_JOURNAL_IDENTITY');
      const key = PREFIX + renewalId + '_' + attemptId;
      const time = clock();
      if (!Number.isSafeInteger(time) || time < 0) throw denied('KR_PHASE4_JOURNAL_IDENTITY');
      const entry = Object.freeze({
        schema: SCHEMA, state: 'outcome-unverified', renewalId, attemptId,
        profileId, sourceAdId: String(sourceAdId), newAdId: String(newAdId),
        workerInstanceId, createdAtMs: time
      });
      try { await storageLocal.set({[key]: entry}); }
      catch { throw denied('KR_PHASE4_JOURNAL_STORAGE'); }
      const acknowledged = (await read([key]))[key];
      if (!validate(acknowledged, key) || Object.keys(entry).some(k => acknowledged[k] !== entry[k]))
        throw denied('KR_PHASE4_JOURNAL_STORAGE');
      // Detect ordinary overlap, but do not claim this eliminates a two-worker
      // read/check/write race. That requires separate atomic arbitration.
      if ((await observe(renewalId)).attempts.length !== 1)
        throw denied('KR_PHASE4_JOURNAL_UNRESOLVED');
      return entry;
    }
    return Object.freeze({begin, observe});
  }
  const API = Object.freeze({create, KEY_PREFIX: PREFIX});
  globalThis.KRDeps?.register?.('KRPhase4UncertaintyJournal', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
