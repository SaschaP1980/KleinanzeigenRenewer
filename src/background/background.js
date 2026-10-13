importScripts("../shared/runtime-deps.js", "../shared/message-contract-registry.js", "../shared/renewal-policy.js", "background-message-router.js", "services/native-update-status-gateway.js", "services/native-status-bridge.js", "repositories/profile-repository.js", "repositories/inventory-repository.js", "repositories/inventory-image-store.js", "services/trash-service.js", "services/diagnostics-service.js", "services/tab-registry.js", "services/managed-tab-worker-service.js", "services/content-connection-manager.js", "services/account-probe-service.js", "controllers/profile-management-controller.js", "controllers/account-session-controller.js", "controllers/platform-safety-controller.js", "controllers/tab-lifecycle-observer.js", "controllers/workflow-emergency-reset-controller.js", "lib/bulk-run-guard.js", "controllers/single-inventory-controller.js", "services/bulk-worker-service.js", "services/bulk-reconciliation-service.js", "controllers/bulk-inventory-controller.js", "controllers/mass-renewal-controller.js", "services/mass-renewal-watchdog-service.js", "controllers/mass-renewal-workflow-controller.js", "services/renewal-verification-flow.js", "services/renewal-reinventory-flow.js", "services/paid-checkout-recovery-service.js", "controllers/renewal-workflow-controller.js", "services/renewal-verification-service.js", "repositories/renewal-state-repository.js", "services/template-fill-service.js", "services/insertion-lock-service.js", "controllers/template-fill-controller.js", "services/archive-insertion-service.js", "services/archive-insertion-verification-service.js", "services/archive-insertion-recovery-service.js", "controllers/archive-insertion-controller.js", "services/remote-delete-replacement-service.js", "services/published-inventory-resolver.js", "services/diagnostic-export-service.js", "services/public-listing-evidence-service.js", "../shared/managed-navigation.js", "lib/inventory-reconciliation.js", "../shared/my-ads-readiness.js", "lib/inventory-scope.js", "../shared/platform-hardening.js", "services/tab-load-coordinator.js");

const KRDeps = globalThis.KRDeps;
if (!KRDeps) throw new Error('runtime-deps.js must load before background.js');
const MessageContractRegistry = KRDeps.require('KRMessageContractRegistry');
const RenewalPolicy = KRDeps.require('KRRenewalPolicy');
const BackgroundMessageRouter = KRDeps.require('KRBackgroundMessageRouter');
const NativeUpdateStatusGateway = KRDeps.require('KRNativeUpdateStatusGateway');
const NativeStatusBridge = KRDeps.require('KRNativeStatusBridge');
const DiagnosticsService = KRDeps.require('KRDiagnosticsService');
const TabRegistry = KRDeps.require('KRTabRegistry');
const ManagedNavigation = KRDeps.require('KRManagedNavigation');
const InventoryReconciliation = KRDeps.require('KRInventoryReconciliation');
const MyAdsReadiness = KRDeps.require('KRMyAdsReadiness');
const InventoryScope = KRDeps.require('KRInventoryScope');
const normalizeInventoryScope = InventoryScope.normalizeInventoryScope;
const PlatformHardening = KRDeps.require('KRPlatformHardening');
const TabLoadCoordinator = KRDeps.require('KRTabLoadCoordinator');
const ProfileRepository = KRDeps.require('KRProfileRepository');
const InventoryRepository = KRDeps.require('KRInventoryRepository');
const InventoryImageStore = KRDeps.require('KRInventoryImageStore');
const TrashService = KRDeps.require('KRTrashService');
const ManagedTabWorkerService = KRDeps.require('KRManagedTabWorkerService');
const ContentConnectionManager = KRDeps.require('KRContentConnectionManager');
const AccountProbeService = KRDeps.require('KRAccountProbeService');
const ProfileManagementController = KRDeps.require('KRProfileManagementController');
const AccountSessionController = KRDeps.require('KRAccountSessionController');
const PlatformSafetyController = KRDeps.require('KRPlatformSafetyController');
const WorkflowEmergencyResetController = KRDeps.require('KRWorkflowEmergencyResetController');
const TabLifecycleObserver = KRDeps.require('KRTabLifecycleObserver');
const BulkRunGuard = KRDeps.require('KRBulkRunGuard');
const SingleInventoryController = KRDeps.require('KRSingleInventoryController');
const BulkInventoryController = KRDeps.require('KRBulkInventoryController');
const MassRenewalController = KRDeps.require('KRMassRenewalController');
const MassRenewalWorkflowController = KRDeps.require('KRMassRenewalWorkflowController');
const RenewalVerificationService = KRDeps.require('KRRenewalVerificationService');
const RenewalStateRepository = KRDeps.require('KRRenewalStateRepository');
const RenewalWorkflowController = KRDeps.require('KRRenewalWorkflowController');
const TemplateFillService = KRDeps.require('KRTemplateFillService');
const InsertionLockService = KRDeps.require('KRInsertionLockService');
const TemplateFillController = KRDeps.require('KRTemplateFillController');
const ArchiveInsertionService = KRDeps.require('KRArchiveInsertionService');
const ArchiveInsertionController = KRDeps.require('KRArchiveInsertionController');
const RemoteDeleteReplacementService = KRDeps.require('KRRemoteDeleteReplacementService');
const PublishedInventoryResolver = KRDeps.require('KRPublishedInventoryResolver');
const DiagnosticExportService = KRDeps.require('KRDiagnosticExportService');
const PublicListingEvidenceService = KRDeps.require('KRPublicListingEvidenceService');

const DB_NAME = "kleinanzeigen-renewal";
const DB_VERSION = 2;
const INVENTORY_STORE = "inventories";
const IMAGE_STORE = "images";
const MAX_DIAGNOSTICS = 2500;
const DIAGNOSTICS_KEY = "diagnosticsV2";
const DIAGNOSTIC_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const GALLERY_DIAGNOSTICS_KEY = "galleryDiagnosticsV1";
const DIAGNOSTIC_BOUNDARY_KEY = "diagnosticBoundaryV1";
const ACCOUNT_GATE_DIAGNOSTIC_STATE_KEY = "accountGateDiagnosticStateV1";
const GALLERY_DIAGNOSTIC_RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_GALLERY_DIAGNOSTICS = 8;
const APP_WINDOW_SESSION_KEY = "appWindowId";
const APP_PAGE = "app.html";
const APP_WINDOW_INITIAL_WIDTH = 1180;
const APP_WINDOW_INITIAL_HEIGHT = 900;
const BULK_RETRY_TIMEOUT_MS = 90000;
const BULK_ITEM_HARD_TIMEOUT_MS = 110000;
const BULK_RUN_WATCHDOG_TICK_MS = 15000;
const BULK_RUN_RUNTIME_LEASE_KEY = "bulkRunRuntimeLeaseV1";
const RUNTIME_EPOCH_KEY = "runtimeEpochV1";
const BULK_RETRY_POLL_MS = 500;
const BULK_WORKER_TAB_CREATE_MAX_ATTEMPTS = 2;
const BULK_WORKER_TAB_CREATE_RETRY_MS = 200;
const CONTENT_SCRIPT_FILES = ["src/shared/runtime-deps.js", "src/shared/message-contract-registry.js", "src/shared/managed-navigation.js", "src/shared/platform-hardening.js", "src/content/platform-guard-content.js", "src/content/image-extractor.js", "src/content/form-extractor.js", "src/content/paid-insertion-guard.js", "src/content/template-category-flow.js", "src/content/template-form-fields.js", "src/content/template-image-upload.js", "src/content/template-verification.js", "src/content/template-publish-flow.js", "src/content/template-filler.js", "src/shared/my-ads-readiness.js", "src/content/inventory-roster-parser.js", "src/content/inventory-readiness.js", "src/content/inventory-status-overlay.js", "src/content/inventory-delete-operations.js", "src/content/inventory-run-loop.js", "src/content/inventory-runner.js", "src/content/content.js"];
const CONTENT_BOOTSTRAP_WAITS_MS = [80, 140, 240, 400, 650];
const CONTENT_BOOTSTRAP_NAVIGATION_WAIT_MS = 30000;
const DIAGNOSTIC_BATCH_FLUSH_MS = 1200;
const DIAGNOSTIC_BATCH_MAX_PENDING = 120;
const MASS_RENEWAL_PROGRESS_FLUSH_MS = 1500;
const READONLY_METADATA_TIMEOUT_MS = 15000;
const RENEWAL_PUBLIC_READONLY_READINESS_TIMEOUT_MS = 30000;
const RENEWAL_DIRECT_READONLY_TIMEOUT_MS = 3500;
const TAB_LOAD_TIMEOUT_DEFAULT_MS = 30000;
const TAB_LOAD_TIMEOUT_RENEWAL_MS = 45000;
const TAB_LOAD_TIMEOUT_PHASE4_MS = 60000;
const TAB_LOAD_SAFETY_POLL_MS = 2000;
const ACCOUNT_PROBE_NAVIGATION_TIMEOUT_MS = 12000;
const ACCOUNT_PROBE_MAX_ATTEMPTS = 2;
const ACCOUNT_PROBE_RETRY_DELAY_MS = 250;
const MANAGED_WORKER_TOMBSTONE_MS = TabRegistry.DEFAULT_TOMBSTONE_MS;
const TAB_ROLES = TabRegistry.ROLES;
const TAB_STATES = TabRegistry.STATES;
const tabRegistry = TabRegistry.create({ storageSession: chrome.storage.session, tombstoneMs: MANAGED_WORKER_TOMBSTONE_MS });
const PROFILES_KEY = "profilesV1";
const ACTIVE_PROFILE_KEY = "activeDetectedProfileV1";
const SELECTED_PROFILE_KEY = "selectedInventoryProfileV1";
const UNASSIGNED_PROFILE_ID = "__unassigned__";
const RENEWAL_SESSIONS_KEY = "renewalSessionsV1";
const ARCHIVE_INSERTION_SESSIONS_KEY = "archiveInsertionSessionsV1";
const ARCHIVE_INSERTION_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const RENEWAL_MODE_KEY = "renewalModeV1";
const RENEWAL_FAST_MODE_ACK_KEY = "renewalFastModeAcknowledgedV1";
const RENEWAL_PHASE_ATTEMPTS_KEY = "renewalPhaseAttemptsV1";
const RENEWAL_PHASE_ATTEMPTS_MIN = RenewalPolicy.RENEWAL_PHASE_ATTEMPTS_MIN;
const RENEWAL_PHASE_ATTEMPTS_MAX = RenewalPolicy.RENEWAL_PHASE_ATTEMPTS_MAX;
const RENEWAL_PHASE_ATTEMPTS_DEFAULT = RenewalPolicy.RENEWAL_PHASE_ATTEMPTS_DEFAULT;
const RENEWAL_MODE_SAFE = RenewalPolicy.RENEWAL_MODE_SAFE;
const RENEWAL_MODE_FAST = RenewalPolicy.RENEWAL_MODE_FAST;
const INVENTORY_SCOPE_ALL = "all";
const INVENTORY_SCOPE_NEW_ONLY = "new-only";
const RENEWAL_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MASS_RENEWAL_BATCH_KEY = "massRenewalBatchV1";
const MASS_RENEWAL_MAX_ITEMS = 10;
const MASS_RENEWAL_BATCH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MASS_RENEWAL_WATCHDOG_STALE_MS = 5 * 60 * 1000;
const MASS_RENEWAL_WATCHDOG_TICK_MS = 20 * 1000;
const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const APP_NOTICE_KEY = "appNoticeV1";
const PLATFORM_ACCESS_RESTRICTION_KEY = "platformAccessRestrictionV1";
const PLATFORM_ACCESS_RESTRICTION_ERROR_CODE = "KR_PLATFORM_ACCESS_RESTRICTED";
const MY_ADS_PROJECTS_URL = 'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS';
const FRESH_RECONCILIATION_SOURCE_MAX_ATTEMPTS = Number(InventoryReconciliation?.FRESH_RECONCILIATION_SOURCE_MAX_ATTEMPTS || 2);
const FRESH_BULK_SOURCE_MAX_ATTEMPTS = Number(MyAdsReadiness?.FRESH_SOURCE_MAX_ATTEMPTS || 2);
const CORRELATION_CONTEXT_FIELDS = Object.freeze([
  'operationId', 'parentOperationId', 'renewalId', 'fillId', 'bulkRunId', 'runId', 'massBatchId', 'archiveInsertionId'
]);

let renewalStateRepository = null;
function requireRenewalStateRepository() {
  if (!renewalStateRepository) renewalStateRepository = RenewalStateRepository.create({
    storageLocal: chrome.storage.local, sessionsKey: RENEWAL_SESSIONS_KEY, maxAgeMs: RENEWAL_SESSION_MAX_AGE_MS,
    normalizeRenewalMode, renewalMaxPhaseAttempts
  });
  return renewalStateRepository;
}

let templateFillService = null;
function requireTemplateFillService() {
  if (!templateFillService) templateFillService = TemplateFillService.create({
    storageLocal: chrome.storage.local, sessionsKey: TEMPLATE_FILL_SESSIONS_KEY, maxAgeMs: TEMPLATE_FILL_MAX_AGE_MS,
    logDiagnostic, publicAvailabilityPending, inventoryImageSetExplicitlyEmpty, getInventory, getInventoryImage, btoaFn: globalThis.btoa
  });
  return templateFillService;
}

let insertionLockService = null;
function requireInsertionLockService() {
  if (!insertionLockService) insertionLockService = InsertionLockService.create({
    readRenewalSessions, readArchiveInsertionSessions, readFillSessions, readMassRenewalBatch,
    renewalHoldsInsertionLock, templateFillHoldsInsertionLock, getInventory, logDiagnostic
  });
  return insertionLockService;
}

let templateFillController = null;
function requireTemplateFillController() {
  if (!templateFillController) templateFillController = TemplateFillController.create({
    readFillSessions, writeFillSessions, withTemplateFillMutation,
    isRecoverableTrashTemplateSession: session => requireTemplateFillService().isRecoverableTrashTemplateSession(session),
    resolvePublishedInventory: input => requirePublishedInventoryResolver().resolve(input),
    broadcastInventoryChanged, getInventory, isTrashRecord, assertTemplateSourceReady,
    createAutomationTab, registerShadowTab, updateAutomationTab, logDiagnostic, correlationContext, sessionCorrelationContext,
    assertSelectedProfileMatchesLiveAccount, getInsertionLockState, assertInsertionStartAvailable, withInsertionStartGate,
    getRenewalConfiguration, normalizeRenewalMode, normalizeRenewalPhaseAttempts,
    readRenewalSessions, writeRenewalSessions, createRenewalSkeleton, persistRenewalSession,
    isTransientTemplateFillProgress, templateFillProgressSnapshot, queueMassRenewalProgress,
    readArchiveInsertionSessions, persistArchiveInsertionSession,
    recordRenewalPhaseAttemptError, canRetryRenewalPhase1, restartRenewalPhase1Attempt,
    evictTemplateImageTransfersForFill, classifyKleinanzeigenInsertionErrorUrl,
    cryptoApi: crypto, chromeApi: chrome, queueMicrotaskFn: queueMicrotask,
    TEMPLATE_TARGET_URL, TAB_ROLES, TERMINAL_TEMPLATE_FILL_STATUSES
  });
  return templateFillController;
}

let archiveInsertionService = null;
function requireArchiveInsertionService() {
  if (!archiveInsertionService) archiveInsertionService = ArchiveInsertionService.create({
    storageLocal: chrome.storage.local, sessionsKey: ARCHIVE_INSERTION_SESSIONS_KEY, maxAgeMs: ARCHIVE_INSERTION_SESSION_MAX_AGE_MS, normalizeRenewalMode,
    broadcast(snapshot, reason) {
      try { chrome.runtime.sendMessage({ type: 'ARCHIVE_INSERTION_STATE_CHANGED', reason, session: snapshot }, () => { void chrome.runtime.lastError; }); } catch {}
    }
  });
  return archiveInsertionService;
}

let remoteDeleteReplacementService = null;
function requireRemoteDeleteReplacementService() {
  if (!remoteDeleteReplacementService) remoteDeleteReplacementService = RemoteDeleteReplacementService.create({
    readRenewalSessions, writeRenewalSessions, getBulkRunState, moveInventoryToTrash, readFillSessions, writeFillSessions,
    logDiagnostic, sessionCorrelationContext, broadcastInventoryChanged, TRASH_RETENTION_MS, openDatabase, INVENTORY_STORE, IMAGE_STORE,
    isTrashRecord, normalizeRenewalMode, RENEWAL_MODE_FAST, trashRecordFrom, persistRenewalSession, tabRegistry, chromeApi: chrome,
    closeRegistryTab, TabRegistry, createManagedWorkerTab, correlationContext, MY_ADS_PROJECTS_URL, waitForTabComplete,
    TAB_LOAD_TIMEOUT_PHASE4_MS, ensureContentConnection, sendTabRequestWithBootstrap, normalizeProfileName, closeManagedWorkerTab,
    renewalMaxPhaseAttempts, isPhase4DeleteTransportInterruption, assertMassRenewalManualActionAllowed, getInventory, normalBrowserWindowId,
    renewalPhaseAttemptAvailable, renewalAttemptState, delay, renewalPhaseRetryDelayMs, logRenewalPhaseAttemptStarted,
    logRenewalPhaseAttemptFailed, isNonRetryableRenewalSafetyError, renewalAttemptDetails, setAppNotice, markMassRenewalItemSucceeded,
    IDBKeyRangeCtor: globalThis.IDBKeyRange, captureEmergencyResetGeneration, assertEmergencyResetGeneration
  });
  return remoteDeleteReplacementService;
}

function normalizeCorrelationId(value) {
  const text = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : '';
}

function correlationContext(...sources) {
  const result = {};
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const field of CORRELATION_CONTEXT_FIELDS) {
      if (result[field]) continue;
      const value = String(source[field] ?? '').trim();
      if (value) result[field] = value;
    }
  }
  return result;
}

function sessionCorrelationContext(session, extra = {}) {
  return { ...correlationContext(session, extra), ...extra };
}

function correlationContextFromBindings(baseContext = {}, bindings = {}) {
  let result = correlationContext(baseContext);
  const fillSessions = Object.values(bindings.fillSessions || {}).filter(Boolean);
  const renewalSessions = Object.values(bindings.renewalSessions || {}).filter(Boolean);
  const archiveSessions = Object.values(bindings.archiveSessions || {}).filter(Boolean);
  const bulkRun = bindings.bulkRun && typeof bindings.bulkRun === 'object' ? bindings.bulkRun : null;
  const massBatch = bindings.massBatch && typeof bindings.massBatch === 'object' ? bindings.massBatch : null;
  const senderTabId = Number(baseContext?.senderTabId || 0) || null;

  const fill = fillSessions.find(item =>
    (result.fillId && String(item?.fillId || '') === String(result.fillId)) ||
    (result.renewalId && String(item?.renewalId || '') === String(result.renewalId)) ||
    (senderTabId && Number(item?.targetTabId || 0) === senderTabId)
  ) || null;
  if (fill) result = correlationContext(result, fill);

  const renewal = renewalSessions.find(item =>
    (result.renewalId && String(item?.renewalId || '') === String(result.renewalId)) ||
    (result.fillId && String(item?.fillId || '') === String(result.fillId)) ||
    (fill?.renewalId && String(item?.renewalId || '') === String(fill.renewalId)) ||
    (senderTabId && Number(item?.targetTabId || 0) === senderTabId)
  ) || null;
  if (renewal) result = correlationContext(result, renewal);

  const archive = archiveSessions.find(item =>
    (result.archiveInsertionId && String(item?.archiveInsertionId || '') === String(result.archiveInsertionId)) ||
    (result.fillId && String(item?.fillId || '') === String(result.fillId)) ||
    (senderTabId && Number(item?.targetTabId || 0) === senderTabId)
  ) || null;
  if (archive) result = correlationContext(result, archive);

  const massBatchId = String(result.massBatchId || renewal?.massBatchId || fill?.massBatchId || '');
  const massItems = Array.isArray(massBatch?.items) ? massBatch.items : [];
  const massItem = massItems.find(item =>
    (result.renewalId && String(item?.renewalId || '') === String(result.renewalId)) ||
    (result.operationId && String(item?.operationId || '') === String(result.operationId))
  ) || null;
  if (massItem) result = correlationContext(result, massItem, { massBatchId: massBatch?.batchId || massBatchId });

  const bulkMatches = bulkRun && (
    (result.bulkRunId && String(bulkRun.bulkRunId || bulkRun.runId || '') === String(result.bulkRunId)) ||
    (result.runId && String(bulkRun.runId || '') === String(result.runId)) ||
    (senderTabId && [bulkRun.sourceTabId, bulkRun.workerTabId, bulkRun.metadataTabId].some(value => Number(value || 0) === senderTabId))
  );
  if (bulkMatches) result = correlationContext(result, bulkRun);

  if (massBatch && (massBatchId && String(massBatch.batchId || '') === massBatchId || massItem)) {
    result = correlationContext(result, { ...massBatch, massBatchId: massBatch.batchId || massBatchId });
  }
  return result;
}

async function resolveClientDiagnosticCorrelation(message = {}, sender = {}) {
  const senderTabId = Number(sender?.tab?.id || 0) || null;
  const base = correlationContext(message?.context || {}, message?.details || {});
  if (base.operationId) return base;
  const stored = await chrome.storage.local.get([
    'bulkInventoryRun', 'templateFillSessions', RENEWAL_SESSIONS_KEY,
    MASS_RENEWAL_BATCH_KEY, ARCHIVE_INSERTION_SESSIONS_KEY
  ]).catch(() => ({}));
  return correlationContextFromBindings({ ...base, senderTabId }, {
    bulkRun: stored?.bulkInventoryRun || null,
    fillSessions: stored?.templateFillSessions || {},
    renewalSessions: stored?.[RENEWAL_SESSIONS_KEY] || {},
    massBatch: stored?.[MASS_RENEWAL_BATCH_KEY] || null,
    archiveSessions: stored?.[ARCHIVE_INSERTION_SESSIONS_KEY] || {}
  });
}

async function withInsertionStartGate(task) { return requireInsertionLockService().withInsertionStartGate(task); }

const normalizeRenewalMode = RenewalPolicy.normalizeRenewalMode;
const normalizeRenewalPhaseAttempts = RenewalPolicy.normalizeRenewalPhaseAttempts;
const renewalMaxPhaseAttempts = RenewalPolicy.renewalMaxPhaseAttempts;
const renewalAttemptState = RenewalPolicy.renewalAttemptState;

function beginRenewalPhaseAttempt(session, phase, { attempt = null, lastError = null } = {}) {
  const phaseNumber = Number(phase);
  const key = String(phaseNumber);
  const previous = renewalAttemptState(session, phaseNumber);
  const nextAttempt = attempt == null ? previous.attempt + 1 : Number(attempt);
  session.phaseAttempts = { ...(session.phaseAttempts || {}) };
  const state = {
    attempt: Math.max(1, nextAttempt),
    attemptId: crypto.randomUUID(),
    lastError: lastError ? String(lastError).slice(0, 800) : null,
    updatedAt: new Date().toISOString()
  };
  session.phaseAttempts[key] = state;
  return state;
}

function recordRenewalPhaseAttemptError(session, phase, error) {
  const key = String(Number(phase));
  const current = renewalAttemptState(session, phase);
  session.phaseAttempts = { ...(session.phaseAttempts || {}) };
  session.phaseAttempts[key] = {
    ...current,
    lastError: String(error?.message || error || '').slice(0, 800) || null,
    updatedAt: new Date().toISOString()
  };
  return session.phaseAttempts[key];
}

const renewalPhaseAttemptAvailable = RenewalPolicy.renewalPhaseAttemptAvailable;

const renewalAttemptDetails = RenewalPolicy.renewalAttemptDetails;

const isNonRetryableRenewalSafetyError = RenewalPolicy.isNonRetryableRenewalSafetyError;

const renewalPhaseRetryDelayMs = RenewalPolicy.renewalPhaseRetryDelayMs;

function resetRenewalPhaseAttempts(session, phases = []) {
  if (!session || typeof session !== 'object') return session;
  session.phaseAttempts = { ...(session.phaseAttempts || {}) };
  for (const phase of phases) delete session.phaseAttempts[String(Number(phase))];
  return session;
}

async function logRenewalPhaseAttemptStarted(session, phase, eventName, operation, extra = {}) {
  const state = beginRenewalPhaseAttempt(session, phase);
  await persistRenewalSession(session);
  await logDiagnostic('info', eventName, {
    renewalId: session.renewalId,
    sourceAdId: session.sourceAdId,
    newAdId: session.newAdId || null,
    ...renewalAttemptDetails(session, phase),
    ...extra
  }, {
    module: 'background',
    operation,
    context: sessionCorrelationContext(session, { renewalId: session.renewalId, adId: session.newAdId || session.sourceAdId })
  }).catch(() => {});
  return state;
}

async function logRenewalPhaseAttemptFailed(session, phase, eventName, operation, error, extra = {}) {
  const state = recordRenewalPhaseAttemptError(session, phase, error);
  await persistRenewalSession(session).catch(() => {});
  await logDiagnostic('warning', eventName, {
    renewalId: session.renewalId,
    sourceAdId: session.sourceAdId,
    newAdId: session.newAdId || null,
    ...renewalAttemptDetails(session, phase),
    message: String(error?.message || error || '').slice(0, 800),
    retryAvailable: renewalPhaseAttemptAvailable(session, phase),
    ...extra
  }, {
    module: 'background',
    operation,
    context: sessionCorrelationContext(session, { renewalId: session.renewalId, adId: session.newAdId || session.sourceAdId })
  }).catch(() => {});
  return state;
}

