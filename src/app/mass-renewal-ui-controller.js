(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const document = options.document || globalThis.document;
      const elements = options.elements || {};
      const {
        massRenewalButton, massRenewalDialog, massRenewalClose, massRenewalCancel, massRenewalBack,
        massRenewalNext, massRenewalStart, massRenewalStopAfterCurrent, massRenewalDone,
        massRenewalKicker, massRenewalIntro, massRenewalSelectionPanel, massRenewalOrderPanel,
        massRenewalOrderList, massRenewalProgressPanel, massRenewalSummaryPanel, massRenewalSelectionBody,
        massRenewalSelectionCount, massRenewalProgressTitle, massRenewalProgressCount,
        massRenewalProgressList, massRenewalSummaryCount, massRenewalSummaryList
      } = elements;
      const MASS_RENEWAL_MAX_ITEMS = Number(options.maxItems || 10);
      const RENEWAL_MODE_FAST = String(options.fastMode || 'fast');
      const normalizeRenewalMode = options.normalizeRenewalMode || (value => String(value || 'safe'));
      const templateReady = options.templateReady || (() => false);
      const displayPrice = options.displayPrice || (() => '');
      const endDateWithRelativeLabel = options.endDateWithRelativeLabel || (() => '');
      const loadLocalPreview = options.loadLocalPreview || (async () => {});
      const accountGateModel = options.accountGateModel || (() => ({ allowed: false, tooltip: '' }));
      const insertionLockActive = options.insertionLockActive || (() => false);
      const insertionLockUiText = options.insertionLockUiText || (() => '');
      const publicAvailabilityPending = options.publicAvailabilityPending || (() => false);
      const renewalProgressModel = options.renewalProgressModel || (() => ({ states: {} }));
      const runtimeMessage = options.runtimeMessage || (async () => null);
      const setStatus = options.setStatus || (() => {});
      const friendlyErrorMessage = options.friendlyErrorMessage || (error => String(error?.message || error || ''));
      const confirmAction = options.confirmAction || (async () => false);
      const requireAccountBoundAction = options.requireAccountBoundAction || (() => false);
      const logAppEvent = options.logAppEvent || (async () => {});
      const syncActionsActivityIndicator = options.syncActionsActivityIndicator || (() => {});
      const scheduleActionsStateSnapshot = options.scheduleActionsStateSnapshot || (() => {});

      let currentRecords = [];
      let currentTrashRecords = [];
      let currentRenewalConfiguration = { renewalMode: 'safe' };
      let currentInsertionLock = { locked: false };
      let currentMassRenewalBatch = null;
      const massRenewalRetryInFlight = new Set();
      let massRenewalSelectedIds = new Set();
      let massRenewalOrderedIds = [];
      let massRenewalDraggedId = '';
      let installed = false;
function massRenewalEndTimestamp(record) {
  const iso = String(record?.listingMeta?.endDateIso || '').trim();
  if (iso) {
    const value = Date.parse(iso);
    if (Number.isFinite(value)) return value;
  }
  const display = String(record?.listingMeta?.endDateDisplay || record?.endDateDisplay || '').trim();
  let match = display.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) return Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return Number.MAX_SAFE_INTEGER;
}

function eligibleMassRenewalRecords() {
  return currentRecords
    .filter(record => templateReady(record))
    .sort((a, b) => massRenewalEndTimestamp(a) - massRenewalEndTimestamp(b) || String(a.title || '').localeCompare(String(b.title || ''), 'de'));
}

function setMassRenewalStep(step, { completeCurrent = false } = {}) {
  for (const item of massRenewalDialog?.querySelectorAll('[data-mass-step]') || []) {
    const itemStep = Number(item.dataset.massStep || 0);
    const completed = itemStep < Number(step) || (completeCurrent && itemStep === Number(step));
    const active = itemStep === Number(step) && !completed;
    item.classList.toggle('active', active);
    item.classList.toggle('completed', completed);
    const marker = item.querySelector('span');
    if (marker) marker.textContent = completed ? '✓' : String(itemStep);
  }
  massRenewalSelectionPanel?.classList.toggle('hidden', step !== 1);
  massRenewalOrderPanel?.classList.toggle('hidden', step !== 2);
  massRenewalProgressPanel?.classList.toggle('hidden', step !== 3);
  massRenewalSummaryPanel?.classList.toggle('hidden', step !== 4);
  massRenewalCancel?.classList.toggle('hidden', ![1, 2].includes(Number(step)));
  massRenewalNext?.classList.toggle('hidden', step !== 1);
  massRenewalBack?.classList.toggle('hidden', step !== 2);
  massRenewalStart?.classList.toggle('hidden', step !== 2);
  massRenewalStopAfterCurrent?.classList.toggle('hidden', step !== 3);
  if (massRenewalStopAfterCurrent && step === 3) massRenewalStopAfterCurrent.disabled = !currentMassRenewalBatch || String(currentMassRenewalBatch.status || '') !== 'running' || currentMassRenewalBatch.stopAfterCurrentRequested === true;
  massRenewalDone?.classList.toggle('hidden', step !== 4);
  if (massRenewalIntro) {
    massRenewalIntro.textContent = step === 2
      ? 'Lege die Reihenfolge fest, in der die ausgewählten Anzeigen nacheinander neu inseriert werden.'
      : step === 3
        ? 'Die ausgewählten Anzeigen werden jetzt in der festgelegten Reihenfolge im gewählten Prüfmodus nacheinander neu inseriert.'
        : step === 4
          ? 'Der Durchlauf ist abgeschlossen. Prüfe die Ergebnisse und starte erforderliche Schritte bei Bedarf erneut.'
          : 'Wähle bis zu 10 Anzeigen aus. Anschließend kannst du ihre Abarbeitungsreihenfolge festlegen.';
  }
}

