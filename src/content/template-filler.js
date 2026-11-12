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

  // KAR-134 L4 real reference adoption: conservative F3-only eligibility.
  // This policy does NOT write a reference. F1 baseline is global, while F2
  // may have unverified parent IDs; neither is automatically replaceable.
  // F3 is category-ID-scoped and can be reviewed independently if F1 is
  // unchanged and the F2 fingerprint is stable (even when partially proved).
  function buildRealSchemaAdoptionPlan(results = {}, observed = {}, {
    categoryId, fillId
  } = {}) {
    const blocked = reason => Object.freeze({ eligible: false, reason });
    const validHash = value => /^[a-f0-9]{64}$/.test(String(value || ''));
    const id = String(categoryId || '');
    const operation = String(fillId || '');
    if (!/^[1-9][0-9]*$/.test(id) || !/^[A-Za-z0-9_-]{1,80}$/.test(operation))
      return blocked('invalid-identity');
    const base = results.base, category = results.category, attributes = results.attributes;
    const currentCategory = observed.category, currentAttributes = observed.attributes;
    if (!currentCategory || currentCategory.stage !== 'category' ||
        currentCategory.categoryId !== id || currentCategory.leafConfirmed !== true ||
        currentCategory.observedPath !== true ||
        !['full-ids','partial-ids'].includes(currentCategory.evidence) ||
        !Array.isArray(currentCategory.levels) || currentCategory.levels.length < 2 ||
        currentCategory.levels.at(-1)?.technicalId !== id ||
        !currentAttributes || currentAttributes.categoryId !== id ||
        !Array.isArray(currentAttributes.fields) || !currentAttributes.fields.length)
      return blocked('category-or-current-schema-unverified');
    if (!base || base.status !== 'unchanged' ||
        !validHash(base.previousFingerprint) ||
        base.previousFingerprint !== base.currentFingerprint ||
        (base.changes || []).length)
      return blocked('base-schema-not-proven-stable');
    if (!category || !['unchanged','not-fully-verified'].includes(category.status) ||
        !validHash(category.previousFingerprint) ||
        category.previousFingerprint !== category.currentFingerprint ||
        (category.changes || []).length)
      return blocked('category-schema-not-proven-stable');
    const types = new Set([
      'field-added','field-removed','control-kind-changed',
      'requiredness-changed','valid-options-changed'
    ]);
    if (!attributes || attributes.status !== 'changed' ||
        !validHash(attributes.previousFingerprint) ||
        !validHash(attributes.currentFingerprint) ||
        attributes.previousFingerprint === attributes.currentFingerprint ||
        !Array.isArray(attributes.changes) || !attributes.changes.length ||
        attributes.changes.length > 100 ||
        !attributes.changes.every(change => types.has(change?.type) &&
          typeof change.key === 'string' && /^attribute:|^field:/.test(change.key)))
      return blocked('attribute-change-not-exclusively-proven');
    return Object.freeze({
      eligible: true, stage: 'attributes', categoryId: id, fillId: operation,
      oldFingerprint: attributes.previousFingerprint,
      newFingerprint: attributes.currentFingerprint,
      warning: 'Nur die F3-Strukturreferenz wird nach erneuter Prüfung ersetzt. F1 und F2 sowie gespeicherte Anzeigen bleiben unverändert.'
    });
  }

  // KAR-134 L2 change review. Only normalized structural diff data enters
  // this view. Acknowledgement explicitly is NOT reference acceptance.
  function buildStageChangeReview(results = {}, { categoryEvidence = null } = {}) {
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
      const incompleteCategoryIds = stage === 'category' && categoryEvidence === 'partial-ids';
      const uncertain = incompleteCategoryIds || ['uncertain','not-fully-verified','invalid-reference','monitor-unavailable','not-observed'].includes(status) ||
        (status === 'changed' && detail.some(item => !item.verified)) ||
        (status === 'changed' && !verified);
      const note = incompleteCategoryIds || status === 'not-fully-verified' && stage === 'category'
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
    documentRoot = document, onAcknowledge = () => {}, onDefer = () => {},
    realAdoptionPlan = null, onRealApprove = null
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
    if (realAdoptionPlan?.eligible === true &&
        typeof onRealApprove === 'function') {
      const real = documentRoot.createElement('button');
      real.type = 'button';
      real.textContent = 'F3-Strukturreferenz übernehmen …';
      real.style.cssText = 'padding:9px 12px;border:1px solid #d4a64d;border-radius:7px;background:#68430d;color:white;cursor:pointer';
      real.addEventListener('click', () => {
        const confirmation = documentRoot.createElement('p');
        confirmation.textContent = 'Endgültige Bestätigung erforderlich: Die bisherige F3-Strukturreferenz wird nur bei erneutem eindeutigen Nachweis ersetzt. F1, F2, Anzeigen und veröffentlichte Inhalte werden nicht verändert.';
        confirmation.style.cssText = 'font-weight:700;color:#ffcf81;margin:12px 0';
        const cancel = documentRoot.createElement('button');
        cancel.type = 'button'; cancel.textContent = 'Abbrechen';
        const commit = documentRoot.createElement('button');
        commit.type = 'button'; commit.textContent = 'F3-Referenz verbindlich übernehmen';
        for (const button of [cancel,commit])
          button.style.cssText='padding:9px 12px;border:1px solid #81918f;border-radius:7px;background:#293b3b;color:white;cursor:pointer';
        cancel.addEventListener('click', () => overlay.remove());
        commit.addEventListener('click', () => { overlay.remove(); void onRealApprove(); });
        dialog.append(confirmation);
        controls.replaceChildren(cancel,commit);
      });
      controls.append(real);
    }
    dialog.append(safety,controls);
    overlay.append(dialog);
    documentRoot.documentElement.append(overlay);
    return overlay;
  }

  // Real F1/F2/F3 review is part of the ordinary authenticated posting
  // preflight, not a standalone category-test session.
  async function reviewLivePostingSchema(session, observations, stages, report) {
    const { fillId } = session;
    const expectedCategoryId = String(session.template?.categoryId || '');
    const { base: observedBaseSchema, category: observedCategorySchema,
      attributes: observedAttributeSchema } = observations;
    const { base: baseStageResult, category: categoryStageResult,
      attributes: attributeStageResult } = stages;
    const comparison = report?.comparison;
    const reportChanged = comparison?.status === 'schema-changed' &&
      Array.isArray(comparison.changes) && comparison.changes.length > 0;
    const compared = { ...stages };
    // Old template vs live form can differ even on first stage-monitor run.
    // Such a comparison must not be mistaken for an adoptable F3 baseline.
    if (reportChanged && compared.attributes?.status !== 'changed')
      compared.attributes = { status: 'changed', changes: comparison.changes,
        previousFingerprint: report.sourceFingerprint,
        currentFingerprint: report.currentFingerprint };
    const review = buildStageChangeReview(compared, {
      categoryEvidence: observedCategorySchema?.evidence || null
    });
    if (!review.hasProvenChange) return true;
    const issues = ['Bestätigte Formularstrukturänderungen müssen geprüft werden. ' +
      'Die bisherigen Referenzen bleiben unverändert.',
      ...(!report?.complete ? (report?.issues || []).slice(0,10) : [])];
    await runtimeMessage({ type:'UPDATE_TEMPLATE_FILL_SESSION', fillId,
      status:'needs-review', stage:'schema-reference-review-required',
      result:{ complete:false, issues } });
    updatePanel('Formularstruktur geändert – Prüfung erforderlich',
      'Die aktuelle Formularstruktur unterscheidet sich von einer gespeicherten Referenz.',
      issues,{safetyText:'Keine Veröffentlichung vor bestätigter Prüfung.'});
        // Real reference approval is separate from mere acknowledgement and
        // from a simulated test. It is offered ONLY for a proven F3-only
        // structural change while F1 and F2 fingerprints remain stable.
        const candidate = buildRealSchemaAdoptionPlan({
          base: baseStageResult, category: categoryStageResult,
          attributes: attributeStageResult
        }, {
          base: observedBaseSchema, category: observedCategorySchema,
          attributes: observedAttributeSchema
        }, { categoryId: expectedCategoryId, fillId });
        let realAdoptionPlan = null;
        if (candidate.eligible) {
          try {
            const prepared = await runtimeMessage({
              type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId,
              referenceAdoption: {
                action: 'prepare', stage: candidate.stage,
                categoryId: expectedCategoryId,
                oldFingerprint: candidate.oldFingerprint,
                newFingerprint: candidate.newFingerprint
              }
            });
            if (prepared?.pending !== true || prepared.referenceApproved !== false ||
                typeof prepared.token !== 'string' || !prepared.token)
              throw new Error('Freigabevorbereitung wurde nicht bestätigt.');
            realAdoptionPlan = { ...candidate, token: prepared.token };
            void diagnostic(fillId,'KAR134_REAL_REFERENCE_ADOPTION_PREPARED',{
              categoryId: expectedCategoryId, stage:'attributes',
              previousFingerprint:candidate.oldFingerprint,
              currentFingerprint:candidate.newFingerprint,
              referenceApproved:false,realReferenceWrites:0,
              remotePublishAttempted:false
            });
          } catch(error) {
            void diagnostic(fillId,'KAR134_REAL_REFERENCE_ADOPTION_BLOCKED',{
              categoryId:expectedCategoryId,reason:'account-or-baseline-gate',
              referenceApproved:false,realReferenceWrites:0,
              remotePublishAttempted:false
            },'warning');
          }
        }
        void diagnostic(fillId, 'KAR134_CHANGE_REVIEW_SHOWN', {
          categoryId: expectedCategoryId,
          changedStages: review.sections.filter(section => section.verified).map(section => section.stage),
          hasUncertainty: review.hasUncertainty, referenceApproved: false,
          remotePublishAttempted: false
        }, 'warning');
    return new Promise(resolve => {
      let decided = false;
      const done = allow => {
        if (decided) return;
        decided = true;
        if (!allow) return resolve(false);
        void runtimeMessage({ type:'UPDATE_TEMPLATE_FILL_SESSION', fillId,
          status:'running', stage:'form-ready' })
          .then(() => resolve(true), () => resolve(false));
      };
        showStageChangeReviewDialog(review, {
          realAdoptionPlan,
          onRealApprove: realAdoptionPlan ? () => {
            void (async() => {
              try {
                // New live DOM observation after the owner's second click;
                // never trust a stale initial F3 snapshot or cached category.
                if (pageKind() !== 'target' ||
                    String(resolveActivePostingForm()?.querySelector('input[name="categoryId"]')?.value || '') !== expectedCategoryId ||
                    !stagedCategoryPathEvidence ||
                    String(stagedCategoryPathEvidence.categoryId || '') !== expectedCategoryId)
                  throw new Error('Die aktuelle Endkategorie ist nicht mehr eindeutig bestätigt.');
                const refreshed = await SchemaPreflight.afterHydration({
                  categoryId: expectedCategoryId, dynamicAttributes: []
                });
                if (refreshed.categoryId !== expectedCategoryId || refreshed.dynamicCount < 1 ||
                    await SchemaCore.fingerprint(refreshed.schema) !== realAdoptionPlan.newFingerprint)
                  throw new Error('Die aktuelle Merkmalsstruktur weicht von der geprüften Änderung ab.');
                const commit = await runtimeMessage({
                  type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId,
                  referenceAdoption: {
                    action:'commit',stage:'attributes',categoryId:expectedCategoryId,
                    token:realAdoptionPlan.token,
                    oldFingerprint:realAdoptionPlan.oldFingerprint,
                    newFingerprint:realAdoptionPlan.newFingerprint,
                    snapshot:refreshed.schema,
                    freshObservationCapturedAt:Date.now()
                  }
                });
                if (commit?.referenceApproved !== true || commit.realReferenceWrites !== 1)
                  throw new Error('Der neue Referenz-Fingerprint konnte nicht sicher gelesen werden.');
                void diagnostic(fillId,'KAR134_REAL_REFERENCE_ADOPTION_COMMITTED',{
                  categoryId:expectedCategoryId,stage:'attributes',
                  oldFingerprint:realAdoptionPlan.oldFingerprint,
                  newFingerprint:realAdoptionPlan.newFingerprint,
                  referenceApproved:true,realReferenceWrites:1,
                  remotePublishAttempted:false
                });
                updatePanel('F3-Strukturreferenz kontrolliert übernommen',
                  'Nach erneuter Live-Prüfung wurde ausschließlich die Kategorie-Merkmalsreferenz F3 aktualisiert. F1 und F2 sowie bestehende Anzeigenwerte bleiben unverändert. Es wurde nichts veröffentlicht.',
                  [],{safetyText:'NUR F3-STRUKTUR – keine Anzeigenwerte oder Veröffentlichung.'});
              } catch(error) {
                void diagnostic(fillId,'KAR134_REAL_REFERENCE_ADOPTION_BLOCKED',{
                  categoryId:expectedCategoryId,stage:'attributes',
                  reason:'final-confirmation-or-live-readback-failed',
                  referenceApproved:false,remotePublishAttempted:false
                },'warning');
                updatePanel('F3-Referenzübernahme nicht bestätigt',
                  'Der Nachweis ist veraltet, die Identität hat sich geändert oder der Referenzspeicher konnte nicht eindeutig bestätigt werden.',
                  [String(error?.message || error).slice(0,200)],{
                    safetyText:'Keine automatische Übernahme oder Veröffentlichung; bitte den Inserierungsvorgang erneut starten.'
                  });
              } finally { done(false); }
            })();
          } : null,
          onAcknowledge: () => {
            done(report?.complete === true);
            void diagnostic(fillId, 'KAR134_CHANGE_REVIEW_ACKNOWLEDGED', {
              categoryId: expectedCategoryId, referenceApproved: false,
              referenceWrites: 0, remotePublishAttempted: false
            });
          },
          onDefer: () => {
            done(false);
            void diagnostic(fillId, 'KAR134_CHANGE_REVIEW_DEFERRED', {
              categoryId: expectedCategoryId, referenceApproved: false,
              referenceWrites: 0, remotePublishAttempted: false
            });
          }
        });
    });
  }

  async function runFillSession(session) {
    const { fillId, template } = session;
    const issues = [];
    let observedBaseSchema = null, observedCategorySchema = null, observedAttributeSchema = null;
    let baseStageResult = null, categoryStageResult = null, attributeStageResult = null;
    updatePanel('Anzeige wird ausgefüllt', 'Die gespeicherten Angaben werden in die neue Anzeige übernommen …');
    // Capture F1 before even setting the initial ad type or title. An already
    // selected category cannot supply a pre-category reference.
    if (SchemaCore) {
      const initialForm = await waitFor(() => resolveActivePostingForm(), { description: 'Aktives Schema-Basisformular' });
      const base = captureCategoryNeutralForm(initialForm);
      if (base.status === 'observed') {
        observedBaseSchema = base.schema;
        baseStageResult = await monitorSchemaStage('base', base.schema, fillId);
      }
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
    if (stagedCategoryPathEvidence && SchemaCore) {
      observedCategorySchema = SchemaCore.buildCategorySchema(stagedCategoryPathEvidence);
      categoryStageResult = await monitorSchemaStage('category', observedCategorySchema, fillId);
    }
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
        if (live.dynamicCount > 0) {
          observedAttributeSchema = live.schema;
          attributeStageResult = await monitorSchemaStage('attributes', live.schema, fillId);
        }
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
        // The normal posting workflow now owns the only structural-change
        // review and optional F3 reference consent. No separate test tab.
        const acknowledged = await reviewLivePostingSchema(session, {
          base: observedBaseSchema, category: observedCategorySchema,
          attributes: observedAttributeSchema
        }, {
          base: baseStageResult, category: categoryStageResult,
          attributes: attributeStageResult
        }, schemaPreflightReport);
        if (!acknowledged) return { complete: false, reviewRequired: true,
          referenceApproved: false, publishTriggered: false,
          issues: schemaPreflightReport.issues || [] };
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
    // A final publish button may already be visible during a managed fill.
    // Intercept before any asynchronous form, recovery or navigation work;
    // user-owned template-only publishing remains deliberately unmodified.
    if (session.fillId && !session.templateOnly && (session.renewalId || session.archiveInsertionId)) {
      armPublishDetection(session.fillId);
    }
    try {
      // Retired L15 test sessions never enter the normal publishing path.
      if (session.schemaTestScenario) throw new Error('Veralteter Schema-Testvorgang kann nicht ausgeführt werden.');
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
