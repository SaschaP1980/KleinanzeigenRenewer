(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const {readArchiveInsertionSessions,readFillSessions,getInventory,isTrashRecord,persistArchiveInsertionSession,deleteImagesByInventoryId,logDiagnostic,setAppNotice,broadcastInventoryChanged,normalizeRenewalMode,cryptoApi,compareArchiveInsertionRecords,runArchiveInsertionPostPublish,confirmPublishedArchiveInsertion}=options;
      const crypto=cryptoApi;
      const required={readArchiveInsertionSessions,readFillSessions,getInventory,isTrashRecord,persistArchiveInsertionSession,deleteImagesByInventoryId,logDiagnostic,setAppNotice,broadcastInventoryChanged,normalizeRenewalMode,compareArchiveInsertionRecords,runArchiveInsertionPostPublish,confirmPublishedArchiveInsertion};
      for(const [name,value] of Object.entries(required)) if(typeof value!=='function') throw new Error(`archive recovery service dependency ${name} is required`);
      if(!crypto?.randomUUID) throw new Error('archive recovery service crypto API is required');
async function completeRecoveredArchiveInsertionIfAlreadyInventoried(session) {
  const newAdId = String(session?.newAdId || '');
  if (!/^\d+$/.test(newAdId)) return false;
  const existingRecord = await getInventory(newAdId);
  if (!existingRecord || isTrashRecord(existingRecord)) return false;

  const targetProfileId = String(session?.targetProfileId || '');
  if (targetProfileId && String(existingRecord?.profileId || '') !== targetProfileId) return false;

  const sameArchiveInsertion = String(existingRecord?.archiveImport?.archiveInsertionId || '') === String(session?.archiveInsertionId || '');
  let comparison = null;
  if (!sameArchiveInsertion) {
    if (!session?.sourceRecord || typeof session.sourceRecord !== 'object') return false;
    comparison = await compareArchiveInsertionRecords(session.sourceRecord, existingRecord, { onlineConfirmed: true, ownAdsPresence: true });
    if (comparison.status !== 'match') return false;
  }

  session.status = 'complete';
  session.stage = 'complete';
  session.completedAt = session.completedAt || existingRecord?.archiveImport?.completedAt || new Date().toISOString();
  session.inventorySavedAt = session.inventorySavedAt || existingRecord?.capturedAt || session.completedAt;
  session.failurePhase = null;
  session.lastError = null;
  await persistArchiveInsertionSession(session);
  await deleteImagesByInventoryId(session.stagingInventoryId).catch(() => {});
  await logDiagnostic('info', 'ARCHIVE_INSERT_RECOVERY_ALREADY_INVENTORIED', {
    archiveInsertionId: session.archiveInsertionId,
    newAdId,
    inventoryId: existingRecord.inventoryId || newAdId,
    exactArchiveInsertion: sameArchiveInsertion,
    semanticComparison: comparison?.status || null
  }, { module: 'background', operation: 'archive-import-resume', context: { adId: newAdId, profileId: existingRecord.profileId || null } }).catch(() => {});
  await setAppNotice({
    id: crypto.randomUUID(),
    event: 'archive-insertion-completed',
    archiveInsertionId: session.archiveInsertionId,
    newAdId,
    renewalMode: normalizeRenewalMode(session.renewalMode),
    title: 'Aus ZIP neu inseriert',
    text: 'Die Anzeige wurde erfolgreich erstellt.'
  }).catch(() => {});
  broadcastInventoryChanged('archive-insertion-recovery-complete', { archiveInsertionId: session.archiveInsertionId, newAdId });
  return true;
}


async function resumePendingArchiveInsertions() {
  const sessions = await readArchiveInsertionSessions().catch(() => ({}));
  const fills = await readFillSessions().catch(() => ({}));
  for (const session of Object.values(sessions)) {
    try {
      if (/^\d+$/.test(String(session?.newAdId || '')) && ['error', 'published', 'finding', 'checking', 'saving'].includes(String(session?.status || ''))) {
        const alreadyInventoried = await completeRecoveredArchiveInsertionIfAlreadyInventoried(session);
        if (alreadyInventoried) continue;
      }
      const legacyPortableProfileFailure = String(session?.status || '') === 'error'
        && /^\d+$/.test(String(session?.newAdId || ''))
        && Number(session?.failurePhase || 0) === 2
        && String(session?.lastError || '').includes('Profil des exportierten Datensatzes');
      if (legacyPortableProfileFailure) {
        session.status = 'published';
        session.stage = 'new-id-confirmed';
        session.failurePhase = null;
        session.lastError = null;
        await persistArchiveInsertionSession(session);
        await logDiagnostic('info', 'ARCHIVE_INSERT_LEGACY_PROFILE_GATE_RECOVERY_STARTED', {
          archiveInsertionId: session.archiveInsertionId, newAdId: session.newAdId
        }, { module: 'background', operation: 'archive-import-resume', context: { adId: session.newAdId } }).catch(() => {});
        void runArchiveInsertionPostPublish(session.archiveInsertionId).catch(() => {});
        continue;
      }
      if (['complete', 'needs-review', 'error', 'cancelled'].includes(String(session?.status || ''))) continue;
      if (session?.status === 'submitted' && session?.targetTabId && !session?.newAdId) {
        const fill = Object.values(fills).find(item => item?.archiveInsertionId === session.archiveInsertionId && item?.targetTabId === session.targetTabId);
        if (fill) {
          const detected = await detectPublishedAdForFill(session.targetTabId, session.sourceAdId);
          if (detected?.adId) await confirmPublishedArchiveInsertion(fill, detected);
        }
      } else if (/^\d+$/.test(String(session?.newAdId || '')) && ['published', 'finding', 'checking', 'saving'].includes(String(session?.status || ''))) {
        void runArchiveInsertionPostPublish(session.archiveInsertionId).catch(() => {});
      }
    } catch (error) {
      await logDiagnostic('warning', 'ARCHIVE_INSERT_RESUME_DEFERRED', {
        archiveInsertionId: session?.archiveInsertionId || null,
        status: session?.status || null,
        stage: session?.stage || null,
        message: String(error.message || error).slice(0, 500)
      }, { module: 'background', operation: 'archive-import-resume', context: { adId: session?.newAdId || session?.sourceAdId || null } }).catch(() => {});
    }
  }
}


      return Object.freeze({completeRecoveredArchiveInsertionIfAlreadyInventoried, resumePendingArchiveInsertions});
    }
  });
  globalThis.KRDeps?.register?.('KRArchiveInsertionRecoveryService', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
