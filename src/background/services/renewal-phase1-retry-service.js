// Renewal phase-1 retry admission and guarded replacement of the failed fill tab.
// Reuses the existing persisted session, budget and emergency-reset in-flight set.
(() => {
  'use strict';
  const deps=globalThis.KRDeps;
  if (!deps) throw new Error('KRDeps must load before renewal-phase1-retry-service');
  const API=Object.freeze({
    create(options={}) {
      const { readRenewalSessions, readFillSessions, writeFillSessions, persistRenewalSession }=options.sessionPort || {};
      const { renewalPhaseAttemptAvailable, renewalAttemptState, beginRenewalPhaseAttempt, normalizeRenewalMode, renewalMaxPhaseAttempts }=options.policyPort || {};
      const { createAutomationTab, registerShadowTab, closeRegistryTab, updateAutomationTab }=options.tabPort || {};
      const { correlationContext, sessionCorrelationContext, logDiagnostic }=options.diagnosticsPort || {};
      const { crypto, TEMPLATE_TARGET_URL, TAB_ROLES }=options.configPort || {};
      const { renewalPhase1RetryInFlight }=options.statePort || {};
      if ([readRenewalSessions, readFillSessions, writeFillSessions, persistRenewalSession, renewalPhaseAttemptAvailable, renewalAttemptState, beginRenewalPhaseAttempt, normalizeRenewalMode, renewalMaxPhaseAttempts, createAutomationTab, registerShadowTab, closeRegistryTab, updateAutomationTab, correlationContext, sessionCorrelationContext, logDiagnostic].some(fn=>typeof fn!=='function') ||
          !renewalPhase1RetryInFlight ||
          ['has','add','delete'].some(name=>typeof renewalPhase1RetryInFlight[name]!=='function') ||
          !crypto?.randomUUID || !TAB_ROLES || typeof TEMPLATE_TARGET_URL!=='string') {
        throw new Error('KRRenewalPhase1RetryService requires fail-closed session, budget, tab, diagnostic and emergency-reset ports');
      }

      function phase1PublishBoundaryReached(renewal, fill = null) {
        if (/^\d+$/.test(String(renewal?.newAdId || ''))) return true;
        if (renewal?.publishClickedAt || fill?.publishClickedAt) return true;
        const statuses = [renewal?.status, fill?.status].map(value => String(value || ''));
        if (statuses.some(status => ['submitted', 'new-id-confirmed', 'reinventorizing', 'verifying', 'verified', 'replaced'].includes(status))) return true;
        const stages = [renewal?.stage, fill?.stage].map(value => String(value || ''));
        return stages.some(stage => ['publish-submitted', 'new-id-confirmed'].includes(stage));
      }

      function canRetryRenewalPhase1(renewal, fill = null) {
        if (!renewal?.renewalId || phase1PublishBoundaryReached(renewal, fill)) return false;
        if (['cancelled', 'replaced'].includes(String(renewal.status || ''))) return false;
        return renewalPhaseAttemptAvailable(renewal, 1);
      }

      async function restartRenewalPhase1Attempt(renewalId, failedFillId, reason = 'phase-1-fill-failed') {
        const id = String(renewalId || '');
        if (!id || renewalPhase1RetryInFlight.has(id)) return false;
        renewalPhase1RetryInFlight.add(id);
        try {
          const [renewals, fills] = await Promise.all([readRenewalSessions(), readFillSessions()]);
          const renewal = renewals[id];
          const failedFill = fills[String(failedFillId || '')];
          if (!renewal || !failedFill) return false;
          if (String(renewal.fillId || '') !== String(failedFill.fillId || '')) return false;
          if (!canRetryRenewalPhase1(renewal, failedFill)) return false;

          const previousTargetTabId = Number(renewal.targetTabId || failedFill.targetTabId || 0) || null;
          const previousAttempt = renewalAttemptState(renewal, 1);
          const attemptState = beginRenewalPhaseAttempt(renewal, 1, { lastError: failedFill.result?.issues?.[0] || renewal.lastError || reason });
          const fillId = crypto.randomUUID();
          const tab = await createAutomationTab({ url: 'about:blank', active: false });
          if (!tab?.id) throw new Error('Neuer Kleinanzeigen-Tab für den Phase-1-Wiederholungsversuch konnte nicht geöffnet werden.');

          renewal.fillId = fillId;
          renewal.targetTabId = tab.id;
          renewal.status = 'draft';
          renewal.stage = 'phase1-retry-started';
          renewal.lastError = null;
          renewal.updatedAt = new Date().toISOString();
          await persistRenewalSession(renewal);

          const nextFill = {
            operationId: renewal.operationId || failedFill.operationId || null,
            parentOperationId: renewal.parentOperationId || failedFill.parentOperationId || null,
            fillId,
            renewalId: id,
            skeletonInventoryId: renewal.skeletonInventoryId,
            inventoryId: renewal.sourceInventoryId,
            sourceAdId: renewal.sourceAdId,
            targetTabId: tab.id,
            targetUrl: TEMPLATE_TARGET_URL,
            renewalMode: normalizeRenewalMode(renewal.renewalMode),
            maxPhaseAttempts: renewalMaxPhaseAttempts(renewal),
            phase1Attempt: attemptState.attempt,
            phase1AttemptId: attemptState.attemptId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'waiting',
            stage: 'tab-opened',
            result: null,
            autoReplacementAllowed: Boolean(renewal.autoReplacementAllowed),
            startConfirmedAt: renewal.startConfirmedAt || failedFill.startConfirmedAt || null,
            massBatchId: renewal.massBatchId || failedFill.massBatchId || null,
            massBatchItemIndex: renewal.massBatchItemIndex ?? failedFill.massBatchItemIndex ?? null
          };
          fills[fillId] = nextFill;
          await writeFillSessions(fills);
          await registerShadowTab(tab.id, TAB_ROLES.RENEWAL_TARGET, { ...correlationContext(renewal), ownerType: 'renewal', ownerId: id, inventoryId: String(renewal.sourceInventoryId || ''), adId: String(renewal.sourceAdId || '') });

          if (previousTargetTabId && previousTargetTabId !== tab.id) {
            await closeRegistryTab(previousTargetTabId, 'renewal-phase1-retry', 'Vorheriger Phase-1-Zieltab').catch(() => {});
          }

          await updateAutomationTab(tab.id, { url: TEMPLATE_TARGET_URL, active: true });
          await logDiagnostic('warning', 'RENEWAL_PHASE1_ATTEMPT_RESTARTED', {
            renewalId: id,
            sourceAdId: renewal.sourceAdId,
            previousFillId: failedFill.fillId,
            fillId,
            previousAttempt: previousAttempt.attempt,
            attempt: attemptState.attempt,
            maxAttempts: renewalMaxPhaseAttempts(renewal),
            phase1AttemptId: attemptState.attemptId,
            reason: String(reason || '').slice(0, 300)
          }, { module: 'background', operation: 'renewal-phase-1', context: sessionCorrelationContext(renewal, { renewalId: id, fillId, adId: renewal.sourceAdId, targetTabId: tab.id }) }).catch(() => {});
          return true;
        } catch (error) {
          const renewals = await readRenewalSessions().catch(() => ({}));
          const renewal = renewals[id];
          if (renewal && !phase1PublishBoundaryReached(renewal)) {
            renewal.status = 'verification-failed';
            renewal.stage = 'phase1-retry-start-failed';
            renewal.lastError = String(error.message || error).slice(0, 800);
            await persistRenewalSession(renewal).catch(() => {});
          }
          await logDiagnostic('error', 'RENEWAL_PHASE1_RETRY_START_FAILED', {
            renewalId: id,
            fillId: failedFillId || null,
            message: String(error.message || error).slice(0, 800)
          }, { module: 'background', operation: 'renewal-phase-1', context: sessionCorrelationContext(renewal || { renewalId: id }, { renewalId: id }) }).catch(() => {});
          return false;
        } finally {
          renewalPhase1RetryInFlight.delete(id);
        }
      }

      return Object.freeze({canRetryRenewalPhase1,restartRenewalPhase1Attempt});
    }
  });
  deps.register('KRRenewalPhase1RetryService',API);
})();
