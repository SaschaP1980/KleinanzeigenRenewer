(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const document = options.document || globalThis.document;
      const InventoryView = options.InventoryView;
      const formatting = options.formatting || {};
      const sharedUiHelpers = options.sharedUiHelpers || {};
      const recordCardView = options.recordCardView;
      if (!recordCardView) throw new Error('record-card-view.js must load before inventory card rendering');
      const { inventoryList, inventoryCount, trashCount, inventoryHeaderCount, trashHeaderCount, clearInventoryButton, renewalProgressShortcut, renewalProgressShortcutTitle, renewalProgressShortcutText } = options.elements || {};
      const RENEWAL_MODE_FAST = String(options.fastMode || 'fast');
      const formatDate = formatting.formatDate;
      const displayPriceWithType = formatting.displayPriceWithType;
      const categoryLabel = formatting.categoryLabel;
      const artLabel = formatting.artLabel;
      const listingDatePresentation = formatting.listingDatePresentation;
      const listingDateLabel = formatting.listingDateLabel;
      const endDateWithRelativeLabel = formatting.endDateWithRelativeLabel;
      const comparisonStatusLabel = formatting.comparisonStatusLabel;
      const publicAvailabilityPending = formatting.publicAvailabilityPending;
      const templateReady = formatting.templateReady;
      const renewalIsReplacementReady = formatting.renewalIsReplacementReady;
      const renewalAutoCompletionPending = formatting.renewalAutoCompletionPending;
      const renewalStatusLabel = formatting.renewalStatusLabel;
      const renewalStatusText = formatting.renewalStatusText;
      const canDiscardRenewalDraft = formatting.canDiscardRenewalDraft;
      const makeCompactIconButton = sharedUiHelpers.makeCompactIconButton;
      const accountGateModel = options.accountGateModel || (() => ({ allowed:false, tooltip:'' }));
      const selectedConcreteProfile = options.selectedConcreteProfile || (() => null);
      const insertionLockActive = options.insertionLockActive || (() => false);
      const insertionLockUiText = options.insertionLockUiText || (() => '');
      const requireAccountBoundAction = options.requireAccountBoundAction || (() => false);
      const confirmAction = options.confirmAction || (async () => false);
      const confirmAutomatedRenewalStart = options.confirmAutomatedRenewalStart || (async () => false);
      const runtimeMessage = options.runtimeMessage || (async () => null);
      const renderAppNotice = options.renderAppNotice || (() => {});
      const setStatus = options.setStatus || (() => {});
      const refreshInventories = options.refreshInventories || (async () => {});
      const friendlyErrorMessage = options.friendlyErrorMessage || (error => String(error?.message || error || ''));
      const setOnlineAvailabilityNotice = options.setOnlineAvailabilityNotice || (() => {});
      const setFriendlyErrorStatus = options.setFriendlyErrorStatus || (() => {});
      const requireRenewalDialogController = options.requireRenewalDialogController || (() => null);
      const renewalModeLabel = options.renewalModeLabel || (value => String(value || ''));
      const normalizeRenewalMode = options.normalizeRenewalMode || (value => String(value || ''));
      const renewalDialogStatus = options.renewalDialogStatus || (() => ({ mode:'closed' }));
      const setRenewalPhaseStates = options.setRenewalPhaseStates || (() => {});
      const setRenewalProgressMessage = options.setRenewalProgressMessage || (() => {});
      const logAppEvent = options.logAppEvent || (async () => {});
      const exportInventoryRecord = options.exportInventoryRecord || (async () => null);
      const syncListViewModeControls = options.syncListViewModeControls || (() => {});
      const { cardTargetIsInteractive, makeInfoLine, buildFullImageStrip, createCompactListRow, setCompactButtonsBusy, rememberCompactButtonDisabled } = recordCardView;
      let currentRecords = [];
      let currentTrashRecords = [];
      let selectedProfileId = '';
      let globalListViewMode = 'detailed'; let inventoryViewState={query:'',sortKey:'endDate',direction:'asc'};
      function updateContext(context={}) {
        if (Array.isArray(context.records)) currentRecords=context.records;
        if (Array.isArray(context.trashRecords)) currentTrashRecords=context.trashRecords;
        if (Object.prototype.hasOwnProperty.call(context,'selectedProfileId')) selectedProfileId=String(context.selectedProfileId||'');
        if (Object.prototype.hasOwnProperty.call(context,'globalListViewMode')) globalListViewMode=String(context.globalListViewMode||'')==='compact'?'compact':'detailed';
        if (context.inventoryViewState && typeof context.inventoryViewState==='object') inventoryViewState={...context.inventoryViewState};
      }

function appendDerivedListingDateBadge(container, record) {
  const presentation = listingDatePresentation(record);
  if (!presentation.derived) return container;
  const badge = document.createElement('span');
  badge.className = 'listing-date-derived-badge';
  badge.textContent = 'Abgeleitet';
  badge.title = 'Aus Enddatum berechnet. Mit „Daten aktualisieren“ direkt prüfen.';
  container.append(badge);
  return container;
}

function makeListingDateInfoLine(record) {
  const row = makeInfoLine(listingDatePresentation(record).label, listingDateLabel(record));
  appendDerivedListingDateBadge(row.querySelector('strong'), record);
  return row;
}

function makeInventoryExportActionButton(record) {
  const exportButton = document.createElement('button');
  exportButton.type = 'button';
  exportButton.className = 'secondary compact-action inventory-export-button';
  exportButton.textContent = 'Als ZIP exportieren';
  exportButton.title = 'Speichert diese Anzeige mit allen Bildern in der richtigen Reihenfolge als ZIP.';
  exportButton.addEventListener('click', async () => {
    const originalText = exportButton.textContent;
    exportButton.disabled = true;
    exportButton.textContent = 'ZIP wird erstellt …';
    void logAppEvent('USER_INVENTORY_EXPORT_CLICK', { inventoryId: record.inventoryId, adId: record.adId || '', imageCount: record.images?.length || 0 });
    try {
      const result = await exportInventoryRecord(record);
      void logAppEvent('USER_INVENTORY_EXPORT_SUCCEEDED', { inventoryId: record.inventoryId, adId: record.adId || '', imageCount: result.manifest?.images?.length || 0, bytes: result.blob?.size || 0, archiveVersion: result.manifest?.archiveVersion || null });
      setStatus('ready', 'ZIP erstellt', `ZIP mit ${result.manifest?.images?.length || 0} Bild${result.manifest?.images?.length === 1 ? '' : 'ern'} wurde erstellt.`);
    } catch (error) {
      void logAppEvent('USER_INVENTORY_EXPORT_FAILED', { inventoryId: record.inventoryId, adId: record.adId || '', message: String(error?.message || error) }, 'error');
      setStatus('error', 'ZIP konnte nicht erstellt werden', 'Der Anzeigenexport konnte nicht erstellt werden. Bitte versuche es erneut.');
    } finally {
      exportButton.disabled = false;
      exportButton.textContent = originalText;
    }
  });
  return exportButton;
}

function makeCompactInventoryExportButton(record) {
  const exportButton = makeCompactIconButton({
    icon: 'zip-export',
    label: 'Als ZIP exportieren',
    title: 'Speichert diese Anzeige mit allen Bildern in der richtigen Reihenfolge als ZIP.'
  });
  exportButton.addEventListener('click', async () => {
    exportButton.disabled = true;
    exportButton.classList.add('is-busy');
    void logAppEvent('USER_INVENTORY_EXPORT_CLICK', { inventoryId: record.inventoryId, adId: record.adId || '', imageCount: record.images?.length || 0, view: 'compact' });
    try {
      const result = await exportInventoryRecord(record);
      void logAppEvent('USER_INVENTORY_EXPORT_SUCCEEDED', { inventoryId: record.inventoryId, adId: record.adId || '', imageCount: result.manifest?.images?.length || 0, bytes: result.blob?.size || 0, archiveVersion: result.manifest?.archiveVersion || null, view: 'compact' });
      setStatus('ready', 'ZIP erstellt', `ZIP mit ${result.manifest?.images?.length || 0} Bild${result.manifest?.images?.length === 1 ? '' : 'ern'} wurde erstellt.`);
    } catch (error) {
      void logAppEvent('USER_INVENTORY_EXPORT_FAILED', { inventoryId: record.inventoryId, adId: record.adId || '', message: String(error?.message || error), view: 'compact' }, 'error');
      setStatus('error', 'ZIP konnte nicht erstellt werden', 'Der Anzeigenexport konnte nicht erstellt werden. Bitte versuche es erneut.');
    } finally {
      exportButton.disabled = false;
      exportButton.classList.remove('is-busy');
    }
  });
  return exportButton;
}

function renderCompactInventoryRow(record) {
  const { row, actions } = createCompactListRow(record);
  const isRenewal = Boolean(record?.renewal?.renewalId);
  const isReplacementReady = renewalIsReplacementReady(record);

  if (isRenewal && isReplacementReady) {
    const gate = accountGateModel();
    const profileMatches = Boolean(selectedConcreteProfile() && String(record?.profileId || '') === String(selectedProfileId || ''));
    const autoCompleting = renewalAutoCompletionPending(record);
    const finishButton = rememberCompactButtonDisabled(makeCompactIconButton({
      icon: 'finish-renewal',
      label: 'Austausch abschließen',
      title: autoCompleting ? 'Der bestätigte Austausch läuft bereits.' : 'Austausch abschließen'
    }));
    finishButton.disabled = autoCompleting || !gate.allowed || !profileMatches;
    rememberCompactButtonDisabled(finishButton);

    const pending = publicAvailabilityPending(record);
    const updateButton = makeCompactIconButton({
      icon: pending ? 'retry' : 'update',
      label: pending ? 'Online-Status prüfen' : 'Daten aktualisieren',
      title: pending ? 'Prüft die öffentliche Detailseite erneut.' : 'Lädt die Daten der neuen Anzeige erneut.'
    });
    updateButton.disabled = autoCompleting || !gate.allowed || !profileMatches;
    rememberCompactButtonDisabled(updateButton);

    const exportButton = makeCompactInventoryExportButton(record);
    const deleteButton = makeCompactIconButton({ icon: 'delete', label: 'In Papierkorb', title: 'Nur lokal in den Papierkorb verschieben.', danger: true });
    deleteButton.disabled = autoCompleting;
    rememberCompactButtonDisabled(deleteButton);
    const peers = [finishButton, updateButton, deleteButton];

    finishButton.addEventListener('click', async () => {
      if (!requireAccountBoundAction()) return;
      const renewalId = String(record.renewal.renewalId || '');
      if (!await confirmAction({ title: 'Austausch abschließen?', text: 'Die bisherige Anzeige wird bei Kleinanzeigen gelöscht. Die neue Anzeige bleibt erhalten.', detail: 'Die bisherige Anzeige wird erst nach bestätigter Löschung für 30 Tage im Papierkorb gesichert.', confirmLabel: 'Austausch abschließen', danger: true })) return;
      setCompactButtonsBusy(peers, true);
      try {
        const result = await runtimeMessage({ type: 'FINISH_RENEWAL_REPLACEMENT', renewalId });
        renderAppNotice(result?.notice || { kind: 'success', title: 'Neu inseriert', text: 'Die bisherige Anzeige wurde gelöscht und bleibt noch 30 Tage im Papierkorb.' });
        setStatus('ready', 'Austausch abgeschlossen', 'Die bisherige Anzeige wurde gelöscht, 30 Tage im Papierkorb gesichert und die neue Anzeige im Inventar übernommen.');
        await refreshInventories();
      } catch (error) {
        setCompactButtonsBusy(peers, false);
        setStatus('error', 'Austausch nicht abgeschlossen', `${friendlyErrorMessage(error)} Der aktuelle Stand bleibt erhalten.`);
      }
    });

    updateButton.addEventListener('click', async () => {
      if (!requireAccountBoundAction()) return;
      const adId = String(record.adId || '');
      setCompactButtonsBusy(peers, true);
      try {
        if (pending) {
          const result = await runtimeMessage({ type: 'CHECK_INVENTORY_ONLINE_STATUS', inventoryId: record.inventoryId, adId });
          setOnlineAvailabilityNotice(result?.online);
        } else {
          await runtimeMessage({ type: 'REFRESH_INVENTORY', inventoryId: record.inventoryId, adId });
          setStatus('ready', 'Anzeige aktualisiert', 'Die gespeicherten Daten wurden aktualisiert.');
        }
        await refreshInventories();
      } catch (error) {
        setCompactButtonsBusy(peers, false);
        pending
          ? setStatus('waiting', 'Online-Status unklar', 'Der bisherige Status bleibt unverändert.', '', { badgeLabel: 'Prüfen' })
          : setStatus('error', 'Aktualisierung unterbrochen', 'Der bisherige Inventareintrag bleibt erhalten.');
      }
    });

    deleteButton.addEventListener('click', async () => {
      const renewalId = String(record.renewal.renewalId || '');
      if (!await confirmAction({ title: 'In Papierkorb verschieben?', text: `„${record.title || record.adId}“ wird nur lokal in den Papierkorb verschoben.`, detail: 'Bei Kleinanzeigen wird weder die neue noch die bisherige Anzeige gelöscht oder verändert.', confirmLabel: 'In Papierkorb', danger: true })) return;
      setCompactButtonsBusy(peers, true);
      try {
        await runtimeMessage({ type: 'REMOVE_REPLACEMENT_READY_LOCAL', renewalId });
        setStatus('ready', 'In Papierkorb verschoben', 'Der neue lokale Eintrag wurde für 30 Tage gesichert. Bei Kleinanzeigen wurde nichts gelöscht oder verändert.');
        await refreshInventories();
      } catch (error) {
        setCompactButtonsBusy(peers, false);
        setStatus('error', 'Eintrag konnte nicht verschoben werden', friendlyErrorMessage(error));
      }
    });
    actions.append(finishButton, updateButton, exportButton, deleteButton);
    return row;
  }

  if (isRenewal) {
    const gate = accountGateModel();
    const profileMatches = Boolean(selectedConcreteProfile() && String(record?.profileId || '') === String(selectedProfileId || ''));
    const exportButton = makeCompactInventoryExportButton(record);
    const retryable = ['waiting-for-online', 'verification-failed'].includes(String(record.renewal.status || '')) && /^\d+$/.test(String(record.adId || record.renewal.newAdId || ''));
    if (retryable) {
      const retryButton = makeCompactIconButton({ icon: 'retry', label: 'Erneut prüfen', title: 'Prüft die neue Anzeige erneut.' });
      retryButton.disabled = !gate.allowed || !profileMatches;
      rememberCompactButtonDisabled(retryButton);
      retryButton.addEventListener('click', async () => {
        if (!requireAccountBoundAction()) return;
        retryButton.disabled = true;
        retryButton.classList.add('is-busy');
        try {
          const result = await runtimeMessage({ type: 'RETRY_RENEWAL_VERIFICATION', renewalId: String(record.renewal.renewalId || '') });
          if (result?.status === 'verified' || result?.stage === 'replacement-ready') setStatus('ready', 'Angaben geprüft', 'Die neue Anzeige stimmt mit der Ausgangsanzeige überein.');
          else setStatus('waiting', 'Online-Status unklar', 'Der bisherige Status bleibt unverändert.', '', { badgeLabel: 'Prüfen' });
          await refreshInventories();
        } catch (error) {
          retryButton.disabled = !gate.allowed || !profileMatches;
          retryButton.classList.remove('is-busy');
          setFriendlyErrorStatus(error, 'Prüfung nicht abgeschlossen');
        }
      });
      actions.append(retryButton);
    }
    actions.append(exportButton);
    if (canDiscardRenewalDraft(record)) {
      const discardButton = makeCompactIconButton({ icon: 'delete', label: 'Entwurf verwerfen', title: 'Entfernt nur diesen lokalen Entwurf.', danger: true });
      discardButton.addEventListener('click', async () => {
        const renewalId = String(record.renewal.renewalId || '');
        if (!await confirmAction({ title: 'Entwurf verwerfen?', text: 'Der lokale Entwurf wird entfernt.', detail: 'Die bisherige Anzeige bei Kleinanzeigen bleibt unverändert.', confirmLabel: 'Entwurf verwerfen', danger: true })) return;
        discardButton.disabled = true;
        try {
          await runtimeMessage({ type: 'DISCARD_RENEWAL_DRAFT', renewalId });
          setStatus('ready', 'Entwurf verworfen', 'Der lokale Entwurf wurde entfernt. Die bisherige Anzeige bleibt unverändert.');
          await refreshInventories();
        } catch (error) {
          discardButton.disabled = false;
          setFriendlyErrorStatus(error, 'Entwurf nicht verworfen');
        }
      });
      actions.append(discardButton);
    }
    return row;
  }

  const pending = publicAvailabilityPending(record);
  const ready = templateReady(record);
  const insertionBlocked = insertionLockActive();
  const gate = accountGateModel();
  const profileMatches = Boolean(selectedConcreteProfile() && String(record?.profileId || '') === String(selectedProfileId || ''));

  const createButton = makeCompactIconButton({ icon: 'new-listing', label: 'Neu inserieren', title: pending ? 'Nicht verfügbar: Diese Anzeige ist noch „Bald Online“.' : 'Neu inserieren' });
  createButton.disabled = pending || !ready || insertionBlocked || !gate.allowed || !profileMatches;
  rememberCompactButtonDisabled(createButton);
  const updateButton = makeCompactIconButton({ icon: pending ? 'retry' : 'update', label: pending ? 'Online-Status prüfen' : 'Daten aktualisieren', title: pending ? 'Prüft die öffentliche Detailseite erneut.' : 'Lädt die Daten dieser Anzeige bei Kleinanzeigen neu.' });
  updateButton.disabled = !gate.allowed || !profileMatches;
  rememberCompactButtonDisabled(updateButton);
  const exportButton = makeCompactInventoryExportButton(record);
  const deleteButton = makeCompactIconButton({ icon: 'delete', label: 'In Papierkorb', title: 'Verschiebt diesen Eintrag nur lokal in den Papierkorb.', danger: true });
  rememberCompactButtonDisabled(deleteButton);
  const peers = [createButton, updateButton, deleteButton];

  createButton.addEventListener('click', async () => {
    if (!requireAccountBoundAction()) return;
    try {
      const confirmed = await confirmAutomatedRenewalStart(record);
      if (!confirmed) return;
      setCompactButtonsBusy(peers, true);
      const started = await runtimeMessage({ type: 'START_TEMPLATE_FILL', inventoryId: record.inventoryId, autoReplacementAllowed: true, startConfirmationVersion: 1 });
      requireRenewalDialogController().trackStarted({ renewalId: started?.renewalId || '', sourceAdId: record.adId || '', sourceRecord: record });
      renewalProgressShortcut.classList.remove('hidden');
      renewalProgressShortcutTitle.textContent = `Austausch läuft · ${renewalModeLabel(started?.renewalMode)}`;
      renewalProgressShortcutText.textContent = 'Die gespeicherten Angaben werden übernommen …';
      setStatus('ready', 'Neu inserieren gestartet', 'Der kontrollierte Austausch wurde gestartet.');
      await refreshInventories();
    } catch (error) {
      setCompactButtonsBusy(peers, false);
      setFriendlyErrorStatus(error, 'Neu inserieren nicht gestartet');
    }
  });

  updateButton.addEventListener('click', async () => {
    if (!requireAccountBoundAction()) return;
    const adId = String(record.adId || '');
    setCompactButtonsBusy(peers, true);
    try {
      if (pending) {
        const result = await runtimeMessage({ type: 'CHECK_INVENTORY_ONLINE_STATUS', inventoryId: record.inventoryId, adId });
        setOnlineAvailabilityNotice(result?.online);
      } else {
        await runtimeMessage({ type: 'REFRESH_INVENTORY', inventoryId: record.inventoryId, adId });
        setStatus('ready', 'Anzeige aktualisiert', `${record.title || `Anzeige ${adId}`} wurde neu geladen.`);
      }
      await refreshInventories();
    } catch (error) {
      setCompactButtonsBusy(peers, false);
      setStatus('error', 'Aktualisierung fehlgeschlagen', `${friendlyErrorMessage(error)} Der bisherige Stand bleibt erhalten.`);
    }
  });

  deleteButton.addEventListener('click', async () => {
    if (!await confirmAction({ title: 'In Papierkorb verschieben?', text: `„${record.title || record.adId}“ wird 30 Tage im Papierkorb aufbewahrt.`, detail: 'Die Anzeige bei Kleinanzeigen bleibt unverändert.', confirmLabel: 'In Papierkorb', danger: true })) return;
    setCompactButtonsBusy(peers, true);
    try {
      await runtimeMessage({ type: 'DELETE_INVENTORY', inventoryId: record.inventoryId });
      setStatus('ready', 'In Papierkorb verschoben', 'Der Eintrag bleibt 30 Tage als Vorlage erhalten. Die Anzeige bei Kleinanzeigen wurde nicht verändert.');
      await refreshInventories();
    } catch (error) {
      setCompactButtonsBusy(peers, false);
      setFriendlyErrorStatus(error, 'Nicht in Papierkorb verschoben');
    }
  });
  actions.append(createButton, updateButton, exportButton, deleteButton);
  return row;
}

function renderInventories(records = currentRecords) {
  currentRecords = Array.isArray(records) ? records : [];
  syncListViewModeControls();
  inventoryHeaderCount.textContent = String(currentRecords.length);
  trashHeaderCount.textContent = String(currentTrashRecords.length);
  const visibleRecords = InventoryView?.deriveInventoryView
    ? InventoryView.deriveInventoryView(currentRecords, inventoryViewState)
    : [...currentRecords];
  const hasFilter = Boolean(String(inventoryViewState.query || '').trim());
  inventoryCount.textContent = hasFilter
    ? `${visibleRecords.length} von ${currentRecords.length} ${currentRecords.length === 1 ? 'Eintrag' : 'Einträgen'}`
    : `${currentRecords.length} ${currentRecords.length === 1 ? 'Eintrag' : 'Einträge'}`;
  inventoryList.replaceChildren();
  clearInventoryButton.disabled = currentRecords.length === 0;
  if (!currentRecords.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Noch keine Anzeigen gespeichert. Erfasse deine Anzeigen über „Anzeigen erfassen“ oder füge eine bereits geöffnete Anzeige hinzu.';
    inventoryList.append(empty);
    return;
  }
  if (!visibleRecords.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Keine gespeicherte Anzeige passt zur Suche.';
    inventoryList.append(empty);
    return;
  }

  for (const record of visibleRecords) {
    if (globalListViewMode === 'compact') {
      inventoryList.append(renderCompactInventoryRow(record));
      continue;
    }
    const isRenewal = Boolean(record?.renewal?.renewalId);
    const isReplacementReady = renewalIsReplacementReady(record);
    const hasEditableAdId = /^\d+$/.test(String(record?.adId || ''));
    const card = document.createElement('article');
    card.className = `inventory-card compact-card${hasEditableAdId ? ' inventory-card-clickable' : ''}${isRenewal && !isReplacementReady ? ' renewal-card' : ''}`;
    card.dataset.inventoryId = String(record?.inventoryId || '');
    card.dataset.adId = String(record?.adId || '');
    if (hasEditableAdId) {
      card.tabIndex = 0;
      card.setAttribute('aria-label', `${record.title || `Anzeige ${record.adId || ''}`} zum Ansehen öffnen`);
      card.addEventListener('click', event => {
        if (cardTargetIsInteractive(event.target)) return;
        void openInventoryReadOnly(record).catch(() => {});
      });
      card.addEventListener('keydown', event => {
        if (event.target !== card || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        void openInventoryReadOnly(record).catch(() => {});
      });
    }

    const summary = document.createElement('div');
    summary.className = 'inventory-summary';
    const cover = document.createElement('img');
    cover.className = 'inventory-cover';
    cover.alt = 'Titelbild';
    const primaryImage = (record.images || []).find(image => image.isPrimary) || record.images?.[0];
    if (primaryImage) void loadLocalPreview(cover, record, primaryImage);

    const info = document.createElement('div');
    info.className = 'inventory-summary-info';
    const title = document.createElement('h3');
    const titleText = document.createElement('span');
    titleText.textContent = record.title || `Anzeige ${record.adId || 'ohne ID'}`;
    title.append(titleText);
    if (isRenewal) {
      const badge = document.createElement('span');
      badge.className = `renewal-badge renewal-${String(record.renewal.status || 'draft')}`;
      badge.textContent = renewalStatusLabel(record);
      title.append(badge);
    }
    if (publicAvailabilityPending(record)) {
      const badge = document.createElement('span');
      badge.className = 'inventory-online-badge';
      badge.textContent = 'Bald Online';
      badge.title = 'Die Anzeige ist inhaltlich verifiziert, aber die öffentliche Detailseite ist noch nicht erreichbar.';
      title.append(badge);
    }
    const facts = document.createElement('div');
    facts.className = 'summary-facts';
    const factRows = [
      makeInfoLine('Kategorie', categoryLabel(record)),
      makeInfoLine('Art', artLabel(record)),
      makeInfoLine('Preis', displayPriceWithType(record)),
      makeInfoLine('Endet am', endDateWithRelativeLabel(record)),
      makeListingDateInfoLine(record)
    ];
    if (isRenewal && !isReplacementReady) factRows.push(makeInfoLine('Bisherige Anzeige', `ID ${record.renewal.sourceAdId || 'unbekannt'}`));
    facts.append(...factRows);
    info.append(title, facts);
    summary.append(cover, info);
    card.append(summary);

    const actions = document.createElement('div');
    actions.className = 'inventory-actions multi';
    const exportButton = makeInventoryExportActionButton(record);

    if (isRenewal) {
      if (isReplacementReady) {
        const renewalAccountGate = accountGateModel();
        const renewalProfileMatches = Boolean(selectedConcreteProfile() && String(record?.profileId || '') === String(selectedProfileId || ''));
        const finishButton = document.createElement('button');
        finishButton.type = 'button';
        finishButton.className = 'secondary compact-action renewal-state-button';
        const autoCompleting = renewalAutoCompletionPending(record);
        finishButton.textContent = autoCompleting ? renewalStatusText(record) : 'Austausch abschließen';
        finishButton.title = autoCompleting ? 'Der bestätigte Austausch läuft bereits.' : 'Löscht die bisherige Anzeige bei Kleinanzeigen erst nach eindeutiger Prüfung und behält die neue Anzeige im Inventar.';
        finishButton.disabled = autoCompleting || !renewalAccountGate.allowed || !renewalProfileMatches;
        if (!renewalAccountGate.allowed) finishButton.title = renewalAccountGate.tooltip;
        else if (!renewalProfileMatches) finishButton.title = 'Nicht verfügbar: Die Anzeige gehört nicht zum ausgewählten Inventarprofil.';

        const updateButton = document.createElement('button');
        updateButton.type = 'button';
        updateButton.className = 'secondary compact-action';
        updateButton.textContent = publicAvailabilityPending(record) ? 'Online-Status prüfen' : 'Daten aktualisieren';
        updateButton.disabled = autoCompleting || !renewalAccountGate.allowed || !renewalProfileMatches;
        updateButton.title = !renewalAccountGate.allowed
          ? renewalAccountGate.tooltip
          : !renewalProfileMatches
            ? 'Nicht verfügbar: Die Anzeige gehört nicht zum ausgewählten Inventarprofil.'
            : publicAvailabilityPending(record)
              ? 'Prüft die öffentliche Detailseite erneut. Die bisherige Anzeige bleibt unverändert.'
              : 'Lädt die Daten der neuen Anzeige erneut. Die bisherige Anzeige bleibt unverändert.';

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'danger-button compact-action';
        removeButton.textContent = 'In Papierkorb';
        removeButton.title = 'Verschiebt nur diesen lokalen Eintrag für 30 Tage in den Papierkorb. Bei Kleinanzeigen wird nichts gelöscht.';
        if (autoCompleting) {
          removeButton.disabled = true;
        }

        finishButton.addEventListener('click', async () => {
          if (!requireAccountBoundAction()) return;
          const renewalId = String(record.renewal.renewalId || '');
          const sourceAdId = String(record.renewal.sourceAdId || '');
          const newAdId = String(record.adId || record.renewal.newAdId || '');
          void logAppEvent('USER_RENEWAL_REPLACEMENT_FINISH_CLICK', { renewalId, sourceAdId, newAdId, inventoryId: record.inventoryId });
          if (!await confirmAction({ title: 'Austausch abschließen?', text: 'Die bisherige Anzeige wird bei Kleinanzeigen gelöscht. Die neue Anzeige bleibt erhalten.', detail: 'Die bisherige Anzeige wird erst nach bestätigter Löschung für 30 Tage im Papierkorb gesichert.', confirmLabel: 'Austausch abschließen', danger: true })) {
            void logAppEvent('USER_RENEWAL_REPLACEMENT_FINISH_CANCELLED', { renewalId, sourceAdId, newAdId });
            return;
          }
          finishButton.disabled = true;
          updateButton.disabled = true;
          removeButton.disabled = true;
          const originalText = finishButton.textContent;
          finishButton.textContent = 'Austausch läuft …';
          try {
            const result = await runtimeMessage({ type: 'FINISH_RENEWAL_REPLACEMENT', renewalId });
            void logAppEvent('USER_RENEWAL_REPLACEMENT_FINISH_SUCCEEDED', { renewalId, sourceAdId, newAdId, inventoryId: result?.inventoryId || '' });
            renderAppNotice(result?.notice || { kind: 'success', title: 'Neu inseriert', text: 'Die bisherige Anzeige wurde gelöscht und bleibt noch 30 Tage im Papierkorb. Die neue Anzeige ist jetzt im Inventar gespeichert.' });
            setStatus('ready', 'Austausch abgeschlossen', 'Die bisherige Anzeige wurde gelöscht, 30 Tage im Papierkorb gesichert und die neue Anzeige im Inventar übernommen.');
            await refreshInventories();
          } catch (error) {
            void logAppEvent('USER_RENEWAL_REPLACEMENT_FINISH_FAILED', { renewalId, sourceAdId, newAdId, message: error.message }, 'error');
            finishButton.textContent = originalText;
            finishButton.disabled = false;
            updateButton.disabled = false;
            removeButton.disabled = false;
            setStatus('error', 'Austausch nicht abgeschlossen', `${friendlyErrorMessage(error)} Der aktuelle Stand bleibt erhalten.`);
          }
        });

        updateButton.addEventListener('click', async () => {
          if (!requireAccountBoundAction()) return;
          const adId = String(record.adId || '');
          const onlineStatusOnly = publicAvailabilityPending(record);
          void logAppEvent(onlineStatusOnly ? 'USER_CHECK_RENEWAL_ONLINE_STATUS_CLICK' : 'USER_REFRESH_RENEWAL_CANDIDATE_CLICK', { inventoryId: record.inventoryId, adId, renewalId: record.renewal.renewalId || '' });
          finishButton.disabled = true;
          updateButton.disabled = true;
          removeButton.disabled = true;
          const originalText = updateButton.textContent;
          updateButton.textContent = onlineStatusOnly ? 'Online-Status wird geprüft …' : 'Wird aktualisiert …';
          try {
            if (onlineStatusOnly) {
              const result = await runtimeMessage({ type: 'CHECK_INVENTORY_ONLINE_STATUS', inventoryId: record.inventoryId, adId });
              void logAppEvent('USER_CHECK_RENEWAL_ONLINE_STATUS_SUCCEEDED', { inventoryId: record.inventoryId, adId, renewalId: record.renewal.renewalId || '', online: Boolean(result?.online) });
              setOnlineAvailabilityNotice(result?.online);
            } else {
              const saved = await runtimeMessage({ type: 'REFRESH_INVENTORY', inventoryId: record.inventoryId, adId });
              void logAppEvent('USER_REFRESH_RENEWAL_CANDIDATE_SUCCEEDED', { inventoryId: saved?.inventoryId || record.inventoryId, adId, imageCount: saved?.imageSummary?.discovered || 0 });
              setStatus('ready', 'Anzeige aktualisiert', 'Die gespeicherten Daten wurden aktualisiert.');
            }
            await refreshInventories();
          } catch (error) {
            void logAppEvent(onlineStatusOnly ? 'USER_CHECK_RENEWAL_ONLINE_STATUS_FAILED' : 'USER_REFRESH_RENEWAL_CANDIDATE_FAILED', { inventoryId: record.inventoryId, adId, message: error.message }, 'error');
            updateButton.textContent = originalText;
            const retryGate = accountGateModel();
            const retryProfileMatch = String(record?.profileId || '') === String(selectedProfileId || '');
            finishButton.disabled = !retryGate.allowed || !retryProfileMatch;
            updateButton.disabled = !retryGate.allowed || !retryProfileMatch;
            removeButton.disabled = false;
            onlineStatusOnly
              ? setStatus('waiting', 'Online-Status unklar', 'Der bisherige Status bleibt unverändert.', '', { badgeLabel: 'Prüfen' })
              : setStatus('error', 'Aktualisierung unterbrochen', 'Der bisherige Inventareintrag bleibt erhalten.');
          }
        });

        removeButton.addEventListener('click', async () => {
          const renewalId = String(record.renewal.renewalId || '');
          void logAppEvent('USER_REMOVE_REPLACEMENT_READY_LOCAL_CLICK', { renewalId, inventoryId: record.inventoryId, sourceAdId: record.renewal.sourceAdId || '', newAdId: record.adId || '' });
          if (!await confirmAction({ title: 'In Papierkorb verschieben?', text: `„${record.title || record.adId}“ wird nur lokal in den Papierkorb verschoben.`, detail: 'Bei Kleinanzeigen wird weder die neue noch die bisherige Anzeige gelöscht oder verändert.', confirmLabel: 'In Papierkorb', danger: true })) {
            void logAppEvent('USER_REMOVE_REPLACEMENT_READY_LOCAL_CANCELLED', { renewalId, inventoryId: record.inventoryId });
            return;
          }
          finishButton.disabled = true;
          updateButton.disabled = true;
          removeButton.disabled = true;
          try {
            await runtimeMessage({ type: 'REMOVE_REPLACEMENT_READY_LOCAL', renewalId });
            void logAppEvent('USER_REMOVE_REPLACEMENT_READY_LOCAL_SUCCEEDED', { renewalId, inventoryId: record.inventoryId });
            setStatus('ready', 'In Papierkorb verschoben', 'Der neue lokale Eintrag wurde für 30 Tage gesichert. Bei Kleinanzeigen wurde nichts gelöscht oder verändert.');
            await refreshInventories();
          } catch (error) {
            void logAppEvent('USER_REMOVE_REPLACEMENT_READY_LOCAL_FAILED', { renewalId, inventoryId: record.inventoryId, message: error.message }, 'error');
            finishButton.disabled = false;
            updateButton.disabled = false;
            removeButton.disabled = false;
            setStatus('error', 'Eintrag konnte nicht verschoben werden', friendlyErrorMessage(error));
          }
        });

        actions.append(finishButton, updateButton, exportButton, removeButton);
      } else {
        const renewalAccountGate = accountGateModel();
        const renewalProfileMatches = Boolean(selectedConcreteProfile() && String(record?.profileId || '') === String(selectedProfileId || ''));
        const renewalButton = document.createElement('button');
        renewalButton.type = 'button';
        renewalButton.className = 'secondary compact-action renewal-state-button';
        renewalButton.textContent = renewalStatusText(record);
        const retryableRenewal = ['waiting-for-online', 'verification-failed'].includes(String(record.renewal.status || '')) && /^\d+$/.test(String(record.adId || record.renewal.newAdId || ''));
        renewalButton.disabled = !retryableRenewal || !renewalAccountGate.allowed || !renewalProfileMatches;
        if (retryableRenewal) {
          renewalButton.title = !renewalAccountGate.allowed
            ? renewalAccountGate.tooltip
            : !renewalProfileMatches
              ? 'Nicht verfügbar: Die Anzeige gehört nicht zum ausgewählten Inventarprofil.'
              : String(record.renewal.status || '') === 'waiting-for-online'
            ? 'Prüft erneut, ob die neue Anzeige inzwischen öffentlich sichtbar ist.'
            : 'Lädt und prüft die neue Anzeige erneut. Die bisherige Anzeige bleibt unverändert.';
          renewalButton.addEventListener('click', async () => {
            if (!requireAccountBoundAction()) return;
            const renewalId = String(record.renewal.renewalId || '');
            const originalText = renewalButton.textContent;
            renewalButton.disabled = true;
            renewalButton.textContent = 'Prüfung läuft …';
            void logAppEvent('USER_RENEWAL_VERIFICATION_RETRY_CLICK', { renewalId, inventoryId: record.inventoryId, status: record.renewal.status || '', newAdId: record.adId || record.renewal.newAdId || '' });
            try {
              const result = await runtimeMessage({ type: 'RETRY_RENEWAL_VERIFICATION', renewalId });
              void logAppEvent('USER_RENEWAL_VERIFICATION_RETRY_SUCCEEDED', { renewalId, status: result?.status || '', stage: result?.stage || '' });
              if (result?.status === 'verified' || result?.stage === 'replacement-ready') {
                setStatus('ready', 'Angaben geprüft', 'Die neue Anzeige stimmt mit der Ausgangsanzeige überein.');
              } else if (result?.status === 'waiting-for-online') {
                setStatus('waiting', 'Noch nicht online', '„Bald Online“ bleibt bestehen.', '', { badgeLabel: 'Bald Online' });
              } else {
                setStatus('waiting', 'Angaben prüfen', 'Die neue Anzeige stimmt noch nicht vollständig mit der Ausgangsanzeige überein.', '', { badgeLabel: 'Prüfen' });
              }
              await refreshInventories();
            } catch (error) {
              void logAppEvent('USER_RENEWAL_VERIFICATION_RETRY_FAILED', { renewalId, message: error.message }, 'error');
              renewalButton.textContent = originalText;
              const retryGate = accountGateModel();
              renewalButton.disabled = !retryGate.allowed || String(record?.profileId || '') !== String(selectedProfileId || '');
              setFriendlyErrorStatus(error, 'Prüfung nicht abgeschlossen');
            }
          });
        }
        actions.append(renewalButton);

        if (canDiscardRenewalDraft(record)) {
          const discardButton = document.createElement('button');
          discardButton.type = 'button';
          discardButton.className = 'danger-button compact-action';
          discardButton.textContent = 'Entwurf verwerfen';
          discardButton.title = 'Entfernt nur diesen lokalen Entwurf. Die bisherige Anzeige bleibt unverändert.';
          discardButton.addEventListener('click', async () => {
            const renewalId = String(record.renewal.renewalId || '');
            void logAppEvent('USER_RENEWAL_DRAFT_DISCARD_CLICK', { renewalId, inventoryId: record.inventoryId, sourceAdId: record.renewal.sourceAdId || '' });
            if (!await confirmAction({ title: 'Entwurf verwerfen?', text: 'Der lokale Entwurf wird entfernt.', detail: 'Die bisherige Anzeige bei Kleinanzeigen bleibt unverändert.', confirmLabel: 'Entwurf verwerfen', danger: true })) {
              void logAppEvent('USER_RENEWAL_DRAFT_DISCARD_CANCELLED', { renewalId, inventoryId: record.inventoryId });
              return;
            }
            discardButton.disabled = true;
            try {
              await runtimeMessage({ type: 'DISCARD_RENEWAL_DRAFT', renewalId });
              void logAppEvent('USER_RENEWAL_DRAFT_DISCARD_SUCCEEDED', { renewalId, inventoryId: record.inventoryId });
              setStatus('ready', 'Entwurf verworfen', 'Der lokale Entwurf wurde entfernt. Die bisherige Anzeige bleibt unverändert.');
              await refreshInventories();
            } catch (error) {
              void logAppEvent('USER_RENEWAL_DRAFT_DISCARD_FAILED', { renewalId, inventoryId: record.inventoryId, message: error.message }, 'error');
              discardButton.disabled = false;
              setFriendlyErrorStatus(error, 'Entwurf nicht verworfen');
            }
          });
          actions.append(discardButton);
        }
        actions.append(exportButton);
      }
      card.append(actions);
    } else {

    const createButton = document.createElement('button');
    createButton.type = 'button';
    createButton.className = 'secondary compact-action';
    createButton.textContent = 'Neu inserieren';
    const onlineStatusPending = publicAvailabilityPending(record);
    const ready = templateReady(record);
    const insertionBlocked = insertionLockActive();
    const accountGate = accountGateModel();
    const recordMatchesSelectedProfile = Boolean(selectedConcreteProfile() && String(record?.profileId || '') === String(selectedProfileId || ''));
    createButton.disabled = onlineStatusPending || !ready || insertionBlocked || !accountGate.allowed || !recordMatchesSelectedProfile;
    createButton.title = !accountGate.allowed
      ? accountGate.tooltip
      : !recordMatchesSelectedProfile
        ? 'Nicht verfügbar: Die Anzeige gehört nicht zum ausgewählten Inventarprofil.'
        : insertionBlocked
          ? insertionLockUiText()
          : onlineStatusPending
            ? 'Nicht verfügbar: Diese Anzeige ist noch „Bald Online“. Prüfe zuerst den Online-Status.'
            : (ready ? 'Öffnet eine neue Anzeige und übernimmt diese Vorlage.' : 'Vorlage ist nicht vollständig für die Neuerstellung geeignet.');
    createButton.addEventListener('click', async () => {
      if (!requireAccountBoundAction()) return;
      void logAppEvent('USER_NEW_LISTING_CLICK', { inventoryId: record.inventoryId, adId: record.adId || '' });
      try {
        void logAppEvent('USER_FULL_RENEWAL_CONFIRMATION_SHOWN', { inventoryId: record.inventoryId, adId: record.adId || '', title: record.title || '' });
        const confirmed = await confirmAutomatedRenewalStart(record);
        if (!confirmed) {
          void logAppEvent('USER_FULL_RENEWAL_CONFIRMATION_CANCELLED', { inventoryId: record.inventoryId, adId: record.adId || '' });
          return;
        }
        void logAppEvent('USER_FULL_RENEWAL_CONFIRMATION_ACCEPTED', { inventoryId: record.inventoryId, adId: record.adId || '' });
        createButton.disabled = true;
        createButton.textContent = 'Wird gestartet …';
        const started = await runtimeMessage({
          type: 'START_TEMPLATE_FILL',
          inventoryId: record.inventoryId,
          autoReplacementAllowed: true,
          startConfirmationVersion: 1
        });
        void logAppEvent('USER_NEW_LISTING_STARTED', { operationId: started?.operationId || '', parentOperationId: started?.parentOperationId || '', inventoryId: record.inventoryId, adId: record.adId || '', fillId: started?.fillId || '', renewalId: started?.renewalId || '', tabId: started?.tabId || null, renewalMode: normalizeRenewalMode(started?.renewalMode), autoReplacementAllowed: Boolean(started?.autoReplacementAllowed) });
        requireRenewalDialogController().trackStarted({ renewalId: started?.renewalId || '', sourceAdId: record.adId || '', sourceRecord: record });
        createButton.textContent = 'Austausch läuft …';
        renewalProgressShortcut.classList.remove('hidden');
        renewalProgressShortcutTitle.textContent = `Austausch läuft · ${renewalModeLabel(started?.renewalMode)}`;
        renewalProgressShortcutText.textContent = 'Die gespeicherten Angaben werden übernommen …';
        setStatus('ready', 'Neu inserieren gestartet', normalizeRenewalMode(started?.renewalMode) === RENEWAL_MODE_FAST
          ? 'Schnellprüfung: Nach dem Einstellen wird geprüft, ob die neue Anzeige unter „Meine Anzeigen“ erscheint. Danach wird die bisherige Anzeige sicher gelöscht und ihr Verschwinden geprüft.'
          : 'Vollprüfung: Nach dem Einstellen wird die neue Anzeige nochmals vollständig kontrolliert. Erst danach wird die bisherige Anzeige sicher gelöscht.');
        await refreshInventories();
      } catch (error) {
        void logAppEvent('USER_NEW_LISTING_FAILED', { inventoryId: record.inventoryId, adId: record.adId || '', message: error.message }, 'error');
        createButton.textContent = 'Neu inserieren';
        const retryGate = accountGateModel();
        createButton.disabled = !ready || insertionLockActive() || !retryGate.allowed || String(record?.profileId || '') !== String(selectedProfileId || '');
        if (renewalDialogStatus().mode === 'progress') {
          setRenewalPhaseStates({ 1: 'error', 2: 'pending', 3: 'pending', 4: 'pending' });
          setRenewalProgressMessage('error', 'Neu inserieren konnte nicht gestartet werden', friendlyErrorMessage(error));
        }
        setFriendlyErrorStatus(error, 'Neu inserieren nicht gestartet');
        await refreshInventories().catch(() => {});
      }
    });

    const updateButton = document.createElement('button');
    updateButton.type = 'button';
    updateButton.className = 'secondary compact-action';
    updateButton.textContent = onlineStatusPending ? 'Online-Status prüfen' : 'Daten aktualisieren';
    updateButton.disabled = !accountGate.allowed || !recordMatchesSelectedProfile;
    updateButton.title = !accountGate.allowed
      ? accountGate.tooltip
      : !recordMatchesSelectedProfile
        ? 'Nicht verfügbar: Die Anzeige gehört nicht zum ausgewählten Inventarprofil.'
        : onlineStatusPending
          ? 'Prüft die öffentliche Detailseite erneut und ergänzt die noch fehlenden öffentlichen Daten.'
          : 'Lädt die Daten dieser Anzeige bei Kleinanzeigen neu.';
    updateButton.addEventListener('click', async () => {
      if (!requireAccountBoundAction()) return;
      const adId = String(record.adId || '');
      const onlineStatusOnly = onlineStatusPending;
      void logAppEvent(onlineStatusOnly ? 'USER_CHECK_INVENTORY_ONLINE_STATUS_CLICK' : 'USER_REFRESH_INVENTORY_CLICK', { inventoryId: record.inventoryId, adId });
      createButton.disabled = true;
      updateButton.disabled = true;
      deleteButton.disabled = true;
      const originalText = updateButton.textContent;
      updateButton.textContent = onlineStatusOnly ? 'Online-Status wird geprüft …' : 'Wird aktualisiert …';
      try {
        if (onlineStatusOnly) {
          const result = await runtimeMessage({ type: 'CHECK_INVENTORY_ONLINE_STATUS', inventoryId: record.inventoryId, adId });
          void logAppEvent('USER_CHECK_INVENTORY_ONLINE_STATUS_SUCCEEDED', { inventoryId: record.inventoryId, adId, online: Boolean(result?.online), pending: Boolean(result?.pending) });
          setOnlineAvailabilityNotice(result?.online);
        } else {
          const saved = await runtimeMessage({ type: 'REFRESH_INVENTORY', inventoryId: record.inventoryId, adId });
          void logAppEvent('USER_REFRESH_INVENTORY_SUCCEEDED', { inventoryId: saved?.inventoryId || record.inventoryId, adId, imageCount: saved?.imageSummary?.discovered || 0 });
          setStatus('ready', 'Anzeige aktualisiert', `${record.title || `Anzeige ${adId}`} wurde neu geladen.`);
        }
        await refreshInventories();
      } catch (error) {
        void logAppEvent(onlineStatusOnly ? 'USER_CHECK_INVENTORY_ONLINE_STATUS_FAILED' : 'USER_REFRESH_INVENTORY_FAILED', { inventoryId: record.inventoryId, adId, message: error.message }, 'error');
        updateButton.textContent = originalText;
        const retryGate = accountGateModel();
        const retryProfileMatch = String(record?.profileId || '') === String(selectedProfileId || '');
        createButton.disabled = onlineStatusPending || !ready || insertionLockActive() || !retryGate.allowed || !retryProfileMatch;
        updateButton.disabled = !retryGate.allowed || !retryProfileMatch;
        deleteButton.disabled = false;
        setStatus('error', 'Aktualisierung fehlgeschlagen', `${friendlyErrorMessage(error)} Der bisherige Stand bleibt erhalten.`);
      }
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'danger-button compact-action';
    deleteButton.textContent = 'In Papierkorb';
    deleteButton.addEventListener('click', async () => {
      void logAppEvent('USER_DELETE_INVENTORY_CLICK', { inventoryId: record.inventoryId, adId: record.adId || '' });
      if (!await confirmAction({ title: 'In Papierkorb verschieben?', text: `„${record.title || record.adId}“ wird 30 Tage im Papierkorb aufbewahrt.`, detail: 'Die Anzeige bei Kleinanzeigen bleibt unverändert.', confirmLabel: 'In Papierkorb', danger: true })) {
        void logAppEvent('USER_DELETE_INVENTORY_CANCELLED', { inventoryId: record.inventoryId, adId: record.adId || '' });
        return;
      }
      deleteButton.disabled = true;
      try {
        await runtimeMessage({ type: 'DELETE_INVENTORY', inventoryId: record.inventoryId });
        void logAppEvent('USER_DELETE_INVENTORY_SUCCEEDED', { inventoryId: record.inventoryId, adId: record.adId || '' });
        setStatus('ready', 'In Papierkorb verschoben', 'Der Eintrag bleibt 30 Tage als Vorlage erhalten. Die Anzeige bei Kleinanzeigen wurde nicht verändert.');
        await refreshInventories();
      } catch (error) {
        void logAppEvent('USER_DELETE_INVENTORY_FAILED', { inventoryId: record.inventoryId, adId: record.adId || '', message: error.message }, 'error');
        deleteButton.disabled = false;
        setFriendlyErrorStatus(error, 'Nicht in Papierkorb verschoben');
      }
    });
    actions.append(createButton, updateButton, exportButton, deleteButton);
    card.append(actions);
    }

    const details = document.createElement('details');
    details.className = 'record-details';
    const detailsSummary = document.createElement('summary');
    detailsSummary.textContent = 'Details anzeigen';
    const body = document.createElement('div');
    body.className = 'record-grid';
    body.dataset.loaded = 'false';
    details.addEventListener('toggle', () => {
      void logAppEvent(details.open ? 'USER_ARTICLE_DETAILS_OPENED' : 'USER_ARTICLE_DETAILS_CLOSED', { inventoryId: record.inventoryId, adId: record.adId || '' });
      if (!details.open || body.dataset.loaded === 'true') return;
      body.dataset.loaded = 'true';
      const rows = [
        ['Preis', displayPriceWithType(record)],
        ['Endet am', endDateWithRelativeLabel(record)],
        [listingDatePresentation(record).label, listingDateLabel(record)],
        ['Kategorie', categoryLabel(record)],
        ['Weitere Angaben', record.dynamicAttributes?.map(item => `${item.label}: ${item.displayValue || item.technicalValue || '–'}`).join('\n') || '–'],
        ['Versand', record.shipping ? `${record.shipping.displayValue || record.shipping.value || '–'}` : '–'],
        ['Standort', record.location || '–'],
        ['Beschreibung', record.description || '–'],
        ['Weitere gespeicherte Felder', record.formFields?.map(item => `${item.label || item.name}: ${item.displayValue || String(item.value ?? '–')}`).join('\n') || '–']
      ];
      if (isRenewal) {
        rows.unshift(
          ['Austauschstatus', renewalStatusText(record)],
          ['Bisherige Anzeige', `ID ${record.renewal.sourceAdId || 'unbekannt'}`],
          ['Neue Anzeige', record.adId ? `ID ${record.adId}` : 'Noch nicht angelegt']
        );
        if (record.renewal.comparison) {
          rows.splice(3, 0, ['Prüfergebnis', `${comparisonStatusLabel(record.renewal.comparison)} · ${record.renewal.comparison.mismatches?.length || 0} Abweichungen · ${record.renewal.comparison.uncertainties?.length || 0} noch zu prüfen`]);
          if (record.renewal.comparison.mismatches?.length) {
            rows.splice(4, 0, ['Abweichungen', record.renewal.comparison.mismatches.map(item => `${item.field}: Soll ≠ Ist`).join('\n')]);
          }
          if (record.renewal.comparison.uncertainties?.length) {
            rows.splice(5, 0, ['Noch zu prüfen', record.renewal.comparison.uncertainties.map(item => `${item.field}: ${item.reason || 'nicht eindeutig'}`).join('\n')]);
          }
        }
      }
      for (const [label, value] of rows) {
        const row = document.createElement('div');
        row.className = 'record-row';
        const caption = document.createElement('span');
        caption.textContent = label;
        const content = document.createElement('p');
        content.textContent = value;
        row.append(caption, content);
        body.append(row);
      }
      if (record.images?.length) body.append(buildFullImageStrip(record));
      const sourceRow = document.createElement('div');
      sourceRow.className = 'record-row';
      const sourceLabel = document.createElement('span');
      sourceLabel.textContent = 'Bei Kleinanzeigen';
      const sourceLink = document.createElement('a');
      const detailAdId = String(record.adId || '');
      sourceLink.href = /^\d+$/.test(detailAdId) ? `https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=${encodeURIComponent(detailAdId)}` : '#';
      sourceLink.target = '_blank';
      sourceLink.rel = 'noreferrer';
      sourceLink.textContent = 'Anzeige bearbeiten';
      sourceRow.append(sourceLabel, sourceLink);
      body.append(sourceRow);
      if (record.warnings?.length) {
        const warningRow = document.createElement('div');
        warningRow.className = 'record-row';
        const warningLabel = document.createElement('span');
        warningLabel.textContent = 'Warnungen';
        const warningList = document.createElement('ul');
        warningList.className = 'warning-list';
        for (const warning of record.warnings) {
          const item = document.createElement('li');
          item.textContent = warning;
          warningList.append(item);
        }
        warningRow.append(warningLabel, warningList);
        body.append(warningRow);
      }
    });
    details.append(detailsSummary, body);
    const footer = document.createElement('div');
    footer.className = 'inventory-card-footer';
    const footerMeta = document.createElement('span');
    footerMeta.className = 'inventory-footer-meta';
    footerMeta.textContent = isReplacementReady
      ? `Gespeichert ${formatDate(record.capturedAt)} · ID ${record.adId || 'unbekannt'}`
      : isRenewal
        ? `Austausch gestartet ${formatDate(record.renewal?.createdAt || record.capturedAt)} · ${record.adId ? `neue ID ${record.adId}` : 'Entwurf – noch ohne neue ID'}`
        : `Gespeichert ${formatDate(record.capturedAt)} · ID ${record.adId || 'unbekannt'}`;
    footer.append(details, footerMeta);
    card.append(footer);
    inventoryList.append(card);
  }
}

      return Object.freeze({ updateContext, appendDerivedListingDateBadge, renderCompactInventoryRow, renderInventories, makeInventoryExportActionButton, makeCompactInventoryExportButton });
    }
  });
  globalThis.KRDeps?.register?.('KRInventoryCardRenderer', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
