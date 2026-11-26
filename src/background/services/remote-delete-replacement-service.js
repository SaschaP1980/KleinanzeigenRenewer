(() => {
  'use strict';
  const legacyOutcomeBlocked = row => ['source-delete-outcome-unverified', 'source-delete-status-unverified', 'publish-intent-blocked'].includes(String(row?.stage || '')) || String(row?.status || '') === 'publish-blocked';
  const API = Object.freeze({
    create(options = {}) {
      const {
        readRenewalSessions, writeRenewalSessions, getBulkRunState, moveInventoryToTrash,
        readFillSessions, writeFillSessions, logDiagnostic, sessionCorrelationContext, broadcastInventoryChanged,
        openDatabase, isTrashRecord, normalizeRenewalMode, trashRecordFrom, getTrashRetentionConfiguration, persistRenewalSession,
        closeRegistryTab, createManagedWorkerTab, correlationContext, waitForTabComplete, ensureContentConnection,
        sendTabRequestWithBootstrap, normalizeProfileName, closeManagedWorkerTab, renewalMaxPhaseAttempts,
        isPhase4DeleteTransportInterruption, assertMassRenewalManualActionAllowed, getInventory, normalBrowserWindowId,
        renewalPhaseAttemptAvailable, renewalAttemptState, delay, renewalPhaseRetryDelayMs, resetRenewalPhaseAttempts, logRenewalPhaseAttemptStarted,
        logRenewalPhaseAttemptFailed, isNonRetryableRenewalSafetyError, renewalAttemptDetails, setAppNotice,
        markMassRenewalItemSucceeded, captureEmergencyResetGeneration, assertEmergencyResetGeneration
      } = options;
      const TRASH_RETENTION_MS = Number(options.TRASH_RETENTION_MS);
      const INVENTORY_STORE = String(options.INVENTORY_STORE || 'inventories');
      const IMAGE_STORE = String(options.IMAGE_STORE || 'images');
      const RENEWAL_MODE_FAST = String(options.RENEWAL_MODE_FAST || 'fast');
      const MY_ADS_PROJECTS_URL = String(options.MY_ADS_PROJECTS_URL || 'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS');
      const TAB_LOAD_TIMEOUT_PHASE4_MS = Number(options.TAB_LOAD_TIMEOUT_PHASE4_MS || 60000);
      const tabRegistry = options.tabRegistry;
      const TabRegistry = options.TabRegistry;
      const chrome = options.chromeApi || globalThis.chrome;
      const IDBKeyRange = options.IDBKeyRangeCtor || globalThis.IDBKeyRange;
      const captureResetGeneration = typeof captureEmergencyResetGeneration === 'function' ? captureEmergencyResetGeneration : (() => 0);
      const assertResetGeneration = typeof assertEmergencyResetGeneration === 'function' ? assertEmergencyResetGeneration : (() => true);

async function removeReplacementReadyLocal(message) {
  const renewalId = String(message?.renewalId || '');
  if (!renewalId) throw new Error('Renewal-ID fehlt.');
  const renewals = await readRenewalSessions();
  const renewal = renewals[renewalId];
  if (!renewal) throw new Error('Renewal-Vorgang wurde nicht gefunden.');
  if (legacyOutcomeBlocked(renewal)) throw Object.assign(new Error('Der frühere Löschvorgang ist ungeklärt.'), { code: 'KR_LEGACY_OUTCOME_UNRESOLVED' });
  if (String(renewal.status || '') !== 'verified' && String(renewal.stage || '') !== 'replacement-ready') {
    throw new Error('Nur ein verifizierter, austauschbereiter Renewal-Kandidat kann so aus dem Inventar entfernt werden.');
  }
  const active = await getBulkRunState().catch(() => null);
  if (active?.status === 'running' || active?.retryAdId) throw new Error('Während einer laufenden Erfassung oder einer einzelnen Wiederholung kann diese Anzeige nicht entfernt werden.');

  const candidateId = String(renewal.skeletonInventoryId || '');
  let trashedCandidate = null;
  if (candidateId) trashedCandidate = await moveInventoryToTrash(candidateId, 'renewal-candidate-removed', { renewalId, sourceAdId: renewal.sourceAdId || null, newAdId: renewal.newAdId || null });
  delete renewals[renewalId];
  await writeRenewalSessions(renewals);
  const fills = await readFillSessions().catch(() => ({}));
  let fillsChanged = false;
  for (const [fillId, fill] of Object.entries(fills)) {
    if (String(fill?.renewalId || '') === renewalId) { delete fills[fillId]; fillsChanged = true; }
  }
  if (fillsChanged) await writeFillSessions(fills);
  await logDiagnostic('info', 'RENEWAL_CANDIDATE_REMOVED_LOCAL', {
    renewalId, sourceInventoryId: renewal.sourceInventoryId || null, sourceAdId: renewal.sourceAdId || null, candidateInventoryId: candidateId || null, newAdId: renewal.newAdId || null
  }, { module: 'background', operation: 'renewal-local-remove', context: sessionCorrelationContext(renewal, { renewalId, adId: renewal.newAdId || null }) }).catch(() => {});
  broadcastInventoryChanged('renewal-candidate-removed-local', { inventoryId: candidateId || null, renewalId, sourceAdId: renewal.sourceAdId || null, newAdId: renewal.newAdId || null });
  return { removed: true, renewalId, candidateInventoryId: candidateId || null, trashed: Boolean(trashedCandidate), trashExpiresAt: trashedCandidate?.trash?.expiresAt || null };
}

async function recoverEmergencyResetCandidateAtomic(session) {
  const sourceId=String(session?.sourceInventoryId || '');
  const sourceAdId=String(session?.sourceAdId || '');
  const candidateId=String(session?.skeletonInventoryId || '');
  const targetId=String(session?.newAdId || '');
  const profileId=String(session?.profileId || '');
  if (String(session?.status || '')!=='cancelled'
      || String(session?.stage || '')!=='emergency-reset-unverified'
      || session?.remoteVerificationRequired!==true
      || !String(session?.emergencyResetAt || '')
      || !String(session?.newIdConfirmedAt || '') || !Number.isFinite(Date.parse(session.newIdConfirmedAt))
      || !(session?.comparison?.ownAdsPresence===true
        || (normalizeRenewalMode(session?.renewalMode)!==RENEWAL_MODE_FAST
          && session?.comparison?.status==='match' && session?.lastOwnAdsPresence===true))
      || !/^\d+$/.test(sourceAdId) || !/^\d+$/.test(targetId)
      || sourceAdId===targetId || sourceId===targetId
      || !sourceId || candidateId===sourceId || candidateId!==`renewal:${String(session?.renewalId || '')}`
      || !String(session?.renewalId || '') || !profileId) {
    throw new Error('KAR199_RECOVERY_NOT_ELIGIBLE: Abbruch ist nicht eindeutig als bestätigte neue Anzeige nachgewiesen.');
  }
  const db=await openDatabase();
  const recoveredAt=new Date().toISOString();
  let outcome;
  try {
    outcome=await new Promise((resolve,reject)=>{
      const tx=db.transaction([INVENTORY_STORE,IMAGE_STORE],'readwrite');
      const inventories=tx.objectStore(INVENTORY_STORE);
      const images=tx.objectStore(IMAGE_STORE);
      let failure=null;
      let candidate=null,source=null,destination=null,loaded=0,started=false,result=null;
      const abort=error=>{
        failure=error instanceof Error?error:new Error(String(error));
        try {tx.abort();} catch {} 
      };
      tx.onerror=()=>{failure ||= tx.error;};
      tx.onabort=()=>reject(failure || tx.error || new Error('KAR199_RECOVERY_ATOMIC_ABORT'));
      tx.oncomplete=()=>resolve(result);
      function processLoaded() {
        if (++loaded!==3 || started) return;
        started=true;
        try {
          if (destination) {
            if (!candidate && destination.recordKind==='inventory'
                && destination.recovery?.kind==='emergency-reset-candidate'
                && destination.recovery?.renewalId===String(session.renewalId)
                && destination.recovery?.sourceAdId===sourceAdId
                && String(destination.profileId || '')===profileId
                && String(destination.adId || '')===targetId) {
              result={recovered:true,alreadyRecovered:true,inventoryId:targetId};
              return;
            }
            throw new Error('KAR199_RECOVERY_COLLISION: Für die neue Anzeigen-ID existiert bereits ein anderer Inventareintrag.');
          }
          if (!source || source.recordKind!=='inventory'
              || String(source.adId || '')!==sourceAdId
              || String(source.profileId || '')!==profileId || isTrashRecord(source))
            throw new Error('KAR199_RECOVERY_SOURCE_MISMATCH: Original ist nicht eindeutig als regulärer Inventareintrag vorhanden.');
          if (!candidate || candidate.recordKind!=='renewal-candidate'
              || String(candidate.adId || '')!==targetId
              || String(candidate.profileId || '')!==profileId
              || String(candidate.renewal?.renewalId || '')!==String(session.renewalId)
              || String(candidate.renewal?.sourceAdId || '')!==sourceAdId
              || String(candidate.renewal?.newAdId || '')!==targetId
              || String(candidate.renewal?.status || '')!=='verified')
            throw new Error('KAR199_RECOVERY_CANDIDATE_MISMATCH: Verifizierter Renewal-Kandidat stimmt nicht mit dem Reset überein.');
          const refs=Array.isArray(candidate.images)?candidate.images:[];
          const explicitlyEmpty=Array.isArray(candidate.images) && candidate.images.length===0
            && candidate.extraction?.imageSetExplicitlyEmpty===true
            && Array.isArray(source.images) && source.images.length===0
            && source.extraction?.imageSetExplicitlyEmpty===true;
          if ((!refs.length && !explicitlyEmpty) || refs.some(image=>!String(image?.imageKey || '')))
            throw new Error('KAR199_RECOVERY_IMAGE_MISSING: Bildreferenzen sind nicht vollständig.');
          const fastMode=normalizeRenewalMode(session.renewalMode)===RENEWAL_MODE_FAST;
          const imageOwnerId=fastMode?sourceId:candidateId;
          const rows=[],cursor=images.index('inventoryId').openCursor(IDBKeyRange.only(imageOwnerId));
          cursor.onerror=()=>abort(cursor.error || new Error('KAR199_RECOVERY_IMAGE_READ_FAILED'));
          cursor.onsuccess=()=>{
            try {
              const current=cursor.result;
              if (current) {rows.push(current.value);current.continue();return;}
              const sourceByKey=new Map(rows.map(row=>[String(row.imageKey),row]));
              const targetKeys=new Set();
              const copied=[];
              const nextImages=[];
              for (let i=0;i<refs.length;i++) {
                const ref=refs[i];
                const row=sourceByKey.get(String(ref.imageKey || ''));
                if (!row || row.blob==null)
                  throw new Error('KAR199_RECOVERY_IMAGE_MISSING: Mindestens ein lokales Bild fehlt.');
                const position=Number.isSafeInteger(Number(ref.position)) && Number(ref.position)>=0
                  ? Number(ref.position) : i;
                const key=`${targetId}:${position}`;
                if (targetKeys.has(key))
                  throw new Error('KAR199_RECOVERY_IMAGE_COLLISION: Bildposition ist nicht eindeutig.');
                targetKeys.add(key);
                copied.push({...row,imageKey:key,inventoryId:targetId,position});
                nextImages.push({...ref,imageKey:key,position,locallyStored:true});
              }
              // No stale or foreign image row may be overwritten at the new ID.
              const collision=images.index('inventoryId').openCursor(IDBKeyRange.only(targetId));
              collision.onerror=()=>abort(collision.error || new Error('KAR199_RECOVERY_IMAGE_COLLISION'));
              collision.onsuccess=()=>{
                try {
                  if (collision.result) throw new Error('KAR199_RECOVERY_IMAGE_COLLISION: Zielbildschlüssel ist bereits belegt.');
                  // add, not put: a foreign row with the same primary key must abort too.
                  for (const row of copied) images.add(row);
                  if (!fastMode) for (const row of rows) images.delete(row.imageKey);
                  const independent={
                    ...candidate,
                    inventoryId:targetId,
                    adId:targetId,
                    recordKind:'inventory',
                    images:nextImages,
                    recovery:{
                      kind:'emergency-reset-candidate',
                      renewalId:String(session.renewalId),
                      sourceAdId,
                      recoveredAt,
                      remoteVerification:'unverified'
                    }
                  };
                  delete independent.renewal;
                  inventories.put(independent);
                  inventories.delete(candidateId);
                  result={recovered:true,alreadyRecovered:false,inventoryId:targetId,imageCount:copied.length};
                } catch(error) {abort(error);}
              };
            } catch(error) {abort(error);}
          };
        } catch(error) {abort(error);}
      }
      for(const [key,assign] of [
        [candidateId,value=>{candidate=value;}],
        [sourceId,value=>{source=value;}],
        [targetId,value=>{destination=value;}]
      ]) {
        const request=inventories.get(key);
        request.onerror=()=>abort(request.error || new Error('KAR199_RECOVERY_INVENTORY_READ_FAILED'));
        request.onsuccess=()=>{assign(request.result || null);processLoaded();};
      }
    });
  } finally {db.close();}
  if(outcome?.recovered && !outcome.alreadyRecovered) {
    try {broadcastInventoryChanged('renewal-emergency-candidate-recovered',{
      inventoryId:targetId,sourceInventoryId:sourceId,renewalId:String(session.renewalId)
    });} catch {} // A UI event may fail after a successfully committed IDB transaction.
    void Promise.resolve().then(()=>logDiagnostic('warning','RENEWAL_EMERGENCY_CANDIDATE_RECOVERED',{
      renewalId:String(session.renewalId),sourceAdId,newAdId:targetId,
      imageCount:outcome.imageCount,remoteVerified:false,sourceTrashed:false
    },{module:'background',operation:'renewal-emergency-recovery'})).catch(()=>{});
    await setAppNotice({
      id:crypto.randomUUID(),kind:'warning',event:'renewal-emergency-candidate-recovered',
      title:'Austausch abgebrochen – beide Anzeigen gesichert',
      text:'Original und neue Anzeige sind jetzt getrennte Inventareinträge. Der aktuelle Online-Status beider Anzeigen wurde beim lokalen Reset nicht erneut geprüft. Diese lokale Wiederherstellung löscht keine Anzeigen.',
      renewalId:String(session.renewalId),sourceAdId,newAdId:targetId
    }).catch(()=>{});
  }
  return outcome;
}

async function promoteRenewalCandidateAtomic(session) {
  const sourceInventoryId = String(session?.sourceInventoryId || '');
  const candidateInventoryId = String(session?.skeletonInventoryId || '');
  const newAdId = String(session?.newAdId || '');
  if (!sourceInventoryId || !candidateInventoryId || !/^\d+$/.test(newAdId)) throw new Error('Renewal-Daten für den Inventarwechsel sind unvollständig.');
  if (sourceInventoryId === newAdId) throw new Error('Quell- und Ziel-Inventar-ID dürfen beim Austausch nicht identisch sein.');
  const trashedAt = new Date();
  // Retention metadata must not block promotion after independently verified deletion.
  if (typeof getTrashRetentionConfiguration === 'function') await getTrashRetentionConfiguration().catch(() => null);
  let trashExpiresAt = null;
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction([INVENTORY_STORE, IMAGE_STORE], 'readwrite');
      let failure = null;
      let candidate = null;
      let source = null;
      let candidateLoaded = false;
      let sourceLoaded = false;
      let processingStarted = false;
      tx.onerror = () => { failure ||= tx.error; };
      tx.onabort = () => reject(failure || tx.error || new Error('Atomarer Inventarwechsel wurde abgebrochen.'));
      tx.oncomplete = () => resolve({ inventoryId: newAdId, adId: newAdId, trashInventoryId: sourceInventoryId, trashExpiresAt });
      const inventories = tx.objectStore(INVENTORY_STORE);
      const images = tx.objectStore(IMAGE_STORE);

      const maybeProcess = () => {
        if (processingStarted || !candidateLoaded || !sourceLoaded) return;
        processingStarted = true;
        try {
          if (!candidate) throw new Error('Verifizierter Renewal-Kandidat wurde lokal nicht gefunden.');
          if (!source) throw new Error('Quell-Inventareintrag wurde lokal nicht gefunden; Sicherheitskopie im Papierkorb kann nicht erstellt werden.');
          if (isTrashRecord(source)) throw new Error('Quell-Inventareintrag befindet sich bereits im Papierkorb.');
          if (String(candidate.adId || '') !== newAdId) throw new Error('Neue Anzeigen-ID des Kandidaten stimmt nicht mit der Renewal-Sitzung überein.');
          const collisionReq = inventories.get(newAdId);
          collisionReq.onerror = () => { failure = collisionReq.error; tx.abort(); };
          collisionReq.onsuccess = () => {
            try {
              if (collisionReq.result && String(collisionReq.result.inventoryId || '') !== candidateInventoryId) throw new Error('Für die neue Anzeigen-ID existiert bereits ein anderer Inventareintrag.');
              const fastMode = normalizeRenewalMode(session?.renewalMode) === RENEWAL_MODE_FAST;
              // Safe-Mode moves the freshly downloaded candidate image rows. Fast-Mode
              // deliberately skips Phase 2, so the candidate still references the immutable
              // source image keys. Clone those blobs for the new inventory id and leave the
              // originals untouched so the 30-day trash copy remains complete.
              const imageOwnerId = fastMode ? sourceInventoryId : candidateInventoryId;
              const imageRows = [];
              const cursorReq = images.index('inventoryId').openCursor(IDBKeyRange.only(imageOwnerId));
              cursorReq.onerror = () => { failure = cursorReq.error; tx.abort(); };
              cursorReq.onsuccess = () => {
                try {
                  const cursor = cursorReq.result;
                  if (cursor) { imageRows.push(cursor.value); cursor.continue(); return; }
                  const imageKeyMap = new Map();
                  for (const row of imageRows) {
                    const nextKey = `${newAdId}:${Number(row.position || 0)}`;
                    imageKeyMap.set(String(row.imageKey), nextKey);
                    if (!fastMode) images.delete(row.imageKey);
                    images.put({ ...row, imageKey: nextKey, inventoryId: newAdId });
                  }
                  const promoted = {
                    ...candidate,
                    inventoryId: newAdId,
                    recordKind: 'inventory',
                    images: (candidate.images || []).map(image => ({ ...image, imageKey: imageKeyMap.get(String(image.imageKey)) || `${newAdId}:${Number(image.position || 0)}` }))
                  };
                  delete promoted.renewal;
                  const trashedSource = trashRecordFrom(source, 'renewal-replaced', {
                    renewalId: session.renewalId || null,
                    sourceAdId: session.sourceAdId || source.adId || null,
                    replacementAdId: newAdId
                  }, trashedAt);
                  trashExpiresAt = trashedSource.trash?.expiresAt || null;
                  inventories.put(trashedSource);
                  if (candidateInventoryId !== newAdId) inventories.delete(candidateInventoryId);
                  inventories.put(promoted);
                } catch (error) { failure = error; tx.abort(); }
              };
            } catch (error) { failure = error; tx.abort(); }
          };
        } catch (error) { failure = error; tx.abort(); }
      };

      const candidateReq = inventories.get(candidateInventoryId);
      candidateReq.onerror = () => { failure = candidateReq.error; tx.abort(); };
      candidateReq.onsuccess = () => { candidate = candidateReq.result || null; candidateLoaded = true; maybeProcess(); };
      const sourceReq = inventories.get(sourceInventoryId);
      sourceReq.onerror = () => { failure = sourceReq.error; tx.abort(); };
      sourceReq.onsuccess = () => { source = sourceReq.result || null; sourceLoaded = true; maybeProcess(); };
    });
  } finally { db.close(); }
}

function renewalTargetTabStillOwned(tab, session) {
  const expectedId = Number(session?.targetTabId || 0);
  if (!expectedId || Number(tab?.id || 0) !== expectedId) return false;
  try {
    const url = new URL(String(tab?.url || ''));
    if (!/(^|\.)kleinanzeigen\.de$/i.test(url.hostname)) return false;
    return url.pathname.startsWith('/p-anzeige-aufgeben');
  } catch { return false; }
}

function renewalPublishedTargetTabStillOwned(tab, session) {
  const expectedId = Number(session?.targetTabId || 0);
  if (!expectedId || Number(tab?.id || 0) !== expectedId) return false;
  try {
    const url = new URL(String(tab?.url || ''));
    return /(^|\.)kleinanzeigen\.de$/i.test(url.hostname);
  } catch { return false; }
}

async function closePublishedRenewalTargetTab(session) {
  const targetTabId = Number(session?.targetTabId || 0) || null;
  if (!targetTabId || !/^\d+$/.test(String(session?.newAdId || ''))) return { attempted: false, closed: false, reason: 'not-ready' };
  try {
    const tab = await tabRegistry.getTabOrThrow(targetTabId, chrome.tabs, { label: 'Renewal-Zieltab', allowDiscarded: true });
    if (!renewalPublishedTargetTabStillOwned(tab, session)) {
      await logDiagnostic('warning', 'RENEWAL_PUBLISHED_TARGET_TAB_CLEANUP_SKIPPED', {
        renewalId: session?.renewalId || null,
        targetTabId,
        url: tab?.url || null,
        reason: 'tab-no-longer-owned'
      }, { module: 'background', operation: 'renewal-target-cleanup', context: sessionCorrelationContext(session, { renewalId: session?.renewalId || null, targetTabId }) }).catch(() => {});
      return { attempted: true, closed: false, reason: 'tab-no-longer-owned' };
    }
    await closeRegistryTab(targetTabId, 'renewal-target-published', 'Renewal-Zieltab');
    await logDiagnostic('info', 'RENEWAL_PUBLISHED_TARGET_TAB_CLOSED', {
      renewalId: session?.renewalId || null,
      targetTabId,
      newAdId: session?.newAdId || null
    }, { module: 'background', operation: 'renewal-target-cleanup', context: sessionCorrelationContext(session, { renewalId: session?.renewalId || null, targetTabId }) }).catch(() => {});
    return { attempted: true, closed: true, reason: 'new-id-confirmed' };
  } catch (error) {
    const text = String(error?.message || error || '');
    if (TabRegistry.isGoneError(error)) return { attempted: true, closed: false, reason: 'already-closed' };
    await logDiagnostic('warning', 'RENEWAL_PUBLISHED_TARGET_TAB_CLEANUP_FAILED', {
      renewalId: session?.renewalId || null,
      targetTabId,
      message: text.slice(0, 500)
    }, { module: 'background', operation: 'renewal-target-cleanup', context: sessionCorrelationContext(session, { renewalId: session?.renewalId || null, targetTabId }) }).catch(() => {});
    return { attempted: true, closed: false, reason: 'cleanup-error' };
  }
}

async function retirePublishedRenewalTargetTab(session) {
  const targetTabId = Number(session?.targetTabId || 0) || null;
  const cleanup = await closePublishedRenewalTargetTab(session);
  if (!targetTabId || !['new-id-confirmed', 'already-closed'].includes(String(cleanup?.reason || ''))) return cleanup;

  session.targetTabId = null;
  session.targetTabClosedAfterPublishAt = session.targetTabClosedAfterPublishAt || new Date().toISOString();
  await persistRenewalSession(session);

  const fills = await readFillSessions().catch(() => ({}));
  const fill = session.fillId ? fills[session.fillId] : null;
  if (fill && Number(fill.targetTabId || 0) === targetTabId && !['waiting', 'running'].includes(String(fill.status || ''))) {
    fill.targetTabId = null;
    fill.targetTabClosedAfterPublishAt = fill.targetTabClosedAfterPublishAt || session.targetTabClosedAfterPublishAt;
    fill.updatedAt = new Date().toISOString();
    fills[fill.fillId] = fill;
    await writeFillSessions(fills);
  }
  return cleanup;
}

async function closeCompletedRenewalTargetTab(session) {
  const targetTabId = Number(session?.targetTabId || 0) || null;
  if (!targetTabId) return { attempted: false, closed: false, reason: 'no-target-tab' };
  try {
    const tab = await tabRegistry.getTabOrThrow(targetTabId, chrome.tabs, { label: 'Renewal-Zieltab', allowDiscarded: true });
    if (!renewalTargetTabStillOwned(tab, session)) {
      await logDiagnostic('warning', 'RENEWAL_TARGET_TAB_CLEANUP_SKIPPED', { renewalId: session?.renewalId || null, targetTabId, url: tab?.url || null, reason: 'tab-no-longer-on-renewal-flow' }, { module: 'background', operation: 'renewal-target-cleanup', context: sessionCorrelationContext(session, { renewalId: session?.renewalId || null, targetTabId }) }).catch(() => {});
      return { attempted: true, closed: false, reason: 'tab-no-longer-on-renewal-flow' };
    }
    await closeRegistryTab(targetTabId, 'renewal-target-completed', 'Renewal-Zieltab');
    await logDiagnostic('info', 'RENEWAL_TARGET_TAB_CLOSED', { renewalId: session?.renewalId || null, targetTabId }, { module: 'background', operation: 'renewal-target-cleanup', context: sessionCorrelationContext(session, { renewalId: session?.renewalId || null, targetTabId }) }).catch(() => {});
    return { attempted: true, closed: true, reason: 'completed-renewal' };
  } catch (error) {
    const text = String(error?.message || error || '');
    if (TabRegistry.isGoneError(error)) return { attempted: true, closed: false, reason: 'already-closed' };
    await logDiagnostic('warning', 'RENEWAL_TARGET_TAB_CLEANUP_FAILED', { renewalId: session?.renewalId || null, targetTabId, message: text.slice(0, 500) }, { module: 'background', operation: 'renewal-target-cleanup', context: sessionCorrelationContext(session, { renewalId: session?.renewalId || null, targetTabId }) }).catch(() => {});
    return { attempted: true, closed: false, reason: 'cleanup-error' };
  }
}

async function verifyRenewalSourceAbsenceFresh(session, expectedProfile, windowId, attemptState, purpose = 'post-delete') {
  let verificationTabId = null;
  try {
    const workerKind = purpose === 'pre-delete' ? 'renewal-phase4-preverify' : 'renewal-phase4-verify';
    const verifyTab = await createManagedWorkerTab({ ...(windowId ? { windowId } : {}), url: MY_ADS_PROJECTS_URL, active: false }, workerKind, {
      ...correlationContext(session),
      ownerType: 'renewal',
      ownerId: session.renewalId,
      adId: session.sourceAdId,
      phaseAttemptId: attemptState?.attemptId || null
    });
    if (!verifyTab?.id) throw new Error('Löschverifikations-Worker konnte nicht geöffnet werden.');
    verificationTabId = verifyTab.id;
    await waitForTabComplete(verificationTabId, {
      timeoutMs: TAB_LOAD_TIMEOUT_PHASE4_MS,
      purpose: purpose === 'pre-delete' ? 'renewal-phase4-preverify' : 'renewal-phase4-verify',
      label: purpose === 'pre-delete' ? 'Phase-4-Vorprüfung' : 'Phase-4-Verifikations-Worker',
      operation: 'renewal-phase-4',
      context: sessionCorrelationContext(session, {
        renewalId: session.renewalId,
        adId: session.sourceAdId,
        workerTabId: verificationTabId,
        phaseAttempt: attemptState?.attempt || null,
        phaseAttemptId: attemptState?.attemptId || null
      })
    });
    await ensureContentConnection({ tabId: verificationTabId });
    const verifyStatus = await sendTabRequestWithBootstrap(verificationTabId, { type: 'MY_ADS_STATUS' });
    const verifyProfile = normalizeProfileName(verifyStatus?.profileName || '');
    if (!verifyStatus?.isMyAdsPage || !verifyStatus?.isProjectsTab) throw new Error('Die Löschverifikation befindet sich nicht eindeutig in „Meine Anzeigen“ / PROJECTS.');
    if (!verifyProfile) throw new Error('Das Kleinanzeigen-Konto konnte während der Löschverifikation nicht eindeutig erkannt werden.');
    if (expectedProfile.toLocaleLowerCase('de-DE') !== verifyProfile.toLocaleLowerCase('de-DE')) {
      throw new Error('Das aktuell angemeldete Kleinanzeigen-Konto wechselte während der Löschverifikation.');
    }

    const verification = await sendTabRequestWithBootstrap(verificationTabId, {
      type: 'VERIFY_OWN_AD_ABSENT_BY_ID',
      adId: String(session.sourceAdId),
      correlation: correlationContext(session)
    });

    await logDiagnostic(verification?.verified ? 'info' : 'warning', purpose === 'pre-delete' ? 'RENEWAL_PHASE4_PREDELETE_VERIFICATION' : 'RENEWAL_SOURCE_DELETE_VERIFICATION_ATTEMPT', {
      renewalId: session.renewalId,
      sourceAdId: session.sourceAdId,
      newAdId: session.newAdId,
      attempt: attemptState?.attempt || null,
      maxAttempts: renewalMaxPhaseAttempts(session),
      attemptId: attemptState?.attemptId || null,
      verifiedAbsent: Boolean(verification?.verified),
      foundPage: verification?.foundPage ?? null,
      pagesScanned: verification?.pagesScanned ?? null,
      purpose
    }, {
      module: 'background',
      operation: 'renewal-phase-4',
      context: sessionCorrelationContext(session, { renewalId: session.renewalId, adId: session.sourceAdId, workerTabId: verificationTabId })
    }).catch(() => {});
    return verification;
  } finally {
    if (verificationTabId) await closeManagedWorkerTab(verificationTabId).catch(() => {});
  }
}

async function preverifyAndTriggerRenewalSourceDeleteAttempt(session, expectedProfile, windowId, attemptState, resetGeneration, onDispatch) {
  let deleteTabId = null;
  let deletion = null;
  let transportInterrupted = false;
  try {
    const deleteTab = await createManagedWorkerTab({ ...(windowId ? { windowId } : {}), url: MY_ADS_PROJECTS_URL, active: false }, 'renewal-phase4-delete', {
      ...correlationContext(session),
      ownerType: 'renewal',
      ownerId: session.renewalId,
      adId: session.sourceAdId,
      phaseAttemptId: attemptState?.attemptId || null
    });
    if (!deleteTab?.id) throw new Error('„Meine Anzeigen“-Worker konnte nicht geöffnet werden.');
    deleteTabId = deleteTab.id;
    await waitForTabComplete(deleteTabId, {
      timeoutMs: TAB_LOAD_TIMEOUT_PHASE4_MS,
      purpose: 'renewal-phase4-preverify-delete',
      label: 'Phase-4-Vorprüfungs-/Lösch-Worker',
      operation: 'renewal-phase-4',
      context: sessionCorrelationContext(session, {
        renewalId: session.renewalId,
        adId: session.sourceAdId,
        workerTabId: deleteTabId,
        phaseAttempt: attemptState?.attempt || null,
        phaseAttemptId: attemptState?.attemptId || null
      })
    });
    await ensureContentConnection({ tabId: deleteTabId });

    const status = await sendTabRequestWithBootstrap(deleteTabId, { type: 'MY_ADS_STATUS' });
    const actualProfile = normalizeProfileName(status?.profileName || '');
    if (!status?.isMyAdsPage || !status?.isProjectsTab) throw new Error('Phase 4 konnte die Ansicht „Meine Anzeigen“ / PROJECTS nicht eindeutig bestätigen.');
    if (!actualProfile) throw new Error('Das aktuell angemeldete Kleinanzeigen-Konto konnte für Phase 4 nicht eindeutig erkannt werden.');
    if (expectedProfile.toLocaleLowerCase('de-DE') !== actualProfile.toLocaleLowerCase('de-DE')) {
      throw new Error('Das aktuell angemeldete Kleinanzeigen-Konto entspricht nicht dem Inventarprofil der Quellanzeige.');
    }

    await logDiagnostic('info', 'RENEWAL_PHASE4_ATOMIC_PREVERIFY_DELETE_STARTED', {
      renewalId: session.renewalId,
      sourceAdId: session.sourceAdId,
      newAdId: session.newAdId,
      attempt: attemptState?.attempt || null,
      maxAttempts: renewalMaxPhaseAttempts(session),
      attemptId: attemptState?.attemptId || null,
      safetyModel: 'same-fresh-worker-full-scan-before-delete'
    }, {
      module: 'background',
      operation: 'renewal-phase-4',
      context: sessionCorrelationContext(session, { renewalId: session.renewalId, adId: session.sourceAdId, workerTabId: deleteTabId })
    }).catch(() => {});

    try {
      assertResetGeneration(resetGeneration, 'renewal-phase4-before-delete');
      if (typeof onDispatch === 'function') onDispatch();
      deletion = await sendTabRequestWithBootstrap(deleteTabId, {
        type: 'DELETE_OWN_AD_BY_ID',
        adId: String(session.sourceAdId),
        correlation: correlationContext(session)
      });
    } catch (error) {
      if (!isPhase4DeleteTransportInterruption(error)) throw error;
      transportInterrupted = true;
      await logDiagnostic('info', 'RENEWAL_SOURCE_DELETE_TRANSPORT_INTERRUPTED', {
        renewalId: session.renewalId,
        sourceAdId: session.sourceAdId,
        newAdId: session.newAdId,
        attempt: attemptState?.attempt || null,
        maxAttempts: renewalMaxPhaseAttempts(session),
        attemptId: attemptState?.attemptId || null,
        message: String(error.message || error).slice(0, 600),
        interpretation: 'delete-outcome-unknown-verify-independently'
      }, {
        module: 'background',
        operation: 'renewal-phase-4',
        context: sessionCorrelationContext(session, { renewalId: session.renewalId, adId: session.sourceAdId, workerTabId: deleteTabId })
      }).catch(() => {});
    }

    return { deletion, transportInterrupted };
  } finally {
    if (deleteTabId) await closeManagedWorkerTab(deleteTabId).catch(() => {});
  }
}

async function finishRenewalReplacement(message) {
  const resetGeneration = captureResetGeneration();
  await assertMassRenewalManualActionAllowed(message);
  assertResetGeneration(resetGeneration, 'renewal-phase4-start');
  const renewalId = String(message?.renewalId || '');
  if (!renewalId) throw new Error('Renewal-ID fehlt.');
  const renewals = await readRenewalSessions();
  const session = renewals[renewalId];
  if (!session) throw new Error('Renewal-Vorgang wurde nicht gefunden.');
  if (legacyOutcomeBlocked(session)) throw Object.assign(new Error('Der frühere Löschvorgang ist ungeklärt. Bitte beide Anzeigen unabhängig prüfen; keine erneute Löschung.'), { code: 'KR_LEGACY_OUTCOME_UNRESOLVED' });
  let readOnlyResolutionRequired = String(session.stage || '').startsWith('source-delete')
    || Boolean(session.sourceDeleteTransportInterrupted || session.sourceDeleteAction
      || session.sourceDeleteVerificationPendingAt || session.sourceDeletedAt);
  // A read-only recovery consent must never be widened by a stale UI snapshot.
  if (message?.verificationOnly === true && !readOnlyResolutionRequired) {
    throw new Error('Der Status der Anzeige hat sich geändert. Bitte das Inventar aktualisieren und die Aktion erneut prüfen.');
  }
  const explicitPhase4Retry = message?.type === 'FINISH_RENEWAL_REPLACEMENT' || message?.massBatchRetry === true;
  if (explicitPhase4Retry && session.phase4AttemptsExhaustedAt && !renewalPhaseAttemptAvailable(session, 4)) {
    resetRenewalPhaseAttempts(session, [4]);
    session.phase4AttemptsExhaustedAt = null;
    session.lastError = null;
    await persistRenewalSession(session);
    await logDiagnostic('info', 'RENEWAL_PHASE4_EXPLICIT_RETRY_RESET', {
      renewalId,
      sourceAdId: session.sourceAdId,
      newAdId: session.newAdId,
      maxAttempts: renewalMaxPhaseAttempts(session),
      source: message?.massBatchRetry === true ? 'mass-batch-retry' : 'user-action'
    }, { module: 'background', operation: 'renewal-phase-4', context: sessionCorrelationContext(session, { renewalId, adId: session.sourceAdId }) }).catch(() => {});
  }
  if (String(session.status || '') !== 'verified' && String(session.stage || '') !== 'replacement-ready' && !String(session.stage || '').startsWith('source-delete')) {
    throw new Error('Austausch kann nur für einen vollständig verifizierten Renewal-Kandidaten abgeschlossen werden.');
  }
  const source = await getInventory(session.sourceInventoryId);
  const candidate = await getInventory(session.skeletonInventoryId);
  if (!source) throw new Error('Quell-Inventareintrag wurde lokal nicht gefunden; der 30-Tage-Papierkorb kann nicht sicher erstellt werden.');
  if (!candidate) throw new Error('Verifizierter Renewal-Kandidat wurde lokal nicht gefunden.');
  if (!/^\d+$/.test(String(session.sourceAdId || '')) || !/^\d+$/.test(String(session.newAdId || candidate.adId || ''))) throw new Error('Quell- oder Ziel-Anzeigen-ID ist ungültig.');
  if (String(candidate.adId || '') !== String(session.newAdId || '')) throw new Error('Kandidat und Renewal-Sitzung besitzen unterschiedliche neue Anzeigen-IDs.');

  const run = await getBulkRunState().catch(() => null);
  if (run?.status === 'running' || run?.retryAdId) throw new Error('Der Austausch kann während einer laufenden Erfassung oder einer einzelnen Wiederholung nicht abgeschlossen werden.');

  const expectedProfile = normalizeProfileName(source?.profileName || candidate?.profileName || '');
  if (!expectedProfile) throw new Error('Die Quellanzeige besitzt keinen bestätigten Profilbezug; Phase 4 wird aus Sicherheitsgründen nicht ausgeführt.');

  // A prior dispatch may have succeeded even without a reply or persisted result.
  // Persist the existing pending marker together with the existing pre-dispatch write:
  // a worker restart (or the generic failure handler resetting the stage) cannot erase it.
  session.status = 'verified';
  session.stage = 'source-delete-started';
  session.lastError = null;
  session.autoReplacementFailedAt = null;
  session.sourceDeleteVerificationPendingAt ||= new Date().toISOString();
  await persistRenewalSession(session);

  const windowId = await normalBrowserWindowId();
  let verification = null;
  let deletion = session.sourceDeleteAction || null;
  let deleteTransportInterrupted = Boolean(session.sourceDeleteTransportInterrupted);
  let lastError = null;

  while (renewalPhaseAttemptAvailable(session, 4)) {
    const previousAttempt = renewalAttemptState(session, 4).attempt;
    if (previousAttempt > 0) await delay(renewalPhaseRetryDelayMs(previousAttempt + 1));
    const attemptState = await logRenewalPhaseAttemptStarted(session, 4, 'RENEWAL_PHASE4_ATTEMPT_STARTED', 'renewal-phase-4', {
      safetyModel: 'atomic-preverify-delete-independent-postverify'
    });

    try {
      if (!readOnlyResolutionRequired) {
        // DELETE_OWN_AD_BY_ID already performs a fresh full-pagination scan in this
        // worker before it can resolve a delete control. If the source is already
        // absent, it performs no delete action. This makes preverify + delete atomic
        // in one fresh worker while preserving the independent post-delete full scan.
        const result = await preverifyAndTriggerRenewalSourceDeleteAttempt(session, expectedProfile, windowId, attemptState, resetGeneration, () => {
          // Only a failure proven to precede dispatch may retry the destructive path.
          readOnlyResolutionRequired = true;
        });
        assertResetGeneration(resetGeneration, 'renewal-phase4-after-delete');
        deletion = result.deletion || deletion || null;
        deleteTransportInterrupted = deleteTransportInterrupted || Boolean(result.transportInterrupted);

        session.stage = 'source-delete-verification-pending';
        session.sourceDeleteAction = deletion || null;
        session.sourceDeleteTransportInterrupted = deleteTransportInterrupted;
        session.sourceDeleteVerificationPendingAt = new Date().toISOString();
        await persistRenewalSession(session);

        await logDiagnostic('info', 'RENEWAL_SOURCE_DELETE_VERIFICATION_PENDING', {
          renewalId,
          sourceAdId: session.sourceAdId,
          newAdId: session.newAdId,
          attempt: attemptState.attempt,
          maxAttempts: renewalMaxPhaseAttempts(session),
          attemptId: attemptState.attemptId,
          actionTriggered: result.deletion?.actionTriggered ?? null,
          alreadyAbsentCandidate: result.deletion?.alreadyAbsentCandidate ?? null,
          transportInterrupted: Boolean(result.transportInterrupted),
          page: result.deletion?.page ?? null,
          pagesScanned: result.deletion?.pagesScanned ?? null,
          localEvidence: result.deletion?.localEvidence || null,
          feedbackType: result.deletion?.feedback?.type || null,
          feedbackMethod: result.deletion?.feedback?.method || null
        }, {
          module: 'background',
          operation: 'renewal-phase-4',
          context: sessionCorrelationContext(session, { renewalId, adId: session.sourceAdId })
        }).catch(() => {});

      } else {
        await logDiagnostic('info', 'RENEWAL_SOURCE_DELETE_READONLY_RECOVERY', {
          renewalId, sourceAdId: session.sourceAdId, newAdId: session.newAdId,
          attempt: attemptState.attempt, transportInterrupted: deleteTransportInterrupted,
          interpretation: 'prior-dispatch-possible-verify-only'
        }, {
          module: 'background', operation: 'renewal-phase-4',
          context: sessionCorrelationContext(session, { renewalId, adId: session.sourceAdId })
        }).catch(() => {});
      }

      const proof = await verifyRenewalSourceAbsenceFresh(session, expectedProfile, windowId, attemptState, 'post-delete');
      assertResetGeneration(resetGeneration, 'renewal-phase4-before-promotion');
      verification = proof;

      if (verification?.verified) break;
      const pageText = verification?.foundPage ? ` (gefunden auf Seite ${verification.foundPage})` : '';
      throw new Error(`Quellanzeige ist nach der Löschaktion weiterhin in „Meine Anzeigen“ vorhanden${pageText}. Keine erneute automatische Löschung; bitte beide Anzeigen prüfen.`);
    } catch (error) {
      verification = null;
      lastError = error;
      session.stage = 'source-delete-retry-pending';
      session.lastError = String(error.message || error).slice(0, 800);
      await logRenewalPhaseAttemptFailed(session, 4, 'RENEWAL_PHASE4_ATTEMPT_FAILED', 'renewal-phase-4', error, {
        deleteTransportInterrupted
      });
      if (isNonRetryableRenewalSafetyError(error) || !renewalPhaseAttemptAvailable(session, 4)) break;
    }
  }

  if (!verification?.verified) {
    const error = lastError || new Error('Phase 4 konnte innerhalb der konfigurierten Versuche nicht sicher abgeschlossen werden.');
    session.status = 'verified';
    session.stage = 'replacement-ready';
    session.lastError = String(error.message || error).slice(0, 800);
    session.sourceDeleteVerificationFailedAt = new Date().toISOString();
    session.phase4AttemptsExhaustedAt = new Date().toISOString();
    session.sourceDeleteTransportInterrupted = deleteTransportInterrupted;
    // A live attempt that failed strictly before dispatch has no uncertain mutation.
    if (!readOnlyResolutionRequired) delete session.sourceDeleteVerificationPendingAt;
    await persistRenewalSession(session).catch(() => {});
    await logDiagnostic('error', 'RENEWAL_REPLACEMENT_FAILED', {
      renewalId,
      sourceAdId: session.sourceAdId,
      newAdId: session.newAdId,
      stage: session.stage,
      message: session.lastError,
      ...renewalAttemptDetails(session, 4)
    }, {
      module: 'background',
      operation: 'renewal-phase-4',
      context: sessionCorrelationContext(session, { renewalId, adId: session.sourceAdId })
    }).catch(() => {});
    throw error;
  }

  session.stage = 'source-delete-verified';
  session.sourceDeletedAt = new Date().toISOString();
  session.sourceDeleteEvidence = verification.evidence || null;
  session.sourceDeleteVerificationPages = verification.pagesScanned ?? null;
  session.sourceDeleteTransportInterrupted = deleteTransportInterrupted;
  session.phase4AttemptsExhaustedAt = null;
  session.lastError = null;
  await persistRenewalSession(session);

  await logDiagnostic('info', 'RENEWAL_SOURCE_DELETE_VERIFIED', {
    renewalId,
    sourceAdId: session.sourceAdId,
    newAdId: session.newAdId,
    evidence: verification.evidence || null,
    pagesScanned: verification.pagesScanned ?? null,
    actionTriggered: deletion?.actionTriggered ?? null,
    alreadyAbsentCandidate: deletion?.alreadyAbsentCandidate ?? null,
    transportInterrupted: deleteTransportInterrupted,
    ...renewalAttemptDetails(session, 4)
  }, {
    module: 'background',
    operation: 'renewal-phase-4',
    context: sessionCorrelationContext(session, { renewalId, adId: session.sourceAdId })
  }).catch(() => {});

  if (deleteTransportInterrupted) {
    await logDiagnostic('info', 'RENEWAL_SOURCE_DELETE_TRANSPORT_INTERRUPTION_VERIFIED', {
      renewalId,
      sourceAdId: session.sourceAdId,
      newAdId: session.newAdId,
      pagesScanned: verification.pagesScanned ?? null,
      interpretation: 'expected-navigation-interruption-independently-verified'
    }, {
      module: 'background',
      operation: 'renewal-phase-4',
      context: sessionCorrelationContext(session, { renewalId, adId: session.sourceAdId })
    }).catch(() => {});
  }

  const promoted = await promoteRenewalCandidateAtomic(session);
  const latestRenewals = await readRenewalSessions();
  delete latestRenewals[renewalId];
  await writeRenewalSessions(latestRenewals);

  const fills = await readFillSessions().catch(() => ({}));
  let fillsChanged = false;
  for (const [fillId, fill] of Object.entries(fills)) {
    if (String(fill?.renewalId || '') === renewalId) {
      delete fills[fillId];
      fillsChanged = true;
    }
  }
  if (fillsChanged) await writeFillSessions(fills);

  const notice = await setAppNotice({
    id: crypto.randomUUID(),
    kind: 'success',
    event: 'renewal-replacement-completed',
    title: session.publicAvailabilityPending === true ? 'Neu inseriert – Bald Online' : 'Neu inseriert',
    text: session.publicAvailabilityPending === true ? 'Austausch abgeschlossen · öffentlich noch nicht verfügbar' : 'Die neue Anzeige wurde geprüft und die alte Anzeige entfernt.',
    renewalId,
    renewalMode: normalizeRenewalMode(session.renewalMode),
    sourceAdId: session.sourceAdId,
    newAdId: session.newAdId,
    trashInventoryId: promoted.trashInventoryId || session.sourceInventoryId,
    trashExpiresAt: promoted.trashExpiresAt || null
  });

  const targetTabCleanup = await closeCompletedRenewalTargetTab(session);

  await logDiagnostic('info', 'RENEWAL_REPLACEMENT_COMPLETED', {
    renewalId,
    renewalMode: normalizeRenewalMode(session.renewalMode),
    sourceInventoryId: session.sourceInventoryId,
    sourceAdId: session.sourceAdId,
    newInventoryId: promoted.inventoryId,
    newAdId: session.newAdId,
    trashInventoryId: promoted.trashInventoryId || session.sourceInventoryId,
    trashExpiresAt: promoted.trashExpiresAt || null,
    targetTabClosed: Boolean(targetTabCleanup?.closed),
    targetTabCleanupReason: targetTabCleanup?.reason || null,
    deleteTransportInterrupted,
    phase4Attempt: renewalAttemptState(session, 4).attempt
  }, {
    module: 'background',
    operation: 'renewal-phase-4',
    context: sessionCorrelationContext(session, { renewalId, adId: session.newAdId })
  }).catch(() => {});

  broadcastInventoryChanged('renewal-replacement-completed', {
    renewalId,
    renewalMode: normalizeRenewalMode(session.renewalMode),
    sourceInventoryId: session.sourceInventoryId,
    sourceAdId: session.sourceAdId,
    inventoryId: promoted.inventoryId,
    newAdId: session.newAdId,
    trashInventoryId: promoted.trashInventoryId || session.sourceInventoryId,
    trashExpiresAt: promoted.trashExpiresAt || null
  });
  if (session?.massBatchId) await markMassRenewalItemSucceeded(session, { inventoryId: promoted.inventoryId, adId: session.newAdId }).catch(() => false);

  return {
    completed: true,
    renewalId,
    inventoryId: promoted.inventoryId,
    adId: session.newAdId,
    trashInventoryId: promoted.trashInventoryId || session.sourceInventoryId,
    trashExpiresAt: promoted.trashExpiresAt || null,
    targetTabClosed: Boolean(targetTabCleanup?.closed),
    notice,
    deleteTransportInterrupted
  };
}

      return Object.freeze({
        removeReplacementReadyLocal, recoverEmergencyResetCandidateAtomic, promoteRenewalCandidateAtomic, renewalTargetTabStillOwned, renewalPublishedTargetTabStillOwned,
        closePublishedRenewalTargetTab, retirePublishedRenewalTargetTab, closeCompletedRenewalTargetTab,
        verifyRenewalSourceAbsenceFresh, preverifyAndTriggerRenewalSourceDeleteAttempt, finishRenewalReplacement
      });
    }
  });
  globalThis.KRDeps?.register?.('KRRemoteDeleteReplacementService', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
