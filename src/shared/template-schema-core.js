/* KAR-134 Wave A: category-scoped, value-free form schema evidence. Not wired to the runtime until capture/preflight integration. */
(() => {
  'use strict';
  if (globalThis.KRDeps?.has?.('KRTemplateSchemaCore')) {
    if (typeof module !== 'undefined' && module?.exports) module.exports = globalThis.KRDeps.require('KRTemplateSchemaCore');
    return;
  }

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
    const categoryId = categoryOf(capture.categoryId ?? capture.category?.id ?? capture.categoryIdFromUrl);
    const fields = [];
    for (const attr of capture.dynamicAttributes || []) {
      if (!attr || typeof attr.key !== 'string') throw new Error('Attribute technical key is missing');
      // Only technical keys, field controls and proven option identifiers. No saved values/labels/DOM ids.
      fields.push(normalizeEntry('attribute:' + attr.key, attr));
    }
    for (const field of capture.fields || capture.formFields || []) {
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

  // KAR-134 Wave K: F1 captures only genuinely visible, category-neutral
  // technical controls on a settled form *before* category selection. A posting
  // edit form must never be silently compared to a blank posting-create form.
  const baseModes = new Set(['posting-create', 'posting-edit']);
  const baseChoosers = new Set(['button', 'link', 'missing']);
  function baseFields(fields) {
    if (!Array.isArray(fields)) throw new Error('Category-neutral form controls are missing');
    return ordered(fields.filter(field => field?.visible === true).map(field => {
      const name = clean(field.name);
      if (!SAFE_KEY.test(name) || /^(?:category(?:Id|Path)?|csrf\w*|auth\w*|token\w*|password|session\w*|account\w*|adId)$/i.test(name))
        throw new Error('Untrusted or category-specific visible base field');
      return normalizeEntry('field:' + name, field);
    }));
  }
  function buildBaseSchema(capture) {
    if (!capture || capture.ready !== true || capture.categorySelected !== false)
      throw new Error('Category-neutral form must be settled before category selection');
    if (!baseModes.has(capture.formMode) || !baseChoosers.has(capture.categoryChooser))
      throw new Error('Unknown category-neutral form context or chooser');
    return Object.freeze({
      stage: 'base', schemaVersion: SCHEMA_VERSION, fingerprintAlgorithm: ALGORITHM,
      formMode: capture.formMode, categoryChooser: capture.categoryChooser,
      fields: baseFields(capture.fields)
    });
  }
  function normalizedStageFields(fields) {
    if (!Array.isArray(fields)) throw new Error('Malformed stage schema field list');
    return ordered(fields.map(field => {
      if (!field || !SAFE_KEY.test(field.key) || !['required','optional','unknown'].includes(field.requiredState) ||
          typeof field.kind !== 'string' ||
          (field.optionValues !== null && (!Array.isArray(field.optionValues) ||
            field.optionValues.some(value => typeof value !== 'string'))))
        throw new Error('Malformed stage schema field');
      const values = field.optionValues === null ? null : [...field.optionValues].sort();
      if (values && values.some((value,i) => i > 0 && value === values[i-1]))
        throw new Error('Duplicate stage option identifier');
      return { key: field.key, kind: field.kind, requiredState: field.requiredState, optionValues: values };
    }));
  }
  function canonicalBasePayload(schema) {
    if (!schema || schema.stage !== 'base' || schema.schemaVersion !== SCHEMA_VERSION ||
        schema.fingerprintAlgorithm !== ALGORITHM || !baseModes.has(schema.formMode) ||
        !baseChoosers.has(schema.categoryChooser)) throw new Error('Incompatible F1 base-form snapshot');
    return JSON.stringify({ schemaVersion: SCHEMA_VERSION, algorithm: ALGORITHM,
      stage: 'base', formMode: schema.formMode, categoryChooser: schema.categoryChooser,
      fields: normalizedStageFields(schema.fields) });
  }
  async function hashStagePayload(payload, cryptoProvider) {
    if (!cryptoProvider?.subtle?.digest) throw new Error('SHA-256 is unavailable; cannot assert schema identity');
    const bytes = new TextEncoder().encode(payload);
    const hash = await cryptoProvider.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  async function baseFingerprint(schema, cryptoProvider = globalThis.crypto) {
    return hashStagePayload(canonicalBasePayload(schema), cryptoProvider);
  }
  function diffBaseSchemas(previous, current) {
    canonicalBasePayload(current);
    if (!previous) return { status: 'baseline-missing', compatible: null, changes: [] };
    canonicalBasePayload(previous);
    if (previous.formMode !== current.formMode)
      return { status: 'base-not-comparable', compatible: null, changes: [] };
    const changes = [];
    if (previous.categoryChooser !== current.categoryChooser)
      changes.push({ type: 'category-chooser-changed',
        before: previous.categoryChooser, after: current.categoryChooser });
    const old = new Map(previous.fields.map(field => [field.key, field]));
    const fresh = new Map(current.fields.map(field => [field.key, field]));
    for (const key of [...new Set([...old.keys(), ...fresh.keys()])].sort()) {
      const a = old.get(key), b = fresh.get(key);
      if (!a) { changes.push({ type: 'field-added', key }); continue; }
      if (!b) { changes.push({ type: 'field-removed', key }); continue; }
      if (a.kind !== b.kind) changes.push({ type: 'control-kind-changed', key, before: a.kind, after: b.kind });
      if (a.requiredState !== b.requiredState)
        changes.push({ type: a.requiredState === 'unknown' || b.requiredState === 'unknown'
          ? 'requiredness-evidence-uncertain' : 'requiredness-changed', key });
      if (JSON.stringify(a.optionValues) !== JSON.stringify(b.optionValues))
        changes.push({ type: a.optionValues === null || b.optionValues === null
          ? 'option-evidence-uncertain' : 'valid-options-changed', key });
    }
    const unverified = changes.some(change => change.type.endsWith('evidence-uncertain'));
    return { status: !changes.length ? 'base-identical'
      : unverified && changes.every(change => change.type.endsWith('evidence-uncertain'))
        ? 'base-evidence-uncertain' : 'base-changed',
      compatible: changes.length ? null : true, changes };
  }

  // F2 is intentionally independent of F3. Only site-confirmed numeric IDs
  // are structural identity. Text labels are retained for review but excluded
  // from the hash: the site may localize or rename a category without moving it.
  // A same-depth reparenting cannot be disproved if the site omits ancestor IDs.
  function buildCategorySchema(observation) {
    if (!observation || !Array.isArray(observation.levels) ||
        observation.levels.length < 1 || observation.levels.length > 12)
      throw new Error('Observed category navigation path is missing');
    const categoryId = categoryOf(observation.categoryId);
    const levels = observation.levels.map((level,index) => {
      const label = clean(level?.label);
      if (!label || label.length > 150) throw new Error('Unverified category breadcrumb label');
      const id = level?.technicalId == null || level.technicalId === ''
        ? null : clean(level.technicalId);
      if (id !== null && !/^[1-9][0-9]*$/.test(id))
        throw new Error('Malformed technical category ID');
      const kind = level?.kind;
      if (!['branch', 'leaf', 'unknown'].includes(kind))
        throw new Error('Unverified category level kind');
      if (index === observation.levels.length - 1 && id !== categoryId)
        throw new Error('Observed leaf category ID does not match the committed category ID');
      return { label, technicalId: id, kind };
    });
    return Object.freeze({
      stage: 'category', schemaVersion: SCHEMA_VERSION, fingerprintAlgorithm: ALGORITHM,
      categoryId, leafConfirmed: observation.leafConfirmed === true,
      observedPath: observation.observedPath === true,
      levels,
      evidence: levels.every(level => level.technicalId !== null) ? 'full-ids' : 'partial-ids'
    });
  }
  function validateCategorySchema(schema) {
    if (!schema || schema.stage !== 'category' || schema.schemaVersion !== SCHEMA_VERSION ||
        schema.fingerprintAlgorithm !== ALGORITHM ||
        typeof schema.leafConfirmed !== 'boolean' || typeof schema.observedPath !== 'boolean' ||
        !['full-ids','partial-ids'].includes(schema.evidence))
      throw new Error('Incompatible F2 category-path snapshot');
    // Rebuild and compare the canonical structural representation; the label
    // metadata is never promoted to a purported technical identifier.
    const rebuilt = buildCategorySchema(schema);
    if (rebuilt.evidence !== schema.evidence) throw new Error('Inconsistent category identity evidence');
    return rebuilt;
  }
  function canonicalCategoryPayload(schema) {
    const verified = validateCategorySchema(schema);
    return JSON.stringify({ schemaVersion: SCHEMA_VERSION, algorithm: ALGORITHM,
      stage: 'category', categoryId: verified.categoryId,
      levels: verified.levels.map(level => ({ technicalId: level.technicalId, kind: level.kind })) });
  }
  async function categoryFingerprint(schema, cryptoProvider = globalThis.crypto) {
    return hashStagePayload(canonicalCategoryPayload(schema), cryptoProvider);
  }
  function diffCategorySchemas(previous, current) {
    const next = validateCategorySchema(current);
    if (!previous) return { status: 'baseline-missing', compatible: null, changes: [] };
    const prior = validateCategorySchema(previous);
    if (!prior.leafConfirmed || !prior.observedPath || !next.leafConfirmed || !next.observedPath)
      return { status: 'category-not-verified', compatible: null, changes: [] };
    const changes = [];
    if (prior.categoryId !== next.categoryId)
      changes.push({ type: 'leaf-id-changed', before: prior.categoryId, after: next.categoryId });
    if (prior.levels.length !== next.levels.length)
      changes.push({ type: 'category-depth-changed', before: prior.levels.length, after: next.levels.length });
    const min = Math.min(prior.levels.length, next.levels.length);
    let incompleteIds = prior.evidence !== 'full-ids' || next.evidence !== 'full-ids';
    for (let i = 0; i < min; i++) {
      const a=prior.levels[i], b=next.levels[i];
      if (a.technicalId !== null && b.technicalId !== null && a.technicalId !== b.technicalId)
        changes.push({ type: 'ancestor-id-changed', level: i, before: a.technicalId, after: b.technicalId });
      if (a.technicalId === null || b.technicalId === null) {
        incompleteIds = true;
        if (a.label.normalize('NFC').toLocaleLowerCase('de-DE') !==
            b.label.normalize('NFC').toLocaleLowerCase('de-DE'))
          changes.push({ type: 'unverified-path-label-changed', level: i });
      }
    }
    const proven = changes.some(change => change.type !== 'unverified-path-label-changed');
    return { status: proven ? 'category-changed'
      : changes.length ? 'category-evidence-uncertain'
        : incompleteIds ? 'category-partially-verified' : 'category-identical',
      compatible: proven ? false : incompleteIds ? null : true, changes };
  }

  const API = Object.freeze({ buildSchema, fingerprint, diff, buildBaseSchema, baseFingerprint, diffBaseSchemas, buildCategorySchema, categoryFingerprint, diffCategorySchemas });
  globalThis.KRDeps?.register?.('KRTemplateSchemaCore', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
