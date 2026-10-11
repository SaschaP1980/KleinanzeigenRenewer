(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const URLApi = options.URL || globalThis.URL;
      const chromeTabs = options.chromeTabs;
      const delay = options.delay || (ms => new Promise(resolve => setTimeout(resolve, ms)));
      const ensureContentConnection = options.ensureContentConnection || (async () => {});
      const sendTabRequestWithBootstrap = options.sendTabRequestWithBootstrap || (async () => null);
      const defaultReadOnlyTimeoutMs = Math.max(1, Number(options.readOnlyMetadataTimeoutMs || 15000));

      function normalizeKnownPublicAdUrl(rawUrl, expectedAdId) {
        const adId = String(expectedAdId || '');
        if (!/^\d+$/.test(adId)) return '';
        try {
          const url = new URLApi(String(rawUrl || ''));
          if (url.protocol !== 'https:' || !/^(?:www\.)?kleinanzeigen\.de$/i.test(url.hostname)) return '';
          const match = url.pathname.match(/^\/s-anzeige\/[^/]+\/(\d+)-\d+-\d+\/?$/i);
          if (!match || match[1] !== adId) return '';
          return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
        } catch {
          return '';
        }
      }

      function slugifyListingTitle(value) {
        return String(value || '')
          .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase('de-DE')
          .replace(/ß/g, 'ss')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 100) || 'anzeige';
      }

      function publicUrlForInventoryRecord(record) {
        const stored = record?.listingMeta?.publicUrl || record?.publicUrl || '';
        if (/^https:\/\/(www\.)?kleinanzeigen\.de\/s-anzeige\//i.test(stored)) return stored;
        for (const candidate of [record?.canonicalUrl, record?.sourceUrl]) {
          if (/^https:\/\/(www\.)?kleinanzeigen\.de\/s-anzeige\//i.test(String(candidate || ''))) return String(candidate);
        }
        const adId = String(record?.adId || '');
        const categoryId = String(record?.category?.id ?? record?.categoryIdFromUrl ?? '');
        const locationId = String(record?.locationData?.locationId ?? '');
        if (/^\d+$/.test(adId) && /^\d+$/.test(categoryId) && /^\d+$/.test(locationId)) {
          return `https://www.kleinanzeigen.de/s-anzeige/${slugifyListingTitle(record?.title)}/${adId}-${categoryId}-${locationId}`;
        }
        return '';
      }

      function directPublicUrlForAdId(adId) {
        const value = String(adId || '');
        return /^\d+$/.test(value) ? `https://www.kleinanzeigen.de/s-anzeige/${encodeURIComponent(value)}` : '';
      }

      function publicAvailabilityPending(record) {
        return String(record?.listingMeta?.publicAvailability?.status || '') === 'pending';
      }

      function publicAvailabilitySnapshot({ online = false, verificationClass = null, method = null, publicUrl = null, checkedAt = null } = {}) {
        const now = checkedAt || new Date().toISOString();
        return {
          status: online ? 'online' : 'pending',
          checkedAt: now,
          confirmedAt: online ? now : null,
          verificationClass: verificationClass || (online ? 'confirmed' : 'temporarily-unavailable'),
          method: method || null,
          publicUrl: publicUrl || null
        };
      }

      async function extractReadOnlyMetadata(tabId, expectedAdId, timeoutMs = defaultReadOnlyTimeoutMs, optionsArg = {}) {
        const started = Date.now();
        let lastReason = '';
        while (Date.now() - started < timeoutMs) {
          try {
            const tab = await chromeTabs.get(tabId);
            if (tab.status !== 'complete') { await delay(180); continue; }
            await ensureContentConnection({ tabId });
            const metadata = await sendTabRequestWithBootstrap(tabId, { type: 'EXTRACT_READONLY_METADATA', silentFailure: optionsArg?.silentFailures === true });
            if (String(metadata?.adId || '') !== String(expectedAdId || '')) {
              lastReason = `Read-only-Anzeige ${metadata?.adId || 'unbekannt'} entspricht nicht ${expectedAdId}.`;
            } else {
              return { ok: true, metadata, durationMs: Date.now() - started };
            }
          } catch (error) {
            lastReason = String(error.message || error).slice(0, 400);
          }
          await delay(220);
        }
        return { ok: false, metadata: null, durationMs: Date.now() - started, error: lastReason || 'Read-only-Metadaten wurden nicht rechtzeitig erkannt.' };
      }

      function normalizedCalendarParts(isoValue = '', displayValue = '') {
        const iso = String(isoValue || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
        const display = String(displayValue || '').trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (display) return { year: Number(display[3]), month: Number(display[2]), day: Number(display[1]) };
        return null;
      }

      function deriveListingDateFromEndDate(endDateIso = '', endDateDisplay = '', days = 60) {
        const parts = normalizedCalendarParts(endDateIso, endDateDisplay);
        if (!parts) return null;
        const stamp = Date.UTC(parts.year, parts.month - 1, parts.day);
        if (!Number.isFinite(stamp)) return null;
        const derived = new Date(stamp - Math.max(0, Number(days || 0)) * 86400000);
        if (!Number.isFinite(derived.getTime())) return null;
        const year = derived.getUTCFullYear();
        const month = String(derived.getUTCMonth() + 1).padStart(2, '0');
        const day = String(derived.getUTCDate()).padStart(2, '0');
        return {
          listingDateIso: `${year}-${month}-${day}`,
          listingDateDisplay: `${day}.${month}.${year}`,
          listingDateDerived: true,
          listingDateSource: 'derived-end-date-60d',
          listingDateDerivedDays: Math.max(0, Number(days || 0))
        };
      }

      function mergeListingMetadata(extracted, existingMeta = {}, readOnlyResult = null, fallback = {}) {
        const metadata = readOnlyResult?.ok ? readOnlyResult.metadata || {} : {};
        const existingDatePresent = Boolean(existingMeta?.listingDateDisplay || existingMeta?.listingDateIso);
        const existingDateDerived = Boolean(existingMeta?.listingDateDerived) || String(existingMeta?.listingDateSource || '').startsWith('derived-');
        const preserveVerifiedExistingDate = !readOnlyResult?.ok && Boolean(fallback?.listingDateDerived) && existingDatePresent && !existingDateDerived;
        const listingDateDisplay = metadata.listingDateDisplay
          || (preserveVerifiedExistingDate ? existingMeta?.listingDateDisplay : fallback.listingDateDisplay)
          || extracted?.listingMeta?.listingDateDisplay
          || existingMeta?.listingDateDisplay
          || null;
        const listingDateIso = metadata.listingDateIso
          || (preserveVerifiedExistingDate ? existingMeta?.listingDateIso : fallback.listingDateIso)
          || extracted?.listingMeta?.listingDateIso
          || existingMeta?.listingDateIso
          || null;
        return {
          ...(existingMeta || {}),
          ...(extracted?.listingMeta || {}),
          endDateDisplay: metadata.endDateDisplay || fallback.endDateDisplay || extracted?.listingMeta?.endDateDisplay || existingMeta?.endDateDisplay || null,
          endDateIso: metadata.endDateIso || fallback.endDateIso || extracted?.listingMeta?.endDateIso || existingMeta?.endDateIso || null,
          listingDateDisplay,
          listingDateIso,
          listingDateDerived: readOnlyResult?.ok ? false : (preserveVerifiedExistingDate ? false : Boolean(fallback.listingDateDerived || extracted?.listingMeta?.listingDateDerived || existingMeta?.listingDateDerived)),
          listingDateSource: readOnlyResult?.ok ? 'readonly-detail' : (preserveVerifiedExistingDate ? (existingMeta?.listingDateSource || 'readonly-detail') : (fallback.listingDateSource || extracted?.listingMeta?.listingDateSource || existingMeta?.listingDateSource || null)),
          listingDateDerivedDays: readOnlyResult?.ok || preserveVerifiedExistingDate ? null : (fallback.listingDateDerivedDays ?? extracted?.listingMeta?.listingDateDerivedDays ?? existingMeta?.listingDateDerivedDays ?? null),
          publicUrl: fallback.publicUrl || metadata.sourceUrl || existingMeta?.publicUrl || null,
          source: readOnlyResult?.ok ? 'edit+readonly-detail' : (fallback.source || extracted?.listingMeta?.source || existingMeta?.source || null),
          readOnlyMetadataStatus: readOnlyResult?.ok ? 'captured' : (preserveVerifiedExistingDate ? (existingMeta?.readOnlyMetadataStatus || 'captured') : (fallback.readOnlyMetadataStatus || (readOnlyResult ? 'unavailable' : existingMeta?.readOnlyMetadataStatus || null)))
        };
      }

      return Object.freeze({ normalizeKnownPublicAdUrl, slugifyListingTitle, publicUrlForInventoryRecord, directPublicUrlForAdId, publicAvailabilityPending, publicAvailabilitySnapshot, extractReadOnlyMetadata, normalizedCalendarParts, deriveListingDateFromEndDate, mergeListingMetadata });
    }
  });
  globalThis.KRDeps?.register?.('KRPublicListingEvidenceService', API);
})();
