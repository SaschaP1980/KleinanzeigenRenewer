(() => {
  'use strict';
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before renewal-workflow-controller.js');
  const VerificationFlow = KRDeps.require('KRRenewalVerificationFlow');
  const ReinventoryFlow = KRDeps.require('KRRenewalReinventoryFlow');
  const CheckoutRecoveryService = KRDeps.require('KRPaidCheckoutRecoveryService');
  const API = Object.freeze({
    create(options = {}) {
      const {
        assertMassRenewalManualActionAllowed,
        broadcastInventoryChanged,
        closeManagedWorkerTab,
        closeRegistryTab,
        compareRenewalRecords,
        correlationContext,
        createManagedWorkerTab,
        delay,
        detectPublishedAdForFill,
        dropMassRenewalProgress,
        ensureContentConnection,
        evaluateCheckoutRecoveryProof,
        finishRenewalReplacement,
        withAutonomousAdmission,
        flushDiagnosticBuffer,
        getInventory,
        isCheckoutAbortedRecoveryCandidate,
        isNonRetryableRenewalSafetyError,
        isSafeLegacyManualEmergencyReset,
        logDiagnostic,
        logRenewalPhaseAttemptFailed,
        logRenewalPhaseAttemptStarted,
        massRenewalBatchCounts,
        massRenewalTerminalOutcome,
        mergeListingMetadata,
        mutateMassRenewalBatch,
        normalBrowserWindowId,
        normalizeKnownPublicAdUrl,
        normalizeProfileName,
        normalizeRenewalMode,
        normalizeRenewalPhaseAttempts,
        persistArchiveInsertionSession,
        publicAvailabilitySnapshot,
        putInventoryRecordOnly,
        queueMassRenewalProgress,
        readArchiveInsertionSessions,
        readDiagnostics,
        readFillSessions,
        readInventoryRecordsForProfile,
        readProfiles,
        readRenewalSessions,
        reconcileMassRenewalBatchSession,
        renewalAttemptDetails,
        renewalAttemptState,
        renewalComparisonWaitsOnlyForOnline,
        renewalInsertionMeta,
        renewalMaxPhaseAttempts,
        renewalOutcomeForComparison,
        renewalPhaseAttemptAvailable,
        renewalPhaseRetryDelayMs,
        renewalPublicSnapshot,
        resetRenewalPhaseAttempts,
        resolveRenewalPublicEvidence,
        retirePublishedRenewalTargetTab,
        saveInventory,
        sendTabRequestWithBootstrap,
        sessionCorrelationContext,
        touchMassRenewalItemProgress,
        waitForTabComplete,
        writeFillSessions,
        writeRenewalSessions,
        BULK_RETRY_POLL_MS,
        BULK_RETRY_TIMEOUT_MS,
        MY_ADS_PROJECTS_URL,
        RENEWAL_MODE_FAST,
        RENEWAL_MODE_SAFE,
        RENEWAL_PHASE_ATTEMPTS_DEFAULT,
        TAB_LOAD_TIMEOUT_PHASE4_MS,
        TAB_LOAD_TIMEOUT_RENEWAL_MS,
      } = options;
      const required = {
        assertMassRenewalManualActionAllowed,
        broadcastInventoryChanged,
        closeManagedWorkerTab,
        closeRegistryTab,
        compareRenewalRecords,
        correlationContext,
        createManagedWorkerTab,
        delay,
        detectPublishedAdForFill,
        dropMassRenewalProgress,
        ensureContentConnection,
        evaluateCheckoutRecoveryProof,
        finishRenewalReplacement,
        withAutonomousAdmission,
        flushDiagnosticBuffer,
        getInventory,
        isCheckoutAbortedRecoveryCandidate,
        isNonRetryableRenewalSafetyError,
        isSafeLegacyManualEmergencyReset,
        logDiagnostic,
        logRenewalPhaseAttemptFailed,
        logRenewalPhaseAttemptStarted,
        massRenewalBatchCounts,
        massRenewalTerminalOutcome,
        mergeListingMetadata,
        mutateMassRenewalBatch,
        normalBrowserWindowId,
        normalizeKnownPublicAdUrl,
        normalizeProfileName,
        normalizeRenewalMode,
        normalizeRenewalPhaseAttempts,
        persistArchiveInsertionSession,
        publicAvailabilitySnapshot,
        putInventoryRecordOnly,
        queueMassRenewalProgress,
        readArchiveInsertionSessions,
        readDiagnostics,
        readFillSessions,
        readInventoryRecordsForProfile,
        readProfiles,
        readRenewalSessions,
        reconcileMassRenewalBatchSession,
        renewalAttemptDetails,
        renewalAttemptState,
        renewalComparisonWaitsOnlyForOnline,
        renewalInsertionMeta,
        renewalMaxPhaseAttempts,
        renewalOutcomeForComparison,
        renewalPhaseAttemptAvailable,
        renewalPhaseRetryDelayMs,
        renewalPublicSnapshot,
        resetRenewalPhaseAttempts,
        resolveRenewalPublicEvidence,
        retirePublishedRenewalTargetTab,
        saveInventory,
        sendTabRequestWithBootstrap,
        sessionCorrelationContext,
        touchMassRenewalItemProgress,
        waitForTabComplete,
        writeFillSessions,
        writeRenewalSessions,
      };
      for (const [name, value] of Object.entries(required)) {
        if (typeof value !== 'function') throw new Error(`renewal workflow dependency ${name} is required`);
      }
      const automaticReplacementInFlight = new Set();
      const verificationFlow = VerificationFlow.create({
        sessionPort: { readRenewalSessions },
        inventoryPort: { broadcastInventoryChanged, putInventoryRecordOnly, getInventory },
        tabPort: { ensureContentConnection, createManagedWorkerTab, retirePublishedRenewalTargetTab, normalBrowserWindowId, sendTabRequestWithBootstrap, closeManagedWorkerTab, waitForTabComplete },
        diagnosticsPort: { logDiagnostic, sessionCorrelationContext, logRenewalPhaseAttemptFailed, correlationContext, logRenewalPhaseAttemptStarted },
        policyPort: { normalizeRenewalMode, isNonRetryableRenewalSafetyError, renewalMaxPhaseAttempts, renewalPhaseRetryDelayMs, renewalAttemptState, normalizeProfileName, renewalAttemptDetails, renewalPhaseAttemptAvailable },
        validationPort: { renewalInsertionMeta, renewalPublicSnapshot },
        flowPort: { persistRenewalSession, scheduleAutomaticRenewalReplacement, sendRenewalFeedback },
        configPort: { TAB_LOAD_TIMEOUT_RENEWAL_MS, RENEWAL_MODE_FAST, MY_ADS_PROJECTS_URL },
        miscPort: { delay }
      });
      const reinventoryFlow = ReinventoryFlow.create({
        sessionPort: { readRenewalSessions },
        inventoryPort: { saveInventory, broadcastInventoryChanged, putInventoryRecordOnly, getInventory, mergeListingMetadata },
        tabPort: { ensureContentConnection, createManagedWorkerTab, retirePublishedRenewalTargetTab, normalBrowserWindowId, sendTabRequestWithBootstrap, closeRegistryTab, closeManagedWorkerTab, waitForTabComplete },
        diagnosticsPort: { logDiagnostic, sessionCorrelationContext, logRenewalPhaseAttemptFailed, correlationContext, logRenewalPhaseAttemptStarted },
        policyPort: { isNonRetryableRenewalSafetyError, renewalMaxPhaseAttempts, normalizeKnownPublicAdUrl, renewalPhaseRetryDelayMs, renewalAttemptState, renewalAttemptDetails, renewalOutcomeForComparison, renewalPhaseAttemptAvailable },
        validationPort: { compareRenewalRecords, renewalInsertionMeta, publicAvailabilitySnapshot, resolveRenewalPublicEvidence, renewalPublicSnapshot },
        flowPort: { persistRenewalSession, scheduleAutomaticRenewalReplacement, sendRenewalFeedback },
        configPort: { BULK_RETRY_POLL_MS, TAB_LOAD_TIMEOUT_RENEWAL_MS, BULK_RETRY_TIMEOUT_MS, RENEWAL_MODE_SAFE },
        miscPort: { delay }
      });
      const checkoutRecovery = CheckoutRecoveryService.create({
        sessionPort: { readProfiles, readDiagnostics, readInventoryRecordsForProfile },
        inventoryPort: { getInventory },
        tabPort: { ensureContentConnection, createManagedWorkerTab, normalBrowserWindowId, sendTabRequestWithBootstrap, closeManagedWorkerTab, waitForTabComplete },
        diagnosticsPort: { logDiagnostic, sessionCorrelationContext, flushDiagnosticBuffer, correlationContext },
        policyPort: { normalizeProfileName, isCheckoutAbortedRecoveryCandidate, evaluateCheckoutRecoveryProof },
        batchPort: { mutateMassRenewalBatch, massRenewalBatchCounts, touchMassRenewalItemProgress },
        flowPort: { persistRenewalSession },
        configPort: { TAB_LOAD_TIMEOUT_PHASE4_MS, MY_ADS_PROJECTS_URL }
      });

      const runFastRenewalVerification = verificationFlow.runFastRenewalVerification;
      const runRenewalReinventory = reinventoryFlow.runRenewalReinventory;
      const checkoutRecoveryEvidenceForRenewal = checkoutRecovery.checkoutRecoveryEvidenceForRenewal;
      const checkoutRecoveryBaselineForRenewal = checkoutRecovery.checkoutRecoveryBaselineForRenewal;
      const verifyAbortedPaidCheckoutNoPublication = checkoutRecovery.verifyAbortedPaidCheckoutNoPublication;
      const finalizeVerifiedCheckoutAbort = checkoutRecovery.finalizeVerifiedCheckoutAbort;
      const tryRecoverAbortedPaidCheckout = checkoutRecovery.tryRecoverAbortedPaidCheckout;

async function createRenewalSkeleton(source, renewalId, { operationId = null, parentOperationId = null, autoReplacementAllowed = false, startConfirmedAt = null, renewalMode = RENEWAL_MODE_SAFE, maxPhaseAttempts = RENEWAL_PHASE_ATTEMPTS_DEFAULT, phaseAttempts = {}, massBatchId = null, massBatchItemIndex = null } = {}) {
  const now = new Date().toISOString();
  const skeletonInventoryId = `renewal:${renewalId}`;
  const skeleton = {
    ...source,
    inventoryId: skeletonInventoryId,
    adId: null,
    capturedAt: now,
    recordKind: 'renewal-draft',
    renewal: {
      operationId: operationId || null,
      parentOperationId: parentOperationId || null,
      renewalId,
      sourceInventoryId: String(source.inventoryId),
      sourceAdId: String(source.adId || ''),
      status: 'draft',
      stage: 'draft-created',
      createdAt: now,
      updatedAt: now,
      newAdId: null,
      comparison: null,
      renewalMode: normalizeRenewalMode(renewalMode),
      maxPhaseAttempts: normalizeRenewalPhaseAttempts(maxPhaseAttempts),
      phaseAttempts: phaseAttempts && typeof phaseAttempts === 'object' ? structuredClone(phaseAttempts) : {},
      autoReplacementAllowed: Boolean(autoReplacementAllowed),
      startConfirmedAt: startConfirmedAt || null,
      massBatchId: massBatchId ? String(massBatchId) : null,
      massBatchItemIndex: Number.isInteger(Number(massBatchItemIndex)) ? Number(massBatchItemIndex) : null
    },
    // Until Phase 2 replaces the skeleton with freshly downloaded images,
    // its preview deliberately reuses the immutable local source image keys.
    images: (source.images || []).map(image => ({ ...image })),
    imageSummary: source.imageSummary ? { ...source.imageSummary } : null
  };
  await putInventoryRecordOnly(skeleton);
  broadcastInventoryChanged('renewal-draft-created', { inventoryId: skeletonInventoryId, renewalId, sourceAdId: String(source.adId || '') });
  return skeleton;
}

async function updateRenewalSkeleton(session, patch = {}) {
  const skeleton = await getInventory(session.skeletonInventoryId);
  if (!skeleton) return null;
  const now = new Date().toISOString();
  const nextRenewal = {
    ...(skeleton.renewal || {}),
    ...renewalPublicSnapshot(session),
    ...patch,
    updatedAt: now
  };
  const updated = {
    ...skeleton,
    adId: session.newAdId || skeleton.adId || null,
    recordKind: session.newAdId ? 'renewal-candidate' : 'renewal-draft',
    renewal: nextRenewal
  };
  await putInventoryRecordOnly(updated);
  broadcastInventoryChanged('renewal-updated', { inventoryId: updated.inventoryId, renewalId: session.renewalId, status: session.status, stage: session.stage });
  return updated;
}

async function sendRenewalFeedback(session, title, text, issues = []) {
  await logDiagnostic(issues.length ? 'warning' : 'info', 'RENEWAL_FEEDBACK_EMITTED', {
    renewalId: session.renewalId, sourceAdId: session.sourceAdId, newAdId: session.newAdId || null,
    title, text, issueCount: issues.length
  }, { module: 'background', operation: 'renewal-feedback', context: sessionCorrelationContext(session, { adId: session.newAdId || session.sourceAdId, targetTabId: session.targetTabId || null }) }).catch(() => {});
  if (!session.targetTabId) return;
  try {
    await ensureContentConnection({ tabId: session.targetTabId });
    await sendTabRequestWithBootstrap(session.targetTabId, { type: 'RENEWAL_FEEDBACK', title, text, issues: issues.slice(0, 12) });
  } catch { /* Feedback is best-effort; inventory state remains authoritative. */ }
}

async function persistRenewalSession(session) {
  session.updatedAt = new Date().toISOString();
  const sessions = await readRenewalSessions();
  sessions[session.renewalId] = session;
  await writeRenewalSessions(sessions);
  await updateRenewalSkeleton(session).catch(() => null);
  if (session?.massBatchId) {
    if (massRenewalTerminalOutcome(session)) {
      dropMassRenewalProgress(session);
      await reconcileMassRenewalBatchSession(session).catch(() => false);
    } else {
      queueMassRenewalProgress(session);
    }
  }
  return session;
}

function scheduleAutomaticRenewalReplacement(renewalId, trigger = 'verification-match') {
  const id = String(renewalId || '');
  if (!id || automaticReplacementInFlight.has(id)) return false;
  automaticReplacementInFlight.add(id);
  void withAutonomousAdmission('renewal-auto-phase4', async () => {
    const sessions = await readRenewalSessions().catch(() => ({}));
    const current = sessions[id] || { renewalId: id };
    await logDiagnostic('info', 'RENEWAL_AUTO_REPLACEMENT_STARTED', { renewalId: id, trigger }, { module: 'background', operation: 'renewal-auto-phase-4', context: sessionCorrelationContext(current, { renewalId: id }) }).catch(() => {});
    await finishRenewalReplacement({ renewalId: id, automatic: true });
  }).catch(async error => {
    // A blocked admission is not a remote replacement attempt. Preserve the
    // persisted recovery state and never invent a failed source deletion.
    const admissionCode = String(error?.code || error?.message || '');
    if (admissionCode.startsWith('KR_UPDATE_FENCE_') || admissionCode.startsWith('KR_UPDATE_OWNER_OBSERVER_')) return;
    const sessions = await readRenewalSessions().catch(() => ({}));
    const latest = sessions[id];
    if (latest) {
      latest.status = 'verified';
      latest.stage = 'replacement-ready';
      latest.lastError = String(error.message || error).slice(0, 800);
      latest.autoReplacementFailedAt = new Date().toISOString();
      await persistRenewalSession(latest).catch(() => {});
      await sendRenewalFeedback(latest, 'Austausch konnte nicht abgeschlossen werden', 'Die neue Anzeige bleibt geprüft. Die bisherige Anzeige wird nicht ungeprüft entfernt; der Austausch kann im Inventar erneut abgeschlossen werden.', ['Der Austausch wurde aus Sicherheitsgründen angehalten. Weitere Einzelheiten stehen in den Diagnosedaten.']).catch(() => {});
    }
    await logDiagnostic('error', 'RENEWAL_AUTO_REPLACEMENT_FAILED', { renewalId: id, trigger, message: String(error.message || error).slice(0, 800) }, { module: 'background', operation: 'renewal-auto-phase-4', context: sessionCorrelationContext(latest || { renewalId: id }, { renewalId: id }) }).catch(() => {});
  }).finally(() => automaticReplacementInFlight.delete(id));
  return true;
}

async function retryRenewalVerification(message) {
  await assertMassRenewalManualActionAllowed(message);
  const renewalId = String(typeof message === 'string' ? message : message?.renewalId || '');
  if (!renewalId) throw new Error('Renewal-ID fehlt.');
  const sessions = await readRenewalSessions();
  const session = sessions[renewalId];
  if (!session) throw new Error('Renewal-Sitzung wurde nicht gefunden.');
  const newAdId = String(session.newAdId || '');
  if (!/^\d+$/.test(newAdId)) throw new Error('Neue Anzeigen-ID wurde noch nicht bestätigt.');
  if (session.status === 'verified') return renewalPublicSnapshot(session);
  const renewalMode = normalizeRenewalMode(session.renewalMode);
  const explicitRetry = message?.type === 'RETRY_RENEWAL_VERIFICATION' || message?.massBatchRetry === true;
  if (explicitRetry) {
    if (renewalMode === RENEWAL_MODE_FAST) {
      resetRenewalPhaseAttempts(session, [3]);
    } else {
      resetRenewalPhaseAttempts(session, [2, 3]);
      session.phase2CompletedAt = null;
    }
    session.lastError = null;
    await persistRenewalSession(session);
  }
  await logDiagnostic('info', 'RENEWAL_VERIFICATION_RETRY_STARTED', {
    renewalId, sourceAdId: session.sourceAdId, newAdId, previousStatus: session.status || null, renewalMode,
    verificationOrder: renewalMode === RENEWAL_MODE_FAST ? ['my-ads-presence'] : ['edit', 'fresh-canonical-public', 'fresh-id-direct-public', 'fresh-my-ads']
  }, { module: 'background', operation: 'renewal-retry', context: sessionCorrelationContext(session, { renewalId, adId: newAdId }) }).catch(() => {});
  return renewalMode === RENEWAL_MODE_FAST ? runFastRenewalVerification(renewalId) : runRenewalReinventory(renewalId);
}

async function markRenewalPublishClicked(message, sender) {
  const tabId = sender?.tab?.id;
  const fillSessions = await readFillSessions();
  const fill = fillSessions[message?.fillId];
  if (!fill || fill.targetTabId !== tabId || (!fill.renewalId && !fill.archiveInsertionId)) throw new Error('Automatischer Publish gehört nicht zu dieser Vorlagen-Sitzung.');
  fill.status = 'running';
  fill.stage = 'publish-submitted';
  fill.publishClickedAt = new Date().toISOString();
  fill.updatedAt = new Date().toISOString();
  fillSessions[fill.fillId] = fill;
  await writeFillSessions(fillSessions);

  if (fill.renewalId) {
    const sessions = await readRenewalSessions();
    const renewal = sessions[fill.renewalId];
    if (renewal) {
      renewal.status = 'submitted';
      renewal.stage = 'publish-submitted';
      renewal.publishClickedAt = fill.publishClickedAt;
      await persistRenewalSession(renewal);
      await sendRenewalFeedback(renewal, 'Veröffentlichung wird verarbeitet', 'Kleinanzeigen verarbeitet die neue Anzeige. Sobald sie angelegt ist, wird sie automatisch geprüft.');
    }
  } else if (fill.archiveInsertionId) {
    const sessions = await readArchiveInsertionSessions();
    const archive = sessions[fill.archiveInsertionId];
    if (archive) {
      archive.status = 'submitted';
      archive.stage = 'publish-submitted';
      archive.publishClickedAt = fill.publishClickedAt;
      await persistArchiveInsertionSession(archive);
    }
  }
  return { accepted: true };
}

async function confirmPublishedRenewal(fill, detected) {
  const newAdId = String(detected?.adId || '');
  if (!/^\d+$/.test(newAdId) || newAdId === String(fill.sourceAdId || '')) return null;
  const fillSessions = await readFillSessions();
  const currentFill = fillSessions[fill.fillId];
  if (!currentFill || currentFill.stage === 'new-id-confirmed') return null;
  currentFill.status = 'complete';
  currentFill.stage = 'new-id-confirmed';
  currentFill.newAdId = newAdId;
  currentFill.result = { complete: true, issues: [] };
  currentFill.updatedAt = new Date().toISOString();
  fillSessions[currentFill.fillId] = currentFill;
  await writeFillSessions(fillSessions);

  const renewals = await readRenewalSessions();
  const renewal = renewals[currentFill.renewalId];
  if (!renewal || renewal.newAdId) return null;
  renewal.newAdId = newAdId;
  renewal.newPublicUrl = String(detected?.publicUrl || '');
  renewal.status = 'new-id-confirmed';
  renewal.stage = 'new-id-confirmed';
  renewal.newIdConfirmedAt = new Date().toISOString();
  await persistRenewalSession(renewal);
  const renewalMode = normalizeRenewalMode(renewal.renewalMode);
  const feedbackText = renewalMode === RENEWAL_MODE_FAST
    ? 'Die neue Anzeige wurde erstellt. In der Schnellprüfung wird jetzt geprüft, ob sie im richtigen Profil unter „Meine Anzeigen“ erscheint.'
    : 'Die neue Anzeige wurde erstellt. In der Vollprüfung wird sie jetzt nochmals vollständig kontrolliert.';
  await sendRenewalFeedback(renewal, 'Neue Anzeige veröffentlicht', feedbackText);
  await logDiagnostic('info', 'RENEWAL_NEW_ID_CONFIRMED', { renewalId: renewal.renewalId, sourceAdId: renewal.sourceAdId, newAdId, publicUrlAvailable: Boolean(renewal.newPublicUrl), renewalMode }, { module: 'background', operation: 'renewal-publish', context: sessionCorrelationContext(renewal, { renewalId: renewal.renewalId, adId: newAdId, targetTabId: renewal.targetTabId }) }).catch(() => {});
  await retirePublishedRenewalTargetTab(renewal);
  if (renewalMode === RENEWAL_MODE_FAST) void withAutonomousAdmission('renewal-detached-verify', () => runFastRenewalVerification(renewal.renewalId)).catch(() => {});
  else void withAutonomousAdmission('renewal-detached-verify', () => runRenewalReinventory(renewal.renewalId)).catch(() => {});
  return renewalPublicSnapshot(renewal);
}

async function resumePendingRenewals() {
  const renewals = await readRenewalSessions().catch(() => ({}));
  const fills = await readFillSessions().catch(() => ({}));
  for (const renewal of Object.values(renewals)) {
    try {
      const checkoutRecovery = await tryRecoverAbortedPaidCheckout(renewal, 'service-worker-resume');
      if (checkoutRecovery.recovered) continue;
      if (isSafeLegacyManualEmergencyReset(renewal)) {
        renewal.status = 'cancelled';
        renewal.stage = 'manual-emergency-reset';
        renewal.massBatchTerminal = Boolean(renewal.massBatchId) || renewal.massBatchTerminal === true;
        renewal.recoveryAt = renewal.recoveryAt || new Date().toISOString();
        renewal.lastError = renewal.lastError || 'Der frühere Notfall-Reset wurde lokal abgeschlossen; es gibt keine Publish-Grenze.';
        await persistRenewalSession(renewal);
        await logDiagnostic('info', 'RENEWAL_LEGACY_EMERGENCY_RESET_MIGRATED', {
          renewalId: renewal.renewalId, sourceAdId: renewal.sourceAdId || null, massBatchId: renewal.massBatchId || null,
          previousStatus: 'needs-review', stage: renewal.stage, publishBoundaryReached: false
        }, { module: 'background', operation: 'renewal-resume', context: sessionCorrelationContext(renewal, { renewalId: renewal.renewalId, adId: renewal.sourceAdId || null }) }).catch(() => {});
        continue;
      }
      if (renewal?.massBatchTerminal === true) continue;
      if (renewal?.autoReplacementAllowed && !renewal?.phase4AttemptsExhaustedAt && /^\d+$/.test(String(renewal?.newAdId || '')) && (String(renewal?.status || '') === 'verified' || String(renewal?.stage || '') === 'replacement-ready' || String(renewal?.stage || '').startsWith('source-delete'))) {
        scheduleAutomaticRenewalReplacement(renewal.renewalId, 'service-worker-resume');
      } else if (renewal?.status === 'submitted' && renewal?.targetTabId && !renewal?.newAdId) {
        const fill = Object.values(fills).find(item => item?.renewalId === renewal.renewalId && item?.targetTabId === renewal.targetTabId);
        if (fill) {
          const detected = await detectPublishedAdForFill(renewal.targetTabId, renewal.sourceAdId);
          if (detected?.adId) await confirmPublishedRenewal(fill, detected);
        }
      } else if (String(renewal?.status || '') === 'verification-failed' && renewalComparisonWaitsOnlyForOnline(renewal?.comparison) && /^\d+$/.test(String(renewal?.newAdId || ''))) {
        renewal.status = 'waiting-for-online';
        renewal.stage = 'waiting-for-online';
        renewal.lastError = null;
        await persistRenewalSession(renewal);
        await logDiagnostic('info', 'RENEWAL_LEGACY_ONLINE_WAIT_MIGRATED', {
          renewalId: renewal.renewalId, sourceAdId: renewal.sourceAdId, newAdId: renewal.newAdId
        }, { module: 'background', operation: 'renewal-resume', context: sessionCorrelationContext(renewal, { renewalId: renewal.renewalId, adId: renewal.newAdId }) }).catch(() => {});
        if (renewalPhaseAttemptAvailable(renewal, 3)) void withAutonomousAdmission('renewal-detached-retry', () => retryRenewalVerification({ renewalId: renewal.renewalId })).catch(() => {});
      } else if (String(renewal?.status || '') === 'waiting-for-online' && /^\d+$/.test(String(renewal?.newAdId || ''))) {
        if (renewalPhaseAttemptAvailable(renewal, 3)) void withAutonomousAdmission('renewal-detached-retry', () => retryRenewalVerification({ renewalId: renewal.renewalId })).catch(() => {});
      } else if (['new-id-confirmed', 'reinventorizing', 'verifying'].includes(String(renewal?.status || '')) && /^\d+$/.test(String(renewal?.newAdId || ''))) {
        if (normalizeRenewalMode(renewal?.renewalMode) === RENEWAL_MODE_FAST) void withAutonomousAdmission('renewal-detached-verify', () => runFastRenewalVerification(renewal.renewalId)).catch(() => {});
        else void withAutonomousAdmission('renewal-detached-verify', () => runRenewalReinventory(renewal.renewalId)).catch(() => {});
      }
    } catch (error) {
      await logDiagnostic('warning', 'RENEWAL_RESUME_DEFERRED', { renewalId: renewal?.renewalId || null, status: renewal?.status || null, message: String(error.message || error).slice(0, 500) }, { module: 'background', operation: 'renewal-resume', context: sessionCorrelationContext(renewal, { renewalId: renewal?.renewalId || null, adId: renewal?.newAdId || renewal?.sourceAdId || null }) }).catch(() => {});
    }
  }
}

      return Object.freeze({
        createRenewalSkeleton,
        updateRenewalSkeleton,
        sendRenewalFeedback,
        persistRenewalSession,
        scheduleAutomaticRenewalReplacement,
        runFastRenewalVerification,
        runRenewalReinventory,
        retryRenewalVerification,
        markRenewalPublishClicked,
        confirmPublishedRenewal,
        checkoutRecoveryEvidenceForRenewal,
        checkoutRecoveryBaselineForRenewal,
        verifyAbortedPaidCheckoutNoPublication,
        finalizeVerifiedCheckoutAbort,
        tryRecoverAbortedPaidCheckout,
        resumePendingRenewals,
      });
    }
  });
  KRDeps.register('KRRenewalWorkflowController', API);
})();
