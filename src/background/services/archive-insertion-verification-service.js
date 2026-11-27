(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const {
        readArchiveInsertionSessions, archiveInsertionPublicSnapshot, persistArchiveInsertionSession, archiveInsertionMeta,
        getInventory, getInventoryImage, deleteImagesByInventoryId, assertTemplateSourceReady, inventoryImageSetExplicitlyEmpty,
        compareRenewalRecords, normalizedScalar, normalizedComparableBoolean, normalizeProfileName, normalizeRenewalMode,
        ensureProfile, saveInventory, openDatabase, normalBrowserWindowId, createManagedWorkerTab, closeManagedWorkerTab,
        waitForTabComplete, ensureContentConnection, sendTabRequestWithBootstrap, updateAutomationTab, reloadAutomationTab, closePublishedRenewalTargetTab,
        assertSelectedProfileMatchesLiveAccount, readFillSessions, writeFillSessions, correlationContext, sessionCorrelationContext,
        delay, logDiagnostic, setAppNotice, broadcastInventoryChanged, cryptoApi, chromeApi, MY_ADS_PROJECTS_URL,
        TAB_LOAD_TIMEOUT_RENEWAL_MS, BULK_RETRY_TIMEOUT_MS, BULK_RETRY_POLL_MS, RENEWAL_MODE_FAST, INVENTORY_STORE, IMAGE_STORE
      } = options;
      const crypto = cryptoApi; const chrome = chromeApi;
      const required={readArchiveInsertionSessions,archiveInsertionPublicSnapshot,persistArchiveInsertionSession,archiveInsertionMeta,getInventory,getInventoryImage,deleteImagesByInventoryId,assertTemplateSourceReady,inventoryImageSetExplicitlyEmpty,compareRenewalRecords,normalizedScalar,normalizedComparableBoolean,normalizeProfileName,normalizeRenewalMode,ensureProfile,saveInventory,openDatabase,normalBrowserWindowId,createManagedWorkerTab,closeManagedWorkerTab,waitForTabComplete,ensureContentConnection,sendTabRequestWithBootstrap,updateAutomationTab,reloadAutomationTab,closePublishedRenewalTargetTab,assertSelectedProfileMatchesLiveAccount,readFillSessions,writeFillSessions,correlationContext,sessionCorrelationContext,delay,logDiagnostic,setAppNotice,broadcastInventoryChanged};
      for(const [name,value] of Object.entries(required)) if(typeof value!=='function') throw new Error(`archive verification service dependency ${name} is required`);
      if(!crypto?.randomUUID || !crypto?.subtle || !chrome?.tabs) throw new Error('archive verification service runtime APIs are required');
async function sha256BlobHex(blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}


async function compareArchiveInsertionRecords(source, candidate, options = {}) {
  const comparison = await compareRenewalRecords(source, candidate, options);
  const mismatches = Array.isArray(comparison.mismatches) ? [...comparison.mismatches] : [];
  const uncertainties = Array.isArray(comparison.uncertainties) ? [...comparison.uncertainties] : [];
  const matches = Array.isArray(comparison.matches) ? [...comparison.matches] : [];
  const checkManagedField = (field, expected, actual, { normalize = normalizedScalar } = {}) => {
    const expectedMissing = expected === null || expected === undefined || expected === '';
    if (expectedMissing) return;
    const actualMissing = actual === null || actual === undefined || actual === '';
    if (actualMissing) {
      uncertainties.push({ field, expected: normalize(expected), actual: null, reason: 'Im veröffentlichten Bearbeiten-Formular nicht eindeutig verfügbar.' });
      return;
    }
    const normalizedExpected = normalize(expected);
    const normalizedActual = normalize(actual);
    if (JSON.stringify(normalizedExpected) === JSON.stringify(normalizedActual)) {
      if (!matches.includes(field)) matches.push(field);
    } else {
      mismatches.push({ field, expected: normalizedExpected, actual: normalizedActual });
    }
  };

  // Phase 2 Safe/Vollprüfung re-checks every field that the automatic ZIP
  // creation path actively manages in addition to the generic Renewal set.
  // Concrete carrier/package-size method IDs and posterType remain deliberately
  // outside template management (existing project contract) and are therefore
  // not presented as verified here.
  checkManagedField('buyNow.value', source?.buyNow?.value, candidate?.buyNow?.value, { normalize: normalizedComparableBoolean });
  checkManagedField('location.street', source?.locationData?.street, candidate?.locationData?.street);
  checkManagedField('location.locationId', source?.locationData?.locationId, candidate?.locationData?.locationId);
  if (typeof source?.locationData?.addressVisibility === 'boolean') {
    checkManagedField('location.addressVisibility', source.locationData.addressVisibility, candidate?.locationData?.addressVisibility, { normalize: normalizedComparableBoolean });
  }

  return {
    ...comparison,
    status: mismatches.length ? 'mismatch' : uncertainties.length ? 'uncertain' : 'match',
    checkedAt: new Date().toISOString(),
    matches,
    mismatches,
    uncertainties,
    verificationScope: 'archive-managed-fields'
  };
}


async function assertArchiveStagingReady(record, stagingInventoryId) {
  assertTemplateSourceReady(record);
  const sourceProfileName = normalizeProfileName(record?.profileName || '') || null;
  const images = [...(record.images || [])].sort((a, b) => Number(a?.position || 0) - Number(b?.position || 0));
  if (!images.length) {
    if (!inventoryImageSetExplicitlyEmpty(record)) throw new Error('Der leere Bildbestand des Exports ist nicht eindeutig bestätigt.');
    return { sourceProfileName, imageCount: 0 };
  }
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    if (!String(image?.imageKey || '').startsWith(`${stagingInventoryId}:`)) throw new Error(`Bild ${index + 1} besitzt keinen gültigen temporären Bildschlüssel.`);
    const stored = await getInventoryImage(image.imageKey);
    if (!stored?.blob || String(stored.inventoryId || '') !== String(stagingInventoryId)) throw new Error(`Temporäre Bildkopie ${index + 1} wurde nicht gefunden.`);
    if (stored.blob.type !== 'image/jpeg' && stored.mimeType !== 'image/jpeg') throw new Error(`Bild ${index + 1} ist keine JPEG-Vorlage.`);
    if (Number(stored.blob.size) !== Number(image.size || 0)) throw new Error(`Größenprüfung für Bild ${index + 1} fehlgeschlagen.`);
    const expectedSha = String(image.sha256 || '').toLowerCase();
    const actualSha = await sha256BlobHex(stored.blob);
    if (!/^[0-9a-f]{64}$/.test(expectedSha) || actualSha !== expectedSha) throw new Error(`Integritätsprüfung für Bild ${index + 1} fehlgeschlagen.`);
  }
  return { sourceProfileName, imageCount: images.length };
}


