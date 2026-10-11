(() => {
  'use strict';

  const KRDeps = globalThis.KRDeps;
  if (KRDeps?.has?.('KRManagedNavigation')) {
    const existing = KRDeps.require('KRManagedNavigation');
    if (typeof module !== 'undefined' && module?.exports) module.exports = existing;
    return;
  }

  const STATES = Object.freeze({
    WAITING: 'waiting',
    READY: 'ready',
    OFF_TARGET: 'off-target'
  });

  function parse(raw) {
    try { return new URL(String(raw || '')); } catch { return null; }
  }

  function normalizedHost(hostname) {
    return String(hostname || '').toLocaleLowerCase('en-US').replace(/^www\./, '');
  }

  function sameTarget(currentRaw, expectedRaw) {
    const current = parse(currentRaw);
    const expected = parse(expectedRaw);
    if (!current || !expected) return false;
    if (current.protocol !== expected.protocol) return false;
    if (normalizedHost(current.hostname) !== normalizedHost(expected.hostname)) return false;
    if (current.pathname.replace(/\/$/, '') !== expected.pathname.replace(/\/$/, '')) return false;
    for (const [key, value] of expected.searchParams.entries()) {
      if (current.searchParams.get(key) !== value) return false;
    }
    return true;
  }

  function isPreNavigationUrl(raw) {
    const value = String(raw || '').trim();
    return !value || value === 'about:blank';
  }

  function classifyOffTarget(raw) {
    const value = String(raw || '').trim();
    const parsed = parse(value);
    if (/^(?:chrome-error|chrome|edge|about):/i.test(value)) return 'browser-document';
    if (!parsed) return 'invalid-url';
    if (parsed.protocol !== 'https:') return 'non-https';
    if (normalizedHost(parsed.hostname) !== 'kleinanzeigen.de') return 'foreign-host';
    return 'kleinanzeigen-redirect';
  }

  function assess(tab, expectedUrl) {
    const currentUrl = String(tab?.url || tab?.pendingUrl || '');
    const pendingUrl = String(tab?.pendingUrl || '');
    const candidate = pendingUrl || currentUrl;
    const status = String(tab?.status || '');
    const currentMatches = sameTarget(currentUrl, expectedUrl);
    const pendingMatches = Boolean(pendingUrl) && sameTarget(pendingUrl, expectedUrl);
    if (currentMatches) {
      return {
        state: status === 'complete' && !pendingUrl ? STATES.READY : STATES.WAITING,
        reason: status === 'complete' && !pendingUrl ? 'expected-target-complete' : 'expected-target-loading',
        currentUrl,
        pendingUrl,
        status,
        matchedExpected: true
      };
    }
    if (pendingMatches) {
      return { state: STATES.WAITING, reason: 'expected-target-pending', currentUrl, pendingUrl, status, matchedExpected: true };
    }
    if (isPreNavigationUrl(candidate) || isPreNavigationUrl(currentUrl)) {
      return { state: STATES.WAITING, reason: 'pre-navigation', currentUrl, pendingUrl, status, matchedExpected: false };
    }
    if (status !== 'complete') {
      return { state: STATES.WAITING, reason: 'off-target-loading', currentUrl, pendingUrl, status, matchedExpected: false };
    }
    return {
      state: STATES.OFF_TARGET,
      reason: classifyOffTarget(candidate || currentUrl),
      currentUrl,
      pendingUrl,
      status,
      matchedExpected: false
    };
  }

  function publicAdIdFromUrl(raw) {
    const url = parse(raw);
    if (!url || url.protocol !== 'https:' || normalizedHost(url.hostname) !== 'kleinanzeigen.de') return '';
    const canonical = url.pathname.match(/^\/s-anzeige\/[^/]+\/(\d+)-\d+-\d+\/?$/i);
    if (canonical) return canonical[1];
    const direct = url.pathname.match(/^\/s-anzeige\/(\d+)\/?$/i);
    return direct ? direct[1] : '';
  }

  function assessPublicAd(tab, expectedAdId) {
    const expected = String(expectedAdId || '');
    const currentUrl = String(tab?.url || '');
    const pendingUrl = String(tab?.pendingUrl || '');
    const candidate = pendingUrl || currentUrl;
    const status = String(tab?.status || '');
    const currentAdId = publicAdIdFromUrl(currentUrl);
    const pendingAdId = publicAdIdFromUrl(pendingUrl);
    if (expected && currentAdId === expected) {
      return {
        state: status === 'complete' && !pendingUrl ? STATES.READY : STATES.WAITING,
        reason: status === 'complete' && !pendingUrl ? 'expected-public-ad-complete' : 'expected-public-ad-loading',
        currentUrl, pendingUrl, status, observedAdId: currentAdId, matchedExpected: true
      };
    }
    if (expected && pendingAdId === expected) {
      return { state: STATES.WAITING, reason: 'expected-public-ad-pending', currentUrl, pendingUrl, status, observedAdId: pendingAdId, matchedExpected: true };
    }
    if (isPreNavigationUrl(candidate) || isPreNavigationUrl(currentUrl)) {
      return { state: STATES.WAITING, reason: 'pre-navigation', currentUrl, pendingUrl, status, observedAdId: '', matchedExpected: false };
    }
    if (status !== 'complete') {
      return { state: STATES.WAITING, reason: 'public-off-target-loading', currentUrl, pendingUrl, status, observedAdId: currentAdId || pendingAdId || '', matchedExpected: false };
    }
    return {
      state: STATES.OFF_TARGET,
      reason: currentAdId || pendingAdId ? 'different-public-ad-id' : classifyOffTarget(candidate || currentUrl),
      currentUrl,
      pendingUrl,
      status,
      observedAdId: currentAdId || pendingAdId || '',
      matchedExpected: false
    };
  }

  const api = Object.freeze({ STATES, assess, publicAdIdFromUrl, assessPublicAd });
  globalThis.KRDeps?.register?.('KRManagedNavigation', api);
  if (typeof module !== 'undefined' && module?.exports) module.exports = api;
})();
