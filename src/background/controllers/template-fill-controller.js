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
                createAutomationTab, deleteInventoryStorageRecord, delay, registerShadowTab, updateAutomationTab, logDiagnostic, correlationContext, sessionCorrelationContext,
                assertSelectedProfileMatchesLiveAccount, getInsertionLockState, assertInsertionStartAvailable, withInsertionStartGate,
                getRenewalConfiguration, normalizeRenewalMode, normalizeRenewalPhaseAttempts,
                readRenewalSessions, writeRenewalSessions, createRenewalSkeleton, persistRenewalSession,
                isTransientTemplateFillProgress, templateFillProgressSnapshot, queueMassRenewalProgress,
                readArchiveInsertionSessions, persistArchiveInsertionSession,
                recordRenewalPhaseAttemptError, canRetryRenewalPhase1, restartRenewalPhase1Attempt,
                evictTemplateImageTransfersForFill, classifyKleinanzeigenInsertionErrorUrl,
                cryptoApi, chromeApi, TemplateSchemaCore, queueMicrotaskFn,
                 withAutonomousAdmission = () => Promise.reject(Object.assign(new Error('KR_UPDATE_FENCE_UNAVAILABLE'), { code: 'KR_UPDATE_FENCE_UNAVAILABLE' })),
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
        queueMicrotaskFn, withAutonomousAdmission,
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
  if (!session?.templateOnly || session.schemaTestScenario) return null;
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
  // Retired L15 test-only launch arguments are rejected before creating tabs.
  if (arguments[1]?.schemaTestScenario != null) throw new Error('Manueller Schema-Prüfmodus wurde entfernt.');
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
  await logDiagnostic('info', 'TRASH_TEMPLATE_FILL_STARTED',
    { operationId, fillId, inventoryId: String(record.inventoryId), sourceAdId: String(record.adId || ''),
      targetTabId: tab.id, autoPublishAllowed: false }, { module: 'background', operation: 'trash-template-fill', context: sessionCorrelationContext(sessions[fillId], { adId: record.adId || null, targetTabId: tab.id }) }).catch(() => {});
  return { operationId, parentOperationId: null, fillId, templateOnly: true, tabId: tab.id, url: TEMPLATE_TARGET_URL };
}

// KAR-143 native QA: Chrome can briefly refuse local tab creation while its
// tab strip is being edited. Retry ONLY that specific, rejected local API call.
// Never retry an uncertain remote publish, a platform restriction or tab update.
function chromeTabCreationTemporarilyBlocked(error) {
  return /^Tabs cannot be edited right now(?:[ (.]|$)/i.test(String(error?.message || error || ''));
}

async function createRenewalTargetTab(renewal) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const tab = await createAutomationTab({ url: 'about:blank', active: false });
      if (!tab?.id) throw new Error('Neuer Kleinanzeigen-Tab konnte nicht geöffnet werden.');
      return tab;
    } catch (error) {
      if (!chromeTabCreationTemporarilyBlocked(error) || attempt === 3) throw error;
      await logDiagnostic('info', 'RENEWAL_TAB_CREATE_RETRY', {
        renewalId: renewal.renewalId, sourceAdId: renewal.sourceAdId,
        attempt, maxAttempts: 3, reason: 'chrome-tab-strip-busy'
      }, { module: 'background', operation: 'renewal-start', context: sessionCorrelationContext(renewal, { adId: renewal.sourceAdId }) }).catch(() => {});
      if (typeof delay !== 'function') throw new Error('Wartefunktion für Renewal-Tab-Retry nicht verfügbar.');
      await delay(250 * attempt);
    }
  }
  throw new Error('Neuer Kleinanzeigen-Tab konnte nicht geöffnet werden.');
}

