(() => {
  'use strict';

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
      if (countMismatch) return { terminal: true, kind: 'waiting', badgeLabel: 'Prüfen', facts, processed, total, percent: 100, title: 'Erfassung abgeschlossen – Anzahl prüfen', text: `Kleinanzeigen meldet ${total} laufende Anzeigen.` };
      if (reconciliationIssue) return { terminal: true, kind: 'waiting', badgeLabel: 'Prüfen', facts: '', processed, total, percent: total > 0 ? percent : 100, title: 'Bestand prüfen', text: 'Die beiden Prüfungen liefern unterschiedliche Ergebnisse.' };
      return { terminal: true, kind: 'waiting', badgeLabel: 'Prüfen', facts, processed, total, percent: total > 0 ? percent : 100, title: 'Erfassung teilweise abgeschlossen', text: 'Einige Anzeigen benötigen weitere Prüfung.' };
    }
    const stopPending = state?.stopAfterCurrentRequested === true;
    const title = stopPending ? 'Stopp vorgemerkt' : state?.retryAdId ? 'Erneuter Versuch' : ((state?.currentAdId || state?.currentTitle) ? 'Wird gerade erfasst' : 'Anzeigen werden erfasst …');
    const text = stopPending ? 'Die aktuelle Anzeige wird noch abgeschlossen.' : total > 0 ? `${processed} von ${total} Anzeigen sind abgeschlossen.` : 'Die Erfassung wird vorbereitet.';
    return { terminal: false, kind: '', badgeLabel: 'Info', facts: '', processed, total, percent, title, text };
  }

  const API = Object.freeze({
    inventoryCaptureBulkProgressModel,
    create(options = {}) {
      const document = options.document || globalThis.document;
      const elements = options.elements || {};
      const {
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
        inventoryCaptureResultDetails, inventoryCaptureCancel, inventoryCaptureStart,
        inventoryCaptureStopAfterCurrent, inventoryCaptureDone, inventoryCaptureProgressShortcut,
        inventoryCaptureProgressShortcutTitle, inventoryCaptureProgressShortcutText
      } = elements;
      const RENEWAL_MODE_SAFE = String(options.safeMode || 'safe');
      const RENEWAL_MODE_FAST = String(options.fastMode || 'fast');
      const INVENTORY_SCOPE_ALL = String(options.scopeAll || 'all');
      const INVENTORY_SCOPE_NEW_ONLY = String(options.scopeNewOnly || 'new-only');
      const normalizeRenewalMode = options.normalizeRenewalMode || (value => value === RENEWAL_MODE_FAST ? RENEWAL_MODE_FAST : RENEWAL_MODE_SAFE);
      const loadLocalPreview = options.loadLocalPreview || (async () => {});
      const appendDerivedListingDateBadge = options.appendDerivedListingDateBadge || ((container) => container);
      const categoryLabel = options.categoryLabel || (() => '–');
      const artLabel = options.artLabel || (() => '–');
      const displayPriceWithType = options.displayPriceWithType || (() => '–');
      const endDateWithRelativeLabel = options.endDateWithRelativeLabel || (() => '–');
      const listingDatePresentation = options.listingDatePresentation || (() => ({ label: 'Eingestellt' }));
      const listingDateLabel = options.listingDateLabel || (() => '–');
      const formatDate = options.formatDate || (value => String(value || ''));
      const normalizeInventoryScope = value => String(value || '').toLowerCase() === INVENTORY_SCOPE_ALL ? INVENTORY_SCOPE_ALL : INVENTORY_SCOPE_NEW_ONLY;

      function inventoryScopeLabel(scope) {
        return normalizeInventoryScope(scope) === INVENTORY_SCOPE_ALL ? 'Gesamten Bestand neu einlesen' : 'Nur neue Anzeigen erfassen';
      }

      function inventoryCaptureSummaryText(scope, mode, { completed = false } = {}) {
        const newOnly = normalizeInventoryScope(scope) === INVENTORY_SCOPE_NEW_ONLY;
        const fast = normalizeRenewalMode(mode) === RENEWAL_MODE_FAST;
        const scopeText = completed
          ? (newOnly ? 'Nur neue Anzeigen wurden erfasst. Bereits gespeicherte Anzeigen blieben unverändert.' : 'Alle laufenden Anzeigen wurden neu eingelesen und bereits gespeicherte Daten aktualisiert.')
          : (newOnly ? 'Nur neue Anzeigen werden erfasst. Bereits gespeicherte Anzeigen bleiben unverändert.' : 'Alle laufenden Anzeigen werden neu eingelesen und bereits gespeicherte Daten aktualisiert.');
        const verificationText = completed
          ? (fast ? 'Die Schnellprüfung reduzierte zusätzliche Prüfungen; einzelne Angaben konnten dabei abgeleitet werden.' : 'Alle verfügbaren Angaben wurden direkt geprüft.')
          : (fast ? 'Die Schnellprüfung reduziert zusätzliche Prüfungen; einzelne Angaben können dabei abgeleitet werden.' : 'Alle verfügbaren Angaben werden direkt geprüft.');
        return `${scopeText} ${verificationText} Auf Kleinanzeigen selbst wird nichts geändert.`;
      }

      function setInventoryCaptureSteps(mode, step, terminalKind = '') {
        const bulkMode = mode === 'bulk';
        const finalStep = bulkMode ? 4 : 3;
        for (const item of inventoryCaptureDialog?.querySelectorAll('[data-capture-step]') || []) {
          const number = Number(item.dataset.captureStep || 0);
          const bulkOnly = item.dataset.bulkOnly === 'true';
          item.classList.toggle('hidden', bulkOnly && !bulkMode);
          const visibleNumber = !bulkMode && number === 4 ? 3 : number;
          const badge = item.querySelector('span');
          if (badge) badge.textContent = String(visibleNumber);
          item.classList.remove('phase-pending', 'phase-active', 'phase-success', 'phase-error', 'phase-waiting');
          if (bulkOnly && !bulkMode) continue;
          if (step === 1) item.classList.add(number === 1 ? 'phase-active' : 'phase-pending');
          else if (step === 2) item.classList.add(number === 1 ? 'phase-success' : number === 2 ? 'phase-active' : 'phase-pending');
          else if (bulkMode && step === 3) item.classList.add(number < 3 ? 'phase-success' : number === 3 ? 'phase-active' : 'phase-pending');
          else if (step === finalStep || (!bulkMode && step === 3)) {
            const resultNumber = 4;
            if (number < resultNumber) item.classList.add('phase-success');
            else item.classList.add(terminalKind === 'success' ? 'phase-success' : terminalKind === 'waiting' ? 'phase-waiting' : 'phase-error');
          }
        }
      }

      function setInventoryCaptureProgress({ title, text = '', percent = 0, count = '' } = {}) {
        if (inventoryCaptureProgressTitle) inventoryCaptureProgressTitle.textContent = title || 'Erfassung läuft …';
        if (inventoryCaptureProgressText) inventoryCaptureProgressText.textContent = text || '';
        const bounded = Math.max(0, Math.min(100, Number(percent) || 0));
        if (inventoryCaptureProgressFill) inventoryCaptureProgressFill.style.width = `${bounded}%`;
        if (inventoryCaptureProgressTrack) inventoryCaptureProgressTrack.setAttribute('aria-valuenow', String(Math.round(bounded)));
        if (inventoryCaptureProgressCount) inventoryCaptureProgressCount.textContent = count || '';
      }

      function renderInventoryCaptureResultDetails(record) {
        if (!inventoryCaptureResultDetails) return;
        inventoryCaptureResultDetails.replaceChildren();
        const hasRecord = Boolean(record && (record.inventoryId || record.adId));
        inventoryCaptureResultDetails.classList.toggle('hidden', !hasRecord);
        if (!hasRecord) return;
        const card = document.createElement('article');
        card.className = 'inventory-capture-result-card';
        const cover = document.createElement('img');
        cover.className = 'inventory-capture-result-cover';
        cover.alt = `Titelbild von ${record.title || `Anzeige ${record.adId || ''}`}`;
        const primaryImage = (record.images || []).find(image => image?.isPrimary) || record.images?.[0] || null;
        if (primaryImage) void loadLocalPreview(cover, record, primaryImage); else cover.classList.add('is-empty');
        const body = document.createElement('div'); body.className = 'inventory-capture-result-card-body';
        const title = document.createElement('strong'); title.className = 'inventory-capture-result-card-title'; title.textContent = record.title || `Anzeige ${record.adId || 'ohne ID'}`;
        const facts = document.createElement('div'); facts.className = 'inventory-capture-result-facts';
        const rows = [['Kategorie', categoryLabel(record)], ['Art', artLabel(record)], ['Preis', displayPriceWithType(record)], ['Endet am', endDateWithRelativeLabel(record)], [listingDatePresentation(record).label, listingDateLabel(record)]];
        for (const [labelText, valueText] of rows) {
          const row = document.createElement('div'); row.className = 'inventory-capture-result-fact';
          const label = document.createElement('span'); label.textContent = labelText;
          const value = document.createElement('strong'); value.textContent = valueText || '–';
          if (labelText === listingDatePresentation(record).label) appendDerivedListingDateBadge(value, record);
          row.append(label, value); facts.append(row);
        }
        const footer = document.createElement('div'); footer.className = 'inventory-capture-result-card-footer';
        footer.textContent = `${record.capturedAt ? `Gespeichert ${formatDate(record.capturedAt)}` : 'Gespeichert'}${record.adId ? ` · ID ${record.adId}` : ''}`;
        body.append(title, facts, footer); card.append(cover, body); inventoryCaptureResultDetails.append(card);
      }

      function showResult({ kind, title, text, meta = '', record = null, mode } = {}) {
        inventoryCaptureConfirmPanel?.classList.add('hidden'); inventoryCaptureProgressPanel?.classList.add('hidden'); inventoryCaptureResultPanel?.classList.remove('hidden');
        inventoryCaptureCancel?.classList.add('hidden'); inventoryCaptureStart?.classList.add('hidden'); inventoryCaptureStopAfterCurrent?.classList.add('hidden'); inventoryCaptureDone?.classList.remove('hidden');
        inventoryCaptureResult?.classList.remove('success', 'error', 'waiting'); inventoryCaptureResult?.classList.add(kind === 'success' ? 'success' : kind === 'waiting' ? 'waiting' : 'error');
        if (inventoryCaptureResultTitle) inventoryCaptureResultTitle.textContent = title || 'Erfassung abgeschlossen';
        if (inventoryCaptureResultText) inventoryCaptureResultText.textContent = text || '';
        if (inventoryCaptureResultMeta) inventoryCaptureResultMeta.textContent = meta || '';
        renderInventoryCaptureResultDetails(record);
        if (inventoryCaptureClose) { inventoryCaptureClose.title = 'Dialog schließen'; inventoryCaptureClose.setAttribute('aria-label', 'Dialog schließen'); }
        setInventoryCaptureSteps(mode, mode === 'bulk' ? 4 : 3, kind);
      }

      function syncBulkTerminalSteps(mode, state, kind) {
        if (mode !== 'bulk') return;
        const steps = [...(inventoryCaptureDialog?.querySelectorAll('[data-capture-step]') || [])];
        const reconciliationStep = steps.find(item => Number(item.dataset.captureStep || 0) === 3);
        const resultStep = steps.find(item => Number(item.dataset.captureStep || 0) === 4);
        if (!reconciliationStep || !resultStep) return;
        reconciliationStep.classList.remove('phase-pending', 'phase-active', 'phase-success', 'phase-error', 'phase-waiting', 'phase-skipped');
        const status = String(state?.reconciliationStatus || ''); const stage = String(state?.stage || '');
        if (status === 'confirmed') reconciliationStep.classList.add('phase-success'); else if (stage === 'reconciliation-mismatch' || stage === 'reconciliation-interrupted') reconciliationStep.classList.add('phase-waiting'); else reconciliationStep.classList.add('phase-skipped');
        resultStep.classList.remove('phase-pending', 'phase-active', 'phase-success', 'phase-error', 'phase-waiting', 'phase-skipped');
        resultStep.classList.add(kind === 'success' ? 'phase-success' : kind === 'waiting' ? 'phase-waiting' : 'phase-error');
      }

      function createInventoryCandidateVisual(candidate, { selectable = false, highlighted = false, selectedAdId = '', storageState = 'unknown', onSelect = null } = {}) {
        const card = document.createElement(selectable ? 'label' : 'div');
        const selected = highlighted || String(candidate?.adId || '') === String(selectedAdId || '');
        card.className = `inventory-candidate-card${selected ? ' is-selected' : ''}`;
        if (selectable) {
          const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'inventoryCaptureCandidate'; radio.value = String(candidate.adId); radio.checked = String(candidate.adId) === String(selectedAdId || '');
          radio.setAttribute('aria-label', `Anzeige ${candidate.title || candidate.adId} auswählen`);
          radio.addEventListener('change', () => { if (radio.checked && typeof onSelect === 'function') onSelect(candidate.adId); }); card.append(radio);
        }
        const makePlaceholder = () => { const placeholder = document.createElement('span'); placeholder.className = 'inventory-candidate-thumb-placeholder'; placeholder.textContent = 'Kein Bild'; return placeholder; };
        if (/^https:\/\/img\.kleinanzeigen\.de\//i.test(String(candidate?.thumbnailUrl || ''))) {
          const image = document.createElement('img'); image.className = 'inventory-candidate-thumb'; image.alt = `Titelbild von ${candidate.title || `Anzeige ${candidate.adId}`}`; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'; image.src = String(candidate.thumbnailUrl); image.addEventListener('error', () => image.replaceWith(makePlaceholder()), { once: true }); card.append(image);
        } else card.append(makePlaceholder());
        const copy = document.createElement('span'); copy.className = 'inventory-candidate-copy';
        const titleRow = document.createElement('span'); titleRow.className = 'inventory-candidate-title-row';
        const title = document.createElement('span'); title.className = 'inventory-candidate-title'; title.textContent = candidate?.title || `Anzeige ${candidate?.adId || ''}`; titleRow.append(title);
        if (selectable && (storageState === 'new' || storageState === 'trash')) {
          const badge = document.createElement('span'); badge.className = `inventory-candidate-badge ${storageState}`; badge.textContent = storageState === 'new' ? 'NEU' : 'PAPIERKORB'; badge.title = storageState === 'new' ? 'Noch nicht im ausgewählten Inventar gespeichert' : 'Diese Anzeige liegt im lokalen Papierkorb'; titleRow.append(badge);
        }
        const meta = document.createElement('span'); meta.className = 'inventory-candidate-meta'; meta.textContent = `Anzeigen-ID ${candidate?.adId || 'unbekannt'}`;
        copy.append(titleRow, meta); card.append(copy); return card;
      }

      function renderInventoryCaptureCandidates({ candidates = [], selectedAdId = '', storageStateFor = () => 'unknown', onSelect = null } = {}) {
        if (!inventoryCaptureCandidateList) return;
        inventoryCaptureCandidateList.replaceChildren();
        if (!candidates.length) { const empty = document.createElement('p'); empty.className = 'inventory-capture-candidate-empty'; empty.textContent = 'Keine geöffnete eigene Anzeige mit stabiler Anzeigen-ID gefunden.'; inventoryCaptureCandidateList.append(empty); return; }
        for (const candidate of candidates) inventoryCaptureCandidateList.append(createInventoryCandidateVisual(candidate, { selectable: true, selectedAdId, storageState: storageStateFor(candidate.adId), onSelect }));
      }

      function renderInventoryCaptureSelectedCandidate({ mode, candidate, selectedAdId = '', storageStateFor = () => 'unknown' } = {}) {
        if (!inventoryCaptureSelectedCandidate) return;
        inventoryCaptureSelectedCandidate.replaceChildren(); inventoryCaptureSelectedCandidate.classList.toggle('hidden', mode !== 'single' || !candidate);
        if (candidate) inventoryCaptureSelectedCandidate.append(createInventoryCandidateVisual(candidate, { selectedAdId, storageState: storageStateFor(candidate.adId) }));
      }

      function renderInventoryCaptureBulkCurrentCandidate({ mode, dialogState, state } = {}) {
        if (!inventoryCaptureBulkCurrentCandidate) return;
        inventoryCaptureBulkCurrentCandidate.replaceChildren();
        const adId = String(state?.retryAdId || state?.currentAdId || '').trim(); const title = String(state?.retryTitle || state?.currentTitle || '').trim(); const thumbnailUrl = String(state?.retryThumbnailUrl || state?.currentThumbnailUrl || '').trim();
        const visible = mode === 'bulk' && dialogState === 'progress' && /^\d+$/.test(adId); inventoryCaptureBulkCurrentCandidate.classList.toggle('hidden', !visible); if (!visible) return;
        inventoryCaptureBulkCurrentCandidate.append(createInventoryCandidateVisual({ adId, title: title || `Anzeige ${adId}`, thumbnailUrl }, { highlighted: true }));
      }

      function setCandidateLoading() {
        if (!inventoryCaptureCandidateList) return;
        const loading = document.createElement('p'); loading.className = 'inventory-capture-candidate-empty'; loading.textContent = 'Geöffnete eigene Anzeigen werden gesucht …'; inventoryCaptureCandidateList.replaceChildren(loading);
      }
      function setCandidateMeta(profileName, count) { if (inventoryCaptureConfirmMeta) inventoryCaptureConfirmMeta.textContent = `${profileName ? `Profil: ${profileName} · ` : ''}${count} ${count === 1 ? 'geöffnete eigene Anzeige gefunden' : 'geöffnete eigene Anzeigen gefunden'}`; }
      function setStartDisabled(disabled) { if (inventoryCaptureStart) inventoryCaptureStart.disabled = Boolean(disabled); }

      function renderInventoryCaptureOptions({ mode, dialogState, scope, verificationMode } = {}) {
        const bulkConfirm = mode === 'bulk' && dialogState === 'confirm'; inventoryCaptureOptions?.classList.toggle('hidden', !bulkConfirm); if (!bulkConfirm) return;
        const normalizedScope = normalizeInventoryScope(scope); const normalizedMode = normalizeRenewalMode(verificationMode); const newOnly = normalizedScope === INVENTORY_SCOPE_NEW_ONLY; const fast = normalizedMode === RENEWAL_MODE_FAST;
        inventoryCaptureScopeAll?.setAttribute('aria-pressed', String(!newOnly)); inventoryCaptureScopeNewOnly?.setAttribute('aria-pressed', String(newOnly)); inventoryCaptureVerificationFast?.setAttribute('aria-pressed', String(fast)); inventoryCaptureVerificationSafe?.setAttribute('aria-pressed', String(!fast));
        if (inventoryCaptureScopeDescription) inventoryCaptureScopeDescription.textContent = newOnly ? 'Bereits gespeicherte Anzeigen werden nicht erneut eingelesen. Nur neu hinzugekommene Anzeigen werden vollständig erfasst.' : 'Alle laufenden Anzeigen werden vollständig neu eingelesen. Bereits gespeicherte Daten werden dabei aktualisiert.';
        if (inventoryCaptureVerificationDescription) inventoryCaptureVerificationDescription.textContent = fast ? 'Schnellere Erfassung mit weniger zusätzlichen Prüfungen. Einige Angaben können dabei abgeleitet werden.' : 'Alle verfügbaren Angaben werden direkt geprüft. Dauert entsprechend länger.';
        if (inventoryCaptureConfirmTitle) inventoryCaptureConfirmTitle.textContent = 'Auswahl im Überblick'; if (inventoryCaptureConfirmText) inventoryCaptureConfirmText.textContent = inventoryCaptureSummaryText(normalizedScope, normalizedMode);
      }

      function setInventoryCaptureModeNotice({ mode, dialogState, verificationMode, scope } = {}) {
        if (!inventoryCaptureModeNotice || !inventoryCaptureModeScope || !inventoryCaptureModeVerification || !inventoryCaptureModeText) return;
        if (mode !== 'bulk' || dialogState === 'confirm') { inventoryCaptureModeNotice.classList.add('hidden'); inventoryCaptureModeScope.textContent = ''; inventoryCaptureModeVerification.textContent = ''; inventoryCaptureModeText.textContent = ''; return; }
        const normalized = normalizeRenewalMode(verificationMode); const normalizedScope = normalizeInventoryScope(scope); inventoryCaptureModeNotice.classList.remove('hidden'); inventoryCaptureModeScope.textContent = inventoryScopeLabel(normalizedScope); inventoryCaptureModeVerification.textContent = normalized === RENEWAL_MODE_FAST ? 'Schnellprüfung' : 'Vollprüfung'; inventoryCaptureModeText.textContent = inventoryCaptureSummaryText(normalizedScope, normalized, { completed: dialogState === 'result' });
      }

      function configureDialog({ mode, profileName = '', scope, verificationMode } = {}) {
        inventoryCaptureDialog?.querySelector('.inventory-capture-stepper')?.classList.toggle('single-mode', mode !== 'bulk');
        inventoryCaptureConfirmPanel?.classList.remove('hidden'); inventoryCaptureProgressPanel?.classList.add('hidden'); inventoryCaptureResultPanel?.classList.add('hidden'); inventoryCaptureCancel?.classList.remove('hidden'); inventoryCaptureStart?.classList.remove('hidden'); inventoryCaptureStopAfterCurrent?.classList.add('hidden');
        if (inventoryCaptureStopAfterCurrent) { inventoryCaptureStopAfterCurrent.disabled = false; inventoryCaptureStopAfterCurrent.textContent = 'Nach aktueller Anzeige stoppen'; }
        inventoryCaptureDone?.classList.add('hidden'); inventoryCaptureCandidateSection?.classList.toggle('hidden', mode !== 'single'); inventoryCaptureSelectedCandidate?.classList.add('hidden'); inventoryCaptureSelectedCandidate?.replaceChildren(); inventoryCaptureBulkCurrentCandidate?.classList.add('hidden'); inventoryCaptureBulkCurrentCandidate?.replaceChildren();
        setStartDisabled(mode === 'single');
        if (inventoryCaptureClose) { inventoryCaptureClose.title = 'Dialog schließen'; inventoryCaptureClose.setAttribute('aria-label', 'Dialog schließen'); }
        setInventoryCaptureSteps(mode, 1); renderInventoryCaptureOptions({ mode, dialogState: 'confirm', scope, verificationMode }); setInventoryCaptureModeNotice({ mode, dialogState: 'confirm', verificationMode, scope });
        if (mode === 'bulk') {
          if (inventoryCaptureKicker) inventoryCaptureKicker.textContent = 'ANZEIGEN ERFASSEN'; if (inventoryCaptureTitle) inventoryCaptureTitle.textContent = 'Anzeigen erfassen'; if (inventoryCaptureIntro) inventoryCaptureIntro.textContent = 'Zur Sicherheit wird „Meine Anzeigen“ zuerst aktualisiert. Wähle anschließend, welche Anzeigen neu eingelesen werden sollen und wie sie geprüft werden. Danach wird dein Anzeigenbestand zur Sicherheit ein zweites Mal geprüft. Nur wenn beide Prüfungen übereinstimmen, werden lokal gespeicherte Anzeigen, die online nicht mehr vorhanden sind, in den Papierkorb verschoben.'; if (inventoryCaptureConfirmTitle) inventoryCaptureConfirmTitle.textContent = 'Auswahl im Überblick'; if (inventoryCaptureConfirmText) inventoryCaptureConfirmText.textContent = inventoryCaptureSummaryText(scope, verificationMode); if (inventoryCaptureConfirmMeta) inventoryCaptureConfirmMeta.textContent = `${profileName ? `Profil: ${profileName} · ` : ''}Quelle: „Meine Anzeigen“`; if (inventoryCaptureStart) inventoryCaptureStart.textContent = 'Erfassung starten';
        } else {
          if (inventoryCaptureKicker) inventoryCaptureKicker.textContent = 'GEÖFFNETE ANZEIGE ERFASSEN'; if (inventoryCaptureTitle) inventoryCaptureTitle.textContent = 'Geöffnete Anzeige auswählen'; if (inventoryCaptureIntro) inventoryCaptureIntro.textContent = 'Wähle die Anzeige aus, die du erfassen möchtest. Ist dieselbe Anzeige mehrfach geöffnet, wird sie nur einmal angezeigt.'; if (inventoryCaptureConfirmTitle) inventoryCaptureConfirmTitle.textContent = 'Anzeige auswählen'; if (inventoryCaptureConfirmText) inventoryCaptureConfirmText.textContent = 'Anzeigendaten und Bilder werden gelesen und lokal im Inventar gespeichert. Die Anzeige auf Kleinanzeigen wird nicht verändert.'; if (inventoryCaptureConfirmMeta) inventoryCaptureConfirmMeta.textContent = `${profileName ? `Profil: ${profileName} · ` : ''}Geöffnete eigene Anzeigen werden gesucht …`; if (inventoryCaptureStart) inventoryCaptureStart.textContent = 'Ausgewählte Anzeige erfassen';
        }
      }

      function beginProgress({ mode, scope, verificationMode, title, text } = {}) {
        inventoryCaptureOptions?.classList.add('hidden'); setInventoryCaptureModeNotice({ mode, dialogState: 'progress', verificationMode, scope }); inventoryCaptureConfirmPanel?.classList.add('hidden'); inventoryCaptureResultPanel?.classList.add('hidden'); inventoryCaptureProgressPanel?.classList.remove('hidden'); inventoryCaptureCancel?.classList.add('hidden'); inventoryCaptureStart?.classList.add('hidden'); inventoryCaptureStopAfterCurrent?.classList.add('hidden'); inventoryCaptureDone?.classList.add('hidden'); setInventoryCaptureSteps(mode, 2); setInventoryCaptureProgress({ title, text, percent: 4, count: '' });
        if (inventoryCaptureClose) { const label = 'Fenster schließen – Vorgang läuft im Hintergrund weiter'; inventoryCaptureClose.title = label; inventoryCaptureClose.setAttribute('aria-label', label); }
      }

      function syncProgressShortcut({ visible = false, title = '', text = '', severity = '' } = {}) {
        if (!inventoryCaptureProgressShortcut) return;
        inventoryCaptureProgressShortcut.classList.toggle('hidden', !visible); inventoryCaptureProgressShortcut.classList.remove('is-active', 'is-success', 'is-error', 'is-waiting');
        if (!visible) { if (inventoryCaptureProgressShortcutTitle) inventoryCaptureProgressShortcutTitle.textContent = ''; if (inventoryCaptureProgressShortcutText) inventoryCaptureProgressShortcutText.textContent = ''; return; }
        if (visible && severity) inventoryCaptureProgressShortcut.classList.add(`is-${severity}`);
        if (inventoryCaptureProgressShortcutTitle) inventoryCaptureProgressShortcutTitle.textContent = title;
        if (inventoryCaptureProgressShortcutText) inventoryCaptureProgressShortcutText.textContent = text;
      }

      return Object.freeze({
        setInventoryCaptureSteps, setInventoryCaptureProgress, renderInventoryCaptureResultDetails, showResult, syncBulkTerminalSteps,
        bulkProgressModel: inventoryCaptureBulkProgressModel, renderInventoryCaptureCandidates,
        renderInventoryCaptureSelectedCandidate, renderInventoryCaptureBulkCurrentCandidate, setCandidateLoading, setCandidateMeta,
        setStartDisabled, inventoryScopeLabel, inventoryCaptureSummaryText, renderInventoryCaptureOptions,
        setInventoryCaptureModeNotice, configureDialog, beginProgress, syncProgressShortcut
      });
    }
  });
  globalThis.KRDeps?.register?.('KRInventoryCaptureView', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
