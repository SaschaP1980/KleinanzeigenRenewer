(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root?.KRDeps?.register?.('KRInventoryImport', api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const ARCHIVE_TYPE = 'kleinanzeigen-renewal-inventory-export';
  const ARCHIVE_VERSION = 1;
  const MAX_ENTRIES = 256;
  const MAX_TOTAL_UNCOMPRESSED = 256 * 1024 * 1024;
  const MAX_ENTRY_UNCOMPRESSED = 128 * 1024 * 1024;
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const encoder = new TextEncoder();

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(data) {
    let crc = 0xffffffff;
    for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function assertSafePath(name) {
    const value = String(name || '');
    if (!value || value.startsWith('/') || value.startsWith('\\') || /^[A-Za-z]:[\\/]/.test(value)) throw new Error('ZIP enthält einen unzulässigen Dateipfad.');
    const parts = value.replace(/\\/g, '/').split('/');
    if (parts.some(part => part === '..' || part === '')) throw new Error('ZIP enthält einen unzulässigen Dateipfad.');
    return parts.join('/');
  }

  async function sha256Hex(value) {
    const input = value instanceof Uint8Array ? value : value instanceof ArrayBuffer ? new Uint8Array(value) : encoder.encode(String(value ?? ''));
    const digest = await crypto.subtle.digest('SHA-256', input);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function findEocd(bytes) {
    const min = Math.max(0, bytes.length - 65557);
    for (let offset = bytes.length - 22; offset >= min; offset -= 1) {
      if (bytes[offset] === 0x50 && bytes[offset + 1] === 0x4b && bytes[offset + 2] === 0x05 && bytes[offset + 3] === 0x06) return offset;
    }
    throw new Error('ZIP-Endstruktur wurde nicht gefunden.');
  }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream !== 'function') throw new Error('Komprimierte ZIP-Dateien werden in dieser Laufzeit nicht unterstützt.');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function readZip(file, limits = {}) {
    const maxEntries = Math.max(1, Math.min(65535, Number(limits.maxEntries || MAX_ENTRIES)));
    const maxTotalUncompressed = Math.max(1, Number(limits.maxTotalUncompressed || MAX_TOTAL_UNCOMPRESSED));
    const maxEntryUncompressed = Math.max(1, Number(limits.maxEntryUncompressed || MAX_ENTRY_UNCOMPRESSED));
    if (!(file instanceof Blob)) throw new Error('Keine ZIP-Datei ausgewählt.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length < 22) throw new Error('ZIP-Datei ist zu klein oder beschädigt.');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const eocdOffset = findEocd(bytes);
    const diskNo = view.getUint16(eocdOffset + 4, true);
    const centralDisk = view.getUint16(eocdOffset + 6, true);
    const entriesOnDisk = view.getUint16(eocdOffset + 8, true);
    const entryCount = view.getUint16(eocdOffset + 10, true);
    const centralSize = view.getUint32(eocdOffset + 12, true);
    const centralOffset = view.getUint32(eocdOffset + 16, true);
    if (diskNo !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) throw new Error('Mehrteilige ZIP-Archive werden nicht unterstützt.');
    if (!entryCount || entryCount > maxEntries) throw new Error('ZIP enthält eine unzulässige Anzahl Dateien.');
    if (centralOffset + centralSize > eocdOffset) throw new Error('ZIP-Zentralverzeichnis ist beschädigt.');

    const descriptors = [];
    let cursor = centralOffset;
    let totalUncompressed = 0;
    const names = new Set();
    for (let index = 0; index < entryCount; index += 1) {
      if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) throw new Error('ZIP-Zentralverzeichnis ist beschädigt.');
      const flags = view.getUint16(cursor + 8, true);
      const method = view.getUint16(cursor + 10, true);
      const expectedCrc = view.getUint32(cursor + 16, true) >>> 0;
      const compressedSize = view.getUint32(cursor + 20, true);
      const uncompressedSize = view.getUint32(cursor + 24, true);
      const nameLength = view.getUint16(cursor + 28, true);
      const extraLength = view.getUint16(cursor + 30, true);
      const commentLength = view.getUint16(cursor + 32, true);
      const localOffset = view.getUint32(cursor + 42, true);
      if (flags & 0x0001) throw new Error('Verschlüsselte ZIP-Dateien werden nicht unterstützt.');
      if (![0, 8].includes(method)) throw new Error('ZIP verwendet eine nicht unterstützte Kompressionsmethode.');
      if (uncompressedSize > maxEntryUncompressed) throw new Error('Eine ZIP-Datei ist für den Import zu groß.');
      totalUncompressed += uncompressedSize;
      if (totalUncompressed > maxTotalUncompressed) throw new Error('ZIP-Inhalt überschreitet die zulässige Gesamtgröße.');
      const nameStart = cursor + 46;
      const nameEnd = nameStart + nameLength;
      if (nameEnd > bytes.length) throw new Error('ZIP-Dateiname ist beschädigt.');
      const name = assertSafePath(decoder.decode(bytes.subarray(nameStart, nameEnd)));
      if (names.has(name)) throw new Error(`ZIP enthält den Dateinamen doppelt: ${name}`);
      names.add(name);
      descriptors.push({ name, flags, method, expectedCrc, compressedSize, uncompressedSize, localOffset });
      cursor = nameEnd + extraLength + commentLength;
    }

    const entries = new Map();
    for (const descriptor of descriptors) {
      const local = descriptor.localOffset;
      if (local + 30 > bytes.length || view.getUint32(local, true) !== 0x04034b50) throw new Error(`Lokaler ZIP-Header fehlt: ${descriptor.name}`);
      const localNameLength = view.getUint16(local + 26, true);
      const localExtraLength = view.getUint16(local + 28, true);
      const payloadStart = local + 30 + localNameLength + localExtraLength;
      const payloadEnd = payloadStart + descriptor.compressedSize;
      if (payloadEnd > bytes.length) throw new Error(`ZIP-Datei ist abgeschnitten: ${descriptor.name}`);
      const compressed = bytes.subarray(payloadStart, payloadEnd);
      const data = descriptor.method === 0 ? new Uint8Array(compressed) : await inflateRaw(compressed);
      if (data.length !== descriptor.uncompressedSize) throw new Error(`ZIP-Größenprüfung fehlgeschlagen: ${descriptor.name}`);
      if ((crc32(data) >>> 0) !== descriptor.expectedCrc) throw new Error(`ZIP-CRC-Prüfung fehlgeschlagen: ${descriptor.name}`);
      entries.set(descriptor.name, data);
    }
    return entries;
  }

  function parseJson(entries, name) {
    const bytes = entries.get(name);
    if (!bytes) throw new Error(`Erforderliche Datei fehlt im ZIP: ${name}`);
    try { return JSON.parse(decoder.decode(bytes)); }
    catch { throw new Error(`JSON-Datei ist ungültig: ${name}`); }
  }

  function normalizedSha(value) {
    const text = String(value || '').trim().toLowerCase();
    return /^[0-9a-f]{64}$/.test(text) ? text : '';
  }

  function templateReady(record) {
    if (!record || typeof record !== 'object') return false;
    const categoryId = record.category?.id ?? record.categoryIdFromUrl;
    return Boolean(
      record.extraction?.capturedFromEditView &&
      record.extraction?.templateComplete === true &&
      /^\d+$/.test(String(categoryId ?? '')) &&
      String(record.title || '').trim() &&
      String(record.description || '').trim() &&
      Array.isArray(record.images) && record.images.length
    );
  }

  async function parseInventoryArchive(file) {
    const entries = await readZip(file);
    const manifest = parseJson(entries, 'export-manifest.json');
    const record = parseJson(entries, 'record.json');
    const imageStoreMetadata = parseJson(entries, 'image-store.json');
    if (manifest?.archiveType !== ARCHIVE_TYPE) throw new Error('Dieses ZIP ist kein Kleinanzeigen-Renewal-Inventarexport.');
    if (Number(manifest?.archiveVersion) !== ARCHIVE_VERSION) throw new Error(`Archivversion ${manifest?.archiveVersion ?? 'unbekannt'} wird nicht unterstützt.`);
    if (!templateReady(record)) throw new Error('Der exportierte Datensatz enthält keine vollständig bestätigte Bearbeiten-Vorlage.');
    if (!Array.isArray(imageStoreMetadata)) throw new Error('Bildmetadaten im ZIP sind ungültig.');

    const recordBytes = entries.get(String(manifest?.files?.record?.path || 'record.json'));
    const imageStoreBytes = entries.get(String(manifest?.files?.imageStoreMetadata?.path || 'image-store.json'));
    if (!recordBytes || !imageStoreBytes) throw new Error('Manifest verweist auf fehlende Datendateien.');
    const recordExpectedSha = normalizedSha(manifest?.files?.record?.sha256);
    const storeExpectedSha = normalizedSha(manifest?.files?.imageStoreMetadata?.sha256);
    if (!recordExpectedSha || await sha256Hex(recordBytes) !== recordExpectedSha) throw new Error('Integritätsprüfung für record.json fehlgeschlagen.');
    if (!storeExpectedSha || await sha256Hex(imageStoreBytes) !== storeExpectedSha) throw new Error('Integritätsprüfung für image-store.json fehlgeschlagen.');

    const manifestImages = Array.isArray(manifest?.images) ? [...manifest.images] : [];
    const expectedCount = Number(manifest?.completeness?.expectedImages);
    const includedCount = Number(manifest?.completeness?.includedImages);
    if (!manifest?.completeness?.allLocalImagesIncluded || expectedCount !== manifestImages.length || includedCount !== manifestImages.length) {
      throw new Error('Das Archiv ist laut Manifest nicht vollständig.');
    }
    if (manifestImages.length !== record.images.length) throw new Error('Bildanzahl in Manifest und Datensatz stimmt nicht überein.');
    manifestImages.sort((a, b) => Number(a?.order ?? a?.position ?? 0) - Number(b?.order ?? b?.position ?? 0));

    const images = [];
    for (let index = 0; index < manifestImages.length; index += 1) {
      const meta = manifestImages[index] || {};
      const path = assertSafePath(meta.file);
      if (!path.startsWith('images/')) throw new Error(`Ungültiger Bildpfad im Manifest: ${path}`);
      const data = entries.get(path);
      if (!data) throw new Error(`Bilddatei fehlt im ZIP: ${path}`);
      const expectedSha = normalizedSha(meta.sha256);
      const actualSha = await sha256Hex(data);
      if (!expectedSha || actualSha !== expectedSha) throw new Error(`Integritätsprüfung für Bild ${index + 1} fehlgeschlagen.`);
      if (Number(meta.size) !== data.length) throw new Error(`Größenprüfung für Bild ${index + 1} fehlgeschlagen.`);
      const mimeType = String(meta.mimeType || '').toLowerCase();
      if (mimeType !== 'image/jpeg' && mimeType !== 'image/jpg') throw new Error(`Bild ${index + 1} hat das nicht unterstützte Format ${mimeType || 'unbekannt'}. Für Neu-Inserieren werden JPEG-Vorlagen benötigt.`);
      const recordImage = record.images.find(image => String(image?.imageKey || '') === String(meta.imageKey || '')) || record.images[index] || {};
      images.push({
        order: index,
        position: Number.isFinite(Number(meta.position)) ? Number(meta.position) : index,
        isPrimary: Boolean(meta.isPrimary || index === 0),
        mimeType: 'image/jpeg',
        size: data.length,
        sha256: actualSha,
        width: Number(meta.width || recordImage.width || 0) || null,
        height: Number(meta.height || recordImage.height || 0) || null,
        originalImageKey: String(meta.imageKey || recordImage.imageKey || ''),
        data,
        blob: new Blob([data], { type: 'image/jpeg' })
      });
    }

    return {
      archiveType: ARCHIVE_TYPE,
      archiveVersion: ARCHIVE_VERSION,
      filename: String(file.name || ''),
      manifest,
      record,
      imageStoreMetadata,
      images
    };
  }

  return { ARCHIVE_TYPE, ARCHIVE_VERSION, readZip, parseInventoryArchive, sha256Hex, crc32 };
});
