// In-process owner for trusted inventory images and atomic capture orchestration.
// The IndexedDB transaction remains owned by KRInventoryRepository.
(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const TemplateSchemaCore = options.templateSchemaCore;
      const logDiagnostic = options.logDiagnostic;
      const commitInventory = options.commitInventory;
      const broadcastInventoryChanged = options.broadcastInventoryChanged;
      if (!TemplateSchemaCore?.buildSchema || !TemplateSchemaCore?.fingerprint ||
          typeof logDiagnostic !== 'function' || typeof commitInventory !== 'function' ||
          typeof broadcastInventoryChanged !== 'function') {
        throw new Error('KRInventoryCaptureService requires schema, diagnostic, commit and notification dependencies');
      }

      function isTrustedProdAdImageUrl(url) {
        return url.protocol === "https:"
          && url.hostname === "img.kleinanzeigen.de"
          && /^\/api\/v1\/prod-ads\/images\/[0-9a-f]{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(url.pathname);
      }

      function jpegCandidates(rawUrl) {
        const url = new URL(rawUrl);
        if (url.protocol !== "https:" || url.hostname !== "img.kleinanzeigen.de") throw new Error("Unzulässige Bildquelle");
        const candidates = [];
        const rule = url.searchParams.get("rule");

        // Kleinanzeigen' own prod-ads UUID endpoint is trusted. Real edit-form tests show
        // that the hidden adImages[n].url may omit a visible rule while the same endpoint
        // still supports the established large JPEG variant. Try that verified variant
        // first, but only for this narrowly matched Kleinanzeigen CDN path.
        if (isTrustedProdAdImageUrl(url) || rule) {
          const large = new URL(url);
          large.searchParams.set("rule", "$_57.JPG");
          candidates.push(large.toString());
        }

        if (rule) {
          const jpeg = new URL(url);
          jpeg.searchParams.set("rule", rule.replace(/\.(AUTO|JPG|JPEG|PNG|WEBP|AVIF|GIF)$/i, ".JPG"));
          candidates.push(jpeg.toString());
        }
        candidates.push(url.toString());
        return [...new Set(candidates)];
      }

      function sourceUrlsForImage(source) {
        if (typeof source === "string") return [source];
        if (!source || typeof source !== "object") return [];
        return [...new Set([
          source.downloadUrl,
          ...(Array.isArray(source.sourceUrls) ? source.sourceUrls : []),
          source.url,
          ...(Array.isArray(source.variants) ? source.variants : [])
        ].filter(Boolean))];
      }

      function detectImageMime(bytes) {
        const ascii = (start, end) => String.fromCharCode(...bytes.slice(start,end));
        if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return "image/jpeg";
        if (bytes[0]===137 && ascii(1,4)==="PNG" && bytes[4]===13 && bytes[5]===10 && bytes[6]===26 && bytes[7]===10) return "image/png";
        if (["GIF87a","GIF89a"].includes(ascii(0,6))) return "image/gif";
        if (ascii(0,4)==="RIFF" && ascii(8,12)==="WEBP") return "image/webp";
        if (ascii(4,8)==="ftyp") {
          const boxSize = ((bytes[0]<<24) | (bytes[1]<<16) | (bytes[2]<<8) | bytes[3]) >>> 0;
          for (let i=8;i+4<=Math.min(bytes.length,boxSize);i+=4) {
            if (i!==12 && ["avif","avis"].includes(ascii(i,i+4))) return "image/avif";
          }
        }
        return null;
      }

      function largeEnough(width, height, source) {
        const thumbnailWidth = Number(source?.thumbnailWidth || 0);
        const thumbnailHeight = Number(source?.thumbnailHeight || 0);
        if (!thumbnailWidth || !thumbnailHeight) return { ok: true, evidence: "decoded-dimensions-no-thumbnail-baseline" };
        const areaRatio = (width * height) / Math.max(1, thumbnailWidth * thumbnailHeight);
        const edgeRatio = Math.max(width, height) / Math.max(1, Math.max(thumbnailWidth, thumbnailHeight));
        return {
          ok: areaRatio >= 4 && edgeRatio >= 1.5,
          evidence: `decoded-vs-thumbnail:${width}x${height}/${thumbnailWidth}x${thumbnailHeight}`
        };
      }

      async function downloadInventoryImage(source, requireJpeg = false, requireLarge = false) {
        const sourceUrls = sourceUrlsForImage(source);
        if (!sourceUrls.length) throw new Error("Keine zulässige Bildquelle vorhanden");
        let lastError = null;
        let fallback = null;
        const attempted = new Set();
        for (const rawUrl of sourceUrls) {
          const candidates = source?.preferExactDownloadUrl === true && rawUrl === source?.downloadUrl
            ? [rawUrl, ...jpegCandidates(rawUrl).filter(candidate => candidate !== rawUrl)]
            : jpegCandidates(rawUrl);
          for (const candidate of candidates) {
            if (attempted.has(candidate)) continue;
            attempted.add(candidate);
            try {
              const response = await fetch(candidate, { credentials: "omit", cache: "no-cache", redirect: "error", signal: AbortSignal.timeout(20000) });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const blob = await response.blob();
              if (!blob.size || blob.size > (requireJpeg ? 12 : 20) * 1024 * 1024) throw new Error("Bild ist leer oder überschreitet das Dateigrößenlimit");
              const signatureMime = detectImageMime(new Uint8Array(await blob.slice(0,256).arrayBuffer()));
              if (!signatureMime) throw new Error("Bildformat anhand der Dateidaten nicht erkannt");
              const value = {
                blob: blob.slice(0, blob.size, signatureMime),
                sourceUrl: rawUrl,
                fetchedUrl: candidate,
                mimeType: signatureMime,
                responseMimeType: blob.type,
                formatEvidence: "file-signature",
                size: blob.size
              };
              if (signatureMime === "image/jpeg") {
                if (requireJpeg || requireLarge) {
                  const bitmap = await createImageBitmap(value.blob);
                  try {
                    if (!bitmap.width || !bitmap.height) throw new Error("JPEG enthält keine gültigen Bildabmessungen");
                    value.width = bitmap.width;
                    value.height = bitmap.height;
                    value.formatEvidence = "file-signature-and-decode";
                    if (requireLarge) {
                      const large = largeEnough(bitmap.width, bitmap.height, source);
                      value.largeImageEvidence = large.evidence;
                      if (!large.ok) throw new Error(`JPEG ist nur Thumbnail-Größe (${bitmap.width}×${bitmap.height})`);
                    }
                  } finally {
                    bitmap.close();
                  }
                }
                const digest = await crypto.subtle.digest("SHA-256", await value.blob.arrayBuffer());
                value.sha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
                return value;
              }
              const digest = await crypto.subtle.digest("SHA-256", await value.blob.arrayBuffer());
              value.sha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
              fallback ||= value;
            } catch (error) {
              lastError = error;
            }
          }
        }
        if (fallback && !requireJpeg) return fallback;
        if (requireLarge) throw lastError || new Error("Keine große dekodierbare JPEG-Version verfügbar");
        if (requireJpeg && fallback) throw new Error("Keine dekodierbare JPEG-Version verfügbar (erkannt: " + fallback.mimeType + ")");
        throw lastError || new Error("Bild konnte nicht geladen werden");
      }

      // Both stores commit together; a failed request rolls back deletes and puts.
      let inventorySaveRunning = false;
      async function saveInventory(extracted, options = {}) {
        if (inventorySaveRunning) throw new Error("Eine Erfassung läuft bereits. Bitte warten.");
        inventorySaveRunning = true;
        try {
          if (!extracted?.adId || !Array.isArray(extracted.images)) {
            throw new Error("Keine eindeutige Anzeigen-ID oder Bildliste vorhanden.");
          }
          const inventoryId = String(options.inventoryIdOverride || extracted.adId);
          const capturedAt = new Date().toISOString();
          await logDiagnostic('info', 'INVENTORY_SAVE_STARTED', { inventoryId, adId: String(extracted.adId), imageCount: extracted.images.length }, { module: 'background', operation: 'inventory-save', context: { adId: String(extracted.adId) } }).catch(() => {});
          const stagedImages = [];
          const imageResults = [];
          let totalBytes = 0;
          for (let index = 0; index < extracted.images.length; index += 1) {
            let downloaded;
            await logDiagnostic('info', 'INVENTORY_IMAGE_DOWNLOAD_STARTED', { inventoryId, image: index + 1, total: extracted.images.length, imageId: extracted.images[index]?.imageId || null }, { module: 'background', operation: 'inventory-image', context: { adId: String(extracted.adId) } }).catch(() => {});
            try {
              downloaded = await downloadInventoryImage(extracted.images[index], extracted.extraction?.requiresJpeg === true, extracted.extraction?.requiresLargeJpeg === true);
              if (extracted.extraction?.requiresJpeg && (downloaded.mimeType !== "image/jpeg" || downloaded.formatEvidence !== "file-signature-and-decode")) throw new Error("JPEG-Prüfung fehlgeschlagen");
              await logDiagnostic('info', 'INVENTORY_IMAGE_DOWNLOAD_SUCCEEDED', { inventoryId, image: index + 1, total: extracted.images.length, mimeType: downloaded.mimeType, size: downloaded.size, width: downloaded.width || null, height: downloaded.height || null }, { module: 'background', operation: 'inventory-image', context: { adId: String(extracted.adId) } }).catch(() => {});
            } catch (error) {
              await logDiagnostic('error', 'INVENTORY_IMAGE_DOWNLOAD_FAILED', { inventoryId, image: index + 1, total: extracted.images.length, message: String(error.message || error).slice(0, 500), stack: String(error.stack || '').slice(0, 2000) }, { module: 'background', operation: 'inventory-image', context: { adId: String(extracted.adId) } }).catch(() => {});
              throw new Error(`Bild ${index + 1} konnte nicht gesichert werden: ${error.message}. Vorhandenes Inventar bleibt erhalten.`);
            }
            totalBytes += downloaded.size;
            if (totalBytes > 128 * 1024 * 1024) throw new Error("Bildbestand überschreitet 128 MiB. Vorhandenes Inventar bleibt erhalten.");
            const imageKey = `${inventoryId}:${index}`;
            stagedImages.push({ imageKey, inventoryId, position: index, ...downloaded, capturedAt });
            const { blob, ...metadata } = downloaded;
            imageResults.push({ imageId: extracted.images[index].imageId, identityType: extracted.images[index].identityType, sourceFormatHint: extracted.images[index].sourceFormatHint, variants: extracted.images[index].variants, isPrimary: Boolean(extracted.images[index].isPrimary || index === 0), downloadSource: extracted.images[index].downloadSource || null, ...metadata, imageKey, position: index, locallyStored: true, uploadReady: downloaded.mimeType === "image/jpeg" });
          }
          // KAR-134: derive category-scoped, value-free evidence before the same atomic inventory commit.
          // Non-edit capture is not sufficient evidence to assert a saved posting-form schema.
          const templateSchema = extracted.extraction?.capturedFromEditView === true
            ? await (async () => {
              const snapshot = TemplateSchemaCore.buildSchema(extracted);
              return { snapshot, fingerprint: await TemplateSchemaCore.fingerprint(snapshot), capturedAt, source: 'edit-form' };
            })()
            : null;
          // Without verified edit-form evidence retain only the same ad/profile's
          // historical schema; never assert that a public detail page is a fresh match.
          let priorTemplateSchema = null;
          if (!templateSchema) {
            const old = await getInventory(inventoryId).catch(() => null);
            if (old?.templateSchema?.snapshot && String(old.adId || '') === String(extracted.adId || '') &&
                extracted.profileId && String(old.profileId || '') === String(extracted.profileId))
              priorTemplateSchema = old.templateSchema;
            void logDiagnostic('info','KAR134_FORM_SCHEMA_NOT_OBSERVED',{
              inventoryId, currentSchemaVerified:false, retainedHistoricalSnapshot:Boolean(priorTemplateSchema)
            }).catch(() => {});
          }
          const record = {
            ...extracted, ...(templateSchema || priorTemplateSchema ? { templateSchema: templateSchema || priorTemplateSchema } : {}),
            schemaObservationStatus: templateSchema ? 'verified-edit-form' : 'not-observed',
            inventoryId, schemaVersion: 2, capturedAt,
            images: imageResults,
            imageSummary: {
              discovered: imageResults.length,
              locallyStored: imageResults.length,
              uploadReadyJpeg: imageResults.filter(image => image.uploadReady).length
            }
          };
          await commitInventory(record, stagedImages);
          // Diagnostics must never turn a completed commit into an apparent failure.
          await logDiagnostic("info", "INVENTORY_SAVED", {
            inventoryId, imageSummary: record.imageSummary, atomicCommit: true
          }).catch(() => {});
          broadcastInventoryChanged('saved', { inventoryId, adId: String(record.adId || inventoryId), capturedAt: record.capturedAt });
          return record;
        } finally {
          inventorySaveRunning = false;
        }
      }

      return Object.freeze({ saveInventory });
    }
  });
  globalThis.KRDeps?.register?.('KRInventoryCaptureService', API);
})();
