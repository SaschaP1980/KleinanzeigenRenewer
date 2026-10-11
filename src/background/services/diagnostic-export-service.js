(() => {
  function create(options = {}) {
    const chrome = options.chromeApi;
    const navigator = options.navigatorApi || {};
    const MessageContractRegistry = options.messageContractRegistry;
    const MAX_DIAGNOSTICS = Number(options.maxDiagnostics || 0);
    const DIAGNOSTIC_RETENTION_MS = Number(options.diagnosticRetentionMs || 0);
    const DIAGNOSTIC_BOUNDARY_KEY = String(options.diagnosticBoundaryKey || 'diagnosticBoundaryV1');
    const ACCOUNT_GATE_DIAGNOSTIC_STATE_KEY = String(options.accountGateDiagnosticStateKey || 'accountGateDiagnosticStateV1');
    const {
      readDiagnostics, getBulkRunState, listInventories, readFillSessions, readRenewalSessions, getProfileState,
      readRecentGalleryDiagnostics, readMassRenewalBatch, sanitizeDiagnosticValue, currentDiagnosticSessionId,
      normalizeRenewalPhaseAttempts, renewalPublicSnapshot, massRenewalPublicSnapshot, redactUrl, representedDiagnosticEventCount
    } = options;

function diagnosticInventorySummary(record) {
  return {
    inventoryId: String(record.inventoryId || ''),
    adId: String(record.adId || ''),
    capturedAt: record.capturedAt || null,
    title: String(record.title || '').slice(0, 180),
    categoryId: record.category?.id ?? record.categoryIdFromUrl ?? null,
    categoryPath: (record.category?.path || record.categoryPath || []).slice(0, 12),
    art: (record.dynamicAttributes || []).find(item => String(item.label || '').trim().toLocaleLowerCase('de-DE') === 'art')?.displayValue || null,
    price: record.price ? { value: record.price.value ?? null, type: record.price.type ?? null, currency: record.price.currency ?? 'EUR' } : null,
    listingEndDate: record.listingMeta?.endDateDisplay || record.endDateDisplay || null,
    listingDate: record.listingMeta?.listingDateDisplay || null,
    profileId: record.profileId || null,
    recordKind: record.recordKind || 'inventory',
    renewal: record.renewal ? {
      renewalId: record.renewal.renewalId || null,
      sourceAdId: record.renewal.sourceAdId || null,
      newAdId: record.adId || record.renewal.newAdId || null,
      status: record.renewal.status || null,
      stage: record.renewal.stage || null,
      comparisonStatus: record.renewal.comparison?.status || null
    } : null,
    imageCount: Number(record.imageSummary?.discovered || record.images?.length || 0),
    localImageCount: Number(record.imageSummary?.locallyStored || 0),
    templateComplete: record.extraction?.templateComplete === true,
    warningCount: Array.isArray(record.warnings) ? record.warnings.length : 0
  };
}

function jsonText(value) {
  return JSON.stringify(sanitizeDiagnosticValue(value), null, 2) + '\n';
}

function diagnosticOperationScopeIds(events, rootOperationId) {
  const root = String(rootOperationId ?? '').trim();
  const operationIds = new Set();
  if (!root) return operationIds;
  operationIds.add(root);
  let changed = true;
  while (changed) {
    changed = false;
    for (const event of events || []) {
      const operationId = String(event?.context?.operationId ?? '').trim();
      const parentOperationId = String(event?.context?.parentOperationId ?? '').trim();
      if (!operationId || !parentOperationId || !operationIds.has(parentOperationId) || operationIds.has(operationId)) continue;
      operationIds.add(operationId);
      changed = true;
    }
  }
  return operationIds;
}

async function buildDiagnosticExport() {
  const [events, run, inventories, sessions, renewalSessionsRaw, profileState, galleryDiagnostics, massRenewalBatch, diagnosticBoundaryStored, accountGateDiagnosticStored] = await Promise.all([
    readDiagnostics(),
    getBulkRunState().catch(() => null),
    listInventories(),
    readFillSessions().catch(() => ({})),
    readRenewalSessions().catch(() => ({})),
    getProfileState().catch(() => null),
    readRecentGalleryDiagnostics().catch(() => []),
    readMassRenewalBatch().catch(() => null),
    chrome.storage.local.get(DIAGNOSTIC_BOUNDARY_KEY).catch(() => ({})),
    chrome.storage.session.get(ACCOUNT_GATE_DIAGNOSTIC_STATE_KEY).catch(() => ({}))
  ]);

  const boundary = diagnosticBoundaryStored?.[DIAGNOSTIC_BOUNDARY_KEY] || null;
  const accountGateDiagnostic = sanitizeDiagnosticValue(accountGateDiagnosticStored?.[ACCOUNT_GATE_DIAGNOSTIC_STATE_KEY] || null);
  const diagnosticBoundaryId = String(boundary?.diagnosticBoundaryId || '');
  const diagnosticBoundaryStartedAt = String(boundary?.diagnosticBoundaryStartedAt || '');
  const diagnosticBoundaryStartMs = Date.parse(diagnosticBoundaryStartedAt);
  const hasManualBoundary = Boolean(diagnosticBoundaryId && Number.isFinite(diagnosticBoundaryStartMs));
  const sanitizedRetentionEvents = events.map(event => sanitizeDiagnosticValue(event));
  const sessionEvents = hasManualBoundary
    ? sanitizedRetentionEvents.filter(event => {
        const parsed = Date.parse(event?.timestamp || event?.time || '');
        return Number.isFinite(parsed) && parsed >= diagnosticBoundaryStartMs;
      })
    : sanitizedRetentionEvents.filter(event => String(event?.sessionId || '') === currentDiagnosticSessionId());
  const severityOf = event => String(event?.severity || event?.level || '').toLowerCase();
  const errors = sessionEvents.filter(event => ['error', 'warning'].includes(severityOf(event)));
  const sessionStartMs = hasManualBoundary ? diagnosticBoundaryStartMs : sessionEvents.reduce((earliest, event) => {
    const parsed = Date.parse(event?.timestamp || event?.time || '');
    return Number.isFinite(parsed) ? Math.min(earliest, parsed) : earliest;
  }, Number.POSITIVE_INFINITY);
  const inCurrentSessionWindow = value => {
    if (!Number.isFinite(sessionStartMs)) return false;
    const parsed = Date.parse(value || '');
    return Number.isFinite(parsed) && parsed >= sessionStartMs;
  };
  const scopedGalleryDiagnostics = hasManualBoundary
    ? galleryDiagnostics.filter(item => {
        const parsed = Date.parse(item?.capturedAt || '');
        return Number.isFinite(parsed) && parsed >= diagnosticBoundaryStartMs;
      })
    : galleryDiagnostics.filter(item => String(item?.sessionId || '') === currentDiagnosticSessionId());

  const refs = {
    operationIds: new Set(), parentOperationIds: new Set(), fillIds: new Set(), renewalIds: new Set(), bulkRunIds: new Set(), runIds: new Set(), massBatchIds: new Set(), inventoryIds: new Set(), adIds: new Set()
  };
  const addRef = (set, value) => {
    const text = String(value ?? '').trim();
    if (text) set.add(text);
  };
  const collectKnownRefs = value => {
    if (!value || typeof value !== 'object') return;
    addRef(refs.operationIds, value.operationId);
    addRef(refs.parentOperationIds, value.parentOperationId);
    addRef(refs.fillIds, value.fillId);
    addRef(refs.renewalIds, value.renewalId);
    addRef(refs.bulkRunIds, value.bulkRunId);
    addRef(refs.runIds, value.runId);
    addRef(refs.massBatchIds, value.massBatchId);
    addRef(refs.inventoryIds, value.inventoryId);
    addRef(refs.inventoryIds, value.sourceInventoryId);
    addRef(refs.inventoryIds, value.skeletonInventoryId);
    addRef(refs.adIds, value.adId);
    addRef(refs.adIds, value.sourceAdId);
    addRef(refs.adIds, value.newAdId);
  };
  for (const event of sessionEvents) {
    collectKnownRefs(event?.context);
    collectKnownRefs(event?.details);
  }

  const rawFillSessions = Object.values(sessions || {});
  let fillSessionsRaw = rawFillSessions.filter(session =>
    refs.operationIds.has(String(session?.operationId || '')) ||
    refs.fillIds.has(String(session?.fillId || '')) ||
    inCurrentSessionWindow(session?.createdAt) ||
    inCurrentSessionWindow(session?.updatedAt)
  );
  for (const session of fillSessionsRaw) {
    addRef(refs.operationIds, session?.operationId);
    addRef(refs.parentOperationIds, session?.parentOperationId);
    addRef(refs.fillIds, session?.fillId);
    addRef(refs.renewalIds, session?.renewalId);
    addRef(refs.massBatchIds, session?.massBatchId);
    addRef(refs.inventoryIds, session?.inventoryId);
    addRef(refs.inventoryIds, session?.skeletonInventoryId);
    addRef(refs.adIds, session?.sourceAdId);
  }

  const rawRenewalSessions = Object.values(renewalSessionsRaw || {});
  const relevantRenewalSessions = rawRenewalSessions.filter(session =>
    refs.operationIds.has(String(session?.operationId || '')) ||
    refs.renewalIds.has(String(session?.renewalId || '')) ||
    refs.fillIds.has(String(session?.fillId || '')) ||
    inCurrentSessionWindow(session?.createdAt) ||
    inCurrentSessionWindow(session?.updatedAt)
  );
  for (const session of relevantRenewalSessions) {
    addRef(refs.operationIds, session?.operationId);
    addRef(refs.parentOperationIds, session?.parentOperationId);
    addRef(refs.renewalIds, session?.renewalId);
    addRef(refs.fillIds, session?.fillId);
    addRef(refs.massBatchIds, session?.massBatchId);
    addRef(refs.inventoryIds, session?.sourceInventoryId);
    addRef(refs.inventoryIds, session?.skeletonInventoryId);
    addRef(refs.adIds, session?.sourceAdId);
    addRef(refs.adIds, session?.newAdId);
  }

  // A worker restart may first reference only the renewalId. Pull the linked
  // fill snapshot in after renewal correlation so the session export remains
  // complete without widening back to historical, unrelated fills.
  const includedFillIds = new Set(fillSessionsRaw.map(session => String(session?.fillId || '')));
  for (const session of rawFillSessions) {
    const fillId = String(session?.fillId || '');
    if (!fillId || includedFillIds.has(fillId) || !refs.fillIds.has(fillId)) continue;
    fillSessionsRaw.push(session);
    includedFillIds.add(fillId);
    addRef(refs.operationIds, session?.operationId);
    addRef(refs.parentOperationIds, session?.parentOperationId);
    addRef(refs.renewalIds, session?.renewalId);
    addRef(refs.massBatchIds, session?.massBatchId);
    addRef(refs.inventoryIds, session?.inventoryId);
    addRef(refs.inventoryIds, session?.skeletonInventoryId);
    addRef(refs.adIds, session?.sourceAdId);
  }

  const inventorySummary = inventories
    .filter(record =>
      refs.inventoryIds.has(String(record?.inventoryId || '')) ||
      refs.adIds.has(String(record?.adId || '')) ||
      refs.renewalIds.has(String(record?.renewal?.renewalId || '')) ||
      inCurrentSessionWindow(record?.capturedAt) ||
      inCurrentSessionWindow(record?.renewal?.updatedAt)
    )
    .map(diagnosticInventorySummary);

  const fillSessions = fillSessionsRaw.map(session => ({
    operationId: session.operationId || null,
    parentOperationId: session.parentOperationId || null,
    fillId: session.fillId || null,
    renewalId: session.renewalId || null,
    massBatchId: session.massBatchId || null,
    inventoryId: session.inventoryId || null,
    skeletonInventoryId: session.skeletonInventoryId || null,
    sourceAdId: session.sourceAdId || null,
    targetTabId: session.targetTabId ?? null,
    targetUrl: session.targetUrl ? redactUrl(session.targetUrl) : null,
    createdAt: session.createdAt || null,
    updatedAt: session.updatedAt || null,
    status: session.status || null,
    stage: session.stage || null,
    maxPhaseAttempts: normalizeRenewalPhaseAttempts(session.maxPhaseAttempts),
    phase1Attempt: Number(session.phase1Attempt || 1),
    phase1AttemptId: session.phase1AttemptId || null,
    result: sanitizeDiagnosticValue(session.result || null)
  }));
  const renewalSessions = relevantRenewalSessions.map(session => sanitizeDiagnosticValue(renewalPublicSnapshot(session)));
  const relevantRun = run && (
    refs.operationIds.has(String(run.operationId || '')) ||
    refs.bulkRunIds.has(String(run.bulkRunId || '')) ||
    refs.runIds.has(String(run.runId || '')) ||
    inCurrentSessionWindow(run.startedAt) ||
    inCurrentSessionWindow(run.updatedAt) ||
    inCurrentSessionWindow(run.completedAt)
  ) ? sanitizeDiagnosticValue(run) : null;

  const manifest = chrome.runtime.getManifest();
  const environment = {
    generatedAt: new Date().toISOString(),
    diagnosticSessionId: hasManualBoundary ? diagnosticBoundaryId : currentDiagnosticSessionId(),
    diagnosticSessionStartedAt: Number.isFinite(sessionStartMs) ? new Date(sessionStartMs).toISOString() : null,
    exportScope: hasManualBoundary ? 'manual-reset-session' : 'current-service-worker-session',
    diagnosticBoundaryId: hasManualBoundary ? diagnosticBoundaryId : null,
    diagnosticBoundaryStartedAt: hasManualBoundary ? diagnosticBoundaryStartedAt : null,
    extension: {
      id: chrome.runtime.id,
      name: manifest.name,
      version: manifest.version,
      versionName: manifest.version_name || manifest.version,
      manifestVersion: manifest.manifest_version,
      minimumChromeVersion: manifest.minimum_chrome_version || null,
      permissions: manifest.permissions || [],
      hostPermissions: manifest.host_permissions || [],
      messageContracts: MessageContractRegistry.snapshot()
    },
    browser: {
      userAgent: navigator.userAgent || null,
      language: navigator.language || null,
      platform: navigator.platform || null
    },
    retention: {
      maxEvents: MAX_DIAGNOSTICS,
      days: Math.round(DIAGNOSTIC_RETENTION_MS / 86400000),
      retainedEventCountInternal: sanitizedRetentionEvents.length,
      exportedEventCount: sessionEvents.length,
      representedEventCount: representedDiagnosticEventCount(sessionEvents),
      aggregatedRepeatCount: Math.max(0, representedDiagnosticEventCount(sessionEvents) - sessionEvents.length)
    }
  };

  const latestCorrelated = [...sessionEvents].reverse().find(event => event?.context?.operationId || event?.context?.fillId || event?.context?.bulkRunId || event?.context?.runId || event?.context?.renewalId) || null;
  const latestOperationId = latestCorrelated?.context?.operationId || null;
  const latestBulkRunId = latestCorrelated?.context?.bulkRunId || null;
  const latestRunId = latestCorrelated?.context?.runId || null;
  const latestFillId = latestCorrelated?.context?.fillId || null;
  const latestRenewalId = latestCorrelated?.context?.renewalId || null;
  let relevantEvents = sessionEvents;
  if (latestOperationId) {
    const scopedOperationIds = diagnosticOperationScopeIds(sessionEvents, latestOperationId);
    relevantEvents = sessionEvents.filter(event => scopedOperationIds.has(String(event?.context?.operationId || '')));
  } else if (latestBulkRunId) relevantEvents = sessionEvents.filter(event => event?.context?.bulkRunId === latestBulkRunId);
  else if (latestRunId) relevantEvents = sessionEvents.filter(event => event?.context?.runId === latestRunId);
  else if (latestFillId) relevantEvents = sessionEvents.filter(event => event?.context?.fillId === latestFillId);
  else if (latestRenewalId) relevantEvents = sessionEvents.filter(event => event?.context?.renewalId === latestRenewalId);
  const relevantWarnings = relevantEvents.filter(event => severityOf(event) === 'warning');
  const relevantErrors = relevantEvents.filter(event => severityOf(event) === 'error');
  const latestErrors = errors.slice(-12).map(item => `${item.timestamp || item.time || '?'}  ${item.event || '?'}  ${item.details?.message || item.details?.error || ''}`.trim());
  const summary = [
    'Kleinanzeigen Renewal Diagnose',
    `Version: ${manifest.version_name || manifest.version}`,
    `Erstellt: ${environment.generatedAt}`,
    'Exportumfang: nur aktuelle Diagnose-Session',
    `Diagnose-Session: ${environment.diagnosticSessionId}`,
    `Session-Beginn: ${environment.diagnosticSessionStartedAt || 'unbekannt'}`,
    `Exportierte Diagnoseeinträge: ${sessionEvents.length}`,
    `Repräsentierte Diagnoseereignisse: ${representedDiagnosticEventCount(sessionEvents)}`,
    `Aggregierte Wiederholungen: ${Math.max(0, representedDiagnosticEventCount(sessionEvents) - sessionEvents.length)}`,
    `Warnungen in dieser Session: ${errors.filter(event => severityOf(event) === 'warning').length}`,
    `Fehler in dieser Session: ${errors.filter(event => severityOf(event) === 'error').length}`,
    `Aktuelle/letzte Operation: ${latestOperationId || 'keine explizite Operation in dieser Session'}`,
    `Aktueller/letzter relevanter Lauf: ${latestBulkRunId ? `Bulk ${latestBulkRunId}` : latestRunId ? `Bulk ${latestRunId}` : latestFillId ? `Fill ${latestFillId}` : latestRenewalId ? `Renewal ${latestRenewalId}` : 'aktuelle Session'}`,
    `Warnungen im aktuellen/letzten Lauf: ${relevantWarnings.length}`,
    `Fehler im aktuellen/letzten Lauf: ${relevantErrors.length}`,
    `Relevante Inventareinträge: ${inventorySummary.length}`,
    `Relevanter Bulk-Status: ${relevantRun?.status || 'kein Lauf in dieser Session'}`,
    `Fill-Sessions: ${fillSessions.length}`,
    `Renewal-Sessions: ${renewalSessions.length}`,
    `Massen-Neuinserat: ${massRenewalBatch?.status || 'kein Batch'}`,
    `Lokale Profile: ${profileState?.profiles?.length || 0}${profileState?.unassigned?.totalCount ? ' + nicht zugeordnet' : ''}`,
    `Account-Gate: ${accountGateDiagnostic?.accountState || 'unbekannt'} / ${accountGateDiagnostic?.gateKind || 'unbekannt'} / ${accountGateDiagnostic?.allowed ? 'freigegeben' : 'gesperrt'}`,
    `Profilbindung: ausgewählt=${accountGateDiagnostic?.selectedProfileId || 'unbekannt'} · live=${accountGateDiagnostic?.liveProfileId || 'unbekannt'}`,
    `Bild-/Galeriediagnosen in dieser Session: ${scopedGalleryDiagnostics.length}`,
    '',
    'Letzte Warnungen/Fehler dieser Session:',
    ...(latestErrors.length ? latestErrors : ['Keine.']),
    '',
    'Hinweis: Der Standardexport enthält nur Daten innerhalb der aktuellen Diagnose-Messgrenze. Ein manueller Reset entfernt ältere Diagnose- und Galeriedaten aus diesem Kontext.',
    'Datenschutz: CSRF-/Cookie-/Passwort-/Tokenwerte, signierte URL-Queryparameter sowie vollständige Beschreibungs-/Kontaktwerte werden nicht in dieses Paket übernommen.'
  ].join('\n') + '\n';

  const files = [
    { name: 'summary.txt', text: summary },
    { name: 'diagnostics.jsonl', text: sessionEvents.map(event => JSON.stringify(event)).join('\n') + (sessionEvents.length ? '\n' : '') },
    { name: 'errors.json', text: jsonText(errors) },
    { name: 'fill-sessions.json', text: jsonText(fillSessions) },
    { name: 'renewal-sessions.json', text: jsonText(renewalSessions) },
    { name: 'mass-renewal-batch.json', text: jsonText(massRenewalPublicSnapshot(massRenewalBatch)) },
    { name: 'inventory-summary.json', text: jsonText(inventorySummary) },
    { name: 'profiles.json', text: jsonText(profileState || {}) },
    { name: 'account-gate-state.json', text: jsonText(accountGateDiagnostic || {}) },
    { name: 'environment.json', text: jsonText(environment) }
  ];
  if (scopedGalleryDiagnostics.length) files.push({ name: 'image-gallery-diagnostics.json', text: jsonText(scopedGalleryDiagnostics) });
  if (relevantRun) files.splice(3, 0, { name: 'bulk-run.json', text: jsonText(relevantRun) });

  const stamp = environment.generatedAt.replace(/[:.]/g, '-');
  return { filename: `kleinanzeigen-renewal-diagnose-v${manifest.version_name || manifest.version}-${stamp}.zip`, files };
}


    return Object.freeze({ buildDiagnosticExport });
  }

  const API = Object.freeze({ create });
  globalThis.KRDeps?.register?.('KRDiagnosticExportService', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