async function resolveArchiveTargetProfile(archiveInsertionId) {
  let workerTabId = null;
  try {
    const windowId = await normalBrowserWindowId();
    const worker = await createManagedWorkerTab({ ...(windowId ? { windowId } : {}), url: MY_ADS_PROJECTS_URL, active: false }, 'archive-import-target-profile', { archiveInsertionId, ownerType: 'archive-insertion', ownerId: archiveInsertionId });
    if (!worker?.id) throw new Error('Das aktuell angemeldete Kleinanzeigen-Konto konnte für das ZIP-Neuinserat nicht geprüft werden.');
    workerTabId = worker.id;
    await waitForTabComplete(workerTabId, {
      timeoutMs: TAB_LOAD_TIMEOUT_RENEWAL_MS, purpose: 'archive-import-target-profile',
      label: 'ZIP-Import-Zielprofil-Worker', operation: 'archive-import',
      context: { archiveInsertionId, workerTabId }
    });
    await ensureContentConnection({ tabId: workerTabId });
    const status = await sendTabRequestWithBootstrap(workerTabId, { type: 'MY_ADS_STATUS' });
    if (!status?.isMyAdsPage || !status?.isProjectsTab) throw new Error('Das Zielprofil konnte nicht eindeutig über „Meine Anzeigen“ geprüft werden.');
    const targetProfileName = normalizeProfileName(status?.profileName || '');
    if (!targetProfileName) throw new Error('Das aktuell angemeldete Kleinanzeigen-Konto konnte nicht eindeutig erkannt werden.');
    const profile = await ensureProfile(targetProfileName);
    await logDiagnostic('info', 'ARCHIVE_INSERT_TARGET_PROFILE_BOUND', {
      archiveInsertionId, targetProfileId: profile.profileId, targetProfileNameLength: profile.displayName.length
    }, { module: 'background', operation: 'archive-import-target-profile', context: { archiveInsertionId, profileId: profile.profileId, workerTabId } }).catch(() => {});
    return profile;
  } finally {
    if (workerTabId) await closeManagedWorkerTab(workerTabId).catch(() => {});
  }
}


