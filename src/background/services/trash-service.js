(() => {
  'use strict';

  const DAY_MS = 24 * 60 * 60 * 1000;
  const RETENTION_STOPS = Object.freeze([10, 30, 60, 90, 180, 360, 'infinite']);
  const normalizeRetention = value => RETENTION_STOPS.includes(value) ? value : 30;
  const validateRetention = value => {
    if (!RETENTION_STOPS.includes(value)) throw new Error('Ungültige Papierkorb-Aufbewahrungsdauer.');
    return value;
  };
  // Stored trash timestamps must represent a real calendar instant. Date.parse
  // alone silently normalizes e.g. February 30 into March.
  function parseStoredTimestamp(value) {
    if (typeof value !== 'string') return NaN;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!m) return NaN;
    const parts = m.slice(1, 7).map(Number);
    const [year, month, day, hour, minute, second] = parts;
    const civil = new Date(0);
    civil.setUTCFullYear(year, month - 1, day);
    civil.setUTCHours(hour, minute, second, Number((m[7] || '0').padEnd(3, '0')));
    if (civil.getUTCFullYear() !== year || civil.getUTCMonth() !== month - 1 ||
        civil.getUTCDate() !== day || civil.getUTCHours() !== hour ||
        civil.getUTCMinutes() !== minute || civil.getUTCSeconds() !== second) return NaN;
    return Date.parse(value);
  }
  const baseTimestamp = record => {
    const trashed = parseStoredTimestamp(record?.trash?.trashedAt);
    const reset = parseStoredTimestamp(record?.trash?.retentionResetAt);
    if (!Number.isFinite(trashed)) return null;
    return Number.isFinite(reset) && reset >= trashed ? reset : trashed;
  };
  const deadline = (record, days) => {
    const base = baseTimestamp(record);
    return base === null || days === 'infinite' ? null : base + days * DAY_MS;
  };

  // A persisted deadline is the per-record lower bound on automatic deletion.
  // A global policy write cannot authorize earlier deletion of rows outside its
  // exact reviewed snapshot, even after an MV3 restart or interrupted commit.
  const effectiveDeadline = (record, days, revision = null) => {
    if (revision !== null && record?.trash?.retentionRevision !== revision) return null;
    const due = deadline(record, days);
    if (due === null || record?.trash?.retentionIndefinite === true) return null;
    const stored = parseStoredTimestamp(record?.trash?.expiresAt);
    return Number.isFinite(stored) ? Math.max(stored, due) : null;
  };

  const API = Object.freeze({
    create(options = {}) {
      const repository = options.inventoryRepository;
      if (!repository?.readForProfile || !repository?.get || !repository?.mutate || !repository?.deleteWithImages) {
        throw new Error('KRTrashService requires inventoryRepository');
      }
      const getRetentionDays = typeof options.getRetentionDays === 'function' ? options.getRetentionDays : async () => undefined;
      const setRetentionDays = typeof options.setRetentionDays === 'function' ? options.setRetentionDays : async () => {};
      const revisionAware = typeof options.getRetentionPolicy === 'function';
      const readPolicy = revisionAware ? options.getRetentionPolicy : async () => ({ retentionDays: await getRetentionDays(), revision: null });
      const getSelectedProfileId = typeof options.getSelectedProfileId === 'function' ? options.getSelectedProfileId : async () => '';
      const clock = typeof options.now === 'function' ? options.now : () => Date.now();
      const tokenFactory = typeof options.tokenFactory === 'function' ? options.tokenFactory : () => globalThis.crypto.randomUUID();
      let currentDays = typeof options.getRetentionDays === 'function' ? null : 30;
      let currentLegacyDefault = true;
      let currentRevision = null;
      // Serialize only local policy changes and expiry sweeps, not renewal or
      // unrelated workflows; no updater fence/lease/owner dependency.
      let policyMutationTail = Promise.resolve();
      function withLocalPolicyMutation(task) {
        const next = policyMutationTail.then(task, task);
        policyMutationTail = next.catch(() => {});
        return next;
      }
      let nextPurgeDueAt = null;
      const previews = new Map();

      function isTrashRecord(record) {
        return String(record?.recordKind || '') === 'trash' || Boolean(record?.trash?.trashedAt);
      }

      async function readVerifiedPolicy() {
        let raw, revision;
        try {
          const stored = await readPolicy();
          if (!stored || typeof stored !== 'object') throw new Error('Papierkorb-Aufbewahrung nicht lesbar.');
          raw = stored.retentionDays;
          revision = stored.revision == null ? null : stored.revision;
          if (revision !== null && (typeof revision !== 'string' || !revision.trim() || !RETENTION_STOPS.includes(raw))) {
            throw new Error('Papierkorb-Aufbewahrung konnte nicht bestätigt werden.');
          }
        } catch (error) {
          currentDays = null;
          currentRevision = null;
          invalidatePurgeSchedule();
          throw error;
        }
        const days = normalizeRetention(raw);
        const legacyDefault = !RETENTION_STOPS.includes(raw);
        if (days !== currentDays || legacyDefault !== currentLegacyDefault || revision !== currentRevision) invalidatePurgeSchedule();
        currentDays = days;
        currentLegacyDefault = legacyDefault;
        currentRevision = revision;
        return { retentionDays: days, revision, legacyDefault };
      }

      async function getConfiguration() {
        const { retentionDays } = await readVerifiedPolicy();
        return { retentionDays };
      }

      function configuredDeadline(record, days = currentDays, revision = currentRevision) {
        if (days === null) return null;
        const value = effectiveDeadline(record, days, revision);
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
            expiresAt: currentDays === 'infinite' || currentDays === null ? null : new Date(at.getTime() + currentDays * DAY_MS).toISOString(),
            retentionIndefinite: currentDays === 'infinite',
            retentionRevision: currentRevision,
            reason: String(reason || 'manual'),
            originalRecordKind: String(record?.recordKind || 'inventory'),
            context: context && typeof context === 'object' ? context : {}
          }
        };
        delete copy.renewal;
        return copy;
      }

      function project(record, days = currentDays, revision = currentRevision) {
        const indefinite = days === 'infinite' || (days !== null && record?.trash?.retentionIndefinite === true);
        return { ...record, trash: { ...(record.trash || {}), expiresAt: indefinite ? null : configuredDeadline(record, days, revision), retentionIndefinite: indefinite } };
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
        const { retentionDays: days, revision } = await readVerifiedPolicy();
        const id = String(inventoryId || '');
        if (!id) throw new Error('Papierkorb-ID fehlt.');
        const updated = await repository.mutate(id, record => {
          if (!isTrashRecord(record)) throw new Error('Papierkorb-Eintrag wurde nicht gefunden.');
          const at = new Date(clock()).toISOString();
          return {
            ...record,
            trash: {
              ...(record.trash || {}),
              expiresAt: days === 'infinite' ? null : new Date(Date.parse(at) + days * DAY_MS).toISOString(),
              retentionIndefinite: days === 'infinite',
              retentionRevision: revision,
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
        // A failed policy read is not a confirmed default and must not hide
        // the stored records. Projection is read-only and explicitly unknown.
        const config = await readVerifiedPolicy().catch(() => null);
        const days = config ? config.retentionDays : null;
        const revision = config?.revision ?? null;
        const records = (await repository.readForProfile(profileId)).filter(isTrashRecord);
        return records.map(record => project(record, days, revision)).sort((a, b) => String(b?.trash?.trashedAt || '').localeCompare(String(a?.trash?.trashedAt || '')));
      }

      function snapshotOf(rows) {
        return rows.filter(isTrashRecord).map(record => ({
          inventoryId: String(record.inventoryId || ''),
          profileId: String(record.profileId || ''),
          trashedAt: String(record.trash?.trashedAt || ''),
          retentionResetAt: record.trash?.retentionResetAt == null ? undefined : String(record.trash.retentionResetAt),
          expiresAt: record.trash?.expiresAt == null ? undefined : String(record.trash.expiresAt),
          retentionIndefinite: record.trash?.retentionIndefinite === true,
            retentionRevision: record.trash?.retentionRevision ?? null
        })).sort((a, b) => a.inventoryId.localeCompare(b.inventoryId));
      }

      function candidates(rows, proposedDays, previousDays, nowMs, revision = null) {
        if (proposedDays === 'infinite') return [];
        return rows.filter(record => {
          if (!isTrashRecord(record)) return false;
          const proposedDue = deadline(record, proposedDays);
          if (!Number.isFinite(proposedDue) || proposedDue > nowMs) return false;
          if (previousDays === 'infinite' || proposedDays < previousDays) return true;
          const previousDue = effectiveDeadline(record, previousDays, revision);
          return previousDue === null || previousDue > nowMs;
        });
      }

      async function previewRetentionChange(proposed, selectedProfileId = '') {
        const proposedDays = validateRetention(proposed);
        const { retentionDays: current, revision, legacyDefault } = await readVerifiedPolicy();
        const profile = String(await getSelectedProfileId() || '');
        if (String(selectedProfileId || '') !== profile) throw new Error('Profil wurde geändert. Bitte erneut prüfen.');
        if (!repository.readAll) throw new Error('Papierkorb-Daten konnten nicht geprüft werden.');
        const rows = await repository.readAll();
        const affected = candidates(rows, proposedDays, current, clock(), revision);
        const token = tokenFactory();
        if (typeof token !== 'string' || !token) throw new Error('Prüfung konnte nicht vorbereitet werden.');
        previews.clear(); // A new preview invalidates previously opened dialogs, including duplicate callbacks.
        previews.set(token, {
          current, proposedDays, profile, legacyDefault, revision,
          snapshot: JSON.stringify(snapshotOf(rows)),
          // Exact records the user saw in the warning, not just their count.
          affected: JSON.stringify(snapshotOf(affected)),
          expires: clock() + 120000
        });
        return { token, retentionDays: current, proposedDays, affectedCount: affected.length };
      }

      function commitRetentionChange(message = {}) {
        return withLocalPolicyMutation(() => applyRetentionChange(message));
      }

      async function applyRetentionChange({ token, retentionDays, selectedProfileId, confirmed = false } = {}) {
        const pending = previews.get(String(token || ''));
        previews.delete(String(token || '')); // Single-use even on error, cancellation or duplicate messages.
        if (!pending || pending.expires < clock() || pending.proposedDays !== retentionDays) throw new Error('Prüfung veraltet. Bitte die Einstellung erneut auswählen.');
        const profile = String(await getSelectedProfileId() || '');
        if (pending.profile !== profile || String(selectedProfileId || '') !== profile) throw new Error('Profil wurde geändert. Bitte erneut prüfen.');
        const { retentionDays: previous, revision: previousRevision, legacyDefault } = await readVerifiedPolicy();
        if (previous !== pending.current || legacyDefault !== pending.legacyDefault || previousRevision !== pending.revision) throw new Error('Aufbewahrung wurde zwischenzeitlich geändert. Bitte erneut prüfen.');
        const rows = await repository.readAll();
        if (JSON.stringify(snapshotOf(rows)) !== pending.snapshot) throw new Error('Papierkorb wurde zwischenzeitlich verändert. Bitte erneut prüfen.');
        const evaluatedAt = clock();
        const affected = candidates(rows, pending.proposedDays, previous, evaluatedAt, previousRevision);
        // The clock can cross an expiry boundary while the confirmation dialog
        // is open. That must require a fresh preview, even if the stored rows
        // and their timestamps have not changed.
        if (JSON.stringify(snapshotOf(affected)) !== pending.affected) {
          throw new Error('Prüfung veraltet. Bitte die Einstellung erneut auswählen.');
        }
        if (affected.length && !confirmed) throw new Error('Dauerhaftes Löschen erfordert eine ausdrückliche Bestätigung.');
        if (affected.length && typeof repository.deleteTrashIfEligible !== 'function') {
          throw new Error('Sichere Papierkorb-Bereinigung ist nicht verfügbar.');
        }
        if (affected.some(record => !String(record.inventoryId || ''))) {
          throw new Error('Papierkorb-Eintrag ohne sichere Inventar-ID. Bitte erneut prüfen.');
        }
        if (retentionDays === previous) return { retentionDays: previous, deletedCount: 0 };
        // A policy revision is stored with the setting in a single local storage
        // write. Previously stored deadlines alone are not fresh authorization
        // after an interrupted unlimited-to-finite change (KAR-214 RED).
        const revision = revisionAware ? String(token) : null;
        await setRetentionDays(retentionDays, revision);
        const saved = await readVerifiedPolicy();
        if (saved.retentionDays !== retentionDays || saved.legacyDefault || saved.revision !== revision) throw new Error('Gespeicherte Aufbewahrung konnte nicht bestätigt werden.');
        invalidatePurgeSchedule();
        // Only the exact candidates covered by this preview/confirmation may
        // be removed by this commit. A general purge would also delete old
        // records inserted by another profile/import after consent.
        let deletedCount = 0;
        for (const record of affected) {
          const expected = {
            profileId: String(record.profileId || ''),
            trashedAt: String(record.trash?.trashedAt || ''),
            retentionResetAt: record.trash?.retentionResetAt == null
              ? undefined : String(record.trash.retentionResetAt),
            expiresAt: record.trash?.expiresAt == null ? undefined : String(record.trash.expiresAt),
            retentionIndefinite: record.trash?.retentionIndefinite === true,
            retentionRevision: record.trash?.retentionRevision ?? null
          };
          const deleted = await repository.deleteTrashIfEligible(
            String(record.inventoryId), expected, retentionDays, evaluatedAt
          );
          if (!deleted) {
            // The setting is durable by now. Do not report success for a
            // partially applied cleanup; callers refresh the persisted value.
            throw new Error('Aufbewahrung gespeichert, aber ein Papierkorb-Eintrag wurde zwischenzeitlich verändert. Bitte erneut prüfen.');
          }
          deletedCount += 1;
        }
        // Update only non-expired records included in the exact reviewed snapshot.
        // An interruption leaves their old per-record deadline intact; no wider
        // automatic deletion authority is created by the durable policy alone.
        const affectedIds = new Set(affected.map(record => String(record.inventoryId)));
        for (const record of rows.filter(isTrashRecord)) {
          const id = String(record.inventoryId || '');
          if (!id || affectedIds.has(id)) continue;
          const due = deadline(record, retentionDays);
          if (retentionDays !== 'infinite' && (!Number.isFinite(due) || due <= evaluatedAt)) continue;
          const expiresAt = due === null ? null : new Date(due).toISOString();
          const retentionIndefinite = retentionDays === 'infinite';
          if (record.trash?.expiresAt === expiresAt && (record.trash?.retentionIndefinite === true) === retentionIndefinite && (record.trash?.retentionRevision ?? null) === revision) continue;
          const expected = JSON.stringify(snapshotOf([record]));
          await repository.mutate(id, live => {
            if (!isTrashRecord(live) || JSON.stringify(snapshotOf([live])) !== expected) {
              throw new Error('Aufbewahrung gespeichert, aber ein Papierkorb-Eintrag wurde zwischenzeitlich verändert. Bitte erneut prüfen.');
            }
            return { ...live, trash: { ...live.trash, expiresAt, retentionIndefinite, retentionRevision: revision } };
          });
        }
        return { retentionDays, deletedCount };
      }

      function purgeExpired() {
        return withLocalPolicyMutation(runExpirySweep);
      }

      async function runExpirySweep() {
        const config = await readVerifiedPolicy().catch(() => null);
        if (!config) return { purged: 0, skipped: true, nextDueAt: null, expired: [] };
        const { retentionDays: days, revision } = config;
        const nowMs = clock();
        if (shouldSkipPurge(nowMs)) return { purged: 0, skipped: true, nextDueAt: nextPurgeDueAt, expired: [] };
        const rows = await repository.readAll();
        let nextDueAt = null;
        const expired = [];
        for (const record of rows) {
          if (!isTrashRecord(record)) continue;
          const dueAt = effectiveDeadline(record, days, revision);
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
            retentionResetAt: record.trash?.retentionResetAt == null ? undefined : String(record.trash.retentionResetAt),
            expiresAt: record.trash?.expiresAt == null ? undefined : String(record.trash.expiresAt),
            retentionIndefinite: record.trash?.retentionIndefinite === true,
            retentionRevision: record.trash?.retentionRevision ?? null
          };
          if (await repository.deleteTrashIfEligible(String(record.inventoryId || ''), { ...expected, respectStoredDeadline: true, currentRevision: revision }, days, nowMs)) expired.push(record);
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
