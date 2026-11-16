(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root?.KRDeps?.register?.('KRInventoryView', api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeSearch(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('de-DE')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function searchMatchesTitle(record, query) {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return true;
    const title = normalizeSearch(record?.title || '');
    return normalizedQuery.split(' ').filter(Boolean).every(term => title.includes(term));
  }

  function displayDateToTimestamp(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    const direct = Date.parse(text);
    if (Number.isFinite(direct)) return direct;
    const match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!match) return null;
    const [, day, month, year] = match;
    const ts = Date.UTC(Number(year), Number(month) - 1, Number(day));
    return Number.isFinite(ts) ? ts : null;
  }

  function dateValue(record, key) {
    if (key === 'listingDate') {
      return displayDateToTimestamp(record?.listingMeta?.listingDateIso || record?.listingMeta?.listingDateDisplay || record?.insertionMeta?.confirmedAt);
    }
    if (key === 'endDate') {
      return displayDateToTimestamp(record?.listingMeta?.endDateIso || record?.listingMeta?.endDateDisplay || record?.endDateDisplay);
    }
    if (key === 'inventoryDate') return displayDateToTimestamp(record?.capturedAt);
    return null;
  }

  function compareText(a, b) {
    return String(a || '').localeCompare(String(b || ''), 'de-DE', { sensitivity: 'base', numeric: true });
  }

  function deterministicTieBreak(a, b) {
    const byTitle = compareText(a?.title, b?.title);
    if (byTitle) return byTitle;
    return compareText(a?.adId, b?.adId);
  }

  function compareRecords(a, b, sortKey, direction) {
    const dir = direction === 'asc' ? 1 : -1;
    if (sortKey === 'title') {
      const result = compareText(a?.title, b?.title);
      return result ? result * dir : deterministicTieBreak(a, b);
    }

    const aValue = dateValue(a, sortKey);
    const bValue = dateValue(b, sortKey);
    const aMissing = aValue === null;
    const bMissing = bValue === null;
    if (aMissing && bMissing) return deterministicTieBreak(a, b);
    if (aMissing) return 1;
    if (bMissing) return -1;
    if (aValue !== bValue) return (aValue - bValue) * dir;
    return deterministicTieBreak(a, b);
  }

  function deriveInventoryView(records, options = {}) {
    const query = options.query || '';
    const sortKey = ['title', 'listingDate', 'endDate', 'inventoryDate'].includes(options.sortKey) ? options.sortKey : 'endDate';
    const direction = options.direction === 'desc' ? 'desc' : 'asc';
    return [...(records || [])]
      .filter(record => searchMatchesTitle(record, query))
      .sort((a, b) => compareRecords(a, b, sortKey, direction));
  }

  // Trash ordering is presentation-only. The worker remains authoritative for
  // profile scope, retention projection, restoration and local expiry cleanup.
  function canonicalTrashDeadline(record) {
    if (record?.trash?.retentionIndefinite === true) return { rank: 1, value: null };
    const text = record?.trash?.expiresAt;
    if (typeof text !== 'string') return { rank: 2, value: null };
    // Only real ISO-8601 timestamps are sortable. Do not treat German display
    // dates or JS-normalized invalid calendar days as canonical expiry values.
    const match = /^(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2}):(\\d{2}):(\\d{2})(?:\\.(\\d{1,3}))?(Z|[+-]\\d{2}:\\d{2})$/.exec(text);
    if (!match) return { rank: 2, value: null };
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const hour = Number(match[4]), minute = Number(match[5]), second = Number(match[6]);
    const milliseconds = Number((match[7] || '0').padEnd(3, '0'));
    const civil = new Date(0);
    civil.setUTCFullYear(year, month - 1, day);
    civil.setUTCHours(hour, minute, second, milliseconds);
    if (civil.getUTCFullYear() !== year || civil.getUTCMonth() !== month - 1 ||
        civil.getUTCDate() !== day || civil.getUTCHours() !== hour ||
        civil.getUTCMinutes() !== minute || civil.getUTCSeconds() !== second) {
      return { rank: 2, value: null };
    }
    if (match[8] !== 'Z') {
      const offset = match[8].slice(1).split(':').map(Number);
      if (offset[0] > 23 || offset[1] > 59) return { rank: 2, value: null };
    }
    const value = Date.parse(text);
    return Number.isFinite(value) ? { rank: 0, value } : { rank: 2, value: null };
  }

  function compareStableTrashIds(a, b) {
    // inventoryId is the canonical local record key. Additional fields only
    // stabilize malformed fixtures with missing or duplicated record IDs.
    for (const key of ['inventoryId', 'adId', 'profileId', 'title']) {
      const left = String(a?.[key] ?? '');
      const right = String(b?.[key] ?? '');
      if (left !== right) return left < right ? -1 : 1;
    }
    return 0;
  }

  function deriveTrashView(records, options = {}) {
    const direction = options.direction === 'asc' ? 1 : -1; // preserve newest-first default
    return [...(Array.isArray(records) ? records : [])].sort((a, b) => {
      const left = canonicalTrashDeadline(a);
      const right = canonicalTrashDeadline(b);
      // Finite deadlines, then genuine unlimited retention (∞), then missing/
      // corrupt values, in either direction; never manufacture a deadline.
      if (left.rank !== right.rank) return left.rank - right.rank;
      if (left.rank === 0 && left.value !== right.value) {
        return (left.value < right.value ? -1 : 1) * direction;
      }
      return compareStableTrashIds(a, b);
    });
  }

  function priceTypeParts(price) {
    const technical = String(price?.type || '').trim().toUpperCase();
    const display = String(price?.typeDisplay || '').trim();
    const normalizedDisplay = normalizeSearch(display);
    if (technical === 'FIXED' || normalizedDisplay === 'festpreis') return { short: 'FP', long: display || 'Festpreis' };
    if (technical === 'NEGOTIABLE' || normalizedDisplay === 'verhandlungsbasis') return { short: 'VB', long: display || 'Verhandlungsbasis' };
    return null;
  }

  return {
    deriveInventoryView,
    deriveTrashView,
    priceTypeParts
  };
});
