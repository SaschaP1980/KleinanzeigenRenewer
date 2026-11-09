// KAR-99 P6: durable, immutable BEFORE-click intent for automated publish.
// It records uncertainty. It never claims publication success or updater IDLE.
(() => {
  'use strict';
  const PREFIX = 'karAutoPublishIntentV1_';
  const SHARED_LOCK_NAME = 'kar-updater-global-admission-v1';
  const IDENTIFIER = /^[A-Za-z0-9_-]{1,128}$/;
  const denied = code => Object.assign(new Error(code), {code});
  const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isId = v => typeof v === 'string' && IDENTIFIER.test(v);
  const adId = v => typeof v === 'string' && /^\d+$/.test(v);
  function isValid(key, row) {
    return isRecord(row) && row.schema === 1 && row.state === 'outcome-unverified'
      && isId(row.fillId) && isId(row.workflowId) && isId(row.attemptId)
      && isId(row.workerInstanceId) && ['renewal','archive'].includes(row.kind)
      && typeof row.profileId === 'string' && Boolean(row.profileId.trim())
      && row.profileId.length <= 256 && Number.isSafeInteger(row.targetTabId)
      && row.targetTabId > 0 && (adId(row.sourceAdId)
        || (row.kind === 'archive' && row.sourceAdId === ''))
      && Number.isSafeInteger(row.createdAtMs) && row.createdAtMs >= 0
      && key === PREFIX + row.fillId + '_' + row.attemptId;
  }
  function create({storageLocal, lockManager, lockName, workerInstanceId, clock, newToken} = {}) {
    if (typeof storageLocal?.get !== 'function' || typeof storageLocal?.set !== 'function'
        || typeof clock !== 'function' || typeof newToken !== 'function'
        || !isId(workerInstanceId)) throw denied('KR_PUBLISH_INTENT_STORAGE');
    async function read(keys) {
      try {
        const value = await storageLocal.get(keys);
        if (!isRecord(value)) throw Error('invalid storage');
        return value;
      } catch { throw denied('KR_PUBLISH_INTENT_STORAGE'); }
    }
    async function begin({fillId, workflowId, kind, profileId, sourceAdId, targetTabId} = {}) {
      if (!isId(fillId) || !isId(workflowId) || !['renewal','archive'].includes(kind)
          || typeof profileId !== 'string' || !profileId.trim() || profileId.length > 256
          || !Number.isSafeInteger(targetTabId) || targetTabId <= 0
          || !(adId(sourceAdId) || (kind === 'archive' && sourceAdId === '')))
        throw denied('KR_PUBLISH_INTENT_IDENTITY');
      if (typeof lockManager?.request !== 'function' || lockName !== SHARED_LOCK_NAME)
        throw denied('KR_PUBLISH_INTENT_ATOMIC_UNAVAILABLE');
      try {
        return await lockManager.request(SHARED_LOCK_NAME,
          {mode:'exclusive',ifAvailable:true},async lock => {
            if (!lock) throw denied('KR_PUBLISH_INTENT_ATOMIC_BUSY');
            const all = await read(null);
            for (const [key,row] of Object.entries(all)) {
              if (!key.startsWith(PREFIX)) continue;
              if (!isValid(key,row)) throw denied('KR_PUBLISH_INTENT_CORRUPT');
              if (row.fillId === fillId) throw denied('KR_PUBLISH_INTENT_UNRESOLVED');
            }
            let attemptId;
            try { attemptId = newToken(); }
            catch { throw denied('KR_PUBLISH_INTENT_IDENTITY'); }
            if (!isId(attemptId)) throw denied('KR_PUBLISH_INTENT_IDENTITY');
            const createdAtMs = clock();
            if (!Number.isSafeInteger(createdAtMs) || createdAtMs < 0)
              throw denied('KR_PUBLISH_INTENT_IDENTITY');
            const key = PREFIX + fillId + '_' + attemptId;
            if (Object.prototype.hasOwnProperty.call(all,key))
              throw denied('KR_PUBLISH_INTENT_UNRESOLVED');
            const entry = Object.freeze({
              schema:1,state:'outcome-unverified',fillId,workflowId,kind,profileId,
              sourceAdId,targetTabId,attemptId,workerInstanceId,createdAtMs
            });
            try { await storageLocal.set({[key]:entry}); }
            catch { throw denied('KR_PUBLISH_INTENT_STORAGE'); }
            const ack = (await read([key]))[key];
            if (!isValid(key,ack) || Object.keys(entry).length !== Object.keys(ack).length
                || Object.keys(entry).some(k => entry[k] !== ack[k]))
              throw denied('KR_PUBLISH_INTENT_STORAGE');
            return entry;
          });
      } catch (error) {
        if (typeof error?.code === 'string' && error.code.startsWith('KR_PUBLISH_INTENT_'))
          throw error;
        throw denied('KR_PUBLISH_INTENT_ATOMIC_UNAVAILABLE');
      }
    }
    return Object.freeze({begin});
  }
  const API = Object.freeze({create, KEY_PREFIX:PREFIX});
  globalThis.KRDeps?.register?.('KRAutoPublishIntentJournal',API);
  if (typeof module !== 'undefined' && module?.exports) module.exports=API;
})();
