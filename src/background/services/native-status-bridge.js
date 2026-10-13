// KAR-69: Background-owned read-only Native Messaging status bridge.
(() => {
  'use strict';
  function create({ gateway, getExtensionId, getAppUrl }) {
    if (typeof gateway?.request !== 'function'
      || typeof getExtensionId !== 'function' || typeof getAppUrl !== 'function') throw new Error('Native status bridge dependencies required');
    async function status(message, sender) {
      if (!message || typeof message !== 'object' || Array.isArray(message)
        || Object.keys(message).length !== 1 || message.type !== 'GET_NATIVE_UPDATE_STATUS'
        || !sender || typeof sender !== 'object' || sender.tab
        || typeof sender.id !== 'string' || sender.id !== getExtensionId()
        || typeof sender.url !== 'string' || sender.url !== getAppUrl()
        || (sender.origin && sender.origin !== getAppUrl().slice(0, getAppUrl().indexOf('/', 'chrome-extension://'.length)))) {
        const error = new Error('Native status is only available to the trusted extension app window.');
        error.code = 'KAR_NATIVE_UNTRUSTED_SENDER';
        throw error;
      }
      return gateway.request('check');
    }
    return Object.freeze({ status });
  }
  const api = Object.freeze({ create });
  globalThis.KRDeps?.register?.('KRNativeStatusBridge', api);
  if (typeof module !== 'undefined' && module?.exports) module.exports = api;
})();
