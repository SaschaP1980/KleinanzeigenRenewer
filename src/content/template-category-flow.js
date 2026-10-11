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
      updatePanel
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
        await waitFor(() => location.pathname === CATEGORY_PATH, {
          timeout: CATEGORY_OPEN_LOCAL_CONFIRM_MS,
          interval: 50,
          description: 'Navigation zur Kategorieauswahl'
        });
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
    if (!chooser) throw new Error('Kategorieauswahl wurde nicht gefunden.');

    await runtimeMessage({ type: 'UPDATE_TEMPLATE_FILL_SESSION', fillId, status: 'running', stage: 'category-opening' });
    updatePanel('Kategorie wird übernommen', `„${path.join(' › ')}“ wird ausgewählt …`);
    const opening = await openCategoryChooser(chooser, fillId, path, maxAttempts);
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
