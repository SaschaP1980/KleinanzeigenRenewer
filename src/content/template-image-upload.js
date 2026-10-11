(() => {
  if (globalThis.__KR_TEMPLATE_IMAGE_UPLOAD_V12317__) return;
  globalThis.__KR_TEMPLATE_IMAGE_UPLOAD_V12317__ = true;
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before KRTemplateImageUpload.js');

  function create(options = {}) {
    const {
      CHUNK_SIZE,
      IMAGE_PREVIEW_SERVER_TIMEOUT_MS,
      IMAGE_PREVIEW_RETRY_DELAY_MS,
      IMAGE_PREVIEW_STABLE_MS,
      IMAGE_PREVIEW_INITIAL_WAIT_MS,
      IMAGE_PREVIEW_RETRY_WAIT_MS,
      IMAGE_PREVIEW_FALLBACK_WAIT_MS,
      IMAGE_PROGRESS_HOLD_MS,
      LOCAL_PREVIEW_URLS,
      sleep,
      runtimeMessage,
      diagnostic,
      visible,
      waitFor,
      updatePanel
    } = options;

  function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function loadLocalImage(fillId, image) {
    const expected = Number(image.size || 0);
    if (!image.imageKey || !expected) throw new Error(`Lokale Metadaten für Bild ${Number(image.position) + 1} fehlen.`);
    const chunks = [];
    let offset = 0;
    while (offset < expected) {
      const result = await runtimeMessage({
        type: 'GET_TEMPLATE_IMAGE_CHUNK',
        fillId,
        imageKey: image.imageKey,
        offset,
        length: Math.min(CHUNK_SIZE, expected - offset)
      });
      if (Number(result.offset) !== offset || !result.base64) throw new Error(`Bild ${Number(image.position) + 1}: ungültiger Datenblock.`);
      const bytes = base64ToBytes(result.base64);
      chunks.push(bytes);
      offset += bytes.byteLength;
      if (bytes.byteLength === 0) throw new Error(`Bild ${Number(image.position) + 1}: leerer Datenblock.`);
    }
    const blob = new Blob(chunks, { type: image.mimeType || 'image/jpeg' });
    if (blob.size !== expected) throw new Error(`Bild ${Number(image.position) + 1}: lokale Größe stimmt nicht überein.`);
    return new File([blob], `kleinanzeigen-${String(Number(image.position) + 1).padStart(2, '0')}.jpg`, {
      type: image.mimeType || 'image/jpeg',
      lastModified: Date.now()
    });
  }

  function imageUploadScope(input) {
    return input?.closest('fieldset') || input?.parentElement?.parentElement?.parentElement || document;
  }

  function imageUploadInput() {
    return [...document.querySelectorAll('input[type="file"][multiple]')]
      .find(element => visible(element.parentElement) || element.classList.contains('hidden')) || null;
  }

  function serverImageInputs() {
    return [...document.querySelectorAll('input[type="hidden"][name^="adImages["][name$=".url"]')];
  }

  function uploadedPreviewImages(input) {
    const scope = imageUploadScope(input);
    return [...scope.querySelectorAll('img[alt="Bild zur Anzeige"]')].filter(image => image.isConnected);
  }

  function previewImageLoaded(image) {
    return Boolean(image?.complete && Number(image.naturalWidth) > 0 && Number(image.naturalHeight) > 0);
  }

  function previewUrlForDiagnostic(image) {
    try {
      const url = new URL(image?.currentSrc || image?.src || '');
      return `${url.origin}${url.pathname}`;
    } catch {
      return 'unavailable';
    }
  }

  async function waitForPreviewStability(image, { timeout, stableMs = IMAGE_PREVIEW_STABLE_MS } = {}) {
    if (!image) return false;
    const deadline = Date.now() + Number(timeout || 0);
    let lastActivity = Date.now();
    let lastError = 0;
    const markActivity = () => { lastActivity = Date.now(); };
    const markError = () => { lastError = Date.now(); lastActivity = lastError; };
    let observer = null;
    try {
      image.addEventListener('load', markActivity);
      image.addEventListener('error', markError);
      if (typeof MutationObserver === 'function') {
        observer = new MutationObserver(markActivity);
        observer.observe(image, { attributes: true, attributeFilter: ['src', 'srcset'] });
      }
      while (Date.now() < deadline) {
        const now = Date.now();
        if (previewImageLoaded(image)
          && now - lastActivity >= stableMs
          && (!lastError || now - lastError >= stableMs)) return true;
        await sleep(60);
      }
      return false;
    } finally {
      image.removeEventListener('load', markActivity);
      image.removeEventListener('error', markError);
      observer?.disconnect();
    }
  }

  async function retryBrokenPreviewOnce(image) {
    if (!image || previewImageLoaded(image)) return false;
    if (image.dataset.krPreviewState === 'cdn-loaded' || image.dataset.krPreviewState === 'blob-fallback') return false;
    if (image.dataset.krCdnRetryDone === 'true') return false;
    const source = image.getAttribute('src') || image.currentSrc || image.src;
    if (!source || source.startsWith('blob:')) return false;
    image.dataset.krCdnRetryDone = 'true';
    image.removeAttribute('src');
    await sleep(20);
    image.src = source;
    return true;
  }

  async function waitForServerPreviews(input, expected) {
    await waitFor(() => uploadedPreviewImages(input).length >= expected, {
      timeout: 20000,
      interval: 150,
      description: `${expected} Bildvorschauen`
    });

    const deadline = Date.now() + IMAGE_PREVIEW_SERVER_TIMEOUT_MS;
    let retryAt = 0;
    while (Date.now() < deadline) {
      const previews = uploadedPreviewImages(input).slice(0, expected);
      for (const image of previews) {
        if (previewImageLoaded(image) && !image.dataset.krPreviewState) image.dataset.krPreviewState = 'cdn-loaded';
      }
      if (previews.length >= expected && previews.every(previewImageLoaded)) {
        return { serverLoaded: true, previews, brokenUrls: [] };
      }

      // Retained v1.1.5 fallback path: retry only previews that are still
      // actually broken, and at most once per image. Successfully loaded or
      // blob-backed thumbnails are never touched again.
      if (Date.now() >= retryAt) {
        for (const image of previews.filter(item => !previewImageLoaded(item))) {
          await retryBrokenPreviewOnce(image);
        }
        retryAt = Date.now() + IMAGE_PREVIEW_RETRY_DELAY_MS;
      }
      await sleep(250);
    }

    const previews = uploadedPreviewImages(input).slice(0, expected);
    return {
      serverLoaded: previews.length >= expected && previews.every(previewImageLoaded),
      previews,
      brokenUrls: previews.filter(item => !previewImageLoaded(item)).map(previewUrlForDiagnostic)
    };
  }

  async function applyLocalPreviewFallback(previews, files) {
    let substituted = 0;
    for (let index = 0; index < Math.min(previews.length, files.length); index += 1) {
      const image = previews[index];
      if (previewImageLoaded(image) || image.dataset.krPreviewState === 'cdn-loaded') continue;
      if (image.dataset.krLocalPreview === 'true') continue;
      const localUrl = URL.createObjectURL(files[index]);
      LOCAL_PREVIEW_URLS.add(localUrl);
      image.dataset.krLocalPreview = 'true';
      image.dataset.krPreviewState = 'blob-fallback-pending';
      image.src = localUrl;
      substituted += 1;
    }
    if (!substituted) return { substituted: 0, loaded: previews.every(previewImageLoaded) };
    const loaded = await waitFor(() => previews.every(previewImageLoaded), {
      timeout: IMAGE_PREVIEW_FALLBACK_WAIT_MS,
      interval: 80,
      description: 'Lokale Bildvorschau'
    }).then(() => true).catch(() => false);
    if (loaded) {
      for (const image of previews) {
        if (image.dataset.krLocalPreview === 'true') image.dataset.krPreviewState = 'blob-fallback';
      }
    }
    return { substituted, loaded };
  }

  async function setImageProgress(fillId, index, total, phase, detail = '') {
    const current = index + 1;
    let text = `Bild ${current}/${total} wird hochgeladen …`;
    if (phase === 'checking') text = `Bild ${current}/${total} hochgeladen – Vorschau wird geprüft …`;
    if (phase === 'stable') text = `Bild ${current}/${total} erfolgreich übernommen${detail ? ` (${detail})` : ''}.`;
    if (phase === 'failed') text = `Bild ${current}/${total} konnte nicht stabil übernommen werden${detail ? `: ${detail}` : '.'}`;
    updatePanel('Bilder werden übernommen', text);
    await runtimeMessage({
      type: 'UPDATE_TEMPLATE_FILL_SESSION',
      fillId,
      status: 'running',
      stage: `image-${current}-of-${total}-${phase}`
    }).catch(() => {});
    void diagnostic(fillId, 'TEMPLATE_IMAGE_PROGRESS', { image: current, total, phase, detail }, phase === 'failed' ? 'warning' : 'info');
  }

  async function stabilizePreviewForFile(input, file, index, total) {
    const preview = await waitFor(() => uploadedPreviewImages(input)[index], {
      timeout: 20000,
      interval: 100,
      description: `Bild ${index + 1}/${total}: Vorschau`
    });

    if (await waitForPreviewStability(preview, { timeout: IMAGE_PREVIEW_INITIAL_WAIT_MS })) {
      preview.dataset.krPreviewState = 'cdn-loaded';
      preview.dataset.krPreviewStableAt = String(Date.now());
      return { status: 'cdn-loaded', preview, diagnosticUrl: previewUrlForDiagnostic(preview) };
    }

    const retried = await retryBrokenPreviewOnce(preview);
    if (retried && await waitForPreviewStability(preview, { timeout: IMAGE_PREVIEW_RETRY_WAIT_MS })) {
      preview.dataset.krPreviewState = 'cdn-loaded';
      preview.dataset.krPreviewStableAt = String(Date.now());
      return { status: 'cdn-loaded', preview, diagnosticUrl: previewUrlForDiagnostic(preview) };
    }

    // The server-side image object already exists. Use the exact local JPEG
    // only for the visible preview. Set this fallback once and never switch the
    // thumbnail back to CDN during the current fill run.
    if (preview.dataset.krLocalPreview !== 'true') {
      const localUrl = URL.createObjectURL(file);
      LOCAL_PREVIEW_URLS.add(localUrl);
      preview.dataset.krLocalPreview = 'true';
      preview.dataset.krPreviewState = 'blob-fallback-pending';
      preview.src = localUrl;
    }
    if (await waitForPreviewStability(preview, { timeout: IMAGE_PREVIEW_FALLBACK_WAIT_MS })) {
      preview.dataset.krPreviewState = 'blob-fallback';
      preview.dataset.krPreviewStableAt = String(Date.now());
      return { status: 'blob-fallback', preview, diagnosticUrl: previewUrlForDiagnostic(preview) };
    }

    preview.dataset.krPreviewState = 'failed';
    return { status: 'failed', preview, diagnosticUrl: previewUrlForDiagnostic(preview) };
  }

  async function waitForAllImagePreviewsStable(input, expected) {
    const previews = uploadedPreviewImages(input).slice(0, expected);
    if (previews.length < expected) return false;
    const deadline = Date.now() + 5000;
    let lastActivity = Date.now();
    let lastError = 0;
    const markActivity = () => { lastActivity = Date.now(); };
    const markError = () => { lastError = Date.now(); lastActivity = lastError; };
    const observer = typeof MutationObserver === 'function' ? new MutationObserver(markActivity) : null;
    try {
      for (const image of previews) {
        image.addEventListener('load', markActivity);
        image.addEventListener('error', markError);
        observer?.observe(image, { attributes: true, attributeFilter: ['src', 'srcset'] });
      }
      while (Date.now() < deadline) {
        const now = Date.now();
        const allTerminal = previews.every(image => ['cdn-loaded', 'blob-fallback'].includes(image.dataset.krPreviewState));
        if (allTerminal
          && previews.every(previewImageLoaded)
          && now - lastActivity >= IMAGE_PREVIEW_STABLE_MS
          && (!lastError || now - lastError >= IMAGE_PREVIEW_STABLE_MS)) return true;
        await sleep(60);
      }
      return false;
    } finally {
      for (const image of previews) {
        image.removeEventListener('load', markActivity);
        image.removeEventListener('error', markError);
      }
      observer?.disconnect();
    }
  }

  async function uploadImages(fillId, template) {
    const images = [...(template.images || [])].sort((a, b) => Number(a.position) - Number(b.position));
    if (!images.length) return { issues: [], complete: true, states: [] };

    const files = [];
    const states = [];
    const issues = [];
    const previewTasks = [];
    let input = await waitFor(() => imageUploadInput(), {
      timeout: 10000,
      description: 'Bilder-Upload'
    });

    const existingServerCount = serverImageInputs().length;
    if (existingServerCount > images.length) {
      issues.push(`Bilder: Im neuen Formular sind bereits ${existingServerCount} Bilder vorhanden, erwartet werden ${images.length}.`);
    }

    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      const file = await loadLocalImage(fillId, image);
      files.push(file);
      const state = { index, position: Number(image.position), status: 'pending' };
      states.push(state);

      try {
        if (serverImageInputs().length <= index) {
          await setImageProgress(fillId, index, images.length, 'uploading');
          input = await waitFor(() => imageUploadInput(), { timeout: 5000, description: 'Bilder-Upload' });
          const transfer = new DataTransfer();
          transfer.items.add(file);
          input.files = transfer.files;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));

          await waitFor(() => serverImageInputs().length >= index + 1, {
            timeout: 90000,
            interval: 250,
            description: `${index + 1} serverseitig angelegte Bilder`
          });
        }

        state.status = 'server-created';
        await setImageProgress(fillId, index, images.length, 'checking');
        input = await waitFor(() => imageUploadInput(), { timeout: 5000, description: 'Bilder-Upload' });
        const stabilizationInput = input;

        previewTasks.push((async () => {
          try {
            const previewState = await stabilizePreviewForFile(stabilizationInput, file, index, images.length);
            state.status = previewState.status;
            state.preview = previewState.diagnosticUrl;

            if (previewState.status === 'failed') {
              const issue = `Bild ${index + 1}/${images.length}: serverseitig angelegt, aber die Vorschau konnte nicht stabil dargestellt werden.`;
              issues.push(issue);
              await setImageProgress(fillId, index, images.length, 'failed', 'Vorschau nicht stabil');
            } else {
              await setImageProgress(fillId, index, images.length, 'stable', previewState.status === 'blob-fallback' ? 'lokale Vorschau' : 'CDN-Vorschau');
              await sleep(IMAGE_PROGRESS_HOLD_MS);
            }
          } catch (error) {
            state.status = 'failed';
            const issue = `Bild ${index + 1}/${images.length}: ${error.message}`;
            issues.push(issue);
            await setImageProgress(fillId, index, images.length, 'failed', error.message);
          }
        })());
      } catch (error) {
        state.status = 'failed';
        const issue = `Bild ${index + 1}/${images.length}: ${error.message}`;
        issues.push(issue);
        await setImageProgress(fillId, index, images.length, 'failed', error.message);
        // Without a server-side image object, continuing would shift subsequent
        // positions and make image-order verification ambiguous.
        if (serverImageInputs().length <= index) break;
      }
    }

    // Upload dispatch stays strictly sequential, but preview/CDN stabilization
    // for already server-created images may overlap with later uploads. Join all
    // pending checks before the aggregate and final image gates below.
    await Promise.all(previewTasks);

    // Retain the v1.1.5 aggregate guard after the sequential upload flow. It
    // should be a no-op for already terminal previews and therefore cannot
    // re-trigger successful thumbnails. It only checks/retries images that
    // remain broken after the overlapped per-image stabilization tasks.
    input = await waitFor(() => imageUploadInput(), { timeout: 5000, description: 'Bilder-Upload' });
    const expectedFinal = images.length;
    const actualServerCount = serverImageInputs().length;
    if (actualServerCount >= expectedFinal) {
      const previewState = await waitForServerPreviews(input, files.length);
      if (!previewState.serverLoaded) {
        const fallback = await applyLocalPreviewFallback(previewState.previews, files);
        if (!fallback.loaded) {
          const detail = [...new Set(previewState.brokenUrls)].filter(Boolean).slice(0, 3).join(', ');
          issues.push(`Bilder: Upload wurde angelegt, aber ${expectedFinal} Vorschau(en) konnten nicht vollständig geladen werden${detail ? ` (${detail})` : ''}.`);
        }
      }
    } else {
      issues.push(`Bilder unvollständig: ${actualServerCount}/${expectedFinal} serverseitig angelegte Bilder.`);
    }

    const finalStable = actualServerCount >= expectedFinal
      && states.length === expectedFinal
      && states.every(state => ['cdn-loaded', 'blob-fallback'].includes(state.status))
      && await waitForAllImagePreviewsStable(input, expectedFinal);

    if (!finalStable) issues.push('Bilder sind noch nicht vollständig und stabil dargestellt.');
    return { issues: [...new Set(issues)], complete: finalStable, states };
  }

    return Object.freeze({
      uploadImages
    });
  }

  const API = Object.freeze({ create });
  KRDeps.register('KRTemplateImageUpload', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
