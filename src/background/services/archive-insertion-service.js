(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const storageLocal = options.storageLocal;
      if (!storageLocal?.get || !storageLocal?.set) throw new Error('KRArchiveInsertionService requires storageLocal');
      const sessionsKey = String(options.sessionsKey || 'archiveInsertionSessionsV1');
      const maxAgeMs = Number(options.maxAgeMs || 24 * 60 * 60 * 1000);
      const normalizeRenewalMode = options.normalizeRenewalMode || (value => String(value || 'safe'));
      const broadcast = options.broadcast || (() => {});

      async function readArchiveInsertionSessions() {
        const stored = await storageLocal.get(sessionsKey);
        const sessions = stored[sessionsKey] && typeof stored[sessionsKey] === 'object' ? stored[sessionsKey] : {};
        const cutoff = Date.now() - maxAgeMs;
        let changed = false;
        for (const [id, session] of Object.entries(sessions)) {
          if (!session?.createdAt || Date.parse(session.createdAt) < cutoff) {
            delete sessions[id];
            changed = true;
          }
        }
        if (changed) await storageLocal.set({ [sessionsKey]: sessions });
        return sessions;
      }

      function preserveEmergencyResetTombstones(existingSessions, incomingSessions) {
        const existing = existingSessions && typeof existingSessions === 'object' ? existingSessions : {};
        const incoming = incomingSessions && typeof incomingSessions === 'object' ? incomingSessions : {};
        const merged = { ...incoming };
        for (const [archiveInsertionId, current] of Object.entries(existing)) {
          if (!current?.emergencyResetAt) continue;
          const proposed = incoming[archiveInsertionId];
          if (!proposed || String(proposed.emergencyResetAt || '') !== String(current.emergencyResetAt || '')) merged[archiveInsertionId] = current;
        }
        return merged;
      }

      async function writeArchiveInsertionSessions(sessions) {
        const stored = await storageLocal.get(sessionsKey);
        const existing = stored[sessionsKey] && typeof stored[sessionsKey] === 'object' ? stored[sessionsKey] : {};
        await storageLocal.set({ [sessionsKey]: preserveEmergencyResetTombstones(existing, sessions) });
      }

      function archiveInsertionPublicSnapshot(session) {
        if (!session) return null;
        return {
          operationId: session.operationId || null,
          parentOperationId: session.parentOperationId || null,
          archiveInsertionId: session.archiveInsertionId,
          revision: Math.max(0, Number(session.revision) || 0),
          fillId: session.fillId || null,
          renewalMode: normalizeRenewalMode(session.renewalMode),
          status: session.status || null,
          stage: session.stage || null,
          createdAt: session.createdAt || null,
          updatedAt: session.updatedAt || null,
          newAdId: session.newAdId || null,
          newPublicUrl: session.newPublicUrl || null,
          newEditUrl: session.newEditUrl || null,
          sourceAdId: session.sourceAdId || null,
          sourceTitle: session.sourceTitle || null,
          sourceProfileName: session.sourceProfileName || null,
          targetProfileId: session.targetProfileId || null,
          targetProfileName: session.targetProfileName || null,
          targetProfileBoundAt: session.targetProfileBoundAt || null,
          archiveVersion: session.archiveVersion || null,
          sourceExtensionVersion: session.sourceExtensionVersion || null,
          exportedAt: session.exportedAt || null,
          foundAt: session.foundAt || null,
          verifiedAt: session.verifiedAt || null,
          completedAt: session.completedAt || null,
          failurePhase: session.failurePhase || null,
          lastError: session.lastError || null,
          targetTabId: session.targetTabId || null,
          emergencyResetAt: session.emergencyResetAt || null,
          remoteVerification: session.remoteVerification || null,
          remoteVerificationRequired: session.remoteVerificationRequired === true
        };
      }

      function broadcastArchiveInsertionState(session, reason = 'session-updated') {
        const snapshot = archiveInsertionPublicSnapshot(session);
        if (!snapshot?.archiveInsertionId) return;
        broadcast(snapshot, String(reason || 'session-updated'));
      }

      async function persistArchiveInsertionSession(session, { reason = 'session-updated' } = {}) {
        const sessions = await readArchiveInsertionSessions();
        const storedRevision = Math.max(0, Number(sessions?.[session.archiveInsertionId]?.revision) || 0);
        const localRevision = Math.max(0, Number(session.revision) || 0);
        session.revision = Math.max(storedRevision, localRevision) + 1;
        session.updatedAt = new Date().toISOString();
        sessions[session.archiveInsertionId] = session;
        await writeArchiveInsertionSessions(sessions);
        broadcastArchiveInsertionState(session, reason);
        return session;
      }

      async function getArchiveInsertionStatus(message = {}) {
        const id = String(message?.archiveInsertionId || '');
        const sessions = await readArchiveInsertionSessions();
        const session = id ? sessions[id] : Object.values(sessions).sort((a, b) => String(b?.updatedAt || '').localeCompare(String(a?.updatedAt || '')))[0];
        return archiveInsertionPublicSnapshot(session || null);
      }

      function archiveInsertionMeta(session) {
        const confirmedAt = String(session?.newIdConfirmedAt || '').trim();
        return confirmedAt && Number.isFinite(Date.parse(confirmedAt)) ? {
          confirmedAt,
          source: 'archive-import-new-id-confirmed',
          renewalMode: normalizeRenewalMode(session?.renewalMode)
        } : null;
      }

      return Object.freeze({
        readArchiveInsertionSessions,
        writeArchiveInsertionSessions,
        archiveInsertionPublicSnapshot,
        broadcastArchiveInsertionState,
        persistArchiveInsertionSession,
        getArchiveInsertionStatus,
        archiveInsertionMeta
      });
    }
  });
  globalThis.KRDeps?.register?.('KRArchiveInsertionService', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
