const AppElements = globalThis.KRDeps?.require?.('KRAppElements');
if (!AppElements) throw new Error('app-elements.js must load before app.js');
const { appVersion, controlStatus, statusDot, statusTitle, statusText, statusFacts, statusTime, statusAction, statusDismiss, messageHistoryOpen, messageHistoryDialog, messageHistoryClose, messageHistoryDone, messageHistoryClear, messageHistoryList, messageHistoryEmpty, profileSelect, profileManageButton, profileDetectedText, profileAccountStatusDot, profileManagerDialog, profileManagerClose, profileManagerDone, profileManagerList, profileManagerStatus, profileImportButton, profileBackupFileInput, renewalModeIndicator, renewalModeSafeButton, renewalModeFastButton, renewalModeDescription, renewalRetryRange, renewalRetryValue, diagnosticZipButton, diagnosticResetButton, emergencyWorkflowResetButton, diagnosticZipStatus, diagnosticResetBlockReasonElement, actionAvailability, actionAvailabilityTitle, actionAvailabilityText, actionsAccordion, configurationAccordion, diagnosticsAccordion, actionsActivityIndicator, inventoryButton, fullInventoryButton, archiveInsertButton, massRenewalButton, clearInventoryButton, refreshButton, inventoryList, progress, bulkRunStatus, inventoryCount, inventorySearchInput, inventorySortKey, inventorySortAsc, inventorySortDesc, inventorySection, trashSection, inventoryViewButton, trashViewButton, inventoryHeaderCount, trashHeaderCount, trashCount, trashList, globalViewDetailed, globalViewCompact, appHeader, controlPanel, inventoryStickySentinel, trashStickySentinel, inventoryStickyHeader, trashStickyHeader, inventoryStickySlot, trashStickySlot, inventoryStickyOcclusion, trashStickyOcclusion, primaryActions, appNotice, appNoticeTitle, appNoticeText, appNoticeTime, appNoticeDismiss, renewalStartDialog, renewalStartClose, renewalStartCancel, renewalStartConfirm, renewalStartCover, renewalStartTitle, renewalStartSourceId, renewalStartKicker, renewalStartDialogTitle, renewalStartDialogText, renewalStartSource, renewalStartSourceLabel, renewalStartSafety, renewalStartSafetyTitle, renewalStartSafetyText, renewalPhase1Label, renewalPhase2Label, renewalPhase3Label, renewalPhase4Label, renewalStartSteps, renewalStartActions, renewalProgressMessage, renewalProgressMessageTitle, renewalProgressMessageText, renewalBackgroundHint, renewalProgressActions, renewalProgressClose, renewalProgressView, renewalProgressEdit, renewalProgressShortcut, renewalProgressShortcutTitle, renewalProgressShortcutText, actionConfirmDialog, actionConfirmTitle, actionConfirmText, actionConfirmDetail, actionConfirmClose, actionConfirmCancel, actionConfirmSubmit, archiveInsertDialog, archiveInsertClose, archiveInsertCancel, archiveInsertConfirm, archiveInsertKicker, archiveInsertTitle, archiveInsertIntro, archiveDropzone, archiveFileInput, archiveChooseFile, archiveValidationStatus, archivePreview, archivePreviewCover, archivePreviewTitle, archivePreviewMeta, archiveInsertSafety, archiveInsertSteps, archivePhase3Label, archiveProgressMessage, archiveProgressMessageTitle, archiveProgressMessageText, archiveBackgroundHint, archiveInsertActions, archiveProgressActions, archiveProgressClose, archiveProgressView, archiveProgressEdit, trashTemplateDialog, trashTemplateClose, trashTemplateCancel, trashTemplateConfirm, trashTemplateCover, trashTemplateTitle, trashTemplateSourceTitle, trashTemplateSourceMeta, trashTemplateIntro, trashTemplateSteps, trashTemplateProgressMessage, trashTemplateProgressTitle, trashTemplateProgressText, trashTemplateConfirmActions, trashTemplateProgressActions, trashTemplateDone, trashTemplateRestart, trashTemplateTarget, trashTemplateInventory, massRenewalDialog, massRenewalClose, massRenewalCancel, massRenewalBack, massRenewalNext, massRenewalStart, massRenewalStopAfterCurrent, massRenewalDone, massRenewalKicker, massRenewalIntro, massRenewalSelectionPanel, massRenewalOrderPanel, massRenewalOrderList, massRenewalProgressPanel, massRenewalSummaryPanel, massRenewalSelectionBody, massRenewalSelectionCount, massRenewalProgressTitle, massRenewalProgressCount, massRenewalProgressList, massRenewalSummaryCount, massRenewalSummaryList, inventoryCaptureDialog, inventoryCaptureClose, inventoryCaptureKicker, inventoryCaptureTitle, inventoryCaptureIntro, inventoryCaptureOptions, inventoryCaptureScopeAll, inventoryCaptureScopeNewOnly, inventoryCaptureScopeDescription, inventoryCaptureVerificationFast, inventoryCaptureVerificationSafe, inventoryCaptureVerificationDescription, inventoryCaptureModeNotice, inventoryCaptureModeScope, inventoryCaptureModeVerification, inventoryCaptureModeText, inventoryCaptureConfirmPanel, inventoryCaptureConfirmTitle, inventoryCaptureConfirmText, inventoryCaptureConfirmMeta, inventoryCaptureCandidateSection, inventoryCaptureCandidateList, inventoryCaptureSelectedCandidate, inventoryCaptureBulkCurrentCandidate, inventoryCaptureProgressPanel, inventoryCaptureProgressTitle, inventoryCaptureProgressText, inventoryCaptureProgressTrack, inventoryCaptureProgressFill, inventoryCaptureProgressCount, inventoryCaptureResultPanel, inventoryCaptureResult, inventoryCaptureResultTitle, inventoryCaptureResultText, inventoryCaptureResultMeta, inventoryCaptureResultDetails, inventoryCaptureCancel, inventoryCaptureStart, inventoryCaptureStopAfterCurrent, inventoryCaptureDone, inventoryCaptureProgressShortcut, inventoryCaptureProgressShortcutTitle, inventoryCaptureProgressShortcutText } = AppElements.collect(document).flat;
const DISMISSED_UI_MESSAGES_KEY = 'dismissedUiMessagesV1';
const LEGACY_ARCHIVE_INSERT_STATUS_ID = 'status:Anzeige aus ZIP wird inseriert';
const UI_ACTIVITY_CURRENT_KEY = 'uiCurrentActivityV1';
const UI_ACTIVITY_HISTORY_KEY = 'uiActivityHistoryV1';
const UI_ACTIVITY_HISTORY_OVERFLOW_KEY = 'uiActivityHistoryOverflowV1';
const UI_ACTIVITY_DISMISSED_FINGERPRINTS_KEY = 'uiActivityDismissedFingerprintsV1';
const UI_ACTIVITY_HISTORY_MAX_ITEMS = 250;
const UI_ACTIVITY_HISTORY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
let dismissedUiMessages = {};
let dismissedUiMessagesLoaded = false;


























function setPrimaryActionsFocusModality(modality) {
  if (!primaryActions || (modality !== 'pointer' && modality !== 'keyboard')) return;
  primaryActions.dataset.focusModality = modality;
}

document.addEventListener('pointerdown', () => {
  setPrimaryActionsFocusModality('pointer');
}, true);

document.addEventListener('keydown', event => {
  const keyboardNavigation = event.key === 'Tab';
  const keyboardActivation = (event.key === 'Enter' || event.key === ' ') && primaryActions?.contains(document.activeElement);
  if (keyboardNavigation || keyboardActivation) setPrimaryActionsFocusModality('keyboard');
}, true);

























































































































































const KRDeps = globalThis.KRDeps;
if (!KRDeps) throw new Error('runtime-deps.js must load before app.js');
const MessageContractRegistry = KRDeps.require('KRMessageContractRegistry');
const RenewalPolicy = KRDeps.require('KRRenewalPolicy');
const InventoryView = KRDeps.require('KRInventoryView');
const InventoryExport = KRDeps.require('KRInventoryExport');
const ProfileBackup = KRDeps.require('KRProfileBackup');
const ProfileBackupStorageService = KRDeps.require('KRProfileBackupStorageService');
const ProfileBackupController = KRDeps.require('KRProfileBackupController');
const AccountGate = KRDeps.require('KRAccountGate');
const ProfileAccountUiController = KRDeps.require('KRProfileAccountUiController');
const InventoryImport = KRDeps.require('KRInventoryImport');
const DiagnosticZip = KRDeps.require('KRDiagnosticZip');
const AppActivityCenter = KRDeps.require('KRAppActivityCenter');
const ActionsDiagnosticsController = KRDeps.require('KRActionsDiagnosticsController');
const ControlAccordionController = KRDeps.require('KRControlAccordionController');
const DiagnosticsControlsController = KRDeps.require('KRDiagnosticsControlsController');
const RenewalSettingsController = KRDeps.require('KRRenewalSettingsController');
const AppLayoutController = KRDeps.require('KRAppLayoutController');
const TabPageInspectionController = KRDeps.require('KRTabPageInspectionController');
const SharedUiHelpers = KRDeps.require('KRSharedUiHelpers');
const InventoryFormatting = KRDeps.require('KRInventoryFormatting');
const RecordCardView = KRDeps.require('KRRecordCardView');
const InventoryCardRenderer = KRDeps.require('KRInventoryCardRenderer');
const TrashCardRenderer = KRDeps.require('KRTrashCardRenderer');
const InventoryRenderController = KRDeps.require('KRInventoryRenderController');
const RenewalDialogController = KRDeps.require('KRRenewalDialogController');
const InventoryCaptureView = KRDeps.require('KRInventoryCaptureView');
const InventoryCandidateModel = KRDeps.require('KRInventoryCandidateModel');
const InventoryCaptureController = KRDeps.require('KRInventoryCaptureController');
const MassRenewalUiController = KRDeps.require('KRMassRenewalUiController');
const ArchiveInsertionUiController = KRDeps.require('KRArchiveInsertionUiController');
const TrashTemplateUiController = KRDeps.require('KRTrashTemplateUiController');
const ArchiveTrashInsertionUiController = KRDeps.require('KRArchiveTrashInsertionUiController');
const sharedUiHelpers = SharedUiHelpers.create({ document, inventoryView: InventoryView });
const inventoryFormatting = InventoryFormatting.create({ sharedUiHelpers });
const tabPageInspectionController = TabPageInspectionController.create({
  chrome,
  runtimeMessage,
  logEvent(event, details = {}, severity = 'info', operation = 'tab-page-inspection') {
    return runtimeMessage({ type: 'LOG_DIAGNOSTIC_EVENT', severity, event, module: 'app', operation, details }).catch(() => null);
  }
});
const UNASSIGNED_PROFILE_ID = '__unassigned__';
const RENEWAL_MODE_SAFE = RenewalPolicy.RENEWAL_MODE_SAFE;
const RENEWAL_MODE_FAST = RenewalPolicy.RENEWAL_MODE_FAST;
const INVENTORY_SCOPE_ALL = 'all';
const INVENTORY_SCOPE_NEW_ONLY = 'new-only';
const RENEWAL_PHASE_ATTEMPTS_DEFAULT = RenewalPolicy.RENEWAL_PHASE_ATTEMPTS_DEFAULT;
const MASS_RENEWAL_MAX_ITEMS = 10;
const BULK_RUN_STORAGE_KEY = 'bulkInventoryRun';
const MASS_RENEWAL_BATCH_STORAGE_KEY = 'massRenewalBatchV1';
const TAB_REGISTRY_STORAGE_KEY = 'tabRegistryV1';
const GLOBAL_LIST_VIEW_MODE_KEY = 'globalListViewModeV1';
const LEGACY_INVENTORY_LIST_VIEW_MODE_KEY = 'inventoryListViewModeV1';
const LEGACY_TRASH_LIST_VIEW_MODE_KEY = 'trashListViewModeV1';
const ACCOUNT_HEALTH_FALLBACK_MS = 60000;
let activeTabId = null;
let fullInventoryTabId = null;
let currentRecords = [];
let currentTrashRecords = [];
let currentView = 'inventory';
let currentAppNotice = null;
let currentInsertionLock = { locked: false };
const previewUrlCache = new Map();
let inspectInFlight = null;
let pagePollTimer = null;
let pagePollDueAt = 0;
let pagePollingStopped = false;
let accountGateState = AccountGate?.createInitial?.() || { status: 'checking', profile: null, ambiguousNames: [], reason: 'startup', source: 'startup', confirmedAt: null, changedAt: new Date().toISOString(), generation: 0 };
let currentProfileState = { profiles: [], detectedProfileId: null, selectedProfileId: null, unassigned: { profileId: UNASSIGNED_PROFILE_ID, displayName: 'Nicht zugeordnet', inventoryCount: 0, trashCount: 0, totalCount: 0 } };
let selectedProfileId = null;
let lastInspectHealthy = false;
let lastInspectViewKey = '';
let lastAccountGateSignature = '';
let lastProfileBindingSnapshot = null;
let accountGatePresentationSyncing = false;
const profileAccountUiController = ProfileAccountUiController.create({
  document, AccountGate, unassignedProfileId: UNASSIGNED_PROFILE_ID,
  elements: { profileSelect, profileDetectedText, profileAccountStatusDot, profileManagerList, profileManagerStatus },
  profileTransferLocked, profileTransferStatusText,
  onSelectProfile: selectInventoryProfile,
  onDeleteProfile: deleteManagedProfile,
  onExportProfileBackup: exportProfileBackup,
  onBackupError() { setProfileManagerStatus('Inventarprofil konnte nicht gesichert werden.', true); setStatus('error', 'Inventarprofil nicht gesichert', 'Am Inventarprofil selbst wurde nichts verändert.'); }
});
let inventoryViewState = { query: '', sortKey: 'endDate', direction: 'asc' };
let globalListViewMode = 'detailed';
let inventorySearchTimer = null;
let inventoryLiveRefreshTimer = null;
let globalRefreshFeedbackTimer = null;
const discardedTabBackoff = new Map();
const managedWorkerTabIds = new Set();
const knownUserKleinanzeigenTabIds = new Set();
let lastDiscardedKleinanzeigenTabs = [];
const migrationPromptedProfiles = new Set();
let currentRenewalConfiguration = { renewalMode: RENEWAL_MODE_SAFE, fastModeAcknowledged: false, maxPhaseAttempts: RENEWAL_PHASE_ATTEMPTS_DEFAULT };
let controlAccordionController = null;
let diagnosticsControlsController = null;
let renewalSettingsController = null;
let currentBulkRunState = null;
let bulkStartInFlight = false;
let currentStatusAction = '';
let reactivateDiscardedInFlight = false;
let modalScrollLockPosition = null;
let profileBackupController = null;




function profileTransferStartBlocker() {
  if (insertionLockActive()) return insertionLockUiText();
  if (bulkStartInFlight || String(currentBulkRunState?.status || '') === 'running' || currentBulkRunState?.retryAdId) return 'Während einer laufenden Erfassung kann keine Profilsicherung gestartet oder wiederhergestellt werden.';
  if (singleInventoryCaptureBusy()) return 'Während einer laufenden Erfassung kann keine Profilsicherung gestartet oder wiederhergestellt werden.';
  return '';
}

function requireProfileBackupController() {
  if (!profileBackupController) {
    profileBackupController = ProfileBackupController.create({
      document,
      crypto,
      indexedDB,
      IDBKeyRange,
      ProfileBackup,
      ProfileBackupStorageService,
      DiagnosticZip,
      unassignedProfileId: UNASSIGNED_PROFILE_ID,
      elements: { profileManagerDialog, profileManagerClose, profileManagerDone, profileImportButton, profileBackupFileInput },
      getStartBlocker: profileTransferStartBlocker,
      setProfileManagerStatus,
      renderProfileManager,
      getProfileState: () => currentProfileState,
      syncDiagnosticResetUi,
      runtimeMessage,
      loadLocalImageForExport,
      downloadGeneratedBlob,
      logAppEvent,
      confirmAction,
      invalidImportError,
      renderProfileSwitcher,
      refreshInventories,
    publishTrashTemplateRecoveryActivity: activity => publishUiActivity({ id: 'trash-template-recovery', slot: 'status', createdAt: new Date().toISOString(), ...activity }),
    clearTrashTemplateRecoveryActivity: () => clearUiActivity('trash-template-recovery'),
      refreshBulkStatus,
      extensionVersion: () => chrome.runtime.getManifest().version
    });
  }
  return profileBackupController;
}

function profileTransferLocked() { return requireProfileBackupController().locked(); }
function profileTransferStatusText() { return requireProfileBackupController().statusText(); }
function syncProfileTransferUi() { return requireProfileBackupController().syncUi(); }

function handleEmergencyWorkflowReset() {
  bulkStartInFlight = false;
  requireProfileBackupController().handleEmergencyWorkflowReset();
  requireInventoryCaptureController().handleEmergencyWorkflowReset();
  requireArchiveTrashInsertionUiController().handleEmergencyWorkflowReset();
  if (renewalDialogController) renewalDialogController.resetTracking({ closeProgress: true, reason: 'emergency-reset' });
  if (massRenewalUiController) massRenewalUiController.resetSelection();
}

function friendlyProfileBackupImportError(error) {
  if (String(error?.code || '') === 'KR_INVALID_PROFILE_BACKUP') return 'Die ausgewählte Datei ist keine gültige Profilsicherung.';
  return 'Profilsicherung konnte nicht wiederhergestellt werden.';
}

function friendlyArchiveImportError(error) {
  if (String(error?.code || '') === 'KR_INVALID_AD_ARCHIVE') return 'Die ausgewählte Datei ist kein gültiger Anzeigenexport.';
  return 'ZIP konnte nicht verwendet werden.';
}

function invalidImportError(code, userMessage, technicalError) {
  const error = new Error(userMessage);
  error.code = code;
  error.technicalMessage = String(technicalError?.message || technicalError || '');
  return error;
}

if (appVersion) { const manifest = chrome.runtime.getManifest(); appVersion.textContent = `v${manifest.version_name || manifest.version}`; }

function requireControlAccordionController() {
  if (controlAccordionController) return controlAccordionController;
  if (!ControlAccordionController?.create) throw new Error('control-accordion-controller.js must load before accordion controls are used');
  controlAccordionController = ControlAccordionController.create({
    accordions: [actionsAccordion, configurationAccordion, diagnosticsAccordion],
    logEvent: logAppEvent,
    getComputedStyle: globalThis.getComputedStyle,
    matchMedia: globalThis.matchMedia,
    watchdogGraceMs: 700
  });
  return controlAccordionController;
}

function controlAccordionReducedMotion() { return requireControlAccordionController().reducedMotion(); }
function controlAccordionHeader(accordion) { return requireControlAccordionController().header(accordion); }
function sanitizeControlAccordionAnimations(source = 'sanity-check') { return requireControlAccordionController().sanitize(source); }
function controlAccordionDiagnosticSnapshot(accordion) { return requireControlAccordionController().diagnosticSnapshot(accordion); }

requireControlAccordionController();

function workflowActivityModel({ insertionLocked = false, bulkRunning = false, singleRunning = false } = {}) {
  return { running: Boolean(insertionLocked || bulkRunning || singleRunning) };
}

function syncActionsActivityIndicator() {
  if (!actionsActivityIndicator) return;
  const model = workflowActivityModel({
    insertionLocked: insertionLockActive(),
    bulkRunning: bulkStartInFlight || String(currentBulkRunState?.status || '') === 'running' || Boolean(currentBulkRunState?.retryAdId),
    singleRunning: singleInventoryCaptureBusy()
  });
  actionsActivityIndicator.classList.toggle('is-running', model.running);
  actionsActivityIndicator.title = model.running ? 'Vorgang läuft' : '';
  syncDiagnosticResetUi();
}

function syncModalScrollLock() {
  const hasOpenModal = Boolean(document.querySelector('dialog[open]'));
  const locked = document.documentElement.classList.contains('modal-scroll-locked');
  if (hasOpenModal && !locked) {
    modalScrollLockPosition = { x: window.scrollX, y: window.scrollY };
    document.documentElement.classList.add('modal-scroll-locked');
    document.body.classList.add('modal-scroll-locked');
    return;
  }
  if (!hasOpenModal && locked) {
    const position = modalScrollLockPosition;
    modalScrollLockPosition = null;
    document.documentElement.classList.remove('modal-scroll-locked');
    document.body.classList.remove('modal-scroll-locked');
    if (position) window.scrollTo(position.x, position.y);
  }
}

const modalOpenObserver = new MutationObserver(syncModalScrollLock);
for (const dialog of document.querySelectorAll('dialog')) {
  modalOpenObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  dialog.addEventListener('close', syncModalScrollLock);
}
syncModalScrollLock();

function logAppEvent(event, details = {}, severity = 'info') {
  return runtimeMessage({ type: 'LOG_DIAGNOSTIC_EVENT', severity, event, module: 'app', operation: 'user-action', details }).catch(() => null);
}

function transientTabMessageError(error) {
  const text = String(error?.message || error || '');
  return /Receiving end does not exist|Could not establish connection|message port closed|No tab with id|The tab was closed/i.test(text);
}
function isExpectedTabClosedError(error) {
  const text = String(error?.message || error || '');
  return error?.code === 'KR_TAB_EXPECTED_CLOSED' || /KR_TAB_EXPECTED_CLOSED/i.test(text);
}
function isTabGoneError(error) {
  const text = String(error?.message || error || '');
  return isExpectedTabClosedError(error) || error?.code === 'KR_TAB_GONE' || /KR_TAB_GONE|No tab with id|The tab was closed/i.test(text);
}
function isTabDiscardedError(error) {
  const text = String(error?.message || error || '');
  return error?.code === 'KR_TAB_DISCARDED' || /von Chrome verworfen/i.test(text);
}
function lifecycleTabError(code, message, tabId) {
  const error = new Error(message);
  error.code = code;
  error.tabId = Number(tabId || 0) || null;
  return error;
}
function classifyTabLifecycleFailure(tabId, error, operation) { return tabPageInspectionController.classifyTabLifecycleFailure(tabId, error, operation); }

function imagePreviewKey(record, image) {
  return String(image?.imageKey || `${record?.inventoryId || record?.adId || 'unknown'}:${Number(image?.position || 0)}`);
}

