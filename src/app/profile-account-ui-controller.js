(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const documentRef = options.document || globalThis.document;
      const AccountGate = options.AccountGate;
      const elements = options.elements || {};
      const unassignedProfileId = String(options.unassignedProfileId || '__unassigned__');
      const profileTransferLocked = typeof options.profileTransferLocked === 'function' ? options.profileTransferLocked : () => false;
      const profileTransferStatusText = typeof options.profileTransferStatusText === 'function' ? options.profileTransferStatusText : () => '';
      const onSelectProfile = typeof options.onSelectProfile === 'function' ? options.onSelectProfile : () => {};
      const onDeleteProfile = typeof options.onDeleteProfile === 'function' ? options.onDeleteProfile : () => {};
      const onExportProfileBackup = typeof options.onExportProfileBackup === 'function' ? options.onExportProfileBackup : async () => {};
      const onBackupError = typeof options.onBackupError === 'function' ? options.onBackupError : () => {};

      function profileById(profileId, state) {
        const id = String(profileId || '');
        if (id === unassignedProfileId) return state?.unassigned || null;
        return (state?.profiles || []).find(profile => String(profile?.profileId || '') === id) || null;
      }

      function selectedProfileLabel(selectedProfileId, state) {
        return profileById(selectedProfileId, state)?.displayName || 'Kein Profil';
      }

      function selectedConcreteProfile(selectedProfileId, state) {
        const id = String(selectedProfileId || '');
        if (!id || id === unassignedProfileId) return null;
        return profileById(id, state) || null;
      }

      function liveAccountMatchesSelectedProfile(accountGateState, selectedProfileId, state) {
        const selected = selectedConcreteProfile(selectedProfileId, state);
        const live = accountGateState?.profile || null;
        return Boolean(selected && live?.profileId && String(live.profileId) === String(selected.profileId));
      }

      function accountGateModel(accountGateState, selectedProfileId, state) {
        if (!AccountGate?.model) throw new Error('Account-Gate-Modul ist nicht verfügbar.');
        return AccountGate.model(accountGateState, selectedConcreteProfile(selectedProfileId, state));
      }

      function profileBindingSnapshot(accountGateState, selectedProfileId, state, gate = null) {
        const resolvedGate = gate || accountGateModel(accountGateState, selectedProfileId, state);
        return {
          selectedProfileId: String(selectedProfileId || ''),
          liveProfileId: String(accountGateState?.profile?.profileId || ''),
          accountState: String(accountGateState?.status || 'checking'),
          gateKind: String(resolvedGate?.kind || ''),
          allowed: resolvedGate?.allowed === true
        };
      }

      function renderProfileAccountStatus(accountGateState) {
        const profileDetectedText = elements.profileDetectedText;
        const profileAccountStatusDot = elements.profileAccountStatusDot;
        if (!profileDetectedText) return;
        const status = String(accountGateState?.status || 'checking');
        const profile = accountGateState?.profile || null;
        let text = '';
        if (status === 'confirmed' && profile?.displayName) {
          text = `Kleinanzeigen-Konto: ${profile.displayName}`;
          if (profileAccountStatusDot) profileAccountStatusDot.className = 'profile-account-status-dot is-ready';
        } else if (status === 'transient-unavailable' && profile?.displayName) {
          text = `Kleinanzeigen-Konto: ${profile.displayName} · Prüfung verzögert`;
          if (profileAccountStatusDot) profileAccountStatusDot.className = 'profile-account-status-dot is-checking';
        } else {
          text = status === 'checking'
            ? 'Kleinanzeigen-Konto wird geprüft …'
            : status === 'ambiguous'
              ? 'Kleinanzeigen-Konto nicht eindeutig'
              : status === 'restricted'
                ? 'Kleinanzeigen-Zugriff eingeschränkt'
                : 'Kein Kleinanzeigen-Konto erkannt';
          if (profileAccountStatusDot) profileAccountStatusDot.className = `profile-account-status-dot${status === 'checking' || status === 'transient-unavailable' ? ' is-checking' : ''}`;
        }
        profileDetectedText.textContent = text;
        profileDetectedText.title = text;
      }

      function setProfileManagerStatus(text = '', error = false) {
        const target = elements.profileManagerStatus;
        if (!target) return;
        target.textContent = text;
        target.classList.toggle('error', Boolean(error));
      }

      function makeProfileManagerRow(profile, context = {}, { unassigned = false } = {}) {
        const selectedProfileId = context.selectedProfileId;
        const accountGateState = context.accountGateState;
        const row = documentRef.createElement('article');
        const id = String(profile?.profileId || '');
        const isSelected = id === String(selectedProfileId || '');
        const isCurrent = !unassigned && id === String(accountGateState?.profile?.profileId || '');
        row.className = `profile-manager-row${isSelected ? ' profile-selected' : ''}`;
        const main = documentRef.createElement('div');
        main.className = 'profile-manager-main';
        const name = documentRef.createElement('div');
        name.className = 'profile-manager-name';
        const label = documentRef.createElement('span');
        label.textContent = profile?.displayName || (unassigned ? 'Nicht zugeordnet' : 'Unbenanntes Profil');
        name.append(label);
        if (isCurrent) {
          const chip = documentRef.createElement('span');
          chip.className = 'profile-chip current';
          chip.textContent = 'Angemeldet';
          name.append(chip);
        }
        if (isSelected) {
          const chip = documentRef.createElement('span');
          chip.className = 'profile-chip selected';
          chip.textContent = 'Inventaransicht';
          name.append(chip);
        }
        const meta = documentRef.createElement('div');
        meta.className = 'profile-manager-meta';
        const inventoryCount = Number(profile?.inventoryCount || 0);
        const trashCount = Number(profile?.trashCount || 0);
        meta.textContent = `${inventoryCount} ${inventoryCount === 1 ? 'Inventareintrag' : 'Inventareinträge'} · ${trashCount} ${trashCount === 1 ? 'Papierkorb-Eintrag' : 'Papierkorb-Einträge'}`;
        main.append(name, meta);

        const actions = documentRef.createElement('div');
        actions.className = 'profile-manager-row-actions';
        if (!isSelected) {
          const selectButton = documentRef.createElement('button');
          selectButton.type = 'button';
          selectButton.className = 'secondary';
          selectButton.textContent = 'Inventar anzeigen';
          selectButton.disabled = profileTransferLocked();
          selectButton.addEventListener('click', () => void onSelectProfile(id));
          actions.append(selectButton);
        }
        if (!unassigned) {
          const backupButton = documentRef.createElement('button');
          backupButton.type = 'button';
          backupButton.className = 'secondary';
          backupButton.textContent = 'Inventarprofil sichern';
          backupButton.disabled = profileTransferLocked();
          if (backupButton.disabled) backupButton.title = profileTransferStatusText();
          backupButton.addEventListener('click', () => void onExportProfileBackup(profile).catch(error => onBackupError(error, profile)));
          actions.append(backupButton);

          const deleteButton = documentRef.createElement('button');
          deleteButton.type = 'button';
          deleteButton.className = 'profile-delete-button';
          deleteButton.disabled = isCurrent || profileTransferLocked();
          deleteButton.textContent = 'Profil entfernen';
          if (profileTransferLocked()) deleteButton.title = profileTransferStatusText();
          else if (isCurrent) deleteButton.title = 'Das aktuell angemeldete Profil kann nicht entfernt werden.';
          else if (inventoryCount + trashCount > 0) deleteButton.title = 'Die lokalen Einträge bleiben erhalten und werden „Nicht zugeordnet“.';
          deleteButton.addEventListener('click', () => void onDeleteProfile(profile));
          actions.append(deleteButton);
        }
        row.append(main, actions);
        return row;
      }

      function renderProfileManager(state, context = {}) {
        const target = elements.profileManagerList;
        if (!target) return;
        target.replaceChildren();
        const profiles = Array.isArray(state?.profiles) ? state.profiles : [];
        for (const profile of profiles) target.append(makeProfileManagerRow(profile, context));
        if (Number(state?.unassigned?.totalCount || 0) > 0) target.append(makeProfileManagerRow(state.unassigned, context, { unassigned: true }));
        if (!target.children.length) {
          const empty = documentRef.createElement('div');
          empty.className = 'empty';
          empty.textContent = 'Noch kein Kleinanzeigen-Konto erkannt.';
          target.append(empty);
        }
      }

      function renderProfileSwitcher(state, accountGateState) {
        const profileSelect = elements.profileSelect;
        if (!profileSelect) return String(state?.selectedProfileId || '') || null;
        const selectedProfileId = String(state?.selectedProfileId || '') || null;
        const profiles = Array.isArray(state?.profiles) ? state.profiles : [];
        const unassigned = state?.unassigned || { profileId: unassignedProfileId, displayName: 'Nicht zugeordnet', totalCount: 0, inventoryCount: 0, trashCount: 0 };
        profileSelect.replaceChildren();
        for (const profile of profiles) {
          const option = documentRef.createElement('option');
          option.value = String(profile.profileId || '');
          option.textContent = `${profile.displayName || 'Unbenanntes Profil'} · ${Number(profile.inventoryCount || 0)} Anzeigen`;
          profileSelect.append(option);
        }
        if (Number(unassigned.totalCount || 0) > 0) {
          const option = documentRef.createElement('option');
          option.value = unassignedProfileId;
          option.textContent = `Nicht zugeordnet · ${Number(unassigned.inventoryCount || 0)} Anzeigen`;
          profileSelect.append(option);
        }
        if (!profileSelect.options.length) {
          const option = documentRef.createElement('option');
          option.value = '';
          option.textContent = 'Noch kein Profil erkannt';
          profileSelect.append(option);
          profileSelect.disabled = true;
        } else {
          profileSelect.disabled = false;
          if (selectedProfileId && [...profileSelect.options].some(option => option.value === selectedProfileId)) profileSelect.value = selectedProfileId;
        }
        renderProfileAccountStatus(accountGateState);
        renderProfileManager(state, { selectedProfileId, accountGateState });
        return selectedProfileId;
      }

      return Object.freeze({
        profileById,
        selectedProfileLabel,
        selectedConcreteProfile,
        liveAccountMatchesSelectedProfile,
        accountGateModel,
        profileBindingSnapshot,
        renderProfileAccountStatus,
        setProfileManagerStatus,
        renderProfileManager,
        renderProfileSwitcher
      });
    }
  });

  globalThis.KRDeps?.register?.('KRProfileAccountUiController', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
