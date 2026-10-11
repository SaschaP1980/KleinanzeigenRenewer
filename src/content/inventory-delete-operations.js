(() => {
  if (globalThis.__KR_INVENTORY_DELETE_OPERATIONS_V12318__) return;
  globalThis.__KR_INVENTORY_DELETE_OPERATIONS_V12318__ = true;
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before KRInventoryDeleteOperations');

  function create(options = {}) {
    const {
      MAX_PHASE4_PAGES, sleep, normalize, normalizeKey, diagnostic, isMyAdsProjectsUrl, scanListings, currentPageNumber, pageFingerprint, nextPageButton, isDisabledControl, waitForPageChange, waitForListings, parseOnlineCount, detectedProfileName
    } = options;

  function exactDeleteControls(root) {
    if (!root) return [];
    return [...root.querySelectorAll('button,a')].filter(element => {
      const text = normalizeKey(element.textContent);
      const hasTrashIcon = Boolean(element.querySelector?.('svg[data-title="trashOutline"]'));
      return text === 'löschen' || text === 'anzeige löschen' || hasTrashIcon;
    });
  }

  function deleteControlEvidence(element) {
    if (!element) return null;
    return {
      tag: String(element.tagName || '').toLowerCase(),
      text: normalize(element.textContent).slice(0, 120),
      hasTrashIcon: Boolean(element.querySelector?.('svg[data-title="trashOutline"]')),
      disabled: isDisabledControl(element)
    };
  }

  function resolveDeleteSuccessFeedback() {
    const successText = 'anzeige wurde gelöscht';
    const liveRegions = [...document.querySelectorAll('[role="status"], [role="alert"], [aria-live="polite"], [aria-live="assertive"]')];
    const toast = liveRegions.find(element => normalizeKey(element.textContent).includes(successText));
    if (toast) {
      return {
        type: 'toast',
        method: 'live-region',
        text: normalize(toast.textContent).slice(0, 180)
      };
    }

    const dialogs = [...document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"], [aria-modal="true"]')];
    for (const dialog of dialogs) {
      const headings = [...dialog.querySelectorAll('h1,h2,h3,[role="heading"]')].map(element => normalizeKey(element.textContent));
      const text = normalizeKey(dialog.textContent);
      const hasDoneTitle = headings.some(value => value === 'erledigt!' || value === 'erledigt');
      const hasObservedBody = text.includes('schön, dass du eine lösung gefunden hast') || text.includes('weitere anzeige aufgeben');
      if (hasDoneTitle && hasObservedBody) {
        return {
          type: 'modal',
          method: 'done-dialog',
          title: headings.find(value => value === 'erledigt!' || value === 'erledigt') || 'erledigt',
          text: normalize(dialog.textContent).slice(0, 240)
        };
      }
    }

    const bodyText = normalizeKey(document.body?.innerText || '');
    if (bodyText.includes(successText)) {
      return {
        type: 'toast',
        method: 'body-text-fallback',
        text: 'Anzeige wurde gelöscht'
      };
    }
    return null;
  }

  async function waitForDeletePostAction(adId, listingRoot, timeoutMs = 5000, correlation = {}) {
    const started = Date.now();
    let localEvidence = 'listing-still-present';
    let localChangedAt = 0;
    while (Date.now() - started < timeoutMs) {
      const stillPresent = scanListings().some(item => String(item.adId) === String(adId));
      if (!stillPresent) {
        localEvidence = 'listing-absent';
        if (!localChangedAt) localChangedAt = Date.now();
      } else if (listingRoot && !document.documentElement.contains(listingRoot)) {
        localEvidence = 'listing-root-removed';
        if (!localChangedAt) localChangedAt = Date.now();
      }

      const feedback = resolveDeleteSuccessFeedback();
      if (feedback) {
        diagnostic(feedback.type === 'modal' ? 'RENEWAL_SOURCE_DELETE_SUCCESS_MODAL' : 'RENEWAL_SOURCE_DELETE_SUCCESS_TOAST', {
          adId: String(adId || ''),
          method: feedback.method,
          localEvidence
        }, 'info', correlation);
        return { feedback, localEvidence };
      }

      // A vanished card is useful local evidence, but success feedback is optional.
      // Give a toast/modal a short chance to appear and then let the background
      // perform the authoritative fresh full-pagination verification.
      if (localChangedAt && Date.now() - localChangedAt >= 750) break;
      await sleep(200);
    }
    diagnostic('RENEWAL_SOURCE_DELETE_NO_FEEDBACK', {
      adId: String(adId || ''),
      localEvidence,
      waitedMs: Date.now() - started
    }, 'info', correlation);
    return { feedback: null, localEvidence };
  }

  function resolveDeleteConfirmation(dialog) {
    if (!dialog) return { button: null, method: null, reason: 'dialog-missing', evidence: null };

    const title = dialog.querySelector?.('#delete-container-title');
    const titleText = normalizeKey(title?.textContent);
    const dialogText = normalizeKey(dialog.textContent);
    const expectedQuestion = 'bist du sicher, dass du die anzeige löschen möchtest?';
    const evidence = {
      title: normalize(title?.textContent).slice(0, 120),
      questionMatched: dialogText.includes(expectedQuestion),
      primaryIdCount: dialog.querySelectorAll?.('button#delete-celebration-sbmt')?.length || 0
    };

    if (titleText !== 'anzeige löschen') {
      return { button: null, method: null, reason: 'title-mismatch', evidence };
    }
    if (!evidence.questionMatched) {
      return { button: null, method: null, reason: 'question-mismatch', evidence };
    }

    const primary = [...dialog.querySelectorAll('button#delete-celebration-sbmt')];
    if (primary.length > 1) {
      return { button: null, method: null, reason: 'multiple-primary-controls', evidence };
    }
    if (primary.length === 1) {
      const button = primary[0];
      evidence.primaryText = normalize(button.textContent).slice(0, 120);
      evidence.primaryDisabled = isDisabledControl(button);
      if (normalizeKey(button.textContent) !== 'ja, anzeige löschen') {
        return { button: null, method: null, reason: 'primary-text-mismatch', evidence };
      }
      if (isDisabledControl(button)) {
        return { button: null, method: null, reason: 'primary-disabled', evidence };
      }
      return { button, method: 'id', reason: null, evidence };
    }

    const fallback = [...dialog.querySelectorAll('button')].filter(button =>
      normalizeKey(button.textContent) === 'ja, anzeige löschen' && !isDisabledControl(button)
    );
    evidence.fallbackCount = fallback.length;
    if (fallback.length !== 1) {
      return { button: null, method: null, reason: fallback.length ? 'multiple-fallback-controls' : 'confirmation-control-missing', evidence };
    }
    return { button: fallback[0], method: 'exact-text-fallback', reason: null, evidence };
  }

  async function confirmDeleteDialog(adId, correlation = {}) {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const dialogs = [...document.querySelectorAll('[role="dialog"], dialog, [aria-modal="true"]')].filter(dialog => {
        const text = normalizeKey(dialog.textContent);
        return text.includes('lösch');
      });
      if (dialogs.length > 1) throw new Error('Mehrere Löschdialoge erkannt; Abbruch aus Sicherheitsgründen.');
      if (dialogs.length === 1) {
        const resolved = resolveDeleteConfirmation(dialogs[0]);
        diagnostic('RENEWAL_SOURCE_DELETE_CONFIRMATION_RESOLVED', {
          adId,
          method: resolved.method,
          reason: resolved.reason,
          evidence: resolved.evidence
        }, resolved.button ? 'info' : 'warning', correlation);
        if (!resolved.button) throw new Error('Löschbestätigung ist nicht eindeutig; Abbruch aus Sicherheitsgründen.');
        resolved.button.click();
        diagnostic('RENEWAL_SOURCE_DELETE_CONFIRMED', { adId, method: resolved.method }, 'info', correlation);
        return true;
      }
      await sleep(150);
    }
    return false;
  }

  async function scanOwnAdsAcrossPages(adId) {
    const wanted = String(adId || '');
    const seenPageStates = new Set();
    const pages = [];
    for (let pageGuard = 0; pageGuard < MAX_PHASE4_PAGES; pageGuard += 1) {
      if (!isMyAdsProjectsUrl()) throw new Error('Phase 4 hat die Ansicht „Meine Anzeigen“ / PROJECTS verlassen; Abbruch aus Sicherheitsgründen.');
      const listings = await waitForListings();
      const page = currentPageNumber();
      const fingerprint = pageFingerprint();
      const stateKey = `${page}|${location.href}|${fingerprint}`;
      if (seenPageStates.has(stateKey)) throw new Error('Seitennavigation in „Meine Anzeigen“ wiederholt sich; Abbruch aus Sicherheitsgründen.');
      seenPageStates.add(stateKey);
      pages.push({ page, fingerprint, listingCount: listings.length });

      const listing = listings.find(item => String(item.adId) === wanted);
      if (listing) return { found: true, listing, page, pagesScanned: pages.length, pages };

      const next = nextPageButton();
      if (isDisabledControl(next)) return { found: false, exhausted: true, pagesScanned: pages.length, pages };
      const beforePage = page;
      const beforeFingerprint = fingerprint;
      next.click();
      if (!await waitForPageChange(beforePage, beforeFingerprint)) throw new Error('Nächste Seite von „Meine Anzeigen“ konnte nicht geladen werden.');
      await sleep(250);
    }
    throw new Error(`Mehr als ${MAX_PHASE4_PAGES} Seiten in „Meine Anzeigen“ erkannt; Abbruch aus Sicherheitsgründen.`);
  }

  async function snapshotOwnAdRoster(correlation = {}) {
    if (!isMyAdsProjectsUrl()) throw new Error('Bestandsprüfung kann nur über „Meine Anzeigen“ mit tab=PROJECTS ausgeführt werden.');
    const parsed = parseOnlineCount(document.body?.innerText || '');
    const onlineCount = Number(parsed?.online);
    if (!Number.isInteger(onlineCount) || onlineCount < 0) throw new Error('Die Anzahl der aktuell online stehenden Anzeigen konnte nicht eindeutig erkannt werden.');
    const ids = new Set();
    const pages = [];
    const seenPageStates = new Set();
    if (onlineCount === 0) {
      const result = { complete: true, onlineCount: 0, ids: [], pagesScanned: 1, profileName: detectedProfileName(document), evidence: 'full-my-ads-pagination-scan' };
      diagnostic('RENEWAL_CHECKOUT_RECOVERY_ROSTER_SCANNED', result, 'info', correlation);
      return result;
    }
    for (let pageGuard = 0; pageGuard < MAX_PHASE4_PAGES; pageGuard += 1) {
      if (!isMyAdsProjectsUrl()) throw new Error('Bestandsprüfung hat „Meine Anzeigen“ / PROJECTS verlassen; Abbruch aus Sicherheitsgründen.');
      const listings = await waitForListings();
      const page = currentPageNumber();
      const fingerprint = pageFingerprint();
      const stateKey = `${page}|${location.href}|${fingerprint}`;
      if (seenPageStates.has(stateKey)) throw new Error('Seitennavigation der Bestandsprüfung wiederholt sich; Abbruch aus Sicherheitsgründen.');
      seenPageStates.add(stateKey);
      if (!listings.length) throw new Error(`Auf Seite ${page} wurden trotz ${onlineCount} gemeldeter Online-Anzeigen keine Anzeigen erkannt.`);
      for (const listing of listings) if (/^\d+$/.test(String(listing?.adId || ''))) ids.add(String(listing.adId));
      pages.push({ page, fingerprint, listingCount: listings.length });
      const next = nextPageButton();
      if (isDisabledControl(next)) {
        const rosterIds = [...ids];
        const complete = rosterIds.length === onlineCount;
        const result = { complete, onlineCount, ids: rosterIds, pagesScanned: pages.length, pages, profileName: detectedProfileName(document), evidence: complete ? 'full-my-ads-pagination-scan' : 'my-ads-count-mismatch' };
        diagnostic('RENEWAL_CHECKOUT_RECOVERY_ROSTER_SCANNED', { complete, onlineCount, observedIds: rosterIds.length, pagesScanned: pages.length, evidence: result.evidence }, complete ? 'info' : 'warning', correlation);
        return result;
      }
      const beforePage = page;
      const beforeFingerprint = fingerprint;
      next.click();
      if (!await waitForPageChange(beforePage, beforeFingerprint)) throw new Error('Nächste Seite der Bestandsprüfung konnte nicht geladen werden.');
      await sleep(250);
    }
    throw new Error(`Mehr als ${MAX_PHASE4_PAGES} Seiten in „Meine Anzeigen“ erkannt; Abbruch aus Sicherheitsgründen.`);
  }

  async function deleteOwnAdById(adId, correlation = {}) {
    const wanted = String(adId || '');
    if (!/^\d+$/.test(wanted)) throw new Error('Quell-Anzeigen-ID ist ungültig.');
    if (!isMyAdsProjectsUrl()) throw new Error('Quellanzeige kann nur aus „Meine Anzeigen“ mit tab=PROJECTS gelöscht werden.');

    const scan = await scanOwnAdsAcrossPages(wanted);
    if (!scan.found) {
      diagnostic('RENEWAL_SOURCE_DELETE_ALREADY_ABSENT_CANDIDATE', { adId: wanted, pagesScanned: scan.pagesScanned }, 'info', correlation);
      return { deleted: false, actionTriggered: false, alreadyAbsentCandidate: true, adId: wanted, pagesScanned: scan.pagesScanned };
    }

    const listing = scan.listing;
    const cardAdId = String(listing.root?.getAttribute?.('data-adid') || '');
    if (cardAdId && cardAdId !== wanted) throw new Error('Gefundene Anzeigenkarte gehört nicht zur erwarteten Quell-Anzeigen-ID.');
    const deleteControls = exactDeleteControls(listing.root).filter(element => !isDisabledControl(element));
    const candidateEvidence = deleteControls.map(deleteControlEvidence);
    diagnostic('RENEWAL_SOURCE_DELETE_TARGET_RESOLVED', {
      adId: wanted,
      page: scan.page,
      pagesScanned: scan.pagesScanned,
      matchedCardAdId: cardAdId || null,
      cardSelector: '[data-testid="ad-card"][data-adid]',
      deleteCandidateCount: deleteControls.length,
      deleteCandidateEvidence: candidateEvidence
    }, 'info', correlation);
    if (deleteControls.length !== 1) {
      throw new Error(deleteControls.length ? 'Mehrere Löschaktionen für die Quellanzeige erkannt.' : 'Keine eindeutige Löschaktion für die Quellanzeige gefunden.');
    }

    diagnostic('RENEWAL_SOURCE_DELETE_CLICKED', { adId: wanted, page: scan.page, pagesScanned: scan.pagesScanned, deleteCandidateEvidence: candidateEvidence[0] || null }, 'info', correlation);
    deleteControls[0].click();
    const confirmed = await confirmDeleteDialog(wanted, correlation);
    if (!confirmed) throw new Error('Nach dem Löschklick erschien keine eindeutige Löschbestätigung; Abbruch aus Sicherheitsgründen.');
    const postAction = await waitForDeletePostAction(wanted, listing.root, 5000, correlation);
    diagnostic('RENEWAL_SOURCE_DELETE_LOCAL_OUTCOME', {
      adId: wanted,
      evidence: postAction.localEvidence,
      confirmed,
      feedbackType: postAction.feedback?.type || null,
      feedbackMethod: postAction.feedback?.method || null,
      page: scan.page
    }, 'info', correlation);
    return {
      deleted: true,
      actionTriggered: true,
      adId: wanted,
      page: scan.page,
      pagesScanned: scan.pagesScanned,
      confirmed,
      feedback: postAction.feedback,
      localEvidence: postAction.localEvidence
    };
  }

  async function findOwnAdById(adId, correlation = {}, { notFoundSeverity = 'warning', expectedAbsent = false } = {}) {
    const wanted = String(adId || '');
    if (!/^\d+$/.test(wanted)) throw new Error('Anzeigen-ID ist ungültig.');
    if (!isMyAdsProjectsUrl()) throw new Error('Anzeige kann nur über „Meine Anzeigen“ mit tab=PROJECTS gesucht werden.');
    const scan = await scanOwnAdsAcrossPages(wanted);
    if (!scan.found) {
      diagnostic('RENEWAL_MY_ADS_FALLBACK_NOT_FOUND', { adId: wanted, pagesScanned: scan.pagesScanned, expectedAbsent: Boolean(expectedAbsent) }, notFoundSeverity, correlation);
      return { found: false, adId: wanted, pagesScanned: scan.pagesScanned, evidence: 'not-in-my-ads-full-pagination-scan' };
    }
    const listing = scan.listing || {};
    const result = {
      found: true,
      adId: wanted,
      page: scan.page,
      pagesScanned: scan.pagesScanned,
      title: String(listing.title || ''),
      editUrl: String(listing.editUrl || ''),
      publicUrl: String(listing.publicUrl || ''),
      endDateDisplay: String(listing.endDateDisplay || ''),
      endDateIso: String(listing.endDateIso || ''),
      evidence: 'found-in-my-ads-full-pagination-scan'
    };
    diagnostic('RENEWAL_MY_ADS_FALLBACK_FOUND', result, 'info', correlation);
    return result;
  }

  async function verifyOwnAdAbsentById(adId, correlation = {}) {
    const wanted = String(adId || '');
    if (!/^\d+$/.test(wanted)) throw new Error('Quell-Anzeigen-ID ist ungültig.');
    if (!isMyAdsProjectsUrl()) throw new Error('Quellanzeige kann nur über „Meine Anzeigen“ mit tab=PROJECTS verifiziert werden.');
    const found = await findOwnAdById(wanted, correlation, { notFoundSeverity: 'info', expectedAbsent: true });
    if (found.found) {
      diagnostic('RENEWAL_SOURCE_DELETE_VERIFICATION_FAILED', { adId: wanted, foundPage: found.page, pagesScanned: found.pagesScanned }, 'warning', correlation);
      return { verified: false, adId: wanted, foundPage: found.page, pagesScanned: found.pagesScanned, evidence: 'source-still-present' };
    }
    const evidence = 'not-in-my-ads-full-pagination-scan';
    diagnostic('RENEWAL_SOURCE_DELETE_VERIFIED', { adId: wanted, evidence, pagesScanned: found.pagesScanned }, 'info', correlation);
    return { verified: true, adId: wanted, evidence, pagesScanned: found.pagesScanned };
  }

    return Object.freeze({
      snapshotOwnAdRoster, deleteOwnAdById, findOwnAdById, verifyOwnAdAbsentById
    });
  }

  const API = Object.freeze({ create });
  KRDeps.register('KRInventoryDeleteOperations', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
