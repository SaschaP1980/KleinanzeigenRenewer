(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const storageLocal = options.storageLocal;
      if (!storageLocal?.get || !storageLocal?.set || !storageLocal?.remove) throw new Error('KRProfileRepository requires storageLocal');
      const profilesKey = String(options.profilesKey || 'profilesV1');
      const activeProfileKey = String(options.activeProfileKey || 'activeDetectedProfileV1');
      const selectedProfileKey = String(options.selectedProfileKey || 'selectedInventoryProfileV1');
      const unassignedProfileId = String(options.unassignedProfileId || '__unassigned__');
      const normalizeName = typeof options.normalizeProfileName === 'function'
        ? options.normalizeProfileName
        : value => String(value || '').replace(/\s+/g, ' ').trim();
      const randomUUID = typeof options.randomUUID === 'function'
        ? options.randomUUID
        : () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const nowIso = typeof options.nowIso === 'function' ? options.nowIso : () => new Date().toISOString();

      async function read() {
        const stored = await storageLocal.get([profilesKey, activeProfileKey, selectedProfileKey]);
        return {
          profiles: Array.isArray(stored[profilesKey]) ? stored[profilesKey] : [],
          activeProfileId: String(stored[activeProfileKey]?.profileId || '') || null,
          selectedProfileId: String(stored[selectedProfileKey]?.profileId || '') || null,
          selectedProfileSource: String(stored[selectedProfileKey]?.source || '') || null
        };
      }

      async function setSelected(profileId, source = 'manual', selectedAt = nowIso()) {
        const id = String(profileId || '');
        if (!id) { await storageLocal.remove(selectedProfileKey); return null; }
        const value = { profileId: id, selectedAt, source: String(source || 'manual') };
        await storageLocal.set({ [selectedProfileKey]: value });
        return value;
      }

      async function clearSelected() {
        await storageLocal.remove(selectedProfileKey);
      }

      async function ensure(profileName) {
        const displayName = normalizeName(profileName);
        if (!displayName) throw new Error('Kleinanzeigen-Konto wurde nicht erkannt.');
        const normalizedName = displayName.toLocaleLowerCase('de-DE');
        const state = await read();
        let profile = state.profiles.find(item => String(item?.normalizedName || '').toLocaleLowerCase('de-DE') === normalizedName);
        const now = nowIso();
        if (!profile) {
          profile = { profileId: randomUUID(), displayName, normalizedName, createdAt: now, lastSeenAt: now };
          state.profiles.push(profile);
        } else {
          profile.displayName = displayName;
          profile.normalizedName = normalizedName;
          profile.lastSeenAt = now;
        }
        await storageLocal.set({ [profilesKey]: state.profiles, [activeProfileKey]: { profileId: profile.profileId, detectedAt: now } });
        return profile;
      }

      async function persistImportedProfile({ targetProfileId, incoming, existingProfile = null, selectedSource = 'profile-backup-import' }) {
        const state = await read();
        const now = nowIso();
        const replacement = {
          ...(existingProfile || {}),
          profileId: String(targetProfileId || ''),
          displayName: String(incoming?.displayName || ''),
          normalizedName: String(incoming?.normalizedName || incoming?.displayName || ''),
          createdAt: incoming?.createdAt || existingProfile?.createdAt || now,
          lastSeenAt: incoming?.lastSeenAt || existingProfile?.lastSeenAt || now,
          backupImportedAt: now,
          backupSourceProfileId: incoming?.profileId || null
        };
        const nextProfiles = state.profiles.filter(profile => String(profile?.profileId || '') !== replacement.profileId);
        nextProfiles.push(replacement);
        await storageLocal.set({
          [profilesKey]: nextProfiles,
          [selectedProfileKey]: { profileId: replacement.profileId, selectedAt: now, source: selectedSource }
        });
        return replacement;
      }

      async function removeProfileMetadata(profileId, { unassignedRecords = 0 } = {}) {
        const id = String(profileId || '');
        if (!id || id === unassignedProfileId) throw new Error('Dieses Profil kann nicht gelöscht werden.');
        const state = await read();
        const nextProfiles = state.profiles.filter(item => String(item?.profileId || '') !== id);
        const updates = { [profilesKey]: nextProfiles };
        if (String(state.activeProfileId || '') === id) updates[activeProfileKey] = null;
        await storageLocal.set(updates);
        if (String(state.selectedProfileId || '') === id) {
          if (Number(unassignedRecords || 0) > 0) await setSelected(unassignedProfileId, 'manual');
          else await clearSelected();
        }
        return { ...state, profiles: nextProfiles };
      }

      return Object.freeze({ read, setSelected, clearSelected, ensure, persistImportedProfile, removeProfileMetadata });
    }
  });
  globalThis.KRDeps?.register?.('KRProfileRepository', API);
})();
