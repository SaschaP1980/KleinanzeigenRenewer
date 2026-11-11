/* KAR-134 Wave A: category-scoped, value-free form schema evidence. Not wired to the runtime until capture/preflight integration. */
(() => {
  'use strict';

  const SCHEMA_VERSION = 1;
  const ALGORITHM = 'SHA-256';
  const CORE_NAMES = new Set(['title', 'description', 'priceAmount', 'priceType', 'adType', 'buyNow']);
  const SAFE_KEY = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;
  const safeValue = value => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  const clean = value => String(value ?? '').trim();
  const kindOf = value => {
    const kind = clean(value).toLowerCase();
    if (kind === 'select' || kind === 'combobox' || kind === 'radio' || kind === 'checkbox' ||
        kind === 'textarea' || kind === 'text' || kind === 'number' || kind === 'hidden' ||
        kind === 'button' || kind === 'structured') return kind;
    return kind === 'input' ? 'text' : 'unknown';
  };
  const requirementOf = entry => {
    if (entry.requiredState === 'required' || entry.requiredState === 'optional' ||
        entry.requiredState === 'unknown') return entry.requiredState;
    if (entry.required === true) return 'required';
    // A missing HTML required attribute is not evidence that a dynamic field is optional.
    return entry.requiredKnown === true && entry.required === false ? 'optional' : 'unknown';
  };
  const technicalOptions = (entry, kind) => {
    const complete = entry.optionsComplete === true || kind === 'select' || kind === 'radio';
    if (!complete) return null; // Unopened custom menus are NOT proof of an empty option set.
    if (!Array.isArray(entry.options)) throw new Error('Proven option list is missing');
    const values = entry.options.map(option => {
      if (!option || !safeValue(option.value)) throw new Error('Option has no proven technical value');
      return String(option.value);
    }).sort();
    if (values.some((value, i) => i > 0 && value === values[i - 1]))
      throw new Error('Duplicate technical option identifier');
    return values;
  };
  const normalizeEntry = (key, entry) => {
    if (!SAFE_KEY.test(key)) throw new Error('Untrusted or missing technical form key');
    const kind = kindOf(entry.controlType ?? entry.type ?? entry.render);
    return {
      key,
      kind,
      requiredState: requirementOf(entry),
      optionValues: technicalOptions(entry, kind)
    };
  };
  const ordered = fields => {
    const list = [...fields].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    if (list.some((field, i) => i > 0 && field.key === list[i - 1].key))
      throw new Error('Duplicate technical form field key');
    return list;
  };
  const categoryOf = categoryId => {
    const id = clean(categoryId);
    if (!/^[1-9][0-9]*$/.test(id)) throw new Error('Missing authoritative numeric category ID');
    return id;
  };
  function buildSchema(capture) {
    if (!capture || typeof capture !== 'object') throw new Error('Form capture is missing');
    const categoryId = categoryOf(capture.categoryId);
    const fields = [];
    for (const attr of capture.dynamicAttributes || []) {
      if (!attr || typeof attr.key !== 'string') throw new Error('Attribute technical key is missing');
      // Only technical keys, field controls and proven option identifiers. No saved values/labels/DOM ids.
      fields.push(normalizeEntry('attribute:' + attr.key, attr));
    }
    for (const field of capture.fields || []) {
      if (field && CORE_NAMES.has(field.name)) fields.push(normalizeEntry('field:' + field.name, field));
    }
    const categoryPath = capture.categoryPathVerified === true && Array.isArray(capture.categoryPath)
      ? capture.categoryPath.map(clean).filter(Boolean).slice(0, 12) : null;
    return Object.freeze({
      schemaVersion: SCHEMA_VERSION,
      fingerprintAlgorithm: ALGORITHM,
      categoryId,
      verifiedCategoryPath: categoryPath?.length ? categoryPath : null,
      fields: ordered(fields)
    });
  }
  function canonicalPayload(schema) {
    if (!schema || schema.schemaVersion !== SCHEMA_VERSION || schema.fingerprintAlgorithm !== ALGORITHM ||
        !Array.isArray(schema.fields)) throw new Error('Incompatible form schema snapshot');
    const categoryId = categoryOf(schema.categoryId);
    const fields = ordered(schema.fields.map(field => {
      if (!field || !SAFE_KEY.test(field.key) ||
          !['required', 'optional', 'unknown'].includes(field.requiredState) ||
          typeof field.kind !== 'string') throw new Error('Malformed form schema field');
      const options = field.optionValues;
      if (options !== null && (!Array.isArray(options) ||
          options.some(value => typeof value !== 'string'))) throw new Error('Malformed schema options');
      const canonicalOptions = options === null ? null : [...options].sort();
      if (canonicalOptions && canonicalOptions.some((value, i) => i && value === canonicalOptions[i - 1]))
        throw new Error('Duplicate schema option');
      return { key: field.key, kind: field.kind, requiredState: field.requiredState, optionValues: canonicalOptions };
    }));
    // Exclude the localized/display category path from hash; only numeric ID is identity.
    return JSON.stringify({ schemaVersion: SCHEMA_VERSION, algorithm: ALGORITHM, categoryId, fields });
  }
  async function fingerprint(schema, cryptoProvider = globalThis.crypto) {
    if (!cryptoProvider?.subtle?.digest) throw new Error('SHA-256 is unavailable; cannot assert schema identity');
    const bytes = new TextEncoder().encode(canonicalPayload(schema));
    const hash = await cryptoProvider.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  function diff(previous, current) {
    const currentPayload = canonicalPayload(current);
    if (!previous) return { status: 'legacy-unversioned', changes: [], compatible: null };
    canonicalPayload(previous);
    if (previous.categoryId !== current.categoryId) {
      return { status: 'category-mismatch', compatible: false, changes: [
        { type: 'category-changed', before: previous.categoryId, after: current.categoryId }
      ] };
    }
    const changes = [];
    const old = new Map(previous.fields.map(field => [field.key, field]));
    const fresh = new Map(current.fields.map(field => [field.key, field]));
    const keys = [...new Set([...old.keys(), ...fresh.keys()])].sort();
    for (const key of keys) {
      const before = old.get(key), after = fresh.get(key);
      if (!before) { changes.push({ type: 'field-added', key, after }); continue; }
      if (!after) { changes.push({ type: 'field-removed', key, before }); continue; }
      if (before.kind !== after.kind) changes.push({ type: 'control-kind-changed', key, before: before.kind, after: after.kind });
      if (before.requiredState !== after.requiredState) {
        const uncertain = before.requiredState === 'unknown' || after.requiredState === 'unknown';
        changes.push({ type: uncertain ? 'requiredness-uncertain' : 'requiredness-changed',
          key, before: before.requiredState, after: after.requiredState });
      }
      if (JSON.stringify(before.optionValues) !== JSON.stringify(after.optionValues)) {
        const uncertain = before.optionValues === null || after.optionValues === null;
        changes.push({ type: uncertain ? 'option-evidence-uncertain' : 'valid-options-changed',
          key, before: before.optionValues, after: after.optionValues });
      }
    }
    // The core reports structural changes, NEVER authorizes remote publication.
    return { status: changes.length ? 'schema-changed' : 'schema-identical',
      compatible: changes.length ? null : true, changes };
  }
  const API = Object.freeze({ buildSchema, fingerprint, diff });
  // The runtime registration is deliberately deferred until the capture/preflight integration Wave.
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
