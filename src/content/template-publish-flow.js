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

  // The UI and persisted workflow must never keep saying "running" after
  // a denied before-click authorization. This is a status report, not
  // publication evidence or permission to retry.
  async function reportPublishIntentBlocked(fillId, error) {
    const raw = String(error?.code || error?.message || error || '');
    const reason = /^KR_[A-Z0-9_]{1,100}$/.test(raw)
      ? raw : 'KR_PUBLISH_INTENT_UNVERIFIED';
    try {
      await runtimeMessage({
        type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId,
        status: 'needs-review', stage: 'publish-intent-blocked',
        publishBlockReason: reason
      });
    } catch { /* Lost worker reply is not proof of publication or safe retry. */ }
    return reason;
  }

  function armPublishDetection(fillId) {
    const key = `krRenewalPublishArmed_${fillId}`;
    if (globalThis[key]) return;
    let submitted = false;
    let authorizing = false;
    let permitted = null;
    let acceptedSubmitter = null;
    let approvedClickInProgress = false;
    let nativeSubmitConsumed = false;
    let manualDetached = false;
    let manualOffer = null;
    const isPublishControl = element => {
      if (!(element instanceof Element) || !visible(element) || element.disabled) return false;
      const value = element instanceof HTMLInputElement ? element.value : element.textContent;
      return /^anzeige aufgeben$/i.test(clean(value));
    };
    const detector = Object.freeze({
      // One permission only. Synthetic clicks without a durable, account-bound
      // Background authorization are intercepted just like manual clicks.
      permitOnce(control) {
        if (submitted || authorizing || permitted || !isPublishControl(control)) return false;
        permitted = control;
        return true;
      },
      beginApprovedClick(control) {
        if (submitted || approvedClickInProgress || permitted !== control) return false;
        approvedClickInProgress = true;
        return true;
      },
      endApprovedClick() {
        approvedClickInProgress = false;
      },
      offerManualStandalone(openReview) {
        if (submitted || manualDetached || typeof openReview !== 'function') return false;
        manualOffer = openReview;
        return true;
      },
      enableManualStandalone(result) {
        // Only the backend's persisted, account-bound terminal detachment
        // unlocks one genuine human click. No automatic publish authority.
        if (submitted || authorizing || manualDetached ||
            result?.manualDetached !== true || result?.autoPublishAllowed !== false ||
            result?.sourcePreserved !== true || result?.stage !== 'manual-standalone')
          return false;
        manualDetached = true;
        manualOffer = null;
        return true;
      }
    });
    globalThis[key] = detector;
    function signal() {
      updatePanel('Veröffentlichung wird übergeben',
        'Kleinanzeigen verarbeitet die neue Anzeige. Anschließend wird die neue Anzeigen-ID ermittelt.',
        [], { safetyText: false });
      void runtimeMessage({ type: 'RENEWAL_PUBLISH_CLICKED', fillId }).catch(() => {});
    }
    async function authorizeManual(control) {
      if (submitted || authorizing) return;
      if (manualOffer && !manualDetached) {
        manualOffer();
        return;
      }
      authorizing = true;
      try {
        const approval = await runtimeMessage({ type: 'AUTHORIZE_AUTOMATIC_PUBLISH', fillId });
        if (approval?.authorized !== true || !isPublishControl(control) || !control.isConnected)
          throw new Error('KR_PUBLISH_INTENT_UNVERIFIED');
        authorizing = false;
        if (!detector.permitOnce(control) || !detector.beginApprovedClick(control))
          throw new Error('KR_PUBLISH_INTENT_UNVERIFIED');
        try {
          control.click(); // Guarded native UI action; do not form.submit/requestSubmit.
        } finally {
          detector.endApprovedClick();
        }
      } catch (error) {
        await reportPublishIntentBlocked(fillId, error);
        void diagnostic(fillId, 'MANUAL_PUBLISH_INTENT_BLOCKED',
          { reason: String(error?.message || error).slice(0,180) }, 'warning');
        updatePanel('Veröffentlichung gesperrt',
          'Der Klick wurde vor der Übergabe an Kleinanzeigen angehalten. Bitte den Anzeigenstatus prüfen.',
          [String(error?.message || error).slice(0,200)],
          { safetyText: 'Ohne dauerhaften Vorabbeleg wird keine Veröffentlichung übergeben.' });
      } finally {
        authorizing = false;
      }
    }
    document.addEventListener('click', event => {
      const control = event.target instanceof Element
        ? event.target.closest('button,input[type="submit"]') : null;
      if (!isPublishControl(control)) return;
      if (manualDetached) {
        // A second synthetic .click() is NOT a human standalone decision.
        // No RENEWAL_PUBLISH_CLICKED, no managed archive promotion/delete.
        if (!event.isTrusted || submitted) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        acceptedSubmitter = control;
        submitted = true;
        approvedClickInProgress = true;
        void diagnostic(fillId, 'MANUAL_STANDALONE_PUBLISH_CLICKED', {
          ownerClick: true, archiveAutoFlow: false, remoteResultUnverified: true
        }, 'warning');
        updatePanel('Manuelle Veröffentlichung ausgelöst',
          'Bitte prüfe nun die tatsächliche neue Online-Anzeigen-ID. Der Manager hat diese Anzeige weder automatisch veröffentlicht noch erfasst.',
          [], { safetyText: 'Kein automatischer Austausch oder Löschen der bisherigen Anzeige.' });
        return;
      }
      if (permitted === control && approvedClickInProgress && !submitted) {
        permitted = null;
        acceptedSubmitter = control;
        submitted = true;
        signal();
        return;
      }
      // Capture phase prevents the actual React handler/browser default.
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!submitted) void authorizeManual(control);
    }, true);
    document.addEventListener('submit', event => {
      const submitter = event.submitter;
      if (manualDetached) {
        if (submitted && approvedClickInProgress &&
            submitter === acceptedSubmitter && !nativeSubmitConsumed) {
          nativeSubmitConsumed = true;
          approvedClickInProgress = false;
          return; // Sole browser-native submit following the trusted owner click.
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      // Allow at most ONE native submit synchronously produced by the single
      // authorized click. After the click has returned, even the same button
      // and implicit Enter submits are never permitted again.
      if (submitted && approvedClickInProgress
          && submitter === acceptedSubmitter && !nativeSubmitConsumed) {
        nativeSubmitConsumed = true;
        return;
      }
      if (submitted || !submitter) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!submitter) void diagnostic(fillId, 'PUBLISH_IMPLICIT_SUBMIT_BLOCKED',
          { reason: 'missing-submit-control' }, 'warning');
        return;
      }
      if (!isPublishControl(submitter)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void authorizeManual(submitter);
    }, true);
  }

  function offerManualStandaloneRelease({ fillId, expectedCategoryId, expectedTitle, imageCount } = {}) {
    // Deliberately *not* a publish action. Only the human presses the native
    // Kleinanzeigen button after a background-attested detached owner consent.
    const detector = globalThis[`krRenewalPublishArmed_${fillId}`];
    const panel = document.getElementById('kr-template-fill-status');
    if (!detector?.offerManualStandalone || !panel || !fillId ||
        !/^\d+$/.test(String(expectedCategoryId || '')) ||
        !Number.isSafeInteger(imageCount) || imageCount < 1)
      return false;
    const confirmCurrentForm = () => {
      if (location.pathname !== '/p-anzeige-aufgeben-schritt2.html')
        throw new Error('Die Freigabe ist nur im ursprünglichen Inserierungsformular möglich.');
      const forms = [...document.querySelectorAll('form')].filter(form =>
        String(form.querySelector('input[name="categoryId"]')?.value || '') ===
          String(expectedCategoryId) &&
        String(form.querySelector('input[name="title"]')?.value || '') ===
          String(expectedTitle || ''));
      if (forms.length !== 1 || paidInsertionDetection().required)
        throw new Error('Formular, Titel, Endkategorie oder Kostenfreiheit nicht eindeutig bestätigt.');
      return forms[0];
    };
    let busy = false, granted = false;
    const openReview = async () => {
      if (busy || granted) return;
      busy = true;
      button.disabled = true;
      try {
        confirmCurrentForm();
        const prepared = await runtimeMessage({
          type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId,
          manualStandaloneApproval: { action: 'prepare' }
        });
        if (prepared?.pending !== true || prepared.authorized !== false ||
            !prepared.token || !prepared.expiresAt)
          throw new Error('Die Vorbereitung der manuellen Freigabe ist nicht bestätigt.');
        const shade = document.createElement('div');
        shade.id = 'kr201-manual-standalone-consent';
        shade.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.76);display:flex;align-items:center;justify-content:center;padding:20px';
        const dialog = document.createElement('section');
        dialog.setAttribute('role','dialog');
        dialog.setAttribute('aria-modal','true');
        dialog.setAttribute('aria-label','Manuelle Veröffentlichung bestätigen');
        dialog.style.cssText = 'background:#152023;color:white;max-width:560px;width:100%;padding:20px;border:1px solid #7b8e86;border-radius:10px;font:14px/1.5 system-ui';
        const title = document.createElement('h2');
        title.textContent = 'Anzeige eigenständig veröffentlichen?';
        title.style.cssText = 'font-size:19px;margin:0 0 12px';
        const warning = document.createElement('p');
        warning.textContent = 'Der Manager konnte einzelne historische Merkmale nicht technisch bestätigen. Prüfe alle Angaben, die ' +
          imageCount + ' Bilder, Preis und Versand selbst. Die vorhandene Quelle bleibt unverändert. Nach dieser Freigabe ' +
          'musst du selbst auf „Anzeige aufgeben“ klicken und die neue Online-Anzeige später über „Geöffnete Anzeige erfassen“ übernehmen.';
        const checkLabel = document.createElement('label');
        checkLabel.style.cssText = 'display:flex;gap:10px;align-items:flex-start;margin:16px 0';
        const check = document.createElement('input');
        check.type = 'checkbox';
        const checkText = document.createElement('span');
        checkText.textContent = 'Ich habe die vollständige Anzeige einschließlich Bilder und Merkmale selbst geprüft. ' +
          'Ich möchte sie unabhängig vom automatischen Erneuerungsprozess manuell veröffentlichen.';
        checkLabel.append(check, checkText);
        const controls = document.createElement('div');
        controls.style.cssText = 'display:flex;gap:10px;justify-content:flex-end';
        const cancel = document.createElement('button');
        cancel.type = 'button'; cancel.textContent = 'Abbrechen';
        const accept = document.createElement('button');
        accept.type = 'button'; accept.textContent = 'Eigenständige Veröffentlichung freigeben';
        accept.disabled = true;
        for (const control of [cancel,accept]) {
          control.style.cssText = 'border:1px solid #869f9b;border-radius:6px;background:#27413d;color:white;padding:9px;cursor:pointer';
        }
        check.addEventListener('change', () => { accept.disabled = !check.checked; });
        cancel.addEventListener('click', () => {
          shade.remove(); busy = false; button.disabled = false;
        });
        accept.addEventListener('click', async event => {
          if (!event.isTrusted || !check.checked || accept.disabled) return;
          accept.disabled = true; cancel.disabled = true;
          try {
            confirmCurrentForm();
            const approved = await runtimeMessage({
              type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId,
              manualStandaloneApproval: {
                action: 'commit', token: prepared.token, ownerReviewed: true
              }
            });
            if (!detector.enableManualStandalone(approved))
              throw new Error('Die dauerhafte, eigenständige Freigabe konnte nicht bestätigt werden.');
            granted = true;
            shade.remove();
            updatePanel('Manuelle Veröffentlichung freigegeben',
              'Du kannst jetzt selbst auf „Anzeige aufgeben“ klicken. Es erfolgt keine automatische ' +
                'Anzeigenerfassung, Erneuerung oder Löschung. Öffne die neue Online-Anzeige danach ' +
                'und verwende „Geöffnete Anzeige erfassen“.',
              [], { safetyText: 'Nur dein eigener Klick darf die Veröffentlichung auslösen.' });
            void diagnostic(fillId, 'MANUAL_STANDALONE_OWNER_CONSENT_CONFIRMED', {
              imageCount, autoPublishAllowed: false, sourcePreserved: true
            }, 'warning');
          } catch (error) {
            shade.remove();
            updatePanel('Manuelle Freigabe nicht bestätigt',
              'Der vorherige Vorgang bleibt gesperrt. Bitte Online-Status und Diagnose prüfen.',
              [String(error?.message || error).slice(0,240)],
              { safetyText: 'Keine erneute Veröffentlichung auf Verdacht auslösen.' });
            void diagnostic(fillId, 'MANUAL_STANDALONE_OWNER_CONSENT_DENIED', {
              reason: String(error?.code || error?.message || error).slice(0,120)
            }, 'warning');
          } finally { busy = false; }
        });
        controls.append(cancel,accept);
        dialog.append(title,warning,checkLabel,controls);
        shade.append(dialog);
        document.documentElement.append(shade);
      } catch (error) {
        updatePanel('Manuelle Freigabe nicht möglich',
          'Bitte den aktuellen Formular- und Kontostatus prüfen.',
          [String(error?.message || error).slice(0,240)],
          { safetyText: 'Automatische Veröffentlichung bleibt gesperrt.' });
        void diagnostic(fillId, 'MANUAL_STANDALONE_PREPARE_DENIED', {
          reason: String(error?.code || error?.message || error).slice(0,120)
        }, 'warning');
      } finally {
        if (!document.getElementById('kr201-manual-standalone-consent') && !granted) {
          button.disabled = false; busy = false;
        }
      }
    };
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'kr201-manual-standalone-open';
    button.textContent = 'Eigenständig veröffentlichen …';
    button.style.cssText = 'margin-top:12px;padding:10px;width:100%;border:1px solid #81bbb1;border-radius:7px;background:#205a50;color:white;font-weight:600;cursor:pointer';
    button.addEventListener('click', event => {
      if (!event.isTrusted) return;
      void openReview();
    });
    panel.querySelector('#kr201-manual-standalone-open')?.remove();
    panel.append(button);
    return detector.offerManualStandalone(openReview);
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
    const proof = session?.result?.schemaPreflight;
    return Boolean(
      (session?.renewalId || session?.archiveInsertionId) &&
      session?.result?.complete === true &&
      Array.isArray(session?.result?.issues) &&
      session.result.issues.length === 0 &&
      proof?.verified === true &&
      /^[a-f0-9]{64}$/.test(String(proof.currentFingerprint || '')) &&
      /^\d+$/.test(String(proof.categoryId || ''))
    );
  }
  function verifiedSessionResult(session) {
    return { complete: true, issues: [], schemaPreflight: session?.result?.schemaPreflight || null };
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
    // Both direct post-fill recovery and ordinary advancing paths MUST arm
    // the manual before-click journal interceptor BEFORE any early return,
    // including ambiguous or missing final publish controls.
    if (fillId && (session?.renewalId || session?.archiveInsertionId))
      armPublishDetection(fillId);
    if ((session?.renewalId || session?.archiveInsertionId) && ['publish-submitted', 'new-id-confirmed'].includes(String(session?.stage || ''))) {
      updatePanel('Veröffentlichung wird verarbeitet', 'Kleinanzeigen verarbeitet die neue Anzeige. Die neue Anzeigen-ID wird automatisch ermittelt.', [], { safetyText: false });
      void diagnostic(fillId, 'AUTO_PUBLISH_POST_SUBMIT_SKIPPED', { stage: session.stage, path: location.pathname });
      return { publishSubmitted: true, awaitingPublishedId: session.stage !== 'new-id-confirmed' };
    }
    if (!fillId || !verifiedPublishGate(session)) {
      const issue = 'Die sicherheitsrelevante Formularschema-Prüfung ist für diese Sitzung nicht nachgewiesen. Bitte die Vorlage neu einlesen oder die Anzeige manuell prüfen.';
      await runtimeMessage({ type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId, status: 'needs-review',
        stage: 'schema-preflight-missing', result: { complete: false, issues: [issue] } }).catch(() => {});
      updatePanel('Automatische Veröffentlichung gesperrt', 'Der Formularabgleich konnte nicht wiederhergestellt werden.',
        [issue], { safetyText: 'Nicht automatisch veröffentlicht. Die bisherige Anzeige bleibt unverändert.' });
      void diagnostic(fillId, 'AUTO_PUBLISH_SCHEMA_PROOF_MISSING', { stage: session?.stage || null }, 'warning');
      return { complete: false, issues: [issue], autoPublishBlocked: true };
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
        result: verifiedSessionResult(session)
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
      result: verifiedSessionResult(session)
    });
    updatePanel('Vorlage vollständig übernommen', 'Alle kontrollierten Werte und Bilder stimmen. Die Anzeige wird jetzt automatisch veröffentlicht.', [], { safetyText: 'Automatische Veröffentlichung freigegeben – keine Abweichungen erkannt.' });
    try { button.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch { /* Komfortschritt */ }
    await sleep(180);
    // The real remote mutation is the click, NOT the later asynchronous click notification.
    // A recorded, account-bound, cross-worker-exclusive intent is mandatory first.
    try {
      const authorization = await runtimeMessage({ type: 'AUTHORIZE_AUTOMATIC_PUBLISH', fillId });
      if (authorization?.authorized !== true) throw new Error('KR_PUBLISH_INTENT_UNVERIFIED');
      if (!button.isConnected || button.disabled || !visible(button)) throw new Error('KR_PUBLISH_BUTTON_STALE');
      const detector = globalThis[`krRenewalPublishArmed_${fillId}`];
      if (!detector?.permitOnce?.(button)) throw new Error('KR_PUBLISH_INTENT_UNVERIFIED');
    } catch (error) {
      await reportPublishIntentBlocked(fillId, error);
      updatePanel('Automatische Veröffentlichung gesperrt',
        'Der Veröffentlichungsversuch wurde nicht automatisch gestartet. Bitte den aktuellen Anzeigenstatus prüfen und keine automatische Wiederholung auslösen.',
        [String(error?.message || error).slice(0,240)],
        { safetyText: 'Keine automatische Veröffentlichung ohne bestätigten dauerhaften Vorabbeleg.' });
      void diagnostic(fillId, 'AUTO_PUBLISH_INTENT_BLOCKED',
        { reason: String(error?.message || error).slice(0,180) }, 'warning');
      return { awaitingPublish: true, autoPublishBlocked: true };
    }
    void diagnostic(fillId, 'AUTO_PUBLISH_GATE_PASSED', { candidateCount: 1, path: location.pathname });
    if (!globalThis[`krRenewalPublishArmed_${fillId}`]?.beginApprovedClick?.(button))
      throw new Error('KR_PUBLISH_INTENT_UNVERIFIED');
    try {
      button.click();
    } finally {
      globalThis[`krRenewalPublishArmed_${fillId}`].endApprovedClick();
    }
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

  async function prepareAwaitingPublish(fillId, message = 'Bitte alle Angaben prüfen und „Anzeige aufgeben“ selbst anklicken.', session = null) {
    armPublishDetection(fillId);
    await runtimeMessage({
      type: 'UPDATE_TEMPLATE_FILL_SESSION',
      fillId,
      status: 'running',
      stage: 'awaiting-publish',
      result: verifiedPublishGate(session)
        ? { complete: true, issues: [] }
        : { complete: false, issues: Array.isArray(session?.result?.issues) && session.result.issues.length
          ? session.result.issues : ['Veröffentlichungsprüfung nicht vollständig.'] }
    });
    updatePanel('Veröffentlichung wartet auf Prüfung', message, [], { safetyText: 'Automatischer Ablauf pausiert – bitte den finalen Schritt prüfen.' });
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
        result: verifiedSessionResult(session)
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
      result: verifiedSessionResult(session)
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
        result: verifiedSessionResult(session)
      }).catch(() => {});
      updatePanel('Vorlage vollständig übernommen', '„Weiter“ wurde ausgelöst, aber der nächste Schritt konnte nicht eindeutig bestätigt werden. Bitte den aktuellen Stand prüfen und gegebenenfalls manuell fortfahren.', [], { safetyText: 'Automatischer Ablauf pausiert – bitte den nächsten Schritt prüfen.' });
      void diagnostic(fillId, 'POST_FILL_CONTINUE_UNCONFIRMED', { message: String(error.message || error).slice(0, 400) }, 'warning');
      return { manualContinue: true };
    }
  }

    return Object.freeze({
      armPublishDetection,
      offerManualStandaloneRelease,
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
