(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const chromeApi = options.chrome || globalThis.chrome;
      const runtimeMessage = options.runtimeMessage;
      const logEvent = typeof options.logEvent === 'function' ? options.logEvent : async () => {};
      if (!chromeApi?.tabs || typeof runtimeMessage !== 'function') throw new Error('KRTabPageInspectionController requires chrome.tabs and runtimeMessage');

      function transientTabMessageError(error) {
        const text = String(error?.message || error || '');
        return /Receiving end does not exist|Could not establish connection|message port closed|No tab with id|The tab was closed/i.test(text);
      }
      function isExpectedTabClosedError(error) {
        const text = String(error?.message || error || '');
        return error?.code === 'KR_TAB_EXPECTED_CLOSED' || /KR_TAB_EXPECTED_CLOSED/i.test(text);
      }
      function isTabGoneError(error) {
        const text = String(error?.message || error || '');
        return isExpectedTabClosedError(error) || error?.code === 'KR_TAB_GONE' || /KR_TAB_GONE|No tab with id|The tab was closed/i.test(text);
      }
      function isTabDiscardedError(error) {
        const text = String(error?.message || error || '');
        return error?.code === 'KR_TAB_DISCARDED' || /von Chrome verworfen/i.test(text);
      }
      function lifecycleTabError(code, message, tabId) {
        const error = new Error(message); error.code = code; error.tabId = Number(tabId || 0) || null; return error;
      }
      async function classifyTabLifecycleFailure(tabId, error, operation) {
        if (isExpectedTabClosedError(error)) {
          void logEvent('TAB_EXPECTED_CLOSED_DURING_REQUEST', { tabId, message: String(error?.message || error || '').slice(0,300) }, 'info', operation);
          throw lifecycleTabError('KR_TAB_GONE', 'Der Kleinanzeigen-Tab wurde vom laufenden Workflow planmäßig geschlossen.', tabId);
        }
        if (isTabGoneError(error)) {
          void logEvent('TAB_GONE_DURING_REQUEST', { tabId, message: String(error?.message || error || '').slice(0,300) }, 'info', operation);
          throw lifecycleTabError('KR_TAB_GONE', 'Der Kleinanzeigen-Tab wurde während der Prüfung geschlossen.', tabId);
        }
        const tab = await chromeApi.tabs.get(tabId).catch(() => null);
        if (!tab) {
          void logEvent('TAB_GONE_DURING_REQUEST', { tabId, message: String(error?.message || error || '').slice(0,300) }, 'info', operation);
          throw lifecycleTabError('KR_TAB_GONE', 'Der Kleinanzeigen-Tab wurde während der Prüfung geschlossen.', tabId);
        }
        if (tab?.discarded || isTabDiscardedError(error)) {
          void logEvent('TAB_DISCARDED_DURING_REQUEST', { tabId, discarded: true }, 'info', operation);
          throw lifecycleTabError('KR_TAB_DISCARDED', 'Der Kleinanzeigen-Tab wurde von Chrome pausiert.', tabId);
        }
        throw error;
      }
      function tabMessageOnce(tabId, message) {
        return new Promise((resolve,reject)=>chromeApi.tabs.sendMessage(tabId,message,response=>{
          if (chromeApi.runtime?.lastError) return reject(new Error(chromeApi.runtime.lastError.message));
          if (!response?.ok) { const error=new Error(response?.error||'Unbekannter Fehler'); if(response?.errorCode) error.code=String(response.errorCode); if(response?.errorDetails&&typeof response.errorDetails==='object') error.details={...response.errorDetails}; return reject(error); }
          resolve(response.result);
        }));
      }
      async function tabMessage(tabId, message, options = {}) {
        const started = Date.now();
        let initialError = null;
        const operation = message?.type || 'tab-message';
        try {
          return await tabMessageOnce(tabId, message);
        } catch (error) {
          initialError = error;
          if (isTabGoneError(error)) return classifyTabLifecycleFailure(tabId, error, operation);
          if (!transientTabMessageError(error)) {
            void logEvent('TAB_MESSAGE_FAILED', { tabId, transient: false, terminal: true, message: String(error.message || error).slice(0, 300) }, 'error', operation);
            throw error;
          }
        }

        const tabBeforeBootstrap = await chromeApi.tabs.get(tabId).catch(() => null);
        if (!tabBeforeBootstrap) return classifyTabLifecycleFailure(tabId, initialError, operation);

        let bridge;
        try {
          bridge = await runtimeMessage({ type: 'ENSURE_CONTENT_CONNECTION', tabId });
        } catch (error) {
          if (isTabGoneError(error) || isTabDiscardedError(error)) return classifyTabLifecycleFailure(tabId, error, operation);
          void logEvent('TAB_CONNECTION_FAILED', { tabId, terminal: true, durationMs: Date.now() - started, initialMessage: String(initialError?.message || initialError || '').slice(0, 300), message: String(error.message || error).slice(0, 500) }, 'error', operation);
          throw error;
        }

        const attempts = Math.max(1, Number(options.attempts || 3));
        const waits = [90, 180];
        let lastError = initialError;
        for (let attempt = 1; attempt <= attempts; attempt += 1) {
          if (attempt > 1) await new Promise(resolve => setTimeout(resolve, waits[Math.min(attempt - 2, waits.length - 1)]));
          try {
            const result = await tabMessageOnce(tabId, message);
            void logEvent('TAB_CONNECTION_RECOVERED', { tabId, bootstrapped: Boolean(bridge?.bootstrapped), attempt, durationMs: Date.now() - started }, 'info', operation);
            return result;
          } catch (error) {
            lastError = error;
            if (!transientTabMessageError(error)) break;
          }
        }
        if (isTabGoneError(lastError) || isTabDiscardedError(lastError)) return classifyTabLifecycleFailure(tabId, lastError, operation);
        const tabAfterRetries = await chromeApi.tabs.get(tabId).catch(() => null);
        if (!tabAfterRetries) return classifyTabLifecycleFailure(tabId, lastError, operation);
        void logEvent('TAB_MESSAGE_FAILED', { tabId, transient: transientTabMessageError(lastError), terminal: true, attemptsAfterBootstrap: attempts, durationMs: Date.now() - started, message: String(lastError?.message || lastError || '').slice(0, 500) }, 'error', operation);
        throw lastError || new Error('Kleinanzeigen-Tab konnte nicht erreicht werden.');
      }
      async function queryKleinanzeigenTabs(managedWorkerIds = new Set()) {
        const tabs=await chromeApi.tabs.query({url:['https://www.kleinanzeigen.de/*','https://kleinanzeigen.de/*']});
        const userTabs=tabs.filter(tab=>tab?.id&&tab?.url&&!managedWorkerIds.has(Number(tab.id)));
        const discardedTabs=userTabs.filter(tab=>Boolean(tab.discarded));
        const activeTabs=userTabs.filter(tab=>!tab.discarded).sort((a,b)=>Number(b.active)-Number(a.active)||Number(b.lastAccessed||0)-Number(a.lastAccessed||0));
        return {userTabs,discardedTabs,activeTabs};
      }
      return Object.freeze({ transientTabMessageError,isExpectedTabClosedError,isTabGoneError,isTabDiscardedError,lifecycleTabError,classifyTabLifecycleFailure,tabMessageOnce,tabMessage,queryKleinanzeigenTabs });
    }
  });
  globalThis.KRDeps?.register?.('KRTabPageInspectionController',API);
})();
