// Pure listing URL evidence and source classification shared by single
// inventory capture and publishing detectors; does not fetch or mutate.
(() => {
  'use strict';
  const deps=globalThis.KRDeps;if(!deps)throw Error('KRDeps must load before listing-url-evidence-service');
  const API=Object.freeze({
    create(options={}) {
      const {URL}=options;
      if (typeof URL!=='function') throw Error('KRListingUrlEvidenceService requires a trusted URL constructor');

      function singleInventorySourceFromUrl(rawUrl) {
        try {
          const url = new URL(String(rawUrl || ''));
          if (url.protocol !== 'https:' || !/^(?:www\.)?kleinanzeigen\.de$/i.test(url.hostname)) return null;
          if (/\/p-anzeige-bearbeiten\.html$/i.test(url.pathname)) {
            const adId = String(url.searchParams.get('adId') || '');
            return /^\d+$/.test(adId) ? { adId, mode: 'edit', publicUrl: '' } : null;
          }
          const publicMatch = url.pathname.match(/\/s-anzeige\/[^/]+\/(\d+)-\d+-\d+(?:\/)?$/i);
          if (publicMatch) return { adId: publicMatch[1], mode: 'public', publicUrl: `${url.origin}${url.pathname}` };
        } catch { /* invalid URL */ }
        return null;
      }

      function detectPublishedAdFromKnownUrl(rawUrl, sourceAdId = '') {
        try {
          const url = new URL(String(rawUrl || ''));
          if (!/(^|\.)kleinanzeigen\.de$/i.test(url.hostname)) return null;
          let adId = '';
          let publicUrl = '';
          let kind = '';
          const publicMatch = url.pathname.match(/\/s-anzeige\/[^/]+\/(\d+)-\d+-\d+(?:\/)?$/i);
          if (publicMatch) {
            adId = publicMatch[1];
            publicUrl = `${url.origin}${url.pathname}`;
            kind = 'public';
          } else if (/\/p-anzeige-bearbeiten\.html$/i.test(url.pathname)) {
            adId = String(url.searchParams.get('adId') || '');
            kind = 'edit';
          } else if (/\/p-anzeige-aufgeben-bestaetigung\.html$/i.test(url.pathname)) {
            adId = String(url.searchParams.get('addId') || url.searchParams.get('adId') || '');
            kind = 'confirmation';
          }
          if (!/^\d+$/.test(adId) || adId === String(sourceAdId || '')) return null;
          return { adId, publicUrl: publicUrl || null, candidateCount: 1, kind, detectionSource: 'tab-url' };
        } catch {
          return null;
        }
      }

      return Object.freeze({singleInventorySourceFromUrl,detectPublishedAdFromKnownUrl});
    }
  });
  deps.register('KRListingUrlEvidenceService',API);
})();
