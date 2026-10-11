(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const storageLocal = options.storageLocal;
      const storageSession = options.storageSession;
      if (!storageLocal || !storageSession) throw new Error('KRBulkRunGuard requires local and session storage');
      const runKey = String(options.runKey || 'bulkInventoryRun');
      const leaseKey = String(options.leaseKey || 'bulkRunRuntimeLeaseV1');
      const epochKey = String(options.epochKey || 'runtimeEpochV1');
      const itemHardTimeoutMs = Math.max(1000, Number(options.itemHardTimeoutMs || 110000));
      const now = typeof options.now === 'function' ? options.now : () => Date.now();
      const randomUUID = typeof options.randomUUID === 'function'
        ? options.randomUUID
        : () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      let chain = Promise.resolve();
      let epochPromise = null;

      function iso() { return new Date(now()).toISOString(); }
      function clone(value) {
        if (!value || typeof value !== 'object') return value ?? null;
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
      }
      function terminal(state) { return Boolean(state && String(state.status || '') !== 'running'); }
      async function readRaw() {
        const stored = await storageLocal.get(runKey).catch(() => ({}));
        return clone(stored?.[runKey] || null);
      }
      async function ensureRuntimeEpoch() {
        if (!epochPromise) {
          epochPromise = (async () => {
            const stored = await storageSession.get(epochKey).catch(() => ({}));
            const existing = String(stored?.[epochKey] || '');
            if (existing) return existing;
            const created = String(randomUUID());
            await storageSession.set({ [epochKey]: created });
            return created;
          })();
        }
        return epochPromise;
      }
      async function readLease() {
        const stored = await storageSession.get(leaseKey).catch(() => ({}));
        return clone(stored?.[leaseKey] || null);
      }
      async function claimLease(runId) {
        const id = String(runId || '');
        if (!id) return null;
        const runtimeEpoch = await ensureRuntimeEpoch();
        const lease = { runId: id, runtimeEpoch, claimedAt: iso(), heartbeatAt: iso() };
        await storageSession.set({ [leaseKey]: lease });
        return lease;
      }
      async function touchLease(runId) {
        const id = String(runId || '');
        if (!id) return null;
        const runtimeEpoch = await ensureRuntimeEpoch();
        const current = await readLease();
        const lease = current && String(current.runId || '') === id && String(current.runtimeEpoch || '') === runtimeEpoch
          ? { ...current, heartbeatAt: iso() }
          : { runId: id, runtimeEpoch, claimedAt: iso(), heartbeatAt: iso() };
        await storageSession.set({ [leaseKey]: lease });
        return lease;
      }
      async function releaseLease(runId = '') {
        const current = await readLease();
        if (!current) return false;
        if (runId && String(current.runId || '') !== String(runId)) return false;
        await storageSession.remove(leaseKey).catch(() => {});
        return true;
      }
      function enqueue(work) {
        const next = chain.catch(() => {}).then(work);
        chain = next.then(() => undefined, () => undefined);
        return next;
      }
      async function mutate(mutator) {
        if (typeof mutator !== 'function') throw new Error('Bulk mutation requires a mutator');
        return enqueue(async () => {
          const current = await readRaw();
          const draft = clone(current);
          const proposed = await mutator(draft);
          if (proposed === undefined) return current;
          if (proposed === null) {
            await storageLocal.remove?.(runKey).catch?.(() => {});
            await releaseLease(current?.runId || '');
            return null;
          }
          let next = clone(proposed);
          if (current && next && String(current.runId || '') === String(next.runId || '') && terminal(current) && String(next.status || '') === 'running') {
            return current;
          }
          next.updatedAt = iso();
          next.stateRevision = Math.max(0, Number(current?.stateRevision || 0)) + 1;
          await storageLocal.set({ [runKey]: next });
          if (String(next.status || '') === 'running') await touchLease(next.runId);
          else await releaseLease(next.runId);
          return clone(next);
        });
      }
      async function write(candidate) {
        const incoming = clone(candidate);
        return mutate(current => {
          if (!incoming) return incoming;
          if (current && String(current.runId || '') === String(incoming.runId || '') && terminal(current) && String(incoming.status || '') === 'running') return current;
          return incoming;
        });
      }
      function recoveryState(state, stage, issue, extra = {}) {
        const at = iso();
        return {
          ...state,
          ...extra,
          status: 'needs-review',
          stage,
          completedAt: state?.completedAt || at,
          recoveryAt: at,
          workerTabId: null,
          metadataTabId: null,
          metadataOpenedAt: null,
          currentReadOnlyMeta: null,
          issues: [...new Set([...(Array.isArray(state?.issues) ? state.issues : []), issue])]
        };
      }
      async function recoverOrphanedRun() {
        await ensureRuntimeEpoch();
        const current = await readRaw();
        if (!current || String(current.status || '') !== 'running') return { recovered: false, state: current, tabIds: [] };
        const lease = await readLease();
        const epoch = await ensureRuntimeEpoch();
        if (lease && String(lease.runId || '') === String(current.runId || '') && String(lease.runtimeEpoch || '') === String(epoch)) {
          return { recovered: false, state: current, tabIds: [] };
        }
        const tabIds = [current.sourceTabId, current.workerTabId, current.metadataTabId].map(Number).filter(Boolean);
        const state = await mutate(latest => {
          if (!latest || String(latest.status || '') !== 'running') return latest;
          return recoveryState(latest, 'runtime-session-lost', 'Die Erfassung wurde nach einem Erweiterungs-/Browser-Neustart sicher beendet.');
        });
        return { recovered: Boolean(state && String(state.stage || '') === 'runtime-session-lost'), state, tabIds: [...new Set(tabIds)] };
      }
      async function recoverExpiredWorkerRun() {
        const current = await readRaw();
        if (!current || String(current.status || '') !== 'running') return { recovered: false, state: current, tabIds: [] };
        if (!['opening-worker','worker-open','saving-worker'].includes(String(current.stage || ''))) return { recovered: false, state: current, tabIds: [] };
        const startedAt = Date.parse(String(current.currentItemStartedAt || ''));
        if (!Number.isFinite(startedAt) || now() - startedAt <= itemHardTimeoutMs) return { recovered: false, state: current, tabIds: [] };
        const tabIds = [current.workerTabId, current.metadataTabId].map(Number).filter(Boolean);
        const state = await mutate(latest => {
          if (!latest || String(latest.status || '') !== 'running') return latest;
          if (!['opening-worker','worker-open','saving-worker'].includes(String(latest.stage || ''))) return latest;
          const latestStartedAt = Date.parse(String(latest.currentItemStartedAt || ''));
          if (!Number.isFinite(latestStartedAt) || now() - latestStartedAt <= itemHardTimeoutMs) return latest;
          return recoveryState(latest, 'worker-timeout', 'Die Erfassung wurde beendet, weil ein Anzeigen-Worker die maximale Bearbeitungszeit überschritten hat.', { workerTimedOutAt: iso() });
        });
        return { recovered: Boolean(state && String(state.stage || '') === 'worker-timeout'), state, tabIds: [...new Set(tabIds)] };
      }
      return Object.freeze({
        read: readRaw,
        mutate, write, recoverOrphanedRun, recoverExpiredWorkerRun,
        runKey, leaseKey, epochKey, itemHardTimeoutMs
      });
    }
  });
  globalThis.KRDeps?.register?.('KRBulkRunGuard', API);
})();
