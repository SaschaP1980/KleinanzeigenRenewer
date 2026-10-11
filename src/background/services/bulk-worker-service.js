(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const {
        getBulkRunState, tabRegistry, normalizeRenewalMode, registerShadowTab, writeBulkRunState, mutateBulkRunState,
        logDiagnostic, sessionCorrelationContext, closeRegistryTabs, closeRegistryTab, createAutomationTab, delay,
        sendTabRequestWithBootstrap, correlationContext, getInventory, deriveListingDateFromEndDate, mergeListingMetadata, saveInventory
      } = options;
      const TAB_ROLES = options.tabRoles || {};
      const TAB_STATES = options.tabStates || {};
      const TabRegistry = options.tabRegistryApi || {};
      const RENEWAL_MODE_FAST = String(options.fastRenewalMode || 'fast');
      const PLATFORM_ACCESS_RESTRICTION_ERROR_CODE = String(options.platformAccessRestrictionErrorCode || 'KR_PLATFORM_ACCESS_RESTRICTED');
      const BULK_WORKER_TAB_CREATE_MAX_ATTEMPTS = Math.max(1, Number(options.bulkWorkerTabCreateMaxAttempts || 2));
      const BULK_WORKER_TAB_CREATE_RETRY_MS = Math.max(0, Number(options.bulkWorkerTabCreateRetryMs || 200));
      const READONLY_METADATA_TIMEOUT_MS = Math.max(1, Number(options.readOnlyMetadataTimeoutMs || 15000));
      const chrome = { tabs: options.chromeTabs || {} };
      const URL = options.URL || globalThis.URL;
      const setTimeout = options.setTimeout || globalThis.setTimeout;
      const required = { getBulkRunState, writeBulkRunState, mutateBulkRunState, logDiagnostic, closeRegistryTabs, closeRegistryTab, createAutomationTab, delay, sendTabRequestWithBootstrap, getInventory, deriveListingDateFromEndDate, mergeListingMetadata, saveInventory };
      for (const [name,value] of Object.entries(required)) if (typeof value !== 'function') throw new Error(`bulk worker service dependency ${name} is required`);
      function requireBulkSource(state, sender) {
        const tabId = sender?.tab?.id;
        if (!state || state.status !== 'running') throw new Error('Keine aktive Erfassung vorhanden.');
        if (!tabId || state.sourceTabId !== tabId) throw new Error('Die laufende Erfassung wurde in einem anderen „Meine Anzeigen“-Tab gestartet.');
        return tabId;
      }
async function bulkSourceWasAutoCreated(sourceTabId) {
  const entry = await tabRegistry.get(Number(sourceTabId || 0)).catch(() => null);
  return Boolean(entry?.kind === 'bulk-source-auto');
}


function scheduleAutoBulkSourceClose(state, reason = 'bulk-auto-source-terminal') {
  if (state?.sourceAutoCreated !== true || !Number(state?.sourceTabId || 0)) return;
  const sourceTabId = Number(state.sourceTabId);
  setTimeout(() => {
    void closeRegistryTab(sourceTabId, reason, '„Meine Anzeigen“-Hintergrundtab').catch(() => {});
  }, 250);
}


async function createBulkEditWorkerTabWithRetry(options, state, adId) {
  let lastError = null;
  for (let attempt = 1; attempt <= BULK_WORKER_TAB_CREATE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const tab = await createAutomationTab(options);
      if (tab?.id) {
        if (attempt > 1) {
          await logDiagnostic('info', 'BULK_WORKER_TAB_CREATE_RECOVERED', {
            runId: state?.runId || null, adId: String(adId || '') || null, attempt,
            maxAttempts: BULK_WORKER_TAB_CREATE_MAX_ATTEMPTS, tabId: tab.id
          }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state || {}, { adId: String(adId || ''), workerTabId: tab.id }) }).catch(() => {});
        }
        return tab;
      }
      lastError = new Error('chrome.tabs.create lieferte keinen Worker-Tab zurück.');
    } catch (error) {
      lastError = error;
      if (error?.code === PLATFORM_ACCESS_RESTRICTION_ERROR_CODE) throw error;
    }

    if (attempt < BULK_WORKER_TAB_CREATE_MAX_ATTEMPTS) {
      await logDiagnostic('info', 'BULK_WORKER_TAB_CREATE_RETRY', {
        runId: state?.runId || null, adId: String(adId || '') || null, attempt,
        nextAttempt: attempt + 1, maxAttempts: BULK_WORKER_TAB_CREATE_MAX_ATTEMPTS,
        retryDelayMs: BULK_WORKER_TAB_CREATE_RETRY_MS,
        error: String(lastError?.message || lastError || 'Unbekannter Tab-Erzeugungsfehler').slice(0, 500)
      }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state || {}, { adId: String(adId || '') }) }).catch(() => {});
      await delay(BULK_WORKER_TAB_CREATE_RETRY_MS);
    }
  }

  const failure = new Error('Worker-Tab konnte nicht geöffnet werden.');
  failure.code = 'KR_BULK_WORKER_TAB_CREATE_FAILED';
  failure.causeMessage = String(lastError?.message || lastError || 'Unbekannter Tab-Erzeugungsfehler').slice(0, 500);
  await logDiagnostic('warning', 'BULK_WORKER_TAB_CREATE_FAILED', {
    runId: state?.runId || null, adId: String(adId || '') || null,
    attempts: BULK_WORKER_TAB_CREATE_MAX_ATTEMPTS, error: failure.causeMessage
  }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state || {}, { adId: String(adId || '') }) }).catch(() => {});
  throw failure;
}