function imagePreviewSignature(image) {
  return String(image?.sha256 || [image?.size || '', image?.mimeType || '', image?.width || '', image?.height || ''].join('|'));
}

function clearPreviewUrls() {
  for (const entry of previewUrlCache.values()) URL.revokeObjectURL(entry.url);
  previewUrlCache.clear();
}
window.addEventListener('pagehide', clearPreviewUrls);

function purgePreviewUrlsForRecord(record) {
  for (const image of record?.images || []) {
    const key = imagePreviewKey(record, image);
    const cached = previewUrlCache.get(key);
    if (!cached) continue;
    URL.revokeObjectURL(cached.url);
    previewUrlCache.delete(key);
  }
}

async function loadLocalPreview(img, record, image) {
  const key = imagePreviewKey(record, image);
  const signature = imagePreviewSignature(image);
  const cached = previewUrlCache.get(key);
  if (cached && cached.signature === signature) {
    if (img.src !== cached.url) img.src = cached.url;
    img.dataset.previewKey = key;
    return;
  }

  let db;
  try {
    db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('kleinanzeigen-renewal');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const saved = await new Promise((resolve, reject) => {
      const request = db.transaction('images').objectStore('images').get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!saved?.blob) throw new Error('Keine lokale Bildkopie vorhanden');
    if (!img.isConnected) return;
    const prior = previewUrlCache.get(key);
    if (prior) URL.revokeObjectURL(prior.url);
    const url = URL.createObjectURL(saved.blob);
    previewUrlCache.set(key, { url, signature });
    if (img.src !== url) img.src = url;
    img.dataset.previewKey = key;
  } catch {
    img.alt = 'Bild nicht verfügbar';
    img.title = 'Die lokale Bildkopie ist nicht verfügbar. Bitte die Anzeigendaten aktualisieren.';
  } finally {
    db?.close();
  }
}

async function loadLocalImageForExport(imageKey) {
  let db;
  try {
    db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('kleinanzeigen-renewal');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Lokaler Bildspeicher konnte nicht geöffnet werden.'));
    });
    return await new Promise((resolve, reject) => {
      const request = db.transaction('images').objectStore('images').get(String(imageKey || ''));
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Lokale Bildkopie konnte nicht gelesen werden.'));
    });
  } finally {
    db?.close();
  }
}

async function exportInventoryRecord(record) {
  if (!InventoryExport?.createInventoryArchive || !DiagnosticZip?.createZip) {
    throw new Error('Exportfunktion ist nicht verfügbar.');
  }
  const result = await InventoryExport.createInventoryArchive(record, {
    loadImage: loadLocalImageForExport,
    createZip: DiagnosticZip.createZip,
    extensionVersion: chrome.runtime.getManifest().version
  });
  const url = URL.createObjectURL(result.blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  return result;
}


function downloadGeneratedBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}

async function exportProfileBackup(profile) { return requireProfileBackupController().exportProfileBackup(profile); }
async function importProfileBackupFile(file) { return requireProfileBackupController().importProfileBackupFile(file); }

async function stageArchiveImages(parsed, archiveInsertionId) {
  const stagingInventoryId = `archive:${archiveInsertionId}`;
  const record = JSON.parse(JSON.stringify(parsed.record));
  const sourceImages = Array.isArray(record.images) ? record.images : [];
  const stagedImages = parsed.images.map((image, index) => {
    const source = sourceImages.find(item => String(item?.imageKey || '') === String(image.originalImageKey || '')) || sourceImages[index] || {};
    const imageKey = `${stagingInventoryId}:${index}`;
    return {
      imageKey,
      inventoryId: stagingInventoryId,
      position: index,
      blob: image.blob,
      mimeType: 'image/jpeg',
      size: image.size,
      width: image.width,
      height: image.height,
      sha256: image.sha256,
      capturedAt: new Date().toISOString(),
      sourceUrl: null,
      originalImageKey: image.originalImageKey || null,
      isPrimary: Boolean(image.isPrimary || index === 0),
      uploadReady: true,
      locallyStored: true,
      ...Object.fromEntries(Object.entries(source).filter(([key]) => !['imageKey', 'inventoryId', 'position', 'blob', 'mimeType', 'size', 'width', 'height', 'sha256', 'isPrimary'].includes(key)))
    };
  });
  record.images = stagedImages.map(({ blob, ...image }) => image);
  record.imageSummary = {
    ...(record.imageSummary || {}),
    discovered: stagedImages.length,
    locallyStored: stagedImages.length,
    uploadReadyJpeg: stagedImages.length
  };

  let db;
  try {
    db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('kleinanzeigen-renewal');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Lokaler Bildspeicher konnte nicht geöffnet werden.'));
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      const store = tx.objectStore('images');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('ZIP-Bilder konnten nicht vorbereitet werden.'));
      tx.onabort = () => reject(tx.error || new Error('ZIP-Bilder konnten nicht vorbereitet werden.'));
      for (const image of stagedImages) store.put(image);
    });
  } finally { db?.close(); }
  return { stagingInventoryId, record };
}

async function cleanupArchiveStaging(stagingInventoryId) {
  if (!stagingInventoryId) return;
  let db;
  try {
    db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('kleinanzeigen-renewal');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      const index = tx.objectStore('images').index('inventoryId');
      const cursor = index.openKeyCursor(IDBKeyRange.only(String(stagingInventoryId)));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      cursor.onsuccess = () => {
        const row = cursor.result;
        if (!row) return;
        tx.objectStore('images').delete(row.primaryKey);
        row.continue();
      };
    });
  } catch { /* Best-effort cleanup; background also expires stale archive sessions. */ }
  finally { db?.close(); }
}

async function startKnownSingleInventoryCapture({ fillId, tabId, adId }) {
  const sourceTabId = Number(tabId || 0) || null;
  const expectedAdId = String(adId || '');
  const expectedFillId = String(fillId || '');
  if (!expectedFillId || !sourceTabId || !/^\d+$/.test(expectedAdId)) throw new Error('Die veröffentlichte Anzeige konnte nicht eindeutig zugeordnet werden.');
  const preview = await runtimeMessage({ type: 'PREPARE_TRASH_TEMPLATE_INVENTORY_CAPTURE', fillId: expectedFillId, tabId: sourceTabId, adId: expectedAdId });
  if (!preview || String(preview.adId || '') !== expectedAdId) throw new Error('Die veröffentlichte Anzeige konnte nicht sicher für die Erfassung vorbereitet werden.');
  requireInventoryCaptureController().setKnownSingleCandidate(preview, sourceTabId, expectedAdId);
  if (trashTemplateDialog?.open) trashTemplateDialog.close('inventory-started');
  requireInventoryCaptureController().showDialog();
  return startSingleInventoryCapture();
}

function friendlyErrorMessage(error, fallback = 'Der Vorgang konnte nicht abgeschlossen werden. Bitte versuche es erneut.') {
  const text = String(error?.message || error || '');
  if (error?.code === 'KR_PLATFORM_ACCESS_RESTRICTED' || /Zugriff vorübergehend eingeschränkt/i.test(text)) {
    return 'Kleinanzeigen hat den Zugriff vorübergehend eingeschränkt. Der Vorgang wurde sicher beendet. Bitte versuche es später erneut.';
  }
  if (error?.code === 'KR_MY_ADS_INCONSISTENT') {
    const expectedOnline = Number(error?.details?.expectedOnline);
    const listingCount = Number(error?.details?.listingCount);
    if (Number.isInteger(expectedOnline) && expectedOnline >= 0 && Number.isInteger(listingCount) && listingCount >= 0) {
      return `Kleinanzeigen meldet derzeit ${expectedOnline} Anzeigen, zeigt aber erst ${listingCount} vollständig an. Deshalb wurde die Erfassung zur Sicherheit nicht gestartet. Bitte warte kurz und versuche es anschließend erneut.`;
    }
    return 'Kleinanzeigen zeigt den Anzeigenbestand derzeit nicht vollständig und widerspruchsfrei an. Deshalb wurde die Erfassung zur Sicherheit nicht gestartet. Bitte warte kurz und versuche es anschließend erneut.';
  }
  if (/timeout|timed out|Zeitüberschreitung|nicht rechtzeitig/i.test(text)) {
    return 'Kleinanzeigen antwortet nicht. Der Vorgang wurde sicher beendet. Bitte versuche es später erneut.';
  }
  if (/Receiving end does not exist|message channel|message port closed|Content Script|Could not establish connection|No tab with id|tab was closed/i.test(text)) {
    return 'Die Kleinanzeigen-Seite konnte nicht gelesen werden. Bitte lade die Seite neu und versuche es erneut.';
  }
  if (/PROJECTS|Meine Anzeigen/i.test(text)) return '„Meine Anzeigen“ konnte nicht eindeutig geprüft werden. Bitte versuche es erneut.';
  if (/Read-only|öffentliche.*nicht.*erkannt|Detailseite.*nicht.*erkannt/i.test(text)) return 'Die öffentliche Anzeige konnte noch nicht eindeutig geprüft werden. Bitte versuche es erneut.';
  if (/Profil/i.test(text)) return 'Das angemeldete Kleinanzeigen-Konto konnte nicht eindeutig geprüft werden.';
  return fallback;
}

function friendlyErrorPresentation(error, fallbackTitle = 'Vorgang nicht abgeschlossen', fallbackText = 'Der Vorgang konnte nicht abgeschlossen werden. Bitte versuche es erneut.') {
  const text = String(error?.message || error || '');
  if (isExpectedTabClosedError(error) || /planmäßig geschlossen/i.test(text)) return null;
  if (isTabGoneError(error)) {
    return { title: 'Vorgang unterbrochen', text: 'Ein benötigtes Kleinanzeigen-Fenster wurde geschlossen. Bitte versuche es erneut.' };
  }
  if (/timeout|timed out|Zeitüberschreitung|nicht rechtzeitig/i.test(text)) {
    return { title: 'Kleinanzeigen antwortet nicht', text: 'Der Vorgang wurde sicher beendet. Bitte versuche es später erneut.' };
  }
  if (/Receiving end does not exist|message channel|message port closed|Content Script|Could not establish connection/i.test(text)) {
    return { title: 'Seite konnte nicht gelesen werden', text: 'Bitte lade die Kleinanzeigen-Seite neu und versuche es erneut.' };
  }
  return { title: fallbackTitle, text: friendlyErrorMessage(error, fallbackText) };
}

function setFriendlyErrorStatus(error, fallbackTitle, fallbackText) {
  const model = friendlyErrorPresentation(error, fallbackTitle, fallbackText);
  if (!model) return;
  setStatus('error', model.title, model.text);
}

let actionConfirmResolve = null;
function settleActionConfirm(confirmed) {
  const resolve = actionConfirmResolve;
  actionConfirmResolve = null;
  if (actionConfirmDialog?.open) actionConfirmDialog.close(confirmed ? 'confirmed' : 'cancelled');
  if (resolve) resolve(Boolean(confirmed));
}

function confirmAction({ title, text, detail = '', confirmLabel = 'Bestätigen', cancelLabel = 'Abbrechen', danger = false } = {}) {
  if (actionConfirmResolve) settleActionConfirm(false);
  actionConfirmTitle.textContent = title || 'Bitte bestätigen';
  actionConfirmText.textContent = text || '';
  actionConfirmDetail.textContent = detail || '';
  actionConfirmDetail.classList.toggle('hidden', !detail);
  actionConfirmCancel.textContent = cancelLabel;
  actionConfirmSubmit.textContent = confirmLabel;
  actionConfirmSubmit.classList.toggle('danger-button', Boolean(danger));
  actionConfirmSubmit.classList.toggle('primary', !danger);
  actionConfirmDialog.showModal();
  return new Promise(resolve => { actionConfirmResolve = resolve; });
}
actionConfirmClose?.addEventListener('click', () => settleActionConfirm(false));
actionConfirmCancel?.addEventListener('click', () => settleActionConfirm(false));
actionConfirmSubmit?.addEventListener('click', () => settleActionConfirm(true));
actionConfirmDialog?.addEventListener('cancel', event => { event.preventDefault(); settleActionConfirm(false); });


const uiActivityCenter = AppActivityCenter.create({
  storageLocal: chrome.storage.local,
  document,
  keys: {
    current: UI_ACTIVITY_CURRENT_KEY,
    history: UI_ACTIVITY_HISTORY_KEY,
    overflow: UI_ACTIVITY_HISTORY_OVERFLOW_KEY,
    dismissed: UI_ACTIVITY_DISMISSED_FINGERPRINTS_KEY
  },
  legacyArchiveInsertStatusId: LEGACY_ARCHIVE_INSERT_STATUS_ID,
  maxItems: UI_ACTIVITY_HISTORY_MAX_ITEMS,
  retentionMs: UI_ACTIVITY_HISTORY_RETENTION_MS,
  messageTimestampText,
  reducedMotion: controlAccordionReducedMotion,
  logEvent: logAppEvent,
  setCurrentStatusAction: value => { currentStatusAction = String(value || ''); if (statusDismiss) statusDismiss.classList.toggle('hidden', currentStatusAction === 'resume-trash-template'); },
  elements: {
    controlStatus, statusDot, statusTitle, statusText, statusFacts, statusTime, statusAction,
    messageHistoryOpen, messageHistoryDialog, messageHistoryClose, messageHistoryDone, messageHistoryClear,
    messageHistoryList, messageHistoryEmpty, bulkRunStatus, appNotice, renewalProgressShortcut,
    inventoryCaptureProgressShortcut
  }
});

// Activity-center facade: app.js remains the UI orchestrator while persistence,
// retention, rendering and history state live in app-activity-center.js.
function dismissUiActivityUntilChanged(activity) { return uiActivityCenter.dismissUntilChanged(activity); }
function archiveUiActivity(activity) { return uiActivityCenter.archive(activity); }
function archiveTrashTemplateRecoveryActivityOnReset() {
  const activity = currentUiActivity();
  if (String(activity?.id || '') !== 'trash-template-recovery') return false;
  archiveUiActivity({ ...activity, kind: 'ready', title: 'Vorlagen-Inserat zurückgesetzt', text: 'Der Vorgang wurde manuell zurückgesetzt. Lokale Quelldaten bleiben erhalten.', facts: '', badgeLabel: 'Zurückgesetzt', active: false, action: '', actionLabel: '', actionData: null });
  return true;
}
function publishUiActivity(activity, options = {}) { return uiActivityCenter.publish(activity, options); }
function clearUiActivity(activityId = '') { return uiActivityCenter.clear(activityId); }
function renderMessageHistory() { return uiActivityCenter.renderHistory(); }
async function ensureUiActivityLoaded() { return uiActivityCenter.ensureLoaded(); }
function currentUiActivity() { return uiActivityCenter.current(); }
function currentUiActivityHistory() { return uiActivityCenter.history(); }

function closeMessageHistory() {
  if (messageHistoryDialog?.open) messageHistoryDialog.close('closed');
}

messageHistoryOpen?.addEventListener('click', async () => {
  await ensureUiActivityLoaded();
  renderMessageHistory();
  if (messageHistoryDialog && !messageHistoryDialog.open) messageHistoryDialog.showModal();
  void logAppEvent('USER_MESSAGE_HISTORY_OPENED', { count: currentUiActivityHistory().length });
});
messageHistoryClose?.addEventListener('click', closeMessageHistory);
messageHistoryDone?.addEventListener('click', closeMessageHistory);
messageHistoryClear?.addEventListener('click', async () => {
  await ensureUiActivityLoaded();
  const history = currentUiActivityHistory();
  if (!history.length) return;
  const confirmed = await confirmAction({
    title: 'Alle Meldungen löschen?',
    text: 'Der Meldungsverlauf wird vollständig geleert.',
    detail: 'Diagnosedaten, Inventar, Papierkorb und laufende Workflowdaten bleiben unverändert.',
    confirmLabel: 'Alles löschen',
    danger: true
  });
  if (!confirmed) return;
  const removed = await uiActivityCenter.clearHistory();
  void logAppEvent('USER_MESSAGE_HISTORY_CLEARED', { removed });
});
messageHistoryDialog?.addEventListener('cancel', event => { event.preventDefault(); closeMessageHistory(); });

function isPassiveAccountStatus(title = '', action = '') {
  if (action) return false;
  return /^(Angemeldet als |Kleinanzeigen-Konto wird geprüft|Kein Kleinanzeigen-Konto erkannt|Kleinanzeigen-Konto nicht eindeutig)/.test(String(title || ''));
}

function setStatus(kind, title, text, action = '', options = {}) {
  if (isPassiveAccountStatus(title, action)) return;
  const now = new Date().toISOString();
  const activity = {
    id: `status:${String(title || 'status').trim()}`,
    slot: 'status',
    kind: kind || '',
    title: String(title || ''),
    text: String(text || ''),
    facts: String(options?.facts || ''),
    badgeLabel: String(options?.badgeLabel || ''),
    createdAt: now,
    active: false,
    action: String(action || ''),
    actionLabel: String(options?.actionLabel || '') || (action === 'reactivate-discarded'
      ? 'Kleinanzeigen reaktivieren'
      : action === 'retry-platform-access' ? 'Erneut prüfen' : '')
  };
  statusDot.className = `status-dot ${kind || ''}`;
  statusTitle.textContent = activity.title;
  statusText.textContent = activity.text;
  if (statusFacts) {
    statusFacts.textContent = activity.facts;
    statusFacts.classList.toggle('hidden', !activity.facts);
  }
  currentStatusAction = activity.action;
  if (statusAction) {
    const visible = Boolean(activity.actionLabel);
    statusAction.classList.toggle('hidden', !visible);
    statusAction.textContent = activity.actionLabel;
    statusAction.disabled = visible && reactivateDiscardedInFlight;
  }
  if (statusTime) statusTime.textContent = messageTimestampText(now);
  publishUiActivity(activity);
}


function setOnlineAvailabilityNotice(online) {
  const isOnline = online === true;
  setStatus(isOnline ? 'ready' : 'waiting', isOnline ? 'Anzeige ist online' : 'Noch nicht online', isOnline ? '„Bald Online“ wurde entfernt.' : '„Bald Online“ bleibt bestehen.', '', { badgeLabel: isOnline ? 'Abgeschlossen' : 'Bald Online' });
}

async function reactivateDiscardedKleinanzeigenTabs() {
  if (reactivateDiscardedInFlight) return;
  const tabs = lastDiscardedKleinanzeigenTabs.filter(tab => Number(tab?.id) > 0);
  if (!tabs.length) {
    schedulePageInspect(0);
    return;
  }
  reactivateDiscardedInFlight = true;
  if (statusAction) statusAction.disabled = true;
  setStatus('', 'Kleinanzeigen wird reaktiviert …', `${tabs.length === 1 ? 'Der pausierte Kleinanzeigen-Tab wird' : `${tabs.length} pausierte Kleinanzeigen-Tabs werden`} im Hintergrund neu geladen.`);
  void logAppEvent('USER_DISCARDED_TABS_REACTIVATE_STARTED', { tabIds: tabs.map(tab => Number(tab.id)) });
  let reactivation = null;
  try {
    reactivation = await runtimeMessage({ type: 'REACTIVATE_DISCARDED_TABS', tabIds: tabs.map(tab => Number(tab.id)) });
  } catch (error) {
    reactivation = { succeeded: 0, failed: tabs.length, skipped: 0, results: [], error: String(error?.message || error) };
  }
  const succeeded = Number(reactivation?.succeeded || 0);
  const failed = Number(reactivation?.failed || 0) + Number(reactivation?.skipped || 0);
  void logAppEvent('USER_DISCARDED_TABS_REACTIVATE_FINISHED', { tabIds: tabs.map(tab => Number(tab.id)), succeeded, failed }, failed ? 'warning' : 'info');
  reactivateDiscardedInFlight = false;
  if (!succeeded) {
    setStatus('error', 'Kleinanzeigen konnte nicht reaktiviert werden', 'Die pausierten Tabs konnten nicht neu geladen werden. Aktiviere einen Kleinanzeigen-Tab manuell und versuche es erneut.');
    return;
  }
  setStatus('', 'Kleinanzeigen wird reaktiviert …', 'Chrome lädt die pausierten Tabs im Hintergrund neu. Die App prüft sie anschließend automatisch.');
  schedulePageInspect(250);
}

async function retryPlatformAccessAfterUserRequest() {
  setStatus('', 'Kleinanzeigen wird erneut geprüft …', 'Die Zugriffssperre wird nur auf deinen ausdrücklichen Wunsch erneut geprüft.');
  try {
    await runtimeMessage({ type: 'CLEAR_PLATFORM_ACCESS_RESTRICTION' });
    await inspectPage({ forceFresh: true });
  } catch (error) {
    setStatus('error', 'Kleinanzeigen weiterhin nicht erreichbar', friendlyErrorMessage(error), 'retry-platform-access');
  }
}

statusAction?.addEventListener('click', () => {
  if (currentStatusAction === 'reactivate-discarded') void reactivateDiscardedKleinanzeigenTabs();
  if (currentStatusAction === 'retry-platform-access') void retryPlatformAccessAfterUserRequest();
  if (currentStatusAction === 'resume-trash-template') void requireArchiveTrashInsertionUiController().reopenTrashTemplateSession();
});

function requireRenewalSettingsController() {
  if (renewalSettingsController) return renewalSettingsController;
  if (!RenewalSettingsController?.create) throw new Error('renewal-settings-controller.js must load before renewal settings are used');
  renewalSettingsController = RenewalSettingsController.create({
    safeMode: RENEWAL_MODE_SAFE, fastMode: RENEWAL_MODE_FAST, defaultAttempts: RENEWAL_PHASE_ATTEMPTS_DEFAULT,
    elements: { indicator: renewalModeIndicator, safeButton: renewalModeSafeButton, fastButton: renewalModeFastButton, description: renewalModeDescription, retryRange: renewalRetryRange, retryValue: renewalRetryValue },
    runtimeMessage, logEvent: logAppEvent, confirmAction,
    onError(title, error) { setStatus('error', title, friendlyErrorMessage(error)); },
    onConfigurationChanged(configuration) {
      currentRenewalConfiguration = configuration;
      if (archiveTrashInsertionUiController) {
        archiveTrashInsertionUiController.updateContext({ renewalConfiguration: currentRenewalConfiguration, insertionLock: currentInsertionLock, selectedProfileId, trashRecords: currentTrashRecords });
        archiveTrashInsertionUiController.syncConfiguration();
      }
    }
  });
  return renewalSettingsController;
}

