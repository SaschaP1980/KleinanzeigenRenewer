(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const {
        readRenewalSessions, writeRenewalSessions, getBulkRunState, moveInventoryToTrash,
        readFillSessions, writeFillSessions, logDiagnostic, sessionCorrelationContext, broadcastInventoryChanged,
        openDatabase, isTrashRecord, normalizeRenewalMode, trashRecordFrom, persistRenewalSession,
        closeRegistryTab, createManagedWorkerTab, correlationContext, waitForTabComplete, ensureContentConnection,
        sendTabRequestWithBootstrap, normalizeProfileName, closeManagedWorkerTab, renewalMaxPhaseAttempts,
        isPhase4DeleteTransportInterruption, assertMassRenewalManualActionAllowed, getInventory, normalBrowserWindowId,
        renewalPhaseAttemptAvailable, renewalAttemptState, delay, renewalPhaseRetryDelayMs, logRenewalPhaseAttemptStarted,
        logRenewalPhaseAttemptFailed, isNonRetryableRenewalSafetyError, renewalAttemptDetails, setAppNotice,
        markMassRenewalItemSucceeded, captureEmergencyResetGeneration, assertEmergencyResetGeneration
      } = options;
      // A missing shared Phase-4 journal port must never permit remote deletion.
      const beginPhase4Attempt = typeof options.beginPhase4Attempt === 'function'
        ? options.beginPhase4Attempt
        : async () => { throw Object.assign(new Error('KR_PHASE4_JOURNAL_UNAVAILABLE'), {code:'KR_PHASE4_JOURNAL_UNAVAILABLE'}); };
      const observePhase4Attempts = typeof options.observePhase4Attempts === 'function'
        ? options.observePhase4Attempts
        : async () => { throw Object.assign(new Error('KR_PHASE4_JOURNAL_UNAVAILABLE'), {code:'KR_PHASE4_JOURNAL_UNAVAILABLE'}); };
      const resolvePhase4Attempt = typeof options.resolvePhase4Attempt === 'function'
        ? options.resolvePhase4Attempt
        : async () => { throw Object.assign(new Error('KR_PHASE4_JOURNAL_UNAVAILABLE'), {code:'KR_PHASE4_JOURNAL_UNAVAILABLE'}); };
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
      // KAR-199: a completed content handshake is not proof that the next
      // Chrome message callback will ever settle. Deadlines carry NO authority
      // to retry any remote mutation or to bypass the immutable Phase-4 intent.
      const boundedMs = (value, fallback) => Number.isFinite(Number(value)) && Number(value) >= 10
        ? Math.min(300000, Math.floor(Number(value))) : fallback;
      const PHASE4_STATUS_TIMEOUT_MS = boundedMs(options.phase4StatusRequestTimeoutMs, 20000);
      const PHASE4_DELETE_RESPONSE_TIMEOUT_MS = boundedMs(options.phase4DeleteRequestTimeoutMs, 180000);
      const PHASE4_JOURNAL_TIMEOUT_MS = boundedMs(options.phase4JournalTimeoutMs, 45000);
      const PHASE4_READONLY_TIMEOUT_MS = boundedMs(options.phase4ReadOnlyRequestTimeoutMs, 180000);

      function phase4Milestone(event, step, requestType, limit, started) {
        // Low-cardinality only: no account/ad/tab/worker IDs, URLs or tokens.
        // Best effort without an awaited competing diagnostic P8 owner.
        void Promise.resolve().then(() => logDiagnostic(/TIMEOUT|FAILED$/.test(event) ? 'warning' : 'info',event,{
          step,requestType,timeoutMs:limit,elapsedMs:Math.max(0,Date.now()-started)
        },{module:'background',operation:'renewal-phase-4'})).catch(() => {});
      }

      async function boundedPhase4JournalBegin(operation) {
        const started=Date.now();
        const step='durable-intent-begin';
        phase4Milestone('RENEWAL_PHASE4_JOURNAL_BEGIN_STARTED',step,'JOURNAL',PHASE4_JOURNAL_TIMEOUT_MS,started);
        let timer;
        try {
          const receipt=await Promise.race([
            Promise.resolve().then(operation),
            new Promise((_,reject) => { timer=setTimeout(() => {
              const error=new Error('KR_PHASE4_JOURNAL_BEGIN_TIMEOUT');
              error.code='KR_PHASE4_JOURNAL_BEGIN_TIMEOUT';
              reject(error);
            },PHASE4_JOURNAL_TIMEOUT_MS); })
          ]);
          phase4Milestone('RENEWAL_PHASE4_JOURNAL_BEGIN_COMPLETED',step,'JOURNAL',PHASE4_JOURNAL_TIMEOUT_MS,started);
          return receipt;
        } catch(error) {
          phase4Milestone(error?.code==='KR_PHASE4_JOURNAL_BEGIN_TIMEOUT'
            ? 'RENEWAL_PHASE4_JOURNAL_BEGIN_TIMEOUT'
            : 'RENEWAL_PHASE4_JOURNAL_BEGIN_FAILED',
            step,'JOURNAL',PHASE4_JOURNAL_TIMEOUT_MS,started);
          // The async journal may commit after the observer's timeout.
          // Never proceed to remote deletion and never assume no receipt exists.
          throw error;
        } finally {
          if(timer!==undefined)clearTimeout(timer);
        }
      }

      async function boundedPhase4TabRequest(tabId,message,step,timeoutMs,code) {
        const started=Date.now();
        phase4Milestone('RENEWAL_PHASE4_REQUEST_STARTED',step,message.type,timeoutMs,started);
        let timer;
        try {
          const response=await Promise.race([
            Promise.resolve().then(() => sendTabRequestWithBootstrap(tabId,message)),
            new Promise((_,reject) => {timer=setTimeout(() => {
              const error=new Error(code);error.code=code;reject(error);
            },timeoutMs);})
          ]);
          phase4Milestone('RENEWAL_PHASE4_REQUEST_COMPLETED',step,message.type,timeoutMs,started);
          return response;
        } catch(error) {
          const timeout=error?.code===code;
          phase4Milestone(timeout && message.type==='MY_ADS_STATUS'
            ? 'RENEWAL_PHASE4_STATUS_TIMEOUT'
            : timeout && message.type==='DELETE_OWN_AD_BY_ID'
              ? 'RENEWAL_PHASE4_DELETE_RESPONSE_TIMEOUT'
              : timeout ? 'RENEWAL_PHASE4_READONLY_TIMEOUT' : 'RENEWAL_PHASE4_REQUEST_FAILED',
            step,message.type,timeoutMs,started);
          throw error;
        } finally {
          if(timer!==undefined) clearTimeout(timer);
        }
      }


async function removeReplacementReadyLocal(message) {
  const renewalId = String(message?.renewalId || '');
  if (!renewalId) throw new Error('Renewal-ID fehlt.');
  const renewals = await readRenewalSessions();
  const renewal = renewals[renewalId];
  if (!renewal) throw new Error('Renewal-Vorgang wurde nicht gefunden.');
  if (String(renewal.stage || '').startsWith('source-delete')) {
    throw new Error('Phase-4-Löschausgang ist nicht unabhängig verifiziert; Kandidat bleibt erhalten.');
  }
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

// KAR-199: local-only detachment for a cancelled post-publish emergency reset.
// Unlike a completed Phase-4 replacement, BOTH real ads remain independent
// inventory records; do not trash the source, issue DELETE, or touch P8 journal.
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
      || !String(session?.newIdConfirmedAt || '')
      || session?.comparison?.ownAdsPresence!==true
      || !/^\d+$/.test(sourceAdId) || !/^\d+$/.test(targetId)
      || sourceAdId===targetId || sourceId===targetId
      || candidateId===sourceId || !candidateId.startsWith('renewal:')
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
                && destination.recovery?.renewalId===String(session.renewalId)
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
          if (!refs.length || refs.some(image=>!String(image?.imageKey || '')))
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
                  for (const row of copied) images.put(row);
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
      text:'Original und neue Anzeige sind jetzt getrennte Inventareinträge. Ihre aktuellen Online-Status wurden beim lokalen Reset nicht erneut geprüft. Keine Anzeige wurde gelöscht.',
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
  const trashExpiresAt = new Date(trashedAt.getTime() + TRASH_RETENTION_MS).toISOString();
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
    const verifyStatus = await boundedPhase4TabRequest(verificationTabId, { type: 'MY_ADS_STATUS' }, 'post-delete-status', PHASE4_STATUS_TIMEOUT_MS, 'KR_PHASE4_JOURNAL_REMOTE_UNVERIFIED');
    const verifyProfile = normalizeProfileName(verifyStatus?.profileName || '');
    if (!verifyStatus?.isMyAdsPage || !verifyStatus?.isProjectsTab) throw new Error('Die Löschverifikation befindet sich nicht eindeutig in „Meine Anzeigen“ / PROJECTS.');
    if (!verifyProfile) throw new Error('Das Kleinanzeigen-Konto konnte während der Löschverifikation nicht eindeutig erkannt werden.');
    if (expectedProfile.toLocaleLowerCase('de-DE') !== verifyProfile.toLocaleLowerCase('de-DE')) {
      throw new Error('Das aktuell angemeldete Kleinanzeigen-Konto wechselte während der Löschverifikation.');
    }

    const verification = await boundedPhase4TabRequest(verificationTabId, {
      type: 'VERIFY_OWN_AD_ABSENT_BY_ID',
      adId: String(session.sourceAdId),
      correlation: correlationContext(session)
    }, 'post-delete-full-scan', PHASE4_READONLY_TIMEOUT_MS, 'KR_PHASE4_JOURNAL_REMOTE_UNVERIFIED');

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


async function verifyPhase4RemoteOutcomeFresh(receipt, onR1ReadOnlyStage = null, r1PrivateWitness = null) {
  // Only the private original-P8 owner observer can opt into the diagnostic
  // content receipt. This cannot accept an outcome or grant an update lease.
  // Ordinary remote lookups carry no nonce and do not write witness storage.
  const hasPrivateHold = r1PrivateWitness !== null
    && typeof r1PrivateWitness === 'object'
    && !Array.isArray(r1PrivateWitness)
    && Object.hasOwn(r1PrivateWitness, 'holdKind');
  if (r1PrivateWitness !== null && (!r1PrivateWitness
      || typeof r1PrivateWitness !== 'object'
      || Array.isArray(r1PrivateWitness)
      || Object.keys(r1PrivateWitness).sort().join(',') !== (hasPrivateHold
        ? 'holdKind,nonce,schema,workerId' : 'nonce,schema,workerId')
      || r1PrivateWitness.schema !== 1
      || (hasPrivateHold && !['source','target'].includes(r1PrivateWitness.holdKind))
      || !/^[0-9a-f]{32}$/.test(r1PrivateWitness.nonce)
      || !/^[A-Za-z0-9_-]{1,128}$/.test(r1PrivateWitness.workerId)
      || typeof onR1ReadOnlyStage !== 'function'))
    throw new Error('KR_R1_PRIVATE_WITNESS_INVALID');
  // Only fixed stage codes are exposed to the private owner R1 witness.
  // The callback cannot supply scan results or approve a remote outcome.
  const stage = code => { if(typeof onR1ReadOnlyStage==='function') onR1ReadOnlyStage(code); };
  // A caller cannot submit a success object: the trusted background service
  // obtains two independent, freshly loaded My Ads pages, under the recorded
  // source account. Neither the original deletion response nor local cache
  // qualifies as an independently authenticated remote result.
  const expected = normalizeProfileName(receipt?.profileId || '');
  const sourceId = String(receipt?.sourceAdId || '');
  const targetId = String(receipt?.newAdId || '');
  if (!expected || !/^\d+$/.test(sourceId) || !/^\d+$/.test(targetId)
      || sourceId === targetId || !receipt?.renewalId)
    throw new Error('KR_PHASE4_JOURNAL_UNVERIFIED');
  const normalized = text => normalizeProfileName(text).toLocaleLowerCase('de-DE');
  async function scanFresh(kind, id, command) {
    let tabId = null;
    try {
      stage(kind === 'source' ? 'SOURCE_TAB_REQUESTED' : 'TARGET_TAB_REQUESTED');
      const tab = await createManagedWorkerTab({
        url: MY_ADS_PROJECTS_URL, active: false
      }, 'renewal-phase4-independent-' + kind, {
        ownerType: 'renewal', ownerId: receipt.renewalId,
        adId: id, phaseAttemptId: receipt.attemptId
      });
      if (!Number.isSafeInteger(tab?.id) || tab.id <= 0)
        throw new Error('KR_PHASE4_JOURNAL_UNVERIFIED');
      tabId = tab.id;
      stage(kind === 'source' ? 'SOURCE_TAB_CREATED' : 'TARGET_TAB_CREATED');
      await waitForTabComplete(tabId, {
        timeoutMs: TAB_LOAD_TIMEOUT_PHASE4_MS,
        purpose: 'renewal-phase4-independent-' + kind,
        label: 'Unabhängige Phase-4-Ergebnisprüfung',
        operation: 'renewal-phase-4',
        context: {renewalId:receipt.renewalId,adId:id,workerTabId:tabId}
      });
      stage(kind === 'source' ? 'SOURCE_TAB_LOADED' : 'TARGET_TAB_LOADED');
      await ensureContentConnection({tabId});
      stage(kind === 'source' ? 'SOURCE_CONTENT_READY' : 'TARGET_CONTENT_READY');
      const assertSameAccount = async () => {
        const status = await boundedPhase4TabRequest(tabId,
          {type:'MY_ADS_STATUS'}, 'journal-fresh-' + kind,
          PHASE4_STATUS_TIMEOUT_MS, 'KR_PHASE4_JOURNAL_REMOTE_UNVERIFIED');
        if (status?.isMyAdsPage !== true || status?.isProjectsTab !== true
            || !status.profileName || normalized(status.profileName) !== normalized(expected))
          throw new Error('KR_PHASE4_JOURNAL_UNVERIFIED');
      };
      await assertSameAccount();
      // Chrome tab "complete" and MY_ADS_STATUS account are not proof that
      // asynchronous listing cards/online total/pagination have hydrated.
      // Wait in THIS fresh independent tab, without retrying a failed scan.
      const ready = await boundedPhase4TabRequest(tabId,{
        type:'WAIT_FOR_MY_ADS_READY',expectedProfileName:expected,timeoutMs:12000
      },'journal-readiness-' + kind,PHASE4_STATUS_TIMEOUT_MS,
      'KR_PHASE4_JOURNAL_REMOTE_UNVERIFIED');
      if (ready?.isMyAdsPage!==true || ready?.isProjectsTab!==true
          || ready?.currentPage!==1 || normalized(ready.profileName)!==normalized(expected)
          || !Number.isSafeInteger(ready.expectedOnline) || ready.expectedOnline<0
          || !Number.isSafeInteger(ready.listingCount) || ready.listingCount<0
          || ready.listingCount>ready.expectedOnline
          || (ready.expectedOnline>0 && ready.listingCount===0)
          || (ready.hasNext!==true && ready.listingCount!==ready.expectedOnline))
        throw new Error('KR_PHASE4_JOURNAL_UNVERIFIED');
      await assertSameAccount();
      stage(kind === 'source' ? 'SOURCE_ACCOUNT_OK' : 'TARGET_ACCOUNT_OK');
      const result = await boundedPhase4TabRequest(tabId,{
        type:command,adId:id,expectedProfileName:expected,
        requireCompleteRoster: kind === 'target',
        correlation:{renewalId:receipt.renewalId},
        ...(r1PrivateWitness ? {r1ReadOnlyWitness:{
          schema:hasPrivateHold && r1PrivateWitness.holdKind === kind ? 2 : 1,
          kind,nonce:r1PrivateWitness.nonce,
          workerId:r1PrivateWitness.workerId,
          ...(hasPrivateHold && r1PrivateWitness.holdKind === kind
            ? {holdMs:45000} : {})
        }} : {})
      }, 'journal-scan-' + kind, PHASE4_READONLY_TIMEOUT_MS,
      'KR_PHASE4_JOURNAL_REMOTE_UNVERIFIED');
      stage(kind === 'source' ? 'SOURCE_QUERY_RETURNED' : 'TARGET_QUERY_RETURNED');
      await assertSameAccount();
      stage(kind === 'source' ? 'SOURCE_ACCOUNT_RECHECKED' : 'TARGET_ACCOUNT_RECHECKED');
      return result;
    } finally {
      if (tabId) await closeManagedWorkerTab(tabId).catch(() => {});
    }
  }
  const source = await scanFresh('source',sourceId,'VERIFY_OWN_AD_ABSENT_BY_ID');
  if (source?.verified !== true || String(source.adId || '') !== sourceId
      || source.evidence !== 'not-in-my-ads-full-pagination-scan'
      || !Number.isSafeInteger(source.pagesScanned) || source.pagesScanned < 1)
    throw new Error('KR_PHASE4_JOURNAL_UNVERIFIED');
  stage('SOURCE_RESULT_VERIFIED');
  const target = await scanFresh('target',targetId,'FIND_OWN_AD_BY_ID');
  if (target?.found !== true || String(target.adId || '') !== targetId
      || target.evidence !== 'found-in-my-ads-full-pagination-scan'
      || !Number.isSafeInteger(target.pagesScanned) || target.pagesScanned < 1
      || !Number.isSafeInteger(target.page) || target.page < 1
      || target.page > target.pagesScanned)
    throw new Error('KR_PHASE4_JOURNAL_UNVERIFIED');
  stage('TARGET_RESULT_VERIFIED');
  return Object.freeze({
    profileId:receipt.profileId,sourceAdId:sourceId,newAdId:targetId,
    attemptId:receipt.attemptId??null,
    workerInstanceId:receipt.workerInstanceId??null,
    admissionToken:receipt.admissionToken??null,
    sourceAbsent:true,targetPresent:true,
    sourceEvidence:source.evidence,targetEvidence:target.evidence,
    sourcePagesScanned:source.pagesScanned,targetPagesScanned:target.pagesScanned,
    targetFoundPage:target.page
  });
}

async function preverifyAndTriggerRenewalSourceDeleteAttempt(session, expectedProfile, windowId, attemptState, resetGeneration, admissionReceipt = null) {
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

    const status = await boundedPhase4TabRequest(deleteTabId, { type: 'MY_ADS_STATUS' }, 'pre-intent-status', PHASE4_STATUS_TIMEOUT_MS, 'KR_PHASE4_STATUS_TIMEOUT');
    const actualProfile = normalizeProfileName(status?.profileName || '');
    if (!status?.isMyAdsPage || !status?.isProjectsTab) throw new Error('Phase 4 konnte die Ansicht „Meine Anzeigen“ / PROJECTS nicht eindeutig bestätigen.');
    if (!actualProfile) throw new Error('Das aktuell angemeldete Kleinanzeigen-Konto konnte für Phase 4 nicht eindeutig erkannt werden.');
    if (expectedProfile.toLocaleLowerCase('de-DE') !== actualProfile.toLocaleLowerCase('de-DE')) {
      throw new Error('Das aktuell angemeldete Kleinanzeigen-Konto entspricht nicht dem Inventarprofil der Quellanzeige.');
    }

    // Common manual, mass and automatic Phase-4 source-delete boundary.
    // Store/read back the irreversible uncertainty receipt only after the
    // fresh My Ads page has independently confirmed the expected profile.
    // No follow-up DELETE_OWN_AD_BY_ID may run if this admission fails.
    const attemptReceipt = await boundedPhase4JournalBegin(() => beginPhase4Attempt({
      renewalId: String(session.renewalId || ''),
      profileId: actualProfile,
      sourceAdId: String(session.sourceAdId || ''),
      newAdId: String(session.newAdId || ''),
      admissionReceipt
    }));

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

    // The logged-in account can change while the durable intent is written
    // and read back. Recheck the SAME actual My Ads worker before any remote
    // DELETE, leaving the immutable attempt unresolved on uncertainty.
    let postReceiptStatus;
    try {
      postReceiptStatus = await boundedPhase4TabRequest(deleteTabId, { type: 'MY_ADS_STATUS' }, 'post-intent-status', PHASE4_STATUS_TIMEOUT_MS, 'KR_PHASE4_STATUS_TIMEOUT');
    } catch {
      const code = 'KR_PHASE4_JOURNAL_ACCOUNT_UNVERIFIED';
      throw Object.assign(new Error(code), { code });
    }
    const postReceiptProfile = normalizeProfileName(postReceiptStatus?.profileName || '');
    if (postReceiptStatus?.isMyAdsPage !== true || postReceiptStatus?.isProjectsTab !== true || !postReceiptProfile) {
      const code = 'KR_PHASE4_JOURNAL_ACCOUNT_UNVERIFIED';
      throw Object.assign(new Error(code), { code });
    }
    if (postReceiptProfile.toLocaleLowerCase('de-DE') !== actualProfile.toLocaleLowerCase('de-DE')) {
      const code = 'KR_PHASE4_JOURNAL_ACCOUNT_CHANGED';
      throw Object.assign(new Error(code), { code });
    }

    try {
      assertResetGeneration(resetGeneration, 'renewal-phase4-before-delete');
      deletion = await boundedPhase4TabRequest(deleteTabId, {
        type: 'DELETE_OWN_AD_BY_ID',
        adId: String(session.sourceAdId),
        correlation: correlationContext(session)
      }, 'delete-response', PHASE4_DELETE_RESPONSE_TIMEOUT_MS, 'KR_PHASE4_DELETE_RESPONSE_TIMEOUT');
    } catch (error) {
      if (error?.code !== 'KR_PHASE4_DELETE_RESPONSE_TIMEOUT') {
        if (!isPhase4DeleteTransportInterruption(error)) throw error;
      }
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

    return { deletion, transportInterrupted, attemptReceipt };
  } finally {
    if (deleteTabId) await closeManagedWorkerTab(deleteTabId).catch(() => {});
  }
}

// Persist visible, non-destructive Phase-4 uncertainty before returning an error.
// In particular the source and verified target remain untouched in local storage.
async function markPhase4Unverified(session, code) {
  const journalUncertain = String(code || '').startsWith('KR_PHASE4_JOURNAL_');
  session.status = 'verified';
  session.stage = journalUncertain ? 'source-delete-outcome-unverified' : 'source-delete-status-unverified';
  session.lastError = String(code || 'KR_PHASE4_STATUS_UNVERIFIED');
  session.sourceDeleteUnverifiedAt = new Date().toISOString();
  await persistRenewalSession(session);
  const text = 'Neue Anzeige bestätigt; alte Anzeige noch nicht nachweislich gelöscht. Bitte zunächst beide Anzeigen in „Meine Anzeigen“ prüfen. Kein automatischer zweiter Löschversuch.';
  // Do not await a diagnostic write; it can contend for the very same P8
  // admission lock whose transient delay led here.
  void Promise.resolve().then(() => logDiagnostic('warning', 'RENEWAL_PHASE4_UNVERIFIED', {
    reasonCode: String(code || 'UNKNOWN'), stage:session.stage,
    beforeDeleteProven: !journalUncertain
  }, {module:'background',operation:'renewal-phase-4'})).catch(() => {});
  await setAppNotice({
    id: crypto.randomUUID(),
    kind: 'warning',
    event: 'renewal-phase4-unverified',
    title: 'Austausch nicht abgeschlossen',
    text,
    renewalId: session.renewalId,
    sourceAdId: session.sourceAdId,
    newAdId: session.newAdId
  }).catch(() => {});
}

async function finishRenewalReplacement(message, admissionReceipt = null) {
  const resetGeneration = captureResetGeneration();
  await assertMassRenewalManualActionAllowed(message);
  assertResetGeneration(resetGeneration, 'renewal-phase4-start');
  const renewalId = String(message?.renewalId || '');
  if (!renewalId) throw new Error('Renewal-ID fehlt.');
  const renewals = await readRenewalSessions();
  const session = renewals[renewalId];
  if (!session) throw new Error('Renewal-Vorgang wurde nicht gefunden.');
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
  // A crashed worker might already have committed a before-DELETE intent. Never
  // replay the remote side effect merely because a local renewal retry resumed.
  // Resolve that exact existing attempt from new independent My Ads tabs.
  const previousEvidence = await observePhase4Attempts(renewalId);
  if (!previousEvidence || !Array.isArray(previousEvidence.attempts)
      || previousEvidence.attempts.length > 1)
    throw Object.assign(new Error('KR_PHASE4_JOURNAL_UNRESOLVED'),{code:'KR_PHASE4_JOURNAL_UNRESOLVED'});
  if (previousEvidence.attempts.length) {
    const oldAttempt = previousEvidence.attempts[0];
    if (normalizeProfileName(oldAttempt.profileId).toLocaleLowerCase('de-DE')
          !== expectedProfile.toLocaleLowerCase('de-DE')
        || oldAttempt.sourceAdId !== String(session.sourceAdId)
        || oldAttempt.newAdId !== String(session.newAdId))
      throw Object.assign(new Error('KR_PHASE4_JOURNAL_UNVERIFIED'),{code:'KR_PHASE4_JOURNAL_UNVERIFIED'});
  }

  session.status = 'verified';
  session.stage = 'source-delete-started';
  session.lastError = null;
  await persistRenewalSession(session);

  const windowId = await normalBrowserWindowId();
  let verification = null;
  let deletion = session.sourceDeleteAction || null;
  let deleteTransportInterrupted = Boolean(session.sourceDeleteTransportInterrupted);
  let lastError = null;
  if (previousEvidence.attempts.length) {
    const exactAttempt = previousEvidence.attempts[0];
    // Even an earlier resolved receipt is independently rechecked on return
    // before local candidate promotion. A failed check keeps the record intact.
    const confirmed = await resolvePhase4Attempt({
      renewalId, attemptId: exactAttempt.attemptId
    });
    if (confirmed?.state !== 'resolved-confirmed'
        || confirmed.sourceAdId !== String(session.sourceAdId)
        || confirmed.newAdId !== String(session.newAdId))
      throw Object.assign(new Error('KR_PHASE4_JOURNAL_UNVERIFIED'),{code:'KR_PHASE4_JOURNAL_UNVERIFIED'});
    verification = {
      verified:true, evidence:confirmed.sourceEvidence,
      pagesScanned:confirmed.sourcePagesScanned
    };
    deleteTransportInterrupted = true;
  }

  while (!verification?.verified && renewalPhaseAttemptAvailable(session, 4)) {
    const previousAttempt = renewalAttemptState(session, 4).attempt;
    if (previousAttempt > 0) await delay(renewalPhaseRetryDelayMs(previousAttempt + 1));
    const attemptState = await logRenewalPhaseAttemptStarted(session, 4, 'RENEWAL_PHASE4_ATTEMPT_STARTED', 'renewal-phase-4', {
      safetyModel: 'atomic-preverify-delete-independent-postverify'
    });

    try {
      // DELETE_OWN_AD_BY_ID already performs a fresh full-pagination scan in this
      // worker before it can resolve a delete control. If the source is already
      // absent, it performs no delete action. This makes preverify + delete atomic
      // in one fresh worker while preserving the independent post-delete full scan.
      const result = await preverifyAndTriggerRenewalSourceDeleteAttempt(session, expectedProfile, windowId, attemptState, resetGeneration, admissionReceipt);
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

      verification = await verifyRenewalSourceAbsenceFresh(session, expectedProfile, windowId, attemptState, 'post-delete');
      assertResetGeneration(resetGeneration, 'renewal-phase4-before-promotion');

      if (verification?.verified) {
        // Independent source absence alone cannot prove that the intended
        // replacement was actually published to the same live account.
        // The journal resolver confirms BOTH IDs in separate fresh tabs.
        const confirmed = await resolvePhase4Attempt({
          renewalId, attemptId: result.attemptReceipt?.attemptId
        });
        if (confirmed?.state !== 'resolved-confirmed'
            || confirmed.sourceAdId !== String(session.sourceAdId)
            || confirmed.newAdId !== String(session.newAdId))
          throw Object.assign(new Error('KR_PHASE4_JOURNAL_UNVERIFIED'),{code:'KR_PHASE4_JOURNAL_UNVERIFIED'});
        verification = {
          verified:true, evidence:confirmed.sourceEvidence,
          pagesScanned:confirmed.sourcePagesScanned
        };
        break;
      }
      // An immutable Phase-4 intent was already written before the possible
      // DELETE. A still-visible original is NOT proof that replaying DELETE is
      // safe; report unknown outcome and require independent reconciliation.
      const pageText = verification?.foundPage ? ` (gefunden auf Seite ${verification.foundPage})` : '';
      throw Object.assign(new Error(`Quellanzeige ist nach der Löschaktion weiterhin in „Meine Anzeigen“ vorhanden${pageText}.`), {
        code:'KR_PHASE4_JOURNAL_REMOTE_UNVERIFIED'
      });
    } catch (error) {
      // Unknown status/readback or durable intent must never enter the
      // automatic retry loop or be mislabeled as a completed remote deletion.
      const code = String(error?.code || error?.message || '');
      if (code === 'KR_PHASE4_STATUS_TIMEOUT' || code.startsWith('KR_PHASE4_JOURNAL_')) {
        await markPhase4Unverified(session, code);
        throw error;
      }
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
        verifyRenewalSourceAbsenceFresh, verifyPhase4RemoteOutcomeFresh,
        preverifyAndTriggerRenewalSourceDeleteAttempt, finishRenewalReplacement
      });
    }
  });
  globalThis.KRDeps?.register?.('KRRemoteDeleteReplacementService', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
