(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const document = options.document || globalThis.document;
      const InventoryView = options.inventoryView || null;

      function formatDate(value) {
        return new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
      }

      function displayPrice(record) {
        const value = record.price?.displayed || record.price?.value || '–';
        const normalized = String(value).trim();
        if (/€|EUR/i.test(normalized)) return normalized;
        return record.price?.value ? `${record.price.value} €` : normalized;
      }

      function displayPriceWithType(record) {
        const amount = displayPrice(record);
        const parts = InventoryView?.priceTypeParts?.(record.price);
        return parts ? `${amount} · ${parts.short} / ${parts.long}` : amount;
      }

      function categoryLabel(record) {
        return record.category?.path?.join(' › ') || record.categoryPath?.join(' › ') || '–';
      }

      function compactCategoryLabel(record) {
        const path = Array.isArray(record?.category?.path) && record.category.path.length
          ? record.category.path
          : Array.isArray(record?.categoryPath) ? record.categoryPath : [];
        if (path.length) return String(path[path.length - 1] || '–');
        const full = String(categoryLabel(record) || '–');
        const parts = full.split(/\s*[›>]\s*/).filter(Boolean);
        return parts.length ? parts[parts.length - 1] : '–';
      }

      function compactActionIcon(name) {
        const icon = document.createElement('span');
        icon.className = `compact-action-icon action-${name}`;
        icon.setAttribute('aria-hidden', 'true');
        return icon;
      }

      function makeCompactIconButton({ icon, label, title = label, danger = false }) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `compact-icon-button${danger ? ' danger' : ''}`;
        button.setAttribute('aria-label', label);
        button.title = title;
        button.append(compactActionIcon(icon));
        return button;
      }

      function artLabel(record) {
        const item = (record.dynamicAttributes || []).find(attribute => String(attribute.label || '').trim().toLocaleLowerCase('de-DE') === 'art');
        return item?.displayValue || item?.technicalValue || '–';
      }

      function endDateLabel(record) {
        return record.listingMeta?.endDateDisplay || record.endDateDisplay || '–';
      }

      function formatCalendarDate(value) {
        const parsed = new Date(value);
        if (!Number.isFinite(parsed.getTime())) return '–';
        return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed);
      }

      function listingDatePresentation(record) {
        const derived = Boolean(record?.listingMeta?.listingDateDerived) || String(record?.listingMeta?.listingDateSource || '').startsWith('derived-');
        const listingDateDisplay = String(record?.listingMeta?.listingDateDisplay || '').trim();
        if (listingDateDisplay) return { label: 'Anzeige vom', value: listingDateDisplay, source: derived ? 'derived' : 'kleinanzeigen', derived };
        const listingDateIso = String(record?.listingMeta?.listingDateIso || '').trim();
        if (listingDateIso) return { label: 'Anzeige vom', value: formatCalendarDate(listingDateIso), source: derived ? 'derived' : 'kleinanzeigen', derived };
        const confirmedAt = String(record?.insertionMeta?.confirmedAt || '').trim();
        if (confirmedAt) return { label: 'Neu inseriert am', value: formatCalendarDate(confirmedAt), source: String(record?.insertionMeta?.source || 'renewal-confirmed') };
        return { label: 'Anzeige vom', value: '–', source: 'missing' };
      }

      function listingDateLabel(record) {
        return listingDatePresentation(record).value;
      }

      function endDateWithRelativeLabel(record, now = new Date()) {
        const base = endDateLabel(record);
        if (!base || base === '–') return '–';
        let parts = null;
        const iso = String(record?.listingMeta?.endDateIso || '').trim();
        let match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) parts = [Number(match[1]), Number(match[2]), Number(match[3])];
        if (!parts) {
          match = String(base).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
          if (match) parts = [Number(match[3]), Number(match[2]), Number(match[1])];
        }
        if (!parts) return base;
        const [year, month, day] = parts;
        const targetOrdinal = Date.UTC(year, month - 1, day);
        const todayOrdinal = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
        const days = Math.round((targetOrdinal - todayOrdinal) / 86400000);
        if (days === 0) return `${base} (heute)`;
        if (days === 1) return `${base} (morgen)`;
        if (days > 1) return `${base} (in ${days} Tagen)`;
        if (days === -1) return `${base} (gestern)`;
        return `${base} (vor ${Math.abs(days)} Tagen)`;
      }

      function comparisonStatusLabel(comparison) {
        const status = String(comparison?.status || '');
        if (status === 'match') return 'Alles stimmt überein';
        if (status === 'mismatch') return 'Abweichungen gefunden';
        if (status === 'uncertain') return 'Noch nicht eindeutig';
        return 'Noch nicht geprüft';
      }

      return Object.freeze({ formatDate, displayPrice, displayPriceWithType, categoryLabel, compactCategoryLabel, compactActionIcon, makeCompactIconButton, artLabel, endDateLabel, formatCalendarDate, listingDatePresentation, listingDateLabel, endDateWithRelativeLabel, comparisonStatusLabel });
    }
  });
  globalThis.KRDeps?.register?.('KRSharedUiHelpers', API);
})();
