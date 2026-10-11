(() => {
  if (globalThis.__KR_INVENTORY_STATUS_OVERLAY_V12318__) return;
  globalThis.__KR_INVENTORY_STATUS_OVERLAY_V12318__ = true;
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before KRInventoryStatusOverlay');

  function create(options = {}) {
    const {
      normalizeKey, runtimeMessage, isMyAdsUrl, scanListings
    } = options;

  function ensureFailureStyle() {
    if (document.getElementById('kr-inventory-failure-style')) return;
    const style = document.createElement('style');
    style.id = 'kr-inventory-failure-style';
    style.textContent = `
      [data-kr-inventory-failure="true"] {
        background-color: rgba(220, 38, 38, .10) !important;
        box-shadow: inset 0 0 0 2px rgba(220, 38, 38, .30) !important;
        border-radius: 12px !important;
      }
      .kr-inventory-retry-button {
        margin-left: 8px !important;
        padding: 6px 10px !important;
        border: 1px solid rgba(185, 28, 28, .55) !important;
        border-radius: 999px !important;
        background: rgba(255, 255, 255, .92) !important;
        color: #991b1b !important;
        font: 700 12px/1.2 system-ui, sans-serif !important;
        cursor: pointer !important;
      }
      .kr-inventory-retry-button:disabled { opacity: .55 !important; cursor: wait !important; }
    `;
    document.documentElement.append(style);
  }

  function clearFailureHighlights() {
    for (const node of document.querySelectorAll('[data-kr-inventory-failure="true"]')) node.removeAttribute('data-kr-inventory-failure');
    for (const button of document.querySelectorAll('.kr-inventory-retry-button')) button.remove();
  }

  function failureMapFromState(state) {
    return new Map((state?.failures || []).map(item => [String(item.adId || ''), item]).filter(([id]) => /^\d+$/.test(id)));
  }

  function attachRetryButton(listing, failure) {
    const root = listing.root;
    if (!root || root.querySelector?.(`.kr-inventory-retry-button[data-ad-id="${listing.adId}"]`)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'kr-inventory-retry-button';
    button.dataset.adId = listing.adId;
    button.textContent = 'Erfassung erneut versuchen';
    button.title = failure?.error ? `Letzter Fehler: ${failure.error}` : 'Diese Anzeige erneut inventarisieren';
    button.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      button.disabled = true;
      button.textContent = 'Retry läuft …';
      try {
        void runtimeMessage({ type: 'LOG_DIAGNOSTIC_EVENT', severity: 'info', event: 'USER_RETRY_FROM_MY_ADS_CLICK', module: 'inventory-runner', operation: 'user-action', details: { adId: listing.adId, title: listing.title } }).catch(() => {});
        const result = await runtimeMessage({ type: 'RETRY_BULK_FAILURE', adId: listing.adId, title: listing.title });
        await refreshFailureHighlights(result?.state || await runtimeMessage({ type: 'GET_BULK_RUN_FOR_SOURCE' }));
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Erneut versuchen';
        button.title = `Retry fehlgeschlagen: ${error.message}`;
        const state = await runtimeMessage({ type: 'GET_BULK_RUN_FOR_SOURCE' }).catch(() => null);
        await refreshFailureHighlights(state);
      }
    });
    const actionAnchor = [...root.querySelectorAll?.('button,a') || []].find(el => normalizeKey(el.textContent) === 'mehr')
      || [...root.querySelectorAll?.('button,a') || []].find(el => normalizeKey(el.textContent) === 'löschen')
      || root.lastElementChild;
    if (actionAnchor?.parentElement) actionAnchor.parentElement.append(button);
    else root.append(button);
  }

  async function refreshFailureHighlights(state = null) {
    if (!isMyAdsUrl()) return;
    ensureFailureStyle();
    state ||= await runtimeMessage({ type: 'GET_BULK_RUN_FOR_SOURCE' }).catch(() => null);
    const failures = failureMapFromState(state);
    if (!failures.size) {
      clearFailureHighlights();
      return;
    }
    for (const node of document.querySelectorAll('[data-kr-inventory-failure="true"]')) {
      const id = String(node.getAttribute('data-kr-inventory-failure-ad-id') || '');
      if (!failures.has(id)) {
        node.removeAttribute('data-kr-inventory-failure');
        node.removeAttribute('data-kr-inventory-failure-ad-id');
      }
    }
    for (const button of document.querySelectorAll('.kr-inventory-retry-button')) {
      if (!failures.has(String(button.dataset.adId || ''))) button.remove();
    }
    for (const listing of scanListings()) {
      const failure = failures.get(String(listing.adId));
      if (!failure || !listing.root) continue;
      listing.root.setAttribute('data-kr-inventory-failure', 'true');
      listing.root.setAttribute('data-kr-inventory-failure-ad-id', listing.adId);
      attachRetryButton(listing, failure);
    }
  }

  const KR_BULK_OVERLAY_DISMISSED_KEY = 'krBulkInventoryDismissedMessageV1';

  function bulkOverlayMessageKey(state, title = 'Erfassung läuft') {
    return [
      String(state?.runId || state?.bulkRunId || ''), String(title || ''), String(state?.status || ''), String(state?.stage || ''),
      Number(state?.successCount || 0), Number(state?.failedCount || 0), Number(state?.skippedExistingCount || 0), String(state?.currentAdId || ''),
      Number(state?.currentPage || 0), String(state?.currentTitle || '')
    ].join('|');
  }

  function dismissedOverlayMessageKey() {
    try { return String(sessionStorage.getItem(KR_BULK_OVERLAY_DISMISSED_KEY) || ''); } catch { return ''; }
  }

  function dismissOverlayMessage(messageKey) {
    try { sessionStorage.setItem(KR_BULK_OVERLAY_DISMISSED_KEY, String(messageKey || '')); } catch { /* best effort */ }
  }

  function ensureOverlay() {
    let panel = document.getElementById('kr-bulk-inventory-status');
    if (panel) return panel;
    panel = document.createElement('aside');
    panel.id = 'kr-bulk-inventory-status';
    panel.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483647;width:min(390px,calc(100vw - 36px));padding:14px 42px 14px 16px;border-radius:12px;background:#101417;color:#f3f5f5;box-shadow:0 12px 36px rgba(0,0,0,.35);font:13px/1.45 system-ui,sans-serif;border:1px solid #354044';
    document.documentElement.append(panel);
    return panel;
  }

  function renderOverlay(state, title = 'Erfassung läuft') {
    void refreshFailureHighlights(state);
    const panel = ensureOverlay();
    const messageKey = bulkOverlayMessageKey(state, title);
    panel.dataset.messageKey = messageKey;
    if (dismissedOverlayMessageKey() === messageKey) {
      panel.style.display = 'none';
      return;
    }
    panel.style.display = 'block';
    panel.replaceChildren();
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.setAttribute('aria-label', 'Rückmeldung ausblenden');
    dismiss.textContent = '×';
    dismiss.style.cssText = 'position:absolute;top:5px;right:7px;width:26px;height:26px;border:0;border-radius:50%;background:transparent;color:#a9c9c1;font:20px/1 system-ui,sans-serif;cursor:pointer';
    dismiss.addEventListener('click', () => {
      dismissOverlayMessage(messageKey);
      panel.style.display = 'none';
    });
    const strong = document.createElement('strong');
    strong.textContent = title;
    strong.style.cssText = 'display:block;margin-bottom:5px';
    const skippedExisting = Number(state?.skippedExistingCount || state?.skippedExistingIds?.length || 0);
    const processed = Array.isArray(state?.processedIds) ? state.processedIds.length : Number(state?.successCount || 0) + Number(state?.failedCount || 0) + skippedExisting;
    const total = Number(state?.expectedTotal || 0);
    const reconciliationActive = String(state?.stage || '').startsWith('reconciliation-') && String(state?.status || '') === 'running';
    const progress = document.createElement('div');
    progress.style.color = '#c4ced1';
    progress.textContent = reconciliationActive
      ? `Bestand erneut prüfen · ${Number(state?.reconciliationRosterIds?.length || 0)}/${total}`
      : (total ? `${processed}/${total} Anzeigen abgearbeitet` : `${processed} Anzeigen abgearbeitet`);
    panel.append(dismiss, strong, progress);
    if (!reconciliationActive && skippedExisting) {
      const skipped = document.createElement('div');
      skipped.style.color = '#93a0a5';
      skipped.textContent = `${skippedExisting} bereits im Inventar · übersprungen`;
      panel.append(skipped);
    }
    if (state?.currentPage) {
      const page = document.createElement('div');
      page.style.color = '#93a0a5';
      page.textContent = `Seite ${state.currentPage}${state.currentTitle ? ` · ${state.currentTitle}` : ''}`;
      panel.append(page);
    }
    if (state?.failedCount) {
      const warn = document.createElement('div');
      warn.style.cssText = 'margin-top:7px;color:#f2c96d';
      warn.textContent = `${state.failedCount} Anzeige(n) mit Fehlerstatus.`;
      panel.append(warn);
    }
  }

    return Object.freeze({
      refreshFailureHighlights, renderOverlay
    });
  }

  const API = Object.freeze({ create });
  KRDeps.register('KRInventoryStatusOverlay', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