function extractHttpErrorCode(...values) {
  for (const value of values) {
    const match = String(value || '').match(/(?:^|\D)([45]\d{2})(?:\D|$)/);
    if (match) return Number(match[1]);
  }
  return null;
}

function classifyKleinanzeigenInsertionErrorUrl(rawUrl, evidence = {}) {
  try {
    const url = new URL(String(rawUrl || ''));
    const host = String(url.hostname || '').toLowerCase();
    if (url.protocol !== 'https:' || (host !== 'kleinanzeigen.de' && !host.endsWith('.kleinanzeigen.de'))) {
      return { isError: false, errorCode: null, reason: null, path: url.pathname || null };
    }
    const path = String(url.pathname || '');
    const title = String(evidence?.title || '');
    const heading = String(evidence?.heading || '');
    const markerText = `${path} ${url.search} ${title} ${heading}`;
    const errorCode = extractHttpErrorCode(markerText);
    const knownInsertionErrorPath = path === '/anzeige-aufgeben-fehler.html';
    const semanticErrorPath = /(?:fehler|error)/i.test(path) && (/(?:anzeige|aufgeben|inser)/i.test(path) || Boolean(errorCode));
    const explicitHttpErrorPath = /(?:^|[\/_-])(?:4\d{2}|5\d{2})(?:[\/_\.-]|$)/.test(path) && /(?:fehler|error|status)/i.test(markerText);
    const strongTitle = /(?:fehler|error|bad request|internal server error|service unavailable|gateway timeout)/i.test(`${title} ${heading}`) && Boolean(errorCode);
    const isError = knownInsertionErrorPath || semanticErrorPath || explicitHttpErrorPath || strongTitle;
    return { isError, errorCode: isError ? errorCode : null, reason: knownInsertionErrorPath ? 'known-insertion-error-path' : semanticErrorPath ? 'semantic-error-path' : explicitHttpErrorPath ? 'http-error-path' : strongTitle ? 'http-error-title' : null, path: path || null };
  } catch {
    return { isError: false, errorCode: null, reason: null, path: null };
  }
}


async function getRenewalConfiguration() {
  const stored = await chrome.storage.local.get([RENEWAL_MODE_KEY, RENEWAL_FAST_MODE_ACK_KEY, RENEWAL_PHASE_ATTEMPTS_KEY]);
  return {
    renewalMode: normalizeRenewalMode(stored?.[RENEWAL_MODE_KEY]),
    fastModeAcknowledged: stored?.[RENEWAL_FAST_MODE_ACK_KEY] === true,
    maxPhaseAttempts: normalizeRenewalPhaseAttempts(stored?.[RENEWAL_PHASE_ATTEMPTS_KEY])
  };
}

async function setRenewalMode(message) {
  const renewalMode = normalizeRenewalMode(message?.renewalMode);
  const patch = { [RENEWAL_MODE_KEY]: renewalMode };
  if (renewalMode === RENEWAL_MODE_FAST && message?.acknowledgeFastMode === true) patch[RENEWAL_FAST_MODE_ACK_KEY] = true;
  await chrome.storage.local.set(patch);
  const configuration = await getRenewalConfiguration();
  await logDiagnostic('info', 'RENEWAL_MODE_CHANGED', {
    renewalMode: configuration.renewalMode,
    fastModeAcknowledged: configuration.fastModeAcknowledged
  }, { module: 'background', operation: 'renewal-configuration' }).catch(() => {});
  return configuration;
}

async function setRenewalPhaseAttempts(message) {
  const maxPhaseAttempts = normalizeRenewalPhaseAttempts(message?.maxPhaseAttempts);
  await chrome.storage.local.set({ [RENEWAL_PHASE_ATTEMPTS_KEY]: maxPhaseAttempts });
  const configuration = await getRenewalConfiguration();
  await logDiagnostic('info', 'RENEWAL_PHASE_ATTEMPTS_CHANGED', {
    maxPhaseAttempts: configuration.maxPhaseAttempts
  }, { module: 'background', operation: 'renewal-configuration' }).catch(() => {});
  return configuration;
}


let managedTabWorkerService = null;
function requireManagedTabWorkerService() {
  if (!managedTabWorkerService) {
    managedTabWorkerService = ManagedTabWorkerService.create({
      tabRegistry,
      chromeTabs: chrome.tabs,
      createAutomationTab: options => createAutomationTab(options),
      updateAutomationTab: (tabId, properties) => updateAutomationTab(tabId, properties),
      isGoneError: error => TabRegistry.isGoneError(error),
      isDiscardedError: error => TabRegistry.isDiscardedError(error)
    });
  }
  return managedTabWorkerService;
}
async function registerManagedWorkerTab(tabId, kind = 'worker', owner = {}) { return requireManagedTabWorkerService().registerManagedWorkerTab(tabId, kind, owner); }
async function markManagedWorkerTabClosed(tabId) { return requireManagedTabWorkerService().markManagedWorkerTabClosed(tabId); }
async function getManagedWorkerTabIds() { return requireManagedTabWorkerService().getManagedWorkerTabIds(); }
async function getTabRegistrySnapshot() { return requireManagedTabWorkerService().getTabRegistrySnapshot(); }
async function createManagedWorkerTab(createOptions, kind, owner = {}) { return requireManagedTabWorkerService().createManagedWorkerTab(createOptions, kind, owner); }
async function closeRegistryTab(tabId, reason = 'workflow-close', label = 'Kleinanzeigen-Tab') { return requireManagedTabWorkerService().closeRegistryTab(tabId, reason, label); }
async function closeRegistryTabs(tabIds, reason = 'workflow-close', label = 'Kleinanzeigen-Tab') { return requireManagedTabWorkerService().closeRegistryTabs(tabIds, reason, label); }
async function closeManagedWorkerTab(tabId) { return requireManagedTabWorkerService().closeManagedWorkerTab(tabId); }
async function registerShadowTab(tabId, role, owner = {}, options = {}) { return requireManagedTabWorkerService().registerShadowTab(tabId, role, owner, options); }

function bulkRunOwnerExpectation(state = {}) {
  const operationId = String(state?.operationId || '').trim();
  const bulkRunId = String(state?.bulkRunId || state?.runId || '').trim();
  const runId = String(state?.runId || state?.bulkRunId || '').trim();
  const ownerId = runId || bulkRunId || operationId;
  return {
    ...(operationId ? { operationId } : {}),
    ...(bulkRunId ? { bulkRunId } : {}),
    ...(runId ? { runId } : {}),
    ownerType: 'bulk',
    ...(ownerId ? { ownerId } : {})
  };
}

function bulkRunOwnsRegistryTab(entry, state = {}) {
  return Boolean(entry && TabRegistry.ownerMatches(entry.owner || {}, bulkRunOwnerExpectation(state)));
}

function bulkRunActiveForRegistry(state) {
  return Boolean(state && (String(state.status || '') === 'running' || String(state.retryAdId || '')));
}

async function releaseBulkSourceOwnership(state, reason = 'bulk-terminal') {
  const sourceTabId = Number(state?.sourceTabId || 0);
  if (!sourceTabId) return { released: false, reason: 'missing-source-tab', entry: null };
  const entry = await tabRegistry.get(sourceTabId).catch(() => null);
  if (!entry) return { released: false, reason: 'missing', entry: null };
  if (!bulkRunOwnsRegistryTab(entry, state)) return { released: false, reason: 'owner-mismatch', entry };
  const result = await tabRegistry.releaseOwnership(sourceTabId, bulkRunOwnerExpectation(state));
  if (result?.released) {
    await logDiagnostic('info', 'TAB_REGISTRY_OWNERSHIP_RELEASED', {
      tabId: sourceTabId,
      role: entry.role || null,
      ownerType: 'bulk',
      ownerId: String(state?.runId || state?.bulkRunId || state?.operationId || '') || null,
      reason
    }, { module: 'background', operation: 'tab-registry', context: sessionCorrelationContext(state, { sourceTabId }) }).catch(() => {});
  }
  return result;
}

async function reconcileTabRegistry() {
  const [tabs, stored] = await Promise.all([
    chrome.tabs.query({ url: ['https://www.kleinanzeigen.de/*', 'https://kleinanzeigen.de/*'] }).catch(() => []),
    chrome.storage.local.get(['bulkInventoryRun', 'templateFillSessions', RENEWAL_SESSIONS_KEY, ARCHIVE_INSERTION_SESSIONS_KEY]).catch(() => ({}))
  ]);
  const fills = Object.values(stored?.templateFillSessions || {}).filter(Boolean);
  const renewals = Object.values(stored?.[RENEWAL_SESSIONS_KEY] || {}).filter(Boolean);
  const archives = Object.values(stored?.[ARCHIVE_INSERTION_SESSIONS_KEY] || {}).filter(Boolean);
  const bulk = stored?.bulkInventoryRun && typeof stored.bulkInventoryRun === 'object' ? stored.bulkInventoryRun : null;
  const bulkActive = bulkRunActiveForRegistry(bulk);
  if (bulk && !bulkActive) await releaseBulkSourceOwnership(bulk, 'reconcile-terminal').catch(() => {});
  const existing = new Map((await tabRegistry.snapshot()).map(entry => [Number(entry.tabId), entry]));

  for (const tab of tabs) {
    const id = Number(tab?.id || 0);
    if (!id) continue;
    const prior = existing.get(id);
    let role = prior?.role || TabRegistry.roleForUrl(tab.url);
    let owner = prior?.owner || {};
    const fill = fills.find(item => Number(item?.targetTabId || 0) === id) || null;
    const renewal = renewals.find(item => Number(item?.targetTabId || 0) === id) || null;
    const archive = archives.find(item => Number(item?.targetTabId || 0) === id) || null;
    if (archive || fill?.archiveInsertionId) {
      role = TAB_ROLES.ARCHIVE_TARGET;
      owner = correlationContext(archive, fill);
    } else if (renewal || fill?.renewalId) {
      role = TAB_ROLES.RENEWAL_TARGET;
      owner = correlationContext(renewal, fill);
    } else if (bulkActive && Number(bulk.sourceTabId || 0) === id) {
      role = TAB_ROLES.BULK_SOURCE;
      owner = { ...correlationContext(bulk), ownerType: 'bulk', ownerId: String(bulk.runId || bulk.bulkRunId || bulk.operationId || '') };
    } else if (bulkActive && [bulk.workerTabId, bulk.metadataTabId].some(value => Number(value || 0) === id)) {
      role = TAB_ROLES.BULK_WORKER;
      owner = { ...correlationContext(bulk), ownerType: 'bulk', ownerId: String(bulk.runId || bulk.bulkRunId || bulk.operationId || '') };
    }
    await tabRegistry.observeTab(tab, { role, managed: prior?.managed ?? false, owner }).catch(() => {});
  }
  return tabRegistry.snapshot();
}

function isKleinanzeigenTabUrl(rawUrl) {
  try {
    const url = new URL(String(rawUrl || ''));
    return url.protocol === 'https:' && /^(?:www\.)?kleinanzeigen\.de$/i.test(url.hostname);
  } catch { return false; }
}

async function reactivateDiscardedTabs(message = {}) { return requireManagedTabWorkerService().reactivateDiscardedTabs(message); }

function broadcastInventoryChanged(reason, details = {}) {
  try {
    chrome.runtime.sendMessage({ type: 'INVENTORY_DATA_CHANGED', reason, details }, () => {
      void chrome.runtime.lastError;
    });
  } catch { /* UI notification is best-effort only. */ }
}

function isTrashRecord(record) { return requireTrashService().isTrashRecord(record); }

function trashRecordFrom(record, reason = 'manual', context = {}, at = new Date()) { return requireTrashService().trashRecordFrom(record, reason, context, at); }

async function setAppNotice(notice) {
  const value = notice && typeof notice === 'object' ? { ...notice, createdAt: notice.createdAt || new Date().toISOString() } : null;
  if (value) await chrome.storage.local.set({ [APP_NOTICE_KEY]: value });
  else await chrome.storage.local.remove(APP_NOTICE_KEY);
  return value;
}

async function getAppNotice() {
  const stored = await chrome.storage.local.get(APP_NOTICE_KEY);
  return stored?.[APP_NOTICE_KEY] || null;
}