function setMassRenewalKicker(mode = currentRenewalConfiguration.renewalMode) {
  if (!massRenewalKicker) return;
  const normalizedMode = normalizeRenewalMode(mode);
  massRenewalKicker.replaceChildren();
  massRenewalKicker.append(document.createTextNode('MEHRERE NEU INSERIEREN · '));
  const modeLabel = document.createElement('span');
  modeLabel.className = `renewal-start-mode${normalizedMode === RENEWAL_MODE_FAST ? ' fast' : ''}`;
  modeLabel.textContent = normalizedMode === RENEWAL_MODE_FAST ? 'SCHNELLPRÜFUNG' : 'VOLLPRÜFUNG';
  massRenewalKicker.append(modeLabel);
}

function updateMassRenewalSelectionState() {
  const selectedCount = massRenewalSelectedIds.size;
  const gate = accountGateModel();
  if (massRenewalSelectionCount) massRenewalSelectionCount.textContent = `${selectedCount} von ${MASS_RENEWAL_MAX_ITEMS} ausgewählt`;
  if (massRenewalNext) {
    massRenewalNext.disabled = !gate.allowed || selectedCount === 0 || insertionLockActive();
    massRenewalNext.title = !gate.allowed ? gate.tooltip : insertionLockActive() ? insertionLockUiText() : '';
  }
  for (const checkbox of massRenewalSelectionBody?.querySelectorAll('input[type="checkbox"]') || []) {
    if (!gate.allowed) checkbox.disabled = true;
    else if (checkbox.checked) checkbox.disabled = false;
    else checkbox.disabled = selectedCount >= MASS_RENEWAL_MAX_ITEMS;
    const row = checkbox.closest('tr');
    row?.classList.toggle('selected', checkbox.checked);
    row?.setAttribute('aria-selected', checkbox.checked ? 'true' : 'false');
  }
}

function applyMassRenewalCheckboxChange(record, checkbox, row) {
  const id = String(record.inventoryId);
  if (checkbox.checked) {
    if (massRenewalSelectedIds.size >= MASS_RENEWAL_MAX_ITEMS && !massRenewalSelectedIds.has(id)) {
      checkbox.checked = false;
      return;
    }
    massRenewalSelectedIds.add(id);
  } else {
    massRenewalSelectedIds.delete(id);
  }
  row?.classList.toggle('selected', checkbox.checked);
  row?.setAttribute('aria-selected', checkbox.checked ? 'true' : 'false');
  updateMassRenewalSelectionState();
}

function renderMassRenewalSelection() {
  if (!massRenewalSelectionBody) return;
  massRenewalSelectionBody.replaceChildren();
  massRenewalSelectedIds = new Set([...massRenewalSelectedIds].filter(id => currentRecords.some(record => String(record.inventoryId) === String(id) && templateReady(record))));
  const records = eligibleMassRenewalRecords();
  if (!records.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'Für dieses Inventarprofil sind aktuell keine vollständig gespeicherten Vorlagen verfügbar.';
    row.append(cell);
    massRenewalSelectionBody.append(row);
    updateMassRenewalSelectionState();
    return;
  }
  records.forEach(record => {
    const row = document.createElement('tr');
    row.className = 'mass-renewal-selectable-row';
    row.dataset.massInventoryId = String(record.inventoryId);
    row.tabIndex = 0;
    const selectCell = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = String(record.inventoryId);
    checkbox.checked = massRenewalSelectedIds.has(String(record.inventoryId));
    checkbox.setAttribute('aria-label', `${record.title || 'Anzeige'} auswählen`);
    checkbox.addEventListener('change', () => applyMassRenewalCheckboxChange(record, checkbox, row));
    row.addEventListener('click', event => {
      if (event.target.closest('input')) return;
      if (checkbox.disabled) return;
      checkbox.checked = !checkbox.checked;
      applyMassRenewalCheckboxChange(record, checkbox, row);
    });
    row.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key) || event.target !== row || checkbox.disabled) return;
      event.preventDefault();
      checkbox.checked = !checkbox.checked;
      applyMassRenewalCheckboxChange(record, checkbox, row);
    });
    selectCell.append(checkbox);
    const imageCell = document.createElement('td');
    const image = document.createElement('img');
    image.className = 'mass-renewal-thumb';
    image.alt = '';
    const primary = (record.images || []).find(item => item.isPrimary) || record.images?.[0];
    if (primary) void loadLocalPreview(image, record, primary);
    imageCell.append(image);
    const titleCell = document.createElement('td');
    const title = document.createElement('span');
    title.className = 'mass-renewal-row-title';
    title.textContent = record.title || `Anzeige ${record.adId || ''}`;
    const sub = document.createElement('small');
    sub.className = 'mass-renewal-row-sub';
    sub.textContent = record.adId ? `ID ${record.adId}` : 'Gespeicherte Vorlage';
    titleCell.append(title, sub);
    const priceCell = document.createElement('td');
    priceCell.textContent = displayPrice(record);
    const endCell = document.createElement('td');
    endCell.textContent = endDateWithRelativeLabel(record);
    row.append(selectCell, imageCell, titleCell, priceCell, endCell);
    massRenewalSelectionBody.append(row);
  });
  updateMassRenewalSelectionState();
}

