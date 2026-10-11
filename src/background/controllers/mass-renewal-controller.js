(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const chrome = { storage: { local: options.storageLocal } };
      if (!chrome.storage.local) throw new Error('storageLocal is required');
      const MASS_RENEWAL_BATCH_KEY = String(options.batchKey || 'massRenewalBatchV1');
      const MASS_RENEWAL_BATCH_MAX_AGE_MS = Number(options.batchMaxAgeMs || 30 * 24 * 60 * 60 * 1000);
      const MASS_RENEWAL_PROGRESS_FLUSH_MS = Number(options.progressFlushMs || 1500);
      const normalizeRenewalMode = options.normalizeRenewalMode || (value => String(value || ''));
      const normalizeRenewalPhaseAttempts = options.normalizeRenewalPhaseAttempts || (value => Number(value || 0));
      const broadcastInventoryChanged = options.broadcastInventoryChanged || (() => {});
      const logDiagnostic = options.logDiagnostic || (async () => {});
      const sessionCorrelationContext = options.sessionCorrelationContext || ((session, extra = {}) => ({ ...(session || {}), ...extra }));
      const reconcileMassRenewalBatchSession = options.reconcileMassRenewalBatchSession || (async () => false);
      let massRenewalMutationChain = Promise.resolve();
      const massRenewalProgressPending = new Map();
      let massRenewalProgressFlushTimer = null;

function massRenewalTerminalOutcome(session) {
  const status = String(session?.status || '');
  const stage = String(session?.stage || '');
  const newAdId = String(session?.newAdId || '');
  if (stage === 'paid-insertion-required') return { status: 'needs-review', reason: session?.lastError || 'Kleinanzeigen verlangt eine kostenpflichtige Einstellung.' };
  if (status === 'verification-failed') {
    return { status: /^\d+$/.test(newAdId) ? 'needs-review' : 'error', reason: session?.lastError || stage || 'verification-failed' };
  }
  if (status === 'waiting-for-online') {
    return { status: 'needs-review', reason: session?.lastError || 'Neue Anzeige ist noch nicht eindeutig online bestätigt.' };
  }
  if (status === 'verified' && stage === 'replacement-ready' && (session?.autoReplacementFailedAt || session?.lastError)) {
    return { status: 'needs-review', reason: session?.lastError || 'Austausch muss geprüft werden.' };
  }
  return null;
}

async function readMassRenewalBatch() {
  const stored = await chrome.storage.local.get(MASS_RENEWAL_BATCH_KEY);
  const batch = stored?.[MASS_RENEWAL_BATCH_KEY];
  if (!batch || typeof batch !== 'object') return null;
  if (batch.createdAt && Date.now() - Date.parse(batch.createdAt) > MASS_RENEWAL_BATCH_MAX_AGE_MS) {
    await chrome.storage.local.remove(MASS_RENEWAL_BATCH_KEY);
    return null;
  }
  return batch;
}

async function writeMassRenewalBatch(batch) {
  if (!batch) {
    await chrome.storage.local.remove(MASS_RENEWAL_BATCH_KEY);
    return null;
  }
  batch.updatedAt = new Date().toISOString();
  await chrome.storage.local.set({ [MASS_RENEWAL_BATCH_KEY]: batch });
  broadcastInventoryChanged('mass-renewal-updated', { batchId: batch.batchId || null, status: batch.status || null, currentIndex: batch.currentIndex ?? null });
  return batch;
}

function massRenewalBatchCounts(batch) {
  const items = Array.isArray(batch?.items) ? batch.items : [];
  return {
    total: items.length,
    success: items.filter(item => item.status === 'success').length,
    attention: items.filter(item => ['needs-review', 'error'].includes(item.status)).length,
    cancelled: items.filter(item => item.status === 'cancelled').length,
    queued: items.filter(item => item.status === 'queued').length,
    running: items.filter(item => ['running', 'retrying'].includes(item.status)).length
  };
}

function massRenewalPublicSnapshot(batch) {
  if (!batch) return null;
  return {
    operationId: batch.operationId || null,
    parentOperationId: batch.parentOperationId || null,
    batchId: batch.batchId,
    revision: Math.max(0, Number(batch.revision || 0)),
    profileId: batch.profileId || null,
    profileName: batch.profileName || null,
    renewalMode: normalizeRenewalMode(batch.renewalMode),
    maxPhaseAttempts: normalizeRenewalPhaseAttempts(batch.maxPhaseAttempts),
    status: batch.status,
    currentIndex: batch.currentIndex ?? null,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
    startedAt: batch.startedAt || null,
    completedAt: batch.completedAt || null,
    stopAfterCurrentRequested: batch.stopAfterCurrentRequested === true,
    stopRequestedAt: batch.stopRequestedAt || null,
    stoppedAt: batch.stoppedAt || null,
    counts: massRenewalBatchCounts(batch),
    items: (batch.items || []).map(item => ({
      index: item.index,
      inventoryId: item.inventoryId,
      sourceAdId: item.sourceAdId || null,
      title: item.title || '',
      priceLabel: item.priceLabel || '',
      endDateLabel: item.endDateLabel || '',
      status: item.status || 'queued',
      stage: item.stage || null,
      operationId: item.operationId || null,
      parentOperationId: item.parentOperationId || batch.operationId || null,
      renewalId: item.renewalId || null,
      renewalStatus: item.renewalStatus || null,
      newAdId: item.newAdId || null,
      newInventoryId: item.newInventoryId || null,
      publicAvailabilityPending: item.publicAvailabilityPending === true,
      lastError: item.lastError || null,
      startedAt: item.startedAt || null,
      completedAt: item.completedAt || null
    }))
  };
}

function massRenewalProgressKey(session) {
  const batchId = String(session?.massBatchId || '');
  const renewalId = String(session?.renewalId || '');
  return batchId && renewalId ? `${batchId}|${renewalId}` : '';
}

function cloneMassRenewalProgressSession(session) {
  return {
    renewalId: session?.renewalId || null,
    massBatchId: session?.massBatchId || null,
    massBatchItemIndex: session?.massBatchItemIndex ?? null,
    status: session?.status || null,
    stage: session?.stage || null,
    newAdId: session?.newAdId || null,
    publicAvailabilityPending: session?.publicAvailabilityPending === true,
    lastError: session?.lastError || null,
    operationId: session?.operationId || null,
    parentOperationId: session?.parentOperationId || null,
    fillId: session?.fillId || null,
    updatedAt: session?.updatedAt || null
  };
}

function dropMassRenewalProgress(session) {
  const key = massRenewalProgressKey(session);
  if (key) massRenewalProgressPending.delete(key);
}

function scheduleMassRenewalProgressFlush() {
  if (massRenewalProgressFlushTimer || !massRenewalProgressPending.size) return;
  massRenewalProgressFlushTimer = setTimeout(() => {
    massRenewalProgressFlushTimer = null;
    void flushMassRenewalProgress().catch(() => {});
  }, MASS_RENEWAL_PROGRESS_FLUSH_MS);
}

async function flushMassRenewalProgress() {
  if (massRenewalProgressFlushTimer) {
    clearTimeout(massRenewalProgressFlushTimer);
    massRenewalProgressFlushTimer = null;
  }
  if (!massRenewalProgressPending.size) return 0;
  const pending = [...massRenewalProgressPending.values()];
  massRenewalProgressPending.clear();
  let flushed = 0;
  for (const session of pending) {
    const changed = await reconcileMassRenewalBatchSession(session, { progressOnly: true }).catch(() => false);
    if (changed) flushed += 1;
  }
  return flushed;
}

function queueMassRenewalProgress(session) {
  const key = massRenewalProgressKey(session);
  if (!key) return false;
  massRenewalProgressPending.set(key, cloneMassRenewalProgressSession(session));
  scheduleMassRenewalProgressFlush();
  return true;
}

function withMassRenewalMutation(task) {
  const run = massRenewalMutationChain.then(task, task);
  massRenewalMutationChain = run.catch(async error => {
    const batch = await readMassRenewalBatch().catch(() => null);
    await logDiagnostic('error', 'MASS_RENEWAL_BATCH_MUTATION_FAILED', {
      message: String(error?.message || error).slice(0, 800),
      stack: String(error?.stack || '').slice(0, 2400)
    }, {
      module: 'background',
      operation: 'mass-renewal-state',
      context: batch ? sessionCorrelationContext(batch, { massBatchId: batch.batchId || null }) : {}
    }).catch(() => {});
  });
  return run;
}

async function mutateMassRenewalBatch(batchId, mutator) {
  const expectedId = String(batchId || '');
  return withMassRenewalMutation(async () => {
    const batch = await readMassRenewalBatch();
    if (!batch || (expectedId && String(batch.batchId || '') !== expectedId)) return { batch, changed: false, result: null };
    const outcome = await mutator(batch) || {};
    const changed = outcome.changed !== false;
    if (changed) {
      batch.revision = Math.max(0, Number(batch.revision || 0)) + 1;
      await writeMassRenewalBatch(batch);
    }
    return { batch, changed, result: outcome.result ?? null };
  });
}

function touchMassRenewalItemProgress(item, now = new Date().toISOString()) {
  if (item) item.lastProgressAt = now;
}

function applyMassRenewalStopState(batch) {
  if (!batch?.stopAfterCurrentRequested) return { stopped: false, cancelled: 0, counts: massRenewalBatchCounts(batch) };
  if ((batch.items || []).some(item => ['running', 'retrying'].includes(String(item.status || '')))) {
    return { stopped: false, cancelled: 0, counts: massRenewalBatchCounts(batch) };
  }
  const now = new Date().toISOString();
  let cancelled = 0;
  for (const item of batch.items || []) {
    if (item.status !== 'queued') continue;
    item.status = 'cancelled';
    item.stage = 'not-started-after-stop';
    item.lastError = null;
    item.completedAt = now;
    touchMassRenewalItemProgress(item, now);
    cancelled += 1;
  }
  batch.currentIndex = null;
  batch.stoppedAt = batch.stoppedAt || now;
  batch.completedAt = batch.completedAt || now;
  const counts = massRenewalBatchCounts(batch);
  batch.status = counts.attention ? 'stopped-with-attention' : 'stopped';
  return { stopped: true, cancelled, counts };
}

function applyMassRenewalFinalState(batch) {
  if (batch?.stopAfterCurrentRequested) return applyMassRenewalStopState(batch);
  const counts = massRenewalBatchCounts(batch);
  if (counts.queued || counts.running) return { completed: false, counts };
  batch.currentIndex = null;
  batch.status = counts.cancelled ? (counts.attention ? 'stopped-with-attention' : 'stopped') : (counts.attention ? 'complete-with-attention' : 'complete');
  batch.completedAt = batch.completedAt || new Date().toISOString();
  return { completed: true, counts };
}

async function stopMassRenewalBatchBeforeNext(batchId) {
  const id = String(batchId || '');
  let result = null;
  const mutation = await mutateMassRenewalBatch(id, batch => {
    result = applyMassRenewalStopState(batch);
    return { changed: result.stopped };
  });
  if (result?.stopped && mutation.batch) {
    await logDiagnostic(result.counts.attention ? 'warning' : 'info', 'MASS_RENEWAL_BATCH_STOPPED', {
      batchId: id, renewalMode: mutation.batch.renewalMode, total: result.counts.total,
      success: result.counts.success, attention: result.counts.attention, cancelled: result.cancelled
    }, { module: 'background', operation: 'mass-renewal', context: sessionCorrelationContext(mutation.batch, { massBatchId: id }) }).catch(() => {});
  }
  return Boolean(result?.stopped);
}

async function finalizeMassRenewalBatchIfDone(batchId) {
  const id = String(batchId || '');
  const batch = await readMassRenewalBatch();
  if (batch && String(batch.batchId || '') === id) {
    if (batch.stopAfterCurrentRequested) return stopMassRenewalBatchBeforeNext(id);
  }
  let result = null;
  const mutation = await mutateMassRenewalBatch(id, batch => {
    result = applyMassRenewalFinalState(batch);
    return { changed: Boolean(result.completed || result.stopped) };
  });
  if ((result?.completed || result?.stopped) && mutation.batch) {
    const event = result.stopped ? 'MASS_RENEWAL_BATCH_STOPPED' : 'MASS_RENEWAL_BATCH_COMPLETED';
    await logDiagnostic(result.counts.attention ? 'warning' : 'info', event, {
      batchId: id, renewalMode: mutation.batch.renewalMode, total: result.counts.total,
      success: result.counts.success, attention: result.counts.attention, cancelled: result.counts.cancelled
    }, { module: 'background', operation: 'mass-renewal', context: sessionCorrelationContext(batch, { massBatchId: id }) }).catch(() => {});
  }
  return Boolean(result?.completed || result?.stopped);
}

      return Object.freeze({
        massRenewalTerminalOutcome,
        readMassRenewalBatch,
        writeMassRenewalBatch,
        massRenewalBatchCounts,
        massRenewalPublicSnapshot,
        dropMassRenewalProgress,
        flushMassRenewalProgress,
        queueMassRenewalProgress,
        withMassRenewalMutation,
        mutateMassRenewalBatch,
        touchMassRenewalItemProgress,
        applyMassRenewalStopState,
        applyMassRenewalFinalState,
        stopMassRenewalBatchBeforeNext,
        finalizeMassRenewalBatchIfDone
      });
    }
  });
  globalThis.KRDeps?.register?.('KRMassRenewalController', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
