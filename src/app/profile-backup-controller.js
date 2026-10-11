(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const document = options.document || globalThis.document;
      const crypto = options.crypto || globalThis.crypto;
      const ProfileBackup = options.ProfileBackup;
      const ProfileBackupStorageService = options.ProfileBackupStorageService || globalThis.KRDeps?.optional?.('KRProfileBackupStorageService') || (typeof require === 'function' ? require('./profile-backup-storage-service.js') : null);
      let profileBackupStorage = options.profileBackupStorage || null;
      function requireProfileBackupStorage() {
        if (profileBackupStorage) return profileBackupStorage;
        if (!ProfileBackupStorageService?.create) throw new Error('profile-backup-storage-service.js must load before profile backup storage is used');
        profileBackupStorage = ProfileBackupStorageService.create({ indexedDB: options.indexedDB || globalThis.indexedDB, IDBKeyRange: options.IDBKeyRange || globalThis.IDBKeyRange });
        return profileBackupStorage;
      }
      const DiagnosticZip = options.DiagnosticZip;
      const UNASSIGNED_PROFILE_ID = String(options.unassignedProfileId || '__unassigned__');
      const elements = options.elements || {};
      const { profileManagerDialog, profileManagerClose, profileManagerDone, profileImportButton, profileBackupFileInput } = elements;
      const getStartBlocker = options.getStartBlocker || (() => '');
      const setProfileManagerStatus = options.setProfileManagerStatus || (() => {});
      const renderProfileManager = options.renderProfileManager || (() => {});
      const getProfileState = options.getProfileState || (() => null);
      const syncDiagnosticResetUi = options.syncDiagnosticResetUi || (() => {});
      const runtimeMessage = options.runtimeMessage || (async () => null);
      const loadLocalImageForExport = options.loadLocalImageForExport || (async () => null);
      const downloadGeneratedBlob = options.downloadGeneratedBlob || (() => {});
      const logAppEvent = options.logAppEvent || (async () => {});
      const confirmAction = options.confirmAction || (async () => false);
      const invalidImportError = options.invalidImportError || ((code, message, cause) => Object.assign(new Error(message), { code, technicalMessage: String(cause?.message || cause || '') }));
      const renderProfileSwitcher = options.renderProfileSwitcher || (() => {});
      const refreshInventories = options.refreshInventories || (async () => {});
      const refreshBulkStatus = options.refreshBulkStatus || (async () => {});

      let profileTransferLock = null;
      let profileBackupPickerActive = false;
      let profileBackupPickerCancelledAt = 0;

      function profileTransferLocked() {
        return Boolean(profileTransferLock?.operationId);
      }

      function profileTransferStatusText(lock = profileTransferLock) {
        return String(lock?.kind || '') === 'import' ? 'Profilwiederherstellung läuft …' : 'Profilsicherung läuft …';
      }

      function handleEmergencyWorkflowReset() {
        profileTransferLock = null;
        profileBackupPickerActive = false;
        profileBackupPickerCancelledAt = 0;
        syncProfileTransferUi();
        renderProfileManager();
        setProfileManagerStatus('Laufende Profilsicherung/-wiederherstellung wurde lokal beendet.');
        return { reset: true };
      }

      function syncProfileTransferUi() {
        const locked = profileTransferLocked();
        profileManagerDialog?.classList.toggle('profile-transfer-active', locked);
        for (const root of [document?.querySelector?.('.app-header'), document?.querySelector?.('.app-shell')]) {
          if (root) root.inert = locked;
        }
        if (profileManagerClose) profileManagerClose.disabled = locked;
        if (profileManagerDone) profileManagerDone.disabled = locked;
        if (profileImportButton) {
          profileImportButton.disabled = locked;
          profileImportButton.title = locked ? profileTransferStatusText() : '';
        }
        syncDiagnosticResetUi();
      }

      function acquireProfileTransferLock(kind, profileId = null) {
        if (profileTransferLocked()) throw new Error(profileTransferStatusText());
        const blocker = String(getStartBlocker() || '');
        if (blocker) throw new Error(blocker);
        const operationId = crypto.randomUUID();
        profileTransferLock = { operationId, kind: String(kind || ''), profileId: profileId ? String(profileId) : null, startedAt: new Date().toISOString() };
        syncProfileTransferUi();
        renderProfileManager(getProfileState());
        setProfileManagerStatus(profileTransferStatusText());
        return operationId;
      }

      function releaseProfileTransferLock(operationId) {
        if (!profileTransferLock || String(profileTransferLock.operationId) !== String(operationId || '')) return false;
        profileTransferLock = null;
        syncProfileTransferUi();
        renderProfileManager(getProfileState());
        return true;
      }

      function pickerCancelRecent(now = Date.now()) {
        return Boolean(profileBackupPickerActive || (profileBackupPickerCancelledAt && now - profileBackupPickerCancelledAt < 1000));
      }

      function openProfileBackupPicker() {
        if (profileTransferLocked() || !profileBackupFileInput) return false;
        profileBackupPickerActive = true;
        profileBackupPickerCancelledAt = 0;
        profileBackupFileInput.value = '';
        profileBackupFileInput.click();
        return true;
      }

      function markProfileBackupPickerCancelled() {
        profileBackupPickerCancelledAt = Date.now();
        setTimeout(() => { profileBackupPickerActive = false; }, 150);
      }

      function takeProfileBackupPickerFile() {
        profileBackupPickerActive = false;
        profileBackupPickerCancelledAt = 0;
        return profileBackupFileInput?.files?.[0] || null;
      }

      async function exportProfileBackup(profile) {
        if (!ProfileBackup?.createProfileArchive || !DiagnosticZip?.createZip) throw new Error('Profilsicherung ist nicht verfügbar.');
        const profileId = String(profile?.profileId || '');
        if (!profileId || profileId === UNASSIGNED_PROFILE_ID) throw new Error('Dieses Profil kann nicht gesichert werden.');
        const operationId = acquireProfileTransferLock('export', profileId);
        try {
          setProfileManagerStatus(`Profil „${profile.displayName || 'Profil'}“ wird gesichert …`);
          const [activeInventory, trashEntries] = await Promise.all([
            runtimeMessage({ type: 'LIST_INVENTORIES', profileId }),
            runtimeMessage({ type: 'LIST_TRASH', profileId })
          ]);
          const result = await ProfileBackup.createProfileArchive({ profile, activeInventory, trashEntries }, {
            loadImage: loadLocalImageForExport,
            createZip: DiagnosticZip.createZip,
            extensionVersion: options.extensionVersion?.() || null
          });
          downloadGeneratedBlob(result.blob, result.filename);
          void logAppEvent('USER_PROFILE_BACKUP_EXPORTED', {
            operationId,
            profileId,
            activeInventory: activeInventory.length,
            trashEntries: trashEntries.length,
            imageReferences: Number(result.manifest?.counts?.imageReferences ?? result.manifest?.counts?.images ?? 0),
            uniqueImageFiles: Number(result.manifest?.counts?.uniqueImageFiles ?? result.manifest?.counts?.images ?? 0),
            deduplicatedBytes: Number(result.manifest?.deduplication?.savedBytes || 0)
          });
          setProfileManagerStatus(`Profil gesichert: ${activeInventory.length} Inventareinträge, ${trashEntries.length} Papierkorb-Einträge.`);
          return result;
        } finally {
          releaseProfileTransferLock(operationId);
        }
      }

      async function snapshotProfileIndexedData(profileId) {
        return requireProfileBackupStorage().snapshotProfileIndexedData(profileId);
      }

      async function replaceProfileIndexedData(payload) {
        return requireProfileBackupStorage().replaceProfileIndexedData(payload);
      }


      async function importProfileBackupFile(file) {
        if (!file || !ProfileBackup?.parseProfileArchive) throw new Error('Keine gültige Profilsicherung ausgewählt.');
        const operationId = acquireProfileTransferLock('import');
        try {
          setProfileManagerStatus('Sicherung wird geprüft …');
          let parsed;
          try {
            parsed = await ProfileBackup.parseProfileArchive(file);
          } catch (error) {
            const technicalMessage = String(error?.message || error || '');
            void logAppEvent('PROFILE_BACKUP_IMPORT_VALIDATION_FAILED', { operationId, filename: String(file?.name || ''), message: technicalMessage }, 'warning');
            throw invalidImportError('KR_INVALID_PROFILE_BACKUP', 'Die ausgewählte Datei ist keine gültige Profilsicherung.', error);
          }
          const counts = { activeInventory: parsed.activeInventory.length, trashEntries: parsed.trashEntries.length, images: parsed.images.length };
          const prepared = await runtimeMessage({ type: 'PREPARE_PROFILE_BACKUP_IMPORT', profile: parsed.profile, counts });
          let replaceExisting = false;
          if (prepared.conflict) {
            const confirmed = await confirmAction({
              title: 'Bestehendes Profil vollständig ersetzen?',
              text: `Das vorhandene Profil „${prepared.existingProfile?.displayName || parsed.profile.displayName}“ wird vollständig durch diese Sicherung ersetzt.`,
              detail: `Aktives Inventar und Papierkorb des vorhandenen Profils werden ersetzt. Die Sicherung enthält ${counts.activeInventory} aktive ${counts.activeInventory === 1 ? 'Anzeige' : 'Anzeigen'}, ${counts.trashEntries} ${counts.trashEntries === 1 ? 'Papierkorb-Eintrag' : 'Papierkorb-Einträge'} und ${counts.images} lokale Bilder. Laufende Vorgänge werden nicht übernommen.`,
              confirmLabel: 'Bestehendes Profil vollständig ersetzen',
              danger: true
            });
            if (!confirmed) { setProfileManagerStatus('Import abgebrochen. Es wurden keine Daten verändert.'); return null; }
            replaceExisting = true;
          }

          const targetProfileId = String(prepared.targetProfileId || parsed.profile.profileId);
          const targetProfileName = String(parsed.profile.displayName || 'Importiertes Profil');
          const previous = await snapshotProfileIndexedData(targetProfileId);
          let finalized = null;
          try {
            await replaceProfileIndexedData({ targetProfileId, targetProfileName, activeInventory: parsed.activeInventory, trashEntries: parsed.trashEntries, images: parsed.images });
            finalized = await runtimeMessage({ type: 'FINALIZE_PROFILE_BACKUP_IMPORT', profile: parsed.profile, counts, replaceExisting });
          } catch (error) {
            try {
              const previousActive = previous.records.filter(record => !(String(record?.recordKind || '') === 'trash' || record?.trash?.trashedAt));
              const previousTrash = previous.records.filter(record => String(record?.recordKind || '') === 'trash' || record?.trash?.trashedAt);
              await replaceProfileIndexedData({ targetProfileId, targetProfileName: prepared.existingProfile?.displayName || targetProfileName, activeInventory: previousActive, trashEntries: previousTrash, images: previous.images });
            } catch (rollbackError) {
              void logAppEvent('PROFILE_BACKUP_IMPORT_ROLLBACK_FAILED', { operationId, profileId: targetProfileId, message: String(rollbackError?.message || rollbackError) }, 'error');
              throw new Error(`Profil-Import fehlgeschlagen und die lokale Rücksicherung konnte nicht bestätigt werden: ${error?.message || error}`);
            }
            throw error;
          }

          renderProfileSwitcher(finalized.state);
          await refreshInventories({ profileState: finalized.state }).catch(error => void logAppEvent('PROFILE_BACKUP_IMPORT_REFRESH_FAILED', { operationId, profileId: targetProfileId, message: String(error?.message || error) }, 'warning'));
          await refreshBulkStatus().catch(() => {});
          void logAppEvent('USER_PROFILE_BACKUP_IMPORTED', { operationId, profileId: targetProfileId, replacedExisting: Boolean(finalized.replacedExisting), ...counts });
          setProfileManagerStatus(`Profil importiert: ${counts.activeInventory} Inventareinträge und ${counts.trashEntries} Papierkorb-Einträge wiederhergestellt.`);
          return finalized;
        } finally {
          releaseProfileTransferLock(operationId);
        }
      }

      return Object.freeze({
        locked: profileTransferLocked,
        statusText: profileTransferStatusText,
        syncUi: syncProfileTransferUi,
        release: releaseProfileTransferLock,
        handleEmergencyWorkflowReset,
        pickerCancelRecent,
        openPicker: openProfileBackupPicker,
        markPickerCancelled: markProfileBackupPickerCancelled,
        takePickerFile: takeProfileBackupPickerFile,
        exportProfileBackup,
        importProfileBackupFile,
        snapshotProfileIndexedData,
        replaceProfileIndexedData
      });
    }
  });
  globalThis.KRDeps?.register?.('KRProfileBackupController', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