async function dismissAppNotice(message) {
  const current = await getAppNotice();
  const expectedId = String(message?.noticeId || '');
  if (!expectedId || !current || String(current.id || '') === expectedId) await chrome.storage.local.remove(APP_NOTICE_KEY);
  return { dismissed: true };
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let emergencyResetGeneration = 0;
function captureEmergencyResetGeneration() { return emergencyResetGeneration; }
function assertEmergencyResetGeneration(expectedGeneration, operation = 'workflow') {
  if (Number(expectedGeneration) === emergencyResetGeneration) return true;
  const error = new Error('Der Vorgang wurde durch einen lokalen Notfall-Reset beendet.');
  error.code = 'KR_EMERGENCY_RESET_GENERATION_CHANGED';
  error.operation = operation;
  throw error;
}
function bumpEmergencyResetGeneration() { emergencyResetGeneration += 1; return emergencyResetGeneration; }

const PLATFORM_REMOTE_ACTION_TYPES = new Set([
  'ENSURE_CONTENT_CONNECTION', 'REACTIVATE_DISCARDED_TABS',
  'OPEN_EDIT_AD', 'OPEN_READONLY_AD', 'PROBE_LIVE_KLEINANZEIGEN_ACCOUNT',
  'REFRESH_INVENTORY', 'CAPTURE_SINGLE_INVENTORY', 'RETRY_RENEWAL_VERIFICATION',
  'START_BULK_INVENTORY_OPERATION', 'BULK_INIT_RUN',
  'BULK_BEGIN_RECONCILIATION', 'BULK_OPEN_WORKER', 'BULK_EXTRACT_SAVE_WORKER',
  'RETRY_BULK_FAILURE', 'START_MASS_RENEWAL_BATCH', 'RETRY_MASS_RENEWAL_ITEM',
  'START_TEMPLATE_FILL', 'START_ARCHIVE_INSERTION', 'START_TRASH_TEMPLATE_FILL'
]);

let platformSafetyController = null;
function requirePlatformSafetyController() {
  if (!platformSafetyController) {
    platformSafetyController = PlatformSafetyController.create({
      remoteActionTypes: PLATFORM_REMOTE_ACTION_TYPES,
      restrictionKey: PLATFORM_ACCESS_RESTRICTION_KEY,
      errorCode: PLATFORM_ACCESS_RESTRICTION_ERROR_CODE,
      storageLocal: chrome.storage.local,
      chromeTabs: chrome.tabs,
      runtime: chrome.runtime,
      platformHardening: PlatformHardening,
      logDiagnostic,
      getBulkRunState, writeBulkRunState,
      closeRegistryTabs, closeRegistryTab, releaseBulkSourceOwnership,
      readRenewalSessions, writeRenewalSessions,
      readArchiveInsertionSessions, writeArchiveInsertionSessions,
      readFillSessions, writeFillSessions,
      readMassRenewalBatch, writeMassRenewalBatch, touchMassRenewalItemProgress,
      getTabRegistrySnapshot,
      goneState: TAB_STATES.GONE,
      bulkWorkerRole: TAB_ROLES.BULK_WORKER,
      broadcastInventoryChanged
    });
  }
  return platformSafetyController;
}
async function readPlatformAccessRestriction() { return requirePlatformSafetyController().readPlatformAccessRestriction(); }
function platformAccessRestrictionError(state = null) { return requirePlatformSafetyController().platformAccessRestrictionError(state); }
async function assertPlatformAccessAllowed(context = {}) { return requirePlatformSafetyController().assertPlatformAccessAllowed(context); }
async function assertPlatformAccessAllowedForRequest(message = {}) { return requirePlatformSafetyController().assertPlatformAccessAllowedForRequest(message); }
async function createAutomationTab(options) { return requirePlatformSafetyController().createAutomationTab(options); }
async function updateAutomationTab(tabId, updateProperties) { return requirePlatformSafetyController().updateAutomationTab(tabId, updateProperties); }
async function reloadAutomationTab(tabId, reloadProperties = undefined) { return requirePlatformSafetyController().reloadAutomationTab(tabId, reloadProperties); }
function broadcastPlatformAccessRestrictionChanged(state) { return requirePlatformSafetyController().broadcastPlatformAccessRestrictionChanged(state); }
async function applyPlatformSafetyStop(state) { return requirePlatformSafetyController().applyPlatformSafetyStop(state); }
async function activatePlatformAccessRestriction(message = {}, sender = {}) { return requirePlatformSafetyController().activatePlatformAccessRestriction(message, sender); }
async function clearPlatformAccessRestriction() { return requirePlatformSafetyController().clearPlatformAccessRestriction(); }

async function openOrFocusAppWindow() {
  const stored = await chrome.storage.session.get(APP_WINDOW_SESSION_KEY).catch(() => ({}));
  const existingId = Number(stored?.[APP_WINDOW_SESSION_KEY] || 0);
  if (existingId) {
    try {
      const existing = await chrome.windows.get(existingId);
      await chrome.windows.update(existing.id, { focused: true });
      await logDiagnostic('info', 'APP_WINDOW_FOCUSED', { windowId: existing.id }, { module: 'background', operation: 'app-window' }).catch(() => {});
      return { windowId: existing.id, reused: true };
    } catch {
      await chrome.storage.session.remove(APP_WINDOW_SESSION_KEY).catch(() => {});
    }
  }
  const created = await chrome.windows.create({
    url: chrome.runtime.getURL(APP_PAGE),
    type: "popup",
    focused: true,
    width: APP_WINDOW_INITIAL_WIDTH,
    height: APP_WINDOW_INITIAL_HEIGHT
  });
  if (!created?.id) throw new Error("App-Fenster konnte nicht geöffnet werden.");
  await chrome.storage.session.set({ [APP_WINDOW_SESSION_KEY]: created.id });
  await logDiagnostic('info', 'APP_WINDOW_OPENED', { windowId: created.id, width: APP_WINDOW_INITIAL_WIDTH, height: APP_WINDOW_INITIAL_HEIGHT }, { module: 'background', operation: 'app-window' }).catch(() => {});
  return { windowId: created.id, reused: false };
}

let inventoryRepository = null;
let inventoryImageStore = null;
let trashService = null;

function requireInventoryRepository() {
  if (inventoryRepository) return inventoryRepository;
  if (!InventoryRepository?.create) throw new Error('inventory-repository.js must load before inventory storage is used');
  inventoryRepository = InventoryRepository.create({
    indexedDB, IDBKeyRange, dbName: DB_NAME, dbVersion: DB_VERSION,
    inventoryStore: INVENTORY_STORE, imageStore: IMAGE_STORE,
    unassignedProfileId: UNASSIGNED_PROFILE_ID
  });
  return inventoryRepository;
}

function requireInventoryImageStore() {
  if (inventoryImageStore) return inventoryImageStore;
  if (!InventoryImageStore?.create) throw new Error('inventory-image-store.js must load before inventory images are used');
  const repository = requireInventoryRepository();
  inventoryImageStore = InventoryImageStore.create({
    openSharedDatabase: repository.openSharedDatabase,
    openDatabase: repository.openDatabase,
    imageStore: IMAGE_STORE,
    IDBKeyRange
  });
  return inventoryImageStore;
}

function requireTrashService() {
  if (trashService) return trashService;
  if (!TrashService?.create) throw new Error('trash-service.js must load before trash storage is used');
  trashService = TrashService.create({ inventoryRepository: requireInventoryRepository(), retentionMs: TRASH_RETENTION_MS });
  return trashService;
}

function openDatabase() { return requireInventoryRepository().openDatabase(); }

let diagnosticsService = null;

function requireDiagnosticsService() {
  if (diagnosticsService) return diagnosticsService;
  if (!DiagnosticsService?.create) throw new Error('diagnostics-service.js must load before diagnostics are used');
  diagnosticsService = DiagnosticsService.create({
    storageLocal: chrome.storage.local,
    randomUUID: () => crypto.randomUUID(),
    correlationContext,
    getResetBlocker: diagnosticResetBlocker,
    maxDiagnostics: MAX_DIAGNOSTICS,
    diagnosticsKey: DIAGNOSTICS_KEY,
    retentionMs: DIAGNOSTIC_RETENTION_MS,
    galleryKey: GALLERY_DIAGNOSTICS_KEY,
    boundaryKey: DIAGNOSTIC_BOUNDARY_KEY,
    galleryRetentionMs: GALLERY_DIAGNOSTIC_RETENTION_MS,
    maxGalleryDiagnostics: MAX_GALLERY_DIAGNOSTICS,
    batchFlushMs: DIAGNOSTIC_BATCH_FLUSH_MS,
    batchMaxPending: DIAGNOSTIC_BATCH_MAX_PENDING
  });
  return diagnosticsService;
}

function currentDiagnosticSessionId() { return requireDiagnosticsService().sessionId(); }
function redactUrl(raw) { return requireDiagnosticsService().redactUrl(raw); }
function sanitizeDiagnosticValue(value, key = '', depth = 0) { return requireDiagnosticsService().sanitize(value, key, depth); }
function representedDiagnosticEventCount(events) { return requireDiagnosticsService().representedEventCount(events); }
function readDiagnostics() { return requireDiagnosticsService().read(); }
function flushDiagnosticBuffer() { return requireDiagnosticsService().flush(); }
function logDiagnostic(level, event, details = {}, meta = {}) { return requireDiagnosticsService().log(level, event, details, meta); }
function storeGalleryDiagnostic(message, sender) { return requireDiagnosticsService().storeGallery(message, sender); }
function readRecentGalleryDiagnostics() { return requireDiagnosticsService().readRecentGallery(); }
function resetDiagnostics() { return requireDiagnosticsService().reset(); }

async function logClientDiagnostic(message, sender) {
  const severity = ['info', 'warning', 'error'].includes(message?.severity) ? message.severity : 'info';
  const providedContext = message?.context && typeof message.context === 'object' ? message.context : {};
  const resolvedCorrelation = await resolveClientDiagnosticCorrelation(message, sender);
  return logDiagnostic(severity, message?.event || 'CLIENT_EVENT', message?.details || {}, {
    module: message?.module || 'client',
    operation: message?.operation || '',
    context: {
      ...providedContext,
      senderTabId: sender?.tab?.id ?? null,
      ...resolvedCorrelation
    }
  }).then(() => ({ logged: true }));
}

async function diagnosticResetBlocker() {
  const [bulk, insertionLock, massBatch] = await Promise.all([
    getBulkRunState().catch(() => null),
    getInsertionLockState().catch(() => ({ locked: false })),
    readMassRenewalBatch().catch(() => null)
  ]);
  if (bulk && (String(bulk.status || '') === 'running' || Boolean(bulk.retryAdId) || String(bulk.stage || '').startsWith('reconciliation-'))) {
    return 'Diagnose kann während einer laufenden Erfassung nicht zurückgesetzt werden.';
  }
  if (insertionLock?.locked) return 'Diagnose kann während eines laufenden Neu-Inserierens nicht zurückgesetzt werden.';
  if (String(massBatch?.status || '') === 'running') return 'Diagnose kann während eines laufenden Neu-Inserierens nicht zurückgesetzt werden.';
  return '';
}

function normalizeProfileName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

let profileManagementController = null;
function requireProfileManagementController() {
  if (!profileManagementController) profileManagementController = ProfileManagementController.create({
    ProfileRepository,
    storageLocal: chrome.storage.local,
    profilesKey: PROFILES_KEY,
    activeProfileKey: ACTIVE_PROFILE_KEY,
    selectedProfileKey: SELECTED_PROFILE_KEY,
    unassignedProfileId: UNASSIGNED_PROFILE_ID,
    normalizeProfileName,
    randomUUID: () => crypto.randomUUID(),
    purgeExpiredTrash,
    readAllInventoryRecords,
    getBulkRunState,
    isTrashRecord,
    readInventoryRecordsForProfile,
    readRenewalSessions,
    readMassRenewalBatch,
    getInventoryRepository: requireInventoryRepository,
    logDiagnostic,
    broadcastInventoryChanged,
    invalidateTrashPurgeSchedule
  });
  return profileManagementController;
}

async function readProfiles() { return requireProfileManagementController().readProfiles(); }


async function getProfileState() { return requireProfileManagementController().getProfileState(); }
async function setSelectedProfile(message) { return requireProfileManagementController().setSelectedProfile(message); }
async function prepareProfileBackupImport(message) { return requireProfileManagementController().prepareProfileBackupImport(message); }
async function finalizeProfileBackupImport(message) { return requireProfileManagementController().finalizeProfileBackupImport(message); }
async function deleteProfile(message) { return requireProfileManagementController().deleteProfile(message); }
async function ensureProfile(profileName) { return requireProfileManagementController().ensureProfile(profileName); }
async function recognizeProfile(message) { return requireProfileManagementController().recognizeProfile(message); }
async function assignUnprofiledInventories(message) { return requireProfileManagementController().assignUnprofiledInventories(message); }

if (chrome?.storage?.local) void logDiagnostic('info', 'DIAGNOSTIC_SESSION_STARTED', { sessionId: currentDiagnosticSessionId() }, { module: 'background', operation: 'diagnostic-session' }).catch(() => {});

function isTrustedProdAdImageUrl(url) {
  return url.protocol === "https:"
    && url.hostname === "img.kleinanzeigen.de"
    && /^\/api\/v1\/prod-ads\/images\/[0-9a-f]{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(url.pathname);
}

function jpegCandidates(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.hostname !== "img.kleinanzeigen.de") throw new Error("Unzulässige Bildquelle");
  const candidates = [];
  const rule = url.searchParams.get("rule");

  // Kleinanzeigen' own prod-ads UUID endpoint is trusted. Real edit-form tests show
  // that the hidden adImages[n].url may omit a visible rule while the same endpoint
  // still supports the established large JPEG variant. Try that verified variant
  // first, but only for this narrowly matched Kleinanzeigen CDN path.
  if (isTrustedProdAdImageUrl(url) || rule) {
    const large = new URL(url);
    large.searchParams.set("rule", "$_57.JPG");
    candidates.push(large.toString());
  }

  if (rule) {
    const jpeg = new URL(url);
    jpeg.searchParams.set("rule", rule.replace(/\.(AUTO|JPG|JPEG|PNG|WEBP|AVIF|GIF)$/i, ".JPG"));
    candidates.push(jpeg.toString());
  }
  candidates.push(url.toString());
  return [...new Set(candidates)];
}

function sourceUrlsForImage(source) {
  if (typeof source === "string") return [source];
  if (!source || typeof source !== "object") return [];
  return [...new Set([
    source.downloadUrl,
    ...(Array.isArray(source.sourceUrls) ? source.sourceUrls : []),
    source.url,
    ...(Array.isArray(source.variants) ? source.variants : [])
  ].filter(Boolean))];
}

function detectImageMime(bytes) {
  const ascii = (start, end) => String.fromCharCode(...bytes.slice(start,end));
  if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return "image/jpeg";
  if (bytes[0]===137 && ascii(1,4)==="PNG" && bytes[4]===13 && bytes[5]===10 && bytes[6]===26 && bytes[7]===10) return "image/png";
  if (["GIF87a","GIF89a"].includes(ascii(0,6))) return "image/gif";
  if (ascii(0,4)==="RIFF" && ascii(8,12)==="WEBP") return "image/webp";
  if (ascii(4,8)==="ftyp") {
    const boxSize = ((bytes[0]<<24) | (bytes[1]<<16) | (bytes[2]<<8) | bytes[3]) >>> 0;
    for (let i=8;i+4<=Math.min(bytes.length,boxSize);i+=4) {
      if (i!==12 && ["avif","avis"].includes(ascii(i,i+4))) return "image/avif";
    }
  }
  return null;
}

function largeEnough(width, height, source) {
  const thumbnailWidth = Number(source?.thumbnailWidth || 0);
  const thumbnailHeight = Number(source?.thumbnailHeight || 0);
  if (!thumbnailWidth || !thumbnailHeight) return { ok: true, evidence: "decoded-dimensions-no-thumbnail-baseline" };
  const areaRatio = (width * height) / Math.max(1, thumbnailWidth * thumbnailHeight);
  const edgeRatio = Math.max(width, height) / Math.max(1, Math.max(thumbnailWidth, thumbnailHeight));
  return {
    ok: areaRatio >= 4 && edgeRatio >= 1.5,
    evidence: `decoded-vs-thumbnail:${width}x${height}/${thumbnailWidth}x${thumbnailHeight}`
  };
}

async function downloadInventoryImage(source, requireJpeg = false, requireLarge = false) {
  const sourceUrls = sourceUrlsForImage(source);
  if (!sourceUrls.length) throw new Error("Keine zulässige Bildquelle vorhanden");
  let lastError = null;
  let fallback = null;
  const attempted = new Set();
  for (const rawUrl of sourceUrls) {
    const candidates = source?.preferExactDownloadUrl === true && rawUrl === source?.downloadUrl
      ? [rawUrl, ...jpegCandidates(rawUrl).filter(candidate => candidate !== rawUrl)]
      : jpegCandidates(rawUrl);
    for (const candidate of candidates) {
      if (attempted.has(candidate)) continue;
      attempted.add(candidate);
      try {
        const response = await fetch(candidate, { credentials: "omit", cache: "no-cache", redirect: "error", signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (!blob.size || blob.size > (requireJpeg ? 12 : 20) * 1024 * 1024) throw new Error("Bild ist leer oder überschreitet das Dateigrößenlimit");
        const signatureMime = detectImageMime(new Uint8Array(await blob.slice(0,256).arrayBuffer()));
        if (!signatureMime) throw new Error("Bildformat anhand der Dateidaten nicht erkannt");
        const value = {
          blob: blob.slice(0, blob.size, signatureMime),
          sourceUrl: rawUrl,
          fetchedUrl: candidate,
          mimeType: signatureMime,
          responseMimeType: blob.type,
          formatEvidence: "file-signature",
          size: blob.size
        };
        if (signatureMime === "image/jpeg") {
          if (requireJpeg || requireLarge) {
            const bitmap = await createImageBitmap(value.blob);
            try {
              if (!bitmap.width || !bitmap.height) throw new Error("JPEG enthält keine gültigen Bildabmessungen");
              value.width = bitmap.width;
              value.height = bitmap.height;
              value.formatEvidence = "file-signature-and-decode";
              if (requireLarge) {
                const large = largeEnough(bitmap.width, bitmap.height, source);
                value.largeImageEvidence = large.evidence;
                if (!large.ok) throw new Error(`JPEG ist nur Thumbnail-Größe (${bitmap.width}×${bitmap.height})`);
              }
            } finally {
              bitmap.close();
            }
          }
          const digest = await crypto.subtle.digest("SHA-256", await value.blob.arrayBuffer());
          value.sha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
          return value;
        }
        const digest = await crypto.subtle.digest("SHA-256", await value.blob.arrayBuffer());
        value.sha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
        fallback ||= value;
      } catch (error) {
        lastError = error;
      }
    }
  }
  if (fallback && !requireJpeg) return fallback;
  if (requireLarge) throw lastError || new Error("Keine große dekodierbare JPEG-Version verfügbar");
  if (requireJpeg && fallback) throw new Error("Keine dekodierbare JPEG-Version verfügbar (erkannt: " + fallback.mimeType + ")");
  throw lastError || new Error("Bild konnte nicht geladen werden");
}

// Both stores commit together; a failed request rolls back deletes and puts.
async function commitInventory(record, stagedImages) { return requireInventoryRepository().commit(record, stagedImages); }

let inventorySaveRunning = false;
async function saveInventory(extracted, options = {}) {
  if (inventorySaveRunning) throw new Error("Eine Erfassung läuft bereits. Bitte warten.");
  inventorySaveRunning = true;
  try {
    if (!extracted?.adId || !Array.isArray(extracted.images)) {
      throw new Error("Keine eindeutige Anzeigen-ID oder Bildliste vorhanden.");
    }
    const inventoryId = String(options.inventoryIdOverride || extracted.adId);
    const capturedAt = new Date().toISOString();
    await logDiagnostic('info', 'INVENTORY_SAVE_STARTED', { inventoryId, adId: String(extracted.adId), imageCount: extracted.images.length }, { module: 'background', operation: 'inventory-save', context: { adId: String(extracted.adId) } }).catch(() => {});
    const stagedImages = [];
    const imageResults = [];
    let totalBytes = 0;
    for (let index = 0; index < extracted.images.length; index += 1) {
      let downloaded;
      await logDiagnostic('info', 'INVENTORY_IMAGE_DOWNLOAD_STARTED', { inventoryId, image: index + 1, total: extracted.images.length, imageId: extracted.images[index]?.imageId || null }, { module: 'background', operation: 'inventory-image', context: { adId: String(extracted.adId) } }).catch(() => {});
      try {
        downloaded = await downloadInventoryImage(extracted.images[index], extracted.extraction?.requiresJpeg === true, extracted.extraction?.requiresLargeJpeg === true);
        if (extracted.extraction?.requiresJpeg && (downloaded.mimeType !== "image/jpeg" || downloaded.formatEvidence !== "file-signature-and-decode")) throw new Error("JPEG-Prüfung fehlgeschlagen");
        await logDiagnostic('info', 'INVENTORY_IMAGE_DOWNLOAD_SUCCEEDED', { inventoryId, image: index + 1, total: extracted.images.length, mimeType: downloaded.mimeType, size: downloaded.size, width: downloaded.width || null, height: downloaded.height || null }, { module: 'background', operation: 'inventory-image', context: { adId: String(extracted.adId) } }).catch(() => {});
      } catch (error) {
        await logDiagnostic('error', 'INVENTORY_IMAGE_DOWNLOAD_FAILED', { inventoryId, image: index + 1, total: extracted.images.length, message: String(error.message || error).slice(0, 500), stack: String(error.stack || '').slice(0, 2000) }, { module: 'background', operation: 'inventory-image', context: { adId: String(extracted.adId) } }).catch(() => {});
        throw new Error(`Bild ${index + 1} konnte nicht gesichert werden: ${error.message}. Vorhandenes Inventar bleibt erhalten.`);
      }
      totalBytes += downloaded.size;
      if (totalBytes > 128 * 1024 * 1024) throw new Error("Bildbestand überschreitet 128 MiB. Vorhandenes Inventar bleibt erhalten.");
      const imageKey = `${inventoryId}:${index}`;
      stagedImages.push({ imageKey, inventoryId, position: index, ...downloaded, capturedAt });
      const { blob, ...metadata } = downloaded;
      imageResults.push({ imageId: extracted.images[index].imageId, identityType: extracted.images[index].identityType, sourceFormatHint: extracted.images[index].sourceFormatHint, variants: extracted.images[index].variants, isPrimary: Boolean(extracted.images[index].isPrimary || index === 0), downloadSource: extracted.images[index].downloadSource || null, ...metadata, imageKey, position: index, locallyStored: true, uploadReady: downloaded.mimeType === "image/jpeg" });
    }
    const record = {
      ...extracted, inventoryId, schemaVersion: 2, capturedAt,
      images: imageResults,
      imageSummary: {
        discovered: imageResults.length,
        locallyStored: imageResults.length,
        uploadReadyJpeg: imageResults.filter(image => image.uploadReady).length
      }
    };
    await commitInventory(record, stagedImages);
    // Diagnostics must never turn a completed commit into an apparent failure.
    await logDiagnostic("info", "INVENTORY_SAVED", {
      inventoryId, imageSummary: record.imageSummary, atomicCommit: true
    }).catch(() => {});
    broadcastInventoryChanged('saved', { inventoryId, adId: String(record.adId || inventoryId), capturedAt: record.capturedAt });
    return record;
  } finally {
    inventorySaveRunning = false;
  }
}

async function readAllInventoryRecords() { return requireInventoryRepository().readAll(); }

async function readInventoryRecordsForProfile(profileId) { return requireInventoryRepository().readForProfile(profileId); }


function invalidateTrashPurgeSchedule() { requireTrashService().invalidatePurgeSchedule(); }

async function purgeExpiredTrash() {
  const result = await requireTrashService().purgeExpired();
  if (!result.purged) return { purged: 0, skipped: result.skipped === true, nextDueAt: result.nextDueAt };
  await logDiagnostic('info', 'TRASH_EXPIRED_PURGED', { count: result.expired.length, inventoryIds: result.expired.map(record => String(record.inventoryId || '')).slice(0, 100) }, { module: 'background', operation: 'trash-purge' }).catch(() => {});
  broadcastInventoryChanged('trash-expired-purged', { count: result.expired.length });
  return { purged: result.expired.length, nextDueAt: result.nextDueAt };
}

async function listInventories(profileId) { await purgeExpiredTrash(); const records = (await readInventoryRecordsForProfile(profileId)).filter(record => !isTrashRecord(record)); return records.sort((a, b) => String(b.capturedAt || '').localeCompare(String(a.capturedAt || ''))); }

async function listTrashEntries(profileId) { await purgeExpiredTrash(); return requireTrashService().list(profileId); }


async function setAccountGateDiagnosticState(message = {}) { return requireAccountSessionController().setAccountGateDiagnosticState(message); }


let diagnosticExportService = null;
function requireDiagnosticExportService() {
  if (!diagnosticExportService) diagnosticExportService = DiagnosticExportService.create({
    chromeApi: chrome, navigatorApi: navigator, messageContractRegistry: MessageContractRegistry,
    maxDiagnostics: MAX_DIAGNOSTICS, diagnosticRetentionMs: DIAGNOSTIC_RETENTION_MS,
    diagnosticBoundaryKey: DIAGNOSTIC_BOUNDARY_KEY, accountGateDiagnosticStateKey: ACCOUNT_GATE_DIAGNOSTIC_STATE_KEY,
    readDiagnostics, getBulkRunState, listInventories, readFillSessions, readRenewalSessions, getProfileState,
    readRecentGalleryDiagnostics, readMassRenewalBatch, sanitizeDiagnosticValue, currentDiagnosticSessionId,
    normalizeRenewalPhaseAttempts, renewalPublicSnapshot, massRenewalPublicSnapshot, redactUrl, representedDiagnosticEventCount
  });
  return diagnosticExportService;
}

const BULK_RUN_KEY = "bulkInventoryRun";
const BULK_RUN_MAX_AGE_MS = 6 * 60 * 60 * 1000;
let bulkRunGuard = null;
let bulkRuntimeRecoveryPromise = null;
function requireBulkRunGuard() {
  if (!bulkRunGuard) {
    bulkRunGuard = BulkRunGuard.create({
      storageLocal: chrome.storage.local,
      storageSession: chrome.storage.session,
      runKey: BULK_RUN_KEY,
      leaseKey: BULK_RUN_RUNTIME_LEASE_KEY,
      epochKey: RUNTIME_EPOCH_KEY,
      itemHardTimeoutMs: BULK_ITEM_HARD_TIMEOUT_MS,
      randomUUID: () => crypto.randomUUID()
    });
  }
  return bulkRunGuard;
}
async function cleanupRecoveredBulkTabs(tabIds = [], reason = 'bulk-runtime-recovery') {
  const ids = [...new Set((tabIds || []).map(value => Number(value || 0)).filter(Boolean))];
  if (!ids.length) return;
  await closeRegistryTabs(ids, reason, 'Inventarisierungs-Tab').catch(() => {});
}
async function ensureBulkRuntimeRecovery() {
  if (!bulkRuntimeRecoveryPromise) {
    bulkRuntimeRecoveryPromise = (async () => {
      const recovery = await requireBulkRunGuard().recoverOrphanedRun();
      if (recovery?.recovered) {
        await cleanupRecoveredBulkTabs(recovery.tabIds, 'bulk-runtime-session-lost');
        await logDiagnostic('warning', 'BULK_RUNTIME_SESSION_RECOVERED', {
          runId: recovery.state?.runId || null,
          previousTabs: recovery.tabIds || [],
          stage: recovery.state?.stage || null
        }, { module: 'background', operation: 'bulk-runtime-recovery', context: sessionCorrelationContext(recovery.state || {}) }).catch(() => {});
        broadcastInventoryChanged('bulk-runtime-session-recovered', { runId: recovery.state?.runId || null, status: recovery.state?.status || null });
      }
      return recovery;
    })();
  }
  return bulkRuntimeRecoveryPromise;
}

async function deleteInventoryStorageRecord(inventoryId) { return requireInventoryRepository().deleteWithImages(inventoryId); }

async function moveInventoryToTrash(inventoryId, reason = 'manual', context = {}) { return requireTrashService().moveToTrash(inventoryId, reason, context); }

async function resetTrashRetention(inventoryId) {
  const id = String(inventoryId || '');
  const updated = await requireTrashService().resetRetention(id);
  await logDiagnostic('info', 'TRASH_RETENTION_RESET', { inventoryId: id, adId: updated.adId || null, expiresAt: updated.trash?.expiresAt || null }, { module: 'background', operation: 'trash-retention-reset', context: { adId: updated.adId || null } }).catch(() => {});
  broadcastInventoryChanged('trash-retention-reset', { inventoryId: id, adId: updated.adId || null, expiresAt: updated.trash?.expiresAt || null });
  return { inventoryId: id, expiresAt: updated.trash?.expiresAt || null, retentionResetAt: updated.trash?.retentionResetAt || null };
}

async function deleteTrashEntry(inventoryId) {
  const id = String(inventoryId || '');
  const record = await requireTrashService().deleteEntry(id);
  await logDiagnostic('info', 'TRASH_ENTRY_PERMANENTLY_DELETED', { inventoryId: id, adId: record.adId || null, trashedAt: record.trash?.trashedAt || null }, { module: 'background', operation: 'trash-delete', context: { adId: record.adId || null } }).catch(() => {});
  broadcastInventoryChanged('trash-entry-deleted', { inventoryId: id, adId: record.adId || null });
  return { deleted: true, inventoryId: id };
}

async function deleteInventory(inventoryId) {
  const active = await getBulkRunState();
  if (active?.status === "running" || active?.retryAdId) throw new Error("Inventareinträge können während einer laufenden Erfassung oder einer einzelnen Wiederholung nicht gelöscht werden.");
  const id = String(inventoryId || "");
  if (!id) throw new Error("Inventar-ID fehlt.");
  const renewals = await readRenewalSessions().catch(() => ({}));
  const protectedRenewal = Object.values(renewals).find(item => !['cancelled', 'replaced'].includes(String(item?.status || '')) && [String(item?.sourceInventoryId || ''), String(item?.skeletonInventoryId || '')].includes(id));
  if (protectedRenewal) throw new Error('Dieser Inventareintrag gehört zu einem laufenden Renewal-Vorgang und kann derzeit nicht gelöscht werden.');
  const trashed = await moveInventoryToTrash(id, 'manual', { source: 'inventory-delete' });
  await logDiagnostic("info", "INVENTORY_MOVED_TO_TRASH", { inventoryId: id, adId: trashed.adId || null, expiresAt: trashed.trash?.expiresAt || null }).catch(() => {});
  broadcastInventoryChanged('moved-to-trash', { inventoryId: id, adId: trashed.adId || null, expiresAt: trashed.trash?.expiresAt || null });
  return { inventoryId: id, trashed: true, expiresAt: trashed.trash?.expiresAt || null };
}

async function removeReplacementReadyLocal(message) { return requireRemoteDeleteReplacementService().removeReplacementReadyLocal(message); }

async function promoteRenewalCandidateAtomic(session) { return requireRemoteDeleteReplacementService().promoteRenewalCandidateAtomic(session); }

function renewalTargetTabStillOwned(tab, session) { return requireRemoteDeleteReplacementService().renewalTargetTabStillOwned(tab, session); }

function renewalPublishedTargetTabStillOwned(tab, session) { return requireRemoteDeleteReplacementService().renewalPublishedTargetTabStillOwned(tab, session); }

async function closePublishedRenewalTargetTab(session) { return requireRemoteDeleteReplacementService().closePublishedRenewalTargetTab(session); }

async function retirePublishedRenewalTargetTab(session) { return requireRemoteDeleteReplacementService().retirePublishedRenewalTargetTab(session); }

async function closeCompletedRenewalTargetTab(session) { return requireRemoteDeleteReplacementService().closeCompletedRenewalTargetTab(session); }

async function assertMassRenewalManualActionAllowed(message = {}) {
  if (message?.automatic === true || message?.massBatchRetry === true) return;
  const batch = await readMassRenewalBatch().catch(() => null);
  if (batch?.status === 'running') throw new Error('Das Neu-Inserieren läuft noch. Einzelne Wiederholungen sind erst in der Abschlussübersicht möglich.');
}

async function verifyRenewalSourceAbsenceFresh(session, expectedProfile, windowId, attemptState, purpose = 'post-delete') { return requireRemoteDeleteReplacementService().verifyRenewalSourceAbsenceFresh(session, expectedProfile, windowId, attemptState, purpose); }

async function preverifyAndTriggerRenewalSourceDeleteAttempt(session, expectedProfile, windowId, attemptState) { return requireRemoteDeleteReplacementService().preverifyAndTriggerRenewalSourceDeleteAttempt(session, expectedProfile, windowId, attemptState); }

async function finishRenewalReplacement(message) { return requireRemoteDeleteReplacementService().finishRenewalReplacement(message); }

async function discardRenewalDraft(message) {
  const renewalId = String(message?.renewalId || '');
  if (!renewalId) throw new Error('Renewal-ID fehlt.');
  const renewals = await readRenewalSessions();
  const renewal = renewals[renewalId];
  if (!renewal) throw new Error('Renewal-Entwurf wurde nicht gefunden.');
  if (renewal.newAdId || ['submitted', 'new-id-confirmed', 'reinventorizing', 'verifying', 'verified'].includes(String(renewal.status || '')) || String(renewal.stage || '') === 'publish-submitted') {
    throw new Error('Dieser Renewal-Vorgang wurde bereits veröffentlicht oder zur Veröffentlichung übergeben und kann nicht als lokaler Entwurf verworfen werden.');
  }

  const active = await getBulkRunState();
  if (active?.status === 'running' || active?.retryAdId) throw new Error('Entwürfe können während einer laufenden Erfassung oder einer einzelnen Wiederholung nicht verworfen werden.');

  const skeletonInventoryId = String(renewal.skeletonInventoryId || '');
  const targetTabId = Number(renewal.targetTabId || 0) || null;
  const fillId = String(renewal.fillId || '');

  const fills = await readFillSessions().catch(() => ({}));
  if (fillId && fills[fillId]) {
    delete fills[fillId];
    await writeFillSessions(fills);
  } else {
    let changed = false;
    for (const [id, fill] of Object.entries(fills)) {
      if (String(fill?.renewalId || '') === renewalId) { delete fills[id]; changed = true; }
    }
    if (changed) await writeFillSessions(fills);
  }

  delete renewals[renewalId];
  await writeRenewalSessions(renewals);
  if (skeletonInventoryId) await deleteInventoryStorageRecord(skeletonInventoryId);
  if (targetTabId) await closeRegistryTab(targetTabId, 'renewal-draft-discarded', 'Renewal-Zieltab').catch(() => {});

  await logDiagnostic('info', 'RENEWAL_DRAFT_DISCARDED', {
    renewalId,
    sourceInventoryId: renewal.sourceInventoryId || null,
    sourceAdId: renewal.sourceAdId || null,
    skeletonInventoryId: skeletonInventoryId || null
  }, { module: 'background', operation: 'renewal-discard', context: sessionCorrelationContext(renewal, { renewalId, adId: renewal.sourceAdId || null }) }).catch(() => {});
  broadcastInventoryChanged('renewal-draft-discarded', { inventoryId: skeletonInventoryId || null, renewalId, sourceAdId: renewal.sourceAdId || null });
  return { discarded: true, renewalId, skeletonInventoryId: skeletonInventoryId || null };
}

async function clearInventories(profileId) {
  const active = await getBulkRunState();
  if (active?.status === "running" || active?.retryAdId) throw new Error("Die Inventarliste kann während einer laufenden Erfassung oder einer einzelnen Wiederholung nicht geleert werden.");
  const renewals = await readRenewalSessions().catch(() => ({}));
  const records = (await readInventoryRecordsForProfile(profileId)).filter(record => !isTrashRecord(record));
  if (!records.length) return { cleared: true, movedToTrash: 0 };
  const targetIds = new Set(records.map(record => String(record.inventoryId || '')));
  const protectedRenewal = Object.values(renewals).find(item => targetIds.has(String(item?.sourceInventoryId || '')) || targetIds.has(String(item?.skeletonInventoryId || '')));
  if (protectedRenewal) throw new Error('Dieses Profil kann nicht geleert werden, solange darin ein Renewal-Vorgang vorhanden ist. Bitte diesen zuerst abschließen oder verwerfen.');
  const now = new Date();
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(INVENTORY_STORE, 'readwrite');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Inventarliste konnte nicht in den Papierkorb verschoben werden.'));
      const store = tx.objectStore(INVENTORY_STORE);
      for (const record of records) store.put(trashRecordFrom(record, 'inventory-cleared', { source: 'clear-inventory' }, now));
    });
    await logDiagnostic('info', 'INVENTORY_CLEARED_TO_TRASH', { count: records.length, profileId: profileId === UNASSIGNED_PROFILE_ID ? null : (profileId || null), unassigned: profileId === UNASSIGNED_PROFILE_ID, expiresAt: new Date(now.getTime() + TRASH_RETENTION_MS).toISOString() }).catch(() => {});
    broadcastInventoryChanged('cleared-to-trash', { count: records.length });
    return { cleared: true, movedToTrash: records.length };
  } finally { db.close(); }
}

let singleInventoryController = null;
function requireSingleInventoryController() {
  if (!singleInventoryController) {
    singleInventoryController = SingleInventoryController.create({
      getBulkRunState, tabRegistry, chromeTabs: chrome.tabs, singleInventorySourceFromUrl,
      sendTabRequestWithBootstrap, normalizeProfileName, assertSelectedProfileMatchesLiveAccount,
      randomUUID: () => crypto.randomUUID(), logDiagnostic, correlationContext, normalBrowserWindowId,
      createManagedWorkerTab, getInventory, publicUrlForInventoryRecord, extractReadOnlyMetadata,
      readOnlyMetadataTimeoutMs: READONLY_METADATA_TIMEOUT_MS, directPublicUrlForAdId,
      extractSingleInventoryEdit, mergeListingMetadata, saveInventory, closeManagedWorkerTab,
      captureEmergencyResetGeneration, assertEmergencyResetGeneration
    });
  }
  return singleInventoryController;
}

