(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const remoteActionTypes = new Set(options.remoteActionTypes || [
        'ENSURE_CONTENT_CONNECTION', 'REACTIVATE_DISCARDED_TABS',
        'OPEN_EDIT_AD', 'OPEN_READONLY_AD', 'PROBE_LIVE_KLEINANZEIGEN_ACCOUNT',
        'REFRESH_INVENTORY', 'CAPTURE_SINGLE_INVENTORY', 'RETRY_RENEWAL_VERIFICATION',
        'START_BULK_INVENTORY_OPERATION', 'BULK_INIT_RUN',
        'BULK_BEGIN_RECONCILIATION', 'BULK_OPEN_WORKER', 'BULK_EXTRACT_SAVE_WORKER',
        'RETRY_BULK_FAILURE', 'START_MASS_RENEWAL_BATCH', 'RETRY_MASS_RENEWAL_ITEM',
        'START_TEMPLATE_FILL', 'START_ARCHIVE_INSERTION', 'START_TRASH_TEMPLATE_FILL'
      ]);
      let cache;
      let stopInFlight = null;

      async function readPlatformAccessRestriction() {
        if (cache !== undefined) return cache;
        const stored = await options.storageLocal.get(options.restrictionKey).catch(() => ({}));
        const state = stored?.[options.restrictionKey];
        cache = state && state.active === true ? state : null;
        return cache;
      }
      function platformAccessRestrictionError(state = null) {
        const error = new Error('Kleinanzeigen hat den Zugriff vorübergehend eingeschränkt. Weitere automatisierte Aktionen wurden gestoppt.');
        error.code = options.errorCode; error.restriction = state || null; return error;
      }
      async function assertPlatformAccessAllowed(context = {}) {
        const state = await readPlatformAccessRestriction();
        if (!state?.active) return null;
        await options.logDiagnostic('info', 'PLATFORM_ACCESS_ACTION_BLOCKED', { requestedOperation: context.operation || null, requestType: context.requestType || null, detectedAt: state.detectedAt || null, restrictionCode: state.code || null }, { module: 'background', operation: context.operation || 'platform-safety', context: context.context || {} }).catch(() => {});
        throw platformAccessRestrictionError(state);
      }
      async function assertPlatformAccessAllowedForRequest(message = {}) {
        const type = String(message?.type || ''); if (!remoteActionTypes.has(type)) return null;
        return assertPlatformAccessAllowed({ operation: type, requestType: type });
      }
      async function createAutomationTab(tabOptions) { await assertPlatformAccessAllowed({ operation: 'tab-create' }); return options.chromeTabs.create(tabOptions); }
      async function updateAutomationTab(tabId, updateProperties) { await assertPlatformAccessAllowed({ operation: 'tab-update', context: { tabId } }); return options.chromeTabs.update(tabId, updateProperties); }
      async function reloadAutomationTab(tabId, reloadProperties = undefined) { await assertPlatformAccessAllowed({ operation: 'tab-reload', context: { tabId } }); return options.chromeTabs.reload(tabId, reloadProperties); }
      function broadcastPlatformAccessRestrictionChanged(state) {
        try { options.runtime.sendMessage({ type: 'PLATFORM_ACCESS_RESTRICTION_CHANGED', state: state || null }, () => void options.runtime.lastError); } catch { /* best effort */ }
      }
      async function applyPlatformSafetyStop(state) {
        const issue = 'Kleinanzeigen hat den Zugriff vorübergehend eingeschränkt. Der Vorgang wurde sicher beendet.';
        const now = new Date().toISOString();
        const bulk = await options.getBulkRunState().catch(() => null);
        if (bulk && (String(bulk.status || '') === 'running' || String(bulk.stage || '').startsWith('reconciliation-'))) {
          bulk.status = 'needs-review'; bulk.stage = 'platform-access-restricted'; bulk.completedAt = now; bulk.reconciliationStatus = 'skipped-platform-access-restricted';
          bulk.issues = [...new Set([...(bulk.issues || []), issue])];
          await options.writeBulkRunState(bulk).catch(() => {});
          await options.closeRegistryTabs([bulk.workerTabId, bulk.metadataTabId], 'platform-access-restricted', 'Inventarisierungs-Worker').catch(() => {});
          if (bulk.sourceAutoCreated === true) await options.closeRegistryTab(bulk.sourceTabId, 'platform-access-restricted', '„Meine Anzeigen“-Hintergrundtab').catch(() => {});
          else await options.releaseBulkSourceOwnership(bulk, 'platform-access-restricted').catch(() => {});
        }
        const renewals = await options.readRenewalSessions().catch(() => ({})); let renewalsChanged = false;
        for (const session of Object.values(renewals || {})) {
          if (!session || ['replaced','cancelled','needs-review','error'].includes(String(session.status || ''))) continue;
          session.status='needs-review'; session.stage='platform-access-restricted'; session.lastError=issue; session.platformSafetyStopAt=now; session.updatedAt=now; renewalsChanged=true;
        }
        if (renewalsChanged) await options.writeRenewalSessions(renewals).catch(() => {});
        const archives = await options.readArchiveInsertionSessions().catch(() => ({})); let archivesChanged=false;
        for (const session of Object.values(archives || {})) {
          if (!session || ['complete','needs-review','error','cancelled'].includes(String(session.status || ''))) continue;
          session.status='needs-review'; session.stage='platform-access-restricted'; session.lastError=issue; session.platformSafetyStopAt=now; session.updatedAt=now; archivesChanged=true;
        }
        if (archivesChanged) await options.writeArchiveInsertionSessions(archives).catch(() => {});
        const fills = await options.readFillSessions().catch(() => ({})); let fillsChanged=false;
        for (const session of Object.values(fills || {})) {
          if (!session || ['complete','needs-review','error','cancelled'].includes(String(session.status || ''))) continue;
          session.status='needs-review'; session.stage='platform-access-restricted'; session.result={complete:false,issues:[issue]}; session.platformSafetyStopAt=now; session.updatedAt=now; fillsChanged=true;
        }
        if (fillsChanged) await options.writeFillSessions(fills).catch(() => {});
        const batch = await options.readMassRenewalBatch().catch(() => null);
        if (batch && String(batch.status || '') === 'running') {
          for (const item of batch.items || []) {
            if (['running','retrying'].includes(String(item.status || ''))) { item.status='needs-review'; item.stage='platform-access-restricted'; item.lastError=issue; item.completedAt=now; options.touchMassRenewalItemProgress(item, now); }
            else if (String(item.status || '') === 'queued') { item.status='cancelled'; item.stage='not-started-platform-access-restricted'; item.completedAt=now; options.touchMassRenewalItemProgress(item, now); }
          }
          batch.currentIndex=null; batch.stopAfterCurrentRequested=true; batch.stopRequestedAt=batch.stopRequestedAt||now; batch.stoppedAt=now; batch.completedAt=now; batch.status='stopped-with-attention'; batch.platformSafetyStopAt=now;
          await options.writeMassRenewalBatch(batch).catch(() => {});
        }
        const registry = await options.getTabRegistrySnapshot().catch(() => []);
        const workerIds = (registry || []).filter(entry => entry?.lifecycleState !== options.goneState && (entry?.managed === true || entry?.role === options.bulkWorkerRole)).map(entry => Number(entry.tabId || 0)).filter(Boolean);
        await options.closeRegistryTabs(workerIds, 'platform-access-restricted', 'Kleinanzeigen-Worker').catch(() => {});
        const openTabs = await options.chromeTabs.query({ url: ['https://www.kleinanzeigen.de/*', 'https://kleinanzeigen.de/*'] }).catch(() => []);
        await Promise.all((openTabs || []).map(tab => new Promise(resolve => { if (!tab?.id) return resolve(); options.chromeTabs.sendMessage(tab.id, { type: 'KR_PLATFORM_SAFETY_STOP' }, () => resolve()); })));
        options.broadcastInventoryChanged('platform-access-restricted', { detectedAt: state?.detectedAt || now, code: state?.code || null });
        return { stopped: true };
      }
      async function activatePlatformAccessRestriction(message = {}, sender = {}) {
        const evidence = message?.evidence && typeof message.evidence === 'object' ? message.evidence : {};
        const detected = options.platformHardening?.detectAccessRestriction?.({ title: evidence.headline || '', headings: [evidence.headline || ''], url: evidence.url || sender?.tab?.url || '' });
        if (!detected?.restricted) throw new Error('Plattform-Sperre konnte nicht eindeutig bestätigt werden.');
        const previous = await readPlatformAccessRestriction(); const now = new Date().toISOString();
        const state = { active:true, code:detected.code, headline:detected.headline, detectedAt:previous?.detectedAt || now, lastSeenAt:now, tabId:Number(sender?.tab?.id || 0) || previous?.tabId || null, url:String(evidence.url || sender?.tab?.url || previous?.url || '').slice(0,1200) || null, source:'content-page' };
        cache = state; await options.storageLocal.set({ [options.restrictionKey]: state });
        if (!previous?.active) await options.logDiagnostic('warning','PLATFORM_ACCESS_RESTRICTED',{code:state.code,headline:state.headline,tabId:state.tabId,url:state.url},{module:'background',operation:'platform-safety',context:{senderTabId:state.tabId}}).catch(()=>{});
        broadcastPlatformAccessRestrictionChanged(state);
        if (!stopInFlight) stopInFlight = applyPlatformSafetyStop(state).finally(() => { stopInFlight = null; });
        await stopInFlight; return state;
      }
      async function clearPlatformAccessRestriction() {
        const previous = await readPlatformAccessRestriction(); cache = null; await options.storageLocal.remove(options.restrictionKey);
        await options.logDiagnostic('info','PLATFORM_ACCESS_RESTRICTION_CLEARED_BY_USER',{previousDetectedAt:previous?.detectedAt || null,previousCode:previous?.code || null},{module:'background',operation:'platform-safety'}).catch(()=>{});
        broadcastPlatformAccessRestrictionChanged(null); return { cleared:true, previous:previous || null };
      }
      return Object.freeze({ remoteActionTypes, readPlatformAccessRestriction, platformAccessRestrictionError, assertPlatformAccessAllowed, assertPlatformAccessAllowedForRequest, createAutomationTab, updateAutomationTab, reloadAutomationTab, broadcastPlatformAccessRestrictionChanged, applyPlatformSafetyStop, activatePlatformAccessRestriction, clearPlatformAccessRestriction });
    }
  });
  globalThis.KRDeps?.register?.('KRPlatformSafetyController', API);
})();
