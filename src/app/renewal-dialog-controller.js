(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const elements = options.elements || {};
      const {
        renewalStartDialog, renewalStartClose, renewalStartCancel, renewalStartConfirm,
        renewalStartCover, renewalStartTitle, renewalStartSourceId, renewalStartDialogTitle,
        renewalStartDialogText, renewalStartSource, renewalStartSourceLabel, renewalStartSafety,
        renewalStartSafetyTitle, renewalStartSafetyText, renewalPhase1Label, renewalPhase2Label,
        renewalPhase3Label, renewalPhase4Label, renewalStartSteps, renewalStartActions,
        renewalProgressMessage, renewalProgressMessageTitle, renewalProgressMessageText,
        renewalBackgroundHint, renewalProgressActions, renewalProgressClose, renewalProgressView,
        renewalProgressEdit, renewalProgressShortcut, renewalProgressShortcutTitle,
        renewalProgressShortcutText
      } = elements;
      const SAFE = String(options.safeMode || 'safe');
      const FAST = String(options.fastMode || 'fast');
      const normalizeRenewalMode = typeof options.normalizeRenewalMode === 'function'
        ? options.normalizeRenewalMode
        : value => String(value || '').toLowerCase() === FAST ? FAST : SAFE;
      const renewalModeLabel = typeof options.renewalModeLabel === 'function'
        ? options.renewalModeLabel
        : mode => normalizeRenewalMode(mode) === FAST ? 'Schnellprüfung' : 'Vollprüfung';
      const setRenewalKicker = typeof options.setRenewalKicker === 'function' ? options.setRenewalKicker : () => {};
      const getCurrentConfiguration = typeof options.getCurrentConfiguration === 'function' ? options.getCurrentConfiguration : () => ({ renewalMode: SAFE });
      const getCurrentRecords = typeof options.getCurrentRecords === 'function' ? options.getCurrentRecords : () => [];
      const getCurrentAppNotice = typeof options.getCurrentAppNotice === 'function' ? options.getCurrentAppNotice : () => null;
      const loadLocalPreview = typeof options.loadLocalPreview === 'function' ? options.loadLocalPreview : async () => {};
      const publishUiActivity = typeof options.publishUiActivity === 'function' ? options.publishUiActivity : () => {};
      const openInventoryReadOnly = typeof options.openInventoryReadOnly === 'function' ? options.openInventoryReadOnly : async () => {};
      const openInventoryEdit = typeof options.openInventoryEdit === 'function' ? options.openInventoryEdit : async () => {};

      let dialogMode = 'closed';
      let trackedRenewalId = null;
      let trackedRenewalSourceAdId = null;
      let trackedRenewalNewAdId = null;
      let trackedRenewalSourceRecord = null;
      let dialogResolve = null;
      let installed = false;

      function renewalPhaseElements() {
        return [...(renewalStartSteps?.querySelectorAll('[data-phase]') || [])];
      }

      function setRenewalPhaseStates(states = {}) {
        for (const item of renewalPhaseElements()) {
          const phase = Number(item.dataset.phase || 0);
          const state = String(states[phase] || 'pending');
          item.classList.remove('phase-pending', 'phase-active', 'phase-success', 'phase-error', 'phase-waiting', 'phase-skipped');
          item.classList.add(`phase-${state}`);
        }
      }

      function setRenewalProgressMessage(kind, title, text) {
        renewalProgressMessage?.classList.remove('hidden', 'success', 'error', 'waiting');
        if (kind) renewalProgressMessage?.classList.add(kind);
        if (renewalProgressMessageTitle) renewalProgressMessageTitle.textContent = title || '';
        if (renewalProgressMessageText) renewalProgressMessageText.textContent = text || '';
      }

      function renewalModeForRecord(record) {
        return normalizeRenewalMode(record?.renewal?.renewalMode || getCurrentConfiguration()?.renewalMode);
      }

      function configureRenewalDialogForMode(mode) {
        const fast = normalizeRenewalMode(mode) === FAST;
        renewalStartSafety?.classList.add('info');
        if (renewalPhase1Label) renewalPhase1Label.textContent = 'Neue Anzeige einstellen';
        if (renewalPhase2Label) renewalPhase2Label.textContent = fast ? 'Zusätzliche Datenprüfung entfällt' : 'Neue Anzeige kontrollieren';
        if (renewalPhase3Label) renewalPhase3Label.textContent = 'Neue Anzeige finden';
        if (renewalPhase4Label) renewalPhase4Label.textContent = 'Bisherige Anzeige löschen';
        if (renewalStartSafetyTitle) {
          renewalStartSafetyTitle.textContent = fast
            ? 'Die bisherige Anzeige bleibt online, bis die neue Anzeige sicher unter „Meine Anzeigen“ gefunden wurde.'
            : 'Die bisherige Anzeige bleibt online, bis die neue Anzeige vollständig kontrolliert wurde.';
        }
        if (renewalStartSafetyText) {
          renewalStartSafetyText.innerHTML = fast
            ? 'Bei der Schnellprüfung werden die Inhalte der neuen Anzeige nicht zusätzlich verglichen. Nach dem Löschen prüft die App weiterhin, dass die bisherige Anzeige nicht mehr vorhanden ist. Das Kleinanzeigen-Konto wird weiterhin geprüft und der <b>30-Tage-Papierkorb</b> bleibt aktiv.'
            : 'Nach dem Einstellen werden die Inhalte der neuen Anzeige noch einmal mit den gespeicherten Daten verglichen. Nach dem Löschen prüft die App zusätzlich, dass die bisherige Anzeige nicht mehr vorhanden ist. Der <b>30-Tage-Papierkorb</b> bleibt aktiv.';
        }
      }

      function renewalProgressModel(record) {
        const renewal = record?.renewal || {};
        const status = String(renewal.status || 'draft');
        const stage = String(renewal.stage || 'draft-created');
        const mode = renewalModeForRecord(record);
        const fast = mode === FAST;
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
          states[4] = 'error'; title = 'Austausch nicht abgeschlossen'; text = 'Die neue Anzeige ist bestätigt, aber der Austausch konnte noch nicht abgeschlossen werden. Die bisherige Anzeige bleibt geschützt.'; kind = 'error';
          return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') };
        }
        if (status === 'verification-failed') {
          const platformError = stage === 'platform-error-page'; const earlyFailure = !hasNewId && !phase1Done; let phase = 3;
          if (earlyFailure) phase = 1; else if (!fast && stage === 'reinventorize-failed') phase = 2;
          states[phase] = 'error';
          title = platformError ? 'Kleinanzeigen antwortet nicht' : (phase === 1 ? 'Neu inserieren nicht abgeschlossen' : (phase === 2 ? 'Angaben prüfen' : 'Austausch nicht abgeschlossen'));
          text = platformError ? 'Der Vorgang wurde sicher beendet. Die alte Anzeige wurde nicht entfernt.' : 'Die alte Anzeige wurde nicht entfernt.'; kind = 'error';
          return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') };
        }
        if (!fast && status === 'waiting-for-online') { states[3] = 'waiting'; title = 'Noch nicht online'; text = 'Der bisherige Status bleibt unverändert.'; kind = 'waiting'; return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') }; }
        if (stage.startsWith('source-delete')) { states[4] = 'active'; title = stage === 'source-delete-verification-pending' ? 'Löschung der bisherigen Anzeige wird geprüft …' : 'Bisherige Anzeige wird ersetzt …'; text = 'Die neue Anzeige wurde gemäß dem gewählten Modus bestätigt. Die bisherige Anzeige wird gelöscht und ihre Abwesenheit anschließend unabhängig geprüft.'; return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') }; }
        if (stage === 'replacement-ready' || status === 'verified') { states[4] = 'active'; title = 'Austausch wird abgeschlossen …'; text = fast ? 'Die neue Anzeige wurde im richtigen Profil unter „Meine Anzeigen“ gefunden. Jetzt wird die bisherige Anzeige sicher gelöscht.' : 'Die neue Anzeige wurde vollständig kontrolliert. Jetzt wird die bisherige Anzeige sicher gelöscht.'; return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') }; }
        if (fast && (status === 'verifying' || ['fast-my-ads-opening', 'fast-my-ads-checking'].includes(stage))) { states[3] = 'active'; title = 'Neue Anzeige wird unter „Meine Anzeigen“ gesucht …'; text = 'Schnellprüfung: Es wird bestätigt, dass die neue Anzeige im richtigen Profil unter „Meine Anzeigen“ vorhanden ist.'; return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') }; }
        if (!fast && (status === 'reinventorizing' || ['edit-worker-opening', 'edit-worker-opened', 'saving-candidate'].includes(stage))) { states[2] = 'active'; title = 'Neue Anzeige wird kontrolliert …'; text = 'Die gespeicherten Angaben und Bilder werden noch einmal geprüft.'; return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') }; }
        if (!fast && (status === 'verifying' || ['checking-public-evidence', 'comparing'].includes(stage))) { states[2] = 'success'; states[3] = 'active'; title = stage === 'comparing' ? 'Angaben werden verglichen …' : 'Neue Anzeige wird geprüft …'; text = 'Die neu gelesenen Angaben, Bilder und die Sichtbarkeit werden mit der bisherigen Anzeige abgeglichen.'; return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') }; }
        if (stage === 'publish-submitted' || status === 'submitted') { states[1] = 'active'; title = 'Anzeige wird veröffentlicht …'; text = 'Kleinanzeigen verarbeitet die Veröffentlichung. Die neue Anzeige wird jetzt erkannt.'; return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') }; }
        if (phase1Done) { if (fast) { states[3] = 'active'; title = 'Neue Anzeige wurde erkannt …'; text = 'Schnellprüfung: Die zusätzliche Inhaltsprüfung wird übersprungen. Als Nächstes wird die neue Anzeige unter „Meine Anzeigen“ gesucht.'; } else { states[2] = 'active'; title = 'Neue Anzeige wurde erkannt …'; text = 'Vollprüfung: Als Nächstes wird die neue Anzeige nochmals vollständig kontrolliert.'; } return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') }; }
        states[1] = 'active';
        if (stage.startsWith('image-')) { title = 'Bilder werden eingefügt …'; text = 'Die gespeicherten Bilder werden in der richtigen Reihenfolge eingefügt.'; }
        else if (stage.startsWith('category-')) { title = 'Kategorie und Angaben werden übernommen …'; text = 'Kategorie und erforderliche Angaben werden aus der gespeicherten Anzeige übernommen.'; }
        else if (stage === 'form-verified' || stage === 'auto-publish-ready') { title = 'Alle Angaben sind ausgefüllt'; text = 'Die Angaben wurden geprüft. Als Nächstes wird die neue Anzeige veröffentlicht.'; }
        return { states, title, text, kind, mode, newAdId: String(record?.adId || renewal.newAdId || '') };
      }

      function resetRenewalDialogConfirmation(record) {
        dialogMode = 'confirm'; trackedRenewalSourceRecord = record || null; trackedRenewalId = null; trackedRenewalSourceAdId = String(record?.adId || ''); trackedRenewalNewAdId = null;
        setRenewalKicker('ANZEIGE NEU INSERIEREN');
        if (renewalStartDialogTitle) renewalStartDialogTitle.textContent = 'Anzeige neu inserieren und bisherige ersetzen?';
        if (renewalStartSourceLabel) renewalStartSourceLabel.textContent = 'Bisherige Anzeige';
        if (renewalStartTitle) renewalStartTitle.textContent = record?.title || `Anzeige ${record?.adId || ''}`.trim();
        if (renewalStartSourceId) renewalStartSourceId.textContent = record?.adId ? `Anzeigen-ID ${record.adId}` : 'Gespeicherte Vorlage';
        const mode = normalizeRenewalMode(getCurrentConfiguration()?.renewalMode); configureRenewalDialogForMode(mode); setRenewalKicker('ANZEIGE NEU INSERIEREN', mode);
        if (renewalStartDialogText) renewalStartDialogText.textContent = mode === FAST ? 'Die Anzeige wird mit den gespeicherten Daten neu eingestellt und veröffentlicht. Danach wird geprüft, ob die neue Anzeige im richtigen Profil unter „Meine Anzeigen“ vorhanden ist.' : 'Die Anzeige wird mit den gespeicherten Daten neu eingestellt und veröffentlicht. Danach wird die neue Anzeige nochmals vollständig kontrolliert.';
        renewalStartDialogText?.classList.remove('hidden'); renewalStartSafety?.classList.remove('hidden'); renewalProgressMessage?.classList.add('hidden'); renewalBackgroundHint?.classList.add('hidden'); renewalStartActions?.classList.remove('hidden'); renewalProgressActions?.classList.add('hidden'); renewalProgressView?.classList.add('hidden'); renewalProgressEdit?.classList.add('hidden'); renewalStartSource?.classList.remove('renewal-result-clickable'); if (renewalStartSource) renewalStartSource.onclick = null;
        setRenewalPhaseStates({ 1: 'pending', 2: mode === FAST ? 'skipped' : 'pending', 3: 'pending', 4: 'pending' });
      }

      function showRenewalProgress(record, { forceOpen = false } = {}) {
        if (!record?.renewal?.renewalId) return;
        dialogMode = 'progress'; trackedRenewalId = String(record.renewal.renewalId); trackedRenewalSourceAdId = String(record.renewal.sourceAdId || trackedRenewalSourceAdId || ''); trackedRenewalNewAdId = String(record.adId || record.renewal.newAdId || '') || null;
        const mode = renewalModeForRecord(record); configureRenewalDialogForMode(mode); setRenewalKicker('ANZEIGE WIRD NEU INSERIERT', mode);
        if (renewalStartDialogTitle) renewalStartDialogTitle.textContent = 'Neue Anzeige wird vorbereitet';
        if (renewalStartSourceLabel) renewalStartSourceLabel.textContent = trackedRenewalNewAdId ? 'Neue Anzeige' : 'Bisherige Anzeige';
        if (renewalStartTitle) renewalStartTitle.textContent = record.title || trackedRenewalSourceRecord?.title || `Anzeige ${trackedRenewalSourceAdId}`;
        if (renewalStartSourceId) renewalStartSourceId.textContent = trackedRenewalNewAdId ? `Anzeigen-ID ${trackedRenewalNewAdId}` : `Anzeigen-ID ${trackedRenewalSourceAdId || 'unbekannt'}`;
        if (renewalStartCover) renewalStartCover.alt = `Titelbild: ${record.title || 'laufende Anzeige'}`;
        const progressImage = (record.images || []).find(item => item?.isPrimary) || record.images?.[0]; if (progressImage) void loadLocalPreview(renewalStartCover, record, progressImage);
        renewalStartDialogText?.classList.add('hidden'); renewalStartSafety?.classList.add('hidden'); renewalStartActions?.classList.add('hidden'); renewalProgressActions?.classList.remove('hidden'); renewalProgressView?.classList.add('hidden'); renewalProgressEdit?.classList.add('hidden');
        const model = renewalProgressModel(record); setRenewalPhaseStates(model.states); setRenewalProgressMessage(model.kind, model.title, model.text); renewalBackgroundHint?.classList.toggle('hidden', model.kind === 'error'); renewalProgressShortcut?.classList.remove('hidden');
        if (renewalProgressShortcutTitle) renewalProgressShortcutTitle.textContent = model.kind === 'error' ? `Austausch – Prüfung erforderlich · ${renewalModeLabel(model.mode)}` : `Anzeige wird neu inseriert · ${renewalModeLabel(model.mode)}`;
        if (renewalProgressShortcutText) renewalProgressShortcutText.textContent = model.title;
        publishUiActivity({ id: `renewal:${String(record.renewal.renewalId)}`, slot: 'renewal-shortcut', kind: model.kind === 'error' ? 'error' : model.kind === 'waiting' ? 'waiting' : '', title: renewalProgressShortcutTitle?.textContent || '', text: model.title, createdAt: record.renewal.updatedAt || record.capturedAt || new Date().toISOString(), active: model.kind !== 'error' });
        if (forceOpen && renewalStartDialog && !renewalStartDialog.open) renewalStartDialog.showModal();
      }

      async function showRenewalCompletion(notice, records = getCurrentRecords(), { forceOpen = false } = {}) {
        if (!notice || notice.event !== 'renewal-replacement-completed') return false;
        const newAdId = String(notice.newAdId || ''); if (trackedRenewalId && notice.renewalId && String(notice.renewalId) !== trackedRenewalId) return false;
        dialogMode = 'success'; trackedRenewalId = String(notice.renewalId || trackedRenewalId || ''); trackedRenewalNewAdId = newAdId || trackedRenewalNewAdId;
        const record = (records || []).find(item => String(item?.adId || '') === newAdId) || trackedRenewalSourceRecord || null; const mode = normalizeRenewalMode(notice.renewalMode || SAFE); configureRenewalDialogForMode(mode); setRenewalKicker('AUSTAUSCH ABGESCHLOSSEN', mode);
        if (renewalStartDialogTitle) renewalStartDialogTitle.textContent = 'Geschafft! Anzeige erfolgreich ausgetauscht'; if (renewalStartSourceLabel) renewalStartSourceLabel.textContent = 'Neue Anzeige'; if (renewalStartTitle) renewalStartTitle.textContent = record?.title || `Anzeige ${newAdId}`; if (renewalStartSourceId) renewalStartSourceId.textContent = newAdId ? `Anzeigen-ID ${newAdId}` : 'Neue Anzeige';
        if (record) { const image = (record.images || []).find(item => item?.isPrimary) || record.images?.[0]; if (image) void loadLocalPreview(renewalStartCover, record, image); }
        renewalStartDialogText?.classList.add('hidden'); renewalStartSafety?.classList.add('hidden'); renewalStartActions?.classList.add('hidden'); renewalProgressActions?.classList.remove('hidden'); renewalProgressView?.classList.toggle('hidden', !/^\d+$/.test(newAdId)); renewalProgressEdit?.classList.toggle('hidden', !/^\d+$/.test(newAdId)); setRenewalPhaseStates({ 1: 'success', 2: mode === FAST ? 'skipped' : 'success', 3: 'success', 4: 'success' }); renewalBackgroundHint?.classList.add('hidden');
        setRenewalProgressMessage('success', 'Neu inseriert', mode === FAST ? 'Die neue Anzeige wurde unter „Meine Anzeigen“ gefunden. Die bisherige Anzeige wurde gelöscht, ihr Verschwinden anschließend geprüft und sie bleibt noch 30 Tage im Papierkorb.' : 'Die neue Anzeige wurde vollständig kontrolliert. Die bisherige Anzeige wurde gelöscht, ihr Verschwinden anschließend geprüft und sie bleibt noch 30 Tage als Sicherheitskopie im Papierkorb.'); renewalProgressShortcut?.classList.add('hidden');
        if (/^\d+$/.test(newAdId)) { const open = () => void openInventoryReadOnly({ ...(record || {}), adId: newAdId, inventoryId: record?.inventoryId || newAdId, title: record?.title || '' }).catch(() => {}); renewalStartSource?.classList.add('renewal-result-clickable'); if (renewalStartSource) renewalStartSource.onclick = open; if (renewalProgressView) renewalProgressView.onclick = open; if (renewalProgressEdit) renewalProgressEdit.onclick = () => void openInventoryEdit({ adId: newAdId, inventoryId: record?.inventoryId || newAdId, title: record?.title || '' }).catch(() => {}); }
        if (forceOpen && renewalStartDialog && !renewalStartDialog.open) renewalStartDialog.showModal(); return true;
      }

      function settleRenewalStartDialog(confirmed) {
        const resolve = dialogResolve; dialogResolve = null;
        if (confirmed) { dialogMode = 'progress'; if (renewalStartDialogTitle) renewalStartDialogTitle.textContent = 'Neue Anzeige wird vorbereitet …'; renewalStartDialogText?.classList.add('hidden'); renewalStartSafety?.classList.add('hidden'); renewalStartActions?.classList.add('hidden'); renewalProgressActions?.classList.remove('hidden'); const mode = normalizeRenewalMode(getCurrentConfiguration()?.renewalMode); configureRenewalDialogForMode(mode); setRenewalPhaseStates({ 1: 'active', 2: mode === FAST ? 'skipped' : 'pending', 3: 'pending', 4: 'pending' }); renewalBackgroundHint?.classList.remove('hidden'); setRenewalProgressMessage('', 'Anzeige wird vorbereitet …', mode === FAST ? 'Schnellprüfung: Die gespeicherten Daten werden übernommen. Danach wird geprüft, ob die neue Anzeige unter „Meine Anzeigen“ erscheint.' : 'Vollprüfung: Die gespeicherten Daten werden übernommen. Danach wird die neue Anzeige nochmals vollständig kontrolliert.'); }
        else { dialogMode = 'closed'; if (renewalStartDialog?.open) renewalStartDialog.close('cancelled'); }
        if (resolve) resolve(Boolean(confirmed));
      }

      async function confirmAutomatedRenewalStart(record) {
        if (!renewalStartDialog || typeof renewalStartDialog.showModal !== 'function') throw new Error('Der Bestätigungsdialog kann in dieser App-Ansicht nicht geöffnet werden.');
        if (dialogResolve) settleRenewalStartDialog(false); resetRenewalDialogConfirmation(record); if (renewalStartCover) renewalStartCover.alt = `Titelbild: ${record?.title || 'bisherige Anzeige'}`;
        const primaryImage = (record?.images || []).find(image => image?.isPrimary) || [...(record?.images || [])].sort((a, b) => Number(a?.position || 0) - Number(b?.position || 0))[0]; if (primaryImage) void loadLocalPreview(renewalStartCover, record, primaryImage); renewalStartDialog.showModal(); renewalStartConfirm?.focus(); return await new Promise(resolve => { dialogResolve = resolve; });
      }

      function trackStarted({ renewalId = '', sourceAdId = '', sourceRecord = null } = {}) { trackedRenewalId = String(renewalId || ''); trackedRenewalSourceAdId = String(sourceAdId || ''); trackedRenewalSourceRecord = sourceRecord || null; }
      function trackActive(record) { if (!record?.renewal?.renewalId) return; trackedRenewalId = String(record.renewal.renewalId); trackedRenewalSourceAdId = String(record.renewal.sourceAdId || trackedRenewalSourceAdId || ''); }
      function resetTracking({ closeProgress = false, reason = 'reset' } = {}) { trackedRenewalId = null; trackedRenewalSourceAdId = null; trackedRenewalNewAdId = null; trackedRenewalSourceRecord = null; if (closeProgress && dialogMode === 'progress' && renewalStartDialog?.open) renewalStartDialog.close(reason); if (dialogMode === 'progress') dialogMode = 'closed'; renewalProgressShortcut?.classList.add('hidden'); }
      function status() { return Object.freeze({ mode: dialogMode, trackedRenewalId, trackedRenewalSourceAdId, trackedRenewalNewAdId, trackedRenewalSourceRecord }); }

      function install() {
        if (installed) return; installed = true;
        renewalStartClose?.addEventListener('click', () => { if (dialogMode === 'confirm') settleRenewalStartDialog(false); else if (renewalStartDialog?.open) renewalStartDialog.close('hidden'); });
        renewalStartCancel?.addEventListener('click', () => settleRenewalStartDialog(false));
        renewalStartConfirm?.addEventListener('click', () => settleRenewalStartDialog(true));
        renewalProgressClose?.addEventListener('click', () => { if (renewalStartDialog?.open) renewalStartDialog.close('hidden'); });
        renewalProgressShortcut?.addEventListener('click', () => { const records = getCurrentRecords(); const record = records.find(item => String(item?.renewal?.renewalId || '') === String(trackedRenewalId || '')) || records.find(item => item?.renewal?.autoReplacementAllowed); if (record) showRenewalProgress(record, { forceOpen: true }); else { const notice = getCurrentAppNotice(); if (notice?.event === 'renewal-replacement-completed') void showRenewalCompletion(notice, records, { forceOpen: true }); } });
        renewalStartDialog?.addEventListener('cancel', event => { event.preventDefault(); if (dialogMode === 'confirm') settleRenewalStartDialog(false); else if (renewalStartDialog?.open) renewalStartDialog.close('hidden'); });
      }

      return Object.freeze({ install, status, trackStarted, trackActive, resetTracking, phaseElements: renewalPhaseElements, setPhaseStates: setRenewalPhaseStates, setProgressMessage: setRenewalProgressMessage, configureForMode: configureRenewalDialogForMode, resetConfirmation: resetRenewalDialogConfirmation, showProgress: showRenewalProgress, showCompletion: showRenewalCompletion, settle: settleRenewalStartDialog, confirmStart: confirmAutomatedRenewalStart });
    }
  });
  globalThis.KRDeps?.register?.('KRRenewalDialogController', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
