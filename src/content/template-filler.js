// Controlled template-to-new-ad prefill for Kleinanzeigen Renewal.
// This module fills and verifies the new-ad UI and may advance visible wizard controls.
// Template-only flows never auto-publish. Verified renewal/archive-insertion flows may
// automatically publish only through the explicit final-publish hard gate; direct form
// submission APIs are not used as a publish bypass.
(() => {
  if (globalThis.__KR_TEMPLATE_FILLER_V150__) return;
  globalThis.__KR_TEMPLATE_FILLER_V150__ = true;
  const KRDeps = globalThis.KRDeps || null;
  const Form = KRDeps?.optional('KRForm') || null;
  const PaidInsertionGuard = KRDeps?.require('KRPaidInsertionGuard');
  const TARGET_PATH = '/p-anzeige-aufgeben-schritt2.html';
  const CATEGORY_PATH = '/p-kategorie-aendern.html';
  const INSERTION_ERROR_PATH = '/anzeige-aufgeben-fehler.html';
  const MASS_RENEWAL_HEARTBEAT_MS = 30 * 1000;
  let massRenewalHeartbeatTimer = null;
  const CHUNK_SIZE = 512 * 1024;
  const LEGACY_ACTION_DELAY_MS = 100;
  const INTERACTION_SETTLE_MS = 200;
  const CATEGORY_OPEN_LOCAL_CONFIRM_MS = 800;
  const CATEGORY_OPEN_LOCAL_RETRY_DELAY_MS = 300;
  const LOCAL_INTERACTION_ATTEMPTS_DEFAULT = 3;
  const LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS = 3;
  const LOCAL_ATTRIBUTE_RETRY_DELAY_MS = 180;
  const SEARCH_KEY_DELAY_MS = 45;
  const SEARCH_SETTLE_MS = 250;
  const IMAGE_PREVIEW_SERVER_TIMEOUT_MS = 20000;
  const IMAGE_PREVIEW_RETRY_DELAY_MS = 1200;
  const IMAGE_PREVIEW_STABLE_MS = 500;
  const IMAGE_PREVIEW_INITIAL_WAIT_MS = 4500;
  const IMAGE_PREVIEW_RETRY_WAIT_MS = 3000;
  const IMAGE_PREVIEW_FALLBACK_WAIT_MS = 5000;
  const IMAGE_PROGRESS_HOLD_MS = 140;
  const LOCAL_PREVIEW_URLS = new Set();
  let activeCorrelationContext = {};
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const actionText = /^(anzeige aufgeben|veröffentlichen|vorschau|entwurf speichern)$/i;

  globalThis.addEventListener?.('beforeunload', () => {
    for (const url of LOCAL_PREVIEW_URLS) URL.revokeObjectURL(url);
    LOCAL_PREVIEW_URLS.clear();
  });

  function extractPlatformErrorCode(...values) {
    for (const value of values) {
      const match = String(value || '').match(/(?:^|\D)([45]\d{2})(?:\D|$)/);
      if (match) return Number(match[1]);
    }
    return null;
  }

  function classifyPlatformErrorPage({ pathname = '', title = '', heading = '' } = {}) {
    const path = String(pathname || '');
    const combined = `${path} ${title || ''} ${heading || ''}`;
    const errorCode = extractPlatformErrorCode(combined);
    const knownPath = path === INSERTION_ERROR_PATH;
    const semanticErrorPath = /(?:fehler|error)/i.test(path) && (/(?:anzeige|aufgeben|inser)/i.test(path) || Boolean(errorCode));
    const strongDocumentMarker = Boolean(errorCode) && /(?:fehler|error|bad request|internal server error|service unavailable|gateway timeout)/i.test(`${title || ''} ${heading || ''}`);
    return {
      isError: knownPath || semanticErrorPath || strongDocumentMarker,
      errorCode: knownPath || semanticErrorPath || strongDocumentMarker ? errorCode : null,
      reason: knownPath ? 'known-insertion-error-path' : semanticErrorPath ? 'semantic-error-path' : strongDocumentMarker ? 'http-error-document' : null
    };
  }

  function pageKindFromPath(pathname) {
    if (pathname === TARGET_PATH) return 'target';
    if (pathname === CATEGORY_PATH) return 'category';
    if (pathname === INSERTION_ERROR_PATH) return 'platform-error';
    if (/^\/m-bestellung-aufnehmen\.html$/i.test(String(pathname || ''))) return 'paid-insertion-checkout';
    if (/^\/p-anzeige-aufgeben(?:-[^/]+)?\.html$/i.test(String(pathname || ''))) return 'post-fill';
    return null;
  }

  function pageKind() {
    if (!location.hostname.endsWith('kleinanzeigen.de')) return null;
    const heading = clean(document.querySelector('h1,[role="heading"]')?.textContent || '');
    const classified = classifyPlatformErrorPage({ pathname: location.pathname, title: document.title || '', heading });
    if (classified.isError) return 'platform-error';
    return pageKindFromPath(location.pathname);
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

  function armMassRenewalHeartbeat(fillId = null) {
    if (massRenewalHeartbeatTimer) return;
    const tick = () => {
      runtimeMessage({ type: 'MASS_RENEWAL_WATCHDOG_TICK', fillId: fillId || null }).catch(() => null);
    };
    tick();
    massRenewalHeartbeatTimer = setInterval(tick, MASS_RENEWAL_HEARTBEAT_MS);
    globalThis.addEventListener?.('beforeunload', () => {
      if (massRenewalHeartbeatTimer) clearInterval(massRenewalHeartbeatTimer);
      massRenewalHeartbeatTimer = null;
    }, { once: true });
  }

  function diagnostic(fillId, event, details = {}, severity = 'info') {
    return runtimeMessage({
      type: 'LOG_DIAGNOSTIC_EVENT', severity, event, module: 'template-filler', operation: 'template-fill',
      context: { ...activeCorrelationContext, fillId: fillId || activeCorrelationContext.fillId || null }, details
    }).catch(() => null);
  }

  function visible(element) {
    if (!element?.isConnected) return false;
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function visibleText(element) {
    if (!element) return '';
    const clone = element.cloneNode(true);
    for (const hidden of clone.querySelectorAll('.sr-only,[aria-hidden="true"],[hidden]')) hidden.remove();
    return clean(clone.textContent || clone.value || '');
  }

  async function waitFor(getter, { timeout = 15000, interval = 120, description = 'Element' } = {}) {
    const deadline = Date.now() + timeout;
    let lastError = null;
    while (Date.now() < deadline) {
      try {
        const value = getter();
        if (value) return value;
      } catch (error) {
        lastError = error;
      }
      await sleep(interval);
    }
    throw lastError || new Error(`${description} wurde nicht rechtzeitig verfügbar.`);
  }

  const TemplateCategoryFlow = KRDeps.require('KRTemplateCategoryFlow').create({
    CATEGORY_PATH, LEGACY_ACTION_DELAY_MS, INTERACTION_SETTLE_MS, CATEGORY_OPEN_LOCAL_CONFIRM_MS,
    CATEGORY_OPEN_LOCAL_RETRY_DELAY_MS, LOCAL_INTERACTION_ATTEMPTS_DEFAULT, clean, sleep, actionText,
    runtimeMessage, diagnostic, visible, visibleText, waitFor, updatePanel
  });
  const {
    resolveCategoryNavigationUrl, normalizeLocalInteractionAttempts, settleAfterInteraction, setCategory,
    normalizeWizardLabel, matchWizardAttributeColumn, deepestVisibleCategoryPathIndex, legacyActionWaitMs,
    runLegacyCategorySelection
  } = TemplateCategoryFlow;

  const TemplateFormFields = KRDeps.require('KRTemplateFormFields').create({
    Form, SEARCH_KEY_DELAY_MS, SEARCH_SETTLE_MS, LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS,
    LOCAL_ATTRIBUTE_RETRY_DELAY_MS, clean, sleep, actionText, diagnostic, visible, visibleText, waitFor
  });
  const {
    setTextField, checkedRadio, chooseRadio, createPageConfig, inferShippingPackageSize,
    fillDynamicAttributes, fillShipping, fillPriceType, fillBuyNow, fillLocation
  } = TemplateFormFields;

  const { uploadImages } = KRDeps.require('KRTemplateImageUpload').create({
    CHUNK_SIZE, IMAGE_PREVIEW_SERVER_TIMEOUT_MS, IMAGE_PREVIEW_RETRY_DELAY_MS, IMAGE_PREVIEW_STABLE_MS,
    IMAGE_PREVIEW_INITIAL_WAIT_MS, IMAGE_PREVIEW_RETRY_WAIT_MS, IMAGE_PREVIEW_FALLBACK_WAIT_MS,
    IMAGE_PROGRESS_HOLD_MS, LOCAL_PREVIEW_URLS, sleep, runtimeMessage, diagnostic, visible, waitFor, updatePanel
  });

  const { verify, verifyArchiveTemplate } = KRDeps.require('KRTemplateVerification').create({ checkedRadio });
  // Legacy test harnesses may not load the new runtime modules. Runtime behavior
  // remains fail-closed: the filler will not proceed if this gate is unavailable.
  const SchemaCore = KRDeps?.optional?.('KRTemplateSchemaCore');
  const PreflightFactory = KRDeps?.optional?.('KRTemplateSchemaPreflight');
  const SchemaPreflight = SchemaCore && PreflightFactory?.create
    ? PreflightFactory.create({ Schema: SchemaCore, Form, waitFor, documentRoot: () => document })
    : null;

  const {
    armPublishDetection, scrollToPublishButton, paidInsertionDetection, stopForPaidInsertion,
    autoPublishVerifiedRenewal, advanceAfterVerifiedFill
  } = KRDeps.require('KRTemplatePublishFlow').create({
    PaidInsertionGuard, clean, sleep, runtimeMessage, diagnostic, visible, visibleText, waitFor, updatePanel
  });

  let panelTemplateOnly = false;
  let panelArchiveInsertion = false;

  function ensurePanel() {
    let panel = document.getElementById('kr-template-fill-status');
    if (panel) return panel;
    panel = document.createElement('aside');
    panel.id = 'kr-template-fill-status';
    panel.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483647;width:min(380px,calc(100vw - 36px));padding:14px 42px 14px 16px;border-radius:12px;background:#101417;color:#f3f5f5;box-shadow:0 12px 36px rgba(0,0,0,.35);font:13px/1.45 system-ui,sans-serif;border:1px solid #354044';
    document.documentElement.append(panel);
    return panel;
  }

  function updatePanel(title, text, issues = [], options = {}) {
    const panel = ensurePanel();
    panel.style.display = 'block';
    panel.replaceChildren();
    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Rückmeldung ausblenden');
    close.textContent = '×';
    close.style.cssText = 'position:absolute;top:7px;right:9px;width:28px;height:28px;border:0;border-radius:7px;background:transparent;color:#aeb8bc;font:700 22px/1 system-ui,sans-serif;cursor:pointer';
    close.addEventListener('click', () => { panel.style.display = 'none'; });
    const strong = document.createElement('strong');
    strong.textContent = title;
    strong.style.display = 'block';
    strong.style.marginBottom = '5px';
    const p = document.createElement('div');
    p.textContent = text;
    p.style.color = '#c4ced1';
    panel.append(close, strong, p);
    if (issues.length) {
      const ul = document.createElement('ul');
      ul.style.cssText = 'margin:8px 0 0;padding-left:18px;color:#f2c96d;max-height:170px;overflow:auto';
      for (const issue of issues.slice(0, 12)) {
        const li = document.createElement('li');
        li.textContent = issue;
        ul.append(li);
      }
      panel.append(ul);
    }
    if (options.safetyText !== false && (!panelTemplateOnly || options.showTemplateOnlySafety === true)) {
      const safety = document.createElement('div');
      safety.textContent = typeof options.safetyText === 'string'
        ? options.safetyText
        : (panelTemplateOnly
          ? 'Nicht veröffentlicht – bitte alle Angaben prüfen und selbst veröffentlichen.'
          : panelArchiveInsertion
            ? 'ZIP-Neu-Inserat läuft – die Anzeige wird anschließend automatisch veröffentlicht und geprüft.'
            : 'Austausch läuft – die Anzeige wird anschließend veröffentlicht und geprüft.');
      safety.style.cssText = 'margin-top:8px;color:#77e8ca;font-weight:700';
      panel.append(safety);
    }
  }

  async function runPostFillSession(session) {
    const { fillId } = session;
    void diagnostic(fillId, 'POST_FILL_PAGE_READY', { path: location.pathname, stage: session.stage || null });
    return await autoPublishVerifiedRenewal(session);
  }

  function resolveActivePostingForm(formHint = null) {
    const titleSelector = 'input[name="title"]';
    const hintedTitle = formHint?.querySelector?.(titleSelector) || null;
    if (hintedTitle && hintedTitle.isConnected !== false && !hintedTitle.disabled && visible(hintedTitle)) return formHint;
    const forms = [...document.querySelectorAll('form')];
    const visibleForms = forms.filter(candidate => {
      const title = candidate?.querySelector?.(titleSelector) || null;
      return Boolean(title && title.isConnected !== false && !title.disabled && visible(title));
    });
    return visibleForms.at(-1) || forms.find(candidate => candidate?.querySelector?.(titleSelector)) || formHint || document.querySelector('form');
  }

  function titleReadbackEvidence(expected, actual, form) {
    const candidates = [...document.querySelectorAll('input[name="title"]')];
    const visibleCandidates = candidates.filter(candidate => candidate.isConnected !== false && !candidate.disabled && visible(candidate));
    return {
      expected: String(expected ?? '').slice(0, 180),
      actual: String(actual ?? '').slice(0, 180),
      expectedLength: String(expected ?? '').length,
      actualLength: String(actual ?? '').length,
      candidateCount: candidates.length,
      visibleCandidateCount: visibleCandidates.length,
      formConnected: form?.isConnected !== false
    };
  }

  async function ensureStableTitleValue(fillId, expectedValue, phase, formHint = null, forceWrite = false) {
    const expected = String(expectedValue ?? '');
    let currentForm = resolveActivePostingForm(formHint);
    let lastActual = null;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      currentForm = resolveActivePostingForm(currentForm);
      const field = currentForm?.querySelector?.('input[name="title"]') || null;
      if (!field) throw new Error('Titelfeld fehlt.');
      const before = String(field.value ?? '');
      if (!forceWrite && before === expected) {
        if (phase !== 'pre-verification') return currentForm;
        await settleAfterInteraction(fillId, 'title-pre-verification-stability');
        currentForm = resolveActivePostingForm(null);
        const stableField = currentForm?.querySelector?.('input[name="title"]') || null;
        lastActual = stableField ? String(stableField.value ?? '') : null;
        if (lastActual === expected) return currentForm;
        void diagnostic(fillId, 'TEMPLATE_TITLE_READBACK_MISMATCH', {
          phase, attempt: 0, ...titleReadbackEvidence(expected, lastActual, currentForm)
        }, 'warning');
      }
      setTextField(currentForm?.querySelector?.('input[name="title"]') || field, expected);
      await settleAfterInteraction(fillId, `title-${phase}-${attempt}`);
      currentForm = resolveActivePostingForm(null);
      const readbackField = currentForm?.querySelector?.('input[name="title"]') || null;
      lastActual = readbackField ? String(readbackField.value ?? '') : null;
      if (lastActual === expected && phase === 'pre-verification') {
        await settleAfterInteraction(fillId, `title-${phase}-${attempt}-confirm`);
        currentForm = resolveActivePostingForm(null);
        const confirmedField = currentForm?.querySelector?.('input[name="title"]') || null;
        lastActual = confirmedField ? String(confirmedField.value ?? '') : null;
      }
      if (lastActual === expected) {
        if (attempt > 1 || before !== expected) {
          void diagnostic(fillId, 'TEMPLATE_TITLE_READBACK_CONFIRMED', { phase, attempt, repaired: attempt > 1 });
        }
        return currentForm;
      }
      void diagnostic(fillId, 'TEMPLATE_TITLE_READBACK_MISMATCH', {
        phase,
        attempt,
        ...titleReadbackEvidence(expected, lastActual, currentForm)
      }, attempt < maxAttempts ? 'warning' : 'error');
      forceWrite = true;
    }
    throw new Error(`Titelfeld blieb nach ${maxAttempts} Versuchen instabil.`);
  }

  async function stopForSchemaPreflight(session, issues, report = null) {
    const unique = [...new Set(issues.map(String))];
    updatePanel('Formular wurde geändert – Neu-Einstellen angehalten',
      'Nicht alle gespeicherten Merkmale lassen sich sicher übernehmen. Die bisherige Anzeige bleibt erhalten.',
      unique, { safetyText: 'Nicht veröffentlicht. Bitte Vorlage neu erfassen oder Merkmale manuell prüfen.' });
    void diagnostic(session.fillId, 'TEMPLATE_SCHEMA_PREFLIGHT_BLOCKED', {
      status: report?.comparison?.status || 'unresolved',
      oldFingerprint: report?.sourceFingerprint || null,
      newFingerprint: report?.currentFingerprint || null,
      changes: (report?.comparison?.changes || []).map(change => ({
        type: change.type, key: change.key || null,
        before: typeof change.before === 'string' ? change.before : null,
        after: typeof change.after === 'string' ? change.after : null
      })).slice(0, 80),
      issueCount: unique.length,
      issueTypes: unique.map(value => value.slice(0, 220)).slice(0, 30)
    }, 'warning');
    await runtimeMessage({ type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId: session.fillId,
      status: 'needs-review', stage: 'schema-preflight',
      result: { complete: false, issues: unique.slice(0, 50) } });
    return { complete: false, issues: unique, schemaPreflightBlocked: true };
  }


  // KAR-134 field-only native simulation. No listing content, image upload,
  // wizard continuation, submit or source mutation is permitted in this path.
  async function runReadOnlySchemaTest(session) {
    const scenario = session.schemaTestScenario;
    if (!['compatible', 'incompatible'].includes(scenario) ||
        String(session.template?.categoryId || '') !== '405' || !SchemaCore || !SchemaPreflight)
      throw new Error('Schema-Prüfmodus ist nicht verfügbar oder die Kategorie stimmt nicht.');
    const fillId = session.fillId;
    updatePanel('Schema-Prüfmodus (nur Lesen)', 'Kategorie 405 wird für den Vergleich vorbereitet. Es werden keine Anzeigenwerte eingetragen und keine Anzeigen veröffentlicht.', [],
      { safetyText: 'TESTMODUS – Formular ausschließlich prüfen, nicht veröffentlichen.' });
    await runtimeMessage({ type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId, status: 'running', stage: 'schema-test-category' });
    const categoryState = await setCategory(session.template, fillId, session?.maxPhaseAttempts);
    if (categoryState?.pendingNavigation) return { pending: true, schemaTest: true };
    const live = await SchemaPreflight.afterHydration({ categoryId: '405', dynamicAttributes: [] });
    if (live.categoryId !== '405') throw new Error('Live-Kategorie 405 wurde nicht bestätigt.');
    const caseField = live.schema.fields.find(field => field.key === 'attribute:wearables.case_size');
    const focused = {
      ...live,
      schema: { ...live.schema, fields: caseField ? [caseField] : [] }
    };
    // Synthetic historical schema, not an actual saved archive capture.
    // Never load, modify or persist the source listing values.
    const snapshot = SchemaCore.buildSchema({ categoryId: '405', dynamicAttributes: [
      { key: 'wearables.gehausegrosse', controlType: 'number', requiredState: 'unknown' }
    ] });
    const fingerprint = await SchemaCore.fingerprint(snapshot);
    const knownValues = new Set(caseField?.optionValues || []);
    let rejectedValue = '__KAR134_UNREPRESENTABLE_CASE_SIZE__';
    while (knownValues.has(rejectedValue)) rejectedValue += '_';
    const simulated = {
      categoryId: '405',
      templateSchema: { snapshot, fingerprint },
      dynamicAttributes: [{
        key: 'wearables.gehausegrosse', label: 'Gehäusegröße (synthetischer Test)',
        technicalValue: scenario === 'compatible' ? '44' : rejectedValue,
        displayValue: scenario === 'compatible' ? '44mm' : '(absichtlich ungültiger Testwert)',
        status: 'captured'
      }]
    };
    const report = await SchemaPreflight.evaluate(simulated, focused);
    const label44Proven = report.mappings.some(item =>
      item.oldKey === 'wearables.gehausegrosse' &&
      item.newKey === 'wearables.case_size' &&
      item.technicalValue === '44' && item.expectedDisplayLabel === '44mm');
    const compatible = report.complete && label44Proven;
    const verdict = scenario === 'compatible' ? compatible : !report.complete;
    const issues = verdict ? [] : (scenario === 'compatible'
      ? [...report.issues, 'Das aktuelle Formular bestätigt 44 / 44mm nicht eindeutig.']
      : ['Der absichtlich ungültige Testwert wurde nicht erwartungsgemäß gesperrt.']);
    const actualFullFingerprint = await SchemaCore.fingerprint(live.schema);
    void diagnostic(fillId, 'KAR134_SCHEMA_TEST_RESULT', {
      scenario, verdict, mode: 'read-only', scope: 'category-405-case-size-only',
      remotePublishAttempted: false, archivedValuesRead: false,
      syntheticOldFingerprint: fingerprint, actualFullFingerprint,
      focusedCurrentFingerprint: report.currentFingerprint,
      detectedChangeTypes: (report.comparison?.changes || []).map(item => item.type).slice(0, 30),
      issueCount: report.issues.length, mappedCaseSize44mm: label44Proven
    }, verdict ? 'info' : 'warning');
    await runtimeMessage({
      type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId,
      status: verdict ? 'complete' : 'needs-review',
      stage: verdict ? 'schema-test-' + scenario : 'schema-test-unexpected',
      result: { complete: verdict, issues: issues.slice(0, 50) }
    });
    updatePanel(
      verdict ? 'Schema-Prüfmodus: Test bestanden' : 'Schema-Prüfmodus: Prüfung fehlgeschlagen',
      scenario === 'compatible'
        ? (verdict ? 'Das aktuelle Formular bietet den technischen Wert 44 mit der sichtbaren Auswahl 44mm eindeutig an.' : 'Die aktuelle Auswahl 44 / 44mm konnte nicht nachgewiesen werden.')
        : (verdict ? 'Der absichtlich nicht darstellbare Testwert wurde sicher abgewiesen.' : 'Der Testfall wurde nicht erwartungsgemäß abgewiesen.'),
      verdict ? [] : issues,
      { safetyText: 'TEST ABGESCHLOSSEN – keine Werte übertragen, keine Bilder hochgeladen, keine Anzeige veröffentlicht. Dies ist nur eine Feldsimulation, keine vollständige Abnahme.' }
    );
    return { schemaTest: true, scenario, verdict, publishTriggered: false, issues };
  }

  async function runFillSession(session) {
    const { fillId, template } = session;
    const issues = [];
    updatePanel('Anzeige wird ausgefüllt', 'Die gespeicherten Angaben werden in die neue Anzeige übernommen …');
    void diagnostic(fillId, 'TEMPLATE_FILL_EXECUTION_STARTED', { sourceAdId: template.sourceAdId || null, inventoryId: template.inventoryId || null });
    await runtimeMessage({ type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId, status: 'running', stage: 'form-ready' });

    let form = await waitFor(() => document.querySelector('form'), { timeout: 15000, description: 'Neues Anzeigenformular' });
    if (template.adType?.value && !chooseRadio('adType', template.adType.value)) issues.push('Gebot/Gesuch konnte nicht übernommen werden.');
    try {
      form = await ensureStableTitleValue(fillId, template.title || '', 'initial', form, true);
    } catch (error) { issues.push(`Titel: ${error.message}`); }

    let categoryState = null;
    try {
      categoryState = await setCategory(template, fillId, session?.maxPhaseAttempts);
    } catch (error) {
      issues.push(`Kategorie: ${error.message}`);
    }
    if (categoryState?.pendingNavigation) return { pending: true, issues };
    // React may replace the entire posting form after the modal category commit.
    if (categoryState?.confirmed) form = resolveActivePostingForm(form);
    const paidAfterCategory = paidInsertionDetection();
    if (paidAfterCategory.required) return await stopForPaidInsertion(session, paidAfterCategory, 'after-category');

    let schemaPreflightReport = null;
    if (String(form.querySelector('input[name="categoryId"]')?.value || '') === String(template.categoryId || '')) {
      try {
        if (!SchemaPreflight) throw new Error('Die Formularschema-Sicherheitsprüfung ist nicht verfügbar.');
        const live = await SchemaPreflight.afterHydration(template);
        schemaPreflightReport = await SchemaPreflight.evaluate(template, live);
        void diagnostic(fillId, 'TEMPLATE_SCHEMA_PREFLIGHT', {
          status: schemaPreflightReport.comparison?.status || 'unresolved',
          oldFingerprint: schemaPreflightReport.sourceFingerprint,
          newFingerprint: schemaPreflightReport.currentFingerprint,
          changes: (schemaPreflightReport.comparison?.changes || []).map(change => ({
            type: change.type, key: change.key || null
          })).slice(0, 80),
          mapped: schemaPreflightReport.mappings.map(item => ({ from: item.oldKey, to: item.newKey })),
          legacy: schemaPreflightReport.comparison?.status === 'legacy-unversioned',
          issueCount: schemaPreflightReport.issues.length
        }, schemaPreflightReport.complete ? 'info' : 'warning');
        if (!schemaPreflightReport.complete)
          return await stopForSchemaPreflight(session, schemaPreflightReport.issues, schemaPreflightReport);
      } catch (error) {
        return await stopForSchemaPreflight(session, [
          'Kategorieabhängige Felder konnten nicht sicher geprüft werden: ' + String(error.message || error).slice(0, 250)
        ]);
      }
      const attributeIssues = await fillDynamicAttributes(template, fillId);
      issues.push(...attributeIssues);
      void diagnostic(fillId, 'TEMPLATE_DYNAMIC_ATTRIBUTES_FINISHED', { configured: (template.dynamicAttributes || []).length, issueCount: attributeIssues.length }, attributeIssues.length ? 'warning' : 'info');
      const shippingIssues = await fillShipping(template);
      issues.push(...shippingIssues);
      void diagnostic(fillId, 'TEMPLATE_SHIPPING_FINISHED', { issueCount: shippingIssues.length }, shippingIssues.length ? 'warning' : 'info');
      const buyNowIssues = await fillBuyNow(template);
      issues.push(...buyNowIssues);
      void diagnostic(fillId, 'TEMPLATE_BUY_NOW_FINISHED', { issueCount: buyNowIssues.length }, buyNowIssues.length ? 'warning' : 'info');
    } else {
      issues.push('Kategorieabhängige Merkmale wurden nicht gesetzt, weil die Kategorie nicht bestätigt wurde.');
    }

    try { setTextField(form.querySelector('textarea[name="description"]'), template.description || ''); await settleAfterInteraction(fillId, 'description'); void diagnostic(fillId, 'TEMPLATE_DESCRIPTION_SET', { length: String(template.description || '').length }); } catch (error) { issues.push(`Beschreibung: ${error.message}`); void diagnostic(fillId, 'TEMPLATE_DESCRIPTION_FAILED', { message: error.message }, 'warning'); }
    try { setTextField(form.querySelector('input[name="priceAmount"]'), template.price?.value || ''); await settleAfterInteraction(fillId, 'price'); void diagnostic(fillId, 'TEMPLATE_PRICE_SET', { hasValue: Boolean(template.price?.value) }); } catch (error) { issues.push(`Preis: ${error.message}`); void diagnostic(fillId, 'TEMPLATE_PRICE_FAILED', { message: error.message }, 'warning'); }
    const priceTypeIssues = await fillPriceType(template);
    issues.push(...priceTypeIssues);
    void diagnostic(fillId, 'TEMPLATE_PRICE_TYPE_FINISHED', { issueCount: priceTypeIssues.length }, priceTypeIssues.length ? 'warning' : 'info');
    const locationIssues = await fillLocation(template);
    issues.push(...locationIssues);
    void diagnostic(fillId, 'TEMPLATE_LOCATION_FINISHED', { issueCount: locationIssues.length }, locationIssues.length ? 'warning' : 'info');

    await runtimeMessage({ type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId, status: 'running', stage: 'images' });
    const imageOutcome = await uploadImages(fillId, template);
    issues.push(...imageOutcome.issues);
    let verificationForm = resolveActivePostingForm(null);
    try {
      verificationForm = await ensureStableTitleValue(fillId, template.title || '', 'pre-verification', verificationForm, false);
    } catch (error) {
      issues.push(`Titel: ${error.message}`);
      const actual = verificationForm?.querySelector?.('input[name="title"]')?.value ?? null;
      void diagnostic(fillId, 'TEMPLATE_TITLE_STABILIZATION_FAILED', {
        ...titleReadbackEvidence(template.title || '', actual, verificationForm)
      }, 'error');
    }
    issues.push(...(session.archiveInsertionId ? verifyArchiveTemplate(template, verificationForm) : verify(template, verificationForm)));
    if (schemaPreflightReport) {
      try {
        const finalObserved = SchemaPreflight.inspectForm(verificationForm, template.categoryId);
        issues.push(...SchemaPreflight.verifyAfterFill(schemaPreflightReport, finalObserved));
      } catch (error) {
        issues.push('Formularschema konnte nach dem Ausfüllen nicht erneut bestätigt werden: ' + String(error.message || error).slice(0, 240));
      }
    } else {
      issues.push('Formularschema-Vorprüfung wurde nicht erfolgreich abgeschlossen.');
    }

    const uniqueIssues = [...new Set(issues)];
    const imagesComplete = imageOutcome.complete === true;
    const complete = uniqueIssues.length === 0 && imagesComplete;
    updatePanel(
      complete ? 'Vorlage vollständig übernommen' : 'Vorlage übernommen – Prüfung nötig',
      complete ? 'Alle kontrollierten Vorlagenwerte stimmen mit dem neuen Formular überein.' : `${uniqueIssues.length} Punkt(e) konnten nicht eindeutig bestätigt werden.`,
      uniqueIssues
    );
    void diagnostic(fillId, 'TEMPLATE_FILL_VERIFIED', { complete, issueCount: uniqueIssues.length, imagesComplete, imageStates: imageOutcome.states?.map(state => ({ index: state.index, status: state.status })) || [] }, complete ? 'info' : 'warning');
    const schemaPreflight = complete && schemaPreflightReport
      ? { verified: true, categoryId: String(template.categoryId),
          sourceFingerprint: schemaPreflightReport.sourceFingerprint,
          currentFingerprint: schemaPreflightReport.currentFingerprint }
      : null;
    const verifiedResult = { complete, issues: uniqueIssues.slice(0, 50), schemaPreflight };
    await runtimeMessage({
      type: 'UPDATE_TEMPLATE_FILL_SESSION',
      fillId,
      status: complete ? 'running' : 'needs-review',
      stage: complete ? 'form-verified' : 'verified',
      result: verifiedResult
    });
    if (complete) {
      const continuation = await advanceAfterVerifiedFill({ fillId, renewalId: session.renewalId || null, templateOnly: Boolean(session.templateOnly), archiveInsertionId: session.archiveInsertionId || null, trashInventoryId: session.trashInventoryId || null, stage: 'form-verified', result: verifiedResult });
      return { complete, issues: uniqueIssues, ...continuation };
    }
    return { complete, issues: uniqueIssues };
  }

  async function runPendingFill() {
    armMassRenewalHeartbeat();
    const kind = pageKind();
    if (!kind) return null;
    const session = await runtimeMessage({ type: 'GET_TEMPLATE_FILL_SESSION' }).catch(() => null);
    if (!session) {
      activeCorrelationContext = {};
      panelTemplateOnly = false;
      panelArchiveInsertion = false;
      return null;
    }
    activeCorrelationContext = {
      operationId: session.operationId || null,
      parentOperationId: session.parentOperationId || null,
      renewalId: session.renewalId || null,
      fillId: session.fillId || null,
      archiveInsertionId: session.archiveInsertionId || null
    };
    panelTemplateOnly = Boolean(session.templateOnly);
    panelArchiveInsertion = Boolean(session.archiveInsertionId);
    try {
      // Test mode runs before all filling, continuation and publication branches.
      if (session.schemaTestScenario) {
        if (kind === 'category') return await runLegacyCategorySelection(session);
        if (kind !== 'target') throw new Error('Schema-Test: unerwartete Formularseite.');
        return await runReadOnlySchemaTest(session);
      }
      if (kind === 'paid-insertion-checkout') {
        const detection = paidInsertionDetection();
        if (detection.required) return await stopForPaidInsertion(session, detection, 'checkout-page');
      }
      if (kind === 'platform-error') {
        const heading = clean(document.querySelector('h1,[role="heading"]')?.textContent || '');
        const classified = classifyPlatformErrorPage({ pathname: location.pathname, title: document.title || '', heading });
        const codeText = classified.errorCode ? ` (Fehler ${classified.errorCode})` : '';
        const issue = `Kleinanzeigen hat beim Erstellen der neuen Anzeige eine Fehlerseite geöffnet${codeText}.`;
        void diagnostic(session.fillId, 'KLEINANZEIGEN_ERROR_PAGE_DETECTED', {
          path: location.pathname, errorCode: classified.errorCode || null, detectionReason: classified.reason || null,
          title: clean(document.title || '').slice(0, 180), heading: heading.slice(0, 180),
          previousStage: String(session.stage || '') || null
        }, 'error');
        updatePanel('Kleinanzeigen-Fehler erkannt', 'Der Inserierungsvorgang wurde sicher angehalten. Die bisherige Anzeige bleibt unverändert.', [issue]);
        await runtimeMessage({
          type: 'UPDATE_TEMPLATE_FILL_SESSION',
          fillId: session.fillId,
          status: 'error',
          stage: 'platform-error-page',
          result: { complete: false, issues: [issue] }
        });
        return { complete: false, issues: [issue], platformError: true };
      }
      if (kind === 'category') return await runLegacyCategorySelection(session);
      if (kind === 'post-fill' || ['post-fill-continuing', 'awaiting-publish', 'awaiting-manual-publish', 'auto-publish-ready'].includes(String(session.stage || ''))) {
        return await runPostFillSession(session);
      }
      if (kind === 'target' && session.stage === 'form-verified') {
        return await advanceAfterVerifiedFill(session);
      }
      if (kind === 'target' && session.stage === 'awaiting-manual-continue') {
        updatePanel('Vorlage vollständig übernommen', 'Bitte den nächsten Schritt über „Weiter“ öffnen. Danach wird der Ablauf automatisch fortgesetzt.', [], { safetyText: 'Automatischer Ablauf pausiert – bitte den nächsten Schritt prüfen.' });
        return { manualContinue: true };
      }
      return await runFillSession(session);
    } catch (error) {
      void diagnostic(session.fillId, 'TEMPLATE_FILL_EXCEPTION', { message: String(error.message || error).slice(0, 500), stack: String(error.stack || '').slice(0, 2400), pageKind: kind }, 'error');
      updatePanel('Vorlage konnte nicht vollständig übernommen werden', 'Bitte prüfe den aktuellen Stand. Weitere Einzelheiten stehen in den Diagnosedaten.', ['Die Anzeige wurde nicht automatisch veröffentlicht.']);
      await runtimeMessage({
        type: 'UPDATE_TEMPLATE_FILL_SESSION',
        fillId: session.fillId,
        status: 'error',
        stage: kind === 'category' ? 'category-failed' : 'failed',
        result: { complete: false, issues: [error.message] }
      }).catch(() => {});
      return { complete: false, issues: [error.message] };
    }
  }

  const API = Object.freeze({
    TARGET_PATH,
    CATEGORY_PATH,
    INSERTION_ERROR_PATH,
    INTERACTION_SETTLE_MS,
    CATEGORY_OPEN_LOCAL_CONFIRM_MS,
    CATEGORY_OPEN_LOCAL_RETRY_DELAY_MS,
    normalizeLocalInteractionAttempts,
    LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS,
    resolveCategoryNavigationUrl,
    deepestVisibleCategoryPathIndex,
    LEGACY_ACTION_DELAY_MS,
    legacyActionWaitMs,
    normalizeWizardLabel,
    matchWizardAttributeColumn,
    createPageConfig,
    inferShippingPackageSize,
    scrollToPublishButton,
    showFeedback: updatePanel,
    armPublishDetection,
    runPendingFill
  });
  globalThis.KRDeps?.register?.('KRTemplateFill', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
