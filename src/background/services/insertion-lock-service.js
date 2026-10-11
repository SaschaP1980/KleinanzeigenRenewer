(() => {
  'use strict';
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before insertion-lock-service.js');
  const API = Object.freeze({
    create(options = {}) {
      const { readRenewalSessions, readArchiveInsertionSessions, readFillSessions, readMassRenewalBatch,
        renewalHoldsInsertionLock, templateFillHoldsInsertionLock, getInventory, logDiagnostic } = options;
      const required = { readRenewalSessions, readArchiveInsertionSessions, readFillSessions, readMassRenewalBatch,
        renewalHoldsInsertionLock, templateFillHoldsInsertionLock, getInventory, logDiagnostic };
      for (const [name,value] of Object.entries(required)) if (typeof value !== 'function') throw new Error(`insertion lock dependency ${name} is required`);
      let insertionStartGate = Promise.resolve();

async function withInsertionStartGate(task) {
  const previous = insertionStartGate;
  let release = null;
  insertionStartGate = new Promise(resolve => { release = resolve; });
  await previous.catch(() => {});
  try {
    return await task();
  } finally {
    release?.();
  }
}

function insertionLockSortTime(item) {
  const parsed = Date.parse(item?.createdAt || item?.updatedAt || '');
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

async function getInsertionLockState() {
  const [renewals, archiveInsertions, fills] = await Promise.all([
    readRenewalSessions().catch(() => ({})),
    readArchiveInsertionSessions().catch(() => ({})),
    readFillSessions().catch(() => ({}))
  ]);
  const activeRenewals = Object.values(renewals)
    .filter(renewalHoldsInsertionLock)
    .sort((a, b) => insertionLockSortTime(a) - insertionLockSortTime(b));
  if (activeRenewals.length) {
    const session = activeRenewals[0];
    const sourceInventoryId = String(session.sourceInventoryId || '');
    const source = sourceInventoryId ? await getInventory(sourceInventoryId).catch(() => null) : null;
    return {
      locked: true,
      kind: 'renewal',
      ownerId: String(session.renewalId || ''),
      inventoryId: sourceInventoryId || null,
      adId: String(session.sourceAdId || source?.adId || '') || null,
      title: String(source?.title || '').slice(0, 180) || null,
      status: String(session.status || '') || null,
      stage: String(session.stage || '') || null,
      startedAt: session.createdAt || null,
      massBatchId: session.massBatchId || null,
      conflictCount: activeRenewals.length
    };
  }

  const activeArchiveInsertions = Object.values(archiveInsertions)
    .filter(session => session?.archiveInsertionId && !['complete', 'needs-review', 'error', 'cancelled'].includes(String(session?.status || '')))
    .sort((a, b) => insertionLockSortTime(a) - insertionLockSortTime(b));
  if (activeArchiveInsertions.length) {
    const session = activeArchiveInsertions[0];
    return {
      locked: true,
      kind: 'archive-insertion',
      ownerId: String(session.archiveInsertionId || ''),
      inventoryId: null,
      adId: String(session.newAdId || session.sourceAdId || '') || null,
      title: String(session.sourceTitle || '').slice(0, 180) || null,
      status: String(session.status || '') || null,
      stage: String(session.stage || '') || null,
      startedAt: session.createdAt || null,
      conflictCount: activeArchiveInsertions.length
    };
  }

  const activeTemplateFills = Object.values(fills)
    .filter(templateFillHoldsInsertionLock)
    .sort((a, b) => insertionLockSortTime(a) - insertionLockSortTime(b));
  if (activeTemplateFills.length) {
    const session = activeTemplateFills[0];
    const inventoryId = String(session.inventoryId || '');
    const source = inventoryId ? await getInventory(inventoryId).catch(() => null) : null;
    return {
      locked: true,
      kind: 'trash-template',
      ownerId: String(session.fillId || ''),
      inventoryId: inventoryId || null,
      adId: String(session.sourceAdId || source?.adId || '') || null,
      title: String(source?.title || '').slice(0, 180) || null,
      status: String(session.status || '') || null,
      stage: String(session.stage || '') || null,
      startedAt: session.createdAt || null,
      conflictCount: activeTemplateFills.length
    };
  }

  const massBatch = await readMassRenewalBatch().catch(() => null);
  if (massBatch?.status === 'running') {
    const current = (massBatch.items || []).find(item => ['running', 'retrying'].includes(String(item.status || ''))) || null;
    return {
      locked: true,
      kind: 'mass-renewal',
      ownerId: String(massBatch.batchId || ''),
      inventoryId: current?.inventoryId || null,
      adId: current?.newAdId || current?.sourceAdId || null,
      title: current?.title || 'Mehrere neu inserieren',
      status: massBatch.status,
      stage: current?.stage || 'between-items',
      startedAt: massBatch.startedAt || massBatch.createdAt || null,
      conflictCount: 1
    };
  }

  return { locked: false, kind: null, ownerId: null, inventoryId: null, adId: null, title: null, status: null, stage: null, startedAt: null, conflictCount: 0 };
}

function insertionLockMessage(lock) {
  const title = String(lock?.title || '').trim();
  const suffix = title ? ` („${title}“)` : '';
  return `Ein anderer Inserierungs-/Austauschvorgang läuft bereits${suffix}. Bitte schließe oder verwirf diesen Vorgang zuerst.`;
}

async function assertInsertionStartAvailable(request = {}) {
  const lock = await getInsertionLockState();
  if (!lock.locked) return lock;
  await logDiagnostic('warning', 'INSERTION_START_BLOCKED_BY_GLOBAL_LOCK', {
    requestedKind: request.kind || null,
    requestedInventoryId: request.inventoryId || null,
    lockKind: lock.kind,
    lockOwnerId: lock.ownerId,
    lockInventoryId: lock.inventoryId,
    lockAdId: lock.adId,
    lockStatus: lock.status,
    lockStage: lock.stage,
    conflictCount: lock.conflictCount
  }, { module: 'background', operation: 'insertion-global-lock', context: { adId: lock.adId || null } }).catch(() => {});
  throw new Error(insertionLockMessage(lock));
}

      return Object.freeze({ withInsertionStartGate, insertionLockSortTime, getInsertionLockState, insertionLockMessage, assertInsertionStartAvailable });
    }
  });
  KRDeps.register('KRInsertionLockService', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
