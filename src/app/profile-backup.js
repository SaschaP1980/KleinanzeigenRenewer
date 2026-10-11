(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root?.KRDeps?.register?.('KRProfileBackup', api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const ARCHIVE_TYPE = 'kleinanzeigen-renewal-profile-backup';
  const ARCHIVE_VERSION = 1;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', { fatal: false });

  function bytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return encoder.encode(String(value ?? ''));
  }

  function jsonText(value) { return `${JSON.stringify(value, null, 2)}\n`; }

  async function sha256Hex(value) {
    const input = value instanceof Blob ? new Uint8Array(await value.arrayBuffer()) : bytes(value);
    const digest = await crypto.subtle.digest('SHA-256', input);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function safeFilenamePart(value, fallback = 'profil') {
    const cleaned = String(value || '')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/g, '')
      .trim();
    return (cleaned || fallback).slice(0, 72);
  }

  function backupFilename(profile, exportedAt = new Date().toISOString()) {
    const stamp = String(exportedAt || '').replace(/[:.]/g, '-');
    return `kleinanzeigen-manager-profil-${safeFilenamePart(profile?.displayName || profile?.profileId || 'profil')}-${stamp}.zip`;
  }

  function referencedImageKeys(records) {
    const keys = [];
    const seen = new Set();
    for (const record of records || []) {
      for (const image of Array.isArray(record?.images) ? record.images : []) {
        const key = String(image?.imageKey || '');
        if (!key || seen.has(key)) continue;
        seen.add(key);
        keys.push({ imageKey: key, inventoryId: String(record?.inventoryId || ''), recordImage: image });
      }
    }
    return keys;
  }

  async function createProfileArchive(payload, options = {}) {
    const profile = payload?.profile;
    const activeInventory = Array.isArray(payload?.activeInventory) ? payload.activeInventory : [];
    const trashEntries = Array.isArray(payload?.trashEntries) ? payload.trashEntries : [];
    if (!profile?.profileId || !String(profile?.displayName || '').trim()) throw new Error('Profilmetadaten sind für den Export unvollständig.');
    if (typeof options.loadImage !== 'function') throw new Error('Lokaler Bildspeicher ist für die Profilsicherung nicht verfügbar.');
    if (typeof options.createZip !== 'function') throw new Error('ZIP-Erstellung ist für die Profilsicherung nicht verfügbar.');

    const exportedAt = options.exportedAt || new Date().toISOString();
    const extensionVersion = String(options.extensionVersion || '');
    const profileId = String(profile.profileId);
    const allRecords = [...activeInventory, ...trashEntries];
    const inventoryIds = new Set();
    for (const record of allRecords) {
      const inventoryId = String(record?.inventoryId || '');
      if (!inventoryId || inventoryIds.has(inventoryId)) throw new Error('Die Profilsicherung enthält doppelte oder leere Inventar-IDs.');
      if (String(record?.profileId || '') !== profileId) throw new Error('Die Profilsicherung enthält einen Eintrag mit abweichender Profilzuordnung.');
      inventoryIds.add(inventoryId);
    }
    if (activeInventory.some(record => String(record?.recordKind || '') === 'trash' || record?.trash?.trashedAt)) throw new Error('Aktives Inventar enthält einen Papierkorb-Eintrag.');
    if (trashEntries.some(record => !(String(record?.recordKind || '') === 'trash' || record?.trash?.trashedAt))) throw new Error('Papierkorb enthält einen aktiven Inventareintrag.');
    const refs = referencedImageKeys(allRecords);
    const imageManifest = [];
    const imageStoreMetadata = [];
    const imageEntries = [];
    const physicalImageBySha256 = new Map();
    let referencedImageBytes = 0;
    let uniqueImageBytes = 0;

    for (const ref of refs) {
      const saved = await options.loadImage(ref.imageKey);
      if (!saved?.blob || !(saved.blob instanceof Blob)) throw new Error(`Lokale Bildkopie fehlt: ${ref.imageKey}`);
      const data = new Uint8Array(await saved.blob.arrayBuffer());
      const actualSha256 = await sha256Hex(data);
      const expectedSha256 = String(ref.recordImage?.sha256 || saved.sha256 || '').toLowerCase();
      if (expectedSha256 && expectedSha256 !== actualSha256) throw new Error(`Integritätsprüfung fehlgeschlagen: ${ref.imageKey}`);
      referencedImageBytes += data.length;
      let physical = physicalImageBySha256.get(actualSha256);
      if (physical && physical.size !== data.length) throw new Error(`SHA-256-Kollision mit abweichender Bildgröße: ${ref.imageKey}`);
      if (!physical) {
        const file = `images/${String(imageEntries.length + 1).padStart(5, '0')}.bin`;
        physical = { file, size: data.length };
        physicalImageBySha256.set(actualSha256, physical);
        imageEntries.push({ name: file, data });
        uniqueImageBytes += data.length;
      }
      const { blob, ...metadata } = saved;
      const mimeType = String(saved.mimeType || saved.blob.type || ref.recordImage?.mimeType || 'application/octet-stream');
      const inventoryId = String(saved.inventoryId || ref.inventoryId || '');
      imageStoreMetadata.push({ ...metadata, imageKey: ref.imageKey, inventoryId, file: physical.file, sha256: actualSha256, size: data.length, mimeType });
      imageManifest.push({ imageKey: ref.imageKey, inventoryId, file: physical.file, sha256: actualSha256, size: data.length, mimeType });
    }

    const profileDocument = {
      profile: {
        ...profile,
        profileId,
        displayName: String(profile.displayName),
        normalizedName: String(profile.normalizedName || profile.displayName || '').replace(/\s+/g, ' ').trim(),
        createdAt: profile.createdAt || null,
        lastSeenAt: profile.lastSeenAt || null
      },
      activeInventory,
      trashEntries
    };
    const profileText = jsonText(profileDocument);
    const imageStoreText = jsonText(imageStoreMetadata);
    const profileSha256 = await sha256Hex(profileText);
    const imageStoreSha256 = await sha256Hex(imageStoreText);
    const manifest = {
      archiveType: ARCHIVE_TYPE,
      archiveVersion: ARCHIVE_VERSION,
      exportedAt,
      sourceExtensionVersion: extensionVersion || null,
      profile: profileDocument.profile,
      counts: {
        activeInventory: activeInventory.length,
        trashEntries: trashEntries.length,
        images: imageManifest.length,
        imageReferences: imageManifest.length,
        uniqueImageFiles: imageEntries.length
      },
      files: {
        profileData: { path: 'profile-data.json', sha256: profileSha256 },
        imageStoreMetadata: { path: 'image-store.json', sha256: imageStoreSha256 }
      },
      images: imageManifest,
      completeness: {
        referencedImages: refs.length,
        includedImages: imageManifest.length,
        uniqueImageFiles: imageEntries.length,
        allReferencedImagesIncluded: refs.length === imageManifest.length
      },
      deduplication: {
        algorithm: 'sha256',
        referencedBytes: referencedImageBytes,
        uniqueBytes: uniqueImageBytes,
        savedBytes: Math.max(0, referencedImageBytes - uniqueImageBytes)
      },
      workflowStateIncluded: false
    };
    const entries = [
      { name: 'backup-manifest.json', data: jsonText(manifest) },
      { name: 'profile-data.json', data: profileText },
      { name: 'image-store.json', data: imageStoreText },
      ...imageEntries
    ];
    const blob = await options.createZip(entries);
    if (!(blob instanceof Blob) || !blob.size) throw new Error('Die Profilsicherung konnte nicht erstellt werden.');
    return { blob, filename: backupFilename(profile, exportedAt), manifest, entries };
  }

  function parseJson(entries, name) {
    const data = entries.get(name);
    if (!data) throw new Error(`Erforderliche Datei fehlt in der Profilsicherung: ${name}`);
    try { return JSON.parse(decoder.decode(data)); }
    catch { throw new Error(`JSON-Datei in der Profilsicherung ist ungültig: ${name}`); }
  }

  function normalizedSha(value) {
    const text = String(value || '').trim().toLowerCase();
    return /^[0-9a-f]{64}$/.test(text) ? text : '';
  }

  async function parseProfileArchive(file, options = {}) {
    const readZip = options.readZip || root.KRDeps?.optional?.('KRInventoryImport')?.readZip;
    if (typeof readZip !== 'function') throw new Error('ZIP-Leser für Profilsicherungen ist nicht verfügbar.');
    const entries = await readZip(file, { maxEntries: 4096, maxTotalUncompressed: 1024 * 1024 * 1024, maxEntryUncompressed: 256 * 1024 * 1024 });
    const manifest = parseJson(entries, 'backup-manifest.json');
    if (manifest?.archiveType !== ARCHIVE_TYPE) throw new Error('Dieses ZIP ist keine Profilsicherung des kleinanzeigen Managers.');
    if (Number(manifest?.archiveVersion) !== ARCHIVE_VERSION) throw new Error(`Version ${manifest?.archiveVersion ?? 'unbekannt'} dieser Profilsicherung wird nicht unterstützt.`);
    if (manifest?.workflowStateIncluded !== false) throw new Error('Die Profilsicherung enthält einen nicht unterstützten Workflow-Zustand.');

    const profilePath = String(manifest?.files?.profileData?.path || 'profile-data.json');
    const imageStorePath = String(manifest?.files?.imageStoreMetadata?.path || 'image-store.json');
    const profileBytes = entries.get(profilePath);
    const imageStoreBytes = entries.get(imageStorePath);
    if (!profileBytes || !imageStoreBytes) throw new Error('Die Profilsicherung verweist auf fehlende Datendateien.');
    const expectedProfileSha = normalizedSha(manifest?.files?.profileData?.sha256);
    const expectedStoreSha = normalizedSha(manifest?.files?.imageStoreMetadata?.sha256);
    if (!expectedProfileSha || await sha256Hex(profileBytes) !== expectedProfileSha) throw new Error('Integritätsprüfung für profile-data.json fehlgeschlagen.');
    if (!expectedStoreSha || await sha256Hex(imageStoreBytes) !== expectedStoreSha) throw new Error('Integritätsprüfung für image-store.json fehlgeschlagen.');

    const profileData = parseJson(entries, profilePath);
    const imageStoreMetadata = parseJson(entries, imageStorePath);
    const profile = profileData?.profile;
    const activeInventory = Array.isArray(profileData?.activeInventory) ? profileData.activeInventory : null;
    const trashEntries = Array.isArray(profileData?.trashEntries) ? profileData.trashEntries : null;
    if (!profile?.profileId || !String(profile?.displayName || '').trim() || !activeInventory || !trashEntries || !Array.isArray(imageStoreMetadata)) throw new Error('Die Daten der Profilsicherung sind unvollständig.');
    const profileId = String(profile.profileId);
    for (const record of [...activeInventory, ...trashEntries]) {
      if (!record?.inventoryId) throw new Error('Die Profilsicherung enthält einen Inventareintrag ohne Inventar-ID.');
      if (String(record.profileId || '') !== profileId) throw new Error('Die Profilsicherung enthält einen Eintrag mit abweichender Profilzuordnung.');
    }
    if (activeInventory.some(record => String(record?.recordKind || '') === 'trash' || record?.trash?.trashedAt)) throw new Error('Das aktive Inventar in der Profilsicherung enthält einen Papierkorb-Eintrag.');
    if (trashEntries.some(record => !(String(record?.recordKind || '') === 'trash' || record?.trash?.trashedAt))) throw new Error('Der Papierkorb in der Profilsicherung enthält einen aktiven Inventareintrag.');
    if (Number(manifest?.counts?.activeInventory) !== activeInventory.length || Number(manifest?.counts?.trashEntries) !== trashEntries.length) throw new Error('Die Anzahl in der Profilsicherung stimmt nicht mit dem Manifest überein.');

    const refs = referencedImageKeys([...activeInventory, ...trashEntries]);
    if (Number(manifest?.counts?.images) !== refs.length) throw new Error('Die Bildanzahl in der Profilsicherung stimmt nicht mit dem Manifest überein.');
    if (manifest?.counts?.imageReferences !== undefined && Number(manifest.counts.imageReferences) !== refs.length) throw new Error('Die Bildreferenzanzahl in der Profilsicherung stimmt nicht mit dem Manifest überein.');
    const refKeys = new Set(refs.map(item => item.imageKey));
    const manifestImages = Array.isArray(manifest?.images) ? manifest.images : [];
    if (!manifest?.completeness?.allReferencedImagesIncluded || Number(manifest?.completeness?.referencedImages) !== refs.length || Number(manifest?.completeness?.includedImages) !== manifestImages.length || manifestImages.length !== refs.length) {
      throw new Error('Die Profilsicherung ist laut Manifest nicht vollständig.');
    }
    const metadataByKey = new Map(imageStoreMetadata.map(item => [String(item?.imageKey || ''), item]));
    const refByKey = new Map(refs.map(item => [item.imageKey, item]));
    const images = [];
    const seenImageKeys = new Set();
    const seenPhysicalFiles = new Set();
    for (const meta of manifestImages) {
      const imageKey = String(meta?.imageKey || '');
      const path = String(meta?.file || '');
      if (!imageKey || seenImageKeys.has(imageKey) || !refKeys.has(imageKey)) throw new Error('Die Profilsicherung enthält eine ungültige oder doppelte Bildreferenz.');
      if (!/^images\/\d+\.bin$/.test(path)) throw new Error(`Ungültiger Bildpfad in der Profilsicherung: ${path}`);
      const data = entries.get(path);
      if (!data) throw new Error(`Bilddatei fehlt in der Profilsicherung: ${path}`);
      seenPhysicalFiles.add(path);
      const expectedSha = normalizedSha(meta?.sha256);
      const actualSha = await sha256Hex(data);
      if (!expectedSha || expectedSha !== actualSha || Number(meta?.size) !== data.length) throw new Error(`Integritätsprüfung für Bild ${imageKey} fehlgeschlagen.`);
      const stored = metadataByKey.get(imageKey) || {};
      const referenced = refByKey.get(imageKey);
      const expectedInventoryId = String(referenced?.inventoryId || '');
      const storedInventoryId = String(stored.inventoryId || meta.inventoryId || '');
      if (!expectedInventoryId || !storedInventoryId || storedInventoryId !== expectedInventoryId) throw new Error(`Bild ${imageKey} besitzt eine abweichende Inventarzuordnung.`);
      const { file: _backupFile, ...storedForDb } = stored;
      images.push({
        ...storedForDb,
        imageKey,
        inventoryId: expectedInventoryId,
        mimeType: String(stored.mimeType || meta.mimeType || 'application/octet-stream'),
        sha256: actualSha,
        size: data.length,
        blob: new Blob([data], { type: String(stored.mimeType || meta.mimeType || 'application/octet-stream') })
      });
      seenImageKeys.add(imageKey);
    }
    if (seenImageKeys.size !== refKeys.size) throw new Error('Nicht alle referenzierten Bilder sind in der Profilsicherung enthalten.');
    if (manifest?.counts?.uniqueImageFiles !== undefined && Number(manifest.counts.uniqueImageFiles) !== seenPhysicalFiles.size) throw new Error('Die Anzahl eindeutiger Bilddateien in der Profilsicherung stimmt nicht mit dem Manifest überein.');

    return { archiveType: ARCHIVE_TYPE, archiveVersion: ARCHIVE_VERSION, filename: String(file?.name || ''), manifest, profile, activeInventory, trashEntries, images };
  }

  return { ARCHIVE_TYPE, ARCHIVE_VERSION, sha256Hex, safeFilenamePart, createProfileArchive, parseProfileArchive };
});
