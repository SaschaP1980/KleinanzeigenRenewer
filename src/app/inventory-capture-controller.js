(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const document = options.document || globalThis.document;
      const elements = options.elements || {};
      const {
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
      } = elements;
      const RENEWAL_MODE_SAFE = String(options.safeMode || 'safe');
      const RENEWAL_MODE_FAST = String(options.fastMode || 'fast');
      const INVENTORY_SCOPE_ALL = String(options.scopeAll || 'all');
      const INVENTORY_SCOPE_NEW_ONLY = String(options.scopeNewOnly || 'new-only');
      const normalizeRenewalMode = options.normalizeRenewalMode;
      const inventoryCaptureView = options.inventoryCaptureView;
      const inventoryCandidateModel = options.inventoryCandidateModel;
      if (!inventoryCaptureView) throw new Error('inventoryCaptureView dependency is required');
      if (!inventoryCandidateModel) throw new Error('inventoryCandidateModel dependency is required');
      const accountGateModel = options.accountGateModel;
      const actionDisableModel = typeof options.actionDisableModel === 'function' ? options.actionDisableModel : null;
      const syncActionsActivityIndicator = options.syncActionsActivityIndicator || (() => {});
      const scheduleActionsStateSnapshot = options.scheduleActionsStateSnapshot || (() => {});
      const bulkStateMatchesSelectedProfile = options.bulkStateMatchesSelectedProfile || (() => false);
      const bulkStatusMessageId = options.bulkStatusMessageId || (() => '');
      const isUiMessageDismissed = options.isUiMessageDismissed || (() => false);
      const bulkStatusTimestamp = options.bulkStatusTimestamp || (() => '');
      const publishUiActivity = options.publishUiActivity || (() => {});
      const loadLocalPreview = options.loadLocalPreview || (async () => {});
      const tabMessage = options.tabMessage || (async () => null);
      const logAppEvent = options.logAppEvent || (async () => {});
      const getCurrentBulkRunState = options.getCurrentBulkRunState || (() => null);
      const isBulkStartInFlight = options.isBulkStartInFlight || (() => false);
      const getCurrentRenewalConfiguration = options.getCurrentRenewalConfiguration || (() => ({ renewalMode: RENEWAL_MODE_SAFE }));
      const getFullInventoryTabId = options.getFullInventoryTabId || (() => null);
      const getActiveTabId = options.getActiveTabId || (() => null);
      const getCurrentRecords = options.getCurrentRecords || (() => []);
      const getCurrentTrashRecords = options.getCurrentTrashRecords || (() => []);
      const getCurrentProfile = options.getCurrentProfile || (() => null);
      const getCurrentProfileState = options.getCurrentProfileState || (() => ({}));
      const appendDerivedListingDateBadge = options.appendDerivedListingDateBadge || ((container) => container);
      const ensureDetectedProfileSelectedForCapture = options.ensureDetectedProfileSelectedForCapture || (async () => null);
      const runtimeMessage = options.runtimeMessage || (async () => ({}));
      const refreshInventories = options.refreshInventories || (async () => {});
      const setStatus = options.setStatus || (() => {});
      const setFriendlyErrorStatus = options.setFriendlyErrorStatus || (() => {});
      const friendlyErrorMessage = options.friendlyErrorMessage || (error => String(error?.message || error || ''));
      const renderBulkState = options.renderBulkState || (() => {});
      const syncInventoryActionStates = options.syncInventoryActionStates || (() => {});
      const syncFullInventoryButtonState = options.syncFullInventoryButtonState || (() => {});
      const setBulkStartInFlight = options.setBulkStartInFlight || (() => {});
      const getSelectedProfileId = options.getSelectedProfileId || (() => '');

      let inventoryCaptureMode = '';
      let inventoryCaptureScope = INVENTORY_SCOPE_NEW_ONLY;
      let inventoryCaptureVerificationMode = RENEWAL_MODE_SAFE;
      let inventoryCaptureDialogState = 'closed';
      let inventoryCaptureBulkAwaitingStart = false;
      let trackedInventoryCaptureRunId = '';
      let inventoryCaptureSourceTabId = null;
      let inventoryCaptureCandidates = [];
      let inventoryCaptureMembershipSnapshot = inventoryCandidateModel.createMembershipSnapshot([], []);
      let selectedInventoryCaptureAdId = '';
      let activeSingleInventoryCapture = null;
      let inventoryCandidateLoadGeneration = 0;
      let inventoryCaptureReentryTarget = null;
      let inventoryCaptureResultKind = '';
function singleInventoryCaptureBusy() {
  return inventoryCaptureMode === 'single' && inventoryCaptureDialogState === 'progress';
}

function activeSingleInventoryCandidate() {
  if (activeSingleInventoryCapture?.adId) return activeSingleInventoryCapture;
  return inventoryCaptureCandidates.find(candidate => String(candidate.adId) === String(selectedInventoryCaptureAdId || '')) || null;
}

function syncSingleInventoryButtonState() {
  if (!inventoryButton) return;
  const pageReady = inventoryButton.dataset.pageReady === 'true';
  const bulkBusy = isBulkStartInFlight() || String(getCurrentBulkRunState()?.status || '') === 'running' || Boolean(getCurrentBulkRunState()?.retryAdId);
  const gate = accountGateModel();
  const model = actionDisableModel ? actionDisableModel('inventoryButton') : null;
  inventoryButton.disabled = model ? model.disabled === true : (singleInventoryCaptureBusy() || bulkBusy || !pageReady || !gate.allowed);
  inventoryButton.title = !gate.allowed
    ? gate.tooltip
    : !pageReady
      ? 'Öffne mindestens eine eigene Anzeige bei Kleinanzeigen, um diese Funktion zu verwenden.'
      : singleInventoryCaptureBusy()
        ? 'Die geöffnete Anzeige wird bereits erfasst.'
        : bulkBusy
          ? 'Nicht verfügbar: Es läuft bereits eine vollständige Erfassung.'
          : 'Eine geöffnete eigene Anzeige erfassen';
  syncActionsActivityIndicator();
  if (typeof scheduleActionsStateSnapshot === 'function') scheduleActionsStateSnapshot('single-inventory-button-sync');
}

function isInventoryCaptureDialogVisible() {
  return Boolean(inventoryCaptureDialog?.open);
}

function inventoryCaptureBulkStateIsTerminal(state) {
  return ['complete', 'complete-with-errors', 'needs-review', 'stopped'].includes(String(state?.status || ''));
}

function normalizeInventoryCaptureReentryTarget(target) {
  if (!target || typeof target !== 'object') return null;
  if (target.mode === 'single' && /^\d+$/.test(String(target.adId || ''))) return { mode: 'single', adId: String(target.adId) };
  if (target.mode === 'bulk' && String(target.runId || '').trim()) return { mode: 'bulk', runId: String(target.runId).trim() };
  return null;
}

function setInventoryCaptureReentryTarget(target) {
  inventoryCaptureReentryTarget = normalizeInventoryCaptureReentryTarget(target);
  syncInventoryCaptureProgressShortcut();
}

function clearInventoryCaptureReentryTarget(mode = '', identity = '') {
  const current = inventoryCaptureReentryTarget;
  if (!current) return;
  if (mode && current.mode !== mode) return;
  if (identity) {
    const currentIdentity = current.mode === 'single' ? current.adId : current.runId;
    if (String(currentIdentity || '') !== String(identity)) return;
  }
  inventoryCaptureReentryTarget = null;
  syncInventoryCaptureProgressShortcut();
}

function inventoryCaptureShortcutSeverity(target = inventoryCaptureReentryTarget) {
  if (!target) return '';
  if (target.mode === 'single') {
    if (inventoryCaptureDialogState === 'progress') return 'active';
    if (inventoryCaptureDialogState === 'result') return inventoryCaptureResultKind === 'waiting' ? 'waiting' : inventoryCaptureResultKind === 'error' ? 'error' : 'success';
    return '';
  }
  const state = getCurrentBulkRunState();
  const runId = String(state?.runId || state?.bulkRunId || '');
  if (!state || runId !== String(target.runId || '')) return '';
  const status = String(state.status || '');
  if (status === 'running' || state.retryAdId) return 'active';
  if (status === 'complete') return 'success';
  if (status === 'complete-with-errors') return 'error';
  if (status === 'needs-review') return 'waiting';
  return '';
}

function syncInventoryCaptureProgressShortcut() {
  const target = inventoryCaptureReentryTarget;
  let visible = false;
  let title = '';
  let text = '';
  let severity = '';

  if (!isInventoryCaptureDialogVisible() && target?.mode === 'single' && ['progress', 'result'].includes(inventoryCaptureDialogState)) {
    const selected = activeSingleInventoryCandidate();
    if (selected && String(selected.adId || '') === String(target.adId || '')) {
      visible = true;
      severity = inventoryCaptureShortcutSeverity(target);
      title = inventoryCaptureDialogState === 'result' ? 'Erfassung abgeschlossen' : 'Anzeige wird erfasst';
      text = `${selected.title || 'Geöffnete Anzeige'} · ${inventoryCaptureDialogState === 'result' ? 'Ergebnis anzeigen' : 'Fortschritt anzeigen'}`;
    }
  } else if (!isInventoryCaptureDialogVisible() && target?.mode === 'bulk' && getCurrentBulkRunState() && bulkStateMatchesSelectedProfile(getCurrentBulkRunState())) {
    const runId = String(getCurrentBulkRunState()?.runId || getCurrentBulkRunState()?.bulkRunId || '');
    if (runId === String(target.runId || '')) {
      const status = String(getCurrentBulkRunState().status || '');
      const messageId = bulkStatusMessageId(getCurrentBulkRunState());
      const persistentCardHidden = isUiMessageDismissed('bulkRunStatus', messageId);
      const captureProgressAvailable = inventoryCaptureMode === 'bulk' && inventoryCaptureDialogState === 'progress';
      if ((persistentCardHidden || captureProgressAvailable) && (status === 'running' || getCurrentBulkRunState().retryAdId)) {
        visible = true;
        severity = inventoryCaptureShortcutSeverity(target);
        title = inventoryCaptureBulkStateIsTerminal(getCurrentBulkRunState()) ? 'Erfassung abgeschlossen' : 'Anzeigen werden erfasst';
        text = inventoryCaptureBulkStateIsTerminal(getCurrentBulkRunState()) ? 'Ergebnis anzeigen' : 'Fortschritt anzeigen';
      }
    }
  }

  inventoryCaptureView.syncProgressShortcut({ visible, title, text, severity });
  if (visible && target) {
    const activityId = target.mode === 'bulk' ? `inventory-shortcut:bulk:${String(target.runId || '')}` : `inventory-shortcut:single:${String(target.adId || '')}`;
    publishUiActivity({
      id: activityId,
      slot: 'inventory-shortcut',
      kind: severity === 'error' ? 'error' : severity === 'waiting' ? 'waiting' : severity === 'success' ? 'ready' : '',
      title,
      text,
      createdAt: target.mode === 'bulk' ? bulkStatusTimestamp(getCurrentBulkRunState()) || new Date().toISOString() : new Date().toISOString(),
      active: severity === 'active'
    });
  }
  syncActionsActivityIndicator();
}

function bindExistingBulkInventoryCapture(state, { setReentryTarget = true } = {}) {
  if (!state || !bulkStateMatchesSelectedProfile(state)) return false;
  const runId = String(state?.runId || state?.bulkRunId || '');
  if (!runId) return false;
  configureInventoryCaptureDialog('bulk');
  inventoryCaptureMode = 'bulk';
  inventoryCaptureScope = normalizeInventoryScope(state?.inventoryScope);
  inventoryCaptureVerificationMode = normalizeRenewalMode(state?.verificationMode || getCurrentRenewalConfiguration().renewalMode);
  inventoryCaptureBulkAwaitingStart = false;
  trackedInventoryCaptureRunId = runId;
  inventoryCaptureSourceTabId = Number(state?.sourceTabId || getFullInventoryTabId() || 0) || null;
  if (setReentryTarget) inventoryCaptureReentryTarget = { mode: 'bulk', runId };
  beginInventoryCaptureProgress('Erfassung wird geladen …', 'Der aktuelle Stand des laufenden Vorgangs wird angezeigt.');
  syncInventoryCaptureBulkModal(state);
  syncInventoryCaptureProgressShortcut();
  return true;
}

function reopenInventoryCaptureDialog(target = inventoryCaptureReentryTarget) {
  if (!inventoryCaptureDialog || typeof inventoryCaptureDialog.showModal !== 'function') return false;
  const resolved = normalizeInventoryCaptureReentryTarget(target);
  if (!resolved) return false;
  if (resolved.mode === 'single') {
    const selected = activeSingleInventoryCandidate();
    if (!selected || String(selected.adId || '') !== resolved.adId || !['progress', 'result'].includes(inventoryCaptureDialogState)) return false;
    inventoryCaptureMode = 'single';
    inventoryCaptureReentryTarget = resolved;
    if (!inventoryCaptureDialog.open) inventoryCaptureDialog.showModal();
    syncInventoryCaptureProgressShortcut();
    return true;
  }
  const stateRunId = String(getCurrentBulkRunState()?.runId || getCurrentBulkRunState()?.bulkRunId || '');
  if (!getCurrentBulkRunState() || stateRunId !== resolved.runId) return false;
  if (!bindExistingBulkInventoryCapture(getCurrentBulkRunState(), { setReentryTarget: true })) return false;
  if (!inventoryCaptureDialog.open) inventoryCaptureDialog.showModal();
  syncInventoryCaptureProgressShortcut();
  return true;
}

function setInventoryCaptureSteps(step, terminalKind = '') {
  return inventoryCaptureView.setInventoryCaptureSteps(inventoryCaptureMode, step, terminalKind);
}

function setInventoryCaptureProgress(model = {}) {
  return inventoryCaptureView.setInventoryCaptureProgress(model);
}

function renderInventoryCaptureResultDetails(record) {
  return inventoryCaptureView.renderInventoryCaptureResultDetails(record);
}

function setInventoryCaptureResult(kind, title, text, meta = '', record = null) {
  inventoryCaptureDialogState = 'result';
  inventoryCaptureResultKind = kind === 'waiting' ? 'waiting' : kind === 'error' ? 'error' : 'success';
  setInventoryCaptureModeNotice(inventoryCaptureVerificationMode, inventoryCaptureScope);
  syncSingleInventoryButtonState();
  syncFullInventoryButtonState();
  inventoryCaptureView.showResult({ kind, title, text, meta, record, mode: inventoryCaptureMode });
  syncInventoryCaptureProgressShortcut();
}

function syncInventoryCaptureBulkTerminalSteps(state, kind) {
  return inventoryCaptureView.syncBulkTerminalSteps(inventoryCaptureMode, state, kind);
}

function inventoryCaptureBulkProgressModel(state) {
  return inventoryCaptureView.bulkProgressModel(state);
}

function syncInventoryCaptureBulkModal(state) {
  if (inventoryCaptureMode !== 'bulk' || inventoryCaptureDialogState !== 'progress' || inventoryCaptureBulkAwaitingStart || !state) return;
  const stateRunId = String(state?.runId || state?.bulkRunId || '');
  if (trackedInventoryCaptureRunId && stateRunId && stateRunId !== trackedInventoryCaptureRunId) return;
  if (!trackedInventoryCaptureRunId && stateRunId) trackedInventoryCaptureRunId = stateRunId;
  const model = inventoryCaptureBulkProgressModel(state);
  setInventoryCaptureModeNotice(state?.verificationMode || inventoryCaptureVerificationMode, state?.inventoryScope || inventoryCaptureScope);
  if (inventoryCaptureStopAfterCurrent) {
    const reconciliationActive = String(state?.stage || '').startsWith('reconciliation-');
    const stopVisible = String(state?.status || '') === 'running' && !reconciliationActive;
    inventoryCaptureStopAfterCurrent.classList.toggle('hidden', !stopVisible);
    inventoryCaptureStopAfterCurrent.disabled = state?.stopAfterCurrentRequested === true;
    inventoryCaptureStopAfterCurrent.textContent = state?.stopAfterCurrentRequested === true ? 'Stopp vorgemerkt' : 'Nach aktueller Anzeige stoppen';
  }
  renderInventoryCaptureBulkCurrentCandidate(state);
  if (model.reconciliation) setInventoryCaptureSteps(3);
  else setInventoryCaptureSteps(2);
  if (model.terminal) {
    setInventoryCaptureResult(model.kind, model.title, model.text, model.facts || (model.total ? `${model.processed} von ${model.total} Anzeigen abgeschlossen` : 'Erfassung beendet'));
    syncInventoryCaptureBulkTerminalSteps(state, model.kind);
    return;
  }
  setInventoryCaptureProgress({
    title: model.title,
    text: model.text,
    percent: model.percent,
    count: model.total ? `${model.processed} von ${model.total} Anzeigen abgeschlossen${state.currentPage ? ` · Seite ${state.currentPage}` : ''}` : 'Erfassung wird vorbereitet …'
  });
}

function buildSingleInventoryCandidates(entries = []) {
  return inventoryCandidateModel.buildSingleInventoryCandidates(entries);
}

function inventoryCaptureCandidateStorageState(adId) {
  return inventoryCandidateModel.storageState(adId, inventoryCaptureMembershipSnapshot);
}

function setInventoryCaptureMembershipSnapshot(records, trashRecords) {
  inventoryCaptureMembershipSnapshot = inventoryCandidateModel.createMembershipSnapshot(records, trashRecords);
  return inventoryCaptureMembershipSnapshot;
}

function renderInventoryCaptureCandidates() {
  return inventoryCaptureView.renderInventoryCaptureCandidates({
    candidates: inventoryCaptureCandidates,
    selectedAdId: selectedInventoryCaptureAdId,
    storageStateFor: inventoryCaptureCandidateStorageState,
    onSelect: selectInventoryCaptureCandidate
  });
}

function renderInventoryCaptureSelectedCandidate() {
  return inventoryCaptureView.renderInventoryCaptureSelectedCandidate({
    mode: inventoryCaptureMode,
    candidate: activeSingleInventoryCandidate(),
    selectedAdId: selectedInventoryCaptureAdId,
    storageStateFor: inventoryCaptureCandidateStorageState
  });
}

function renderInventoryCaptureBulkCurrentCandidate(state) {
  return inventoryCaptureView.renderInventoryCaptureBulkCurrentCandidate({ mode: inventoryCaptureMode, dialogState: inventoryCaptureDialogState, state });
}

function selectInventoryCaptureCandidate(adId) {
  const candidate = inventoryCaptureCandidates.find(item => String(item.adId) === String(adId || '')) || null;
  if (!candidate) return false;
  selectedInventoryCaptureAdId = String(candidate.adId);
  inventoryCaptureSourceTabId = Number(candidate.sourceTabId || 0) || null;
  renderInventoryCaptureCandidates();
  renderInventoryCaptureSelectedCandidate();
  if (inventoryCaptureDialogState === 'confirm') inventoryCaptureView.setStartDisabled(false);
  return true;
}

async function loadSingleInventoryCandidates(generation) {
  inventoryCaptureView.setCandidateLoading();
  try {
    const [inventorySnapshot, trashSnapshot, allTabs] = await Promise.all([
      runtimeMessage(scopedProfileMessage('LIST_INVENTORIES')).catch(() => getCurrentRecords()),
      runtimeMessage(scopedProfileMessage('LIST_TRASH')).catch(() => getCurrentTrashRecords()),
      matchingKleinanzeigenTabs()
    ]);
    setInventoryCaptureMembershipSnapshot(inventorySnapshot, trashSnapshot);
    const tabs = (Array.isArray(allTabs) ? allTabs : []).filter(tab => {
      try { return new URL(tab.url).pathname !== '/m-meine-anzeigen.html'; } catch { return false; }
    });
    const entries = (await Promise.all(tabs.map(async tab => {
      const preview = await tabMessage(tab.id, { type: 'INVENTORY_CANDIDATE_PREVIEW' }).catch(() => null);
      return preview?.adId ? { tab, preview } : null;
    }))).filter(Boolean);
    if (generation !== inventoryCandidateLoadGeneration || inventoryCaptureMode !== 'single' || inventoryCaptureDialogState !== 'confirm') return;
    inventoryCaptureCandidates = buildSingleInventoryCandidates(entries);
    const activeCandidate = inventoryCaptureCandidates.find(candidate => candidate.tabIds.includes(Number(getActiveTabId() || 0))) || inventoryCaptureCandidates[0] || null;
    selectedInventoryCaptureAdId = '';
    inventoryCaptureSourceTabId = null;
    if (activeCandidate) selectInventoryCaptureCandidate(activeCandidate.adId);
    else {
      renderInventoryCaptureCandidates();
      inventoryCaptureView.setStartDisabled(true);
    }
    const profileName = String(getCurrentProfile()?.displayName || getCurrentProfileState()?.selectedProfile?.displayName || '').trim();
    inventoryCaptureView.setCandidateMeta(profileName, inventoryCaptureCandidates.length);
    void logAppEvent('USER_SINGLE_INVENTORY_CANDIDATES_READY', {
      candidateCount: inventoryCaptureCandidates.length,
      candidateAdIds: inventoryCaptureCandidates.map(candidate => candidate.adId),
      candidateThumbnails: inventoryCaptureCandidates.map(candidate => ({ adId: candidate.adId, hasThumbnail: Boolean(candidate.thumbnailUrl), thumbnailSource: candidate.thumbnailSource || 'none' })),
      candidateStorageStates: inventoryCaptureCandidates.map(candidate => ({ adId: candidate.adId, state: inventoryCaptureCandidateStorageState(candidate.adId) })),
      membershipInventoryCount: inventoryCaptureMembershipSnapshot.inventoryIds.size,
      membershipTrashCount: inventoryCaptureMembershipSnapshot.trashIds.size,
      selectedAdId: selectedInventoryCaptureAdId || null,
      selectedTabId: inventoryCaptureSourceTabId
    });
  } catch (error) {
    if (generation !== inventoryCandidateLoadGeneration) return;
    inventoryCaptureCandidates = [];
    selectedInventoryCaptureAdId = '';
    inventoryCaptureSourceTabId = null;
    renderInventoryCaptureCandidates();
    inventoryCaptureView.setStartDisabled(true);
    void logAppEvent('USER_SINGLE_INVENTORY_CANDIDATES_FAILED', { message: String(error?.message || error) }, 'warning');
  }
}

function normalizeInventoryScope(value) {
  return String(value || '').toLowerCase() === INVENTORY_SCOPE_ALL ? INVENTORY_SCOPE_ALL : INVENTORY_SCOPE_NEW_ONLY;
}

function inventoryScopeLabel(scope = inventoryCaptureScope) {
  return inventoryCaptureView.inventoryScopeLabel(scope);
}

function inventoryCaptureSummaryText(scope = inventoryCaptureScope, mode = inventoryCaptureVerificationMode, { completed = false } = {}) {
  return inventoryCaptureView.inventoryCaptureSummaryText(scope, mode, { completed });
}

function renderInventoryCaptureOptions() {
  return inventoryCaptureView.renderInventoryCaptureOptions({
    mode: inventoryCaptureMode,
    dialogState: inventoryCaptureDialogState,
    scope: inventoryCaptureScope,
    verificationMode: inventoryCaptureVerificationMode
  });
}

function setInventoryCaptureModeNotice(mode = inventoryCaptureVerificationMode, scope = inventoryCaptureScope) {
  return inventoryCaptureView.setInventoryCaptureModeNotice({
    mode: inventoryCaptureMode,
    dialogState: inventoryCaptureDialogState,
    verificationMode: mode,
    scope
  });
}

function configureInventoryCaptureDialog(mode) {
  inventoryCaptureMode = mode === 'bulk' ? 'bulk' : 'single';
  inventoryCaptureScope = INVENTORY_SCOPE_NEW_ONLY;
  inventoryCaptureVerificationMode = normalizeRenewalMode(getCurrentRenewalConfiguration().renewalMode);
  inventoryCaptureDialogState = 'confirm';
  inventoryCaptureBulkAwaitingStart = false;
  inventoryCaptureResultKind = '';
  trackedInventoryCaptureRunId = '';
  inventoryCaptureCandidates = [];
  inventoryCaptureMembershipSnapshot = inventoryCandidateModel.createMembershipSnapshot([], []);
  selectedInventoryCaptureAdId = '';
  activeSingleInventoryCapture = null;
  inventoryCaptureSourceTabId = null;
  inventoryCandidateLoadGeneration += 1;
  const profileName = String(getCurrentProfile()?.displayName || getCurrentProfileState()?.selectedProfile?.displayName || '').trim();
  inventoryCaptureView.configureDialog({
    mode: inventoryCaptureMode,
    profileName,
    scope: inventoryCaptureScope,
    verificationMode: inventoryCaptureVerificationMode
  });
}

function openInventoryCaptureDialog(mode) {
  if (mode === 'single' && singleInventoryCaptureBusy()) {
    const adId = String(activeSingleInventoryCapture?.adId || inventoryCaptureReentryTarget?.adId || '');
    if (adId) reopenInventoryCaptureDialog({ mode: 'single', adId });
    return;
  }
  if (!inventoryCaptureDialog || typeof inventoryCaptureDialog.showModal !== 'function') {
    setStatus('error', 'Erfassung kann nicht geöffnet werden', 'Der Erfassungsdialog ist in dieser App-Ansicht nicht verfügbar.');
    return;
  }
  configureInventoryCaptureDialog(mode);
  if (!inventoryCaptureDialog.open) inventoryCaptureDialog.showModal();
  syncInventoryCaptureProgressShortcut();
  if (inventoryCaptureMode === 'single') {
    const generation = inventoryCandidateLoadGeneration;
    void loadSingleInventoryCandidates(generation);
  } else {
    inventoryCaptureStart?.focus();
  }
}

function beginInventoryCaptureProgress(title, text) {
  inventoryCaptureDialogState = 'progress';
  setInventoryCaptureModeNotice(inventoryCaptureVerificationMode, inventoryCaptureScope);
  syncSingleInventoryButtonState();
  syncFullInventoryButtonState();
  renderInventoryCaptureSelectedCandidate();
  inventoryCaptureView.beginProgress({
    mode: inventoryCaptureMode,
    scope: inventoryCaptureScope,
    verificationMode: inventoryCaptureVerificationMode,
    title,
    text
  });
  syncInventoryCaptureProgressShortcut();
}


      async function startSingleInventoryCapture() {
        const selectedCandidate = activeSingleInventoryCandidate();
        const captureTabId = Number(selectedCandidate?.sourceTabId || inventoryCaptureSourceTabId || 0) || null;
        if (!selectedCandidate || !captureTabId) {
          setInventoryCaptureResult('error', 'Keine Anzeige ausgewählt', 'Wähle eine geöffnete eigene Anzeige aus und starte die Erfassung erneut.', 'Es wurden keine Daten verändert.');
          return { ok: false, reason: 'no-candidate' };
        }
        inventoryCaptureSourceTabId = captureTabId;
        activeSingleInventoryCapture = {
          adId: String(selectedCandidate.adId),
          title: String(selectedCandidate.title || `Anzeige ${selectedCandidate.adId}`),
          thumbnailUrl: String(selectedCandidate.thumbnailUrl || ''),
          thumbnailSource: String(selectedCandidate.thumbnailSource || 'none'),
          sourceTabId: captureTabId,
          tabIds: Array.isArray(selectedCandidate.tabIds) ? [...selectedCandidate.tabIds] : [captureTabId]
        };
        setInventoryCaptureReentryTarget({ mode: 'single', adId: String(selectedCandidate.adId) });
        void logAppEvent('USER_SINGLE_INVENTORY_CONFIRMED', { tabId: captureTabId, adId: selectedCandidate.adId, candidateTabIds: selectedCandidate.tabIds });
        beginInventoryCaptureProgress(`Wird erfasst: ${selectedCandidate.title}`, 'Die Anzeige wird deinem Inventarprofil zugeordnet.');
        syncSingleInventoryButtonState();
        progress?.classList?.remove('hidden');
        try {
          setInventoryCaptureProgress({ title: 'Anzeige wird geprüft …', text: 'Die Anzeige wird deinem Inventarprofil zugeordnet.', percent: 15, count: 'Fortschritt 1 von 4' });
          const captureProfile = await ensureDetectedProfileSelectedForCapture();
          setInventoryCaptureProgress({ title: 'Anzeige wird vollständig ausgelesen …', text: 'Anzeigendaten und Bilder werden vollständig ausgelesen. Falls nötig, wird dafür kurz die Bearbeiten-Ansicht im Hintergrund geöffnet.', percent: 40, count: 'Fortschritt 2 von 4' });
          if (captureProfile?.profileId) {
            void logAppEvent('USER_SINGLE_INVENTORY_PROFILE_BOUND', {
              tabId: captureTabId,
              profileId: captureProfile.profileId,
              selectedProfileMatched: String(captureProfile.profileId) === String(getSelectedProfileId() || '')
            });
          }
          setInventoryCaptureProgress({ title: 'Anzeige und Bilder werden gespeichert …', text: 'Anzeigendaten und Bilder werden lokal im Inventar gespeichert.', percent: 72, count: 'Fortschritt 3 von 4' });
          const saved = await runtimeMessage({
            type: 'CAPTURE_SINGLE_INVENTORY',
            sourceTabId: captureTabId,
            profileId: captureProfile?.profileId || null,
            profileName: captureProfile?.displayName || null
          });
          void logAppEvent('USER_SINGLE_INVENTORY_SUCCEEDED', { tabId: captureTabId, adId: saved.adId || '', inventoryId: saved.inventoryId });
          setInventoryCaptureProgress({ title: 'Inventar wird aktualisiert …', text: 'Die Inventaransicht wird mit den gespeicherten Daten aktualisiert.', percent: 92, count: 'Fortschritt 4 von 4' });
          setStatus(saved.imageSummary.uploadReadyJpeg === saved.imageSummary.discovered ? 'ready' : '', 'Anzeige erfasst', `„${saved.title || saved.adId || 'Anzeige'}“ wurde ins Inventar übernommen.`);
          await refreshInventories();
          const persistedRecord = getCurrentRecords().find(record => String(record?.inventoryId || '') === String(saved.inventoryId || '') || String(record?.adId || '') === String(saved.adId || '')) || saved;
          setInventoryCaptureResult('success', 'Anzeige erfolgreich erfasst', `${saved.imageSummary.locallyStored} von ${saved.imageSummary.discovered} Bildern wurden lokal gespeichert.`, `${persistedRecord.title || selectedCandidate.title} · ${saved.adId ? `Anzeigen-ID ${saved.adId}` : 'Inventar wurde aktualisiert.'}`, persistedRecord);
          return { ok: true, saved, record: persistedRecord };
        } catch (error) {
          void logAppEvent('USER_SINGLE_INVENTORY_FAILED', { tabId: captureTabId, message: error.message }, 'error');
          setStatus('error', 'Erfassung unvollständig', 'Die Anzeige konnte nicht vollständig gelesen werden.');
          setInventoryCaptureResult('error', 'Anzeige konnte nicht erfasst werden', friendlyErrorMessage(error), 'Es wurden keine Änderungen an der Anzeige auf Kleinanzeigen vorgenommen.');
          return { ok: false, error: String(error?.message || error || '') };
        } finally {
          progress?.classList?.add('hidden');
          syncSingleInventoryButtonState();
        }
      }

      async function startBulkInventoryCapture() {
        let sourceTabId = null;
        void logAppEvent('USER_BULK_INVENTORY_CONFIRMED', { previousMyAdsTabId: getFullInventoryTabId() || null });
        beginInventoryCaptureProgress('„Meine Anzeigen“ wird im Hintergrund geöffnet …', 'Für diese Erfassung wird ein frischer Stand der aktuell laufenden Anzeigen vorbereitet.');
        inventoryCaptureBulkAwaitingStart = true;
        setBulkStartInFlight(true);
        syncInventoryActionStates('bulk-start');
        try {
          const captureProfile = await ensureDetectedProfileSelectedForCapture();
          setInventoryCaptureProgress({ title: '„Meine Anzeigen“ wird im Hintergrund geöffnet …', text: 'Ein frischer Hintergrundtab wird geöffnet und wartet ereignisgesteuert auf einen vollständigen Anzeigenbestand.', percent: 4, count: 'Vorbereitung' });
          const state = await runtimeMessage({
            type: 'START_BULK_INVENTORY_OPERATION',
            expectedProfileName: String(captureProfile?.displayName || ''),
            inventoryScope: normalizeInventoryScope(inventoryCaptureScope),
            verificationMode: normalizeRenewalMode(inventoryCaptureVerificationMode)
          });
          sourceTabId = Number(state?.sourceTabId || 0) || null;
          inventoryCaptureSourceTabId = sourceTabId;
          if (!sourceTabId) throw new Error('„Meine Anzeigen“ konnte für die Erfassung nicht im Hintergrund geöffnet werden.');
          trackedInventoryCaptureRunId = String(state?.runId || state?.bulkRunId || '');
          if (trackedInventoryCaptureRunId) setInventoryCaptureReentryTarget({ mode: 'bulk', runId: trackedInventoryCaptureRunId });
          inventoryCaptureBulkAwaitingStart = false;
          void logAppEvent('USER_BULK_INVENTORY_STARTED', { operationId: state?.operationId || '', bulkRunId: state?.bulkRunId || state?.runId || '', tabId: sourceTabId, runId: state?.runId || '', expectedTotal: state?.expectedTotal ?? null, inventoryScope: state?.inventoryScope || inventoryCaptureScope, verificationMode: state?.verificationMode || inventoryCaptureVerificationMode });
          renderBulkState(state);
          setStatus('ready', 'Erfassung gestartet', normalizeInventoryScope(state?.inventoryScope) === INVENTORY_SCOPE_NEW_ONLY ? `${state.expectedTotal} laufende Anzeigen werden geprüft; bereits gespeicherte Anzeigen werden übersprungen.` : `${state.expectedTotal} laufende Anzeigen werden nacheinander aktualisiert.`);
          return { ok: true, state };
        } catch (error) {
          inventoryCaptureBulkAwaitingStart = false;
          void logAppEvent('USER_BULK_INVENTORY_FAILED_TO_START', { tabId: sourceTabId, message: error.message }, 'error');
          setFriendlyErrorStatus(error, 'Erfassung nicht gestartet');
          setInventoryCaptureResult('error', 'Erfassung konnte nicht gestartet werden', friendlyErrorMessage(error), 'Es wurde keine Erfassung gestartet.');
          return { ok: false, error: String(error?.message || error || '') };
        } finally {
          setBulkStartInFlight(false);
          syncInventoryActionStates('bulk-start-finished');
        }
      }

      async function requestBulkInventoryStopAfterCurrent() {
        if (inventoryCaptureMode !== 'bulk' || inventoryCaptureDialogState !== 'progress') return { ok: false, reason: 'not-running-bulk' };
        const currentState = getCurrentBulkRunState();
        const runId = String(currentState?.runId || currentState?.bulkRunId || trackedInventoryCaptureRunId || '');
        if (!runId || String(currentState?.status || '') !== 'running' || currentState?.stopAfterCurrentRequested === true) return { ok: false, reason: 'not-stoppable' };
        if (inventoryCaptureStopAfterCurrent) {
          inventoryCaptureStopAfterCurrent.disabled = true;
          inventoryCaptureStopAfterCurrent.textContent = 'Stopp vorgemerkt';
        }
        setInventoryCaptureProgress({
          title: 'Stopp wird vorgemerkt …',
          text: 'Die aktuelle Anzeige wird noch vollständig erfasst. Danach wird die Erfassung kontrolliert beendet.',
          percent: inventoryCaptureBulkProgressModel(currentState).percent,
          count: inventoryCaptureProgressCount?.textContent || ''
        });
        try {
          const state = await runtimeMessage({ type: 'REQUEST_BULK_INVENTORY_STOP_AFTER_CURRENT', runId });
          renderBulkState(state);
          void logAppEvent('USER_BULK_INVENTORY_STOP_AFTER_CURRENT_REQUESTED', { runId, bulkRunId: runId, currentAdId: state?.currentAdId || null });
          return { ok: true, state };
        } catch (error) {
          if (inventoryCaptureStopAfterCurrent) {
            inventoryCaptureStopAfterCurrent.disabled = false;
            inventoryCaptureStopAfterCurrent.textContent = 'Nach aktueller Anzeige stoppen';
          }
          setFriendlyErrorStatus(error, 'Stopp nicht vorgemerkt');
          return { ok: false, error: String(error?.message || error || '') };
        }
      }

      function reopenInventoryCaptureTarget(candidateTarget) {
        const target = normalizeInventoryCaptureReentryTarget(candidateTarget);
        if (!target || !reopenInventoryCaptureDialog(target)) return false;
        void logAppEvent('USER_INVENTORY_CAPTURE_REOPENED', {
          mode: target.mode,
          runId: target.mode === 'bulk' ? target.runId : null,
          bulkRunId: target.mode === 'bulk' ? target.runId : null,
          adId: target.mode === 'single' ? target.adId : null
        });
        return true;
      }

      function reopenInventoryCaptureFromShortcut() {
        return reopenInventoryCaptureTarget(inventoryCaptureReentryTarget);
      }

      function handleEmergencyWorkflowReset() {
        inventoryCandidateLoadGeneration += 1;
        inventoryCaptureBulkAwaitingStart = false;
        trackedInventoryCaptureRunId = '';
        inventoryCaptureSourceTabId = null;
        activeSingleInventoryCapture = null;
        inventoryCaptureReentryTarget = null;
        inventoryCaptureResultKind = '';
        if (inventoryCaptureDialogState === 'progress') inventoryCaptureDialogState = 'closed';
        if (inventoryCaptureDialog?.open) inventoryCaptureDialog.close('emergency-reset');
        syncInventoryCaptureProgressShortcut();
        syncSingleInventoryButtonState();
        return { reset: true, generation: inventoryCandidateLoadGeneration };
      }

      function status() {
        return Object.freeze({
          mode: inventoryCaptureMode, scope: inventoryCaptureScope, verificationMode: inventoryCaptureVerificationMode,
          dialogState: inventoryCaptureDialogState, bulkAwaitingStart: inventoryCaptureBulkAwaitingStart,
          trackedRunId: trackedInventoryCaptureRunId, sourceTabId: inventoryCaptureSourceTabId,
          selectedAdId: selectedInventoryCaptureAdId, activeSingle: activeSingleInventoryCapture,
          reentryTarget: inventoryCaptureReentryTarget, resultKind: inventoryCaptureResultKind,
          generation: inventoryCandidateLoadGeneration, candidates: inventoryCaptureCandidates.slice()
        });
      }
      function setSourceTabId(value) { inventoryCaptureSourceTabId = Number(value || 0) || null; return inventoryCaptureSourceTabId; }
      function setActiveSingle(value) { activeSingleInventoryCapture = value && typeof value === 'object' ? { ...value } : null; return activeSingleInventoryCapture; }
      function setBulkAwaitingStart(value) { inventoryCaptureBulkAwaitingStart = Boolean(value); }
      function setTrackedRunId(value) { trackedInventoryCaptureRunId = String(value || ''); return trackedInventoryCaptureRunId; }
      function setScope(value) { inventoryCaptureScope = normalizeInventoryScope(value); renderInventoryCaptureOptions(); return inventoryCaptureScope; }
      function setVerificationMode(value) { inventoryCaptureVerificationMode = normalizeRenewalMode(value); renderInventoryCaptureOptions(); return inventoryCaptureVerificationMode; }
      function setDialogState(value) { inventoryCaptureDialogState = String(value || 'closed'); }
      function setKnownSingleCandidate(preview, sourceTabId, expectedAdId) {
        configureInventoryCaptureDialog('single');
        inventoryCaptureCandidates = [{ ...(preview || {}), adId: String(expectedAdId || preview?.adId || ''), sourceTabId: Number(sourceTabId || 0) || null, tabIds: [Number(sourceTabId || 0)].filter(Boolean) }];
        selectedInventoryCaptureAdId = String(expectedAdId || preview?.adId || '');
        inventoryCaptureSourceTabId = Number(sourceTabId || 0) || null;
      }
      function ensureBulkReentry(runId) { if (!inventoryCaptureReentryTarget && String(runId || '').trim()) inventoryCaptureReentryTarget = { mode: 'bulk', runId: String(runId).trim() }; return inventoryCaptureReentryTarget; }
      function closeCancelled() {
        const closingSingleAdId = inventoryCaptureReentryTarget?.mode === 'single' ? inventoryCaptureReentryTarget.adId : '';
        inventoryCaptureDialogState = 'closed'; activeSingleInventoryCapture = null;
        if (closingSingleAdId) clearInventoryCaptureReentryTarget('single', closingSingleAdId);
        if (inventoryCaptureDialog?.open) inventoryCaptureDialog.close('cancelled'); syncInventoryCaptureProgressShortcut();
      }
      function closeDone() {
        const closingTarget = inventoryCaptureReentryTarget; inventoryCaptureDialogState = 'closed'; activeSingleInventoryCapture = null;
        if (closingTarget?.mode === 'single') clearInventoryCaptureReentryTarget('single', closingTarget.adId); else if (closingTarget?.mode === 'bulk') clearInventoryCaptureReentryTarget('bulk', closingTarget.runId);
        if (inventoryCaptureDialog?.open) inventoryCaptureDialog.close('done'); syncInventoryCaptureProgressShortcut();
      }
      function closeOrHide() {
        const wasProgress = inventoryCaptureDialogState === 'progress'; const closingTarget = inventoryCaptureReentryTarget;
        if (!wasProgress) { inventoryCaptureDialogState = 'closed'; activeSingleInventoryCapture = null; if (closingTarget?.mode === 'single') clearInventoryCaptureReentryTarget('single', closingTarget.adId); else if (closingTarget?.mode === 'bulk') clearInventoryCaptureReentryTarget('bulk', closingTarget.runId); }
        if (inventoryCaptureDialog?.open) inventoryCaptureDialog.close(wasProgress ? 'hidden' : 'closed'); syncInventoryCaptureProgressShortcut();
      }
      function showDialog() { if (inventoryCaptureDialog && !inventoryCaptureDialog.open) inventoryCaptureDialog.showModal(); }
      return Object.freeze({
        status, busy: singleInventoryCaptureBusy, activeCandidate: activeSingleInventoryCandidate, syncSingleButton: syncSingleInventoryButtonState,
        isVisible: isInventoryCaptureDialogVisible, bulkTerminal: inventoryCaptureBulkStateIsTerminal,
        setReentryTarget: setInventoryCaptureReentryTarget, clearReentryTarget: clearInventoryCaptureReentryTarget, shortcutSeverity: inventoryCaptureShortcutSeverity,
        syncProgressShortcut: syncInventoryCaptureProgressShortcut, bindExistingBulk: bindExistingBulkInventoryCapture, reopen: reopenInventoryCaptureDialog,
        setSteps: setInventoryCaptureSteps, setProgress: setInventoryCaptureProgress, renderResultDetails: renderInventoryCaptureResultDetails,
        setResult: setInventoryCaptureResult, syncBulkTerminalSteps: syncInventoryCaptureBulkTerminalSteps, bulkProgressModel: inventoryCaptureBulkProgressModel,
        syncBulkModal: syncInventoryCaptureBulkModal, buildCandidates: buildSingleInventoryCandidates, candidateStorageState: inventoryCaptureCandidateStorageState,
        setMembershipSnapshot: setInventoryCaptureMembershipSnapshot, renderCandidates: renderInventoryCaptureCandidates,
        renderSelectedCandidate: renderInventoryCaptureSelectedCandidate, renderBulkCurrentCandidate: renderInventoryCaptureBulkCurrentCandidate,
        selectCandidate: selectInventoryCaptureCandidate, loadCandidates: loadSingleInventoryCandidates, normalizeScope: normalizeInventoryScope,
        scopeLabel: inventoryScopeLabel, summaryText: inventoryCaptureSummaryText, renderOptions: renderInventoryCaptureOptions,
        setModeNotice: setInventoryCaptureModeNotice, configureDialog: configureInventoryCaptureDialog, openDialog: openInventoryCaptureDialog,
        beginProgress: beginInventoryCaptureProgress, setScope,
        setVerificationMode, setKnownSingleCandidate, ensureBulkReentry, closeCancelled, closeDone, closeOrHide, showDialog,
        startSingle: startSingleInventoryCapture, startBulk: startBulkInventoryCapture, requestStopAfterCurrent: requestBulkInventoryStopAfterCurrent,
        reopenTarget: reopenInventoryCaptureTarget, reopenFromShortcut: reopenInventoryCaptureFromShortcut, handleEmergencyWorkflowReset
      });
    }
  });
  globalThis.KRDeps?.register?.('KRInventoryCaptureController', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
