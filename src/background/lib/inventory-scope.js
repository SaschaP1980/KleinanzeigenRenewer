(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root?.KRDeps?.register?.('KRInventoryScope', api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const INVENTORY_SCOPE_NEW_ONLY = 'new-only';
  const INVENTORY_SCOPE_ALL = 'all';

  function normalizeInventoryScope(value) {
    return String(value || '').toLowerCase() === INVENTORY_SCOPE_ALL ? INVENTORY_SCOPE_ALL : INVENTORY_SCOPE_NEW_ONLY;
  }

  function isTrashRecord(record) {
    return String(record?.recordKind || '') === 'trash' || Boolean(record?.trash?.trashedAt);
  }

  function activeInventoryAdIds(records, profileId) {
    const wantedProfileId = String(profileId || '');
    const ids = [];
    const seen = new Set();
    for (const record of Array.isArray(records) ? records : []) {
      if (isTrashRecord(record) || String(record?.profileId || '') !== wantedProfileId) continue;
      const adId = String(record?.adId || '').trim();
      if (!/^\d+$/.test(adId) || seen.has(adId)) continue;
      seen.add(adId);
      ids.push(adId);
    }
    return ids;
  }

  function shouldSkipExisting(scope, existingInventoryIds, adId) {
    if (normalizeInventoryScope(scope) !== INVENTORY_SCOPE_NEW_ONLY) return false;
    const wanted = String(adId || '').trim();
    if (!/^\d+$/.test(wanted)) return false;
    const existing = existingInventoryIds instanceof Set
      ? existingInventoryIds
      : new Set((Array.isArray(existingInventoryIds) ? existingInventoryIds : []).map(value => String(value || '')));
    return existing.has(wanted);
  }

  return { INVENTORY_SCOPE_NEW_ONLY, INVENTORY_SCOPE_ALL, normalizeInventoryScope, activeInventoryAdIds, shouldSkipExisting };
});
