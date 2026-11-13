(() => {
  'use strict';

  const DAY_MS = 24 * 60 * 60 * 1000;
  const RETENTION_STOPS = Object.freeze([10, 30, 60, 90, 180, 360, 'infinite']);
  const normalizeRetention = value => RETENTION_STOPS.includes(value) ? value : 30;
  const validateRetention = value => {
    if (!RETENTION_STOPS.includes(value)) throw new Error('Ungültige Papierkorb-Aufbewahrungsdauer.');
    return value;
  };
  const baseTimestamp = record => {
    const trashed = Date.parse(record?.trash?.trashedAt || '');
    const reset = Date.parse(record?.trash?.retentionResetAt || '');
    if (!Number.isFinite(trashed)) return null;
    return Number.isFinite(reset) && reset >= trashed ? reset : trashed;
  };
  const deadline = (record, days) => {
    const base = baseTimestamp(record);
    return base === null || days === 'infinite' ? null : base + days * DAY_MS;
  };

  const API = Object.freeze({
    create(options = {}) {
      const repository = options.inventoryRepository;
      if (!repository?.readForProfile || !repository?.get || !repository?.mutate || !repository?.deleteWithImages) {
        throw new Error('KRTrashService requires inventoryRepository');
      }
      const getRetentionDays = typeof options.getRetentionDays === 'function' ? options.getRetentionDays : async () => 30;
      const setRetentionDays = typeof options.setRetentionDays === 'function' ? options.setRetentionDays : async () => {};
      const getSelectedProfileId = typeof options.getSelectedProfileId === 'function' ? options.getSelectedProfileId : async () => '';
      const clock = typeof options.now === 'function' ? options.now : () => Date.now();
      const tokenFactory = typeof options.tokenFactory === 'function' ? options.tokenFactory : () => globalThis.crypto.randomUUID();
      let currentDays = 30;
      let nextPurgeDueAt = null;
      const previews = new Map();

      function isTrashRecord(record) {
        return String(record?.recordKind || '') === 'trash' || Boolean(record?.trash?.trashedAt);
      }

      async function getConfiguration() {
        currentDays = normalizeRetention(await getRetentionDays());
        return { retentionDays: currentDays };
      }

      function configuredDeadline(record, days = currentDays) {
        const value = deadline(record, days);
        return value === null ? null : new Date(value).toISOString();
      }

      function trashRecordFrom(record, reason = 'manual', context = {}, at = new Date()) {
        invalidatePurgeSchedule();
        const trashedAt = at.toISOString();
        const copy = {
          ...record,
          recordKind: 'trash',
          trash: {
            trashedAt,
            expiresAt: currentDays === 'infinite' ? null : new Date(at.getTime() + currentDays * DAY_MS).toISOString(),
            reason: String(reason || 'manual'),
            originalRecordKind: String(record?.recordKind || 'inventory'),
            context: context && typeof context === 'object' ? context : {}
          }
        };
        delete copy.renewal;
        return copy;
      }

      function project(record, days = currentDays) {
        return { ...record, trash: { ...(record.trash || {}), expiresAt: configuredDeadline(record, days) } };
      }

      function shouldSkipPurge(nowMs = clock()) {
        return currentDays === 'infinite' || (Number.isFinite(nextPurgeDueAt) && nextPurgeDueAt > nowMs);
      }
      function invalidatePurgeSchedule() { nextPurgeDueAt = null; }
      function purgeDueAt() { return nextPurgeDueAt; }

      async function moveToTrash(inventoryId, reason = 'manual', context = {}) {
        await getConfiguration();
        const id = String(inventoryId || '');
        if (!id) throw new Error('Inventar-ID fehlt.');
        return repository.mutate(id, record => isTrashRecord(record) ? record : trashRecordFrom(record, reason, context));
      }

      async function resetRetention(inventoryId) {
        await getConfiguration();
        const id = String(inventoryId || '');
        if (!id) throw new Error('Papierkorb-ID fehlt.');
        const updated = await repository.mutate(id, record => {
          if (!isTrashRecord(record)) throw new Error('Papierkorb-Eintrag wurde nicht gefunden.');
          const at = new Date(clock()).toISOString();
          return {
            ...record,
            trash: {
              ...(record.trash || {}),
              expiresAt: currentDays === 'infinite' ? null : new Date(clock() + currentDays * DAY_MS).toISOString(),
              retentionResetAt: at
            }
          };
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
        invalidatePurgeSchedule();
        return record;
      }

      async function list(profileId) {
        await getConfiguration();
        const records = (await repository.readForProfile(profileId)).filter(isTrashRecord);
        return records.map(record => project(record)).sort((a, b) => String(b?.trash?.trashedAt || '').localeCompare(String(a?.trash?.trashedAt || '')));
      }

      function snapshotOf(rows) {
        return rows.filter(isTrashRecord).map(record => ({
          inventoryId: String(record.inventoryId || ''),
          profileId: String(record.profileId || ''),
          trashedAt: String(record.trash?.trashedAt || ''),
          retentionResetAt: record.trash?.retentionResetAt == null ? undefined : String(record.trash.retentionResetAt),
          expiresAt: record.trash?.expiresAt == null ? undefined : String(record.trash.expiresAt)
        })).sort((a, b) => a.inventoryId.localeCompare(b.inventoryId));
      }

      function candidates(rows, proposedDays, previousDays, nowMs) {
        if (proposedDays === 'infinite' || (previousDays !== 'infinite' && proposedDays >= previousDays)) return [];
        return rows.filter(record => isTrashRecord(record) && Number.isFinite(deadline(record, proposedDays)) && deadline(record, proposedDays) <= nowMs);
      }

      async function previewRetentionChange(proposed, selectedProfileId = '') {
        const proposedDays = validateRetention(proposed);
        const current = (await getConfiguration()).retentionDays;
        const profile = String(await getSelectedProfileId() || '');
        if (String(selectedProfileId || '') !== profile) throw new Error('Profil wurde geändert. Bitte erneut prüfen.');
        if (!repository.readAll) throw new Error('Papierkorb-Daten konnten nicht geprüft werden.');
        const rows = await repository.readAll();
        const affected = candidates(rows, proposedDays, current, clock());
        const token = tokenFactory();
        if (typeof token !== 'string' || !token) throw new Error('Prüfung konnte nicht vorbereitet werden.');
        previews.clear(); // A new preview invalidates previously opened dialogs, including duplicate callbacks.
        previews.set(token, { current, proposedDays, profile, snapshot: JSON.stringify(snapshotOf(rows)), expires: clock() + 120000 });
        return { token, retentionDays: current, proposedDays, affectedCount: affected.length };
      }

      async function commitRetentionChange({ token, retentionDays, selectedProfileId, confirmed = false } = {}) {
        const pending = previews.get(String(token || ''));
        previews.delete(String(token || '')); // Single-use even on error, cancellation or duplicate messages.
        if (!pending || pending.expires < clock() || pending.proposedDays !== retentionDays) throw new Error('Prüfung veraltet. Bitte die Einstellung erneut auswählen.');
        const profile = String(await getSelectedProfileId() || '');
        if (pending.profile !== profile || String(selectedProfileId || '') !== profile) throw new Error('Profil wurde geändert. Bitte erneut prüfen.');
        const previous = (await getConfiguration()).retentionDays;
        if (previous !== pending.current) throw new Error('Aufbewahrung wurde zwischenzeitlich geändert. Bitte erneut prüfen.');
        const rows = await repository.readAll();
        if (JSON.stringify(snapshotOf(rows)) !== pending.snapshot) throw new Error('Papierkorb wurde zwischenzeitlich verändert. Bitte erneut prüfen.');
        const affected = candidates(rows, pending.proposedDays, previous, clock());
        if (affected.length && !confirmed) throw new Error('Dauerhaftes Löschen erfordert eine ausdrückliche Bestätigung.');
        if (retentionDays === previous) return { retentionDays: previous, deletedCount: 0 };
        // Save first. A service-worker interruption after this point resumes only the
        // policy consented to by the user; deleting before the durable setting would not.
        await setRetentionDays(retentionDays);
        currentDays = retentionDays;
        invalidatePurgeSchedule();
        const cleanup = await purgeExpired();
        return { retentionDays, deletedCount: cleanup.purged };
      }

      async function purgeExpired() {
        await getConfiguration();
        const nowMs = clock();
        if (shouldSkipPurge(nowMs)) return { purged: 0, skipped: true, nextDueAt: nextPurgeDueAt, expired: [] };
        const rows = await repository.readAll();
        let nextDueAt = null;
        const expired = [];
        for (const record of rows) {
          if (!isTrashRecord(record)) continue;
          const dueAt = deadline(record, currentDays);
          if (!Number.isFinite(dueAt)) continue; // Legacy record with unknown age is never guessed.
          if (dueAt > nowMs) {
            if (nextDueAt === null || dueAt < nextDueAt) nextDueAt = dueAt;
            continue;
          }
          // The repository re-reads and checks identity, kind, profile, timestamps and
          // live eligibility in one readwrite IndexedDB transaction with image removal.
          if (typeof repository.deleteTrashIfEligible !== 'function') {
            throw new Error('Sichere Papierkorb-Bereinigung ist nicht verfügbar.');
          }
          const expected = {
            profileId: String(record.profileId || ''),
            trashedAt: String(record.trash?.trashedAt || ''),
            retentionResetAt: record.trash?.retentionResetAt == null ? undefined : String(record.trash.retentionResetAt)
          };
          if (await repository.deleteTrashIfEligible(String(record.inventoryId || ''), expected, currentDays, nowMs)) expired.push(record);
        }
        nextPurgeDueAt = nextDueAt === null ? Number.MAX_SAFE_INTEGER : nextDueAt;
        return { purged: expired.length, nextDueAt: nextPurgeDueAt, expired };
      }

      async function moveMany(records, reason, contextFactory = () => ({}), at = new Date()) {
        await getConfiguration();
        const updates = (Array.isArray(records) ? records : []).map(record => trashRecordFrom(record, reason, contextFactory(record), at));
        await repository.putMany(updates);
        return updates;
      }

      return Object.freeze({
        isTrashRecord, trashRecordFrom, invalidatePurgeSchedule, moveToTrash,
        resetRetention, deleteEntry, list, purgeExpired,
        getConfiguration, previewRetentionChange, commitRetentionChange
      });
    }
  });
  globalThis.KRDeps?.register?.('KRTrashService', API);
})();
