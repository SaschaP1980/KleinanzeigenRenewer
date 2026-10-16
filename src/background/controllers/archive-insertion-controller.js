(() => {
  'use strict';
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before archive-insertion-controller.js');
  const API = Object.freeze({
    create(options = {}) {
      const {
        readArchiveInsertionSessions, writeArchiveInsertionSessions, archiveInsertionPublicSnapshot, persistArchiveInsertionSession, archiveInsertionMeta, getInventory, isTrashRecord, getInventoryImage, deleteImagesByInventoryId, assertTemplateSourceReady, inventoryImageSetExplicitlyEmpty, compareRenewalRecords, normalizedScalar, normalizedComparableBoolean, normalizeProfileName, normalizeRenewalMode, ensureProfile, saveInventory, openDatabase, normalBrowserWindowId, createManagedWorkerTab, closeManagedWorkerTab, waitForTabComplete, ensureContentConnection, sendTabRequestWithBootstrap, updateAutomationTab, reloadAutomationTab, createAutomationTab, registerShadowTab, closePublishedRenewalTargetTab, assertSelectedProfileMatchesLiveAccount, getRenewalConfiguration, withInsertionStartGate, assertInsertionStartAvailable, readFillSessions, writeFillSessions, detectPublishedAdForFill, correlationContext, sessionCorrelationContext, delay, logDiagnostic, setAppNotice, broadcastInventoryChanged, cryptoApi, chromeApi, MY_ADS_PROJECTS_URL, TAB_LOAD_TIMEOUT_RENEWAL_MS, BULK_RETRY_TIMEOUT_MS, BULK_RETRY_POLL_MS, RENEWAL_MODE_FAST, TEMPLATE_TARGET_URL, TAB_ROLES, INVENTORY_STORE, IMAGE_STORE, withAutonomousAdmission
      } = options;
      const required = {
        readArchiveInsertionSessions, writeArchiveInsertionSessions, archiveInsertionPublicSnapshot, persistArchiveInsertionSession, archiveInsertionMeta, getInventory, isTrashRecord, getInventoryImage, deleteImagesByInventoryId, assertTemplateSourceReady, inventoryImageSetExplicitlyEmpty, compareRenewalRecords, normalizedScalar, normalizedComparableBoolean, normalizeProfileName, normalizeRenewalMode, ensureProfile, saveInventory, openDatabase, normalBrowserWindowId, createManagedWorkerTab, closeManagedWorkerTab, waitForTabComplete, ensureContentConnection, sendTabRequestWithBootstrap, updateAutomationTab, reloadAutomationTab, createAutomationTab, registerShadowTab, closePublishedRenewalTargetTab, assertSelectedProfileMatchesLiveAccount, getRenewalConfiguration, withInsertionStartGate, assertInsertionStartAvailable, readFillSessions, writeFillSessions, detectPublishedAdForFill, correlationContext, sessionCorrelationContext, delay, logDiagnostic, setAppNotice, broadcastInventoryChanged, withAutonomousAdmission,
      };
      for (const [name, value] of Object.entries(required)) {
        if (typeof value !== 'function') throw new Error(`archive insertion controller dependency ${name} is required`);
      }
      if (!cryptoApi?.randomUUID || !cryptoApi?.subtle || !chromeApi?.tabs) throw new Error('archive insertion controller runtime APIs are required');
      if (!MY_ADS_PROJECTS_URL || !TAB_LOAD_TIMEOUT_RENEWAL_MS || !BULK_RETRY_TIMEOUT_MS || !BULK_RETRY_POLL_MS || !RENEWAL_MODE_FAST || !TEMPLATE_TARGET_URL || !TAB_ROLES || !INVENTORY_STORE || !IMAGE_STORE) throw new Error('archive insertion controller constants are required');
      const crypto = cryptoApi;
      const chrome = chromeApi;

async function sha256BlobHex(blob) { return requireArchiveInsertionVerificationService().sha256BlobHex(blob); }

async function compareArchiveInsertionRecords(source, candidate, options = {}) { return requireArchiveInsertionVerificationService().compareArchiveInsertionRecords(source, candidate, options); }

async function completeRecoveredArchiveInsertionIfAlreadyInventoried(session) { return requireArchiveInsertionRecoveryService().completeRecoveredArchiveInsertionIfAlreadyInventoried(session); }

async function resumePendingArchiveInsertions() { return requireArchiveInsertionRecoveryService().resumePendingArchiveInsertions(); }

async function assertArchiveStagingReady(record, stagingInventoryId) { return requireArchiveInsertionVerificationService().assertArchiveStagingReady(record, stagingInventoryId); }

async function resolveArchiveTargetProfile(archiveInsertionId) { return requireArchiveInsertionVerificationService().resolveArchiveTargetProfile(archiveInsertionId); }

async function promoteArchiveTemplateToInventory(session, presence, actualProfile) { return requireArchiveInsertionVerificationService().promoteArchiveTemplateToInventory(session, presence, actualProfile); }

function normalizeArchiveEditUrl(rawUrl, adId) { return requireArchiveInsertionVerificationService().normalizeArchiveEditUrl(rawUrl, adId); }

async function assertArchiveEditTab(tabId, adId) { return requireArchiveInsertionVerificationService().assertArchiveEditTab(tabId, adId); }

async function findArchivePublishedAd(session) { return requireArchiveInsertionVerificationService().findArchivePublishedAd(session); }

async function verifyAndSaveArchiveInsertion(session, actualProfile, presence) { return requireArchiveInsertionVerificationService().verifyAndSaveArchiveInsertion(session, actualProfile, presence); }

async function runArchiveInsertionPostPublish(archiveInsertionId) { return requireArchiveInsertionVerificationService().runArchiveInsertionPostPublish(archiveInsertionId); }

async function confirmPublishedArchiveInsertion(fill, detected) { return requireArchiveInsertionVerificationService().confirmPublishedArchiveInsertion(fill, detected); }

async function startArchiveInsertion(message) {
  return withInsertionStartGate(async () => {
    const archiveInsertionId = String(message?.archiveInsertionId || '');
    const stagingInventoryId = String(message?.stagingInventoryId || '');
    const record = message?.record;
    if (!/^[0-9a-f-]{20,}$/i.test(archiveInsertionId)) throw new Error('ZIP-Neuinserat-ID ist ungültig.');
    if (stagingInventoryId !== `archive:${archiveInsertionId}`) throw new Error('Temporärer ZIP-Bildspeicher ist ungültig.');
    if (message?.archiveType !== 'kleinanzeigen-renewal-inventory-export' || Number(message?.archiveVersion) !== 1) throw new Error('ZIP-Archivtyp oder Archivversion wird nicht unterstützt.');
    await assertInsertionStartAvailable({ kind: 'archive-insertion', inventoryId: null });
    await assertSelectedProfileMatchesLiveAccount({ purpose: 'archive-insertion' });
    const existing = await readArchiveInsertionSessions();
    if (existing[archiveInsertionId]) throw new Error('Diese ZIP-Neuinserat-Sitzung existiert bereits.');
    const staging = await assertArchiveStagingReady(record, stagingInventoryId);
    const targetProfile = await resolveArchiveTargetProfile(archiveInsertionId);
    const renewalConfiguration = await getRenewalConfiguration();
    const renewalMode = normalizeRenewalMode(renewalConfiguration.renewalMode);
    const operationId = crypto.randomUUID();
    const fillId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const session = {
      operationId,
      parentOperationId: null,
      archiveInsertionId,
      fillId,
      stagingInventoryId,
      sourceRecord: record,
      sourceAdId: String(record?.adId || ''),
      sourceTitle: String(record?.title || '').slice(0, 240),
      sourceProfileName: staging.sourceProfileName || null,
      targetProfileId: targetProfile.profileId,
      targetProfileName: targetProfile.displayName,
      targetProfileBoundAt: createdAt,
      archiveVersion: Number(message.archiveVersion),
      sourceExtensionVersion: String(message?.sourceExtensionVersion || '') || null,
      exportedAt: String(message?.exportedAt || '') || null,
      renewalMode,
      targetTabId: null,
      newAdId: null,
      newPublicUrl: '',
      newEditUrl: '',
      status: 'draft',
      stage: 'staging-verified',
      createdAt,
      updatedAt: createdAt,
      lastError: null
    };
    existing[archiveInsertionId] = session;
    await writeArchiveInsertionSessions(existing);
    broadcastInventoryChanged('insertion-lock-acquired', { kind: 'archive-insertion', ownerId: archiveInsertionId, title: session.sourceTitle });
    let tab = null;
    try {
      tab = await createAutomationTab({ url: 'about:blank', active: false });
      if (!tab?.id) throw new Error('Neuer Kleinanzeigen-Tab konnte nicht geöffnet werden.');
      await registerShadowTab(tab.id, TAB_ROLES.ARCHIVE_TARGET, { ...correlationContext(session), ownerType: 'archive-insertion', ownerId: archiveInsertionId, adId: String(record?.adId || '') });
      session.targetTabId = tab.id;
      session.stage = 'tab-opened';
      await persistArchiveInsertionSession(session);
      const fills = await readFillSessions();
      fills[fillId] = {
        operationId,
        parentOperationId: null,
        fillId,
        renewalId: null,
        archiveInsertionId,
        templateOnly: false,
        archiveTemplate: record,
        inventoryId: stagingInventoryId,
        sourceAdId: String(record?.adId || ''),
        targetProfileId: targetProfile.profileId,
        targetProfileName: targetProfile.displayName,
        targetTabId: tab.id,
        targetUrl: TEMPLATE_TARGET_URL,
        renewalMode,
        createdAt,
        updatedAt: createdAt,
        status: 'waiting',
        stage: 'tab-opened',
        result: null,
        autoReplacementAllowed: false
      };
      await writeFillSessions(fills);
      await updateAutomationTab(tab.id, { url: TEMPLATE_TARGET_URL, active: true });
      await logDiagnostic('info', 'ARCHIVE_INSERT_STARTED', {
        operationId: session.operationId || null, parentOperationId: session.parentOperationId || null,
        archiveInsertionId, fillId, sourceAdId: session.sourceAdId || null, imageCount: staging.imageCount,
        targetTabId: tab.id, targetProfileId: session.targetProfileId || null, renewalMode, archiveVersion: session.archiveVersion
      }, { module: 'background', operation: 'archive-import', context: sessionCorrelationContext(session, { adId: session.sourceAdId || null, targetTabId: tab.id }) }).catch(() => {});
      return { ...archiveInsertionPublicSnapshot(session), imageCount: staging.imageCount };
    } catch (error) {
      session.status = 'error';
      session.stage = 'error-phase-1';
      session.failurePhase = 1;
      session.lastError = String(error.message || error).slice(0, 800);
      await persistArchiveInsertionSession(session).catch(() => {});
      if (tab?.id) await chrome.tabs.remove(tab.id).catch(() => {});
      await deleteImagesByInventoryId(stagingInventoryId).catch(() => {});
      throw error;
    }
  });
}

      let archiveInsertionVerificationService = null;
      function requireArchiveInsertionVerificationService() {
        if (!archiveInsertionVerificationService) {
          const serviceApi = options.archiveInsertionVerificationServiceApi || globalThis.KRDeps?.require?.('KRArchiveInsertionVerificationService');
          if (!serviceApi?.create) throw new Error('archive insertion verification service is required');
          archiveInsertionVerificationService = serviceApi.create({ ...options });
        }
        return archiveInsertionVerificationService;
      }
      let archiveInsertionRecoveryService = null;
      function requireArchiveInsertionRecoveryService() {
        if (!archiveInsertionRecoveryService) {
          const serviceApi = options.archiveInsertionRecoveryServiceApi || globalThis.KRDeps?.require?.('KRArchiveInsertionRecoveryService');
          if (!serviceApi?.create) throw new Error('archive insertion recovery service is required');
          const verification = requireArchiveInsertionVerificationService();
          archiveInsertionRecoveryService = serviceApi.create({
            ...options,
            compareArchiveInsertionRecords: (...args) => verification.compareArchiveInsertionRecords(...args),
            runArchiveInsertionPostPublish: (...args) => verification.runArchiveInsertionPostPublish(...args),
            confirmPublishedArchiveInsertion: (...args) => verification.confirmPublishedArchiveInsertion(...args)
          });
        }
        return archiveInsertionRecoveryService;
      }

      return Object.freeze({
        compareArchiveInsertionRecords, completeRecoveredArchiveInsertionIfAlreadyInventoried, resumePendingArchiveInsertions,
        assertArchiveStagingReady, resolveArchiveTargetProfile, promoteArchiveTemplateToInventory, normalizeArchiveEditUrl, assertArchiveEditTab,
        findArchivePublishedAd, verifyAndSaveArchiveInsertion, runArchiveInsertionPostPublish, confirmPublishedArchiveInsertion, startArchiveInsertion
      });
    }
  });
  KRDeps.register('KRArchiveInsertionController', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
