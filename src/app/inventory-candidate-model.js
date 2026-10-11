(() => {
  'use strict';

  function buildSingleInventoryCandidates(entries = []) {
    const byAdId = new Map();
    const sourcePriority = entry => {
      const mode = String(entry?.preview?.viewMode || '');
      return (mode === 'edit' ? 4 : mode === 'public' ? 2 : 0) + (entry?.tab?.active ? 1 : 0);
    };
    for (const entry of entries) {
      const preview = entry?.preview;
      const tab = entry?.tab;
      const adId = String(preview?.adId || '');
      const tabId = Number(tab?.id || 0);
      if (!/^\d+$/.test(adId) || !tabId) continue;
      const mode = String(preview?.viewMode || '') === 'edit' ? 'edit' : 'public';
      const existing = byAdId.get(adId);
      if (!existing) {
        byAdId.set(adId, {
          adId,
          title: String(preview?.title || `Anzeige ${adId}`).trim() || `Anzeige ${adId}`,
          thumbnailUrl: String(preview?.thumbnailUrl || ''),
          thumbnailSource: String(preview?.thumbnailSource || (preview?.thumbnailUrl ? 'unknown' : 'none')),
          profileName: String(preview?.profileName || ''),
          sourceTabId: tabId,
          sourceViewMode: mode,
          tabIds: [tabId],
          viewModes: [mode],
          active: Boolean(tab?.active),
          lastAccessed: Number(tab?.lastAccessed || 0),
          _sourcePriority: sourcePriority(entry)
        });
        continue;
      }
      if (!existing.tabIds.includes(tabId)) existing.tabIds.push(tabId);
      if (!existing.viewModes.includes(mode)) existing.viewModes.push(mode);
      if (!existing.thumbnailUrl && preview?.thumbnailUrl) {
        existing.thumbnailUrl = String(preview.thumbnailUrl);
        existing.thumbnailSource = String(preview?.thumbnailSource || 'unknown');
      }
      if ((!existing.title || existing.title === `Anzeige ${adId}`) && preview?.title) existing.title = String(preview.title).trim();
      if (!existing.profileName && preview?.profileName) existing.profileName = String(preview.profileName);
      const priority = sourcePriority(entry);
      const lastAccessed = Number(tab?.lastAccessed || 0);
      if (priority > existing._sourcePriority || (priority === existing._sourcePriority && lastAccessed > existing.lastAccessed)) {
        existing.sourceTabId = tabId;
        existing.sourceViewMode = mode;
        existing._sourcePriority = priority;
        existing.lastAccessed = lastAccessed;
      }
      existing.active ||= Boolean(tab?.active);
      existing.lastAccessed = Math.max(existing.lastAccessed, lastAccessed);
    }
    return [...byAdId.values()]
      .sort((a, b) => Number(b.active) - Number(a.active) || b.lastAccessed - a.lastAccessed)
      .map(({ _sourcePriority, ...candidate }) => candidate);
  }

  function createMembershipSnapshot(records, trashRecords) {
    const toStableIds = source => new Set((Array.isArray(source) ? source : [])
      .map(record => String(record?.adId || '').trim())
      .filter(adId => /^\d+$/.test(adId)));
    return Object.freeze({ inventoryIds: toStableIds(records), trashIds: toStableIds(trashRecords) });
  }

  function storageState(adId, snapshot = {}) {
    const normalizedAdId = String(adId || '').trim();
    if (!/^\d+$/.test(normalizedAdId)) return 'unknown';
    if (snapshot.inventoryIds?.has?.(normalizedAdId)) return 'inventory';
    if (snapshot.trashIds?.has?.(normalizedAdId)) return 'trash';
    return 'new';
  }

  const API = Object.freeze({ buildSingleInventoryCandidates, createMembershipSnapshot, storageState });
  globalThis.KRDeps?.register?.('KRInventoryCandidateModel', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
