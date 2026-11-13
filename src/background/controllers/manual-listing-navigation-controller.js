// Account-neutral manual edit/open-public navigation, with exact ID/URL
// validation and unchanged diagnostic/pending-navigation semantics.
(() => {
  'use strict';
  const deps=globalThis.KRDeps;if(!deps)throw Error('KRDeps must load before manual-listing-navigation-controller');
  const API=Object.freeze({
    create(options={}) {
      const {normalBrowserWindowId,createAutomationTab,waitForTabComplete,chrome}=options.navigationPort||{};
      const {getInventory,normalizeKnownPublicAdUrl,publicUrlForInventoryRecord,directPublicUrlForAdId}=options.evidencePort||{};
      const {logDiagnostic}=options.diagnosticsPort||{};
      if ([normalBrowserWindowId,createAutomationTab,waitForTabComplete,getInventory,normalizeKnownPublicAdUrl,publicUrlForInventoryRecord,directPublicUrlForAdId,logDiagnostic].some(fn=>typeof fn!=='function') || !chrome?.windows?.update || !chrome?.tabs?.get)
        throw Error('KRManualListingNavigationController requires trusted tab, read-only evidence and diagnostic ports');

      async function openEditAd(message) {
        const adId = String(message?.adId || '');
        if (!/^\d+$/.test(adId)) throw new Error('Anzeigen-ID ist ungültig.');
        const url = `https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=${encodeURIComponent(adId)}`;
        const windowId = await normalBrowserWindowId();
        const tab = await createAutomationTab({ ...(windowId ? { windowId } : {}), url, active: true });
        if (!tab?.id) throw new Error('Bearbeiten-Tab konnte nicht geöffnet werden.');
        if (windowId) await chrome.windows.update(windowId, { focused: true }).catch(() => {});
        await logDiagnostic('info', 'EDIT_AD_OPENED', { adId, tabId: tab.id, windowId: tab.windowId ?? windowId }, { module: 'background', operation: 'open-edit-ad', context: { adId, tabId: tab.id } }).catch(() => {});
        return { adId, tabId: tab.id };
      }

      async function openReadOnlyAd(message) {
        const adId = String(message?.adId || '');
        if (!/^\d+$/.test(adId)) throw new Error('Anzeigen-ID ist ungültig.');

        let url = '';
        let urlSource = 'id-fallback';
        const inventoryId = String(message?.inventoryId || '');
        const inventoryRecord = inventoryId ? await getInventory(inventoryId).catch(() => null) : null;
        if (inventoryRecord && String(inventoryRecord?.adId || '') === adId) {
          url = normalizeKnownPublicAdUrl(publicUrlForInventoryRecord(inventoryRecord), adId);
          if (url) urlSource = 'inventory-public-url';
        }
        if (!url) {
          url = normalizeKnownPublicAdUrl(message?.publicUrl, adId);
          if (url) urlSource = 'message-public-url';
        }
        if (!url) url = directPublicUrlForAdId(adId);

        const windowId = await normalBrowserWindowId();
        const tab = await createAutomationTab({ ...(windowId ? { windowId } : {}), url, active: true });
        if (!tab?.id) throw new Error('Die öffentliche Anzeige konnte nicht geöffnet werden.');
        if (windowId) await chrome.windows.update(windowId, { focused: true }).catch(() => {});
        await logDiagnostic('info', 'READONLY_AD_OPENED', {
          adId, inventoryId: inventoryId || null, tabId: tab.id, windowId: tab.windowId ?? windowId,
          requestedUrl: url, urlSource
        }, { module: 'background', operation: 'open-readonly-ad', context: { adId, tabId: tab.id } }).catch(() => {});

        let finalTab = null;
        try {
          finalTab = await waitForTabComplete(tab.id, {
            timeoutMs: 12000,
            purpose: 'read-only-navigation',
            label: 'Öffentliche Anzeige',
            operation: 'open-readonly-ad',
            context: { adId, tabId: tab.id }
          });
        } catch (error) {
          finalTab = await chrome.tabs.get(tab.id).catch(() => null);
          await logDiagnostic('info', 'READONLY_AD_NAVIGATION_PENDING', {
            adId, tabId: tab.id, requestedUrl: url, urlSource,
            currentUrl: String(finalTab?.url || '').slice(0, 1200),
            message: String(error?.message || error || '').slice(0, 500)
          }, { module: 'background', operation: 'open-readonly-ad', context: { adId, tabId: tab.id } }).catch(() => {});
        }
        if (finalTab?.url) {
          const finalUrl = String(finalTab.url);
          const finalPublicUrl = normalizeKnownPublicAdUrl(finalUrl, adId);
          await logDiagnostic(finalPublicUrl ? 'info' : 'warning', 'READONLY_AD_NAVIGATION_RESOLVED', {
            adId, tabId: tab.id, requestedUrl: url, urlSource, finalUrl: finalUrl.slice(0, 1200),
            expectedAdConfirmed: Boolean(finalPublicUrl)
          }, { module: 'background', operation: 'open-readonly-ad', context: { adId, tabId: tab.id } }).catch(() => {});
        }
        return { adId, tabId: tab.id, url, urlSource, finalUrl: finalTab?.url || null };
      }

      return Object.freeze({openEditAd,openReadOnlyAd});
    }
  });
  deps.register('KRManualListingNavigationController',API);
})();