async function promoteArchiveTemplateToInventory(session, presence, actualProfile) {
  const newAdId = String(session.newAdId || '');
  if (!/^\d+$/.test(newAdId)) throw new Error('Neue Anzeigen-ID ist ungültig.');
  const existingRecord = await getInventory(newAdId);
  if (existingRecord) {
    if (String(existingRecord?.archiveImport?.archiveInsertionId || '') === String(session.archiveInsertionId || '')) return existingRecord;
    throw new Error(`Inventar enthält bereits einen Datensatz mit der neuen Anzeigen-ID ${newAdId}; nichts wurde überschrieben.`);
  }
  const profile = await ensureProfile(actualProfile);
  const source = session.sourceRecord;
  const tempId = String(session.stagingInventoryId || '');
  const now = new Date().toISOString();
  const sourceImages = [...(source?.images || [])].sort((a, b) => Number(a?.position || 0) - Number(b?.position || 0));
  const newImages = [];
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction([INVENTORY_STORE, IMAGE_STORE], 'readwrite');
      const inventories = tx.objectStore(INVENTORY_STORE);
      const images = tx.objectStore(IMAGE_STORE);
      let failure = null;
      let pending = sourceImages.length;
      const staged = [];
      tx.onerror = () => { failure ||= tx.error; };
      tx.onabort = () => reject(failure || tx.error || new Error('ZIP-Inventardatensatz konnte nicht gespeichert werden.'));
      tx.oncomplete = resolve;
      const finish = () => {
        if (pending !== 0 || failure) return;
        const record = {
          ...source,
          inventoryId: newAdId,
          adId: newAdId,
          capturedAt: now,
          recordKind: 'inventory',
          profileId: profile.profileId,
          profileName: profile.displayName,
          publicUrl: session.newPublicUrl || presence?.publicUrl || null,
          endDateDisplay: presence?.endDateDisplay || null,
          endDateIso: presence?.endDateIso || null,
          listingDateDisplay: null,
          listingDateIso: null,
          listingMeta: {
            ...(source?.listingMeta || {}),
            publicUrl: session.newPublicUrl || presence?.publicUrl || null,
            endDateDisplay: presence?.endDateDisplay || null,
            endDateIso: presence?.endDateIso || null,
            listingDateDisplay: null,
            listingDateIso: null,
            source: 'archive-import-fast-my-ads'
          },
          insertionMeta: archiveInsertionMeta(session),
          archiveImport: {
            archiveInsertionId: session.archiveInsertionId,
            archiveVersion: session.archiveVersion,
            exportedAt: session.exportedAt || null,
            sourceExtensionVersion: session.sourceExtensionVersion || null,
            sourceAdId: session.sourceAdId || null,
            sourceProfileName: session.sourceProfileName || null,
            targetProfileId: session.targetProfileId || profile.profileId || null,
            targetProfileName: session.targetProfileName || actualProfile || null,
            completedAt: now,
            renewalMode: normalizeRenewalMode(session.renewalMode)
          },
          images: newImages,
          imageSummary: {
            ...(source?.imageSummary || {}),
            discovered: newImages.length,
            locallyStored: newImages.length,
            uploadReadyJpeg: newImages.length
          }
        };
        delete record.renewal;
        delete record.trash;
        inventories.put(record);
        for (const old of staged) images.delete(old.imageKey);
      };
      if (!sourceImages.length) {
        if (!inventoryImageSetExplicitlyEmpty(source)) { failure = new Error('Der leere Bildbestand der ZIP-Vorlage ist nicht eindeutig bestätigt.'); tx.abort(); return; }
        finish();
        return;
      }
      sourceImages.forEach((image, index) => {
        const request = images.get(String(image.imageKey || ''));
        request.onerror = () => { failure = request.error || new Error(`ZIP-Bild ${index + 1} konnte nicht gelesen werden.`); tx.abort(); };
        request.onsuccess = () => {
          try {
            const stored = request.result;
            if (!stored?.blob || String(stored.inventoryId || '') !== tempId) throw new Error(`ZIP-Bild ${index + 1} fehlt im temporären Speicher.`);
            const nextKey = `${newAdId}:${index}`;
            images.put({ ...stored, imageKey: nextKey, inventoryId: newAdId, position: index, capturedAt: now });
            staged.push(stored);
            newImages[index] = { ...image, imageKey: nextKey, position: index, isPrimary: Boolean(image.isPrimary || index === 0), locallyStored: true, uploadReady: true };
            pending -= 1;
            finish();
          } catch (error) { failure = error; tx.abort(); }
        };
      });
    });
  } finally { db.close(); }
  broadcastInventoryChanged('archive-insertion-saved', { archiveInsertionId: session.archiveInsertionId, inventoryId: newAdId, adId: newAdId });
  return getInventory(newAdId);
}


