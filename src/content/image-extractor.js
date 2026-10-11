// Page-only image discovery. Never downloads images and never reads account credentials.
(() => {
  if (globalThis.__KR_IMAGE_EXTRACTOR_V150__) return;
  globalThis.__KR_IMAGE_EXTRACTOR_V150__ = true;
  const CDN = 'img.kleinanzeigen.de';
  const LIMIT = 300;
  const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

  function stableIdentity(url) {
    const pathMatch = url.pathname.match(new RegExp('/images/(?:[0-9a-f]{2}/)?(' + UUID.source + ')(?:/|$)', 'i'));
    if (pathMatch) return { imageId: pathMatch[1].toLowerCase(), identityType: 'uuid' };
    const identity = new URL(url);
    for (const key of ['rule', 'w', 'h', 'width', 'height', 'quality', 'format', 'auto', 'fit']) identity.searchParams.delete(key);
    identity.hash = '';
    identity.searchParams.sort();
    return { imageId: identity.pathname + (identity.search ? identity.search : ''), identityType: 'path' };
  }

  function urlInfo(raw, base) {
    try {
      const url = new URL(raw, base);
      if (url.protocol !== 'https:' || url.hostname !== CDN) return null;
      const rule = url.searchParams.get('rule') || '';
      const stable = stableIdentity(url);
      return {
        url: url.href,
        ...stable,
        sourceFormatHint: /\.AUTO$/i.test(rule) ? 'AUTO (Format unbekannt)' : (rule.match(/\.(JPG|JPEG|PNG|WEBP|AVIF|GIF)$/i)?.[1] || 'unbekannt')
      };
    } catch {
      return null;
    }
  }

  function diagnosticUrl(raw, base) {
    try {
      const url = new URL(raw, base);
      if (!['http:', 'https:'].includes(url.protocol)) return `${url.protocol}[redacted]`;
      if (url.hostname !== CDN) return url.origin + url.pathname;
      const rule = url.searchParams.get('rule');
      url.search = '';
      url.hash = '';
      if (rule) url.searchParams.set('rule', rule);
      return url.toString();
    } catch {
      return '';
    }
  }

  function diagnosticSourceEntries(element) {
    const values = [];
    const add = (attribute, raw) => {
      if (!raw) return;
      values.push({ attribute, raw });
    };
    add('data-imgsrc', element.getAttribute('data-imgsrc'));
    add('data-zoom-image', element.getAttribute('data-zoom-image'));
    add('data-src', element.getAttribute('data-src'));
    add('currentSrc', element.currentSrc);
    add('src', element.getAttribute('src'));
    for (const attr of ['srcset', 'data-srcset']) {
      for (const part of (element.getAttribute(attr) || '').split(',')) {
        add(attr, part.trim().split(/\s+/)[0]);
      }
    }
    return values;
  }

  function rawDomDiagnostics(root, base, limit = 200) {
    const elements = [...root.querySelectorAll('img,source,[data-imgsrc],[data-zoom-image],[data-src],[srcset],[data-srcset]')];
    const candidates = [];
    const hosts = new Map();
    let total = 0;
    for (const element of elements) {
      const seen = new Set();
      for (const entry of diagnosticSourceEntries(element)) {
        const key = `${entry.attribute}\n${entry.raw}`;
        if (seen.has(key)) continue;
        seen.add(key);
        total += 1;
        let host = '';
        let protocol = '';
        try {
          const parsed = new URL(entry.raw, base);
          host = parsed.hostname || '';
          protocol = parsed.protocol || '';
        } catch { /* represented as invalid below */ }
        if (host) hosts.set(host, (hosts.get(host) || 0) + 1);
        if (candidates.length < limit) {
          candidates.push({
            attribute: entry.attribute,
            url: diagnosticUrl(entry.raw, base),
            host: host || null,
            protocol: protocol || null,
            acceptedByExtractor: Boolean(urlInfo(entry.raw, base)),
            element: describe(element),
            width: element.naturalWidth || Number(element.getAttribute('width')) || null,
            height: element.naturalHeight || Number(element.getAttribute('height')) || null
          });
        }
      }
    }
    return {
      count: total,
      truncated: total > limit,
      hosts: [...hosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([host, count]) => ({ host, count })),
      candidates
    };
  }

  function imageValues(value) {
    if (Array.isArray(value)) return value.flatMap(imageValues);
    if (value && typeof value === 'object') return imageValues(value.url || value.contentUrl);
    return typeof value === 'string' ? [value] : [];
  }

  function elementUrls(element) {
    const values = [
      element.getAttribute('data-imgsrc'),
      element.getAttribute('data-zoom-image'),
      element.getAttribute('data-src'),
      element.currentSrc,
      element.getAttribute('src')
    ];
    if (element.tagName === 'A') values.push(element.getAttribute('href'));
    for (const attr of ['srcset', 'data-srcset']) {
      for (const part of (element.getAttribute(attr) || '').split(',')) values.push(part.trim().split(/\s+/)[0]);
    }
    return [...new Set(values.filter(Boolean))];
  }

  const describe = element => ({
    tag: element.tagName,
    id: (element.id || '').slice(0, 120),
    class: (element.getAttribute('class') || '').slice(0, 200),
    testid: (element.getAttribute('data-testid') || '').slice(0, 120)
  });

  function primaryHint(element) {
    const text = [
      element.getAttribute('class') || '',
      element.getAttribute('aria-label') || '',
      element.getAttribute('data-testid') || '',
      element.parentElement?.getAttribute('class') || ''
    ].join(' ');
    return /onPrimary|primary|titelbild|hauptbild/i.test(text);
  }

  function matchingElementsIncludingRoot(root, selector) {
    const elements = [];
    if (root?.matches?.(selector)) elements.push(root);
    if (root?.querySelectorAll) elements.push(...root.querySelectorAll(selector));
    return [...new Set(elements)];
  }

  function collect(root, base) {
    const elements = matchingElementsIncludingRoot(root, 'img,source,[data-imgsrc],[data-zoom-image],a[href]');
    const candidates = [];
    for (const element of elements) {
      for (const raw of elementUrls(element)) {
        const info = urlInfo(raw, base);
        if (info) {
          candidates.push({
            ...info,
            element: describe(element),
            width: element.naturalWidth || Number(element.getAttribute('width')) || null,
            height: element.naturalHeight || Number(element.getAttribute('height')) || null,
            isPrimary: primaryHint(element)
          });
        }
      }
    }
    return candidates;
  }

  function deduplicate(candidates) {
    const groups = new Map();
    for (const candidate of candidates) {
      let group = groups.get(candidate.imageId);
      if (!group) {
        group = {
          position: groups.size,
          url: candidate.url,
          imageId: candidate.imageId,
          identityType: candidate.identityType,
          sourceFormatHint: candidate.sourceFormatHint,
          variants: [],
          thumbnailWidth: candidate.width || null,
          thumbnailHeight: candidate.height || null,
          isPrimary: Boolean(candidate.isPrimary)
        };
        groups.set(candidate.imageId, group);
      }
      if (!group.variants.includes(candidate.url)) group.variants.push(candidate.url);
      if ((candidate.width || 0) * (candidate.height || 0) > (group.thumbnailWidth || 0) * (group.thumbnailHeight || 0)) {
        group.thumbnailWidth = candidate.width || group.thumbnailWidth;
        group.thumbnailHeight = candidate.height || group.thumbnailHeight;
      }
      group.isPrimary ||= Boolean(candidate.isPrimary);
    }
    return [...groups.values()].map((group, index) => ({ ...group, position: index, isPrimary: group.isPrimary || index === 0 }));
  }

  function diagnosticCandidate(candidate) {
    return {
      url: diagnosticUrl(candidate.url),
      imageId: candidate.imageId,
      identityType: candidate.identityType,
      sourceFormatHint: candidate.sourceFormatHint,
      element: candidate.element,
      width: candidate.width,
      height: candidate.height,
      isPrimary: candidate.isPrimary
    };
  }

  function diagnosticImage(image) {
    return {
      position: image.position,
      imageId: image.imageId,
      identityType: image.identityType,
      sourceFormatHint: image.sourceFormatHint,
      isPrimary: image.isPrimary,
      thumbnailWidth: image.thumbnailWidth,
      thumbnailHeight: image.thumbnailHeight,
      thumbnailUrl: diagnosticUrl(image.thumbnailUrl || image.url),
      downloadUrl: image.downloadUrl ? diagnosticUrl(image.downloadUrl) : null,
      downloadSource: image.downloadSource || null,
      variants: (image.variants || []).map(diagnosticUrl)
    };
  }

  function extract(document, base) {
    const canonical = document.querySelector('link[rel="canonical"]')?.href || base;
    const adId = new URL(base).pathname.match(/\/(\d+)-\d+-\d+(?:\/|$)/)?.[1];
    const ogRaw = document.querySelector('meta[property="og:image"]')?.content || '';
    const og = urlInfo(ogRaw, base);
    const objects = [];
    function visit(value) {
      if (Array.isArray(value)) return value.forEach(visit);
      if (!value || typeof value !== 'object') return;
      objects.push(value);
      if (value['@graph']) visit(value['@graph']);
      if (value.mainEntity) visit(value.mainEntity);
    }
    for (const node of document.querySelectorAll('script[type="application/ld+json"]')) {
      try { visit(JSON.parse(node.textContent)); } catch { /* bounded diagnostics below */ }
    }
    const products = objects.filter(object => [object['@type']].flat().some(type => ['Product', 'Offer'].includes(type)));
    const structured = products.map(object => {
      const rawImages = imageValues(object.image);
      return { object, rawImages, images: rawImages.map(value => urlInfo(value, base)).filter(Boolean) };
    });
    const matching = structured.filter(({ object }) => {
      const refs = [object.url, object['@id'], object.mainEntityOfPage?.['@id'], object.mainEntityOfPage].filter(value => typeof value === 'string');
      return refs.some(ref => {
        try {
          const url = new URL(ref, base);
          return url.origin === new URL(base).origin && (url.pathname === new URL(canonical).pathname || (adId && url.pathname.match(/\/(\d+)-\d+-\d+/)?.[1] === adId));
        } catch {
          return false;
        }
      });
    });
    const trustedSelectors = '#viewad-image, #viewad-image-gallery, #viewad-gallery, [data-testid="ad-gallery"], [data-testid="viewad-gallery"]';
    const genericSelectors = '[data-testid*="gallery" i], [class*="gallery" i], [class*="imageview" i]';
    const roots = [...new Set([...document.querySelectorAll(trustedSelectors), ...document.querySelectorAll(genericSelectors)])];
    const assessments = roots.slice(0, 100).map(root => {
      const candidates = collect(root, base);
      return { root, candidates, trusted: root.matches(trustedSelectors), anchored: Boolean(og && candidates.some(candidate => candidate.imageId === og.imageId)) };
    });
    const eligible = assessments.filter(assessment => assessment.candidates.length && (assessment.trusted || assessment.anchored));
    eligible.sort((a, b) => Number(b.trusted) - Number(a.trusted) || b.candidates.length - a.candidates.length);
    let selected = [];
    let strategy = 'unresolved';
    if (eligible.length) {
      selected = eligible[0].candidates;
      strategy = 'gallery-dom';
    } else if (matching.length === 1 && matching[0].images.length) {
      selected = matching[0].images;
      strategy = 'ad-linked-jsonld';
    } else if (structured.length === 1 && structured[0].images.length && og && structured[0].images.some(image => image.imageId === og.imageId)) {
      selected = structured[0].images;
      strategy = 'og-linked-jsonld';
    }
    const images = deduplicate(selected);
    const all = collect(document, base);
    const rawDom = rawDomDiagnostics(document, base);
    const diagnostics = {
      version: 5,
      capturedAt: new Date().toISOString(),
      pageUrl: base,
      adId: adId || null,
      strategy,
      rawSelectedCount: selected.length,
      uniqueImageCount: images.length,
      variantsRemoved: selected.length - images.length,
      selectedRoot: eligible[0] ? describe(eligible[0].root) : null,
      openGraphImage: { url: diagnosticUrl(ogRaw, base), acceptedByExtractor: Boolean(og) },
      galleryCandidates: assessments.map(assessment => ({ ...describe(assessment.root), trusted: assessment.trusted, primaryImageMatched: assessment.anchored, candidates: assessment.candidates.length })),
      structuredCandidates: structured.map(item => ({
        url: typeof item.object.url === 'string' ? diagnosticUrl(item.object.url, base) : null,
        rawImages: item.rawImages.slice(0, LIMIT).map(value => ({ url: diagnosticUrl(value, base), acceptedByExtractor: Boolean(urlInfo(value, base)) })),
        images: item.images.slice(0, LIMIT).map(diagnosticCandidate)
      })),
      pageImageCandidates: all.slice(0, LIMIT).map(diagnosticCandidate),
      pageCandidateCount: all.length,
      truncated: all.length > LIMIT,
      rawDomSourceCount: rawDom.count,
      rawDomSourcesTruncated: rawDom.truncated,
      rawDomSourceHosts: rawDom.hosts,
      rawDomSources: rawDom.candidates,
      selectedImages: images.map(diagnosticImage)
    };
    return { images, diagnostics };
  }

  function hiddenEditImages(form, base) {
    return [...form.querySelectorAll('input[type="hidden"][name]')]
      .map(input => {
        const match = (input.getAttribute('name') || '').match(/^adImages\[(\d+)\]\.url$/);
        if (!match) return null;
        const info = urlInfo(input.value || input.getAttribute('value') || '', base);
        return info ? { index: Number(match[1]), ...info } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.index - b.index);
  }

  function structuredEditImages(images, base) {
    if (!Array.isArray(images)) return [];
    return images.map((image, index) => {
      const xxLarge = urlInfo(image?.xxLargeUrl || '', base);
      const thumbnail = urlInfo(image?.thumbnailUrl || '', base);
      const identity = xxLarge || thumbnail;
      if (!identity) return null;
      if (xxLarge && thumbnail && xxLarge.imageId !== thumbnail.imageId) return null;
      return {
        index: Number.isInteger(image?.index) ? image.index : index,
        imageId: identity.imageId,
        identityType: identity.identityType,
        sourceFormatHint: xxLarge?.sourceFormatHint || thumbnail?.sourceFormatHint || 'unbekannt',
        xxLargeUrl: xxLarge?.url || '',
        thumbnailUrl: thumbnail?.url || '',
        title: image?.title || null
      };
    }).filter(Boolean).sort((a, b) => a.index - b.index);
  }

  function evaluateEditImageCompleteness(capture, evidence = {}) {
    const images = Array.isArray(capture?.images) ? capture.images : [];
    const diagnostics = capture?.diagnostics || {};
    if (Number(diagnostics.unsupportedLocalPreviews || 0) > 0) {
      return { complete: false, reason: 'unsupported-local-preview', explicitEmpty: false };
    }
    if (images.length > 0) {
      return { complete: true, reason: 'captured-images', explicitEmpty: false };
    }
    const explicitEmpty = evidence?.source === 'post-listing-props'
      && evidence?.explicitImageArray === true
      && Number(evidence?.imageCount) === 0
      && Number(diagnostics.uploadPreviewImageCount || 0) === 0
      && Number(diagnostics.hiddenImageFieldCount || 0) === 0
      && Number(diagnostics.hiddenImageSourceCount || 0) === 0
      && Number(diagnostics.structuredImageSourceCount || 0) === 0;
    if (explicitEmpty) return { complete: true, reason: 'explicit-empty-image-set', explicitEmpty: true };
    return { complete: false, reason: 'unresolved-empty-image-capture', explicitEmpty: false };
  }

  function extractEdit(form, base, structuredImages = []) {
    const roots = [...form.querySelectorAll('[id*="image" i][id*="upload" i], [class*="imageupload" i], [class*="image-upload" i], [data-testid*="image-upload" i], [id*="picture" i], [class*="picture-upload" i], [id="postad-images"]')];
    for (const input of form.querySelectorAll('input[type="file"]')) {
      let parent = input.parentElement;
      while (parent && parent !== form) {
        if (collect(parent, base).length || /image|picture|photo|bild/i.test([parent.id, parent.className, parent.getAttribute?.('data-testid')].filter(Boolean).join(' '))) {
          roots.push(parent);
          break;
        }
        parent = parent.parentElement;
      }
    }
    const uniqueRoots = [...new Set(roots)];
    const choices = uniqueRoots.map(root => ({ root, candidates: collect(root, base) })).filter(choice => choice.candidates.length);
    choices.sort((a, b) => b.candidates.length - a.candidates.length);
    const chosen = choices[0];
    const visualImages = deduplicate(chosen?.candidates || []);
    const hiddenImages = hiddenEditImages(form, base);
    const hiddenById = new Map(hiddenImages.map(image => [image.imageId, image]));
    const structuredSources = structuredEditImages(structuredImages, base);
    const structuredById = new Map(structuredSources.map(image => [image.imageId, image]));

    const images = visualImages.map((image, index) => {
      const structured = structuredById.get(image.imageId) || null;
      const hidden = hiddenById.get(image.imageId) || null;
      const hiddenMatches = Boolean(hidden && hidden.imageId === image.imageId);
      const structuredMatches = Boolean(structured && structured.imageId === image.imageId);
      const downloadUrl = structuredMatches && structured.xxLargeUrl
        ? structured.xxLargeUrl
        : hiddenMatches
          ? hidden.url
          : null;
      const downloadSource = structuredMatches && structured.xxLargeUrl
        ? 'post-listing-props-xxlarge'
        : hiddenMatches
          ? 'adImages-hidden'
          : null;
      const sourceUrls = [...new Set([
        downloadUrl,
        hiddenMatches ? hidden.url : null,
        structuredMatches ? structured.thumbnailUrl : null,
        image.url,
        ...(image.variants || [])
      ].filter(Boolean))];
      return {
        ...image,
        position: index,
        thumbnailUrl: image.url,
        downloadUrl,
        downloadSource,
        preferExactDownloadUrl: downloadSource === 'post-listing-props-xxlarge',
        sourceUrls,
        title: structuredMatches ? structured.title : null,
        isPrimary: image.isPrimary || index === 0
      };
    });

    const uploadPreviewElements = [...new Set(uniqueRoots.flatMap(root => [...root.querySelectorAll('img,source')]))];
    const uploadPreviewImageCount = uploadPreviewElements.filter(element => diagnosticSourceEntries(element).some(entry => String(entry.raw || '').trim())).length;
    const unsupported = uploadPreviewElements.filter(element => diagnosticSourceEntries(element).some(entry => /^(blob:|data:)/i.test(String(entry.raw || '').trim()))).length;
    const hiddenImageFieldCount = form.querySelectorAll('input[type="hidden"][name^="adImages["][name$="].url"]').length;
    const all = collect(form, base);
    const hiddenMatched = images.filter(image => hiddenById.has(image.imageId)).length;
    const structuredMatched = images.filter(image => structuredById.has(image.imageId)).length;
    return {
      images,
      diagnostics: {
        version: 6,
        capturedAt: new Date().toISOString(),
        pageUrl: base,
        strategy: chosen ? 'edit-upload-container' : 'edit-unresolved',
        rawSelectedCount: chosen?.candidates.length || 0,
        uniqueImageCount: images.length,
        variantsRemoved: (chosen?.candidates.length || 0) - images.length,
        selectedRoot: chosen ? describe(chosen.root) : null,
        unsupportedLocalPreviews: unsupported,
        uploadRootCount: uniqueRoots.length,
        uploadPreviewImageCount,
        hiddenImageFieldCount,
        structuredImageSourceCount: structuredSources.length,
        structuredImageSourcesMatched: structuredMatched,
        structuredImageSources: structuredSources.map(image => ({ index: image.index, imageId: image.imageId, identityType: image.identityType, xxLargeUrl: diagnosticUrl(image.xxLargeUrl), thumbnailUrl: diagnosticUrl(image.thumbnailUrl), titlePresent: Boolean(image.title) })),
        hiddenImageSourceCount: hiddenImages.length,
        hiddenImageSourcesMatched: hiddenMatched,
        hiddenImageSources: hiddenImages.map(image => ({ index: image.index, imageId: image.imageId, identityType: image.identityType, url: diagnosticUrl(image.url), sourceFormatHint: image.sourceFormatHint })),
        pageImageCandidates: all.slice(0, LIMIT).map(diagnosticCandidate),
        pageCandidateCount: all.length,
        truncated: all.length > LIMIT,
        selectedImages: images.map(diagnosticImage)
      }
    };
  }

  const API = Object.freeze({ extract, extractEdit, evaluateEditImageCompleteness, diagnosticUrl });
  globalThis.KRDeps?.register?.('KRImages', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
