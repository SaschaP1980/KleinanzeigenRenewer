(() => {
  if (globalThis.__KR_CONTENT_V160__ === 'ready') return;
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before content.js');
  const MessageContractRegistry = KRDeps.require('KRMessageContractRegistry');
  globalThis.__KR_CONTENT_V160__ = 'ready';
  const PlatformHardening = KRDeps.require('KRPlatformHardening');
  const ManagedNavigation = KRDeps.require('KRManagedNavigation');
  const KRForm = KRDeps.require('KRForm');
  const KRImages = KRDeps.require('KRImages');
  const TemplateFill = KRDeps.require('KRTemplateFill');
  const InventoryRun = KRDeps.require('KRInventoryRun');
  const normalize = value => String(value || "").replace(/\s+/g, " ").trim();
  const unique = values => [...new Set(values.filter(Boolean))];

  function diagnostic(event, details = {}, severity = 'info') {
    try {
      chrome.runtime.sendMessage({ type: 'LOG_DIAGNOSTIC_EVENT', severity, event, module: 'content', operation: 'page-content', details }, () => void chrome.runtime.lastError);
    } catch { /* Diagnose darf den Seitenablauf nicht beeinflussen. */ }
  }

  function currentPlatformAccessRestriction() {
    const headings = [...document.querySelectorAll('h1,h2,[role="heading"]')]
      .map(element => normalize(element.textContent || ''))
      .filter(Boolean)
      .slice(0, 12);
    return PlatformHardening?.detectAccessRestriction?.({
      url: location.href,
      title: document.title || '',
      headings
    }) || null;
  }

  function reportPlatformAccessRestriction(restriction = currentPlatformAccessRestriction()) {
    if (!restriction?.restricted) return restriction;
    try {
      chrome.runtime.sendMessage({
        type: 'PLATFORM_ACCESS_RESTRICTED',
        evidence: restriction
      }, () => void chrome.runtime.lastError);
    } catch { /* Safety report must never break the page. */ }
    return restriction;
  }

  function restrictedResponse(restriction) {
    return {
      ok: false,
      errorCode: 'KR_PLATFORM_ACCESS_RESTRICTED',
      error: 'Kleinanzeigen hat den Zugriff vorübergehend eingeschränkt. Weitere automatisierte Aktionen wurden gestoppt.',
      restriction
    };
  }


  function storeGalleryDiagnostic(reason, diagnostics) {
    try {
      chrome.runtime.sendMessage({
        type: 'STORE_GALLERY_DIAGNOSTIC',
        reason: String(reason || 'gallery-extraction-failed').slice(0, 120),
        pageUrl: location.href,
        diagnostics: diagnostics || null
      }, () => void chrome.runtime.lastError);
    } catch { /* Diagnose darf den Seitenablauf nicht beeinflussen. */ }
  }

  function textFrom(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const value = normalize(element?.textContent || element?.getAttribute("content"));
      if (value) return value;
    }
    return "";
  }

  // Description text has a different contract from compact UI labels.
  function descriptionText(root) {
    let result = "";
    const boundary = count => {
      if (!result) return;
      const existing = result.match(/\n*$/)[0].length;
      result += "\n".repeat(Math.max(0, count - existing));
    };
    function visit(node) {
      if (node.nodeType === 3) { result += node.textContent.replace(/\r\n?/g, "\n"); return; }
      if (node.nodeType !== 1) return;
      if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(node.tagName) || node.hasAttribute("hidden") || node.getAttribute("aria-hidden") === "true") return;
      if (node.tagName === "BR") { result += "\n"; return; }
      const block = ["P", "DIV", "LI", "UL", "OL", "SECTION", "BLOCKQUOTE", "PRE"].includes(node.tagName);
      const spacing = node.tagName === "P" ? 2 : 1;
      if (block) boundary(spacing);
      for (const child of node.childNodes) visit(child);
      if (block) boundary(spacing);
    }
    for (const child of root.childNodes) visit(child);
    return result.replace(/\u00a0/g, " ").trim();
  }

  function extractDescription(product) {
    const selectors = ["#viewad-description-text", '[data-testid="ad-description"]', '[itemprop="description"]'];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element || element.tagName === "META") continue;
      const value = descriptionText(element);
      if (value) return { text: value, source: `dom:${selector}` };
    }
    const structured = typeof product.description === "string" ? product.description.replace(/\r\n?/g, "\n").trim() : "";
    if (structured) return { text: structured, source: "jsonld-fallback" };
    return { text: meta("description"), source: "meta-fallback" };
  }

  function meta(property) {
    return document.querySelector(`meta[property="${property}"], meta[name="${property}"]`)?.content?.trim() || "";
  }

  function jsonLdObjects() {
    const result = [];
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const value = JSON.parse(script.textContent);
        const values = Array.isArray(value) ? value : value?.["@graph"] || [value];
        result.push(...values.filter(item => item && typeof item === "object"));
      } catch {
        // Invalid third-party JSON-LD is ignored; DOM fallbacks remain available.
      }
    }
    return result;
  }

  function findProductData(objects) {
    return objects.find(item => {
      const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
      return types.some(type => ["Product", "Offer"].includes(type));
    }) || {};
  }

  function parseAdIdentity() {
    const canonicalMatch = location.pathname.match(/\/(\d+)-(\d+)-(\d+)(?:\/|$)/);
    const sharedPublicAdId = ManagedNavigation?.publicAdIdFromUrl?.(location.href) || "";
    return {
      adId: sharedPublicAdId || canonicalMatch?.[1] || "",
      categoryIdFromUrl: canonicalMatch?.[2] || "",
      locationIdFromUrl: canonicalMatch?.[3] || ""
    };
  }

  function loginAndOwnership() {
    const edit = KRForm?.locate(document,location.href);
    if (edit?.eligible) return {loggedIn:true,ownAd:true,evidence:"existing-edit-form",viewMode:"edit"};
    let existingEditAdId = "";
    try {
      const currentUrl = new URL(location.href);
      if (/\/p-anzeige-bearbeiten\.html$/i.test(currentUrl.pathname)) existingEditAdId = String(currentUrl.searchParams.get("adId") || "");
    } catch { /* invalid URL is handled by the normal ownership fallbacks */ }
    const bodyText = normalize(document.body?.innerText).toLocaleLowerCase("de-DE");
    const editControl = [...document.querySelectorAll("a,button")].find(element => {
      const text = normalize(element.textContent).toLocaleLowerCase("de-DE");
      const href = element.getAttribute("href") || "";
      return text.includes("anzeige bearbeiten") || /anzeige.*bearbeit|bearbeit.*anzeige/i.test(href);
    });
    const accountControl = [...document.querySelectorAll("a,button")].some(element => {
      const text = normalize(element.textContent).toLocaleLowerCase("de-DE");
      const href = element.getAttribute("href") || "";
      return text === "meins" || text.includes("meine anzeigen") || /\/m-meine-anzeigen\.html/.test(href);
    });
    const loginPrompt = bodyText.includes("einloggen") && [...document.querySelectorAll("a")].some(a => /einloggen|login/i.test(a.href));
    const existingEditUrl = /^\d+$/.test(existingEditAdId);
    return {
      loggedIn: Boolean(editControl || (existingEditUrl && !loginPrompt) || (accountControl && !loginPrompt)),
      ownAd: Boolean(editControl || (existingEditUrl && !loginPrompt)),
      evidence: editControl ? "edit-control" : existingEditUrl && !loginPrompt ? "existing-edit-url" : accountControl ? "account-control" : loginPrompt ? "login-prompt" : "none",
      viewMode: existingEditUrl ? "edit" : undefined
    };
  }

  function extractBreadcrumbs() {
    const containers = document.querySelectorAll('[aria-label*="readcrumb" i], [data-testid*="breadcrumb" i], .breadcrump, .breadcrumb');
    for (const container of containers) {
      const labels = unique([...container.querySelectorAll("a,span")].map(element => normalize(element.textContent)));
      const meaningful = labels.filter(label => label && label.length < 100 && !/^(startseite|zurück)$/i.test(label));
      if (meaningful.length >= 2) return meaningful;
    }
    return [];
  }

  function extractAttributes() {
    const attributes = [];
    const seen = new Set();
    const candidates = document.querySelectorAll('dl, [data-testid*="attribute" i], [data-testid*="detail" i], #viewad-details, .addetailslist');
    for (const container of candidates) {
      for (const term of container.querySelectorAll("dt")) {
        const definition = term.nextElementSibling?.matches("dd") ? term.nextElementSibling : null;
        const name = normalize(term.textContent).replace(/:$/, "");
        const value = normalize(definition?.textContent);
        const key = `${name}\u0000${value}`;
        if (name && value && !seen.has(key)) {
          seen.add(key);
          attributes.push({ name, value });
        }
      }
    }
    return attributes;
  }

  function extractFormFields() {
    const fields = [];
    const forms = [...document.querySelectorAll("form")];
    const editForm = forms.find(form => {
      const action = form.getAttribute("action") || "";
      const text = normalize(form.textContent).toLocaleLowerCase("de-DE");
      return /anzeige.*bearbeit|bearbeit.*anzeige/i.test(action) ||
        (form.querySelector("textarea[name]") && /speichern|anzeige ändern/.test(text));
    });
    if (!editForm) return fields;
    for (const element of editForm.querySelectorAll("input[name], textarea[name], select[name]")) {
      if (["hidden", "password", "file"].includes(element.type)) continue;
      const value = element.type === "checkbox" || element.type === "radio" ? element.checked : element.value;
      fields.push({
        name: element.name,
        type: element.type || element.tagName.toLowerCase(),
        value
      });
    }
    return fields;
  }

  function extractCurrentAd() {
    const edit = KRForm?.extract(document,location.href);
    if (edit?.form) {
      if (!edit.eligible) throw new Error("Bearbeiten-Formular ohne eindeutige bestehende Anzeigen-ID. Bitte Formulardiagnose kopieren.");
      if (!edit.title || !edit.description) throw new Error("Titel oder Beschreibung im Formular nicht erkannt. Bitte Formulardiagnose kopieren.");
      if (edit.form.querySelector('[aria-busy="true"]')) throw new Error("Formular lädt noch. Bitte kurz warten.");
      const capture = KRImages.extractEdit(edit.form,location.href,edit.structuredImages);
      const imageCompleteness = KRImages.evaluateEditImageCompleteness(capture, edit.imageEvidence);
      capture.diagnostics.completeness = imageCompleteness;
      if (!imageCompleteness.complete) throw new Error("Bestehende Bilder im Bearbeiten-Formular nicht vollständig erkannt. Bitte unter „Support & Diagnose“ die Diagnosedaten als ZIP herunterladen.");
      const dynamicAttributes = edit.dynamicAttributes || [];
      const locationParts = [edit.location?.zipCode, edit.location?.city].filter(Boolean);
      return {
        sourceUrl: location.href, canonicalUrl: location.href, pageTitle: document.title, adId: edit.adId,
        auth: loginAndOwnership(), title: edit.title, description: edit.description, price: edit.price,
        categoryIdFromUrl: edit.categoryId, categoryPath: edit.categoryPath,
        category: { id: edit.categoryId, path: edit.categoryPath },
        dynamicAttributes,
        attributes: dynamicAttributes.map(attribute => ({
          name: attribute.label,
          value: attribute.displayValue || String(attribute.technicalValue ?? "Nicht erkannt"),
          key: attribute.key,
          technicalName: attribute.technicalName,
          technicalValue: attribute.technicalValue,
          status: attribute.status
        })),
        adType: edit.adType, shipping: edit.shipping, buyNow: edit.buyNow,
        locationData: edit.location, location: locationParts.join(" · "), contact: edit.contact, posterType: edit.posterType,
        images: capture.images, imageDiagnostics: capture.diagnostics, formFields: edit.fields,
        formDiagnostics: edit.diagnostics, warnings: edit.warnings,
        extraction: {
          version: 6, capturedFromEditView: true, descriptionSource: "form-value",
          descriptionLineBreaks: (edit.description.match(/\n/g) || []).length,
          requiresJpeg: true, requiresLargeJpeg: true,
          imageSetExplicitlyEmpty: imageCompleteness.explicitEmpty === true,
          imageSetStatus: imageCompleteness.reason,
          templateComplete: edit.blockingIssues.length === 0, blockingIssues: edit.blockingIssues
        }
      };
    }
    const auth = loginAndOwnership();
    if (!auth.loggedIn) throw new Error("Keine bestätigte Kleinanzeigen-Anmeldung erkannt.");
    if (!auth.ownAd) throw new Error("Diese Seite wurde nicht als eigene, bearbeitbare Anzeige erkannt.");

    const structured = jsonLdObjects();
    const product = findProductData(structured);
    const identity = parseAdIdentity();
    const title = normalize(product.name) || textFrom(["h1", '[data-testid="ad-title"]']) || meta("og:title");
    const descriptionResult = extractDescription(product);
    const description = descriptionResult.text;
    const priceValue = normalize(product.offers?.price || product.price) || textFrom([
      '[data-testid="ad-price"]',
      "#viewad-price",
      '[itemprop="price"]'
    ]);
    const imageCapture = KRImages.extract(document, location.href);
    const images = imageCapture.images;
    if (!images.length) {
      storeGalleryDiagnostic('public-ad-gallery-unresolved', imageCapture.diagnostics);
      diagnostic('IMAGE_GALLERY_EXTRACTION_FAILED', {
        adId: identity.adId || null,
        strategy: imageCapture.diagnostics?.strategy || null,
        galleryCandidateCount: imageCapture.diagnostics?.galleryCandidates?.length || 0,
        pageCandidateCount: imageCapture.diagnostics?.pageCandidateCount || 0,
        rawDomSourceCount: imageCapture.diagnostics?.rawDomSourceCount || 0
      }, 'error');
      throw new Error("Anzeigengalerie nicht eindeutig erkannt. Bitte unter „Support & Diagnose“ die Diagnosedaten als ZIP herunterladen.");
    }
    const formFields = extractFormFields();
    const warnings = [];
    if (!identity.adId) warnings.push("Anzeigen-ID konnte nicht aus der URL gelesen werden.");
    if (!title) warnings.push("Titel wurde nicht erkannt.");
    if (!description) warnings.push("Beschreibung wurde nicht erkannt.");
    else if (!descriptionResult.source.startsWith("dom:")) warnings.push("Beschreibung aus Ersatzquelle; Vollständigkeit und Formatierung bitte prüfen.");
    if (!images.length) warnings.push("Keine Anzeigenbilder wurden erkannt.");

    return {
      sourceUrl: location.href,
      canonicalUrl: document.querySelector('link[rel="canonical"]')?.href || location.href,
      pageTitle: document.title,
      ...identity,
      auth,
      title,
      description,
      price: {
        value: priceValue,
        currency: normalize(product.offers?.priceCurrency || product.priceCurrency) || "EUR",
        displayed: textFrom(['[data-testid="ad-price"]', "#viewad-price"])
      },
      categoryPath: extractBreadcrumbs(),
      attributes: extractAttributes(),
      location: textFrom(['[data-testid="ad-location"]', "#viewad-locality", '[itemprop="address"]']),
      images,
      imageDiagnostics: imageCapture.diagnostics,
      formFields,
      warnings,
      extraction: {
        version: 3,
        descriptionSource: descriptionResult.source,
        descriptionLineBreaks: (description.match(/\n/g) || []).length,
        structuredDataObjects: structured.length,
        capturedFromEditView: formFields.length > 0
      }
    };
  }

  function normalizeGermanDate(value) {
    const match = String(value || '').match(/\b(\d{2})\.(\d{2})\.(\d{4})\b/);
    if (!match) return { display: '', iso: '' };
    return { display: `${match[1]}.${match[2]}.${match[3]}`, iso: `${match[3]}-${match[2]}-${match[1]}` };
  }

  function extractReadOnlyListingMetadata() {
    const identity = parseAdIdentity();
    if (!/^\d+$/.test(identity.adId || '') || !/\/s-anzeige\//i.test(location.pathname)) {
      throw new Error('Öffentliche Anzeigen-Detailseite wurde nicht eindeutig erkannt.');
    }
    const bodyText = normalize(document.body?.innerText || document.body?.textContent || '');
    const endMatch = bodyText.match(/\bEndet\s+am\s*:?\s*(\d{2}\.\d{2}\.\d{4})\b/i);
    const endDate = normalizeGermanDate(endMatch?.[1] || '');

    let listingDate = { display: '', iso: '' };
    const timeCandidates = [...document.querySelectorAll('time')];
    for (const time of timeCandidates) {
      const candidate = normalizeGermanDate(time.getAttribute('datetime') || time.textContent || '');
      if (candidate.display && candidate.display !== endDate.display) { listingDate = candidate; break; }
    }
    if (!listingDate.display) {
      const exactDateNodes = [...document.querySelectorAll('span,div,p')].filter(element => {
        const text = normalize(element.textContent || '');
        return /^\d{2}\.\d{2}\.\d{4}$/.test(text) && element.children.length <= 1;
      });
      for (const element of exactDateNodes) {
        const candidate = normalizeGermanDate(element.textContent || '');
        if (candidate.display && candidate.display !== endDate.display) { listingDate = candidate; break; }
      }
    }

    return {
      adId: identity.adId,
      endDateDisplay: endDate.display || null,
      endDateIso: endDate.iso || null,
      listingDateDisplay: listingDate.display || null,
      listingDateIso: listingDate.iso || null,
      sourceUrl: location.origin + location.pathname
    };
  }

  function parsePublishedAdUrl(rawUrl) {
    try {
      const url = new URL(String(rawUrl || ''), location.href);
      if (!/(^|\.)kleinanzeigen\.de$/i.test(url.hostname)) return null;
      const publicMatch = url.pathname.match(/\/s-anzeige\/[^/]+\/(\d+)-\d+-\d+(?:\/)?$/i);
      if (publicMatch) return { adId: publicMatch[1], publicUrl: `${url.origin}${url.pathname}`, kind: 'public' };
      if (/\/p-anzeige-bearbeiten\.html$/i.test(url.pathname)) {
        const adId = url.searchParams.get('adId');
        if (/^\d+$/.test(String(adId || ''))) return { adId: String(adId), publicUrl: '', kind: 'edit' };
      }
      if (/\/p-anzeige-aufgeben-bestaetigung\.html$/i.test(url.pathname)) {
        const adId = url.searchParams.get('addId') || url.searchParams.get('adId');
        if (/^\d+$/.test(String(adId || ''))) return { adId: String(adId), publicUrl: '', kind: 'confirmation' };
      }
    } catch { /* ignore invalid candidates */ }
    return null;
  }

  function normalizeInventoryCandidateThumbnail(rawUrl) {
    try {
      const parsed = new URL(String(rawUrl || ''), location.href);
      return parsed.protocol === 'https:' && parsed.hostname === 'img.kleinanzeigen.de' ? parsed.href : '';
    } catch {
      return '';
    }
  }

  function inventoryCandidatePreview() {
    const auth = loginAndOwnership();
    if (!auth?.loggedIn || !auth?.ownAd) return null;
    let adId = '';
    try {
      const url = new URL(location.href);
      if (/\/p-anzeige-bearbeiten\.html$/i.test(url.pathname)) adId = String(url.searchParams.get('adId') || '');
      if (!adId) adId = url.pathname.match(/\/(\d+)-\d+-\d+(?:\/|$)/)?.[1] || '';
    } catch { /* invalid URL */ }
    if (!/^\d+$/.test(adId)) return null;

    let title = '';
    let thumbnailUrl = '';
    let thumbnailSource = 'none';
    let viewMode = auth.viewMode === 'edit' ? 'edit' : 'public';
    try {
      if (viewMode === 'edit') {
        const edit = KRForm?.extract(document, location.href);
        title = normalize(edit?.title || '');
        if (edit?.form) {
          const capture = KRImages?.extractEdit(edit.form, location.href, edit.structuredImages || []);
          const primary = capture?.images?.find(image => image?.isPrimary) || capture?.images?.[0] || null;
          thumbnailUrl = normalizeInventoryCandidateThumbnail(primary?.thumbnailUrl || primary?.url || '');
          if (thumbnailUrl) thumbnailSource = 'edit-images';
        }
      } else {
        title = textFrom(['h1', '[data-testid="ad-title"]']) || meta('og:title');
        const ogThumbnail = normalizeInventoryCandidateThumbnail(meta('og:image'));
        if (ogThumbnail) {
          thumbnailUrl = ogThumbnail;
          thumbnailSource = 'og-image';
        } else {
          const capture = KRImages?.extract(document, location.href);
          const primary = capture?.images?.find(image => image?.isPrimary) || capture?.images?.[0] || null;
          thumbnailUrl = normalizeInventoryCandidateThumbnail(primary?.thumbnailUrl || primary?.url || '');
          if (thumbnailUrl) thumbnailSource = 'gallery';
        }
      }
    } catch { /* preview stays best-effort */ }
    title = normalize(title || document.title || '').replace(/\s*[|–-]\s*Kleinanzeigen.*$/i, '').trim();
    return {
      adId,
      title: title || `Anzeige ${adId}`,
      thumbnailUrl: thumbnailUrl || null,
      thumbnailSource,
      viewMode,
      profileName: auth.loggedIn ? (InventoryRun?.detectedProfileName?.(document) || null) : null,
      sourceUrl: location.href
    };
  }

  function detectPublishedAd(sourceAdId) {
    const candidates = [];
    const add = value => {
      const parsed = parsePublishedAdUrl(value);
      if (!parsed || parsed.adId === String(sourceAdId || '')) return;
      if (!candidates.some(item => item.adId === parsed.adId && item.publicUrl === parsed.publicUrl)) candidates.push(parsed);
    };
    add(location.href);
    add(document.querySelector('link[rel="canonical"]')?.href || '');
    for (const anchor of document.querySelectorAll('a[href*="/s-anzeige/"], a[href*="p-anzeige-bearbeiten.html"]')) add(anchor.href);
    const preferred = candidates.find(item => item.kind === 'public') || candidates[0] || null;
    return preferred ? { adId: preferred.adId, publicUrl: preferred.publicUrl || null, candidateCount: candidates.length } : null;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const messageContract = MessageContractRegistry.route(message?.type, 'content');
    if (messageContract.action === 'ignore') return;
    if (messageContract.action === 'reject') {
      const error = MessageContractRegistry.errorFor(messageContract);
      diagnostic('MESSAGE_CONTRACT_REJECTED', {
        requestType: message?.type || null,
        target: 'content',
        errorCode: error.code,
        registered: messageContract.registered,
        targets: messageContract.targets
      }, 'warning');
      sendResponse({ ok: false, error: error.message, errorCode: error.code });
      return;
    }
    const platformAccessRestriction = currentPlatformAccessRestriction();
    if (platformAccessRestriction?.restricted) reportPlatformAccessRestriction(platformAccessRestriction);
    if (message?.type === "KR_CONTENT_READY") {
      sendResponse({ ok: true, result: {
        ready: true,
        version: chrome.runtime.getManifest().version,
        url: location.origin + location.pathname,
        platformAccessRestriction,
        modules: {
          images: Boolean(KRImages),
          form: Boolean(KRForm),
          templateFill: Boolean(TemplateFill),
          inventoryRun: Boolean(InventoryRun)
        }
      } });
      return;
    }
    if (message?.type === 'KR_PLATFORM_SAFETY_STOP') {
      globalThis.__KR_PLATFORM_SAFETY_STOP__ = true;
      sendResponse({ ok: true, result: { stopped: true } });
      return;
    }
    if (platformAccessRestriction?.restricted) {
      sendResponse(restrictedResponse(platformAccessRestriction));
      return;
    }
    if (message?.type === 'RENEWAL_FEEDBACK') {
      TemplateFill?.showFeedback?.(
        String(message.title || 'kleinanzeigen Manager'),
        String(message.text || ''),
        Array.isArray(message.issues) ? message.issues.map(value => String(value)).slice(0, 12) : [],
        { safetyText: false }
      );
      sendResponse({ ok: true, result: { shown: true } });
      return;
    }
    if (message?.type === 'DETECT_PUBLISHED_AD') {
      try {
        sendResponse({ ok: true, result: detectPublishedAd(message.sourceAdId) });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
      return;
    }
    if (message?.type === "FORM_DIAGNOSTICS") {
      try {
        const edit = KRForm.extract(document,location.href);
        const images = edit.form ? KRImages.extractEdit(edit.form,location.href,edit.structuredImages).diagnostics : KRImages.extract(document,location.href).diagnostics;
        sendResponse({ok:true,result:{form:edit.diagnostics,images,warnings:edit.warnings}});
      } catch(error) {sendResponse({ok:false,error:error.message});}
      return;
    }
    if (message?.type === "IMAGE_DIAGNOSTICS") {
      try { const edit=KRForm?.extract(document,location.href); sendResponse({ ok: true, result: edit?.form ? KRImages.extractEdit(edit.form,location.href,edit.structuredImages).diagnostics : KRImages.extract(document, location.href).diagnostics }); }
      catch (error) { sendResponse({ok:false,error:error.message}); }
      return;
    }
    if (message?.type === "INVENTORY_CANDIDATE_PREVIEW") {
      try { sendResponse({ ok: true, result: inventoryCandidatePreview() }); }
      catch (error) { sendResponse({ ok: false, error: error.message }); }
      return;
    }
    if (message?.type === "PAGE_STATUS") {
      const auth = loginAndOwnership();
      sendResponse({ ok: true, result: {
        auth,
        url: location.href,
        title: document.title,
        pageType: InventoryRun?.isMyAdsUrl(location.href) ? "my-ads" : auth.viewMode === "edit" ? "edit" : "other",
        adId: (() => {
          try {
            const url = new URL(location.href);
            if (/\/p-anzeige-bearbeiten\.html$/i.test(url.pathname)) return /^\d+$/.test(String(url.searchParams.get("adId") || "")) ? String(url.searchParams.get("adId")) : null;
            return url.pathname.match(/\/(\d+)-\d+-\d+(?:\/|$)/)?.[1] || null;
          } catch { return null; }
        })(),
        profileName: auth.loggedIn ? (InventoryRun?.detectedProfileName?.(document) || null) : null
      } });
      return;
    }
    if (message?.type === "EXTRACT_READONLY_METADATA") {
      try {
        const result = extractReadOnlyListingMetadata();
        diagnostic('READONLY_METADATA_EXTRACTED', { adId: result.adId, hasEndDate: Boolean(result.endDateDisplay), hasListingDate: Boolean(result.listingDateDisplay) });
        sendResponse({ ok: true, result });
      } catch (error) {
        if (message?.silentFailure !== true) diagnostic('READONLY_METADATA_FAILED', { message: String(error.message || error).slice(0, 500) }, 'warning');
        sendResponse({ ok: false, error: error.message });
      }
      return;
    }
    if (message?.type === "EXTRACT_CURRENT_AD") {
      try {
        const result = extractCurrentAd();
        diagnostic('CONTENT_EXTRACTION_SUCCEEDED', { adId: result.adId || null, viewMode: result.auth?.viewMode || null, imageCount: result.images?.length || 0, templateComplete: result.extraction?.templateComplete === true });
        sendResponse({ ok: true, result });
      } catch (error) {
        diagnostic('CONTENT_EXTRACTION_FAILED', { message: String(error.message || error).slice(0, 500), stack: String(error.stack || '').slice(0, 2000) }, 'error');
        sendResponse({ ok: false, error: error.message });
      }
    }
  });

  const initialPlatformRestriction = reportPlatformAccessRestriction();

  // A template fill session is bound to the newly opened target tab by the
  // background worker. On ordinary Kleinanzeigen pages this is a no-op. A
  // persisted platform safety stop is checked before any pending fill resumes.
  if (!initialPlatformRestriction?.restricted && !globalThis.__KR_PLATFORM_SAFETY_STOP__) {
    chrome.runtime.sendMessage({ type: 'GET_PLATFORM_ACCESS_RESTRICTION' }, response => {
      if (chrome.runtime.lastError || response?.ok !== true) return;
      if (response?.result?.active) {
        globalThis.__KR_PLATFORM_SAFETY_STOP__ = true;
        return;
      }
      TemplateFill?.runPendingFill().catch(() => {});
    });
  }
})();