async function openBulkWorker(message, sender) {
  const state = await getBulkRunState();
  requireBulkSource(state, sender);
  if (!/^https:\/\/(www\.)?kleinanzeigen\.de\/p-anzeige-bearbeiten\.html\?/.test(String(message.url || ''))) {
    throw new Error('Ungültige Bearbeiten-URL für Worker-Tab.');
  }
  if (!/^\d+$/.test(String(message.adId || ''))) throw new Error('Worker-Anzeigen-ID ist ungültig.');
  await closeRegistryTabs([state.workerTabId, state.metadataTabId], 'bulk-worker-replaced', 'Inventarisierungs-Worker');
  const publicUrl = /^https:\/\/(www\.)?kleinanzeigen\.de\/s-anzeige\//i.test(String(message.publicUrl || '')) ? String(message.publicUrl) : '';
  const windowId = sender?.tab?.windowId;
  const verificationMode = normalizeRenewalMode(state.verificationMode);
  const skipReadOnlyMetadata = verificationMode === RENEWAL_MODE_FAST;
  const editPromise = createBulkEditWorkerTabWithRetry(
    { ...(windowId ? { windowId } : {}), url: String(message.url), active: false },
    state,
    message.adId
  );
  const metadataPromise = skipReadOnlyMetadata ? Promise.resolve(null) : (publicUrl ? createAutomationTab({ ...(windowId ? { windowId } : {}), url: publicUrl, active: false }) : Promise.resolve(null));
  const [editResult, metadataResult] = await Promise.allSettled([editPromise, metadataPromise]);
  const metadataTab = metadataResult.status === 'fulfilled' ? metadataResult.value : null;
  if (editResult.status !== 'fulfilled' || !editResult.value?.id) {
    if (metadataTab?.id) await closeRegistryTab(metadataTab.id, 'bulk-worker-create-failed', 'Inventarisierungs-Metadaten-Worker').catch(() => {});
    if (editResult.status === 'rejected' && editResult.reason) throw editResult.reason;
    throw new Error('Worker-Tab konnte nicht geöffnet werden.');
  }
  const tab = editResult.value;
  if (metadataResult.status === 'rejected') {
    await logDiagnostic('info', 'BULK_METADATA_TAB_CREATE_FAILED', {
      runId: state.runId, adId: String(message.adId),
      error: String(metadataResult.reason?.message || metadataResult.reason || 'Unbekannter Metadaten-Tab-Fehler').slice(0, 500)
    }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state, { adId: String(message.adId), workerTabId: tab.id }) }).catch(() => {});
  }
  await registerShadowTab(tab.id, TAB_ROLES.BULK_WORKER, { ...correlationContext(state), ownerType: 'bulk', ownerId: state.runId, adId: String(message.adId) });
  if (metadataTab?.id) await registerShadowTab(metadataTab.id, TAB_ROLES.BULK_WORKER, { ...correlationContext(state), ownerType: 'bulk-metadata', ownerId: state.runId, adId: String(message.adId) });
  state.workerTabId = tab.id;
  state.metadataTabId = metadataTab?.id || null;
  state.metadataOpenedAt = metadataTab?.id ? new Date().toISOString() : null;
  state.currentPublicUrl = publicUrl;
  state.currentReadOnlyMeta = null;
  state.currentAdId = String(message.adId);
  state.currentTitle = String(message.title || '').slice(0, 180);
  state.currentEndDateDisplay = String(message.endDateDisplay || '').slice(0, 10);
  state.currentEndDateIso = String(message.endDateIso || '').slice(0, 10);
  state.stage = 'worker-open';
  state.lastProgressAt = new Date().toISOString();
  state.currentItemStartedAt = state.currentItemStartedAt || state.lastProgressAt;
  await writeBulkRunState(state);
  await logDiagnostic('info', 'BULK_WORKERS_OPENED', {
    runId: state.runId, adId: state.currentAdId, workerTabId: tab.id, metadataTabId: metadataTab?.id || null,
    parallel: !skipReadOnlyMetadata, verificationMode, readOnlySkipped: skipReadOnlyMetadata, publicUrlAvailable: Boolean(publicUrl), endDateDisplay: state.currentEndDateDisplay || null
  }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state, { adId: state.currentAdId, workerTabId: tab.id, metadataTabId: metadataTab?.id || null }) }).catch(() => {});
  return { tabId: tab.id, metadataTabId: metadataTab?.id || null };
}


