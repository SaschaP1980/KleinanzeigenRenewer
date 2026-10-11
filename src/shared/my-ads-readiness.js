(function (root, factory) {
  const deps = root?.KRDeps;
  if (deps?.has?.('KRMyAdsReadiness')) {
    const existing = deps.require('KRMyAdsReadiness');
    if (typeof module === 'object' && module.exports) module.exports = existing;
    return;
  }
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root?.KRDeps?.register?.('KRMyAdsReadiness', api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FRESH_SOURCE_MAX_ATTEMPTS = 2;
  const DEFAULT_TIMEOUT_MS = 12000;
  const ZERO_STABILITY_MS = 1200;
  const SAFETY_RECHECK_MS = 1000;

  function normalizeText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function normalizeProfileName(value) {
    return normalizeText(value).toLocaleLowerCase('de-DE');
  }

  function optionalNonNegativeInteger(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : null;
  }

  function evaluateMyAdsReadiness(status, { expectedProfileName = '', expectedOnline = null } = {}) {
    if (!status || status.isMyAdsPage !== true || status.isProjectsTab !== true) {
      return { state: 'invalid', reasonCode: 'not-projects', reason: '„Meine Anzeigen“ konnte nicht eindeutig im Tab PROJECTS geöffnet werden.' };
    }

    const page = optionalNonNegativeInteger(status.currentPage);
    if (page !== 1) {
      return { state: 'invalid', reasonCode: 'wrong-page', reason: `Der frische „Meine Anzeigen“-Tab muss auf Seite 1 stehen${page ? ` (erkannt: Seite ${page})` : ''}.` };
    }

    const expectedProfile = normalizeProfileName(expectedProfileName);
    const actualProfileRaw = normalizeText(status.profileName);
    const actualProfile = normalizeProfileName(actualProfileRaw);
    if (!actualProfile) {
      return { state: 'waiting', reasonCode: 'profile-pending', reason: 'Das angemeldete Kleinanzeigen-Konto ist noch nicht im Seiteninhalt verfügbar.' };
    }
    if (expectedProfile && actualProfile !== expectedProfile) {
      return { state: 'invalid', reasonCode: 'wrong-profile', reason: `Das angemeldete Kleinanzeigen-Konto „${actualProfileRaw}“ stimmt nicht mit dem ausgewählten Inventarprofil „${normalizeText(expectedProfileName)}“ überein.` };
    }

    const online = optionalNonNegativeInteger(status.expectedOnline);
    if (online === null) {
      return { state: 'waiting', reasonCode: 'online-count-pending', reason: 'Die Anzahl „Anzeigen online“ ist noch nicht im Seiteninhalt verfügbar.' };
    }

    const wantedOnline = optionalNonNegativeInteger(expectedOnline);
    if (expectedOnline !== null && expectedOnline !== undefined && wantedOnline === null) {
      return { state: 'invalid', reasonCode: 'invalid-expected-online', reason: 'Der erwartete Online-Bestand ist ungültig.' };
    }
    if (wantedOnline !== null && online !== wantedOnline) {
      return { state: 'waiting', reasonCode: 'online-count-mismatch', reason: `Der Online-Bestand ist noch nicht stabil (${online} statt ${wantedOnline}).` };
    }

    const listingCount = optionalNonNegativeInteger(status.listingCount);
    if (listingCount === null) {
      return { state: 'waiting', reasonCode: 'listing-count-pending', reason: 'Die Anzeigenkarten sind noch nicht vollständig auswertbar.' };
    }
    if (online > 0 && listingCount === 0) {
      return { state: 'waiting', reasonCode: 'listings-pending', reason: 'Der Online-Zähler ist vorhanden, die Anzeigenkarten sind aber noch nicht geladen.' };
    }
    if (listingCount > online) {
      return { state: 'waiting', reasonCode: 'listing-count-ahead', reason: `Die Anzeigenkarten und der Online-Zähler sind noch nicht konsistent (${listingCount} Karten bei ${online} online).` };
    }
    if (online === 0 && listingCount !== 0) {
      return { state: 'waiting', reasonCode: 'zero-not-empty', reason: 'Der Online-Zähler zeigt 0, während noch Anzeigenkarten sichtbar sind.' };
    }

    const hasNext = status.hasNext === true;
    if (!hasNext && listingCount !== online) {
      return { state: 'waiting', reasonCode: 'single-page-incomplete', reason: `Der Einseiten-Bestand ist noch nicht vollständig (${listingCount} von ${online} Anzeigenkarten).` };
    }

    return {
      state: 'ready',
      reasonCode: null,
      reason: null,
      page: 1,
      profileName: actualProfileRaw,
      onlineCount: online,
      listingCount,
      hasNext
    };
  }

  return Object.freeze({
    FRESH_SOURCE_MAX_ATTEMPTS,
    DEFAULT_TIMEOUT_MS,
    ZERO_STABILITY_MS,
    SAFETY_RECHECK_MS,
    normalizeProfileName,
    evaluateMyAdsReadiness
  });
});
