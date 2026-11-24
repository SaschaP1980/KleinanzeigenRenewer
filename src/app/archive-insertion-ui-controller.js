(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const document = options.document || globalThis.document;
      const URL = options.URL || globalThis.URL;
      const crypto = options.crypto || globalThis.crypto;
      const InventoryImport = options.InventoryImport;
      const elements = options.elements || {};
      const { archiveInsertButton, archiveInsertDialog, archiveInsertClose, archiveInsertCancel, archiveInsertConfirm, archiveInsertKicker, archiveInsertTitle, archiveInsertIntro, archiveFileInput, archiveDropzone, archiveChooseFile, archiveValidationStatus, archivePreview, archivePreviewCover, archivePreviewTitle, archivePreviewMeta, archiveInsertSafety, archiveInsertSteps, archivePhase3Label, archiveProgressMessage, archiveProgressMessageTitle, archiveProgressMessageText, archiveBackgroundHint, archiveInsertActions, archiveProgressActions, archiveProgressClose, archiveProgressView, archiveProgressEdit } = elements;
      const RENEWAL_MODE_FAST = String(options.fastMode || 'fast');
      const normalizeRenewalMode = options.normalizeRenewalMode || (value => String(value || 'safe'));
      const renewalModeLabel = options.renewalModeLabel || (value => normalizeRenewalMode(value) === RENEWAL_MODE_FAST ? 'Schnellprüfung' : 'Vollprüfung');
      const accountGateModel = options.accountGateModel || (() => ({ allowed:false, tooltip:'' }));
      const insertionLockActive = options.insertionLockActive || (() => false);
      const insertionLockUiText = options.insertionLockUiText || (() => '');
      const invalidImportError = options.invalidImportError || ((code,message,cause)=>Object.assign(new Error(message),{code,cause}));
      const runtimeMessage = options.runtimeMessage || (async () => null);
      const logAppEvent = options.logAppEvent || (async () => {});
      const setStatus = options.setStatus || (() => {});
      const friendlyErrorMessage = options.friendlyErrorMessage || (error => String(error?.message || error || ''));
      const friendlyArchiveImportError = options.friendlyArchiveImportError || (error => friendlyErrorMessage(error));
      const requireAccountBoundAction = options.requireAccountBoundAction || (() => false);
      const onStartArchiveInsertion = options.onStartArchiveInsertion || (async () => null);
      const openInventoryReadOnly = options.openInventoryReadOnly || (async () => null);
      const openInventoryEdit = options.openInventoryEdit || (async () => null);
      let currentRenewalConfiguration={renewalMode:'safe'};
      let currentInsertionLock={locked:false};
      let archiveDialogMode='closed'; let archiveParsed=null; let archivePreviewUrl=null; let trackedArchiveInsertionId=null; let trackedArchiveInsertionRevision=0; let trackedArchiveNewAdId=null; let trackedArchiveNewPublicUrl=null; let installed=false;

function setArchiveInsertKicker(mode = currentRenewalConfiguration.renewalMode) {
  if (!archiveInsertKicker) return;
  archiveInsertKicker.replaceChildren();
  archiveInsertKicker.append(document.createTextNode('AUS ZIP NEU INSERIEREN · '));
  const label = document.createElement('span');
  label.className = `renewal-start-mode${normalizeRenewalMode(mode) === RENEWAL_MODE_FAST ? ' fast' : ''}`;
  label.textContent = renewalModeLabel(mode).toUpperCase();
  archiveInsertKicker.append(label);
}

function clearArchivePreviewUrl() {
  if (archivePreviewUrl) URL.revokeObjectURL(archivePreviewUrl);
  archivePreviewUrl = null;
}

function setArchiveValidation(kind, text) {
  if (!archiveValidationStatus) return;
  archiveValidationStatus.classList.remove('hidden', 'success', 'error');
  if (kind) archiveValidationStatus.classList.add(kind);
  archiveValidationStatus.textContent = String(text || '');
}

function setArchivePhaseStates(states = {}) {
  for (const item of archiveInsertSteps?.querySelectorAll('[data-phase]') || []) {
    const phase = Number(item.dataset.phase || 0);
    item.classList.remove('phase-pending', 'phase-active', 'phase-success', 'phase-error', 'phase-waiting', 'phase-skipped');
    item.classList.add(`phase-${states[phase] || 'pending'}`);
  }
}

function setArchiveProgressMessage(kind, title, text) {
  archiveProgressMessage?.classList.remove('hidden', 'success', 'error', 'waiting');
  if (kind) archiveProgressMessage?.classList.add(kind);
  if (archiveProgressMessageTitle) archiveProgressMessageTitle.textContent = title || '';
  if (archiveProgressMessageText) archiveProgressMessageText.textContent = text || '';
}

function setTrackedArchiveInsertionId(value) {
  const nextId = String(value || '') || null;
  if (String(trackedArchiveInsertionId || '') !== String(nextId || '')) trackedArchiveInsertionRevision = 0;
  trackedArchiveInsertionId = nextId;
  return trackedArchiveInsertionId;
}

function resetArchiveInsertDialog() {
  archiveDialogMode = 'select';
  archiveParsed = null;
  setTrackedArchiveInsertionId(null);
  trackedArchiveInsertionRevision = 0;
  trackedArchiveNewAdId = null;
  trackedArchiveNewPublicUrl = null;
  clearArchivePreviewUrl();
  if (archiveFileInput) archiveFileInput.value = '';
  archiveDropzone?.classList.remove('hidden', 'busy', 'dragover');
  archivePreview?.classList.add('hidden');
  archiveInsertSafety?.classList.add('hidden');
  archiveInsertSteps?.classList.add('hidden');
  archiveValidationStatus?.classList.add('hidden');
  archiveProgressMessage?.classList.add('hidden');
  archiveBackgroundHint?.classList.add('hidden');
  archiveInsertActions?.classList.remove('hidden');
  archiveProgressActions?.classList.add('hidden');
  archiveProgressView?.classList.add('hidden');
  archiveProgressEdit?.classList.add('hidden');
  if (archiveInsertConfirm) archiveInsertConfirm.disabled = true;
  if (archiveInsertTitle) archiveInsertTitle.textContent = 'Anzeige aus ZIP neu inserieren';
  if (archiveInsertIntro) {
    archiveInsertIntro.textContent = 'Wähle ein ZIP aus, das zuvor mit dem kleinanzeigen Manager exportiert wurde. Das ZIP wird vollständig geprüft, bevor eine neue Anzeige erstellt werden kann.';
    archiveInsertIntro.classList.remove('hidden');
  }
  if (archivePhase3Label) archivePhase3Label.textContent = normalizeRenewalMode(currentRenewalConfiguration.renewalMode) === RENEWAL_MODE_FAST ? 'Zusätzliche Inhaltsprüfung wird übersprungen' : 'Neue Anzeige überprüfen';
  setArchiveInsertKicker();
  setArchivePhaseStates({ 1: 'pending', 2: 'pending', 3: normalizeRenewalMode(currentRenewalConfiguration.renewalMode) === RENEWAL_MODE_FAST ? 'skipped' : 'pending', 4: 'pending' });
}

async function validateArchiveFile(file) {
  if (!InventoryImport?.parseInventoryArchive) throw new Error('ZIP-Importfunktion ist nicht verfügbar.');
  archiveDialogMode = 'validating';
  archiveDropzone?.classList.add('busy');
  if (archiveInsertConfirm) archiveInsertConfirm.disabled = true;
  setArchiveValidation('', 'ZIP wird geprüft …');
  try {
    if (!file || !/\.zip$/i.test(String(file.name || ''))) throw new Error('Bitte wähle eine ZIP-Datei aus.');
    const parsed = await InventoryImport.parseInventoryArchive(file);
    archiveParsed = parsed;
    archiveDialogMode = 'ready';
    archiveDropzone?.classList.add('hidden');
    archiveDropzone?.classList.remove('busy');
    archivePreview?.classList.remove('hidden');
    archiveInsertSafety?.classList.remove('hidden');
    archiveInsertSteps?.classList.remove('hidden');
    setArchiveValidation('success', `ZIP erfolgreich geprüft · ${parsed.images.length} ${parsed.images.length === 1 ? 'Bild' : 'Bilder'}`);
    if (archivePreviewTitle) archivePreviewTitle.textContent = parsed.record?.title || 'Unbenannte Anzeige';
    const sourceId = String(parsed.record?.adId || parsed.record?.inventoryId || 'ohne ID');
    if (archivePreviewMeta) archivePreviewMeta.textContent = `${parsed.images.length} ${parsed.images.length === 1 ? 'Bild' : 'Bilder'} · Ursprüngliche Anzeige · ID ${sourceId}`;
    clearArchivePreviewUrl();
    if (parsed.images[0]?.blob) {
      archivePreviewUrl = URL.createObjectURL(parsed.images[0].blob);
      if (archivePreviewCover) archivePreviewCover.src = archivePreviewUrl;
    }
    if (archiveInsertIntro) archiveInsertIntro.textContent = normalizeRenewalMode(currentRenewalConfiguration.renewalMode) === RENEWAL_MODE_FAST
      ? 'Schnellprüfung: Die Anzeige wird erstellt und veröffentlicht. Anschließend wird geprüft, ob sie erfolgreich erstellt wurde. Eine zusätzliche Inhaltsprüfung wird übersprungen.'
      : 'Vollprüfung: Die Anzeige wird erstellt und veröffentlicht. Anschließend werden ihre Inhalte mit den Daten aus dem ZIP verglichen.';
    if (archiveInsertConfirm) archiveInsertConfirm.disabled = insertionLockActive() || !accountGateModel().allowed;
    void logAppEvent('USER_ARCHIVE_IMPORT_VALIDATED', { filename: String(file.name || ''), sourceAdId: parsed.record?.adId || null, imageCount: parsed.images.length, archiveVersion: parsed.archiveVersion });
    return parsed;
  } catch (error) {
    archiveParsed = null;
    archiveDialogMode = 'select';
    archiveDropzone?.classList.remove('busy');
    archiveDropzone?.classList.remove('hidden');
    const technicalMessage = String(error?.message || error || '');
    const friendly = 'Die ausgewählte Datei ist kein gültiger Anzeigenexport.';
    setArchiveValidation('error', friendly);
    void logAppEvent('USER_ARCHIVE_IMPORT_VALIDATION_FAILED', { filename: String(file?.name || ''), message: technicalMessage }, 'warning');
    throw invalidImportError('KR_INVALID_AD_ARCHIVE', friendly, error);
  }
}

function archiveProgressModel(session) {
  const mode = normalizeRenewalMode(session?.renewalMode);
  const fast = mode === RENEWAL_MODE_FAST;
  const stage = String(session?.stage || '');
  const status = String(session?.status || '');
  const states = { 1: 'pending', 2: 'pending', 3: fast ? 'skipped' : 'pending', 4: 'pending' };
  const hasNewId = /^\d+$/.test(String(session?.newAdId || ''));
  if (['tab-opened', 'content-connected', 'filling', 'form-verified', 'post-fill-continuing', 'awaiting-publish', 'awaiting-manual-publish', 'auto-publish-ready', 'publish-submitted'].includes(stage) || !hasNewId) states[1] = 'active';
  if (hasNewId) { states[1] = 'success'; states[2] = 'active'; }
  if (session?.foundAt || ['edit-checking', 'inventory-saving', 'complete'].includes(stage) || status === 'complete') {
    states[1] = 'success'; states[2] = 'success';
    if (!fast) states[3] = ['inventory-saving', 'complete'].includes(stage) || session?.verifiedAt ? 'success' : 'active';
  }
  if (stage === 'edit-checking' && !fast) states[3] = 'active';
  if (stage === 'inventory-saving') states[4] = 'active';
  if (status === 'complete' || stage === 'complete') {
    states[1] = 'success'; states[2] = 'success'; states[3] = fast ? 'skipped' : 'success'; states[4] = 'success';
  }
  if (status === 'needs-review') {
    states[1] = 'success'; states[2] = 'success'; states[3] = fast ? 'skipped' : 'error'; states[4] = 'success';
  }
  if (status === 'error') {
    const failed = Math.max(1, Math.min(4, Number(session?.failurePhase || (hasNewId ? (session?.foundAt ? (fast ? 4 : 3) : 2) : 1))));
    states[failed] = 'error';
  }
  return { mode, fast, states };
}

function showArchiveInsertionProgress(session, { forceOpen = false } = {}) {
  if (!session) return;
  archiveDialogMode = ['complete', 'needs-review'].includes(String(session.status || '')) ? 'complete' : 'progress';
  setTrackedArchiveInsertionId(session.archiveInsertionId || trackedArchiveInsertionId || '');
  trackedArchiveNewAdId = String(session.newAdId || trackedArchiveNewAdId || '') || null;
  trackedArchiveNewPublicUrl = String(session.newPublicUrl || trackedArchiveNewPublicUrl || '') || null;
  const model = archiveProgressModel(session);
  setArchiveInsertKicker(model.mode);
  if (archivePhase3Label) archivePhase3Label.textContent = model.fast ? 'Zusätzliche Inhaltsprüfung wird übersprungen' : 'Neue Anzeige überprüfen';
  archiveDropzone?.classList.add('hidden');
  archivePreview?.classList.remove('hidden');
  archiveInsertSafety?.classList.add('hidden');
  archiveInsertSteps?.classList.remove('hidden');
  archiveInsertActions?.classList.add('hidden');
  archiveProgressActions?.classList.remove('hidden');
  if (archiveInsertIntro) {
    archiveInsertIntro.textContent = model.fast
      ? 'Schnellprüfung: Die Anzeige wird erstellt und veröffentlicht. Anschließend wird geprüft, ob sie erfolgreich erstellt wurde. Eine zusätzliche Inhaltsprüfung wird übersprungen.'
      : 'Vollprüfung: Die Anzeige wird erstellt und veröffentlicht. Anschließend werden ihre Inhalte mit den Daten aus dem ZIP verglichen.';
    archiveInsertIntro.classList.remove('hidden');
  }
  setArchivePhaseStates(model.states);
  archiveBackgroundHint?.classList.toggle('hidden', ['complete', 'needs-review', 'error', 'cancelled'].includes(String(session.status || '')));

  if (session.status === 'complete') {
    if (archiveInsertTitle) archiveInsertTitle.textContent = 'Anzeige erfolgreich inseriert';
    setArchiveProgressMessage('success', 'Anzeige erfolgreich erstellt', model.fast
      ? 'Die neue Anzeige wurde veröffentlicht, unter „Meine Anzeigen“ gefunden und zusätzlich ins Inventar aufgenommen.'
      : 'Die neue Anzeige wurde veröffentlicht, vollständig geprüft und zusätzlich ins Inventar aufgenommen.');
    const canOpen = /^\d+$/.test(String(session.newAdId || ''));
    archiveProgressView?.classList.toggle('hidden', !canOpen);
    archiveProgressEdit?.classList.toggle('hidden', !canOpen);
  } else if (session.status === 'needs-review') {
    if (archiveInsertTitle) archiveInsertTitle.textContent = 'Anzeige inseriert – Prüfung erforderlich';
    setArchiveProgressMessage('error', 'Angaben prüfen', 'Die neue Anzeige stimmt nicht vollständig mit den Daten aus dem ZIP überein.');
    const canOpen = /^\d+$/.test(String(session.newAdId || ''));
    archiveProgressView?.classList.toggle('hidden', !canOpen);
    archiveProgressEdit?.classList.toggle('hidden', !canOpen);
  } else if (session.status === 'error') {
    if (archiveInsertTitle) archiveInsertTitle.textContent = 'Inserieren wurde angehalten';
    setArchiveProgressMessage('error', 'Nicht neu inseriert', 'Die Veröffentlichung konnte nicht sicher bestätigt werden.');
  } else {
    if (archiveInsertTitle) archiveInsertTitle.textContent = 'Anzeige wird neu inseriert';
    const texts = {
      'tab-opened': ['Neue Anzeige wird vorbereitet', 'Die Daten aus dem ZIP werden in eine neue Anzeige übernommen.'],
      'content-connected': ['Neue Anzeige wird vorbereitet', 'Die neue Anzeige wird ausgefüllt und vor der Veröffentlichung geprüft.'],
      'publish-submitted': ['Neue Anzeige wird veröffentlicht', 'Kleinanzeigen verarbeitet die neue Anzeige. Danach wird geprüft, ob sie unter „Meine Anzeigen“ erscheint.'],
      'new-id-confirmed': ['Neue Anzeige wurde erstellt', 'Die veröffentlichte Anzeige wird jetzt unter „Meine Anzeigen“ gesucht.'],
      'my-ads-checking': ['Unter „Meine Anzeigen“ finden', 'Es wird geprüft, ob die neue Anzeige für das angemeldete Kleinanzeigen-Konto vorhanden ist.'],
      'edit-checking': ['Neue Anzeige wird überprüft', 'Die Inhalte der neuen Anzeige werden noch einmal mit den Daten aus dem ZIP verglichen.'],
      'inventory-saving': ['Anzeige wird ins Inventar aufgenommen', 'Die neue Anzeige wird zusätzlich im lokalen Inventar gespeichert.']
    };
    const [title, text] = texts[String(session.stage || '')] || ['Inserieren läuft', 'Der automatische Ablauf wird fortgesetzt.'];
    setArchiveProgressMessage('', title, text);
  }
  if (forceOpen && archiveInsertDialog && !archiveInsertDialog.open) archiveInsertDialog.showModal();
}

function applyArchiveInsertionSessionSnapshot(session, { forceOpen = false, source = 'runtime' } = {}) {
  const incomingId = String(session?.archiveInsertionId || '');
  if (!incomingId) return false;
  const lockOwnerId = String(currentInsertionLock?.kind || '') === 'archive-insertion'
    ? String(currentInsertionLock?.ownerId || '')
    : '';
  const currentId = String(trackedArchiveInsertionId || '');
  if (currentId && incomingId !== currentId && incomingId !== lockOwnerId) return false;
  if (!currentId && lockOwnerId && incomingId !== lockOwnerId) return false;

  const revision = Math.max(0, Number(session?.revision) || 0);
  if (currentId === incomingId && revision < trackedArchiveInsertionRevision) {
    void logAppEvent('ARCHIVE_INSERTION_UI_SNAPSHOT_IGNORED', {
      archiveInsertionId: incomingId,
      source,
      incomingRevision: revision,
      currentRevision: trackedArchiveInsertionRevision,
      status: session?.status || null,
      stage: session?.stage || null
    }, 'info');
    return false;
  }

  setTrackedArchiveInsertionId(incomingId);
  trackedArchiveInsertionRevision = Math.max(trackedArchiveInsertionRevision, revision);
  showArchiveInsertionProgress(session, { forceOpen });
  return true;
}

async function refreshArchiveInsertionProgress({ forceOpen = false } = {}) {
  if (!trackedArchiveInsertionId) return null;
  const session = await runtimeMessage({ type: 'GET_ARCHIVE_INSERTION_STATUS', archiveInsertionId: trackedArchiveInsertionId }).catch(() => null);
  if (session) applyArchiveInsertionSessionSnapshot(session, { forceOpen, source: 'status-refresh' });
  return session;
}


      function updateContext(context={}) {
        if (context.renewalConfiguration) currentRenewalConfiguration=context.renewalConfiguration;
        if (context.insertionLock) currentInsertionLock=context.insertionLock;
      }
      function status() { return Object.freeze({ archiveDialogMode, archiveParsed, trackedArchiveInsertionId, trackedArchiveInsertionRevision, trackedArchiveNewAdId, trackedArchiveNewPublicUrl }); }
      function syncConfiguration() {
        const fast=normalizeRenewalMode(currentRenewalConfiguration.renewalMode)===RENEWAL_MODE_FAST;
        if (archiveInsertDialog?.open && ['select','validating','ready'].includes(archiveDialogMode)) {
          setArchiveInsertKicker(currentRenewalConfiguration.renewalMode);
          if (archivePhase3Label) archivePhase3Label.textContent=fast?'Zusätzliche Inhaltsprüfung wird übersprungen':'Neue Anzeige überprüfen';
          if (archiveDialogMode==='ready') {
            setArchivePhaseStates({1:'pending',2:'pending',3:fast?'skipped':'pending',4:'pending'});
            if (archiveInsertIntro) archiveInsertIntro.textContent=fast?'Schnellprüfung: Die Anzeige wird erstellt und veröffentlicht. Anschließend wird geprüft, ob sie erfolgreich erstellt wurde. Eine zusätzliche Inhaltsprüfung wird übersprungen.':'Vollprüfung: Die Anzeige wird erstellt und veröffentlicht. Anschließend werden ihre Inhalte mit den Daten aus dem ZIP verglichen.';
          }
        }
      }
      function syncFromLock() {
        const locked=insertionLockActive(); const archiveOwned=locked && String(currentInsertionLock?.kind||'')==='archive-insertion'; const gate=accountGateModel();
        if (archiveInsertButton) { archiveInsertButton.disabled=!gate.allowed || (locked&&!archiveOwned); archiveInsertButton.title=!gate.allowed?gate.tooltip:locked&&!archiveOwned?insertionLockUiText():archiveOwned?'Laufendes ZIP-Inserieren anzeigen':'Exportiertes ZIP prüfen und als neue Anzeige inserieren'; }
        if (archiveOwned && currentInsertionLock?.ownerId) setTrackedArchiveInsertionId(currentInsertionLock.ownerId);
        if (archiveDialogMode==='ready' && archiveInsertConfirm) { archiveInsertConfirm.disabled=locked || !gate.allowed; archiveInsertConfirm.title=!gate.allowed?gate.tooltip:''; }
      }
      function handleArchiveStateChanged(session, reason='state-event') {
        const incomingId=String(session?.archiveInsertionId||''); const lockOwnerId=String(currentInsertionLock?.kind||'')==='archive-insertion'?String(currentInsertionLock?.ownerId||''):'';
        if (incomingId && (incomingId===String(trackedArchiveInsertionId||'') || incomingId===lockOwnerId)) return applyArchiveInsertionSessionSnapshot(session,{forceOpen:false,source:String(reason||'state-event')}); return false;
      }
      function closeArchiveInsertDialog() { if (archiveDialogMode==='progress') { if (archiveInsertDialog?.open) archiveInsertDialog.close('hidden'); return; } if (archiveInsertDialog?.open) archiveInsertDialog.close('closed'); if (archiveDialogMode!=='complete') resetArchiveInsertDialog(); }
      function install() {
        if (installed) return; installed=true;
        archiveInsertButton?.addEventListener('click',()=>{ if(!requireAccountBoundAction())return; if(insertionLockActive()){ if(String(currentInsertionLock?.kind||'')==='archive-insertion'&&currentInsertionLock?.ownerId){setTrackedArchiveInsertionId(currentInsertionLock.ownerId);void refreshArchiveInsertionProgress({forceOpen:true});return;} setStatus('error','Inserieren derzeit nicht möglich',insertionLockUiText());return;} resetArchiveInsertDialog();archiveInsertDialog?.showModal();archiveDropzone?.focus();void logAppEvent('USER_ARCHIVE_INSERT_OPENED',{renewalMode:normalizeRenewalMode(currentRenewalConfiguration.renewalMode)}); });
        archiveChooseFile?.addEventListener('click',event=>{event.stopPropagation();archiveFileInput?.click();});
        archiveDropzone?.addEventListener('click',event=>{if(event.target===archiveChooseFile)return;archiveFileInput?.click();});
        archiveDropzone?.addEventListener('keydown',event=>{if(event.key!=='Enter'&&event.key!==' ')return;event.preventDefault();archiveFileInput?.click();});
        for(const eventName of ['dragenter','dragover']) archiveDropzone?.addEventListener(eventName,event=>{event.preventDefault();event.stopPropagation();if(archiveDialogMode!=='validating')archiveDropzone.classList.add('dragover');});
        for(const eventName of ['dragleave','drop']) archiveDropzone?.addEventListener(eventName,event=>{event.preventDefault();event.stopPropagation();archiveDropzone.classList.remove('dragover');});
        archiveDropzone?.addEventListener('drop',event=>{if(archiveDialogMode==='validating')return;const file=event.dataTransfer?.files?.[0]||null;if(!file)return;void validateArchiveFile(file).catch(error=>setStatus('error','ZIP konnte nicht verwendet werden',friendlyArchiveImportError(error)));});
        archiveFileInput?.addEventListener('change',()=>{const file=archiveFileInput.files?.[0]||null;if(!file)return;void validateArchiveFile(file).catch(error=>setStatus('error','ZIP konnte nicht verwendet werden',friendlyArchiveImportError(error)));});
        archiveInsertConfirm?.addEventListener('click',async()=>{
          if(!archiveParsed||archiveDialogMode!=='ready')return; if(!requireAccountBoundAction()){syncFromLock();return;} if(insertionLockActive()){setArchiveProgressMessage('error','Inserieren derzeit nicht möglich',insertionLockUiText());return;}
          const archiveInsertionId=crypto.randomUUID();setTrackedArchiveInsertionId(archiveInsertionId);trackedArchiveInsertionRevision=0;archiveDialogMode='progress';archiveInsertConfirm.disabled=true;archiveInsertActions?.classList.add('hidden');archiveProgressActions?.classList.remove('hidden');archiveBackgroundHint?.classList.remove('hidden');
          setArchivePhaseStates({1:'active',2:'pending',3:normalizeRenewalMode(currentRenewalConfiguration.renewalMode)===RENEWAL_MODE_FAST?'skipped':'pending',4:'pending'});setArchiveProgressMessage('','ZIP wird für das Inserieren vorbereitet','Die geprüften Bilder werden für den automatischen Ablauf vorbereitet.');
          void logAppEvent('USER_ARCHIVE_INSERT_CONFIRMED',{archiveInsertionId,sourceAdId:archiveParsed.record?.adId||null,imageCount:archiveParsed.images.length,renewalMode:normalizeRenewalMode(currentRenewalConfiguration.renewalMode)});
          try{const started=await onStartArchiveInsertion({parsed:archiveParsed,archiveInsertionId});setTrackedArchiveInsertionId(started?.archiveInsertionId||archiveInsertionId);archiveDialogMode='progress';await refreshArchiveInsertionProgress({forceOpen:true});}catch(error){archiveDialogMode='error';archiveBackgroundHint?.classList.add('hidden');setArchivePhaseStates({1:'error',2:'pending',3:normalizeRenewalMode(currentRenewalConfiguration.renewalMode)===RENEWAL_MODE_FAST?'skipped':'pending',4:'pending'});setArchiveProgressMessage('error','Nicht neu inseriert',friendlyErrorMessage(error,'Der Vorgang konnte nicht gestartet werden.'));void logAppEvent('USER_ARCHIVE_INSERT_START_FAILED',{archiveInsertionId,message:String(error?.message||error||'')},'error');setStatus('error','Nicht neu inseriert',friendlyErrorMessage(error,'Der Vorgang konnte nicht gestartet werden.'));}
        });
        archiveInsertClose?.addEventListener('click',closeArchiveInsertDialog);archiveInsertCancel?.addEventListener('click',closeArchiveInsertDialog);archiveProgressClose?.addEventListener('click',closeArchiveInsertDialog);archiveInsertDialog?.addEventListener('cancel',event=>{event.preventDefault();closeArchiveInsertDialog();});
        archiveProgressView?.addEventListener('click',()=>{if(!/^\d+$/.test(String(trackedArchiveNewAdId||'')))return;void openInventoryReadOnly({adId:trackedArchiveNewAdId,inventoryId:trackedArchiveNewAdId,title:archiveParsed?.record?.title||'',publicUrl:trackedArchiveNewPublicUrl||''}).catch(()=>{});});
        archiveProgressEdit?.addEventListener('click',()=>{if(!/^\d+$/.test(String(trackedArchiveNewAdId||'')))return;void openInventoryEdit({adId:trackedArchiveNewAdId,inventoryId:trackedArchiveNewAdId,title:archiveParsed?.record?.title||''}).catch(()=>{});});
      }
      return Object.freeze({install,updateContext,status,syncConfiguration,syncFromLock,setTrackedArchiveInsertionId,resetArchive:resetArchiveInsertDialog,validateArchiveFile,archiveProgressModel,applyArchiveInsertionSessionSnapshot,refreshArchiveInsertionProgress,handleArchiveStateChanged});
    }
  });
  globalThis.KRDeps?.register?.('KRArchiveInsertionUiController',API);
  if(typeof module!=='undefined'&&module?.exports)module.exports=API;
})();
