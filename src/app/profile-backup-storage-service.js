(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const indexedDB = options.indexedDB || globalThis.indexedDB;
      const IDBKeyRange = options.IDBKeyRange || globalThis.IDBKeyRange;
      if (!indexedDB?.open) throw new Error('Lokaler Profilspeicher ist nicht verfügbar.');

            function openProfileBackupDatabase() {
              return new Promise((resolve, reject) => {
                const request = indexedDB.open('kleinanzeigen-renewal');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error || new Error('Lokaler Profilspeicher konnte nicht geöffnet werden.'));
              });
            }

            async function readProfileInventoryRows(db, profileId) {
              const requested = String(profileId || '');
              return new Promise((resolve, reject) => {
                const store = db.transaction('inventories').objectStore('inventories');
                if (!requested || !store.indexNames.contains('profileId')) {
                  const request = store.getAll();
                  request.onsuccess = () => resolve((request.result || []).filter(record => !requested || String(record?.profileId || '') === requested));
                  request.onerror = () => reject(request.error || new Error('Profildatensätze konnten nicht gelesen werden.'));
                  return;
                }
                const request = store.index('profileId').getAll(IDBKeyRange.only(requested));
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error || new Error('Profildatensätze konnten nicht gelesen werden.'));
              });
            }

            async function readImagesForInventoryIds(db, inventoryIds) {
              const ids = [...new Set((inventoryIds || []).map(value => String(value || '')).filter(Boolean))];
              if (!ids.length) return [];
              return new Promise((resolve, reject) => {
                const store = db.transaction('images').objectStore('images');
                if (!store.indexNames.contains('inventoryId')) {
                  const wanted = new Set(ids);
                  const request = store.getAll();
                  request.onsuccess = () => resolve((request.result || []).filter(image => wanted.has(String(image?.inventoryId || ''))));
                  request.onerror = () => reject(request.error || new Error('Profilbilder konnten nicht gelesen werden.'));
                  return;
                }
                const index = store.index('inventoryId');
                const rows = [];
                let pending = ids.length;
                let failed = false;
                for (const inventoryId of ids) {
                  const request = index.getAll(IDBKeyRange.only(inventoryId));
                  request.onerror = () => {
                    if (failed) return;
                    failed = true;
                    reject(request.error || new Error('Profilbilder konnten nicht gelesen werden.'));
                  };
                  request.onsuccess = () => {
                    if (failed) return;
                    rows.push(...(request.result || []));
                    pending -= 1;
                    if (pending === 0) resolve(rows);
                  };
                }
              });
            }

            async function snapshotProfileIndexedData(profileId) {
              const db = await openProfileBackupDatabase();
              try {
                const records = await readProfileInventoryRows(db, profileId);
                const images = await readImagesForInventoryIds(db, records.map(record => record?.inventoryId));
                return { records, images };
              } finally { db.close(); }
            }

            async function replaceProfileIndexedData({ targetProfileId, targetProfileName, activeInventory = [], trashEntries = [], images = [] }) {
              const records = [...activeInventory, ...trashEntries].map(record => ({ ...record, profileId: targetProfileId, profileName: targetProfileName }));
              const importedIds = new Set(records.map(record => String(record?.inventoryId || '')));
              if (importedIds.size !== records.length || [...importedIds].some(id => !id)) throw new Error('Die Profilsicherung enthält doppelte oder leere Inventar-IDs.');
              const imageKeys = new Set();
              for (const image of images) {
                const imageKey = String(image?.imageKey || '');
                const inventoryId = String(image?.inventoryId || '');
                if (!imageKey || imageKeys.has(imageKey)) throw new Error('Die Profilsicherung enthält doppelte oder leere Bildschlüssel.');
                if (!importedIds.has(inventoryId)) throw new Error(`Bild ${imageKey} gehört zu keinem importierten Inventareintrag.`);
                imageKeys.add(imageKey);
              }
              const db = await openProfileBackupDatabase();
              try {
                const existingRecords = await readProfileInventoryRows(db, targetProfileId);
                const targetOldIds = new Set(existingRecords.map(record => String(record?.inventoryId || '')).filter(Boolean));
                const collision = await new Promise((resolve, reject) => {
                  const store = db.transaction('inventories').objectStore('inventories');
                  const ids = [...importedIds];
                  if (!ids.length) { resolve(null); return; }
                  let pending = ids.length;
                  let found = null;
                  for (const inventoryId of ids) {
                    const request = store.get(inventoryId);
                    request.onerror = () => reject(request.error || new Error('Lokale Inventardaten konnten nicht geprüft werden.'));
                    request.onsuccess = () => {
                      const record = request.result || null;
                      if (!found && record && String(record?.profileId || '') !== String(targetProfileId)) found = record;
                      pending -= 1;
                      if (pending === 0) resolve(found);
                    };
                  }
                });
                if (collision) throw new Error(`Inventar-ID ${collision.inventoryId} gehört bereits zu einem anderen lokalen Profil. Import wurde abgebrochen.`);
                const existingImages = await readImagesForInventoryIds(db, [...targetOldIds]);
                const oldImageKeys = existingImages.map(image => String(image?.imageKey || '')).filter(Boolean);
                const foreignImageCollision = await new Promise((resolve, reject) => {
                  const store = db.transaction('images').objectStore('images');
                  const keys = [...imageKeys];
                  if (!keys.length) { resolve(null); return; }
                  let pending = keys.length;
                  let found = null;
                  for (const imageKey of keys) {
                    const request = store.get(imageKey);
                    request.onerror = () => reject(request.error || new Error('Lokale Bilddaten konnten nicht geprüft werden.'));
                    request.onsuccess = () => {
                      const image = request.result || null;
                      if (!found && image && !targetOldIds.has(String(image?.inventoryId || ''))) found = image;
                      pending -= 1;
                      if (pending === 0) resolve(found);
                    };
                  }
                });
                if (foreignImageCollision) throw new Error(`Bildschlüssel ${foreignImageCollision.imageKey} gehört bereits zu einem anderen lokalen Profil. Import wurde abgebrochen.`);

                await new Promise((resolve, reject) => {
                  const tx = db.transaction(['inventories', 'images'], 'readwrite');
                  tx.onabort = () => reject(tx.error || new Error('Die Profilsicherung konnte nicht vollständig wiederhergestellt werden.'));
                  tx.onerror = () => {};
                  tx.oncomplete = resolve;
                  const inventoryStore = tx.objectStore('inventories');
                  const imageStore = tx.objectStore('images');
                  for (const inventoryId of targetOldIds) inventoryStore.delete(inventoryId);
                  for (const imageKey of oldImageKeys) imageStore.delete(imageKey);
                  for (const record of records) inventoryStore.put(record);
                  for (const image of images) imageStore.put({ ...image, blob: image.blob });
                });
                return { records, images, previousInventoryIds: [...targetOldIds] };
              } finally { db.close(); }
            }

      return Object.freeze({
        snapshotProfileIndexedData,
        replaceProfileIndexedData
      });
    }
  });
  globalThis.KRDeps?.register?.('KRProfileBackupStorageService', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
