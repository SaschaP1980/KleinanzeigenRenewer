(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const maxAttempts = Math.max(1, Number(options.maxAttempts || 2));
      const retryDelayMs = Math.max(0, Number(options.retryDelayMs || 250));
      const navigationTimeoutMs = Math.max(1, Number(options.navigationTimeoutMs || 12000));
      const delay = typeof options.delay === 'function' ? options.delay : ms => new Promise(resolve => setTimeout(resolve, ms));
      async function probeLiveKleinanzeigenAccount() {
        const operationId = options.randomUUID(); let lastTransient = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          let workerTabId = null;
          try {
            const windowId = await options.normalBrowserWindowId();
            const worker = await options.createManagedWorkerTab({ ...(windowId ? { windowId } : {}), url: 'about:blank', active: false }, 'account-probe', { operationId, ownerType: 'account-probe', ownerId: operationId });
            if (!worker?.id) throw new Error('Kleinanzeigen-Konto konnte nicht im Hintergrund geprüft werden.');
            workerTabId = worker.id;
            const navigationStartedAt = new Date().toISOString();
            await options.logDiagnostic('info', 'ACCOUNT_PROBE_NAVIGATION_REQUESTED', { operationId, attempt, maxAttempts, workerTabId, targetPath: '/m-meine-anzeigen.html', navigationStartedAt }, { module: 'background', operation: 'account-probe', context: { operationId, workerTabId } }).catch(() => {});
            await options.updateAutomationTab(workerTabId, { url: options.myAdsProjectsUrl });
            await options.waitForExpectedTabComplete(workerTabId, options.myAdsProjectsUrl, { timeoutMs: navigationTimeoutMs, purpose: 'account-probe', label: 'Kleinanzeigen-Kontoprüfung', operation: 'account-probe', context: { operationId, workerTabId, attempt } });
            await options.ensureContentConnection({ tabId: workerTabId });
            const page = await options.sendTabRequestWithBootstrap(workerTabId, { type: 'PAGE_STATUS' });
            const status = await options.sendTabRequestWithBootstrap(workerTabId, { type: 'MY_ADS_STATUS' }).catch(() => null);
            const profileName = options.normalizeProfileName(status?.profileName || page?.profileName || '');
            if (!page?.auth?.loggedIn || !profileName) {
              await options.logDiagnostic('info', 'LIVE_ACCOUNT_NOT_CONFIRMED', { operationId, attempt, loggedIn: Boolean(page?.auth?.loggedIn), pageType: page?.pageType || null, reason: page?.auth?.loggedIn ? 'profile-name-missing' : 'not-logged-in' }, { module: 'background', operation: 'account-probe', context: { operationId, workerTabId } }).catch(() => {});
              return { confirmed: false, profile: null, transient: false, reason: page?.auth?.loggedIn ? 'profile-name-missing' : 'not-logged-in', operationId };
            }
            const profile = await options.ensureProfile(profileName);
            await options.logDiagnostic('info', 'LIVE_ACCOUNT_CONFIRMED', { operationId, attempt, profileId: profile.profileId, profileNameLength: profile.displayName.length }, { module: 'background', operation: 'account-probe', context: { operationId, profileId: profile.profileId, workerTabId } }).catch(() => {});
            return { confirmed: true, profile: { profileId: profile.profileId, displayName: profile.displayName }, transient: false, reason: 'confirmed', operationId };
          } catch (error) {
            if (error?.code === options.platformAccessRestrictionErrorCode) throw error;
            const navigationReason = String(error?.navigationReason || ''); const currentUrl = String(error?.currentUrl || '');
            const definitiveLoggedOutRedirect = navigationReason === 'kleinanzeigen-redirect' && /\/(?:m-)?(?:einloggen|login)(?:[./?]|$)/i.test(currentUrl);
            if (definitiveLoggedOutRedirect) {
              await options.logDiagnostic('info', 'LIVE_ACCOUNT_NOT_CONFIRMED', { operationId, attempt, loggedIn: false, pageType: 'redirect', reason: 'login-redirect' }, { module: 'background', operation: 'account-probe', context: { operationId, workerTabId } }).catch(() => {});
              return { confirmed: false, profile: null, transient: false, reason: 'login-redirect', operationId };
            }
            lastTransient = { reason: navigationReason || (error?.code === 'KR_TAB_NAVIGATION_TIMEOUT' ? 'navigation-timeout' : 'probe-unavailable'), errorCode: error?.code || null, message: String(error?.message || error).slice(0, 600), currentUrl: currentUrl.slice(0, 1200) };
            await options.logDiagnostic(attempt < maxAttempts ? 'info' : 'warning', 'ACCOUNT_PROBE_ATTEMPT_UNAVAILABLE', { operationId, attempt, maxAttempts, workerTabId, ...lastTransient }, { module: 'background', operation: 'account-probe', context: { operationId, ...(workerTabId ? { workerTabId } : {}) } }).catch(() => {});
          } finally { if (workerTabId) await options.closeManagedWorkerTab(workerTabId).catch(() => {}); }
          if (attempt < maxAttempts) await delay(retryDelayMs);
        }
        await options.logDiagnostic('info', 'LIVE_ACCOUNT_PROBE_TRANSIENT_UNAVAILABLE', { operationId, attempts: maxAttempts, reason: lastTransient?.reason || 'probe-unavailable', errorCode: lastTransient?.errorCode || null }, { module: 'background', operation: 'account-probe', context: { operationId } }).catch(() => {});
        return { confirmed: false, profile: null, transient: true, reason: lastTransient?.reason || 'probe-unavailable', operationId };
      }
      return Object.freeze({ probeLiveKleinanzeigenAccount });
    }
  });
  globalThis.KRDeps?.register?.('KRAccountProbeService', API);
})();
