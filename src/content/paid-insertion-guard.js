(() => {
  'use strict';
  const KRDeps = globalThis.KRDeps;
  if (KRDeps?.has?.('KRPaidInsertionGuard')) {
    const existing = KRDeps.require('KRPaidInsertionGuard');
    if (typeof module !== 'undefined' && module?.exports) module.exports = existing;
    return;
  }
  function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
  function classify({ pathname = '', text = '', title = '', heading = '' } = {}) {
    const path = String(pathname || '');
    const body = clean(`${title || ''} ${heading || ''} ${text || ''}`);
    const checkoutPath = /^\/m-bestellung-aufnehmen\.html$/i.test(path);
    const checkoutMarkers = /\bWarenkorb\b/i.test(body) && /\bBestellübersicht\b/i.test(body) && /\bEinstellgebühr\b/i.test(body) && /\bZur Bezahlung\b/i.test(body);
    if (checkoutPath && checkoutMarkers) {
      return { required: true, phase: 'checkout', reason: 'paid-insertion-required', path, amount: body.match(/\b\d+[,.]\d{2}\s*€/i)?.[0] || null };
    }
    const limitMarker = /Anzeigenlimit erreicht/i.test(body);
    const paidMarker = /Einstellen dieser Anzeige ist kostenpflichtig/i.test(body) || /kostenpflichtigen Anzeige/i.test(body);
    const feeMarker = /Gebühren? in Höhe von/i.test(body) || /Einstellgebühr/i.test(body);
    if (limitMarker && paidMarker && feeMarker) {
      return { required: true, phase: 'pre-publish', reason: 'paid-insertion-required', path, amount: body.match(/\b\d+[,.]\d{2}\s*€/i)?.[0] || null };
    }
    return { required: false, phase: null, reason: null, path, amount: null };
  }
  function detect({ document: doc = globalThis.document, location: loc = globalThis.location } = {}) {
    const heading = clean(doc?.querySelector?.('h1,[role="heading"]')?.textContent || '');
    const text = clean(doc?.body?.innerText || doc?.body?.textContent || '');
    return classify({ pathname: loc?.pathname || '', title: doc?.title || '', heading, text });
  }
  const API = Object.freeze({ detect });
  globalThis.KRDeps?.register?.('KRPaidInsertionGuard', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
