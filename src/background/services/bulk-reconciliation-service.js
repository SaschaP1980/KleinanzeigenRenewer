(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const {
        getBulkRunState, normalizeProfileName, writeBulkRunState, logDiagnostic, sessionCorrelationContext,
        releaseBulkSourceOwnership, readRenewalSessions, readFillSessions, readMassRenewalBatch, isTrashRecord,
        readInventoryRecordsForProfile, openDatabase, trashRecordFrom, broadcastInventoryChanged, normalBrowserWindowId,
        bulkRunOwnerExpectation, assertPlatformAccessAllowed, createAutomationTab, registerShadowTab, updateAutomationTab,
        waitForTabComplete, ensureContentConnection, sendTabRequestWithBootstrap, closeRegistryTab, scheduleBulkSourceTabClose
      } = options;
      const InventoryReconciliation = options.inventoryReconciliationApi || {};
      const INVENTORY_STORE = options.inventoryStore || 'inventories';
      const FRESH_RECONCILIATION_SOURCE_MAX_ATTEMPTS = Math.max(1, Number(options.freshReconciliationSourceMaxAttempts || 2));
      const TAB_LOAD_TIMEOUT_DEFAULT_MS = Math.max(1, Number(options.tabLoadTimeoutDefaultMs || 20000));
      const PLATFORM_ACCESS_RESTRICTION_ERROR_CODE = String(options.platformAccessRestrictionErrorCode || 'KR_PLATFORM_ACCESS_RESTRICTED');
      const MY_ADS_PROJECTS_URL = String(options.myAdsProjectsUrl || 'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS');
      const TAB_ROLES = options.tabRoles || {};
      const required = { getBulkRunState, normalizeProfileName, writeBulkRunState, logDiagnostic, releaseBulkSourceOwnership, readRenewalSessions, readFillSessions, readMassRenewalBatch, isTrashRecord, readInventoryRecordsForProfile, openDatabase, trashRecordFrom, broadcastInventoryChanged, normalBrowserWindowId, bulkRunOwnerExpectation, assertPlatformAccessAllowed, createAutomationTab, registerShadowTab, updateAutomationTab, waitForTabComplete, ensureContentConnection, sendTabRequestWithBootstrap, closeRegistryTab, scheduleBulkSourceTabClose };
      for (const [name,value] of Object.entries(required)) if (typeof value !== 'function') throw new Error(`bulk reconciliation service dependency ${name} is required`);
      function requireBulkSource(state, sender) {
        const tabId = sender?.tab?.id;
        if (!state || state.status !== 'running') throw new Error('Keine aktive Erfassung vorhanden.');
        if (!tabId || state.sourceTabId !== tabId) throw new Error('Die laufende Erfassung wurde in einem anderen „Meine Anzeigen“-Tab gestartet.');
        return tabId;
      }
async function beginBulkReconciliation(message, sender) {
  const state = await getBulkRunState();
  requireBulkSource(state, sender);
  if (String(state.stage || '') !== 'reconciliation-ready') throw new Error('Unabhängiger Bestandsabgleich ist in diesem Zustand nicht vorgesehen.');
  const currentPage = Number(message?.currentPage || 0);
  if (currentPage !== 1) throw new Error('Unabhängiger Bestandsabgleich muss auf Seite 1 beginnen.');
  const detectedProfile = normalizeProfileName(message?.profileName || '');
  if (!detectedProfile || normalizeProfileName(state.profileName || '').toLocaleLowerCase('de-DE') !== detectedProfile.toLocaleLowerCase('de-DE')) {
    throw new Error('Kleinanzeigen-Konto hat sich vor dem unabhängigen Bestandsabgleich geändert.');
  }
  const onlineCount = Number(message?.onlineCount);
  if (!Number.isInteger(onlineCount) || onlineCount < 0 || onlineCount !== Number(state.expectedTotal || 0)) {
    throw new Error(`Online-Bestand hat sich vor dem unabhängigen Bestandsabgleich geändert (${Number.isInteger(onlineCount) ? onlineCount : '?'} statt ${Number(state.expectedTotal || 0)}).`);
  }
  state.reconciliationRosterPages = {};
  state.reconciliationRosterIds = [];
  state.reconciliationRosterInvalid = null;
  state.reconciliationStatus = 'scanning';
  state.reconciliationStartedAt = new Date().toISOString();
  state.reconciliationCurrentPage = 1;
  state.stage = 'reconciliation-scanning';
  await writeBulkRunState(state);
  await logDiagnostic('info', 'BULK_RECONCILIATION_SECOND_SCAN_STARTED', {
    runId: state.runId, expectedTotal: state.expectedTotal, profileId: state.profileId || null
  }, { module: 'background', operation: 'bulk-reconciliation', context: sessionCorrelationContext(state) }).catch(() => {});
  return state;
}


function normalizedBulkRosterIds(values) { return InventoryReconciliation.normalizeRosterIds(values); }

function bulkRosterEvidence(pages) { return InventoryReconciliation.rosterEvidence(pages); }

async function recordBulkRosterPage(message, sender, { reconciliation = false } = {}) {
  const state = await getBulkRunState();
  requireBulkSource(state, sender);
  const page = Number(message?.page || 0);
  if (!Number.isInteger(page) || page < 1 || page > 100) throw new Error('Anzeigenbestand enthält eine ungültige Seitennummer.');
  const ids = normalizedBulkRosterIds(message?.ids);
  const key = reconciliation ? 'reconciliationRosterPages' : 'remoteRosterPages';
  const pages = state[key] && typeof state[key] === 'object' ? { ...state[key] } : {};
  const existing = Array.isArray(pages[page]) ? pages[page].map(String) : null;
  if (existing && JSON.stringify(existing) !== JSON.stringify(ids)) {
    const issue = `Anzeigenbestand auf Seite ${page} änderte sich während derselben Prüfung.`;
    state.issues = [...new Set([...(state.issues || []), issue])];
    state[reconciliation ? 'reconciliationRosterInvalid' : 'remoteRosterInvalid'] = issue;
  } else if (!existing) {
    pages[page] = ids;
  }
  state[key] = pages;
  const evidence = bulkRosterEvidence(pages);
  state[reconciliation ? 'reconciliationRosterIds' : 'remoteRosterIds'] = evidence.ids;
  if (evidence.duplicates.length) {
    const issue = `Anzeigenbestand enthält dieselbe Anzeigen-ID auf mehreren Seiten: ${evidence.duplicates.slice(0, 8).join(', ')}.`;
    state.issues = [...new Set([...(state.issues || []), issue])];
    state[reconciliation ? 'reconciliationRosterInvalid' : 'remoteRosterInvalid'] = issue;
  }
  if (reconciliation) {
    state.stage = 'reconciliation-scanning';
    state.reconciliationCurrentPage = page;
  }
  return writeBulkRunState(state);
}


async function protectedInventoryIdsForReconciliation(profileId) {
  const [renewals, fills, massBatch] = await Promise.all([
    readRenewalSessions().catch(() => ({})),
    readFillSessions().catch(() => ({})),
    readMassRenewalBatch().catch(() => null)
  ]);
  const protectedIds = new Set();
  for (const session of Object.values(renewals || {})) {
    if (['cancelled', 'replaced'].includes(String(session?.status || ''))) continue;
    if (session?.profileId && String(session.profileId) !== String(profileId || '')) continue;
    for (const value of [session?.sourceInventoryId, session?.skeletonInventoryId]) {
      const id = String(value || ''); if (id) protectedIds.add(id);
    }
  }
  const fillTerminal = new Set(['complete', 'failed', 'cancelled']);
  for (const fill of Object.values(fills || {})) {
    if (fillTerminal.has(String(fill?.status || ''))) continue;
    for (const value of [fill?.inventoryId, fill?.skeletonInventoryId]) {
      const id = String(value || ''); if (id) protectedIds.add(id);
    }
  }
  if (massBatch && String(massBatch.status || '') === 'running') {
    for (const item of Array.isArray(massBatch.items) ? massBatch.items : []) {
      for (const value of [item?.inventoryId, item?.sourceInventoryId]) {
        const id = String(value || ''); if (id) protectedIds.add(id);
      }
    }
  }
  return protectedIds;
}


async function moveReconciliationCandidatesToTrash(state, remoteIds) {
  const protectedIds = await protectedInventoryIdsForReconciliation(state.profileId);
  const records = await readInventoryRecordsForProfile(state.profileId);
  const candidates = InventoryReconciliation.selectAbsentCandidates(records, state.profileId, remoteIds, protectedIds);
  if (!candidates.length) return { moved: 0, inventoryIds: [], protectedCount: records.filter(record => !isTrashRecord(record) && String(record?.profileId || '') === String(state.profileId || '') && protectedIds.has(String(record.inventoryId || ''))).length };
  const now = new Date();
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(INVENTORY_STORE, 'readwrite');
      let failure = null;
      tx.onerror = () => { failure ||= tx.error; };
      tx.onabort = () => reject(failure || tx.error || new Error('Bestandsabgleich konnte nicht atomar in den Papierkorb verschieben.'));
      tx.oncomplete = resolve;
      const store = tx.objectStore(INVENTORY_STORE);
      for (const record of candidates) {
        store.put(trashRecordFrom(record, 'bulk-reconciliation-absent', {
          source: 'bulk-reconciliation', runId: state.runId, bulkRunId: state.bulkRunId || state.runId,
          firstRosterCount: Number(state.remoteRosterIds?.length || 0), secondRosterCount: Number(remoteIds?.length || 0)
        }, now));
      }
    });
  } finally { db.close(); }
  return { moved: candidates.length, inventoryIds: candidates.map(record => String(record.inventoryId || '')), protectedCount: records.filter(record => !isTrashRecord(record) && String(record?.profileId || '') === String(state.profileId || '') && protectedIds.has(String(record.inventoryId || ''))).length };
}