function massRenewalRecordForId(inventoryId) {
  return currentRecords.find(record => String(record.inventoryId) === String(inventoryId) && templateReady(record)) || null;
}

function normalizeMassRenewalOrder() {
  const validSelected = new Set([...massRenewalSelectedIds].filter(id => massRenewalRecordForId(id)));
  const seen = new Set();
  const normalized = [];
  for (const id of massRenewalOrderedIds) {
    const value = String(id || '');
    if (!value || seen.has(value) || !validSelected.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }
  const visibleIds = [...(massRenewalSelectionBody?.querySelectorAll('tr[data-mass-inventory-id]') || [])]
    .map(row => String(row.dataset.massInventoryId || ''))
    .filter(id => id && validSelected.has(id));
  for (const id of visibleIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }
  massRenewalOrderedIds = normalized;
}

function updateMassRenewalOrderState() {
  normalizeMassRenewalOrder();
  const gate = accountGateModel();
  if (massRenewalStart) {
    massRenewalStart.disabled = !gate.allowed || massRenewalOrderedIds.length === 0 || insertionLockActive();
    massRenewalStart.title = !gate.allowed ? gate.tooltip : insertionLockActive() ? insertionLockUiText() : '';
  }
}

function moveMassRenewalOrderItem(inventoryId, toIndex) {
  normalizeMassRenewalOrder();
  const id = String(inventoryId || '');
  const fromIndex = massRenewalOrderedIds.indexOf(id);
  if (fromIndex < 0) return;
  const next = massRenewalOrderedIds.filter(value => value !== id);
  const boundedIndex = Math.max(0, Math.min(Number(toIndex), next.length));
  next.splice(boundedIndex, 0, id);
  massRenewalOrderedIds = next;
  renderMassRenewalOrder();
}

function renderMassRenewalOrder() {
  if (!massRenewalOrderList) return;
  normalizeMassRenewalOrder();
  massRenewalOrderList.replaceChildren();
  massRenewalOrderedIds.forEach((inventoryId, index) => {
    const record = massRenewalRecordForId(inventoryId);
    if (!record) return;
    const row = document.createElement('div');
    row.className = 'mass-renewal-order-row';
    row.dataset.massInventoryId = inventoryId;

    const position = document.createElement('span');
    position.className = 'mass-renewal-order-position';
    position.textContent = String(index + 1);

    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'mass-renewal-drag-handle';
    handle.textContent = '⋮⋮';
    handle.title = 'Ziehen, um die Reihenfolge zu ändern';
    handle.setAttribute('aria-label', `${record.title || 'Anzeige'} verschieben`);
    handle.draggable = true;
    handle.addEventListener('dragstart', event => {
      massRenewalDraggedId = inventoryId;
      row.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', inventoryId);
    });
    handle.addEventListener('dragend', () => {
      massRenewalDraggedId = '';
      for (const item of massRenewalOrderList.querySelectorAll('.mass-renewal-order-row')) item.classList.remove('dragging', 'drag-target');
    });

    const image = document.createElement('img');
    image.className = 'mass-renewal-order-thumb';
    image.alt = '';
    const primary = (record.images || []).find(item => item.isPrimary) || record.images?.[0];
    if (primary) void loadLocalPreview(image, record, primary);

    const main = document.createElement('div');
    main.className = 'mass-renewal-order-main';
    const title = document.createElement('strong');
    title.textContent = record.title || `Anzeige ${record.adId || ''}`;
    const meta = document.createElement('small');
    meta.textContent = `${displayPrice(record)} · ${endDateWithRelativeLabel(record)}`;
    main.append(title, meta);

    const controls = document.createElement('div');
    controls.className = 'mass-renewal-order-buttons';
    const up = document.createElement('button');
    up.type = 'button';
    up.className = 'mass-renewal-order-button';
    up.textContent = '↑';
    up.title = 'Nach oben';
    up.setAttribute('aria-label', `${record.title || 'Anzeige'} nach oben`);
    up.disabled = index === 0;
    up.addEventListener('click', () => moveMassRenewalOrderItem(inventoryId, index - 1));
    const down = document.createElement('button');
    down.type = 'button';
    down.className = 'mass-renewal-order-button';
    down.textContent = '↓';
    down.title = 'Nach unten';
    down.setAttribute('aria-label', `${record.title || 'Anzeige'} nach unten`);
    down.disabled = index === massRenewalOrderedIds.length - 1;
    down.addEventListener('click', () => moveMassRenewalOrderItem(inventoryId, index + 1));
    controls.append(handle, up, down);

    row.addEventListener('dragover', event => {
      if (!massRenewalDraggedId || massRenewalDraggedId === inventoryId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      row.classList.add('drag-target');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-target'));
    row.addEventListener('drop', event => {
      event.preventDefault();
      row.classList.remove('drag-target');
      const draggedId = String(massRenewalDraggedId || event.dataTransfer.getData('text/plain') || '');
      if (!draggedId || draggedId === inventoryId) return;
      const remaining = massRenewalOrderedIds.filter(value => value !== draggedId);
      const targetIndex = remaining.indexOf(inventoryId);
      if (targetIndex < 0) return;
      const rect = row.getBoundingClientRect();
      const afterTarget = event.clientY > rect.top + rect.height / 2;
      remaining.splice(targetIndex + (afterTarget ? 1 : 0), 0, draggedId);
      massRenewalOrderedIds = remaining;
      massRenewalDraggedId = '';
      renderMassRenewalOrder();
    });

    row.append(position, image, main, controls);
    massRenewalOrderList.append(row);
  });
  updateMassRenewalOrderState();
}

function massRenewalItemPublicPending(item, previewRecord = null) {
  const newAdId = String(item?.newAdId || item?.newInventoryId || '');
  const previewAdId = String(previewRecord?.adId || previewRecord?.inventoryId || '');
  if (newAdId && previewRecord && previewAdId === newAdId) return publicAvailabilityPending(previewRecord);
  return item?.publicAvailabilityPending === true || publicAvailabilityPending(previewRecord);
}

function massRenewalItemStatusLabel(item, previewRecord = null) {
  const status = String(item?.status || 'queued');
  if (status === 'queued') return 'Wartet';
  if (status === 'running') return 'Läuft';
  if (status === 'retrying') return 'Wird erneut versucht';
  if (status === 'success' && massRenewalItemPublicPending(item, previewRecord)) return 'Bald Online';
  if (status === 'success') return 'Erfolgreich';
  if (String(item?.stage || '') === 'paid-insertion-required') return 'Kostenpflichtig';
  if (status === 'needs-review') return 'Prüfung erforderlich';
  if (status === 'error') return 'Fehler';
  if (status === 'cancelled') return 'Nicht ausgeführt';
  return 'Status unbekannt';
}

function massRenewalItemStatusClass(item, previewRecord = null) {
  if (String(item?.status || '') === 'success' && massRenewalItemPublicPending(item, previewRecord)) return 'bald-online';
  return String(item?.status || 'queued');
}

function massRenewalPhaseLabels(mode) {
  const fast = normalizeRenewalMode(mode) === RENEWAL_MODE_FAST;
  return {
    1: 'Neue Anzeige einstellen',
    2: fast ? 'Zusätzliche Datenprüfung entfällt' : 'Neue Anzeige kontrollieren',
    3: 'Neue Anzeige finden',
    4: 'Bisherige Anzeige löschen'
  };
}

function massRenewalPhaseModel(item, batch) {
  const fast = normalizeRenewalMode(batch?.renewalMode) === RENEWAL_MODE_FAST;
  const labels = massRenewalPhaseLabels(batch?.renewalMode);
  const states = { 1: 'pending', 2: fast ? 'skipped' : 'pending', 3: 'pending', 4: 'pending' };
  const itemStatus = String(item?.status || 'queued');
  if (itemStatus === 'queued') return { states, labels };
  if (itemStatus === 'cancelled') return { states, labels };
  if (itemStatus === 'success') {
    states[1] = 'success';
    states[2] = fast ? 'skipped' : 'success';
    states[3] = 'success';
    states[4] = 'success';
    return { states, labels };
  }

  const pseudoRecord = {
    adId: item?.newAdId || '',
    renewal: {
      renewalMode: batch?.renewalMode,
      status: item?.renewalStatus || '',
      stage: item?.stage || '',
      newAdId: item?.newAdId || '',
      lastError: item?.lastError || null
    }
  };
  const model = renewalProgressModel(pseudoRecord);
  for (let phase = 1; phase <= 4; phase += 1) {
    if (model?.states?.[phase]) states[phase] = model.states[phase];
  }

  if (['needs-review', 'error'].includes(itemStatus)) {
    const stage = String(item?.stage || '');
    const renewalStatus = String(item?.renewalStatus || '');
    const hasNewId = /^\d+$/.test(String(item?.newAdId || ''));
    let failedPhase = Object.entries(states).find(([, state]) => ['active', 'waiting', 'error'].includes(state))?.[0];
    failedPhase = Number(failedPhase || 0);
    if (!failedPhase) {
      if (!hasNewId || stage === 'start-failed') failedPhase = 1;
      else if (!fast && (stage === 'reinventorize-failed' || renewalStatus === 'reinventorizing')) failedPhase = 2;
      else if (stage.startsWith('source-delete') || stage === 'replacement-ready' || renewalStatus === 'verified') failedPhase = 4;
      else failedPhase = 3;
    }
    if (fast && failedPhase === 2) failedPhase = 3;
    states[failedPhase] = 'error';
  }
  return { states, labels };
}

function massRenewalRowSeverity(item, phaseModel) {
  const status = String(item?.status || 'queued');
  const phaseStates = Object.values(phaseModel?.states || {}).map(value => String(value || 'pending'));
  if (status === 'error') return 'error';
  if (status === 'needs-review') return 'needs-review';
  if (phaseStates.includes('error')) return 'error';
  if (status === 'running' || status === 'retrying' || phaseStates.some(state => state === 'active' || state === 'waiting')) return 'active';
  if (status === 'success' && phaseStates.every(state => state === 'success' || state === 'skipped')) return 'success';
  return 'neutral';
}

function massRenewalActivePhase(phaseModel) {
  for (let phase = 1; phase <= 4; phase += 1) {
    if (phaseModel?.states?.[phase] === 'active' || phaseModel?.states?.[phase] === 'waiting') return phase;
  }
  return null;
}

function massRenewalItemDetail(item, batch, phaseModel = massRenewalPhaseModel(item, batch)) {
  const status = String(item?.status || 'queued');
  if (String(item?.stage || '') === 'paid-insertion-required') return 'Kleinanzeigen verlangt eine kostenpflichtige Einstellung – manuelle Entscheidung erforderlich.';
  if (['needs-review', 'error'].includes(status)) return 'Weitere Prüfung erforderlich.';
  if (status === 'success' && item?.newAdId) return `Neue Anzeigen-ID ${item.newAdId}`;
  if (status === 'queued') return 'Wartet auf Start';
  if (status === 'cancelled') return 'Nicht ausgeführt – der Vorgang wurde vorher beendet.';
  if (status === 'running' || status === 'retrying') {
    const activePhase = massRenewalActivePhase(phaseModel) || 1;
    return `Schritt ${activePhase} von 4: ${phaseModel.labels[activePhase]}`;
  }
  const failedPhase = Object.entries(phaseModel?.states || {}).find(([, state]) => state === 'error')?.[0];
  if (failedPhase) return `Schritt ${failedPhase} – Prüfung erforderlich: ${phaseModel.labels[failedPhase]}`;
  return 'Prüfung erforderlich.';
}

function massRenewalPreviewRecord(item) {
  const candidates = [
    String(item?.newInventoryId || ''),
    String(item?.newAdId || ''),
    String(item?.inventoryId || '')
  ].filter(Boolean);
  for (const id of candidates) {
    const record = [...currentRecords, ...currentTrashRecords].find(entry => String(entry?.inventoryId || '') === id || String(entry?.adId || '') === id);
    if (record) return record;
  }
  return null;
}

function massRenewalRetryActionLabel(item) {
  const stage = String(item?.stage || '');
  const renewalStatus = String(item?.renewalStatus || '');
  const hasRenewal = Boolean(item?.renewalId);
  const hasNewId = /^\d+$/.test(String(item?.newAdId || ''));
  if (stage === 'paid-insertion-required') return 'Später erneut versuchen';
  if (hasRenewal && hasNewId && (stage === 'replacement-ready' || stage.startsWith('source-delete') || renewalStatus === 'verified')) return 'Austausch abschließen';
  if (hasRenewal && hasNewId) return 'Erneut prüfen';
  if (!hasNewId || !hasRenewal || ['start-failed', 'recovery-session-missing'].includes(stage)) return 'Neu inserieren erneut starten';
  return 'Letzten Schritt erneut starten';
}

function renderMassRenewalPhaseStrip(item, batch) {
  const phaseModel = massRenewalPhaseModel(item, batch);
  const strip = document.createElement('div');
  strip.className = 'mass-renewal-phase-strip';
  strip.setAttribute('aria-label', 'Fortschritt des Neu-Inserats');
  for (let phase = 1; phase <= 4; phase += 1) {
    const marker = document.createElement('span');
    const state = String(phaseModel.states[phase] || 'pending');
    marker.className = `mass-renewal-phase ${state}`;
    marker.textContent = state === 'success' ? '✓' : String(phase);
    const description = state === 'success'
      ? `Abgeschlossen · ${phaseModel.labels[phase]}`
      : `${phase} · ${phaseModel.labels[phase]}`;
    marker.title = description;
    marker.setAttribute('aria-label', description);
    strip.append(marker);
  }
  return { strip, phaseModel };
}

function massRenewalRetryKey(batchId, index) {
  return `${String(batchId || '')}:${Number(index)}`;
}

function renderMassRenewalItems(container, batch, { summary = false } = {}) {
  if (!container) return;
  container.replaceChildren();
  for (const item of batch?.items || []) {
    const row = document.createElement('div');
    const itemStatus = String(item.status || 'queued');
    const summaryTone = summary && itemStatus === 'success'
      ? ' mass-renewal-summary-success'
      : summary && ['needs-review', 'error'].includes(itemStatus)
        ? ' mass-renewal-summary-error'
        : '';
    row.className = `mass-renewal-result-row${summaryTone}`;

    const index = document.createElement('span');
    index.className = 'mass-renewal-result-index';
    index.textContent = String(Number(item.index || 0) + 1);

    const thumb = document.createElement('img');
    thumb.className = 'mass-renewal-result-thumb';
    thumb.alt = '';
    const previewRecord = massRenewalPreviewRecord(item);
    const primary = (previewRecord?.images || []).find(image => image.isPrimary) || previewRecord?.images?.[0];
    if (previewRecord && primary) void loadLocalPreview(thumb, previewRecord, primary);

    const main = document.createElement('div');
    main.className = 'mass-renewal-result-main';
    const title = document.createElement('strong');
    title.textContent = item.title || `Anzeige ${item.sourceAdId || ''}`;
    const { strip, phaseModel } = renderMassRenewalPhaseStrip(item, batch);
    index.className = `mass-renewal-result-index ${massRenewalRowSeverity(item, phaseModel)}`;
    const detail = document.createElement('small');
    detail.textContent = massRenewalItemDetail(item, batch, phaseModel);
    main.append(title, detail);

    const right = document.createElement('div');
    right.className = `mass-renewal-result-status-slot${summary ? ' mass-renewal-result-actions' : ''}`;
    const retryKey = massRenewalRetryKey(batch?.batchId, item.index);
    const retryLocked = massRenewalRetryInFlight.has(retryKey) || ['running', 'retrying'].includes(String(item.status || ''));
    const attention = summary && (['needs-review', 'error'].includes(String(item.status || '')) || retryLocked);
    if (!attention) {
      const status = document.createElement('span');
      status.className = `mass-renewal-status ${massRenewalItemStatusClass(item, previewRecord)}`;
      status.textContent = massRenewalItemStatusLabel(item, previewRecord);
      right.append(status);
    }
    if (attention) {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'secondary';
      retry.disabled = retryLocked;
      retry.textContent = retryLocked ? 'Prüfung läuft …' : massRenewalRetryActionLabel(item);
      retry.addEventListener('click', async () => {
        if (massRenewalRetryInFlight.has(retryKey)) return;
        massRenewalRetryInFlight.add(retryKey);
        retry.disabled = true;
        retry.textContent = 'Prüfung läuft …';
        try {
          currentMassRenewalBatch = await runtimeMessage({ type: 'RETRY_MASS_RENEWAL_ITEM', batchId: batch.batchId, index: item.index });
          massRenewalRetryInFlight.delete(retryKey);
          setMassRenewalStep(3);
          renderMassRenewalBatch(currentMassRenewalBatch);
        } catch (error) {
          massRenewalRetryInFlight.delete(retryKey);
          retry.disabled = false;
          retry.textContent = massRenewalRetryActionLabel(item);
          setStatus('error', 'Wiederholung konnte nicht gestartet werden', friendlyErrorMessage(error));
        }
      });
      right.append(retry);
    }
    row.append(index, thumb, main, strip, right);
    container.append(row);
  }
}

function renderMassRenewalSummary(batch) {
  setMassRenewalStep(4, { completeCurrent: true });
  const counts = batch?.counts || {};
  if (massRenewalSummaryCount) {
    const parts = [`${Number(counts.success || 0)} erfolgreich`, `${Number(counts.attention || 0)} mit Prüfbedarf`];
    if (Number(counts.cancelled || 0)) parts.push(`${Number(counts.cancelled || 0)} nicht ausgeführt`);
    massRenewalSummaryCount.textContent = parts.join(' · ');
  }
  renderMassRenewalItems(massRenewalSummaryList, batch, { summary: true });
}

function massRenewalCountsFromItems(batch) {
  const items = Array.isArray(batch?.items) ? batch.items : [];
  return {
    total: items.length,
    success: items.filter(item => String(item?.status || '') === 'success').length,
    attention: items.filter(item => ['needs-review', 'error'].includes(String(item?.status || ''))).length,
    cancelled: items.filter(item => String(item?.status || '') === 'cancelled').length,
    queued: items.filter(item => String(item?.status || '') === 'queued').length,
    running: items.filter(item => ['running', 'retrying'].includes(String(item?.status || ''))).length
  };
}

function normalizeMassRenewalBatchSnapshot(batch) {
  if (!batch) return null;
  const items = Array.isArray(batch.items) ? batch.items : [];
  return { ...batch, items, counts: massRenewalCountsFromItems(batch) };
}

function renderMassRenewalBatch(batch) {
  batch = normalizeMassRenewalBatchSnapshot(batch);
  currentMassRenewalBatch = batch || null;
  if (!batch) return;
  setMassRenewalKicker(batch.renewalMode);
  if (['complete', 'complete-with-attention', 'stopped', 'stopped-with-attention'].includes(String(batch.status || ''))) {
    renderMassRenewalSummary(batch);
    const counts = batch.counts || {};
    const baldOnlineCount = (batch.items || []).filter(item => String(item?.status || '') === 'success' && item?.publicAvailabilityPending === true).length;
    const stopped = String(batch.status || '').startsWith('stopped');
    const attention = Number(counts.attention || 0);
    if (stopped) {
      const paidRequired = (batch.items || []).some(item => String(item?.stage || '') === 'paid-insertion-required');
      setStatus(paidRequired ? 'waiting' : 'ready', paidRequired ? 'Kostenpflichtiges Inserieren erkannt – Lauf angehalten' : 'Neu inserieren beendet', paidRequired ? 'Kleinanzeigen verlangt für mindestens eine Anzeige eine Gebühr. Es wurde keine Zahlung ausgelöst.' : `${Number(counts.success || 0) + attention} von ${Number(counts.total || 0)} abgeschlossen`, '', { badgeLabel: paidRequired ? 'Prüfen' : 'Beendet' });
      if (massRenewalIntro) massRenewalIntro.textContent = paidRequired ? '„Mehrere neu inserieren“ wurde vor weiteren Anzeigen angehalten. Entscheide manuell, ob du die kostenpflichtige Einstellung durchführen möchtest.' : 'Der Vorgang wurde wie gewünscht beendet. Prüfe die Ergebnisse und starte erforderliche Schritte bei Bedarf erneut.';
    } else if (attention > 0) {
      setStatus('waiting', 'Teilweise abgeschlossen', 'Einige Anzeigen benötigen weitere Prüfung.', '', { facts: `${Number(counts.success || 0)} erfolgreich · ${attention} prüfen`, badgeLabel: 'Prüfen' });
    } else if (baldOnlineCount > 0) {
      setStatus('waiting', 'Neu inserieren abgeschlossen – Bald Online', '', '', { facts: `${Number(counts.success || 0)} erfolgreich · ${baldOnlineCount} Bald Online`, badgeLabel: 'Bald Online' });
    } else {
      setStatus('ready', 'Neu inserieren abgeschlossen', '', '', { facts: `${Number(counts.success || 0)} von ${Number(counts.total || 0)} erfolgreich`, badgeLabel: 'Abgeschlossen' });
    }
    updateMassRenewalCloseAccessibility(batch);
    return;
  }
  setMassRenewalStep(3);
  const counts = batch.counts || {};
  const stopping = batch.stopAfterCurrentRequested === true;
  if (massRenewalStopAfterCurrent) {
    massRenewalStopAfterCurrent.disabled = stopping;
    massRenewalStopAfterCurrent.textContent = stopping ? 'Stoppt nach aktueller Anzeige' : 'Nach aktueller Anzeige stoppen';
  }
  if (stopping && massRenewalIntro) massRenewalIntro.textContent = 'Die aktuelle Anzeige wird noch vollständig abgeschlossen. Danach werden keine weiteren Anzeigen mehr gestartet.';
  updateMassRenewalCloseAccessibility(batch);
  const current = (batch.items || []).find(item => ['running', 'retrying'].includes(String(item.status || '')));
  if (massRenewalProgressTitle) massRenewalProgressTitle.textContent = current ? `Wird gerade bearbeitet: ${current.title}` : 'Nächste Anzeige wird vorbereitet …';
  const completedCount = Number(counts.success || 0) + Number(counts.attention || 0);
  if (massRenewalProgressCount) massRenewalProgressCount.textContent = current
    ? `${completedCount} von ${Number(counts.total || 0)} abgeschlossen · 1 wird gerade bearbeitet`
    : `${completedCount} von ${Number(counts.total || 0)} abgeschlossen`;
  renderMassRenewalItems(massRenewalProgressList, batch);
}

function updateMassRenewalCloseAccessibility(batch = currentMassRenewalBatch) {
  if (!massRenewalClose) return;
  const running = String(batch?.status || '') === 'running';
  const label = running ? 'Fenster schließen – Vorgang läuft im Hintergrund weiter' : 'Dialog schließen';
  massRenewalClose.title = label;
  massRenewalClose.setAttribute('aria-label', label);
}

function isMassRenewalTerminalStatus(status) {
  return ['complete', 'complete-with-attention', 'stopped', 'stopped-with-attention'].includes(String(status || ''));
}

function shouldApplyMassRenewalRecoverySnapshot(batch) {
  if (!batch) return true;
  if (!isMassRenewalTerminalStatus(batch.status)) return true;
  const currentBatchId = String(currentMassRenewalBatch?.batchId || '');
  const incomingBatchId = String(batch.batchId || '');
  return Boolean(currentBatchId && incomingBatchId && currentBatchId === incomingBatchId);
}

function applyMassRenewalBatchSnapshot(batch, { forceOpen = false, recoveryOnly = false, source = 'direct' } = {}) {
  batch = normalizeMassRenewalBatchSnapshot(batch);
  if (recoveryOnly && batch && !shouldApplyMassRenewalRecoverySnapshot(batch)) {
    void logAppEvent('UI_MASS_RENEWAL_TERMINAL_REHYDRATION_IGNORED', {
      source: String(source || 'automatic'),
      incomingBatchId: batch.batchId || null,
      incomingStatus: batch.status || null,
      trackedBatchId: currentMassRenewalBatch?.batchId || null,
      trackedStatus: currentMassRenewalBatch?.status || null,
      selectedCount: massRenewalSelectedIds.size,
      orderedCount: massRenewalOrderedIds.length
    });
    return currentMassRenewalBatch;
  }
  currentMassRenewalBatch = batch || null;
  syncActionsActivityIndicator();
  if (!batch) return null;
  if (forceOpen && massRenewalDialog && !massRenewalDialog.open) massRenewalDialog.showModal();
  if (massRenewalDialog?.open) renderMassRenewalBatch(batch);
  return batch;
}

async function refreshMassRenewalBatchStatus({ forceOpen = false, recoveryOnly = false, source = 'status-refresh' } = {}) {
  const batch = await runtimeMessage({ type: 'GET_MASS_RENEWAL_BATCH_STATUS' }).catch(() => null);
  return applyMassRenewalBatchSnapshot(batch, { forceOpen, recoveryOnly, source });
}

function closeMassRenewalDialog() {
  if (massRenewalDialog?.open) massRenewalDialog.close();
}

function syncMassRenewalUiFromLock() {
  if (!massRenewalButton) return;
  const massOwned = insertionLockActive() && (String(currentInsertionLock?.kind || '') === 'mass-renewal' || Boolean(currentInsertionLock?.massBatchId));
  const gate = accountGateModel();
  massRenewalButton.disabled = !gate.allowed || (insertionLockActive() && !massOwned);
  massRenewalButton.title = !gate.allowed
    ? gate.tooltip
    : massOwned
      ? 'Laufenden Vorgang „Mehrere neu inserieren“ anzeigen'
      : insertionLockActive()
        ? insertionLockUiText()
        : 'Mehrere gespeicherte Anzeigen nacheinander neu inserieren';
  if (typeof scheduleActionsStateSnapshot === 'function') scheduleActionsStateSnapshot('mass-renewal-button-sync');
}

      function updateContext(context = {}) {
        if (Array.isArray(context.records)) currentRecords = context.records;
        if (Array.isArray(context.trashRecords)) currentTrashRecords = context.trashRecords;
        if (context.renewalConfiguration) currentRenewalConfiguration = context.renewalConfiguration;
        if (context.insertionLock) currentInsertionLock = context.insertionLock;
      }
      function status() { return Object.freeze({ currentBatch: currentMassRenewalBatch, selectedIds: [...massRenewalSelectedIds], orderedIds: [...massRenewalOrderedIds], draggedId: massRenewalDraggedId }); }
      function resetSelection() {
        currentMassRenewalBatch = null; massRenewalSelectedIds = new Set(); massRenewalOrderedIds = []; massRenewalDraggedId = '';
        setMassRenewalKicker(currentRenewalConfiguration.renewalMode); setMassRenewalStep(1); updateMassRenewalCloseAccessibility(null); renderMassRenewalSelection();
      }
      function install() {
        if (installed) return; installed = true;
        massRenewalButton?.addEventListener('click', async () => {
          if (!requireAccountBoundAction()) return;
          try {
            const existing = await runtimeMessage({ type: 'GET_MASS_RENEWAL_BATCH_STATUS' }).catch(() => null);
            if (existing && String(existing.status || '') === 'running') { currentMassRenewalBatch = existing; setMassRenewalKicker(existing.renewalMode); renderMassRenewalBatch(existing); } else resetSelection();
            if (massRenewalDialog && !massRenewalDialog.open) massRenewalDialog.showModal();
            void logAppEvent('USER_MASS_RENEWAL_OPENED', { existingBatchId: existing?.batchId || null, status: existing?.status || null, renewalMode: normalizeRenewalMode(existing?.renewalMode || currentRenewalConfiguration.renewalMode) });
          } catch (error) { setStatus('error', 'Neu inserieren nicht geöffnet', friendlyErrorMessage(error)); }
        });
        massRenewalNext?.addEventListener('click', () => {
          if (!requireAccountBoundAction()) { updateMassRenewalSelectionState(); return; }
          const visibleIds = [...(massRenewalSelectionBody?.querySelectorAll('tr[data-mass-inventory-id]') || [])].map(row => String(row.dataset.massInventoryId || '')).filter(id => id && massRenewalSelectedIds.has(id));
          if (!visibleIds.length) return; massRenewalOrderedIds = visibleIds; renderMassRenewalOrder(); setMassRenewalStep(2);
          void logAppEvent('USER_MASS_RENEWAL_ORDER_OPENED', { itemCount: massRenewalOrderedIds.length, inventoryIds: [...massRenewalOrderedIds] });
        });
        massRenewalBack?.addEventListener('click', () => { setMassRenewalStep(1); updateMassRenewalSelectionState(); });
        massRenewalStart?.addEventListener('click', async () => {
          if (!requireAccountBoundAction()) { updateMassRenewalOrderState(); return; }
          const inventoryIds = [...massRenewalOrderedIds]; if (!inventoryIds.length || inventoryIds.length > MASS_RENEWAL_MAX_ITEMS) return; if (inventoryIds.some(id => !massRenewalSelectedIds.has(String(id)))) return;
          massRenewalStart.disabled = true; setMassRenewalStep(3); if (massRenewalProgressTitle) massRenewalProgressTitle.textContent = 'Anzeigen werden neu inseriert …';
          try { const batch = await runtimeMessage({ type: 'START_MASS_RENEWAL_BATCH', inventoryIds }); currentMassRenewalBatch = batch; renderMassRenewalBatch(batch); setStatus('', 'Neu inserieren gestartet', `${inventoryIds.length} Anzeigen werden nacheinander verarbeitet.`, '', { badgeLabel: 'Info' }); void logAppEvent('USER_MASS_RENEWAL_STARTED', { batchId: batch?.batchId || null, itemCount: inventoryIds.length, inventoryIds, renewalMode: batch?.renewalMode || null }); }
          catch (error) { setMassRenewalStep(2); updateMassRenewalOrderState(); setStatus('error', 'Neu inserieren nicht gestartet', 'Der Vorgang konnte nicht gestartet werden.'); }
        });
        massRenewalStopAfterCurrent?.addEventListener('click', async () => {
          const batch = currentMassRenewalBatch; if (!batch || String(batch.status || '') !== 'running' || batch.stopAfterCurrentRequested === true) return;
          const confirmed = await confirmAction({ title: 'Vorgang nach aktueller Anzeige stoppen?', text: 'Die aktuell laufende Anzeige wird noch vollständig abgeschlossen. Danach werden keine weiteren Anzeigen mehr gestartet.', detail: 'Bereits abgeschlossene Anzeigen bleiben unverändert. Noch nicht gestartete Anzeigen werden als nicht ausgeführt markiert.', confirmLabel: 'Nach aktueller Anzeige stoppen', cancelLabel: 'Weiterlaufen lassen', danger: true });
          if (!confirmed) return; massRenewalStopAfterCurrent.disabled = true;
          try { currentMassRenewalBatch = await runtimeMessage({ type: 'REQUEST_MASS_RENEWAL_STOP_AFTER_CURRENT', batchId: batch.batchId }); renderMassRenewalBatch(currentMassRenewalBatch); setStatus('ready', 'Der Vorgang wird nach der aktuellen Anzeige beendet.', 'Die aktuelle Anzeige wird noch abgeschlossen. Danach startet keine weitere Anzeige.'); void logAppEvent('USER_MASS_RENEWAL_STOP_AFTER_CURRENT_REQUESTED', { batchId: batch.batchId, currentIndex: batch.currentIndex ?? null }); }
          catch (error) { massRenewalStopAfterCurrent.disabled = false; setStatus('error', 'Stopp nicht vorgemerkt', 'Bitte versuche es erneut.'); }
        });
        massRenewalClose?.addEventListener('click', closeMassRenewalDialog); massRenewalCancel?.addEventListener('click', closeMassRenewalDialog); massRenewalDone?.addEventListener('click', closeMassRenewalDialog);
        massRenewalDialog?.addEventListener('cancel', event => { event.preventDefault(); closeMassRenewalDialog(); });
      }
      return Object.freeze({ install, updateContext, status, resetSelection, renderSelection: renderMassRenewalSelection, applyBatchSnapshot: applyMassRenewalBatchSnapshot, refreshStatus: refreshMassRenewalBatchStatus, syncFromLock: syncMassRenewalUiFromLock, updateSelectionState: updateMassRenewalSelectionState, updateOrderState: updateMassRenewalOrderState, close: closeMassRenewalDialog });
    }
  });
  globalThis.KRDeps?.register?.('KRMassRenewalUiController', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
