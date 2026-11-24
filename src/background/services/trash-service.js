(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const repository = options.inventoryRepository;
      if (!repository?.readForProfile || !repository?.get || !repository?.mutate || !repository?.deleteWithImages) throw new Error('KRTrashService requires inventoryRepository');
      const retentionMs = Math.max(1, Number(options.retentionMs || 30 * 24 * 60 * 60 * 1000));
      let nextPurgeDueAt = null;

      function isTrashRecord(record) {
        return String(record?.recordKind || '') === 'trash' || Boolean(record?.trash?.trashedAt);
      }

      function trashRecordFrom(record, reason = 'manual', context = {}, at = new Date()) {
        invalidatePurgeSchedule();
        const trashedAt = at.toISOString();
        const copy = {
          ...record,
          recordKind: 'trash',
          trash: {
            trashedAt,
            expiresAt: new Date(at.getTime() + retentionMs).toISOString(),
            reason: String(reason || 'manual'),
            originalRecordKind: String(record?.recordKind || 'inventory'),
            context: context && typeof context === 'object' ? context : {}
          }
        };
        delete copy.renewal;
        return copy;
      }

      function shouldSkipPurge(nowMs = Date.now()) {
        return Number.isFinite(nextPurgeDueAt) && nextPurgeDueAt > nowMs;
      }
      function invalidatePurgeSchedule() { nextPurgeDueAt = null; }
      function purgeDueAt() { return nextPurgeDueAt; }

      async function moveToTrash(inventoryId, reason = 'manual', context = {}) {
        const id = String(inventoryId || '');
        if (!id) throw new Error('Inventar-ID fehlt.');
        return repository.mutate(id, record => isTrashRecord(record) ? record : trashRecordFrom(record, reason, context));
      }

      async function resetRetention(inventoryId) {
        const id = String(inventoryId || '');
        if (!id) throw new Error('Papierkorb-ID fehlt.');
        const updated = await repository.mutate(id, record => {
          if (!isTrashRecord(record)) throw new Error('Papierkorb-Eintrag wurde nicht gefunden.');
          const now = new Date();
          return { ...record, trash: { ...(record.trash || {}), expiresAt: new Date(now.getTime() + retentionMs).toISOString(), retentionResetAt: now.toISOString() } };
        }, 'Papierkorb-Eintrag wurde nicht gefunden.');
        invalidatePurgeSchedule();
        return updated;
      }

      async function deleteEntry(inventoryId) {
        const id = String(inventoryId || '');
        if (!id) throw new Error('Papierkorb-ID fehlt.');
        const record = await repository.get(id);
        if (!record || !isTrashRecord(record)) throw new Error('Papierkorb-Eintrag wurde nicht gefunden.');
        await repository.deleteWithImages(id);
        return record;
      }

      async function list(profileId) {
        const records = (await repository.readForProfile(profileId)).filter(isTrashRecord);
        return records.sort((a, b) => String(b?.trash?.trashedAt || '').localeCompare(String(a?.trash?.trashedAt || '')));
      }

      async function purgeExpired() {
        const nowMs = Date.now();
        if (shouldSkipPurge(nowMs)) return { purged: 0, skipped: true, nextDueAt: nextPurgeDueAt, expired: [] };
        let state;
        if (typeof repository.readTrashExpiryState === 'function') {
          state = await repository.readTrashExpiryState(nowMs);
        } else {
          const rows = await repository.readAll();
          const expired = [];
          let nextDueAt = null;
          for (const record of rows) {
            if (!isTrashRecord(record)) continue;
            const expires = Date.parse(record?.trash?.expiresAt || '');
            if (!Number.isFinite(expires)) continue;
            if (expires <= nowMs) expired.push(record);
            else if (!Number.isFinite(nextDueAt) || expires < nextDueAt) nextDueAt = expires;
          }
          state = { expired, nextDueAt };
        }
        const expired = (state?.expired || []).filter(isTrashRecord);
        nextPurgeDueAt = Number.isFinite(state?.nextDueAt) ? state.nextDueAt : Number.MAX_SAFE_INTEGER;
        for (const record of expired) await repository.deleteWithImages(record.inventoryId);
        return { purged: expired.length, nextDueAt: nextPurgeDueAt, expired };
      }

      async function moveMany(records, reason, contextFactory = () => ({}), at = new Date()) {
        const updates = (Array.isArray(records) ? records : []).map(record => trashRecordFrom(record, reason, contextFactory(record), at));
        await repository.putMany(updates);
        return updates;
      }

      return Object.freeze({ isTrashRecord, trashRecordFrom, invalidatePurgeSchedule, moveToTrash, resetRetention, deleteEntry, list, purgeExpired });
    }
  });
  globalThis.KRDeps?.register?.('KRTrashService', API);
})();
