(() => {
  if (globalThis.__KR_INVENTORY_READINESS_V12318__) return;
  globalThis.__KR_INVENTORY_READINESS_V12318__ = true;
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before KRInventoryReadiness');

  function create(options = {}) {
    const {
      MyAdsReadiness, MY_ADS_READY_TIMEOUT_MS, MY_ADS_ZERO_STABILITY_MS, MY_ADS_SAFETY_RECHECK_MS, normalize, normalizeKey, parseOnlineCount, scanListings, isMyAdsUrl, isMyAdsProjectsUrl, currentPageNumber, isDisabledControl, nextPageButton, detectedProfileName
    } = options;

  function currentMyAdsStatusSnapshot() {
    const parsed = parseOnlineCount(document.body?.innerText || '');
    const listings = scanListings();
    return {
      isMyAdsPage: isMyAdsUrl(),
      isProjectsTab: isMyAdsProjectsUrl(),
      expectedOnline: parsed?.online ?? null,
      totalAccountAds: parsed?.total ?? null,
      currentPage: currentPageNumber(),
      listingCount: listings.length,
      listingIds: listings.map(item => String(item.adId || '')).filter(Boolean),
      pageFingerprint: listings.map(item => String(item.adId || '')).filter(Boolean).sort().join(','),
      hasNext: !isDisabledControl(nextPageButton()),
      profileName: detectedProfileName(document),
      observedAt: new Date().toISOString()
    };
  }

  function readinessError(evaluation, prefix = '„Meine Anzeigen“ ist nicht startbereit.', snapshot = null, requiredOnline = null) {
    const error = new Error(evaluation?.reason || prefix);
    error.code = evaluation?.state === 'invalid' ? 'KR_MY_ADS_INVALID' : 'KR_MY_ADS_NOT_READY';
    error.reasonCode = evaluation?.reasonCode || null;
    const listingIds = Array.isArray(snapshot?.listingIds)
      ? [...new Set(snapshot.listingIds.map(value => String(value || '')).filter(value => /^\d+$/.test(value)))]
      : [];
    error.details = {
      reasonCode: error.reasonCode,
      expectedOnline: Number.isInteger(snapshot?.expectedOnline) ? snapshot.expectedOnline : null,
      requiredOnline: Number.isInteger(Number(requiredOnline)) && requiredOnline !== null && requiredOnline !== '' ? Number(requiredOnline) : null,
      listingCount: Number.isInteger(snapshot?.listingCount) ? snapshot.listingCount : null,
      listingIds,
      pageFingerprint: String(snapshot?.pageFingerprint || ''),
      hasNext: snapshot?.hasNext === true,
      currentPage: Number.isInteger(snapshot?.currentPage) ? snapshot.currentPage : null,
      profileName: String(snapshot?.profileName || ''),
      observedAt: snapshot?.observedAt || null,
      missingListingIds: null,
      missingIdsKnown: false
    };
    return error;
  }

  async function waitForMyAdsReady({ expectedProfileName = '', expectedOnline = null, timeoutMs = MY_ADS_READY_TIMEOUT_MS } = {}) {
    if (!MyAdsReadiness?.evaluateMyAdsReadiness) throw new Error('Die fachliche „Meine Anzeigen“-Readiness ist nicht verfügbar.');
    const started = Date.now();
    const deadline = started + Math.max(1000, Number(timeoutMs || MY_ADS_READY_TIMEOUT_MS));
    let zeroReadySince = null;
    let lastSnapshot = null;
    let lastEvaluation = null;
    let settled = false;
    let checkQueued = false;
    let zeroTimer = null;
    let safetyTimer = null;
    let deadlineTimer = null;
    let observer = null;

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        observer?.disconnect?.();
        if (zeroTimer) clearTimeout(zeroTimer);
        if (safetyTimer) clearInterval(safetyTimer);
        if (deadlineTimer) clearTimeout(deadlineTimer);
      };
      const finishResolve = snapshot => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({ ...snapshot, readinessWaitMs: Date.now() - started });
      };
      const finishReject = error => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };
      const scheduleCheck = () => {
        if (settled || checkQueued) return;
        checkQueued = true;
        queueMicrotask(() => { checkQueued = false; check(); });
      };
      const check = () => {
        if (settled) return;
        if (globalThis.__KR_PLATFORM_SAFETY_STOP__ || globalThis.__KR_PLATFORM_ACCESS_RESTRICTED__) {
          const error = new Error('Kleinanzeigen hat den Zugriff vorübergehend eingeschränkt. Weitere automatisierte Aktionen wurden gestoppt.');
          error.code = 'KR_PLATFORM_ACCESS_RESTRICTED';
          finishReject(error);
          return;
        }
        lastSnapshot = currentMyAdsStatusSnapshot();
        lastEvaluation = MyAdsReadiness.evaluateMyAdsReadiness(lastSnapshot, { expectedProfileName, expectedOnline });
        if (lastEvaluation.state === 'invalid') {
          finishReject(readinessError(lastEvaluation, undefined, lastSnapshot, expectedOnline));
          return;
        }
        if (lastEvaluation.state === 'ready') {
          if (Number(lastSnapshot.expectedOnline) === 0) {
            if (zeroReadySince === null) zeroReadySince = Date.now();
            const remaining = MY_ADS_ZERO_STABILITY_MS - (Date.now() - zeroReadySince);
            if (remaining > 0) {
              if (zeroTimer) clearTimeout(zeroTimer);
              zeroTimer = setTimeout(scheduleCheck, remaining);
              return;
            }
          }
          finishResolve(lastSnapshot);
          return;
        }
        zeroReadySince = null;
        if (Date.now() >= deadline) {
          const error = readinessError(lastEvaluation, '„Meine Anzeigen“ wurde nicht rechtzeitig fachlich bereit.', lastSnapshot, expectedOnline);
          error.code = ['single-page-incomplete', 'listing-count-ahead', 'zero-not-empty'].includes(String(lastEvaluation?.reasonCode || ''))
            ? 'KR_MY_ADS_INCONSISTENT'
            : 'KR_MY_ADS_READINESS_TIMEOUT';
          finishReject(error);
        }
      };

      const Observer = globalThis.MutationObserver;
      if (typeof Observer === 'function' && document.documentElement) {
        observer = new Observer(scheduleCheck);
        observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-disabled', 'disabled', 'href', 'data-adid'] });
      }
      safetyTimer = setInterval(scheduleCheck, MY_ADS_SAFETY_RECHECK_MS);
      deadlineTimer = setTimeout(scheduleCheck, Math.max(1, deadline - Date.now()));
      check();
    });
  }
  function validateFreshBulkSnapshot({ expectedTotal, listings, hasNextPage, detectedProfile, expectedProfile }) {
    const online = Number(expectedTotal);
    const items = Array.isArray(listings) ? listings : [];
    const detected = normalize(detectedProfile);
    const expected = normalize(expectedProfile);
    if (!Number.isInteger(online) || online < 0) throw new Error('Erwartete Anzahl laufender Anzeigen ist ungültig.');
    if (expected && normalizeKey(detected) !== normalizeKey(expected)) {
      throw new Error('Das nach dem Neuladen erkannte Kleinanzeigen-Konto stimmt nicht mit dem ausgewählten Inventarprofil überein.');
    }
    if (online > 0 && !items.length) throw new Error('Keine Anzeigenkarten mit Bearbeiten-Aktion erkannt.');
    const ids = items.map(item => String(item?.adId || '')).filter(Boolean);
    if (new Set(ids).size !== ids.length) throw new Error('Der frisch geladene Anzeigen-Snapshot enthält doppelte Anzeigen-IDs.');
    if (items.length > online) throw new Error(`Der frisch geladene Anzeigen-Snapshot enthält ${items.length} Karten, aber nur ${online} Anzeigen online.`);
    if (!hasNextPage && items.length !== online) {
      throw new Error(`Der frisch geladene Einseiten-Snapshot ist unvollständig: ${items.length} von ${online} Anzeigenkarten erkannt.`);
    }
    return { expectedTotal: online, listingCount: items.length, hasNextPage: Boolean(hasNextPage), profileName: detected || null };
  }

    return Object.freeze({
      currentMyAdsStatusSnapshot, readinessError, waitForMyAdsReady, validateFreshBulkSnapshot
    });
  }

  const API = Object.freeze({ create });
  KRDeps.register('KRInventoryReadiness', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
