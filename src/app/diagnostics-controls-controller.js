(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const doc = options.document || globalThis.document;
      const elements = options.elements || {};
      const runtimeMessage = typeof options.runtimeMessage === 'function' ? options.runtimeMessage : async () => ({});
      const logEvent = typeof options.logEvent === 'function' ? options.logEvent : async () => {};
      const DiagnosticZip = options.DiagnosticZip;
      const profileTransferLocked = typeof options.profileTransferLocked === 'function' ? options.profileTransferLocked : () => false;
      const insertionLockActive = typeof options.insertionLockActive === 'function' ? options.insertionLockActive : () => false;
      const getInsertionLock = typeof options.getInsertionLock === 'function' ? options.getInsertionLock : () => ({ locked: false });
      const getBulkState = typeof options.getBulkState === 'function' ? options.getBulkState : () => ({ startInFlight: false, state: null });
      const singleInventoryBusy = typeof options.singleInventoryBusy === 'function' ? options.singleInventoryBusy : () => false;
      const onEmergencyReset = typeof options.onEmergencyReset === 'function' ? options.onEmergencyReset : async () => {};
      let resetInFlight = false;
      let emergencyConfirmUntil = 0;
      let emergencyConfirmationRevision = 0;
      let emergencyStatusRevision = 0;
      const NORMAL_TEXT = 'Laufende Vorgänge zurücksetzen';
      const CONFIRM_TEXT = 'Zur Bestätigung erneut klicken';
      const NORMAL_TOOLTIP = 'Beendet aktive oder festhängende lokale Vorgänge und bereinigt Laufzeitreferenzen. Gespeicherte Anzeigen, Papierkorb, Profile, Bilder und Einstellungen bleiben erhalten; auf Kleinanzeigen wird nichts gelöscht oder verändert.';
      const CONFIRM_TOOLTIP = 'Innerhalb von 10 Sekunden erneut klicken, um laufende Vorgänge zurückzusetzen.';

      function resetBlockReason() {
        if (resetInFlight) return 'Diagnose-Reset läuft bereits.';
        if (profileTransferLocked()) return 'Diagnose-Reset blockiert: Eine Profilübertragung läuft.';
        if (insertionLockActive()) {
          const lock = getInsertionLock() || {};
          const kind = String(lock.kind || 'Inserierung');
          const owner = String(lock.ownerId || '').trim();
          const status = String(lock.status || '').trim();
          const stage = String(lock.stage || '').trim();
          const details = [kind, owner ? `Owner ${owner}` : '', status || stage ? `${status || 'ohne Status'} / ${stage || 'ohne Stage'}` : ''].filter(Boolean).join(' · ');
          return `Diagnose-Reset blockiert durch Inserierungs-Lock: ${details}.`;
        }
        const bulk = getBulkState() || {};
        if (bulk.startInFlight || String(bulk.state?.status || '') === 'running' || Boolean(bulk.state?.retryAdId)) return 'Diagnose-Reset blockiert: Eine Erfassung läuft.';
        if (singleInventoryBusy()) return 'Diagnose-Reset blockiert: Die Erfassung der geöffneten Anzeige läuft.';
        return '';
      }

      function resetBusy() { return Boolean(resetBlockReason()); }

      function syncResetUi() {
        if (!elements.resetButton) return;
        const reason = resetBlockReason();
        const busy = Boolean(reason);
        elements.resetButton.disabled = busy;
        elements.resetButton.title = reason || 'Diagnose für einen neuen Messlauf zurücksetzen';
        if (elements.resetBlockReason) elements.resetBlockReason.textContent = reason;
      }

      function syncEmergencyUi() {
        if (!elements.emergencyButton) return;
        const confirming = emergencyConfirmUntil > Date.now();
        elements.emergencyButton.textContent = confirming ? CONFIRM_TEXT : NORMAL_TEXT;
        elements.emergencyButton.title = confirming ? CONFIRM_TOOLTIP : NORMAL_TOOLTIP;
        elements.emergencyButton.setAttribute('aria-label', confirming ? CONFIRM_TOOLTIP : NORMAL_TOOLTIP);
      }

      function setEmergencyStatus(text) {
        emergencyStatusRevision += 1;
        if (elements.status) elements.status.textContent = String(text || '');
        return emergencyStatusRevision;
      }

      function clearEmergencyConfirmationStatus(confirmationRevision, statusRevision) {
        if (confirmationRevision !== emergencyConfirmationRevision || statusRevision !== emergencyStatusRevision) return false;
        if (elements.status) elements.status.textContent = '';
        emergencyStatusRevision += 1;
        return true;
      }

      async function exportZip() {
        if (!elements.zipButton) return;
        elements.zipButton.disabled = true;
        if (elements.status) elements.status.textContent = 'Diagnosedaten werden erstellt …';
        void logEvent('USER_DIAGNOSTIC_ZIP_CLICK', {});
        try {
          const exported = await runtimeMessage({ type: 'GET_DIAGNOSTIC_EXPORT' });
          const entries = (exported.files || []).map(file => ({ name: file.name, data: file.text }));
          if (!entries.length) throw new Error('Diagnoseexport enthält keine Dateien.');
          const blob = await DiagnosticZip.createZip(entries);
          const url = URL.createObjectURL(blob);
          const link = doc.createElement('a');
          link.href = url;
          link.download = exported.filename || `kleinanzeigen-renewal-diagnose-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
          doc.body.append(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          if (elements.status) elements.status.textContent = `${entries.length} Diagnosedateien als ZIP erstellt.`;
          void logEvent('USER_DIAGNOSTIC_ZIP_SUCCEEDED', { fileCount: entries.length, bytes: blob.size });
        } catch (error) {
          if (elements.status) elements.status.textContent = 'Diagnosedaten konnten nicht erstellt werden. Bitte versuche es erneut.';
          void logEvent('USER_DIAGNOSTIC_ZIP_FAILED', { message: error?.message || String(error) }, 'error');
        } finally {
          elements.zipButton.disabled = false;
        }
      }

      async function resetDiagnostics() {
        if (resetBusy()) { syncResetUi(); return; }
        resetInFlight = true;
        syncResetUi();
        if (elements.zipButton) elements.zipButton.disabled = true;
        if (elements.status) elements.status.textContent = 'Diagnose wird zurückgesetzt …';
        try {
          await runtimeMessage({ type: 'RESET_DIAGNOSTICS' });
          if (elements.status) elements.status.textContent = 'Diagnose zurückgesetzt. Der nächste Export enthält nur Daten ab jetzt.';
          void logEvent('USER_DIAGNOSTIC_RESET_SUCCEEDED', {});
        } catch (error) {
          if (elements.status) elements.status.textContent = String(error?.message || 'Diagnose konnte nicht zurückgesetzt werden.');
          void logEvent('USER_DIAGNOSTIC_RESET_FAILED', { message: error?.message || String(error) }, 'error');
        } finally {
          resetInFlight = false;
          if (elements.zipButton) elements.zipButton.disabled = false;
          syncResetUi();
        }
      }

      async function emergencyReset() {
        const now = Date.now();
        if (now > emergencyConfirmUntil) {
          emergencyConfirmUntil = now + 10000;
          const confirmationRevision = ++emergencyConfirmationRevision;
          syncEmergencyUi();
          const statusRevision = setEmergencyStatus('Notfall-Reset: Noch einmal klicken. Gespeicherte Anzeigen, Papierkorb, Profile, Bilder und Einstellungen bleiben erhalten; auf Kleinanzeigen wird nichts gelöscht.');
          setTimeout(() => {
            if (confirmationRevision !== emergencyConfirmationRevision || Date.now() < emergencyConfirmUntil) return;
            emergencyConfirmUntil = 0;
            syncEmergencyUi();
            clearEmergencyConfirmationStatus(confirmationRevision, statusRevision);
          }, 10100);
          return;
        }
        emergencyConfirmUntil = 0;
        emergencyConfirmationRevision += 1;
        syncEmergencyUi();
        if (elements.emergencyButton) elements.emergencyButton.disabled = true;
        setEmergencyStatus('Laufende Vorgänge werden zurückgesetzt …');
        try {
          const result = await runtimeMessage({ type: 'RESET_ACTIVE_WORKFLOWS' });
          setEmergencyStatus(`Laufende Vorgänge zurückgesetzt${Number(result?.affected || 0) ? ` (${result.affected} Zustand/Zustände)` : ''}. Gespeicherte Daten blieben erhalten.`);
          void logEvent('USER_ACTIVE_WORKFLOWS_RESET_SUCCEEDED', { affected: Number(result?.affected || 0) });
          await onEmergencyReset(result || {});
        } catch (error) {
          setEmergencyStatus(String(error?.message || 'Laufende Vorgänge konnten nicht zurückgesetzt werden.'));
          void logEvent('USER_ACTIVE_WORKFLOWS_RESET_FAILED', { message: error?.message || String(error) }, 'error');
        } finally {
          if (elements.emergencyButton) elements.emergencyButton.disabled = false;
          syncEmergencyUi();
        }
      }

      elements.zipButton?.addEventListener('click', () => { void exportZip(); });
      elements.resetButton?.addEventListener('click', () => { void resetDiagnostics(); });
      elements.emergencyButton?.addEventListener('click', () => { void emergencyReset(); });
      syncEmergencyUi();
      syncResetUi();
      return Object.freeze({ resetBlockReason, syncResetUi, resetDiagnostics });
    }
  });

  globalThis.KRDeps?.register('KRDiagnosticsControlsController', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
