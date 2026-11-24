(() => {
 'use strict';
 const API=Object.freeze({
  create(options={}) {
   const {readRenewalSessions,writeRenewalSessions,readFillSessions,writeFillSessions,
     getInventory,deleteInventoryStorageRecord,getBulkRunState,closeRegistryTab,
     logDiagnostic,broadcastInventoryChanged,sessionCorrelationContext,observePublishIntent}=options;
   const required={readRenewalSessions,writeRenewalSessions,readFillSessions,writeFillSessions,
     getInventory,deleteInventoryStorageRecord,getBulkRunState,closeRegistryTab,
     logDiagnostic,broadcastInventoryChanged,sessionCorrelationContext};
   for(const [name,fn] of Object.entries(required))
     if(typeof fn!=='function')throw new Error('Renewal local discard requires '+name);

async function discardDraft(message) {
  const renewalId = String(message?.renewalId || '');
  if (!renewalId) throw new Error('Renewal-ID fehlt.');
  const renewals = await readRenewalSessions();
  const renewal = renewals[renewalId];
  if (!renewal) throw new Error('Renewal-Entwurf wurde nicht gefunden.');
  if (renewal.newAdId || ['submitted', 'new-id-confirmed', 'reinventorizing', 'verifying', 'verified'].includes(String(renewal.status || '')) || String(renewal.stage || '') === 'publish-submitted') {
    throw new Error('Dieser Renewal-Vorgang wurde bereits veröffentlicht oder zur Veröffentlichung übergeben und kann nicht als lokaler Entwurf verworfen werden.');
  }

  const active = await getBulkRunState();
  if (active?.status === 'running' || active?.retryAdId) throw new Error('Entwürfe können während einer laufenden Erfassung oder einer einzelnen Wiederholung nicht verworfen werden.');

  const skeletonInventoryId = String(renewal.skeletonInventoryId || '');
  const targetTabId = Number(renewal.targetTabId || 0) || null;
  const fillId = String(renewal.fillId || '');

  const blocked=renewal.stage==='publish-intent-blocked';
  const fills = blocked?await readFillSessions():await readFillSessions().catch(() => ({}));
  if(blocked){
    // This route is an explicit discard/restart, not permission to replay a
    // click. Only a proven pre-intent denial with no durable attempt qualifies.
    const fill=fills?.[fillId];
    if(renewal.status!=='verification-failed'||renewal.lastError!=='KR_PUBLISH_INTENT_ATOMIC_BUSY'||
      renewal.publishClickedAt||renewal.newIdConfirmedAt||renewal.remoteVerificationRequired||
      renewal.emergencyResetAt||!fillId||!fill||fill.fillId!==fillId||fill.renewalId!==renewalId||
      fill.status!=='needs-review'||fill.stage!=='publish-intent-blocked'||fill.publishClickedAt||
      String(fill.sourceAdId||'')!==String(renewal.sourceAdId||'')||!targetTabId||
      Number(fill.targetTabId)!==targetTabId||fill.result?.complete!==true||
      !Array.isArray(fill.result.issues)||fill.result.issues.length||
      typeof observePublishIntent!=='function')
      throw Error('KR_PUBLISH_INTENT_UNVERIFIED');
    const related=Object.values(fills).filter(f=>f?.renewalId===renewalId);
    for(const previous of related){
      if(!previous.fillId||previous.publishClickedAt||['waiting','running','submitted'].includes(previous.status))
        throw Error('KR_PUBLISH_INTENT_UNVERIFIED');
      const observed=await observePublishIntent(previous.fillId);
      if(observed?.state!=='missing'||!Array.isArray(observed.attempts)||observed.attempts.length||
        !Array.isArray(observed.resolutions)||observed.resolutions.length)
        throw Error('KR_PUBLISH_INTENT_UNVERIFIED');
    }
    const current=(await readRenewalSessions())[renewalId];
    const currentFill=(await readFillSessions())[fillId];
    if(!current||current.fillId!==fillId||current.stage!==renewal.stage||current.status!==renewal.status||
      current.updatedAt!==renewal.updatedAt||current.newAdId||current.publishClickedAt||
      !currentFill||currentFill.status!==fill.status||currentFill.stage!==fill.stage||
      currentFill.updatedAt!==fill.updatedAt)
      throw Error('KR_PUBLISH_INTENT_UNVERIFIED');
  }
  if (fillId && fills[fillId]) {
    delete fills[fillId];
    await writeFillSessions(fills);
  } else {
    let changed = false;
    for (const [id, fill] of Object.entries(fills)) {
      if (String(fill?.renewalId || '') === renewalId) { delete fills[id]; changed = true; }
    }
    if (changed) await writeFillSessions(fills);
  }

  delete renewals[renewalId];
  await writeRenewalSessions(renewals);
  if (skeletonInventoryId) await deleteInventoryStorageRecord(skeletonInventoryId);
  if (targetTabId) await closeRegistryTab(targetTabId, 'renewal-draft-discarded', 'Renewal-Zieltab').catch(() => {});

  await logDiagnostic('info', 'RENEWAL_DRAFT_DISCARDED', {
    renewalId,
    sourceInventoryId: renewal.sourceInventoryId || null,
    sourceAdId: renewal.sourceAdId || null,
    skeletonInventoryId: skeletonInventoryId || null
  }, { module: 'background', operation: 'renewal-discard', context: sessionCorrelationContext(renewal, { renewalId, adId: renewal.sourceAdId || null }) }).catch(() => {});
  broadcastInventoryChanged('renewal-draft-discarded', { inventoryId: skeletonInventoryId || null, renewalId, sourceAdId: renewal.sourceAdId || null });
  return { discarded: true, renewalId, skeletonInventoryId: skeletonInventoryId || null };
}

   // A cancelled after-publish session is a durable safety tombstone.
   // Removing its stale synthetic inventory card must never revive publication
   // or erase the immutable intent / account proof / Phase-4 history.
   async function discardUnfinishedLocal(message) {
     const renewalId=String(message?.renewalId||'').trim();
     const candidateId=String(message?.inventoryId||'');
     if(!renewalId || candidateId!=='renewal:'+renewalId)
       throw new Error('Ungültiger lokaler Austausch-Eintrag.');
     const sessions=await readRenewalSessions();
     const renewal=sessions?.[renewalId];
     if(!renewal)throw new Error('Austausch-Sicherheitsstatus nicht gefunden.');
     if(renewal.status!=='cancelled' ||
        renewal.stage!=='emergency-reset-unverified' ||
        !String(renewal.emergencyResetAt||'') ||
        renewal.remoteVerificationRequired!==true)
       throw new Error('Der Austausch muss zuerst unter Diagnose mit „Laufende Vorgänge zurücksetzen“ beendet werden.');
     if(renewal.newAdId || renewal.newIdConfirmedAt || renewal.newPublicUrl ||
        renewal.comparison || renewal.phase2CompletedAt)
       throw new Error('Ein bereits bestätigter Austausch darf nicht lokal verworfen werden.');
     if(String(renewal.skeletonInventoryId||'')!==candidateId ||
        !String(renewal.sourceInventoryId||'') ||
        String(renewal.sourceInventoryId)===candidateId ||
        !/^\d+$/.test(String(renewal.sourceAdId||'')))
       throw new Error('Quell- und Zielinventar sind nicht eindeutig getrennt.');
     const active=await getBulkRunState();
     if(active?.status==='running'||active?.retryAdId)
       throw new Error('Ein laufender Erfassungsvorgang verhindert das lokale Entfernen.');
     const fills=await readFillSessions();
     if(Object.values(fills||{}).some(fill=>String(fill?.renewalId||'')===renewalId &&
       (fill.status!=='cancelled'||fill.stage!=='emergency-reset-unverified')))
       throw new Error('Eine zugehörige Formularsitzung ist noch aktiv.');
     const [candidate,source]=await Promise.all([
       getInventory(candidateId),getInventory(String(renewal.sourceInventoryId))
     ]);
     if(!source||!candidate ||
        String(source.inventoryId||'')!==String(renewal.sourceInventoryId) ||
        source.inventoryId===candidate.inventoryId ||
        candidate.inventoryId!==candidateId ||
        candidate.recordKind!=='renewal-draft'||candidate.adId ||
        String(candidate.renewal?.renewalId||'')!==renewalId ||
        candidate.renewal?.newAdId ||
        !(['submitted','cancelled'].includes(String(candidate.renewal?.status||'')) &&
          ['publish-submitted','emergency-reset-unverified'].includes(String(candidate.renewal?.stage||''))) ||
        String(candidate.profileId||'')!==String(renewal.profileId||'') ||
        String(source.profileId||'')!==String(renewal.profileId||''))
       throw new Error('Der lokale Zwischenstand stimmt nicht mit dem zurückgesetzten Austausch überein.');
     // IDB deletes only rows OWNED by this synthetic ID; the original Fast
     // source image keys are owned by sourceInventoryId and remain intact.
     await deleteInventoryStorageRecord(candidateId);
     await logDiagnostic('info','RENEWAL_UNFINISHED_LOCAL_DISCARDED',{
       renewalId,inventoryId:candidateId,sessionTombstoneRetained:true,
       bothOnlineListingsUnchanged:true
     },{module:'background',operation:'renewal-local-orphan-discard'}).catch(()=>{});
     broadcastInventoryChanged('renewal-unfinished-local-discard',{
       inventoryId:candidateId,renewalId
     });
     return {discarded:true,inventoryId:candidateId,sessionTombstoneRetained:true};
   }
   return Object.freeze({discardDraft,discardUnfinishedLocal});
  }
 });
 globalThis.KRDeps?.register?.('KRRenewalLocalDiscardService',API);
 if(typeof module!=='undefined'&&module?.exports)module.exports=API;
})();
