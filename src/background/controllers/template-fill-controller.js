(() => {
  'use strict';
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before template-fill-controller.js');
  const API = Object.freeze({
    create(options = {}) {
      const {
        readFillSessions, writeFillSessions, withTemplateFillMutation,
                isRecoverableTrashTemplateSession, resolvePublishedInventory,
                broadcastInventoryChanged, getInventory, isTrashRecord, assertTemplateSourceReady,
                createAutomationTab, registerShadowTab, updateAutomationTab, logDiagnostic, correlationContext, sessionCorrelationContext,
                assertSelectedProfileMatchesLiveAccount, getInsertionLockState, assertInsertionStartAvailable, withInsertionStartGate,
                getRenewalConfiguration, normalizeRenewalMode, normalizeRenewalPhaseAttempts,
                readRenewalSessions, writeRenewalSessions, createRenewalSkeleton, persistRenewalSession,
                isTransientTemplateFillProgress, templateFillProgressSnapshot, queueMassRenewalProgress,
                readArchiveInsertionSessions, persistArchiveInsertionSession,
                recordRenewalPhaseAttemptError, canRetryRenewalPhase1, restartRenewalPhase1Attempt,
                evictTemplateImageTransfersForFill, classifyKleinanzeigenInsertionErrorUrl,
                cryptoApi, chromeApi, queueMicrotaskFn,
                TEMPLATE_TARGET_URL, TAB_ROLES, TERMINAL_TEMPLATE_FILL_STATUSES
      } = options;
      const required = {
        readFillSessions,
        writeFillSessions,
        withTemplateFillMutation,
        isRecoverableTrashTemplateSession,
        resolvePublishedInventory,
        broadcastInventoryChanged,
        getInventory,
        isTrashRecord,
        assertTemplateSourceReady,
        createAutomationTab,
        registerShadowTab,
        updateAutomationTab,
        logDiagnostic,
        correlationContext,
        sessionCorrelationContext,
        assertSelectedProfileMatchesLiveAccount,
        getInsertionLockState,
        assertInsertionStartAvailable,
        withInsertionStartGate,
        getRenewalConfiguration,
        normalizeRenewalMode,
        normalizeRenewalPhaseAttempts,
        readRenewalSessions,
        writeRenewalSessions,
        createRenewalSkeleton,
        persistRenewalSession,
        isTransientTemplateFillProgress,
        templateFillProgressSnapshot,
        queueMassRenewalProgress,
        readArchiveInsertionSessions,
        persistArchiveInsertionSession,
        recordRenewalPhaseAttemptError,
        canRetryRenewalPhase1,
        restartRenewalPhase1Attempt,
        evictTemplateImageTransfersForFill,
        classifyKleinanzeigenInsertionErrorUrl,
        queueMicrotaskFn,
      };
      for (const [name, value] of Object.entries(required)) {
        if (typeof value !== 'function') throw new Error(`template fill controller dependency ${name} is required`);
      }
      if (!cryptoApi?.randomUUID || !chromeApi?.tabs) throw new Error('template fill controller runtime APIs are required');
      if (!TEMPLATE_TARGET_URL || !TAB_ROLES || !TERMINAL_TEMPLATE_FILL_STATUSES) throw new Error('template fill controller constants are required');

function recoverableTrashTemplateFill(session) {
  return Boolean(session?.fillId) && isRecoverableTrashTemplateSession(session);
}

async function getRecoverableTrashTemplateFill() {
  const sessions = await readFillSessions();
  const candidates = Object.values(sessions)
    .filter(recoverableTrashTemplateFill)
    .sort((a, b) => Date.parse(b?.updatedAt || b?.createdAt || 0) - Date.parse(a?.updatedAt || a?.createdAt || 0));
  if (!candidates.length) return null;
  return getTrashTemplateFillStatus({ fillId: candidates[0].fillId });
}

async function prepareTrashTemplateInventoryCapture(message = {}) {
  const fillId = String(message?.fillId || '');
  const tabId = Number(message?.tabId || 0) || null;
  const adId = String(message?.adId || '');
  if (!fillId || !tabId || !/^\d+$/.test(adId)) throw new Error('Die veröffentlichte Anzeige konnte nicht eindeutig zugeordnet werden.');
  const sessions = await readFillSessions();
  const session = sessions[fillId];
  if (!session?.templateOnly || Number(session.targetTabId || 0) !== tabId || String(session.newAdId || '') !== adId || String(session.stage || '') !== 'template-only-published') {
    throw new Error('Die veröffentlichte Anzeige gehört nicht mehr eindeutig zu diesem Vorlagenvorgang.');
  }
  return resolvePublishedInventory({ tabId, adId });
}

async function completeTrashTemplateFlow(message = {}) {
  const fillId = String(message?.fillId || '');
  const adId = String(message?.adId || '');
  if (!fillId || !/^\d+$/.test(adId)) return false;
  let changed = false;
  await withTemplateFillMutation(async () => {
    const sessions = await readFillSessions();
    const session = sessions[fillId];
    if (!session?.templateOnly || String(session.newAdId || '') !== adId) return;
    session.status = 'complete';
    session.stage = 'template-only-inventoried';
    session.inventoryCapturedAt = new Date().toISOString();
    session.updatedAt = session.inventoryCapturedAt;
    sessions[fillId] = session;
    await writeFillSessions(sessions);
    changed = true;
  });
  if (changed) broadcastInventoryChanged('trash-template-inventoried', { fillId, newAdId: adId });
  return changed;
}

async function getTrashTemplateFillStatus(message = {}) {
  const fillId = String(message?.fillId || '');
  if (!fillId) return null;
  const sessions = await readFillSessions();
  const session = sessions[fillId];
  if (!session?.templateOnly) return null;
  return {
    operationId: session.operationId || null,
    fillId: session.fillId,
    templateOnly: true,
    trashInventoryId: session.trashInventoryId || session.inventoryId || null,
    sourceAdId: session.sourceAdId || null,
    targetTabId: session.targetTabId || null,
    status: session.status || null,
    stage: session.stage || null,
    result: session.result ? { complete: Boolean(session.result.complete), issues: Array.isArray(session.result.issues) ? session.result.issues.slice(0, 50) : [] } : null,
    newAdId: session.newAdId || null,
    publishedUrl: session.publishedUrl || null,
    publishedAt: session.publishedAt || null,
    updatedAt: session.updatedAt || null
  };
}

function trashTemplateTargetGoneError(error) {
  return /No tab with id|No tab with id:|tab not found|Invalid tab ID/i.test(String(error?.message || error || ''));
}

async function assertLostTrashTemplateSupersedeCandidate(fillId, inventoryId) {
  const id = String(fillId || '');
  const expectedInventoryId = String(inventoryId || '');
  if (!id) return null;
  const sessions = await readFillSessions();
  const session = sessions[id];
  if (!session?.templateOnly || String(session.trashInventoryId || session.inventoryId || '') !== expectedInventoryId) {
    throw new Error('Der bisherige Vorlagenvorgang gehört nicht eindeutig zu dieser Papierkorb-Vorlage.');
  }
  if (String(session.status || '') !== 'complete' || String(session.stage || '') !== 'template-only-complete' || /^\d+$/.test(String(session.newAdId || ''))) {
    throw new Error('Der bisherige Vorlagenvorgang kann nicht sicher neu vorbereitet werden.');
  }
  const targetTabId = Number(session.targetTabId || 0);
  if (!targetTabId) throw new Error('Der bisherige Zieltab kann nicht eindeutig geprüft werden.');
  let tab = null;
  try {
    tab = await chromeApi.tabs.get(targetTabId);
  } catch (error) {
    if (!trashTemplateTargetGoneError(error)) throw new Error('Der bisherige Zieltab konnte nicht sicher auf Existenz geprüft werden.');
  }
  if (tab?.id) throw new Error('Der vorbereitete Kleinanzeigen-Tab ist noch geöffnet. Neu vorbereiten wurde aus Sicherheitsgründen nicht gestartet.');
  return {
    ...session,
    result: session.result ? { complete: Boolean(session.result.complete), issues: Array.isArray(session.result.issues) ? [...session.result.issues] : [] } : null
  };
}

async function markLostTrashTemplateRestartPending(snapshot) {
  if (!snapshot?.fillId) return false;
  let changed = false;
  await withTemplateFillMutation(async () => {
    const sessions = await readFillSessions();
    const current = sessions[snapshot.fillId];
    if (!current?.templateOnly || String(current.status || '') !== 'complete' || String(current.stage || '') !== 'template-only-complete' || /^\d+$/.test(String(current.newAdId || ''))) {
      throw new Error('Der bisherige Vorlagenvorgang hat sich geändert und kann nicht sicher ersetzt werden.');
    }
    current.status = 'cancelled';
    current.stage = 'template-only-target-tab-lost-restart-pending';
    current.targetLostAt = new Date().toISOString();
    current.updatedAt = current.targetLostAt;
    sessions[current.fillId] = current;
    await writeFillSessions(sessions);
    changed = true;
  });
  return changed;
}

async function restoreLostTrashTemplateAfterRestartFailure(snapshot) {
  if (!snapshot?.fillId) return false;
  let restored = false;
  await withTemplateFillMutation(async () => {
    const sessions = await readFillSessions();
    const current = sessions[snapshot.fillId];
    if (!current?.templateOnly || String(current.status || '') !== 'cancelled' || String(current.stage || '') !== 'template-only-target-tab-lost-restart-pending') return;
    sessions[snapshot.fillId] = { ...snapshot, updatedAt: new Date().toISOString() };
    await writeFillSessions(sessions);
    restored = true;
  });
  return restored;
}

async function finalizeLostTrashTemplateSupersede(snapshot, replacementFillId) {
  if (!snapshot?.fillId || !replacementFillId) return false;
  let changed = false;
  await withTemplateFillMutation(async () => {
    const sessions = await readFillSessions();
    const current = sessions[snapshot.fillId];
    if (!current?.templateOnly || String(current.status || '') !== 'cancelled' || String(current.stage || '') !== 'template-only-target-tab-lost-restart-pending') return;
    current.stage = 'template-only-target-tab-lost-superseded';
    current.supersededByFillId = String(replacementFillId);
    current.supersededAt = new Date().toISOString();
    current.updatedAt = current.supersededAt;
    sessions[current.fillId] = current;
    await writeFillSessions(sessions);
    changed = true;
  });
  return changed;
}

async function startTrashTemplateFillUnlocked(inventoryId) {
  const record = await getInventory(inventoryId);
  if (!record || !isTrashRecord(record)) throw new Error('Papierkorb-Vorlage wurde nicht gefunden.');
  assertTemplateSourceReady(record);
  const fillId = cryptoApi.randomUUID();
  const operationId = cryptoApi.randomUUID();
  const tab = await createAutomationTab({ url: 'about:blank', active: false });
  if (!tab?.id) throw new Error('Neuer Kleinanzeigen-Tab konnte nicht geöffnet werden.');
  await registerShadowTab(tab.id, TAB_ROLES.TEMPLATE_TARGET, { operationId, fillId, inventoryId: String(record.inventoryId), adId: String(record.adId || ''), ownerType: 'trash-template', ownerId: fillId });
  const sessions = await readFillSessions();
  sessions[fillId] = {
    operationId,
    parentOperationId: null,
    fillId,
    renewalId: null,
    templateOnly: true,
    trashInventoryId: String(record.inventoryId),
    inventoryId: String(record.inventoryId),
    sourceAdId: String(record.adId || ''),
    targetTabId: tab.id,
    targetUrl: TEMPLATE_TARGET_URL,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'waiting',
    stage: 'tab-opened',
    result: null
  };
  await writeFillSessions(sessions);
  broadcastInventoryChanged('insertion-lock-acquired', { kind: 'trash-template', ownerId: fillId, inventoryId: String(record.inventoryId), adId: String(record.adId || '') || null });
  try {
    await updateAutomationTab(tab.id, { url: TEMPLATE_TARGET_URL, active: true });
  } catch (error) {
    const latest = await readFillSessions().catch(() => ({}));
    if (latest[fillId]) {
      latest[fillId].status = 'error';
      latest[fillId].stage = 'target-tab-failed';
      latest[fillId].updatedAt = new Date().toISOString();
      latest[fillId].result = { complete: false, issues: [String(error.message || error).slice(0, 300)] };
      await writeFillSessions(latest).catch(() => {});
    }
    await chromeApi.tabs.remove(tab.id).catch(() => {});
    broadcastInventoryChanged('insertion-lock-released', { kind: 'trash-template', ownerId: fillId, inventoryId: String(record.inventoryId), reason: 'target-tab-failed' });
    throw error;
  }
  await logDiagnostic('info', 'TRASH_TEMPLATE_FILL_STARTED', { operationId, fillId, inventoryId: String(record.inventoryId), sourceAdId: String(record.adId || ''), targetTabId: tab.id, autoPublishAllowed: false }, { module: 'background', operation: 'trash-template-fill', context: sessionCorrelationContext(sessions[fillId], { adId: record.adId || null, targetTabId: tab.id }) }).catch(() => {});
  return { operationId, parentOperationId: null, fillId, templateOnly: true, tabId: tab.id, url: TEMPLATE_TARGET_URL };
}

async function startTemplateFillUnlocked(inventoryId, { autoReplacementAllowed = false, startConfirmationVersion = null, renewalModeOverride = null, maxPhaseAttemptsOverride = null, massBatchId = null, massBatchItemIndex = null, parentOperationId = null } = {}) {
  const record = await getInventory(inventoryId);
  if (!record) throw new Error("Inventar wurde nicht gefunden.");
  if (record?.renewal?.renewalId || String(record?.recordKind || '').startsWith('renewal-')) {
    throw new Error('Aus einem Renewal-Entwurf kann kein weiterer Renewal-Vorgang gestartet werden.');
  }
  assertTemplateSourceReady(record);

  const renewals = await readRenewalSessions();
  const activeRenewal = Object.values(renewals).find(item => String(item?.sourceInventoryId || '') === String(record.inventoryId) && !['cancelled', 'replaced'].includes(String(item?.status || '')));
  if (activeRenewal) throw new Error('Für diese Anzeige läuft bereits ein Renewal-Vorgang.');

  const operationId = cryptoApi.randomUUID();
  const fillId = cryptoApi.randomUUID();
  const renewalId = cryptoApi.randomUUID();
  const startConfirmedAt = autoReplacementAllowed ? new Date().toISOString() : null;
  // Snapshot the persisted mode at start. Later UI changes must never alter an
  // already running renewal.
  const renewalConfiguration = await getRenewalConfiguration();
  const renewalMode = renewalModeOverride ? normalizeRenewalMode(renewalModeOverride) : normalizeRenewalMode(renewalConfiguration.renewalMode);
  const maxPhaseAttempts = normalizeRenewalPhaseAttempts(maxPhaseAttemptsOverride ?? renewalConfiguration.maxPhaseAttempts);
  const initialPhase1Attempt = { attempt: 1, attemptId: cryptoApi.randomUUID(), lastError: null, updatedAt: new Date().toISOString() };
  const phaseAttempts = { '1': initialPhase1Attempt };
  const skeleton = await createRenewalSkeleton(record, renewalId, { operationId, parentOperationId, autoReplacementAllowed, startConfirmedAt, renewalMode, maxPhaseAttempts, phaseAttempts, massBatchId, massBatchItemIndex });
  const renewal = {
    operationId,
    parentOperationId: parentOperationId ? String(parentOperationId) : null,
    renewalId,
    profileId: record.profileId || null,
    sourceInventoryId: String(record.inventoryId),
    sourceAdId: String(record.adId || ''),
    skeletonInventoryId: skeleton.inventoryId,
    fillId,
    targetTabId: null,
    newAdId: null,
    newPublicUrl: '',
    status: 'draft',
    stage: 'draft-created',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comparison: null,
    renewalMode,
    maxPhaseAttempts,
    phaseAttempts,
    autoReplacementAllowed: Boolean(autoReplacementAllowed),
    startConfirmationVersion: autoReplacementAllowed ? Number(startConfirmationVersion || 1) : null,
    startConfirmedAt,
    massBatchId: massBatchId ? String(massBatchId) : null,
    massBatchItemIndex: Number.isInteger(Number(massBatchItemIndex)) ? Number(massBatchItemIndex) : null,
    massBatchTerminal: false
  };
  renewals[renewalId] = renewal;
  await writeRenewalSessions(renewals);
  broadcastInventoryChanged('insertion-lock-acquired', { kind: 'renewal', ownerId: renewalId, inventoryId: String(record.inventoryId), adId: String(record.adId || '') || null });
  await logDiagnostic('info', 'RENEWAL_DRAFT_CREATED', { operationId, parentOperationId: renewal.parentOperationId, renewalId, sourceInventoryId: record.inventoryId, sourceAdId: String(record.adId || ''), skeletonInventoryId: skeleton.inventoryId }, { module: 'background', operation: 'renewal-start', context: sessionCorrelationContext(renewal, { adId: String(record.adId || '') }) }).catch(() => {});

  const tab = await createAutomationTab({ url: "about:blank", active: false });
  if (!tab?.id) {
    renewal.status = 'verification-failed';
    renewal.stage = 'target-tab-failed';
    renewal.lastError = 'Neuer Kleinanzeigen-Tab konnte nicht geöffnet werden.';
    await persistRenewalSession(renewal);
    throw new Error("Neuer Kleinanzeigen-Tab konnte nicht geöffnet werden.");
  }
  renewal.targetTabId = tab.id;
  await registerShadowTab(tab.id, TAB_ROLES.RENEWAL_TARGET, { ...correlationContext(renewal), ownerType: 'renewal', ownerId: renewalId, inventoryId: String(record.inventoryId), adId: String(record.adId || '') });
  renewal.status = 'draft';
  renewal.stage = 'target-tab-opened';
  await persistRenewalSession(renewal);
  const sessions = await readFillSessions();
  sessions[fillId] = {
    operationId,
    parentOperationId: renewal.parentOperationId,
    fillId,
    renewalId,
    skeletonInventoryId: skeleton.inventoryId,
    inventoryId: String(record.inventoryId),
    sourceAdId: String(record.adId || ""),
    targetTabId: tab.id,
    targetUrl: TEMPLATE_TARGET_URL,
    renewalMode,
    maxPhaseAttempts,
    phase1Attempt: initialPhase1Attempt.attempt,
    phase1AttemptId: initialPhase1Attempt.attemptId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "waiting",
    stage: "tab-opened",
    result: null,
    autoReplacementAllowed: Boolean(autoReplacementAllowed),
    startConfirmedAt,
    massBatchId: massBatchId ? String(massBatchId) : null,
    massBatchItemIndex: Number.isInteger(Number(massBatchItemIndex)) ? Number(massBatchItemIndex) : null
  };
  await writeFillSessions(sessions);
  await updateAutomationTab(tab.id, { url: TEMPLATE_TARGET_URL, active: true });
  await logDiagnostic("info", "TEMPLATE_FILL_STARTED", {
    operationId, parentOperationId: renewal.parentOperationId, fillId, renewalId, inventoryId: String(record.inventoryId), sourceAdId: String(record.adId || ""), targetTabId: tab.id,
    renewalMode, maxPhaseAttempts, phase1Attempt: initialPhase1Attempt.attempt, phase1AttemptId: initialPhase1Attempt.attemptId, autoReplacementAllowed: Boolean(autoReplacementAllowed), startConfirmationVersion: renewal.startConfirmationVersion, startConfirmedAt
  }, { module: 'background', operation: 'template-fill', context: sessionCorrelationContext(sessions[fillId], { adId: String(record.adId || ''), targetTabId: tab.id }) }).catch(() => {});
  return { operationId, parentOperationId: renewal.parentOperationId, fillId, renewalId, skeletonInventoryId: skeleton.inventoryId, tabId: tab.id, url: TEMPLATE_TARGET_URL, renewalMode, maxPhaseAttempts, phase1Attempt: initialPhase1Attempt.attempt, phase1AttemptId: initialPhase1Attempt.attemptId, autoReplacementAllowed: Boolean(autoReplacementAllowed) };
}

async function startTrashTemplateFill(inventoryId) {
  const options = arguments[1] && typeof arguments[1] === 'object' ? arguments[1] : {};
  return withInsertionStartGate(async () => {
    const normalizedInventoryId = String(inventoryId || '');
    await assertInsertionStartAvailable({ kind: 'trash-template', inventoryId: normalizedInventoryId });
    const record = await getInventory(normalizedInventoryId);
    if (record?.profileId) await assertSelectedProfileMatchesLiveAccount({ expectedProfileId: record.profileId, expectedProfileName: record.profileName || '', purpose: 'trash-template' });
    const supersedeFillId = String(options?.supersedeFillId || '');
    let supersedeSnapshot = null;
    if (supersedeFillId) {
      supersedeSnapshot = await assertLostTrashTemplateSupersedeCandidate(supersedeFillId, normalizedInventoryId);
      await markLostTrashTemplateRestartPending(supersedeSnapshot);
      await logDiagnostic('info', 'TRASH_TEMPLATE_TARGET_LOSS_CONFIRMED', {
        fillId: supersedeSnapshot.fillId, inventoryId: normalizedInventoryId, sourceAdId: supersedeSnapshot.sourceAdId || null, targetTabId: supersedeSnapshot.targetTabId || null
      }, { module: 'background', operation: 'trash-template-restart', context: sessionCorrelationContext(supersedeSnapshot, { adId: supersedeSnapshot.sourceAdId || null, targetTabId: supersedeSnapshot.targetTabId || null }) }).catch(() => {});
    }
    let result;
    try {
      result = await startTrashTemplateFillUnlocked(normalizedInventoryId);
    } catch (error) {
      if (supersedeSnapshot) await restoreLostTrashTemplateAfterRestartFailure(supersedeSnapshot).catch(() => false);
      if (supersedeSnapshot) await logDiagnostic('warning', 'TRASH_TEMPLATE_TARGET_LOSS_RESTART_FAILED', {
        fillId: supersedeSnapshot.fillId, inventoryId: normalizedInventoryId, message: String(error?.message || error || '').slice(0, 300)
      }, { module: 'background', operation: 'trash-template-restart', context: sessionCorrelationContext(supersedeSnapshot, { adId: supersedeSnapshot.sourceAdId || null, targetTabId: supersedeSnapshot.targetTabId || null }) }).catch(() => {});
      throw error;
    }
    if (supersedeSnapshot) {
      await finalizeLostTrashTemplateSupersede(supersedeSnapshot, result.fillId).catch(() => false);
      broadcastInventoryChanged('trash-template-superseded', { fillId: supersedeSnapshot.fillId, replacementFillId: result.fillId, inventoryId: normalizedInventoryId, targetTabId: supersedeSnapshot.targetTabId || null });
      await logDiagnostic('info', 'TRASH_TEMPLATE_TARGET_LOST_RESTARTED', {
        supersededFillId: supersedeSnapshot.fillId, fillId: result.fillId, inventoryId: normalizedInventoryId, sourceAdId: supersedeSnapshot.sourceAdId || null, oldTargetTabId: supersedeSnapshot.targetTabId || null, targetTabId: result.tabId || null, autoPublishAllowed: false
      }, { module: 'background', operation: 'trash-template-restart', context: sessionCorrelationContext({ ...supersedeSnapshot, fillId: result.fillId, targetTabId: result.tabId }, { adId: supersedeSnapshot.sourceAdId || null, targetTabId: result.tabId || null }) }).catch(() => {});
    }
    return { ...result, supersededFillId: supersedeSnapshot?.fillId || null, insertionLock: await getInsertionLockState() };
  });
}

async function startTemplateFill(inventoryId, options = {}) {
  return withInsertionStartGate(async () => {
    await assertInsertionStartAvailable({ kind: 'renewal', inventoryId: String(inventoryId || '') });
    const record = await getInventory(String(inventoryId || ''));
    if (record?.profileId) await assertSelectedProfileMatchesLiveAccount({ expectedProfileId: record.profileId, expectedProfileName: record.profileName || '', purpose: 'renewal-start' });
    const result = await startTemplateFillUnlocked(inventoryId, options);
    return { ...result, insertionLock: await getInsertionLockState() };
  });
}

async function updateTemplateFillSession(message, sender) {
  return withTemplateFillMutation(async () => {
  const tabId = sender?.tab?.id;
  const sessions = await readFillSessions();
  const session = sessions[message.fillId];
  if (!session || session.targetTabId !== tabId) throw new Error("Vorlagen-Sitzung gehört nicht zu diesem Tab.");
  const previousStatus = session.status;
  const previousStage = session.stage;
  const requestedStage = typeof message.stage === 'string' ? message.stage.slice(0, 80) : '';
  const protectedPublishStage = Boolean(session.renewalId || session.archiveInsertionId) && ['publish-submitted', 'new-id-confirmed'].includes(String(previousStage || ''));
  const stalePublishRegression = protectedPublishStage && ['form-verified', 'post-fill-continuing', 'awaiting-publish', 'awaiting-manual-publish', 'auto-publish-ready'].includes(requestedStage);
  if (stalePublishRegression) {
    await logDiagnostic('info', 'TEMPLATE_FILL_STALE_PUBLISH_STAGE_IGNORED', {
      fillId: session.fillId, previousStage, requestedStage, requestedStatus: message.status || null
    }, { module: 'background', operation: 'template-fill', context: sessionCorrelationContext(session, { adId: session.sourceAdId, targetTabId: tabId }) }).catch(() => {});
    return { status: session.status, stage: session.stage, staleUpdateIgnored: true };
  }
  const previousTerminal = TERMINAL_TEMPLATE_FILL_STATUSES.has(String(previousStatus || ''));
  const rawRequestedStatus = String(message.status || '');
  if (previousTerminal && (rawRequestedStatus !== String(previousStatus || '') || (requestedStage && requestedStage !== String(previousStage || '')))) {
    await logDiagnostic('info', 'TEMPLATE_FILL_TERMINAL_UPDATE_IGNORED', {
      fillId: session.fillId, previousStatus, previousStage, requestedStatus: rawRequestedStatus || null, requestedStage: requestedStage || null
    }, { module: 'background', operation: 'template-fill', context: sessionCorrelationContext(session, { adId: session.sourceAdId, targetTabId: tabId }) }).catch(() => {});
    return { status: session.status, stage: session.stage, staleUpdateIgnored: true, terminalStateProtected: true };
  }
  const allowedStatuses = new Set(["waiting", "running", "complete", "needs-review", "error"]);
  const requestedStatus = message.status && allowedStatuses.has(message.status) ? message.status : session.status;
  const transientProgress = isTransientTemplateFillProgress(requestedStage, requestedStatus, message.result);
  if (transientProgress) {
    const transientProgressSnapshot = templateFillProgressSnapshot(session, requestedStage);
    if (session.massBatchId && session.renewalId) queueMassRenewalProgress(transientProgressSnapshot);
    return { status: requestedStatus, stage: requestedStage, transientProgress: true };
  }
  if (message.status && allowedStatuses.has(message.status)) session.status = message.status;
  if (requestedStage) session.stage = requestedStage;
  if (message.result && typeof message.result === "object") {
    session.result = {
      complete: Boolean(message.result.complete),
      issues: Array.isArray(message.result.issues) ? message.result.issues.slice(0, 50).map(value => String(value).slice(0, 300)) : []
    };
  }
  if (session.stage === 'paid-insertion-required' && message.paidInsertion && typeof message.paidInsertion === 'object') {
    session.paidInsertion = {
      phase: String(message.paidInsertion.phase || '').slice(0, 40),
      source: String(message.paidInsertion.source || '').slice(0, 80),
      pathname: String(message.paidInsertion.pathname || '').slice(0, 240),
      amount: message.paidInsertion.amount == null ? null : String(message.paidInsertion.amount).slice(0, 80),
      detectedAt: new Date().toISOString()
    };
  }
  session.updatedAt = new Date().toISOString();
  sessions[session.fillId] = session;
  await writeFillSessions(sessions);
  const templateLockWasActive = Boolean(session.templateOnly) && ['waiting', 'running'].includes(String(previousStatus || ''));
  const templateLockIsActive = Boolean(session.templateOnly) && ['waiting', 'running'].includes(String(session.status || ''));
  if (templateLockWasActive && !templateLockIsActive) {
    broadcastInventoryChanged('insertion-lock-released', { kind: 'trash-template', ownerId: session.fillId, inventoryId: session.inventoryId || null, status: session.status || null, stage: session.stage || null });
  }
  if (session.renewalId && (session.status !== previousStatus || session.stage !== previousStage)) {
    const renewals = await readRenewalSessions().catch(() => ({}));
    const renewal = renewals[session.renewalId];
    if (renewal) {
      if (['awaiting-publish', 'awaiting-manual-publish', 'auto-publish-ready'].includes(session.stage)) {
        renewal.status = 'draft';
        renewal.stage = session.stage;
      } else if (session.status === 'needs-review' || session.status === 'error') {
        const issue = session.result?.issues?.[0] || null;
        if (session.stage === 'paid-insertion-required') {
          renewal.status = 'verification-failed';
          renewal.stage = 'paid-insertion-required';
          renewal.paidInsertion = session.paidInsertion ? { ...session.paidInsertion } : null;
          renewal.lastError = issue || 'Kleinanzeigen verlangt eine kostenpflichtige Einstellung.';
        } else {
          recordRenewalPhaseAttemptError(renewal, 1, issue || session.stage || 'Phase 1 konnte nicht abgeschlossen werden.');
          if (canRetryRenewalPhase1(renewal, session)) {
            renewal.status = 'draft';
            renewal.stage = 'phase1-retry-pending';
            renewal.lastError = issue;
            queueMicrotaskFn(() => { void restartRenewalPhase1Attempt(renewal.renewalId, session.fillId, issue || session.stage || 'fill-failed'); });
          } else {
            renewal.status = 'verification-failed';
            renewal.stage = session.stage || 'fill-failed';
            renewal.lastError = issue;
          }
        }
      } else if (session.status === 'running') {
        renewal.stage = session.stage || renewal.stage;
      }
      await persistRenewalSession(renewal).catch(() => {});
    }
  }

  if (session.archiveInsertionId && (session.status !== previousStatus || session.stage !== previousStage)) {
    const archiveSessions = await readArchiveInsertionSessions().catch(() => ({}));
    const archive = archiveSessions[session.archiveInsertionId];
    if (archive && !['complete', 'needs-review', 'error'].includes(String(archive.status || ''))) {
      if (session.status === 'needs-review' || session.status === 'error') {
        archive.status = 'error';
        archive.stage = 'error-phase-1';
        archive.failurePhase = 1;
        archive.lastError = session.result?.issues?.[0] || 'Die ZIP-Vorlage konnte nicht vollständig übernommen werden.';
      } else if (!archive.newAdId) {
        archive.status = 'filling';
        archive.stage = session.stage || archive.stage;
      }
      await persistArchiveInsertionSession(archive).catch(() => {});
    }
  }
  if (session.status !== previousStatus || session.stage !== previousStage) {
    if (session.templateOnly) broadcastInventoryChanged('trash-template-updated', { fillId: session.fillId, inventoryId: session.inventoryId || null, sourceAdId: session.sourceAdId || null, status: session.status || null, stage: session.stage || null, targetTabId: session.targetTabId || null });
    await logDiagnostic(session.status === 'error' ? 'error' : session.status === 'needs-review' ? 'warning' : 'info', 'TEMPLATE_FILL_STAGE', {
      fillId: session.fillId,
      inventoryId: session.inventoryId,
      sourceAdId: session.sourceAdId,
      previousStatus,
      status: session.status,
      previousStage,
      stage: session.stage,
      issueCount: session.result?.issues?.length || 0
    }, { module: 'background', operation: 'template-fill', context: sessionCorrelationContext(session, { adId: session.sourceAdId, targetTabId: tabId }) }).catch(() => {});
  }
  if (["complete", "needs-review", "error"].includes(session.status)) {
    evictTemplateImageTransfersForFill(session.fillId);
    await logDiagnostic(session.status === "complete" ? "info" : "warning", "TEMPLATE_FILL_FINISHED", {
      fillId: session.fillId,
      inventoryId: session.inventoryId,
      sourceAdId: session.sourceAdId,
      status: session.status,
      stage: session.stage,
      issueCount: session.result?.issues?.length || 0
    }).catch(() => {});
  }
  return { status: session.status, stage: session.stage };

  });
}

async function terminalizeTemplateFillOnPlatformError(tabId, rawUrl, evidence = {}) {
  const classified = classifyKleinanzeigenInsertionErrorUrl(rawUrl, evidence);
  if (!classified.isError) return false;
  let session = null;
  let previousStatus = null;
  let previousStage = null;
  await withTemplateFillMutation(async () => {
    const sessions = await readFillSessions();
    const found = Object.values(sessions).find(item => item?.targetTabId === tabId && ['waiting', 'running'].includes(String(item?.status || '')));
    if (!found) return false;
    session = found;
    previousStatus = String(session.status || '');
    previousStage = String(session.stage || '');
    const codeText = classified.errorCode ? ` (Fehler ${classified.errorCode})` : '';
    const issue = `Kleinanzeigen hat beim Erstellen der neuen Anzeige eine Fehlerseite geöffnet${codeText}.`;
    session.status = 'error';
    session.stage = 'platform-error-page';
    session.result = { complete: false, issues: [issue] };
    session.updatedAt = new Date().toISOString();
    sessions[session.fillId] = session;
    await writeFillSessions(sessions);
    return true;
  });
  if (!session) return false;

  const issue = session.result?.issues?.[0] || 'Kleinanzeigen hat beim Erstellen der neuen Anzeige eine Fehlerseite geöffnet.';
  await logDiagnostic('error', 'KLEINANZEIGEN_ERROR_PAGE_DETECTED', {
    operationId: session.operationId || null,
    parentOperationId: session.parentOperationId || null,
    fillId: session.fillId,
    renewalId: session.renewalId || null,
    archiveInsertionId: session.archiveInsertionId || null,
    path: classified.path || null,
    errorCode: classified.errorCode || null,
    detectionReason: classified.reason || evidence?.reason || null,
    source: evidence?.source || 'tab-navigation',
    title: String(evidence?.title || '').slice(0, 180) || null,
    previousStatus,
    previousStage
  }, {
    module: 'background',
    operation: 'template-fill',
    context: sessionCorrelationContext(session, { adId: session.sourceAdId || null, targetTabId: tabId })
  }).catch(() => {});

  if (session.renewalId) {
    const renewals = await readRenewalSessions().catch(() => ({}));
    const renewal = renewals[session.renewalId];
    if (renewal && !['cancelled', 'replaced'].includes(String(renewal.status || ''))) {
      renewal.platformErrorCode = classified.errorCode || null;
      recordRenewalPhaseAttemptError(renewal, 1, issue);
      if (canRetryRenewalPhase1(renewal, session)) {
        renewal.status = 'draft';
        renewal.stage = 'phase1-retry-pending';
        renewal.lastError = issue;
        await persistRenewalSession(renewal);
        queueMicrotaskFn(() => { void restartRenewalPhase1Attempt(renewal.renewalId, session.fillId, issue); });
      } else {
        renewal.status = 'verification-failed';
        renewal.stage = 'platform-error-page';
        renewal.lastError = issue;
        await persistRenewalSession(renewal);
      }
    }
  }

  if (session.archiveInsertionId) {
    const archiveSessions = await readArchiveInsertionSessions().catch(() => ({}));
    const archive = archiveSessions[session.archiveInsertionId];
    if (archive && !['complete', 'needs-review', 'error', 'cancelled'].includes(String(archive.status || ''))) {
      archive.status = 'error';
      archive.stage = 'error-phase-1';
      archive.failurePhase = 1;
      archive.lastError = issue;
      archive.platformErrorCode = classified.errorCode || null;
      await persistArchiveInsertionSession(archive).catch(() => {});
    }
  }

  broadcastInventoryChanged('insertion-lock-released', {
    kind: session.renewalId ? 'renewal-platform-error' : session.archiveInsertionId ? 'archive-insertion-platform-error' : 'template-platform-error',
    ownerId: session.renewalId || session.archiveInsertionId || session.fillId,
    inventoryId: session.inventoryId || null,
    status: session.status,
    stage: session.stage
  });
  return true;
}

      return Object.freeze({
        recoverableTrashTemplateFill, getRecoverableTrashTemplateFill, prepareTrashTemplateInventoryCapture,
        completeTrashTemplateFlow, getTrashTemplateFillStatus, startTrashTemplateFillUnlocked, startTemplateFillUnlocked,
        startTrashTemplateFill, startTemplateFill, updateTemplateFillSession, terminalizeTemplateFillOnPlatformError
      });
    }
  });
  KRDeps.register('KRTemplateFillController', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
