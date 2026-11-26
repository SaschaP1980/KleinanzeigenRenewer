(() => {
  if (globalThis.__KR_TEMPLATE_PUBLISH_FLOW_V12317__) return;
  globalThis.__KR_TEMPLATE_PUBLISH_FLOW_V12317__ = true;
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before KRTemplatePublishFlow.js');

  function create(options = {}) {
    const {
      PaidInsertionGuard,
      clean,
      sleep,
      runtimeMessage,
      diagnostic,
      visible,
      visibleText,
      waitFor,
      updatePanel
    } = options;

  function armPublishDetection(fillId) {
    const key = `krRenewalPublishArmed_${fillId}`;
    if (globalThis[key]) return;
    globalThis[key] = true;
    let signalling = false;
    const signal = () => {
      if (signalling) return;
      signalling = true;
      updatePanel('Veröffentlichung wird übergeben', 'Kleinanzeigen verarbeitet die neue Anzeige. Anschließend wird die neue Anzeigen-ID ermittelt.', [], { safetyText: false });
      void runtimeMessage({ type: 'RENEWAL_PUBLISH_CLICKED', fillId })
        .catch(() => {})
        .finally(() => { setTimeout(() => { signalling = false; }, 750); });
    };
    document.addEventListener('click', event => {
      const button = event.target instanceof Element ? event.target.closest('button') : null;
      if (!button || clean(button.textContent) !== 'Anzeige aufgeben' || !visible(button)) return;
      signal();
    }, true);
    document.addEventListener('submit', event => {
      const submitter = event.submitter;
      if (!(submitter instanceof Element) || clean(submitter.textContent) !== 'Anzeige aufgeben') return;
      signal();
    }, true);
  }

  function scrollToPublishButton() {
    const candidates = [...document.querySelectorAll('button')].filter(button => clean(button.textContent) === 'Anzeige aufgeben' && visible(button));
    const button = candidates[0];
    if (button) {
      button.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      return true;
    }
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    return false;
  }

  function findVisiblePublishButton() {
    return [...document.querySelectorAll('button,input[type="submit"]')].find(element => {
      if (!visible(element) || element.disabled) return false;
      const text = element instanceof HTMLInputElement ? clean(element.value) : visibleText(element);
      return /^anzeige aufgeben$/i.test(text);
    }) || null;
  }

  function findVisiblePublishButtons() {
    return [...document.querySelectorAll('button,input[type="submit"]')].filter(element => {
      if (!visible(element) || element.disabled) return false;
      const text = element instanceof HTMLInputElement ? clean(element.value) : visibleText(element);
      return /^anzeige aufgeben$/i.test(text);
    });
  }

  function verifiedPublishGate(session) {
    return Boolean(
      (session?.renewalId || session?.archiveInsertionId) &&
      session?.result?.complete === true &&
      Array.isArray(session?.result?.issues) &&
      session.result.issues.length === 0
    );
  }

  async function prepareTemplateOnlyComplete(session) {
    const fillId = session?.fillId;
    await runtimeMessage({
      type: 'UPDATE_TEMPLATE_FILL_SESSION',
      fillId,
      status: 'complete',
      stage: 'template-only-complete',
      result: { complete: true, issues: [] }
    });
    updatePanel(
      'Vorlage vollständig übernommen',
      'Alle gespeicherten Angaben und Bilder wurden übernommen. Die Anzeige wird nicht automatisch veröffentlicht.',
      [],
      { safetyText: 'Nicht veröffentlicht – bitte die ausgefüllte Anzeige prüfen und anschließend selbst veröffentlichen.', showTemplateOnlySafety: true }
    );
    try { scrollToPublishButton(); } catch { /* Komfortschritt */ }
    void diagnostic(fillId, 'TRASH_TEMPLATE_ONLY_COMPLETE', { path: location.pathname, autoPublishAllowed: false });
    return { templateOnlyComplete: true, awaitingPublish: true, publishTriggered: false };
  }

  function paidInsertionDetection() {
    return PaidInsertionGuard?.detect?.({ document, location }) || { required: false };
  }

  async function stopForPaidInsertion(session, detection, source = 'pre-publish') {
    const fillId = session?.fillId;
    const issue = detection?.phase === 'checkout'
      ? 'Kleinanzeigen hat eine Zahlungsseite für eine kostenpflichtige Einstellung geöffnet. Es wurde keine Zahlung ausgelöst.'
      : 'Kleinanzeigen verlangt für diese Anzeige eine kostenpflichtige Einstellung. Die automatische Veröffentlichung wurde gestoppt.';
    const event = detection?.phase === 'checkout' ? 'PAID_INSERTION_CHECKOUT_DETECTED' : 'PAID_INSERTION_REQUIRED_DETECTED_PRE_PUBLISH';
    void diagnostic(fillId, event, { path: location.pathname, amount: detection?.amount || null, source, reason: 'paid-insertion-required' }, 'warning');
    updatePanel('Kostenpflichtiges Inserieren erkannt', 'Der automatische Vorgang wurde sicher angehalten. Bitte entscheide selbst, ob du die kostenpflichtige Einstellung durchführen möchtest.', [issue], { safetyText: 'Keine Zahlung ausgelöst – die bisherige Anzeige bleibt unverändert.' });
    await runtimeMessage({
      type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId, status: 'needs-review', stage: 'paid-insertion-required',
      paidInsertion: {
        phase: detection?.phase === 'checkout' ? 'checkout' : 'pre-publish',
        source: String(source || '').slice(0, 80),
        pathname: String(location.pathname || '').slice(0, 240),
        amount: detection?.amount || null
      },
      result: { complete: false, issues: [issue] }
    }).catch(() => {});
    return { complete: false, issues: [issue], paidInsertionRequired: true, detection };
  }

  async function autoPublishVerifiedRenewal(session) {
    const fillId = session?.fillId;
    if (session?.templateOnly) return await prepareTemplateOnlyComplete(session);
    if ((session?.renewalId || session?.archiveInsertionId) && ['publish-submitted', 'new-id-confirmed'].includes(String(session?.stage || ''))) {
      updatePanel('Veröffentlichung wird verarbeitet', 'Kleinanzeigen verarbeitet die neue Anzeige. Die neue Anzeigen-ID wird automatisch ermittelt.', [], { safetyText: false });
      void diagnostic(fillId, 'AUTO_PUBLISH_POST_SUBMIT_SKIPPED', { stage: session.stage, path: location.pathname });
      return { publishSubmitted: true, awaitingPublishedId: session.stage !== 'new-id-confirmed' };
    }
    if (!fillId || !verifiedPublishGate(session)) {
      return await prepareAwaitingPublish(fillId, 'Die automatische Veröffentlichung ist nicht freigegeben. Bitte alle Angaben prüfen und „Anzeige aufgeben“ selbst anklicken.');
    }

    const paidBeforePublish = paidInsertionDetection();
    if (paidBeforePublish.required) return await stopForPaidInsertion(session, paidBeforePublish, 'auto-publish-gate');

    const candidates = findVisiblePublishButtons();
    if (candidates.length !== 1) {
      await runtimeMessage({
        type: 'UPDATE_TEMPLATE_FILL_SESSION',
        fillId,
        status: 'running',
        stage: 'awaiting-manual-publish',
        result: { complete: true, issues: [] }
      }).catch(() => {});
      const reason = candidates.length ? `${candidates.length} sichtbare „Anzeige aufgeben“-Buttons erkannt.` : 'Kein eindeutiger sichtbarer „Anzeige aufgeben“-Button erkannt.';
      updatePanel('Vorlage vollständig übernommen – Veröffentlichung prüfen', `${reason} Der automatische Ablauf wartet auf deine Prüfung.`, [], { safetyText: 'Automatischer Ablauf pausiert – bitte den finalen Schritt prüfen.' });
      void diagnostic(fillId, 'AUTO_PUBLISH_GATE_BLOCKED', { candidateCount: candidates.length, reason }, 'warning');
      return { awaitingPublish: true, autoPublishBlocked: true };
    }

    const button = candidates[0];
    armPublishDetection(fillId);
    await runtimeMessage({
      type: 'UPDATE_TEMPLATE_FILL_SESSION',
      fillId,
      status: 'running',
      stage: 'auto-publish-ready',
      result: { complete: true, issues: [] }
    });
    updatePanel('Vorlage vollständig übernommen', 'Alle kontrollierten Werte und Bilder stimmen. Die Anzeige wird jetzt automatisch veröffentlicht.', [], { safetyText: 'Automatische Veröffentlichung freigegeben – keine Abweichungen erkannt.' });
    try { button.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch { /* Komfortschritt */ }
    await sleep(180);
    void diagnostic(fillId, 'AUTO_PUBLISH_GATE_PASSED', { candidateCount: 1, path: location.pathname });
    button.click();
    void diagnostic(fillId, 'AUTO_PUBLISH_CLICKED', { path: location.pathname });
    updatePanel('Anzeige wird veröffentlicht', 'Kleinanzeigen verarbeitet die neue Anzeige. Anschließend wird die neue Anzeigen-ID automatisch ermittelt.', [], { safetyText: false });
    return { publishTriggered: true };
  }

  function findPostFillContinueButtons() {
    return [...document.querySelectorAll('button,input[type="submit"]')].filter(element => {
      if (!visible(element) || element.disabled) return false;
      if (element.closest('#postad-step1-frm')) return false;
      const text = element instanceof HTMLInputElement ? clean(element.value) : visibleText(element);
      return /^weiter$/i.test(text);
    });
  }

  async function prepareAwaitingPublish(fillId, message = 'Bitte alle Angaben prüfen und „Anzeige aufgeben“ selbst anklicken.') {
    armPublishDetection(fillId);
    await runtimeMessage({
      type: 'UPDATE_TEMPLATE_FILL_SESSION',
      fillId,
      status: 'running',
      stage: 'awaiting-publish',
      result: { complete: true, issues: [] }
    });
    updatePanel('Vorlage vollständig übernommen', message, [], { safetyText: 'Automatischer Ablauf pausiert – bitte den finalen Schritt prüfen.' });
    await sleep(180);
    try {
      const found = scrollToPublishButton();
      void diagnostic(fillId, 'PUBLISH_BUTTON_SCROLL_COMPLETED', { buttonFound: found });
      return { awaitingPublish: true, buttonFound: found };
    } catch (error) {
      try { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); } catch { /* Komfort-Fallback */ }
      void diagnostic(fillId, 'PUBLISH_BUTTON_SCROLL_FAILED', { message: String(error.message || error).slice(0, 300), stack: String(error.stack || '').slice(0, 1800) }, 'warning');
      return { awaitingPublish: true, buttonFound: false };
    }
  }

  async function advanceAfterVerifiedFill(session) {
    const fillId = session?.fillId;
    if (!session?.templateOnly) armPublishDetection(fillId);
    if (findVisiblePublishButton()) {
      return await autoPublishVerifiedRenewal(session);
    }

    const continueButtons = findPostFillContinueButtons();
    if (continueButtons.length !== 1) {
      await runtimeMessage({
        type: 'UPDATE_TEMPLATE_FILL_SESSION',
        fillId,
        status: 'running',
        stage: 'awaiting-manual-continue',
        result: { complete: true, issues: [] }
      });
      const reason = continueButtons.length ? `${continueButtons.length} sichtbare „Weiter“-Buttons erkannt.` : 'Kein eindeutiger sichtbarer „Weiter“-Button erkannt.';
      updatePanel('Vorlage vollständig übernommen', `${reason} Bitte den nächsten Schritt manuell öffnen.`, [], { safetyText: 'Automatischer Ablauf pausiert – bitte den nächsten Schritt prüfen.' });
      void diagnostic(fillId, 'POST_FILL_CONTINUE_NOT_UNIQUE', { candidateCount: continueButtons.length, reason }, 'warning');
      return { manualContinue: true };
    }

    const button = continueButtons[0];
    const beforeUrl = location.href;
    await runtimeMessage({
      type: 'UPDATE_TEMPLATE_FILL_SESSION',
      fillId,
      status: 'running',
      stage: 'post-fill-continuing',
      result: { complete: true, issues: [] }
    });
    updatePanel('Vorlage vollständig übernommen', 'Alle kontrollierten Vorlagenwerte stimmen. Weiter zum abschließenden Prüfschritt …');
    void diagnostic(fillId, 'POST_FILL_CONTINUE_CLICK_STARTED', { path: location.pathname });
    button.click();
    void diagnostic(fillId, 'POST_FILL_CONTINUE_CLICKED', { path: location.pathname });

    try {
      const result = await waitFor(() => {
        if (location.href !== beforeUrl) return { navigated: true };
        const publish = findVisiblePublishButton();
        if (publish) return { publish };
        return null;
      }, { timeout: 15000, description: 'Fortsetzung nach „Weiter“' });
      if (result?.publish) return await autoPublishVerifiedRenewal({ ...session, stage: 'post-fill-continuing' });
      void diagnostic(fillId, 'POST_FILL_CONTINUE_NAVIGATION_DETECTED', { fromPath: new URL(beforeUrl).pathname, toPath: location.pathname });
      return { pendingNavigation: true };
    } catch (error) {
      await runtimeMessage({
        type: 'UPDATE_TEMPLATE_FILL_SESSION',
        fillId,
        status: 'running',
        stage: 'awaiting-manual-continue',
        result: { complete: true, issues: [] }
      }).catch(() => {});
      updatePanel('Vorlage vollständig übernommen', '„Weiter“ wurde ausgelöst, aber der nächste Schritt konnte nicht eindeutig bestätigt werden. Bitte den aktuellen Stand prüfen und gegebenenfalls manuell fortfahren.', [], { safetyText: 'Automatischer Ablauf pausiert – bitte den nächsten Schritt prüfen.' });
      void diagnostic(fillId, 'POST_FILL_CONTINUE_UNCONFIRMED', { message: String(error.message || error).slice(0, 400) }, 'warning');
      return { manualContinue: true };
    }
  }

    return Object.freeze({
      armPublishDetection,
      scrollToPublishButton,
      paidInsertionDetection,
      stopForPaidInsertion,
      autoPublishVerifiedRenewal,
      advanceAfterVerifiedFill
    });
  }

  const API = Object.freeze({ create });
  KRDeps.register('KRTemplatePublishFlow', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