function normalizeArchiveEditUrl(rawUrl, adId) {
  const expectedId = String(adId || '');
  if (!/^\d+$/.test(expectedId)) return '';
  try {
    const url = new URL(String(rawUrl || ''));
    if (url.protocol !== 'https:' || !/^(?:www\.)?kleinanzeigen\.de$/i.test(url.hostname)) return '';
    if (url.pathname !== '/p-anzeige-bearbeiten.html') return '';
    if (String(url.searchParams.get('adId') || '') !== expectedId) return '';
    return url.href;
  } catch {
    return '';
  }
}


async function assertArchiveEditTab(tabId, adId) {
  const tab = await chrome.tabs.get(Number(tabId || 0)).catch(() => null);
  const editUrl = normalizeArchiveEditUrl(tab?.url, adId);
  if (!editUrl) {
    throw new Error('Die neue Anzeige wurde nicht im Bearbeiten-Modus geöffnet; die Vollprüfung wurde aus Sicherheitsgründen abgebrochen.');
  }
  await logDiagnostic('info', 'ARCHIVE_INSERT_EDIT_MODE_CONFIRMED', {
    archiveAdId: String(adId || ''), tabId: Number(tabId || 0), editUrl
  }, { module: 'background', operation: 'archive-import-recheck', context: { adId: String(adId || ''), workerTabId: Number(tabId || 0) } }).catch(() => {});
  return editUrl;
}


