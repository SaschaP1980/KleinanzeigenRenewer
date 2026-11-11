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
    async function afterHydration(template) {
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
      return observed;
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
        if (!attribute?.key || !hasValue(attribute.technicalValue)) continue;
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
        const valid = control && (control.type === 'checkbox'
          ? control.checked === true
          : control.type === 'radio' ? controls.some(item => item.checked === true)
            : hasValue(control.value));
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