let bulkInventoryController = null;
function requireBulkInventoryController() {
  if (!bulkInventoryController) {
    bulkInventoryController = BulkInventoryController.create({
      getBulkRunState, tabRegistry, tabRegistryApi: TabRegistry, chromeTabs: chrome.tabs, tabRoles: TAB_ROLES, tabStates: TAB_STATES,
      bulkRunOwnerExpectation, normalizeProfileName, ensureProfile, randomUUID: () => crypto.randomUUID(),
      normalizeCorrelationId, normalizeInventoryScope, inventoryScopeApi: InventoryScope, inventoryReconciliationApi: InventoryReconciliation,
      inventoryScopeNewOnly: INVENTORY_SCOPE_NEW_ONLY, readInventoryRecordsForProfile, normalizeRenewalMode,
      registerShadowTab, writeBulkRunState, mutateBulkRunState, logDiagnostic, sessionCorrelationContext,
      closeRegistryTabs, closeRegistryTab, releaseBulkSourceOwnership, broadcastInventoryChanged,
      readRenewalSessions, readFillSessions, readMassRenewalBatch, isTrashRecord, openDatabase, trashRecordFrom,
      getRenewalConfiguration, normalBrowserWindowId, assertPlatformAccessAllowed, createAutomationTab, waitForTabComplete,
      ensureContentConnection, sendTabRequestWithBootstrap, correlationContext, getInventory, deriveListingDateFromEndDate,
      mergeListingMetadata, saveInventory, updateAutomationTab, delay, extractReadOnlyMetadata,
      inventoryStore: INVENTORY_STORE, fastRenewalMode: RENEWAL_MODE_FAST, myAdsProjectsUrl: MY_ADS_PROJECTS_URL,
      platformAccessRestrictionErrorCode: PLATFORM_ACCESS_RESTRICTION_ERROR_CODE,
      bulkWorkerTabCreateMaxAttempts: BULK_WORKER_TAB_CREATE_MAX_ATTEMPTS, bulkWorkerTabCreateRetryMs: BULK_WORKER_TAB_CREATE_RETRY_MS,
      bulkRetryTimeoutMs: BULK_RETRY_TIMEOUT_MS, bulkRetryPollMs: BULK_RETRY_POLL_MS, readOnlyMetadataTimeoutMs: READONLY_METADATA_TIMEOUT_MS,
      freshBulkSourceMaxAttempts: FRESH_BULK_SOURCE_MAX_ATTEMPTS, freshReconciliationSourceMaxAttempts: FRESH_RECONCILIATION_SOURCE_MAX_ATTEMPTS,
      tabLoadTimeoutDefaultMs: TAB_LOAD_TIMEOUT_DEFAULT_MS, URL, setTimeout,
      captureEmergencyResetGeneration, assertEmergencyResetGeneration
    });
  }
  return bulkInventoryController;
}

async function getBulkRunState() {
  await ensureBulkRuntimeRecovery();
  const workerRecovery = await requireBulkRunGuard().recoverExpiredWorkerRun();
  if (workerRecovery?.recovered) {
    await cleanupRecoveredBulkTabs(workerRecovery.tabIds, 'bulk-worker-hard-timeout');
    if (workerRecovery.state?.sourceAutoCreated === true) await closeRegistryTab(workerRecovery.state.sourceTabId, 'bulk-worker-hard-timeout', '„Meine Anzeigen“-Hintergrundtab').catch(() => {});
    else if (workerRecovery.state) await releaseBulkSourceOwnership(workerRecovery.state, 'bulk-worker-hard-timeout').catch(() => {});
    await logDiagnostic('warning', 'BULK_WORKER_HARD_TIMEOUT', {
      runId: workerRecovery.state?.runId || null,
      adId: workerRecovery.state?.currentAdId || null,
      currentItemStartedAt: workerRecovery.state?.currentItemStartedAt || null,
      timeoutMs: BULK_ITEM_HARD_TIMEOUT_MS
    }, { module: 'background', operation: 'bulk-watchdog', context: sessionCorrelationContext(workerRecovery.state || {}, { adId: workerRecovery.state?.currentAdId || null }) }).catch(() => {});
    broadcastInventoryChanged('bulk-worker-timeout', { runId: workerRecovery.state?.runId || null, adId: workerRecovery.state?.currentAdId || null });
  }
  let state = workerRecovery?.state || await requireBulkRunGuard().read();
  if (!state) return null;
  if (state.status === "running" && state.updatedAt && Date.now() - Date.parse(state.updatedAt) > BULK_RUN_MAX_AGE_MS) {
    state = await mutateBulkRunState(current => {
      if (!current || current.status !== 'running') return current;
      current.status = "needs-review";
      current.stage = "stale";
      current.completedAt = new Date().toISOString();
      current.issues = [...new Set([...(current.issues || []), "Die Erfassung wurde wegen zu langer Inaktivität beendet."])];
      return current;
    });
    if (state?.sourceAutoCreated === true) await closeRegistryTab(state.sourceTabId, 'bulk-auto-source-stale', '„Meine Anzeigen“-Hintergrundtab').catch(() => {});
    else if (state) await releaseBulkSourceOwnership(state, 'bulk-stale').catch(() => {});
  }
  return state;
}

async function mutateBulkRunState(mutator) {
  return requireBulkRunGuard().mutate(mutator);
}

async function writeBulkRunState(state) {
  const current = await getBulkRunState().catch(() => null);
  if (current?.emergencyResetAt && String(state?.emergencyResetAt || '') !== String(current.emergencyResetAt)) return current;
  return requireBulkRunGuard().write(state);
}

async function bulkRunWatchdogTick() {
  await ensureBulkRuntimeRecovery();
  const recovery = await requireBulkRunGuard().recoverExpiredWorkerRun();
  if (!recovery?.recovered) return recovery?.state || null;
  await cleanupRecoveredBulkTabs(recovery.tabIds, 'bulk-worker-hard-timeout');
  if (recovery.state?.sourceAutoCreated === true) await closeRegistryTab(recovery.state.sourceTabId, 'bulk-worker-hard-timeout', '„Meine Anzeigen“-Hintergrundtab').catch(() => {});
  else if (recovery.state) await releaseBulkSourceOwnership(recovery.state, 'bulk-worker-hard-timeout').catch(() => {});
  await logDiagnostic('warning', 'BULK_WORKER_HARD_TIMEOUT', {
    runId: recovery.state?.runId || null,
    adId: recovery.state?.currentAdId || null,
    currentItemStartedAt: recovery.state?.currentItemStartedAt || null,
    timeoutMs: BULK_ITEM_HARD_TIMEOUT_MS
  }, { module: 'background', operation: 'bulk-watchdog', context: sessionCorrelationContext(recovery.state || {}, { adId: recovery.state?.currentAdId || null }) }).catch(() => {});
  broadcastInventoryChanged('bulk-worker-timeout', { runId: recovery.state?.runId || null, adId: recovery.state?.currentAdId || null });
  return recovery.state;
}

function normalizedBulkRosterIds(values) { return requireBulkInventoryController().normalizedBulkRosterIds(values); }

function bulkRosterEvidence(pages) { return requireBulkInventoryController().bulkRosterEvidence(pages); }


async function recordBulkRosterPage(message, sender, options = {}) { return requireBulkInventoryController().recordBulkRosterPage(message, sender, options); }

async function beginBulkReconciliation(message, sender) { return requireBulkInventoryController().beginBulkReconciliation(message, sender); }

async function protectedInventoryIdsForReconciliation(profileId) { return requireBulkInventoryController().protectedInventoryIdsForReconciliation(profileId); }

async function moveReconciliationCandidatesToTrash(state, remoteIds) { return requireBulkInventoryController().moveReconciliationCandidatesToTrash(state, remoteIds); }

async function finishBulkReconciliation(message, sender) { return requireBulkInventoryController().finishBulkReconciliation(message, sender); }

function requireBulkSource(state, sender) { return requireBulkInventoryController().requireBulkSource(state, sender); }



async function startBulkInventoryOperation(message = {}) { return requireBulkInventoryController().startBulkInventoryOperation(message); }

let accountSessionController = null;
function requireAccountSessionController() {
  if (!accountSessionController) accountSessionController = AccountSessionController.create({
    AccountProbeService,
    storageSession: chrome.storage.session,
    accountGateDiagnosticStateKey: ACCOUNT_GATE_DIAGNOSTIC_STATE_KEY,
    maxAttempts: ACCOUNT_PROBE_MAX_ATTEMPTS,
    retryDelayMs: ACCOUNT_PROBE_RETRY_DELAY_MS,
    navigationTimeoutMs: ACCOUNT_PROBE_NAVIGATION_TIMEOUT_MS,
    myAdsProjectsUrl: MY_ADS_PROJECTS_URL,
    platformAccessRestrictionErrorCode: PLATFORM_ACCESS_RESTRICTION_ERROR_CODE,
    randomUUID: () => crypto.randomUUID(),
    normalBrowserWindowId,
    createManagedWorkerTab,
    closeManagedWorkerTab,
    updateAutomationTab,
    waitForExpectedTabComplete,
    ensureContentConnection,
    sendTabRequestWithBootstrap,
    normalizeProfileName,
    ensureProfile,
    logDiagnostic,
    delay,
    getProfileState,
    unassignedProfileId: UNASSIGNED_PROFILE_ID
  });
  return accountSessionController;
}
async function probeLiveKleinanzeigenAccount() { return requireAccountSessionController().probeLiveKleinanzeigenAccount(); }
async function assertSelectedProfileMatchesLiveAccount(options = {}) { return requireAccountSessionController().assertSelectedProfileMatchesLiveAccount(options); }

async function bulkSourceWasAutoCreated(sourceTabId) { return requireBulkInventoryController().bulkSourceWasAutoCreated(sourceTabId); }

function scheduleAutoBulkSourceClose(state, reason = 'bulk-auto-source-terminal') { return requireBulkInventoryController().scheduleAutoBulkSourceClose(state, reason); }

async function initBulkRun(message, sender) { return requireBulkInventoryController().initBulkRun(message, sender); }

async function bulkRunForSource(sender) { return requireBulkInventoryController().bulkRunForSource(sender); }

async function updateBulkRun(message, sender) { return requireBulkInventoryController().updateBulkRun(message, sender); }

async function createBulkEditWorkerTabWithRetry(options, state, adId) { return requireBulkInventoryController().createBulkEditWorkerTabWithRetry(options, state, adId); }

async function openBulkWorker(message, sender) { return requireBulkInventoryController().openBulkWorker(message, sender); }

function sendTabRequest(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, response => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      if (!response?.ok) {
        const error = new Error(response?.error || "Worker-Antwort ungültig.");
        if (response?.errorCode) error.code = String(response.errorCode);
        if (response?.errorReasonCode) error.reasonCode = String(response.errorReasonCode);
        if (response?.errorDetails && typeof response.errorDetails === 'object') error.details = { ...response.errorDetails };
        return reject(error);
      }
      resolve(response.result);
    });
  });
}

async function sendTabRequestWithBootstrap(tabId, message) {
  try {
    return await sendTabRequest(tabId, message);
  } catch (error) {
    const text = String(error?.message || error || '');
    if (!/Receiving end does not exist|Could not establish connection|message port closed/i.test(text)) throw error;
    await ensureContentConnection({ tabId });
    return sendTabRequest(tabId, message);
  }
}

const trashTemplatePublishDetectionInFlight = new Set();

async function maybeDetectTrashTemplatePublishedAd(tabId, changeInfo = {}, tabHint = null) {
  const id = Number(tabId || 0);
  if (!id || trashTemplatePublishDetectionInFlight.has(id)) return false;
  const candidateUrl = String(changeInfo?.url || tabHint?.url || '');
  if (candidateUrl && !/(^|\.)kleinanzeigen\.de$/i.test((() => { try { return new URL(candidateUrl).hostname; } catch { return ''; } })())) return false;
  const sessions = await readFillSessions().catch(() => ({}));
  const session = Object.values(sessions).find(item => item?.templateOnly === true && Number(item?.targetTabId || 0) === id && String(item?.status || '') === 'complete' && !/^\d+$/.test(String(item?.newAdId || '')));
  if (!session) return false;

  trashTemplatePublishDetectionInFlight.add(id);
  try {
    const tab = tabHint?.id ? tabHint : await tabRegistry.getTabOrThrow(id, chrome.tabs, { label: 'Vorlagen-Tab', role: TAB_ROLES.TEMPLATE_TARGET, owner: { ownerType: 'trash-template', ownerId: session.fillId } });
    const directCandidate = publishedAdCandidateFromUrl(changeInfo?.url || tab?.url || '', session.sourceAdId);
    if (!directCandidate && changeInfo?.status !== 'complete') return false;
    await ensureContentConnection({ tabId: id });
    const [pageStatus, detected] = await Promise.all([
      sendTabRequest(id, { type: 'PAGE_STATUS' }).catch(() => null),
      sendTabRequest(id, { type: 'DETECT_PUBLISHED_AD', sourceAdId: session.sourceAdId }).catch(() => null)
    ]);
    const adId = String(detected?.adId || directCandidate?.adId || pageStatus?.adId || '');
    if (!/^\d+$/.test(adId) || adId === String(session.sourceAdId || '')) return false;
    const owned = pageStatus?.auth?.loggedIn === true && pageStatus?.auth?.ownAd === true;
    const pageAdId = String(pageStatus?.adId || '');
    if (!owned || (pageAdId && pageAdId !== adId)) return false;
    const publishedUrl = String(detected?.publicUrl || directCandidate?.publicUrl || (directCandidate?.kind === 'public' ? directCandidate.url : '') || tab?.url || '');

    let updated = null;
    await withTemplateFillMutation(async () => {
      const latest = await readFillSessions();
      const current = latest[session.fillId];
      if (!current?.templateOnly || Number(current.targetTabId || 0) !== id || /^\d+$/.test(String(current.newAdId || ''))) return;
      current.newAdId = adId;
      current.publishedUrl = publishedUrl || null;
      current.publishedAt = new Date().toISOString();
      current.stage = 'template-only-published';
      current.updatedAt = current.publishedAt;
      latest[current.fillId] = current;
      await writeFillSessions(latest);
      updated = current;
    });
    if (!updated) return false;
    await registerShadowTab(id, TAB_ROLES.TEMPLATE_TARGET, { operationId: updated.operationId || null, fillId: updated.fillId, inventoryId: String(updated.inventoryId || ''), adId, ownerType: 'trash-template', ownerId: updated.fillId });
    await logDiagnostic('info', 'TRASH_TEMPLATE_PUBLISHED_DETECTED', {
      operationId: updated.operationId || null,
      fillId: updated.fillId,
      sourceAdId: updated.sourceAdId || null,
      newAdId: adId,
      targetTabId: id,
      publishedUrl: publishedUrl || null
    }, { module: 'background', operation: 'trash-template-publish-detection', context: sessionCorrelationContext(updated, { adId, targetTabId: id }) }).catch(() => {});
    broadcastInventoryChanged('trash-template-published', { fillId: updated.fillId, inventoryId: updated.inventoryId || null, sourceAdId: updated.sourceAdId || null, newAdId: adId, targetTabId: id });
    return true;
  } finally {
    trashTemplatePublishDetectionInFlight.delete(id);
  }
}

function isPhase4DeleteTransportInterruption(error) {
  const text = String(error?.message || error || '');
  return /asynchronous response[\s\S]*message channel closed|message channel closed before a response|message port closed|No tab with id/i.test(text);
}

const EXPECTED_CONTROLLED_CLOSE_INTENT_MAX_AGE_MS = 10000;

let contentConnectionManager = null;
function requireContentConnectionManager() {
  if (!contentConnectionManager) {
    contentConnectionManager = ContentConnectionManager.create({
      tabRegistry,
      chromeTabs: chrome.tabs,
      chromeScripting: chrome.scripting,
      isGoneError: error => TabRegistry.isGoneError(error),
      goneState: TAB_STATES.GONE,
      expectedCloseIntentMaxAgeMs: EXPECTED_CONTROLLED_CLOSE_INTENT_MAX_AGE_MS,
      contentScriptFiles: CONTENT_SCRIPT_FILES,
      bootstrapWaitsMs: CONTENT_BOOTSTRAP_WAITS_MS,
      navigationWaitMs: CONTENT_BOOTSTRAP_NAVIGATION_WAIT_MS,
      delay,
      sendTabRequest,
      logDiagnostic,
      assertPlatformAccessAllowed,
      activatePlatformAccessRestriction,
      readPlatformAccessRestriction,
      platformAccessRestrictionError
    });
  }
  return contentConnectionManager;
}
function isExpectedControlledTabCloseReason(reason) {
  const value = String(reason || '');
  return /^(?:renewal-target-(?:published|completed)|renewal-draft-discarded|renewal-phase1-retry|renewal-resume-cleanup|managed-worker-closed|bulk-worker-(?:replaced|saved|closed)|bulk-retry-worker-(?:finished|failed)|inventory-refresh-worker-(?:finished|failed)|bulk-run-failed|bulk-source-gone-cleanup|bulk-auto-source-(?:stale|prepare-failed|preflight-failed|finished|failed|terminal)|workflow-close)$/.test(value);
}

async function expectedControlledTabCloseEntry(tabId) {
  const id = Number(tabId || 0);
  if (!id) return null;
  const entry = await tabRegistry.get(id).catch(() => null);
  if (!entry) return null;
  const goneReason = entry.lifecycleState === TAB_STATES.GONE ? String(entry.goneReason || '') : '';
  const closeIntentAt = Date.parse(String(entry.closeIntentAt || ''));
  const closeIntentAgeMs = Number.isFinite(closeIntentAt) ? Math.max(0, Date.now() - closeIntentAt) : Number.POSITIVE_INFINITY;
  const closeIntentReason = closeIntentAgeMs <= EXPECTED_CONTROLLED_CLOSE_INTENT_MAX_AGE_MS ? String(entry.closeIntentReason || '') : '';
  const expectedReason = isExpectedControlledTabCloseReason(goneReason) ? goneReason : (isExpectedControlledTabCloseReason(closeIntentReason) ? closeIntentReason : '');
  if (!expectedReason) return null;
  const owner = entry.owner && typeof entry.owner === 'object' ? entry.owner : {};
  const correlated = entry.managed === true || Object.values(owner).some(value => String(value || '').trim());
  return correlated ? { ...entry, expectedCloseReason: expectedReason } : null;
}

function expectedControlledTabCloseError(tabId, entry) {
  const id = Number(tabId || 0) || null;
  const reason = String(entry?.expectedCloseReason || entry?.goneReason || entry?.closeIntentReason || 'workflow-close');
  const error = new Error(`KR_TAB_EXPECTED_CLOSED: Kleinanzeigen-Tab ${id || ''} wurde vom Workflow planmäßig geschlossen.`.trim());
  error.code = 'KR_TAB_EXPECTED_CLOSED'; error.tabId = id; error.goneReason = reason; return error;
}

async function getContentConnectionTabOrThrow(tabId) { return requireContentConnectionManager().getContentConnectionTabOrThrow(tabId); }

function kleinanzeigenTabMeta(tab) { return requireContentConnectionManager().kleinanzeigenTabMeta(tab); }

function validKleinanzeigenTab(tab) {
  try { const url = new URL(tab?.url || ''); return url.protocol === 'https:' && /(^|\.)kleinanzeigen\.de$/i.test(url.hostname); } catch { return false; }
}

function contentBootstrapNeedsNavigationWait(tab) { return String(tab?.status || '') === 'loading'; }

async function waitForContentBootstrapNavigation(tabId, initialTab = null) { return requireContentConnectionManager().waitForContentBootstrapNavigation(tabId, initialTab); }

async function rethrowExpectedContentBootstrapCloseIfNeeded(tabId, started, phase) {
  const entry = await expectedControlledTabCloseEntry(tabId);
  if (!entry) return false;
  const goneReason = String(entry.expectedCloseReason || entry.goneReason || entry.closeIntentReason || 'workflow-close');
  await logDiagnostic('info', 'CONTENT_SCRIPT_BOOTSTRAP_EXPECTED_TAB_CLOSE', {
    tabId, phase: String(phase || 'bootstrap'), durationMs: Math.max(0, Date.now() - Number(started || Date.now())), goneReason, role: entry.role || null
  }, { module: 'background', operation: 'content-bootstrap', context: { tabId, ...(entry.owner || {}) } }).catch(() => {});
  throw expectedControlledTabCloseError(tabId, entry);
}

async function ensureContentConnection(message) { return requireContentConnectionManager().ensureContentConnection(message); }

async function normalBrowserWindowId() {
  const windows = await chrome.windows.getAll({ windowTypes: ['normal'] }).catch(() => []);
  const focused = windows.find(item => item.focused) || windows[0];
  return focused?.id ?? null;
}

async function openEditAd(message) {
  const adId = String(message?.adId || '');
  if (!/^\d+$/.test(adId)) throw new Error('Anzeigen-ID ist ungültig.');
  const url = `https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=${encodeURIComponent(adId)}`;
  const windowId = await normalBrowserWindowId();
  const tab = await createAutomationTab({ ...(windowId ? { windowId } : {}), url, active: true });
  if (!tab?.id) throw new Error('Bearbeiten-Tab konnte nicht geöffnet werden.');
  if (windowId) await chrome.windows.update(windowId, { focused: true }).catch(() => {});
  await logDiagnostic('info', 'EDIT_AD_OPENED', { adId, tabId: tab.id, windowId: tab.windowId ?? windowId }, { module: 'background', operation: 'open-edit-ad', context: { adId, tabId: tab.id } }).catch(() => {});
  return { adId, tabId: tab.id };
}

let publicListingEvidenceService = null;
function requirePublicListingEvidenceService() {
  if (!publicListingEvidenceService) {
    publicListingEvidenceService = PublicListingEvidenceService.create({
      URL, chromeTabs: chrome.tabs, delay, ensureContentConnection, sendTabRequestWithBootstrap,
      readOnlyMetadataTimeoutMs: READONLY_METADATA_TIMEOUT_MS
    });
  }
  return publicListingEvidenceService;
}

function normalizeKnownPublicAdUrl(rawUrl, expectedAdId) { return requirePublicListingEvidenceService().normalizeKnownPublicAdUrl(rawUrl, expectedAdId); }

async function openReadOnlyAd(message) {
  const adId = String(message?.adId || '');
  if (!/^\d+$/.test(adId)) throw new Error('Anzeigen-ID ist ungültig.');

  let url = '';
  let urlSource = 'id-fallback';
  const inventoryId = String(message?.inventoryId || '');
  const inventoryRecord = inventoryId ? await getInventory(inventoryId).catch(() => null) : null;
  if (inventoryRecord && String(inventoryRecord?.adId || '') === adId) {
    url = normalizeKnownPublicAdUrl(publicUrlForInventoryRecord(inventoryRecord), adId);
    if (url) urlSource = 'inventory-public-url';
  }
  if (!url) {
    url = normalizeKnownPublicAdUrl(message?.publicUrl, adId);
    if (url) urlSource = 'message-public-url';
  }
  if (!url) url = directPublicUrlForAdId(adId);

  const windowId = await normalBrowserWindowId();
  const tab = await createAutomationTab({ ...(windowId ? { windowId } : {}), url, active: true });
  if (!tab?.id) throw new Error('Die öffentliche Anzeige konnte nicht geöffnet werden.');
  if (windowId) await chrome.windows.update(windowId, { focused: true }).catch(() => {});
  await logDiagnostic('info', 'READONLY_AD_OPENED', {
    adId, inventoryId: inventoryId || null, tabId: tab.id, windowId: tab.windowId ?? windowId,
    requestedUrl: url, urlSource
  }, { module: 'background', operation: 'open-readonly-ad', context: { adId, tabId: tab.id } }).catch(() => {});

  let finalTab = null;
  try {
    finalTab = await waitForTabComplete(tab.id, {
      timeoutMs: 12000,
      purpose: 'read-only-navigation',
      label: 'Öffentliche Anzeige',
      operation: 'open-readonly-ad',
      context: { adId, tabId: tab.id }
    });
  } catch (error) {
    finalTab = await chrome.tabs.get(tab.id).catch(() => null);
    await logDiagnostic('info', 'READONLY_AD_NAVIGATION_PENDING', {
      adId, tabId: tab.id, requestedUrl: url, urlSource,
      currentUrl: String(finalTab?.url || '').slice(0, 1200),
      message: String(error?.message || error || '').slice(0, 500)
    }, { module: 'background', operation: 'open-readonly-ad', context: { adId, tabId: tab.id } }).catch(() => {});
  }
  if (finalTab?.url) {
    const finalUrl = String(finalTab.url);
    const finalPublicUrl = normalizeKnownPublicAdUrl(finalUrl, adId);
    await logDiagnostic(finalPublicUrl ? 'info' : 'warning', 'READONLY_AD_NAVIGATION_RESOLVED', {
      adId, tabId: tab.id, requestedUrl: url, urlSource, finalUrl: finalUrl.slice(0, 1200),
      expectedAdConfirmed: Boolean(finalPublicUrl)
    }, { module: 'background', operation: 'open-readonly-ad', context: { adId, tabId: tab.id } }).catch(() => {});
  }
  return { adId, tabId: tab.id, url, urlSource, finalUrl: finalTab?.url || null };
}

