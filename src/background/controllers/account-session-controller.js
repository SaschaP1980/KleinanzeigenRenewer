(() => {
  'use strict';
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before account-session-controller.js');

  const API = Object.freeze({
    create(options = {}) {
      const {
        AccountProbeService,
        storageSession,
        accountGateDiagnosticStateKey,
        maxAttempts,
        retryDelayMs,
        navigationTimeoutMs,
        myAdsProjectsUrl,
        platformAccessRestrictionErrorCode,
        randomUUID,
        normalBrowserWindowId,
        createManagedWorkerTab,
        closeManagedWorkerTab,
        updateAutomationTab,
        waitForExpectedTabComplete,
        ensureContentConnection,
        sendTabRequestWithBootstrap,
        normalizeProfileName,
        ensureProfile,
        logDiagnostic,
        delay,
        getProfileState,
        unassignedProfileId
      } = options;
      if (!AccountProbeService?.create) throw new Error('account session controller requires AccountProbeService');
      if (!storageSession?.set) throw new Error('account session controller requires storageSession');
      for (const [name, value] of Object.entries({ randomUUID, normalBrowserWindowId, createManagedWorkerTab, closeManagedWorkerTab, updateAutomationTab, waitForExpectedTabComplete, ensureContentConnection, sendTabRequestWithBootstrap, normalizeProfileName, ensureProfile, logDiagnostic, delay, getProfileState })) {
        if (typeof value !== 'function') throw new Error(`account session controller dependency ${name} is required`);
      }
      if (!accountGateDiagnosticStateKey || !myAdsProjectsUrl || !platformAccessRestrictionErrorCode || !unassignedProfileId) throw new Error('account session controller constants are required');

      let accountProbeService = null;
      function requireAccountProbeService() {
        if (!accountProbeService) {
          accountProbeService = AccountProbeService.create({
            maxAttempts,
            retryDelayMs,
            navigationTimeoutMs,
            myAdsProjectsUrl,
            platformAccessRestrictionErrorCode,
            randomUUID,
            normalBrowserWindowId,
            createManagedWorkerTab,
            closeManagedWorkerTab,
            updateAutomationTab,
            waitForExpectedTabComplete,
            ensureContentConnection,
            sendTabRequestWithBootstrap,
            normalizeProfileName,
            ensureProfile,
            logDiagnostic,
            delay
          });
        }
        return accountProbeService;
      }

      async function setAccountGateDiagnosticState(message = {}) {
        const input = message?.state && typeof message.state === 'object' ? message.state : {};
        const state = {
          capturedAt: new Date().toISOString(),
          accountState: String(input.accountState || '').slice(0, 80) || null,
          gateKind: String(input.gateKind || '').slice(0, 80) || null,
          allowed: input.allowed === true,
          selectedProfileId: String(input.selectedProfileId || '').slice(0, 180) || null,
          liveProfileId: String(input.liveProfileId || '').slice(0, 180) || null,
          reason: String(input.reason || '').slice(0, 180) || null,
          source: String(input.source || '').slice(0, 120) || null,
          generation: Number.isFinite(Number(input.generation)) ? Number(input.generation) : null,
          confirmedAt: String(input.confirmedAt || '').slice(0, 64) || null
        };
        await storageSession.set({ [accountGateDiagnosticStateKey]: state }).catch(() => {});
        return state;
      }

      async function probeLiveKleinanzeigenAccount() {
        void maxAttempts;
        return requireAccountProbeService().probeLiveKleinanzeigenAccount();
      }

      async function assertSelectedProfileMatchesLiveAccount({ expectedProfileId = '', expectedProfileName = '', purpose = 'live-action' } = {}) {
        const state = await getProfileState();
        const selectedProfileId = String(state?.selectedProfileId || '');
        if (!selectedProfileId || selectedProfileId === unassignedProfileId) throw new Error('Wähle zuerst ein konkretes Inventarprofil aus.');
        const selectedProfile = (state?.profiles || []).find(profile => String(profile?.profileId || '') === selectedProfileId) || null;
        if (!selectedProfile) throw new Error('Das ausgewählte Inventarprofil wurde nicht gefunden.');
        if (expectedProfileId && String(expectedProfileId) !== selectedProfileId) throw new Error('Die Aktion gehört nicht zum aktuell ausgewählten Inventarprofil.');
        if (expectedProfileName && normalizeProfileName(expectedProfileName).toLocaleLowerCase('de-DE') !== normalizeProfileName(selectedProfile.displayName).toLocaleLowerCase('de-DE')) {
          throw new Error('Die Aktion gehört nicht zum aktuell ausgewählten Inventarprofil.');
        }
        const live = await probeLiveKleinanzeigenAccount();
        if (!live?.confirmed || !live?.profile?.profileId) throw new Error('Das aktuell angemeldete Kleinanzeigen-Konto konnte nicht eindeutig erkannt werden.');
        if (String(live.profile.profileId) !== selectedProfileId) {
          throw new Error(`Das ausgewählte Inventarprofil „${selectedProfile.displayName}“ stimmt nicht mit dem angemeldeten Kleinanzeigen-Konto „${live.profile.displayName}“ überein.`);
        }
        await logDiagnostic('info', 'ACCOUNT_BOUND_ACTION_ALLOWED', {
          purpose,
          profileId: selectedProfileId
        }, { module: 'background', operation: 'account-binding', context: { profileId: selectedProfileId } }).catch(() => {});
        return live.profile;
      }

      return Object.freeze({
        setAccountGateDiagnosticState,
        probeLiveKleinanzeigenAccount,
        assertSelectedProfileMatchesLiveAccount
      });
    }
  });
  KRDeps.register('KRAccountSessionController', API);
})();
