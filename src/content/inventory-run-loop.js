(() => {
  if (globalThis.__KR_INVENTORY_RUN_LOOP_V12318__) return;
  globalThis.__KR_INVENTORY_RUN_LOOP_V12318__ = true;
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before KRInventoryRunLoop');

  function create(options = {}) {
    const {
      RUN_POLL_MS, WORKER_TIMEOUT_MS, WORKER_REQUEST_TIMEOUT_MS, sleep, runtimeMessage, runtimeMessageWithTimeout, diagnostic, MyAdsReadiness, isMyAdsUrl, currentPageNumber, scanListings, nextPageButton, isDisabledControl, pageFingerprint, waitForPageChange, waitForListings, waitForMyAdsReady, validateFreshBulkSnapshot, readinessError, renderOverlay, refreshFailureHighlights
    } = options;
    let loopRunning = false;

  async function processListing(runState, listing) {
    const claimedState = await runtimeMessage({
      type: 'BULK_RUN_UPDATE',
      patch: {
        stage: 'opening-worker',
        currentAdId: listing.adId,
        currentTitle: listing.title,
        currentThumbnailUrl: listing.thumbnailUrl || '',
        currentPage: currentPageNumber()
      }
    });
    if (claimedState?.stopBeforeNext === true || (claimedState?.stopAfterCurrentRequested === true && !claimedState?.currentAdId)) return false;
    renderOverlay({ ...runState, currentTitle: listing.title, currentPage: currentPageNumber() });

    let workerTabId = null;
    try {
      const worker = await runtimeMessage({
        type: 'BULK_OPEN_WORKER', adId: listing.adId, url: listing.editUrl, publicUrl: listing.publicUrl || '', title: listing.title,
        endDateDisplay: listing.endDateDisplay || '', endDateIso: listing.endDateIso || ''
      });
      workerTabId = worker.tabId;
      const deadline = Date.now() + WORKER_TIMEOUT_MS;
      let lastReason = '';
      while (Date.now() < deadline) {
        const remainingMs = Math.max(1, deadline - Date.now());
        let result = null;
        try {
          result = await runtimeMessageWithTimeout(
            { type: 'BULK_EXTRACT_SAVE_WORKER', workerTabId, expectedAdId: listing.adId },
            Math.min(WORKER_REQUEST_TIMEOUT_MS, remainingMs),
            'Bearbeiten-Worker'
          );
        } catch (error) {
          if (error?.code !== 'KR_BULK_WORKER_REQUEST_TIMEOUT') throw error;
          lastReason = error.message;
          diagnostic('BULK_WORKER_REQUEST_TIMEOUT', { adId: listing.adId, workerTabId, remainingMs: Math.max(0, deadline - Date.now()) }, 'warning', { adId: listing.adId, workerTabId });
          if (Date.now() >= deadline) break;
          await sleep(Math.min(RUN_POLL_MS, Math.max(1, deadline - Date.now())));
          continue;
        }
        if (result?.state === 'saved') {
          await runtimeMessage({ type: 'BULK_RECORD_RESULT', adId: listing.adId, ok: true, title: result.title || listing.title, publicUrl: listing.publicUrl || '', endDateDisplay: listing.endDateDisplay || '', endDateIso: listing.endDateIso || '' });
          return true;
        }
        if (result?.state === 'terminal') {
          throw new Error(result.reason || 'Bearbeiten-Worker hat eine nicht bearbeitbare Seite erreicht.');
        }
        lastReason = result?.reason || lastReason;
        await sleep(RUN_POLL_MS);
      }
      throw new Error(lastReason || 'Worker-Tab wurde nicht rechtzeitig inventarisiert.');
    } catch (error) {
      if (workerTabId) await runtimeMessage({ type: 'BULK_CLOSE_WORKER', workerTabId }).catch(() => {});
      await runtimeMessage({ type: 'BULK_RECORD_RESULT', adId: listing.adId, ok: false, title: listing.title, publicUrl: listing.publicUrl || '', error: error.message, endDateDisplay: listing.endDateDisplay || '', endDateIso: listing.endDateIso || '' });
      return true;
    }
  }

  async function runReconciliationLoop(initialState = null, readySnapshot = null) {
    let state = initialState || await runtimeMessage({ type: 'GET_BULK_RUN_FOR_SOURCE' });
    if (!state || state.status !== 'running' || !String(state.stage || '').startsWith('reconciliation-')) return;

    if (String(state.stage || '') === 'reconciliation-preparing') return;

    if (String(state.stage || '') === 'reconciliation-ready') {
      const snapshot = readySnapshot || await waitForMyAdsReady({
        expectedProfileName: state.profileName || '',
        expectedOnline: Number(state.expectedTotal || 0)
      });
      const evaluation = MyAdsReadiness?.evaluateMyAdsReadiness?.(snapshot, {
        expectedProfileName: state.profileName || '',
        expectedOnline: Number(state.expectedTotal || 0)
      });
      if (evaluation?.state !== 'ready') throw readinessError(evaluation, 'Die zweite Bestandsprüfung ist noch nicht fachlich bereit.');
      state = await runtimeMessage({
        type: 'BULK_BEGIN_RECONCILIATION', currentPage: 1, onlineCount: evaluation.onlineCount, profileName: evaluation.profileName
      });
      renderOverlay(state, 'Bestand erneut prüfen');
    }

    while (state?.status === 'running' && String(state?.stage || '').startsWith('reconciliation-') && isMyAdsUrl()) {
      const page = currentPageNumber();
      const expected = Number(state.expectedTotal || 0);
      if (expected === 0) {
        state = await runtimeMessage({ type: 'BULK_FINISH_RECONCILIATION', lastPage: page });
        renderOverlay(state, state.status === 'complete' ? 'Bestand bestätigt' : 'Abweichung – Prüfung nötig');
        return;
      }
      const listings = await waitForListings();
      if (!listings.length) throw new Error(`Beim unabhängigen Bestandsabgleich wurden auf Seite ${page} keine Anzeigenkarten erkannt.`);
      state = await runtimeMessage({ type: 'BULK_RECORD_RECONCILIATION_PAGE', page, ids: listings.map(item => item.adId) });
      renderOverlay(state, 'Bestand erneut prüfen');
      const next = nextPageButton();
      if (!next || isDisabledControl(next)) {
        state = await runtimeMessage({ type: 'BULK_FINISH_RECONCILIATION', lastPage: page });
        renderOverlay(state, state.status === 'complete' ? 'Bestand bestätigt' : 'Abweichung – Prüfung nötig');
        return;
      }
      const beforePage = page;
      const beforeFingerprint = pageFingerprint();
      await sleep(150);
      next.click();
      const changed = await waitForPageChange(beforePage, beforeFingerprint);
      if (!changed) throw new Error(`Unabhängiger Bestandsabgleich: Seitenwechsel nach Seite ${beforePage} wurde nicht bestätigt.`);
      state = await runtimeMessage({ type: 'GET_BULK_RUN_FOR_SOURCE' });
    }
  }

  async function runLoop(initialState = null, reconciliationReadySnapshot = null) {
    if (loopRunning || !isMyAdsUrl()) return;
    loopRunning = true;
    try {
      let state = initialState || await runtimeMessage({ type: 'GET_BULK_RUN_FOR_SOURCE' });
      if (!state || state.status !== 'running') return;
      if (String(state.stage || '').startsWith('reconciliation-')) {
        await runReconciliationLoop(state, reconciliationReadySnapshot);
        return;
      }
      renderOverlay(state);

      const finishControlledStop = async current => {
        const stopped = await runtimeMessage({ type: 'BULK_FINISH_CONTROLLED_STOP', lastPage: currentPageNumber() });
        renderOverlay(stopped, 'Erfassung vorzeitig beendet');
        return stopped;
      };

      while (state?.status === 'running' && isMyAdsUrl()) {
        const page = currentPageNumber();
        if (state.stopAfterCurrentRequested === true && !state.currentAdId && !state.workerTabId) {
          await finishControlledStop(state);
          return;
        }
        if (Number(state.expectedTotal || 0) === 0) {
          state = await runtimeMessage({ type: 'BULK_FINISH_RUN', lastPage: page });
          if (state?.status === 'running' && String(state?.stage || '').startsWith('reconciliation-')) {
            renderOverlay(state, 'Bestand erneut prüfen');
            return;
          }
          renderOverlay(state, 'Erfassung abgeschlossen');
          return;
        }
        const listings = await waitForListings();
        if (!listings.length) {
          await runtimeMessage({ type: 'BULK_RUN_UPDATE', patch: { stage: 'page-empty', currentPage: page } });
          throw new Error(`Auf Seite ${page} wurden keine Bearbeiten-Aktionen erkannt.`);
        }
        state = await runtimeMessage({ type: 'BULK_RECORD_ROSTER_PAGE', page, ids: listings.map(item => item.adId) });
        state = await runtimeMessage({ type: 'BULK_RUN_UPDATE', patch: { stage: 'scanning-page', currentPage: page, pageFingerprint: listings.map(item => item.adId).join(',') } });
        const processed = new Set(state.processedIds || []);
        for (const listing of listings) {
          if (processed.has(listing.adId)) continue;
          if (state.stopAfterCurrentRequested === true && !state.currentAdId && !state.workerTabId) {
            await finishControlledStop(state);
            return;
          }
          const skipExisting = String(state.inventoryScope || '') === 'new-only'
            && Array.isArray(state.existingInventoryIds)
            && state.existingInventoryIds.map(String).includes(String(listing.adId));
          if (skipExisting) {
            state = await runtimeMessage({ type: 'BULK_RECORD_EXISTING_SKIP', adId: listing.adId, title: listing.title });
            processed.add(listing.adId);
            renderOverlay(state, 'Bereits im Inventar – übersprungen');
            continue;
          }
          const processedCurrent = await processListing(state, listing);
          state = await runtimeMessage({ type: 'GET_BULK_RUN_FOR_SOURCE' });
          if (!state || state.status !== 'running') return;
          if (processedCurrent) processed.add(listing.adId);
          renderOverlay(state);
          if (state.stopAfterCurrentRequested === true) {
            await finishControlledStop(state);
            return;
          }
        }

        if (state.stopAfterCurrentRequested === true) {
          await finishControlledStop(state);
          return;
        }
        const next = nextPageButton();
        if (!next || isDisabledControl(next)) {
          state = await runtimeMessage({ type: 'BULK_FINISH_RUN', lastPage: page });
          if (state?.status === 'running' && String(state?.stage || '').startsWith('reconciliation-')) {
            renderOverlay(state, 'Bestand erneut prüfen');
            return;
          }
          renderOverlay(state, state.status === 'complete' ? 'Erfassung abgeschlossen' : state.status === 'complete-with-errors' ? 'Erfassung abgeschlossen – einige Anzeigen konnten nicht verarbeitet werden' : 'Erfassung abgeschlossen – Prüfung nötig');
          return;
        }

        const beforePage = page;
        const beforeFingerprint = pageFingerprint();
        await runtimeMessage({ type: 'BULK_RUN_UPDATE', patch: { stage: 'paging', currentPage: page, currentTitle: '' } });
        await sleep(150);
        next.click();
        const changed = await waitForPageChange(beforePage, beforeFingerprint);
        if (!changed) {
          // A full navigation destroys this execution context. If we are still alive
          // here, no new page state became visible and the run needs review.
          throw new Error(`Seitenwechsel nach Seite ${beforePage} wurde nicht bestätigt.`);
        }
        state = await runtimeMessage({ type: 'GET_BULK_RUN_FOR_SOURCE' });
      }
    } catch (error) {
      const state = await runtimeMessage({ type: 'BULK_FAIL_RUN', error: error.message, currentPage: currentPageNumber() }).catch(() => null);
      if (state) renderOverlay(state, 'Erfassung unterbrochen');
    } finally {
      loopRunning = false;
    }
  }

  async function startBulkInventoryFromFreshSource(expectedProfileName = '', operationId = '', verificationMode = 'safe', inventoryScope = 'new-only') {
    const ready = await waitForMyAdsReady({ expectedProfileName });
    const listings = scanListings();
    const snapshot = validateFreshBulkSnapshot({
      expectedTotal: ready.expectedOnline,
      listings,
      hasNextPage: ready.hasNext === true,
      detectedProfile: ready.profileName,
      expectedProfile: expectedProfileName
    });
    const state = await runtimeMessage({
      type: 'BULK_INIT_RUN',
      sourceFresh: true,
      operationId,
      expectedTotal: snapshot.expectedTotal,
      sourceUrl: location.href,
      currentPage: 1,
      pageFingerprint: listings.map(item => item.adId).join(','),
      snapshotCount: snapshot.listingCount,
      hasNextPage: snapshot.hasNextPage,
      profileName: ready.profileName,
      sourceReadinessObservedAt: ready.observedAt || null,
      sourceReadinessWaitMs: Number(ready.readinessWaitMs || 0),
      verificationMode: verificationMode === 'fast' ? 'fast' : 'safe',
      inventoryScope: inventoryScope === 'all' ? 'all' : 'new-only'
    });
    renderOverlay(state);
    void runLoop(state);
    return state;
  }

  async function autoResume() {
    if (!isMyAdsUrl()) return;
    const state = await runtimeMessage({ type: 'GET_BULK_RUN_FOR_SOURCE' }).catch(() => null);
    await refreshFailureHighlights(state);
    if (state?.status === 'running') {
      renderOverlay(state, 'Erfassung wird fortgesetzt');
      await sleep(250);
      void runLoop(state);
    } else if (state?.failures?.length) {
      renderOverlay(state, 'Erfassung abgeschlossen – einige Anzeigen konnten nicht verarbeitet werden');
    }
  }

    return Object.freeze({
      runLoop, startBulkInventoryFromFreshSource, autoResume
    });
  }

  const API = Object.freeze({ create });
  KRDeps.register('KRInventoryRunLoop', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