function normalizeRenewalMode(value) { return RenewalPolicy.normalizeRenewalMode(value); }
function renewalModeLabel(mode = currentRenewalConfiguration.renewalMode) { return requireRenewalSettingsController().modeLabel(mode); }
function normalizeRenewalPhaseAttempts(value) { return RenewalPolicy.normalizeRenewalPhaseAttempts(value); }

function setRenewalKicker(prefix, mode = null) {
  if (!renewalStartKicker) return;
  renewalStartKicker.replaceChildren();
  renewalStartKicker.append(document.createTextNode(String(prefix || '')));
  if (!mode) return;
  renewalStartKicker.append(document.createTextNode(' · '));
  const modeLabel = document.createElement('span');
  modeLabel.className = `renewal-start-mode${normalizeRenewalMode(mode) === RENEWAL_MODE_FAST ? ' fast' : ''}`;
  modeLabel.textContent = renewalModeLabel(mode).toUpperCase();
  renewalStartKicker.append(modeLabel);
}

async function refreshRenewalConfiguration() { currentRenewalConfiguration = await requireRenewalSettingsController().refresh(); return currentRenewalConfiguration; }

function profileById(profileId, state = currentProfileState) { return profileAccountUiController.profileById(profileId, state); }

function selectedProfileLabel() { return profileAccountUiController.selectedProfileLabel(selectedProfileId, currentProfileState); }

function selectedConcreteProfile() { return profileAccountUiController.selectedConcreteProfile(selectedProfileId, currentProfileState); }

function liveAccountMatchesSelectedProfile() { return profileAccountUiController.liveAccountMatchesSelectedProfile(accountGateState, selectedProfileId, currentProfileState); }

function accountGateModel() { return profileAccountUiController.accountGateModel(accountGateState, selectedProfileId, currentProfileState); }

function profileBindingSnapshot(gate = accountGateModel()) { return profileAccountUiController.profileBindingSnapshot(accountGateState, selectedProfileId, currentProfileState, gate); }

function profileBindingSnapshotKey(snapshot) {
  return [snapshot?.selectedProfileId || '', snapshot?.liveProfileId || '', snapshot?.accountState || '', snapshot?.gateKind || '', snapshot?.allowed ? '1' : '0'].join('|');
}

function renderProfileAccountStatus() { return profileAccountUiController.renderProfileAccountStatus(accountGateState); }

function accountBoundControlsNeedRefresh(previousBinding, nextBinding) {
  if (!previousBinding) return true;
  if (previousBinding.allowed !== nextBinding.allowed) return true;
  if (String(previousBinding.selectedProfileId || '') !== String(nextBinding.selectedProfileId || '')) return true;
  if (String(previousBinding.liveProfileId || '') !== String(nextBinding.liveProfileId || '')) return true;
  if (previousBinding.allowed === true && nextBinding.allowed === true) return false;
  return String(previousBinding.gateKind || '') !== String(nextBinding.gateKind || '');
}

function syncAccountGatePresentation({ source = 'account-gate', reason = '', force = false } = {}) {
  if (accountGatePresentationSyncing) return accountGateModel();
  accountGatePresentationSyncing = true;
  try {
    const gate = accountGateModel();
    const signature = typeof AccountGate !== 'undefined' && AccountGate?.gateSignature
      ? AccountGate.gateSignature(accountGateState, selectedConcreteProfile())
      : profileBindingSnapshotKey(profileBindingSnapshot(gate));
    const binding = profileBindingSnapshot(gate);
    const bindingKey = profileBindingSnapshotKey(binding);
    const previousBinding = lastProfileBindingSnapshot;
    const previousBindingKey = previousBinding ? profileBindingSnapshotKey(previousBinding) : '';
    const controlsNeedRefresh = accountBoundControlsNeedRefresh(previousBinding, binding);
    if (previousBinding && previousBindingKey !== bindingKey) {
      void logAppEvent('PROFILE_BINDING_TRANSITION', {
        source, reason: reason || null,
        fromSelectedProfileId: previousBinding.selectedProfileId || null,
        toSelectedProfileId: binding.selectedProfileId || null,
        fromLiveProfileId: previousBinding.liveProfileId || null,
        toLiveProfileId: binding.liveProfileId || null,
        fromAccountState: previousBinding.accountState || null,
        toAccountState: binding.accountState || null,
        fromGateKind: previousBinding.gateKind || null,
        toGateKind: binding.gateKind || null,
        fromAllowed: previousBinding.allowed === true,
        toAllowed: binding.allowed === true
      });
    }
    lastProfileBindingSnapshot = binding;
    renderProfileAccountStatus();
    syncAccountBoundActions(source || 'account-gate');
    const gateChanged = signature !== lastAccountGateSignature;
    lastAccountGateSignature = signature;
    if (force || gateChanged || previousBindingKey !== bindingKey) {
      void runtimeMessage({
        type: 'SET_ACCOUNT_GATE_DIAGNOSTIC_STATE',
        state: {
          accountState: binding.accountState, gateKind: binding.gateKind, allowed: binding.allowed,
          selectedProfileId: binding.selectedProfileId || null, liveProfileId: binding.liveProfileId || null,
          reason: reason || accountGateState?.reason || null, source, generation: accountGateState?.generation || 0,
          confirmedAt: accountGateState?.confirmedAt || null
        }
      }).catch(() => null);
    }
    const stableAllowedBinding = Boolean(previousBinding?.allowed === true && binding.allowed === true && !controlsNeedRefresh);
    if (controlsNeedRefresh || (force && !stableAllowedBinding)) refreshRenderedAccountBoundControls('', '', { force: true });
    return gate;
  } finally {
    accountGatePresentationSyncing = false;
  }
}

function transitionAccountGate(event, { source = '', reason = '', forceRender = false, details = {} } = {}) {
  if (typeof AccountGate === 'undefined' || !AccountGate?.transition) throw new Error('Account-Gate-Modul ist nicht verfügbar.');
  const previous = accountGateState;
  const previousGate = AccountGate.model(previous, selectedConcreteProfile());
  const next = AccountGate.transition(previous, { ...event, source: source || event?.source, reason: reason || event?.reason });
  accountGateState = next;
  const nextGate = AccountGate.model(next, selectedConcreteProfile());
  const changed = String(previous?.status || '') !== String(next.status || '')
    || String(previous?.profile?.profileId || '') !== String(next?.profile?.profileId || '')
    || previousGate.kind !== nextGate.kind
    || previousGate.allowed !== nextGate.allowed;
  if (changed) {
    void logAppEvent('ACCOUNT_GATE_TRANSITION', {
      source: source || next.source || null,
      reason: reason || next.reason || null,
      fromState: previous?.status || null,
      toState: next.status || null,
      fromProfileId: previous?.profile?.profileId || null,
      toProfileId: next?.profile?.profileId || null,
      selectedProfileId: selectedProfileId || null,
      fromGateKind: previousGate.kind || null,
      toGateKind: nextGate.kind || null,
      fromAllowed: previousGate.allowed === true,
      toAllowed: nextGate.allowed === true,
      generation: next.generation,
      ...details
    });
  }
  syncAccountGatePresentation({ source: source || next.source || 'account-gate', reason: reason || next.reason || '', force: forceRender || changed });
  return next;
}

function renderConfirmedLiveAccountStatus(profileName = '') {
  const accountName = String(accountGateState?.profile?.displayName || profileName || 'Kleinanzeigen-Konto');
  if (liveAccountMatchesSelectedProfile()) {
    setStatus('ready', `Angemeldet als ${accountName}`, 'Kleinanzeigen-Konto und ausgewähltes Inventarprofil stimmen überein.');
    return;
  }
  setStatus('', `Angemeldet als ${accountName}`, `Ausgewähltes Inventarprofil: ${selectedProfileLabel()}. Aktionen sind gesperrt, bis Konto und Inventarprofil übereinstimmen.`);
}

function renderActionAvailability() {
  if (!actionAvailability) return accountGateModel();
  const gate = accountGateModel();
  actionAvailability.classList.toggle('hidden', gate.allowed);
  actionAvailability.dataset.kind = gate.kind || '';
  if (actionAvailabilityTitle) actionAvailabilityTitle.textContent = gate.title || '';
  if (actionAvailabilityText) actionAvailabilityText.textContent = gate.text || '';
  return gate;
}


function requireAccountBoundAction() {
  const gate = accountGateModel();
  if (gate.allowed) return true;
  void logAppEvent('ACCOUNT_GATE_ACTION_BLOCKED', {
    gateKind: gate.kind || null,
    accountState: accountGateState?.status || null,
    selectedProfileId: selectedProfileId || null,
    liveProfileId: accountGateState?.profile?.profileId || null
  }, 'info');
  setStatus('', gate.kind === 'missing-account' ? 'Nicht angemeldet' : gate.kind === 'mismatch' ? 'Aktion gesperrt' : gate.kind === 'ambiguous' || gate.kind === 'transient-unavailable' ? 'Konto nicht erkannt' : (gate.title || 'Aktion gesperrt'), gate.kind === 'missing-account' ? 'Bitte melde dich zuerst bei Kleinanzeigen an.' : gate.text || gate.tooltip || 'Das Kleinanzeigen-Konto konnte nicht erkannt werden.');
  return false;
}

function sidebarActionEntries() {
  return [
    ['fullInventoryButton', fullInventoryButton],
    ['inventoryButton', inventoryButton],
    ['archiveInsertButton', archiveInsertButton],
    ['massRenewalButton', massRenewalButton]
  ].filter(([, button]) => Boolean(button));
}

function sidebarActionDisableModel(buttonId) {
  const gate = accountGateModel();
  const bulkBusy = bulkStartInFlight || String(currentBulkRunState?.status || '') === 'running' || Boolean(currentBulkRunState?.retryAdId);
  const singleBusy = singleInventoryCaptureBusy();
  const pageReady = inventoryButton?.dataset?.pageReady === 'true';
  const locked = insertionLockActive();
  const archiveOwned = locked && String(currentInsertionLock?.kind || '') === 'archive-insertion';
  const massOwned = locked && (String(currentInsertionLock?.kind || '') === 'mass-renewal' || Boolean(currentInsertionLock?.massBatchId));
  if (!gate.allowed) return { disabled: true, reason: `account-gate:${gate.kind || 'blocked'}` };
  if (buttonId === 'fullInventoryButton') {
    if (bulkBusy) return { disabled: true, reason: 'bulk-busy' };
    if (singleBusy) return { disabled: true, reason: 'single-busy' };
    return { disabled: false, reason: 'ready' };
  }
  if (buttonId === 'inventoryButton') {
    if (!pageReady) return { disabled: true, reason: 'page-not-ready' };
    if (singleBusy) return { disabled: true, reason: 'single-busy' };
    if (bulkBusy) return { disabled: true, reason: 'bulk-busy' };
    return { disabled: false, reason: 'ready' };
  }
  if (buttonId === 'archiveInsertButton') {
    if (locked && !archiveOwned) return { disabled: true, reason: `insertion-lock:${String(currentInsertionLock?.kind || 'unknown')}` };
    return { disabled: false, reason: archiveOwned ? 'archive-owned' : 'ready' };
  }
  if (buttonId === 'massRenewalButton') {
    if (locked && !massOwned) return { disabled: true, reason: `insertion-lock:${String(currentInsertionLock?.kind || 'unknown')}` };
    return { disabled: false, reason: massOwned ? 'mass-owned' : 'ready' };
  }
  return { disabled: false, reason: 'unknown-action' };
}


let actionsDiagnosticsController = null;

function actionsDiagnosticsSnapshotContext() {
  const gate = accountGateModel();
  return {
    gateKind: gate.kind || null,
    gateAllowed: gate.allowed === true,
    accountState: accountGateState?.status || null,
    selectedProfileId: selectedProfileId || null,
    liveProfileId: accountGateState?.profile?.profileId || null,
    pageReady: inventoryButton?.dataset?.pageReady === 'true',
    singleBusy: singleInventoryCaptureBusy(),
    bulkBusy: bulkStartInFlight || String(currentBulkRunState?.status || '') === 'running' || Boolean(currentBulkRunState?.retryAdId),
    insertionLock: {
      locked: insertionLockActive(),
      kind: currentInsertionLock?.kind || null,
      ownerId: currentInsertionLock?.ownerId || null,
      massBatchId: currentInsertionLock?.massBatchId || null
    },
    mass: { status: massRenewalStatus().currentBatch?.status || null, batchId: massRenewalStatus().currentBatch?.batchId || null },
    archiveDialogMode: archiveTrashInsertionStatus().archiveDialogMode,
    renewalDialogMode: renewalDialogStatus().mode,
    inventoryCapture: { mode: inventoryCaptureStatus().mode || null, state: inventoryCaptureStatus().dialogState || null }
  };
}

function actionsDiagnosticAttemptContext(button) {
  const model = sidebarActionDisableModel(button?.id || '');
  const gate = accountGateModel();
  return {
    expectedDisabled: model.disabled === true,
    disableReason: model.reason,
    gateKind: gate.kind || null,
    gateAllowed: gate.allowed === true,
    selectedProfileId: selectedProfileId || null,
    liveProfileId: accountGateState?.profile?.profileId || null,
    pageReady: inventoryButton?.dataset?.pageReady === 'true',
    singleBusy: singleInventoryCaptureBusy(),
    bulkBusy: bulkStartInFlight || String(currentBulkRunState?.status || '') === 'running' || Boolean(currentBulkRunState?.retryAdId),
    insertionLockKind: currentInsertionLock?.kind || null,
    insertionLockOwner: currentInsertionLock?.ownerId || null
  };
}

function actionsDiagnosticInteractionContext(button, card) {
  const gate = accountGateModel();
  return {
    gateKind: gate.kind || null,
    gateAllowed: gate.allowed === true,
    selectedProfileId: selectedProfileId || null,
    liveProfileId: accountGateState?.profile?.profileId || null,
    inventoryId: card?.dataset?.inventoryId || null,
    adId: card?.dataset?.adId || null
  };
}

async function fetchActionsResyncState() {
  const [profileState, insertionLock, bulkState, massState] = await Promise.all([
    runtimeMessage({ type: 'GET_PROFILE_STATE' }),
    runtimeMessage({ type: 'GET_INSERTION_LOCK_STATE' }).catch(() => ({ locked: false })),
    runtimeMessage({ type: 'GET_BULK_RUN_STATUS' }).catch(() => currentBulkRunState),
    runtimeMessage({ type: 'GET_MASS_RENEWAL_BATCH_STATUS' }).catch(() => massRenewalStatus().currentBatch)
  ]);
  return { profileState, insertionLock, bulkState, massState };
}

async function applyActionsResyncState(state, source) {
  renderProfileSwitcher(state?.profileState);
  currentInsertionLock = state?.insertionLock && typeof state.insertionLock === 'object' ? state.insertionLock : { locked: false };
  renderBulkState(state?.bulkState || null);
  applyMassRenewalBatchSnapshot(state?.massState || null, { forceOpen: false, recoveryOnly: true, source: `resync:${source}` });
  syncArchiveInsertionUiFromLock();
  await inspectPage({ forceFresh: true, background: true });
  syncAccountBoundActions(`resync:${source}`);
}

function requireActionsDiagnosticsController() {
  if (actionsDiagnosticsController) return actionsDiagnosticsController;
  if (!ActionsDiagnosticsController?.create) throw new Error('actions-diagnostics-controller.js must load before actions diagnostics are used');
  actionsDiagnosticsController = ActionsDiagnosticsController.create({
    document,
    window,
    primaryActions,
    actionsAccordion,
    inventorySection,
    trashSection,
    logEvent: logAppEvent,
    sidebarActionEntries,
    actionDisableModel: sidebarActionDisableModel,
    snapshotContext: actionsDiagnosticsSnapshotContext,
    accordionSnapshot: controlAccordionDiagnosticSnapshot,
    accordionHeader: controlAccordionHeader,
    sanitizeAccordionAnimations: sanitizeControlAccordionAnimations,
    readBackgroundEpoch: async () => String((await runtimeMessage({ type: 'GET_BACKGROUND_EPOCH' }))?.epoch || ''),
    fetchResyncState: fetchActionsResyncState,
    applyResyncState: applyActionsResyncState,
    attemptContext: actionsDiagnosticAttemptContext,
    interactionContext: actionsDiagnosticInteractionContext
  });
  return actionsDiagnosticsController;
}

function recordActionsStateSnapshot(source = 'state-change', options = {}) { return requireActionsDiagnosticsController().recordSnapshot(source, options); }
function scheduleActionsStateSnapshot(source = 'state-change', options = {}) { return requireActionsDiagnosticsController().scheduleSnapshot(source, options); }
function markActionsStateSynced(source = 'ui-sync') { return requireActionsDiagnosticsController().markSynced(source); }
function detectBackgroundEpoch(source = 'epoch-check') { return requireActionsDiagnosticsController().detectEpoch(source); }
function scheduleActionsResync(source = 'scheduled-resync', delayMs = 100) { return requireActionsDiagnosticsController().scheduleResync(source, delayMs); }

function syncAccountBoundActions(source = 'account-bound-actions') {
  renderActionAvailability();
  syncSingleInventoryButtonState();
  syncFullInventoryButtonState();
  syncArchiveInsertionUiFromLock();
  syncTrashTemplateInventoryButton();
  markActionsStateSynced(source);
  scheduleActionsStateSnapshot(source);
}

function refreshRenderedAccountBoundControls(previousKey = '', nextKey = '', { force = false } = {}) {
  if (!force && String(previousKey || '') === String(nextKey || '')) return;
  if (currentView === 'trash') renderTrash(currentTrashRecords);
  else renderInventories(currentRecords);
}

function scopedProfileMessage(type) {
  return { type, profileId: selectedProfileId || '__no_profile_selected__' };
}

function renderProfileSwitcher(state = currentProfileState) {
  currentProfileState = state && typeof state === 'object' ? state : currentProfileState;
  selectedProfileId = profileAccountUiController.renderProfileSwitcher(currentProfileState, accountGateState);
  syncAccountGatePresentation({ source: 'profile-state-render', reason: 'selected-profile-state' });
}

function setProfileManagerStatus(text = '', error = false) { return profileAccountUiController.setProfileManagerStatus(text, error); }

function renderProfileManager(state = currentProfileState) { return profileAccountUiController.renderProfileManager(state, { selectedProfileId, accountGateState }); }

async function refreshProfileState() {
  const state = await runtimeMessage({ type: 'GET_PROFILE_STATE' });
  renderProfileSwitcher(state);
  return state;
}

function resetRenewalUiForProfileSwitch() {
  requireRenewalDialogController().resetTracking({ closeProgress: true, reason: 'profile-switched' });
}

function beginProfileSwitchAccountCheck() {
  transitionAccountGate({ type: 'CHECK_STARTED' }, { source: 'profile-switch', reason: 'foreground-profile-switch', forceRender: true });
  renderProfileSwitcher(currentProfileState);
  setStatus('', 'Kleinanzeigen-Konto wird geprüft …', 'Die App prüft, welches Kleinanzeigen-Konto angemeldet ist.');
}

async function selectInventoryProfile(profileId) {
  const id = String(profileId || '');
  if (!id || id === String(selectedProfileId || '')) return;
  setProfileManagerStatus('Inventaransicht wird gewechselt …');
  try {
    const state = await runtimeMessage({ type: 'SET_SELECTED_PROFILE', profileId: id });
    resetRenewalUiForProfileSwitch();
    renderProfileSwitcher(state);
    beginProfileSwitchAccountCheck();
    void logAppEvent('USER_PROFILE_VIEW_SELECTED', { profileId: id === UNASSIGNED_PROFILE_ID ? null : id, unassigned: id === UNASSIGNED_PROFILE_ID });
    await refreshInventories({ profileState: state });
    await refreshBulkStatus();
    await inspectPage({ forceFresh: true });
    setProfileManagerStatus(`Inventaransicht: ${selectedProfileLabel()}`);
  } catch (error) {
    renderProfileSwitcher(currentProfileState);
    setProfileManagerStatus('Das Profil konnte nicht ausgewählt werden.', true);
  }
}

async function deleteManagedProfile(profile) {
  const profileId = String(profile?.profileId || '');
  if (!profileId) return;
  const localCount = Number(profile?.inventoryCount || 0) + Number(profile?.trashCount || 0);
  const confirmed = await confirmAction({
    title: 'Profil aus der Verwaltung entfernen?',
    text: `Das lokale Profil „${profile.displayName || 'Unbenanntes Profil'}“ wird aus der Profilverwaltung entfernt.`,
    detail: localCount
      ? `${localCount} lokale ${localCount === 1 ? 'Eintrag bleibt' : 'Einträge bleiben'} erhalten und ${localCount === 1 ? 'wird' : 'werden'} anschließend unter „Nicht zugeordnet“ angezeigt. Das Kleinanzeigen-Konto selbst wird nicht verändert.`
      : 'Das Kleinanzeigen-Konto selbst wird nicht verändert.',
    confirmLabel: 'Profil entfernen',
    danger: true
  });
  if (!confirmed) return;
  setProfileManagerStatus('Profil wird entfernt …');
  try {
    const previousSelectedProfileId = selectedProfileId;
    const state = await runtimeMessage({ type: 'DELETE_PROFILE', profileId });
    if (String(accountGateState?.profile?.profileId || '') === profileId) transitionAccountGate({ type: 'MISSING' }, { source: 'profile-management', reason: 'confirmed-profile-deleted', forceRender: true });
    if (String(previousSelectedProfileId || '') !== String(state?.selectedProfileId || '')) resetRenewalUiForProfileSwitch();
    renderProfileSwitcher(state);
    void logAppEvent('USER_PROFILE_DELETED', { profileId });
    await refreshInventories({ profileState: state });
    setProfileManagerStatus(Number(state?.unassignedRecords || 0) ? `Profil entfernt. ${state.unassignedRecords} lokale ${Number(state.unassignedRecords) === 1 ? 'Eintrag wurde' : 'Einträge wurden'} „Nicht zugeordnet“.` : 'Profil wurde aus der lokalen Verwaltung entfernt.');
  } catch (error) {
    setProfileManagerStatus('Profil konnte nicht entfernt werden.', true);
  }
}