function classifyBulkEditWorkerNavigation(tab, expectedAdId) {
  const wanted = String(expectedAdId || '');
  if (!tab || !/^\d+$/.test(wanted)) return { state: 'waiting', reason: 'Worker-Navigation noch nicht auswertbar.' };
  const rawUrl = String(tab.url || '');
  if (!rawUrl || /^about:blank(?:$|[?#])/i.test(rawUrl) || tab.status !== 'complete') {
    return { state: 'waiting', reason: 'Bearbeiten-Worker wird noch geladen.' };
  }
  try {
    const url = new URL(rawUrl);
    const isKleinanzeigen = url.protocol === 'https:' && /^(?:www\.)?kleinanzeigen\.de$/i.test(url.hostname);
    const editAdId = url.pathname === '/p-anzeige-bearbeiten.html' ? String(url.searchParams.get('adId') || '') : '';
    if (isKleinanzeigen && editAdId === wanted) return { state: 'ready', finalUrl: rawUrl };
    if (isKleinanzeigen) {
      const publicAd = /^\/s-anzeige\//i.test(url.pathname);
      return {
        state: 'terminal',
        reason: publicAd
          ? `Bearbeiten-Worker wurde für Anzeige ${wanted} auf eine öffentliche, nicht bearbeitbare Anzeige umgeleitet.`
          : `Bearbeiten-Worker hat für Anzeige ${wanted} eine andere, nicht bearbeitbare Kleinanzeigen-Seite erreicht.`,
        navigationReason: publicAd ? 'redirected-to-public-ad' : (editAdId ? 'wrong-edit-ad-id' : 'unexpected-kleinanzeigen-page'),
        finalUrl: rawUrl
      };
    }
    return { state: 'terminal', reason: `Bearbeiten-Worker hat für Anzeige ${wanted} eine unerwartete Seite erreicht.`, navigationReason: 'unexpected-external-page', finalUrl: rawUrl };
  } catch {
    return { state: 'terminal', reason: `Bearbeiten-Worker hat für Anzeige ${wanted} eine ungültige Zieladresse erreicht.`, navigationReason: 'invalid-url', finalUrl: rawUrl };
  }
}


async function resolveBulkWorkerLifecycle(state, workerTabId, expectedAdId) {
  const id = Number(workerTabId || 0);
  const adId = String(expectedAdId || state?.currentAdId || '');
  if (!id) return { state: 'terminal', lifecycleCode: 'KR_TAB_GONE', reason: 'Bearbeiten-Worker ist nicht mehr vorhanden.' };

  const entry = await tabRegistry.get(id).catch(() => null);
  const owner = entry?.owner || {};
  const ownerRunId = String(owner.bulkRunId || owner.runId || '');
  const stateRunId = String(state?.bulkRunId || state?.runId || '');
  const ownerAdId = String(owner.adId || '');
  const belongsToRun = !ownerRunId || !stateRunId || ownerRunId === stateRunId;
  const belongsToAd = !ownerAdId || !adId || ownerAdId === adId;

  if (entry?.lifecycleState === TAB_STATES.GONE && belongsToRun && belongsToAd) {
    return {
      state: 'terminal',
      lifecycleCode: 'KR_TAB_GONE',
      reason: `Bearbeiten-Worker ${id} ist nicht mehr vorhanden.`,
      registryEntry: entry
    };
  }

  if (Number(state?.workerTabId || 0) !== id) {
    return { state: 'mismatch', reason: 'Dieser Tab gehört nicht zur aktiven Erfassung.', registryEntry: entry };
  }

  try {
    const tab = await tabRegistry.getTabOrThrow(id, chrome.tabs, {
      label: 'Bearbeiten-Worker',
      role: TAB_ROLES.BULK_WORKER,
      owner: sessionCorrelationContext(state, { adId })
    });
    return { state: 'active', tab, registryEntry: entry };
  } catch (error) {
    if (TabRegistry.isGoneError(error)) {
      return { state: 'terminal', lifecycleCode: 'KR_TAB_GONE', reason: String(error?.message || `Bearbeiten-Worker ${id} ist nicht mehr vorhanden.`), registryEntry: await tabRegistry.get(id).catch(() => entry) };
    }
    if (TabRegistry.isDiscardedError(error)) {
      return { state: 'waiting', lifecycleCode: 'KR_TAB_DISCARDED', reason: String(error?.message || `Bearbeiten-Worker ${id} wurde von Chrome verworfen.`), registryEntry: await tabRegistry.get(id).catch(() => entry) };
    }
    throw error;
  }
}


async function extractSaveBulkWorker(message, sender) {
  let state = await getBulkRunState();
  requireBulkSource(state, sender);
  state = await mutateBulkRunState(current => {
    if (!current || current.runId !== state.runId || current.status !== 'running') return current;
    current.lastProgressAt = new Date().toISOString();
    return current;
  });
  requireBulkSource(state, sender);
  const workerTabId = Number(message.workerTabId);
  const lifecycle = await resolveBulkWorkerLifecycle(state, workerTabId, message.expectedAdId);
  if (lifecycle.state === 'terminal') {
    await logDiagnostic('info', 'BULK_EDIT_WORKER_GONE', {
      runId: state?.runId || null, bulkRunId: state?.bulkRunId || state?.runId || null, adId: state?.currentAdId || message.expectedAdId || null,
      workerTabId: workerTabId || null, lifecycleCode: lifecycle.lifecycleCode || 'KR_TAB_GONE', message: lifecycle.reason
    }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state, { adId: state?.currentAdId || message.expectedAdId || null, workerTabId: workerTabId || null }) }).catch(() => {});
    return { state: 'terminal', reason: lifecycle.reason, lifecycleCode: lifecycle.lifecycleCode || 'KR_TAB_GONE' };
  }
  if (lifecycle.state === 'waiting') return { state: 'waiting', reason: lifecycle.reason, lifecycleCode: lifecycle.lifecycleCode || null };
  if (lifecycle.state === 'mismatch') throw new Error(lifecycle.reason);

  const workerTab = lifecycle.tab;
  const navigation = classifyBulkEditWorkerNavigation(workerTab, message.expectedAdId);
  if (navigation.state === 'terminal') {
    await logDiagnostic('warning', 'BULK_EDIT_WORKER_NOT_EDITABLE', {
      operationId: state.operationId || null, bulkRunId: state.bulkRunId || state.runId || null, runId: state.runId,
      adId: state.currentAdId, workerTabId, navigationReason: navigation.navigationReason || null,
      finalUrl: String(navigation.finalUrl || '').slice(0, 1200), message: navigation.reason
    }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state, { adId: state.currentAdId, workerTabId }) }).catch(() => {});
    return { state: 'terminal', reason: navigation.reason, navigationReason: navigation.navigationReason || null, finalUrl: navigation.finalUrl || null };
  }

  const editPromise = sendTabRequestWithBootstrap(workerTabId, { type: 'EXTRACT_CURRENT_AD' });
  const metadataPromise = state.currentReadOnlyMeta
    ? Promise.resolve(state.currentReadOnlyMeta)
    : state.metadataTabId
      ? sendTabRequestWithBootstrap(state.metadataTabId, { type: 'EXTRACT_READONLY_METADATA' })
      : Promise.resolve(null);
  const [editResult, metadataResult] = await Promise.allSettled([editPromise, metadataPromise]);

  if (metadataResult.status === 'fulfilled' && metadataResult.value && String(metadataResult.value.adId || '') === String(message.expectedAdId || '')) {
    state.currentReadOnlyMeta = metadataResult.value;
    await writeBulkRunState(state);
  }

  const metadataElapsed = state.metadataOpenedAt ? Date.now() - Date.parse(state.metadataOpenedAt) : READONLY_METADATA_TIMEOUT_MS;
  const metadataReady = Boolean(state.currentReadOnlyMeta) || !state.metadataTabId || metadataElapsed >= READONLY_METADATA_TIMEOUT_MS;
  if (!metadataReady) {
    const reason = metadataResult.status === 'rejected'
      ? String(metadataResult.reason?.message || metadataResult.reason || 'Read-only-Metadaten noch nicht bereit').slice(0, 240)
      : 'Read-only-Metadaten werden noch geladen.';
    return { state: 'waiting', reason };
  }

  if (editResult.status !== 'fulfilled') {
    return { state: 'waiting', reason: String(editResult.reason?.message || editResult.reason || 'Bearbeiten-Worker noch nicht bereit').slice(0, 240) };
  }
  const extracted = editResult.value;
  if (String(extracted?.adId || '') !== String(message.expectedAdId || '')) {
    return { state: 'waiting', reason: `Worker-Anzeige ${extracted?.adId || 'unbekannt'} entspricht noch nicht ${message.expectedAdId}.` };
  }

  if (state.metadataTabId && !state.currentReadOnlyMeta && metadataElapsed >= READONLY_METADATA_TIMEOUT_MS) {
    await logDiagnostic('warning', 'BULK_READONLY_METADATA_UNAVAILABLE', {
      runId: state.runId, adId: state.currentAdId, durationMs: metadataElapsed,
      message: metadataResult.status === 'rejected' ? String(metadataResult.reason?.message || metadataResult.reason).slice(0, 500) : 'Timeout',
      finalAtSave: true
    }, { module: 'background', operation: 'bulk-readonly', context: sessionCorrelationContext(state, { adId: state.currentAdId, metadataTabId: state.metadataTabId }) }).catch(() => {});
  }

  state.stage = 'saving-worker';
  state.lastProgressAt = new Date().toISOString();
  await writeBulkRunState(state);
  const readOnlyResult = state.currentReadOnlyMeta
    ? { ok: true, metadata: state.currentReadOnlyMeta }
    : { ok: false, metadata: null, error: 'Read-only-Metadaten nicht verfügbar.' };
  if (readOnlyResult.ok && state.currentEndDateDisplay && readOnlyResult.metadata?.endDateDisplay && state.currentEndDateDisplay !== readOnlyResult.metadata.endDateDisplay) {
    await logDiagnostic('warning', 'LISTING_END_DATE_SOURCE_MISMATCH', {
      runId: state.runId, adId: state.currentAdId, myAdsEndDate: state.currentEndDateDisplay, readOnlyEndDate: readOnlyResult.metadata.endDateDisplay
    }, { module: 'background', operation: 'bulk-readonly-merge', context: sessionCorrelationContext(state, { adId: state.currentAdId }) }).catch(() => {});
  }
  extracted.profileId = state.profileId || null;
  extracted.profileName = state.profileName || null;
  const existingInventoryRecord = await getInventory(state.currentAdId).catch(() => null);
  const derivedListingDate = normalizeRenewalMode(state.verificationMode) === RENEWAL_MODE_FAST
    ? deriveListingDateFromEndDate(state.currentEndDateIso, state.currentEndDateDisplay, 60)
    : null;
  extracted.listingMeta = mergeListingMetadata(extracted, existingInventoryRecord?.listingMeta || {}, readOnlyResult, {
    endDateDisplay: state.currentEndDateDisplay || null,
    endDateIso: state.currentEndDateIso || null,
    ...(derivedListingDate || {}),
    publicUrl: state.currentPublicUrl || null,
    source: derivedListingDate ? 'my-ads-card+edit+derived-listing-date' : 'my-ads-card+edit',
    readOnlyMetadataStatus: derivedListingDate ? 'skipped-fast-mode' : null
  });
  const saved = await saveInventory(extracted);
  await closeRegistryTabs([workerTabId, state.metadataTabId], 'bulk-worker-saved', 'Inventarisierungs-Worker');
  const latest = await getBulkRunState();
  if (latest?.runId === state.runId) {
    latest.workerTabId = null;
    latest.metadataTabId = null;
    latest.metadataOpenedAt = null;
    latest.currentPublicUrl = '';
    latest.currentReadOnlyMeta = null;
    latest.stage = 'worker-saved';
    await writeBulkRunState(latest);
  }
  await logDiagnostic('info', 'BULK_WORKER_SAVED', {
    runId: state.runId, adId: state.currentAdId, readOnlyMetadata: readOnlyResult.ok,
    listingDateDisplay: extracted.listingMeta?.listingDateDisplay || null,
    listingDateDerived: Boolean(extracted.listingMeta?.listingDateDerived),
    endDateDisplay: extracted.listingMeta?.endDateDisplay || null
  }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state, { adId: state.currentAdId }) }).catch(() => {});
  return { state: 'saved', inventoryId: saved.inventoryId, title: saved.title || '' };
}


