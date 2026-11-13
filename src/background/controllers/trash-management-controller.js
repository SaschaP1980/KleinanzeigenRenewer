(() => {
  'use strict';

  const RETENTION_STOPS = Object.freeze([10, 30, 60, 90, 180, 360, 'infinite']);

  const API = Object.freeze({
    create(options = {}) {
      const {
        TrashService, inventoryRepository, storageLocal, selectedProfileKey,
        logDiagnostic, broadcastInventoryChanged, withAutonomousAdmission
      } = options;
      if (!TrashService?.create || !inventoryRepository || !storageLocal?.get || !storageLocal?.set) {
        throw new Error('KRTrashManagementController requires persistence and trash service');
      }
      if (typeof logDiagnostic !== 'function' || typeof broadcastInventoryChanged !== 'function'
        || typeof withAutonomousAdmission !== 'function') throw new Error('Trash controller requires safety callbacks');
      const retentionKey = 'trashRetentionDaysV1';
      const service = TrashService.create({
        inventoryRepository,
        getRetentionDays: async () => {
          const stored = (await storageLocal.get(retentionKey))[retentionKey];
          return RETENTION_STOPS.includes(stored) ? stored : 30;
        },
        setRetentionDays: async days => {
          if (!RETENTION_STOPS.includes(days)) throw new Error('Ungültige Papierkorb-Aufbewahrung.');
          await storageLocal.set({ [retentionKey]: days });
        },
        getSelectedProfileId: async () => {
          const state = await storageLocal.get(selectedProfileKey);
          return String(state?.[selectedProfileKey]?.profileId || '');
        }
      });

      async function purgeExpiredTrash() {
        const result = await service.purgeExpired();
        if (!result.purged) return { purged: 0, skipped: result.skipped === true, nextDueAt: result.nextDueAt };
        await logDiagnostic('info', 'TRASH_EXPIRED_PURGED', {
          count: result.expired.length,
          inventoryIds: result.expired.map(record => String(record.inventoryId || '')).slice(0, 100)
        }, { module: 'background', operation: 'trash-purge' }).catch(() => {});
        broadcastInventoryChanged('trash-expired-purged', { count: result.expired.length });
        return { purged: result.expired.length, nextDueAt: result.nextDueAt };
      }

      async function resetTrashRetention(inventoryId) {
        const id = String(inventoryId || '');
        const updated = await service.resetRetention(id);
        await logDiagnostic('info', 'TRASH_RETENTION_RESET', {
          inventoryId: id, adId: updated.adId || null, expiresAt: updated.trash?.expiresAt || null
        }, { module: 'background', operation: 'trash-retention-reset', context: { adId: updated.adId || null } }).catch(() => {});
        broadcastInventoryChanged('trash-retention-reset', { inventoryId: id, adId: updated.adId || null, expiresAt: updated.trash?.expiresAt || null });
        return { inventoryId: id, expiresAt: updated.trash?.expiresAt || null, retentionResetAt: updated.trash?.retentionResetAt || null };
      }

      async function deleteTrashEntry(inventoryId) {
        const id = String(inventoryId || '');
        const record = await service.deleteEntry(id);
        await logDiagnostic('info', 'TRASH_ENTRY_PERMANENTLY_DELETED', {
          inventoryId: id, adId: record.adId || null, trashedAt: record.trash?.trashedAt || null
        }, { module: 'background', operation: 'trash-delete', context: { adId: record.adId || null } }).catch(() => {});
        broadcastInventoryChanged('trash-entry-deleted', { inventoryId: id, adId: record.adId || null });
        return { deleted: true, inventoryId: id };
      }

      async function commitTrashRetentionChange(message) {
        const result = await withAutonomousAdmission('trash-retention-commit', () => service.commitRetentionChange({
          token: message?.token, retentionDays: message?.retentionDays,
          selectedProfileId: message?.selectedProfileId, confirmed: message?.confirmed === true
        }));
        await logDiagnostic('info', 'TRASH_RETENTION_CONFIGURATION_CHANGED', {
          retentionDays: result.retentionDays, deletedCount: result.deletedCount
        }, { module: 'background', operation: 'trash-retention-config' }).catch(() => {});
        broadcastInventoryChanged('trash-retention-configured', { retentionDays: result.retentionDays, deletedCount: result.deletedCount });
        return result;
      }

      return Object.freeze({
        service, purgeExpiredTrash, resetTrashRetention, deleteTrashEntry, commitTrashRetentionChange
      });
    }
  });

  globalThis.KRDeps?.register?.('KRTrashManagementController', API);
})();
