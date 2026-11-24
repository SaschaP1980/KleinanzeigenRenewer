(() => {
  'use strict';
  const API=Object.freeze({
    create(options={}) {
      const {readMassRenewalBatch,readRenewalSessions,readFillSessions,findMassRenewalSessionForItem,startNextMassRenewalItem,
        classifyKleinanzeigenInsertionErrorUrl,terminalizeTemplateFillOnPlatformError,terminalizeTemplateFillForWatchdog,persistRenewalSession,
        mutateMassRenewalBatch,touchMassRenewalItemProgress,logDiagnostic,sessionCorrelationContext,chromeApi,queueMicrotaskFn,setTimeoutFn,clearTimeoutFn,
        MASS_RENEWAL_WATCHDOG_STALE_MS,MASS_RENEWAL_WATCHDOG_TICK_MS}=options;
      const required={readMassRenewalBatch,readRenewalSessions,readFillSessions,findMassRenewalSessionForItem,startNextMassRenewalItem,classifyKleinanzeigenInsertionErrorUrl,terminalizeTemplateFillOnPlatformError,terminalizeTemplateFillForWatchdog,persistRenewalSession,mutateMassRenewalBatch,touchMassRenewalItemProgress,logDiagnostic,sessionCorrelationContext,chromeApi,queueMicrotaskFn,setTimeoutFn,clearTimeoutFn};
      for(const [name,value] of Object.entries(required)) if(value==null) throw new Error(`mass renewal watchdog dependency missing: ${name}`);
      let massRenewalWatchdogTimer=null;
      let massRenewalWatchdogInFlight=false;
      function resetRuntimeState() {
        massRenewalWatchdogInFlight=false;
        if(massRenewalWatchdogTimer){clearTimeoutFn(massRenewalWatchdogTimer);massRenewalWatchdogTimer=null;}
        return true;
      }
function latestMassRenewalProgressMs(item, renewal, fill) {
  const values = [item?.lastProgressAt, item?.startedAt, renewal?.updatedAt, renewal?.createdAt, fill?.updatedAt, fill?.createdAt]
    .map(value => Date.parse(String(value || ''))).filter(Number.isFinite);
  return values.length ? Math.max(...values) : 0;
}


function armMassRenewalWatchdog() {
  if (massRenewalWatchdogTimer) return;
  massRenewalWatchdogTimer = setTimeoutFn(async () => {
    massRenewalWatchdogTimer = null;
    try { await runMassRenewalWatchdog({ trigger: 'background-timer' }); } catch { /* diagnostic inside */ }
    const batch = await readMassRenewalBatch().catch(() => null);
    if (batch?.status === 'running') armMassRenewalWatchdog();
  }, MASS_RENEWAL_WATCHDOG_TICK_MS);
}


async function runMassRenewalWatchdog({ trigger = 'manual', fillId = null } = {}) {
  if (massRenewalWatchdogInFlight) return false;
  massRenewalWatchdogInFlight = true;
  try {
    const batch = await readMassRenewalBatch();
    if (!batch || batch.status !== 'running') return false;
    const item = (batch.items || []).find(entry => ['running', 'retrying'].includes(String(entry.status || '')));
    if (!item) return false;
    const renewals = await readRenewalSessions().catch(() => ({}));
    const renewal = item.renewalId ? renewals[item.renewalId] : await findMassRenewalSessionForItem(batch.batchId, item.index);
    const fills = await readFillSessions().catch(() => ({}));
    const fill = renewal?.fillId ? fills[renewal.fillId] : Object.values(fills).find(entry => String(entry?.massBatchId || '') === String(batch.batchId) && Number(entry?.massBatchItemIndex) === Number(item.index));
    if (fillId && String(fill?.fillId || '') !== String(fillId)) return false;
    const lastProgressMs = latestMassRenewalProgressMs(item, renewal, fill);
    if (!lastProgressMs || Date.now() - lastProgressMs < MASS_RENEWAL_WATCHDOG_STALE_MS) return false;

    const targetTabId = Number(fill?.targetTabId || renewal?.targetTabId || 0) || null;
    if (targetTabId) {
      const tab = await chromeApi.tabs.get(targetTabId).catch(() => null);
      if (tab?.url) {
        const classified = classifyKleinanzeigenInsertionErrorUrl(tab.url, { title: tab.title || '' });
        if (classified.isError) {
          await terminalizeTemplateFillOnPlatformError(targetTabId, tab.url, { ...classified, title: tab.title || '', source: 'watchdog-tab-check' });
          return true;
        }
      }
    }

    const ageMs = Date.now() - lastProgressMs;
    const issue = `Das Neu-Inserieren hat seit ${Math.max(1, Math.round(ageMs / 60000))} Minuten keinen bestätigten Fortschritt mehr gemeldet.`;
    await logDiagnostic('error', 'MASS_RENEWAL_WATCHDOG_TIMEOUT', {
      batchId: batch.batchId, index: item.index, inventoryId: item.inventoryId, renewalId: renewal?.renewalId || item.renewalId || null,
      fillId: fill?.fillId || null, stage: item.stage || null, renewalStage: renewal?.stage || null, fillStage: fill?.stage || null,
      lastProgressAt: new Date(lastProgressMs).toISOString(), staleMs: ageMs, trigger, targetTabId
    }, { module: 'background', operation: 'mass-renewal-watchdog', context: sessionCorrelationContext(renewal || fill || item, { parentOperationId: (renewal || fill || item)?.parentOperationId || batch.operationId || null, massBatchId: batch.batchId, renewalId: renewal?.renewalId || item.renewalId || null, fillId: fill?.fillId || null, adId: item.newAdId || item.sourceAdId || null, targetTabId }) }).catch(() => {});

    if (fill?.fillId && ['waiting', 'running'].includes(String(fill.status || ''))) await terminalizeTemplateFillForWatchdog(fill.fillId, issue).catch(() => {});
    if (renewal?.renewalId && !['replaced', 'cancelled', 'verification-failed'].includes(String(renewal.status || ''))) {
      renewal.status = 'verification-failed'; renewal.stage = 'progress-watchdog-timeout'; renewal.lastError = issue; await persistRenewalSession(renewal); return true;
    }
    if (!renewal?.renewalId) {
      await mutateMassRenewalBatch(batch.batchId, current => {
        const currentItem = current.items?.find(entry => Number(entry.index) === Number(item.index));
        if (!currentItem || !['running', 'retrying'].includes(String(currentItem.status || ''))) return { changed: false };
        currentItem.status = 'needs-review'; currentItem.stage = 'progress-watchdog-timeout'; currentItem.lastError = issue; currentItem.completedAt = new Date().toISOString(); touchMassRenewalItemProgress(currentItem, currentItem.completedAt); current.currentIndex = null;
        return { changed: true };
      });
      queueMicrotaskFn(() => { void startNextMassRenewalItem(batch.batchId).catch(() => {}); });
      return true;
    }
    return false;
  } catch (error) {
    const failedBatch = await readMassRenewalBatch().catch(() => null);
    const failedItem = failedBatch?.items?.find(entry => ['running', 'retrying'].includes(String(entry?.status || ''))) || null;
    await logDiagnostic('error', 'MASS_RENEWAL_WATCHDOG_CHECK_FAILED', {
      trigger,
      message: String(error?.message || error).slice(0, 800),
      stack: String(error?.stack || '').slice(0, 2400)
    }, {
      module: 'background',
      operation: 'mass-renewal-watchdog',
      context: failedBatch
        ? sessionCorrelationContext(failedItem || failedBatch, {
            parentOperationId: failedItem?.parentOperationId || (failedItem ? failedBatch.operationId || null : null),
            massBatchId: failedBatch.batchId || null
          })
        : {}
    }).catch(() => {});
    return false;
  } finally {
    massRenewalWatchdogInFlight = false;
  }
}


async function massRenewalWatchdogTick(message, sender) {
  armMassRenewalWatchdog();
  let fillId = String(message?.fillId || '');
  if (!fillId && sender?.tab?.id) {
    const fills = await readFillSessions().catch(() => ({}));
    const fill = Object.values(fills).find(entry => Number(entry?.targetTabId) === Number(sender.tab.id) && ['waiting', 'running'].includes(String(entry?.status || '')));
    fillId = String(fill?.fillId || '');
  }
  // Heartbeats wake the service worker and trigger a stale check; they are not progress by themselves.
  await runMassRenewalWatchdog({ trigger: 'MASS_RENEWAL_WATCHDOG_TICK', fillId: fillId || null });
  return { checked: true };
}


      return Object.freeze({latestMassRenewalProgressMs, armMassRenewalWatchdog, runMassRenewalWatchdog, massRenewalWatchdogTick, resetRuntimeState});
    }
  });
  globalThis.KRDeps?.register?.('KRMassRenewalWatchdogService',API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
