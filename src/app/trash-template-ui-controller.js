(() => {
  'use strict';
  const API=Object.freeze({
    create(options={}) {
      const document=options.document||globalThis.document;
      const elements=options.elements||{};
      const { trashTemplateDialog,trashTemplateClose,trashTemplateCancel,trashTemplateConfirm,trashTemplateDone,trashTemplateInventory,trashTemplateRestart,trashTemplateTarget,trashTemplateTitle,trashTemplateIntro,trashTemplateSourceTitle,trashTemplateSourceMeta,trashTemplateCover,trashTemplateSteps,trashTemplateProgressMessage,trashTemplateProgressTitle,trashTemplateProgressText,trashTemplateConfirmActions,trashTemplateProgressActions }=elements;
      const accountGateModel=options.accountGateModel||(()=>({allowed:false,tooltip:''}));
      const insertionLockActive=options.insertionLockActive||(()=>false);
      const insertionLockUiText=options.insertionLockUiText||(()=> '');
      const setStatus=options.setStatus||(()=>{});
      const runtimeMessage=options.runtimeMessage||(async()=>null); const logAppEvent=options.logAppEvent||(async()=>{}); const displayPriceWithType=options.displayPriceWithType||(()=> ''); const loadLocalPreview=options.loadLocalPreview||(async()=>{}); const friendlyErrorMessage=options.friendlyErrorMessage||(error=>String(error?.message||error||''));
      const confirmAction=options.confirmAction||(async()=>false); const onStartTrashTemplate=options.onStartTrashTemplate||(async()=>null); const onStartKnownSingleInventoryCapture=options.onStartKnownSingleInventoryCapture||(async()=>null); const refreshInventories=options.refreshInventories||(async()=>null); const publishTrashTemplateRecoveryActivity=options.publishTrashTemplateRecoveryActivity||(()=>{}); const archiveTrashTemplateRecoveryActivity=options.archiveTrashTemplateRecoveryActivity||(()=>{}); const clearTrashTemplateRecoveryActivity=options.clearTrashTemplateRecoveryActivity||(()=>{}); const focusTrashTemplateTargetTab=options.focusTrashTemplateTargetTab||(async()=>false); const checkTrashTemplateTargetTab=options.checkTrashTemplateTargetTab||focusTrashTemplateTargetTab;
      let currentInsertionLock={locked:false}; let selectedProfileId=''; let currentTrashRecords=[]; let trashTemplateDialogMode='closed'; let trackedTrashTemplateFillId=''; let trackedTrashTemplateTabId=null; let trackedTrashTemplateNewAdId=''; let trackedTrashTemplateRecord=null; let trashTemplateDialogRevision=0; let trashTemplateDialogOwner=Object.freeze({kind:'none',inventoryId:'',fillId:''}); let installed=false;

function setTrashTemplateStepStates({ step = 1, errorStep = 0, waitingStep = 0, published = false } = {}) {
  for (const item of trashTemplateSteps?.querySelectorAll('[data-template-step]') || []) {
    const number = Number(item.dataset.templateStep || 0);
    item.classList.remove('phase-pending', 'phase-active', 'phase-success', 'phase-error', 'phase-waiting', 'phase-skipped');
    let state = 'pending';
    if (errorStep && number === errorStep) state = 'error';
    else if (waitingStep && number === waitingStep) state = 'waiting';
    else if (number < step) state = 'success';
    else if (number === step) state = published && number === 3 ? 'success' : 'active';
    item.classList.add(`phase-${state}`);
  }
}

function setTrashTemplateProgressMessage(kind, title, text) {
  trashTemplateProgressMessage?.classList.remove('hidden', 'success', 'error', 'waiting');
  if (kind) trashTemplateProgressMessage?.classList.add(kind);
  if (trashTemplateProgressTitle) trashTemplateProgressTitle.textContent = title || '';
  if (trashTemplateProgressText) trashTemplateProgressText.textContent = text || '';
}

function setTrashTemplateDialogOwner(kind = 'none', { inventoryId = '', fillId = '' } = {}) {
  trashTemplateDialogRevision += 1;
  trashTemplateDialogOwner = Object.freeze({
    kind: String(kind || 'none'),
    inventoryId: String(inventoryId || ''),
    fillId: String(fillId || '')
  });
  return trashTemplateDialogRevision;
}

function trashTemplateDialogOwnedByNewDraft() {
  return trashTemplateDialogOwner.kind === 'new-draft';
}

function canAdoptTrashTemplateSession(session, { allowTakeover = false, requestRevision = trashTemplateDialogRevision } = {}) {
  if (!session?.fillId) return false;
  if (requestRevision !== trashTemplateDialogRevision) return false;
  if (allowTakeover) return true;
  if (trashTemplateDialogOwner.kind === 'new-draft') return false;
  if (trashTemplateDialogOwner.kind === 'session' && trashTemplateDialogOwner.fillId && trashTemplateDialogOwner.fillId !== String(session.fillId)) return false;
  return true;
}

function renderTrashTemplateSource(record) {
  if (trashTemplateSourceTitle) trashTemplateSourceTitle.textContent = record?.title || `Anzeige ${record?.adId || record?.inventoryId || ''}`;
  if (trashTemplateSourceMeta) trashTemplateSourceMeta.textContent = `${displayPriceWithType(record)} · Anzeigen-ID ${record?.adId || 'unbekannt'}`;
  if (trashTemplateCover) {
    trashTemplateCover.removeAttribute('src');
    trashTemplateCover.alt = `Titelbild von ${record?.title || 'Papierkorb-Vorlage'}`;
    const image = record?.images?.find(item => item?.isPrimary) || record?.images?.[0] || null;
    if (image) void loadLocalPreview(trashTemplateCover, record, image);
  }
}

function resetTrashTemplateDialog(record) {
  trashTemplateDialogMode = 'confirm';
  trackedTrashTemplateFillId = '';
  trackedTrashTemplateTabId = null;
  trackedTrashTemplateNewAdId = '';
  trackedTrashTemplateRecord = record || null;
  setTrashTemplateDialogOwner('new-draft', { inventoryId: record?.inventoryId || '' });
  if (trashTemplateTitle) trashTemplateTitle.textContent = 'Vorlage prüfen';
  renderTrashTemplateSource(record);
  if (trashTemplateIntro) {
    trashTemplateIntro.textContent = 'Prüfe kurz, ob du diese Anzeige als Vorlage für eine neue Anzeige verwenden möchtest.';
    trashTemplateIntro.classList.remove('hidden');
  }
  trashTemplateProgressMessage?.classList.add('hidden');
  trashTemplateConfirmActions?.classList.remove('hidden');
  trashTemplateProgressActions?.classList.add('hidden');
  if (trashTemplateConfirm) trashTemplateConfirm.disabled = false;
  if (trashTemplateInventory) {
    trashTemplateInventory.disabled = true;
    trashTemplateInventory.title = 'Nach der manuellen Veröffentlichung verfügbar.';
  }
  setTrashTemplateRestartVisible(false);
  setTrashTemplateTargetVisible(false);
  setTrashTemplateStepStates({ step: 1 });
}

function openTrashTemplateDialog(record) {
  if (!trashTemplateDialog || typeof trashTemplateDialog.showModal !== 'function') {
    setStatus('error', 'Vorlage kann nicht geöffnet werden', 'Der Vorlagen-Dialog ist in dieser App-Ansicht nicht verfügbar.');
    return false;
  }
  resetTrashTemplateDialog(record);
  if (!trashTemplateDialog.open) trashTemplateDialog.showModal();
  trashTemplateConfirm?.focus();
  return true;
}

function trashTemplateInventoryGate() {
  if (!/^\d+$/.test(String(trackedTrashTemplateNewAdId || ''))) {
    return { allowed: false, tooltip: 'Nach der manuellen Veröffentlichung verfügbar.' };
  }
  const gate = accountGateModel();
  if (!gate.allowed) return { allowed: false, tooltip: gate.tooltip };
  const recordProfile = String(trackedTrashTemplateRecord?.profileId || '');
  if (!recordProfile || recordProfile !== String(selectedProfileId || '')) {
    return { allowed: false, tooltip: 'Nicht verfügbar: Die Vorlage gehört nicht zum ausgewählten Inventarprofil.' };
  }
  return { allowed: true, tooltip: 'Die veröffentlichte Anzeige direkt ins Inventar aufnehmen.' };
}

function syncTrashTemplateInventoryButton() {
  if (!trashTemplateInventory) return;
  const gate = trashTemplateInventoryGate();
  trashTemplateInventory.disabled = !gate.allowed;
  trashTemplateInventory.title = gate.tooltip || '';
}

function setTrashTemplateRestartVisible(visible) {
  const show = Boolean(visible);
  trashTemplateRestart?.classList.toggle('hidden', !show);
  trashTemplateInventory?.classList.toggle('hidden', show);
  if (trashTemplateRestart && !show) trashTemplateRestart.disabled = false;
}

function setTrashTemplateTargetVisible(visible) {
  const show = Boolean(visible);
  trashTemplateTarget?.classList.toggle('hidden', !show);
  if (trashTemplateTarget) {
    trashTemplateTarget.disabled = !show;
    trashTemplateTarget.title = show ? 'Öffnet den bereits vorbereiteten Kleinanzeigen-Tab zur manuellen Prüfung und Veröffentlichung.' : '';
  }
}

function renderTrashTemplateTargetUnavailable(session, outcome = {}) {
  const reason = String(outcome?.reason || 'focus-failed');
  const missing = ['missing', 'missing-id', 'invalid-tab-id'].includes(reason);
  trashTemplateDialogMode = 'target-missing';
  if (trashTemplateTitle) trashTemplateTitle.textContent = missing ? 'Vorbereiteter Tab wurde geschlossen' : 'Vorbereiteter Tab ist nicht verfügbar';
  if (trashTemplateIntro) trashTemplateIntro.classList.add('hidden');
  trashTemplateConfirmActions?.classList.add('hidden');
  trashTemplateProgressActions?.classList.remove('hidden');
  setTrashTemplateStepStates({ step: 3, waitingStep: 3 });
  const text = missing
    ? 'Der Kleinanzeigen-Tab mit der vorbereiteten Anzeige ist nicht mehr geöffnet. Dieser Vorgang kann deshalb nicht sicher fortgesetzt werden. Du kannst die Anzeige kontrolliert neu vorbereiten; veröffentlicht wird dabei weiterhin nichts automatisch.'
    : 'Der vorbereitete Kleinanzeigen-Tab konnte nicht sicher geöffnet und diesem Vorgang zugeordnet werden. Aus Sicherheitsgründen wird der Vorgang nicht automatisch an einen anderen Tab gebunden.';
  setTrashTemplateProgressMessage('waiting', missing ? 'Kleinanzeigen-Tab wurde geschlossen' : 'Kleinanzeigen-Tab nicht verfügbar', text);
  setTrashTemplateRestartVisible(true);
  setTrashTemplateTargetVisible(false);
  if (trashTemplateRestart) {
    trashTemplateRestart.disabled = false;
    trashTemplateRestart.title = 'Öffnet einen neuen Kleinanzeigen-Tab und bereitet dieselbe Papierkorb-Vorlage erneut vor. Es wird nichts automatisch veröffentlicht.';
  }
  publishTrashTemplateRecoveryActivity({
    kind: 'waiting',
    title: missing ? 'Vorbereiteter Tab wurde geschlossen' : 'Vorbereiteter Tab ist nicht verfügbar',
    text: missing ? 'Der vorbereitete Kleinanzeigen-Tab ist nicht mehr geöffnet. Öffne den Vorgang für eine sichere Recovery.' : 'Der vorbereitete Kleinanzeigen-Tab kann nicht sicher verwendet werden. Öffne den Vorgang für eine sichere Recovery.',
    badgeLabel: 'Aktion nötig', active: true, action: 'resume-trash-template', actionLabel: 'Recovery öffnen'
  });
  syncTrashTemplateInventoryButton();
  return session;
}

function handleTrashTemplateTargetTabRemoved(tabId) {
  const id = Number(tabId || 0);
  if (!id || id !== Number(trackedTrashTemplateTabId || 0)) return false;
  if (!trackedTrashTemplateFillId || trashTemplateDialogMode !== 'awaiting-publish') return false;
  const session = {
    fillId: trackedTrashTemplateFillId,
    targetTabId: id,
    trashInventoryId: trackedTrashTemplateRecord?.inventoryId || null,
    inventoryId: trackedTrashTemplateRecord?.inventoryId || null,
    sourceAdId: trackedTrashTemplateRecord?.adId || null,
    status: 'complete',
    stage: 'template-only-complete',
    newAdId: trackedTrashTemplateNewAdId || null
  };
  renderTrashTemplateTargetUnavailable(session, { ok: false, reason: 'missing', tabId: id });
  void logAppEvent('USER_TRASH_TEMPLATE_TARGET_REMOVED_LIVE', {
    fillId: trackedTrashTemplateFillId,
    inventoryId: trackedTrashTemplateRecord?.inventoryId || null,
    tabId: id,
    dialogOpen: trashTemplateDialog?.open === true
  }, 'info').catch(() => {});
  return true;
}

function trashTemplateRecoveryActivity(session) {
  if (!session?.fillId) return null;
  const status = String(session.status || '');
  const stage = String(session.stage || '');
  if (status === 'complete' && stage === 'template-only-inventoried') return null;
  if (/^\d+$/.test(String(session.newAdId || '')) || stage === 'template-only-published') {
    return { kind: 'waiting', title: 'Anzeige veröffentlicht – Inventarisierung offen', text: 'Die neue Anzeige wurde erkannt. Öffne den Vorgang und nimm sie jetzt ins Inventar auf.', badgeLabel: 'Aktion nötig', active: true, action: 'resume-trash-template', actionLabel: 'Inventarisierung fortsetzen' };
  }
  if (status === 'complete' && stage === 'template-only-complete') {
    return { kind: 'waiting', title: 'Vorlagen-Inserat ist vorbereitet', text: 'Bitte prüfe die vorausgefüllte Anzeige und veröffentliche sie anschließend selbst.', badgeLabel: 'Aktion nötig', active: true, action: 'resume-trash-template', actionLabel: 'Status öffnen' };
  }
  if (status === 'error' || status === 'needs-review') {
    return { kind: 'error', title: 'Vorlagen-Inserat benötigt Prüfung', text: session.result?.issues?.[0] || 'Der Vorgang wurde angehalten. Öffne ihn, um den aktuellen Stand zu prüfen.', badgeLabel: 'Prüfen', active: true, action: 'resume-trash-template', actionLabel: 'Problem prüfen' };
  }
  return { kind: '', title: 'Vorlagen-Inserat wird vorbereitet', text: 'Der Vorgang läuft im Hintergrund weiter. Öffne ihn, um den aktuellen Stand zu sehen.', badgeLabel: 'Läuft', active: true, action: 'resume-trash-template', actionLabel: 'Status öffnen' };
}

function syncTrashTemplateRecoveryActivity(session = null) {
  const activity = trashTemplateRecoveryActivity(session);
  if (activity) publishTrashTemplateRecoveryActivity(activity);
  else clearTrashTemplateRecoveryActivity();
}

function handleEmergencyWorkflowReset() {
  archiveTrashTemplateRecoveryActivity();
  syncTrashTemplateRecoveryActivity(null);
  if (!trashTemplateDialogOwnedByNewDraft()) {
    trackedTrashTemplateFillId = '';
    trackedTrashTemplateTabId = null;
    trackedTrashTemplateNewAdId = '';
    trackedTrashTemplateRecord = null;
    setTrashTemplateDialogOwner('none');
  }
  syncTrashTemplateInventoryButton();
  return true;
}

async function restoreTrashTemplateRecord(inventoryId) {
  const id = String(inventoryId || '');
  if (!id) return trackedTrashTemplateRecord;
  let record = currentTrashRecords.find(item => String(item?.inventoryId || '') === id) || null;
  if (!record) {
    const fresh = await runtimeMessage({ type: 'LIST_TRASH', profileId: selectedProfileId || null }).catch(() => null);
    if (Array.isArray(fresh)) {
      currentTrashRecords = fresh;
      record = currentTrashRecords.find(item => String(item?.inventoryId || '') === id) || null;
    }
  }
  if (record) trackedTrashTemplateRecord = record;
  return trackedTrashTemplateRecord;
}

async function recoverTrashTemplateSession({ forceOpen = false, allowTakeover = false } = {}) {
  const requestRevision = trashTemplateDialogRevision;
  const session = await runtimeMessage({ type: 'GET_RECOVERABLE_TRASH_TEMPLATE_FILL' }).catch(() => null);
  if (!session?.fillId) { syncTrashTemplateRecoveryActivity(null); return null; }
  if (!canAdoptTrashTemplateSession(session, { allowTakeover, requestRevision })) { syncTrashTemplateRecoveryActivity(session); return session; }
  const inventoryId = String(session.trashInventoryId || session.inventoryId || '');
  setTrashTemplateDialogOwner('session', { inventoryId, fillId: session.fillId });
  trackedTrashTemplateFillId = String(session.fillId);
  trackedTrashTemplateTabId = Number(session.targetTabId || 0) || null;
  trackedTrashTemplateNewAdId = String(session.newAdId || '');
  await restoreTrashTemplateRecord(inventoryId);
  if (!trackedTrashTemplateRecord) return session;
  renderTrashTemplateSource(trackedTrashTemplateRecord);
  renderTrashTemplateFillStatus(session);
  if (forceOpen && trashTemplateDialog && !trashTemplateDialog.open) trashTemplateDialog.showModal();
  return session;
}

async function reopenTrashTemplateSession() {
  const session = trackedTrashTemplateFillId && trashTemplateDialogOwner.kind === 'session'
    ? await refreshTrashTemplateDialogStatus({ forceOpen: false })
    : await recoverTrashTemplateSession({ forceOpen: false, allowTakeover: true });
  if (!session) return false;
  const status = String(session.status || '');
  const stage = String(session.stage || '');
  if (status === 'complete' && stage === 'template-only-complete') {
    const tabId = Number(session.targetTabId || trackedTrashTemplateTabId || 0);
    const outcome = tabId
      ? await checkTrashTemplateTargetTab(tabId).catch(error => ({ ok: false, reason: 'check-failed', tabId, message: String(error?.message || error || '').slice(0, 300) }))
      : { ok: false, reason: 'missing-id', tabId: null };
    const available = outcome === true || outcome?.ok === true;
    if (!available) {
      renderTrashTemplateTargetUnavailable(session, outcome && typeof outcome === 'object' ? outcome : { ok: false, reason: 'check-failed', tabId });
      await logAppEvent('USER_TRASH_TEMPLATE_TARGET_UNAVAILABLE', { fillId: session.fillId || null, inventoryId: session.trashInventoryId || session.inventoryId || null, tabId: tabId || null, reason: String(outcome?.reason || 'check-failed') }, 'info').catch(() => {});
    }
  }
  if (trashTemplateDialog && !trashTemplateDialog.open) trashTemplateDialog.showModal();
  return true;
}

async function openTrashTemplateTarget() {
  if (trashTemplateDialogMode !== 'awaiting-publish' || !trackedTrashTemplateFillId) return false;
  const tabId = Number(trackedTrashTemplateTabId || 0);
  if (!tabId) {
    renderTrashTemplateTargetUnavailable({ fillId: trackedTrashTemplateFillId, targetTabId: null, trashInventoryId: trackedTrashTemplateRecord?.inventoryId || null }, { ok: false, reason: 'missing-id', tabId: null });
    return false;
  }
  await logAppEvent('USER_TRASH_TEMPLATE_TARGET_OPEN_REQUESTED', { fillId: trackedTrashTemplateFillId, inventoryId: trackedTrashTemplateRecord?.inventoryId || null, tabId }, 'info').catch(() => {});
  const outcome = await focusTrashTemplateTargetTab(tabId).catch(error => ({ ok: false, reason: 'focus-failed', tabId, message: String(error?.message || error || '').slice(0, 300) }));
  if (outcome === true || outcome?.ok === true) return true;
  const session = { fillId: trackedTrashTemplateFillId, targetTabId: tabId, trashInventoryId: trackedTrashTemplateRecord?.inventoryId || null, inventoryId: trackedTrashTemplateRecord?.inventoryId || null, sourceAdId: trackedTrashTemplateRecord?.adId || null, status: 'complete', stage: 'template-only-complete', newAdId: trackedTrashTemplateNewAdId || null };
  renderTrashTemplateTargetUnavailable(session, outcome && typeof outcome === 'object' ? outcome : { ok: false, reason: 'focus-failed', tabId });
  await logAppEvent('USER_TRASH_TEMPLATE_TARGET_UNAVAILABLE', { fillId: trackedTrashTemplateFillId, inventoryId: trackedTrashTemplateRecord?.inventoryId || null, tabId, reason: String(outcome?.reason || 'focus-failed') }, 'info').catch(() => {});
  return false;
}

function renderTrashTemplateFillStatus(session) {
  if (!session || String(session.fillId || '') !== String(trackedTrashTemplateFillId || '')) return;
  syncTrashTemplateRecoveryActivity(session);
  trackedTrashTemplateTabId = Number(session.targetTabId || trackedTrashTemplateTabId || 0) || null;
  trackedTrashTemplateNewAdId = String(session.newAdId || trackedTrashTemplateNewAdId || '');
  const status = String(session.status || '');
  const stage = String(session.stage || '');
  trashTemplateConfirmActions?.classList.add('hidden');
  trashTemplateProgressActions?.classList.remove('hidden');
  trashTemplateProgressMessage?.classList.remove('hidden');
  setTrashTemplateRestartVisible(false);
  setTrashTemplateTargetVisible(false);

  if (status === 'error' || status === 'needs-review') {
    trashTemplateDialogMode = 'error';
    if (trashTemplateTitle) trashTemplateTitle.textContent = 'Vorlage konnte nicht vorbereitet werden';
    if (trashTemplateIntro) trashTemplateIntro.classList.add('hidden');
    setTrashTemplateStepStates({ step: 2, errorStep: 2 });
    setTrashTemplateProgressMessage('error', 'Vorbereitung wurde angehalten', session.result?.issues?.[0] || 'Die Anzeige konnte nicht vollständig vorausgefüllt werden.');
    syncTrashTemplateInventoryButton();
    return;
  }

  if (/^\d+$/.test(String(session.newAdId || ''))) {
    trashTemplateDialogMode = 'published';
    if (trashTemplateTitle) trashTemplateTitle.textContent = 'Anzeige veröffentlicht';
    if (trashTemplateIntro) trashTemplateIntro.classList.add('hidden');
    setTrashTemplateStepStates({ step: 3, published: true });
    setTrashTemplateProgressMessage('success', 'Neue Anzeige wurde erkannt', `Die veröffentlichte Anzeige mit ID ${session.newAdId} wurde eindeutig erkannt. Du kannst sie jetzt ins Inventar aufnehmen.`);
    syncTrashTemplateInventoryButton();
    return;
  }

  if (status === 'complete' && stage === 'template-only-complete') {
    trashTemplateDialogMode = 'awaiting-publish';
    if (trashTemplateTitle) trashTemplateTitle.textContent = 'Anzeige ist vorbereitet';
    if (trashTemplateIntro) trashTemplateIntro.classList.add('hidden');
    setTrashTemplateStepStates({ step: 3 });
    setTrashTemplateProgressMessage('waiting', 'Anzeige prüfen und veröffentlichen', 'Prüfe die vorausgefüllten Angaben im Kleinanzeigen-Tab und veröffentliche die Anzeige anschließend selbst mit „Anzeige aufgeben“. Die App erkennt die neue Anzeige danach automatisch.');
    setTrashTemplateTargetVisible(true);
    syncTrashTemplateInventoryButton();
    return;
  }

  trashTemplateDialogMode = 'preparing';
  if (trashTemplateTitle) trashTemplateTitle.textContent = 'Anzeige wird vorbereitet';
  if (trashTemplateIntro) trashTemplateIntro.classList.add('hidden');
  setTrashTemplateStepStates({ step: 2 });
  const textByStage = {
    'tab-opened': 'Der Kleinanzeigen-Tab wird geöffnet.',
    'content-connected': 'Die gespeicherten Daten werden vorbereitet.',
    'filling': 'Felder und Bilder werden in die neue Anzeige übernommen.',
    'form-verified': 'Die übernommenen Angaben werden geprüft.',
    'post-fill-continuing': 'Die Anzeige wird für deine abschließende Prüfung vorbereitet.'
  };
  setTrashTemplateProgressMessage('', 'Vorlage wird übernommen', textByStage[stage] || 'Die gespeicherten Daten werden in eine neue Anzeige übernommen.');
  syncTrashTemplateInventoryButton();
}

async function refreshTrashTemplateDialogStatus({ forceOpen = false } = {}) {
  if (!trackedTrashTemplateFillId) return null;
  const session = await runtimeMessage({ type: 'GET_TRASH_TEMPLATE_FILL_STATUS', fillId: trackedTrashTemplateFillId }).catch(() => null);
  if (session) {
    renderTrashTemplateFillStatus(session);
    if (forceOpen && trashTemplateDialog && !trashTemplateDialog.open) trashTemplateDialog.showModal();
  }
  return session;
}

async function restartTrashTemplateAfterTargetLoss() {
  if (trashTemplateDialogMode !== 'target-missing' || !trackedTrashTemplateFillId || !trackedTrashTemplateRecord) return false;
  const supersedeFillId = String(trackedTrashTemplateFillId);
  const confirmed = await confirmAction({
    title: 'Anzeige neu vorbereiten?',
    text: 'Der ursprüngliche Kleinanzeigen-Tab ist geschlossen. Es wird ein neuer Tab geöffnet und dieselbe Papierkorb-Vorlage erneut vorbereitet.',
    detail: 'Es wird nichts automatisch veröffentlicht. Wenn du die geschlossene Anzeige bereits veröffentlicht hattest, prüfe zuerst „Meine Anzeigen“, damit du nicht versehentlich ein Duplikat veröffentlichst.',
    confirmLabel: 'Neu vorbereiten', cancelLabel: 'Abbrechen'
  });
  if (!confirmed) return false;
  if (trashTemplateRestart) trashTemplateRestart.disabled = true;
  setTrashTemplateProgressMessage('', 'Anzeige wird neu vorbereitet', 'Ein neuer Kleinanzeigen-Tab wird geöffnet. Der bisherige verlorene Tab wird nur dann als ersetzt markiert, wenn der Background sein Fehlen selbst bestätigt.');
  try {
    const started = await onStartTrashTemplate(trackedTrashTemplateRecord, { supersedeFillId });
    trackedTrashTemplateFillId = String(started?.fillId || '');
    setTrashTemplateDialogOwner('session', { inventoryId: trackedTrashTemplateRecord.inventoryId || '', fillId: trackedTrashTemplateFillId });
    trackedTrashTemplateTabId = Number(started?.tabId || 0) || null;
    trackedTrashTemplateNewAdId = '';
    trashTemplateDialogMode = 'preparing';
    setTrashTemplateRestartVisible(false);
    if (trashTemplateTitle) trashTemplateTitle.textContent = 'Anzeige wird neu vorbereitet';
    setTrashTemplateStepStates({ step: 2 });
    setTrashTemplateProgressMessage('', 'Vorlage wird erneut übernommen', 'Die gespeicherten Daten und Bilder werden in den neuen Kleinanzeigen-Tab übernommen. Veröffentlicht wird nicht automatisch.');
    await logAppEvent('USER_TRASH_TEMPLATE_TARGET_LOSS_RESTARTED', { supersededFillId: supersedeFillId, fillId: trackedTrashTemplateFillId, inventoryId: trackedTrashTemplateRecord.inventoryId || null, tabId: trackedTrashTemplateTabId }).catch(() => {});
    await refreshTrashTemplateDialogStatus().catch(() => null);
    return true;
  } catch (error) {
    trashTemplateDialogMode = 'target-missing';
    if (trashTemplateRestart) trashTemplateRestart.disabled = false;
    setTrashTemplateRestartVisible(true);
    setTrashTemplateProgressMessage('error', 'Anzeige konnte nicht neu vorbereitet werden', friendlyErrorMessage(error, 'Der neue Kleinanzeigen-Tab konnte nicht sicher gestartet werden.'));
    await logAppEvent('USER_TRASH_TEMPLATE_TARGET_LOSS_RESTART_FAILED', { fillId: supersedeFillId, inventoryId: trackedTrashTemplateRecord?.inventoryId || null, message: String(error?.message || error || '').slice(0, 300) }, 'error').catch(() => {});
    return false;
  }
}

      function updateContext(context={}) { if(context.insertionLock) currentInsertionLock=context.insertionLock; if(Object.prototype.hasOwnProperty.call(context,'selectedProfileId')) selectedProfileId=String(context.selectedProfileId||''); if(Array.isArray(context.trashRecords)) currentTrashRecords=context.trashRecords; }
      function status() { return Object.freeze({trashTemplateDialogMode,trackedTrashTemplateFillId,trackedTrashTemplateTabId,trackedTrashTemplateNewAdId,trackedTrashTemplateRecord,trashTemplateDialogRevision,trashTemplateDialogOwner}); }
      function syncFromLock() {
        const locked=insertionLockActive(); const trashOwned=locked&&String(currentInsertionLock?.kind||'')==='trash-template';
        if(trashOwned&&currentInsertionLock?.ownerId){const lockFillId=String(currentInsertionLock.ownerId);const lockInventoryId=String(currentInsertionLock.inventoryId||'');if(trashTemplateDialogOwnedByNewDraft()&&trashTemplateDialogOwner.inventoryId!==lockInventoryId){void runtimeMessage({type:'GET_TRASH_TEMPLATE_FILL_STATUS',fillId:lockFillId}).then(session=>{if(session)syncTrashTemplateRecoveryActivity(session);}).catch(()=>null);}else if(!trackedTrashTemplateFillId||trackedTrashTemplateFillId===lockFillId){setTrashTemplateDialogOwner('session',{inventoryId:lockInventoryId,fillId:lockFillId});trackedTrashTemplateFillId=lockFillId;restoreTrashTemplateRecord(lockInventoryId);void refreshTrashTemplateDialogStatus({forceOpen:false});}} else if(!trackedTrashTemplateFillId){void recoverTrashTemplateSession({forceOpen:false,allowTakeover:false});} syncTrashTemplateInventoryButton();
      }
      function handleTrashTemplateDataChanged(details={}) { if(!details?.fillId)return false;const incomingFillId=String(details.fillId),incomingInventoryId=String(details.inventoryId||'');if(trashTemplateDialogOwnedByNewDraft()&&incomingInventoryId!==trashTemplateDialogOwner.inventoryId)return false;if(!trackedTrashTemplateFillId||incomingFillId===String(trackedTrashTemplateFillId)){setTrashTemplateDialogOwner('session',{inventoryId:incomingInventoryId||trashTemplateDialogOwner.inventoryId,fillId:incomingFillId});trackedTrashTemplateFillId=incomingFillId;if(details.targetTabId)trackedTrashTemplateTabId=Number(details.targetTabId)||trackedTrashTemplateTabId;if(details.newAdId)trackedTrashTemplateNewAdId=String(details.newAdId);restoreTrashTemplateRecord(incomingInventoryId);void refreshTrashTemplateDialogStatus({forceOpen:trashTemplateDialog?.open===true});return true;}return false; }
      function closeTrashTemplateDialog() {if(trashTemplateDialog?.open)trashTemplateDialog.close('closed');if(trashTemplateDialogOwner.kind==='new-draft')setTrashTemplateDialogOwner('none');}
      function install() {
        if(installed)return;installed=true;
        trashTemplateConfirm?.addEventListener('click',()=>{const record=trackedTrashTemplateRecord;if(!record)return;trashTemplateConfirm.disabled=true;trashTemplateDialogMode='preparing';trashTemplateConfirmActions?.classList.add('hidden');trashTemplateProgressActions?.classList.remove('hidden');if(trashTemplateTitle)trashTemplateTitle.textContent='Anzeige wird vorbereitet';if(trashTemplateIntro)trashTemplateIntro.classList.add('hidden');setTrashTemplateStepStates({step:2});setTrashTemplateProgressMessage('','Vorlage wird vorbereitet','Die gespeicherten Daten und Bilder werden in eine neue Anzeige übernommen. Veröffentlicht wird nicht automatisch.');void onStartTrashTemplate(record).then(async started=>{trackedTrashTemplateFillId=String(started?.fillId||'');setTrashTemplateDialogOwner('session',{inventoryId:record.inventoryId||'',fillId:trackedTrashTemplateFillId});trackedTrashTemplateTabId=Number(started?.tabId||0)||null;void logAppEvent('USER_TRASH_TEMPLATE_FILL_STARTED',{operationId:started?.operationId||'',inventoryId:record.inventoryId,adId:record.adId||'',fillId:trackedTrashTemplateFillId,tabId:trackedTrashTemplateTabId});await refreshTrashTemplateDialogStatus().catch(()=>null);}).catch(async error=>{void logAppEvent('USER_TRASH_TEMPLATE_FILL_FAILED',{inventoryId:record?.inventoryId||'',adId:record?.adId||'',message:String(error?.message||error||'')},'error');trashTemplateDialogMode='error';setTrashTemplateStepStates({step:2,errorStep:2});setTrashTemplateProgressMessage('error','Vorlage konnte nicht vorbereitet werden',friendlyErrorMessage(error,'Der Vorgang konnte nicht gestartet werden.'));trashTemplateConfirmActions?.classList.add('hidden');trashTemplateProgressActions?.classList.remove('hidden');syncTrashTemplateInventoryButton();await refreshInventories().catch(()=>{});});});
        trashTemplateClose?.addEventListener('click',closeTrashTemplateDialog);trashTemplateCancel?.addEventListener('click',closeTrashTemplateDialog);trashTemplateDone?.addEventListener('click',closeTrashTemplateDialog);trashTemplateDialog?.addEventListener('cancel',event=>{event.preventDefault();closeTrashTemplateDialog();});
        trashTemplateRestart?.addEventListener('click',async()=>{await restartTrashTemplateAfterTargetLoss();});
        trashTemplateTarget?.addEventListener('click',async()=>{await openTrashTemplateTarget();});
        trashTemplateInventory?.addEventListener('click',()=>{const gate=trashTemplateInventoryGate();if(!gate.allowed){syncTrashTemplateInventoryButton();return;}const tabId=trackedTrashTemplateTabId,adId=trackedTrashTemplateNewAdId;trashTemplateInventory.disabled=true;void logAppEvent('USER_TRASH_TEMPLATE_INVENTORY_CLICK',{fillId:trackedTrashTemplateFillId,tabId,adId});void onStartKnownSingleInventoryCapture({fillId:trackedTrashTemplateFillId,tabId,adId}).then(async result=>{if(result?.ok){await runtimeMessage({type:'COMPLETE_TRASH_TEMPLATE_FLOW',fillId:trackedTrashTemplateFillId,adId}).catch(()=>false);trackedTrashTemplateFillId='';trackedTrashTemplateTabId=null;trackedTrashTemplateNewAdId='';trackedTrashTemplateRecord=null;setTrashTemplateDialogOwner('none');syncTrashTemplateRecoveryActivity(null);}}).catch(error=>{void logAppEvent('USER_TRASH_TEMPLATE_INVENTORY_FAILED',{fillId:trackedTrashTemplateFillId,tabId,adId,message:String(error?.message||error||'')},'error');if(trashTemplateDialog&&!trashTemplateDialog.open)trashTemplateDialog.showModal();setTrashTemplateProgressMessage('error','Anzeige konnte nicht erfasst werden',friendlyErrorMessage(error,'Bitte versuche es erneut.'));syncTrashTemplateInventoryButton();});});
      }
      return Object.freeze({install,updateContext,status,syncFromLock,openTrashTemplateDialog,trashTemplateInventoryGate,syncTrashTemplateInventoryButton,syncTrashTemplateRecoveryActivity,handleEmergencyWorkflowReset,renderTrashTemplateFillStatus,refreshTrashTemplateDialogStatus,recoverTrashTemplateSession,reopenTrashTemplateSession,handleTrashTemplateDataChanged,handleTrashTemplateTargetTabRemoved});
    }
  });
  globalThis.KRDeps?.register?.('KRTrashTemplateUiController',API);
  if(typeof module!=='undefined'&&module?.exports)module.exports=API;
})();