async function findArchivePublishedAd(session) {
  let expectedProfile = normalizeProfileName(session?.targetProfileName || '');
  const legacyTargetBinding = !expectedProfile;
  const newAdId = String(session.newAdId || '');
  let workerTabId = null;
  try {
    session.status = 'finding';
    session.stage = 'my-ads-checking';
    await persistArchiveInsertionSession(session);
    const windowId = await normalBrowserWindowId();
    const worker = await createManagedWorkerTab({ ...(windowId ? { windowId } : {}), url: MY_ADS_PROJECTS_URL, active: false }, 'archive-import-presence', { ...correlationContext(session), ownerType: 'archive-insertion', ownerId: session.archiveInsertionId, adId: newAdId });
    if (!worker?.id) throw new Error('„Meine Anzeigen“-Prüfworker konnte nicht geöffnet werden.');
    workerTabId = worker.id;
    const retryDelays = [0, 1500, 3500];
    let presence = null;
    let actualProfile = '';
    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      if (retryDelays[attempt]) await delay(retryDelays[attempt]);
      if (attempt > 0) {
        const current = await chrome.tabs.get(workerTabId).catch(() => null);
        if (!current) throw new Error('„Meine Anzeigen“-Prüfworker wurde geschlossen.');
        if (String(current.url || '') === MY_ADS_PROJECTS_URL) await reloadAutomationTab(workerTabId);
        else await updateAutomationTab(workerTabId, { url: MY_ADS_PROJECTS_URL });
      }
      await waitForTabComplete(workerTabId, { timeoutMs: TAB_LOAD_TIMEOUT_RENEWAL_MS, purpose: 'archive-import-presence', label: 'ZIP-Import-„Meine Anzeigen“-Worker', operation: 'archive-import', context: sessionCorrelationContext(session, { archiveInsertionId: session.archiveInsertionId, adId: newAdId, workerTabId, attempt: attempt + 1 }) });
      await ensureContentConnection({ tabId: workerTabId });
      const status = await sendTabRequestWithBootstrap(workerTabId, { type: 'MY_ADS_STATUS' });
      actualProfile = normalizeProfileName(status?.profileName || '');
      if (!status?.isMyAdsPage || !status?.isProjectsTab) throw new Error('Prüfung befindet sich nicht eindeutig in „Meine Anzeigen“ / PROJECTS.');
      if (!actualProfile) throw new Error('Das Kleinanzeigen-Konto konnte während der Prüfung nicht eindeutig erkannt werden.');
      if (expectedProfile && expectedProfile.toLocaleLowerCase('de-DE') !== actualProfile.toLocaleLowerCase('de-DE')) {
        await logDiagnostic('error', 'ARCHIVE_INSERT_TARGET_PROFILE_MISMATCH', {
          archiveInsertionId: session.archiveInsertionId, expectedTargetProfileNameLength: expectedProfile.length, actualProfileNameLength: actualProfile.length
        }, { module: 'background', operation: 'archive-import', context: sessionCorrelationContext(session, { adId: newAdId, workerTabId, targetProfileId: session.targetProfileId || null }) }).catch(() => {});
        throw new Error('Das aktuell angemeldete Kleinanzeigen-Konto hat sich seit dem Start des ZIP-Neuinserats geändert.');
      }
      presence = await sendTabRequestWithBootstrap(workerTabId, { type: 'FIND_OWN_AD_BY_ID', adId: newAdId, correlation: correlationContext(session) });
      await logDiagnostic(presence?.found ? 'info' : 'warning', 'ARCHIVE_INSERT_PRESENCE_ATTEMPT', {
        archiveInsertionId: session.archiveInsertionId, newAdId, attempt: attempt + 1, maxAttempts: retryDelays.length,
        found: Boolean(presence?.found), page: presence?.page ?? null, pagesScanned: presence?.pagesScanned ?? null
      }, { module: 'background', operation: 'archive-import', context: sessionCorrelationContext(session, { adId: newAdId, workerTabId }) }).catch(() => {});
      if (presence?.found) break;
    }
    if (!presence?.found) throw new Error(`Neue Anzeige ${newAdId} wurde im gebundenen Zielprofil unter „Meine Anzeigen“ nicht gefunden.`);
    if (legacyTargetBinding) {
      const profile = await ensureProfile(actualProfile);
      session.targetProfileId = profile.profileId;
      session.targetProfileName = profile.displayName;
      session.targetProfileBoundAt = session.targetProfileBoundAt || new Date().toISOString();
      expectedProfile = profile.displayName;
      await logDiagnostic('warning', 'ARCHIVE_INSERT_TARGET_PROFILE_ADOPTED_ON_RECOVERY', {
        archiveInsertionId: session.archiveInsertionId, targetProfileId: profile.profileId, newAdId
      }, { module: 'background', operation: 'archive-import', context: sessionCorrelationContext(session, { adId: newAdId, profileId: profile.profileId, workerTabId }) }).catch(() => {});
    }
    const editUrl = normalizeArchiveEditUrl(presence.editUrl, newAdId);
    if (!editUrl) throw new Error('Für die neue Anzeige wurde unter „Meine Anzeigen“ keine eindeutige Bearbeiten-URL erkannt.');
    session.newEditUrl = editUrl;
    session.newPublicUrl = /^https:\/\/(www\.)?kleinanzeigen\.de\/s-anzeige\//i.test(String(presence.publicUrl || '')) ? String(presence.publicUrl) : (session.newPublicUrl || '');
    session.foundAt = new Date().toISOString();
    session.foundPage = presence.page ?? null;
    session.foundPagesScanned = presence.pagesScanned ?? null;
    await persistArchiveInsertionSession(session);
    return { presence, actualProfile };
  } finally {
    if (workerTabId) await closeManagedWorkerTab(workerTabId).catch(() => {});
  }
}