async function ensureDetectedProfileSelectedForCapture() {
  const captureState = inventoryCaptureStatus();
  const captureTabId = captureState.dialogState === 'progress' && captureState.sourceTabId ? captureState.sourceTabId : activeTabId;
  if (captureTabId) {
    const page = await tabMessage(captureTabId, { type: 'PAGE_STATUS' }).catch(() => null);
    const detectedName = String(page?.auth?.loggedIn ? (page?.profileName || '') : '').trim();
    if (detectedName) {
      const recognized = await runtimeMessage({ type: 'RECOGNIZE_PROFILE', profileName: detectedName });
      if (recognized?.profile?.profileId) transitionAccountGate({ type: 'CONFIRMED', profile: recognized.profile }, { source: 'single-inventory-capture', reason: 'page-status-profile' });
      else transitionAccountGate({ type: 'MISSING' }, { source: 'single-inventory-capture', reason: 'page-status-profile-missing' });
      const recognizedState = await runtimeMessage({ type: 'GET_PROFILE_STATE' }).catch(() => currentProfileState);
      renderProfileSwitcher(recognizedState);
    }
  }

  const profileId = String(accountGateState?.profile?.profileId || '');
  const selectedId = String(selectedProfileId || '');
  if (!profileId) throw new Error('Das aktuell angemeldete Kleinanzeigen-Konto konnte nicht eindeutig erkannt werden.');
  if (!selectedId || selectedId === UNASSIGNED_PROFILE_ID) throw new Error('Wähle zuerst ein konkretes Inventarprofil aus.');
  if (profileId !== selectedId) {
    throw new Error(`Das ausgewählte Inventarprofil „${selectedProfileLabel()}“ stimmt nicht mit dem angemeldeten Kleinanzeigen-Konto „${accountGateState?.profile?.displayName || 'unbekannt'}“ überein.`);
  }
  return accountGateState?.profile || null;
}

function messageTimestampText(value) {
  const parsed = new Date(value || '');
  if (!Number.isFinite(parsed.getTime())) return '';
  return `Zeitpunkt: ${new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(parsed)}`;
}

async function ensureDismissedUiMessagesLoaded() {
  if (dismissedUiMessagesLoaded) return dismissedUiMessages;
  const stored = await chrome.storage.local.get(DISMISSED_UI_MESSAGES_KEY).catch(() => ({}));
  const value = stored?.[DISMISSED_UI_MESSAGES_KEY];
  dismissedUiMessages = value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
  dismissedUiMessagesLoaded = true;
  return dismissedUiMessages;
}

function isUiMessageDismissed(slot, messageId) {
  const key = String(slot || '').trim();
  const id = String(messageId || '').trim();
  return Boolean(key && id && String(dismissedUiMessages?.[key] || '') === id);
}

async function dismissUiMessage(slot, messageId) {
  const key = String(slot || '').trim();
  const id = String(messageId || '').trim();
  if (!key || !id) return;
  dismissedUiMessages = { ...dismissedUiMessages, [key]: id };
  dismissedUiMessagesLoaded = true;
  await chrome.storage.local.set({ [DISMISSED_UI_MESSAGES_KEY]: dismissedUiMessages });
}

function bulkStatusMessageId(state) {
  const runId = String(state?.bulkRunId || state?.runId || '').trim();
  if (!runId) return '';
  if (state?.retryAdId) return `bulk:${runId}:retry:${String(state.retryAdId)}:${String(state.retryStartedAt || '')}`;
  const status = String(state?.status || 'unknown');
  return `bulk:${runId}:${status}`;
}

function bulkStatusTimestamp(state) {
  if (state?.retryAdId) return state.retryStartedAt || state.updatedAt || state.startedAt || null;
  if (['complete', 'complete-with-errors', 'needs-review', 'stopped', 'error', 'failed'].includes(String(state?.status || ''))) return state.completedAt || state.updatedAt || state.startedAt || null;
  return state?.startedAt || state?.updatedAt || null;
}

function renderAppNotice(notice) {
  currentAppNotice = notice && typeof notice === 'object' ? notice : null;
  if (!currentAppNotice || currentAppNotice.kind !== 'success') {
    appNotice.classList.add('hidden');
    appNoticeTitle.textContent = '';
    appNoticeText.textContent = '';
    appNoticeTime.textContent = '';
    return;
  }
  appNoticeTitle.textContent = currentAppNotice.title || 'Vorgang erfolgreich abgeschlossen';
  appNoticeText.textContent = currentAppNotice.text || '';
  appNoticeTime.textContent = messageTimestampText(currentAppNotice.createdAt);
  const activityId = currentAppNotice.renewalId
    ? `renewal:${String(currentAppNotice.renewalId)}`
    : currentAppNotice.archiveInsertionId
      ? `archive:${String(currentAppNotice.archiveInsertionId)}`
      : `notice:${String(currentAppNotice.id || currentAppNotice.event || currentAppNotice.createdAt || 'latest')}`;
  publishUiActivity({
    id: activityId,
    slot: 'app-notice',
    kind: 'ready',
    title: currentAppNotice.title || 'Vorgang erfolgreich abgeschlossen',
    text: currentAppNotice.text || '',
    createdAt: currentAppNotice.createdAt || new Date().toISOString(),
    active: false
  });
}

let renewalDialogController = null;
function requireRenewalDialogController() {
  if (!renewalDialogController) {
    renewalDialogController = RenewalDialogController.create({
      safeMode: RENEWAL_MODE_SAFE,
      fastMode: RENEWAL_MODE_FAST,
      normalizeRenewalMode,
      renewalModeLabel,
      setRenewalKicker,
      getCurrentConfiguration: () => currentRenewalConfiguration,
      getCurrentRecords: () => currentRecords,
      getCurrentAppNotice: () => currentAppNotice,
      loadLocalPreview,
      publishUiActivity,
      openInventoryReadOnly,
      openInventoryEdit,
      elements: {
        renewalStartDialog, renewalStartClose, renewalStartCancel, renewalStartConfirm,
        renewalStartCover, renewalStartTitle, renewalStartSourceId, renewalStartDialogTitle,
        renewalStartDialogText, renewalStartSource, renewalStartSourceLabel, renewalStartSafety,
        renewalStartSafetyTitle, renewalStartSafetyText, renewalPhase1Label, renewalPhase2Label,
        renewalPhase3Label, renewalPhase4Label, renewalStartSteps, renewalStartActions,
        renewalProgressMessage, renewalProgressMessageTitle, renewalProgressMessageText,
        renewalBackgroundHint, renewalProgressActions, renewalProgressClose, renewalProgressView,
        renewalProgressEdit, renewalProgressShortcut, renewalProgressShortcutTitle,
        renewalProgressShortcutText
      }
    });
    renewalDialogController.install();
  }
  return renewalDialogController;
}
function renewalDialogStatus() { return requireRenewalDialogController().status(); }
function renewalPhaseElements() { return requireRenewalDialogController().phaseElements(); }
function setRenewalPhaseStates(states = {}) { return requireRenewalDialogController().setPhaseStates(states); }
function setRenewalProgressMessage(kind, title, text) { return requireRenewalDialogController().setProgressMessage(kind, title, text); }
function renewalModeForRecord(record) {
  return normalizeRenewalMode(record?.renewal?.renewalMode || currentRenewalConfiguration.renewalMode);
}
function configureRenewalDialogForMode(mode) { return requireRenewalDialogController().configureForMode(mode); }
function renewalProgressModel(record) {
  const renewal = record?.renewal || {};
  const status = String(renewal.status || 'draft');
  const stage = String(renewal.stage || 'draft-created');
  const mode = renewalModeForRecord(record);
  const fast = mode === RENEWAL_MODE_FAST;
  const hasNewId = /^\d+$/.test(String(record?.adId || renewal.newAdId || ''));
  const states = { 1: 'pending', 2: fast ? 'skipped' : 'pending', 3: 'pending', 4: 'pending' };
  let title = 'Anzeige wird vorbereitet …';
  let text = 'Die gespeicherte Vorlage wird in eine neue Kleinanzeigen-Anzeige übernommen.';
  let kind = '';

  const phase1Done = hasNewId || ['new-id-confirmed', 'edit-worker-opening', 'edit-worker-opened', 'checking-public-evidence', 'saving-candidate', 'comparing', 'fast-my-ads-opening', 'fast-my-ads-checking', 'replacement-ready', 'source-delete-started', 'source-delete-verification-pending', 'source-delete-verified'].includes(stage) || ['new-id-confirmed', 'reinventorizing', 'verifying', 'verified', 'waiting-for-online'].includes(status);
  const safePhase2Done = !fast && (['checking-public-evidence', 'saving-candidate', 'comparing', 'replacement-ready', 'source-delete-started', 'source-delete-verification-pending', 'source-delete-verified'].includes(stage) || ['verifying', 'verified', 'waiting-for-online'].includes(status));
  const phase3Done = status === 'verified' || stage === 'replacement-ready' || stage.startsWith('source-delete');

  if (phase1Done) states[1] = 'success';
  if (safePhase2Done) states[2] = 'success';
  if (phase3Done) states[3] = 'success';

  if (renewal.autoReplacementFailedAt && phase3Done) {
    states[4] = 'error';
    title = 'Austausch nicht abgeschlossen';
    text = 'Die neue Anzeige ist bestätigt, aber der Austausch konnte noch nicht abgeschlossen werden. Die bisherige Anzeige bleibt geschützt.';
    kind = 'error';
    return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') };
  }

  if (status === 'verification-failed') {
    const platformError = stage === 'platform-error-page';
    const earlyFailure = !hasNewId && !phase1Done;
    let phase = 3;
    if (earlyFailure) phase = 1;
    else if (!fast && stage === 'reinventorize-failed') phase = 2;
    states[phase] = 'error';
    title = platformError ? 'Kleinanzeigen antwortet nicht' : (phase === 1 ? 'Neu inserieren nicht abgeschlossen' : (phase === 2 ? 'Angaben prüfen' : 'Austausch nicht abgeschlossen'));
    text = platformError
      ? 'Der Vorgang wurde sicher beendet. Die alte Anzeige wurde nicht entfernt.'
      : 'Die alte Anzeige wurde nicht entfernt.';
    kind = 'error';
    return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') };
  }

  if (!fast && status === 'waiting-for-online') {
    states[3] = 'waiting';
    title = 'Noch nicht online';
    text = 'Der bisherige Status bleibt unverändert.';
    kind = 'waiting';
    return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') };
  }

  if (stage.startsWith('source-delete')) {
    states[4] = 'active';
    title = stage === 'source-delete-verification-pending' ? 'Löschung der bisherigen Anzeige wird geprüft …' : 'Bisherige Anzeige wird ersetzt …';
    text = 'Die neue Anzeige wurde gemäß dem gewählten Modus bestätigt. Die bisherige Anzeige wird gelöscht und ihre Abwesenheit anschließend unabhängig geprüft.';
    return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') };
  }

  if (stage === 'replacement-ready' || status === 'verified') {
    states[4] = 'active';
    title = 'Austausch wird abgeschlossen …';
    text = fast
      ? 'Die neue Anzeige wurde im richtigen Profil unter „Meine Anzeigen“ gefunden. Jetzt wird die bisherige Anzeige sicher gelöscht.'
      : 'Die neue Anzeige wurde vollständig kontrolliert. Jetzt wird die bisherige Anzeige sicher gelöscht.';
    return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') };
  }

  if (fast && (status === 'verifying' || ['fast-my-ads-opening', 'fast-my-ads-checking'].includes(stage))) {
    states[3] = 'active';
    title = 'Neue Anzeige wird unter „Meine Anzeigen“ gesucht …';
    text = 'Schnellprüfung: Es wird bestätigt, dass die neue Anzeige im richtigen Profil unter „Meine Anzeigen“ vorhanden ist.';
    return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') };
  }

  if (!fast && (status === 'reinventorizing' || ['edit-worker-opening', 'edit-worker-opened', 'saving-candidate'].includes(stage))) {
    states[2] = 'active';
    title = 'Neue Anzeige wird kontrolliert …';
    text = 'Die gespeicherten Angaben und Bilder werden noch einmal geprüft.';
    return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') };
  }

  if (!fast && (status === 'verifying' || ['checking-public-evidence', 'comparing'].includes(stage))) {
    states[2] = 'success';
    states[3] = 'active';
    title = stage === 'comparing' ? 'Angaben werden verglichen …' : 'Neue Anzeige wird geprüft …';
    text = 'Die neu gelesenen Angaben, Bilder und die Sichtbarkeit werden mit der bisherigen Anzeige abgeglichen.';
    return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') };
  }

  if (stage === 'publish-submitted' || status === 'submitted') {
    states[1] = 'active';
    title = 'Anzeige wird veröffentlicht …';
    text = 'Kleinanzeigen verarbeitet die Veröffentlichung. Die neue Anzeige wird jetzt erkannt.';
    return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') };
  }

  if (phase1Done) {
    if (fast) {
      states[3] = 'active';
      title = 'Neue Anzeige wurde erkannt …';
      text = 'Schnellprüfung: Die zusätzliche Inhaltsprüfung wird übersprungen. Als Nächstes wird die neue Anzeige unter „Meine Anzeigen“ gesucht.';
    } else {
      states[2] = 'active';
      title = 'Neue Anzeige wurde erkannt …';
      text = 'Vollprüfung: Als Nächstes wird die neue Anzeige nochmals vollständig kontrolliert.';
    }
    return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') };
  }

  states[1] = 'active';
  if (stage.startsWith('image-')) {
    title = 'Bilder werden eingefügt …';
    text = 'Die gespeicherten Bilder werden in der richtigen Reihenfolge eingefügt.';
  } else if (stage.startsWith('category-')) {
    title = 'Kategorie und Angaben werden übernommen …';
    text = 'Kategorie und erforderliche Angaben werden aus der gespeicherten Anzeige übernommen.';
  } else if (stage === 'form-verified' || stage === 'auto-publish-ready') {
    title = 'Alle Angaben sind ausgefüllt';
    text = 'Die Angaben wurden geprüft. Als Nächstes wird die neue Anzeige veröffentlicht.';
  }
  return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') };
}
function resetRenewalDialogConfirmation(record) { return requireRenewalDialogController().resetConfirmation(record); }
function showRenewalProgress(record, options = {}) { return requireRenewalDialogController().showProgress(record, options); }
function showRenewalCompletion(notice, records = currentRecords, options = {}) { return requireRenewalDialogController().showCompletion(notice, records, options); }
function settleRenewalStartDialog(confirmed) { return requireRenewalDialogController().settle(confirmed); }
function confirmAutomatedRenewalStart(record) { return requireRenewalDialogController().confirmStart(record); }


let massRenewalUiController = null;
function requireMassRenewalUiController() {
  if (massRenewalUiController) return massRenewalUiController;
  if (!MassRenewalUiController?.create) throw new Error('mass-renewal-ui-controller.js must load before mass renewal UI is used');
  massRenewalUiController = MassRenewalUiController.create({
    document,
    maxItems: MASS_RENEWAL_MAX_ITEMS,
    fastMode: RENEWAL_MODE_FAST,
    normalizeRenewalMode,
    templateReady,
    displayPrice,
    endDateWithRelativeLabel,
    loadLocalPreview,
    accountGateModel,
    insertionLockActive,
    insertionLockUiText,
    publicAvailabilityPending,
    renewalProgressModel,
    runtimeMessage,
    setStatus,
    friendlyErrorMessage,
    confirmAction,
    requireAccountBoundAction,
    logAppEvent,
    syncActionsActivityIndicator,
    scheduleActionsStateSnapshot,
    elements: {
      massRenewalButton, massRenewalDialog, massRenewalClose, massRenewalCancel, massRenewalBack,
      massRenewalNext, massRenewalStart, massRenewalStopAfterCurrent, massRenewalDone,
      massRenewalKicker, massRenewalIntro, massRenewalSelectionPanel, massRenewalOrderPanel,
      massRenewalOrderList, massRenewalProgressPanel, massRenewalSummaryPanel, massRenewalSelectionBody,
      massRenewalSelectionCount, massRenewalProgressTitle, massRenewalProgressCount,
      massRenewalProgressList, massRenewalSummaryCount, massRenewalSummaryList
    }
  });
  massRenewalUiController.updateContext({ records: currentRecords, trashRecords: currentTrashRecords, renewalConfiguration: currentRenewalConfiguration, insertionLock: currentInsertionLock });
  massRenewalUiController.install();
  return massRenewalUiController;
}
function massRenewalStatus() { return requireMassRenewalUiController().status(); }
function applyMassRenewalBatchSnapshot(batch, options = {}) { return requireMassRenewalUiController().applyBatchSnapshot(batch, options); }
function refreshMassRenewalBatchStatus(options = {}) { return requireMassRenewalUiController().refreshStatus(options); }
function syncMassRenewalUiFromLock() { const controller = requireMassRenewalUiController(); controller.updateContext({ records: currentRecords, trashRecords: currentTrashRecords, renewalConfiguration: currentRenewalConfiguration, insertionLock: currentInsertionLock }); return controller.syncFromLock(); }
function renderMassRenewalSelection() { const controller = requireMassRenewalUiController(); controller.updateContext({ records: currentRecords, trashRecords: currentTrashRecords, renewalConfiguration: currentRenewalConfiguration, insertionLock: currentInsertionLock }); return controller.renderSelection(); }
function updateMassRenewalSelectionState() { return requireMassRenewalUiController().updateSelectionState(); }
function updateMassRenewalOrderState() { return requireMassRenewalUiController().updateOrderState(); }

async function checkTrashTemplateTargetTab(tabId) {
  const id = Number(tabId || 0);
  if (!id) return { ok: false, reason: 'invalid-tab-id', tabId: null };
  try {
    const tab = await chrome.tabs.get(id);
    if (!/^https:\/\/(?:www\.)?kleinanzeigen\.de\//i.test(String(tab?.url || ''))) {
      await logAppEvent('USER_TRASH_TEMPLATE_TARGET_CHECK_FAILED', { tabId: id, reason: 'unexpected-url', url: String(tab?.url || '').slice(0, 300) }, 'info');
      return { ok: false, reason: 'unexpected-url', tabId: id, windowId: tab?.windowId ?? null };
    }
    return { ok: true, reason: 'available', tabId: id, windowId: tab?.windowId ?? null };
  } catch (error) {
    const message = String(error?.message || error || '').slice(0, 300);
    const missing = /No tab with id|No tab with id:|tab not found|Invalid tab ID/i.test(message);
    await logAppEvent(missing ? 'USER_TRASH_TEMPLATE_TARGET_MISSING' : 'USER_TRASH_TEMPLATE_TARGET_CHECK_FAILED', { tabId: id, reason: missing ? 'missing' : 'check-failed', message }, 'info');
    return { ok: false, reason: missing ? 'missing' : 'check-failed', tabId: id, message };
  }
}

async function focusTrashTemplateTargetTab(tabId) {
  const id = Number(tabId || 0);
  if (!id) return { ok: false, reason: 'invalid-tab-id', tabId: null };
  try {
    const tab = await chrome.tabs.get(id);
    if (!/^https:\/\/(?:www\.)?kleinanzeigen\.de\//i.test(String(tab?.url || ''))) {
      await logAppEvent('USER_TRASH_TEMPLATE_TARGET_FOCUS_FAILED', { tabId: id, reason: 'unexpected-url', url: String(tab?.url || '').slice(0, 300) }, 'info');
      return { ok: false, reason: 'unexpected-url', tabId: id, windowId: tab?.windowId ?? null };
    }
    await chrome.tabs.update(id, { active: true });
    if (Number(tab?.windowId || 0) && chrome.windows?.update) await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
    await logAppEvent('USER_TRASH_TEMPLATE_TARGET_FOCUSED', { tabId: id, windowId: tab?.windowId ?? null });
    return { ok: true, reason: 'focused', tabId: id, windowId: tab?.windowId ?? null };
  } catch (error) {
    const message = String(error?.message || error || '').slice(0, 300);
    const missing = /No tab with id|No tab with id:|tab not found|Invalid tab ID/i.test(message);
    await logAppEvent(missing ? 'USER_TRASH_TEMPLATE_TARGET_MISSING' : 'USER_TRASH_TEMPLATE_TARGET_FOCUS_FAILED', { tabId: id, reason: missing ? 'missing' : 'focus-failed', message }, 'info');
    return { ok: false, reason: missing ? 'missing' : 'focus-failed', tabId: id, message };
  }
}

