(() => {
  const KRDeps = globalThis.KRDeps;
  if (KRDeps?.has?.('KRPlatformHardening')) {
    const existing = KRDeps.require('KRPlatformHardening');
    if (typeof module !== 'undefined' && module?.exports) module.exports = existing;
    return;
  }

  const RESTRICTION_CODE = 'ip-range-temporarily-blocked';
  const RESTRICTION_HEADLINE = 'IP-Bereich vorübergehend gesperrt';

  function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeKey(value) {
    return normalize(value).toLocaleLowerCase('de-DE');
  }

  function detectAccessRestriction(input = {}) {
    const title = normalize(input.title || '');
    const headings = Array.isArray(input.headings) ? input.headings.map(normalize).filter(Boolean) : [];
    const wanted = normalizeKey(RESTRICTION_HEADLINE);
    const heading = headings.find(value => normalizeKey(value) === wanted) || '';
    const titleMatch = normalizeKey(title).includes(wanted);
    if (!heading && !titleMatch) return null;
    return {
      restricted: true,
      code: RESTRICTION_CODE,
      headline: RESTRICTION_HEADLINE,
      matchedBy: heading ? 'heading' : 'title',
      url: String(input.url || '').slice(0, 1200) || null
    };
  }

  const API = Object.freeze({
    detectAccessRestriction
  });
  globalThis.KRDeps?.register?.('KRPlatformHardening', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