function scheduleBulkSourceTabClose(tabId, reason = 'bulk-source-replaced') {
  const id = Number(tabId || 0);
  if (!id) return;
  setTimeout(() => {
    void closeRegistryTab(id, reason, '„Meine Anzeigen“-Hintergrundtab').catch(() => {});
  }, 250);
}


async function closeBulkWorker(message, sender) {
  const state = await getBulkRunState();
  requireBulkSource(state, sender);
  const workerTabId = Number(message.workerTabId);
  await closeRegistryTabs([workerTabId, state.metadataTabId], 'bulk-worker-closed', 'Inventarisierungs-Worker');
  if (state.workerTabId === workerTabId) state.workerTabId = null;
  state.metadataTabId = null;
  state.metadataOpenedAt = null;
  state.currentPublicUrl = '';
  state.currentReadOnlyMeta = null;
  return writeBulkRunState(state);
}


      return Object.freeze({bulkSourceWasAutoCreated, scheduleAutoBulkSourceClose, createBulkEditWorkerTabWithRetry, openBulkWorker, classifyBulkEditWorkerNavigation, resolveBulkWorkerLifecycle, extractSaveBulkWorker, scheduleBulkSourceTabClose, closeBulkWorker});
    }
  });
  globalThis.KRDeps?.register?.('KRBulkWorkerService', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