let tabLoadCoordinator = null;
function requireTabLoadCoordinator() {
  if (tabLoadCoordinator) return tabLoadCoordinator;
  if (!TabLoadCoordinator?.create) throw new Error('tab-load-coordinator.js must load before tab readiness is used');
  tabLoadCoordinator = TabLoadCoordinator.create({
    safetyPollMs: TAB_LOAD_SAFETY_POLL_MS,
    assertPlatformAccessAllowed,
    getTabOrThrow: (tabId, { label } = {}) => tabRegistry.getTabOrThrow(tabId, chrome.tabs, { label }),
    getTab: tabId => chrome.tabs.get(tabId),
    logDiagnostic,
    tabMeta: kleinanzeigenTabMeta,
    assessNavigation: (tab, expectedUrl) => ManagedNavigation.assess(tab, expectedUrl),
    readyState: ManagedNavigation.STATES.READY,
    offTargetState: ManagedNavigation.STATES.OFF_TARGET
  });
  return tabLoadCoordinator;
}

// Tab-readiness facade: background.js retains orchestration call sites while
// waiter/version state and event-driven navigation coordination live in tab-load-coordinator.js.
function tabLoadSignalVersion(tabId) { return requireTabLoadCoordinator().signalVersion(tabId); }
function notifyTabLoadWaiters(tabId, signal = {}) { return requireTabLoadCoordinator().notify(tabId, signal); }
function notifyAllTabLoadWaiters(signal = {}) { return requireTabLoadCoordinator().notifyAll(signal); }
function waitForTabLoadSignal(tabId, afterVersion, timeoutMs) { return requireTabLoadCoordinator().waitForSignal(tabId, afterVersion, timeoutMs); }
async function waitForTabComplete(tabId, timeoutOrOptions = TAB_LOAD_TIMEOUT_DEFAULT_MS) {
  return requireTabLoadCoordinator().waitForComplete(tabId, timeoutOrOptions);
}
async function waitForExpectedTabComplete(tabId, expectedUrl, timeoutOrOptions = TAB_LOAD_TIMEOUT_DEFAULT_MS) {
  return requireTabLoadCoordinator().waitForExpectedComplete(tabId, expectedUrl, timeoutOrOptions);
}

function slugifyListingTitle(value) { return requirePublicListingEvidenceService().slugifyListingTitle(value); }

function publicUrlForInventoryRecord(record) { return requirePublicListingEvidenceService().publicUrlForInventoryRecord(record); }

function directPublicUrlForAdId(adId) { return requirePublicListingEvidenceService().directPublicUrlForAdId(adId); }


function publicAvailabilityPending(record) { return requirePublicListingEvidenceService().publicAvailabilityPending(record); }

function publicAvailabilitySnapshot(options = {}) { return requirePublicListingEvidenceService().publicAvailabilitySnapshot(options); }

function singleInventorySourceFromUrl(rawUrl) {
  try {
    const url = new URL(String(rawUrl || ''));
    if (url.protocol !== 'https:' || !/^(?:www\.)?kleinanzeigen\.de$/i.test(url.hostname)) return null;
    if (/\/p-anzeige-bearbeiten\.html$/i.test(url.pathname)) {
      const adId = String(url.searchParams.get('adId') || '');
      return /^\d+$/.test(adId) ? { adId, mode: 'edit', publicUrl: '' } : null;
    }
    const publicMatch = url.pathname.match(/\/s-anzeige\/[^/]+\/(\d+)-\d+-\d+(?:\/)?$/i);
    if (publicMatch) return { adId: publicMatch[1], mode: 'public', publicUrl: `${url.origin}${url.pathname}` };
  } catch { /* invalid URL */ }
  return null;
}

async function extractSingleInventoryEdit(tabId, adId, correlation = {}, { ownedWorker = false } = {}) {
  const id = Number(tabId || 0);
  if (!id || !/^\d+$/.test(String(adId || ''))) throw new Error('Bearbeiten-Quelle für die Einzelinventur ist ungültig.');
  const deadline = Date.now() + BULK_RETRY_TIMEOUT_MS;
  let lastReason = '';
  while (Date.now() < deadline) {
    try {
      const tab = await tabRegistry.getTabOrThrow(id, chrome.tabs, { label: ownedWorker ? 'Einzelinventur-Bearbeiten-Worker' : 'Geöffnete Bearbeiten-Ansicht' });
      const navigation = classifyBulkEditWorkerNavigation(tab, adId);
      if (navigation.state === 'terminal') throw new Error(navigation.reason);
      if (navigation.state !== 'ready') {
        lastReason = navigation.reason || 'Bearbeiten-Ansicht wird noch geladen.';
      } else {
        await ensureContentConnection({ tabId: id });
        const extracted = await sendTabRequestWithBootstrap(id, { type: 'EXTRACT_CURRENT_AD' });
        if (String(extracted?.adId || '') === String(adId)) return extracted;
        lastReason = `Bearbeiten-Ansicht ${extracted?.adId || 'unbekannt'} entspricht nicht ${adId}.`;
      }
    } catch (error) {
      if (TabRegistry.isGoneError(error)) throw error;
      lastReason = String(error?.message || error).slice(0, 500);
    }
    await delay(BULK_RETRY_POLL_MS);
  }
  throw new Error(lastReason || 'Die Bearbeiten-Ansicht wurde nicht rechtzeitig vollständig inventarisierbar.');
}

function detectPublishedAdFromKnownUrl(rawUrl, sourceAdId = '') {
  try {
    const url = new URL(String(rawUrl || ''));
    if (!/(^|\.)kleinanzeigen\.de$/i.test(url.hostname)) return null;
    let adId = '';
    let publicUrl = '';
    let kind = '';
    const publicMatch = url.pathname.match(/\/s-anzeige\/[^/]+\/(\d+)-\d+-\d+(?:\/)?$/i);
    if (publicMatch) {
      adId = publicMatch[1];
      publicUrl = `${url.origin}${url.pathname}`;
      kind = 'public';
    } else if (/\/p-anzeige-bearbeiten\.html$/i.test(url.pathname)) {
      adId = String(url.searchParams.get('adId') || '');
      kind = 'edit';
    } else if (/\/p-anzeige-aufgeben-bestaetigung\.html$/i.test(url.pathname)) {
      adId = String(url.searchParams.get('addId') || url.searchParams.get('adId') || '');
      kind = 'confirmation';
    }
    if (!/^\d+$/.test(adId) || adId === String(sourceAdId || '')) return null;
    return { adId, publicUrl: publicUrl || null, candidateCount: 1, kind, detectionSource: 'tab-url' };
  } catch {
    return null;
  }
}

async function detectPublishedAdForFill(tabId, sourceAdId) {
  const tab = await chrome.tabs.get(Number(tabId)).catch(() => null);
  const direct = detectPublishedAdFromKnownUrl(tab?.url || '', sourceAdId);
  if (direct?.adId) return direct;
  await ensureContentConnection({ tabId: Number(tabId) });
  const detected = await sendTabRequestWithBootstrap(Number(tabId), { type: 'DETECT_PUBLISHED_AD', sourceAdId });
  return detected?.adId ? { ...detected, detectionSource: detected.detectionSource || 'content' } : null;
}

async function waitForRenewalPublicAdComplete(tabId, expectedAdId, options = {}) {
  const timeoutMs = Math.max(1000, Number(options.timeoutMs || TAB_LOAD_TIMEOUT_RENEWAL_MS));
  const purpose = String(options.purpose || 'renewal-public-verification').slice(0, 80);
  const label = String(options.label || 'Öffentlicher Renewal-Prüftab').slice(0, 120);
  const operation = String(options.operation || 'renewal-public-verification').slice(0, 80);
  const context = options.context && typeof options.context === 'object' ? options.context : { tabId };
  const started = Date.now();
  const deadline = started + timeoutMs;
  let lastAssessment = null;
  while (Date.now() < deadline) {
    await assertPlatformAccessAllowed({ operation, context });
    const observedVersion = tabLoadSignalVersion(tabId);
    const tab = await tabRegistry.getTabOrThrow(tabId, chrome.tabs, { label });
    const assessment = ManagedNavigation.assessPublicAd(tab, expectedAdId);
    lastAssessment = assessment;
    if (assessment.state === ManagedNavigation.STATES.READY) {
      await logDiagnostic('info', 'RENEWAL_PUBLIC_TARGET_LOAD_TIMING', {
        tabId,
        expectedAdId: String(expectedAdId || ''),
        observedAdId: assessment.observedAdId || null,
        purpose,
        durationMs: Date.now() - started,
        timeoutMs,
        navigationReason: assessment.reason,
        ...kleinanzeigenTabMeta(tab)
      }, { module: 'background', operation, context }).catch(() => {});
      return tab;
    }
    if (assessment.state === ManagedNavigation.STATES.OFF_TARGET) {
      const error = new Error(`${label} hat nicht die erwartete öffentliche Anzeige erreicht.`);
      error.code = 'KR_RENEWAL_PUBLIC_OFF_TARGET';
      error.verificationClass = 'off-target';
      error.navigationReason = assessment.reason;
      error.currentUrl = assessment.currentUrl || assessment.pendingUrl || '';
      error.observedAdId = assessment.observedAdId || '';
      await logDiagnostic('warning', 'RENEWAL_PUBLIC_TARGET_OFF_TARGET', {
        tabId,
        expectedAdId: String(expectedAdId || ''),
        observedAdId: error.observedAdId || null,
        purpose,
        durationMs: Date.now() - started,
        navigationReason: assessment.reason,
        currentUrl: String(error.currentUrl || '').slice(0, 1200),
        ...kleinanzeigenTabMeta(tab)
      }, { module: 'background', operation, context }).catch(() => {});
      throw error;
    }
    const remainingMs = Math.max(1, deadline - Date.now());
    await waitForTabLoadSignal(tabId, observedVersion, Math.min(TAB_LOAD_SAFETY_POLL_MS, remainingMs));
  }
  const lastTab = await chrome.tabs.get(tabId).catch(() => null);
  const error = new Error(`${label} wurde nicht rechtzeitig auf der erwarteten öffentlichen Anzeige vollständig geladen.`);
  error.code = 'KR_RENEWAL_PUBLIC_TIMEOUT';
  error.verificationClass = 'temporarily-unavailable';
  error.navigationReason = lastAssessment?.reason || 'timeout';
  error.currentUrl = String(lastTab?.url || '');
  await logDiagnostic('warning', 'RENEWAL_PUBLIC_TARGET_TIMEOUT', {
    tabId,
    expectedAdId: String(expectedAdId || ''),
    purpose,
    durationMs: Date.now() - started,
    timeoutMs,
    navigationReason: error.navigationReason,
    ...(lastTab ? kleinanzeigenTabMeta(lastTab) : {})
  }, { module: 'background', operation, context }).catch(() => {});
  throw error;
}

function renewalVerificationAttemptNumber(correlation = {}) {
  return Math.max(1, Number(renewalAttemptState(correlation, 3).attempt || 1));
}

function classifyRenewalVerificationFailure(error) {
  if (isNonRetryableRenewalSafetyError(error)) return 'platform-restricted';
  const code = String(error?.code || '');
  if (code === 'KR_RENEWAL_PUBLIC_OFF_TARGET' || code === 'KR_TAB_NAVIGATION_OFF_TARGET') return 'off-target';
  if (code === 'KR_RENEWAL_PUBLIC_TIMEOUT' || code === 'KR_TAB_NAVIGATION_TIMEOUT') return 'temporarily-unavailable';
  const text = String(error?.message || error || '');
  if (/Navigation rejected|No tab with id|Receiving end does not exist|Could not establish connection|message port closed|message channel closed/i.test(text)) return 'transient-navigation-failure';
  return String(error?.verificationClass || 'temporarily-unavailable');
}

async function createFreshRenewalVerificationTab(targetUrl, newAdId, publicUrlVariant, correlation = {}, { purpose = 'public' } = {}) {
  const requestedUrl = String(targetUrl || '');
  if (!requestedUrl) throw new Error('Ziel-URL der Renewal-Verifikation fehlt.');
  const verificationAttempt = renewalVerificationAttemptNumber(correlation);
  const windowId = await normalBrowserWindowId();
  const tab = await createAutomationTab({ ...(windowId ? { windowId } : {}), url: 'about:blank', active: false });
  if (!tab?.id) throw new Error('Frischer Renewal-Verifikationstab konnte nicht geöffnet werden.');
  const owner = {
    ...correlationContext(correlation),
    ownerType: purpose === 'public' ? 'renewal-public-verification' : 'renewal-my-ads-verification',
    ownerId: correlation?.renewalId || correlation?.operationId || newAdId,
    adId: String(newAdId || ''),
    verificationAttempt,
    publicUrlVariant: String(publicUrlVariant || purpose)
  };
  await registerManagedWorkerTab(tab.id, purpose === 'public' ? 'renewal-public-verification' : 'renewal-my-ads-verification', owner);
  await logDiagnostic('info', 'RENEWAL_VERIFICATION_TAB_CREATED', {
    newAdId: String(newAdId || ''),
    workerTabId: tab.id,
    verificationAttempt,
    purpose,
    publicUrlVariant: String(publicUrlVariant || purpose),
    requestedUrl,
    freshTab: true,
    initialUrl: 'about:blank'
  }, { module: 'background', operation: 'renewal-verification-navigation', context: sessionCorrelationContext(correlation, { adId: String(newAdId || ''), workerTabId: tab.id }) }).catch(() => {});
  try {
    await updateAutomationTab(tab.id, { url: requestedUrl });
    await logDiagnostic('info', 'RENEWAL_VERIFICATION_NAVIGATION_REQUESTED', {
      newAdId: String(newAdId || ''),
      workerTabId: tab.id,
      verificationAttempt,
      purpose,
      publicUrlVariant: String(publicUrlVariant || purpose),
      requestedUrl,
      freshTab: true
    }, { module: 'background', operation: 'renewal-verification-navigation', context: sessionCorrelationContext(correlation, { adId: String(newAdId || ''), workerTabId: tab.id }) }).catch(() => {});
    return { tabId: tab.id, requestedUrl, verificationAttempt, purpose, publicUrlVariant: String(publicUrlVariant || purpose) };
  } catch (error) {
    const verificationClass = classifyRenewalVerificationFailure(error);
    await logDiagnostic(isNonRetryableRenewalSafetyError(error) ? 'error' : 'warning', 'RENEWAL_VERIFICATION_NAVIGATION_REJECTED', {
      newAdId: String(newAdId || ''),
      workerTabId: tab.id,
      verificationAttempt,
      purpose,
      publicUrlVariant: String(publicUrlVariant || purpose),
      requestedUrl,
      freshTab: true,
      verificationClass,
      message: String(error?.message || error || '').slice(0, 500)
    }, { module: 'background', operation: 'renewal-verification-navigation', context: sessionCorrelationContext(correlation, { adId: String(newAdId || ''), workerTabId: tab.id }) }).catch(() => {});
    error.verificationClass = verificationClass;
    await closeFreshRenewalVerificationTab({
      tabId: tab.id,
      verificationAttempt,
      purpose,
      publicUrlVariant: String(publicUrlVariant || purpose)
    }, newAdId, correlation, isNonRetryableRenewalSafetyError(error) ? 'navigation-safety-stop' : 'navigation-request-failed').catch(() => {});
    throw error;
  }
}

async function closeFreshRenewalVerificationTab(tabInfo, newAdId, correlation = {}, reason = 'verification-finished') {
  const tabId = Number(tabInfo?.tabId || 0);
  if (!tabId) return;
  await logDiagnostic('info', 'RENEWAL_VERIFICATION_TAB_CLOSED', {
    newAdId: String(newAdId || ''),
    workerTabId: tabId,
    verificationAttempt: tabInfo?.verificationAttempt ?? renewalVerificationAttemptNumber(correlation),
    purpose: tabInfo?.purpose || null,
    publicUrlVariant: tabInfo?.publicUrlVariant || null,
    freshTab: true,
    reason
  }, { module: 'background', operation: 'renewal-verification-navigation', context: sessionCorrelationContext(correlation, { adId: String(newAdId || ''), workerTabId: tabId }) }).catch(() => {});
  await closeManagedWorkerTab(tabId).catch(() => {});
}

async function waitForRenewalPublicReadOnlyReady(tabId, expectedAdId, timeoutMs = RENEWAL_PUBLIC_READONLY_READINESS_TIMEOUT_MS, correlation = {}) {
  const started = Date.now();
  const effectiveTimeoutMs = Math.max(READONLY_METADATA_TIMEOUT_MS, Number(timeoutMs || RENEWAL_PUBLIC_READONLY_READINESS_TIMEOUT_MS));
  const context = sessionCorrelationContext(correlation, { adId: String(expectedAdId || ''), workerTabId: Number(tabId || 0) || null });
  const result = await extractReadOnlyMetadata(tabId, expectedAdId, effectiveTimeoutMs, { silentFailures: true });
  if (result.ok) {
    await logDiagnostic('info', 'RENEWAL_PUBLIC_READONLY_READY', {
      newAdId: String(expectedAdId || ''),
      workerTabId: Number(tabId || 0) || null,
      durationMs: result.durationMs ?? (Date.now() - started),
      timeoutMs: effectiveTimeoutMs,
      sameFreshTab: true
    }, { module: 'background', operation: 'renewal-public-verification', context }).catch(() => {});
    return result;
  }
  await logDiagnostic('warning', 'RENEWAL_PUBLIC_READONLY_TIMEOUT', {
    newAdId: String(expectedAdId || ''),
    workerTabId: Number(tabId || 0) || null,
    durationMs: result.durationMs ?? (Date.now() - started),
    timeoutMs: effectiveTimeoutMs,
    sameFreshTab: true,
    message: String(result.error || 'Read-only-Metadaten wurden nicht rechtzeitig erkannt.').slice(0, 500)
  }, { module: 'background', operation: 'renewal-public-verification', context }).catch(() => {});
  return result;
}

async function probeFreshRenewalPublicUrl(url, expectedAdId, publicUrlVariant, timeoutMs = READONLY_METADATA_TIMEOUT_MS, correlation = {}) {
  let tabInfo = null;
  try {
    tabInfo = await createFreshRenewalVerificationTab(url, expectedAdId, publicUrlVariant, correlation, { purpose: 'public' });
    const context = sessionCorrelationContext(correlation, { adId: String(expectedAdId || ''), workerTabId: tabInfo.tabId });
    await waitForRenewalPublicAdComplete(tabInfo.tabId, expectedAdId, {
      timeoutMs: TAB_LOAD_TIMEOUT_RENEWAL_MS,
      purpose: `renewal-public-${publicUrlVariant}`,
      label: 'Öffentlicher Renewal-Prüftab',
      operation: 'renewal-public-verification',
      context
    });
    await ensureContentConnection({ tabId: tabInfo.tabId });
    const result = await waitForRenewalPublicReadOnlyReady(tabInfo.tabId, expectedAdId, Math.max(timeoutMs, RENEWAL_PUBLIC_READONLY_READINESS_TIMEOUT_MS), correlation);
    const finalTab = await chrome.tabs.get(tabInfo.tabId).catch(() => null);
    const finalAssessment = ManagedNavigation.assessPublicAd(finalTab || {}, expectedAdId);
    if (!result.ok || finalAssessment.state !== ManagedNavigation.STATES.READY) {
      const verificationClass = finalAssessment.state === ManagedNavigation.STATES.OFF_TARGET ? 'off-target' : 'temporarily-unavailable';
      const failure = {
        ...result,
        ok: false,
        requestedUrl: String(url),
        finalUrl: String(finalTab?.url || ''),
        observedAdId: finalAssessment.observedAdId || null,
        verificationClass,
        publicUrlVariant,
        workerTabId: tabInfo.tabId,
        freshTab: true
      };
      await logDiagnostic('warning', 'RENEWAL_PUBLIC_VERIFICATION_UNRESOLVED', {
        newAdId: String(expectedAdId || ''),
        workerTabId: tabInfo.tabId,
        verificationAttempt: tabInfo.verificationAttempt,
        publicUrlVariant,
        requestedUrl: String(url),
        finalUrl: failure.finalUrl,
        observedAdId: failure.observedAdId,
        verificationClass,
        message: String(result.error || 'Read-only-Metadaten wurden nicht eindeutig bestätigt.').slice(0, 500),
        freshTab: true
      }, { module: 'background', operation: 'renewal-public-verification', context }).catch(() => {});
      return failure;
    }
    const resolvedUrl = normalizeKnownPublicAdUrl(result.metadata?.sourceUrl || finalTab?.url || '', expectedAdId) || '';
    const verified = {
      ...result,
      ok: true,
      requestedUrl: String(url),
      finalUrl: String(finalTab?.url || ''),
      observedAdId: finalAssessment.observedAdId || String(expectedAdId),
      verificationClass: 'confirmed',
      publicUrlVariant,
      workerTabId: tabInfo.tabId,
      freshTab: true,
      resolvedUrl
    };
    await logDiagnostic('info', 'RENEWAL_PUBLIC_VERIFICATION_CONFIRMED', {
      newAdId: String(expectedAdId || ''),
      workerTabId: tabInfo.tabId,
      verificationAttempt: tabInfo.verificationAttempt,
      publicUrlVariant,
      requestedUrl: String(url),
      finalUrl: verified.finalUrl,
      resolvedUrl: resolvedUrl || null,
      observedAdId: verified.observedAdId,
      durationMs: result.durationMs ?? null,
      freshTab: true
    }, { module: 'background', operation: 'renewal-public-verification', context }).catch(() => {});
    return verified;
  } catch (error) {
    if (isNonRetryableRenewalSafetyError(error)) throw error;
    const verificationClass = classifyRenewalVerificationFailure(error);
    const finalTab = tabInfo?.tabId ? await chrome.tabs.get(tabInfo.tabId).catch(() => null) : null;
    await logDiagnostic('warning', 'RENEWAL_PUBLIC_VERIFICATION_FAILED', {
      newAdId: String(expectedAdId || ''),
      workerTabId: tabInfo?.tabId || null,
      verificationAttempt: tabInfo?.verificationAttempt || renewalVerificationAttemptNumber(correlation),
      publicUrlVariant,
      requestedUrl: String(url),
      finalUrl: String(finalTab?.url || ''),
      verificationClass,
      message: String(error?.message || error || '').slice(0, 500),
      freshTab: true
    }, { module: 'background', operation: 'renewal-public-verification', context: sessionCorrelationContext(correlation, { adId: String(expectedAdId || ''), workerTabId: tabInfo?.tabId || null }) }).catch(() => {});
    return {
      ok: false,
      metadata: null,
      durationMs: 0,
      requestedUrl: String(url),
      finalUrl: String(finalTab?.url || ''),
      error: String(error?.message || error || '').slice(0, 500),
      verificationClass,
      publicUrlVariant,
      workerTabId: tabInfo?.tabId || null,
      freshTab: true
    };
  } finally {
    if (tabInfo?.tabId) await closeFreshRenewalVerificationTab(tabInfo, expectedAdId, correlation, 'public-verification-finished');
  }
}

async function findRenewalAdInMyAdsFresh(adId, expectedProfileName, correlation = {}) {
  let tabInfo = null;
  try {
    tabInfo = await createFreshRenewalVerificationTab(MY_ADS_PROJECTS_URL, adId, 'my-ads', correlation, { purpose: 'my-ads' });
    const context = sessionCorrelationContext(correlation, { adId: String(adId || ''), workerTabId: tabInfo.tabId });
    await waitForExpectedTabComplete(tabInfo.tabId, MY_ADS_PROJECTS_URL, {
      timeoutMs: TAB_LOAD_TIMEOUT_RENEWAL_MS,
      purpose: 'renewal-my-ads-fresh',
      label: 'Frischer „Meine Anzeigen“-Prüftab',
      operation: 'renewal-my-ads-fallback',
      context
    });
    await ensureContentConnection({ tabId: tabInfo.tabId });
    const status = await sendTabRequestWithBootstrap(tabInfo.tabId, { type: 'MY_ADS_STATUS' });
    if (!status?.isMyAdsPage || !status?.isProjectsTab) throw new Error('„Meine Anzeigen“-Fallback befindet sich nicht eindeutig im PROJECTS-Tab.');
    const expectedProfile = normalizeProfileName(expectedProfileName || '');
    const actualProfile = normalizeProfileName(status?.profileName || '');
    if (expectedProfile) {
      if (!actualProfile) throw new Error('Das Kleinanzeigen-Konto konnte beim „Meine Anzeigen“-Fallback nicht eindeutig erkannt werden.');
      if (expectedProfile.toLocaleLowerCase('de-DE') !== actualProfile.toLocaleLowerCase('de-DE')) {
        throw new Error('Der „Meine Anzeigen“-Fallback ist mit einem anderen Kleinanzeigen-Konto angemeldet.');
      }
    }
    const result = await sendTabRequestWithBootstrap(tabInfo.tabId, { type: 'FIND_OWN_AD_BY_ID', adId: String(adId), correlation: correlationContext(correlation) });
    await logDiagnostic(result?.found ? 'info' : 'warning', result?.found ? 'RENEWAL_MY_ADS_FRESH_FOUND' : 'RENEWAL_MY_ADS_FRESH_NOT_FOUND', {
      newAdId: String(adId || ''),
      workerTabId: tabInfo.tabId,
      verificationAttempt: tabInfo.verificationAttempt,
      found: Boolean(result?.found),
      page: result?.page ?? null,
      pagesScanned: result?.pagesScanned ?? null,
      publicUrl: result?.publicUrl || null,
      freshTab: true
    }, { module: 'background', operation: 'renewal-my-ads-fallback', context }).catch(() => {});
    return { ...result, profileName: actualProfile || null, workerTabId: tabInfo.tabId, freshTab: true };
  } finally {
    if (tabInfo?.tabId) await closeFreshRenewalVerificationTab(tabInfo, adId, correlation, 'my-ads-verification-finished');
  }
}