async function finishBulkReconciliation(message, sender) {
  const state = await getBulkRunState();
  requireBulkSource(state, sender);
  if (!String(state.stage || '').startsWith('reconciliation-')) throw new Error('Kein unabhängiger Bestandsabgleich aktiv.');
  const firstRoster = bulkRosterEvidence(state.remoteRosterPages || {});
  const secondRoster = bulkRosterEvidence(state.reconciliationRosterPages || {});
  const expected = Number(state.expectedTotal || 0);
  const same = InventoryReconciliation.sameIdSet(firstRoster.ids, secondRoster.ids);
  const completeSecond = InventoryReconciliation.completeRoster(secondRoster, expected, state.reconciliationRosterInvalid);
  const completeFirst = InventoryReconciliation.completeRoster(firstRoster, expected, state.remoteRosterInvalid);
  const stable = completeFirst && completeSecond && same && !state.remoteRosterInvalid && !state.reconciliationRosterInvalid;
  state.completedAt = new Date().toISOString();
  state.currentAdId = ''; state.currentTitle = ''; state.currentThumbnailUrl = '';
  if (!stable) {
    state.status = 'needs-review';
    state.stage = 'reconciliation-mismatch';
    state.reconciliationStatus = 'skipped';
    state.reconciliationSummary = { firstCount: firstRoster.ids.length, secondCount: secondRoster.ids.length, expected, movedToTrash: 0 };
    state.issues = [...new Set([...(state.issues || []), 'Die zweite Bestandsprüfung stimmt nicht mit der ersten überein. Es wurde nichts automatisch in den Papierkorb verschoben.'])];
    await writeBulkRunState(state);
    await logDiagnostic('warning', 'BULK_RECONCILIATION_SKIPPED', state.reconciliationSummary, { module: 'background', operation: 'bulk-reconciliation', context: sessionCorrelationContext(state) }).catch(() => {});
  } else {
    await logDiagnostic('info', 'BULK_RECONCILIATION_ROSTER_CONFIRMED', { expected, firstCount: firstRoster.ids.length, secondCount: secondRoster.ids.length }, { module: 'background', operation: 'bulk-reconciliation', context: sessionCorrelationContext(state) }).catch(() => {});
    const moved = await moveReconciliationCandidatesToTrash(state, secondRoster.ids);
    state.status = 'complete';
    state.stage = 'finished';
    state.reconciliationStatus = 'confirmed';
    state.reconciliationSummary = { firstCount: firstRoster.ids.length, secondCount: secondRoster.ids.length, expected, movedToTrash: moved.moved, protectedCount: moved.protectedCount, movedInventoryIds: moved.inventoryIds.slice(0, 200) };
    await writeBulkRunState(state);
    await logDiagnostic('info', 'BULK_RECONCILIATION_MOVED_TO_TRASH', state.reconciliationSummary, { module: 'background', operation: 'bulk-reconciliation', context: sessionCorrelationContext(state) }).catch(() => {});
    if (moved.moved) broadcastInventoryChanged('bulk-reconciliation-to-trash', { runId: state.runId, count: moved.moved });
  }
  await releaseBulkSourceOwnership(state, 'bulk-finished').catch(() => {});
  await logDiagnostic(state.status === 'complete' ? 'info' : 'warning', 'BULK_INVENTORY_FINISHED', {
    operationId: state.operationId || null, bulkRunId: state.bulkRunId || state.runId || null,
    runId: state.runId, status: state.status, expectedTotal: expected, processed: state.processedIds?.length || 0,
    successCount: state.successCount, failedCount: state.failedCount, reconciliationStatus: state.reconciliationStatus,
    movedToTrash: Number(state.reconciliationSummary?.movedToTrash || 0)
  }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state) }).catch(() => {});
  broadcastInventoryChanged('bulk-finished', { runId: state.runId, status: state.status, processed: state.processedIds?.length || 0, successCount: state.successCount, failedCount: state.failedCount, reconciliation: state.reconciliationSummary || null });
  scheduleAutoBulkSourceClose(state, 'bulk-auto-source-finished');
  return state;
}