let archiveTrashInsertionUiController = null;
function requireArchiveTrashInsertionUiController() {
  if (archiveTrashInsertionUiController) return archiveTrashInsertionUiController;
  if (!ArchiveTrashInsertionUiController?.create) throw new Error('archive-trash-insertion-ui-controller.js must load before archive/trash insertion UI is used');
  archiveTrashInsertionUiController = ArchiveTrashInsertionUiController.create({
    ArchiveInsertionUiController,
    TrashTemplateUiController,
    document, URL, crypto, InventoryImport,
    fastMode: RENEWAL_MODE_FAST,
    normalizeRenewalMode,
    renewalModeLabel,
    accountGateModel,
    insertionLockActive,
    insertionLockUiText,
    invalidImportError,
    runtimeMessage,
    logAppEvent,
    displayPriceWithType,
    loadLocalPreview,
    setStatus,
    friendlyErrorMessage,
    friendlyArchiveImportError,
    confirmAction,
    requireAccountBoundAction,
    refreshInventories,
    publishTrashTemplateRecoveryActivity: activity => publishUiActivity({ id: 'trash-template-recovery', slot: 'status', createdAt: new Date().toISOString(), ...activity }),
    archiveTrashTemplateRecoveryActivity: archiveTrashTemplateRecoveryActivityOnReset,
    clearTrashTemplateRecoveryActivity: () => clearUiActivity('trash-template-recovery'),
    checkTrashTemplateTargetTab,
    focusTrashTemplateTargetTab,
    onStartArchiveInsertion: async ({ parsed, archiveInsertionId }) => {
      let stagingInventoryId = '';
      try {
        const staged = await stageArchiveImages(parsed, archiveInsertionId);
        stagingInventoryId = staged.stagingInventoryId;
        return await runtimeMessage({
          type: 'START_ARCHIVE_INSERTION', archiveInsertionId, stagingInventoryId,
          archiveType: parsed.archiveType, archiveVersion: parsed.archiveVersion,
          exportedAt: parsed.manifest?.exportedAt || null,
          sourceExtensionVersion: parsed.manifest?.sourceExtensionVersion || null,
          record: staged.record
        });
      } catch (error) {
        if (stagingInventoryId) await cleanupArchiveStaging(stagingInventoryId);
        throw error;
      }
    },
    onStartTrashTemplate: async (record, { supersedeFillId = null } = {}) => {
      if (!record) throw new Error('Papierkorb-Vorlage wurde nicht gefunden.');
      if (!requireAccountBoundAction()) throw new Error('Das Kleinanzeigen-Konto passt nicht zum ausgewählten Inventarprofil.');
      if (String(record.profileId || '') !== String(selectedProfileId || '')) throw new Error('Die Vorlage gehört nicht zum ausgewählten Inventarprofil.');
      if (insertionLockActive()) throw new Error(insertionLockUiText());
      return await runtimeMessage({ type: 'START_TRASH_TEMPLATE_FILL', inventoryId: record.inventoryId, supersedeFillId: supersedeFillId ? String(supersedeFillId) : null });
    },
    onStartKnownSingleInventoryCapture: startKnownSingleInventoryCapture,
    openInventoryReadOnly,
    openInventoryEdit,
    elements: {
      archiveInsertButton, archiveInsertDialog, archiveInsertClose, archiveInsertCancel, archiveInsertConfirm, archiveInsertKicker, archiveInsertTitle, archiveInsertIntro,
      archiveFileInput, archiveDropzone, archiveChooseFile, archiveValidationStatus, archivePreview, archivePreviewCover, archivePreviewTitle, archivePreviewMeta,
      archiveInsertSafety, archiveInsertSteps, archivePhase3Label, archiveProgressMessage, archiveProgressMessageTitle, archiveProgressMessageText, archiveBackgroundHint,
      archiveInsertActions, archiveProgressActions, archiveProgressClose, archiveProgressView, archiveProgressEdit,
      trashTemplateDialog, trashTemplateClose, trashTemplateCancel, trashTemplateConfirm, trashTemplateDone, trashTemplateRestart, trashTemplateTarget, trashTemplateInventory, trashTemplateTitle, trashTemplateIntro,
      trashTemplateSourceTitle, trashTemplateSourceMeta, trashTemplateCover, trashTemplateSteps, trashTemplateProgressMessage, trashTemplateProgressTitle, trashTemplateProgressText,
      trashTemplateConfirmActions, trashTemplateProgressActions
    }
  });
  archiveTrashInsertionUiController.updateContext({ renewalConfiguration: currentRenewalConfiguration, insertionLock: currentInsertionLock, selectedProfileId, trashRecords: currentTrashRecords });
  archiveTrashInsertionUiController.install();
  return archiveTrashInsertionUiController;
}
function archiveTrashInsertionStatus() { return requireArchiveTrashInsertionUiController().status(); }
function setTrackedArchiveInsertionId(value) { return requireArchiveTrashInsertionUiController().setTrackedArchiveInsertionId(value); }
function applyArchiveInsertionSessionSnapshot(session, options = {}) { return requireArchiveTrashInsertionUiController().applyArchiveInsertionSessionSnapshot(session, options); }
function refreshArchiveInsertionProgress(options = {}) { return requireArchiveTrashInsertionUiController().refreshArchiveInsertionProgress(options); }
function openTrashTemplateDialog(record) { const controller = requireArchiveTrashInsertionUiController(); controller.updateContext({ renewalConfiguration: currentRenewalConfiguration, insertionLock: currentInsertionLock, selectedProfileId, trashRecords: currentTrashRecords }); return controller.openTrashTemplateDialog(record); }
function trashTemplateInventoryGate() { return requireArchiveTrashInsertionUiController().trashTemplateInventoryGate(); }
function syncTrashTemplateInventoryButton() { return requireArchiveTrashInsertionUiController().syncTrashTemplateInventoryButton(); }
function refreshTrashTemplateDialogStatus(options = {}) { return requireArchiveTrashInsertionUiController().refreshTrashTemplateDialogStatus(options); }
function syncArchiveInsertionUiFromLock() {
  const insertionController = requireArchiveTrashInsertionUiController();
  insertionController.updateContext({ renewalConfiguration: currentRenewalConfiguration, insertionLock: currentInsertionLock, selectedProfileId, trashRecords: currentTrashRecords });
  insertionController.syncFromLock();
  const massController = requireMassRenewalUiController();
  massController.updateContext({ records: currentRecords, trashRecords: currentTrashRecords, renewalConfiguration: currentRenewalConfiguration, insertionLock: currentInsertionLock });
  massController.syncFromLock();
  const massStatus = massController.status();
  if (massRenewalDialog?.open && !massStatus.currentBatch) {
    if (massRenewalOrderPanel && !massRenewalOrderPanel.classList.contains('hidden')) massController.updateOrderState();
    else massController.updateSelectionState();
  }
  syncInventoryActionStates('insertion-lock-sync');
  if (typeof scheduleActionsStateSnapshot === 'function') scheduleActionsStateSnapshot('insertion-lock-sync');
}

let appLayoutController = null;
function requireAppLayoutController() {
  if (!appLayoutController) {
    appLayoutController = AppLayoutController.create({
      window,
      document,
      elements: {
        appHeader, controlPanel, inventorySection, trashSection,
        inventoryStickySentinel, trashStickySentinel,
        inventoryStickyHeader, trashStickyHeader,
        inventoryStickySlot, trashStickySlot,
        inventoryStickyOcclusion, trashStickyOcclusion
      },
      getCurrentView: () => currentView,
      getViewMode: () => globalListViewMode,
      logEvent: (event, details = {}, severity = 'info') => logAppEvent(event, details, severity)
    });
  }
  return appLayoutController;
}
function stickyShellTopGap() { return requireAppLayoutController().shellTopGap(); }
function stickyHeaderThreshold() { return requireAppLayoutController().headerThreshold(); }
function syncPinnedHeaderGeometry(ctx) { return requireAppLayoutController().syncPinnedHeaderGeometry(ctx); }
function setStickyHeaderPinned(ctx, shouldPin) { return requireAppLayoutController().setPinned(ctx, shouldPin); }
function syncListStickyHeaders() { return requireAppLayoutController().syncStickyHeaders(); }
function scheduleListStickyHeaderSync() { return requireAppLayoutController().scheduleStickyHeaderSync(); }

function switchMainView(view) {
  currentView = view === 'trash' ? 'trash' : 'inventory';
  const trashActive = currentView === 'trash';
  inventorySection.classList.toggle('hidden', trashActive);
  trashSection.classList.toggle('hidden', !trashActive);
  inventoryViewButton.classList.toggle('active', !trashActive);
  trashViewButton.classList.toggle('active', trashActive);
  inventoryViewButton.setAttribute('aria-pressed', String(!trashActive));
  trashViewButton.setAttribute('aria-pressed', String(trashActive));
  if (trashActive) renderTrash(currentTrashRecords);
  else renderInventories(currentRecords);
  scheduleListStickyHeaderSync();
}

function runtimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      if (!response?.ok) {
        const error = new Error(response?.error || 'Unbekannter Fehler');
        if (response?.errorCode) error.code = String(response.errorCode);
        if (response?.errorDetails && typeof response.errorDetails === 'object') error.details = { ...response.errorDetails };
        return reject(error);
      }
      resolve(response.result);
    });
  });
}

function tabMessageOnce(tabId, message) { return tabPageInspectionController.tabMessageOnce(tabId, message); }
function tabMessage(tabId, message, options = {}) { return tabPageInspectionController.tabMessage(tabId, message, options); }

