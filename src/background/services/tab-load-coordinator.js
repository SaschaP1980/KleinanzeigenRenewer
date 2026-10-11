(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const safetyPollMs = Math.max(1, Number(options.safetyPollMs || 2000));
      const assertPlatformAccessAllowed = options.assertPlatformAccessAllowed;
      const getTabOrThrow = options.getTabOrThrow;
      const getTab = options.getTab;
      const logDiagnostic = options.logDiagnostic;
      const tabMeta = options.tabMeta;
      const assessNavigation = options.assessNavigation;
      const readyState = options.readyState;
      const offTargetState = options.offTargetState;
      const waiters = new Map();
      const versions = new Map();

      function signalVersion(tabId) {
        return Number(versions.get(Number(tabId)) || 0);
      }

      function notify(tabId, signal = {}) {
        const id = Number(tabId || 0);
        if (!id) return;
        const nextVersion = signalVersion(id) + 1;
        versions.set(id, nextVersion);
        const listeners = waiters.get(id);
        if (!listeners?.size) return;
        for (const listener of [...listeners]) listener({ ...signal, tabId: id, version: nextVersion });
      }

      function notifyAll(signal = {}) {
        for (const tabId of [...waiters.keys()]) notify(tabId, signal);
      }

      function waitForSignal(tabId, afterVersion, timeoutMs) {
        const id = Number(tabId || 0);
        const expectedVersion = Number(afterVersion || 0);
        if (signalVersion(id) !== expectedVersion) {
          return Promise.resolve({ kind: 'event', tabId: id, version: signalVersion(id) });
        }
        return new Promise(resolve => {
          let settled = false;
          const listeners = waiters.get(id) || new Set();
          const finish = signal => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            listeners.delete(finish);
            if (!listeners.size) waiters.delete(id);
            resolve(signal);
          };
          const timer = setTimeout(() => finish({ kind: 'safety', tabId: id, version: signalVersion(id) }), Math.max(1, Number(timeoutMs || 1)));
          listeners.add(finish);
          waiters.set(id, listeners);
          if (signalVersion(id) !== expectedVersion) finish({ kind: 'event', tabId: id, version: signalVersion(id) });
        });
      }

      async function waitForComplete(tabId, timeoutOrOptions = 30000) {
        const config = timeoutOrOptions && typeof timeoutOrOptions === 'object' ? timeoutOrOptions : { timeoutMs: timeoutOrOptions };
        const timeoutMs = Math.max(1000, Number(config.timeoutMs || 30000));
        const purpose = String(config.purpose || 'tab-load').slice(0, 80);
        const label = String(config.label || 'Kleinanzeigen-Tab').slice(0, 120);
        const operation = String(config.operation || 'tab-load').slice(0, 80);
        const context = config.context && typeof config.context === 'object' ? config.context : { tabId };
        const started = Date.now();
        const deadline = started + timeoutMs;
        while (Date.now() < deadline) {
          await assertPlatformAccessAllowed({ operation, context });
          const observedVersion = signalVersion(tabId);
          const tab = await getTabOrThrow(tabId, { label });
          if (tab?.status === 'complete') {
            const durationMs = Date.now() - started;
            await logDiagnostic('info', 'TAB_LOAD_TIMING', { tabId, purpose, durationMs, timeoutMs, readiness: 'event-driven', ...tabMeta(tab) }, { module: 'background', operation, context }).catch(() => {});
            return tab;
          }
          const remainingMs = Math.max(1, deadline - Date.now());
          await waitForSignal(tabId, observedVersion, Math.min(safetyPollMs, remainingMs));
        }
        const lastTab = await getTab(tabId).catch(() => null);
        await logDiagnostic('warning', 'TAB_LOAD_TIMEOUT', { tabId, purpose, durationMs: Date.now() - started, timeoutMs, readiness: 'event-driven', ...(lastTab ? tabMeta(lastTab) : {}) }, { module: 'background', operation, context }).catch(() => {});
        throw new Error(`${label} wurde nicht innerhalb von ${Math.ceil(timeoutMs / 1000)} Sekunden vollständig geladen.`);
      }

      async function waitForExpectedComplete(tabId, expectedUrl, timeoutOrOptions = 30000) {
        const config = timeoutOrOptions && typeof timeoutOrOptions === 'object' ? timeoutOrOptions : { timeoutMs: timeoutOrOptions };
        const timeoutMs = Math.max(1000, Number(config.timeoutMs || 30000));
        const purpose = String(config.purpose || 'target-navigation').slice(0, 80);
        const label = String(config.label || 'Kleinanzeigen-Tab').slice(0, 120);
        const operation = String(config.operation || 'target-navigation').slice(0, 80);
        const context = config.context && typeof config.context === 'object' ? config.context : { tabId };
        const started = Date.now();
        const deadline = started + timeoutMs;
        let lastAssessment = null;
        while (Date.now() < deadline) {
          await assertPlatformAccessAllowed({ operation, context });
          const observedVersion = signalVersion(tabId);
          const tab = await getTabOrThrow(tabId, { label });
          const assessment = assessNavigation(tab, expectedUrl);
          lastAssessment = assessment;
          if (assessment.state === readyState) {
            const durationMs = Date.now() - started;
            await logDiagnostic('info', 'TAB_TARGET_LOAD_TIMING', {
              tabId, purpose, durationMs, timeoutMs, readiness: 'event-driven-target-bound',
              targetMatched: true, navigationReason: assessment.reason, ...tabMeta(tab)
            }, { module: 'background', operation, context }).catch(() => {});
            return tab;
          }
          if (assessment.state === offTargetState) {
            const error = new Error(`${label} hat die erwartete Kleinanzeigen-Zielseite nicht erreicht.`);
            error.code = 'KR_TAB_NAVIGATION_OFF_TARGET';
            error.navigationReason = assessment.reason;
            error.currentUrl = assessment.currentUrl || assessment.pendingUrl || '';
            await logDiagnostic('info', 'TAB_TARGET_NAVIGATION_REJECTED', {
              tabId, purpose, durationMs: Date.now() - started, timeoutMs,
              navigationReason: assessment.reason, currentUrl: String(error.currentUrl || '').slice(0, 1200),
              expectedUrl: String(expectedUrl || '').slice(0, 1200), ...tabMeta(tab)
            }, { module: 'background', operation, context }).catch(() => {});
            throw error;
          }
          const remainingMs = Math.max(1, deadline - Date.now());
          await waitForSignal(tabId, observedVersion, Math.min(safetyPollMs, remainingMs));
        }
        const lastTab = await getTab(tabId).catch(() => null);
        const error = new Error(`${label} wurde nicht innerhalb von ${Math.ceil(timeoutMs / 1000)} Sekunden auf der erwarteten Zielseite vollständig geladen.`);
        error.code = 'KR_TAB_NAVIGATION_TIMEOUT';
        error.navigationReason = lastAssessment?.reason || 'timeout';
        error.currentUrl = String(lastTab?.url || '');
        await logDiagnostic('info', 'TAB_TARGET_LOAD_TIMEOUT', {
          tabId, purpose, durationMs: Date.now() - started, timeoutMs, readiness: 'event-driven-target-bound',
          navigationReason: error.navigationReason, expectedUrl: String(expectedUrl || '').slice(0, 1200),
          ...(lastTab ? tabMeta(lastTab) : {})
        }, { module: 'background', operation, context }).catch(() => {});
        throw error;
      }

      return Object.freeze({ signalVersion, notify, notifyAll, waitForSignal, waitForComplete, waitForExpectedComplete });
    }
  });
  globalThis.KRDeps?.register?.('KRTabLoadCoordinator', API);
})();
