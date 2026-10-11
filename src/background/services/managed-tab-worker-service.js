(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const tabRegistry = options.tabRegistry;
      const chromeTabs = options.chromeTabs;
      const createAutomationTab = options.createAutomationTab;
      const updateAutomationTab = options.updateAutomationTab;
      if (!tabRegistry || !chromeTabs || typeof createAutomationTab !== 'function' || typeof updateAutomationTab !== 'function') {
        throw new Error('KRManagedTabWorkerService requires tabRegistry, chromeTabs and automation tab functions');
      }

      async function registerManagedWorkerTab(tabId, kind = 'worker', owner = {}) {
        return tabRegistry.registerManagedWorker(tabId, kind, owner);
      }
      async function markManagedWorkerTabClosed(tabId) {
        return tabRegistry.markGone(tabId, 'managed-worker-closed');
      }
      async function getManagedWorkerTabIds() { return tabRegistry.managedTabIds(); }
      async function getTabRegistrySnapshot() { return tabRegistry.snapshot(); }

      async function createManagedWorkerTab(createOptions, kind, owner = {}) {
        const initial = { ...createOptions, url: 'about:blank', active: false };
        const targetUrl = String(createOptions?.url || '');
        const tab = await createAutomationTab(initial);
        if (!tab?.id) throw new Error('Hintergrund-Worker konnte nicht geöffnet werden.');
        await registerManagedWorkerTab(tab.id, kind, owner);
        try {
          if (targetUrl && targetUrl !== 'about:blank') await updateAutomationTab(tab.id, { url: targetUrl });
          return await tabRegistry.getTabOrThrow(tab.id, chromeTabs, { label: 'Hintergrund-Worker', owner });
        } catch (error) {
          await tabRegistry.closeTab(tab.id, chromeTabs, { label: 'Hintergrund-Worker', reason: 'managed-worker-create-failed' }).catch(() => {});
          throw error;
        }
      }

      async function closeRegistryTab(tabId, reason = 'workflow-close', label = 'Kleinanzeigen-Tab') {
        const id = Number(tabId || 0);
        if (!id) return { closed: false, alreadyGone: true, entry: null };
        return tabRegistry.closeTab(id, chromeTabs, { label, reason });
      }
      async function closeRegistryTabs(tabIds, reason = 'workflow-close', label = 'Kleinanzeigen-Tab') {
        return Promise.all([...new Set((tabIds || []).map(value => Number(value || 0)).filter(Boolean))]
          .map(tabId => closeRegistryTab(tabId, reason, label).catch(() => null)));
      }
      async function closeManagedWorkerTab(tabId) {
        return closeRegistryTab(tabId, 'managed-worker-closed', 'Hintergrund-Worker');
      }
      async function registerShadowTab(tabId, role, owner = {}, registrationOptions = {}) {
        const id = Number(tabId || 0);
        if (!id) return null;
        const tab = await chromeTabs.get(id).catch(() => null);
        return tabRegistry.register(id, {
          role,
          owner,
          managed: registrationOptions.managed === true,
          kind: registrationOptions.kind || null,
          url: tab?.url || registrationOptions.url || null,
          windowId: tab?.windowId ?? registrationOptions.windowId ?? null
        });
      }
      function isKleinanzeigenTabUrl(rawUrl) {
        try {
          const url = new URL(String(rawUrl || ''));
          return url.protocol === 'https:' && /^(?:www\.)?kleinanzeigen\.de$/i.test(url.hostname);
        } catch { return false; }
      }
      async function reactivateDiscardedTabs(message = {}) {
        const tabIds = [...new Set((Array.isArray(message.tabIds) ? message.tabIds : []).map(value => Number(value || 0)).filter(Boolean))].slice(0, 50);
        const results = [];
        for (const tabId of tabIds) {
          try {
            const entry = await tabRegistry.get(tabId).catch(() => null);
            const tab = await tabRegistry.getTabOrThrow(tabId, chromeTabs, { label: entry?.managed ? 'Hintergrund-Worker' : 'Kleinanzeigen-Tab', allowDiscarded: true });
            if (!isKleinanzeigenTabUrl(tab?.url)) { results.push({ tabId, ok: false, skipped: true, reason: 'not-kleinanzeigen' }); continue; }
            if (!tab.discarded) { results.push({ tabId, ok: true, reloaded: false, reason: 'already-active' }); continue; }
            await tabRegistry.reloadTabOrThrow(tabId, chromeTabs, { label: 'Pausierter Kleinanzeigen-Tab' });
            results.push({ tabId, ok: true, reloaded: true, reason: 'reload-started' });
          } catch (error) {
            results.push({
              tabId, ok: false, skipped: false,
              reason: options.isGoneError?.(error) ? 'gone' : options.isDiscardedError?.(error) ? 'discarded' : 'reload-failed',
              error: String(error?.message || error).slice(0, 300)
            });
          }
        }
        return {
          requested: tabIds.length,
          succeeded: results.filter(item => item.ok).length,
          failed: results.filter(item => !item.ok && !item.skipped).length,
          skipped: results.filter(item => item.skipped).length,
          results
        };
      }

      return Object.freeze({
        registerManagedWorkerTab, markManagedWorkerTabClosed, getManagedWorkerTabIds, getTabRegistrySnapshot,
        createManagedWorkerTab, closeRegistryTab, closeRegistryTabs, closeManagedWorkerTab, registerShadowTab,
        isKleinanzeigenTabUrl, reactivateDiscardedTabs
      });
    }
  });
  globalThis.KRDeps?.register?.('KRManagedTabWorkerService', API);
})();
