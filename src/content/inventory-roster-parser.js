(() => {
  if (globalThis.__KR_INVENTORY_ROSTER_PARSER_V12318__) return;
  globalThis.__KR_INVENTORY_ROSTER_PARSER_V12318__ = true;
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before KRInventoryRosterParser');

  function create(options = {}) {
    const {
      MY_ADS_PATH, PAGE_CHANGE_TIMEOUT_MS, normalize, normalizeKey, sleep
    } = options;

  function isMyAdsUrl(rawUrl = location.href) {
    try {
      const url = new URL(rawUrl, location.href);
      return /(^|\.)kleinanzeigen\.de$/i.test(url.hostname) && url.pathname === MY_ADS_PATH;
    } catch {
      return false;
    }
  }

  function isMyAdsProjectsUrl(rawUrl = location.href) {
    try {
      const url = new URL(rawUrl, location.href);
      return isMyAdsUrl(url.href) && url.searchParams.get('tab') === 'PROJECTS';
    } catch {
      return false;
    }
  }

  function parseOnlineCount(text) {
    const normalized = normalize(text);
    const detailedMatch = normalized.match(/([\d.]+)\s+Anzeigen\s+online\s*\/\s*([\d.]+)\s+gesamt/i);
    const compactMatch = detailedMatch ? null : normalized.match(/([\d.]+)\s+Anzeigen\s+online\b/i);
    const match = detailedMatch || compactMatch;
    if (!match) return null;
    const online = Number(match[1].replace(/\./g, ''));
    const total = detailedMatch ? Number(match[2].replace(/\./g, '')) : null;
    if (!Number.isFinite(online) || online < 0) return null;
    return { online, total: Number.isFinite(total) ? total : null };
  }

  function adIdFromHref(rawHref) {
    if (!rawHref) return '';
    try {
      const url = new URL(rawHref, location.href);
      const queryId = url.searchParams.get('adId');
      if (/^\d+$/.test(queryId || '')) return queryId;
      const pathMatch = url.pathname.match(/\/(\d+)-(\d+)-(\d+)(?:\/|$)/);
      if (pathMatch) return pathMatch[1];
      const generic = url.href.match(/[?&]adId=(\d+)/i);
      return generic?.[1] || '';
    } catch {
      const match = String(rawHref).match(/[?&]adId=(\d+)/i) || String(rawHref).match(/\/(\d+)-\d+-\d+(?:\/|$)/);
      return match?.[1] || '';
    }
  }

  function editUrlForAdId(adId) {
    return `https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=${encodeURIComponent(String(adId))}`;
  }

  function detectedProfileName(root = document) {
    const candidates = [...root.querySelectorAll('header, [role="banner"], span, div, p')];
    for (const element of candidates) {
      const text = normalize(element.textContent || '');
      if (!text || text.length > 220 || !/angemeldet\s+als\s*:/i.test(text)) continue;
      const match = text.match(/angemeldet\s+als\s*:\s*(.+?)(?:\s+Ausloggen\b|$)/i);
      const name = normalize(match?.[1] || '');
      if (name && name.length <= 180) return name;
    }
    const body = normalize(root.body?.innerText || root.body?.textContent || '');
    const match = body.match(/angemeldet\s+als\s*:\s*(.+?)(?:\s+Ausloggen\b|\s+Inserieren\b|\s+Meins\b|$)/i);
    return normalize(match?.[1] || '').slice(0, 180);
  }

  function publicUrlFromRoot(root, adId) {
    const wanted = String(adId || '');
    const scopes = [];
    for (const scope of [root, root?.ownerDocument, document]) {
      if (scope && !scopes.includes(scope)) scopes.push(scope);
    }
    for (const scope of scopes) {
      for (const link of scope?.querySelectorAll?.('a[href]') || []) {
        const href = link.getAttribute('href') || '';
        if (!/\/s-anzeige\//i.test(href) || adIdFromHref(href) !== wanted) continue;
        try { return new URL(href, location.href).href; } catch { /* ignore malformed candidate */ }
      }
    }
    return '';
  }

  function currentPageNumber(root = document) {
    const current = root.querySelector('nav button[aria-current="page"], nav [aria-current="page"]');
    const match = normalize(current?.textContent).match(/\d+/);
    return match ? Number(match[0]) : 1;
  }

  function nextPageButton(root = document) {
    return root.querySelector('nav button[aria-label="Nächste"], nav a[aria-label="Nächste"], button[aria-label="Nächste"], a[aria-label="Nächste"]');
  }

  function isDisabledControl(element) {
    return !element || element.disabled === true || element.getAttribute('aria-disabled') === 'true';
  }

  function exactEditControls(root = document) {
    return [...root.querySelectorAll('a,button')].filter(element => normalizeKey(element.textContent) === 'bearbeiten');
  }

  function idsWithin(element) {
    const ids = new Set();
    if (!element) return ids;
    const selfHref = element.matches?.('a[href]') ? element.getAttribute('href') : '';
    const selfId = adIdFromHref(selfHref);
    if (selfId) ids.add(selfId);
    for (const link of element.querySelectorAll?.('a[href]') || []) {
      const id = adIdFromHref(link.getAttribute('href'));
      if (id) ids.add(id);
    }
    for (const node of element.querySelectorAll?.('[data-adid],[data-ad-id],[data-id]') || []) {
      for (const name of ['data-adid', 'data-ad-id', 'data-id']) {
        const value = node.getAttribute(name);
        if (/^\d{6,}$/.test(value || '')) ids.add(value);
      }
    }
    for (const form of element.querySelectorAll?.('form[action]') || []) {
      const id = adIdFromHref(form.getAttribute('action'));
      if (id) ids.add(id);
    }
    const html = String(element.outerHTML || '');
    for (const match of html.matchAll(/(?:adId(?:=|%3D|["':\s]+))(\d{6,})/gi)) ids.add(match[1]);
    for (const match of html.matchAll(/\/(\d{6,})-\d+-\d+(?:\/|[?"'#<])/g)) ids.add(match[1]);
    return ids;
  }

  function listingRootFor(control) {
    const explicitCard = control?.closest?.('[data-testid="ad-card"][data-adid]');
    if (explicitCard) return explicitCard;
    let node = control;
    let fallback = control.parentElement;
    let lastSingleControlNode = control.parentElement || control;
    for (let depth = 0; node && depth < 16; depth += 1, node = node.parentElement) {
      const controls = [...node.querySelectorAll?.('a,button') || []].filter(item => normalizeKey(item.textContent) === 'bearbeiten');
      const ids = idsWithin(node);
      if (controls.length === 1) lastSingleControlNode = node;
      if (controls.length === 1 && ids.size === 1) fallback = node;
      if (depth >= 2 && controls.length > 1) return lastSingleControlNode || fallback || control;
      if (node.matches?.('article') && controls.length === 1 && ids.size === 1) return node;
    }
    return fallback || lastSingleControlNode || control;
  }

  function titleFromRoot(root, adId) {
    const selectors = ['h1', 'h2', 'h3', 'h4', '[data-testid*="title" i]'];
    for (const selector of selectors) {
      const text = normalize(root?.querySelector?.(selector)?.textContent);
      if (text && normalizeKey(text) !== 'bearbeiten') return text;
    }
    for (const link of root?.querySelectorAll?.('a[href]') || []) {
      if (adIdFromHref(link.getAttribute('href')) !== String(adId)) continue;
      const text = normalize(link.textContent);
      if (text && normalizeKey(text) !== 'bearbeiten') return text;
    }
    return `Anzeige ${adId}`;
  }

  function endDateFromRoot(root) {
    const text = normalize(root?.innerText || root?.textContent || '');
    const match = text.match(/\bEndet\s+am\s+(\d{2}\.\d{2}\.\d{4})\b/i);
    if (!match) return { endDateDisplay: '', endDateIso: '' };
    const [day, month, year] = match[1].split('.');
    return { endDateDisplay: match[1], endDateIso: `${year}-${month}-${day}` };
  }

  function thumbnailUrlFromRoot(root) {
    const candidates = [];
    for (const image of root?.querySelectorAll?.('img') || []) {
      for (const value of [image.currentSrc, image.getAttribute?.('src'), image.getAttribute?.('data-src')]) {
        if (value) candidates.push(value);
      }
      const srcset = String(image.getAttribute?.('srcset') || '');
      for (const part of srcset.split(',')) {
        const value = part.trim().split(/\s+/)[0];
        if (value) candidates.push(value);
      }
    }
    for (const value of candidates) {
      try {
        const parsed = new URL(value, location.href);
        if (parsed.protocol === 'https:' && parsed.hostname === 'img.kleinanzeigen.de') return parsed.href;
      } catch {}
    }
    return '';
  }

  function scanListings(root = document) {
    const found = new Map();

    // Current Kleinanzeigen own-ad cards expose a stable card marker plus the ad id.
    // Prefer this explicit boundary so nested action <li> elements can never be mistaken
    // for the complete listing card.
    for (const card of root.querySelectorAll?.('[data-testid="ad-card"][data-adid]') || []) {
      const adId = String(card.getAttribute('data-adid') || '').trim();
      if (!/^\d+$/.test(adId) || found.has(adId)) continue;
      const editLink = [...card.querySelectorAll('a[href*="p-anzeige-bearbeiten"]')]
        .find(link => adIdFromHref(link.getAttribute('href')) === adId);
      const editHref = editLink?.getAttribute('href') || '';
      found.set(adId, {
        adId,
        editUrl: editHref ? new URL(editHref, location.href).href : editUrlForAdId(adId),
        title: titleFromRoot(card, adId),
        publicUrl: publicUrlFromRoot(card, adId),
        thumbnailUrl: thumbnailUrlFromRoot(card),
        ...endDateFromRoot(card),
        root: card
      });
    }

    const directEditLinks = [...root.querySelectorAll('a[href*="p-anzeige-bearbeiten"]')];
    const controls = [...new Set([...directEditLinks, ...exactEditControls(root)])];

    for (const control of controls) {
      const directHref = control.getAttribute?.('href') || control.closest?.('a[href]')?.getAttribute('href') || '';
      let adId = adIdFromHref(directHref);
      const listingRoot = listingRootFor(control);
      if (!adId) {
        const ids = [...idsWithin(listingRoot)];
        if (ids.length === 1) adId = ids[0];
      }
      if (!/^\d+$/.test(adId || '') || found.has(adId)) continue;
      const endDate = endDateFromRoot(listingRoot);
      found.set(adId, {
        adId,
        editUrl: directHref && /p-anzeige-bearbeiten/i.test(directHref)
          ? new URL(directHref, location.href).href
          : editUrlForAdId(adId),
        title: titleFromRoot(listingRoot, adId),
        publicUrl: publicUrlFromRoot(listingRoot, adId),
        thumbnailUrl: thumbnailUrlFromRoot(listingRoot),
        ...endDate,
        root: listingRoot
      });
    }

    // Last-resort path: product links inside a container that also exposes a Bearbeiten action.
    if (!found.size) {
      for (const control of exactEditControls(root)) {
        const listingRoot = listingRootFor(control);
        const ids = [...idsWithin(listingRoot)];
        if (ids.length !== 1) continue;
        const adId = ids[0];
        found.set(adId, { adId, editUrl: editUrlForAdId(adId), publicUrl: publicUrlFromRoot(listingRoot, adId), thumbnailUrl: thumbnailUrlFromRoot(listingRoot), title: titleFromRoot(listingRoot, adId), ...endDateFromRoot(listingRoot), root: listingRoot });
      }
    }
    return [...found.values()];
  }
  function pageFingerprint(root = document) {
    return scanListings(root).map(item => item.adId).sort().join(',');
  }
  async function waitForPageChange(beforePage, beforeFingerprint) {
    const started = Date.now();
    while (Date.now() - started < PAGE_CHANGE_TIMEOUT_MS) {
      const page = currentPageNumber();
      const fingerprint = pageFingerprint();
      if (fingerprint && fingerprint !== beforeFingerprint) return true;
      if (!beforeFingerprint && page !== beforePage) return true;
      await sleep(250);
    }
    return false;
  }

  async function waitForListings() {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const items = scanListings();
      if (items.length) return items;
      await sleep(500);
    }
    return [];
  }

    return Object.freeze({
      isMyAdsUrl, isMyAdsProjectsUrl, parseOnlineCount, adIdFromHref, editUrlForAdId, detectedProfileName, publicUrlFromRoot, currentPageNumber, nextPageButton, isDisabledControl, endDateFromRoot, scanListings, pageFingerprint, waitForPageChange, waitForListings
    });
  }

  const API = Object.freeze({ create });
  KRDeps.register('KRInventoryRosterParser', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
