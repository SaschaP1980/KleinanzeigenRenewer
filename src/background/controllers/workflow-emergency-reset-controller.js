(() => {
  'use strict';
  const API=Object.freeze({
    create(options={}) {
      const {bumpEmergencyResetGeneration,resetMassRenewalWorkflowRuntimeState,automaticReplacementInFlight,renewalPhase1RetryInFlight,renewalPublishDetectionInFlight,trashTemplatePublishDetectionInFlight,
        mutateBulkRunState,closeRegistryTabs,closeRegistryTab,releaseBulkSourceOwnership,readFillSessions,writeFillSessions,requireTemplateFillService,
        RenewalStateRepository,readRenewalSessions,writeRenewalSessions,renewalHoldsInsertionLock,isSafeLegacyManualEmergencyReset,isSafePrePublishPaidInsertion,emergencyResetRenewalState,
        readArchiveInsertionSessions,writeArchiveInsertionSessions,readMassRenewalBatch,writeMassRenewalBatch,touchMassRenewalItemProgress,getTabRegistrySnapshot,TAB_STATES,
        logDiagnostic,sessionCorrelationContext,broadcastInventoryChanged}=options;
      const required={bumpEmergencyResetGeneration,resetMassRenewalWorkflowRuntimeState,mutateBulkRunState,closeRegistryTabs,closeRegistryTab,releaseBulkSourceOwnership,readFillSessions,writeFillSessions,requireTemplateFillService,readRenewalSessions,writeRenewalSessions,renewalHoldsInsertionLock,isSafeLegacyManualEmergencyReset,isSafePrePublishPaidInsertion,emergencyResetRenewalState,readArchiveInsertionSessions,writeArchiveInsertionSessions,readMassRenewalBatch,writeMassRenewalBatch,touchMassRenewalItemProgress,getTabRegistrySnapshot,logDiagnostic,sessionCorrelationContext,broadcastInventoryChanged};
      for(const [name,value] of Object.entries(required)) if(typeof value!=='function') throw new Error(`workflow emergency reset dependency ${name} is required`);
      if(!RenewalStateRepository?.renewalPublishBoundaryReached || !TAB_STATES) throw new Error('workflow emergency reset policy dependencies are required');
      for(const [name,set] of Object.entries({automaticReplacementInFlight,renewalPhase1RetryInFlight,renewalPublishDetectionInFlight,trashTemplatePublishDetectionInFlight})) if(!set?.clear) throw new Error(`workflow emergency reset runtime set ${name} is required`);
async function resetActiveWorkflows() {
  const now = new Date().toISOString();
  const issue = 'Der laufende Vorgang wurde durch den Notfall-Reset sicher beendet.';
  const resetGeneration = bumpEmergencyResetGeneration();
  let affected = 0;
  let bulkSourceToClose = null;
  let bulkSourceToRelease = null;
  let bulkWorkerTabs = [];

  resetMassRenewalWorkflowRuntimeState();
  automaticReplacementInFlight.clear();
  renewalPhase1RetryInFlight.clear();
  renewalPublishDetectionInFlight.clear();
  trashTemplatePublishDetectionInFlight.clear();

  const bulk = await mutateBulkRunState(state => {
    if (!state || (String(state.status || '') !== 'running' && !state.retryAdId)) return state;
    bulkWorkerTabs = [state.workerTabId, state.metadataTabId].map(Number).filter(Boolean);
    if (state.sourceAutoCreated === true) bulkSourceToClose = Number(state.sourceTabId || 0) || null;
    else bulkSourceToRelease = { ...state };
    affected += 1;
    return {
      ...state,
      status: 'needs-review',
      stage: 'manual-emergency-reset',
      completedAt: now,
      recoveryAt: now,
      emergencyResetAt: now,
      emergencyResetGeneration: resetGeneration,
      retryAdId: null,
      workerTabId: null,
      metadataTabId: null,
      metadataOpenedAt: null,
      currentReadOnlyMeta: null,
      currentItemStartedAt: null,
      issues: [...new Set([...(state.issues || []), issue])]
    };
  }).catch(() => null);
  await closeRegistryTabs(bulkWorkerTabs, 'manual-emergency-reset', 'Inventarisierungs-Worker').catch(() => {});
  if (bulkSourceToClose) await closeRegistryTab(bulkSourceToClose, 'manual-emergency-reset', '„Meine Anzeigen“-Hintergrundtab').catch(() => {});
  else if (bulkSourceToRelease) await releaseBulkSourceOwnership(bulkSourceToRelease, 'manual-emergency-reset').catch(() => {});

  const fills = await readFillSessions().catch(() => ({})); let fillsChanged = false;
  for (const fill of Object.values(fills || {})) {
    const safePaidInsertion = isSafePrePublishPaidInsertion(fill);
    if (!safePaidInsertion && !requireTemplateFillService().isEmergencyResettableSession(fill)) continue;
    const remoteUncertain = RenewalStateRepository.renewalPublishBoundaryReached(fill);
    fill.status = safePaidInsertion || fill?.templateOnly ? 'cancelled' : 'cancelled';
    fill.stage = remoteUncertain ? 'emergency-reset-unverified' : 'manual-emergency-reset';
    fill.updatedAt = now; fill.recoveryAt = now; fill.emergencyResetAt = now; fill.emergencyResetGeneration = resetGeneration;
    if (remoteUncertain) { fill.remoteVerification = 'unverified'; fill.remoteVerificationRequired = true; }
    else { delete fill.remoteVerification; delete fill.remoteVerificationRequired; }
    fill.result = { complete:false, issues:[issue] }; fillsChanged = true; affected += 1;
    if (fill?.fillId) requireTemplateFillService().evictTemplateImageTransfersForFill(fill.fillId);
  }
  if (fillsChanged) await writeFillSessions(fills).catch(() => {});

  const renewals = await readRenewalSessions().catch(() => ({})); let renewalsChanged = false;
  for (const [renewalId, renewal] of Object.entries(renewals || {})) {
    if (!renewal || String(renewal.status || '') === 'replaced') continue;
    if (String(renewal.status || '') === 'cancelled' && renewal.emergencyResetAt) continue;
    const safePaidInsertion = isSafePrePublishPaidInsertion(renewal);
    const activeOrLocking = renewalHoldsInsertionLock(renewal)
      || isSafeLegacyManualEmergencyReset(renewal)
      || safePaidInsertion
      || ['needs-review','error'].includes(String(renewal.status || ''));
    if (!activeOrLocking) continue;
    if (safePaidInsertion) renewal.status = safePaidInsertion ? 'cancelled' : renewal.status;
    renewals[renewalId] = { ...emergencyResetRenewalState(renewal, { now, issue }), emergencyResetGeneration: resetGeneration };
    renewalsChanged = true; affected += 1;
  }
  if (renewalsChanged) await writeRenewalSessions(renewals).catch(() => {});

  const archives = await readArchiveInsertionSessions().catch(() => ({})); let archivesChanged = false;
  for (const archive of Object.values(archives || {})) {
    if (!archive || ['complete','cancelled'].includes(String(archive.status || ''))) continue;
    const remoteUncertain = RenewalStateRepository.renewalPublishBoundaryReached(archive);
    archive.status = 'cancelled';
    archive.stage = remoteUncertain ? 'emergency-reset-unverified' : 'manual-emergency-reset';
    archive.updatedAt = now; archive.recoveryAt = now; archive.emergencyResetAt = now; archive.emergencyResetGeneration = resetGeneration; archive.lastError = issue;
    if (remoteUncertain) { archive.remoteVerification = 'unverified'; archive.remoteVerificationRequired = true; }
    else { delete archive.remoteVerification; delete archive.remoteVerificationRequired; }
    archivesChanged = true; affected += 1;
  }
  if (archivesChanged) await writeArchiveInsertionSessions(archives).catch(() => {});

  const batch = await readMassRenewalBatch().catch(() => null);
  if (batch && String(batch.status || '') === 'running') {
    for (const item of batch.items || []) {
      if (['running','retrying'].includes(String(item.status || ''))) {
        item.status='needs-review'; item.stage='manual-emergency-reset'; item.lastError=issue; item.completedAt=now; touchMassRenewalItemProgress(item, now);
      } else if (String(item.status || '') === 'queued') {
        item.status='cancelled'; item.stage='not-started-manual-emergency-reset'; item.completedAt=now; touchMassRenewalItemProgress(item, now);
      }
    }
    batch.currentIndex=null; batch.stopAfterCurrentRequested=true; batch.stopRequestedAt=batch.stopRequestedAt||now; batch.stoppedAt=now; batch.completedAt=now; batch.status='stopped-with-attention'; batch.recoveryAt=now; batch.emergencyResetAt=now; batch.emergencyResetGeneration=resetGeneration;
    await writeMassRenewalBatch(batch).catch(() => {}); affected += 1;
  }

  const registry = await getTabRegistrySnapshot().catch(() => []);
  const managedTabs = (registry || []).filter(entry => entry?.lifecycleState !== TAB_STATES.GONE && entry?.managed === true).map(entry => Number(entry.tabId || 0)).filter(Boolean);
  await closeRegistryTabs(managedTabs, 'manual-emergency-reset', 'Kleinanzeigen-Worker').catch(() => {});

  await logDiagnostic('warning', 'ACTIVE_WORKFLOWS_EMERGENCY_RESET', {
    affected, bulkRunId: bulk?.runId || null, managedTabsClosed: managedTabs.length,
    accountIndependent: true, remoteVerificationAttempted: false, emergencyResetGeneration: resetGeneration
  }, { module:'background', operation:'workflow-emergency-reset', context: sessionCorrelationContext(bulk || {}) }).catch(() => {});
  broadcastInventoryChanged('workflow-emergency-reset', { affected, at: now, emergencyResetGeneration: resetGeneration });
  return { reset:true, affected, at:now, accountIndependent:true, remoteVerificationAttempted:false, emergencyResetGeneration: resetGeneration };
}


      return Object.freeze({resetActiveWorkflows});
    }
  });
  globalThis.KRDeps?.register?.('KRWorkflowEmergencyResetController',API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
