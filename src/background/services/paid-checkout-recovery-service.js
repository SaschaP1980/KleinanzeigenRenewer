(() => {
  'use strict';
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before paid-checkout-recovery-service.js');
  const API = Object.freeze({
    create({ sessionPort = {}, inventoryPort = {}, tabPort = {}, diagnosticsPort = {}, policyPort = {}, batchPort = {}, flowPort = {}, configPort = {} } = {}) {
      const { readProfiles, readDiagnostics, readInventoryRecordsForProfile } = sessionPort;
      const { getInventory } = inventoryPort;
      const { ensureContentConnection, createManagedWorkerTab, normalBrowserWindowId, sendTabRequestWithBootstrap, closeManagedWorkerTab, waitForTabComplete } = tabPort;
      const { logDiagnostic, sessionCorrelationContext, flushDiagnosticBuffer, correlationContext } = diagnosticsPort;
      const { normalizeProfileName, isCheckoutAbortedRecoveryCandidate, evaluateCheckoutRecoveryProof } = policyPort;
      const { mutateMassRenewalBatch, massRenewalBatchCounts, touchMassRenewalItemProgress } = batchPort;
      const { persistRenewalSession } = flowPort;
      const { TAB_LOAD_TIMEOUT_PHASE4_MS, MY_ADS_PROJECTS_URL } = configPort;
      for (const [name, fn] of Object.entries({ readProfiles, readDiagnostics, readInventoryRecordsForProfile, getInventory, ensureContentConnection, createManagedWorkerTab, normalBrowserWindowId, sendTabRequestWithBootstrap, closeManagedWorkerTab, waitForTabComplete, logDiagnostic, sessionCorrelationContext, flushDiagnosticBuffer, correlationContext, normalizeProfileName, isCheckoutAbortedRecoveryCandidate, evaluateCheckoutRecoveryProof, mutateMassRenewalBatch, massRenewalBatchCounts, touchMassRenewalItemProgress, persistRenewalSession })) {
        if (typeof fn !== 'function') throw new Error('paid-checkout-recovery-service dependency ' + name + ' is required');
      }

      async function checkoutRecoveryEvidenceForRenewal(session) {
        if (String(session?.checkoutPath || '') === '/m-bestellung-aufnehmen.html' || String(session?.paidInsertion?.phase || '') === 'checkout') {
          return { checkoutObserved: true, source: 'session', observedAt: session.checkoutObservedAt || null };
        }
        await flushDiagnosticBuffer().catch(() => {});
        const diagnostics = await readDiagnostics().catch(() => []);
        const renewalId = String(session?.renewalId || '');
        const match = [...(Array.isArray(diagnostics) ? diagnostics : [])].reverse().find(event => {
          const eventRenewalId = String(event?.context?.renewalId || event?.details?.renewalId || '');
          if (!renewalId || eventRenewalId !== renewalId) return false;
          if (String(event?.event || '') === 'PAID_INSERTION_CHECKOUT_DETECTED') return true;
          return String(event?.event || '') === 'RENEWAL_NEW_ID_DETECTION_PENDING' && String(event?.details?.path || '') === '/m-bestellung-aufnehmen.html';
        });
        return { checkoutObserved: Boolean(match), source: match ? 'diagnostics' : null, observedAt: match?.timestamp || match?.time || null };
      }
      
      async function checkoutRecoveryBaselineForRenewal(session) {
        const cutoff = Date.parse(String(session?.publishClickedAt || ''));
        if (!Number.isFinite(cutoff)) return { baselineIds: [], expectedProfile: '', sourceKnownBeforeClick: false };
        const profileId = String(session?.profileId || '');
        if (!profileId) return { baselineIds: [], expectedProfile: '', sourceKnownBeforeClick: false };
        const records = await readInventoryRecordsForProfile(profileId);
        const baselineIds = [...new Set(records.filter(record => {
          if (!record) return false;
          if (/^renewal-/i.test(String(record.recordKind || ''))) return false;
          const adId = String(record.adId || '');
          const capturedAt = Date.parse(String(record.capturedAt || ''));
          return /^\d+$/.test(adId) && Number.isFinite(capturedAt) && capturedAt <= cutoff;
        }).map(record => String(record.adId)))];
        const profileState = await readProfiles().catch(() => ({ profiles: [] }));
        const profile = (profileState?.profiles || []).find(item => String(item?.profileId || '') === profileId);
        const source = await getInventory(session.sourceInventoryId).catch(() => null);
        const expectedProfile = normalizeProfileName(profile?.displayName || source?.profileName || '');
        return { baselineIds, expectedProfile, sourceKnownBeforeClick: baselineIds.includes(String(session.sourceAdId || '')) };
      }
      
      async function verifyAbortedPaidCheckoutNoPublication(session, trigger = 'recovery') {
        const evidence = await checkoutRecoveryEvidenceForRenewal(session);
        if (!isCheckoutAbortedRecoveryCandidate(session, evidence)) return { attempted: false, verified: false, reason: 'not-checkout-recovery-candidate' };
        const baseline = await checkoutRecoveryBaselineForRenewal(session);
        if (!baseline.expectedProfile || !baseline.sourceKnownBeforeClick) {
          const reason = !baseline.expectedProfile ? 'expected-profile-unavailable' : 'source-not-in-prepublish-baseline';
          await logDiagnostic('warning', 'RENEWAL_CHECKOUT_RECOVERY_VERIFICATION_BLOCKED', {
            renewalId: session.renewalId, sourceAdId: session.sourceAdId || null, trigger, reason,
            baselineCount: baseline.baselineIds.length, checkoutEvidenceSource: evidence.source || null
          }, { module: 'background', operation: 'renewal-checkout-recovery', context: sessionCorrelationContext(session, { renewalId: session.renewalId, adId: session.sourceAdId || null }) }).catch(() => {});
          return { attempted: true, verified: false, reason };
        }
      
        await logDiagnostic('info', 'RENEWAL_CHECKOUT_RECOVERY_VERIFICATION_STARTED', {
          renewalId: session.renewalId, sourceAdId: session.sourceAdId, trigger,
          baselineCount: baseline.baselineIds.length, checkoutEvidenceSource: evidence.source || null
        }, { module: 'background', operation: 'renewal-checkout-recovery', context: sessionCorrelationContext(session, { renewalId: session.renewalId, adId: session.sourceAdId }) }).catch(() => {});
      
        let workerTabId = null;
        try {
          const windowId = await normalBrowserWindowId();
          const worker = await createManagedWorkerTab({ ...(windowId ? { windowId } : {}), url: MY_ADS_PROJECTS_URL, active: false }, 'renewal-checkout-recovery', {
            ...correlationContext(session), ownerType: 'renewal', ownerId: session.renewalId, adId: session.sourceAdId
          });
          if (!worker?.id) throw new Error('Checkout-Recovery-Prüftab konnte nicht geöffnet werden.');
          workerTabId = worker.id;
          await waitForTabComplete(workerTabId, { timeoutMs: TAB_LOAD_TIMEOUT_PHASE4_MS, purpose: 'renewal-checkout-recovery', label: 'Checkout-Recovery-Prüftab', operation: 'renewal-checkout-recovery', context: sessionCorrelationContext(session, { renewalId: session.renewalId, adId: session.sourceAdId, workerTabId }) });
          await ensureContentConnection({ tabId: workerTabId });
          const roster = await sendTabRequestWithBootstrap(workerTabId, { type: 'MY_ADS_STATUS', fullRoster: true, correlation: correlationContext(session) });
          const proof = evaluateCheckoutRecoveryProof({ session, expectedProfile: baseline.expectedProfile, baselineIds: baseline.baselineIds, roster: { ...roster, ids: roster?.ids || roster?.listingIds || [] } });
          const event = proof.verified ? 'RENEWAL_CHECKOUT_RECOVERY_VERIFICATION_CONFIRMED' : 'RENEWAL_CHECKOUT_RECOVERY_VERIFICATION_BLOCKED';
          await logDiagnostic(proof.verified ? 'info' : 'warning', event, {
            renewalId: session.renewalId, sourceAdId: session.sourceAdId, trigger, reason: proof.reason,
            baselineCount: baseline.baselineIds.length, remoteCount: proof.remoteIds.length, onlineCount: proof.onlineCount,
            pagesScanned: roster?.pagesScanned ?? null, unknownRemoteIds: proof.unknownIds,
            sourceStillPresent: proof.sourceStillPresent, profileMatches: proof.profileMatches, rosterComplete: proof.complete
          }, { module: 'background', operation: 'renewal-checkout-recovery', context: sessionCorrelationContext(session, { renewalId: session.renewalId, adId: session.sourceAdId, workerTabId }) }).catch(() => {});
          return { attempted: true, ...proof, pagesScanned: roster?.pagesScanned ?? null, checkoutEvidenceSource: evidence.source || null };
        } catch (error) {
          await logDiagnostic('warning', 'RENEWAL_CHECKOUT_RECOVERY_VERIFICATION_FAILED', {
            renewalId: session?.renewalId || null, sourceAdId: session?.sourceAdId || null, trigger,
            message: String(error?.message || error).slice(0, 600)
          }, { module: 'background', operation: 'renewal-checkout-recovery', context: sessionCorrelationContext(session, { renewalId: session?.renewalId || null, adId: session?.sourceAdId || null, workerTabId }) }).catch(() => {});
          return { attempted: true, verified: false, reason: 'verification-error', error: String(error?.message || error).slice(0, 600) };
        } finally {
          if (workerTabId) await closeManagedWorkerTab(workerTabId).catch(() => {});
        }
      }
      
      async function finalizeVerifiedCheckoutAbort(session, proof, trigger = 'recovery') {
        const now = new Date().toISOString();
        session.status = 'cancelled';
        session.stage = 'checkout-aborted-verified';
        session.massBatchTerminal = Boolean(session.massBatchId) || session.massBatchTerminal === true;
        session.recoveryAt = now;
        session.lastError = null;
        session.checkoutRecovery = {
          verifiedAt: now, trigger, evidence: 'fresh-my-ads-roster-vs-prepublish-local-baseline',
          baselineCount: Number(proof?.baselineIds?.length || 0), remoteCount: Number(proof?.remoteIds?.length || 0),
          onlineCount: proof?.onlineCount ?? null, pagesScanned: proof?.pagesScanned ?? null
        };
        await persistRenewalSession(session);
        if (session.massBatchId) {
          await mutateMassRenewalBatch(session.massBatchId, batch => {
            const item = (batch.items || []).find(entry => String(entry?.renewalId || '') === String(session.renewalId || '') || Number(entry?.index) === Number(session.massBatchItemIndex));
            if (!item) return { changed: false };
            item.status = 'cancelled';
            item.stage = 'checkout-aborted-verified';
            item.renewalStatus = 'cancelled';
            item.lastError = null;
            item.completedAt = item.completedAt || now;
            touchMassRenewalItemProgress(item, now);
            if (String(batch.status || '') === 'stopped-with-attention') {
              const counts = massRenewalBatchCounts(batch);
              if (counts.attention === 0) batch.status = 'stopped';
            }
            return { changed: true };
          }).catch(() => {});
        }
        await logDiagnostic('info', 'RENEWAL_CHECKOUT_ABORT_RECOVERED', {
          renewalId: session.renewalId, sourceAdId: session.sourceAdId, trigger,
          evidence: session.checkoutRecovery.evidence, baselineCount: session.checkoutRecovery.baselineCount,
          remoteCount: session.checkoutRecovery.remoteCount, onlineCount: session.checkoutRecovery.onlineCount
        }, { module: 'background', operation: 'renewal-checkout-recovery', context: sessionCorrelationContext(session, { renewalId: session.renewalId, adId: session.sourceAdId }) }).catch(() => {});
        return session;
      }
      
      async function tryRecoverAbortedPaidCheckout(session, trigger = 'recovery') {
        const evidence = await checkoutRecoveryEvidenceForRenewal(session);
        if (!isCheckoutAbortedRecoveryCandidate(session, evidence)) return { recovered: false, attempted: false, reason: 'not-candidate' };
        const proof = await verifyAbortedPaidCheckoutNoPublication(session, trigger);
        if (!proof.verified) return { recovered: false, attempted: proof.attempted === true, reason: proof.reason || 'not-verified' };
        const recovered = await finalizeVerifiedCheckoutAbort(session, proof, trigger);
        return { recovered: true, attempted: true, session: recovered, proof };
      }

      return Object.freeze({ checkoutRecoveryEvidenceForRenewal, checkoutRecoveryBaselineForRenewal, verifyAbortedPaidCheckoutNoPublication, finalizeVerifiedCheckoutAbort, tryRecoverAbortedPaidCheckout });
    }
  });
  KRDeps.register('KRPaidCheckoutRecoveryService', API);
})();
