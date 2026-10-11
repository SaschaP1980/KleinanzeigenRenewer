(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const document = options.document || globalThis.document;
      const formatting = options.formatting || {};
      const sharedUiHelpers = options.sharedUiHelpers || {};
      const recordCardView = options.recordCardView;
      if (!recordCardView) throw new Error('record-card-view.js must load before trash card rendering');
      const { trashList, inventoryHeaderCount, trashHeaderCount, trashCount } = options.elements || {};
      const formatDate = formatting.formatDate;
      const displayPriceWithType = formatting.displayPriceWithType;
      const categoryLabel = formatting.categoryLabel;
      const templateReady = formatting.templateReady;
      const trashReasonLabel = formatting.trashReasonLabel;
      const trashRetentionPresentation = formatting.trashRetentionPresentation;
      const makeCompactIconButton = sharedUiHelpers.makeCompactIconButton;
      const accountGateModel = options.accountGateModel || (() => ({ allowed:false, tooltip:'' }));
      const selectedConcreteProfile = options.selectedConcreteProfile || (() => null);
      const insertionLockActive = options.insertionLockActive || (() => false);
      const insertionLockUiText = options.insertionLockUiText || (() => '');
      const requireAccountBoundAction = options.requireAccountBoundAction || (() => false);
      const confirmAction = options.confirmAction || (async () => false);
      const runtimeMessage = options.runtimeMessage || (async () => null);
      const setStatus = options.setStatus || (() => {});
      const refreshInventories = options.refreshInventories || (async () => {});
      const friendlyErrorMessage = options.friendlyErrorMessage || (error => String(error?.message || error || ''));
      const logAppEvent = options.logAppEvent || (async () => {});
      const exportInventoryRecord = options.exportInventoryRecord || (async () => null);
      const openTrashTemplateDialog = options.openTrashTemplateDialog || (() => {});
      const purgePreviewUrlsForRecord = options.purgePreviewUrlsForRecord || (() => {});
      const syncListViewModeControls = options.syncListViewModeControls || (() => {});
      const { makeInfoLine, buildFullImageStrip, createCompactListRow, setCompactButtonsBusy, rememberCompactButtonDisabled } = recordCardView;
      let currentRecords = [];
      let currentTrashRecords = [];
      let selectedProfileId = '';
      let globalListViewMode = 'detailed';
      function updateContext(context={}) {
        if (Array.isArray(context.records)) currentRecords=context.records;
        if (Array.isArray(context.trashRecords)) currentTrashRecords=context.trashRecords;
        if (Object.prototype.hasOwnProperty.call(context,'selectedProfileId')) selectedProfileId=String(context.selectedProfileId||'');
        if (Object.prototype.hasOwnProperty.call(context,'globalListViewMode')) globalListViewMode=String(context.globalListViewMode||'')==='compact'?'compact':'detailed';
      }

function renderCompactTrashRow(record) {
  const { row, actions } = createCompactListRow(record, { trash: true });
  const ready = templateReady(record);
  const blocked = insertionLockActive();
  const gate = accountGateModel();
  const profileMatches = Boolean(selectedConcreteProfile() && String(record?.profileId || '') === String(selectedProfileId || ''));
  const templateButton = makeCompactIconButton({ icon: 'new-listing', label: 'Neu inserieren', title: 'Als Vorlage neu inserieren' });
  templateButton.disabled = !ready || blocked || !gate.allowed || !profileMatches;
  rememberCompactButtonDisabled(templateButton);
  const resetButton = makeCompactIconButton({
    icon: 'update',
    label: '30 Tage neu starten',
    title: 'Setzt die lokale Aufbewahrungsfrist dieses Papierkorb-Eintrags ab jetzt wieder auf volle 30 Tage.'
  });
  rememberCompactButtonDisabled(resetButton);
  const exportButton = makeCompactIconButton({
    icon: 'zip-export',
    label: 'Als ZIP exportieren',
    title: 'Speichert diesen Papierkorb-Eintrag mit allen lokal vorhandenen Bildern als Sicherungs-ZIP.'
  });
  rememberCompactButtonDisabled(exportButton);
  const deleteButton = makeCompactIconButton({ icon: 'delete', label: 'Endgültig löschen', title: 'Löscht diesen Papierkorb-Eintrag und seine lokal gespeicherten Bilder dauerhaft.', danger: true });
  rememberCompactButtonDisabled(deleteButton);
  const peers = [templateButton, resetButton, exportButton, deleteButton];

  templateButton.addEventListener('click', () => {
    if (!requireAccountBoundAction()) return;
    openTrashTemplateDialog(record);
  });
  resetButton.addEventListener('click', async () => {
    void logAppEvent('USER_TRASH_RETENTION_RESET_CLICK', { inventoryId: record.inventoryId, adId: record.adId || '', view: 'compact' });
    if (!await confirmAction({ title: 'Aufbewahrung neu starten?', text: `„${record.title || record.adId}“ bleibt ab jetzt wieder 30 Tage im Papierkorb.`, detail: 'Der Eintrag bleibt im Papierkorb. Im Inventar und bei Kleinanzeigen wird nichts verändert.', confirmLabel: '30 Tage neu starten' })) return;
    setCompactButtonsBusy(peers, true);
    try {
      const result = await runtimeMessage({ type: 'RESET_TRASH_RETENTION', inventoryId: record.inventoryId });
      void logAppEvent('USER_TRASH_RETENTION_RESET_SUCCEEDED', { inventoryId: record.inventoryId, adId: record.adId || '', expiresAt: result?.expiresAt || null, view: 'compact' });
      setStatus('ready', 'Aufbewahrung neu gestartet', 'Der Papierkorb-Eintrag bleibt ab jetzt wieder 30 Tage erhalten.');
      await refreshInventories();
    } catch (error) {
      setCompactButtonsBusy(peers, false);
      void logAppEvent('USER_TRASH_RETENTION_RESET_FAILED', { inventoryId: record.inventoryId, adId: record.adId || '', message: error.message, view: 'compact' }, 'error');
      setStatus('error', 'Aufbewahrung konnte nicht neu gestartet werden', friendlyErrorMessage(error));
    }
  });
  exportButton.addEventListener('click', async () => {
    exportButton.disabled = true;
    exportButton.classList.add('is-busy');
    void logAppEvent('USER_TRASH_EXPORT_CLICK', { inventoryId: record.inventoryId, adId: record.adId || '', imageCount: record.images?.length || 0, view: 'compact' });
    try {
      const result = await exportInventoryRecord(record);
      void logAppEvent('USER_TRASH_EXPORT_SUCCEEDED', { inventoryId: record.inventoryId, adId: record.adId || '', imageCount: result.manifest?.images?.length || 0, bytes: result.blob?.size || 0, archiveVersion: result.manifest?.archiveVersion || null, view: 'compact' });
      setStatus('ready', 'Sicherungs-ZIP erstellt', `Papierkorb-Eintrag mit ${result.manifest?.images?.length || 0} Bild${result.manifest?.images?.length === 1 ? '' : 'ern'} wurde als ZIP gesichert.`);
    } catch (error) {
      void logAppEvent('USER_TRASH_EXPORT_FAILED', { inventoryId: record.inventoryId, adId: record.adId || '', message: String(error?.message || error), view: 'compact' }, 'error');
      setStatus('error', 'Sicherungs-ZIP konnte nicht erstellt werden', 'Die Sicherung konnte nicht erstellt werden. Bitte versuche es erneut.');
    } finally {
      exportButton.disabled = false;
      exportButton.classList.remove('is-busy');
    }
  });
  deleteButton.addEventListener('click', async () => {
    if (!await confirmAction({ title: 'Endgültig löschen?', text: `„${record.title || record.adId}“ wird dauerhaft aus dem lokalen Papierkorb gelöscht.`, detail: 'Die gespeicherten Daten und Bilder können danach nicht mehr als Vorlage verwendet werden. Bei Kleinanzeigen wird nichts verändert.', confirmLabel: 'Endgültig löschen', danger: true })) return;
    setCompactButtonsBusy(peers, true);
    try {
      await runtimeMessage({ type: 'DELETE_TRASH_ENTRY', inventoryId: record.inventoryId });
      purgePreviewUrlsForRecord(record);
      setStatus('ready', 'Eintrag endgültig gelöscht', 'Die lokal gespeicherten Daten und Bilder wurden dauerhaft entfernt. Bei Kleinanzeigen wurde nichts verändert.');
      await refreshInventories();
    } catch (error) {
      setCompactButtonsBusy(peers, false);
      setFriendlyErrorStatus(error, 'Eintrag konnte nicht endgültig gelöscht werden');
    }
  });
  actions.append(templateButton, resetButton, exportButton, deleteButton);
  return row;
}

function renderTrash(records = currentTrashRecords) {
  currentTrashRecords = Array.isArray(records) ? records : [];
  syncListViewModeControls();
  inventoryHeaderCount.textContent = String(currentRecords.length);
  trashHeaderCount.textContent = String(currentTrashRecords.length);
  trashCount.textContent = `${currentTrashRecords.length} ${currentTrashRecords.length === 1 ? 'Eintrag' : 'Einträge'}`;
  trashList.replaceChildren();
  if (!currentTrashRecords.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Der Papierkorb ist leer.';
    trashList.append(empty);
    return;
  }

  for (const record of currentTrashRecords) {
    if (globalListViewMode === 'compact') {
      trashList.append(renderCompactTrashRow(record));
      continue;
    }
    const card = document.createElement('article');
    card.className = 'inventory-card compact-card trash-card';
    card.dataset.inventoryId = String(record?.inventoryId || '');
    card.dataset.adId = String(record?.adId || '');
    const summary = document.createElement('div');
    summary.className = 'inventory-summary';
    const cover = document.createElement('img');
    cover.className = 'inventory-cover';
    cover.alt = 'Gesichertes Anzeigenbild aus dem Papierkorb';
    const firstImage = record.images?.[0];
    if (firstImage) void loadLocalPreview(cover, record, firstImage);
    const info = document.createElement('div');
    info.className = 'inventory-summary-info';
    const title = document.createElement('h3');
    const titleText = document.createElement('span');
    titleText.textContent = record.title || `Anzeige ${record.adId || record.inventoryId}`;
    const badge = document.createElement('span');
    badge.className = 'trash-badge';
    badge.textContent = 'PAPIERKORB';
    title.append(titleText, badge);
    const facts = document.createElement('div');
    facts.className = 'summary-facts';
    facts.append(makeInfoLine('Preis', displayPriceWithType(record)));
    facts.append(makeInfoLine('ID', String(record.adId || 'unbekannt')));
    facts.append(makeInfoLine('Im Papierkorb', formatDate(record.trash?.trashedAt)));
    const expiryRow = makeInfoLine('Aufbewahrung', trashRetentionPresentation(record));
    expiryRow.classList.add('trash-expiry');
    facts.append(expiryRow);
    facts.append(makeInfoLine('Grund', trashReasonLabel(record)));
    info.append(title, facts);
    summary.append(cover, info);
    card.append(summary);

    const actions = document.createElement('div');
    actions.className = 'inventory-actions multi';
    const templateButton = document.createElement('button');
    templateButton.type = 'button';
    templateButton.className = 'secondary compact-action';
    templateButton.textContent = 'Als Vorlage neu inserieren';
    const ready = templateReady(record);
    const insertionBlocked = insertionLockActive();
    const accountGate = accountGateModel();
    const recordMatchesSelectedProfile = Boolean(selectedConcreteProfile() && String(record?.profileId || '') === String(selectedProfileId || ''));
    templateButton.disabled = !ready || insertionBlocked || !accountGate.allowed || !recordMatchesSelectedProfile;
    templateButton.title = !accountGate.allowed
      ? accountGate.tooltip
      : !recordMatchesSelectedProfile
        ? 'Nicht verfügbar: Die Vorlage gehört nicht zum ausgewählten Inventarprofil.'
        : insertionBlocked
          ? insertionLockUiText()
          : (ready
            ? 'Öffnet den geführten Vorlagen-Dialog. Veröffentlicht wird nicht automatisch.'
            : 'Diese gespeicherte Vorlage enthält nicht alle Daten für eine neue Anzeige.');
    templateButton.addEventListener('click', () => {
      if (!requireAccountBoundAction()) return;
      void logAppEvent('USER_TRASH_TEMPLATE_FILL_CLICK', { inventoryId: record.inventoryId, adId: record.adId || '' });
      openTrashTemplateDialog(record);
    });

    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.className = 'secondary compact-action';
    exportButton.textContent = 'Als ZIP exportieren';
    exportButton.title = 'Speichert diesen Papierkorb-Eintrag mit allen lokal vorhandenen Bildern als Sicherungs-ZIP.';
    exportButton.addEventListener('click', async () => {
      const originalText = exportButton.textContent;
      exportButton.disabled = true;
      exportButton.textContent = 'ZIP wird erstellt …';
      void logAppEvent('USER_TRASH_EXPORT_CLICK', { inventoryId: record.inventoryId, adId: record.adId || '', imageCount: record.images?.length || 0 });
      try {
        const result = await exportInventoryRecord(record);
        void logAppEvent('USER_TRASH_EXPORT_SUCCEEDED', { inventoryId: record.inventoryId, adId: record.adId || '', imageCount: result.manifest?.images?.length || 0, bytes: result.blob?.size || 0, archiveVersion: result.manifest?.archiveVersion || null });
        setStatus('ready', 'Sicherungs-ZIP erstellt', `Papierkorb-Eintrag mit ${result.manifest?.images?.length || 0} Bild${result.manifest?.images?.length === 1 ? '' : 'ern'} wurde als ZIP gesichert.`);
      } catch (error) {
        void logAppEvent('USER_TRASH_EXPORT_FAILED', { inventoryId: record.inventoryId, adId: record.adId || '', message: String(error?.message || error) }, 'error');
        setStatus('error', 'Sicherungs-ZIP konnte nicht erstellt werden', 'Die Sicherung konnte nicht erstellt werden. Bitte versuche es erneut.');
      } finally {
        exportButton.disabled = false;
        exportButton.textContent = originalText;
      }
    });

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'secondary compact-action';
    resetButton.textContent = '30 Tage neu starten';
    resetButton.title = 'Setzt die lokale Aufbewahrungsfrist dieses Papierkorb-Eintrags ab jetzt wieder auf volle 30 Tage.';
    resetButton.addEventListener('click', async () => {
      void logAppEvent('USER_TRASH_RETENTION_RESET_CLICK', { inventoryId: record.inventoryId, adId: record.adId || '' });
      if (!await confirmAction({ title: 'Aufbewahrung neu starten?', text: `„${record.title || record.adId}“ bleibt ab jetzt wieder 30 Tage im Papierkorb.`, detail: 'Der Eintrag bleibt im Papierkorb. Im Inventar und bei Kleinanzeigen wird nichts verändert.', confirmLabel: '30 Tage neu starten' })) return;
      resetButton.disabled = true;
      try {
        const result = await runtimeMessage({ type: 'RESET_TRASH_RETENTION', inventoryId: record.inventoryId });
        void logAppEvent('USER_TRASH_RETENTION_RESET_SUCCEEDED', { inventoryId: record.inventoryId, adId: record.adId || '', expiresAt: result?.expiresAt || null });
        setStatus('ready', 'Aufbewahrung neu gestartet', 'Der Papierkorb-Eintrag bleibt ab jetzt wieder 30 Tage erhalten.');
        await refreshInventories();
      } catch (error) {
        resetButton.disabled = false;
        void logAppEvent('USER_TRASH_RETENTION_RESET_FAILED', { inventoryId: record.inventoryId, adId: record.adId || '', message: error.message }, 'error');
        setStatus('error', 'Aufbewahrung konnte nicht neu gestartet werden', friendlyErrorMessage(error));
      }
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'danger-button compact-action';
    deleteButton.textContent = 'Endgültig löschen';
    deleteButton.title = 'Entfernt diesen Papierkorb-Eintrag und seine lokal gespeicherten Bilder dauerhaft.';
    deleteButton.addEventListener('click', async () => {
      void logAppEvent('USER_TRASH_PERMANENT_DELETE_CLICK', { inventoryId: record.inventoryId, adId: record.adId || '' });
      if (!await confirmAction({ title: 'Endgültig löschen?', text: `„${record.title || record.adId}“ wird dauerhaft aus dem Papierkorb gelöscht.`, detail: 'Die gespeicherten Daten und Bilder können danach nicht mehr als Vorlage verwendet werden. Bei Kleinanzeigen wird nichts verändert.', confirmLabel: 'Endgültig löschen', danger: true })) {
        void logAppEvent('USER_TRASH_PERMANENT_DELETE_CANCELLED', { inventoryId: record.inventoryId, adId: record.adId || '' });
        return;
      }
      templateButton.disabled = true;
      exportButton.disabled = true;
      resetButton.disabled = true;
      deleteButton.disabled = true;
      try {
        await runtimeMessage({ type: 'DELETE_TRASH_ENTRY', inventoryId: record.inventoryId });
        purgePreviewUrlsForRecord(record);
        void logAppEvent('USER_TRASH_PERMANENT_DELETE_SUCCEEDED', { inventoryId: record.inventoryId, adId: record.adId || '' });
        setStatus('ready', 'Eintrag endgültig gelöscht', 'Die gespeicherten Daten und Bilder wurden dauerhaft entfernt.');
        await refreshInventories();
      } catch (error) {
        void logAppEvent('USER_TRASH_PERMANENT_DELETE_FAILED', { inventoryId: record.inventoryId, adId: record.adId || '', message: error.message }, 'error');
        templateButton.disabled = !ready || insertionLockActive();
        exportButton.disabled = false;
        resetButton.disabled = false;
        deleteButton.disabled = false;
        setStatus('error', 'Eintrag konnte nicht gelöscht werden', friendlyErrorMessage(error));
      }
    });
    actions.append(templateButton, resetButton, exportButton, deleteButton);
    card.append(actions);

    const details = document.createElement('details');
    details.className = 'record-details';
    const detailsSummary = document.createElement('summary');
    detailsSummary.textContent = 'Gespeicherte Daten anzeigen';
    const body = document.createElement('div');
    body.className = 'record-grid';
    body.dataset.loaded = 'false';
    details.addEventListener('toggle', () => {
      void logAppEvent(details.open ? 'USER_TRASH_DETAILS_OPENED' : 'USER_TRASH_DETAILS_CLOSED', { inventoryId: record.inventoryId, adId: record.adId || '' });
      if (!details.open || body.dataset.loaded === 'true') return;
      body.dataset.loaded = 'true';
      const rows = [
        ['Im Papierkorb', formatDate(record.trash?.trashedAt)],
        ['Automatische Löschung', formatDate(record.trash?.expiresAt)],
        ['Grund', trashReasonLabel(record)],
        ['Preis', displayPriceWithType(record)],
        ['Kategorie', categoryLabel(record)],
        ['Weitere Angaben', record.dynamicAttributes?.map(item => `${item.label}: ${item.displayValue || item.technicalValue || '–'}`).join('\n') || '–'],
        ['Versand', record.shipping ? `${record.shipping.displayValue || record.shipping.value || '–'}` : '–'],
        ['Standort', record.location || '–'],
        ['Beschreibung', record.description || '–']
      ];
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
    });
    details.append(detailsSummary, body);
    const footer = document.createElement('div');
    footer.className = 'inventory-card-footer';
    const footerMeta = document.createElement('span');
    footerMeta.className = 'inventory-footer-meta';
    footerMeta.textContent = `Papierkorb ${formatDate(record.trash?.trashedAt)} · ID ${record.adId || 'unbekannt'}`;
    footer.append(details, footerMeta);
    card.append(footer);
    trashList.append(card);
  }
}

      return Object.freeze({ updateContext, renderCompactTrashRow, renderTrash });
    }
  });
  globalThis.KRDeps?.register?.('KRTrashCardRenderer', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