function renewalEvidenceFailureClass(results = []) {
  const classes = results.map(item => String(item?.verificationClass || '')).filter(Boolean);
  if (classes.includes('transient-navigation-failure')) return 'transient-navigation-failure';
  if (classes.includes('off-target')) return 'off-target';
  return 'temporarily-unavailable';
}

async function resolveRenewalPublicEvidence(newAdId, expectedProfileName, correlation = {}) {
  const knownPublicUrl = String(correlation?.newPublicUrl || '');
  const canonicalKnownUrl = normalizeKnownPublicAdUrl(knownPublicUrl, newAdId);
  const directIdUrl = directPublicUrlForAdId(newAdId);
  const attempts = [];

  if (canonicalKnownUrl) {
    const canonical = await probeFreshRenewalPublicUrl(canonicalKnownUrl, newAdId, 'canonical', RENEWAL_DIRECT_READONLY_TIMEOUT_MS, correlation);
    attempts.push(canonical);
    if (canonical.ok) {
      return { readOnlyResult: canonical, publicUrl: canonical.resolvedUrl || canonicalKnownUrl, ownAdsPresence: null, myAds: null, method: 'canonical-fresh', verificationClass: 'confirmed', publicAttempts: attempts };
    }
  }

  if (directIdUrl) {
    const idDirect = await probeFreshRenewalPublicUrl(directIdUrl, newAdId, 'id-direct', READONLY_METADATA_TIMEOUT_MS, correlation);
    attempts.push(idDirect);
    if (idDirect.ok) {
      return { readOnlyResult: idDirect, publicUrl: idDirect.resolvedUrl || canonicalKnownUrl || '', ownAdsPresence: null, myAds: null, method: 'id-direct-fresh', verificationClass: 'confirmed', publicAttempts: attempts };
    }
  }

  let myAds = null;
  try {
    myAds = await findRenewalAdInMyAdsFresh(newAdId, expectedProfileName, correlation);
  } catch (error) {
    if (isNonRetryableRenewalSafetyError(error)) throw error;
    const verificationClass = classifyRenewalVerificationFailure(error);
    await logDiagnostic('warning', 'RENEWAL_MY_ADS_FRESH_FAILED', {
      newAdId,
      verificationAttempt: renewalVerificationAttemptNumber(correlation),
      verificationClass,
      message: String(error?.message || error || '').slice(0, 500),
      freshTab: true
    }, { module: 'background', operation: 'renewal-my-ads-fallback', context: sessionCorrelationContext(correlation, { adId: newAdId }) }).catch(() => {});
    const fallbackResult = attempts.at(-1) || { ok: false, metadata: null, durationMs: 0, error: String(error?.message || error || '') };
    return {
      readOnlyResult: fallbackResult,
      publicUrl: canonicalKnownUrl || '',
      ownAdsPresence: null,
      myAds: { found: null, error: String(error?.message || error || '').slice(0, 500) },
      method: 'fresh-public+my-ads-error',
      verificationClass: verificationClass === 'platform-restricted' ? verificationClass : renewalEvidenceFailureClass([...attempts, { verificationClass }]),
      publicAttempts: attempts
    };
  }

  const myAdsPublicUrl = normalizeKnownPublicAdUrl(myAds?.publicUrl || '', newAdId);
  if (myAds?.found && myAdsPublicUrl && myAdsPublicUrl !== canonicalKnownUrl) {
    const myAdsCanonical = await probeFreshRenewalPublicUrl(myAdsPublicUrl, newAdId, 'my-ads-canonical', READONLY_METADATA_TIMEOUT_MS, correlation);
    attempts.push(myAdsCanonical);
    if (myAdsCanonical.ok) {
      return { readOnlyResult: myAdsCanonical, publicUrl: myAdsCanonical.resolvedUrl || myAdsPublicUrl, ownAdsPresence: true, myAds, method: 'my-ads-canonical-fresh', verificationClass: 'confirmed', publicAttempts: attempts };
    }
  }

  const verificationClass = renewalEvidenceFailureClass(attempts);
  const lastPublic = attempts.at(-1) || { ok: false, metadata: null, durationMs: 0, error: 'Öffentliche Verifikation lieferte kein eindeutiges Ergebnis.', verificationClass };
  await logDiagnostic('warning', 'RENEWAL_PUBLIC_EVIDENCE_UNRESOLVED', {
    newAdId,
    verificationAttempt: renewalVerificationAttemptNumber(correlation),
    verificationClass,
    ownAdsPresence: myAds?.found === true ? true : (myAds?.found === false ? false : null),
    myAdsPage: myAds?.page ?? null,
    publicAttemptCount: attempts.length,
    publicUrlVariants: attempts.map(item => item.publicUrlVariant).filter(Boolean),
    freshTabsOnly: attempts.every(item => item.freshTab === true)
  }, { module: 'background', operation: 'renewal-public-verification', context: sessionCorrelationContext(correlation, { adId: newAdId }) }).catch(() => {});
  return {
    readOnlyResult: lastPublic,
    publicUrl: myAdsPublicUrl || canonicalKnownUrl || '',
    ownAdsPresence: myAds?.found === true ? true : (myAds?.found === false ? false : null),
    myAds,
    method: myAds?.found ? 'my-ads-found-public-unresolved' : 'public-unresolved',
    verificationClass,
    publicAttempts: attempts
  };
}


async function extractReadOnlyMetadata(tabId, expectedAdId, timeoutMs = READONLY_METADATA_TIMEOUT_MS, options = {}) { return requirePublicListingEvidenceService().extractReadOnlyMetadata(tabId, expectedAdId, timeoutMs, options); }

function normalizedCalendarParts(isoValue = '', displayValue = '') { return requirePublicListingEvidenceService().normalizedCalendarParts(isoValue, displayValue); }

function deriveListingDateFromEndDate(endDateIso = '', endDateDisplay = '', days = 60) { return requirePublicListingEvidenceService().deriveListingDateFromEndDate(endDateIso, endDateDisplay, days); }

function mergeListingMetadata(extracted, existingMeta = {}, readOnlyResult = null, fallback = {}) { return requirePublicListingEvidenceService().mergeListingMetadata(extracted, existingMeta, readOnlyResult, fallback); }

async function captureSingleInventory(message) { return requireSingleInventoryController().captureSingleInventory(message); }

async function checkInventoryOnlineStatus(message) {
  const inventoryId = String(message?.inventoryId || message?.adId || '');
  const existing = await getInventory(inventoryId);
  if (!existing) throw new Error('Lokaler Inventareintrag wurde nicht gefunden.');
  if (existing?.profileId) await assertSelectedProfileMatchesLiveAccount({ expectedProfileId: existing.profileId, expectedProfileName: existing.profileName || '', purpose: 'inventory-online-status' });
  const adId = String(existing.adId || message?.adId || '');
  if (!/^\d+$/.test(adId)) throw new Error('Inventareintrag besitzt keine gültige Anzeigen-ID.');
  if (!publicAvailabilityPending(existing)) return { online: true, pending: false, record: existing, alreadyResolved: true };
  const run = await getBulkRunState().catch(() => null);
  if (run?.status === 'running' || run?.retryAdId) throw new Error('Während einer laufenden Erfassung oder Wiederholung kann der Online-Status nicht geprüft werden.');

  const operationId = crypto.randomUUID();
  const canonicalUrl = normalizeKnownPublicAdUrl(publicUrlForInventoryRecord(existing), adId);
  const directUrl = directPublicUrlForAdId(adId);
  const attempts = [];
  let confirmed = null;
  await logDiagnostic('info', 'INVENTORY_ONLINE_STATUS_CHECK_STARTED', {
    operationId, inventoryId, adId, canonicalUrlAvailable: Boolean(canonicalUrl), directUrlAvailable: Boolean(directUrl)
  }, { module: 'background', operation: 'inventory-online-status', context: { operationId, adId } }).catch(() => {});

  if (canonicalUrl) {
    const canonical = await probeFreshRenewalPublicUrl(canonicalUrl, adId, 'canonical', RENEWAL_DIRECT_READONLY_TIMEOUT_MS, { operationId, adId });
    attempts.push(canonical);
    if (canonical.ok) confirmed = canonical;
  }
  if (!confirmed && directUrl) {
    const direct = await probeFreshRenewalPublicUrl(directUrl, adId, 'id-direct', READONLY_METADATA_TIMEOUT_MS, { operationId, adId });
    attempts.push(direct);
    if (direct.ok) confirmed = direct;
  }

  const checkedAt = new Date().toISOString();
  if (confirmed) {
    const resolvedUrl = normalizeKnownPublicAdUrl(confirmed.resolvedUrl || confirmed.metadata?.sourceUrl || canonicalUrl, adId) || canonicalUrl || '';
    existing.listingMeta = mergeListingMetadata(existing, existing.listingMeta || {}, confirmed, {
      publicUrl: resolvedUrl || null,
      source: 'online-status-check'
    });
    existing.listingMeta.publicAvailability = {
      ...publicAvailabilitySnapshot({
        online: true,
        verificationClass: 'confirmed',
        method: confirmed.publicUrlVariant || 'public-readonly',
        publicUrl: resolvedUrl || null,
        checkedAt
      }),
      status: 'online'
    };
    if (resolvedUrl) existing.publicUrl = resolvedUrl;
    await putInventoryRecordOnly(existing);
    await logDiagnostic('info', 'INVENTORY_ONLINE_STATUS_CONFIRMED', {
      operationId, inventoryId, adId, publicUrl: resolvedUrl || null, attemptCount: attempts.length,
      variants: attempts.map(item => item.publicUrlVariant).filter(Boolean)
    }, { module: 'background', operation: 'inventory-online-status', context: { operationId, adId } }).catch(() => {});
    broadcastInventoryChanged('inventory-online-status-confirmed', { inventoryId, adId });
    return { online: true, pending: false, record: existing };
  }

  const verificationClass = renewalEvidenceFailureClass(attempts);
  existing.listingMeta = {
    ...(existing.listingMeta || {}),
    publicAvailability: {
      ...publicAvailabilitySnapshot({
        online: false,
        verificationClass,
        method: attempts.at(-1)?.publicUrlVariant || null,
        publicUrl: canonicalUrl || null,
        checkedAt
      }),
      status: 'pending'
    }
  };
  await putInventoryRecordOnly(existing);
  await logDiagnostic('info', 'INVENTORY_ONLINE_STATUS_STILL_PENDING', {
    operationId, inventoryId, adId, verificationClass, attemptCount: attempts.length,
    variants: attempts.map(item => item.publicUrlVariant).filter(Boolean)
  }, { module: 'background', operation: 'inventory-online-status', context: { operationId, adId } }).catch(() => {});
  broadcastInventoryChanged('inventory-online-status-pending', { inventoryId, adId });
  return { online: false, pending: true, record: existing, verificationClass };
}

async function refreshInventoryRecord(message) {
  const inventoryId = String(message?.inventoryId || message?.adId || '');
  const existing = await getInventory(inventoryId);
  if (!existing) throw new Error('Lokaler Inventareintrag wurde nicht gefunden.');
  if (existing?.profileId) await assertSelectedProfileMatchesLiveAccount({ expectedProfileId: existing.profileId, expectedProfileName: existing.profileName || '', purpose: 'inventory-refresh' });
  const adId = String(existing.adId || message?.adId || '');
  if (!/^\d+$/.test(adId)) throw new Error('Inventareintrag besitzt keine gültige Anzeigen-ID.');
  const run = await getBulkRunState().catch(() => null);
  if (run?.status === 'running' || run?.retryAdId) throw new Error('Während einer laufenden Erfassung oder Wiederholung kann eine Anzeige nicht aktualisiert werden.');
  const renewals = await readRenewalSessions().catch(() => ({}));
  if (Object.values(renewals).some(item => !['cancelled', 'replaced'].includes(String(item?.status || '')) && String(item?.sourceInventoryId || '') === inventoryId)) {
    throw new Error('Die Quellanzeige ist während eines laufenden Renewal-Vorgangs gesperrt.');
  }

  let workerTabId = null;
  let metadataTabId = null;
  const publicUrl = publicUrlForInventoryRecord(existing);
  await logDiagnostic('info', 'INVENTORY_REFRESH_STARTED', { inventoryId, adId, readOnlyMetadataRequested: Boolean(publicUrl) }, { module: 'background', operation: 'inventory-refresh', context: { adId } }).catch(() => {});
  try {
    const windowId = await normalBrowserWindowId();
    const editPromise = createAutomationTab({ ...(windowId ? { windowId } : {}), url: `https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=${encodeURIComponent(adId)}`, active: false });
    const metadataPromise = publicUrl
      ? createAutomationTab({ ...(windowId ? { windowId } : {}), url: publicUrl, active: false })
      : Promise.resolve(null);
    const [editResult, metadataResult] = await Promise.allSettled([editPromise, metadataPromise]);
    if (editResult.status !== 'fulfilled' || !editResult.value?.id) throw new Error('Aktualisierungs-Worker konnte nicht geöffnet werden.');
    workerTabId = editResult.value.id;
    if (metadataResult.status === 'fulfilled' && metadataResult.value?.id) metadataTabId = metadataResult.value.id;

    await logDiagnostic('info', 'INVENTORY_REFRESH_WORKERS_OPENED', { adId, workerTabId, metadataTabId, parallel: true }, { module: 'background', operation: 'inventory-refresh', context: { adId, workerTabId, metadataTabId } }).catch(() => {});
    const readOnlyPromise = metadataTabId
      ? extractReadOnlyMetadata(metadataTabId, adId)
      : Promise.resolve({ ok: false, metadata: null, durationMs: 0, error: 'Keine öffentliche Detail-URL verfügbar.' });

    await waitForTabComplete(workerTabId, { timeoutMs: TAB_LOAD_TIMEOUT_RENEWAL_MS, purpose: 'inventory-refresh-edit', label: 'Aktualisierungs-Worker', operation: 'inventory-refresh', context: { adId, workerTabId } });
    await ensureContentConnection({ tabId: workerTabId });
    const deadline = Date.now() + BULK_RETRY_TIMEOUT_MS;
    let extracted = null;
    let lastReason = '';
    while (Date.now() < deadline) {
      try {
        extracted = await sendTabRequestWithBootstrap(workerTabId, { type: 'EXTRACT_CURRENT_AD' });
        if (String(extracted?.adId || '') === adId) break;
        lastReason = `Worker-Anzeige ${extracted?.adId || 'unbekannt'} entspricht nicht ${adId}.`;
        extracted = null;
      } catch (error) {
        lastReason = String(error.message || error).slice(0, 300);
      }
      await delay(BULK_RETRY_POLL_MS);
    }
    if (!extracted) throw new Error(lastReason || 'Anzeige wurde nicht rechtzeitig inventarisierbar.');

    const readOnlyResult = await readOnlyPromise;
    if (!readOnlyResult.ok) {
      await logDiagnostic('warning', 'INVENTORY_REFRESH_READONLY_UNAVAILABLE', { adId, durationMs: readOnlyResult.durationMs, message: readOnlyResult.error }, { module: 'background', operation: 'inventory-refresh-readonly', context: { adId, metadataTabId } }).catch(() => {});
    } else {
      await logDiagnostic('info', 'INVENTORY_REFRESH_READONLY_SUCCEEDED', { adId, durationMs: readOnlyResult.durationMs, hasEndDate: Boolean(readOnlyResult.metadata?.endDateDisplay), hasListingDate: Boolean(readOnlyResult.metadata?.listingDateDisplay) }, { module: 'background', operation: 'inventory-refresh-readonly', context: { adId, metadataTabId } }).catch(() => {});
    }
    extracted.profileId = existing.profileId || null;
    extracted.profileName = existing.profileName || null;
    if (existing?.renewal?.renewalId || String(existing?.recordKind || '').startsWith('renewal-')) {
      extracted.recordKind = existing.recordKind || 'renewal-candidate';
      extracted.renewal = existing.renewal ? { ...existing.renewal, updatedAt: new Date().toISOString() } : null;
    }
    extracted.listingMeta = mergeListingMetadata(extracted, existing.listingMeta || {}, readOnlyResult, {
      endDateDisplay: existing.listingMeta?.endDateDisplay || existing.endDateDisplay || null,
      endDateIso: existing.listingMeta?.endDateIso || null,
      publicUrl,
      source: 'manual-inventory-refresh'
    });
    let saved = await saveInventory(extracted, { inventoryIdOverride: inventoryId });
    if (existing?.renewal?.renewalId) {
      const sessions = await readRenewalSessions();
      const session = sessions[String(existing.renewal.renewalId)];
      if (session && String(session.skeletonInventoryId || '') === inventoryId) {
        const source = await getInventory(session.sourceInventoryId);
        if (!source) throw new Error('Quellinventar für die erneute Renewal-Verifikation wurde nicht gefunden.');
        const safeFullVerification = normalizeRenewalMode(session.renewalMode) === RENEWAL_MODE_SAFE;
        const comparison = await compareRenewalRecords(source, saved, {
          onlineConfirmed: readOnlyResult.ok,
          requirePublicAvailability: !safeFullVerification
        });
        session.comparison = comparison;
        const outcome = renewalOutcomeForComparison(comparison);
        session.status = outcome.status;
        session.stage = outcome.stage;
        if (safeFullVerification && comparison.status === 'match') {
          session.status = 'verified';
          session.stage = 'replacement-ready';
          session.publicAvailabilityPending = !readOnlyResult.ok;
          session.publicAvailability = publicAvailabilitySnapshot({
            online: Boolean(readOnlyResult.ok),
            verificationClass: readOnlyResult.ok ? 'confirmed' : 'temporarily-unavailable',
            method: readOnlyResult.ok ? 'manual-refresh-readonly' : null,
            publicUrl: publicUrl || null
          });
          saved.listingMeta = { ...(saved.listingMeta || {}), publicAvailability: { ...session.publicAvailability } };
          await putInventoryRecordOnly(saved);
        }
        session.verifiedAt = comparison.status === 'match' ? new Date().toISOString() : null;
        session.lastError = null;
        await persistRenewalSession(session);
        saved = await getInventory(inventoryId) || saved;
        await logDiagnostic(comparison.status === 'match' ? 'info' : 'warning', 'RENEWAL_REFRESH_REVERIFIED', {
          renewalId: session.renewalId, sourceAdId: session.sourceAdId, newAdId: session.newAdId, status: comparison.status, mismatchCount: comparison.mismatches.length, uncertaintyCount: comparison.uncertainties.length
        }, { module: 'background', operation: 'renewal-refresh-verify', context: sessionCorrelationContext(session, { renewalId: session.renewalId, adId }) }).catch(() => {});
      }
    }
    await closeRegistryTabs([workerTabId, metadataTabId], 'inventory-refresh-worker-finished', 'Aktualisierungs-Worker');
    workerTabId = null;
    metadataTabId = null;
    await logDiagnostic('info', 'INVENTORY_REFRESH_SUCCEEDED', { inventoryId: saved.inventoryId, adId, imageCount: saved.imageSummary?.discovered || 0, readOnlyMetadata: readOnlyResult.ok }, { module: 'background', operation: 'inventory-refresh', context: { adId } }).catch(() => {});
    return saved;
  } catch (error) {
    await closeRegistryTabs([workerTabId, metadataTabId], 'inventory-refresh-worker-failed', 'Aktualisierungs-Worker');
    await logDiagnostic('error', 'INVENTORY_REFRESH_FAILED', { inventoryId, adId, message: String(error.message || error).slice(0, 600), stack: String(error.stack || '').slice(0, 2400) }, { module: 'background', operation: 'inventory-refresh', context: { adId, workerTabId, metadataTabId } }).catch(() => {});
    throw error;
  }
}

function classifyBulkEditWorkerNavigation(tab, expectedAdId) { return requireBulkInventoryController().classifyBulkEditWorkerNavigation(tab, expectedAdId); }

async function resolveBulkWorkerLifecycle(state, workerTabId, expectedAdId) { return requireBulkInventoryController().resolveBulkWorkerLifecycle(state, workerTabId, expectedAdId); }

async function extractSaveBulkWorker(message, sender) { return requireBulkInventoryController().extractSaveBulkWorker(message, sender); }

async function closeBulkWorker(message, sender) { return requireBulkInventoryController().closeBulkWorker(message, sender); }

async function recordBulkExistingSkip(message, sender) { return requireBulkInventoryController().recordBulkExistingSkip(message, sender); }

async function recordBulkResult(message, sender) { return requireBulkInventoryController().recordBulkResult(message, sender); }

async function requestBulkInventoryStopAfterCurrent(message) { return requireBulkInventoryController().requestBulkInventoryStopAfterCurrent(message); }

async function finishBulkRunControlledStop(message, sender) { return requireBulkInventoryController().finishBulkRunControlledStop(message, sender); }

function scheduleBulkSourceTabClose(tabId, reason = 'bulk-source-replaced') { return requireBulkInventoryController().scheduleBulkSourceTabClose(tabId, reason); }

async function prepareFreshBulkReconciliationSource(state, sender) { return requireBulkInventoryController().prepareFreshBulkReconciliationSource(state, sender); }

async function finishBulkRun(message, sender) { return requireBulkInventoryController().finishBulkRun(message, sender); }

async function failBulkRun(message, sender) { return requireBulkInventoryController().failBulkRun(message, sender); }


async function retryBulkFailure(message) { return requireBulkInventoryController().retryBulkFailure(message); }


let massRenewalController = null;
function requireMassRenewalController() {
  if (!massRenewalController) {
    massRenewalController = MassRenewalController.create({
      storageLocal: chrome.storage.local,
      batchKey: MASS_RENEWAL_BATCH_KEY,
      batchMaxAgeMs: MASS_RENEWAL_BATCH_MAX_AGE_MS,
      progressFlushMs: MASS_RENEWAL_PROGRESS_FLUSH_MS,
      normalizeRenewalMode,
      normalizeRenewalPhaseAttempts,
      broadcastInventoryChanged,
      logDiagnostic,
      sessionCorrelationContext,
      reconcileMassRenewalBatchSession: (...args) => reconcileMassRenewalBatchSession(...args)
    });
  }
  return massRenewalController;
}
function massRenewalTerminalOutcome(session) { return requireMassRenewalController().massRenewalTerminalOutcome(session); }
async function readMassRenewalBatch() { return requireMassRenewalController().readMassRenewalBatch(); }
async function writeMassRenewalBatch(batch) {
  const current = await requireMassRenewalController().readMassRenewalBatch().catch(() => null);
  if (current?.emergencyResetAt && String(batch?.emergencyResetAt || '') !== String(current.emergencyResetAt)) return current;
  return requireMassRenewalController().writeMassRenewalBatch(batch);
}
function massRenewalBatchCounts(batch) { return requireMassRenewalController().massRenewalBatchCounts(batch); }
function massRenewalPublicSnapshot(batch) { return requireMassRenewalController().massRenewalPublicSnapshot(batch); }
function dropMassRenewalProgress(session) { return requireMassRenewalController().dropMassRenewalProgress(session); }
async function flushMassRenewalProgress() { return requireMassRenewalController().flushMassRenewalProgress(); }
function queueMassRenewalProgress(session) { return requireMassRenewalController().queueMassRenewalProgress(session); }
function withMassRenewalMutation(task) { return requireMassRenewalController().withMassRenewalMutation(task); }
async function mutateMassRenewalBatch(batchId, mutator) { return requireMassRenewalController().mutateMassRenewalBatch(batchId, mutator); }
function touchMassRenewalItemProgress(item, now) { return requireMassRenewalController().touchMassRenewalItemProgress(item, now); }
function applyMassRenewalStopState(batch) { return requireMassRenewalController().applyMassRenewalStopState(batch); }
function applyMassRenewalFinalState(batch) { return requireMassRenewalController().applyMassRenewalFinalState(batch); }
async function stopMassRenewalBatchBeforeNext(batchId) { return requireMassRenewalController().stopMassRenewalBatchBeforeNext(batchId); }
async function finalizeMassRenewalBatchIfDone(batchId) { return requireMassRenewalController().finalizeMassRenewalBatchIfDone(batchId); }

