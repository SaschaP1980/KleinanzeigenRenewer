(() => {
  if (globalThis.__KR_TEMPLATE_CATEGORY_FLOW_V12317__) return;
  globalThis.__KR_TEMPLATE_CATEGORY_FLOW_V12317__ = true;
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before KRTemplateCategoryFlow.js');

  function create(options = {}) {
    const {
      CATEGORY_PATH,
      LEGACY_ACTION_DELAY_MS,
      INTERACTION_SETTLE_MS,
      CATEGORY_OPEN_LOCAL_CONFIRM_MS,
      CATEGORY_OPEN_LOCAL_RETRY_DELAY_MS,
      LOCAL_INTERACTION_ATTEMPTS_DEFAULT,
      clean,
      sleep,
      actionText,
      runtimeMessage,
      diagnostic,
      visible,
      visibleText,
      waitFor,
      updatePanel,
      onCategoryPathConfirmed
    } = options;

  function resolveCategoryNavigationUrl(chooser, baseHref = location.href) {
    let base;
    try { base = new URL(baseHref); } catch { return null; }
    if (base.hostname !== 'kleinanzeigen.de' && !base.hostname.endsWith('.kleinanzeigen.de')) return null;
    const candidates = [
      chooser?.getAttribute?.('href') || '',
      typeof chooser?.href === 'string' ? chooser.href : ''
    ];
    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        const url = new URL(candidate, base);
        if (url.origin !== base.origin || url.pathname !== CATEGORY_PATH) continue;
        return url.href;
      } catch { /* nächste kontrollierte Quelle */ }
    }
    return null;
  }

  function findCategoryChooser() {
    const form = document.querySelector('form');
    if (!form) return null;
    return [...form.querySelectorAll('a,button')].find(element => /wähle deine kategorie|kategorie ändern/i.test(visibleText(element))) || null;
  }


  // KAR-132: new category navigation lives in a native same-page dialog.
  function modernLabel(value) { return clean(value).normalize('NFC').toLocaleLowerCase('de-DE'); }
  function sameModernPath(actual, expected) {
    return actual.length === expected.length &&
      actual.every((part, index) => modernLabel(part) === modernLabel(expected[index]));
  }
  function modernDialog() {
    return [...document.querySelectorAll('dialog[open][aria-modal="true"]')].find(dialog =>
      visible(dialog) && [...dialog.querySelectorAll('h2')].some(heading => modernLabel(visibleText(heading)) === 'kategorie wählen')) || null;
  }
  function modernState() {
    const dialog = modernDialog();
    if (!dialog) return null;
    const region = dialog.querySelector('[aria-label="Kategorie wählen Inhalt"]');
    if (!region) throw new Error('Inhaltsbereich des Kategorie-Dialogs fehlt.');
    const nav = region.querySelector('nav[aria-label="Kategoriennavigation"]');
    let path = [];
    let list = region.querySelector('ul');
    if (nav) {
      const crumbs = [...nav.querySelectorAll('ol > li')].map(li =>
        visibleText(li.querySelector('[aria-current="page"]') || li.querySelector('button')));
      if (!crumbs.length || modernLabel(crumbs[0]) !== 'alle kategorien')
        throw new Error('Kategorien-Breadcrumb ist nicht eindeutig.');
      path = crumbs.slice(1);
      list = nav.nextElementSibling;
    }
    if (!list || list.tagName !== 'UL') throw new Error('Aktuelle Unterkategorien sind nicht eindeutig.');
    return { dialog, path, list };
  }
  function modernChoices(state) {
    return [...state.list.children].filter(li => li.tagName === 'LI')
      .map(li => [...li.children].find(item => item.tagName === 'BUTTON'))
      .filter(button => button && visible(button))
      .map(button => ({ button, label: visibleText(button.querySelector('span.flex-1') || button) }));
  }
  function exactModernChoice(state, name) {
    const matched = modernChoices(state).filter(item => modernLabel(item.label) === modernLabel(name));
    if (matched.length !== 1) throw new Error('Kategorie „' + name + '“ ist nicht eindeutig (' + matched.length + ' Treffer).');
    const button = matched[0].button;
    if (button.disabled || button.getAttribute('aria-disabled') === 'true')
      throw new Error('Kategorie „' + name + '“ ist deaktiviert.');
    return button;
  }

  // KAR-132 native regression: some archived templates store a parent path
  // ("Elektronik › Wearables") although their numeric categoryId belongs to a
  // more specific leaf ("Smartwatches"). Only the site's own, exact-ID
  // suggestion can supply missing path levels. Never infer a leaf from item
  // title, attributes, similar text, ordering or an arbitrary suggested ID.
  function resolveModernCategoryPathById(categoryId, storedPrefix) {
    const forms = [...document.querySelectorAll('form')]
      .filter(form => form.querySelector('input[name="categoryId"]'));
    if (forms.length !== 1) {
      throw new Error('Anzeigenformular für die Endkategorie ist nicht eindeutig.');
    }
    const candidates = [...forms[0].querySelectorAll('#ad-category-picker input[name="category-suggestions"][type="radio"]')]
      .filter(input => String(input.value) === String(categoryId));
    if (candidates.length === 0) return null;
    if (candidates.length !== 1) {
      throw new Error('Kategorie-ID ' + categoryId + ' ist in den Kategorienvorschlägen mehrdeutig.');
    }
    const label = candidates[0].closest('label');
    if (!label) throw new Error('Vollständiger Kategorienpfad der Kategorie-ID ' + categoryId + ' fehlt.');
    const fullPath = clean(visibleText(label)).split(/\s*[→›]\s*/u).map(clean).filter(Boolean);
    if (fullPath.length <= storedPrefix.length) return null;
    if (!storedPrefix.every((name, i) => modernLabel(name) === modernLabel(fullPath[i]))) {
      throw new Error('Kategorienvorschlag für ID ' + categoryId + ' stimmt nicht mit dem gespeicherten Kategoriepfad überein.');
    }
    if (fullPath.length > 8 || fullPath.some(name => name.length > 150)) {
      throw new Error('Kategorienvorschlag für ID ' + categoryId + ' hat einen unerwarteten Pfad.');
    }
    return fullPath;
  }

  // KAR-132: a single evidence-backed compatibility bridge, not a generic
  // category-name inference. Owner-supplied original posting form outerHTML
  // (2026-11-09) explicitly bound numeric 405 to this full ancestry.
  // Verify the live committed numeric ID independently after selection.
  function ownerVerifiedWearablesPath(categoryId, storedPrefix) {
    const captured = ['Elektronik', 'Wearables', 'Smartwatches'];
    return String(categoryId) === '405' &&
      sameModernPath(storedPrefix, captured.slice(0, 2))
      ? captured : null;
  }

  // KAR-143 owner-native Fahrradschlauch: both "Art" and "Typ" may be
  // captured, while only one of their display values is a real terminal
  // category on the *currently opened* exact-parent dialog level.
  // A captured attribute is NEVER independent proof of category identity.
  // Match by complete normalized label against one unique, visible, enabled,
  // selectable live leaf, then verify the form's numeric category ID later.
  function capturedTerminalAttributePath(template, storedPath, liveState) {
    if (!Array.isArray(template?.dynamicAttributes) || !liveState ||
        !sameModernPath(liveState.path, storedPath) ||
        storedPath.length < 2 || storedPath.length >= 8) return null;
    const candidates = template.dynamicAttributes.filter(attribute =>
      ['typ', 'art'].includes(modernLabel(attribute?.label)) &&
      typeof attribute?.displayValue === 'string' &&
      clean(attribute.displayValue));
    const options = modernChoices(liveState);
    const matching = new Map();
    for (const attribute of candidates) {
      const terminal = clean(attribute.displayValue);
      if (terminal.length > 150 ||
          storedPath.some(name => modernLabel(name) === modernLabel(terminal))) continue;
      const exact = options.filter(item => modernLabel(item.label) === modernLabel(terminal));
      if (exact.length > 1) {
        throw new Error('Endkategorie „' + terminal + '“ ist im aktuellen Dialog nicht eindeutig.');
      }
      if (exact.length !== 1) continue;
      const button = exact[0].button;
      if (button.disabled || button.getAttribute('aria-disabled') === 'true') {
        throw new Error('Endkategorie „' + terminal + '“ ist deaktiviert.');
      }
      if (!button.hasAttribute('aria-pressed') ||
          button.querySelector('svg[data-title="arrowRight"]')) continue;
      const key = modernLabel(exact[0].label);
      if (!matching.has(key)) {
        matching.set(key, {
          path: [...storedPath, exact[0].label],
          label: modernLabel(attribute.label)
        });
      }
    }
    if (matching.size > 1) {
      throw new Error('Endkategorie ist nicht eindeutig: Mehrere gespeicherte Merkmale entsprechen auswählbaren Kategorien.');
    }
    return matching.size === 1 ? [...matching.values()][0] : null;
  }

  async function selectModernCategory(template, fillId, path) {
    const wanted = String(template.categoryId);
    const storedDepth = path.length;
    let idProvenExtension = false;
    let attributeBackedExtension = false;

    // First prefer current site's own unique numeric-ID suggestion. It can be
    // populated asynchronously AFTER the title/chooser changes, so a single
    // synchronous lookup is insufficient (native 1.23.40 evidence).
    let resolved = resolveModernCategoryPathById(wanted, path);
    let source = resolved ? 'live-numeric-id-suggestion' : null;
    const documented = ownerVerifiedWearablesPath(wanted, path);
    if (!resolved && documented) {
      for (let probe = 0; probe < 10 && !resolved; probe += 1) {
        await sleep(150);
        resolved = resolveModernCategoryPathById(wanted, path);
        if (resolved) source = 'late-live-numeric-id-suggestion';
      }
      if (!resolved) {
        // The owner captured this exact ID/path binding from the real form.
        // Never apply this bridge to other IDs or ancestry; the true site
        // categoryId must STILL match after pressing Übernehmen.
        resolved = documented;
        source = 'owner-captured-id405-form';
      }
    }
    const candidateForms = [...document.querySelectorAll('form')]
      .filter(form => form.querySelector('input[name="categoryId"]'));
    const candidates = candidateForms.length === 1
      ? [...candidateForms[0].querySelectorAll('#ad-category-picker input[name="category-suggestions"][type="radio"]')]
      : [];
    void diagnostic(fillId, 'CATEGORY_MODAL_ID_PATH_PROBE', {
      categoryId: wanted, storedDepth, candidateCount: candidates.length,
      exactIdCandidateCount: candidates.filter(input => String(input.value) === wanted).length,
      resolvedSource: source || 'none'
    });
    if (resolved) {
      path = resolved;
      idProvenExtension = true;
      void diagnostic(fillId, 'CATEGORY_MODAL_PATH_EXTENDED_BY_ID', {
        categoryId: wanted, storedDepth, resolvedDepth: path.length,
        timing: 'before-navigation', source
      });
    }
    for (let i = 0; i < path.length; i += 1) {
      const prior = path.slice(0, i), name = path[i];
      const state = await waitFor(() => {
        const current = modernState();
        return current && sameModernPath(current.path, prior) ? current : null;
      }, { timeout: 10000, description: 'Kategorieebene „' + prior.join(' › ') + '“' });
      const button = exactModernChoice(state, name);
      let leaf = i === path.length - 1;
      const branch = Boolean(button.querySelector('svg[data-title="arrowRight"]'));
      const selectable = button.hasAttribute('aria-pressed');

      // A saved parent can expose a real child level. A branch with an arrow
      // must be clicked first: only THEN is the live list of terminal options
      // available for exact Typ/Art matching. Never infer a leaf in advance.
      if (leaf && branch && !selectable) {
        button.click();
        const childState = await waitFor(() => {
          const current = modernState();
          return current && sameModernPath(current.path, [...prior, name]) ? current : null;
        }, { timeout: 10000, description: 'Unterkategorien nach „' + name + '“' });
        const byId = resolveModernCategoryPathById(wanted, path);
        const byAttribute = byId ? null : capturedTerminalAttributePath(template, path, childState);
        const extended = byId || byAttribute?.path;
        if (!extended || !sameModernPath(extended.slice(0, path.length), path) ||
            extended.length <= path.length) {
          throw new Error('Endkategorie nach „' + name + '“ nicht eindeutig aus den verfügbaren Unterkategorien nachgewiesen.');
        }
        void diagnostic(fillId, byAttribute
          ? (byAttribute.label === 'typ' ? 'CATEGORY_MODAL_PATH_EXTENDED_BY_TYPE' : 'CATEGORY_MODAL_PATH_EXTENDED_BY_ART')
          : 'CATEGORY_MODAL_PATH_EXTENDED_BY_ID', {
          categoryId: wanted, storedDepth: path.length, resolvedDepth: extended.length,
          source: byAttribute ? 'live-exact-' + byAttribute.label + '-candidate-unverified-until-commit'
            : 'live-numeric-id-suggestion'
        });
        path = extended;
        if (byAttribute) attributeBackedExtension = true;
        else idProvenExtension = true;
        void diagnostic(fillId, 'CATEGORY_MODAL_BRANCH_CONFIRMED', { label: name, level: i });
        continue;
      }
      if (!leaf) {
        // When the site's unique matching numeric-ID suggestion proves the
        // complete descendant path, a misleading parent affordance is not
        // authoritative. Still require exact breadcrumb transition after
        // clicking; a true leaf can never masquerade as a successful branch.
        const provenDescendant = (idProvenExtension || attributeBackedExtension) && i >= storedDepth - 1;
        if ((!branch || selectable) && !provenDescendant)
          throw new Error('Kategorie „' + name + '“ ist keine Unterkategorie.');
        button.click();
        await waitFor(() => {
          const current = modernState();
          return current && sameModernPath(current.path, path.slice(0, i + 1)) ? current : null;
        }, { timeout: 10000, description: 'Unterkategorien nach „' + name + '“' });
        void diagnostic(fillId, 'CATEGORY_MODAL_BRANCH_CONFIRMED', { label: name, level: i });
      } else {
        if (branch || !selectable) throw new Error('Kategorie „' + name + '“ ist keine Endkategorie.');
        button.click();
        const outcome = await waitFor(() => {
          const current = modernState();
          if (!current) return null;
          // Some category parents expose aria-pressed and no arrow, yet a click
          // opens a child level (real KAR-143 modal). Observe the resulting
          // breadcrumb rather than treating the stale pressed state as a leaf.
          if (sameModernPath(current.path, [...prior, name])) return 'drilldown';
          if (!sameModernPath(current.path, prior)) return null;
          const selected = modernChoices(current).filter(item => item.button.getAttribute('aria-pressed') === 'true');
          return selected.length === 1 && modernLabel(selected[0].label) === modernLabel(name) ? 'leaf' : null;
        }, { timeout: 10000, description: 'Endkategorie oder Unterkategorie „' + name + '“' });
        if (outcome === 'drilldown') {
          const current = modernState();
          const byId = resolveModernCategoryPathById(wanted, path);
          const byAttribute = byId ? null : capturedTerminalAttributePath(template, path, current);
          const extended = byId || byAttribute?.path;
          if (!extended || !sameModernPath(extended.slice(0, path.length), path) ||
              extended.length <= path.length) {
            throw new Error('Endkategorie nach „' + name + '“ nicht eindeutig aus den verfügbaren Unterkategorien nachgewiesen.');
          }
          void diagnostic(fillId, byAttribute
            ? (byAttribute.label === 'typ' ? 'CATEGORY_MODAL_PATH_EXTENDED_BY_TYPE' : 'CATEGORY_MODAL_PATH_EXTENDED_BY_ART')
            : 'CATEGORY_MODAL_PATH_EXTENDED_BY_ID', {
            categoryId: wanted, storedDepth: path.length, resolvedDepth: extended.length,
            source: byAttribute ? 'live-exact-' + byAttribute.label + '-candidate-unverified-until-commit'
              : 'live-numeric-id-suggestion'
          });
          path = extended;
          if (byAttribute) attributeBackedExtension = true;
          else idProvenExtension = true;
          void diagnostic(fillId, 'CATEGORY_MODAL_BRANCH_CONFIRMED', { label: name, level: i });
        } else {
          void diagnostic(fillId, 'CATEGORY_MODAL_LEAF_CONFIRMED', { label: name, level: i });
        }
      }
    }
    const ready = modernState();
    if (!ready || !sameModernPath(ready.path, path.slice(0, -1)))
      throw new Error('Kategoriepfad änderte sich vor der Übernahme.');
    const selected = modernChoices(ready).filter(item => item.button.getAttribute('aria-pressed') === 'true');
    if (selected.length !== 1 || !sameModernPath([...ready.path, selected[0].label], path))
      throw new Error('Endkategorie stimmt nicht exakt mit der Vorlage überein.');
    const confirms = [...ready.dialog.querySelectorAll('footer button')]
      .filter(button => visible(button) && modernLabel(visibleText(button)) === 'übernehmen');
    if (confirms.length !== 1) throw new Error('Übernehmen-Button nicht eindeutig.');
    const confirm = confirms[0];
    if (confirm.disabled || confirm.getAttribute('aria-disabled') !== 'false' ||
        confirm.getAttribute('aria-busy') === 'true')
      throw new Error('Kategorie-Übernehmen ist deaktiviert.');
    confirm.click();
    try {
      await waitFor(() => {
        if (modernDialog()) return null;
        const inputs = [...document.querySelectorAll('form input[name="categoryId"]')];
        return inputs.length === 1 && String(inputs[0].value) === wanted ? true : null;
      }, { timeout: 12000, description: 'Verifizierte Kategorie-ID nach Übernehmen' });
    } catch {
      const actual = [...document.querySelectorAll('form input[name="categoryId"]')].map(input => input.value);
      throw new Error('Kategorie-ID nicht verifiziert: erwartet ' + wanted + ', tatsächlich ' + JSON.stringify(actual) + '.');
    }
    void diagnostic(fillId, 'CATEGORY_MODAL_COMMIT_VERIFIED', { categoryId: wanted, depth: path.length });
    // KAR-134 F2: each breadcrumb was matched against the real current level
    // before selection, and the committed numeric leaf ID was read back.
    // The modal does not expose authoritative numeric ancestor IDs here;
    // unknown ancestor IDs remain null (never inferred from text or order).
    const categoryPathEvidence = {
      categoryId: wanted, leafConfirmed: true, observedPath: true,
      levels: path.map((label, index) => ({
        label, technicalId: index === path.length - 1 ? wanted : null,
        kind: index === path.length - 1 ? 'leaf' : 'branch'
      }))
    };
    if (typeof onCategoryPathConfirmed === 'function') {
      try {
        await onCategoryPathConfirmed(categoryPathEvidence, fillId);
      } catch (error) {
        void diagnostic(fillId, 'KAR134_CATEGORY_EVIDENCE_MONITOR_UNAVAILABLE', {
          reason: String(error?.message || error).slice(0, 220)
        }, 'warning');
      }
    }
    return { confirmed: true, pendingNavigation: false };
  }

  function normalizeLocalInteractionAttempts(value) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed)) return LOCAL_INTERACTION_ATTEMPTS_DEFAULT;
    return Math.min(5, Math.max(1, parsed));
  }

  async function settleAfterInteraction(fillId, field) {
    await sleep(INTERACTION_SETTLE_MS);
    void diagnostic(fillId, 'TEMPLATE_INTERACTION_SETTLED', { field: String(field || ''), waitMs: INTERACTION_SETTLE_MS });
  }

  async function openCategoryChooser(chooser, fillId, path, maxAttempts = LOCAL_INTERACTION_ATTEMPTS_DEFAULT) {
    const initialPath = location.pathname;
    const localMaxAttempts = normalizeLocalInteractionAttempts(maxAttempts);
    for (let attempt = 1; attempt <= localMaxAttempts; attempt += 1) {
      if (location.pathname === CATEGORY_PATH) return { pendingNavigation: true, fallbackUsed: false, attempt };
      if (modernDialog()) return { modernDialog: true, pendingNavigation: false, fallbackUsed: false, attempt };
      const currentChooser = attempt === 1 && chooser?.isConnected ? chooser : findCategoryChooser();
      if (!currentChooser) throw new Error('Kategorieauswahl wurde während des Wiederholungsversuchs nicht mehr gefunden.');
      const beforeUrl = location.href;
      let chooserHrefPath = null;
      try {
        const rawHref = currentChooser?.getAttribute?.('href') || currentChooser?.href || '';
        chooserHrefPath = rawHref ? new URL(rawHref, beforeUrl).pathname : null;
      } catch { chooserHrefPath = null; }

      void diagnostic(fillId, 'CATEGORY_OPEN_CLICK_STARTED', {
        fromPath: location.pathname,
        chooserTag: clean(currentChooser?.tagName || '').toLowerCase() || null,
        chooserHrefPath,
        attempt,
        maxAttempts: localMaxAttempts
      });
      currentChooser.click();
      void diagnostic(fillId, 'CATEGORY_OPEN_CLICK_DISPATCHED', {
        fromPath: new URL(beforeUrl).pathname,
        attempt,
        maxAttempts: localMaxAttempts
      });

      try {
        const opened = await waitFor(() => {
          if (location.pathname === CATEGORY_PATH) return 'legacy';
          return modernDialog() ? 'modal' : null;
        }, {
          timeout: Math.max(3500, CATEGORY_OPEN_LOCAL_CONFIRM_MS),
          interval: 50,
          description: 'Kategorieauswahl: Navigation oder Dialog'
        });
        if (opened === 'modal') {
          void diagnostic(fillId, 'CATEGORY_MODAL_OPEN_CONFIRMED', { fromPath: new URL(beforeUrl).pathname, attempt });
          return { modernDialog: true, pendingNavigation: false, fallbackUsed: false, attempt };
        }
        void diagnostic(fillId, 'CATEGORY_OPEN_NAVIGATION_CONFIRMED', {
          method: 'semantic-click',
          fromPath: new URL(beforeUrl).pathname,
          toPath: location.pathname,
          attempt,
          maxAttempts: localMaxAttempts
        });
        return { pendingNavigation: true, fallbackUsed: false, attempt };
      } catch (error) {
        void diagnostic(fillId, 'CATEGORY_OPEN_CLICK_UNCONFIRMED', {
          fromPath: new URL(beforeUrl).pathname,
          currentPath: location.pathname,
          chooserHrefPath,
          hasCategoryBox: Boolean(document.getElementById('postad-category-select-box')),
          waitMs: CATEGORY_OPEN_LOCAL_CONFIRM_MS,
          attempt,
          maxAttempts: localMaxAttempts,
          message: String(error.message || error).slice(0, 300)
        }, attempt < localMaxAttempts ? 'info' : 'warning');
      }
      if (location.pathname !== initialPath) {
        throw new Error(`Kategorieauswahl führte unerwartet zu „${location.pathname}“ statt zur Kategorieauswahl.`);
      }
      if (attempt < localMaxAttempts) {
        void diagnostic(fillId, 'CATEGORY_OPEN_LOCAL_RETRY', { attempt, nextAttempt: attempt + 1, maxAttempts: localMaxAttempts, waitMs: CATEGORY_OPEN_LOCAL_RETRY_DELAY_MS });
        await sleep(CATEGORY_OPEN_LOCAL_RETRY_DELAY_MS);
      }
    }

    throw new Error(`Kategorieauswahl wurde nach ${localMaxAttempts} zustandsgeprüften lokalen Klickversuchen nicht geöffnet.`);
  }


  async function setCategory(template, fillId, maxAttempts = LOCAL_INTERACTION_ATTEMPTS_DEFAULT) {
    const form = await waitFor(() => document.querySelector('form'), { description: 'Neues Anzeigenformular' });
    const hidden = form.querySelector('input[name="categoryId"]');
    const wanted = String(template.categoryId ?? '');
    if (!hidden || !/^\d+$/.test(wanted)) throw new Error('Kategorie-ID der Vorlage fehlt.');
    if (String(hidden.value) === wanted) return { confirmed: true, pendingNavigation: false };

    const path = Array.isArray(template.categoryPath) ? template.categoryPath.filter(Boolean) : [];
    if (!path.length) throw new Error('Kategoriepfad der Vorlage fehlt.');
    const chooser = [...form.querySelectorAll('a,button')].find(element => /wähle deine kategorie|kategorie ändern/i.test(visibleText(element)));
    const alreadyOpen = modernDialog();
    if (!chooser && !alreadyOpen) throw new Error('Kategorieauswahl wurde nicht gefunden.');

    await runtimeMessage({ type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId, status: 'running', stage: 'category-opening' });
    updatePanel('Kategorie wird übernommen', '„' + path.join(' › ') + '“ wird ausgewählt …');
    const opening = alreadyOpen
      ? { modernDialog: true, pendingNavigation: false }
      : await openCategoryChooser(chooser, fillId, path, maxAttempts);
    if (opening.modernDialog) return await selectModernCategory(template, fillId, path);
    return { confirmed: false, pendingNavigation: opening.pendingNavigation, fallbackUsed: opening.fallbackUsed };
  }

  function legacyCategoryAnchors() {
    return [...document.querySelectorAll('#postad-category-select-box a.category-selection-list-item-link, #postad-category-select-box a[id^="cat_"]')]
      .filter(visible);
  }

  function legacyCategoryColumns() {
    const box = document.getElementById('postad-category-select-box');
    if (!box) return [];
    return [...box.querySelectorAll('.category-selection-col')].filter(visible);
  }

  function normalizeWizardLabel(value) {
    return clean(value).replace(/\s*\*+\s*$/, '').toLocaleLowerCase('de-DE');
  }

  function matchWizardAttributeColumn(columnHeading, optionLabels, dynamicAttributes, selectedKeys = []) {
    const heading = normalizeWizardLabel(columnHeading);
    if (!heading) return null;
    const optionMap = new Map((optionLabels || [])
      .map(value => [clean(value).toLocaleLowerCase('de-DE'), clean(value)])
      .filter(([key]) => key));
    const selected = new Set((selectedKeys || []).map(String));
    for (const attribute of dynamicAttributes || []) {
      const key = String(attribute?.key || '');
      if (!key || selected.has(key)) continue;
      const label = normalizeWizardLabel(attribute?.label);
      const displayValue = clean(attribute?.displayValue);
      if (!label || label !== heading || !displayValue) continue;
      const requiredByWizard = /\*/.test(String(columnHeading || '')) || attribute?.required === true;
      if (!requiredByWizard) continue;
      if (!optionMap.has(displayValue.toLocaleLowerCase('de-DE'))) continue;
      return { key, displayValue, label: clean(attribute.label), technicalValue: attribute.technicalValue };
    }
    return null;
  }

  function legacyColumnHeading(column) {
    return visibleText(column?.querySelector('.sectionheadline,h2,h3,legend,[role="heading"]'));
  }

  function legacyColumnOptions(column) {
    return [...(column?.querySelectorAll('a,button,[role="option"],[role="menuitem"]') || [])]
      .filter(element => visible(element) && !actionText.test(visibleText(element)));
  }

  function findLegacyWizardAttributeChoice(template, selectedKeys = new Set()) {
    for (const column of legacyCategoryColumns()) {
      const options = legacyColumnOptions(column);
      const match = matchWizardAttributeColumn(
        legacyColumnHeading(column),
        options.map(option => visibleText(option)),
        template.dynamicAttributes || [],
        [...selectedKeys]
      );
      if (!match) continue;
      const wanted = match.displayValue.toLocaleLowerCase('de-DE');
      const control = options.find(option => visibleText(option).toLocaleLowerCase('de-DE') === wanted) || null;
      if (control) return { ...match, control, column };
    }
    return null;
  }

  function deepestVisibleCategoryPathIndex(visibleLabels, categoryPath) {
    const labels = new Set((visibleLabels || []).map(value => clean(value).toLocaleLowerCase('de-DE')).filter(Boolean));
    for (let index = (categoryPath || []).length - 1; index >= 0; index -= 1) {
      if (labels.has(clean(categoryPath[index]).toLocaleLowerCase('de-DE'))) return index;
    }
    return -1;
  }

  function legacyAnchorIsParent(anchor) {
    return Boolean(anchor?.closest('li')?.classList.contains('is-parent') || /(?:^|[?&])isParent=true(?:&|$)/i.test(anchor?.getAttribute('href') || ''));
  }

  function findLegacyCategoryAnchorById(categoryId) {
    const wanted = String(categoryId ?? '');
    if (!/^\d+$/.test(wanted)) return null;
    const direct = document.getElementById(`cat_${wanted}`);
    return direct && visible(direct) ? direct : null;
  }

  function findDeepestLegacyPathAnchor(categoryPath) {
    const anchors = legacyCategoryAnchors();
    const index = deepestVisibleCategoryPathIndex(anchors.map(anchor => visibleText(anchor)), categoryPath);
    if (index < 0) return null;
    const wanted = clean(categoryPath[index]).toLocaleLowerCase('de-DE');
    const anchor = anchors.find(item => visibleText(item).toLocaleLowerCase('de-DE') === wanted) || null;
    return anchor ? { anchor, index } : null;
  }

  function legacyColumnIndex(element) {
    const column = element?.closest('.category-selection-col');
    if (!column) return -1;
    return legacyCategoryColumns().indexOf(column);
  }

  function hasLaterLegacyColumn(element) {
    const index = legacyColumnIndex(element);
    const columns = legacyCategoryColumns();
    return index >= 0 && index < columns.length - 1;
  }

  function legacyCategoryStateSignature() {
    return legacyCategoryColumns().map(column => {
      const heading = legacyColumnHeading(column);
      const options = legacyColumnOptions(column).map(option => visibleText(option)).join('~');
      return `${heading}:${options}`;
    }).join('|');
  }

  function findLegacyContinueButton() {
    const form = document.getElementById('postad-step1-frm');
    if (!form) return null;
    return [...form.querySelectorAll('button,input[type="submit"]')].find(element => {
      if (!visible(element) || element.disabled) return false;
      const text = element instanceof HTMLInputElement ? clean(element.value) : visibleText(element);
      return /^weiter$/i.test(text);
    }) || null;
  }

  function unresolvedRequiredLegacyWizardColumnsAfter(element, template, selectedKeys = new Set()) {
    const columnIndex = legacyColumnIndex(element);
    if (columnIndex < 0) return [];
    const selected = new Set([...selectedKeys].map(String));
    const attributes = Array.isArray(template?.dynamicAttributes) ? template.dynamicAttributes : [];
    const unresolved = [];
    for (const column of legacyCategoryColumns().slice(columnIndex + 1)) {
      const heading = legacyColumnHeading(column);
      if (!/\*/.test(heading)) continue;
      const normalized = normalizeWizardLabel(heading);
      const attribute = attributes.find(item => normalizeWizardLabel(item?.label) === normalized) || null;
      if (!attribute?.key || !selected.has(String(attribute.key))) unresolved.push(heading || 'Pflichtauswahl');
    }
    return unresolved;
  }

  function legacyActionWaitMs(lastAt, now = Date.now()) {
    const previous = Number(lastAt || 0);
    if (previous <= 0) return 0;
    return Math.max(0, LEGACY_ACTION_DELAY_MS - (Number(now) - previous));
  }

  async function clickLegacyAction(element, actionState) {
    const remaining = legacyActionWaitMs(actionState?.lastAt);
    if (remaining > 0) await sleep(remaining);
    element.click();
    if (actionState) actionState.lastAt = Date.now();
  }

  async function finalizeLegacyCategorySelection({ fillId, template, path, wanted, selectedWizardAttributes, actionState, finalElement }) {
    // A final category click does not always navigate immediately. Some
    // Kleinanzeigen category flows keep the legacy wizard open and require
    // either additional required attributes or an explicit "Weiter" click.
    // Always give the page one complete action gap before deciding what the
    // final click caused.
    await sleep(LEGACY_ACTION_DELAY_MS);

    const maxSteps = Math.max(4, (template.dynamicAttributes || []).length + 3);
    for (let step = 0; step < maxSteps; step += 1) {
      if (location.pathname !== CATEGORY_PATH) {
        return { pendingNavigation: true, selectedCategoryId: wanted };
      }

      const wizardChoice = findLegacyWizardAttributeChoice(template, selectedWizardAttributes);
      if (wizardChoice) {
        selectedWizardAttributes.add(wizardChoice.key);
        await runtimeMessage({
          type: 'UPDATE_TEMPLATE_FILL_SESSION',
          fillId,
          status: 'running',
          stage: 'category-attribute-selected'
        });
        updatePanel(
          'Kategorie wird übernommen',
          `Angabe „${wizardChoice.label}“ = „${wizardChoice.displayValue}“ wird ausgewählt …`
        );
        await clickLegacyAction(wizardChoice.control, actionState);
        await sleep(LEGACY_ACTION_DELAY_MS);
        continue;
      }

      const continueButton = findLegacyContinueButton();
      if (continueButton) {
        await runtimeMessage({ type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId, status: 'running', stage: 'category-continuing' });
        updatePanel('Kategorie übernommen', `„${path.join(' › ')}“ ist ausgewählt. Weiter zu den Anzeigendetails …`);
        await clickLegacyAction(continueButton, actionState);
        await waitFor(() => location.pathname !== CATEGORY_PATH, {
          timeout: 15000,
          description: 'Rückkehr zu den Anzeigendetails'
        });
        return { pendingNavigation: true, selectedCategoryId: wanted };
      }

      try {
        await waitFor(() => {
          if (location.pathname !== CATEGORY_PATH) return true;
          if (findLegacyWizardAttributeChoice(template, selectedWizardAttributes)) return true;
          return Boolean(findLegacyContinueButton());
        }, {
          timeout: 10000,
          description: `Fortsetzung nach finaler Kategorie „${path.join(' › ')}“`
        });
      } catch (error) {
        const unresolvedHeadings = finalElement
          ? unresolvedRequiredLegacyWizardColumnsAfter(finalElement, template, selectedWizardAttributes)
          : [];
        if (unresolvedHeadings.length) {
          throw new Error(`Kategorie „${path.join(' › ')}“ benötigt noch eine Auswahl (${unresolvedHeadings.join(', ')}), die nicht eindeutig aus der Vorlage zugeordnet werden konnte.`);
        }
        throw new Error(`Kategorie „${path.join(' › ')}“ wurde ausgewählt, aber weder eine Navigation noch weitere Pflichtmerkmale oder „Weiter“ wurden verfügbar.`);
      }
    }

    throw new Error(`Kategorie „${path.join(' › ')}“ konnte nach der finalen Auswahl nicht abgeschlossen werden.`);
  }

  async function runLegacyCategorySelection(session) {
    const { fillId, template } = session;
    const wanted = String(template.categoryId ?? '');
    const path = Array.isArray(template.categoryPath) ? template.categoryPath.filter(Boolean) : [];
    if (!/^\d+$/.test(wanted)) throw new Error('Kategorie-ID der Vorlage fehlt.');
    if (!path.length) throw new Error('Kategoriepfad der Vorlage fehlt.');

    await waitFor(() => document.getElementById('postad-category-select-box'), {
      timeout: 15000,
      description: 'Kleinanzeigen-Kategorieauswahl'
    });
    await runtimeMessage({ type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId, status: 'running', stage: 'category-selecting' });
    updatePanel('Kategorie wird übernommen', `„${path.join(' › ')}“ wird ausgewählt …`);

    const selectedWizardAttributes = new Set();
    const selectedPathIndexes = new Set();
    const actionState = { lastAt: 0 };
    const maxSteps = Math.max(8, path.length + (template.dynamicAttributes || []).length + 4);
    for (let step = 0; step < maxSteps; step += 1) {
      if (location.pathname !== CATEGORY_PATH) return { pendingNavigation: true };

      // Kleinanzeigen may integrate required category attributes (for example
      // "Art *" -> "Weitere Damenbekleidung") directly into the legacy
      // category wizard. Prefer these visible, exact template values before
      // considering the category path finished.
      const wizardChoice = findLegacyWizardAttributeChoice(template, selectedWizardAttributes);
      if (wizardChoice) {
        selectedWizardAttributes.add(wizardChoice.key);
        await runtimeMessage({
          type: 'UPDATE_TEMPLATE_FILL_SESSION',
          fillId,
          status: 'running',
          stage: 'category-attribute-selected'
        });
        updatePanel(
          'Kategorie wird übernommen',
          `Angabe „${wizardChoice.label}“ = „${wizardChoice.displayValue}“ wird ausgewählt …`
        );
        await clickLegacyAction(wizardChoice.control, actionState);
        // Give Kleinanzeigen at least one full action gap to commit the wizard
        // selection before we inspect follow-up columns or the Continue button.
        await sleep(LEGACY_ACTION_DELAY_MS);
        if (location.pathname !== CATEGORY_PATH) return { pendingNavigation: true, selectedAttributeKey: wizardChoice.key };
        continue;
      }

      const direct = findLegacyCategoryAnchorById(wanted);
      if (direct && !legacyAnchorIsParent(direct)) {
        await runtimeMessage({ type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId, status: 'running', stage: 'category-leaf-selected' });
        await clickLegacyAction(direct, actionState);
        return await finalizeLegacyCategorySelection({
          fillId,
          template,
          path,
          wanted,
          selectedWizardAttributes,
          actionState,
          finalElement: direct
        });
      }

      const match = findDeepestLegacyPathAnchor(path);
      if (!match) {
        await waitFor(() => findLegacyCategoryAnchorById(wanted) || findDeepestLegacyPathAnchor(path) || findLegacyWizardAttributeChoice(template, selectedWizardAttributes), {
          timeout: 8000,
          description: `Kategoriepfad „${path.join(' › ')}“`
        });
        continue;
      }

      const { anchor, index } = match;
      // If a later wizard column is already visible, this path level has
      // already been selected. Do not replay the same parent link.
      if (hasLaterLegacyColumn(anchor)) {
        selectedPathIndexes.add(index);
        const unresolvedWizard = findLegacyWizardAttributeChoice(template, selectedWizardAttributes);
        if (unresolvedWizard) continue;
        if (index === path.length - 1 && legacyAnchorIsParent(anchor)) {
          const unresolvedHeadings = unresolvedRequiredLegacyWizardColumnsAfter(anchor, template, selectedWizardAttributes);
          if (unresolvedHeadings.length) {
            throw new Error(`Kategorie „${path.join(' › ')}“ benötigt noch eine Auswahl (${unresolvedHeadings.join(', ')}), die nicht eindeutig aus der Vorlage zugeordnet werden konnte.`);
          }
          const continueButton = findLegacyContinueButton();
          if (!continueButton) {
            throw new Error(`Kategorie „${path.join(' › ')}“ ist vollständig ausgewählt, aber „Weiter“ wurde nicht verfügbar.`);
          }
          await runtimeMessage({ type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId, status: 'running', stage: 'category-continuing' });
          updatePanel('Kategorie übernommen', `„${path.join(' › ')}“ ist ausgewählt. Weiter zu den Anzeigendetails …`);
          await clickLegacyAction(continueButton, actionState);
          await waitFor(() => location.pathname !== CATEGORY_PATH, {
            timeout: 15000,
            description: 'Rückkehr zu den Anzeigendetails'
          });
          return { pendingNavigation: true, selectedCategoryId: wanted };
        }
        continue;
      }

      if (selectedPathIndexes.has(index)) {
        throw new Error(`Kategoriepfad „${path.join(' › ')}“ konnte nicht weitergeführt werden.`);
      }

      const isLeafByPath = index === path.length - 1;
      const isParent = legacyAnchorIsParent(anchor);
      const before = legacyCategoryStateSignature();
      selectedPathIndexes.add(index);
      await runtimeMessage({
        type: 'UPDATE_TEMPLATE_FILL_SESSION',
        fillId,
        status: 'running',
        stage: isLeafByPath && !isParent ? 'category-leaf-selected' : 'category-parent-selected'
      });
      await clickLegacyAction(anchor, actionState);

      if (isLeafByPath) {
        return await finalizeLegacyCategorySelection({
          fillId,
          template,
          path,
          wanted,
          selectedWizardAttributes,
          actionState,
          finalElement: anchor
        });
      }

      await waitFor(() => {
        if (location.pathname !== CATEGORY_PATH) return true;
        if (findLegacyWizardAttributeChoice(template, selectedWizardAttributes)) return true;
        const deeper = findDeepestLegacyPathAnchor(path);
        if (deeper && deeper.index > index) return true;
        return legacyCategoryStateSignature() !== before;
      }, {
        timeout: 10000,
        description: `Unterkategorien nach „${visibleText(anchor)}“`
      });
      if (location.pathname !== CATEGORY_PATH) return { pendingNavigation: true };
    }

    throw new Error(`Kategorie „${path.join(' › ')}“ konnte nicht vollständig ausgewählt werden.`);
  }

    return Object.freeze({
      resolveCategoryNavigationUrl,
      normalizeLocalInteractionAttempts,
      settleAfterInteraction,
      setCategory,
      normalizeWizardLabel,
      matchWizardAttributeColumn,
      deepestVisibleCategoryPathIndex,
      legacyActionWaitMs,
      runLegacyCategorySelection
    });
  }

  const API = Object.freeze({ create });
  KRDeps.register('KRTemplateCategoryFlow', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
