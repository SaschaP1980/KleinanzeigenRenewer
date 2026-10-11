(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const inFlight = new Set();
      function registryEntryIsOwnedWorker(entry) {
        if (!entry || entry.lifecycleState === options.goneState) return false;
        const owner = entry.owner && typeof entry.owner === 'object' ? entry.owner : {};
        const hasOwner = Boolean(owner.ownerId || owner.operationId || owner.renewalId || owner.archiveInsertionId || owner.bulkRunId || owner.runId || owner.fillId);
        return hasOwner && (entry.managed === true || entry.role === options.roles.BULK_WORKER || entry.role === options.roles.RENEWAL_WORKER || entry.role === options.roles.ARCHIVE_WORKER || entry.role === options.roles.WORKER);
      }
      async function observeTabLifecycleUpdate(tab) {
        const entry = await options.tabRegistry.observeTab(tab).catch(() => null);
        const tabId = Number(tab?.id || 0);
        if (!tabId || !tab?.discarded || !registryEntryIsOwnedWorker(entry) || inFlight.has(tabId)) return entry;
        inFlight.add(tabId);
        try {
          await options.tabRegistry.reloadTabOrThrow(tabId, options.chromeTabs, { label: 'Pausierter Workflow-Worker' });
          await options.logDiagnostic('info','TAB_REGISTRY_DISCARDED_WORKER_REACTIVATED',{tabId,role:entry.role || null,kind:entry.kind || null,ownerType:entry.owner?.ownerType || null,ownerId:entry.owner?.ownerId || null},{module:'background',operation:'tab-registry',context:{...entry.owner,workerTabId:tabId}}).catch(()=>{});
        } catch (error) {
          await options.logDiagnostic(options.isGoneError(error)?'info':'warning','TAB_REGISTRY_DISCARDED_WORKER_REACTIVATION_FAILED',{tabId,role:entry.role || null,message:String(error?.message || error).slice(0,500)},{module:'background',operation:'tab-registry',context:{...entry.owner,workerTabId:tabId}}).catch(()=>{});
        } finally { inFlight.delete(tabId); }
        return entry;
      }
      async function handleActivated(tabId) {
        const tab = await options.chromeTabs.get(Number(tabId)); return options.tabRegistry.observeTab(tab);
      }
      async function handleRemoved(tabId) {
        options.notifyTabLoadWaiters(tabId, { kind: 'removed' });
        options.evictTemplateImageTransfersForTab(tabId);
        await options.tabRegistry.markGone(tabId, 'tabs.onRemoved').catch(() => {});
        const sessions = await options.readFillSessions(); let changed = false;
        for (const session of Object.values(sessions)) {
          if (session?.targetTabId === tabId && ['waiting','running'].includes(session.status)) {
            session.status='error'; session.stage='tab-closed'; session.updatedAt=new Date().toISOString(); session.result={complete:false,issues:['Der neue Anzeigen-Tab wurde geschlossen.']};
            if (session.renewalId) {
              const renewals = await options.readRenewalSessions().catch(() => ({})); const renewal = renewals[session.renewalId];
              if (renewal && !renewal.newAdId) { renewal.status='verification-failed'; renewal.stage='target-tab-closed'; renewal.lastError='Der neue Anzeigen-Tab wurde vor Bestätigung der neuen Anzeigen-ID geschlossen.'; await options.persistRenewalSession(renewal).catch(() => {}); }
            }
            if (session.archiveInsertionId) {
              const archives = await options.readArchiveInsertionSessions().catch(() => ({})); const archive = archives[session.archiveInsertionId];
              if (archive && !archive.newAdId) { archive.status='error'; archive.stage='error-phase-1'; archive.failurePhase=1; archive.lastError='Der neue Anzeigen-Tab wurde vor Bestätigung der neuen Anzeigen-ID geschlossen.'; await options.persistArchiveInsertionSession(archive).catch(() => {}); }
            }
            changed = true;
          }
        }
        if (changed) { await options.writeFillSessions(sessions); options.broadcastInventoryChanged('insertion-lock-released',{kind:'template-tab-closed',tabId}); }
        let bulkCleanupTabIds = [];
        const mutateBulkRunState = typeof options.mutateBulkRunState === 'function'
          ? options.mutateBulkRunState
          : async mutator => {
              const run = await options.getBulkRunState();
              if (!run) return null;
              const next = await mutator(run);
              if (next === undefined) return run;
              return options.writeBulkRunState(next);
            };
        await mutateBulkRunState(run => {
          if (!run || run.status !== 'running') return run;
          if (run.sourceTabId === tabId) {
            bulkCleanupTabIds = [run.workerTabId, run.metadataTabId].map(Number).filter(Boolean);
            run.workerTabId=null; run.metadataTabId=null; run.metadataOpenedAt=null;
            run.status='needs-review'; run.stage='source-tab-closed'; run.completedAt=new Date().toISOString();
            run.issues=[...new Set([...(run.issues || []),'Der „Meine Anzeigen“-Tab wurde geschlossen.'])];
            return run;
          }
          if (run.workerTabId === tabId || run.metadataTabId === tabId) {
            if (run.workerTabId === tabId) run.workerTabId=null;
            if (run.metadataTabId === tabId) { run.metadataTabId=null; run.metadataOpenedAt=null; }
            return run;
          }
          return run;
        });
        if (bulkCleanupTabIds.length) await options.closeRegistryTabs(bulkCleanupTabIds, 'bulk-source-gone-cleanup', 'Inventarisierungs-Worker');
      }
      return Object.freeze({ registryEntryIsOwnedWorker, observeTabLifecycleUpdate, handleActivated, handleRemoved });
    }
  });
  globalThis.KRDeps?.register?.('KRTabLifecycleObserver', API);
})();