async function verifyAndSaveArchiveInsertion(session, actualProfile, presence) {
  const newAdId = String(session.newAdId || '');
  const existingRecord = await getInventory(newAdId);
  if (existingRecord && String(existingRecord?.archiveImport?.archiveInsertionId || '') !== String(session.archiveInsertionId || '')) {
    throw new Error(`Inventar enthält bereits einen Datensatz mit der neuen Anzeigen-ID ${newAdId}; nichts wurde überschrieben.`);
  }

  let saved = existingRecord || null;
  let workerTabId = null;
  try {
    session.status = 'checking';
    session.stage = 'edit-checking';
    await persistArchiveInsertionSession(session);

    if (!saved) {
      const editUrl = normalizeArchiveEditUrl(presence?.editUrl || session.newEditUrl, newAdId);
      if (!editUrl) throw new Error('Für die neue Anzeige wurde unter „Meine Anzeigen“ keine eindeutige Bearbeiten-URL erkannt.');
      session.newEditUrl = editUrl;
      await persistArchiveInsertionSession(session);
      const windowId = await normalBrowserWindowId();
      const worker = await createManagedWorkerTab({ ...(windowId ? { windowId } : {}), url: editUrl, active: false }, 'archive-import-recheck', { ...correlationContext(session), ownerType: 'archive-insertion', ownerId: session.archiveInsertionId, adId: newAdId });
      if (!worker?.id) throw new Error('Bearbeiten-Prüfworker konnte nicht geöffnet werden.');
      workerTabId = worker.id;
      await waitForTabComplete(workerTabId, { timeoutMs: TAB_LOAD_TIMEOUT_RENEWAL_MS, purpose: 'archive-import-recheck', label: 'ZIP-Import-Bearbeiten-Worker', operation: 'archive-import', context: { archiveInsertionId: session.archiveInsertionId, adId: newAdId, workerTabId } });
      await assertArchiveEditTab(workerTabId, newAdId);
      await ensureContentConnection({ tabId: workerTabId });
      const deadline = Date.now() + BULK_RETRY_TIMEOUT_MS;
      let extracted = null;
      let lastReason = '';
      while (Date.now() < deadline) {
        try {
          extracted = await sendTabRequestWithBootstrap(workerTabId, { type: 'EXTRACT_CURRENT_AD' });
          if (String(extracted?.adId || '') === newAdId) break;
          lastReason = `Bearbeiten-Worker zeigt ${extracted?.adId || 'unbekannt'} statt ${newAdId}.`;
          extracted = null;
        } catch (error) { lastReason = String(error.message || error).slice(0, 300); }
        await delay(BULK_RETRY_POLL_MS);
      }
      if (!extracted) throw new Error(lastReason || 'Neue Anzeige konnte im Bearbeiten-Modus nicht ausgelesen werden.');
      const profile = await ensureProfile(actualProfile);
      extracted.profileId = profile.profileId;
      extracted.profileName = profile.displayName;
      extracted.recordKind = 'inventory';
      extracted.insertionMeta = archiveInsertionMeta(session);
      extracted.archiveImport = {
        archiveInsertionId: session.archiveInsertionId,
        archiveVersion: session.archiveVersion,
        exportedAt: session.exportedAt || null,
        sourceExtensionVersion: session.sourceExtensionVersion || null,
        sourceAdId: session.sourceAdId || null,
        sourceProfileName: session.sourceProfileName || null,
        targetProfileId: session.targetProfileId || profile.profileId || null,
        targetProfileName: session.targetProfileName || actualProfile || null,
        renewalMode: normalizeRenewalMode(session.renewalMode)
      };
      saved = await saveInventory(extracted);
      session.inventorySavedAt = new Date().toISOString();
    }

    const comparison = await compareArchiveInsertionRecords(session.sourceRecord, saved, { onlineConfirmed: true, ownAdsPresence: true });
    session.comparison = comparison;
    session.verifiedAt = comparison.status === 'match' ? new Date().toISOString() : null;
    session.inventorySavedAt = session.inventorySavedAt || new Date().toISOString();
    if (comparison.status !== 'match') {
      session.status = 'needs-review';
      session.stage = 'complete-with-discrepancies';
      session.failurePhase = 3;
      session.lastError = comparison.status === 'mismatch'
        ? `Die veröffentlichte Anzeige wurde ins Inventar aufgenommen, weicht aber in ${comparison.mismatches?.length || 0} Feld(ern) vom ZIP ab.`
        : 'Die veröffentlichte Anzeige wurde ins Inventar aufgenommen, konnte aber nicht in allen Feldern eindeutig gegen das ZIP bestätigt werden.';
      await persistArchiveInsertionSession(session);
      return saved;
    }

    session.status = 'saving';
    session.stage = 'inventory-saving';
    session.lastError = null;
    await persistArchiveInsertionSession(session);
    return saved;
  } finally {
    if (workerTabId) await closeManagedWorkerTab(workerTabId).catch(() => {});
  }
}


