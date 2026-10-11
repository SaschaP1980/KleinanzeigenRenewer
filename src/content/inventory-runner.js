(() => {
  if (globalThis.__KR_INVENTORY_RUNNER_V160__ === 'ready') return;
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before inventory-runner.js');
  const MessageContractRegistry = KRDeps.require('KRMessageContractRegistry');
  const InventoryRosterParser = KRDeps.require('KRInventoryRosterParser');
  const InventoryReadiness = KRDeps.require('KRInventoryReadiness');
  const InventoryStatusOverlay = KRDeps.require('KRInventoryStatusOverlay');
  const InventoryDeleteOperations = KRDeps.require('KRInventoryDeleteOperations');
  const InventoryRunLoop = KRDeps.require('KRInventoryRunLoop');
  globalThis.__KR_INVENTORY_RUNNER_V160__ = 'ready';

  const MY_ADS_PATH = '/m-meine-anzeigen.html';
  const MAX_PHASE4_PAGES = 100;
  const RUN_POLL_MS = 500;
  const WORKER_TIMEOUT_MS = 90000;
  const WORKER_REQUEST_TIMEOUT_MS = 15000;
  const PAGE_CHANGE_TIMEOUT_MS = 20000;
  const MyAdsReadiness = KRDeps?.optional('KRMyAdsReadiness') || null;
  const MY_ADS_READY_TIMEOUT_MS = Number(MyAdsReadiness?.DEFAULT_TIMEOUT_MS || 12000);
  const MY_ADS_ZERO_STABILITY_MS = Number(MyAdsReadiness?.ZERO_STABILITY_MS || 650);
  const MY_ADS_SAFETY_RECHECK_MS = Number(MyAdsReadiness?.SAFETY_RECHECK_MS || 1000);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  const normalizeKey = value => normalize(value).toLocaleLowerCase('de-DE');

  function diagnostic(event, details = {}, severity = 'info', context = {}) {
    try {
      chrome.runtime.sendMessage({ type: 'LOG_DIAGNOSTIC_EVENT', severity, event, module: 'inventory-runner', operation: 'phase4-own-ads', context, details }, () => void chrome.runtime.lastError);
    } catch { /* Diagnose darf den Seitenablauf niemals beeinflussen. */ }
  }

  function runtimeMessage(message) {
    if (globalThis.__KR_PLATFORM_SAFETY_STOP__ || globalThis.__KR_PLATFORM_ACCESS_RESTRICTED__) {
      const error = new Error('Kleinanzeigen hat den Zugriff vorübergehend eingeschränkt. Weitere automatisierte Aktionen wurden gestoppt.');
      error.code = 'KR_PLATFORM_ACCESS_RESTRICTED';
      return Promise.reject(error);
    }
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        if (!response?.ok) return reject(new Error(response?.error || 'Unbekannter Fehler'));
        resolve(response.result);
      });
    });
  }

  function runtimeMessageWithTimeout(message, timeoutMs, label = 'Erweiterungsanfrage') {
    const limit = Math.max(1, Number(timeoutMs || 0));
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        const error = new Error(`${label} hat das Zeitlimit überschritten.`);
        error.code = 'KR_BULK_WORKER_REQUEST_TIMEOUT';
        reject(error);
      }, limit);
      runtimeMessage(message).then(
        result => { if (!settled) { settled = true; clearTimeout(timer); resolve(result); } },
        error => { if (!settled) { settled = true; clearTimeout(timer); reject(error); } }
      );
    });
  }

  const roster = InventoryRosterParser.create({ MY_ADS_PATH, PAGE_CHANGE_TIMEOUT_MS, normalize, normalizeKey, sleep });
  const readiness = InventoryReadiness.create({
    MyAdsReadiness, MY_ADS_READY_TIMEOUT_MS, MY_ADS_ZERO_STABILITY_MS, MY_ADS_SAFETY_RECHECK_MS, normalize, normalizeKey,
    parseOnlineCount: roster.parseOnlineCount, scanListings: roster.scanListings, isMyAdsUrl: roster.isMyAdsUrl,
    isMyAdsProjectsUrl: roster.isMyAdsProjectsUrl, currentPageNumber: roster.currentPageNumber,
    isDisabledControl: roster.isDisabledControl, nextPageButton: roster.nextPageButton, detectedProfileName: roster.detectedProfileName
  });
  const overlay = InventoryStatusOverlay.create({ normalizeKey, runtimeMessage, isMyAdsUrl: roster.isMyAdsUrl, scanListings: roster.scanListings });
  const deleteOperations = InventoryDeleteOperations.create({
    MAX_PHASE4_PAGES, sleep, normalize, normalizeKey, diagnostic, isMyAdsProjectsUrl: roster.isMyAdsProjectsUrl,
    scanListings: roster.scanListings, currentPageNumber: roster.currentPageNumber, pageFingerprint: roster.pageFingerprint,
    nextPageButton: roster.nextPageButton, isDisabledControl: roster.isDisabledControl, waitForPageChange: roster.waitForPageChange,
    waitForListings: roster.waitForListings, parseOnlineCount: roster.parseOnlineCount, detectedProfileName: roster.detectedProfileName
  });
  const runLoop = InventoryRunLoop.create({
    RUN_POLL_MS, WORKER_TIMEOUT_MS, WORKER_REQUEST_TIMEOUT_MS, sleep, runtimeMessage, runtimeMessageWithTimeout, diagnostic, MyAdsReadiness,
    isMyAdsUrl: roster.isMyAdsUrl, currentPageNumber: roster.currentPageNumber, scanListings: roster.scanListings,
    nextPageButton: roster.nextPageButton, isDisabledControl: roster.isDisabledControl, pageFingerprint: roster.pageFingerprint,
    waitForPageChange: roster.waitForPageChange, waitForListings: roster.waitForListings,
    waitForMyAdsReady: readiness.waitForMyAdsReady, validateFreshBulkSnapshot: readiness.validateFreshBulkSnapshot,
    readinessError: readiness.readinessError, renderOverlay: overlay.renderOverlay, refreshFailureHighlights: overlay.refreshFailureHighlights
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const messageContract = MessageContractRegistry.route(message?.type, 'my-ads-content');
    if (messageContract.action === 'ignore') return;
    if (messageContract.action === 'reject') {
      const error = MessageContractRegistry.errorFor(messageContract);
      diagnostic('MESSAGE_CONTRACT_REJECTED', { requestType: message?.type || null, target: 'my-ads-content', errorCode: error.code, registered: messageContract.registered, targets: messageContract.targets }, 'warning');
      sendResponse({ ok: false, error: error.message, errorCode: error.code });
      return;
    }
    if (message?.type === 'START_BULK_INVENTORY_FROM_FRESH_SOURCE') {
      runLoop.startBulkInventoryFromFreshSource(message.expectedProfileName || '', message.operationId || '', message.verificationMode || 'safe', message.inventoryScope || 'new-only').then(
        result => sendResponse({ ok: true, result }), error => sendResponse({ ok: false, error: error.message })
      );
      return true;
    }
    if (message?.type === 'START_BULK_RECONCILIATION_SCAN') {
      runtimeMessage({ type: 'GET_BULK_RUN_FOR_SOURCE' }).then(state => {
        if (!state || state.status !== 'running' || String(state.stage || '') !== 'reconciliation-ready') throw new Error('Die zweite Bestandsprüfung ist in diesem Tab nicht startbereit.');
        if (message.runId && String(message.runId) !== String(state.runId || '')) throw new Error('Die zweite Bestandsprüfung gehört zu einer anderen Erfassung.');
        void runLoop.runLoop(state, message.readySnapshot || null);
        sendResponse({ ok: true, result: { started: true, runId: state.runId, sourceTabId: state.sourceTabId } });
      }).catch(error => sendResponse({ ok: false, error: error.message, errorCode: error.code || null }));
      return true;
    }
    if (message?.type === 'WAIT_FOR_MY_ADS_READY') {
      readiness.waitForMyAdsReady({ expectedProfileName: message.expectedProfileName || '', expectedOnline: message.expectedOnline ?? null, timeoutMs: message.timeoutMs || MY_ADS_READY_TIMEOUT_MS }).then(
        result => sendResponse({ ok: true, result }), error => sendResponse({ ok: false, error: error.message, errorCode: error.code || null, errorDetails: error.details || null, errorReasonCode: error.reasonCode || null })
      );
      return true;
    }
    if (message?.type === 'DELETE_OWN_AD_BY_ID') {
      deleteOperations.deleteOwnAdById(message.adId, message.correlation || {}).then(result => sendResponse({ ok: true, result }), error => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message?.type === 'FIND_OWN_AD_BY_ID') {
      deleteOperations.findOwnAdById(message.adId, message.correlation || {}).then(result => sendResponse({ ok: true, result }), error => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message?.type === 'VERIFY_OWN_AD_ABSENT_BY_ID') {
      deleteOperations.verifyOwnAdAbsentById(message.adId, message.correlation || {}).then(result => sendResponse({ ok: true, result }), error => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message?.type === 'MY_ADS_STATUS') {
      if (message?.fullRoster === true) {
        deleteOperations.snapshotOwnAdRoster(message.correlation || {}).then(result => sendResponse({ ok: true, result }), error => sendResponse({ ok: false, error: error.message, errorCode: error.code || null }));
        return true;
      }
      sendResponse({ ok: true, result: readiness.currentMyAdsStatusSnapshot() });
    }
  });

  let failureRefreshTimer = null;
  const FailureObserver = globalThis.MutationObserver;
  const failureObserver = typeof FailureObserver === 'function' ? new FailureObserver(() => {
    if (!roster.isMyAdsUrl() || failureRefreshTimer) return;
    failureRefreshTimer = setTimeout(() => {
      failureRefreshTimer = null;
      void overlay.refreshFailureHighlights();
    }, 300);
  }) : null;
  if (failureObserver && document.documentElement) failureObserver.observe(document.documentElement, { childList: true, subtree: true });
  globalThis.addEventListener?.('pagehide', () => {
    if (failureRefreshTimer) clearTimeout(failureRefreshTimer);
    failureObserver?.disconnect();
  }, { once: true });

  chrome.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes.bulkInventoryRun || !roster.isMyAdsUrl()) return;
    void overlay.refreshFailureHighlights(changes.bulkInventoryRun.newValue || null);
  });

  const API = Object.freeze({
    MY_ADS_PATH,
    isMyAdsUrl: roster.isMyAdsUrl,
    isMyAdsProjectsUrl: roster.isMyAdsProjectsUrl,
    parseOnlineCount: roster.parseOnlineCount,
    currentMyAdsStatusSnapshot: readiness.currentMyAdsStatusSnapshot,
    waitForMyAdsReady: readiness.waitForMyAdsReady,
    adIdFromHref: roster.adIdFromHref,
    editUrlForAdId: roster.editUrlForAdId,
    detectedProfileName: roster.detectedProfileName,
    publicUrlFromRoot: roster.publicUrlFromRoot,
    currentPageNumber: roster.currentPageNumber,
    endDateFromRoot: roster.endDateFromRoot,
    scanListings: roster.scanListings,
    snapshotOwnAdRoster: deleteOperations.snapshotOwnAdRoster,
    validateFreshBulkSnapshot: readiness.validateFreshBulkSnapshot,
    refreshFailureHighlights: overlay.refreshFailureHighlights,
    deleteOwnAdById: deleteOperations.deleteOwnAdById,
    findOwnAdById: deleteOperations.findOwnAdById,
    verifyOwnAdAbsentById: deleteOperations.verifyOwnAdAbsentById,
    runLoop: runLoop.runLoop,
    autoResume: runLoop.autoResume
  });
  globalThis.KRDeps?.register?.('KRInventoryRun', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;

  if (!globalThis.__KR_PLATFORM_ACCESS_RESTRICTED__ && !globalThis.__KR_PLATFORM_SAFETY_STOP__) {
    chrome.runtime.sendMessage({ type: 'GET_PLATFORM_ACCESS_RESTRICTION' }, response => {
      if (chrome.runtime.lastError || response?.ok !== true) return;
      if (response?.result?.active) {
        globalThis.__KR_PLATFORM_SAFETY_STOP__ = true;
        return;
      }
      void runLoop.autoResume();
    });
  }
})();
