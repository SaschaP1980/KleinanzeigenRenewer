// Read-only snapshot of an existing Kleinanzeigen edit form.
// No clicks, events, submissions, or session tokens.
(() => {
  if (globalThis.__KR_FORM_EXTRACTOR_V150__) return;
  globalThis.__KR_FORM_EXTRACTOR_V150__ = true;
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const sensitive = /csrf|xsrf|token|password|captcha|session|authorization|cookie/i;
  const excluded = /newsletter|marketing|regular.*mail|regelmäßigen.*mail|pushup|bump|hochschieb|highlight|top.?anzeige|wiederholtes|promotion|feature.?package|premium|galerie.*sichtbarkeit|\barticles\b/i;
  const nativeSelector = 'input,textarea,select';
  const customSelector = '[role="combobox"],[role="listbox"],[role="radiogroup"]';
  const actionButton = /^(mehr erfahren|bilder hinzufügen|fototipps|vorschau|anzeige speichern|änderungen speichern|kategorie ändern)$/i;
  const personalField = /(^|[._-])(contact(name)?|zip(code)?|postal(code)?|street(name)?|city|locality|location(id)?|address(visibility)?)([._-]|$)|\b(plz|straße|strasse|ort)\b/i;
  const descriptor = element => ({
    tag: element.tagName,
    id: element.id || '',
    name: element.getAttribute('name') || '',
    role: element.getAttribute('role') || ''
  });

  function visibleText(element) {
    if (!element) return '';
    const clone = element.cloneNode(true);
    for (const hidden of clone.querySelectorAll('.sr-only,[aria-hidden="true"],[hidden]')) hidden.remove();
    return clean(clone.textContent);
  }

  function decodeAstroTagged(value) {
    if (!Array.isArray(value) || value.length !== 2 || !Number.isInteger(value[0])) return undefined;
    const [type, payload] = value;
    if (type === 0) return decodeAstroObject(payload);
    if (type === 1) return Array.isArray(payload) ? payload.map(decodeAstroTagged) : [];
    return undefined;
  }

  function decodeAstroObject(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
    const result = {};
    for (const [key, tagged] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
      result[key] = decodeAstroTagged(tagged);
    }
    return result;
  }

  function decodeAstroProps(raw) {
    if (!raw) return null;
    try {
      return decodeAstroObject(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  function structuredPostListing(document) {
    const island = document.querySelector('astro-island[component-url*="PostListingForm"]');
    const props = decodeAstroProps(island?.getAttribute('props'));
    const page = props?.postListingPage;
    if (!page || page.editMode !== true || !page.adData || !page.category) return null;
    const categoryPath = [page.category.parentName, page.category.name].filter(Boolean).map(clean);
    const explicitImageArray = Array.isArray(page.adData.images);
    const images = explicitImageArray ? page.adData.images.map((image, index) => ({
      index,
      thumbnailUrl: typeof image?.dynamicRuleThumbnailUrl === 'string' ? image.dynamicRuleThumbnailUrl : '',
      xxLargeUrl: typeof image?.dynamicRuleXXLargeUrl === 'string' ? image.dynamicRuleXXLargeUrl : '',
      title: typeof image?.title === 'string' ? image.title : null
    })) : [];
    return {
      source: 'post-listing-props',
      adData: page.adData,
      address: page.address || null,
      category: page.category,
      availableShippingOptions: page.availableShippingOptions || null,
      categoryPath,
      images,
      explicitImageArray
    };
  }

  function selectedStructuredAttribute(adData, key) {
    const selected = adData?.attributes?.[key];
    if (selected && typeof selected === 'object' && !Array.isArray(selected)) return selected.value ?? null;
    return selected ?? null;
  }

  function structuredOptionLabel(definition, value) {
    if (value === null || value === undefined || value === '') return '';
    const options = Array.isArray(definition?.localizedOptions) ? definition.localizedOptions : [];
    return clean(options.find(option => String(option?.value ?? '') === String(value))?.localizedValue || '');
  }

  function labelOf(element, scope) {
    const labelled = (element.getAttribute('aria-labelledby') || '')
      .split(/\s+/)
      .filter(Boolean)
      .map(id => element.ownerDocument.getElementById(id)?.textContent || '')
      .join(' ');
    const labels = [...scope.querySelectorAll('label')].filter(label => label.getAttribute('for') === element.id && element.id);
    return clean(labels.map(label => label.textContent).join(' ') || element.getAttribute('aria-label') || labelled || element.closest('label')?.textContent || '');
  }

  function identity(document, base, form) {
    const ids = [];
    function fromUrl(raw) {
      try {
        const url = new URL(raw, base);
        if (url.origin !== new URL(base).origin) return;
        const pathId = url.pathname.match(/\/(\d+)-\d+-\d+/)?.[1];
        if (pathId) ids.push(pathId);
        for (const key of ['adId', 'ad_id', 'advertisementId']) {
          const value = url.searchParams.get(key);
          if (/^\d+$/.test(value || '')) ids.push(value);
        }
      } catch { /* invalid URL ignored */ }
    }
    fromUrl(base);
    fromUrl(form?.getAttribute('action') || base);
    for (const element of form?.querySelectorAll('input[name]') || []) {
      if (/^(adId|ad_id|advertisementId)$/i.test(element.name || element.getAttribute('name'))) {
        const value = element.value;
        if (/^\d+$/.test(value || '')) ids.push(value);
      }
    }
    const unique = [...new Set(ids)];
    return { adId: unique.length === 1 ? unique[0] : null, conflict: unique.length > 1 };
  }

  function locate(document, base) {
    const candidates = [...document.querySelectorAll('form')].filter(form => form.querySelector('textarea') && (
      /bearbeit|edit/i.test(new URL(base).pathname + ' ' + (form.getAttribute('action') || '')) ||
      [...form.querySelectorAll('button,input[type="submit"]')].some(button => /anzeige speichern|änderungen speichern/i.test(button.textContent || button.value || ''))
    ));
    const form = candidates.length === 1 ? candidates[0] : null;
    const id = identity(document, base, form);
    return { form, ...id, eligible: Boolean(form && id.adId && !id.conflict), candidateCount: candidates.length };
  }

  function controlOptions(element, form) {
    const type = (element.getAttribute('type') || element.tagName.toLowerCase()).toLowerCase();
    if (type === 'radio') {
      const name = element.getAttribute('name') || element.id;
      return [...form.querySelectorAll('input[type="radio"]')]
        .filter(item => (item.getAttribute('name') || item.id) === name)
        .map(item => ({
          value: item.value ?? item.getAttribute('value'),
          label: labelOf(item, form),
          selected: typeof item.checked === 'boolean' ? item.checked : item.hasAttribute('checked')
        }));
    }
    if (element.tagName === 'SELECT') {
      return [...element.querySelectorAll('option')].map(option => ({
        value: option.value ?? option.getAttribute('value'),
        label: clean(option.textContent),
        selected: Boolean(option.selected)
      }));
    }
    return [...element.querySelectorAll?.('[role="option"],[role="radio"]') || []].map(option => ({
      value: option.getAttribute('data-value'),
      label: clean(option.textContent),
      selected: option.getAttribute('aria-selected') === 'true' || option.getAttribute('aria-checked') === 'true'
    }));
  }

  function readControl(element, form) {
    if (!element) return { value: null, displayValue: '', options: [], type: 'missing', source: 'missing' };
    const type = (element.getAttribute('type') || element.tagName.toLowerCase()).toLowerCase();
    const options = controlOptions(element, form);
    let value = null;
    let displayValue = '';
    let checked;
    let source = element.matches(nativeSelector) ? 'native' : 'custom';

    if (type === 'radio') {
      const selected = options.filter(option => option.selected);
      if (selected.length === 1) {
        value = selected[0].value;
        displayValue = selected[0].label;
      }
    } else if (type === 'checkbox') {
      checked = typeof element.checked === 'boolean' ? element.checked : element.hasAttribute('checked');
      value = checked;
      displayValue = checked ? 'Ein' : 'Aus';
    } else if (element.tagName === 'SELECT') {
      const selected = options.filter(option => option.selected);
      value = element.multiple ? selected.map(option => option.value) : (element.value ?? null);
      displayValue = selected.map(option => option.label).join(', ') || options.find(option => option.value === value)?.label || '';
    } else if (element.matches(nativeSelector)) {
      value = element.value ?? element.getAttribute('value') ?? '';
      displayValue = String(value);
    } else {
      const selected = options.filter(option => option.selected);
      const hidden = [...element.querySelectorAll('input[type="hidden"]')].find(item => !sensitive.test(item.name || item.id));
      value = element.getAttribute('data-value') ?? hidden?.value ?? (selected.length === 1 ? selected[0].value : null);
      displayValue = element.getAttribute('aria-valuetext') || (selected.length ? selected.map(option => option.label).join(', ') : visibleText(element));
    }
    return { value, displayValue, options, checked, type, source };
  }

  function attributeKey(name) {
    return name?.match(/^attributeMap\[([^\]]+)\]$/)?.[1] || null;
  }

  function visibleControlCandidates(root, hidden) {
    return [...root.querySelectorAll('button,[role="combobox"],[role="listbox"],select,input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]),textarea')]
      .filter(element => element !== hidden && !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true' && !actionButton.test(clean(element.textContent || element.value || '')));
  }

  function findNearbyControl(hidden, form, key) {
    const direct = hidden.ownerDocument.getElementById(key);
    if (direct && form.contains(direct) && direct !== hidden) return direct;
    let node = hidden.parentElement;
    for (let depth = 0; node && node !== form && depth < 6; depth += 1, node = node.parentElement) {
      const candidates = visibleControlCandidates(node, hidden);
      if (candidates.length === 1) return candidates[0];
    }
    return null;
  }

  function localLabel(hidden, peer, form, fallbackKey) {
    const direct = peer ? labelOf(peer, form) : '';
    if (direct) return direct;
    let node = (peer || hidden).parentElement;
    for (let depth = 0; node && node !== form && depth < 6; depth += 1, node = node.parentElement) {
      const labels = [...node.querySelectorAll('label')].map(label => clean(label.textContent)).filter(text => text && text.length <= 100);
      const unique = [...new Set(labels)];
      if (unique.length === 1) return unique[0];
    }
    return fallbackKey;
  }

  function buildDynamicAttributes(form, structured) {
    const domAttributes = [];
    const pairedControls = new Set();
    const pairedTechnicalNames = new Set();
    const seen = new Set();
    const technicalControls = [...form.querySelectorAll('[name^="attributeMap["]')];
    for (const technical of technicalControls) {
      const technicalName = technical.getAttribute('name') || '';
      const key = attributeKey(technicalName);
      if (!key || seen.has(technicalName)) continue;
      const type = (technical.getAttribute('type') || technical.tagName.toLowerCase()).toLowerCase();
      const technicalRead = readControl(technical, form);
      const technicalLabel = labelOf(technical, form);
      // Shipping is modeled separately even though Kleinanzeigen currently serializes it through attributeMap.
      if (/versand|shipping|delivery/i.test(technicalName + ' ' + technical.id + ' ' + technicalLabel)) continue;
      seen.add(technicalName);

      const peer = type === 'hidden' ? findNearbyControl(technical, form, key) : technical;
      const displayRead = readControl(peer, form);
      const technicalValue = type === 'hidden'
        ? (technical.value ?? technical.getAttribute('value') ?? '')
        : technicalRead.value;
      const displayValue = peer ? displayRead.displayValue : '';
      const label = localLabel(technical, peer, form, key);
      const status = technicalValue === null
        ? 'unresolved'
        : technicalValue === '' || (Array.isArray(technicalValue) && !technicalValue.length)
          ? 'empty'
          : displayValue
            ? 'captured'
            : 'technical-only';
      if (peer) pairedControls.add(peer);
      pairedTechnicalNames.add(technicalName);
      domAttributes.push({
        key,
        technicalName,
        label,
        technicalValue,
        displayValue,
        controlType: peer ? displayRead.type : type,
        controlId: peer?.id || '',
        options: displayRead.options?.length ? displayRead.options : technicalRead.options,
        required: Boolean(peer && (peer.hasAttribute('required') || peer.getAttribute('aria-required') === 'true')),
        disabled: Boolean(peer?.hasAttribute('disabled')),
        present: true,
        status
      });
    }

    const definitions = structured?.category?.attributes && typeof structured.category.attributes === 'object'
      ? structured.category.attributes
      : null;
    if (!definitions) return { attributes: domAttributes, pairedControls, pairedTechnicalNames };

    const domByKey = new Map(domAttributes.map(attribute => [attribute.key, attribute]));
    const attributes = [];
    const structuredKeys = new Set();
    for (const [key, definition] of Object.entries(definitions)) {
      if (/versand|shipping|delivery/i.test(key + ' ' + (definition?.localizedName || ''))) continue;
      structuredKeys.add(key);
      const dom = domByKey.get(key) || null;
      const structuredValue = selectedStructuredAttribute(structured.adData, key);
      const technicalValue = dom?.technicalValue ?? structuredValue ?? null;
      const structuredLabel = structuredOptionLabel(definition, technicalValue);
      const displayValue = structuredLabel || dom?.displayValue || '';
      const label = clean(definition?.localizedName || dom?.label || key);
      const status = technicalValue === null
        ? 'unresolved'
        : technicalValue === '' || (Array.isArray(technicalValue) && !technicalValue.length)
          ? 'empty'
          : displayValue
            ? 'captured'
            : 'technical-only';
      attributes.push({
        key,
        technicalName: `attributeMap[${key}]`,
        label,
        technicalValue,
        displayValue,
        controlType: dom?.controlType || clean(definition?.render || '').toLowerCase() || 'structured',
        controlId: dom?.controlId || '',
        options: dom?.options || [],
        required: Boolean(definition?.required ?? dom?.required),
        disabled: Boolean(dom?.disabled),
        present: Boolean(dom?.present ?? true),
        status,
        selectable: definition?.selectable === true,
        render: definition?.render || null,
        attributeType: definition?.attributeType || null,
        optionCount: Array.isArray(definition?.localizedOptions) ? definition.localizedOptions.length : 0,
        source: 'post-listing-props+dom'
      });
    }
    for (const dom of domAttributes) {
      if (!structuredKeys.has(dom.key)) attributes.push(dom);
    }
    return { attributes, pairedControls, pairedTechnicalNames };
  }

  function leafTexts(root) {
    if (!root) return [];
    const values = [];
    for (const element of root.querySelectorAll('*')) {
      if (element.children.length) continue;
      const text = clean(element.textContent);
      if (text) values.push(text);
    }
    return [...new Set(values)];
  }

  function buildShippingOptions(form, fields, structured) {
    const technical = fields
      .map(field => ({ field, match: field.name.match(/^shippingOptions\[(\d+)\]\.id$/) }))
      .filter(item => item.match)
      .map(item => ({ index: Number(item.match[1]), id: String(item.field.value ?? ''), label: '', status: 'technical-only' }))
      .sort((a, b) => a.index - b.index);
    if (!technical.length && Array.isArray(structured?.adData?.shippingOptions)) {
      structured.adData.shippingOptions.forEach((id, index) => technical.push({ index, id: String(id ?? ''), label: '', status: 'technical-only' }));
    }
    if (!technical.length) return [];

    const structuredOptions = Array.isArray(structured?.availableShippingOptions?.options)
      ? structured.availableShippingOptions.options
      : [];
    const byId = new Map(structuredOptions.map(option => [String(option?.id ?? ''), option]));
    for (const option of technical) {
      const match = byId.get(option.id);
      if (!match) continue;
      option.label = clean([match.carrierName, match.name].filter(Boolean).join(' '));
      option.status = option.label ? 'captured' : 'technical-only';
    }

    if (technical.every(option => option.status === 'captured')) return technical;
    const control = form.querySelector('#ad-shipping-options');
    const labels = leafTexts(control).filter(text =>
      !/versandmethoden auswählen/i.test(text) &&
      !/^(ab\s*)?\d+[,.]\d+\s*€$/i.test(text) &&
      !/^\d+[,.]\d+\s*€$/i.test(text)
    );
    if (labels.length === technical.length) {
      technical.forEach((option, index) => {
        if (!option.label) option.label = labels[index];
        if (option.label) option.status = 'captured';
      });
    }
    return technical;
  }

  function redactedField(field) {
    const clone = { ...field, options: field.options?.map(option => ({ ...option })) || [] };
    const identityText = [field.name, field.id, field.label].join(' ');
    if (personalField.test(identityText)) {
      if (clone.controlValue !== null && clone.controlValue !== '') clone.controlValue = '[redacted]';
      if (clone.value !== null && clone.value !== '') clone.value = '[redacted]';
      if (clone.displayValue) clone.displayValue = '[redacted]';
      clone.options = clone.options.map(option => ({ ...option, label: option.label ? '[redacted]' : option.label }));
    }
    return clone;
  }

  function extract(document, base) {
    const found = locate(document, base);
    const structured = structuredPostListing(document);
    const diagnostics = {
      version: 3,
      pageUrl: base,
      adId: found.adId,
      candidateCount: found.candidateCount,
      identityConflict: found.conflict,
      structuredSource: structured ? {
        source: structured.source,
        adId: structured.adData?.id ?? null,
        categoryId: structured.category?.id ?? structured.adData?.categoryId ?? null,
        categoryPath: structured.categoryPath,
        dynamicAttributeDefinitionCount: Object.keys(structured.category?.attributes || {}).length,
        selectedAttributeCount: Object.keys(structured.adData?.attributes || {}).length,
        explicitImageArray: structured.explicitImageArray === true,
        imageCount: structured.images.length,
        xxLargeImageCount: structured.images.filter(image => image.xxLargeUrl).length
      } : null,
      fields: [],
      dynamicAttributes: [],
      excludedFields: [],
      unresolvedControls: []
    };
    if (!found.form) return { ...found, fields: [], diagnostics, warnings: ['Bearbeiten-Formular nicht eindeutig erkannt.'], blockingIssues: ['edit-form-unresolved'] };

    const form = found.form;
    const fields = [];
    const seen = new Set();
    const hiddenAllowed = /^(category(id|path)?|adId|ad_id|advertisementId|priceType|buyNowEligible|addressVisibility|locationId|posterType)$|^attributeMap\[|^shippingOptions\[|shipping|delivery/i;
    const elements = [...form.querySelectorAll(nativeSelector + ',' + customSelector)];

    // Include direct labelled custom controls, but not fieldset/container wrappers that merely contain native controls.
    for (const label of form.querySelectorAll('label[for]')) {
      const element = document.getElementById(label.getAttribute('for'));
      if (element && form.contains(element) && !elements.includes(element) && element.matches('button,[tabindex],[role="combobox"],[role="listbox"],[role="radiogroup"]')) elements.push(element);
    }

    for (const element of elements) {
      const id = element.id || '';
      const name = element.getAttribute('name') || element.getAttribute('data-name') || '';
      const type = (element.getAttribute('type') || element.tagName.toLowerCase()).toLowerCase();
      const label = labelOf(element, form);
      const key = name || id;
      if (sensitive.test(name + ' ' + id) || ['password', 'file', 'submit', 'reset'].includes(type) || excluded.test(name + ' ' + id + ' ' + label)) {
        diagnostics.excludedFields.push({ ...descriptor(element), reason: 'not-template-data' });
        continue;
      }
      if (/^adImages\[\d+\]\.url$/.test(name)) {
        diagnostics.excludedFields.push({ ...descriptor(element), reason: 'image-source-handled-separately' });
        continue;
      }
      if (type === 'hidden' && !hiddenAllowed.test(name)) {
        diagnostics.excludedFields.push({ ...descriptor(element), reason: 'hidden-unmapped' });
        continue;
      }
      if (element.closest('[hidden],[aria-hidden="true"]') && type !== 'hidden') continue;
      if (element.closest('[role="combobox"],[role="listbox"]') !== element && element.closest('[role="combobox"],[role="listbox"]')) continue;
      if (element.getAttribute('role') === 'radiogroup' && element.querySelector('input[type="radio"]')) continue;
      if (type === 'button' && !label) continue;
      if (type === 'radio' && seen.has('radio:' + key)) continue;

      const read = readControl(element, form);
      if (type === 'radio') seen.add('radio:' + key);
      const value = read.value;
      const field = {
        name,
        id,
        controlValue: element.matches(nativeSelector) ? (element.value ?? null) : null,
        label: label || key || 'Unbeschriftetes Feld',
        type,
        source: read.source,
        value,
        displayValue: read.displayValue,
        options: read.options,
        checked: read.checked,
        required: element.hasAttribute('required') || element.getAttribute('aria-required') === 'true',
        disabled: element.hasAttribute('disabled'),
        status: value === null ? 'unresolved' : value === '' || (Array.isArray(value) && !value.length) ? 'empty' : 'captured'
      };
      fields.push(field);
    }

    const dynamic = buildDynamicAttributes(form, structured);
    diagnostics.dynamicAttributes = dynamic.attributes.map(attribute => ({ ...attribute }));

    // Pair the display control of priceType with its hidden technical value.
    const priceTypeTechnical = fields.find(field => field.name === 'priceType');
    const priceTypeDisplay = fields.find(field => /price.?type|preis.?typ/i.test([field.name, field.id, field.label].join(' ')) && field !== priceTypeTechnical);
    const pairedControls = new Set(dynamic.pairedControls);
    if (priceTypeDisplay && priceTypeTechnical) pairedControls.add(document.getElementById(priceTypeDisplay.id));

    const relevantUnresolved = [];
    for (const element of form.querySelectorAll('button,[role="button"]')) {
      if (elements.includes(element) || element.getAttribute('type') === 'submit' || pairedControls.has(element)) continue;
      const text = clean(element.textContent).slice(0, 160);
      if (!text || excluded.test(text) || actionButton.test(text)) continue;
      if (element.id === 'ad-shipping-options') continue;
      relevantUnresolved.push({ ...descriptor(element), text });
    }
    diagnostics.unresolvedControls = relevantUnresolved.slice(0, 80);

    const warnings = [];
    const blockingIssues = [];
    if (!found.eligible) {
      warnings.push('Keine eindeutige bestehende Anzeigen-ID im Bearbeiten-Formular.');
      blockingIssues.push('ad-identity');
    }
    if (structured?.adData?.id != null && found.adId && String(structured.adData.id) !== String(found.adId)) {
      warnings.push('Strukturierte Anzeigen-ID widerspricht der Formular-/URL-Identität.');
      blockingIssues.push('structured-ad-identity');
    }

    for (const field of fields.filter(field => field.status === 'unresolved')) {
      const technicalPair = dynamic.attributes.find(attribute => attribute.controlId && attribute.controlId === field.id) ||
        (field === priceTypeDisplay && priceTypeTechnical);
      if (technicalPair) continue;
      warnings.push(`Feld „${field.label}“: interner Auswahlwert nicht erkannt.`);
    }
    for (const attribute of dynamic.attributes.filter(attribute => attribute.status === 'technical-only')) {
      warnings.push(`Merkmal „${attribute.label}“: technischer Wert erfasst, sichtbare Bezeichnung nicht eindeutig zugeordnet.`);
    }

    const find = pattern => fields.find(field => pattern.test([field.name, field.id, field.label].join(' ')));
    const title = find(/(^|[ ._-])(title|titel|adTitle)([ ._-]|$)/i);
    const description = fields.find(field => field.type === 'textarea' && /description|beschreibung/i.test(field.name + ' ' + field.id + ' ' + field.label)) || (fields.filter(field => field.type === 'textarea').length === 1 ? fields.find(field => field.type === 'textarea') : null);
    const price = fields.find(field => /^priceAmount$/i.test(field.name)) || find(/(^|[ ._-])(price|preis)([ ._-]|$)/i);
    const category = find(/category.?id|categoryId/i) || fields.find(field => /^category$/i.test(field.name));
    const categoryLabel = [...form.querySelectorAll('label')].find(label => /^kategorie\s*:?$/i.test(clean(label.textContent)));
    const categoryText = clean(categoryLabel?.parentElement?.textContent).replace(/^Kategorie\s*:?/i, '').replace(/Kategorie ändern/i, '').trim();
    const domCategoryPath = categoryText ? categoryText.split(/\s*>\s*|\s*›\s*/) : [];
    const categoryId = category?.value ?? structured?.category?.id ?? structured?.adData?.categoryId ?? null;
    const categoryPath = domCategoryPath.length ? domCategoryPath : (structured?.categoryPath || []);
    if (!/^\d+$/.test(String(categoryId ?? ''))) {
      warnings.push('Technische Kategorie-ID nicht erkannt.');
      blockingIssues.push('category-id');
    }
    const titleValue = title?.value ?? structured?.adData?.title ?? '';
    const descriptionValue = description?.value ?? structured?.adData?.description ?? '';
    const missing = [
      !titleValue ? 'title' : null,
      !descriptionValue ? 'description' : null
    ].filter(Boolean);
    if (missing.length) {
      warnings.push('Kernfelder nicht erkannt: ' + missing.join(', '));
      blockingIssues.push(...missing.map(key => 'core-' + key));
    }

    const adType = fields.find(field => field.name === 'adType');
    const shipping = fields.find(field => /versand|shipping/i.test(field.name) && field.type === 'radio');
    const buyNow = fields.find(field => field.name === 'buyNow');
    const shippingOptions = buildShippingOptions(form, fields, structured);
    if (shippingOptions.some(option => option.status !== 'captured')) warnings.push('Versandmethoden: technische IDs erfasst, sichtbare Bezeichnungen nicht vollständig zugeordnet.');

    const location = {
      zipCode: fields.find(field => field.name === 'zipCode')?.value ?? structured?.address?.location?.zipCode ?? '',
      city: fields.find(field => field.id === 'ad-city' || /^city$/i.test(field.name))?.value ?? structured?.address?.location?.name ?? '',
      street: fields.find(field => field.name === 'streetName')?.value ?? structured?.address?.streetName ?? '',
      locationId: fields.find(field => field.name === 'locationId')?.value ?? structured?.address?.location?.id ?? null,
      addressVisibility: fields.find(field => field.name === 'addressVisibility')?.value ?? structured?.address?.visible ?? null
    };
    const contact = {
      name: fields.find(field => field.name === 'contactName')?.value ?? ''
    };

    diagnostics.fields = fields.map(redactedField);
    diagnostics.unresolvedControls = diagnostics.unresolvedControls.slice(0, 80);

    return {
      ...found,
      fields,
      diagnostics,
      warnings,
      blockingIssues: [...new Set(blockingIssues)],
      title: titleValue,
      description: descriptionValue,
      price: {
        value: price?.value ?? structured?.adData?.priceAmount ?? '',
        displayed: price?.displayValue || '',
        type: priceTypeTechnical?.value ?? structured?.adData?.priceType ?? null,
        typeDisplay: structuredOptionLabel({ localizedOptions: structured?.category?.priceConfig?.priceTypeOptions?.map(option => ({ value: option.value, localizedValue: option.text })) || [] }, priceTypeTechnical?.value ?? structured?.adData?.priceType ?? null) || priceTypeDisplay?.displayValue || '',
        currency: 'EUR'
      },
      categoryId,
      categoryPath,
      dynamicAttributes: dynamic.attributes,
      structuredImages: structured?.images || [],
      imageEvidence: structured ? {
        source: structured.source,
        explicitImageArray: structured.explicitImageArray === true,
        imageCount: structured.images.length
      } : {
        source: null,
        explicitImageArray: false,
        imageCount: null
      },
      adType: adType
        ? { value: adType.value, displayValue: adType.displayValue, options: adType.options }
        : structured?.adData?.adType
          ? { value: structured.adData.adType, displayValue: structured.adData.adType === 'OFFER' ? 'Ich biete' : structured.adData.adType === 'WANTED' ? 'Ich suche' : '', options: [] }
          : null,
      shipping: shipping
        ? { value: shipping.value, displayValue: shipping.displayValue, options: shipping.options, methods: shippingOptions }
        : { value: selectedStructuredAttribute(structured?.adData, Object.keys(structured?.category?.attributes || {}).find(key => /versand|shipping|delivery/i.test(key)) || ''), displayValue: '', options: [], methods: shippingOptions },
      buyNow: buyNow
        ? { value: buyNow.value ?? structured?.adData?.buyNowSelected, displayValue: buyNow.displayValue, options: buyNow.options, eligible: fields.find(field => field.name === 'buyNowEligible')?.value ?? structured?.category?.eligibleForBuyNow ?? null }
        : structured?.adData?.buyNowSelected != null
          ? { value: structured.adData.buyNowSelected, displayValue: structured.adData.buyNowSelected ? 'Ja' : 'Nein', options: [], eligible: structured?.category?.eligibleForBuyNow ?? null }
          : null,
      location,
      contact,
      posterType: fields.find(field => field.name === 'posterType')?.value ?? null
    };
  }

  const API = Object.freeze({ locate, extract, decodeAstroProps });
  globalThis.KRDeps?.register?.('KRForm', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
