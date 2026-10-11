(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root?.KRDeps?.register?.('KRInventoryExport', api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const ARCHIVE_TYPE = 'kleinanzeigen-renewal-inventory-export';
  const ARCHIVE_VERSION = 1;
  const encoder = new TextEncoder();

  function jsonText(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
  }

  function bytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return encoder.encode(String(value ?? ''));
  }

  async function sha256Hex(value) {
    const input = value instanceof Blob ? new Uint8Array(await value.arrayBuffer()) : bytes(value);
    const digest = await crypto.subtle.digest('SHA-256', input);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function imageExtension(mimeType) {
    const mime = String(mimeType || '').toLowerCase();
    if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/gif') return 'gif';
    if (mime === 'image/webp') return 'webp';
    if (mime === 'image/avif') return 'avif';
    return 'bin';
  }

  function orderedImages(record) {
    return (Array.isArray(record?.images) ? record.images : [])
      .map((image, index) => ({ image, index, position: Number.isFinite(Number(image?.position)) ? Number(image.position) : index }))
      .sort((a, b) => a.position - b.position || a.index - b.index)
      .map(entry => entry.image);
  }

  function safeFilenamePart(value, fallback = 'anzeige') {
    const cleaned = String(value || '')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/g, '')
      .trim();
    return (cleaned || fallback).slice(0, 72);
  }

  function exportFilename(record) {
    const id = safeFilenamePart(record?.adId || record?.inventoryId || 'ohne-id', 'ohne-id');
    const title = safeFilenamePart(record?.title || 'anzeige');
    return `kleinanzeigen-renewal-${id}-${title}.zip`;
  }

  function imageFileName(orderIndex, mimeType) {
    return `images/${String(orderIndex + 1).padStart(3, '0')}.${imageExtension(mimeType)}`;
  }

  async function createInventoryArchive(record, options = {}) {
    if (!record || typeof record !== 'object') throw new Error('Kein Inventardatensatz zum Exportieren vorhanden.');
    if (typeof options.loadImage !== 'function') throw new Error('Lokaler Bildspeicher ist für den Export nicht verfügbar.');
    if (typeof options.createZip !== 'function') throw new Error('ZIP-Erstellung ist für den Export nicht verfügbar.');

    const exportedAt = options.exportedAt || new Date().toISOString();
    const extensionVersion = String(options.extensionVersion || '');
    const images = orderedImages(record);
    const zipImageEntries = [];
    const imageStoreMetadata = [];
    const imageManifest = [];

    for (let orderIndex = 0; orderIndex < images.length; orderIndex += 1) {
      const image = images[orderIndex] || {};
      const imageKey = String(image.imageKey || '');
      if (!imageKey) throw new Error(`Bild ${orderIndex + 1} besitzt keinen lokalen Bildschlüssel.`);
      const saved = await options.loadImage(imageKey);
      if (!saved?.blob || !(saved.blob instanceof Blob)) {
        throw new Error(`Die lokale Bildkopie für Bild ${orderIndex + 1} ist nicht verfügbar.`);
      }
      const blobBytes = new Uint8Array(await saved.blob.arrayBuffer());
      const actualSha256 = await sha256Hex(blobBytes);
      const expectedSha256 = String(image.sha256 || saved.sha256 || '').toLowerCase();
      if (expectedSha256 && actualSha256 !== expectedSha256) {
        throw new Error(`Integritätsprüfung für Bild ${orderIndex + 1} fehlgeschlagen.`);
      }
      const mimeType = String(image.mimeType || saved.mimeType || saved.blob.type || 'application/octet-stream');
      const file = imageFileName(orderIndex, mimeType);
      const { blob, ...storedMetadata } = saved;
      zipImageEntries.push({ name: file, data: blobBytes });
      imageStoreMetadata.push({ ...storedMetadata, file, sha256: actualSha256, size: blobBytes.length, mimeType });
      imageManifest.push({
        order: orderIndex,
        position: Number.isFinite(Number(image.position)) ? Number(image.position) : orderIndex,
        isPrimary: Boolean(image.isPrimary || orderIndex === 0),
        imageKey,
        file,
        mimeType,
        size: blobBytes.length,
        sha256: actualSha256,
        width: Number(image.width || saved.width || 0) || null,
        height: Number(image.height || saved.height || 0) || null
      });
    }

    const recordText = jsonText(record);
    const imageStoreText = jsonText(imageStoreMetadata);
    const recordSha256 = await sha256Hex(recordText);
    const imageStoreSha256 = await sha256Hex(imageStoreText);
    const manifest = {
      archiveType: ARCHIVE_TYPE,
      archiveVersion: ARCHIVE_VERSION,
      exportedAt,
      sourceExtensionVersion: extensionVersion || null,
      inventory: {
        inventoryId: record.inventoryId ?? null,
        adId: record.adId ?? null,
        title: record.title ?? null,
        schemaVersion: record.schemaVersion ?? null,
        profileId: record.profileId ?? null,
        profileName: record.profileName ?? null,
        capturedAt: record.capturedAt ?? null
      },
      files: {
        record: { path: 'record.json', sha256: recordSha256 },
        imageStoreMetadata: { path: 'image-store.json', sha256: imageStoreSha256 }
      },
      images: imageManifest,
      completeness: {
        expectedImages: images.length,
        includedImages: imageManifest.length,
        allLocalImagesIncluded: imageManifest.length === images.length
      }
    };
    const manifestText = jsonText(manifest);
    const entries = [
      { name: 'export-manifest.json', data: manifestText },
      { name: 'record.json', data: recordText },
      { name: 'image-store.json', data: imageStoreText },
      ...zipImageEntries
    ];
    const blob = await options.createZip(entries);
    if (!(blob instanceof Blob) || !blob.size) throw new Error('Das Export-ZIP konnte nicht erstellt werden.');
    return { blob, filename: exportFilename(record), manifest, entries };
  }

  return {
    ARCHIVE_TYPE,
    ARCHIVE_VERSION,
    safeFilenamePart,
    sha256Hex,
    createInventoryArchive
  };
});
