(() => {
  'use strict';
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before mass-renewal-workflow-controller.js');
  const API = Object.freeze({
    create(options = {}) {
      const {
        readRenewalSessions, writeRenewalSessions,
        mutateMassRenewalBatch, applyMassRenewalStopState, applyMassRenewalFinalState,
        touchMassRenewalItemProgress, massRenewalTerminalOutcome, massRenewalPublicSnapshot,
        readMassRenewalBatch, writeMassRenewalBatch, withMassRenewalMutation, dropMassRenewalProgress,
        logDiagnostic, sessionCorrelationContext, normalizeRenewalPhaseAttempts,
        startTemplateFillUnlocked, withInsertionStartGate, assertInsertionStartAvailable,
        getProfileState, assertSelectedProfileMatchesLiveAccount, getInventory, isTrashRecord,
        assertTemplateSourceReady, getRenewalConfiguration, normalizeRenewalMode,
        finishRenewalReplacement, retryRenewalVerification, discardRenewalDraft,
        publicAvailabilityPending, readFillSessions, classifyKleinanzeigenInsertionErrorUrl,
        terminalizeTemplateFillOnPlatformError, terminalizeTemplateFillForWatchdog, persistRenewalSession,
        cryptoApi, chromeApi, queueMicrotaskFn, setTimeoutFn, clearTimeoutFn,
        MASS_RENEWAL_MAX_ITEMS, MASS_RENEWAL_WATCHDOG_STALE_MS, MASS_RENEWAL_WATCHDOG_TICK_MS,
        UNASSIGNED_PROFILE_ID
      } = options;
      const required = {
        readRenewalSessions, writeRenewalSessions, mutateMassRenewalBatch, applyMassRenewalStopState,
        applyMassRenewalFinalState, touchMassRenewalItemProgress, massRenewalTerminalOutcome,
        massRenewalPublicSnapshot, readMassRenewalBatch, writeMassRenewalBatch, withMassRenewalMutation,
        dropMassRenewalProgress, logDiagnostic, sessionCorrelationContext, normalizeRenewalPhaseAttempts,
        startTemplateFillUnlocked, withInsertionStartGate, assertInsertionStartAvailable, getProfileState,
        assertSelectedProfileMatchesLiveAccount, getInventory, isTrashRecord, assertTemplateSourceReady,
        getRenewalConfiguration, normalizeRenewalMode, finishRenewalReplacement, retryRenewalVerification,
        discardRenewalDraft, publicAvailabilityPending, readFillSessions, classifyKleinanzeigenInsertionErrorUrl,
        terminalizeTemplateFillOnPlatformError, terminalizeTemplateFillForWatchdog, persistRenewalSession,
        cryptoApi, chromeApi, queueMicrotaskFn, setTimeoutFn, clearTimeoutFn
      };
      for (const [name, value] of Object.entries(required)) {
        if (value == null) throw new Error(`Mass renewal workflow dependency missing: ${name}`);
      }
      const massRenewalAdvanceInFlight = new Set();
      function resetRuntimeState() {
        massRenewalAdvanceInFlight.clear();
        if (massRenewalWatchdogService) massRenewalWatchdogService.resetRuntimeState();
        return true;
      }

async function findMassRenewalSessionForItem(batchId, itemIndex) {
  const renewals = await readRenewalSessions().catch(() => ({}));
  const matches = Object.values(renewals).filter(session =>
    String(session?.massBatchId || '') === String(batchId || '') &&
    Number(session?.massBatchItemIndex) === Number(itemIndex)
  );
  matches.sort((a, b) => Date.parse(b?.updatedAt || b?.createdAt || '') - Date.parse(a?.updatedAt || a?.createdAt || ''));
  return matches[0] || null;
}

async function startNextMassRenewalItem(batchId) {
  const id = String(batchId || '');
  if (!id || massRenewalAdvanceInFlight.has(id)) return null;
  massRenewalAdvanceInFlight.add(id);
  try {
    let selected = null;
    let terminalDecision = null;
    const mutation = await mutateMassRenewalBatch(id, batch => {
      if (batch.status !== 'running') return { changed: false };
      if ((batch.items || []).some(item => ['running', 'retrying'].includes(String(item.status || '')))) return { changed: false };
      if (batch.stopAfterCurrentRequested) {
        terminalDecision = applyMassRenewalStopState(batch);
        return { changed: terminalDecision.stopped };
      }
      const item = (batch.items || []).find(entry => entry.status === 'queued');
      if (!item) {
        terminalDecision = applyMassRenewalFinalState(batch);
        return { changed: Boolean(terminalDecision.completed || terminalDecision.stopped) };
      }
      const now = new Date().toISOString();
      item.status = 'running';
      item.stage = 'starting';
      item.startedAt = now;
      item.completedAt = null;
      item.lastError = null;
      item.startAttemptId = cryptoApi.randomUUID();
      touchMassRenewalItemProgress(item, now);
      batch.currentIndex = item.index;
      selected = { index: item.index, inventoryId: item.inventoryId, sourceAdId: item.sourceAdId, startAttemptId: item.startAttemptId, renewalMode: batch.renewalMode, maxPhaseAttempts: normalizeRenewalPhaseAttempts(batch.maxPhaseAttempts) };
      return { changed: true };
    });
    const batch = mutation.batch;
    if (!batch || String(batch.batchId || '') !== id) return massRenewalPublicSnapshot(batch);
    if (!selected) {
      if (terminalDecision?.stopped) {
        await logDiagnostic(terminalDecision.counts.attention ? 'warning' : 'info', 'MASS_RENEWAL_BATCH_STOPPED', {
          batchId: id, renewalMode: batch.renewalMode, total: terminalDecision.counts.total,
          success: terminalDecision.counts.success, attention: terminalDecision.counts.attention, cancelled: terminalDecision.cancelled
        }, { module: 'background', operation: 'mass-renewal', context: sessionCorrelationContext(batch, { massBatchId: id }) }).catch(() => {});
      } else if (terminalDecision?.completed) {
        await logDiagnostic(terminalDecision.counts.attention ? 'warning' : 'info', 'MASS_RENEWAL_BATCH_COMPLETED', {
          batchId: id, renewalMode: batch.renewalMode, total: terminalDecision.counts.total,
          success: terminalDecision.counts.success, attention: terminalDecision.counts.attention
        }, { module: 'background', operation: 'mass-renewal', context: sessionCorrelationContext(batch, { massBatchId: id }) }).catch(() => {});
      }
      return massRenewalPublicSnapshot(batch);
    }

    armMassRenewalWatchdog();
    const item = selected;
    try {
      const started = await startTemplateFillUnlocked(item.inventoryId, {
        autoReplacementAllowed: true,
        parentOperationId: batch.operationId || null,
        startConfirmationVersion: 1,
        renewalModeOverride: batch.renewalMode,
        maxPhaseAttemptsOverride: batch.maxPhaseAttempts,
        massBatchId: batch.batchId,
        massBatchItemIndex: item.index
      });
      await mutateMassRenewalBatch(id, current => {
        const item = current.items?.find(entry => Number(entry.index) === Number(selected.index));
        if (!item || !['running', 'retrying'].includes(String(item.status || ''))) return { changed: false };
        if (item.startAttemptId && item.startAttemptId !== selected.startAttemptId) return { changed: false };
        item.operationId = started.operationId || item.operationId || null;
        item.parentOperationId = started.parentOperationId || batch.operationId || item.parentOperationId || null;
        item.renewalId = started.renewalId || item.renewalId || null;
        if (item.stage === 'starting') item.stage = 'renewal-started';
        item.renewalStatus = item.renewalStatus || 'draft';
        touchMassRenewalItemProgress(item);
        return { changed: true };
      });
      await logDiagnostic('info', 'MASS_RENEWAL_ITEM_STARTED', {
        operationId: started.operationId || null, parentOperationId: started.parentOperationId || batch.operationId || null,
        batchId: id, index: selected.index, inventoryId: selected.inventoryId, sourceAdId: selected.sourceAdId, renewalId: started.renewalId || null
      }, { module: 'background', operation: 'mass-renewal', context: sessionCorrelationContext(started, { parentOperationId: started.parentOperationId || batch.operationId || null, massBatchId: id, renewalId: started.renewalId || null, adId: selected.sourceAdId || null }) }).catch(() => {});
    } catch (error) {
      let failed = null;
      await mutateMassRenewalBatch(id, current => {
        const item = current.items?.find(entry => Number(entry.index) === Number(selected.index));
        if (!item || !['running', 'retrying'].includes(String(item.status || ''))) return { changed: false };
        if (item.startAttemptId && item.startAttemptId !== selected.startAttemptId) return { changed: false };
        item.status = 'error';
        item.stage = 'start-failed';
        item.lastError = String(error.message || error).slice(0, 800);
        item.completedAt = new Date().toISOString();
        touchMassRenewalItemProgress(item, item.completedAt);
        current.currentIndex = null;
        failed = { ...item };
        return { changed: true };
      });
      if (failed) {
        await logDiagnostic('warning', 'MASS_RENEWAL_ITEM_ATTENTION_REQUIRED', {
          batchId: id, index: selected.index, inventoryId: selected.inventoryId, status: 'error', stage: failed.stage, message: failed.lastError
        }, { module: 'background', operation: 'mass-renewal', context: sessionCorrelationContext(batch, { massBatchId: id, adId: selected.sourceAdId || null }) }).catch(() => {});
      }
      queueMicrotaskFn(() => { void startNextMassRenewalItem(id).catch(() => {}); });
    }
    return massRenewalPublicSnapshot(await readMassRenewalBatch());
  } finally {
    massRenewalAdvanceInFlight.delete(id);
  }
}

async function reconcileMassRenewalBatchSession(session, options = {}) {
  const batchId = String(session?.massBatchId || '');
  if (!batchId) return false;
  let terminalized = false;
  let snapshot = null;
  const mutation = await mutateMassRenewalBatch(batchId, batch => {
    const item = (batch.items || []).find(entry => String(entry.renewalId || '') === String(session.renewalId || '') || Number(entry.index) === Number(session.massBatchItemIndex));
    if (!item) return { changed: false };
    if (options.progressOnly === true && !['running', 'retrying'].includes(String(item.status || ''))) return { changed: false };
    const before = JSON.stringify([item.renewalId, item.renewalStatus, item.stage, item.newAdId, item.publicAvailabilityPending, item.lastError]);
    item.renewalId = session.renewalId || item.renewalId || null;
    item.renewalStatus = session.status || null;
    item.stage = session.stage || item.stage || null;
    item.newAdId = session.newAdId || item.newAdId || null;
    item.publicAvailabilityPending = session.publicAvailabilityPending === true;
    if (session.lastError) item.lastError = session.lastError;
    const after = JSON.stringify([item.renewalId, item.renewalStatus, item.stage, item.newAdId, item.publicAvailabilityPending, item.lastError]);
    if (before !== after) touchMassRenewalItemProgress(item);
    const terminal = massRenewalTerminalOutcome(session);
    if (terminal && ['running', 'retrying'].includes(String(item.status || ''))) {
      item.status = terminal.status;
      item.lastError = String(terminal.reason || session.lastError || '').slice(0, 800) || null;
      item.completedAt = new Date().toISOString();
      touchMassRenewalItemProgress(item, item.completedAt);
      batch.currentIndex = null;
      if (String(session.stage || '') === 'paid-insertion-required') {
        batch.stopAfterCurrentRequested = true;
        batch.stopRequestedAt = batch.stopRequestedAt || item.completedAt;
      }
      terminalized = true;
    }
    snapshot = { ...item };
    return { changed: before !== after || terminalized };
  });
  if (!mutation.batch || !snapshot) return false;
  if (!terminalized) return false;

  session.massBatchTerminal = true;
  const sessions = await readRenewalSessions();
  if (sessions[session.renewalId]) {
    sessions[session.renewalId] = session;
    await writeRenewalSessions(sessions);
  }
  if (String(session.stage || '') === 'paid-insertion-required') {
    await logDiagnostic('warning', 'MASS_RENEWAL_PAID_INSERTION_STOPPED', {
      batchId, index: snapshot.index, inventoryId: snapshot.inventoryId, renewalId: session.renewalId,
      status: snapshot.status, stage: snapshot.stage, message: snapshot.lastError
    }, { module: 'background', operation: 'mass-renewal', context: sessionCorrelationContext(session, { massBatchId: batchId, renewalId: session.renewalId, adId: snapshot.sourceAdId || null }) }).catch(() => {});
  }
  await logDiagnostic('warning', 'MASS_RENEWAL_ITEM_ATTENTION_REQUIRED', {
    batchId, index: snapshot.index, inventoryId: snapshot.inventoryId, renewalId: session.renewalId,
    status: snapshot.status, stage: snapshot.stage, newAdId: snapshot.newAdId || null, message: snapshot.lastError
  }, { module: 'background', operation: 'mass-renewal', context: sessionCorrelationContext(session, { massBatchId: batchId, renewalId: session.renewalId, adId: snapshot.newAdId || snapshot.sourceAdId || null }) }).catch(() => {});
  queueMicrotaskFn(() => { void startNextMassRenewalItem(batchId).catch(() => {}); });
  return true;
}

async function markMassRenewalItemSucceeded(session, result = {}) {
  const batchId = String(session?.massBatchId || '');
  if (!batchId) return false;
  dropMassRenewalProgress(session);
  let snapshot = null;
  let finalState = null;
  let batchStatusNormalized = false;
  let batchStatusBefore = null;
  let batchStatusAfter = null;
  const mutation = await mutateMassRenewalBatch(batchId, batch => {
    const item = (batch.items || []).find(entry => String(entry.renewalId || '') === String(session.renewalId || '') || Number(entry.index) === Number(session.massBatchItemIndex));
    if (!item) return { changed: false };
    const previousBatchStatus = String(batch.status || '');
    item.status = 'success';
    item.stage = 'complete';
    item.renewalStatus = 'replaced';
    item.newAdId = String(session.newAdId || result.adId || item.newAdId || '') || null;
    item.newInventoryId = String(result.inventoryId || item.newAdId || '') || null;
    item.publicAvailabilityPending = session.publicAvailabilityPending === true;
    item.lastError = null;
    item.completedAt = new Date().toISOString();
    touchMassRenewalItemProgress(item, item.completedAt);
    batch.currentIndex = null;
    finalState = applyMassRenewalFinalState(batch);
    batchStatusBefore = previousBatchStatus;
    batchStatusAfter = String(batch.status || '');
    batchStatusNormalized = previousBatchStatus !== batchStatusAfter;
    snapshot = { ...item };
    return { changed: true };
  });
  if (!mutation.batch || !snapshot) return false;
  await logDiagnostic('info', 'MASS_RENEWAL_ITEM_SUCCEEDED', {
    batchId, index: snapshot.index, inventoryId: snapshot.inventoryId, renewalId: session.renewalId,
    newAdId: snapshot.newAdId, newInventoryId: snapshot.newInventoryId,
    publicAvailabilityPending: snapshot.publicAvailabilityPending === true
  }, { module: 'background', operation: 'mass-renewal', context: sessionCorrelationContext(session, { massBatchId: batchId, renewalId: session.renewalId, adId: snapshot.newAdId || null }) }).catch(() => {});
  if (batchStatusNormalized) {
    await logDiagnostic('info', 'MASS_RENEWAL_BATCH_STATUS_NORMALIZED', {
      batchId,
      previousStatus: batchStatusBefore,
      status: batchStatusAfter,
      total: finalState?.counts?.total ?? null,
      success: finalState?.counts?.success ?? null,
      attention: finalState?.counts?.attention ?? null,
      cancelled: finalState?.counts?.cancelled ?? null
    }, { module: 'background', operation: 'mass-renewal', context: sessionCorrelationContext(mutation.batch, { massBatchId: batchId }) }).catch(() => {});
  }
  if (finalState?.completed) {
    await logDiagnostic(finalState.counts.attention ? 'warning' : 'info', 'MASS_RENEWAL_BATCH_COMPLETED', {
      batchId, renewalMode: mutation.batch.renewalMode, total: finalState.counts.total,
      success: finalState.counts.success, attention: finalState.counts.attention, cancelled: finalState.counts.cancelled
    }, { module: 'background', operation: 'mass-renewal', context: sessionCorrelationContext(mutation.batch, { massBatchId: batchId }) }).catch(() => {});
  } else {
    queueMicrotaskFn(() => { void startNextMassRenewalItem(batchId).catch(() => {}); });
  }
  return true;
}

async function startMassRenewalBatch(message) {
  return withInsertionStartGate(async () => {
    await assertInsertionStartAvailable({ kind: 'mass-renewal' });
    const ids = [...new Set((Array.isArray(message?.inventoryIds) ? message.inventoryIds : []).map(value => String(value || '')).filter(Boolean))];
    if (!ids.length) throw new Error('Wähle mindestens eine Anzeige aus.');
    if (ids.length > MASS_RENEWAL_MAX_ITEMS) throw new Error(`Pro Durchlauf können maximal ${MASS_RENEWAL_MAX_ITEMS} Anzeigen ausgewählt werden.`);
    const profileState = await getProfileState();
    const profileId = String(profileState?.selectedProfileId || '');
    if (!profileId || profileId === UNASSIGNED_PROFILE_ID) throw new Error('Wähle zuerst ein konkretes Inventarprofil aus.');
    const profile = (profileState?.profiles || []).find(entry => String(entry.profileId || '') === profileId);
    if (!profile) throw new Error('Das ausgewählte Inventarprofil wurde nicht gefunden.');
    await assertSelectedProfileMatchesLiveAccount({ expectedProfileId: profileId, expectedProfileName: profile.displayName, purpose: 'mass-renewal' });
    const records = [];
    for (const inventoryId of ids) {
      const record = await getInventory(inventoryId);
      if (!record || isTrashRecord(record)) throw new Error('Mindestens eine ausgewählte Anzeige wurde nicht gefunden.');
      if (String(record.profileId || '') !== profileId) throw new Error('Alle ausgewählten Anzeigen müssen zum aktuell ausgewählten Inventarprofil gehören.');
      if (record?.renewal?.renewalId || String(record?.recordKind || '').startsWith('renewal-')) throw new Error('Entwürfe können nicht zum gemeinsamen Neu-Inserieren ausgewählt werden.');
      assertTemplateSourceReady(record);
      records.push(record);
    }
    const configuration = await getRenewalConfiguration();
    const now = new Date().toISOString();
    const batch = {
      operationId: cryptoApi.randomUUID(), parentOperationId: null,
      batchId: cryptoApi.randomUUID(), revision: 1, profileId, profileName: profile.displayName || null,
      renewalMode: normalizeRenewalMode(configuration.renewalMode), maxPhaseAttempts: normalizeRenewalPhaseAttempts(configuration.maxPhaseAttempts), status: 'running', currentIndex: null,
      createdAt: now, startedAt: now, updatedAt: now, completedAt: null,
      stopAfterCurrentRequested: false, stopRequestedAt: null, stoppedAt: null,
      items: records.map((record, index) => ({
        index, inventoryId: String(record.inventoryId), sourceAdId: String(record.adId || ''),
        title: String(record.title || `Anzeige ${record.adId || ''}`).slice(0, 220),
        priceLabel: String(record.price?.displayed || record.price?.value || '').slice(0, 80),
        endDateLabel: String(record.listingMeta?.endDateDisplay || record.endDateDisplay || '').slice(0, 80),
        status: 'queued', stage: 'queued', operationId: null, parentOperationId: null, renewalId: null, renewalStatus: null, newAdId: null, newInventoryId: null, publicAvailabilityPending: false,
        lastError: null, startedAt: null, completedAt: null, lastProgressAt: null, startAttemptId: null
      }))
    };
    await withMassRenewalMutation(() => writeMassRenewalBatch(batch));
    await logDiagnostic('info', 'MASS_RENEWAL_BATCH_STARTED', {
      operationId: batch.operationId, batchId: batch.batchId, profileId, profileName: batch.profileName, renewalMode: batch.renewalMode, maxPhaseAttempts: batch.maxPhaseAttempts, itemCount: batch.items.length
    }, { module: 'background', operation: 'mass-renewal', context: sessionCorrelationContext(batch, { massBatchId: batch.batchId }) }).catch(() => {});
    armMassRenewalWatchdog();
    queueMicrotaskFn(() => { void startNextMassRenewalItem(batch.batchId).catch(() => {}); });
    return massRenewalPublicSnapshot(batch);
  });
}

async function requestMassRenewalStopAfterCurrent(message) {
  const requestedId = String(message?.batchId || '');
  let stopRequested = false;
  let stopResult = null;
  const mutation = await mutateMassRenewalBatch(requestedId, batch => {
    if (batch.status !== 'running') return { changed: false };
    if (batch.stopAfterCurrentRequested !== true) {
      batch.stopAfterCurrentRequested = true;
      batch.stopRequestedAt = new Date().toISOString();
      stopRequested = true;
    }
    if (!((batch.items || []).some(item => ['running', 'retrying'].includes(String(item.status || ''))))) stopResult = applyMassRenewalStopState(batch);
    return { changed: stopRequested || Boolean(stopResult?.stopped) };
  });
  const batch = mutation.batch;
  if (!batch || (requestedId && String(batch.batchId || '') !== requestedId)) throw new Error('Der Vorgang zum Neu-Inserieren wurde nicht gefunden.');
  if (stopRequested) {
    await logDiagnostic('info', 'MASS_RENEWAL_BATCH_STOP_REQUESTED', { batchId: batch.batchId, currentIndex: batch.currentIndex ?? null }, { module: 'background', operation: 'mass-renewal', context: sessionCorrelationContext(batch, { massBatchId: batch.batchId }) }).catch(() => {});
  }
  if (stopResult?.stopped) {
    await logDiagnostic(stopResult.counts.attention ? 'warning' : 'info', 'MASS_RENEWAL_BATCH_STOPPED', {
      batchId: batch.batchId, renewalMode: batch.renewalMode, total: stopResult.counts.total,
      success: stopResult.counts.success, attention: stopResult.counts.attention, cancelled: stopResult.cancelled
    }, { module: 'background', operation: 'mass-renewal', context: sessionCorrelationContext(batch, { massBatchId: batch.batchId }) }).catch(() => {});
  }
  return massRenewalPublicSnapshot(batch);
}

async function normalizeMassRenewalBatchTopLevelStatus(batchId = '', trigger = 'status-query') {
  const requestedId = String(batchId || '');
  let previousStatus = null;
  let normalizedStatus = null;
  let finalState = null;
  const mutation = await mutateMassRenewalBatch(requestedId, batch => {
    const counts = massRenewalBatchCounts(batch);
    if (counts.queued || counts.running) return { changed: false };
    previousStatus = String(batch.status || '');
    finalState = applyMassRenewalFinalState(batch);
    normalizedStatus = String(batch.status || '');
    return { changed: previousStatus !== normalizedStatus };
  });
  if (mutation.changed && mutation.batch) {
    await logDiagnostic('info', 'MASS_RENEWAL_BATCH_STATUS_NORMALIZED', {
      batchId: mutation.batch.batchId || requestedId || null,
      trigger,
      previousStatus,
      status: normalizedStatus,
      total: finalState?.counts?.total ?? null,
      success: finalState?.counts?.success ?? null,
      attention: finalState?.counts?.attention ?? null,
      cancelled: finalState?.counts?.cancelled ?? null
    }, { module: 'background', operation: 'mass-renewal', context: sessionCorrelationContext(mutation.batch, { massBatchId: mutation.batch.batchId || requestedId || null }) }).catch(() => {});
  }
  return mutation.batch;
}

async function getMassRenewalBatchStatus() {
  await runMassRenewalWatchdog({ trigger: 'status-query' }).catch(() => false);
  const current = await readMassRenewalBatch();
  if (!current) return null;
  const normalized = await normalizeMassRenewalBatchTopLevelStatus(current.batchId, 'status-query').catch(() => current);
  return massRenewalPublicSnapshot(normalized || current);
}

async function retryMassRenewalItem(message) {
  const batchId = String(message?.batchId || '');
  const index = Number(message?.index);
  let snapshot = null;
  const initial = await mutateMassRenewalBatch(batchId, batch => {
    if (batch.status === 'running') throw new Error('Das Neu-Inserieren verarbeitet noch weitere Anzeigen. Wiederholungen sind erst in der Übersicht möglich.');
    const item = (batch.items || []).find(entry => Number(entry.index) === index);
    if (!item || !['needs-review', 'error'].includes(String(item.status || ''))) throw new Error('Diese Anzeige benötigt aktuell keine Wiederholung.');
    batch.status = 'running'; batch.completedAt = null; batch.stopAfterCurrentRequested = false; batch.stopRequestedAt = null; batch.stoppedAt = null; batch.currentIndex = index;
    item.status = 'retrying'; item.lastError = null; item.completedAt = null; touchMassRenewalItemProgress(item); snapshot = { ...item };
    return { changed: true };
  });
  if (!initial.batch) throw new Error('Der Vorgang zum Neu-Inserieren wurde nicht gefunden.');
  armMassRenewalWatchdog();
  const renewals = await readRenewalSessions();
  const session = snapshot?.renewalId ? renewals[snapshot.renewalId] : null;
  try {
    if (session && /^\d+$/.test(String(session.newAdId || ''))) {
      session.massBatchTerminal = false;
      const all = await readRenewalSessions(); all[session.renewalId] = session; await writeRenewalSessions(all);
      if ((String(session.status || '') === 'verified' || String(session.stage || '') === 'replacement-ready') && session.lastError) await finishRenewalReplacement({ renewalId: session.renewalId, automatic: false, massBatchRetry: true });
      else await retryRenewalVerification({ renewalId: session.renewalId, massBatchRetry: true });
    } else {
      if (session?.renewalId) await discardRenewalDraft({ renewalId: session.renewalId });
      await mutateMassRenewalBatch(batchId, batch => {
        const item = batch.items?.find(entry => Number(entry.index) === index);
        if (!item) return { changed: false };
        item.operationId = null; item.parentOperationId = batch.operationId || null; item.renewalId = null; item.renewalStatus = null; item.newAdId = null; item.publicAvailabilityPending = false; item.stage = 'queued'; item.status = 'queued'; item.startAttemptId = null; batch.currentIndex = null; touchMassRenewalItemProgress(item);
        return { changed: true };
      });
      await startNextMassRenewalItem(batchId);
    }
  } catch (error) {
    await mutateMassRenewalBatch(batchId, batch => {
      const item = batch.items?.find(entry => Number(entry.index) === index);
      if (!item || !['retrying', 'running'].includes(String(item.status || ''))) return { changed: false };
      item.status = 'needs-review'; item.stage = 'retry-failed'; item.lastError = String(error.message || error).slice(0, 800); item.completedAt = new Date().toISOString(); touchMassRenewalItemProgress(item, item.completedAt); batch.currentIndex = null; applyMassRenewalFinalState(batch);
      return { changed: true };
    });
    const latest = await readMassRenewalBatch().catch(() => null);
    const latestItem = latest?.items?.find(entry => Number(entry.index) === index);
    const latestRenewals = await readRenewalSessions().catch(() => ({}));
    const retrySession = latestItem?.renewalId ? latestRenewals[latestItem.renewalId] : null;
    if (retrySession) { retrySession.massBatchTerminal = true; latestRenewals[retrySession.renewalId] = retrySession; await writeRenewalSessions(latestRenewals).catch(() => {}); }
    throw error;
  }
  return getMassRenewalBatchStatus();
}

async function resumeMassRenewalBatch() {
  const batch = await readMassRenewalBatch();
  if (!batch || batch.status !== 'running') return massRenewalPublicSnapshot(batch);
  armMassRenewalWatchdog();
  const running = (batch.items || []).find(item => ['running', 'retrying'].includes(String(item.status || '')));
  if (running) {
    let session = null;
    if (running.renewalId) {
      const renewals = await readRenewalSessions(); session = renewals[running.renewalId] || null;
    } else {
      session = await findMassRenewalSessionForItem(batch.batchId, running.index);
      if (session?.renewalId) {
        await mutateMassRenewalBatch(batch.batchId, current => {
          const item = current.items?.find(entry => Number(entry.index) === Number(running.index));
          if (!item || !['running', 'retrying'].includes(String(item.status || '')) || item.renewalId) return { changed: false };
          item.operationId = session.operationId || item.operationId || null; item.parentOperationId = session.parentOperationId || batch.operationId || item.parentOperationId || null; item.renewalId = session.renewalId; item.renewalStatus = session.status || item.renewalStatus || null; item.stage = session.stage || item.stage; touchMassRenewalItemProgress(item, session.updatedAt || new Date().toISOString());
          return { changed: true };
        });
        await logDiagnostic('info', 'MASS_RENEWAL_RECOVERY_RENEWAL_REBOUND', { batchId: batch.batchId, index: running.index, renewalId: session.renewalId }, { module: 'background', operation: 'mass-renewal-recovery', context: sessionCorrelationContext(session, { massBatchId: batch.batchId, renewalId: session.renewalId }) }).catch(() => {});
      }
    }
    if (session) { await reconcileMassRenewalBatchSession(session); return getMassRenewalBatchStatus(); }

    if (!running.renewalId && String(running.stage || '') === 'starting') {
      let requeued = false;
      await mutateMassRenewalBatch(batch.batchId, current => {
        const item = current.items?.find(entry => Number(entry.index) === Number(running.index));
        if (!item || !['running', 'retrying'].includes(String(item.status || '')) || item.renewalId) return { changed: false };
        item.status = 'queued'; item.stage = 'recovery-starting-requeued'; item.startedAt = null; item.completedAt = null; item.startAttemptId = null; item.lastError = null; touchMassRenewalItemProgress(item); current.currentIndex = null; requeued = true;
        return { changed: true };
      });
      if (requeued) {
        await logDiagnostic('warning', 'MASS_RENEWAL_RECOVERY_STARTING_REQUEUED', { batchId: batch.batchId, index: running.index, inventoryId: running.inventoryId, reason: 'running-without-renewal-id-and-no-matching-session' }, { module: 'background', operation: 'mass-renewal-recovery', context: sessionCorrelationContext(running, { parentOperationId: running.parentOperationId || batch.operationId || null, massBatchId: batch.batchId, adId: running.sourceAdId || null }) }).catch(() => {});
        queueMicrotaskFn(() => { void startNextMassRenewalItem(batch.batchId).catch(() => {}); });
        return getMassRenewalBatchStatus();
      }
    }

    if (/^\d+$/.test(String(running.newAdId || ''))) {
      const existing = await getInventory(String(running.newAdId)).catch(() => null);
      if (existing && !isTrashRecord(existing)) {
        await mutateMassRenewalBatch(batch.batchId, current => {
          const item = current.items?.find(entry => Number(entry.index) === Number(running.index));
          if (!item || !['running', 'retrying'].includes(String(item.status || ''))) return { changed: false };
          item.status = 'success'; item.stage = 'complete'; item.newInventoryId = String(existing.inventoryId || running.newAdId); item.publicAvailabilityPending = publicAvailabilityPending(existing); item.completedAt = new Date().toISOString(); touchMassRenewalItemProgress(item, item.completedAt); current.currentIndex = null;
          return { changed: true };
        });
        queueMicrotaskFn(() => { void startNextMassRenewalItem(batch.batchId).catch(() => {}); });
        return getMassRenewalBatchStatus();
      }
    }

    await mutateMassRenewalBatch(batch.batchId, current => {
      const item = current.items?.find(entry => Number(entry.index) === Number(running.index));
      if (!item || !['running', 'retrying'].includes(String(item.status || ''))) return { changed: false };
      item.status = 'needs-review'; item.stage = 'recovery-session-missing'; item.lastError = 'Der Einzelvorgang konnte nach dem Neustart nicht eindeutig fortgesetzt werden.'; item.completedAt = new Date().toISOString(); touchMassRenewalItemProgress(item, item.completedAt); current.currentIndex = null;
      return { changed: true };
    });
  }
  queueMicrotaskFn(() => { void startNextMassRenewalItem(batch.batchId).catch(() => {}); });
  return getMassRenewalBatchStatus();
}

function latestMassRenewalProgressMs(item, renewal, fill) { return requireMassRenewalWatchdogService().latestMassRenewalProgressMs(item, renewal, fill); }

function armMassRenewalWatchdog() { return requireMassRenewalWatchdogService().armMassRenewalWatchdog(); }

async function runMassRenewalWatchdog(options = {}) { return requireMassRenewalWatchdogService().runMassRenewalWatchdog(options); }

async function massRenewalWatchdogTick(message, sender) { return requireMassRenewalWatchdogService().massRenewalWatchdogTick(message, sender); }

      let massRenewalWatchdogService = null;
      function requireMassRenewalWatchdogService() {
        if (!massRenewalWatchdogService) {
          const serviceApi = options.massRenewalWatchdogServiceApi || globalThis.KRDeps?.require?.('KRMassRenewalWatchdogService');
          if (!serviceApi?.create) throw new Error('mass renewal watchdog service is required');
          massRenewalWatchdogService = serviceApi.create({
            ...options,
            findMassRenewalSessionForItem: (...args) => findMassRenewalSessionForItem(...args),
            startNextMassRenewalItem: (...args) => startNextMassRenewalItem(...args)
          });
        }
        return massRenewalWatchdogService;
      }

      return Object.freeze({
        findMassRenewalSessionForItem,
        startNextMassRenewalItem,
        reconcileMassRenewalBatchSession,
        markMassRenewalItemSucceeded,
        startMassRenewalBatch,
        requestMassRenewalStopAfterCurrent,
        normalizeMassRenewalBatchTopLevelStatus,
        getMassRenewalBatchStatus,
        retryMassRenewalItem,
        resumeMassRenewalBatch,
        latestMassRenewalProgressMs,
        armMassRenewalWatchdog,
        runMassRenewalWatchdog,
        massRenewalWatchdogTick,
        resetRuntimeState
      });
    }
  });
  KRDeps.register('KRMassRenewalWorkflowController', API);
})();
