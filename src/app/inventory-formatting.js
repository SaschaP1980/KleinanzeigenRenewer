(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const helpers = options.sharedUiHelpers;
      if (!helpers) throw new Error('sharedUiHelpers is required');

      function formatDate(value) { return helpers.formatDate(value); }
      function displayPrice(record) {
        const value = record.price?.displayed || record.price?.value || '–';
        const normalized = String(value).trim();
        if (/€|EUR/i.test(normalized)) return normalized;
        return record.price?.value ? `${record.price.value} €` : normalized;
      }
      function displayPriceWithType(record) { return helpers.displayPriceWithType(record); }
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
      function artLabel(record) { return helpers.artLabel(record); }
      function endDateLabel(record) { return helpers.endDateLabel(record); }
      function formatCalendarDate(value) { return helpers.formatCalendarDate(value); }
      function listingDatePresentation(record) { return helpers.listingDatePresentation(record); }
      function listingDateLabel(record) { return helpers.listingDateLabel(record); }
      function endDateWithRelativeLabel(record, now = new Date()) { return helpers.endDateWithRelativeLabel(record, now); }
      function comparisonStatusLabel(comparison) { return helpers.comparisonStatusLabel(comparison); }

      function publicAvailabilityPending(record) {
        return String(record?.listingMeta?.publicAvailability?.status || '') === 'pending';
      }

      function templateReady(record) {
        if (publicAvailabilityPending(record)) return false;
        if (record?.renewal?.renewalId || String(record?.recordKind || '').startsWith('renewal-')) return false;
        return Boolean(
          record.extraction?.capturedFromEditView &&
          record.extraction?.templateComplete === true &&
          record.imageSummary?.discovered > 0 &&
          record.imageSummary?.uploadReadyJpeg === record.imageSummary?.discovered &&
          /^\d+$/.test(String(record.category?.id ?? record.categoryIdFromUrl ?? ''))
        );
      }

      function renewalIsReplacementReady(record) {
        const renewal = record?.renewal;
        if (!renewal?.renewalId || !/^\d+$/.test(String(record?.adId || renewal?.newAdId || ''))) return false;
        const status = String(renewal.status || '');
        const stage = String(renewal.stage || '');
        return status === 'verified' || stage === 'replacement-ready';
      }

      function renewalAutoCompletionPending(record) {
        const renewal = record?.renewal;
        if (!renewal?.autoReplacementAllowed || renewal?.autoReplacementFailedAt) return false;
        const stage = String(renewal.stage || '');
        return stage === 'replacement-ready' || stage.startsWith('source-delete');
      }

      function renewalStatusLabel(record) {
        const status = String(record?.renewal?.status || '');
        const stage = String(record?.renewal?.stage || '');
        if (!record?.renewal?.renewalId) return '';
        if (renewalAutoCompletionPending(record)) return stage.startsWith('source-delete') ? 'AUSTAUSCH LÄUFT' : 'AUSTAUSCH STARTET';
        if (renewalIsReplacementReady(record)) return 'AUSTAUSCH BEREIT';
        if (status === 'waiting-for-online') return 'VERÖFFENTLICHUNG NOCH NICHT BESTÄTIGT';
        if (status === 'verification-failed') return 'PRÜFUNG ERFORDERLICH';
        if (status === 'reinventorizing') return 'DATEN WERDEN GELADEN';
        if (status === 'verifying') return 'WIRD GEPRÜFT';
        if (status === 'new-id-confirmed' || status === 'submitted') return 'VERÖFFENTLICHT';
        return 'ENTWURF';
      }

      function renewalStatusText(record) {
        const label = renewalStatusLabel(record);
        if (label === 'AUSTAUSCH LÄUFT') return 'Austausch läuft …';
        if (label === 'AUSTAUSCH STARTET') return 'Austausch startet …';
        if (label === 'AUSTAUSCH BEREIT') return 'Geprüft · Austausch bereit';
        if (label === 'VERÖFFENTLICHUNG NOCH NICHT BESTÄTIGT') return 'Erneut prüfen';
        if (label === 'PRÜFUNG ERFORDERLICH') return 'Erneut prüfen';
        if (label === 'DATEN WERDEN GELADEN') return 'Daten werden geladen …';
        if (label === 'WIRD GEPRÜFT') return 'Prüfung läuft …';
        if (label === 'VERÖFFENTLICHT') return 'Neue Anzeige erkannt';
        return 'Entwurf';
      }

      function canDiscardRenewalDraft(record) {
        const renewal = record?.renewal;
        if (!renewal?.renewalId) return false;
        if (record?.adId || renewal?.newAdId) return false;
        const status = String(renewal.status || 'draft');
        const stage = String(renewal.stage || '');
        if (['submitted', 'new-id-confirmed', 'reinventorizing', 'verifying', 'verified', 'replaced'].includes(status)) return false;
        if (['publish-submitted', 'new-id-confirmed', 'reinventorizing', 'verifying', 'replacement-ready'].includes(stage)) return false;
        return true;
      }

      function trashReasonLabel(record) {
        const reason = String(record?.trash?.reason || 'manual');
        if (reason === 'renewal-replaced') return 'Nach erfolgreichem Austausch';
        if (reason === 'renewal-candidate-removed') return 'Neue Anzeige lokal entfernt';
        if (reason === 'inventory-cleared') return 'Inventarliste geleert';
        return 'Manuell aus Inventar entfernt';
      }

      function trashRetentionLabel(record, now = Date.now()) {
        const expires = Date.parse(record?.trash?.expiresAt || '');
        if (!Number.isFinite(expires)) return 'Ablauf unbekannt';
        const ms = Math.max(0, expires - Number(now));
        const days = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
        return days === 1 ? 'Noch 1 Tag' : `Noch ${days} Tage`;
      }

      function trashRetentionPresentation(record, now = Date.now()) {
        const expiresAt = String(record?.trash?.expiresAt || '');
        const expires = Date.parse(expiresAt);
        if (!Number.isFinite(expires)) return 'Aufbewahrung unbekannt';
        const ms = Math.max(0, expires - Number(now));
        const days = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
        const remaining = days === 1 ? 'noch 1 Tag' : `noch ${days} Tage`;
        return `Im Papierkorb bis ${formatCalendarDate(expiresAt)} (${remaining})`;
      }

      return Object.freeze({
        formatDate, displayPrice, displayPriceWithType, categoryLabel, compactCategoryLabel, artLabel, endDateLabel,
        formatCalendarDate, listingDatePresentation, listingDateLabel, endDateWithRelativeLabel, comparisonStatusLabel,
        publicAvailabilityPending, templateReady, renewalIsReplacementReady, renewalAutoCompletionPending,
        renewalStatusLabel, renewalStatusText, canDiscardRenewalDraft, trashReasonLabel, trashRetentionLabel,
        trashRetentionPresentation
      });
    }
  });
  globalThis.KRDeps?.register?.('KRInventoryFormatting', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