function formatDate(value) {
  if (typeof inventoryFormatting !== 'undefined') return inventoryFormatting.formatDate(value);
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function displayPrice(record) {
  if (typeof inventoryFormatting !== 'undefined') return inventoryFormatting.displayPrice(record);
  const value = record.price?.displayed || record.price?.value || '–';
  const normalized = String(value).trim();
  if (/€|EUR/i.test(normalized)) return normalized;
  return record.price?.value ? `${record.price.value} €` : normalized;
}

function displayPriceWithType(record) { return inventoryFormatting.displayPriceWithType(record); }

function categoryLabel(record) {
  if (typeof inventoryFormatting !== 'undefined') return inventoryFormatting.categoryLabel(record);
  return record.category?.path?.join(' › ') || record.categoryPath?.join(' › ') || '–';
}

function compactCategoryLabel(record) {
  if (typeof inventoryFormatting !== 'undefined') return inventoryFormatting.compactCategoryLabel(record);
  const path = Array.isArray(record?.category?.path) && record.category.path.length
    ? record.category.path
    : Array.isArray(record?.categoryPath) ? record.categoryPath : [];
  if (path.length) return String(path[path.length - 1] || '–');
  const full = String(categoryLabel(record) || '–');
  const parts = full.split(/\s*[›>]\s*/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '–';
}

function normalizeListViewMode(value) {
  return String(value || '') === 'compact' ? 'compact' : 'detailed';
}

function syncListViewModeControls() {
  const detailedActive = globalListViewMode !== 'compact';
  globalViewDetailed?.classList.toggle('active', detailedActive);
  globalViewDetailed?.setAttribute('aria-pressed', String(detailedActive));
  globalViewCompact?.classList.toggle('active', !detailedActive);
  globalViewCompact?.setAttribute('aria-pressed', String(!detailedActive));
  inventoryList?.classList.toggle('view-compact', globalListViewMode === 'compact');
  trashList?.classList.toggle('view-compact', globalListViewMode === 'compact');
}

async function loadListViewModes() {
  const stored = await chrome.storage.local.get([
    GLOBAL_LIST_VIEW_MODE_KEY,
    LEGACY_INVENTORY_LIST_VIEW_MODE_KEY,
    LEGACY_TRASH_LIST_VIEW_MODE_KEY
  ]).catch(() => ({}));
  const hasGlobal = stored?.[GLOBAL_LIST_VIEW_MODE_KEY] === 'compact' || stored?.[GLOBAL_LIST_VIEW_MODE_KEY] === 'detailed';
  if (hasGlobal) {
    globalListViewMode = normalizeListViewMode(stored[GLOBAL_LIST_VIEW_MODE_KEY]);
  } else {
    const inventoryLegacy = stored?.[LEGACY_INVENTORY_LIST_VIEW_MODE_KEY];
    const trashLegacy = stored?.[LEGACY_TRASH_LIST_VIEW_MODE_KEY];
    const migrationSource = inventoryLegacy === 'compact' || inventoryLegacy === 'detailed'
      ? inventoryLegacy
      : trashLegacy;
    globalListViewMode = normalizeListViewMode(migrationSource);
    await chrome.storage.local.set({ [GLOBAL_LIST_VIEW_MODE_KEY]: globalListViewMode }).catch(() => {});
    void logAppEvent('UI_GLOBAL_LIST_VIEW_MIGRATED', {
      mode: globalListViewMode,
      inventoryLegacy: inventoryLegacy || null,
      trashLegacy: trashLegacy || null,
      source: inventoryLegacy ? 'inventory' : trashLegacy ? 'trash' : 'default'
    });
  }
  await chrome.storage.local.remove([LEGACY_INVENTORY_LIST_VIEW_MODE_KEY, LEGACY_TRASH_LIST_VIEW_MODE_KEY]).catch(() => {});
  syncListViewModeControls();
}

async function setGlobalListViewMode(value) {
  const mode = normalizeListViewMode(value);
  if (globalListViewMode === mode) return;
  globalListViewMode = mode;
  syncListViewModeControls();
  renderInventories(currentRecords);
  renderTrash(currentTrashRecords);
  await chrome.storage.local.set({ [GLOBAL_LIST_VIEW_MODE_KEY]: mode }).catch(() => {});
  void logAppEvent('USER_GLOBAL_LIST_VIEW_CHANGED', { mode, currentView });
  scheduleListStickyHeaderSync();
}

function compactActionIcon(name) { return sharedUiHelpers.compactActionIcon(name); }

function makeCompactIconButton(options) { return sharedUiHelpers.makeCompactIconButton(options); }

function artLabel(record) { return inventoryFormatting.artLabel(record); }

function endDateLabel(record) { return inventoryFormatting.endDateLabel(record); }

function formatCalendarDate(value) { return inventoryFormatting.formatCalendarDate(value); }

function listingDatePresentation(record) { return inventoryFormatting.listingDatePresentation(record); }

function listingDateLabel(record) { return inventoryFormatting.listingDateLabel(record); }





function endDateWithRelativeLabel(record, now = new Date()) { return inventoryFormatting.endDateWithRelativeLabel(record, now); }

function comparisonStatusLabel(comparison) { return inventoryFormatting.comparisonStatusLabel(comparison); }

async function handleRecognizedProfile(profileName) {
  const normalized = String(profileName || '').trim();
  if (!normalized) return null;
  const state = await runtimeMessage({ type: 'RECOGNIZE_PROFILE', profileName: normalized });
  const recognizedProfile = state?.profile || null;
  await refreshProfileState().catch(() => {});
  const profileId = String(recognizedProfile?.profileId || '');
  if (!profileId || !Number(state?.unprofiledCount || 0) || migrationPromptedProfiles.has(profileId)) return state;
  migrationPromptedProfiles.add(profileId);
  const count = Number(state.unprofiledCount || 0);
  const confirmed = await confirmAction({
    title: 'Gespeicherte Anzeigen diesem Profil zuordnen?',
    text: `Kleinanzeigen ist als „${recognizedProfile.displayName}“ angemeldet.`,
    detail: `${count} bisher nicht zugeordnete gespeicherte ${count === 1 ? 'Anzeige' : 'Anzeigen'} können diesem Profil zugeordnet werden.`,
    confirmLabel: 'Jetzt zuordnen'
  });
  if (!confirmed) {
    void logAppEvent('USER_PROFILE_MIGRATION_DECLINED', { profileId, count });
    return state;
  }
  void logAppEvent('USER_PROFILE_MIGRATION_CONFIRMED', { profileId, count });
  const result = await runtimeMessage({ type: 'ASSIGN_UNPROFILED_INVENTORIES', profileId });
  setStatus('ready', 'Gespeicherte Anzeigen zugeordnet', `${result.migrated} bestehende ${Number(result.migrated) === 1 ? 'Anzeige wurde' : 'Anzeigen wurden'} dem angemeldeten Profil zugeordnet.`);
  await refreshProfileState().catch(() => {});
  await refreshInventories();
  return { ...state, unprofiledCount: Math.max(0, count - Number(result.migrated || 0)) };
}

function publicAvailabilityPending(record) { return inventoryFormatting.publicAvailabilityPending(record); }

function templateReady(record) { return inventoryFormatting.templateReady(record); }

function insertionLockActive() {
  return Boolean(currentInsertionLock?.locked);
}

function insertionLockUiText() {
  if (!insertionLockActive()) return '';
  const title = String(currentInsertionLock?.title || '').trim();
  return title
    ? `Für „${title}“ läuft bereits ein Inserierungsvorgang. Schließe oder beende diesen Vorgang zuerst.`
    : 'Es läuft bereits ein Inserierungsvorgang. Schließe oder beende diesen Vorgang zuerst.';
}

function renewalIsReplacementReady(record) { return inventoryFormatting.renewalIsReplacementReady(record); }

function renewalAutoCompletionPending(record) { return inventoryFormatting.renewalAutoCompletionPending(record); }

function renewalStatusLabel(record) { return inventoryFormatting.renewalStatusLabel(record); }

function renewalStatusText(record) { return inventoryFormatting.renewalStatusText(record); }

function canDiscardRenewalDraft(record) { return inventoryFormatting.canDiscardRenewalDraft(record); }



async function openInventoryEdit(record) {
  const adId = String(record?.adId || '');
  if (!/^\d+$/.test(adId)) throw new Error('Diese Inventarposition besitzt keine gültige Anzeigen-ID.');
  void logAppEvent('USER_OPEN_EDIT_AD_CLICK', { inventoryId: record.inventoryId, adId });
  try {
    const opened = await runtimeMessage({ type: 'OPEN_EDIT_AD', adId });
    void logAppEvent('USER_OPEN_EDIT_AD_SUCCEEDED', { inventoryId: record.inventoryId, adId, tabId: opened?.tabId || null });
    return opened;
  } catch (error) {
    void logAppEvent('USER_OPEN_EDIT_AD_FAILED', { inventoryId: record.inventoryId, adId, message: error.message }, 'error');
    setFriendlyErrorStatus(error, 'Anzeige nicht geöffnet');
    throw error;
  }
}

async function openInventoryReadOnly(record) {
  const adId = String(record?.adId || '');
  if (!/^\d+$/.test(adId)) throw new Error('Diese Inventarposition besitzt keine gültige Anzeigen-ID.');
  const inventoryId = String(record?.inventoryId || '');
  const publicUrl = String(record?.listingMeta?.publicUrl || record?.publicUrl || record?.canonicalUrl || record?.sourceUrl || '');
  void logAppEvent('USER_OPEN_READONLY_AD_CLICK', { inventoryId, adId, publicUrlAvailable: Boolean(publicUrl) });
  try {
    const opened = await runtimeMessage({ type: 'OPEN_READONLY_AD', adId, inventoryId, publicUrl });
    void logAppEvent('USER_OPEN_READONLY_AD_SUCCEEDED', { inventoryId, adId, tabId: opened?.tabId || null, urlSource: opened?.urlSource || null });
    return opened;
  } catch (error) {
    void logAppEvent('USER_OPEN_READONLY_AD_FAILED', { inventoryId, adId, message: error.message }, 'error');
    setFriendlyErrorStatus(error, 'Anzeige nicht erreichbar');
    throw error;
  }
}



















let inventoryRenderController = null;
function requireInventoryRenderController() {
  if (!inventoryRenderController) {
    inventoryRenderController = InventoryRenderController.create({
      RecordCardView,
      InventoryCardRenderer,
      TrashCardRenderer,
      document,
      Element,
      InventoryView,
      formatting: inventoryFormatting,
      sharedUiHelpers,
      fastMode: RENEWAL_MODE_FAST,
      elements: { inventoryList, trashList, inventoryCount, trashCount, inventoryHeaderCount, trashHeaderCount, clearInventoryButton, renewalProgressShortcut, renewalProgressShortcutTitle, renewalProgressShortcutText },
      accountGateModel,
      selectedConcreteProfile,
      insertionLockActive,
      insertionLockUiText,
      requireAccountBoundAction,
      confirmAction,
      confirmAutomatedRenewalStart,
      runtimeMessage,
      renderAppNotice,
      setStatus,
      refreshInventories,
    publishTrashTemplateRecoveryActivity: activity => publishUiActivity({ id: 'trash-template-recovery', slot: 'status', createdAt: new Date().toISOString(), ...activity }),
    clearTrashTemplateRecoveryActivity: () => clearUiActivity('trash-template-recovery'),
      friendlyErrorMessage,
      setOnlineAvailabilityNotice,
      setFriendlyErrorStatus,
      requireRenewalDialogController,
      renewalModeLabel,
      normalizeRenewalMode,
      renewalDialogStatus,
      setRenewalPhaseStates,
      setRenewalProgressMessage,
      logAppEvent,
      exportInventoryRecord,
      loadLocalPreview,
      openInventoryReadOnly,
      openTrashTemplateDialog,
      purgePreviewUrlsForRecord,
      syncListViewModeControls
    });
  }
  return inventoryRenderController;
}

function renderInventories(records = currentRecords) {
  currentRecords = Array.isArray(records) ? records : [];
  const controller = requireInventoryRenderController();
  controller.updateContext({ records: currentRecords, trashRecords: currentTrashRecords, selectedProfileId, globalListViewMode, inventoryViewState });
  return controller.renderInventories(currentRecords);
}

function trashReasonLabel(record) { return inventoryFormatting.trashReasonLabel(record); }

function trashRetentionLabel(record) { return inventoryFormatting.trashRetentionLabel(record); }

function trashRetentionPresentation(record) { return inventoryFormatting.trashRetentionPresentation(record); }

function renderTrash(records = currentTrashRecords) {
  currentTrashRecords = Array.isArray(records) ? records : [];
  const controller = requireInventoryRenderController();
  controller.updateContext({ records: currentRecords, trashRecords: currentTrashRecords, selectedProfileId, globalListViewMode, inventoryViewState });
  return controller.renderTrash(currentTrashRecords);
}

function bulkStateMatchesSelectedProfile(state, profileId = selectedProfileId) {
  if (!state) return false;
  const selected = String(profileId || '');
  const runProfile = String(state?.profileId || '');
  if (!selected || selected === UNASSIGNED_PROFILE_ID || !runProfile) return false;
  return selected === runProfile;
}

function syncInventoryActionStates(source = 'inventory-action-sync') {
  syncSingleInventoryButtonState();
  syncFullInventoryButtonState();
  markActionsStateSynced(source);
  scheduleActionsStateSnapshot(source);
}

function syncFullInventoryButtonState() {
  const bulkBusy = bulkStartInFlight || String(currentBulkRunState?.status || '') === 'running' || Boolean(currentBulkRunState?.retryAdId);
  const gate = accountGateModel();
  const model = sidebarActionDisableModel('fullInventoryButton');
  fullInventoryButton.disabled = model.disabled === true;
  fullInventoryButton.title = !gate.allowed
    ? gate.tooltip
    : bulkBusy
      ? 'Nicht verfügbar: Es läuft bereits eine Erfassung.'
      : singleInventoryCaptureBusy()
        ? 'Nicht verfügbar: Eine einzelne Anzeige wird gerade erfasst.'
        : 'Alle laufenden Anzeigen des ausgewählten Kleinanzeigen-Kontos erfassen';
  syncActionsActivityIndicator();
  if (typeof scheduleActionsStateSnapshot === 'function') scheduleActionsStateSnapshot('full-inventory-button-sync');
}

function bulkRunCardActionModel(state) {
  const active = String(state?.status || '') === 'running' || Boolean(state?.retryAdId);
  return active
    ? { mode: 'minimize', label: 'Fortschritt minimieren' }
    : { mode: 'dismiss', label: 'Meldung ausblenden' };
}

function renderBulkState(state) {
  currentBulkRunState = state && typeof state === 'object' ? state : null;
  const currentRunId = String(currentBulkRunState?.runId || currentBulkRunState?.bulkRunId || '');
  if (currentRunId && (String(currentBulkRunState?.status || '') === 'running' || currentBulkRunState?.retryAdId)) {
    const captureState = inventoryCaptureStatus();
    const needsRehydration = bulkStateMatchesSelectedProfile(currentBulkRunState) && (
      captureState.mode !== 'bulk' ||
      captureState.dialogState === 'closed' ||
      String(captureState.trackedRunId || '') !== currentRunId
    );
    if (needsRehydration) {
      const rebound = bindExistingBulkInventoryCapture(currentBulkRunState, { setReentryTarget: true });
      if (rebound) {
        void logAppEvent('UI_INVENTORY_CAPTURE_BULK_REENTRY_BOUND', {
          runId: currentRunId,
          bulkRunId: currentRunId,
          status: String(currentBulkRunState?.status || ''),
          source: 'bulk-state-render'
        });
      }
    } else {
      requireInventoryCaptureController().ensureBulkReentry(currentRunId);
    }
  }
  syncInventoryCaptureBulkModal(currentBulkRunState);
  syncInventoryCaptureProgressShortcut();
  syncFullInventoryButtonState();
  if (!bulkStateMatchesSelectedProfile(state)) {
    bulkRunStatus.classList.add('hidden');
    bulkRunStatus.replaceChildren();
    { const activity = currentUiActivity(); if (activity?.slot === 'bulk') clearUiActivity(activity.id); }
    return;
  }
  const skippedExisting = Number(state?.skippedExistingCount || state?.skippedExistingIds?.length || 0);
  const processed = Array.isArray(state?.processedIds) ? state.processedIds.length : Number(state.successCount || 0) + Number(state.failedCount || 0) + skippedExisting;
  const total = Number(state.expectedTotal || 0);
  const messageId = bulkStatusMessageId(state);
  if (isUiMessageDismissed('bulkRunStatus', messageId)) {
    bulkRunStatus.classList.add('hidden');
    bulkRunStatus.replaceChildren();
  } else {
    bulkRunStatus.classList.remove('hidden');
    bulkRunStatus.replaceChildren();
    const head = document.createElement('div');
    head.className = 'bulk-run-head';
    const strong = document.createElement('strong');
    const activityModel = inventoryCaptureBulkProgressModel(state);
    strong.textContent = state.retryAdId ? `Erneuter Versuch · ${state.retryTitle || state.retryAdId}` : (activityModel.title || 'Anzeigen erfassen');
    const cardAction = bulkRunCardActionModel(state);
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = cardAction.mode === 'minimize' ? 'message-minimize' : 'message-dismiss';
    dismiss.setAttribute('aria-label', cardAction.label);
    dismiss.title = cardAction.label;
    if (cardAction.mode === 'minimize') {
      const chevron = document.createElement('span');
      chevron.className = 'message-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      dismiss.append(chevron);
    } else {
      dismiss.textContent = '×';
    }
    dismiss.addEventListener('click', async () => {
      await dismissUiMessage('bulkRunStatus', messageId);
      bulkRunStatus.classList.add('hidden');
      bulkRunStatus.replaceChildren();
      const currentActivity = currentUiActivity();
      if (cardAction.mode === 'dismiss' && currentActivity?.id === `bulk:${String(state?.runId || state?.bulkRunId || '')}`) {
        archiveUiActivity(currentActivity);
        clearUiActivity(currentActivity.id);
      }
      syncInventoryCaptureProgressShortcut();
      void logAppEvent(cardAction.mode === 'minimize' ? 'USER_PROGRESS_MINIMIZED' : 'USER_STATUS_MESSAGE_DISMISSED', { messageType: 'bulk-run', messageId, runId: state.runId || null, bulkRunId: state.bulkRunId || state.runId || null });
    });
    head.append(strong, dismiss);
    const p = document.createElement('p');
    p.textContent = activityModel.facts || `${processed}/${total || '?'} Anzeigen abgeschlossen${skippedExisting ? ` · ${skippedExisting} bereits vorhanden` : ''}${state.currentPage ? ` · Seite ${state.currentPage}` : ''}${state.currentTitle ? ` · ${state.currentTitle}` : ''}`;
    const timestamp = document.createElement('p');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = messageTimestampText(bulkStatusTimestamp(state));
    bulkRunStatus.append(head, p, timestamp);
    const reopen = document.createElement('button');
    reopen.type = 'button';
    reopen.className = 'bulk-run-reopen';
    reopen.textContent = inventoryCaptureBulkStateIsTerminal(state) ? 'Ergebnis anzeigen' : 'Fortschritt anzeigen';
    reopen.disabled = singleInventoryCaptureBusy() && inventoryCaptureStatus().reentryTarget?.mode === 'single';
    reopen.addEventListener('click', () => {
      const runId = String(state?.runId || state?.bulkRunId || '');
      if (runId) requireInventoryCaptureController().reopenTarget({ mode: 'bulk', runId });
    });
    bulkRunStatus.append(reopen);
    const runId = String(state?.runId || state?.bulkRunId || '');
    publishUiActivity({
      id: `bulk:${runId}`,
      slot: 'bulk',
      kind: activityModel.kind === 'error' ? 'error' : activityModel.kind === 'waiting' ? 'waiting' : activityModel.terminal ? 'ready' : '',
      title: activityModel.title || strong.textContent,
      text: activityModel.text || '',
      facts: activityModel.facts || '',
      badgeLabel: activityModel.badgeLabel || '',
      createdAt: bulkStatusTimestamp(state) || new Date().toISOString(),
      active: !activityModel.terminal || Boolean(state?.retryAdId)
    }, { suppressArchivedReplay: Boolean(activityModel.terminal) });
  }

  if (!isUiMessageDismissed('bulkRunStatus', messageId) && state.failures?.length) {
    const warn = document.createElement('p');
    warn.className = 'bulk-warning';
    warn.textContent = state.failures.length === 1 ? 'Bei 1 Anzeige ist ein Problem aufgetreten. Die betroffene Karte auf „Meine Anzeigen“ wird rot markiert.' : `Bei ${state.failures.length} Anzeigen sind Probleme aufgetreten. Die betroffenen Karten auf „Meine Anzeigen“ werden rot markiert.`;
    bulkRunStatus.append(warn);

    const list = document.createElement('div');
    list.className = 'failure-list';
    for (const failure of state.failures) {
      const card = document.createElement('article');
      card.className = 'failure-card';
      const head = document.createElement('div');
      head.className = 'failure-card-head';
      const label = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = failure.title || `Anzeige ${failure.adId}`;
      const id = document.createElement('div');
      id.className = 'failure-id';
      id.textContent = `ID ${failure.adId}${failure.lastRetryAt ? ` · letzter Versuch ${formatDate(failure.lastRetryAt)}` : ''}`;
      label.append(title, id);
      head.append(label);
      const error = document.createElement('p');
      error.className = 'failure-error';
      error.textContent = friendlyErrorMessage(failure.error, 'Diese Anzeige konnte nicht erfasst werden.');
      const actions = document.createElement('div');
      actions.className = 'failure-actions';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'retry-button';
      retry.textContent = state.retryAdId === String(failure.adId) ? 'Erneuter Versuch läuft …' : 'Erneut versuchen';
      retry.disabled = Boolean(state.retryAdId) || state.status === 'running';
      retry.addEventListener('click', async () => {
        void logAppEvent('USER_RETRY_INVENTORY_CLICK', { adId: String(failure.adId), title: failure.title || '' });
        retry.disabled = true;
        retry.textContent = 'Erneuter Versuch läuft …';
        try {
          const result = await runtimeMessage({ type: 'RETRY_BULK_FAILURE', adId: String(failure.adId), title: failure.title || '' });
          void logAppEvent('USER_RETRY_INVENTORY_SUCCEEDED', { adId: String(failure.adId) });
          renderBulkState(result.state);
          await refreshInventories();
        } catch (error) {
          void logAppEvent('USER_RETRY_INVENTORY_FAILED', { adId: String(failure.adId), message: error.message }, 'error');
          setStatus('error', `Erneuter Versuch für Anzeige ${failure.adId} fehlgeschlagen`, friendlyErrorMessage(error));
          await refreshBulkStatus();
        }
      });
      actions.append(retry);
      card.append(head, error, actions);
      list.append(card);
    }
    bulkRunStatus.append(list);
  }
  if (!isUiMessageDismissed('bulkRunStatus', messageId) && state.issues?.length) {
    const issue = document.createElement('p');
    issue.className = 'bulk-warning';
    const issueModel = inventoryCaptureBulkProgressModel(state);
    issue.textContent = issueModel.text || 'Die Erfassung benötigt weitere Prüfung.';
    bulkRunStatus.append(issue);
  }
  const busy = state.status === 'running' || Boolean(state.retryAdId);
  syncFullInventoryButtonState();
  clearInventoryButton.disabled = busy || currentRecords.length === 0;
  syncActionsActivityIndicator();
}

async function refreshBulkStatus() {
  try {
    await ensureDismissedUiMessagesLoaded();
    renderBulkState(await runtimeMessage({ type: 'GET_BULK_RUN_STATUS' }));
  } catch { /* Statusanzeige ist ergänzend. */ }
}

function latestAutomatedRenewal(records = currentRecords) {
  return [...(records || [])]
    .filter(record => record?.renewal?.renewalId && record?.renewal?.autoReplacementAllowed)
    .sort((a, b) => Date.parse(b?.renewal?.updatedAt || b?.capturedAt || 0) - Date.parse(a?.renewal?.updatedAt || a?.capturedAt || 0))[0] || null;
}

function syncRenewalProgressUi(records = currentRecords, notice = currentAppNotice) {
  const status = renewalDialogStatus();
  if (status.mode === 'confirm') return;
  const active = status.trackedRenewalId
    ? (records || []).find(record => String(record?.renewal?.renewalId || '') === String(status.trackedRenewalId))
    : latestAutomatedRenewal(records);
  if (active) {
    requireRenewalDialogController().trackActive(active);
    showRenewalProgress(active, { forceOpen: renewalStartDialog?.open && renewalDialogStatus().mode !== 'confirm' });
    return;
  }
  const current = renewalDialogStatus();
  if (notice?.event === 'renewal-replacement-completed' && (!current.trackedRenewalId || String(notice.renewalId || '') === String(current.trackedRenewalId))) {
    void showRenewalCompletion(notice, records, { forceOpen: renewalStartDialog?.open && current.mode !== 'confirm' });
    return;
  }
  if (current.trackedRenewalId && current.mode === 'progress') {
    renewalProgressShortcut.classList.remove('hidden');
    renewalProgressShortcutTitle.textContent = 'Austausch wird aktualisiert';
    renewalProgressShortcutText.textContent = 'Der aktuelle Fortschritt wird geladen …';
  } else if (!current.trackedRenewalId) {
    renewalProgressShortcut.classList.add('hidden');
  }
}

async function refreshInventories({ profileState = null } = {}) {
  const resolvedProfileState = profileState || await runtimeMessage({ type: 'GET_PROFILE_STATE' });
  renderProfileSwitcher(resolvedProfileState);
  const [records, trashRecords, notice, insertionLock] = await Promise.all([
    runtimeMessage(scopedProfileMessage('LIST_INVENTORIES')),
    runtimeMessage(scopedProfileMessage('LIST_TRASH')),
    runtimeMessage({ type: 'GET_APP_NOTICE' }).catch(() => null),
    runtimeMessage({ type: 'GET_INSERTION_LOCK_STATE' }).catch(() => ({ locked: false }))
  ]);
  currentRecords = Array.isArray(records) ? records : [];
  currentTrashRecords = Array.isArray(trashRecords) ? trashRecords : [];
  currentInsertionLock = insertionLock && typeof insertionLock === 'object' ? insertionLock : { locked: false };
  if (massRenewalUiController) massRenewalUiController.updateContext({ records: currentRecords, trashRecords: currentTrashRecords, renewalConfiguration: currentRenewalConfiguration, insertionLock: currentInsertionLock });
  if (archiveTrashInsertionUiController) archiveTrashInsertionUiController.updateContext({ renewalConfiguration: currentRenewalConfiguration, insertionLock: currentInsertionLock, selectedProfileId, trashRecords: currentTrashRecords });
  syncArchiveInsertionUiFromLock();
  syncActionsActivityIndicator();
  inventoryHeaderCount.textContent = String(currentRecords.length);
  trashHeaderCount.textContent = String(currentTrashRecords.length);
  renderAppNotice(notice || currentAppNotice);
  if (currentView === 'trash') renderTrash(currentTrashRecords);
  else renderInventories(currentRecords);
  syncRenewalProgressUi(currentRecords, notice || currentAppNotice);
}

async function refreshRenewalProgressOnly() {
  const resolvedProfileState = await runtimeMessage({ type: 'GET_PROFILE_STATE' }).catch(() => currentProfileState);
  renderProfileSwitcher(resolvedProfileState);
  const [records, notice, insertionLock] = await Promise.all([
    runtimeMessage(scopedProfileMessage('LIST_INVENTORIES')),
    runtimeMessage({ type: 'GET_APP_NOTICE' }).catch(() => null),
    runtimeMessage({ type: 'GET_INSERTION_LOCK_STATE' }).catch(() => ({ locked: false }))
  ]);
  currentRecords = Array.isArray(records) ? records : [];
  currentInsertionLock = insertionLock && typeof insertionLock === 'object' ? insertionLock : { locked: false };
  syncArchiveInsertionUiFromLock();
  syncActionsActivityIndicator();
  renderAppNotice(notice || currentAppNotice);
  syncRenewalProgressUi(currentRecords, notice || currentAppNotice);
}

function scheduleLiveInventoryRefresh(reason = 'changed', delayMs = 140) {
  if (inventoryLiveRefreshTimer) clearTimeout(inventoryLiveRefreshTimer);
  inventoryLiveRefreshTimer = setTimeout(async () => {
    inventoryLiveRefreshTimer = null;
    try {
      if (reason === 'renewal-updated') await refreshRenewalProgressOnly();
      else await refreshInventories();
      void logAppEvent('INVENTORY_LIVE_REFRESH_APPLIED', { reason, visibleCount: currentRecords.length, progressOnly: reason === 'renewal-updated' });
    } catch (error) {
      void logAppEvent('INVENTORY_LIVE_REFRESH_FAILED', { reason, message: error.message }, 'warning');
    }
  }, Math.max(0, Number(delayMs) || 0));
}

chrome.runtime.onMessage.addListener(message => {
  const messageContract = MessageContractRegistry.route(message?.type, 'app');
  if (messageContract.action === 'ignore') return;
  if (messageContract.action === 'reject') {
    const error = MessageContractRegistry.errorFor(messageContract);
    void logAppEvent('MESSAGE_CONTRACT_REJECTED', {
      requestType: message?.type || null,
      target: 'app',
      errorCode: error.code,
      registered: messageContract.registered,
      targets: messageContract.targets
    }, 'warning', 'message-contract');
    return;
  }
  if (message?.type === 'ARCHIVE_INSERTION_STATE_CHANGED') {
    const controller = requireArchiveTrashInsertionUiController();
    controller.updateContext({ renewalConfiguration: currentRenewalConfiguration, insertionLock: currentInsertionLock, selectedProfileId });
    controller.handleArchiveStateChanged(message?.session, String(message.reason || 'state-event'));
    return;
  }
  if (message?.type === 'PLATFORM_ACCESS_RESTRICTION_CHANGED') {
    if (message?.state?.active) {
      transitionAccountGate({ type: 'RESTRICTED' }, { source: 'platform-safety', reason: 'platform-access-restriction-changed', forceRender: true });
      inventoryButton.dataset.pageReady = 'false';
      setStatus('error', 'Zugriff vorübergehend eingeschränkt', 'Kleinanzeigen hat den Zugriff vorübergehend eingeschränkt. Automatisierte Aktionen wurden sicher beendet. Bitte versuche es später erneut.', 'retry-platform-access');
    } else {
      schedulePageInspect(0);
    }
    return;
  }
  if (message?.type !== 'INVENTORY_DATA_CHANGED') return;
  if (message.reason === 'workflow-emergency-reset') {
    handleEmergencyWorkflowReset();
  }
  if (message.reason === 'mass-renewal-updated') return;
  if (['trash-template-updated', 'trash-template-published'].includes(String(message.reason || '')) && message?.details?.fillId) {
    const controller = requireArchiveTrashInsertionUiController();
    controller.updateContext({ renewalConfiguration: currentRenewalConfiguration, insertionLock: currentInsertionLock, selectedProfileId });
    controller.handleTrashTemplateDataChanged(message.details);
  }
  scheduleLiveInventoryRefresh(String(message.reason || 'changed'), message.reason === 'bulk-finished' ? 0 : 140);
});

function updateManagedWorkerTabCache(registry) {
  managedWorkerTabIds.clear();
  const entries = registry && typeof registry === 'object' ? Object.values(registry) : [];
  for (const entry of entries) {
    const id = Number(entry?.tabId || 0);
    if (id && entry?.managed === true && String(entry?.lifecycleState || '') !== 'gone') managedWorkerTabIds.add(id);
  }
}

async function primeManagedWorkerTabCache() {
  const stored = await chrome.storage.session.get(TAB_REGISTRY_STORAGE_KEY).catch(() => ({}));
  updateManagedWorkerTabCache(stored?.[TAB_REGISTRY_STORAGE_KEY]);
}

async function matchingKleinanzeigenTabs() {
  const { userTabs, discardedTabs, activeTabs } = await tabPageInspectionController.queryKleinanzeigenTabs(managedWorkerTabIds);
  knownUserKleinanzeigenTabIds.clear();
  for (const tab of userTabs) if (tab?.id) knownUserKleinanzeigenTabIds.add(Number(tab.id));
  const discarded = discardedTabs;
  lastDiscardedKleinanzeigenTabs = discarded;
  const discardedIds = new Set(discarded.map(tab => Number(tab.id)));
  for (const tab of discarded) {
    const id = Number(tab.id);
    if (!discardedTabBackoff.has(id)) {
      discardedTabBackoff.set(id, Date.now());
      void logAppEvent('TAB_DISCARDED_BACKOFF_STARTED', { tabId: id, path: (() => { try { return new URL(tab.url).pathname; } catch { return ''; } })() });
    }
  }
  for (const id of [...discardedTabBackoff.keys()]) {
    if (!discardedIds.has(id) && userTabs.some(tab => Number(tab.id) === id)) {
      const startedAt = discardedTabBackoff.get(id) || Date.now();
      discardedTabBackoff.delete(id);
      void logAppEvent('TAB_DISCARDED_BACKOFF_ENDED', { tabId: id, durationMs: Date.now() - startedAt });
    }
  }
  return activeTabs;
}

async function performInspectPage({ background = false } = {}) {
  const platformRestriction = await runtimeMessage({ type: 'GET_PLATFORM_ACCESS_RESTRICTION' }).catch(() => null);
  if (platformRestriction?.active) {
    activeTabId = null;
    fullInventoryTabId = null;
    inventoryButton.dataset.pageReady = 'false';
    lastInspectHealthy = false;
    lastInspectViewKey = 'platform-access-restricted';
    transitionAccountGate({ type: 'RESTRICTED' }, { source: background ? 'background-health' : 'foreground-inspect', reason: 'platform-access-restricted', forceRender: true });
    renderProfileSwitcher(currentProfileState);
    setStatus('error', 'Zugriff vorübergehend eingeschränkt', 'Kleinanzeigen hat den Zugriff vorübergehend eingeschränkt. Automatisierte Aktionen wurden sicher beendet. Bitte versuche es später erneut.', 'retry-platform-access');
    return { connected: false, accountConfirmed: false, reason: 'platform-access-restricted' };
  }

  const wasHealthy = Boolean(accountGateState?.profile?.profileId) && ['confirmed', 'transient-unavailable'].includes(String(accountGateState?.status || ''));
  const previousViewKey = lastInspectViewKey;
  const silentHealthyCheck = background && wasHealthy;
  const inspectSource = background ? 'background-health' : 'foreground-inspect';
  const tabs = await matchingKleinanzeigenTabs();
  const myAdsProjectsTab = tabs.find(tab => {
    try {
      const url = new URL(tab.url);
      return url.pathname === '/m-meine-anzeigen.html' && url.searchParams.get('tab') === 'PROJECTS';
    } catch { return false; }
  }) || null;
  fullInventoryTabId = myAdsProjectsTab?.id || null;

  if (!wasHealthy) {
    transitionAccountGate({ type: 'CHECK_STARTED' }, { source: inspectSource, reason: 'account-inspection-started', forceRender: true });
    inventoryButton.dataset.pageReady = 'false';
  }

  if (!tabs.length) {
    activeTabId = null;
    fullInventoryTabId = null;
    inventoryButton.dataset.pageReady = 'false';
    lastInspectHealthy = false;
    lastInspectViewKey = 'no-kleinanzeigen-tab';
    transitionAccountGate({ type: 'MISSING' }, { source: inspectSource, reason: 'no-kleinanzeigen-tab', forceRender: true });
    renderProfileSwitcher(currentProfileState);
    refreshRenderedAccountBoundControls(previousViewKey, lastInspectViewKey);
    if (lastDiscardedKleinanzeigenTabs.length) {
      setStatus('', 'Kleinanzeigen-Konto derzeit nicht erreichbar', 'Alle geöffneten Kleinanzeigen-Tabs wurden von Chrome pausiert. Du kannst sie im Hintergrund reaktivieren.', 'reactivate-discarded');
      return { connected: false, accountConfirmed: false, reason: 'kleinanzeigen-tab-discarded', discardedTabIds: lastDiscardedKleinanzeigenTabs.map(tab => tab.id) };
    }
    setStatus('', 'Kein Kleinanzeigen-Konto erkannt', 'Öffne eine beliebige Kleinanzeigen-Seite und melde dich an. Lokale Funktionen bleiben verfügbar.');
    return { connected: false, accountConfirmed: false, reason: 'no-kleinanzeigen-tab' };
  }

  if (!background || !wasHealthy) {
    setStatus('', 'Kleinanzeigen-Konto wird geprüft …', 'Die App prüft, welches Kleinanzeigen-Konto angemeldet ist.');
  }

  try {
    let connected = false;
    let ownAdTab = null;
    const connectedPages = [];
    const detectedAccounts = new Map();

    for (const tab of tabs) {
      const page = await tabMessage(tab.id, { type: 'PAGE_STATUS' }).catch(() => null);
      if (!page) continue;
      connected = true;
      connectedPages.push({ tabId: Number(tab.id), page });
      const profileName = String(page?.auth?.loggedIn ? (page?.profileName || '') : '').trim();
      if (profileName) {
        const key = profileName.toLocaleLowerCase('de-DE');
        if (!detectedAccounts.has(key)) detectedAccounts.set(key, { profileName, tabId: Number(tab.id) });
      }
      if (!ownAdTab && page?.auth?.loggedIn && page?.auth?.ownAd && /^\d+$/.test(String(page?.adId || ''))) {
        ownAdTab = { tab, page };
      }
    }

    inventoryButton.dataset.pageReady = ownAdTab ? 'true' : 'false';
    activeTabId = ownAdTab?.tab?.id || tabs[0]?.id || null;

    if (detectedAccounts.size > 1) {
      const names = [...detectedAccounts.values()].map(item => item.profileName);
      transitionAccountGate({ type: 'AMBIGUOUS', names }, { source: 'user-tabs', reason: 'multiple-live-accounts', forceRender: true, details: { detectedAccountCount: names.length } });
      renderProfileSwitcher(currentProfileState);
      lastInspectHealthy = false;
      lastInspectViewKey = 'account-ambiguous';
      refreshRenderedAccountBoundControls(previousViewKey, lastInspectViewKey);
      setStatus('waiting', 'Konto nicht erkannt', 'Mehrere unterschiedliche angemeldete Konten wurden erkannt.', '', { badgeLabel: 'Prüfen' });
      return { connected, accountConfirmed: false, reason: 'account-ambiguous', activeTabId, myAdsTabId: fullInventoryTabId };
    }

    let detected = [...detectedAccounts.values()][0] || null;
    let recognizedProfile = null;
    if (detected) {
      const recognized = await handleRecognizedProfile(detected.profileName);
      recognizedProfile = recognized?.profile || null;
    } else if (connected) {
      const explicitlyLoggedOut = connectedPages.length > 0 && connectedPages.every(item => item?.page?.auth?.loggedIn === false);
      if (explicitlyLoggedOut) {
        transitionAccountGate({ type: 'MISSING' }, { source: 'user-tabs', reason: 'explicit-login-state-missing', forceRender: true, details: { respondingTabs: connectedPages.length } });
        renderProfileSwitcher(currentProfileState);
        lastInspectHealthy = false;
        lastInspectViewKey = 'account-not-logged-in';
        setStatus('waiting', 'Nicht angemeldet', 'Bitte melde dich zuerst bei Kleinanzeigen an.', '', { badgeLabel: 'Hinweis' });
        return { connected: true, accountConfirmed: false, reason: 'account-not-logged-in', activeTabId, myAdsTabId: fullInventoryTabId };
      }

      const probe = await runtimeMessage({ type: 'PROBE_LIVE_KLEINANZEIGEN_ACCOUNT' }).catch(error => ({
        confirmed: false,
        profile: null,
        transient: true,
        reason: 'probe-request-failed',
        message: String(error?.message || error || '').slice(0, 300)
      }));
      if (probe?.confirmed && probe?.profile?.profileId) {
        recognizedProfile = probe.profile;
        const probedState = await runtimeMessage({ type: 'GET_PROFILE_STATE' }).catch(() => currentProfileState);
        renderProfileSwitcher(probedState);
        detected = { profileName: String(probe.profile.displayName || ''), tabId: null, probed: true };
      } else if (probe?.transient) {
        transitionAccountGate({ type: 'TRANSIENT_FAILURE' }, {
          source: 'account-probe',
          reason: String(probe?.reason || 'probe-transient-unavailable'),
          forceRender: true,
          details: { operationId: probe?.operationId || null, respondingTabs: connectedPages.length }
        });
        renderProfileSwitcher(currentProfileState);
        lastInspectHealthy = Boolean(accountGateState?.profile?.profileId);
        lastInspectViewKey = `account-transient:${String(accountGateState?.profile?.profileId || 'none')}`;
        schedulePageInspect(650);
        if (!silentHealthyCheck) {
          const profileName = accountGateState?.profile?.displayName || '';
          setStatus('', 'Kleinanzeigen-Konto wird erneut geprüft', profileName
            ? `Die letzte Kontobestätigung für „${profileName}“ bleibt erhalten. Die Verbindung wird automatisch erneut geprüft.`
            : 'Die Kontoprüfung war vorübergehend nicht möglich. Die App versucht es automatisch erneut.');
        }
        return {
          connected,
          accountConfirmed: Boolean(accountGateState?.profile?.profileId),
          transient: true,
          reason: String(probe?.reason || 'probe-transient-unavailable'),
          profileId: accountGateState?.profile?.profileId || null,
          activeTabId,
          myAdsTabId: fullInventoryTabId
        };
      } else {
        transitionAccountGate({ type: 'MISSING' }, { source: 'account-probe', reason: String(probe?.reason || 'account-not-confirmed'), forceRender: true });
        renderProfileSwitcher(currentProfileState);
        lastInspectHealthy = false;
        lastInspectViewKey = 'account-not-confirmed';
        setStatus('waiting', 'Konto nicht erkannt', 'Öffne „Meine Anzeigen“ und versuche es erneut.', '', { badgeLabel: 'Prüfen' });
        return { connected, accountConfirmed: false, reason: 'account-not-confirmed', activeTabId, myAdsTabId: fullInventoryTabId };
      }
    } else {
      transitionAccountGate({ type: 'TRANSIENT_FAILURE' }, {
        source: 'user-tabs',
        reason: 'content-connection-pending',
        forceRender: true,
        details: { candidateTabs: tabs.length, respondingTabs: 0 }
      });
      renderProfileSwitcher(currentProfileState);
      lastInspectHealthy = Boolean(accountGateState?.profile?.profileId);
      lastInspectViewKey = `account-transient:${String(accountGateState?.profile?.profileId || 'none')}`;
      schedulePageInspect(650);
      if (!silentHealthyCheck) setStatus('', 'Kleinanzeigen-Konto wird erneut geprüft', 'Die geöffneten Kleinanzeigen-Seiten sind noch nicht vollständig ansprechbar. Die App prüft automatisch erneut.');
      return { connected: false, accountConfirmed: Boolean(accountGateState?.profile?.profileId), transient: true, reason: 'content-connection-pending', activeTabId, myAdsTabId: fullInventoryTabId };
    }

    if (!recognizedProfile?.profileId && detected?.profileName) {
      const state = await runtimeMessage({ type: 'RECOGNIZE_PROFILE', profileName: detected.profileName });
      recognizedProfile = state?.profile || null;
    }
    if (!recognizedProfile?.profileId) {
      transitionAccountGate({ type: 'TRANSIENT_FAILURE' }, { source: detected?.probed ? 'account-probe' : 'user-tabs', reason: 'profile-recognition-pending', forceRender: true });
      schedulePageInspect(650);
      return { connected, accountConfirmed: Boolean(accountGateState?.profile?.profileId), transient: true, reason: 'profile-recognition-pending', activeTabId, myAdsTabId: fullInventoryTabId };
    }

    transitionAccountGate({ type: 'CONFIRMED', profile: recognizedProfile }, {
      source: detected?.probed ? 'account-probe' : 'user-tabs',
      reason: detected?.probed ? 'probe-confirmed' : 'page-status-confirmed',
      forceRender: !wasHealthy,
      details: { sourceTabId: detected?.tabId || null }
    });
    renderProfileSwitcher(currentProfileState);

    const viewKey = `account:${String(recognizedProfile.profileId)}`;
    const viewChanged = viewKey !== previousViewKey;
    if (!background || !wasHealthy || viewChanged) renderConfirmedLiveAccountStatus(detected?.profileName || recognizedProfile.displayName);
    lastInspectHealthy = true;
    lastInspectViewKey = viewKey;
    refreshRenderedAccountBoundControls(previousViewKey, lastInspectViewKey, { force: !background });
    return { connected, accountConfirmed: true, profileId: recognizedProfile.profileId, activeTabId, myAdsTabId: fullInventoryTabId, ownAdReady: Boolean(ownAdTab) };
  } catch (error) {
    inventoryButton.dataset.pageReady = 'false';
    const gone = error?.code === 'KR_TAB_GONE';
    const discarded = error?.code === 'KR_TAB_DISCARDED';
    transitionAccountGate({ type: 'TRANSIENT_FAILURE' }, {
      source: inspectSource,
      reason: gone ? 'tab-gone' : discarded ? 'tab-discarded' : 'inspection-error',
      forceRender: true,
      details: { errorCode: error?.code || null, message: String(error?.message || error || '').slice(0, 300) }
    });
    renderProfileSwitcher(currentProfileState);
    lastInspectHealthy = Boolean(accountGateState?.profile?.profileId);
    lastInspectViewKey = `account-transient:${String(accountGateState?.profile?.profileId || 'none')}`;
    schedulePageInspect(gone ? 250 : discarded ? 1200 : 800);
    if (gone) {
      return { connected: false, accountConfirmed: lastInspectHealthy, transient: true, reason: 'tab-gone' };
    }
    if (discarded) {
      setStatus('', 'Kleinanzeigen-Konto derzeit nicht erreichbar', 'Der verwendete Kleinanzeigen-Tab wurde von Chrome pausiert. Andere Tabs werden automatisch geprüft.', 'reactivate-discarded');
      return { connected: false, accountConfirmed: lastInspectHealthy, transient: true, reason: 'tab-discarded' };
    }
    if (!background) setStatus('', 'Kleinanzeigen-Konto wird erneut geprüft', friendlyErrorMessage(error, 'Die Kontoprüfung war vorübergehend nicht möglich. Die App versucht es automatisch erneut.'));
    return { connected: false, accountConfirmed: lastInspectHealthy, transient: true, reason: 'inspection-error' };
  }
}

function inspectPage(options = {}) {
  const forceFresh = options?.forceFresh === true;
  if (inspectInFlight) {
    if (!forceFresh) return inspectInFlight;
    return inspectInFlight.catch(() => null).then(() => inspectPage({ ...options, forceFresh: false, background: false }));
  }
  const runOptions = { ...options };
  delete runOptions.forceFresh;
  inspectInFlight = performInspectPage(runOptions).finally(() => { inspectInFlight = null; });
  return inspectInFlight;
}

function schedulePageInspect(delayMs = 5000) {
  if (pagePollingStopped) return;
  const delay = Math.max(0, Number(delayMs) || 0);
  const dueAt = Date.now() + delay;
  if (pagePollTimer && pagePollDueAt && pagePollDueAt <= dueAt) return;
  if (pagePollTimer) clearTimeout(pagePollTimer);
  pagePollDueAt = dueAt;
  pagePollTimer = setTimeout(async () => {
    pagePollTimer = null;
    pagePollDueAt = 0;
    try { await inspectPage({ background: true }); } catch { /* Status wurde bereits gesetzt und diagnostiziert. */ }
    finally { void detectBackgroundEpoch('account-health'); schedulePageInspect(ACCOUNT_HEALTH_FALLBACK_MS); }
  }, delay);
}

function syncInventorySortDirectionLabels() {
  const titleSort = String(inventoryViewState.sortKey || '') === 'title';
  if (inventorySortAsc) {
    inventorySortAsc.textContent = titleSort ? '↑ A–Z' : '↑ Frühestes zuerst';
    inventorySortAsc.setAttribute('aria-label', titleSort ? 'Titel A bis Z' : 'Frühestes zuerst');
  }
  if (inventorySortDesc) {
    inventorySortDesc.textContent = titleSort ? '↓ Z–A' : '↓ Spätestes zuerst';
    inventorySortDesc.setAttribute('aria-label', titleSort ? 'Titel Z bis A' : 'Spätestes zuerst');
  }
}

function setSortDirection(direction) {
  inventoryViewState.direction = direction === 'asc' ? 'asc' : 'desc';
  inventorySortAsc.classList.toggle('active', inventoryViewState.direction === 'asc');
  inventorySortDesc.classList.toggle('active', inventoryViewState.direction === 'desc');
  inventorySortAsc.setAttribute('aria-pressed', String(inventoryViewState.direction === 'asc'));
  inventorySortDesc.setAttribute('aria-pressed', String(inventoryViewState.direction === 'desc'));
  syncInventorySortDirectionLabels();
  renderInventories(currentRecords);
}

profileSelect?.addEventListener('change', () => {
  void selectInventoryProfile(profileSelect.value);
});

requireRenewalSettingsController();

profileManageButton?.addEventListener('click', async () => {
  setProfileManagerStatus('');
  await refreshProfileState().catch(() => setProfileManagerStatus('Profile konnten nicht geladen werden.', true));
  if (!profileManagerDialog.open) profileManagerDialog.showModal();
  syncProfileTransferUi();
  void logAppEvent('USER_PROFILE_MANAGER_OPENED', { selectedProfileId: selectedProfileId === UNASSIGNED_PROFILE_ID ? null : selectedProfileId, unassigned: selectedProfileId === UNASSIGNED_PROFILE_ID });
});

function closeProfileManager() {
  if (profileTransferLocked()) {
    setProfileManagerStatus(profileTransferStatusText());
    return;
  }
  if (profileManagerDialog?.open) profileManagerDialog.close('closed');
}
profileManagerClose?.addEventListener('click', closeProfileManager);
profileManagerDone?.addEventListener('click', closeProfileManager);
profileManagerDialog?.addEventListener('cancel', event => {
  const pickerCancelRecent = requireProfileBackupController().pickerCancelRecent();
  event.preventDefault();
  if (pickerCancelRecent || profileTransferLocked()) return;
  closeProfileManager();
});
profileImportButton?.addEventListener('click', () => {
  requireProfileBackupController().openPicker();
});
profileBackupFileInput?.addEventListener('cancel', event => {
  event.stopPropagation();
  requireProfileBackupController().markPickerCancelled();
});
profileBackupFileInput?.addEventListener('change', () => {
  const file = requireProfileBackupController().takePickerFile();
  if (!file) return;
  void importProfileBackupFile(file).catch(error => {
    const friendly = friendlyProfileBackupImportError(error);
    const technicalMessage = String(error?.technicalMessage || error?.message || error || '');
    setProfileManagerStatus(friendly, true);
    setStatus('error', 'Wiederherstellung fehlgeschlagen', friendly === 'Die ausgewählte Datei ist keine gültige Profilsicherung.' ? friendly : 'Unvollständige Daten wurden nicht übernommen.');
    void logAppEvent('USER_PROFILE_BACKUP_IMPORT_FAILED', { message: technicalMessage }, 'error');
  });
});

let inventoryCaptureController = null;
function requireInventoryCaptureController() {
  if (!inventoryCaptureController) {
    const captureView = InventoryCaptureView.create({
      document,
      safeMode: RENEWAL_MODE_SAFE,
      fastMode: RENEWAL_MODE_FAST,
      scopeAll: INVENTORY_SCOPE_ALL,
      scopeNewOnly: INVENTORY_SCOPE_NEW_ONLY,
      normalizeRenewalMode,
      loadLocalPreview,
      appendDerivedListingDateBadge: (container, record) => requireInventoryRenderController().appendDerivedListingDateBadge(container, record),
      categoryLabel,
      artLabel,
      displayPriceWithType,
      endDateWithRelativeLabel,
      listingDatePresentation,
      listingDateLabel,
      formatDate,
      elements: {
        inventoryCaptureDialog, inventoryCaptureClose, inventoryCaptureKicker, inventoryCaptureTitle,
        inventoryCaptureIntro, inventoryCaptureOptions, inventoryCaptureScopeAll, inventoryCaptureScopeNewOnly,
        inventoryCaptureScopeDescription, inventoryCaptureVerificationFast, inventoryCaptureVerificationSafe,
        inventoryCaptureVerificationDescription, inventoryCaptureModeNotice, inventoryCaptureModeScope,
        inventoryCaptureModeVerification, inventoryCaptureModeText, inventoryCaptureConfirmPanel,
        inventoryCaptureConfirmTitle, inventoryCaptureConfirmText, inventoryCaptureConfirmMeta,
        inventoryCaptureCandidateSection, inventoryCaptureCandidateList, inventoryCaptureSelectedCandidate,
        inventoryCaptureBulkCurrentCandidate, inventoryCaptureProgressPanel, inventoryCaptureProgressTitle,
        inventoryCaptureProgressText, inventoryCaptureProgressTrack, inventoryCaptureProgressFill,
        inventoryCaptureProgressCount, inventoryCaptureResultPanel, inventoryCaptureResult,
        inventoryCaptureResultTitle, inventoryCaptureResultText, inventoryCaptureResultMeta,
        inventoryCaptureResultDetails, inventoryCaptureCancel, inventoryCaptureStart, inventoryCaptureStopAfterCurrent,
        inventoryCaptureDone, inventoryCaptureProgressShortcut, inventoryCaptureProgressShortcutTitle,
        inventoryCaptureProgressShortcutText
      }
    });
    inventoryCaptureController = InventoryCaptureController.create({
      inventoryCaptureView: captureView,
      inventoryCandidateModel: InventoryCandidateModel,
      document,
      safeMode: RENEWAL_MODE_SAFE,
      fastMode: RENEWAL_MODE_FAST,
      scopeAll: INVENTORY_SCOPE_ALL,
      scopeNewOnly: INVENTORY_SCOPE_NEW_ONLY,
      normalizeRenewalMode,
      accountGateModel,
      actionDisableModel: sidebarActionDisableModel,
      syncActionsActivityIndicator,
      scheduleActionsStateSnapshot,
      bulkStateMatchesSelectedProfile,
      bulkStatusMessageId,
      isUiMessageDismissed,
      bulkStatusTimestamp,
      publishUiActivity,
      loadLocalPreview,
      tabMessage,
      logAppEvent,
      getCurrentBulkRunState: () => currentBulkRunState,
      isBulkStartInFlight: () => bulkStartInFlight,
      getCurrentRenewalConfiguration: () => currentRenewalConfiguration,
      getFullInventoryTabId: () => fullInventoryTabId,
      getActiveTabId: () => activeTabId,
      getCurrentRecords: () => currentRecords,
      getCurrentTrashRecords: () => currentTrashRecords,
      getCurrentProfile: () => accountGateState?.profile || null,
      getCurrentProfileState: () => currentProfileState,
      appendDerivedListingDateBadge: (container, record) => requireInventoryRenderController().appendDerivedListingDateBadge(container, record),
      ensureDetectedProfileSelectedForCapture,
      runtimeMessage,
      refreshInventories,
      setStatus,
      setFriendlyErrorStatus,
      friendlyErrorMessage,
      renderBulkState,
      syncInventoryActionStates,
      syncFullInventoryButtonState,
      setBulkStartInFlight: value => { bulkStartInFlight = Boolean(value); },
      getSelectedProfileId: () => selectedProfileId,
      elements: {
        inventoryButton, progress, inventoryCaptureDialog, inventoryCaptureClose, inventoryCaptureKicker,
        inventoryCaptureTitle, inventoryCaptureIntro, inventoryCaptureOptions, inventoryCaptureScopeAll,
        inventoryCaptureScopeNewOnly, inventoryCaptureScopeDescription, inventoryCaptureVerificationFast,
        inventoryCaptureVerificationSafe, inventoryCaptureVerificationDescription, inventoryCaptureModeNotice,
        inventoryCaptureModeScope, inventoryCaptureModeVerification, inventoryCaptureModeText,
        inventoryCaptureConfirmPanel, inventoryCaptureConfirmTitle, inventoryCaptureConfirmText,
        inventoryCaptureConfirmMeta, inventoryCaptureCandidateSection, inventoryCaptureCandidateList,
        inventoryCaptureSelectedCandidate, inventoryCaptureBulkCurrentCandidate, inventoryCaptureProgressPanel,
        inventoryCaptureProgressTitle, inventoryCaptureProgressText, inventoryCaptureProgressTrack,
        inventoryCaptureProgressFill, inventoryCaptureProgressCount, inventoryCaptureResultPanel,
        inventoryCaptureResult, inventoryCaptureResultTitle, inventoryCaptureResultText, inventoryCaptureResultMeta,
        inventoryCaptureResultDetails, inventoryCaptureCancel, inventoryCaptureStart, inventoryCaptureStopAfterCurrent,
        inventoryCaptureDone, inventoryCaptureProgressShortcut, inventoryCaptureProgressShortcutTitle,
        inventoryCaptureProgressShortcutText
      }
    });
  }
  return inventoryCaptureController;
}
function inventoryCaptureStatus() { return requireInventoryCaptureController().status(); }
function singleInventoryCaptureBusy() { return requireInventoryCaptureController().busy(); }
function activeSingleInventoryCandidate() { return requireInventoryCaptureController().activeCandidate(); }
function syncSingleInventoryButtonState() { return requireInventoryCaptureController().syncSingleButton(); }
function isInventoryCaptureDialogVisible() { return requireInventoryCaptureController().isVisible(); }
function inventoryCaptureBulkStateIsTerminal(state) { return requireInventoryCaptureController().bulkTerminal(state); }
function normalizeInventoryCaptureReentryTarget(target) {
  if (!target || typeof target !== 'object') return null;
  if (target.mode === 'single' && /^\d+$/.test(String(target.adId || ''))) return { mode: 'single', adId: String(target.adId) };
  if (target.mode === 'bulk' && String(target.runId || '').trim()) return { mode: 'bulk', runId: String(target.runId).trim() };
  return null;
}
function setInventoryCaptureReentryTarget(target) { return requireInventoryCaptureController().setReentryTarget(target); }
function clearInventoryCaptureReentryTarget(mode = '', identity = '') { return requireInventoryCaptureController().clearReentryTarget(mode, identity); }
function inventoryCaptureShortcutSeverity(target = inventoryCaptureStatus().reentryTarget) { return requireInventoryCaptureController().shortcutSeverity(target); }
function syncInventoryCaptureProgressShortcut() { return requireInventoryCaptureController().syncProgressShortcut(); }
function bindExistingBulkInventoryCapture(state, options = {}) { return requireInventoryCaptureController().bindExistingBulk(state, options); }
function reopenInventoryCaptureDialog(target = inventoryCaptureStatus().reentryTarget) { return requireInventoryCaptureController().reopen(target); }
function setInventoryCaptureSteps(step, terminalKind = '') { return requireInventoryCaptureController().setSteps(step, terminalKind); }
function setInventoryCaptureProgress(model = {}) { return requireInventoryCaptureController().setProgress(model); }
function renderInventoryCaptureResultDetails(record) { return requireInventoryCaptureController().renderResultDetails(record); }
function setInventoryCaptureResult(kind, title, text, meta = '', record = null) { return requireInventoryCaptureController().setResult(kind, title, text, meta, record); }
function syncInventoryCaptureBulkTerminalSteps(state, kind) { return requireInventoryCaptureController().syncBulkTerminalSteps(state, kind); }
function inventoryCaptureBulkProgressModel(state) {
  const status = String(state?.status || '');
  const stage = String(state?.stage || '');
  const successCount = Number(state?.successCount || 0);
  const failedCount = Number(state?.failedCount || 0);
  const skippedExisting = Number(state?.skippedExistingCount || state?.skippedExistingIds?.length || 0);
  const processed = Array.isArray(state?.processedIds) ? state.processedIds.length : successCount + failedCount + skippedExisting;
  const total = Number(state?.expectedTotal || 0);
  const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((processed / total) * 100))) : 0;
  const newOnly = String(state?.inventoryScope || '').toLowerCase() === 'new-only';
  const reconciliationActive = status === 'running' && stage.startsWith('reconciliation-');
  const facts = newOnly
    ? `${processed} gefunden · ${successCount} neu · ${skippedExisting} vorhanden · ${failedCount} Fehler`
    : `${processed} gefunden · ${successCount} erfasst · ${failedCount} Fehler`;
  if (reconciliationActive) {
    const confirmed = Number(state?.reconciliationRosterIds?.length || 0);
    return { terminal: false, reconciliation: true, kind: '', badgeLabel: 'Info', facts: '', processed, total, percent: 100, title: 'Bestand erneut prüfen', text: total > 0 ? `${confirmed} von ${total} Anzeigen sind bestätigt.` : 'Der Anzeigenbestand wird zur Sicherheit erneut geprüft.' };
  }
  if (status === 'complete') {
    if (newOnly) return { terminal: true, kind: 'success', badgeLabel: 'Abgeschlossen', facts: `${processed} gefunden · ${successCount} neu · ${skippedExisting} vorhanden`, processed, total, percent: 100, title: 'Erfassung abgeschlossen', text: '' };
    return { terminal: true, kind: 'success', badgeLabel: 'Abgeschlossen', facts: `${processed} gefunden · ${successCount} erfasst`, processed, total, percent: 100, title: 'Erfassung abgeschlossen', text: '' };
  }
  if (status === 'complete-with-errors') {
    return { terminal: true, kind: 'error', badgeLabel: 'Fehler', facts: `${successCount + skippedExisting} erfasst · ${failedCount} fehlgeschlagen`, processed, total, percent: 100, title: 'Erfassung teilweise abgeschlossen', text: 'Einige Anzeigen konnten nicht vollständig gelesen werden.' };
  }
  if (status === 'stopped') {
    return { terminal: true, kind: 'success', badgeLabel: 'Beendet', facts: total ? `${processed} von ${total} abgeschlossen` : '', processed, total, percent: total > 0 ? percent : 100, title: 'Erfassung beendet', text: 'Bereits gespeicherte Anzeigen bleiben erhalten.' };
  }
  if (status === 'needs-review') {
    const reconciliationIssue = stage.startsWith('reconciliation-');
    const countMismatch = stage === 'count-mismatch' && failedCount === 0;
    if (countMismatch) {
      return { terminal: true, kind: 'waiting', badgeLabel: 'Prüfen', facts, processed, total, percent: 100, title: 'Erfassung abgeschlossen – Anzahl prüfen', text: `Kleinanzeigen meldet ${total} laufende Anzeigen.` };
    }
    if (reconciliationIssue) {
      return { terminal: true, kind: 'waiting', badgeLabel: 'Prüfen', facts: '', processed, total, percent: total > 0 ? percent : 100, title: 'Bestand prüfen', text: 'Die beiden Prüfungen liefern unterschiedliche Ergebnisse.' };
    }
    return { terminal: true, kind: 'waiting', badgeLabel: 'Prüfen', facts, processed, total, percent: total > 0 ? percent : 100, title: 'Erfassung teilweise abgeschlossen', text: 'Einige Anzeigen benötigen weitere Prüfung.' };
  }
  const stopPending = state?.stopAfterCurrentRequested === true;
  const title = stopPending ? 'Stopp vorgemerkt' : state?.retryAdId ? 'Erneuter Versuch' : ((state?.currentAdId || state?.currentTitle) ? 'Wird gerade erfasst' : 'Anzeigen werden erfasst …');
  const text = stopPending ? 'Die aktuelle Anzeige wird noch abgeschlossen.' : total > 0 ? `${processed} von ${total} Anzeigen sind abgeschlossen.` : 'Die Erfassung wird vorbereitet.';
  return { terminal: false, kind: '', badgeLabel: 'Info', facts: '', processed, total, percent, title, text };
}
function syncInventoryCaptureBulkModal(state) { return requireInventoryCaptureController().syncBulkModal(state); }
function buildSingleInventoryCandidates(entries = []) { return requireInventoryCaptureController().buildCandidates(entries); }
function inventoryCaptureCandidateStorageState(adId) { return requireInventoryCaptureController().candidateStorageState(adId); }
function setInventoryCaptureMembershipSnapshot(records, trashRecords) { return requireInventoryCaptureController().setMembershipSnapshot(records, trashRecords); }
function renderInventoryCaptureCandidates() { return requireInventoryCaptureController().renderCandidates(); }
function renderInventoryCaptureSelectedCandidate() { return requireInventoryCaptureController().renderSelectedCandidate(); }
function renderInventoryCaptureBulkCurrentCandidate(state) { return requireInventoryCaptureController().renderBulkCurrentCandidate(state); }
function selectInventoryCaptureCandidate(adId) { return requireInventoryCaptureController().selectCandidate(adId); }
function loadSingleInventoryCandidates(generation) { return requireInventoryCaptureController().loadCandidates(generation); }
function normalizeInventoryScope(value) { return requireInventoryCaptureController().normalizeScope(value); }
function inventoryScopeLabel(scope = inventoryCaptureStatus().scope) { return requireInventoryCaptureController().scopeLabel(scope); }
function inventoryCaptureSummaryText(scope = inventoryCaptureStatus().scope, mode = inventoryCaptureStatus().verificationMode, options = {}) { return requireInventoryCaptureController().summaryText(scope, mode, options); }
function renderInventoryCaptureOptions() { return requireInventoryCaptureController().renderOptions(); }
function setInventoryCaptureModeNotice(mode = inventoryCaptureStatus().verificationMode, scope = inventoryCaptureStatus().scope) { return requireInventoryCaptureController().setModeNotice(mode, scope); }
function configureInventoryCaptureDialog(mode) { return requireInventoryCaptureController().configureDialog(mode); }
function openInventoryCaptureDialog(mode) { return requireInventoryCaptureController().openDialog(mode); }
function beginInventoryCaptureProgress(title, text) { return requireInventoryCaptureController().beginProgress(title, text); }