async function prepareFreshBulkReconciliationSource(state, sender) {
  const originalSourceTabId = Number(state?.sourceTabId || 0);
  const originalSourceAutoCreated = state?.sourceAutoCreated === true;
  const windowId = Number(sender?.tab?.windowId || 0) || await normalBrowserWindowId();
  const owner = bulkRunOwnerExpectation(state);
  let lastError = null;
  const releaseOriginalSourceAfterHandoff = async reason => {
    if (!originalSourceTabId || Number(state.sourceTabId || 0) === originalSourceTabId) return;
    if (originalSourceAutoCreated) scheduleBulkSourceTabClose(originalSourceTabId, reason);
    else await releaseBulkSourceOwnership({ ...state, sourceTabId: originalSourceTabId }, reason).catch(() => {});
  };

  for (let attempt = 1; attempt <= FRESH_RECONCILIATION_SOURCE_MAX_ATTEMPTS; attempt += 1) {
    let candidateTabId = null;
    try {
      await assertPlatformAccessAllowed({ operation: 'bulk-reconciliation-source', context: sessionCorrelationContext(state, { attempt }) });
      const candidate = await createAutomationTab({ ...(windowId ? { windowId } : {}), url: 'about:blank', active: false });
      candidateTabId = Number(candidate?.id || 0);
      if (!candidateTabId) throw new Error('Frischer „Meine Anzeigen“-Tab für die zweite Bestandsprüfung konnte nicht geöffnet werden.');
      await registerShadowTab(candidateTabId, TAB_ROLES.BULK_SOURCE, owner, { managed: true, kind: 'bulk-reconciliation-source' });

      state.sourceTabId = candidateTabId;
      state.sourceAutoCreated = true;
      state.reconciliationSourceTabId = candidateTabId;
      state.reconciliationSourceAttempt = attempt;
      state.reconciliationSourceVerifiedAt = null;
      state.stage = 'reconciliation-preparing';
      state.currentPage = 0;
      await writeBulkRunState(state);
      await logDiagnostic('info', 'BULK_RECONCILIATION_FRESH_SOURCE_OPENED', {
        runId: state.runId, sourceTabId: candidateTabId, attempt, maxAttempts: FRESH_RECONCILIATION_SOURCE_MAX_ATTEMPTS
      }, { module: 'background', operation: 'bulk-reconciliation', context: sessionCorrelationContext(state, { sourceTabId: candidateTabId }) }).catch(() => {});

      await updateAutomationTab(candidateTabId, { url: MY_ADS_PROJECTS_URL });
      await waitForTabComplete(candidateTabId, {
        timeoutMs: TAB_LOAD_TIMEOUT_DEFAULT_MS,
        purpose: 'bulk-reconciliation-source',
        label: 'Frischer „Meine Anzeigen“-Tab',
        operation: 'bulk-reconciliation-source',
        context: sessionCorrelationContext(state, { sourceTabId: candidateTabId, attempt })
      });
      await ensureContentConnection({ tabId: candidateTabId });
      const status = await sendTabRequestWithBootstrap(candidateTabId, {
        type: 'WAIT_FOR_MY_ADS_READY',
        expectedProfileName: state.profileName || '',
        expectedOnline: Number(state.expectedTotal || 0)
      });

      state.stage = 'reconciliation-ready';
      state.currentPage = 1;
      state.reconciliationSourceVerifiedAt = new Date().toISOString();
      state.reconciliationSourceStatus = {
        currentPage: Number(status.currentPage || 0),
        expectedOnline: Number.isInteger(status.expectedOnline) ? status.expectedOnline : null,
        listingCount: Number.isInteger(status.listingCount) ? status.listingCount : null,
        hasNext: status.hasNext === true,
        observedAt: status.observedAt || null,
        readinessWaitMs: Math.max(0, Number(status.readinessWaitMs || 0))
      };
      await writeBulkRunState(state);
      await logDiagnostic('info', 'BULK_RECONCILIATION_FRESH_SOURCE_READY', {
        runId: state.runId, sourceTabId: candidateTabId, attempt, currentPage: 1,
        expectedOnline: Number.isInteger(status.expectedOnline) ? status.expectedOnline : null,
        listingCount: Number.isInteger(status.listingCount) ? status.listingCount : null, readinessWaitMs: Math.max(0, Number(status.readinessWaitMs || 0))
      }, { module: 'background', operation: 'bulk-reconciliation', context: sessionCorrelationContext(state, { sourceTabId: candidateTabId }) }).catch(() => {});

      try {
        await sendTabRequestWithBootstrap(candidateTabId, { type: 'START_BULK_RECONCILIATION_SCAN', runId: state.runId, readySnapshot: status });
      } catch (startError) {
        const latest = await getBulkRunState().catch(() => null);
        if (latest && Number(latest.sourceTabId || 0) === candidateTabId && (String(latest.stage || '') === 'reconciliation-scanning' || String(latest.status || '') !== 'running')) {
          await releaseOriginalSourceAfterHandoff('bulk-reconciliation-source-replaced');
          return latest;
        }
        throw startError;
      }
      await releaseOriginalSourceAfterHandoff('bulk-reconciliation-source-replaced');
      return state;
    } catch (error) {
      lastError = error;
      await logDiagnostic('warning', 'BULK_RECONCILIATION_SOURCE_ATTEMPT_FAILED', {
        runId: state.runId, sourceTabId: candidateTabId, attempt, maxAttempts: FRESH_RECONCILIATION_SOURCE_MAX_ATTEMPTS,
        error: String(error?.message || error || 'Unbekannter Fehler').slice(0, 500)
      }, { module: 'background', operation: 'bulk-reconciliation', context: sessionCorrelationContext(state, { sourceTabId: candidateTabId }) }).catch(() => {});
      if (candidateTabId) await closeRegistryTab(candidateTabId, 'bulk-reconciliation-source-attempt-failed', 'Frischer „Meine Anzeigen“-Tab').catch(() => {});
      if (error?.code === PLATFORM_ACCESS_RESTRICTION_ERROR_CODE) {
        await releaseOriginalSourceAfterHandoff('platform-access-restricted-previous-bulk-source');
        return getBulkRunState();
      }
      if (error?.code === 'KR_MY_ADS_INVALID') break;
    }
  }

  state.sourceTabId = originalSourceTabId;
  state.sourceAutoCreated = originalSourceAutoCreated;
  state.reconciliationSourceTabId = null;
  state.reconciliationSourceVerifiedAt = null;
  state.status = 'needs-review';
  state.stage = 'reconciliation-interrupted';
  state.completedAt = new Date().toISOString();
  state.reconciliationStatus = 'skipped';
  state.reconciliationSummary = {
    expected: Number(state.expectedTotal || 0), firstCount: Number(state.remoteRosterIds?.length || 0), secondCount: 0, movedToTrash: 0
  };
  const reason = `Bestand konnte nicht zuverlässig bestätigt werden. Es wurde nichts automatisch in den Papierkorb verschoben.${lastError?.message ? ` ${String(lastError.message).slice(0, 300)}` : ''}`;
  state.issues = [...new Set([...(state.issues || []), reason])];
  await writeBulkRunState(state);
  await logDiagnostic('warning', 'BULK_RECONCILIATION_SOURCE_PREPARE_FAILED', {
    runId: state.runId, attempts: FRESH_RECONCILIATION_SOURCE_MAX_ATTEMPTS, movedToTrash: 0,
    error: String(lastError?.message || lastError || 'Frischer Start nicht möglich').slice(0, 500)
  }, { module: 'background', operation: 'bulk-reconciliation', context: sessionCorrelationContext(state) }).catch(() => {});
  await logDiagnostic('warning', 'BULK_INVENTORY_FINISHED', {
    operationId: state.operationId || null, bulkRunId: state.bulkRunId || state.runId || null,
    runId: state.runId, status: state.status, expectedTotal: Number(state.expectedTotal || 0), processed: state.processedIds?.length || 0,
    successCount: state.successCount, failedCount: state.failedCount, reconciliationStatus: state.reconciliationStatus, movedToTrash: 0
  }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state) }).catch(() => {});
  broadcastInventoryChanged('bulk-finished', {
    runId: state.runId, status: state.status, processed: state.processedIds?.length || 0, successCount: state.successCount,
    failedCount: state.failedCount, reconciliation: state.reconciliationSummary
  });
  if (originalSourceAutoCreated) scheduleBulkSourceTabClose(originalSourceTabId, 'bulk-reconciliation-source-prepare-failed');
  else await releaseBulkSourceOwnership({ ...state, sourceTabId: originalSourceTabId }, 'bulk-reconciliation-source-prepare-failed').catch(() => {});
  return state;
}


      return Object.freeze({beginBulkReconciliation, normalizedBulkRosterIds, bulkRosterEvidence, recordBulkRosterPage, protectedInventoryIdsForReconciliation, moveReconciliationCandidatesToTrash, finishBulkReconciliation, prepareFreshBulkReconciliationSource});
    }
  });
  globalThis.KRDeps?.register?.('KRBulkReconciliationService', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
