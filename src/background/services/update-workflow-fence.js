// KAR-99: background-owned workflow admission and persistent update reservation.
// This is not an update permission. No untrusted message route may acquire a lease.
// Actual owner observation wiring, autonomous start coverage and NativeHost apply
// remain explicit future work; without a trusted snapshot provider reserve is denied.
(() => {
  'use strict';
  const STORAGE_KEY = 'nativeUpdateWorkflowFenceV1';
  const VERSION = 1;
  const MAX_LEASE_MS = 60000;
  function denied(code) {
    const e = new Error(code);
    e.code = code;
    return e;
  }
  function create(options = {}) {
    const { storageLocal, policy, getOwnerSnapshot, clock, newToken } = options;
    if (typeof storageLocal?.get !== 'function' || typeof storageLocal?.set !== 'function')
      throw new Error('Update fence requires persistent storage.');
    if (typeof clock !== 'function' || typeof newToken !== 'function')
      throw new Error('Update fence requires trusted clock and nonce source.');
    let queue = Promise.resolve();
    let inFlight = 0;
    function serialize(action) {
      const result = queue.catch(() => {}).then(action);
      queue = result.then(() => {}, () => {});
      return result;
    }
    async function read() {
      let loaded;
      try { loaded = await storageLocal.get(STORAGE_KEY); }
      catch { throw denied('KR_UPDATE_FENCE_STORAGE'); }
      if (!loaded || typeof loaded !== 'object' || Array.isArray(loaded))
        throw denied('KR_UPDATE_FENCE_STORAGE');
      return Object.prototype.hasOwnProperty.call(loaded, STORAGE_KEY) ? loaded[STORAGE_KEY] : null;
    }
    async function write(value) {
      try { await storageLocal.set({ [STORAGE_KEY]: value }); }
      catch { throw denied('KR_UPDATE_FENCE_STORAGE'); }
    }
    function isReleased(record) {
      return record && record.schema === VERSION && record.state === 'released'
        && typeof record.transactionId === 'string' && typeof record.profileId === 'string'
        && typeof record.workerGeneration === 'string' && typeof record.token === 'string';
    }
    function ensureFree(record) {
      if (record !== null && !isReleased(record)) throw denied('KR_UPDATE_FENCE_HELD');
    }
    function now() {
      const n = clock();
      if (!Number.isSafeInteger(n) || n < 0) throw denied('KR_UPDATE_FENCE_TIME');
      return n;
    }
    function ids(input) {
      if (!input || !['profileId', 'workerGeneration', 'transactionId'].every(k =>
        typeof input[k] === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(input[k])))
        throw denied('KR_UPDATE_FENCE_OWNERSHIP');
    }
    async function withAdmission(type, task) {
      if (typeof type !== 'string' || !type || typeof task !== 'function')
        throw denied('KR_UPDATE_FENCE_ADMISSION');
      // Only the admission decision is serialized. Holding the mutex until a
      // long-running handler finishes would deadlock nested background messages.
      const admitted = await serialize(async () => {
        ensureFree(await read());
        inFlight++;
        let pending;
        try { pending = Promise.resolve(task()); }
        catch (error) { inFlight--; throw error; }
        return { pending: pending.finally(() => { inFlight--; }) };
      });
      return admitted.pending;
    }
    async function reserve(request = {}) {
      return serialize(async () => {
        ids(request);
        if (typeof getOwnerSnapshot !== 'function' || typeof policy?.evaluate !== 'function')
          throw denied('KR_UPDATE_FENCE_OWNER_UNAVAILABLE');
        ensureFree(await read());
        if (inFlight !== 0) throw denied('KR_UPDATE_FENCE_BUSY');
        const tick = now();
        let snapshot;
        try { snapshot = await getOwnerSnapshot(); }
        catch { throw denied('KR_UPDATE_FENCE_NOT_IDLE'); }
        const candidate = policy.evaluate(snapshot, { nowMs: tick });
        if (candidate?.status !== 'candidate-idle' || candidate?.reason !== 'ALL_OWNERS_IDLE'
          || snapshot.profileId !== request.profileId
          || snapshot.workerGeneration !== request.workerGeneration)
          throw denied('KR_UPDATE_FENCE_NOT_IDLE');
        let token;
        try { token = newToken(); } catch { throw denied('KR_UPDATE_FENCE_OWNERSHIP'); }
        if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{12,128}$/.test(token))
          throw denied('KR_UPDATE_FENCE_OWNERSHIP');
        const record = {
          schema: VERSION, state: 'reserved',
          token, profileId: request.profileId, workerGeneration: request.workerGeneration,
          transactionId: request.transactionId, createdAtMs: tick,
          expiresAtMs: tick + MAX_LEASE_MS
        };
        if (!Number.isSafeInteger(record.expiresAtMs))
          throw denied('KR_UPDATE_FENCE_TIME');
        await write(record);
        const committed = await read();
        if (!committed || Object.keys(record).some(k => committed[k] !== record[k]))
          throw denied('KR_UPDATE_FENCE_STORAGE');
        return Object.freeze({ ...record });
      });
    }
    async function cancel(request = {}) {
      return serialize(async () => {
        const existing = await read();
        if (!existing || existing.schema !== VERSION || existing.state !== 'reserved'
          || request.token !== existing.token
          || request.workerGeneration !== existing.workerGeneration
          || request.profileId !== existing.profileId)
          throw denied('KR_UPDATE_FENCE_OWNERSHIP');
        const replacement = { ...existing, state: 'cancelled', cancelledAtMs: now() };
        await write(replacement);
        return Object.freeze({ state: 'cancelled' });
      });
    }
    async function recover(request = {}) {
      return serialize(async () => {
        const value = await read();
        if (!value || value.schema !== VERSION || value.state !== 'cancelled'
          || request.confirmed !== true || request.profileId !== value.profileId)
          throw denied('KR_UPDATE_FENCE_OWNERSHIP');
        await write({ ...value, state: 'released', releasedAtMs: now() });
        return Object.freeze({ state: 'released' });
      });
    }
    async function status() {
      return serialize(async () => {
        const entry = await read();
        return Object.freeze({ state: entry === null || isReleased(entry) ? 'unlocked' : 'blocked' });
      });
    }
    return Object.freeze({ withAdmission, reserve, cancel, recover, status });
  }
  const API = Object.freeze({ create, STORAGE_KEY });
  globalThis.KRDeps?.register?.('KRUpdateWorkflowFence', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