inventoryCaptureStopAfterCurrent?.addEventListener('click', () => { void requireInventoryCaptureController().requestStopAfterCurrent(); });

inventoryCaptureScopeAll?.addEventListener('click', () => {
  const state = inventoryCaptureStatus();
  if (state.mode !== 'bulk' || state.dialogState !== 'confirm') return;
  requireInventoryCaptureController().setScope(INVENTORY_SCOPE_ALL);
});
inventoryCaptureScopeNewOnly?.addEventListener('click', () => {
  const state = inventoryCaptureStatus();
  if (state.mode !== 'bulk' || state.dialogState !== 'confirm') return;
  requireInventoryCaptureController().setScope(INVENTORY_SCOPE_NEW_ONLY);
});
inventoryCaptureVerificationFast?.addEventListener('click', () => {
  const state = inventoryCaptureStatus();
  if (state.mode !== 'bulk' || state.dialogState !== 'confirm') return;
  requireInventoryCaptureController().setVerificationMode(RENEWAL_MODE_FAST);
});
inventoryCaptureVerificationSafe?.addEventListener('click', () => {
  const state = inventoryCaptureStatus();
  if (state.mode !== 'bulk' || state.dialogState !== 'confirm') return;
  requireInventoryCaptureController().setVerificationMode(RENEWAL_MODE_SAFE);
});

