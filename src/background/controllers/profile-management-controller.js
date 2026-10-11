(() => {
  'use strict';
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before profile-management-controller.js');

  const API = Object.freeze({
    create(options = {}) {
      const {
        ProfileRepository,
        storageLocal,
        profilesKey,
        activeProfileKey,
        selectedProfileKey,
        unassignedProfileId,
        normalizeProfileName,
        randomUUID,
        purgeExpiredTrash,
        readAllInventoryRecords,
        getBulkRunState,
        isTrashRecord,
        readInventoryRecordsForProfile,
        readRenewalSessions,
        readMassRenewalBatch,
        getInventoryRepository,
        logDiagnostic,
        broadcastInventoryChanged,
        invalidateTrashPurgeSchedule
      } = options;
      if (!ProfileRepository?.create) throw new Error('profile management controller requires ProfileRepository');
      if (!storageLocal?.get || !storageLocal?.set || !storageLocal?.remove) throw new Error('profile management controller requires storageLocal');
      for (const [name, value] of Object.entries({ normalizeProfileName, randomUUID, purgeExpiredTrash, readAllInventoryRecords, getBulkRunState, isTrashRecord, readInventoryRecordsForProfile, readRenewalSessions, readMassRenewalBatch, getInventoryRepository, logDiagnostic, broadcastInventoryChanged, invalidateTrashPurgeSchedule })) {
        if (typeof value !== 'function') throw new Error(`profile management controller dependency ${name} is required`);
      }
      if (!profilesKey || !activeProfileKey || !selectedProfileKey || !unassignedProfileId) throw new Error('profile management controller profile constants are required');

      let profileRepository = null;
      function requireProfileRepository() {
        if (profileRepository) return profileRepository;
        profileRepository = ProfileRepository.create({
          storageLocal,
          profilesKey,
          activeProfileKey,
          selectedProfileKey,
          unassignedProfileId,
          normalizeProfileName,
          randomUUID
        });
        return profileRepository;
      }

      async function readProfiles() { return requireProfileRepository().read(); }

      function profilePublicRecord(profile, counts = {}) {
        return {
          profileId: String(profile?.profileId || ''),
          displayName: String(profile?.displayName || ''),
          createdAt: profile?.createdAt || null,
          lastSeenAt: profile?.lastSeenAt || null,
          inventoryCount: Number(counts.inventoryCount || 0),
          trashCount: Number(counts.trashCount || 0),
          totalCount: Number(counts.inventoryCount || 0) + Number(counts.trashCount || 0)
        };
      }

      async function getProfileState() {
        await purgeExpiredTrash();
        const [state, records, run] = await Promise.all([
          readProfiles(),
          readAllInventoryRecords(),
          getBulkRunState().catch(() => null)
        ]);
        const counts = new Map();
        let unassignedInventoryCount = 0;
        let unassignedTrashCount = 0;
        for (const record of records) {
          const profileId = String(record?.profileId || '');
          const trash = isTrashRecord(record);
          if (!profileId) {
            if (trash) unassignedTrashCount += 1;
            else unassignedInventoryCount += 1;
            continue;
          }
          const bucket = counts.get(profileId) || { inventoryCount: 0, trashCount: 0 };
          if (trash) bucket.trashCount += 1;
          else bucket.inventoryCount += 1;
          counts.set(profileId, bucket);
        }
        const profiles = state.profiles
          .map(profile => profilePublicRecord(profile, counts.get(String(profile?.profileId || '')) || {}))
          .sort((a, b) => {
            if (String(a.profileId) === String(state.activeProfileId || '')) return -1;
            if (String(b.profileId) === String(state.activeProfileId || '')) return 1;
            return String(b.lastSeenAt || b.createdAt || '').localeCompare(String(a.lastSeenAt || a.createdAt || ''));
          });
        const validIds = new Set(profiles.map(profile => profile.profileId));
        let selectedProfileId = String(state.selectedProfileId || '');
        const unassignedCount = unassignedInventoryCount + unassignedTrashCount;
        const selectedValid = validIds.has(selectedProfileId) || (selectedProfileId === unassignedProfileId && unassignedCount > 0);
        if (!selectedValid) {
          selectedProfileId = validIds.has(String(state.activeProfileId || ''))
            ? String(state.activeProfileId)
            : (profiles[0]?.profileId || (unassignedCount ? unassignedProfileId : ''));
          if (selectedProfileId) await requireProfileRepository().setSelected(selectedProfileId, 'automatic');
          else await requireProfileRepository().clearSelected();
        }
        return {
          profiles,
          detectedProfileId: state.activeProfileId || null,
          selectedProfileId: selectedProfileId || null,
          unassigned: {
            profileId: unassignedProfileId,
            displayName: 'Nicht zugeordnet',
            inventoryCount: unassignedInventoryCount,
            trashCount: unassignedTrashCount,
            totalCount: unassignedCount
          },
          activeBulkProfileId: run?.status === 'running' || run?.retryAdId ? (run.profileId || null) : null
        };
      }

      async function setSelectedProfile(message) {
        const requested = String(message?.profileId || '');
        const state = await getProfileState();
        if (requested === unassignedProfileId) {
          if (!state.unassigned.totalCount) throw new Error('Es gibt keine nicht zugeordneten Inventareinträge.');
        } else if (!state.profiles.some(profile => profile.profileId === requested)) {
          throw new Error('Das ausgewählte Profil wurde nicht gefunden.');
        }
        await requireProfileRepository().setSelected(requested, 'manual');
        await logDiagnostic('info', 'PROFILE_VIEW_SELECTED', { profileId: requested === unassignedProfileId ? null : requested, unassigned: requested === unassignedProfileId }, { module: 'background', operation: 'profile-management', context: { profileId: requested === unassignedProfileId ? null : requested } }).catch(() => {});
        broadcastInventoryChanged('profile-selected', { profileId: requested });
        return getProfileState();
      }

      function normalizedProfileIdentityName(value) {
        return normalizeProfileName(value).toLocaleLowerCase('de-DE');
      }

      function sanitizeImportedProfileMetadata(profile) {
        const profileId = String(profile?.profileId || '').trim();
        const displayName = normalizeProfileName(profile?.displayName || '');
        if (!profileId || profileId === unassignedProfileId || !displayName) throw new Error('Die Profilsicherung enthält keine gültige Profilidentität.');
        return {
          profileId,
          displayName,
          normalizedName: normalizeProfileName(profile?.normalizedName || displayName) || displayName,
          createdAt: profile?.createdAt || null,
          lastSeenAt: profile?.lastSeenAt || null
        };
      }

      async function assertProfileBackupImportSafe(targetProfileId) {
        const [bulk, renewals, massBatch] = await Promise.all([
          getBulkRunState().catch(() => null),
          readRenewalSessions().catch(() => ({})),
          readMassRenewalBatch().catch(() => null)
        ]);
        if (bulk?.status === 'running' || bulk?.retryAdId) throw new Error('Ein Profil kann während einer laufenden Erfassung nicht wiederhergestellt werden.');
        const activeRenewal = Object.values(renewals || {}).find(session => {
          if (['cancelled', 'replaced'].includes(String(session?.status || ''))) return false;
          return !targetProfileId || !session?.profileId || String(session.profileId) === String(targetProfileId);
        });
        if (activeRenewal) throw new Error('Profil-Import ist nicht möglich, solange ein Renewal-Vorgang aktiv ist.');
        if (massBatch && String(massBatch.status || '') === 'running') throw new Error('Profil-Import ist während eines laufenden Massen-Neuinserats nicht möglich.');
      }

      async function prepareProfileBackupImport(message) {
        const incoming = sanitizeImportedProfileMetadata(message?.profile);
        const state = await readProfiles();
        const identityName = normalizedProfileIdentityName(incoming.normalizedName || incoming.displayName);
        const matches = state.profiles.filter(profile => String(profile?.profileId || '') === incoming.profileId || normalizedProfileIdentityName(profile?.normalizedName || profile?.displayName) === identityName);
        const uniqueMatches = [...new Map(matches.map(profile => [String(profile.profileId), profile])).values()];
        if (uniqueMatches.length > 1) throw new Error('Die Profilsicherung passt zu mehreren lokalen Profilidentitäten. Die Wiederherstellung wurde aus Sicherheitsgründen abgebrochen.');
        const existing = uniqueMatches[0] || null;
        const targetProfileId = String(existing?.profileId || incoming.profileId);
        await assertProfileBackupImportSafe(existing ? targetProfileId : null);
        return {
          ready: true,
          conflict: Boolean(existing),
          replaceExisting: Boolean(existing),
          targetProfileId,
          incomingProfile: incoming,
          existingProfile: existing ? { ...existing } : null,
          counts: {
            activeInventory: Math.max(0, Number(message?.counts?.activeInventory || 0)),
            trashEntries: Math.max(0, Number(message?.counts?.trashEntries || 0)),
            images: Math.max(0, Number(message?.counts?.images || 0))
          }
        };
      }

      async function finalizeProfileBackupImport(message) {
        const incoming = sanitizeImportedProfileMetadata(message?.profile);
        const prepared = await prepareProfileBackupImport({ profile: incoming, counts: message?.counts || {} });
        if (prepared.conflict && message?.replaceExisting !== true) throw new Error('Bestehendes Profil darf nur nach ausdrücklicher Bestätigung vollständig ersetzt werden.');
        const targetProfileId = prepared.targetProfileId;
        await assertProfileBackupImportSafe(prepared.conflict ? targetProfileId : null);
        await requireProfileRepository().persistImportedProfile({
          targetProfileId,
          incoming,
          existingProfile: prepared.existingProfile || null,
          selectedSource: 'profile-backup-import'
        });
        await logDiagnostic('info', 'PROFILE_BACKUP_IMPORTED', {
          profileId: targetProfileId, replacedExisting: prepared.conflict, activeInventory: Number(message?.counts?.activeInventory || 0), trashEntries: Number(message?.counts?.trashEntries || 0), images: Number(message?.counts?.images || 0)
        }, { module: 'background', operation: 'profile-backup', context: { profileId: targetProfileId } }).catch(() => {});
        invalidateTrashPurgeSchedule();
        broadcastInventoryChanged('profile-backup-imported', { profileId: targetProfileId, replacedExisting: prepared.conflict });
        return { imported: true, profileId: targetProfileId, replacedExisting: prepared.conflict, state: await getProfileState() };
      }

      async function deleteProfile(message) {
        await purgeExpiredTrash();
        const profileId = String(message?.profileId || '');
        if (!profileId || profileId === unassignedProfileId) throw new Error('Dieses Profil kann nicht gelöscht werden.');
        const state = await readProfiles();
        const profile = state.profiles.find(item => String(item?.profileId || '') === profileId);
        if (!profile) throw new Error('Das Profil wurde nicht gefunden.');
        const records = await readInventoryRecordsForProfile(profileId);
        const renewals = await readRenewalSessions().catch(() => ({}));
        if (Object.values(renewals).some(item => String(item?.profileId || '') === profileId && !['cancelled', 'replaced'].includes(String(item?.status || '')))) {
          throw new Error('Für dieses Profil existiert noch ein aktiver Renewal-Vorgang. Bitte diesen zuerst abschließen oder verwerfen.');
        }
        const run = await getBulkRunState().catch(() => null);
        if ((run?.status === 'running' || run?.retryAdId) && String(run?.profileId || '') === profileId) throw new Error('Für dieses Profil läuft noch eine Erfassung. Bitte warte, bis sie abgeschlossen ist.');

        const unassigned = records.length
          ? await getInventoryRepository().unassignProfileRecords(profileId, profile.displayName || null)
          : 0;
        await requireProfileRepository().removeProfileMetadata(profileId, { unassignedRecords: unassigned });
        await logDiagnostic('info', 'PROFILE_DELETED', { profileId, unassignedRecords: unassigned }, { module: 'background', operation: 'profile-management', context: { profileId } }).catch(() => {});
        broadcastInventoryChanged('profile-deleted', { profileId, unassignedRecords: unassigned });
        const nextState = await getProfileState();
        return { ...nextState, deletedProfileId: profileId, unassignedRecords: unassigned };
      }

      async function ensureProfile(profileName) { return requireProfileRepository().ensure(profileName); }

      async function countUnprofiledInventories() { return getInventoryRepository().countUnassignedActive(isTrashRecord); }

      async function recognizeProfile(message) {
        const profile = await ensureProfile(message?.profileName);
        const profileState = await readProfiles();
        if (!profileState.selectedProfileId || profileState.selectedProfileSource !== 'manual') {
          await requireProfileRepository().setSelected(profile.profileId, 'automatic');
        }
        const unprofiledCount = await countUnprofiledInventories();
        await logDiagnostic('info', 'PROFILE_RECOGNIZED', { profileId: profile.profileId, nameLength: profile.displayName.length, unprofiledCount }, { module: 'background', operation: 'profile-recognition', context: { profileId: profile.profileId } }).catch(() => {});
        return { profile: { profileId: profile.profileId, displayName: profile.displayName }, unprofiledCount };
      }

      async function assignUnprofiledInventories(message) {
        const profileId = String(message?.profileId || '');
        const state = await readProfiles();
        const profile = state.profiles.find(item => String(item.profileId) === profileId);
        if (!profile) throw new Error('Das erkannte Profil ist nicht mehr verfügbar.');
        const migrated = await getInventoryRepository().assignUnassignedRecords(profile);
        const currentState = await readProfiles();
        if (!currentState.selectedProfileId || currentState.selectedProfileId === unassignedProfileId) {
          await requireProfileRepository().setSelected(profile.profileId, 'migration');
        }
        await logDiagnostic('info', 'PROFILE_LEGACY_INVENTORY_ASSIGNED', { profileId: profile.profileId, migrated }, { module: 'background', operation: 'profile-migration', context: { profileId: profile.profileId } }).catch(() => {});
        broadcastInventoryChanged('profile-migration', { profileId: profile.profileId, migrated });
        return { profile: { profileId: profile.profileId, displayName: profile.displayName }, migrated };
      }

      return Object.freeze({
        readProfiles,
        getProfileState,
        setSelectedProfile,
        prepareProfileBackupImport,
        finalizeProfileBackupImport,
        deleteProfile,
        ensureProfile,
        recognizeProfile,
        assignUnprofiledInventories
      });
    }
  });
  KRDeps.register('KRProfileManagementController', API);
})();