let massRenewalWorkflowController = null;
function requireMassRenewalWorkflowController() {
  if (!massRenewalWorkflowController) {
    massRenewalWorkflowController = MassRenewalWorkflowController.create({
      readRenewalSessions, writeRenewalSessions,
      mutateMassRenewalBatch, applyMassRenewalStopState, applyMassRenewalFinalState,
      touchMassRenewalItemProgress, massRenewalTerminalOutcome, massRenewalPublicSnapshot,
      readMassRenewalBatch, writeMassRenewalBatch, withMassRenewalMutation, dropMassRenewalProgress,
      logDiagnostic, sessionCorrelationContext, normalizeRenewalPhaseAttempts,
      startTemplateFillUnlocked, withInsertionStartGate, assertInsertionStartAvailable,
      getProfileState, assertSelectedProfileMatchesLiveAccount, getInventory, isTrashRecord,
      assertTemplateSourceReady, getRenewalConfiguration, normalizeRenewalMode,
      finishRenewalReplacement, retryRenewalVerification, discardRenewalDraft,
      publicAvailabilityPending, readFillSessions, classifyKleinanzeigenInsertionErrorUrl,
      terminalizeTemplateFillOnPlatformError, terminalizeTemplateFillForWatchdog, persistRenewalSession,
      cryptoApi: globalThis.crypto, chromeApi: chrome, queueMicrotaskFn: globalThis.queueMicrotask,
      setTimeoutFn: globalThis.setTimeout, clearTimeoutFn: globalThis.clearTimeout,
      MASS_RENEWAL_MAX_ITEMS, MASS_RENEWAL_WATCHDOG_STALE_MS, MASS_RENEWAL_WATCHDOG_TICK_MS,
      UNASSIGNED_PROFILE_ID
    });
  }
  return massRenewalWorkflowController;
}
function findMassRenewalSessionForItem(batchId, itemIndex) { return requireMassRenewalWorkflowController().findMassRenewalSessionForItem(batchId, itemIndex); }
async function startNextMassRenewalItem(batchId) { return requireMassRenewalWorkflowController().startNextMassRenewalItem(batchId); }
async function reconcileMassRenewalBatchSession(session, options = {}) { return requireMassRenewalWorkflowController().reconcileMassRenewalBatchSession(session, options); }
async function markMassRenewalItemSucceeded(session, result = {}) { return requireMassRenewalWorkflowController().markMassRenewalItemSucceeded(session, result); }
async function startMassRenewalBatch(message) { return requireMassRenewalWorkflowController().startMassRenewalBatch(message); }
async function requestMassRenewalStopAfterCurrent(message) { return requireMassRenewalWorkflowController().requestMassRenewalStopAfterCurrent(message); }
async function normalizeMassRenewalBatchTopLevelStatus(batchId = '', trigger = 'status-query') { return requireMassRenewalWorkflowController().normalizeMassRenewalBatchTopLevelStatus(batchId, trigger); }
async function getMassRenewalBatchStatus() { return requireMassRenewalWorkflowController().getMassRenewalBatchStatus(); }
async function retryMassRenewalItem(message) { return requireMassRenewalWorkflowController().retryMassRenewalItem(message); }
async function resumeMassRenewalBatch() { return requireMassRenewalWorkflowController().resumeMassRenewalBatch(); }
function latestMassRenewalProgressMs(item, renewal, fill) { return requireMassRenewalWorkflowController().latestMassRenewalProgressMs(item, renewal, fill); }
function armMassRenewalWatchdog() { return requireMassRenewalWorkflowController().armMassRenewalWatchdog(); }
async function runMassRenewalWatchdog(options = {}) { return requireMassRenewalWorkflowController().runMassRenewalWatchdog(options); }
async function massRenewalWatchdogTick(message, sender) { return requireMassRenewalWorkflowController().massRenewalWatchdogTick(message, sender); }
function resetMassRenewalWorkflowRuntimeState() { return requireMassRenewalWorkflowController().resetRuntimeState(); }



async function readRenewalSessions() { return requireRenewalStateRepository().readRenewalSessions(); }
async function writeRenewalSessions(sessions) { return requireRenewalStateRepository().writeRenewalSessions(sessions); }

async function readArchiveInsertionSessions() { return requireArchiveInsertionService().readArchiveInsertionSessions(); }
async function writeArchiveInsertionSessions(sessions) { return requireArchiveInsertionService().writeArchiveInsertionSessions(sessions); }
function archiveInsertionPublicSnapshot(session) { return requireArchiveInsertionService().archiveInsertionPublicSnapshot(session); }
function broadcastArchiveInsertionState(session, reason = 'session-updated') { return requireArchiveInsertionService().broadcastArchiveInsertionState(session, reason); }
async function persistArchiveInsertionSession(session, options = {}) { return requireArchiveInsertionService().persistArchiveInsertionSession(session, options); }
async function getArchiveInsertionStatus(message) { return requireArchiveInsertionService().getArchiveInsertionStatus(message); }


let archiveInsertionController = null;
function requireArchiveInsertionController() {
  if (!archiveInsertionController) {
    archiveInsertionController = ArchiveInsertionController.create({
      readArchiveInsertionSessions, writeArchiveInsertionSessions, archiveInsertionPublicSnapshot, persistArchiveInsertionSession, archiveInsertionMeta,
      getInventory, isTrashRecord, getInventoryImage, deleteImagesByInventoryId, assertTemplateSourceReady,
      inventoryImageSetExplicitlyEmpty, compareRenewalRecords, normalizedScalar, normalizedComparableBoolean,
      normalizeProfileName, normalizeRenewalMode, ensureProfile, saveInventory, openDatabase,
      normalBrowserWindowId, createManagedWorkerTab, closeManagedWorkerTab, waitForTabComplete,
      ensureContentConnection, sendTabRequestWithBootstrap, updateAutomationTab, reloadAutomationTab,
      createAutomationTab, registerShadowTab, closePublishedRenewalTargetTab,
      assertSelectedProfileMatchesLiveAccount, getRenewalConfiguration, withInsertionStartGate, assertInsertionStartAvailable,
      readFillSessions, writeFillSessions, detectPublishedAdForFill,
      correlationContext, sessionCorrelationContext, delay, logDiagnostic, setAppNotice, broadcastInventoryChanged,
      cryptoApi: globalThis.crypto, chromeApi: chrome,
      MY_ADS_PROJECTS_URL, TAB_LOAD_TIMEOUT_RENEWAL_MS, BULK_RETRY_TIMEOUT_MS, BULK_RETRY_POLL_MS,
      RENEWAL_MODE_FAST, TEMPLATE_TARGET_URL, TAB_ROLES, INVENTORY_STORE, IMAGE_STORE
    });
  }
  return archiveInsertionController;
}
async function resumePendingArchiveInsertions() { return requireArchiveInsertionController().resumePendingArchiveInsertions(); }
async function runArchiveInsertionPostPublish(archiveInsertionId) { return requireArchiveInsertionController().runArchiveInsertionPostPublish(archiveInsertionId); }
async function confirmPublishedArchiveInsertion(fill, detected) { return requireArchiveInsertionController().confirmPublishedArchiveInsertion(fill, detected); }
async function startArchiveInsertion(message) { return requireArchiveInsertionController().startArchiveInsertion(message); }

async function putInventoryRecordOnly(record) { return requireInventoryRepository().put(record); }

function renewalInsertionMeta(session) { return requireRenewalStateRepository().renewalInsertionMeta(session); }
function renewalPublicSnapshot(session) { return requireRenewalStateRepository().renewalPublicSnapshot(session); }


let renewalWorkflowController = null;
function requireRenewalWorkflowController() {
  if (!renewalWorkflowController) {
    renewalWorkflowController = RenewalWorkflowController.create({
      assertMassRenewalManualActionAllowed, broadcastInventoryChanged, closeManagedWorkerTab, closeRegistryTab,
      compareRenewalRecords, correlationContext, createManagedWorkerTab, delay, detectPublishedAdForFill,
      dropMassRenewalProgress, ensureContentConnection, evaluateCheckoutRecoveryProof, finishRenewalReplacement,
      flushDiagnosticBuffer, getInventory, isCheckoutAbortedRecoveryCandidate, isNonRetryableRenewalSafetyError,
      isSafeLegacyManualEmergencyReset, logDiagnostic, logRenewalPhaseAttemptFailed, logRenewalPhaseAttemptStarted,
      massRenewalBatchCounts, massRenewalTerminalOutcome, mergeListingMetadata, mutateMassRenewalBatch,
      normalBrowserWindowId, normalizeKnownPublicAdUrl, normalizeProfileName, normalizeRenewalMode, normalizeRenewalPhaseAttempts,
      persistArchiveInsertionSession, publicAvailabilitySnapshot, putInventoryRecordOnly, queueMassRenewalProgress,
      readArchiveInsertionSessions, readDiagnostics, readFillSessions, readInventoryRecordsForProfile, readProfiles,
      readRenewalSessions, reconcileMassRenewalBatchSession, renewalAttemptState, renewalComparisonWaitsOnlyForOnline,
      renewalInsertionMeta, renewalMaxPhaseAttempts, renewalAttemptDetails, renewalOutcomeForComparison, renewalPhaseAttemptAvailable,
      renewalPhaseRetryDelayMs, renewalPublicSnapshot, resetRenewalPhaseAttempts, resolveRenewalPublicEvidence,
      retirePublishedRenewalTargetTab, saveInventory, sendTabRequestWithBootstrap, sessionCorrelationContext,
      touchMassRenewalItemProgress, waitForTabComplete, writeFillSessions, writeRenewalSessions,
      BULK_RETRY_POLL_MS, BULK_RETRY_TIMEOUT_MS, MY_ADS_PROJECTS_URL, RENEWAL_MODE_FAST, RENEWAL_MODE_SAFE,
      RENEWAL_PHASE_ATTEMPTS_DEFAULT, TAB_LOAD_TIMEOUT_PHASE4_MS, TAB_LOAD_TIMEOUT_RENEWAL_MS
    });
  }
  return renewalWorkflowController;
}

async function createRenewalSkeleton(source, renewalId, options = {}) { return requireRenewalWorkflowController().createRenewalSkeleton(source, renewalId, options); }
async function updateRenewalSkeleton(session, patch = {}) { return requireRenewalWorkflowController().updateRenewalSkeleton(session, patch); }
async function sendRenewalFeedback(session, title, text, issues = []) { return requireRenewalWorkflowController().sendRenewalFeedback(session, title, text, issues); }
async function persistRenewalSession(session) { return requireRenewalWorkflowController().persistRenewalSession(session); }
function scheduleAutomaticRenewalReplacement(renewalId, trigger = 'verification-match') { return requireRenewalWorkflowController().scheduleAutomaticRenewalReplacement(renewalId, trigger); }
async function runFastRenewalVerification(renewalId) { return requireRenewalWorkflowController().runFastRenewalVerification(renewalId); }
async function runRenewalReinventory(renewalId) { return requireRenewalWorkflowController().runRenewalReinventory(renewalId); }
async function retryRenewalVerification(message) { return requireRenewalWorkflowController().retryRenewalVerification(message); }
async function markRenewalPublishClicked(message, sender) { return requireRenewalWorkflowController().markRenewalPublishClicked(message, sender); }
async function confirmPublishedRenewal(fill, detected) { return requireRenewalWorkflowController().confirmPublishedRenewal(fill, detected); }
async function checkoutRecoveryEvidenceForRenewal(session) { return requireRenewalWorkflowController().checkoutRecoveryEvidenceForRenewal(session); }
async function checkoutRecoveryBaselineForRenewal(session) { return requireRenewalWorkflowController().checkoutRecoveryBaselineForRenewal(session); }
async function verifyAbortedPaidCheckoutNoPublication(session, trigger = 'recovery') { return requireRenewalWorkflowController().verifyAbortedPaidCheckoutNoPublication(session, trigger); }
async function finalizeVerifiedCheckoutAbort(session, proof, trigger = 'recovery') { return requireRenewalWorkflowController().finalizeVerifiedCheckoutAbort(session, proof, trigger); }
async function tryRecoverAbortedPaidCheckout(session, trigger = 'recovery') { return requireRenewalWorkflowController().tryRecoverAbortedPaidCheckout(session, trigger); }
async function resumePendingRenewals() { return requireRenewalWorkflowController().resumePendingRenewals(); }






let renewalVerificationService = null;
function requireRenewalVerificationService() {
  if (!renewalVerificationService) {
    renewalVerificationService = RenewalVerificationService.create({
      getInventoryImage,
      createImageBitmapFn: globalThis.createImageBitmap,
      OffscreenCanvasCtor: globalThis.OffscreenCanvas
    });
  }
  return renewalVerificationService;
}

function normalizedComparableText(value) { return requireRenewalVerificationService().normalizedComparableText(value); }

function normalizedScalar(value) { return requireRenewalVerificationService().normalizedScalar(value); }

function dynamicAttributeMap(record) { return requireRenewalVerificationService().dynamicAttributeMap(record); }

async function imageVisualVector(imageKey) { return await requireRenewalVerificationService().imageVisualVector(imageKey); }

function meanAbsoluteVectorDifference(a, b) { return requireRenewalVerificationService().meanAbsoluteVectorDifference(a, b); }

function inventoryImageSetExplicitlyEmpty(record) { return requireRenewalVerificationService().inventoryImageSetExplicitlyEmpty(record); }

async function compareRenewalImages(source, candidate) { return await requireRenewalVerificationService().compareRenewalImages(source, candidate); }

async function compareRenewalRecords(source, candidate, options = {}) { return await requireRenewalVerificationService().compareRenewalRecords(source, candidate, options); }

function normalizedComparableBoolean(value) { return requireRenewalVerificationService().normalizedComparableBoolean(value); }



function renewalComparisonHasOnlyVisibilityUncertainty(comparison) { return requireRenewalVerificationService().renewalComparisonHasOnlyVisibilityUncertainty(comparison); }

function renewalComparisonWaitsOnlyForOnline(comparison) { return requireRenewalVerificationService().renewalComparisonWaitsOnlyForOnline(comparison); }

function renewalOutcomeForComparison(comparison) { return requireRenewalVerificationService().renewalOutcomeForComparison(comparison); }

function markStoredComparisonOnline(comparison) { return requireRenewalVerificationService().markStoredComparisonOnline(comparison); }





const automaticReplacementInFlight = new Set();






























const TEMPLATE_TARGET_URL = "https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html";
const TEMPLATE_FILL_SESSIONS_KEY = "templateFillSessions";
const TEMPLATE_FILL_MAX_AGE_MS = 2 * 60 * 60 * 1000;

async function getInventory(inventoryId) { return requireInventoryRepository().get(inventoryId); }

async function getInventoryImage(imageKey) { return requireInventoryImageStore().get(imageKey); }

async function readFillSessions() { return requireTemplateFillService().readFillSessions(); }
async function writeFillSessions(sessions) { return requireTemplateFillService().writeFillSessions(sessions); }
const TERMINAL_TEMPLATE_FILL_STATUSES = new Set(['complete', 'needs-review', 'error']);
function withTemplateFillMutation(task) { return requireTemplateFillService().withTemplateFillMutation(task); }
async function terminalizeTemplateFillForWatchdog(fillId, issue) { return requireTemplateFillService().terminalizeTemplateFillForWatchdog(fillId, issue); }

function templatePayload(record) { return requireTemplateFillService().templatePayload(record); }
function assertTemplateSourceReady(record) { return requireTemplateFillService().assertTemplateSourceReady(record); }

function renewalHoldsInsertionLock(session) { return RenewalStateRepository.renewalHoldsInsertionLock(session); }
function isSafeLegacyManualEmergencyReset(session) { return RenewalStateRepository.isSafeLegacyManualEmergencyReset(session); }
function isSafePrePublishPaidInsertion(session) { return RenewalStateRepository.isSafePrePublishPaidInsertion(session); }
function emergencyResetRenewalState(session, options) { return RenewalStateRepository.emergencyResetRenewalState(session, options); }
function isCheckoutAbortedRecoveryCandidate(session, evidence) { return RenewalStateRepository.isCheckoutAbortedRecoveryCandidate(session, evidence); }
function evaluateCheckoutRecoveryProof(input) { return RenewalStateRepository.evaluateCheckoutRecoveryProof(input); }

function templateFillHoldsInsertionLock(session) { return requireTemplateFillService().templateFillHoldsInsertionLock(session); }

function insertionLockSortTime(item) { return requireInsertionLockService().insertionLockSortTime(item); }

async function getInsertionLockState() { return await requireInsertionLockService().getInsertionLockState(); }

function insertionLockMessage(lock) { return requireInsertionLockService().insertionLockMessage(lock); }

async function assertInsertionStartAvailable(request = {}) { return await requireInsertionLockService().assertInsertionStartAvailable(request); }

function publishedAdCandidateFromUrl(rawUrl, sourceAdId = '') {
  try {
    const url = new URL(String(rawUrl || ''));
    if (url.protocol !== 'https:' || !/(^|\.)kleinanzeigen\.de$/i.test(url.hostname)) return null;
    let adId = '';
    let kind = '';
    let publicUrl = '';
    const publicMatch = url.pathname.match(/\/s-anzeige\/[^/]+\/(\d+)-\d+-\d+(?:\/)?$/i);
    if (publicMatch) {
      adId = publicMatch[1];
      kind = 'public';
      publicUrl = `${url.origin}${url.pathname}`;
    } else if (/\/p-anzeige-bearbeiten\.html$/i.test(url.pathname)) {
      adId = String(url.searchParams.get('adId') || '');
      kind = 'edit';
    } else if (/\/p-anzeige-aufgeben-bestaetigung\.html$/i.test(url.pathname)) {
      adId = String(url.searchParams.get('addId') || url.searchParams.get('adId') || '');
      kind = 'confirmation';
    }
    if (!/^\d+$/.test(adId) || adId === String(sourceAdId || '')) return null;
    return { adId, kind, publicUrl, url: url.href };
  } catch {
    return null;
  }
}


function recoverableTrashTemplateFill(session) { return requireTemplateFillController().recoverableTrashTemplateFill(session); }

async function getRecoverableTrashTemplateFill() { return await requireTemplateFillController().getRecoverableTrashTemplateFill(); }

let publishedInventoryResolver = null;
function requirePublishedInventoryResolver() {
  if (!publishedInventoryResolver) publishedInventoryResolver = PublishedInventoryResolver.create({
    getTab: tabId => chrome.tabs.get(tabId),
    updateTab: (tabId, properties) => updateAutomationTab(tabId, properties),
    waitForExpectedComplete: (tabId, expectedUrl, options) => waitForExpectedTabComplete(tabId, expectedUrl, options),
    ensureContentConnection,
    tabMessage: (tabId, message) => sendTabRequest(tabId, message),
    log: (event, details) => logDiagnostic('info', event, details, { module: 'published-inventory-resolver', operation: 'trash-template-inventory-capture', context: { adId: details?.adId || null, targetTabId: details?.tabId || null } }).catch(() => {})
  });
  return publishedInventoryResolver;
}

async function prepareTrashTemplateInventoryCapture(message = {}) { return await requireTemplateFillController().prepareTrashTemplateInventoryCapture(message); }

async function completeTrashTemplateFlow(message = {}) { return await requireTemplateFillController().completeTrashTemplateFlow(message); }

async function getTrashTemplateFillStatus(message = {}) { return await requireTemplateFillController().getTrashTemplateFillStatus(message); }

async function startTrashTemplateFillUnlocked(inventoryId) { return await requireTemplateFillController().startTrashTemplateFillUnlocked(inventoryId); }

async function startTemplateFillUnlocked(inventoryId, { autoReplacementAllowed = false, startConfirmationVersion = null, renewalModeOverride = null, maxPhaseAttemptsOverride = null, massBatchId = null, massBatchItemIndex = null, parentOperationId = null } = {}) { return await requireTemplateFillController().startTemplateFillUnlocked(inventoryId, { autoReplacementAllowed, startConfirmationVersion, renewalModeOverride, maxPhaseAttemptsOverride, massBatchId, massBatchItemIndex, parentOperationId }); }

async function startTrashTemplateFill(inventoryId) { return await requireTemplateFillController().startTrashTemplateFill(inventoryId, arguments[1] || {}); }

async function startTemplateFill(inventoryId, options = {}) { return await requireTemplateFillController().startTemplateFill(inventoryId, options); }

const renewalPhase1RetryInFlight = new Set();

function phase1PublishBoundaryReached(renewal, fill = null) {
  if (/^\d+$/.test(String(renewal?.newAdId || ''))) return true;
  if (renewal?.publishClickedAt || fill?.publishClickedAt) return true;
  const statuses = [renewal?.status, fill?.status].map(value => String(value || ''));
  if (statuses.some(status => ['submitted', 'new-id-confirmed', 'reinventorizing', 'verifying', 'verified', 'replaced'].includes(status))) return true;
  const stages = [renewal?.stage, fill?.stage].map(value => String(value || ''));
  return stages.some(stage => ['publish-submitted', 'new-id-confirmed'].includes(stage));
}

function canRetryRenewalPhase1(renewal, fill = null) {
  if (!renewal?.renewalId || phase1PublishBoundaryReached(renewal, fill)) return false;
  if (['cancelled', 'replaced'].includes(String(renewal.status || ''))) return false;
  return renewalPhaseAttemptAvailable(renewal, 1);
}

async function restartRenewalPhase1Attempt(renewalId, failedFillId, reason = 'phase-1-fill-failed') {
  const id = String(renewalId || '');
  if (!id || renewalPhase1RetryInFlight.has(id)) return false;
  renewalPhase1RetryInFlight.add(id);
  try {
    const [renewals, fills] = await Promise.all([readRenewalSessions(), readFillSessions()]);
    const renewal = renewals[id];
    const failedFill = fills[String(failedFillId || '')];
    if (!renewal || !failedFill) return false;
    if (String(renewal.fillId || '') !== String(failedFill.fillId || '')) return false;
    if (!canRetryRenewalPhase1(renewal, failedFill)) return false;

    const previousTargetTabId = Number(renewal.targetTabId || failedFill.targetTabId || 0) || null;
    const previousAttempt = renewalAttemptState(renewal, 1);
    const attemptState = beginRenewalPhaseAttempt(renewal, 1, { lastError: failedFill.result?.issues?.[0] || renewal.lastError || reason });
    const fillId = crypto.randomUUID();
    const tab = await createAutomationTab({ url: 'about:blank', active: false });
    if (!tab?.id) throw new Error('Neuer Kleinanzeigen-Tab für den Phase-1-Wiederholungsversuch konnte nicht geöffnet werden.');

    renewal.fillId = fillId;
    renewal.targetTabId = tab.id;
    renewal.status = 'draft';
    renewal.stage = 'phase1-retry-started';
    renewal.lastError = null;
    renewal.updatedAt = new Date().toISOString();
    await persistRenewalSession(renewal);

    const nextFill = {
      operationId: renewal.operationId || failedFill.operationId || null,
      parentOperationId: renewal.parentOperationId || failedFill.parentOperationId || null,
      fillId,
      renewalId: id,
      skeletonInventoryId: renewal.skeletonInventoryId,
      inventoryId: renewal.sourceInventoryId,
      sourceAdId: renewal.sourceAdId,
      targetTabId: tab.id,
      targetUrl: TEMPLATE_TARGET_URL,
      renewalMode: normalizeRenewalMode(renewal.renewalMode),
      maxPhaseAttempts: renewalMaxPhaseAttempts(renewal),
      phase1Attempt: attemptState.attempt,
      phase1AttemptId: attemptState.attemptId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'waiting',
      stage: 'tab-opened',
      result: null,
      autoReplacementAllowed: Boolean(renewal.autoReplacementAllowed),
      startConfirmedAt: renewal.startConfirmedAt || failedFill.startConfirmedAt || null,
      massBatchId: renewal.massBatchId || failedFill.massBatchId || null,
      massBatchItemIndex: renewal.massBatchItemIndex ?? failedFill.massBatchItemIndex ?? null
    };
    fills[fillId] = nextFill;
    await writeFillSessions(fills);
    await registerShadowTab(tab.id, TAB_ROLES.RENEWAL_TARGET, { ...correlationContext(renewal), ownerType: 'renewal', ownerId: id, inventoryId: String(renewal.sourceInventoryId || ''), adId: String(renewal.sourceAdId || '') });

    if (previousTargetTabId && previousTargetTabId !== tab.id) {
      await closeRegistryTab(previousTargetTabId, 'renewal-phase1-retry', 'Vorheriger Phase-1-Zieltab').catch(() => {});
    }

    await updateAutomationTab(tab.id, { url: TEMPLATE_TARGET_URL, active: true });
    await logDiagnostic('warning', 'RENEWAL_PHASE1_ATTEMPT_RESTARTED', {
      renewalId: id,
      sourceAdId: renewal.sourceAdId,
      previousFillId: failedFill.fillId,
      fillId,
      previousAttempt: previousAttempt.attempt,
      attempt: attemptState.attempt,
      maxAttempts: renewalMaxPhaseAttempts(renewal),
      phase1AttemptId: attemptState.attemptId,
      reason: String(reason || '').slice(0, 300)
    }, { module: 'background', operation: 'renewal-phase-1', context: sessionCorrelationContext(renewal, { renewalId: id, fillId, adId: renewal.sourceAdId, targetTabId: tab.id }) }).catch(() => {});
    return true;
  } catch (error) {
    const renewals = await readRenewalSessions().catch(() => ({}));
    const renewal = renewals[id];
    if (renewal && !phase1PublishBoundaryReached(renewal)) {
      renewal.status = 'verification-failed';
      renewal.stage = 'phase1-retry-start-failed';
      renewal.lastError = String(error.message || error).slice(0, 800);
      await persistRenewalSession(renewal).catch(() => {});
    }
    await logDiagnostic('error', 'RENEWAL_PHASE1_RETRY_START_FAILED', {
      renewalId: id,
      fillId: failedFillId || null,
      message: String(error.message || error).slice(0, 800)
    }, { module: 'background', operation: 'renewal-phase-1', context: sessionCorrelationContext(renewal || { renewalId: id }, { renewalId: id }) }).catch(() => {});
    return false;
  } finally {
    renewalPhase1RetryInFlight.delete(id);
  }
}




