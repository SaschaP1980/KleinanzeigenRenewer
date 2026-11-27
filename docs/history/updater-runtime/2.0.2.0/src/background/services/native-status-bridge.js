// KAR-69: Background-owned read-only Native Messaging status bridge.
(() => {
  'use strict';
  function create({ gateway, getExtensionId, getAppUrl, getAppWindowId, getWindow, getTab }) {
    if (typeof gateway?.request !== 'function'
      || typeof getExtensionId !== 'function' || typeof getAppUrl !== 'function'
      || typeof getAppWindowId !== 'function' || typeof getWindow !== 'function'
      || typeof getTab !== 'function') throw new Error('Native status bridge dependencies required');

    function untrusted() {
      const error = new Error('Native status is only available to the trusted extension app window.');
      error.code = 'KAR_NATIVE_UNTRUSTED_SENDER';
      return error;
    }

    async function status(message, sender) {
      const appUrl = getAppUrl();
      const tab = sender?.tab;
      if (!message || typeof message !== 'object' || Array.isArray(message)
        || Object.keys(message).length !== 1 || message.type !== 'GET_NATIVE_UPDATE_STATUS'
        || !sender || typeof sender !== 'object'
        || sender.id !== getExtensionId() || sender.url !== appUrl
        || (sender.origin && sender.origin !== appUrl.slice(0, appUrl.indexOf('/', 'chrome-extension://'.length)))
        || !tab || typeof tab !== 'object'
        || !Number.isSafeInteger(tab.id) || tab.id <= 0
        || !Number.isSafeInteger(tab.windowId) || tab.windowId <= 0) throw untrusted();

      // Chrome-created app popups have sender.tab. Require authoritative ownership
      // of that exact window AND its live tab; matching app URL alone is insufficient.
      let trusted = false;
      try {
        const ownedWindowId = await getAppWindowId();
        if (Number.isSafeInteger(ownedWindowId) && ownedWindowId > 0
          && tab.windowId === ownedWindowId) {
          const [liveWindow, liveTab] = await Promise.all([
            getWindow(ownedWindowId), getTab(tab.id)
          ]);
          trusted = liveWindow?.id === ownedWindowId && liveWindow?.type === 'popup'
            && liveTab?.id === tab.id && liveTab?.windowId === ownedWindowId;
        }
      } catch {
        // Closed window, revoked browser access, or missing session: deny.
      }
      if (!trusted) throw untrusted();
      return gateway.request('check');
    }
    return Object.freeze({ status });
  }
  const api = Object.freeze({ create });
  globalThis.KRDeps?.register?.('KRNativeStatusBridge', api);
  if (typeof module !== 'undefined' && module?.exports) module.exports = api;
})();
