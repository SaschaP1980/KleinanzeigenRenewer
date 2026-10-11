(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root?.KRDeps?.register?.('KRInventoryReconciliation', api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeRosterIds(values) {
    const ids = (Array.isArray(values) ? values : []).map(value => String(value || '').trim());
    if (ids.some(id => !/^\d+$/.test(id))) throw new Error('Anzeigenbestand enthält eine ungültige Anzeigen-ID.');
    if (new Set(ids).size !== ids.length) throw new Error('Anzeigenbestand enthält auf derselben Seite doppelte Anzeigen-IDs.');
    return ids;
  }

  function rosterEvidence(pages) {
    const entries = Object.entries(pages && typeof pages === 'object' ? pages : {})
      .map(([page, ids]) => [Number(page), Array.isArray(ids) ? ids.map(value => String(value || '')) : []])
      .filter(([page]) => Number.isInteger(page) && page > 0)
      .sort((a, b) => a[0] - b[0]);
    const ids = [];
    const seen = new Set();
    const duplicates = [];
    for (const [, pageIds] of entries) {
      for (const id of pageIds) {
        if (seen.has(id)) duplicates.push(id);
        else { seen.add(id); ids.push(id); }
      }
    }
    const pagesContiguous = entries.every(([page], index) => page === index + 1);
    return { ids, duplicates: [...new Set(duplicates)], pageCount: entries.length, pagesContiguous, lastPage: entries.at(-1)?.[0] || 0 };
  }

  function sameIdSet(firstValues, secondValues) {
    const first = new Set((firstValues || []).map(String));
    const second = new Set((secondValues || []).map(String));
    if (first.size !== second.size) return false;
    for (const id of first) if (!second.has(id)) return false;
    return true;
  }

  function completeRoster(evidence, expectedTotal, invalidReason = null) {
    const expected = Number(expectedTotal || 0);
    return Number.isInteger(expected) && expected >= 0 && evidence?.ids?.length === expected && !(evidence?.duplicates?.length) && (expected === 0 || evidence?.pagesContiguous === true) && !invalidReason;
  }

  const FRESH_RECONCILIATION_SOURCE_MAX_ATTEMPTS = 2;

  function normalizedProfileName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('de-DE');
  }

  function validateFreshReconciliationSourceStatus(status, { expectedTotal = 0, expectedProfileName = '' } = {}) {
    if (!status || status.isMyAdsPage !== true || status.isProjectsTab !== true) {
      return { ok: false, retryable: false, reason: 'Die Seite „Meine Anzeigen“ wurde für die zweite Bestandsprüfung nicht eindeutig geöffnet.' };
    }
    const page = Number(status.currentPage || 0);
    if (page !== 1) return { ok: false, retryable: false, reason: `Die zweite Bestandsprüfung muss auf Seite 1 beginnen (erkannt: Seite ${page || '?'}).` };
    const wantedProfile = normalizedProfileName(expectedProfileName);
    const actualProfile = normalizedProfileName(status.profileName);
    if (!wantedProfile || !actualProfile || wantedProfile !== actualProfile) {
      return { ok: false, retryable: false, reason: 'Das erkannte Kleinanzeigen-Konto stimmt vor der zweiten Bestandsprüfung nicht mit dem ausgewählten Inventarprofil überein.' };
    }
    const expected = Number(expectedTotal);
    const online = status.expectedOnline === null || status.expectedOnline === undefined || status.expectedOnline === '' ? null : Number(status.expectedOnline);
    if (!Number.isInteger(expected) || expected < 0 || !Number.isInteger(online) || online < 0 || online !== expected) {
      return { ok: false, retryable: true, reason: `Der Online-Bestand hat sich vor der zweiten Bestandsprüfung geändert (${Number.isInteger(online) ? online : '?'} statt ${Number.isInteger(expected) ? expected : '?'}).` };
    }
    return { ok: true, retryable: false, reason: null, page, onlineCount: online, profileName: String(status.profileName || '').trim() };
  }

  function selectAbsentCandidates(records, profileId, remoteIds, protectedIds = new Set()) {
    const remote = new Set((remoteIds || []).map(String));
    const protectedSet = protectedIds instanceof Set ? protectedIds : new Set((protectedIds || []).map(String));
    return (Array.isArray(records) ? records : []).filter(record => {
      const isTrash = String(record?.recordKind || '') === 'trash' || Boolean(record?.trash?.trashedAt);
      if (isTrash || String(record?.profileId || '') !== String(profileId || '')) return false;
      const adId = String(record?.adId || '');
      if (!/^\d+$/.test(adId) || remote.has(adId)) return false;
      return !protectedSet.has(String(record?.inventoryId || ''));
    });
  }

  return { normalizeRosterIds, rosterEvidence, sameIdSet, completeRoster, selectAbsentCandidates, FRESH_RECONCILIATION_SOURCE_MAX_ATTEMPTS };
});