// This point precedes any fill session or publish action. On terminal failure
// release ONLY the exact unstarted renewal and its generated local skeleton.
// Keep the original inventory ad and all remote Kleinanzeigen data untouched.
// First cancel to release the lock even if the local skeleton deletion fails.
async function rollbackUnopenedRenewal(renewal, error) {
  const renewals = await readRenewalSessions();
  const current = renewals[renewal.renewalId];
  const skeletonId = 'renewal:' + renewal.renewalId;
  const fills = await readFillSessions();
  if (!current || current.operationId !== renewal.operationId ||
      String(current.sourceInventoryId || '') !== String(renewal.sourceInventoryId) ||
      String(current.skeletonInventoryId || '') !== skeletonId ||
      current.status !== 'draft' || current.stage !== 'draft-created' ||
      current.targetTabId || current.newAdId || current.publishClickedAt ||
      current.newIdConfirmedAt || current.newPublicUrl || current.emergencyResetAt ||
      Object.values(fills).some(fill => String(fill?.renewalId || '') === renewal.renewalId)) {
    throw new Error('Abbruchzustand ist nicht eindeutig unveröffentlicht; die Renewal-Sitzung wurde aus Sicherheitsgründen nicht automatisch freigegeben.');
  }
  current.status = 'cancelled';
  current.stage = 'target-tab-create-failed';
  current.lastError = String(error?.message || error).slice(0, 400);
  current.updatedAt = new Date().toISOString();
  if (current.massBatchId) current.massBatchTerminal = true;
  await writeRenewalSessions(renewals);
  if (typeof deleteInventoryStorageRecord !== 'function')
    throw new Error('Lokaler Renewal-Entwurf konnte nicht sicher entfernt werden: Bereinigungsfunktion fehlt.');
  await deleteInventoryStorageRecord(skeletonId);
  delete renewals[renewal.renewalId];
  await writeRenewalSessions(renewals);
  broadcastInventoryChanged('insertion-lock-released', {
    kind: 'renewal', ownerId: renewal.renewalId,
    inventoryId: renewal.sourceInventoryId, status: 'cancelled', stage: 'target-tab-create-failed'
  });
  await logDiagnostic('warning', 'RENEWAL_TAB_CREATE_FAILED_CLEAN', {
    renewalId: renewal.renewalId, sourceAdId: renewal.sourceAdId,
    reason: String(error?.message || error).slice(0, 400),
    localSkeletonDeleted: true, remoteActionAttempted: false
  }, { module: 'background', operation: 'renewal-start', context: sessionCorrelationContext(renewal, { adId: renewal.sourceAdId }) }).catch(() => {});
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

  let tab;
  try {
    tab = await createRenewalTargetTab(renewal);
  } catch (error) {
    // A missing/denied tab is a prepublish local failure, not a live draft.
    // On any cleanup failure preserve the fail-closed tombstone/diagnostics
    // rather than falsely declaring the source ready for a new attempt.
    await rollbackUnopenedRenewal(renewal, error);
    throw error;
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
  if (options.schemaTestScenario != null) throw new Error('Manueller Schema-Prüfmodus wurde entfernt.');
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

// KAR-134 L4: A genuine F3 reference update is owned by the background
// mutation queue, not by a content script or the synthetic test store.
// It uses the existing UPDATE_TEMPLATE_FILL_SESSION route, sender-tab gate,
// live profile check and an expiring one-use consent token. Never touches F2
// without confirmed ancestor technical IDs, or the globally scoped F1.
async function adoptVerifiedSchemaReference(message, session, sessions, sender) {
  const request = message?.referenceAdoption || {};
  const action = String(request.action || '');
  const categoryId = String(request.categoryId || '');
  const stage = String(request.stage || '');
  const oldFingerprint = String(request.oldFingerprint || '');
  const newFingerprint = String(request.newFingerprint || '');
  const validHash = value => /^[a-f0-9]{64}$/.test(value);
  const fail = text => { throw new Error(text); };
  if (!TemplateSchemaCore?.fingerprint || !TemplateSchemaCore?.diff ||
      !chromeApi?.storage?.local?.get || !chromeApi?.storage?.local?.set)
    fail('Schema-Fingerprint-Übernahme ist nicht verfügbar.');
  if (!['prepare','commit'].includes(action) || stage !== 'attributes' ||
      !/^[1-9][0-9]*$/.test(categoryId) || !validHash(oldFingerprint) ||
      !validHash(newFingerprint) || oldFingerprint === newFingerprint)
    fail('Eine eindeutige, geänderte F3-Referenz ist erforderlich.');
  const target = new URL(TEMPLATE_TARGET_URL);
  const senderUrl = new URL(String(sender?.tab?.url || ''), target.origin);
  if (senderUrl.origin !== target.origin || senderUrl.pathname !== target.pathname ||
      sender?.tab?.id !== session?.targetTabId ||
      Boolean(session?.schemaTestScenario) ||
      !Boolean(session?.templateOnly || session?.renewalId || session?.archiveInsertionId) ||
      session?.status !== 'needs-review' ||
      session?.stage !== 'schema-reference-review-required' ||
      !session.fillId || !session.inventoryId ||
      !/^[A-Za-z0-9_-]{1,80}$/.test(String(session.fillId)) ||
      Date.now() - Date.parse(session.createdAt || 0) > 15 * 60 * 1000)
    fail('Die kontrollierte F3-Übernahme ist nur aus einer aktuellen Formular-Strukturprüfung zulässig.');
  const record = await getInventory(session.inventoryId);
  if (!record?.profileId || String(record.adId || '') !== String(session.sourceAdId || '') ||
      String(record.category?.id ?? record.categoryIdFromUrl ?? '') !== categoryId)
    fail('Die Inventar- oder Kontozuordnung hat sich geändert.');
  const lock = await getInsertionLockState();
  // The current authenticated insertion may legitimately own the global lock;
  // any unrelated or multiple owner must still fail closed.
  const own = session.renewalId
    ? { kind: 'renewal', id: String(session.renewalId) }
    : session.archiveInsertionId
      ? { kind: 'archive-insertion', id: String(session.archiveInsertionId) }
      : { kind: 'trash-template', id: String(session.fillId) };
  if (lock?.locked === true &&
      (lock.kind !== own.kind || String(lock.ownerId || '') !== own.id ||
       Number(lock.conflictCount || 1) !== 1))
    fail('Ein weiterer Inserierungsvorgang ist aktiv.');
  // Independently check the selected profile and the platform account on
  // both consent preparation and final commit. No permission from the initial
  // native category check is silently re-used for a later mutation.
  await assertSelectedProfileMatchesLiveAccount({
    expectedProfileId: record.profileId, expectedProfileName: record.profileName || '',
    purpose: 'schema-reference-adoption'
  });
  if (action === 'commit') {
    const pending = session.pendingSchemaReferenceApproval;
    if (!pending || pending.token !== String(request.token || '') ||
        Date.now() >= Date.parse(pending.expiresAt || 0) ||
        pending.categoryId !== categoryId || pending.stage !== stage ||
        pending.oldFingerprint !== oldFingerprint || pending.newFingerprint !== newFingerprint ||
        pending.inventoryId !== String(session.inventoryId))
      fail('Die ausdrückliche Bestätigung ist abgelaufen oder bereits benutzt.');
  }
  const key = 'kr134:stage-monitor:v1:attributes:' + categoryId;
  const stored = await chromeApi.storage.local.get(key);
  const baseline = stored?.[key];
  if (!baseline || baseline.schemaVersion !== 1 || !baseline.snapshot ||
      baseline.fingerprint !== oldFingerprint ||
      await TemplateSchemaCore.fingerprint(baseline.snapshot) !== oldFingerprint)
    fail('Die gespeicherte F3-Referenz ist veraltet oder ungültig.');
  if (action === 'prepare') {
    const token = cryptoApi.randomUUID();
    const expiresAt = new Date(Date.now() + 120000).toISOString();
    session.pendingSchemaReferenceApproval = {
      token, categoryId, stage, oldFingerprint, newFingerprint,
      expiresAt, inventoryId: String(session.inventoryId)
    };
    sessions[session.fillId] = session;
    await writeFillSessions(sessions);
    return { pending: true, referenceApproved: false, token, expiresAt };
  }
  if (!Number.isFinite(request.freshObservationCapturedAt) ||
      Math.abs(Date.now() - request.freshObservationCapturedAt) > 15000)
    fail('Die aktuelle Formularstruktur muss unmittelbar vor der Übernahme erneut gelesen werden.');
  const snapshot = request.snapshot;
  const serialized = JSON.stringify(snapshot || null);
  if (serialized.length > 100000 || snapshot?.categoryId !== categoryId ||
      !Array.isArray(snapshot.fields) || snapshot.fields.length < 1 ||
      snapshot.fields.length > 200 ||
      await TemplateSchemaCore.fingerprint(snapshot) !== newFingerprint)
    fail('Die erneut gelesene F3-Struktur stimmt nicht mit der bestätigten Änderung überein.');
  const comparison = TemplateSchemaCore.diff(baseline.snapshot,snapshot);
  const allowed = new Set(['field-added','field-removed','control-kind-changed',
    'requiredness-changed','valid-options-changed']);
  if (comparison.status !== 'schema-changed' ||
      !Array.isArray(comparison.changes) || !comparison.changes.length ||
      comparison.changes.length > 100 ||
      !comparison.changes.every(c => allowed.has(c.type) &&
        /^(?:field|attribute):/.test(String(c.key || ''))))
    fail('Die Strukturänderung kann nicht vollständig und eindeutig nachgewiesen werden.');
  // The controller's withTemplateFillMutation queue serializes all real
  // approvals; F3 is the single Chrome storage key changed by this action.
  // Concurrent initial observers never overwrite an existing reference.
  const acceptedAt = new Date().toISOString();
  await chromeApi.storage.local.set({ [key]: {
    schemaVersion: 1, snapshot, fingerprint: newFingerprint,
    priorReference: { snapshot: baseline.snapshot, fingerprint: oldFingerprint },
    approval: { kind: 'explicit-owner-f3-structural-review', fillId: session.fillId,
      categoryId, approvedAt: acceptedAt }
  } });
  const check = (await chromeApi.storage.local.get(key))?.[key];
  if (!check || check.fingerprint !== newFingerprint ||
      check.approval?.fillId !== session.fillId ||
      await TemplateSchemaCore.fingerprint(check.snapshot) !== newFingerprint)
    fail('Die gespeicherte Referenzübernahme konnte nicht bestätigt werden.');
  session.pendingSchemaReferenceApproval = null;
  session.schemaReferenceApproval = {
    stage: 'attributes', categoryId, oldFingerprint, newFingerprint, approvedAt: acceptedAt
  };
  sessions[session.fillId] = session;
  await writeFillSessions(sessions);
  return { referenceApproved: true, stage: 'attributes', categoryId,
    previousFingerprint: oldFingerprint, currentFingerprint: newFingerprint,
    realReferenceWrites: 1, remotePublishAttempted: false };
}

async function updateTemplateFillSession(message, sender) {
  return withTemplateFillMutation(async () => {
  const tabId = sender?.tab?.id;
  const sessions = await readFillSessions();
  const session = sessions[message.fillId];
  if (!session || session.targetTabId !== tabId) throw new Error("Vorlagen-Sitzung gehört nicht zu diesem Tab.");
  // Real F3 consent is an explicit, authenticated mutation on a paused
  // production posting preflight, never an invisible or test-mode update.
  if (message?.referenceAdoption)
    return adoptVerifiedSchemaReference(message, session, sessions, sender);
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
    // KAR-134: a successful fill is not a publish authorization without a persisted
    // exact-category live-schema attestation. Retain it over the post-fill wizard.
    const incomingProof = message.result.schemaPreflight;
    const validProof = incomingProof?.verified === true &&
      /^[a-f0-9]{64}$/.test(String(incomingProof.currentFingerprint || '')) &&
      (incomingProof.sourceFingerprint == null || /^[a-f0-9]{64}$/.test(String(incomingProof.sourceFingerprint))) &&
      /^\d+$/.test(String(incomingProof.categoryId || ''));
    const existingProof = session.result?.schemaPreflight?.verified === true
      ? session.result.schemaPreflight : null;
    const proof = validProof && requestedStage === 'form-verified'
      ? { verified: true, categoryId: String(incomingProof.categoryId),
          currentFingerprint: String(incomingProof.currentFingerprint),
          sourceFingerprint: incomingProof.sourceFingerprint || null, checkedAt: new Date().toISOString() }
      : existingProof;
    session.result = {
      complete: Boolean(message.result.complete),
      issues: Array.isArray(message.result.issues) ? message.result.issues.slice(0, 50).map(value => String(value).slice(0, 300)) : [],
      schemaPreflight: Boolean(message.result.complete) ? proof : null
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
        if (session.stage === 'schema-preflight' || session.stage === 'schema-preflight-missing') {
          // A structural incompatibility must never trigger another automated Phase-1 attempt.
          renewal.status = 'verification-failed';
          renewal.stage = session.stage;
          renewal.lastError = issue || 'Formularschema-Vorprüfung konnte nicht bestätigt werden.';
        } else if (session.stage === 'paid-insertion-required') {
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
            queueMicrotaskFn(() => { void withAutonomousAdmission('renewal-phase1-retry', () => restartRenewalPhase1Attempt(renewal.renewalId, session.fillId, issue || session.stage || 'fill-failed')).catch(() => {}); });
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
        queueMicrotaskFn(() => { void withAutonomousAdmission('renewal-phase1-retry', () => restartRenewalPhase1Attempt(renewal.renewalId, session.fillId, issue)).catch(() => {}); });
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
