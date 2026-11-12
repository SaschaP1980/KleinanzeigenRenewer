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

  let stagedCategoryPathEvidence = null;
  let stageMonitorWarnings = [];

  const TemplateCategoryFlow = KRDeps.require('KRTemplateCategoryFlow').create({
    CATEGORY_PATH, LEGACY_ACTION_DELAY_MS, INTERACTION_SETTLE_MS, CATEGORY_OPEN_LOCAL_CONFIRM_MS,
    CATEGORY_OPEN_LOCAL_RETRY_DELAY_MS, LOCAL_INTERACTION_ATTEMPTS_DEFAULT, clean, sleep, actionText,
    runtimeMessage, diagnostic, visible, visibleText, waitFor, updatePanel,
    onCategoryPathConfirmed: evidence => { stagedCategoryPathEvidence = evidence; }
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

  function renderSchemaMonitorWarnings(panel) {
    panel.querySelector('#kr134-schema-monitor-warnings')?.remove();
    if (!stageMonitorWarnings.length) return;
    const region = document.createElement('div');
    region.id = 'kr134-schema-monitor-warnings';
    region.setAttribute('role', 'status');
    region.style.cssText = 'margin-top:10px;padding:8px;border-radius:6px;border:1px solid #b38b36;color:#ffdb8c;background:#372e17;font-size:12px';
    const heading = document.createElement('strong');
    heading.textContent = 'Hinweis zur Formularstruktur';
    region.append(heading);
    const list = document.createElement('ul');
    list.style.cssText = 'margin:5px 0 0;padding-left:17px';
    for (const message of stageMonitorWarnings.slice(0, 4)) {
      const item = document.createElement('li');
      item.textContent = message;
      list.append(item);
    }
    region.append(list);
    panel.append(region);
  }
  function registerSchemaMonitorWarning(message) {
    const safe = String(message || '').slice(0, 320);
    if (!safe || stageMonitorWarnings.includes(safe)) return;
    stageMonitorWarnings = [...stageMonitorWarnings, safe].slice(0, 4);
    const panel = document.getElementById('kr-template-fill-status');
    if (panel) renderSchemaMonitorWarnings(panel);
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
    renderSchemaMonitorWarnings(panel);
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


  // KAR-134 native probe: negative tests only pass on a specific, technically
  // proven invalid option. A missing/unhydrated option catalog is inconclusive,
  // never a successful rejection. This policy cannot authorize publication.
  function assessSyntheticCaseSize(scenario, observed, report, rejectedValue) {
    if (!['compatible', 'incompatible'].includes(scenario))
      throw new Error('Unbekanntes synthetisches Gehäusegrößen-Prüfszenario.');
    const candidates = (observed?.schema?.fields || []).filter(field =>
      field.key === 'attribute:wearables.case_size');
    const field = candidates.length === 1 ? candidates[0] : null;
    const values = Array.isArray(field?.optionValues) ? field.optionValues : null;
    const optionEvidenceComplete = Array.isArray(values) && values.length > 0;
    const labels = observed?.optionLabels?.['wearables.case_size'];
    const exact44mmMatches = Array.isArray(labels)
      ? labels.filter(item => item?.value === '44' && item?.label === '44mm').length : 0;
    const technical44Offered = optionEvidenceComplete && values.includes('44');
    const ownerVerifiedPair44 = observed?.optionProbe?.reason === 'owner-confirmed-case-size-pairs' &&
      observed.optionProbe.ownerVerifiedPairCount === 2 && exact44mmMatches === 1;
    const mapped44 = (report?.mappings || []).filter(item =>
      item.oldKey === 'wearables.gehausegrosse' &&
      item.newKey === 'wearables.case_size' &&
      item.technicalValue === '44' &&
      item.expectedDisplayLabel === '44mm').length === 1;
    const specificInvalidRejectionProven = Boolean(
      optionEvidenceComplete && typeof rejectedValue === 'string' &&
      rejectedValue.length > 0 && !values.includes(rejectedValue) &&
      (report?.issues || []).some(issue => typeof issue === 'string' &&
        issue.includes('Gehäusegröße (synthetischer Test)') &&
        issue.includes('wird im neuen Formular nicht angeboten.')));
    const mapping44Proven = Boolean((technical44Offered || ownerVerifiedPair44) &&
      exact44mmMatches === 1 && mapped44);
    const verdict = scenario === 'compatible'
      ? Boolean(report?.complete === true && mapping44Proven)
      : Boolean(report?.complete === false && specificInvalidRejectionProven);
    const evidenceState = !field ? 'case-size-field-missing'
      : !optionEvidenceComplete && scenario === 'compatible' && mapping44Proven
        ? 'owner-confirmed-case-size-pair'
        : !optionEvidenceComplete ? 'case-size-option-evidence-missing'
        : scenario === 'compatible' && !mapping44Proven ? '44mm-option-not-proven'
          : scenario === 'incompatible' && !specificInvalidRejectionProven ? 'invalid-value-rejection-not-proven'
            : 'proven';
    return Object.freeze({
      verdict, evidenceState, caseFieldPresent: Boolean(field),
      optionEvidenceComplete, optionCount: values?.length || 0,
      technical44Offered: Boolean(technical44Offered),
      ownerVerifiedPair44: Boolean(ownerVerifiedPair44),
      visible44mmProven: exact44mmMatches === 1,
      mapping44Proven, specificInvalidRejectionProven
    });
  }

  // Wave J: the separate native drift simulation proves a missing saved FIELD,
  // never that an unknown technical dropdown value is invalid.
  // The synthetic key is not an observed Kleinanzeigen field removal.
  const SYNTHETIC_REMOVED_FIELD_KEY = 'wearables.__kar134_removed_field_probe__';
  const SYNTHETIC_REMOVED_FIELD_LABEL = 'KAR-134 Testmerkmal (synthetisch)';
  function assessSyntheticRemovedField(observed, report, missingKey, missingLabel) {
    const fields = Array.isArray(observed?.schema?.fields) ? observed.schema.fields : [];
    const categoryConfirmed = observed?.categoryId === '405' && observed?.schema?.categoryId === '405';
    const matches = fields.filter(field => field.key === 'attribute:wearables.case_size');
    const caseField = matches.length === 1 ? matches[0] : null;
    const keyAbsent = fields.every(field => field.key !== 'attribute:' + missingKey);
    const exactIssue = 'Gespeichertes Merkmal „' + missingLabel +
      '“ ist im neuen Formular nicht vorhanden.';
    const specificMissingFieldRejectionProven = Boolean(
      report?.complete === false && report?.comparison?.status === 'schema-changed' &&
      (report?.issues || []).filter(issue => issue === exactIssue).length === 1);
    const optionValues = Array.isArray(caseField?.optionValues) ? caseField.optionValues : null;
    const verdict = Boolean(categoryConfirmed && caseField && keyAbsent &&
      missingKey === SYNTHETIC_REMOVED_FIELD_KEY &&
      missingLabel === SYNTHETIC_REMOVED_FIELD_LABEL &&
      specificMissingFieldRejectionProven);
    const evidenceState = !categoryConfirmed ? 'category-not-confirmed'
      : !caseField ? 'case-size-field-missing'
        : !keyAbsent ? 'synthetic-field-present'
          : !specificMissingFieldRejectionProven ? 'specific-removed-field-rejection-not-proven'
            : 'synthetic-removed-field-proven';
    return Object.freeze({
      verdict, evidenceState, caseFieldPresent: Boolean(caseField),
      optionEvidenceComplete: Boolean(optionValues?.length),
      optionCount: optionValues?.length || 0,
      technical44Offered: Boolean(optionValues?.includes('44')),
      ownerVerifiedPair44: false, visible44mmProven: false,
      mapping44Proven: false, specificInvalidRejectionProven: false,
      syntheticMissingFieldKeyAbsent: keyAbsent,
      missingSavedFieldRejectionProven: verdict
    });
  }

  // KAR-134 K2 monitoring helpers: strictly read-only site structure only.
  // No listing titles, descriptions, account information, field values,
  // images, platform tokens or transient DOM IDs enter the stored snapshots.
  function captureCategoryNeutralForm(form, isVisible = visible, textOf = visibleText) {
    if (!form?.querySelectorAll) return { status: 'form-not-available' };
    const categoryInputs = [...form.querySelectorAll('input[name="categoryId"]')];
    if (categoryInputs.length !== 1) return { status: 'category-control-unverified' };
    const selected = String(categoryInputs[0].value ?? '').trim();
    if (selected && selected !== '0') return { status: 'category-already-selected' };
    if (form.querySelector('[aria-busy="true"]')) return { status: 'form-not-settled' };
    const candidates = [...form.querySelectorAll('button,a')].filter(element =>
      isVisible(element) && /wähle deine kategorie|kategorie ändern/i.test(textOf(element)));
    if (candidates.length > 1) return { status: 'category-chooser-ambiguous' };
    const chooser = candidates.length ? (candidates[0].tagName === 'A' ? 'link' : 'button') : 'missing';
    const groups = new Map();
    for (const element of form.querySelectorAll('input[name],textarea[name],select[name]')) {
      const type = String(element.getAttribute('type') || element.tagName || '').toLowerCase();
      if (['hidden', 'password', 'file'].includes(type) || !isVisible(element)) continue;
      const name = String(element.getAttribute('name') || '');
      // An unsupported visible technical key is incomplete evidence, not
      // authority to fingerprint a convenient but silently partial subset.
      if (!/^[a-zA-Z][a-zA-Z0-9_.:-]{0,127}$/.test(name))
        return { status: 'unsupported-visible-field' };
      const controls = groups.get(name) || [];
      controls.push({ element, type });
      groups.set(name, controls);
    }
    const fields = [];
    for (const [name, controls] of groups) {
      if (controls.length > 1 && !controls.every(control => control.type === 'radio'))
        return { status: 'ambiguous-visible-field' };
      const source = controls[0], isRadio = source.type === 'radio';
      const isSelect = source.element.tagName === 'SELECT';
      fields.push({
        name, visible: true,
        controlType: isRadio ? 'radio' : (source.element.getAttribute('type') ||
          source.element.tagName.toLowerCase()),
        requiredState: controls.some(control => control.element.hasAttribute('required') ||
          control.element.getAttribute('aria-required') === 'true') ? 'required' : 'unknown',
        optionsComplete: isRadio || isSelect,
        options: isRadio ? controls.map(control => ({ value: control.element.value }))
          : isSelect ? [...source.element.querySelectorAll('option')].map(option => ({ value: option.value }))
            : []
      });
    }
    return { status: 'observed',
      schema: SchemaCore.buildBaseSchema({
        formMode: 'posting-create', ready: true, categorySelected: false,
        categoryChooser: chooser, fields
      }) };
  }

  // One independent no-PII baseline per exact observation stage/context.
  // A drift is never auto-accepted as the new reference: the original
  // fingerprint remains available until an explicit future review action.
  async function monitorSchemaStage(stage, snapshot, fillId, {
    storage = chrome.storage?.local, onWarning = registerSchemaMonitorWarning,
    log = diagnostic
  } = {}) {
    const hashFn = stage === 'base' ? SchemaCore.baseFingerprint
      : stage === 'category' ? SchemaCore.categoryFingerprint
        : stage === 'attributes' ? SchemaCore.fingerprint : null;
    const diffFn = stage === 'base' ? SchemaCore.diffBaseSchemas
      : stage === 'category' ? SchemaCore.diffCategorySchemas
        : stage === 'attributes' ? SchemaCore.diff : null;
    if (!hashFn || !diffFn) throw new Error('Unbekannte Schema-Fingerprint-Stufe');
    const categoryId = stage === 'base' ? null : String(snapshot?.categoryId || '');
    if (stage !== 'base' && !/^[1-9][0-9]*$/.test(categoryId))
      throw new Error('Kategorie für den Schema-Monitor nicht eindeutig');
    if (stage === 'category' && (!snapshot.leafConfirmed || !snapshot.observedPath))
      return { status: 'not-observed', currentFingerprint: null };
    const key = 'kr134:stage-monitor:v1:' + stage + ':' +
      (stage === 'base' ? String(snapshot.formMode || '') : categoryId);
    const notices = {
      base: 'Basisformular',
      category: 'Kategoriehierarchie',
      attributes: 'Kategorieformular'
    };
    const label = notices[stage];
    let currentFingerprint = null, previousFingerprint = null;
    const notify = text => { if (typeof onWarning === 'function') onWarning(text); };
    const audit = (status, changes = []) => {
      void Promise.resolve(log(fillId, 'KAR134_STAGE_MONITOR_RESULT', {
        stage, categoryId, status, oldFingerprint: previousFingerprint, newFingerprint: currentFingerprint,
        changeTypes: changes.map(change => change.type).slice(0, 50)
      }, ['changed','uncertain','invalid-reference','monitor-unavailable'].includes(status) ? 'warning' : 'info')).catch(() => {});
      return { status, previousFingerprint, currentFingerprint, changes };
    };
    try {
      currentFingerprint = await hashFn(snapshot);
      if (!storage?.get || !storage?.set) throw new Error('Schema reference store unavailable');
      const loaded = await storage.get(key);
      const saved = loaded?.[key];
      if (saved === undefined) {
        // First observation establishes a reference, NOT evidence of no drift.
        await storage.set({ [key]: { schemaVersion: 1, snapshot, fingerprint: currentFingerprint } });
        return audit('reference-created');
      }
      try {
        if (!saved || saved.schemaVersion !== 1 || !saved.snapshot ||
            !/^[a-f0-9]{64}$/.test(String(saved.fingerprint)) ||
            await hashFn(saved.snapshot) !== saved.fingerprint)
          throw new Error('invalid fingerprint reference');
        previousFingerprint = saved.fingerprint;
        const compare = diffFn(saved.snapshot, snapshot);
        const changes = compare.changes || [];
        const verified = stage === 'base' ? compare.status === 'base-changed'
          : stage === 'category' ? compare.status === 'category-changed'
            : compare.status === 'schema-changed' &&
              changes.some(change => !['option-evidence-uncertain', 'requiredness-uncertain'].includes(change.type));
        const uncertain = stage === 'base' ? compare.status === 'base-evidence-uncertain'
          : stage === 'category' ? compare.status === 'category-evidence-uncertain'
            : compare.status === 'schema-changed' && changes.length > 0 && !verified;
        if (verified) notify(label + ': Kleinanzeigen hat die bestätigte Formular- oder Kategoriestruktur verändert. Bitte die Änderungen prüfen.');
        else if (uncertain) notify(label + ': Eine mögliche Änderung ist nicht eindeutig verifizierbar. Technische Auswahl- oder Kategorieinformationen fehlen.');
        return audit(verified ? 'changed' : uncertain ? 'uncertain'
          : ['category-partially-verified', 'category-not-verified', 'base-not-comparable'].includes(compare.status)
            ? 'not-fully-verified' : 'unchanged', changes);
      } catch (error) {
        notify('Gespeicherte Schema-Referenz für ' + label + ' ist beschädigt oder nicht eindeutig. Änderungen konnten nicht zuverlässig geprüft werden.');
        return audit('invalid-reference');
      }
    } catch (error) {
      notify(label + ': Schema-Referenz konnte nicht geprüft werden (Speicherzugriff fehlgeschlagen).');
      return audit('monitor-unavailable');
    }
  }

  // KAR-134 L2 change review. Only normalized structural diff data enters
  // this view. Acknowledgement explicitly is NOT reference acceptance.
  function buildStageChangeReview(results = {}) {
    const order = [
      ['base', 'F1 – Basisformular'],
      ['category', 'F2 – Kategoriehierarchie'],
      ['attributes', 'F3 – Merkmale']
    ];
    const labels = {
      'reference-created': 'Neue Referenz erfasst', unchanged: 'Keine Änderung festgestellt',
      'not-fully-verified': 'Teilweise verifiziert', changed: 'Strukturänderung nachgewiesen',
      uncertain: 'Änderung nicht eindeutig', 'not-observed': 'Nicht geprüft',
      'monitor-unavailable': 'Vergleich nicht möglich', 'invalid-reference': 'Referenz ungültig'
    };
    const display = value => String(value ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, 110);
    const fieldName = value => display(value).replace(/^(?:attribute:|field:)/, '');
    function explain(stage, change) {
      const type = String(change?.type || '');
      const key = fieldName(change?.key);
      const quoted = key ? '„' + key + '“' : 'ein technisches Feld';
      switch (type) {
        case 'field-added': return { text: 'Neues Feld ' + quoted + ' hinzugefügt.', verified: true };
        case 'field-removed': return { text: 'Feld ' + quoted + ' ist weggefallen.', verified: true };
        case 'control-kind-changed': return {
          text: 'Bedienart für ' + quoted + ' geändert: ' + display(change.before) + ' → ' + display(change.after) + '.',
          verified: true
        };
        case 'requiredness-changed': return {
          text: 'Pflichtstatus von ' + quoted + ' geändert' +
            (change.after === 'required' ? ' (jetzt Pflichtfeld).' :
              change.after === 'optional' ? ' (jetzt optional).' : '.'),
          verified: true
        };
        case 'valid-options-changed': return { text: 'Verfügbare Auswahlmöglichkeiten für ' + quoted + ' geändert.', verified: true };
        case 'category-chooser-changed': return { text: 'Die Art der Kategorieauswahl hat sich geändert.', verified: true };
        case 'leaf-id-changed': return { text: 'Technische Endkategorie-ID hat sich geändert.', verified: true };
        case 'category-depth-changed': return {
          text: 'Anzahl der Kategorieebenen geändert: ' + display(change.before) + ' → ' + display(change.after) + '.',
          verified: true
        };
        case 'ancestor-id-changed': return {
          text: 'Technische Zuordnung der Kategorieebene ' +
            (Number.isInteger(change.level) && change.level >= 0 ? change.level + 1 : '?') + ' geändert.',
          verified: true
        };
        case 'unverified-path-label-changed': return {
          text: 'Bezeichnung einer übergeordneten Kategorie hat sich möglicherweise verändert; ihre technische ID ist nicht belegt.',
          verified: false
        };
        case 'option-evidence-uncertain':
        case 'requiredness-uncertain':
        case 'requiredness-evidence-uncertain': return {
          text: 'Für ' + quoted + ' liegen nicht genügend technische Informationen zum sicheren Vergleich vor.',
          verified: false
        };
        default: return { text: 'Ein Strukturunterschied kann noch nicht verständlich aufgelöst werden.', verified: false };
      }
    }
    const sections = order.map(([stage, label]) => {
      const result = results?.[stage] || {};
      const status = String(result.status || 'not-observed');
      const changes = Array.isArray(result.changes) ? result.changes : [];
      const detail = changes.slice(0, 12).map(change => explain(stage,change));
      const verified = status === 'changed' && detail.some(item => item.verified);
      const uncertain = ['uncertain','not-fully-verified','invalid-reference','monitor-unavailable','not-observed'].includes(status) ||
        (status === 'changed' && detail.some(item => !item.verified)) ||
        (status === 'changed' && !verified);
      const note = status === 'not-fully-verified' && stage === 'category'
        ? 'Technische IDs der übergeordneten Kategorien sind nicht vollständig belegt; dies ist kein nachgewiesener Kategorienwechsel.'
        : uncertain && status !== 'changed'
          ? 'Diese Stufe wurde nicht als eindeutig unverändert bestätigt.'
          : status === 'changed' && !verified
            ? 'Der Unterschied kann nicht als sicher nachgewiesene Einzeländerung beschrieben werden.'
            : '';
      const items = detail.map(item => item.text);
      if (changes.length > detail.length) items.push('Weitere Unterschiede stehen im Diagnoseexport.');
      return { stage, label, status, statusLabel: labels[status] || 'Prüfstatus unbekannt',
        items, note, verified, uncertain };
    });
    return {
      hasProvenChange: sections.some(section => section.verified),
      hasUncertainty: sections.some(section => section.uncertain),
      sections,
      safetyText: 'Dies ist nur eine Bestätigung, dass du die Unterschiede gesehen hast. Gespeicherte Referenzen werden nicht verändert oder übernommen. Es wird nichts veröffentlicht.'
    };
  }

  function showStageChangeReviewDialog(review, {
    documentRoot = document, onAcknowledge = () => {}, onDefer = () => {}
  } = {}) {
    if (!review?.hasProvenChange) return null;
    documentRoot.getElementById('kr134-change-review-overlay')?.remove();
    const overlay = documentRoot.createElement('div');
    overlay.id = 'kr134-change-review-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.73);display:flex;align-items:center;justify-content:center;padding:16px';
    const dialog = documentRoot.createElement('section');
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('aria-labelledby','kr134-change-review-title');
    dialog.style.cssText = 'width:min(620px,100%);max-height:90vh;overflow:auto;background:#141b1e;color:#f0f6f5;border:1px solid #536267;border-radius:12px;padding:20px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 16px 52px #0009';
    const title = documentRoot.createElement('h2');
    title.id = 'kr134-change-review-title';
    title.textContent = 'Änderungen an der Formularstruktur';
    title.style.cssText = 'font-size:19px;margin:0 0 8px';
    const intro = documentRoot.createElement('p');
    intro.textContent = 'Kleinanzeigen hat mindestens eine technische Strukturänderung bestätigt. Bitte prüfe die folgenden Unterschiede.';
    dialog.append(title,intro);
    for (const section of review.sections) {
      const group = documentRoot.createElement('section');
      group.style.cssText = 'border-top:1px solid #3c4a4e;padding:9px 0';
      const h = documentRoot.createElement('h3');
      h.textContent = section.label + ': ' + section.statusLabel;
      h.style.cssText = 'font-size:14px;margin:0 0 5px';
      group.append(h);
      if (section.items.length) {
        const list = documentRoot.createElement('ul');
        list.style.cssText = 'margin:4px 0;padding-left:20px';
        for (const detail of section.items) {
          const item = documentRoot.createElement('li');
          item.textContent = detail;
          list.append(item);
        }
        group.append(list);
      }
      if (section.note) {
        const note = documentRoot.createElement('p');
        note.textContent = section.note;
        note.style.cssText = 'margin:4px 0;color:#ffce7d';
        group.append(note);
      }
      dialog.append(group);
    }
    const safety = documentRoot.createElement('p');
    safety.textContent = review.safetyText;
    safety.style.cssText = 'margin:12px 0;color:#a4e1d0;font-weight:600';
    const controls = documentRoot.createElement('div');
    controls.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap';
    const defer = documentRoot.createElement('button');
    defer.type='button';defer.textContent='Später prüfen';
    const acknowledge = documentRoot.createElement('button');
    acknowledge.type='button';acknowledge.textContent='Änderungen gesehen – nicht übernehmen';
    for (const button of [defer,acknowledge]) {
      button.style.cssText='padding:9px 12px;border:1px solid #81918f;border-radius:7px;background:#293b3b;color:white;cursor:pointer';
    }
    defer.addEventListener('click',()=>{overlay.remove();onDefer();});
    acknowledge.addEventListener('click',()=>{overlay.remove();onAcknowledge();});
    controls.append(defer,acknowledge);
    dialog.append(safety,controls);
    overlay.append(dialog);
    documentRoot.documentElement.append(overlay);
    return overlay;
  }

  // KAR-134 K3 synthetic fingerprint warning proof. This PURE read-only
  // policy compares a fictional historical structure to three independently
  // observed live stages. It never reads or overwrites persisted fingerprints.
  // Synthetic ancestor names/fields are TEST FIXTURES, not platform evidence.
  async function assessSyntheticStageDrift({ base, category, attributes } = {}) {
    const failure = evidenceState => ({
      verdict: false, simulationOnly: true, referenceWrites: 0,
      evidenceState, stages: {}
    });
    if (!base || base.stage !== 'base' || base.formMode !== 'posting-create' ||
        base.categoryChooser === 'missing' || !Array.isArray(base.fields) ||
        base.fields.length === 0)
      return failure('base-form-not-observed');
    if (!category || category.stage !== 'category' || category.categoryId !== '405' ||
        category.leafConfirmed !== true || category.observedPath !== true ||
        !Array.isArray(category.levels) || category.levels.length < 2 ||
        category.levels.length >= 12 ||
        category.levels.at(-1)?.technicalId !== '405')
      return failure('category-navigation-not-proven');
    if (!attributes || attributes.categoryId !== '405' ||
        !Array.isArray(attributes.fields) ||
        !attributes.fields.some(field => field?.key?.startsWith('attribute:')))
      return failure('category-attributes-not-observed');

    const baseProbeKey = 'field:kr134_synthetic_previous_base_field';
    const attributeProbeKey = 'attribute:kr134.synthetic_previous_attribute';
    if (base.fields.some(field => field.key === baseProbeKey) ||
        attributes.fields.some(field => field.key === attributeProbeKey))
      return failure('synthetic-probe-collides-with-live-schema');

    const syntheticBase = {
      ...base,
      fields: [...base.fields, {
        key: baseProbeKey, kind: 'text', requiredState: 'unknown', optionValues: null
      }]
    };
    const syntheticCategory = SchemaCore.buildCategorySchema({
      categoryId: '405', observedPath: true, leafConfirmed: true,
      levels: [
        { label: 'KAR-134 synthetische frühere Oberkategorie',
          technicalId: null, kind: 'branch' },
        ...category.levels.map(level => ({
          label: level.label, technicalId: level.technicalId, kind: level.kind
        }))
      ]
    });
    const syntheticAttributes = {
      ...attributes,
      fields: [...attributes.fields, {
        key: attributeProbeKey, kind: 'text', requiredState: 'unknown', optionValues: null
      }]
    };
    const input = {
      base: {
        prior: syntheticBase, current: base,
        fingerprint: SchemaCore.baseFingerprint,
        compare: SchemaCore.diffBaseSchemas,
        expectedStatus: 'base-changed', expectedType: 'field-removed',
        warningText: 'TEST / SIMULATION – Basisformular: Eine veränderte Formularstruktur wurde nachgewiesen. Kleinanzeigen hat sich für diesen Test nicht geändert.'
      },
      category: {
        prior: syntheticCategory, current: category,
        fingerprint: SchemaCore.categoryFingerprint,
        compare: SchemaCore.diffCategorySchemas,
        expectedStatus: 'category-changed', expectedType: 'category-depth-changed',
        warningText: 'TEST / SIMULATION – Kategoriehierarchie: Eine geänderte Pfadtiefe wurde erkannt. Es wurde keine echte Kategorie verändert.'
      },
      attributes: {
        prior: syntheticAttributes, current: attributes,
        fingerprint: SchemaCore.fingerprint,
        compare: SchemaCore.diff,
        expectedStatus: 'schema-changed', expectedType: 'field-removed',
        warningText: 'TEST / SIMULATION – Kategorieformular: Ein synthetisch entferntes Merkmal wurde erkannt. Dies ist kein echter Kleinanzeigen-Feldverlust.'
      }
    };
    const stages = {};
    for (const [stage, spec] of Object.entries(input)) {
      const previousFingerprint = await spec.fingerprint(spec.prior);
      const currentFingerprint = await spec.fingerprint(spec.current);
      const comparison = spec.compare(spec.prior, spec.current);
      const changeTypes = (comparison.changes || []).map(change => change.type);
      const verdict = previousFingerprint !== currentFingerprint &&
        comparison.status === spec.expectedStatus &&
        changeTypes.includes(spec.expectedType);
      stages[stage] = {
        stage, verdict, simulationOnly: true, warningText: spec.warningText,
        previousFingerprint, currentFingerprint, changeTypes,
        ...(stage === 'category' ? {
          categoryId: '405', previousLeafId: spec.prior.categoryId,
          currentLeafId: spec.current.categoryId,
          verifiedAncestorIdsInvented: false
        } : {})
      };
    }
    const verdict = Object.values(stages).every(stage => stage.verdict === true);
    return { verdict, simulationOnly: true, referenceWrites: 0,
      evidenceState: verdict ? 'synthetic-stage-drift-proven' : 'synthetic-stage-drift-not-proven',
      stages };
  }

  // KAR-134 L1 independent category-check verdict. "Checked" confirms that
  // each stage was observed and compared; it is NOT a claim of equal schemas,
  // complete intermediate category IDs or permission to publish.
  function assessIndependentCategoryCheck(categoryId, observed, results) {
    const id = String(categoryId ?? '').trim();
    const order = ['base', 'category', 'attributes'];
    const stageStatuses = order.map(stage => String(results?.[stage]?.status || 'not-observed'));
    const partialEvidence = observed?.category?.evidence === 'partial-ids' ||
      stageStatuses.includes('not-fully-verified') || stageStatuses.includes('uncertain');
    const rejected = reason => ({
      categoryId: id, verdict: false, status: 'needs-review',
      reason, stageStatuses, partialEvidence
    });
    if (!/^[1-9][0-9]*$/.test(id)) return rejected('invalid-category-id');
    if (!observed?.base || observed.base.stage !== 'base' ||
        observed.base.formMode !== 'posting-create' ||
        !Array.isArray(observed.base.fields) || !observed.base.fields.length)
      return rejected('base-form-not-observed');
    const navigation = observed.category;
    if (!navigation || navigation.stage !== 'category' ||
        navigation.categoryId !== id || navigation.observedPath !== true ||
        navigation.leafConfirmed !== true || !Array.isArray(navigation.levels) ||
        navigation.levels.length < 2 ||
        navigation.levels[navigation.levels.length - 1]?.technicalId !== id)
      return rejected('verified-category-path-missing');
    const attributes = observed.attributes;
    if (!attributes || attributes.categoryId !== id || !Array.isArray(attributes.fields) ||
        !attributes.fields.some(field => field?.key?.startsWith('attribute:')))
      return rejected('hydrated-category-attributes-missing');
    const allowed = new Set(['reference-created', 'unchanged', 'not-fully-verified', 'changed', 'uncertain']);
    if (!stageStatuses.every(status => allowed.has(status)))
      return rejected('stage-monitor-incomplete');
    return {
      categoryId: id, verdict: true,
      status: stageStatuses.includes('changed') ? 'checked-with-change' : 'checked',
      reason: null, stageStatuses, partialEvidence
    };
  }

  // KAR-134 field-only native simulation. No listing content, image upload,
  // wizard continuation, submit or source mutation is permitted in this path.
  async function runReadOnlySchemaTest(session) {
    const scenario = session.schemaTestScenario;
    const expectedCategoryId = String(session.template?.categoryId ?? '').trim();
    const independentCategoryCheck = scenario === 'category-check';
    // Generic category checks may inspect only bounded Art/Typ categorization
    // hints. They are saved values, so the diagnostic must report this read.
    // No title, price, description, other attributes, or images are copied.
    const categoryHintRead = independentCategoryCheck &&
      Array.isArray(session.template?.categoryNavigationHints) &&
      session.template.categoryNavigationHints.length > 0;
    if (!['compatible', 'incompatible', 'stage-drift', 'category-check'].includes(scenario) ||
        !/^[1-9][0-9]*$/.test(expectedCategoryId) ||
        (!independentCategoryCheck && expectedCategoryId !== '405') ||
        !SchemaCore || !SchemaPreflight)
      throw new Error('Schema-Prüfmodus ist nicht verfügbar oder die Kategorie stimmt nicht.');
    const fillId = session.fillId;
    updatePanel(independentCategoryCheck ? 'Kategorieprüfung (nur Lesen)' : 'Schema-Prüfmodus (nur Lesen)',
      'Kategorie ' + expectedCategoryId + ' wird für den Strukturvergleich vorbereitet. Es werden keine Anzeigenwerte eingetragen und keine Anzeigen veröffentlicht.', [],
      { safetyText: 'NUR FORMULARPRÜFUNG – keine Anzeigenwerte, kein Bild-Upload und keine Veröffentlichung.' });
    await runtimeMessage({ type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId, status: 'running', stage: 'schema-test-category' });
    const preCategoryForm = await waitFor(() => resolveActivePostingForm(), { description: 'Aktives Schema-Basisformular' });
    const syntheticStageDrift = scenario === 'stage-drift';
    let observedBaseSchema = null;
    let observedCategorySchema = null;
    let observedAttributeSchema = null;
    let baseStageResult = null, categoryStageResult = null, attributeStageResult = null;
    const baseObservation = captureCategoryNeutralForm(preCategoryForm);
    if (baseObservation.status === 'observed') {
      observedBaseSchema = baseObservation.schema;
      if (!syntheticStageDrift)
        baseStageResult = await monitorSchemaStage('base', baseObservation.schema, fillId);
    } else void diagnostic(fillId, 'KAR134_STAGE_MONITOR_SKIPPED',
      { stage: 'base', reason: baseObservation.status });
    stagedCategoryPathEvidence = null;
    let categoryState;
    try {
      categoryState = await setCategory(session.template, fillId, session?.maxPhaseAttempts);
    } catch (error) {
      registerSchemaMonitorWarning('Kategoriehierarchie: Der bisherige Kategoriepfad konnte nicht bestätigt werden. Die Merkmalsprüfung wurde nicht erreicht.');
      void diagnostic(fillId, 'KAR134_STAGE_MONITOR_SKIPPED',
        { stage: 'category', reason: 'category-selection-failed', message: String(error?.message || error).slice(0, 200) }, 'warning');
      if (!independentCategoryCheck) throw error;
      const issues = ['Die Kategorieauswahl konnte nicht eindeutig bestätigt werden. Die Kategorieprüfung ist unvollständig.'];
      void diagnostic(fillId, 'KAR134_CATEGORY_CHECK_RESULT', {
        categoryId: expectedCategoryId, verdict: false, reason: 'category-selection-failed',
        stageStatuses: [baseStageResult?.status || 'not-observed', 'not-observed', 'not-observed'],
        remotePublishAttempted: false, archivedValuesRead: categoryHintRead,
        categoryNavigationHintsRead: categoryHintRead, archivedNonCategoryValuesRead: false
      }, 'warning');
      await runtimeMessage({ type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId,
        status: 'needs-review', stage: 'schema-test-category-unreachable',
        result: { complete: false, issues } });
      updatePanel('Kategorieprüfung: Nicht vollständig', issues[0], issues,
        { safetyText: 'Keine Anzeigenwerte übertragen, keine Veröffentlichung.' });
      return { schemaTest: true, scenario, verdict: false, publishTriggered: false, issues };
    }
    if (categoryState?.pendingNavigation) return { pending: true, schemaTest: true };
    if (stagedCategoryPathEvidence) {
      observedCategorySchema = SchemaCore.buildCategorySchema(stagedCategoryPathEvidence);
      if (!syntheticStageDrift)
        categoryStageResult = await monitorSchemaStage('category', observedCategorySchema, fillId);
    } else void diagnostic(fillId, 'KAR134_STAGE_MONITOR_SKIPPED',
      { stage: 'category', reason: 'no-independent-navigation-evidence' });
    const live = await SchemaPreflight.afterHydration({ categoryId: expectedCategoryId, dynamicAttributes: [] },
      { probeReadOnlyCaseSize: scenario === 'compatible' });
    if (live.categoryId !== expectedCategoryId)
      throw new Error('Aktuelle Kategorie stimmt nicht mit der ausgewählten Inventarkategorie überein.');
    if (live.dynamicCount > 0) {
      observedAttributeSchema = live.schema;
      if (!syntheticStageDrift)
        attributeStageResult = await monitorSchemaStage('attributes', live.schema, fillId);
    } else void diagnostic(fillId, 'KAR134_STAGE_MONITOR_SKIPPED',
      { stage: 'attributes', reason: 'no-dynamic-field-evidence' });

    if (scenario === 'category-check') {
      // Generic category monitoring: read only the live structure; DO NOT
      // evaluate an archived ad, populate fields/images or request publishing.
      const assessment = assessIndependentCategoryCheck(expectedCategoryId, {
        base: observedBaseSchema,
        category: observedCategorySchema,
        attributes: observedAttributeSchema
      }, {
        base: baseStageResult, category: categoryStageResult,
        attributes: attributeStageResult
      });
      const stageLabels = ['F1 (Basisformular)', 'F2 (Kategoriehierarchie)', 'F3 (Merkmale)'];
      const statusLabels = {
        'reference-created': 'Referenz angelegt', 'unchanged': 'Unverändert',
        'not-fully-verified': 'Teilweise verifiziert', changed: 'Änderung erkannt',
        uncertain: 'Nicht eindeutig', 'not-observed': 'Nicht erfasst',
        'monitor-unavailable': 'Speicher nicht erreichbar',
        'invalid-reference': 'Referenz ungültig'
      };
      const stagesDescription = assessment.stageStatuses.map((status, i) =>
        stageLabels[i] + ': ' + (statusLabels[status] || 'Prüfung nicht vollständig')).join(' · ');
      const issues = assessment.verdict ? [] : [
        'Nicht alle F1-/F2-/F3-Prüfungen waren vollständig möglich. Die Kategorie wird nicht als unverändert bestätigt.'
      ];
      void diagnostic(fillId, 'KAR134_CATEGORY_CHECK_RESULT', {
        categoryId: expectedCategoryId, verdict: assessment.verdict,
        status: assessment.status, reason: assessment.reason,
        partialEvidence: assessment.partialEvidence,
        stageStatuses: assessment.stageStatuses,
        remotePublishAttempted: false, archivedValuesRead: categoryHintRead,
        categoryNavigationHintsRead: categoryHintRead, archivedNonCategoryValuesRead: false
      }, assessment.verdict ? 'info' : 'warning');
      await runtimeMessage({
        type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId,
        status: assessment.verdict ? 'complete' : 'needs-review',
        stage: assessment.verdict ? 'schema-test-category-check' : 'schema-test-category-incomplete',
        result: { complete: assessment.verdict, issues }
      });
      updatePanel(
        assessment.verdict ? 'Kategorieprüfung abgeschlossen' : 'Kategorieprüfung: Nicht vollständig',
        'Kategorie ' + expectedCategoryId + ' – ' + stagesDescription +
          (assessment.partialEvidence
            ? '. Technische IDs der Zwischenkategorien oder Auswahlwerte sind nicht vollständig belegt.' : '') +
          ' Eine Veröffentlichung wurde nicht durchgeführt.',
        issues, { safetyText: 'NUR STRUKTURPRÜFUNG – keine Anzeigenwerte, keine Bilder und keine Veröffentlichung.' }
      );
      return { schemaTest: true, scenario, verdict: assessment.verdict,
        publishTriggered: false, issues };
    }
    if (syntheticStageDrift) {
      // IMPORTANT: no monitorSchemaStage() calls in this scenario. Existing
      // chrome.storage.local baselines are never read, replaced, or created.
      const proof = await assessSyntheticStageDrift({
        base: observedBaseSchema,
        category: observedCategorySchema,
        attributes: live.dynamicCount > 0 ? live.schema : null
      });
      const stages = Object.values(proof.stages);
      if (proof.verdict) {
        for (const stage of stages) registerSchemaMonitorWarning(stage.warningText);
      }
      void diagnostic(fillId, 'KAR134_STAGE_DRIFT_TEST_RESULT', {
        scenario, verdict: proof.verdict,
        evidenceState: proof.evidenceState,
        simulationOnly: true, referenceWrites: 0,
        remotePublishAttempted: false, archivedValuesRead: false,
        stageResults: stages.map(stage => ({
          stage: stage.stage, verdict: stage.verdict,
          previousFingerprint: stage.previousFingerprint,
          currentFingerprint: stage.currentFingerprint,
          changeTypes: stage.changeTypes,
          ...(stage.stage === 'category' ? {
            categoryId: stage.categoryId,
            previousLeafId: stage.previousLeafId,
            currentLeafId: stage.currentLeafId,
            verifiedAncestorIdsInvented: stage.verifiedAncestorIdsInvented
          } : {})
        }))
      }, proof.verdict ? 'info' : 'warning');
      const issues = proof.verdict ? [] : [
        'Nicht alle drei Fingerprint-Phasen konnten mit echten Formulardaten geprüft werden. Der Simulationstest ist nicht bestanden.'
      ];
      await runtimeMessage({
        type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId,
        status: proof.verdict ? 'complete' : 'needs-review',
        stage: proof.verdict ? 'schema-test-stage-drift' : 'schema-test-unexpected',
        result: { complete: proof.verdict, issues }
      });
      updatePanel(
        proof.verdict ? 'Fingerprint-Warnung: Simulation bestanden' : 'Fingerprint-Warnung: Simulation nicht bestätigt',
        proof.verdict
          ? 'F1, F2 und F3 haben jeweils eine synthetische Strukturänderung erkannt. Die gelben TEST-Hinweise zeigen die Warnungen. Die echten Fingerprint-Referenzen blieben unverändert.'
          : 'Die drei Strukturänderungen konnten nicht vollständig nachgewiesen werden. Bitte die Diagnose prüfen.',
        issues,
        { safetyText: 'NUR SIMULATION – keine Referenz geändert, keine Anzeigenwerte gelesen, keine Anzeige veröffentlicht.' }
      );
      return {
        schemaTest: true, scenario, verdict: proof.verdict,
        publishTriggered: false, issues
      };
    }
    const caseField = live.schema.fields.find(field => field.key === 'attribute:wearables.case_size');
    const focused = {
      ...live,
      schema: { ...live.schema, fields: caseField ? [caseField] : [] }
    };
    // Two distinct synthetic tests: owner-proven case-size mapping (positive)
    // and a saved field absent from the COMPLETE current schema (negative).
    // Neither reads archived values or claims an actual Kleinanzeigen field deletion.
    const savedKey = scenario === 'compatible' ? 'wearables.gehausegrosse'
      : SYNTHETIC_REMOVED_FIELD_KEY;
    const savedLabel = scenario === 'compatible' ? 'Gehäusegröße (synthetischer Test)'
      : SYNTHETIC_REMOVED_FIELD_LABEL;
    const snapshot = SchemaCore.buildSchema({ categoryId: '405', dynamicAttributes: [
      { key: savedKey, controlType: scenario === 'compatible' ? 'number' : 'text',
        requiredState: 'unknown' }
    ] });
    const fingerprint = await SchemaCore.fingerprint(snapshot);
    const simulated = {
      categoryId: '405',
      templateSchema: { snapshot, fingerprint },
      dynamicAttributes: [{
        key: savedKey, label: savedLabel,
        technicalValue: scenario === 'compatible' ? '44' : '__KAR134_SYNTHETIC_SAVED_VALUE__',
        displayValue: scenario === 'compatible' ? '44mm' : 'Synthetisch gespeicherter Wert',
        status: 'captured'
      }]
    };
    const testedLive = scenario === 'compatible' ? focused : live;
    const report = await SchemaPreflight.evaluate(simulated, testedLive);
    const assessment = scenario === 'compatible'
      ? assessSyntheticCaseSize('compatible', focused, report, null)
      : assessSyntheticRemovedField(live, report, savedKey, savedLabel);
    const { verdict } = assessment;
    const issues = verdict ? [] : [
      ...report.issues,
      scenario === 'compatible'
        ? 'Die nachgewiesene Zuordnung 44 / 44mm konnte nicht bestätigt werden.'
        : 'Der Sicherheitsstopp für das fehlende synthetische Testmerkmal wurde nicht eindeutig nachgewiesen.'
    ];
    const actualFullFingerprint = await SchemaCore.fingerprint(live.schema);
    void diagnostic(fillId, 'KAR134_SCHEMA_TEST_RESULT', {
      scenario, verdict, mode: 'read-only',
      scope: scenario === 'compatible' ? 'category-405-case-size-only' : 'category-405-synthetic-removed-field',
      remotePublishAttempted: false, archivedValuesRead: false,
      syntheticOldFingerprint: fingerprint, actualFullFingerprint,
      focusedCurrentFingerprint: report.currentFingerprint,
      testedCurrentFingerprint: report.currentFingerprint,
      detectedChangeTypes: (report.comparison?.changes || []).map(item => item.type).slice(0, 30),
      issueCount: report.issues.length, mappedCaseSize44mm: assessment.mapping44Proven,
      caseSizeFieldPresent: assessment.caseFieldPresent,
      caseSizeOptionEvidenceComplete: assessment.optionEvidenceComplete,
      caseSizeOptionCount: assessment.optionCount,
      technical44Offered: assessment.technical44Offered,
      ownerVerifiedPair44: assessment.ownerVerifiedPair44,
      ownerVerifiedPairCount: live.optionProbe?.ownerVerifiedPairCount || 0,
      visible44mmProven: assessment.visible44mmProven,
      invalidValueRejectionProven: assessment.specificInvalidRejectionProven,
      missingSavedFieldRejectionProven: assessment.missingSavedFieldRejectionProven === true,
      syntheticMissingFieldKeyAbsent: assessment.syntheticMissingFieldKeyAbsent === true,
      evidenceState: assessment.evidenceState,
      popupProbeAttempted: live.optionProbe?.attempted === true,
      popupProbeFound: live.optionProbe?.popupFound === true,
      popupRenderedOptions: live.optionProbe?.renderedOptionCount || 0,
      popupExplicitTechnicalOptions: live.optionProbe?.explicitTechnicalOptionCount || 0,
      popupEvidenceReason: live.optionProbe?.reason || 'none'
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
        ? (verdict
          ? 'Die manuell nachgewiesene Zuordnung 44mm / 44 ist im aktuellen Auswahlfeld eindeutig sichtbar. Eine Veröffentlichung wurde nicht durchgeführt.'
          : 'Die aktuelle Auswahl 44 / 44mm konnte nicht nachgewiesen werden.')
        : (verdict
          ? 'Ein simuliertes gespeichertes Merkmal fehlt nachweislich im aktuellen Formular. Der Sicherheitsstopp wurde bestätigt. Dies ist kein Nachweis einer echten Kleinanzeigen-Formularänderung.'
          : 'Der Sicherheitsstopp für das simulierte entfernte Merkmal konnte nicht belegt werden.'),
      verdict ? [] : issues,
      { safetyText: 'TEST ABGESCHLOSSEN – keine Werte übertragen, keine Bilder hochgeladen, keine Anzeige veröffentlicht. Dies ist nur eine Feldsimulation, keine vollständige Abnahme.' }
    );
    return { schemaTest: true, scenario, verdict, publishTriggered: false, issues };
  }

  async function runFillSession(session) {
    const { fillId, template } = session;
    const issues = [];
    updatePanel('Anzeige wird ausgefüllt', 'Die gespeicherten Angaben werden in die neue Anzeige übernommen …');
    // Capture F1 before even setting the initial ad type or title. An already
    // selected category cannot supply a pre-category reference.
    if (SchemaCore) {
      const initialForm = await waitFor(() => resolveActivePostingForm(), { description: 'Aktives Schema-Basisformular' });
      const base = captureCategoryNeutralForm(initialForm);
      if (base.status === 'observed')
        await monitorSchemaStage('base', base.schema, fillId);
      else void diagnostic(fillId, 'KAR134_STAGE_MONITOR_SKIPPED', { stage: 'base', reason: base.status });
    }
    void diagnostic(fillId, 'TEMPLATE_FILL_EXECUTION_STARTED', { sourceAdId: template.sourceAdId || null, inventoryId: template.inventoryId || null });
    await runtimeMessage({ type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId, status: 'running', stage: 'form-ready' });

    let form = await waitFor(() => document.querySelector('form'), { timeout: 15000, description: 'Neues Anzeigenformular' });
    if (template.adType?.value && !chooseRadio('adType', template.adType.value)) issues.push('Gebot/Gesuch konnte nicht übernommen werden.');
    try {
      form = await ensureStableTitleValue(fillId, template.title || '', 'initial', form, true);
    } catch (error) { issues.push(`Titel: ${error.message}`); }

    let categoryState = null;
    stagedCategoryPathEvidence = null;
    try {
      categoryState = await setCategory(template, fillId, session?.maxPhaseAttempts);
    } catch (error) {
      issues.push(`Kategorie: ${error.message}`);
      registerSchemaMonitorWarning('Kategoriehierarchie: Der gespeicherte Kategoriepfad ist aktuell nicht eindeutig erreichbar. Die Merkmale konnten nicht geprüft werden.');
      void diagnostic(fillId, 'KAR134_STAGE_MONITOR_SKIPPED',
        { stage: 'category', reason: 'category-selection-failed', message: String(error?.message || error).slice(0, 200) }, 'warning');
    }
    if (categoryState?.pendingNavigation) return { pending: true, issues };
    if (stagedCategoryPathEvidence && SchemaCore)
      await monitorSchemaStage('category', SchemaCore.buildCategorySchema(stagedCategoryPathEvidence), fillId);
    else void diagnostic(fillId, 'KAR134_STAGE_MONITOR_SKIPPED',
      { stage: 'category', reason: 'no-independent-navigation-evidence' });
    // React may replace the entire posting form after the modal category commit.
    if (categoryState?.confirmed) form = resolveActivePostingForm(form);
    const paidAfterCategory = paidInsertionDetection();
    if (paidAfterCategory.required) return await stopForPaidInsertion(session, paidAfterCategory, 'after-category');

    let schemaPreflightReport = null;
    if (String(form.querySelector('input[name="categoryId"]')?.value || '') === String(template.categoryId || '')) {
      try {
        if (!SchemaPreflight) throw new Error('Die Formularschema-Sicherheitsprüfung ist nicht verfügbar.');
        const live = await SchemaPreflight.afterHydration(template);
        if (live.dynamicCount > 0)
          await monitorSchemaStage('attributes', live.schema, fillId);
        else void diagnostic(fillId, 'KAR134_STAGE_MONITOR_SKIPPED',
          { stage: 'attributes', reason: 'no-dynamic-field-evidence' });
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
          issueCount: schemaPreflightReport.issues.length,
          ownerVerifiedCaseSizePairs: live.optionProbe?.ownerVerifiedPairCount || 0,
          ownerCaseSizeEvidence: live.optionProbe?.reason || null
        }, schemaPreflightReport.complete ? 'info' : 'warning');
        if (!schemaPreflightReport.complete)
          return await stopForSchemaPreflight(session, schemaPreflightReport.issues, schemaPreflightReport);
      } catch (error) {
        return await stopForSchemaPreflight(session, [
          'Kategorieabhängige Felder konnten nicht sicher geprüft werden: ' + String(error.message || error).slice(0, 250)
        ]);
      }
      // The legacy numeric-input label ("44") differs from the current
      // dropdown label ("44mm"). Only the preflight-proven mapping may
      // override the transient *fill* label. Never rewrite archived values.
      const mappedFillTemplate = schemaPreflightReport.mappings.length
        ? { ...template, dynamicAttributes: (template.dynamicAttributes || []).map(attribute => {
          const approved = schemaPreflightReport.mappings.find(item =>
            item.oldKey === attribute.key &&
            item.technicalValue === String(attribute.technicalValue));
          return approved ? { ...attribute, displayValue: approved.expectedDisplayLabel } : attribute;
        }) }
        : template;
      const attributeIssues = await fillDynamicAttributes(mappedFillTemplate, fillId);
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
    stageMonitorWarnings = [];
    stagedCategoryPathEvidence = null;
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
