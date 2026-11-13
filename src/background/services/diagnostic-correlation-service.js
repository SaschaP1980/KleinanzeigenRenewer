// In-process enrichment of diagnostics using scoped persisted workflow
// correlations. This is evidence-only: never writes or starts work.
(() => {
  'use strict';
  const deps=globalThis.KRDeps;if(!deps)throw Error('KRDeps must load before diagnostic-correlation-service');
  const API=Object.freeze({
    create(options={}) {
      const {correlationContext,storageLocal,RENEWAL_SESSIONS_KEY,
        MASS_RENEWAL_BATCH_KEY,ARCHIVE_INSERTION_SESSIONS_KEY}=options;
      if (typeof correlationContext!=='function' || typeof storageLocal?.get!=='function')
        throw Error('KRDiagnosticCorrelationService requires correlation and read-only storage ports');

      function correlationContextFromBindings(baseContext = {}, bindings = {}) {
        let result = correlationContext(baseContext);
        const fillSessions = Object.values(bindings.fillSessions || {}).filter(Boolean);
        const renewalSessions = Object.values(bindings.renewalSessions || {}).filter(Boolean);
        const archiveSessions = Object.values(bindings.archiveSessions || {}).filter(Boolean);
        const bulkRun = bindings.bulkRun && typeof bindings.bulkRun === 'object' ? bindings.bulkRun : null;
        const massBatch = bindings.massBatch && typeof bindings.massBatch === 'object' ? bindings.massBatch : null;
        const senderTabId = Number(baseContext?.senderTabId || 0) || null;

        const fill = fillSessions.find(item =>
          (result.fillId && String(item?.fillId || '') === String(result.fillId)) ||
          (result.renewalId && String(item?.renewalId || '') === String(result.renewalId)) ||
          (senderTabId && Number(item?.targetTabId || 0) === senderTabId)
        ) || null;
        if (fill) result = correlationContext(result, fill);

        const renewal = renewalSessions.find(item =>
          (result.renewalId && String(item?.renewalId || '') === String(result.renewalId)) ||
          (result.fillId && String(item?.fillId || '') === String(result.fillId)) ||
          (fill?.renewalId && String(item?.renewalId || '') === String(fill.renewalId)) ||
          (senderTabId && Number(item?.targetTabId || 0) === senderTabId)
        ) || null;
        if (renewal) result = correlationContext(result, renewal);

        const archive = archiveSessions.find(item =>
          (result.archiveInsertionId && String(item?.archiveInsertionId || '') === String(result.archiveInsertionId)) ||
          (result.fillId && String(item?.fillId || '') === String(result.fillId)) ||
          (senderTabId && Number(item?.targetTabId || 0) === senderTabId)
        ) || null;
        if (archive) result = correlationContext(result, archive);

        const massBatchId = String(result.massBatchId || renewal?.massBatchId || fill?.massBatchId || '');
        const massItems = Array.isArray(massBatch?.items) ? massBatch.items : [];
        const massItem = massItems.find(item =>
          (result.renewalId && String(item?.renewalId || '') === String(result.renewalId)) ||
          (result.operationId && String(item?.operationId || '') === String(result.operationId))
        ) || null;
        if (massItem) result = correlationContext(result, massItem, { massBatchId: massBatch?.batchId || massBatchId });

        const bulkMatches = bulkRun && (
          (result.bulkRunId && String(bulkRun.bulkRunId || bulkRun.runId || '') === String(result.bulkRunId)) ||
          (result.runId && String(bulkRun.runId || '') === String(result.runId)) ||
          (senderTabId && [bulkRun.sourceTabId, bulkRun.workerTabId, bulkRun.metadataTabId].some(value => Number(value || 0) === senderTabId))
        );
        if (bulkMatches) result = correlationContext(result, bulkRun);

        if (massBatch && (massBatchId && String(massBatch.batchId || '') === massBatchId || massItem)) {
          result = correlationContext(result, { ...massBatch, massBatchId: massBatch.batchId || massBatchId });
        }
        return result;
      }

      async function resolveClientDiagnosticCorrelation(message = {}, sender = {}) {
        const senderTabId = Number(sender?.tab?.id || 0) || null;
        const base = correlationContext(message?.context || {}, message?.details || {});
        if (base.operationId) return base;
        const stored = await chrome.storage.local.get([
          'bulkInventoryRun', 'templateFillSessions', RENEWAL_SESSIONS_KEY,
          MASS_RENEWAL_BATCH_KEY, ARCHIVE_INSERTION_SESSIONS_KEY
        ]).catch(() => ({}));
        return correlationContextFromBindings({ ...base, senderTabId }, {
          bulkRun: stored?.bulkInventoryRun || null,
          fillSessions: stored?.templateFillSessions || {},
          renewalSessions: stored?.[RENEWAL_SESSIONS_KEY] || {},
          massBatch: stored?.[MASS_RENEWAL_BATCH_KEY] || null,
          archiveSessions: stored?.[ARCHIVE_INSERTION_SESSIONS_KEY] || {}
        });
      }

      return Object.freeze({resolveClientDiagnosticCorrelation});
    }
  });
  deps.register('KRDiagnosticCorrelationService',API);
})();
