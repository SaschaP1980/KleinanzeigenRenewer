(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const openSharedDatabase = options.openSharedDatabase;
      const openDatabase = options.openDatabase;
      const imageStoreName = String(options.imageStore || 'images');
      const IDBKeyRange = options.IDBKeyRange || globalThis.IDBKeyRange;
      if (typeof openSharedDatabase !== 'function' || typeof openDatabase !== 'function') throw new Error('KRInventoryImageStore requires database accessors');

      async function get(imageKey) {
        const db = await openSharedDatabase();
        return new Promise((resolve, reject) => {
          const request = db.transaction(imageStoreName).objectStore(imageStoreName).get(String(imageKey));
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
      }

      async function deleteByInventoryId(inventoryId) {
        const id = String(inventoryId || '');
        if (!id) return 0;
        const db = await openDatabase();
        let deleted = 0;
        try {
          await new Promise((resolve, reject) => {
            const tx = db.transaction(imageStoreName, 'readwrite');
            const store = tx.objectStore(imageStoreName);
            const cursor = store.index('inventoryId').openKeyCursor(IDBKeyRange.only(id));
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error || new Error('Temporäre ZIP-Bilder konnten nicht bereinigt werden.'));
            cursor.onsuccess = () => {
              const row = cursor.result;
              if (!row) return;
              store.delete(row.primaryKey);
              deleted += 1;
              row.continue();
            };
          });
        } finally { db.close(); }
        return deleted;
      }

      return Object.freeze({ get, deleteByInventoryId });
    }
  });
  globalThis.KRDeps?.register?.('KRInventoryImageStore', API);
})();