async function deleteImagesByInventoryId(inventoryId) { return requireInventoryImageStore().deleteByInventoryId(inventoryId); }





function archiveInsertionMeta(session) { return requireArchiveInsertionService().archiveInsertionMeta(session); }


















async function getTemplateFillSession(sender) { return requireTemplateFillService().getTemplateFillSession(sender); }

function evictTemplateImageTransfer(fillId, imageKey) { return requireTemplateFillService().evictTemplateImageTransfer(fillId, imageKey); }
function evictTemplateImageTransfersForFill(fillId) { return requireTemplateFillService().evictTemplateImageTransfersForFill(fillId); }
function evictTemplateImageTransfersForTab(tabId) { return requireTemplateFillService().evictTemplateImageTransfersForTab(tabId); }
async function resolveTemplateImageTransfer(message, sender) { return requireTemplateFillService().resolveTemplateImageTransfer(message, sender); }
async function templateImageChunk(message, sender) { return requireTemplateFillService().templateImageChunk(message, sender); }

function isTransientTemplateFillProgress(stage, status, result) { return requireTemplateFillService().isTransientTemplateFillProgress(stage, status, result); }
function templateFillProgressSnapshot(session, stage, updatedAt = new Date().toISOString()) { return requireTemplateFillService().templateFillProgressSnapshot(session, stage, updatedAt); }

async function updateTemplateFillSession(message, sender) { return await requireTemplateFillController().updateTemplateFillSession(message, sender); }

chrome.windows?.onRemoved?.addListener(windowId => {
  (async () => {
    const stored = await chrome.storage.session.get(APP_WINDOW_SESSION_KEY).catch(() => ({}));
    if (Number(stored?.[APP_WINDOW_SESSION_KEY] || 0) === Number(windowId)) {
      await chrome.storage.session.remove(APP_WINDOW_SESSION_KEY).catch(() => {});
    }
  })().catch(() => {});
});

async function terminalizeTemplateFillOnPlatformError(tabId, rawUrl, evidence = {}) { return await requireTemplateFillController().terminalizeTemplateFillOnPlatformError(tabId, rawUrl, evidence); }

const renewalPublishDetectionInFlight = new Set();
let tabLifecycleObserver = null;
function requireTabLifecycleObserver() {
  if (!tabLifecycleObserver) {
    tabLifecycleObserver = TabLifecycleObserver.create({
      tabRegistry,
      chromeTabs: chrome.tabs,
      roles: TAB_ROLES,
      goneState: TAB_STATES.GONE,
      isGoneError: error => TabRegistry.isGoneError(error),
      logDiagnostic,
      notifyTabLoadWaiters,
      evictTemplateImageTransfersForTab,
      readFillSessions,
      writeFillSessions,
      readRenewalSessions,
      persistRenewalSession,
      readArchiveInsertionSessions,
      persistArchiveInsertionSession,
      broadcastInventoryChanged,
      getBulkRunState,
      writeBulkRunState,
      mutateBulkRunState,
      closeRegistryTabs
    });
  }
  return tabLifecycleObserver;
}
function registryEntryIsOwnedWorker(entry) {
  if (!entry || entry.lifecycleState === TAB_STATES.GONE) return false;
  const owner = entry.owner && typeof entry.owner === 'object' ? entry.owner : {};
  const hasOwner = Boolean(owner.ownerId || owner.operationId || owner.renewalId || owner.archiveInsertionId || owner.bulkRunId || owner.runId || owner.fillId);
  return hasOwner && (entry.managed === true || entry.role === TAB_ROLES.BULK_WORKER || entry.role === TAB_ROLES.RENEWAL_WORKER || entry.role === TAB_ROLES.ARCHIVE_WORKER || entry.role === TAB_ROLES.WORKER);
}

async function observeTabLifecycleUpdate(tab) { return requireTabLifecycleObserver().observeTabLifecycleUpdate(tab); }

chrome.storage?.onChanged?.addListener((changes, areaName) => {
  if (areaName === 'local' && changes?.[PLATFORM_ACCESS_RESTRICTION_KEY]?.newValue) {
    notifyAllTabLoadWaiters({ kind: 'platform-restriction' });
  }
});

chrome.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
  if (changeInfo?.status || changeInfo?.url) notifyTabLoadWaiters(tabId, { kind: 'updated', status: changeInfo.status || tab?.status || null, url: changeInfo.url || tab?.url || null, tab });
  if (tab?.id) void observeTabLifecycleUpdate(tab).catch(() => {});
  const observedUrl = String(changeInfo.url || tab?.url || '');
  const platformError = classifyKleinanzeigenInsertionErrorUrl(observedUrl, { title: tab?.title || '' });
  if (platformError.isError) {
    void terminalizeTemplateFillOnPlatformError(tabId, observedUrl, { ...platformError, title: tab?.title || '', source: 'tab-navigation' }).catch(async error => {
      await logDiagnostic('error', 'KLEINANZEIGEN_ERROR_PAGE_TERMINALIZATION_FAILED', {
        tabId, path: platformError.path || null, errorCode: platformError.errorCode || null,
        message: String(error.message || error).slice(0, 800)
      }, { module: 'background', operation: 'template-fill', context: { targetTabId: tabId } }).catch(() => {});
    });
  }
  if (changeInfo.status !== 'complete' || renewalPublishDetectionInFlight.has(tabId)) return;
  renewalPublishDetectionInFlight.add(tabId);
  (async () => {
    const fills = await readFillSessions();
    const fill = Object.values(fills).find(item => item?.targetTabId === tabId && (item?.renewalId || item?.archiveInsertionId) && item?.stage === 'publish-submitted' && item?.status === 'running');
    if (!fill) return;
    try {
      const detected = await detectPublishedAdForFill(tabId, fill.sourceAdId);
      if (!detected?.adId) {
        const currentTab = await chrome.tabs.get(tabId).catch(() => null);
        let path = '';
        try { path = new URL(String(currentTab?.url || '')).pathname; } catch { /* ignore */ }
        if (fill.renewalId && path === '/m-bestellung-aufnehmen.html') {
          const renewals = await readRenewalSessions().catch(() => ({}));
          const renewal = renewals[fill.renewalId];
          if (renewal && !renewal.newAdId) {
            renewal.checkoutObservedAt = renewal.checkoutObservedAt || new Date().toISOString();
            renewal.checkoutPath = path;
            renewal.paidInsertion = { ...(renewal.paidInsertion || {}), phase: 'checkout', source: renewal.paidInsertion?.source || 'post-publish-navigation' };
            await persistRenewalSession(renewal).catch(() => {});
          }
        }
        await logDiagnostic('info', fill.archiveInsertionId ? 'ARCHIVE_INSERT_NEW_ID_DETECTION_PENDING' : 'RENEWAL_NEW_ID_DETECTION_PENDING', {
          fillId: fill.fillId, renewalId: fill.renewalId || null, archiveInsertionId: fill.archiveInsertionId || null,
          reason: 'no-candidate', path: path || null
        }, { module: 'background', operation: fill.archiveInsertionId ? 'archive-import-publish-detect' : 'renewal-publish-detect', context: sessionCorrelationContext(fill, { renewalId: fill.renewalId || null, adId: fill.sourceAdId, targetTabId: tabId }) }).catch(() => {});
        return;
      }
      if (fill.archiveInsertionId) await confirmPublishedArchiveInsertion(fill, detected);
      else await confirmPublishedRenewal(fill, detected);
    } catch (error) {
      await logDiagnostic('warning', fill.archiveInsertionId ? 'ARCHIVE_INSERT_NEW_ID_DETECTION_PENDING' : 'RENEWAL_NEW_ID_DETECTION_PENDING', {
        fillId: fill.fillId, renewalId: fill.renewalId || null, archiveInsertionId: fill.archiveInsertionId || null,
        message: String(error.message || error).slice(0, 500)
      }, { module: 'background', operation: fill.archiveInsertionId ? 'archive-import-publish-detect' : 'renewal-publish-detect', context: sessionCorrelationContext(fill, { renewalId: fill.renewalId || null, adId: fill.sourceAdId, targetTabId: tabId }) }).catch(() => {});
    }
  })().finally(() => renewalPublishDetectionInFlight.delete(tabId));
});

chrome.tabs?.onActivated?.addListener(({ tabId }) => {
  void requireTabLifecycleObserver().handleActivated(tabId).catch(() => {});
});

chrome.tabs?.onRemoved?.addListener(tabId => {
  void requireTabLifecycleObserver().handleRemoved(tabId).catch(() => {});
});


let workflowEmergencyResetController = null;
function requireWorkflowEmergencyResetController() {
  if (!workflowEmergencyResetController) {
    workflowEmergencyResetController = WorkflowEmergencyResetController.create({
      bumpEmergencyResetGeneration, resetMassRenewalWorkflowRuntimeState,
      automaticReplacementInFlight, renewalPhase1RetryInFlight, renewalPublishDetectionInFlight, trashTemplatePublishDetectionInFlight,
      mutateBulkRunState, closeRegistryTabs, closeRegistryTab, releaseBulkSourceOwnership,
      readFillSessions, writeFillSessions, requireTemplateFillService,
      RenewalStateRepository, readRenewalSessions, writeRenewalSessions, renewalHoldsInsertionLock,
      isSafeLegacyManualEmergencyReset, isSafePrePublishPaidInsertion, emergencyResetRenewalState,
      readArchiveInsertionSessions, writeArchiveInsertionSessions, readMassRenewalBatch, writeMassRenewalBatch,
      touchMassRenewalItemProgress, getTabRegistrySnapshot, TAB_STATES,
      logDiagnostic, sessionCorrelationContext, broadcastInventoryChanged
    });
  }
  return workflowEmergencyResetController;
}
async function resetActiveWorkflows() { return requireWorkflowEmergencyResetController().resetActiveWorkflows(); }

function isNormalTabGoneLifecycleError(error, message) {
  const text = String(error?.message || error || '');
  const expectedClosed = error?.code === 'KR_TAB_EXPECTED_CLOSED' || /KR_TAB_EXPECTED_CLOSED/i.test(text);
  return expectedClosed && String(message?.type || '') === 'ENSURE_CONTENT_CONNECTION';
}

function isExpectedPostRecoveryBulkClose(error, message, run) {
  if (message?.type !== 'BULK_CLOSE_WORKER') return false;
  const text = String(error?.message || error || '');
  const noActiveRun = !run || String(run.status || '') !== 'running';
  return noActiveRun && /Keine aktive Erfassung vorhanden|Erfassung wurde nicht gefunden|nicht mehr aktiv/i.test(text);
}

const nativeUpdateGateway = NativeUpdateStatusGateway.create({
  getPlatform: () => new Promise(resolve => {
    chrome.runtime.getPlatformInfo(info => {
      resolve(!chrome.runtime.lastError && info?.os === 'win' ? 'win' : 'unsupported');
    });
  }),
  newNonce: () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''),
  transport: (host, payload) => new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(host, payload, response => {
      if (chrome.runtime.lastError) reject(new Error(String(chrome.runtime.lastError.message || 'HOST_UNAVAILABLE')));
      else resolve(response);
    });
  }),
  timeoutMs: 5000
});
const nativeStatusBridge = NativeStatusBridge.create({
  gateway: nativeUpdateGateway,
  getExtensionId: () => chrome.runtime.id,
  getAppUrl: () => chrome.runtime.getURL('app.html')
});

const backgroundMessageRouter = BackgroundMessageRouter.create({
  MessageContractRegistry,
  assertPlatformAccessAllowedForRequest,
  handlers: Object.freeze({
  "PLATFORM_ACCESS_RESTRICTED": (message, sender) => activatePlatformAccessRestriction(message, sender),
  "GET_PLATFORM_ACCESS_RESTRICTION": (message, sender) => readPlatformAccessRestriction(),
  "CLEAR_PLATFORM_ACCESS_RESTRICTION": (message, sender) => clearPlatformAccessRestriction(),
  "OPEN_APP_WINDOW": (message, sender) => openOrFocusAppWindow(),
  "GET_BACKGROUND_EPOCH": (message, sender) => ({ epoch: currentDiagnosticSessionId() }),
  "GET_NATIVE_UPDATE_STATUS": (message, sender) => nativeStatusBridge.status(message, sender),
  "LOG_DIAGNOSTIC_EVENT": (message, sender) => logClientDiagnostic(message, sender),
  "SET_ACCOUNT_GATE_DIAGNOSTIC_STATE": (message, sender) => setAccountGateDiagnosticState(message),
  "STORE_GALLERY_DIAGNOSTIC": (message, sender) => storeGalleryDiagnostic(message, sender),
  "GET_DIAGNOSTIC_EXPORT": (message, sender) => requireDiagnosticExportService().buildDiagnosticExport(),
  "RESET_DIAGNOSTICS": (message, sender) => resetDiagnostics(),
  "RESET_ACTIVE_WORKFLOWS": (message, sender) => resetActiveWorkflows(),
  "ENSURE_CONTENT_CONNECTION": (message, sender) => ensureContentConnection(message),
  "GET_MANAGED_WORKER_TAB_IDS": (message, sender) => getManagedWorkerTabIds(),
  "GET_TAB_REGISTRY_SNAPSHOT": (message, sender) => getTabRegistrySnapshot(),
  "REACTIVATE_DISCARDED_TABS": (message, sender) => reactivateDiscardedTabs(message),
  "GET_RENEWAL_CONFIGURATION": (message, sender) => getRenewalConfiguration(),
  "SET_RENEWAL_MODE": (message, sender) => setRenewalMode(message),
  "SET_RENEWAL_PHASE_ATTEMPTS": (message, sender) => setRenewalPhaseAttempts(message),
  "OPEN_EDIT_AD": (message, sender) => openEditAd(message),
  "OPEN_READONLY_AD": (message, sender) => openReadOnlyAd(message),
  "RECOGNIZE_PROFILE": (message, sender) => recognizeProfile(message),
  "GET_PROFILE_STATE": (message, sender) => getProfileState(),
  "PROBE_LIVE_KLEINANZEIGEN_ACCOUNT": (message, sender) => probeLiveKleinanzeigenAccount(),
  "SET_SELECTED_PROFILE": (message, sender) => setSelectedProfile(message),
  "PREPARE_PROFILE_BACKUP_IMPORT": (message, sender) => prepareProfileBackupImport(message),
  "FINALIZE_PROFILE_BACKUP_IMPORT": (message, sender) => finalizeProfileBackupImport(message),
  "DELETE_PROFILE": (message, sender) => deleteProfile(message),
  "ASSIGN_UNPROFILED_INVENTORIES": (message, sender) => assignUnprofiledInventories(message),
  "REFRESH_INVENTORY": (message, sender) => refreshInventoryRecord(message),
  "CHECK_INVENTORY_ONLINE_STATUS": (message, sender) => checkInventoryOnlineStatus(message),
  "CAPTURE_SINGLE_INVENTORY": (message, sender) => captureSingleInventory(message),
  "RETRY_RENEWAL_VERIFICATION": (message, sender) => retryRenewalVerification(message),
  "SAVE_INVENTORY": (message, sender) => saveInventory(message.payload),
  "LIST_INVENTORIES": (message, sender) => listInventories(Object.prototype.hasOwnProperty.call(message, 'profileId') ? message.profileId : undefined),
  "LIST_TRASH": (message, sender) => listTrashEntries(Object.prototype.hasOwnProperty.call(message, 'profileId') ? message.profileId : undefined),
  "GET_INSERTION_LOCK_STATE": (message, sender) => getInsertionLockState(),
  "DELETE_INVENTORY": (message, sender) => deleteInventory(message.inventoryId),
  "DELETE_TRASH_ENTRY": (message, sender) => deleteTrashEntry(message.inventoryId),
  "RESET_TRASH_RETENTION": (message, sender) => resetTrashRetention(message.inventoryId),
  "REMOVE_REPLACEMENT_READY_LOCAL": (message, sender) => removeReplacementReadyLocal(message),
  "FINISH_RENEWAL_REPLACEMENT": (message, sender) => finishRenewalReplacement(message),
  "DISCARD_RENEWAL_DRAFT": (message, sender) => discardRenewalDraft(message),
  "CLEAR_INVENTORIES": (message, sender) => clearInventories(Object.prototype.hasOwnProperty.call(message, 'profileId') ? message.profileId : undefined),
  "START_BULK_INVENTORY_OPERATION": (message, sender) => startBulkInventoryOperation(message),
  "BULK_INIT_RUN": (message, sender) => initBulkRun(message, sender),
  "GET_BULK_RUN_FOR_SOURCE": (message, sender) => bulkRunForSource(sender),
  "GET_BULK_RUN_STATUS": (message, sender) => getBulkRunState(),
  "BULK_RUN_UPDATE": (message, sender) => updateBulkRun(message, sender),
  "BULK_RECORD_ROSTER_PAGE": (message, sender) => recordBulkRosterPage(message, sender, { reconciliation: false }),
  "REQUEST_BULK_INVENTORY_STOP_AFTER_CURRENT": (message, sender) => requestBulkInventoryStopAfterCurrent(message),
  "BULK_FINISH_CONTROLLED_STOP": (message, sender) => finishBulkRunControlledStop(message, sender),
  "BULK_BEGIN_RECONCILIATION": (message, sender) => beginBulkReconciliation(message, sender),
  "BULK_RECORD_RECONCILIATION_PAGE": (message, sender) => recordBulkRosterPage(message, sender, { reconciliation: true }),
  "BULK_FINISH_RECONCILIATION": (message, sender) => finishBulkReconciliation(message, sender),
  "BULK_OPEN_WORKER": (message, sender) => openBulkWorker(message, sender),
  "BULK_EXTRACT_SAVE_WORKER": (message, sender) => extractSaveBulkWorker(message, sender),
  "BULK_CLOSE_WORKER": (message, sender) => closeBulkWorker(message, sender),
  "BULK_RECORD_EXISTING_SKIP": (message, sender) => recordBulkExistingSkip(message, sender),
  "BULK_RECORD_RESULT": (message, sender) => recordBulkResult(message, sender),
  "BULK_FINISH_RUN": (message, sender) => finishBulkRun(message, sender),
  "BULK_FAIL_RUN": (message, sender) => failBulkRun(message, sender),
  "RETRY_BULK_FAILURE": (message, sender) => retryBulkFailure(message),
  "START_MASS_RENEWAL_BATCH": (message, sender) => startMassRenewalBatch(message),
  "GET_MASS_RENEWAL_BATCH_STATUS": (message, sender) => getMassRenewalBatchStatus(),
  "MASS_RENEWAL_WATCHDOG_TICK": (message, sender) => massRenewalWatchdogTick(message, sender),
  "REQUEST_MASS_RENEWAL_STOP_AFTER_CURRENT": (message, sender) => requestMassRenewalStopAfterCurrent(message),
  "RETRY_MASS_RENEWAL_ITEM": (message, sender) => retryMassRenewalItem(message),
  "START_TEMPLATE_FILL": (message, sender) => startTemplateFill(message.inventoryId, { autoReplacementAllowed: message.autoReplacementAllowed === true, startConfirmationVersion: message.startConfirmationVersion }),
  "START_ARCHIVE_INSERTION": (message, sender) => startArchiveInsertion(message),
  "GET_ARCHIVE_INSERTION_STATUS": (message, sender) => getArchiveInsertionStatus(message),
  "START_TRASH_TEMPLATE_FILL": (message, sender) => startTrashTemplateFill(message.inventoryId, { supersedeFillId: message.supersedeFillId || null }),
  "GET_TRASH_TEMPLATE_FILL_STATUS": (message, sender) => getTrashTemplateFillStatus(message),
  "GET_RECOVERABLE_TRASH_TEMPLATE_FILL": (message, sender) => getRecoverableTrashTemplateFill(),
  "PREPARE_TRASH_TEMPLATE_INVENTORY_CAPTURE": (message, sender) => prepareTrashTemplateInventoryCapture(message),
  "COMPLETE_TRASH_TEMPLATE_FLOW": (message, sender) => completeTrashTemplateFlow(message),
  "GET_APP_NOTICE": (message, sender) => getAppNotice(),
  "DISMISS_APP_NOTICE": (message, sender) => dismissAppNotice(message),
  "RENEWAL_PUBLISH_CLICKED": (message, sender) => markRenewalPublishClicked(message, sender),
  "GET_TEMPLATE_FILL_SESSION": (message, sender) => getTemplateFillSession(sender),
  "GET_TEMPLATE_IMAGE_CHUNK": (message, sender) => templateImageChunk(message, sender),
  "UPDATE_TEMPLATE_FILL_SESSION": (message, sender) => updateTemplateFillSession(message, sender),
  "GET_DIAGNOSTICS": (message, sender) => readDiagnostics(),
  })
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const messageContract = MessageContractRegistry.route(message?.type, 'background');
  backgroundMessageRouter.dispatch(message, sender, { messageContract }).then(
    result => sendResponse({ ok: true, result }),
    async error => {
      const run = await getBulkRunState().catch(() => null);
      const lifecycleGone = isNormalTabGoneLifecycleError(error, message);
      const expectedPostRecoveryBulkClose = isExpectedPostRecoveryBulkClose(error, message, run);
      const requestCorrelation = await resolveClientDiagnosticCorrelation(message, sender).catch(() => ({}));
      const contractRejected = ['KR_MESSAGE_CONTRACT_UNKNOWN', 'KR_MESSAGE_CONTRACT_TARGET_MISMATCH'].includes(String(error?.code || ''));
      const requestEvent = contractRejected
        ? 'MESSAGE_CONTRACT_REJECTED'
        : (lifecycleGone
          ? 'BACKGROUND_REQUEST_EXPECTED_TAB_CLOSED'
          : (expectedPostRecoveryBulkClose ? 'BACKGROUND_REQUEST_EXPECTED_BULK_CLOSE' : (TabRegistry.isGoneError(error) ? 'BACKGROUND_REQUEST_TAB_GONE' : 'BACKGROUND_REQUEST_FAILED')));
      await logDiagnostic(contractRejected ? 'warning' : (expectedPostRecoveryBulkClose ? 'info' : (lifecycleGone ? 'info' : 'error')), requestEvent, {
        message: String(error.message || error).slice(0, 600),
        ...((lifecycleGone || expectedPostRecoveryBulkClose) ? {} : { stack: String(error.stack || '').slice(0, 3000) }),
        requestType: message?.type || null,
        messageContract: { registered: messageContract.registered, targetRegistered: messageContract.targetRegistered, targets: messageContract.targets },
        stage: run?.stage || null
      }, {
        module: 'background',
        operation: message?.type || 'runtime-request',
        context: {
          ...requestCorrelation,
          adId: run?.currentAdId || message?.adId || null,
          workerTabId: requestCorrelation.workerTabId || run?.workerTabId || null,
          senderTabId: sender?.tab?.id ?? null
        }
      }).catch(() => {});
      sendResponse({ ok: false, error: error.message, errorCode: error?.code || null, errorDetails: error?.details && typeof error.details === 'object' ? error.details : null });
    }
  );
  return true;
});

chrome.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo?.url && changeInfo?.status !== 'complete') return;
  void maybeDetectTrashTemplatePublishedAd(tabId, changeInfo, tab).catch(error => {
    void logDiagnostic('warning', 'TRASH_TEMPLATE_PUBLISH_DETECTION_FAILED', {
      tabId: Number(tabId || 0) || null,
      message: String(error?.message || error || '').slice(0, 500)
    }, { module: 'background', operation: 'trash-template-publish-detection', context: { targetTabId: Number(tabId || 0) || null } }).catch(() => {});
  });
});

chrome.action?.onClicked?.addListener(() => {
  void openOrFocusAppWindow().catch(error => {
    void logDiagnostic('error', 'APP_WINDOW_OPEN_FAILED', { message: String(error?.message || error).slice(0, 600) }, { module: 'background', operation: 'app-window' }).catch(() => {});
  });
});

void reconcileTabRegistry().catch(() => {});
chrome.runtime.onStartup?.addListener(() => { void reconcileTabRegistry().catch(() => {}); });

// Opportunistic lifecycle cleanup is sufficient for the 30-day archive: it runs
// whenever the service worker starts, and again before each inventory/trash listing.
void purgeExpiredTrash().catch(() => {});
chrome.runtime.onStartup?.addListener(() => { void purgeExpiredTrash().catch(() => {}); });
chrome.runtime.onInstalled?.addListener(() => { void purgeExpiredTrash().catch(() => {}); });

// Bulk inventory recovery: extension reload/browser restart invalidates the session lease,
// while an independent watchdog enforces the hard per-item deadline even if the source loop stalls.
void ensureBulkRuntimeRecovery().catch(() => {});
void bulkRunWatchdogTick().catch(() => {});
if (typeof setInterval === 'function') setInterval(() => { void bulkRunWatchdogTick().catch(() => {}); }, BULK_RUN_WATCHDOG_TICK_MS);

// Recover persisted workflows only when no platform safety stop is active.
void readPlatformAccessRestriction().then(state => {
  if (state?.active) return;
  void resumePendingRenewals().finally(() => resumeMassRenewalBatch().catch(() => {})).catch(() => {});
  void resumePendingArchiveInsertions().catch(() => {});
}).catch(() => {});
