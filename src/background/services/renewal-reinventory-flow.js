(() => {
  'use strict';
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before renewal-reinventory-flow.js');
  const API = Object.freeze({
    create({ sessionPort = {}, inventoryPort = {}, tabPort = {}, diagnosticsPort = {}, policyPort = {}, validationPort = {}, flowPort = {}, configPort = {}, miscPort = {} } = {}) {
      const { readRenewalSessions } = sessionPort;
      const { saveInventory, broadcastInventoryChanged, putInventoryRecordOnly, getInventory, mergeListingMetadata } = inventoryPort;
      const { ensureContentConnection, createManagedWorkerTab, retirePublishedRenewalTargetTab, normalBrowserWindowId, sendTabRequestWithBootstrap, closeRegistryTab, closeManagedWorkerTab, waitForTabComplete } = tabPort;
      const { logDiagnostic, sessionCorrelationContext, logRenewalPhaseAttemptFailed, correlationContext, logRenewalPhaseAttemptStarted } = diagnosticsPort;
      const { isNonRetryableRenewalSafetyError, renewalMaxPhaseAttempts, normalizeKnownPublicAdUrl, renewalPhaseRetryDelayMs, renewalAttemptState, renewalAttemptDetails, renewalOutcomeForComparison, renewalPhaseAttemptAvailable } = policyPort;
      const { compareRenewalRecords, renewalInsertionMeta, publicAvailabilitySnapshot, resolveRenewalPublicEvidence, renewalPublicSnapshot } = validationPort;
      const { persistRenewalSession, scheduleAutomaticRenewalReplacement, sendRenewalFeedback } = flowPort;
      const { BULK_RETRY_POLL_MS, TAB_LOAD_TIMEOUT_RENEWAL_MS, BULK_RETRY_TIMEOUT_MS, RENEWAL_MODE_SAFE } = configPort;
      const { delay } = miscPort;
      for (const [name, fn] of Object.entries({ readRenewalSessions, saveInventory, broadcastInventoryChanged, putInventoryRecordOnly, getInventory, mergeListingMetadata, ensureContentConnection, createManagedWorkerTab, retirePublishedRenewalTargetTab, normalBrowserWindowId, sendTabRequestWithBootstrap, closeRegistryTab, closeManagedWorkerTab, waitForTabComplete, logDiagnostic, sessionCorrelationContext, logRenewalPhaseAttemptFailed, correlationContext, logRenewalPhaseAttemptStarted, isNonRetryableRenewalSafetyError, renewalMaxPhaseAttempts, normalizeKnownPublicAdUrl, renewalPhaseRetryDelayMs, renewalAttemptState, renewalAttemptDetails, renewalOutcomeForComparison, renewalPhaseAttemptAvailable, compareRenewalRecords, renewalInsertionMeta, publicAvailabilitySnapshot, resolveRenewalPublicEvidence, renewalPublicSnapshot, persistRenewalSession, scheduleAutomaticRenewalReplacement, sendRenewalFeedback, delay })) {
        if (typeof fn !== 'function') throw new Error('renewal-reinventory-flow dependency ' + name + ' is required');
      }

      async function runRenewalReinventory(renewalId) {
        const sessions = await readRenewalSessions();
        const session = sessions[renewalId];
        if (!session) throw new Error('Renewal-Sitzung wurde nicht gefunden.');
        const newAdId = String(session.newAdId || '');
        if (!/^\d+$/.test(newAdId)) throw new Error('Neue Anzeigen-ID wurde noch nicht bestätigt.');
        if (session.status === 'verified') return renewalPublicSnapshot(session);
      
        if (session.targetTabId) await retirePublishedRenewalTargetTab(session);
      
        // Service-worker restarts may leave persisted worker ids behind. The attempt
        // counters remain authoritative; only the dead worker state is cleared.
        if (['reinventorizing', 'verifying'].includes(session.status)) {
          await Promise.all([session.workerTabId, session.metadataTabId].filter(Boolean).map(tabId => closeManagedWorkerTab(tabId).catch(() => closeRegistryTab(tabId, 'renewal-resume-cleanup', 'Renewal-Prüfworker').catch(() => {}))));
          session.workerTabId = null;
          session.metadataTabId = null;
          session.status = 'new-id-confirmed';
          session.stage = 'resume-after-worker-restart';
          await persistRenewalSession(session);
        }
      
        const source = await getInventory(session.sourceInventoryId);
        if (!source) throw new Error('Quell-Inventareintrag wurde nicht gefunden.');
      
        await sendRenewalFeedback(session, 'Neue Anzeige wird kontrolliert', 'Die neue Anzeige wird nochmals vollständig ausgelesen und mit der bisherigen Anzeige verglichen. Anschließend wird ihre Sichtbarkeit geprüft.');
        await logDiagnostic('info', 'RENEWAL_REINVENTORY_STARTED', {
          renewalId,
          sourceAdId: session.sourceAdId,
          newAdId,
          verificationOrder: ['edit', 'fresh-canonical-public', 'fresh-id-direct-public', 'fresh-my-ads'],
          maxAttemptsPerPhase: renewalMaxPhaseAttempts(session)
        }, { module: 'background', operation: 'renewal-reinventory', context: sessionCorrelationContext(session, { renewalId, adId: newAdId }) }).catch(() => {});
      
        let candidate = await getInventory(session.skeletonInventoryId);
        const storedPhase2Ready = Boolean(session.phase2CompletedAt)
          && String(candidate?.adId || '') === newAdId
          && String(candidate?.renewal?.phase2CapturedAt || '');
      
        if (!storedPhase2Ready) {
          let phase2Completed = false;
          let phase2LastError = null;
      
          while (renewalPhaseAttemptAvailable(session, 2)) {
            const previousAttempt = renewalAttemptState(session, 2).attempt;
            if (previousAttempt > 0) await delay(renewalPhaseRetryDelayMs(previousAttempt + 1));
            const attemptState = await logRenewalPhaseAttemptStarted(session, 2, 'RENEWAL_PHASE2_ATTEMPT_STARTED', 'renewal-phase-2', {
              verification: 'fresh-edit-reinventory'
            });
      
            let workerTabId = null;
            try {
              session.status = 'reinventorizing';
              session.stage = 'edit-worker-opening';
              session.lastError = null;
              await persistRenewalSession(session);
      
              const windowId = await normalBrowserWindowId();
              const editUrl = `https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=${encodeURIComponent(newAdId)}`;
              const editTab = await createManagedWorkerTab({ ...(windowId ? { windowId } : {}), url: editUrl, active: false }, 'renewal-reinventory', { ...correlationContext(session), ownerType: 'renewal', ownerId: renewalId, adId: newAdId, phaseAttemptId: attemptState.attemptId });
              if (!editTab?.id) throw new Error('Bearbeiten-Worker der neuen Anzeige konnte nicht geöffnet werden.');
              workerTabId = editTab.id;
              session.workerTabId = workerTabId;
              session.metadataTabId = null;
              session.stage = 'edit-worker-opened';
              await persistRenewalSession(session);
      
              await waitForTabComplete(workerTabId, { timeoutMs: TAB_LOAD_TIMEOUT_RENEWAL_MS, purpose: 'renewal-reinventory', label: 'Renewal-Bearbeiten-Worker', operation: 'renewal-phase-2', context: sessionCorrelationContext(session, { renewalId, adId: newAdId, workerTabId, phaseAttempt: attemptState.attempt, phaseAttemptId: attemptState.attemptId }) });
              await ensureContentConnection({ tabId: workerTabId });
              const deadline = Date.now() + BULK_RETRY_TIMEOUT_MS;
              let extracted = null;
              let lastReason = '';
              while (Date.now() < deadline) {
                try {
                  extracted = await sendTabRequestWithBootstrap(workerTabId, { type: 'EXTRACT_CURRENT_AD' });
                  if (String(extracted?.adId || '') === newAdId) break;
                  lastReason = `Worker-Anzeige ${extracted?.adId || 'unbekannt'} entspricht nicht ${newAdId}.`;
                  extracted = null;
                } catch (error) {
                  lastReason = String(error.message || error).slice(0, 300);
                }
                await delay(BULK_RETRY_POLL_MS);
              }
              if (!extracted) throw new Error(lastReason || 'Neue Anzeige wurde auf der Bearbeiten-Seite nicht rechtzeitig inventarisierbar.');
      
              await logDiagnostic('info', 'RENEWAL_EDIT_RECHECK_CAPTURED', {
                renewalId,
                sourceAdId: session.sourceAdId,
                newAdId,
                editUrl,
                title: String(extracted.title || '').slice(0, 180),
                imageCount: Number(extracted.imageSummary?.discovered || extracted.images?.length || 0),
                attempt: attemptState.attempt,
                maxAttempts: renewalMaxPhaseAttempts(session),
                attemptId: attemptState.attemptId
              }, { module: 'background', operation: 'renewal-phase-2', context: sessionCorrelationContext(session, { renewalId, adId: newAdId, workerTabId }) }).catch(() => {});
      
              extracted.profileId = source.profileId || null;
              extracted.profileName = source.profileName || null;
              extracted.recordKind = 'renewal-candidate';
              extracted.insertionMeta = renewalInsertionMeta(session);
              extracted.listingMeta = mergeListingMetadata(extracted, candidate?.listingMeta || {}, null, {
                publicUrl: session.newPublicUrl || null,
                source: 'renewal-phase-2-edit'
              });
              const phase2CapturedAt = new Date().toISOString();
              extracted.renewal = {
                renewalId,
                sourceInventoryId: session.sourceInventoryId,
                sourceAdId: session.sourceAdId,
                newAdId,
                status: 'phase2-complete',
                stage: 'phase2-complete',
                phase2CapturedAt,
                createdAt: session.createdAt,
                updatedAt: phase2CapturedAt,
                comparison: null
              };
              candidate = await saveInventory(extracted, { inventoryIdOverride: session.skeletonInventoryId });
      
              session.phase2CompletedAt = phase2CapturedAt;
              session.status = 'verifying';
              session.stage = 'phase2-complete';
              session.workerTabId = null;
              session.metadataTabId = null;
              session.lastError = null;
              await persistRenewalSession(session);
              await logDiagnostic('info', 'RENEWAL_PHASE2_ATTEMPT_COMPLETED', {
                renewalId,
                sourceAdId: session.sourceAdId,
                newAdId,
                ...renewalAttemptDetails(session, 2),
                phase2CapturedAt
              }, { module: 'background', operation: 'renewal-phase-2', context: sessionCorrelationContext(session, { renewalId, adId: newAdId }) }).catch(() => {});
              phase2Completed = true;
              break;
            } catch (error) {
              phase2LastError = error;
              session.workerTabId = null;
              session.metadataTabId = null;
              await logRenewalPhaseAttemptFailed(session, 2, 'RENEWAL_PHASE2_ATTEMPT_FAILED', 'renewal-phase-2', error, { workerTabId });
              if (isNonRetryableRenewalSafetyError(error) || !renewalPhaseAttemptAvailable(session, 2)) break;
            } finally {
              if (workerTabId) await closeManagedWorkerTab(workerTabId).catch(() => {});
            }
          }
      
          if (!phase2Completed) {
            const error = phase2LastError || new Error('Phase 2 konnte innerhalb der konfigurierten Versuche nicht abgeschlossen werden.');
            session.status = 'verification-failed';
            session.stage = 'phase2-failed';
            session.workerTabId = null;
            session.metadataTabId = null;
            session.lastError = String(error.message || error).slice(0, 800);
            await persistRenewalSession(session).catch(() => {});
            await sendRenewalFeedback(session, 'Prüfung nicht abgeschlossen – bisherige Anzeige bleibt unverändert', 'Die neue Anzeige konnte nicht vollständig neu eingelesen werden.', ['Die Prüfung wurde nach den konfigurierten Versuchen angehalten. Weitere Einzelheiten stehen in den Diagnosedaten.']).catch(() => {});
            await logDiagnostic('error', 'RENEWAL_REINVENTORY_FAILED', {
              renewalId,
              newAdId,
              phase: 2,
              message: session.lastError,
              ...renewalAttemptDetails(session, 2)
            }, { module: 'background', operation: 'renewal-phase-2', context: sessionCorrelationContext(session, { renewalId, adId: newAdId }) }).catch(() => {});
            throw error;
          }
        }
      
        candidate = await getInventory(session.skeletonInventoryId);
        if (!candidate || String(candidate.adId || '') !== newAdId) {
          const error = new Error('Der in Phase 2 gespeicherte Renewal-Kandidat konnte nicht eindeutig geladen werden.');
          session.status = 'verification-failed';
          session.stage = 'phase2-candidate-missing';
          session.lastError = error.message;
          await persistRenewalSession(session).catch(() => {});
          throw error;
        }
      
        let phase3LastError = null;
        while (renewalPhaseAttemptAvailable(session, 3)) {
          const previousAttempt = renewalAttemptState(session, 3).attempt;
          if (previousAttempt > 0) await delay(renewalPhaseRetryDelayMs(previousAttempt + 1));
          const attemptState = await logRenewalPhaseAttemptStarted(session, 3, 'RENEWAL_PHASE3_ATTEMPT_STARTED', 'renewal-phase-3', {
            renewalMode: RENEWAL_MODE_SAFE,
            verification: 'semantic-comparison-and-public-enrichment'
          });
      
          try {
            session.status = 'verifying';
            session.stage = 'comparing';
            session.lastError = null;
            await persistRenewalSession(session);
      
            candidate = await getInventory(session.skeletonInventoryId);
            if (!candidate || String(candidate.adId || '') !== newAdId) throw new Error('Der Renewal-Kandidat aus Phase 2 wurde vor Phase 3 nicht gefunden.');
            await sendRenewalFeedback(session, 'Angaben werden verglichen', 'Die im Bearbeiten-Modus frisch gelesenen Angaben werden jetzt mit der bisherigen Anzeige verglichen.');
      
            const comparison = await compareRenewalRecords(source, candidate, {
              onlineConfirmed: false,
              ownAdsPresence: null,
              requirePublicAvailability: false
            });
            session.comparison = comparison;
      
            if (comparison.status !== 'match') {
              const outcome = renewalOutcomeForComparison(comparison);
              // A semantic mismatch is authoritative evidence, not a transient transport
              // problem. Retrying the same comparison automatically would hide a real
              // discrepancy rather than improve robustness.
              session.status = outcome.status;
              session.stage = outcome.stage;
              session.verifiedAt = null;
              session.lastError = null;
              await persistRenewalSession(session);
              candidate.renewal = { ...(candidate.renewal || {}), ...renewalPublicSnapshot(session), comparison, updatedAt: new Date().toISOString() };
              await putInventoryRecordOnly(candidate);
              broadcastInventoryChanged('renewal-verified', { inventoryId: candidate.inventoryId, renewalId, status: session.status, newAdId });
              const issues = [
                ...comparison.mismatches.map(item => `${item.field}: Wert weicht ab.`),
                ...comparison.uncertainties.map(item => `${item.field}: ${item.reason}`)
              ].slice(0, 12);
              await sendRenewalFeedback(session, 'Prüfung nicht abgeschlossen – bisherige Anzeige bleibt unverändert', comparison.status === 'mismatch' ? 'Mindestens eine Angabe weicht ab.' : 'Mindestens ein inhaltlicher Prüfschritt ist noch nicht eindeutig.', issues);
              await logDiagnostic('warning', 'RENEWAL_VERIFICATION_FINISHED', {
                renewalId,
                sourceAdId: session.sourceAdId,
                newAdId,
                status: comparison.status,
                mismatchCount: comparison.mismatches.length,
                uncertaintyCount: comparison.uncertainties.length,
                onlineConfirmed: false,
                publicAvailabilityPending: null,
                editComparisonAuthoritative: true,
                ...renewalAttemptDetails(session, 3)
              }, { module: 'background', operation: 'renewal-phase-3', context: sessionCorrelationContext(session, { renewalId, adId: newAdId }) }).catch(() => {});
              return renewalPublicSnapshot(session);
            }
      
            // Public read-only evidence is enrichment after the authoritative edit
            // comparison. Failure to obtain it must not revoke a complete semantic match.
            session.stage = 'checking-public-evidence';
            await persistRenewalSession(session);
            let publicEvidence = {
              readOnlyResult: { ok: false, metadata: null, durationMs: 0, error: 'Öffentliche Read-only-Prüfung wurde noch nicht bestätigt.' },
              publicUrl: session.newPublicUrl || null,
              method: null,
              ownAdsPresence: null,
              myAds: null,
              verificationClass: 'temporarily-unavailable',
              publicAttempts: []
            };
            try {
              publicEvidence = await resolveRenewalPublicEvidence(newAdId, source.profileName || candidate.profileName || '', session);
            } catch (publicError) {
              publicEvidence = {
                ...publicEvidence,
                verificationClass: 'probe-error',
                readOnlyResult: { ok: false, metadata: null, durationMs: 0, error: String(publicError?.message || publicError).slice(0, 600) }
              };
              await logDiagnostic('warning', 'RENEWAL_PUBLIC_ENRICHMENT_UNAVAILABLE', {
                renewalId,
                sourceAdId: session.sourceAdId,
                newAdId,
                message: String(publicError?.message || publicError).slice(0, 600),
                editComparisonStatus: comparison.status
              }, { module: 'background', operation: 'renewal-phase-3-public-enrichment', context: sessionCorrelationContext(session, { renewalId, adId: newAdId }) }).catch(() => {});
            }
      
            const readOnlyResult = publicEvidence.readOnlyResult || { ok: false, metadata: null, durationMs: 0, error: 'Read-only-Prüfung lieferte kein Ergebnis.' };
            const publicUrl = normalizeKnownPublicAdUrl(publicEvidence.publicUrl, newAdId) || '';
            session.newPublicUrl = publicUrl;
            session.lastPublicEvidenceMethod = publicEvidence.method || null;
            session.lastOwnAdsPresence = publicEvidence.ownAdsPresence;
            session.lastOwnAdsPage = publicEvidence.myAds?.page ?? null;
            session.lastOwnAdsPagesScanned = publicEvidence.myAds?.pagesScanned ?? null;
            session.publicAvailabilityPending = !readOnlyResult.ok;
            session.publicAvailability = publicAvailabilitySnapshot({
              online: Boolean(readOnlyResult.ok),
              verificationClass: publicEvidence.verificationClass || null,
              method: publicEvidence.method || null,
              publicUrl: publicUrl || null
            });
      
            candidate.listingMeta = mergeListingMetadata(candidate, candidate.listingMeta || {}, readOnlyResult, { publicUrl, source: 'renewal-phase-3' });
            candidate.listingMeta = {
              ...(candidate.listingMeta || {}),
              publicAvailability: { ...session.publicAvailability }
            };
            candidate.publicUrl = publicUrl || candidate.publicUrl || null;
      
            session.status = 'verified';
            session.stage = 'replacement-ready';
            session.verifiedAt = new Date().toISOString();
            session.lastError = null;
            await persistRenewalSession(session);
            candidate.recordKind = 'renewal-candidate';
            candidate.renewal = { ...(candidate.renewal || {}), ...renewalPublicSnapshot(session), comparison, updatedAt: new Date().toISOString() };
            await putInventoryRecordOnly(candidate);
            broadcastInventoryChanged('renewal-verified', { inventoryId: candidate.inventoryId, renewalId, status: session.status, newAdId, publicAvailabilityPending: !readOnlyResult.ok });
      
            if (session.autoReplacementAllowed) {
              await sendRenewalFeedback(session, 'Inhaltsprüfung erfolgreich', readOnlyResult.ok
                ? 'Die neue Anzeige stimmt im Bearbeiten-Modus vollständig mit der bisherigen Anzeige überein und ist bereits öffentlich erreichbar. Der bestätigte Austausch wird jetzt abgeschlossen.'
                : 'Die neue Anzeige stimmt im Bearbeiten-Modus vollständig mit der bisherigen Anzeige überein. Die öffentliche Seite ist noch nicht erreichbar; die neue Anzeige wird deshalb als „Bald Online“ gekennzeichnet. Der bestätigte Austausch wird jetzt abgeschlossen.');
            } else {
              await sendRenewalFeedback(session, 'Inhaltsprüfung erfolgreich', readOnlyResult.ok
                ? 'Die neue Anzeige stimmt im Bearbeiten-Modus vollständig mit der bisherigen Anzeige überein und ist bereits öffentlich erreichbar. Der Austausch ist bereit.'
                : 'Die neue Anzeige stimmt im Bearbeiten-Modus vollständig mit der bisherigen Anzeige überein. Die öffentliche Seite ist noch nicht erreichbar; die neue Anzeige wird deshalb als „Bald Online“ gekennzeichnet. Der Austausch ist bereit.');
            }
            await logDiagnostic('info', 'RENEWAL_VERIFICATION_FINISHED', {
              renewalId,
              sourceAdId: session.sourceAdId,
              newAdId,
              status: comparison.status,
              mismatchCount: comparison.mismatches.length,
              uncertaintyCount: comparison.uncertainties.length,
              onlineConfirmed: Boolean(readOnlyResult.ok),
              publicAvailabilityPending: !readOnlyResult.ok,
              ownAdsPresence: publicEvidence.ownAdsPresence,
              publicEvidenceMethod: publicEvidence.method || null,
              publicVerificationClass: publicEvidence.verificationClass || null,
              myAdsPage: publicEvidence.myAds?.page ?? null,
              myAdsPagesScanned: publicEvidence.myAds?.pagesScanned ?? null,
              autoReplacementAllowed: Boolean(session.autoReplacementAllowed),
              editComparisonAuthoritative: true,
              ...renewalAttemptDetails(session, 3)
            }, { module: 'background', operation: 'renewal-phase-3', context: sessionCorrelationContext(session, { renewalId, adId: newAdId }) }).catch(() => {});
            if (session.autoReplacementAllowed) scheduleAutomaticRenewalReplacement(renewalId, 'edit-comparison-match');
            return renewalPublicSnapshot(session);
          } catch (error) {
            phase3LastError = error;
            await logRenewalPhaseAttemptFailed(session, 3, 'RENEWAL_PHASE3_ATTEMPT_FAILED', 'renewal-phase-3', error);
            if (isNonRetryableRenewalSafetyError(error) || !renewalPhaseAttemptAvailable(session, 3)) break;
          }
        }
      
        const error = phase3LastError || new Error('Phase 3 konnte innerhalb der konfigurierten Versuche nicht abgeschlossen werden.');
        session.status = 'verification-failed';
        session.stage = 'phase3-failed';
        session.workerTabId = null;
        session.metadataTabId = null;
        session.lastError = String(error.message || error).slice(0, 800);
        await persistRenewalSession(session).catch(() => {});
        await sendRenewalFeedback(session, 'Prüfung nicht abgeschlossen – bisherige Anzeige bleibt unverändert', 'Die neue Anzeige konnte nicht vollständig geprüft werden.', ['Die Prüfung wurde nach den konfigurierten Versuchen angehalten. Weitere Einzelheiten stehen in den Diagnosedaten.']).catch(() => {});
        await logDiagnostic('error', 'RENEWAL_REINVENTORY_FAILED', {
          renewalId,
          newAdId,
          phase: 3,
          message: session.lastError,
          ...renewalAttemptDetails(session, 3)
        }, { module: 'background', operation: 'renewal-phase-3', context: sessionCorrelationContext(session, { renewalId, adId: newAdId }) }).catch(() => {});
        throw error;
      }

      return Object.freeze({ runRenewalReinventory });
    }
  });
  KRDeps.register('KRRenewalReinventoryFlow', API);
})();