inventoryCaptureStart?.addEventListener('click', () => {
  const state = inventoryCaptureStatus();
  if (state.dialogState !== 'confirm') return;
  inventoryCaptureStart.disabled = true;
  const captureController = requireInventoryCaptureController();
  if (state.mode === 'bulk') void captureController.startBulk();
  else void captureController.startSingle();
});
inventoryCaptureCancel?.addEventListener('click', () => requireInventoryCaptureController().closeCancelled());
inventoryCaptureDone?.addEventListener('click', () => requireInventoryCaptureController().closeDone());
inventoryCaptureClose?.addEventListener('click', () => requireInventoryCaptureController().closeOrHide());
inventoryCaptureDialog?.addEventListener('cancel', event => { event.preventDefault(); requireInventoryCaptureController().closeOrHide(); });

inventoryCaptureProgressShortcut?.addEventListener('click', () => { requireInventoryCaptureController().reopenFromShortcut(); });

inventorySearchInput.addEventListener('input', () => {
  inventoryViewState.query = inventorySearchInput.value;
  if (inventorySearchTimer) clearTimeout(inventorySearchTimer);
  inventorySearchTimer = setTimeout(() => {
    inventorySearchTimer = null;
    void logAppEvent('USER_INVENTORY_SEARCH_CHANGED', { queryLength: inventoryViewState.query.length });
    renderInventories(currentRecords);
  }, 120);
});

inventorySortKey.addEventListener('change', () => {
  inventoryViewState.sortKey = inventorySortKey.value;
  syncInventorySortDirectionLabels();
  void logAppEvent('USER_INVENTORY_SORT_CHANGED', { sortKey: inventoryViewState.sortKey, direction: inventoryViewState.direction });
  renderInventories(currentRecords);
});

inventorySortAsc.addEventListener('click', () => {
  void logAppEvent('USER_INVENTORY_SORT_DIRECTION_CHANGED', { direction: 'asc', sortKey: inventoryViewState.sortKey });
  setSortDirection('asc');
});

inventorySortDesc.addEventListener('click', () => {
  void logAppEvent('USER_INVENTORY_SORT_DIRECTION_CHANGED', { direction: 'desc', sortKey: inventoryViewState.sortKey });
  setSortDirection('desc');
});

inventoryButton.addEventListener('click', () => {
  if (!requireAccountBoundAction()) return;
  void logAppEvent('USER_SINGLE_INVENTORY_CLICK', { tabId: activeTabId });
  if (singleInventoryCaptureBusy()) {
    const captureState = inventoryCaptureStatus();
    const adId = String(captureState.activeSingle?.adId || captureState.reentryTarget?.adId || '');
    if (adId) reopenInventoryCaptureDialog({ mode: 'single', adId });
    return;
  }
  openInventoryCaptureDialog('single');
});

fullInventoryButton.addEventListener('click', () => {
  if (!requireAccountBoundAction()) return;
  void logAppEvent('USER_BULK_INVENTORY_CLICK', { tabId: fullInventoryTabId });
  openInventoryCaptureDialog('bulk');
});

requireActionsDiagnosticsController().install();

inventoryViewButton.addEventListener('click', () => {
  void logAppEvent('USER_VIEW_INVENTORY', {});
  switchMainView('inventory');
});

trashViewButton.addEventListener('click', () => {
  void logAppEvent('USER_VIEW_TRASH', { count: currentTrashRecords.length });
  switchMainView('trash');
});

globalViewDetailed?.addEventListener('click', () => { void setGlobalListViewMode('detailed'); });
globalViewCompact?.addEventListener('click', () => { void setGlobalListViewMode('compact'); });


statusDismiss?.addEventListener('click', () => {
  const currentActivity = currentUiActivity();
  if (currentActivity?.slot !== 'status') return;
  const activity = { ...currentActivity };
  dismissUiActivityUntilChanged(activity);
  archiveUiActivity(activity);
  clearUiActivity(activity.id);
  void logAppEvent('USER_STATUS_MESSAGE_DISMISSED', {
    messageType: 'status',
    activityId: String(activity.id || ''),
    title: String(activity.title || '')
  });
});

appNoticeDismiss.addEventListener('click', async () => {
  const noticeId = String(currentAppNotice?.id || '');
  const currentActivity = currentUiActivity();
  if (currentActivity?.slot === 'app-notice') {
    dismissUiActivityUntilChanged(currentActivity);
    archiveUiActivity(currentActivity);
    clearUiActivity(currentActivity.id);
  }
  renderAppNotice(null);
  void logAppEvent('USER_APP_NOTICE_DISMISSED', { noticeId });
  await runtimeMessage({ type: 'DISMISS_APP_NOTICE', noticeId }).catch(() => {});
});

clearInventoryButton.addEventListener('click', async () => {
  if (!currentRecords.length) return;
  void logAppEvent('USER_CLEAR_INVENTORY_CLICK', { count: currentRecords.length });
  if (!await confirmAction({ title: 'Alle Anzeigen in den Papierkorb?', text: `Alle ${currentRecords.length} gespeicherten Anzeigen werden für 30 Tage in den Papierkorb verschoben.`, detail: 'Die Anzeigen bei Kleinanzeigen bleiben unverändert. Gespeicherte Bilder bleiben bis zum Ablauf erhalten.', confirmLabel: 'Alle in Papierkorb', danger: true })) {
    void logAppEvent('USER_CLEAR_INVENTORY_CANCELLED', { count: currentRecords.length });
    return;
  }
  clearInventoryButton.disabled = true;
  try {
    await runtimeMessage(scopedProfileMessage('CLEAR_INVENTORIES'));
    void logAppEvent('USER_CLEAR_INVENTORY_SUCCEEDED', {});
    setStatus('ready', 'Alle Einträge in Papierkorb verschoben', 'Die Einträge bleiben 30 Tage als Vorlagen erhalten.');
    await refreshInventories();
  } catch (error) {
    void logAppEvent('USER_CLEAR_INVENTORY_FAILED', { message: error.message }, 'error');
    clearInventoryButton.disabled = false;
    setFriendlyErrorStatus(error, 'Einträge nicht verschoben');
  }
});

function setGlobalRefreshVisual(state = 'idle') {
  if (!refreshButton) return;
  if (globalRefreshFeedbackTimer) {
    clearTimeout(globalRefreshFeedbackTimer);
    globalRefreshFeedbackTimer = null;
  }
  const refreshing = state === 'refreshing';
  const success = state === 'success';
  refreshButton.classList.toggle('is-refreshing', refreshing);
  refreshButton.classList.toggle('is-success', success);
  refreshButton.disabled = refreshing;
  const label = refreshing
    ? 'Wird aktualisiert …'
    : success
      ? 'Ansicht aktualisiert'
      : 'Ansicht und Kontostatus aktualisieren';
  refreshButton.title = label;
  refreshButton.setAttribute('aria-label', label);
  if (success) {
    globalRefreshFeedbackTimer = setTimeout(() => setGlobalRefreshVisual('idle'), 1500);
  }
}

refreshButton.addEventListener('click', async () => {
  if (refreshButton.disabled) return;
  setGlobalRefreshVisual('refreshing');
  void logAppEvent('USER_REFRESH_CLICK', {});
  try {
    const inspection = await inspectPage({ forceFresh: true });
    await refreshInventories();
    if (inspection?.connected) {
      void logAppEvent('USER_REFRESH_SUCCEEDED', { activeTabId, fullInventoryTabId });
      setGlobalRefreshVisual('success');
    } else {
      void logAppEvent('USER_REFRESH_FAILED', { reason: inspection?.reason || 'not-connected' }, 'warning');
      setGlobalRefreshVisual('idle');
    }
  } catch (error) {
    setGlobalRefreshVisual('idle');
    void logAppEvent('USER_REFRESH_FAILED', { message: error.message }, 'error');
    setStatus('error', 'Aktualisierung fehlgeschlagen', friendlyErrorMessage(error));
  }
});

function requireDiagnosticsControlsController() {
  if (diagnosticsControlsController) return diagnosticsControlsController;
  if (!DiagnosticsControlsController?.create) throw new Error('diagnostics-controls-controller.js must load before diagnostic controls are used');
  diagnosticsControlsController = DiagnosticsControlsController.create({
    document, DiagnosticZip,
    elements: { zipButton: diagnosticZipButton, resetButton: diagnosticResetButton, emergencyButton: emergencyWorkflowResetButton, status: diagnosticZipStatus, resetBlockReason: diagnosticResetBlockReasonElement },
    runtimeMessage, logEvent: logAppEvent, profileTransferLocked, insertionLockActive,
    getInsertionLock: () => currentInsertionLock,
    getBulkState: () => ({ startInFlight: bulkStartInFlight, state: currentBulkRunState }),
    singleInventoryBusy: singleInventoryCaptureBusy,
    async onEmergencyReset() {
      handleEmergencyWorkflowReset();
      await refreshProfileState().catch(() => {});
      await refreshInventories().catch(() => {});
      await refreshBulkStatus().catch(() => {});
    }
  });
  return diagnosticsControlsController;
}

function diagnosticResetBlockReason() { return requireDiagnosticsControlsController().resetBlockReason(); }
function syncDiagnosticResetUi() { return requireDiagnosticsControlsController().syncResetUi(); }

requireDiagnosticsControlsController();

function scheduleInspectFromTabEvent(delayMs = 180) {
  if (pagePollingStopped) return;
  schedulePageInspect(delayMs);
}

function shouldInspectTabLifecycleEvent(tabId, tab) {
  const id = Number(tabId || 0);
  if (!id || managedWorkerTabIds.has(id)) return false;
  return Boolean(tab?.active || knownUserKleinanzeigenTabIds.has(id) || Number(activeTabId) === id || Number(fullInventoryTabId) === id);
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const relevant = Boolean(changeInfo.status || changeInfo.url || Object.prototype.hasOwnProperty.call(changeInfo, 'discarded'));
  if (!relevant || !shouldInspectTabLifecycleEvent(tabId, tab)) return;
  if (changeInfo.discarded === false) discardedTabBackoff.delete(Number(tabId));
  if (tab?.url && /(^|\.)kleinanzeigen\.de$/i.test((() => { try { return new URL(tab.url).hostname; } catch { return ''; } })())) scheduleInspectFromTabEvent(changeInfo.status === 'complete' ? 80 : 220);
});
chrome.tabs.onActivated.addListener(({ tabId }) => {
  discardedTabBackoff.delete(Number(tabId));
  if (!managedWorkerTabIds.has(Number(tabId))) scheduleInspectFromTabEvent(120);
});
chrome.tabs.onRemoved.addListener(tabId => {
  const id = Number(tabId);
  archiveTrashInsertionUiController?.handleTrashTemplateTargetTabRemoved(id);
  discardedTabBackoff.delete(id);
  managedWorkerTabIds.delete(id);
  const wasKnownUserTab = knownUserKleinanzeigenTabIds.delete(id);
  const wasActiveTab = Number(activeTabId) === id;
  const wasFullInventoryTab = Number(fullInventoryTabId) === id;
  if (wasActiveTab) activeTabId = null;
  if (wasFullInventoryTab) fullInventoryTabId = null;
  if (wasKnownUserTab || wasActiveTab || wasFullInventoryTab) scheduleInspectFromTabEvent(120);
});


function recordSidebarBottomDiagnostics(source = 'scroll') { return requireAppLayoutController().recordSidebarDiagnostics(source); }

window.addEventListener('wheel', event => {
  requireAppLayoutController().noteWheel(event.deltaY);
}, { passive:true });

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'session' && changes[TAB_REGISTRY_STORAGE_KEY]) {
    updateManagedWorkerTabCache(changes[TAB_REGISTRY_STORAGE_KEY].newValue);
    return;
  }
  if (areaName !== 'local') return;
  if (changes[BULK_RUN_STORAGE_KEY]) {
    void ensureDismissedUiMessagesLoaded().then(() => {
      renderBulkState(changes[BULK_RUN_STORAGE_KEY].newValue || null);
    }).catch(() => {});
  }
  if (changes[MASS_RENEWAL_BATCH_STORAGE_KEY]) {
    applyMassRenewalBatchSnapshot(changes[MASS_RENEWAL_BATCH_STORAGE_KEY].newValue || null, { forceOpen: false, recoveryOnly: true, source: 'storage-change' });
  }
});

window.addEventListener('scroll', () => {
  scheduleListStickyHeaderSync();
  recordSidebarBottomDiagnostics('scroll');
}, { passive:true });
window.addEventListener('resize', () => {
  scheduleListStickyHeaderSync();
  recordSidebarBottomDiagnostics('resize');
}, { passive:true });
window.addEventListener('focus', () => {
  sanitizeControlAccordionAnimations('window-focus');
  scheduleActionsResync('window-focus', 80);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    sanitizeControlAccordionAnimations('visibility-visible');
    scheduleActionsResync('visibility-visible', 80);
  }
});
scheduleListStickyHeaderSync();
recordSidebarBottomDiagnostics('startup');

syncActionsActivityIndicator();
void detectBackgroundEpoch('startup').then(() => recordActionsStateSnapshot('startup', { force: true }));

Promise.all([ensureUiActivityLoaded(), loadListViewModes(), refreshProfileState(), refreshRenewalConfiguration(), primeManagedWorkerTabCache()])
  .then(() => Promise.all([inspectPage(), refreshInventories(), refreshBulkStatus(), refreshMassRenewalBatchStatus({ forceOpen: false, recoveryOnly: true, source: 'startup' })]))
  .catch(error => setStatus('error', 'Inventar konnte nicht geladen werden', friendlyErrorMessage(error)));
schedulePageInspect(ACCOUNT_HEALTH_FALLBACK_MS);
window.addEventListener('pagehide', () => {
  pagePollingStopped = true;
  if (pagePollTimer) clearTimeout(pagePollTimer);
  pagePollTimer = null;
  pagePollDueAt = 0;
  if (inventoryLiveRefreshTimer) clearTimeout(inventoryLiveRefreshTimer);
}, { once: true });
