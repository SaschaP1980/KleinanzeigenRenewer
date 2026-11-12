// KAR-134: site-form schema observation and fail-closed compatibility policy.
// No page requests, no form mutation, no remote mutation, and no raw HTML logging.
(() => {
  'use strict';
  if (globalThis.KRDeps?.has?.('KRTemplateSchemaPreflight')) {
    if (typeof module !== 'undefined' && module?.exports) module.exports = globalThis.KRDeps.require('KRTemplateSchemaPreflight');
    return;
  }
  function create({ Schema, Form, waitFor, documentRoot = () => document } = {}) {
    if (!Schema?.buildSchema || !Schema?.fingerprint || !Schema?.diff || !waitFor)
      throw new Error('Template schema preflight dependencies missing');
    const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
    const hasValue = value => value !== null && value !== undefined && value !== '' &&
      !(Array.isArray(value) && value.length === 0);
    const exactCategory = value => {
      const id = String(value ?? '').trim();
      if (!/^[1-9][0-9]*$/.test(id)) throw new Error('Kategorie-ID fehlt oder ist nicht eindeutig.');
      return id;
    };
    const aliasFor = (categoryId, oldKey) => {
      if (String(categoryId) !== '405') return null;
      const verified = Object.freeze({
        'wearables.gehausegrosse': 'wearables.case_size',
        'wearables.ringgrosse': 'wearables.ring_size'
      });
      return verified[oldKey] || null;
    };
    // Owner-verified in the live, unpublished category-405 form (2026-11-11).
    // Evidence is exactly two manual selections, NOT an inference that every
    // displayed size follows the same rule or a full technical option catalog.
    const ownerConfirmedCaseSizePairs = Object.freeze([
      Object.freeze({ value: '38', label: '38mm' }),
      Object.freeze({ value: '44', label: '44mm' })
    ]);
    const isOwnerConfirmedLegacyCaseSize = template => {
      if (String(template?.categoryId || '') !== '405') return false;
      const originals = (template.dynamicAttributes || []).filter(item =>
        item?.key === 'wearables.gehausegrosse' && item.technicalValue != null);
      return originals.length === 1 && ownerConfirmedCaseSizePairs.some(pair =>
        pair.value === String(originals[0].technicalValue));
    };
    function inspectForm(form, expectedCategory, sourceDoc = documentRoot()) {
      if (!form?.querySelectorAll) throw new Error('Aktuelles Anzeigenformular fehlt.');
      const categoryControls = [...form.querySelectorAll('input[name="categoryId"]')];
      if (categoryControls.length !== 1) throw new Error('Kategorie-ID im aktuellen Formular ist nicht eindeutig.');
      const categoryId = exactCategory(categoryControls[0].value);
      if (categoryId !== exactCategory(expectedCategory)) throw new Error('Aktuelle Kategorie stimmt nicht mit der gespeicherten Kategorie überein.');
      if (form.querySelector('[aria-busy="true"]')) throw new Error('Kategorieabhängige Formularfelder werden noch geladen.');
      const island = sourceDoc?.querySelector?.('astro-island[component-url*="PostListingForm"]');
      const props = Form?.decodeAstroProps?.(island?.getAttribute?.('props'));
      const page = props?.postListingPage;
      // Never trust structured definitions if their numeric category does not match the committed form.
      const definitions = String(page?.category?.id ?? '') === categoryId &&
        page?.category?.attributes && typeof page.category.attributes === 'object'
          ? page.category.attributes : {};
      const grouped = new Map();
      for (const element of form.querySelectorAll('[name^="attributeMap["]')) {
        const name = element.getAttribute('name') || '';
        const match = name.match(/^attributeMap\[([^\]]+)\]$/);
        if (!match || /versand|shipping|delivery/i.test(match[1])) continue;
        const key = match[1];
        const entry = grouped.get(key) || [];
        entry.push(element);
        grouped.set(key, entry);
      }
      const dynamicAttributes = [], readbacks = Object.create(null), optionLabels = Object.create(null);
      for (const [key, controls] of grouped) {
        const type = String(controls[0].getAttribute('type') || controls[0].tagName || '').toLowerCase();
        if (controls.length > 1 && !(type === 'radio' && controls.every(c => c.getAttribute('type') === 'radio')))
          throw new Error('Technisches Merkmal ' + key + ' ist mehrfach und uneindeutig vorhanden.');
        const definition = definitions[key];
        const liveOptions = Array.isArray(definition?.localizedOptions) ? definition.localizedOptions : null;
        const options = liveOptions
          ? liveOptions.map(option => ({ value: option?.value, label: clean(option?.localizedValue || option?.label || '') }))
          : type === 'radio'
            ? controls.map(control => ({ value: control.value, label: '' }))
            : controls[0].tagName === 'SELECT'
              ? [...controls[0].querySelectorAll('option')].map(option => ({ value: option.value, label: clean(option.textContent) }))
              : [];
        const peer = sourceDoc?.getElementById?.(key);
        const typeOfPeer = peer && form.contains(peer)
          ? clean(peer.getAttribute('role') || peer.getAttribute('type') || peer.tagName).toLowerCase() : null;
        const actualKind = typeOfPeer === 'combobox' ? 'combobox' : typeOfPeer === 'select' ? 'select' : type;
        const required = definition?.required === true || controls.some(control =>
          control.hasAttribute('required') || control.getAttribute('aria-required') === 'true');
        const requiredKnown = typeof definition?.required === 'boolean' || required;
        dynamicAttributes.push({
          key, controlType: actualKind, required, requiredKnown,
          optionsComplete: Boolean(liveOptions) || type === 'radio' || controls[0].tagName === 'SELECT',
          options
        });
        readbacks[key] = type === 'checkbox' ? Boolean(controls[0].checked)
          : type === 'radio' ? controls.find(control => control.checked)?.value ?? null
            : controls[0].value ?? null;
        optionLabels[key] = options.map(option => ({ value: String(option.value), label: option.label }));
      }
      const fields = [];
      const core = new Set(['title', 'description', 'priceAmount', 'priceType', 'adType', 'buyNow']);
      const seen = new Set();
      for (const element of form.querySelectorAll('input[name],textarea[name],select[name]')) {
        if (!core.has(element.name) || seen.has(element.name)) continue;
        seen.add(element.name);
        fields.push({ name: element.name, type: element.getAttribute('type') || element.tagName.toLowerCase(),
          required: element.hasAttribute('required') || element.getAttribute('aria-required') === 'true',
          requiredKnown: element.hasAttribute('required') || element.getAttribute('aria-required') === 'true',
          options: element.tagName === 'SELECT'
            ? [...element.querySelectorAll('option')].map(option => ({ value: option.value })) : [] });
        readbacks['field:' + element.name] = element.type === 'checkbox' ? Boolean(element.checked) : element.value;
      }
      return { schema: Schema.buildSchema({ categoryId, fields, dynamicAttributes }),
        readbacks, optionLabels, categoryId, dynamicCount: dynamicAttributes.length, form };
    }
    // KAR-134 owner-only read-only probe: a custom 405 combobox may render
    // its options only AFTER opening a popup. Only inspect the exact case-size
    // button, never click an option, never infer numeric IDs from text.
    async function probeCaseSizeOptions(observed) {
      const key = 'wearables.case_size', fieldKey = 'attribute:' + key;
      const doc = documentRoot(), form = observed.form;
      const field = observed.schema.fields.find(entry => entry.key === fieldKey);
      const audit = { attempted: false, popupFound: false, renderedOptionCount: 0,
        explicitTechnicalOptionCount: 0, ownerVerifiedPairCount: 0,
        verified: false, reason: 'no-verified-popup' };
      if (observed.categoryId !== '405' || !field) {
        return { ...observed, optionProbe: { ...audit, reason: 'field-or-category-missing' } };
      }
      if (Array.isArray(field.optionValues) && field.optionValues.length > 0) {
        return { ...observed, optionProbe: { ...audit, verified: true, reason: 'structured-catalog' } };
      }
      const hidden = [...form.querySelectorAll('input[name="attributeMap[wearables.case_size]"]')];
      const control = doc?.getElementById?.(key);
      if (hidden.length !== 1 || !control || !form.contains(control) ||
          control.tagName !== 'BUTTON' || control.getAttribute('role') !== 'combobox' ||
          control.getAttribute('disabled') !== null || control.getAttribute('aria-disabled') === 'true') {
        return { ...observed, optionProbe: { ...audit, reason: 'exact-combobox-not-confirmed' } };
      }
      const initial = String(hidden[0].value ?? '');
      const visibleRoot = element => Boolean(element &&
        !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true' &&
        (!element.getClientRects || element.getClientRects().length > 0));
      const popupRoots = () => [...doc.querySelectorAll('[role="listbox"],[role="menu"]')]
        .filter(visibleRoot);
      const before = new Set(popupRoots());
      const originallyExpanded = control.getAttribute('aria-expanded') === 'true';
      audit.attempted = true;
      const findPopup = () => {
        const linkedIds = String(control.getAttribute('aria-controls') ||
          control.getAttribute('aria-owns') || '').split(/\s+/).filter(Boolean);
        const linked = linkedIds.map(id => doc.getElementById(id)).filter(visibleRoot);
        const linkedRoots = linked.map(node => node.matches('[role="listbox"],[role="menu"]')
          ? node : node.querySelector('[role="listbox"],[role="menu"]') || node)
          .filter(node => visibleRoot(node) && node.querySelectorAll('[role="option"],[role="menuitem"]').length);
        if (linkedRoots.length === 1) return linkedRoots[0];
        if (linkedRoots.length > 1) return null;
        const opened = popupRoots().filter(root => !before.has(root) ||
          (originallyExpanded && root.querySelectorAll('[role="option"],[role="menuitem"]').length));
        return opened.length === 1 ? opened[0] : null;
      };
      let popup = null;
      try {
        if (!originallyExpanded) control.click(); // opens the menu, never selects an option
        popup = await waitFor(() => {
          const candidate = findPopup();
          return candidate?.querySelectorAll('[role="option"],[role="menuitem"]').length
            ? candidate : null;
        }, { timeout: 1800, interval: 70, description: 'Read-only Gehäusegrößen-Auswahl' })
          .catch(() => null);
        audit.popupFound = Boolean(popup);
        if (!popup) {
          audit.reason = 'popup-options-not-accessible';
          return { ...observed, optionProbe: audit };
        }
        const rows = [...popup.querySelectorAll('[role="option"],[role="menuitem"]')]
          .filter(node => node.getAttribute('aria-disabled') !== 'true');
        audit.renderedOptionCount = rows.length;
        const tagged = rows.map(row => ({
          value: row.getAttribute('data-value') ?? row.getAttribute('value'),
          label: clean(row.textContent)
        }));
        audit.explicitTechnicalOptionCount = tagged.filter(row =>
          row.value !== null && row.value !== '' && row.label).length;
        const ids = tagged.map(item => item.value);
        const sizeMarkers = rows.map(row => Number(row.getAttribute('aria-setsize')))
          .filter(n => Number.isSafeInteger(n) && n > 0);
        const truncated = sizeMarkers.some(n => n > rows.length) ||
          Boolean(popup.querySelector('[data-virtualizer], [data-virtual]'));
        // Current Kleinanzeigen renders li[role=option] labels with NO explicit
        // per-item technical IDs. Admit ONLY the two independently selected
        // owner-confirmed pairs, and only if the exact linked live menu displays
        // BOTH labels uniquely. Do not set field.optionValues: the remaining
        // technical options are unknown and must stay unknown in the fingerprint.
        const allLabelOnly = tagged.length >= 4 && tagged.every(item =>
          item.value === null && item.label.length > 0);
        const linkedPopup = popup.id && popup.id === control.getAttribute('aria-controls');
        const uniqueLabels = new Set(tagged.map(item => item.label)).size === tagged.length;
        if (initial === '' && !truncated && linkedPopup && allLabelOnly && uniqueLabels &&
            ownerConfirmedCaseSizePairs.every(pair =>
              tagged.filter(item => item.label === pair.label).length === 1)) {
          audit.ownerVerifiedPairCount = ownerConfirmedCaseSizePairs.length;
          audit.reason = 'owner-confirmed-case-size-pairs';
          const optionLabels = { ...observed.optionLabels,
            [key]: ownerConfirmedCaseSizePairs.map(pair => ({ ...pair })) };
          return { ...observed, optionLabels, optionProbe: audit };
        }
        if (!rows.length || tagged.some(item => item.value === null ||
            item.value === '' || !item.label) || new Set(ids).size !== ids.length || truncated) {
          audit.reason = truncated ? 'popup-incomplete-or-virtualized' : 'popup-technical-ids-not-proven';
          return { ...observed, optionProbe: audit };
        }
        audit.verified = true;
        audit.reason = 'linked-popup-technical-catalog';
        const optionValues = ids.map(String).sort();
        const schema = { ...observed.schema, fields: observed.schema.fields.map(entry =>
          entry.key === fieldKey ? { ...entry, optionValues } : entry) };
        const optionLabels = { ...observed.optionLabels, [key]:
          tagged.map(item => ({ value: String(item.value), label: item.label })) };
        return { ...observed, schema, optionLabels, optionProbe: audit };
      } finally {
        // Escape only; never activate a choice. Closing the menu is cosmetic.
        if (!originallyExpanded && control.isConnected &&
            typeof globalThis.KeyboardEvent === 'function') {
          control.dispatchEvent(new globalThis.KeyboardEvent('keydown',
            { key: 'Escape', bubbles: true, cancelable: true }));
        }
        if (String(hidden[0].value ?? '') !== initial) {
          throw new Error('Read-only Schema-Prüfmodus: Technischer Formularwert wurde unerwartet verändert.');
        }
      }
    }

    async function afterHydration(template, { probeReadOnlyCaseSize = false } = {}) {
      const doc = documentRoot();
      let last = null, repetitions = 0;
      const observed = await waitFor(() => {
        const forms = [...doc.querySelectorAll('form')].filter(form => form.querySelector('input[name="categoryId"]'));
        if (forms.length !== 1) return null;
        const current = inspectForm(forms[0], template.categoryId, doc);
        const signature = JSON.stringify(current.schema);
        if (signature !== last) { last = signature; repetitions = 0; return null; }
        repetitions += 1;
        return repetitions >= 2 ? current : null;
      }, { timeout: 2500, interval: 120, description: 'Kategorieabhängiges Formularschema' });
      if ((template.dynamicAttributes || []).some(attr => hasValue(attr?.technicalValue)) && observed.dynamicCount === 0)
        throw new Error('Kategorieabhängige Merkmale fehlen im aktuellen Formular.');
      // Only old category-405 templates whose saved technical value was
      // directly measured by the owner may invoke the narrowly scoped
      // popup check in the productive preflight. All other cases stay read-only
      // and fail closed exactly as before.
      return probeReadOnlyCaseSize || isOwnerConfirmedLegacyCaseSize(template)
        ? probeCaseSizeOptions(observed) : observed;
    }
    async function evaluate(template, observed) {
      const issues = [], warnings = [], mappings = [];
      const saved = template.templateSchema?.snapshot || null;
      const provided = template.templateSchema?.fingerprint || null;
      let comparison;
      if (template.templateSchema && (!saved || !/^[a-f0-9]{64}$/.test(String(provided)))) {
        issues.push('Die gespeicherte Formularschema-Prüfsumme ist unvollständig.');
      } else if (saved) {
        try {
          if (await Schema.fingerprint(saved) !== provided) issues.push('Die gespeicherte Formularschema-Prüfsumme stimmt nicht überein.');
          comparison = Schema.diff(saved, observed.schema);
        } catch (_) {
          issues.push('Die gespeicherte Formularschema-Version ist nicht lesbar.');
        }
      } else {
        comparison = Schema.diff(null, observed.schema);
        warnings.push('Ältere Vorlage ohne Formularschema-Fingerprint. Merkmale werden einzeln überprüft.');
      }
      const fields = new Map(observed.schema.fields.map(field => [field.key, field]));
      const represented = new Set();
      for (const attribute of template.dynamicAttributes || []) {
        if (!attribute?.key) continue;
        // A formerly visible saved selection with no recoverable technical ID
        // is NOT an empty optional field. Otherwise a legacy archive can
        // silently lose that selection even with an unchanged live schema.
        if (!hasValue(attribute.technicalValue)) {
          const capturedVisibleValue = clean(attribute.displayValue || '').length > 0 &&
            attribute.status !== 'empty';
          if (capturedVisibleValue || ['captured', 'technical-only'].includes(attribute.status)) {
            issues.push('Gespeichertes Merkmal „' + clean(attribute.label || attribute.key) +
              '“ hat einen sichtbaren Auswahlwert ohne eindeutig gespeicherten technischen Wert. Bitte Vorlage neu erfassen oder manuell prüfen.');
          }
          continue;
        }
        const oldKey = 'attribute:' + attribute.key;
        let liveKey = oldKey, liveField = fields.get(liveKey), mapped = false;
        if (!liveField) {
          const replacement = aliasFor(observed.categoryId, attribute.key);
          if (replacement) { liveKey = 'attribute:' + replacement; liveField = fields.get(liveKey); mapped = Boolean(liveField); }
        }
        if (!liveField) {
          issues.push('Gespeichertes Merkmal „' + clean(attribute.label || attribute.key) + '“ ist im neuen Formular nicht vorhanden.');
          continue;
        }
        const value = attribute.technicalValue;
        if (liveField.optionValues && !liveField.optionValues.includes(String(value))) {
          issues.push('Gespeicherter Wert für „' + clean(attribute.label || attribute.key) + '“ wird im neuen Formular nicht angeboten.');
          continue;
        }
        if (mapped) {
          // A category-scoped rule alone is never proof. Exact present option ID AND label
          // are required to admit this alias; final live readback must prove both again.
          const available = observed.optionLabels[liveKey.slice('attribute:'.length)] || [];
          const selected = available.filter(option => option.value === String(value) && option.label);
          if (selected.length !== 1) {
            issues.push('Neue Auswahl für „' + clean(attribute.label || attribute.key) + '“ ist nicht eindeutig bestätigt.');
            continue;
          }
          mappings.push({ oldKey: attribute.key, newKey: liveKey.slice('attribute:'.length),
            technicalValue: String(value), expectedDisplayLabel: selected[0].label });
        }
        represented.add(liveKey);
      }
      for (const field of observed.schema.fields) {
        if (field.requiredState !== 'required') continue;
        if (field.key.startsWith('attribute:') && !represented.has(field.key)) {
          issues.push('Neues Pflichtmerkmal „' + field.key.slice('attribute:'.length) + '“ muss vor der Veröffentlichung geprüft werden.');
        }
        if (field.key.startsWith('field:')) {
          const key = field.key.slice(6), fromTemplate = key === 'title' ? template.title
            : key === 'description' ? template.description : key === 'priceAmount' ? template.price?.value
              : key === 'priceType' ? template.price?.type : key === 'adType' ? template.adType?.value
                : key === 'buyNow' ? template.buyNow?.value : null;
          if (!hasValue(fromTemplate))
            issues.push('Pflichtfeld „' + key + '“ fehlt in der gespeicherten Vorlage.');
        }
      }
      if (comparison?.status === 'category-mismatch') issues.push('Das aktuelle Formular gehört zu einer anderen Kategorie.');
      if (comparison?.status === 'schema-changed')
        warnings.push('Kleinanzeigen hat Felder oder Auswahlmöglichkeiten verändert. Alle gespeicherten Werte müssen bestätigt werden.');
      return { complete: issues.length === 0, issues: [...new Set(issues)], warnings,
        comparison, sourceFingerprint: provided || null,
        currentFingerprint: await Schema.fingerprint(observed.schema), mappings };
    }
    function verifyAfterFill(report, observed) {
      const issues = [];
      if (!report?.complete) return ['Formularschema-Vorprüfung ist nicht erfolgreich abgeschlossen.'];
      for (const mapping of report.mappings || []) {
        const inputs = [...observed.form.querySelectorAll('input[name^="attributeMap["]')]
          .filter(input => input.name === 'attributeMap[' + mapping.newKey + ']');
        if (inputs.length !== 1 || String(inputs[0].value) !== mapping.technicalValue) {
          issues.push('Umbenanntes Merkmal „' + mapping.oldKey + '“: technischer Wert nicht bestätigt.');
          continue;
        }
        const peer = observed.form.ownerDocument.getElementById(mapping.newKey);
        const shown = clean(peer?.textContent || peer?.getAttribute?.('aria-valuetext') || '');
        const selectLabel = inputs[0].tagName === 'SELECT'
          ? clean(inputs[0].selectedOptions?.[0]?.textContent || '') : '';
        if (shown !== mapping.expectedDisplayLabel && selectLabel !== mapping.expectedDisplayLabel) {
          issues.push('Umbenanntes Merkmal „' + mapping.oldKey + '“: sichtbarer Auswahlwert nicht bestätigt.');
        }
      }
      for (const field of observed.schema.fields.filter(field => field.requiredState === 'required' && field.key.startsWith('attribute:'))) {
        const key = field.key.slice('attribute:'.length);
        const controls = [...observed.form.querySelectorAll('[name^="attributeMap["]')].filter(control =>
          control.getAttribute('name') === 'attributeMap[' + key + ']');
        const control = controls.length === 1 ? controls[0] : null;
        const allRadio = controls.length > 0 && controls.every(item => item.type === 'radio');
        const valid = allRadio ? controls.some(item => item.checked === true)
          : Boolean(control && (control.type === 'checkbox'
            ? control.checked === true : hasValue(control.value)));
        if (!valid) {
          issues.push('Pflichtmerkmal „' + key + '“ wurde nicht bestätigt.');
        }
      }
      return [...new Set(issues)];
    }
    return Object.freeze({ inspectForm, afterHydration, evaluate, verifyAfterFill });
  }
  const API = Object.freeze({ create });
  globalThis.KRDeps?.register?.('KRTemplateSchemaPreflight', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
