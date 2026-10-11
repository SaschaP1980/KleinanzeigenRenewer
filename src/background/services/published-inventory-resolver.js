(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const getTab = options.getTab;
      const updateTab = options.updateTab;
      const waitForExpectedComplete = options.waitForExpectedComplete;
      const ensureContentConnection = options.ensureContentConnection;
      const tabMessage = options.tabMessage;
      const log = typeof options.log === 'function' ? options.log : async () => {};
      if (![getTab, updateTab, waitForExpectedComplete, ensureContentConnection, tabMessage].every(fn => typeof fn === 'function')) {
        throw new Error('KRPublishedInventoryResolver requires tab lifecycle dependencies');
      }
      async function resolve({ tabId, adId }) {
        const id = Number(tabId || 0) || null;
        const expectedAdId = String(adId || '');
        if (!id || !/^\d+$/.test(expectedAdId)) throw new Error('Die veröffentlichte Anzeige konnte nicht eindeutig zugeordnet werden.');
        const tab = await getTab(id);
        if (!tab) throw new Error('Der bekannte Kleinanzeigen-Tab ist nicht mehr geöffnet.');
        const editUrl = `https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=${encodeURIComponent(expectedAdId)}`;
        const currentUrl = String(tab.url || '');
        const alreadyEdit = /\/p-anzeige-bearbeiten\.html$/i.test((() => { try { return new URL(currentUrl).pathname; } catch { return ''; } })())
          && (() => { try { return String(new URL(currentUrl).searchParams.get('adId') || '') === expectedAdId; } catch { return false; } })();
        if (!alreadyEdit) {
          await updateTab(id, { url: editUrl, active: true });
          await waitForExpectedComplete(id, editUrl, { timeoutMs: 20000, purpose: 'trash-template-known-published-capture', label: 'Veröffentlichte Anzeige' });
        }
        await ensureContentConnection({ tabId: id });
        const page = await tabMessage(id, { type: 'PAGE_STATUS' });
        const pageAdId = String(page?.adId || '');
        if (page?.auth?.loggedIn !== true || page?.auth?.ownAd !== true || pageAdId !== expectedAdId) {
          throw new Error('Die veröffentlichte Anzeige konnte nicht als eigene Anzeige bestätigt werden.');
        }
        const preview = await tabMessage(id, { type: 'INVENTORY_CANDIDATE_PREVIEW' });
        if (!preview || String(preview.adId || '') !== expectedAdId) {
          throw new Error('Die veröffentlichte Anzeige konnte im eigenen Anzeigenkontext nicht eindeutig zugeordnet werden.');
        }
        await log('KNOWN_PUBLISHED_INVENTORY_CONTEXT_READY', { tabId: id, adId: expectedAdId, editUrl });
        return { ...preview, sourceTabId: id, tabIds: [id] };
      }
      return Object.freeze({ resolve });
    }
  });
  globalThis.KRDeps?.register?.('KRPublishedInventoryResolver', API);
})();