async function runArchiveInsertionPostPublish(archiveInsertionId) {
  const sessions = await readArchiveInsertionSessions();
  const session = sessions[String(archiveInsertionId || '')];
  if (!session) throw new Error('ZIP-Neuinserat-Sitzung wurde nicht gefunden.');
  try {
    const { presence, actualProfile } = await findArchivePublishedAd(session);
    if (normalizeRenewalMode(session.renewalMode) === RENEWAL_MODE_FAST) {
      session.status = 'saving';
      session.stage = 'inventory-saving';
      await persistArchiveInsertionSession(session);
      await promoteArchiveTemplateToInventory(session, presence, actualProfile);
    } else {
      const saved = await verifyAndSaveArchiveInsertion(session, actualProfile, presence);
      if (session.status === 'needs-review') {
        await deleteImagesByInventoryId(session.stagingInventoryId).catch(() => {});
        return archiveInsertionPublicSnapshot(session);
      }
      if (!saved) throw new Error('Neue Anzeige konnte nicht ins Inventar aufgenommen werden.');
    }
    session.status = 'complete';
    session.stage = 'complete';
    session.completedAt = new Date().toISOString();
    session.lastError = null;
    await persistArchiveInsertionSession(session);
    await deleteImagesByInventoryId(session.stagingInventoryId).catch(() => {});
    await setAppNotice({
      id: crypto.randomUUID(),
      event: 'archive-insertion-completed',
      archiveInsertionId: session.archiveInsertionId,
      newAdId: session.newAdId,
      renewalMode: normalizeRenewalMode(session.renewalMode),
      title: 'Aus ZIP neu inseriert',
      text: 'Die Anzeige wurde erfolgreich erstellt.'
    }).catch(() => {});
    await logDiagnostic('info', 'ARCHIVE_INSERT_COMPLETED', {
      archiveInsertionId: session.archiveInsertionId, newAdId: session.newAdId, renewalMode: normalizeRenewalMode(session.renewalMode)
    }, { module: 'background', operation: 'archive-import', context: sessionCorrelationContext(session, { adId: session.newAdId }) }).catch(() => {});
    broadcastInventoryChanged('archive-insertion-completed', { archiveInsertionId: session.archiveInsertionId, newAdId: session.newAdId });
    return archiveInsertionPublicSnapshot(session);
  } catch (error) {
    if (!['needs-review', 'complete'].includes(String(session.status || ''))) {
      session.failurePhase = session.newAdId ? (session.foundAt ? (normalizeRenewalMode(session.renewalMode) === RENEWAL_MODE_FAST ? 4 : 3) : 2) : 1;
      session.status = 'error';
      session.lastError = String(error.message || error).slice(0, 800);
      if (!String(session.stage || '').startsWith('error-')) session.stage = `error-phase-${session.failurePhase}`;
      await persistArchiveInsertionSession(session).catch(() => {});
    }
    await logDiagnostic('error', 'ARCHIVE_INSERT_FAILED', {
      archiveInsertionId: session.archiveInsertionId, newAdId: session.newAdId || null, failurePhase: session.failurePhase || null,
      message: String(error.message || error).slice(0, 700), stack: String(error.stack || '').slice(0, 2400)
    }, { module: 'background', operation: 'archive-import', context: { adId: session.newAdId || session.sourceAdId || null } }).catch(() => {});
    throw error;
  }
}


