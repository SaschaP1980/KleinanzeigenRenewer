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
    priceTypeParts
  };
});
