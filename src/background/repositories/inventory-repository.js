(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const indexedDB = options.indexedDB || globalThis.indexedDB;
      const IDBKeyRange = options.IDBKeyRange || globalThis.IDBKeyRange;
      if (!indexedDB?.open) throw new Error('KRInventoryRepository requires indexedDB');
      const dbName = String(options.dbName || 'kleinanzeigen-renewal');
      const dbVersion = Math.max(1, Number(options.dbVersion || 2));
      const inventoryStoreName = String(options.inventoryStore || 'inventories');
      const imageStoreName = String(options.imageStore || 'images');
      const unassignedProfileId = String(options.unassignedProfileId || '__unassigned__');
      let sharedDatabasePromise = null;

      function openDatabase() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(dbName, dbVersion);
          request.onupgradeneeded = () => {
            const db = request.result;
            const tx = request.transaction;
            const inventoryStore = db.objectStoreNames.contains(inventoryStoreName)
              ? tx.objectStore(inventoryStoreName)
              : db.createObjectStore(inventoryStoreName, { keyPath: 'inventoryId' });
            if (!inventoryStore.indexNames.contains('capturedAt')) inventoryStore.createIndex('capturedAt', 'capturedAt');
            if (!inventoryStore.indexNames.contains('adId')) inventoryStore.createIndex('adId', 'adId');
            if (!inventoryStore.indexNames.contains('profileId')) inventoryStore.createIndex('profileId', 'profileId');
            if (!inventoryStore.indexNames.contains('trashExpiresAt')) inventoryStore.createIndex('trashExpiresAt', 'trash.expiresAt');
            const imageStore = db.objectStoreNames.contains(imageStoreName)
              ? tx.objectStore(imageStoreName)
              : db.createObjectStore(imageStoreName, { keyPath: 'imageKey' });
            if (!imageStore.indexNames.contains('inventoryId')) imageStore.createIndex('inventoryId', 'inventoryId');
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }

      function openSharedDatabase() {
        if (sharedDatabasePromise) return sharedDatabasePromise;
        sharedDatabasePromise = openDatabase().then(db => {
          const release = () => { sharedDatabasePromise = null; };
          db.onversionchange = () => { try { db.close(); } catch {} release(); };
          if ('onclose' in db) db.onclose = release;
          return db;
        }).catch(error => { sharedDatabasePromise = null; throw error; });
        return sharedDatabasePromise;
      }

      async function readAll() {
        const db = await openSharedDatabase();
        return new Promise((resolve, reject) => {
          const request = db.transaction(inventoryStoreName).objectStore(inventoryStoreName).getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
      }

      async function readForProfile(profileId) {
        const requested = String(profileId || '');
        if (!requested) return readAll();
        if (requested === unassignedProfileId) return (await readAll()).filter(record => !String(record?.profileId || ''));
        const db = await openSharedDatabase();
        return new Promise((resolve, reject) => {
          const store = db.transaction(inventoryStoreName).objectStore(inventoryStoreName);
          if (!store.indexNames.contains('profileId')) {
            const request = store.getAll();
            request.onsuccess = () => resolve((request.result || []).filter(record => String(record?.profileId || '') === requested));
            request.onerror = () => reject(request.error);
            return;
          }
          const request = store.index('profileId').getAll(IDBKeyRange.only(requested));
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
      }

      async function get(inventoryId) {
        const db = await openSharedDatabase();
        return new Promise((resolve, reject) => {
          const request = db.transaction(inventoryStoreName).objectStore(inventoryStoreName).get(String(inventoryId));
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
      }

      async function put(record) {
        const db = await openSharedDatabase();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(inventoryStoreName, 'readwrite');
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error || new Error('Inventareintrag konnte nicht aktualisiert werden.'));
          tx.objectStore(inventoryStoreName).put(record);
        });
        return record;
      }

      async function commit(record, stagedImages) {
        const db = await openDatabase();
        try {
          await new Promise((resolve, reject) => {
            const tx = db.transaction([inventoryStoreName, imageStoreName], 'readwrite');
            let failure;
            tx.oncomplete = resolve;
            tx.onabort = () => reject(failure || tx.error || new Error('Speicherung abgebrochen. Alter Bestand bleibt erhalten.'));
            tx.onerror = () => { failure ||= tx.error; };
            const images = tx.objectStore(imageStoreName);
            const inventories = tx.objectStore(inventoryStoreName);
            const previous = inventories.get(record.inventoryId);
            previous.onsuccess = () => {
              if (!record.insertionMeta && previous.result?.insertionMeta) record.insertionMeta = { ...previous.result.insertionMeta };
              if (!stagedImages.length && previous.result?.images?.length && record?.extraction?.imageSetExplicitlyEmpty !== true) {
                failure = new Error('Keine Bilder eindeutig erkannt. Vorhandener Bildbestand bleibt erhalten.');
                tx.abort();
                return;
              }
              const cursorRequest = images.index('inventoryId').openKeyCursor(IDBKeyRange.only(record.inventoryId));
              cursorRequest.onsuccess = () => {
                try {
                  const cursor = cursorRequest.result;
                  if (cursor) { images.delete(cursor.primaryKey); cursor.continue(); return; }
                  for (const image of stagedImages) images.put(image);
                  inventories.put(record);
                } catch (error) { failure = error; tx.abort(); }
              };
            };
          });
        } finally { db.close(); }
      }

      async function deleteWithImages(inventoryId) {
        const id = String(inventoryId || '');
        if (!id) throw new Error('Inventar-ID fehlt.');
        const db = await openDatabase();
        try {
          await new Promise((resolve, reject) => {
            const tx = db.transaction([inventoryStoreName, imageStoreName], 'readwrite');
            let failure;
            tx.oncomplete = resolve;
            tx.onerror = () => { failure ||= tx.error; };
            tx.onabort = () => reject(failure || tx.error || new Error('Inventareintrag konnte nicht gelöscht werden.'));
            const inventories = tx.objectStore(inventoryStoreName);
            const images = tx.objectStore(imageStoreName);
            const cursor = images.index('inventoryId').openKeyCursor(IDBKeyRange.only(id));
            cursor.onsuccess = () => {
              const row = cursor.result;
              if (row) { images.delete(row.primaryKey); row.continue(); return; }
              inventories.delete(id);
            };
          });
        } finally { db.close(); }
        return { inventoryId: id };
      }

      async function countUnassignedActive(isTrashRecord) {
        const db = await openDatabase();
        try {
          return await new Promise((resolve, reject) => {
            const store = db.transaction(inventoryStoreName).objectStore(inventoryStoreName);
            let count = 0;
            const request = store.openCursor();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const cursor = request.result;
              if (!cursor) { resolve(count); return; }
              const record = cursor.value;
              if (!String(record?.profileId || '') && !isTrashRecord(record)) count += 1;
              cursor.continue();
            };
          });
        } finally { db.close(); }
      }

      async function readTrashExpiryState(nowMs = Date.now()) {
        const db = await openSharedDatabase();
        return new Promise((resolve, reject) => {
          const store = db.transaction(inventoryStoreName).objectStore(inventoryStoreName);
          if (!store.indexNames.contains('trashExpiresAt')) {
            const request = store.getAll();
            request.onsuccess = () => {
              const expired = [];
              let nextDueAt = null;
              for (const record of request.result || []) {
                const expires = Date.parse(record?.trash?.expiresAt || '');
                if (!Number.isFinite(expires)) continue;
                if (expires <= nowMs) expired.push(record);
                else if (!Number.isFinite(nextDueAt) || expires < nextDueAt) nextDueAt = expires;
              }
              resolve({ expired, nextDueAt });
            };
            request.onerror = () => reject(request.error);
            return;
          }
          const index = store.index('trashExpiresAt');
          const expired = [];
          let nextDueAt = null;
          const cursorRequest = index.openCursor();
          cursorRequest.onerror = () => reject(cursorRequest.error);
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (!cursor) { resolve({ expired, nextDueAt }); return; }
            const record = cursor.value;
            const expires = Date.parse(record?.trash?.expiresAt || '');
            if (Number.isFinite(expires)) {
              if (expires <= nowMs) expired.push(record);
              else { nextDueAt = expires; resolve({ expired, nextDueAt }); return; }
            }
            cursor.continue();
          };
        });
      }

      async function unassignProfileRecords(profileId, profileDisplayName) {
        const id = String(profileId || '');
        const now = new Date().toISOString();
        const db = await openDatabase();
        let count = 0;
        try {
          await new Promise((resolve, reject) => {
            const tx = db.transaction(inventoryStoreName, 'readwrite');
            const store = tx.objectStore(inventoryStoreName);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error || new Error('Profildaten konnten nicht gelöst werden.'));
            const request = store.openCursor();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const cursor = request.result;
              if (!cursor) return;
              const record = cursor.value;
              if (String(record?.profileId || '') === id) {
                record.profilePreviousId = id;
                record.profilePreviousName = record.profileName || profileDisplayName || null;
                record.profileId = null;
                record.profileName = null;
                record.profileUnassignedAt = now;
                record.profileAssignmentSource = 'profile-deleted-unassigned';
                cursor.update(record);
                count += 1;
              }
              cursor.continue();
            };
          });
        } finally { db.close(); }
        return count;
      }

      async function assignUnassignedRecords(profile) {
        const db = await openDatabase();
        let migrated = 0;
        try {
          await new Promise((resolve, reject) => {
            const tx = db.transaction(inventoryStoreName, 'readwrite');
            const store = tx.objectStore(inventoryStoreName);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error || new Error('Profilzuordnung konnte nicht gespeichert werden.'));
            const request = store.openCursor();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const cursor = request.result;
              if (!cursor) return;
              const record = cursor.value;
              if (!String(record?.profileId || '')) {
                record.profileId = profile.profileId;
                record.profileName = profile.displayName;
                record.profileAssignedAt = new Date().toISOString();
                record.profileAssignmentSource = 'confirmed-legacy-migration';
                cursor.update(record);
                migrated += 1;
              }
              cursor.continue();
            };
          });
        } finally { db.close(); }
        return migrated;
      }

      async function mutate(inventoryId, mutator, notFoundMessage = 'Inventareintrag wurde nicht gefunden.') {
        const id = String(inventoryId || '');
        const db = await openDatabase();
        try {
          return await new Promise((resolve, reject) => {
            const tx = db.transaction(inventoryStoreName, 'readwrite');
            let failure = null, result = null;
            tx.onerror = () => { failure ||= tx.error; };
            tx.onabort = () => reject(failure || tx.error || new Error('Inventareintrag konnte nicht aktualisiert werden.'));
            tx.oncomplete = () => resolve(result);
            const store = tx.objectStore(inventoryStoreName);
            const request = store.get(id);
            request.onerror = () => { failure = request.error; tx.abort(); };
            request.onsuccess = () => {
              try {
                if (!request.result) throw new Error(notFoundMessage);
                result = mutator(request.result);
                if (result !== undefined) store.put(result);
              } catch (error) { failure = error; tx.abort(); }
            };
          });
        } finally { db.close(); }
      }

      async function putMany(records) {
        if (!Array.isArray(records) || !records.length) return 0;
        const db = await openDatabase();
        try {
          await new Promise((resolve, reject) => {
            const tx = db.transaction(inventoryStoreName, 'readwrite');
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error || new Error('Inventareinträge konnten nicht aktualisiert werden.'));
            const store = tx.objectStore(inventoryStoreName);
            for (const record of records) store.put(record);
          });
        } finally { db.close(); }
        return records.length;
      }

      return Object.freeze({ openDatabase, openSharedDatabase, readAll, readForProfile, get, put, commit, deleteWithImages, countUnassignedActive, readTrashExpiryState, unassignProfileRecords, assignUnassignedRecords, mutate, putMany });
    }
  });
  globalThis.KRDeps?.register?.('KRInventoryRepository', API);
})();