async function confirmPublishedArchiveInsertion(fill, detected) {
  const archiveInsertionId = String(fill?.archiveInsertionId || '');
  const sessions = await readArchiveInsertionSessions();
  const session = sessions[archiveInsertionId];
  if (!session) throw new Error('ZIP-Neuinserat-Sitzung wurde nicht gefunden.');
  const newAdId = String(detected?.adId || '');
  if (!/^\d+$/.test(newAdId)) throw new Error('Neue Anzeigen-ID konnte nicht eindeutig ermittelt werden.');
  if (session.newAdId && String(session.newAdId) !== newAdId) throw new Error('Ermittelte neue Anzeigen-ID widerspricht der bereits gespeicherten ID.');
  session.newAdId = newAdId;
  session.newPublicUrl = String(detected?.publicUrl || session.newPublicUrl || '');
  session.newIdConfirmedAt = session.newIdConfirmedAt || new Date().toISOString();
  session.status = 'published';
  session.stage = 'new-id-confirmed';
  await persistArchiveInsertionSession(session);
  await logDiagnostic('info', 'ARCHIVE_INSERT_NEW_ID_CONFIRMED', {
    archiveInsertionId: session.archiveInsertionId,
    sourceAdId: session.sourceAdId || null,
    newAdId,
    publicUrlAvailable: Boolean(session.newPublicUrl),
    detectionSource: detected?.detectionSource || detected?.kind || null,
    renewalMode: normalizeRenewalMode(session.renewalMode)
  }, { module: 'background', operation: 'archive-import-publish', context: { adId: newAdId, targetTabId: session.targetTabId } }).catch(() => {});
  const fillSessions = await readFillSessions();
  if (fillSessions[fill.fillId]) {
    fillSessions[fill.fillId].status = 'complete';
    fillSessions[fill.fillId].stage = 'new-id-confirmed';
    fillSessions[fill.fillId].updatedAt = new Date().toISOString();
    await writeFillSessions(fillSessions);
  }
  await closePublishedRenewalTargetTab({ targetTabId: session.targetTabId, newAdId, renewalId: null }).catch(() => {});
  session.targetTabId = null;
  await persistArchiveInsertionSession(session);
  void runArchiveInsertionPostPublish(archiveInsertionId).catch(() => {});
  return archiveInsertionPublicSnapshot(session);
}


      return Object.freeze({sha256BlobHex, compareArchiveInsertionRecords, assertArchiveStagingReady, resolveArchiveTargetProfile, promoteArchiveTemplateToInventory, normalizeArchiveEditUrl, assertArchiveEditTab, findArchivePublishedAd, verifyAndSaveArchiveInsertion, runArchiveInsertionPostPublish, confirmPublishedArchiveInsertion});
    }
  });
  globalThis.KRDeps?.register?.('KRArchiveInsertionVerificationService', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
