(() => {
  'use strict';
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before renewal-verification-flow.js');
  const API = Object.freeze({
    create({ sessionPort = {}, inventoryPort = {}, tabPort = {}, diagnosticsPort = {}, policyPort = {}, validationPort = {}, flowPort = {}, configPort = {}, miscPort = {} } = {}) {
      const { readRenewalSessions } = sessionPort;
      const { broadcastInventoryChanged, putInventoryRecordOnly, getInventory } = inventoryPort;
      const { ensureContentConnection, createManagedWorkerTab, retirePublishedRenewalTargetTab, normalBrowserWindowId, sendTabRequestWithBootstrap, closeManagedWorkerTab, waitForTabComplete } = tabPort;
      const { logDiagnostic, sessionCorrelationContext, logRenewalPhaseAttemptFailed, correlationContext, logRenewalPhaseAttemptStarted } = diagnosticsPort;
      const { normalizeRenewalMode, isNonRetryableRenewalSafetyError, renewalMaxPhaseAttempts, renewalPhaseRetryDelayMs, renewalAttemptState, normalizeProfileName, renewalAttemptDetails, renewalPhaseAttemptAvailable } = policyPort;
      const { renewalInsertionMeta, renewalPublicSnapshot } = validationPort;
      const { persistRenewalSession, scheduleAutomaticRenewalReplacement, sendRenewalFeedback } = flowPort;
      const { TAB_LOAD_TIMEOUT_RENEWAL_MS, RENEWAL_MODE_FAST, MY_ADS_PROJECTS_URL } = configPort;
      const { delay } = miscPort;
      for (const [name, fn] of Object.entries({ readRenewalSessions, broadcastInventoryChanged, putInventoryRecordOnly, getInventory, ensureContentConnection, createManagedWorkerTab, retirePublishedRenewalTargetTab, normalBrowserWindowId, sendTabRequestWithBootstrap, closeManagedWorkerTab, waitForTabComplete, logDiagnostic, sessionCorrelationContext, logRenewalPhaseAttemptFailed, correlationContext, logRenewalPhaseAttemptStarted, normalizeRenewalMode, isNonRetryableRenewalSafetyError, renewalMaxPhaseAttempts, renewalPhaseRetryDelayMs, renewalAttemptState, normalizeProfileName, renewalAttemptDetails, renewalPhaseAttemptAvailable, renewalInsertionMeta, renewalPublicSnapshot, persistRenewalSession, scheduleAutomaticRenewalReplacement, sendRenewalFeedback, delay })) {
        if (typeof fn !== 'function') throw new Error('renewal-verification-flow dependency ' + name + ' is required');
      }

      async function runFastRenewalVerification(renewalId) {
        const sessions = await readRenewalSessions();
        const session = sessions[renewalId];
        if (!session) throw new Error('Renewal-Sitzung wurde nicht gefunden.');
        if (normalizeRenewalMode(session.renewalMode) !== RENEWAL_MODE_FAST) throw new Error('Fast-Mode-Prüfung wurde für eine Safe-Mode-Sitzung angefordert.');
        const newAdId = String(session.newAdId || '');
        if (!/^\d+$/.test(newAdId)) throw new Error('Neue Anzeigen-ID wurde noch nicht bestätigt.');
        if (session.status === 'verified' || session.stage === 'replacement-ready' || String(session.stage || '').startsWith('source-delete')) return renewalPublicSnapshot(session);
      
        if (session.targetTabId) await retirePublishedRenewalTargetTab(session);
        if (session.workerTabId) {
          await closeManagedWorkerTab(session.workerTabId).catch(() => {});
          session.workerTabId = null;
        }
      
        const source = await getInventory(session.sourceInventoryId);
        if (!source) throw new Error('Quell-Inventareintrag wurde nicht gefunden.');
        const expectedProfile = normalizeProfileName(source.profileName || '');
        if (!expectedProfile) throw new Error('Die Quellanzeige besitzt keinen bestätigten Profilbezug; Fast-Mode-Prüfung wird aus Sicherheitsgründen nicht ausgeführt.');
      
        session.status = 'verifying';
        session.stage = 'fast-my-ads-opening';
        session.lastError = null;
        session.comparison = null;
        await persistRenewalSession(session);
        await sendRenewalFeedback(session, 'Neue Anzeige wird gesucht', 'In der Schnellprüfung wird jetzt bestätigt, dass die neue Anzeige im richtigen Profil unter „Meine Anzeigen“ vorhanden ist.');
        await logDiagnostic('info', 'RENEWAL_FAST_MODE_VERIFICATION_STARTED', {
          renewalId,
          sourceAdId: session.sourceAdId,
          newAdId,
          renewalMode: RENEWAL_MODE_FAST,
          verification: 'my-ads-presence-only',
          maxAttempts: renewalMaxPhaseAttempts(session)
        }, { module: 'background', operation: 'renewal-fast-verify', context: sessionCorrelationContext(session, { renewalId, adId: newAdId }) }).catch(() => {});
      
        let lastError = null;
        while (renewalPhaseAttemptAvailable(session, 3)) {
          const previousAttempt = renewalAttemptState(session, 3).attempt;
          if (previousAttempt > 0) await delay(renewalPhaseRetryDelayMs(previousAttempt + 1));
          const attemptState = await logRenewalPhaseAttemptStarted(session, 3, 'RENEWAL_PHASE3_ATTEMPT_STARTED', 'renewal-fast-verify', {
            renewalMode: RENEWAL_MODE_FAST,
            verification: 'my-ads-presence-only'
          });
      
          let workerTabId = null;
          try {
            const windowId = await normalBrowserWindowId();
            const worker = await createManagedWorkerTab({ ...(windowId ? { windowId } : {}), url: MY_ADS_PROJECTS_URL, active: false }, 'renewal-fast-presence', { ...correlationContext(session), ownerType: 'renewal', ownerId: renewalId, adId: newAdId, phaseAttemptId: attemptState.attemptId });
            if (!worker?.id) throw new Error('Fast-Mode-Prüfworker konnte nicht geöffnet werden.');
            workerTabId = worker.id;
            session.workerTabId = workerTabId;
            session.stage = 'fast-my-ads-checking';
            await persistRenewalSession(session);
      
            await waitForTabComplete(workerTabId, { timeoutMs: TAB_LOAD_TIMEOUT_RENEWAL_MS, purpose: 'renewal-fast-presence', label: 'Fast-Mode-„Meine Anzeigen“-Worker', operation: 'renewal-fast-verify', context: sessionCorrelationContext(session, { renewalId, adId: newAdId, workerTabId, phaseAttempt: attemptState.attempt, phaseAttemptId: attemptState.attemptId }) });
            await ensureContentConnection({ tabId: workerTabId });
            const status = await sendTabRequestWithBootstrap(workerTabId, { type: 'MY_ADS_STATUS' });
            const actualProfile = normalizeProfileName(status?.profileName || '');
            if (!status?.isMyAdsPage || !status?.isProjectsTab) throw new Error('Fast-Mode-Prüfung befindet sich nicht eindeutig in „Meine Anzeigen“ / PROJECTS.');
            if (!actualProfile) throw new Error('Das Kleinanzeigen-Konto konnte während der Schnellprüfung nicht eindeutig erkannt werden.');
            if (expectedProfile.toLocaleLowerCase('de-DE') !== actualProfile.toLocaleLowerCase('de-DE')) {
              throw new Error('Das aktuell angemeldete Kleinanzeigen-Konto entspricht nicht dem Inventarprofil der Quellanzeige.');
            }
      
            const presence = await sendTabRequestWithBootstrap(workerTabId, { type: 'FIND_OWN_AD_BY_ID', adId: newAdId, correlation: correlationContext(session) });
            await logDiagnostic(presence?.found ? 'info' : 'warning', 'RENEWAL_FAST_MODE_PRESENCE_ATTEMPT', {
              renewalId,
              sourceAdId: session.sourceAdId,
              newAdId,
              attempt: attemptState.attempt,
              maxAttempts: renewalMaxPhaseAttempts(session),
              attemptId: attemptState.attemptId,
              found: Boolean(presence?.found),
              page: presence?.page ?? null,
              pagesScanned: presence?.pagesScanned ?? null
            }, { module: 'background', operation: 'renewal-fast-verify', context: sessionCorrelationContext(session, { renewalId, adId: newAdId, workerTabId }) }).catch(() => {});
            if (!presence?.found) throw new Error(`Neue Anzeige ${newAdId} wurde im erwarteten Profil unter „Meine Anzeigen“ nicht gefunden.`);
      
            const candidate = await getInventory(session.skeletonInventoryId);
            if (!candidate) throw new Error('Fast-Mode-Renewal-Kandidat wurde lokal nicht gefunden.');
      
            session.newPublicUrl = /^https:\/\/(www\.)?kleinanzeigen\.de\/s-anzeige\//i.test(String(presence.publicUrl || '')) ? String(presence.publicUrl) : (session.newPublicUrl || '');
            session.lastOwnAdsPresence = true;
            session.lastOwnAdsPage = presence.page ?? null;
            session.lastOwnAdsPagesScanned = presence.pagesScanned ?? null;
            session.fastModePresenceVerifiedAt = new Date().toISOString();
            session.comparison = {
              status: 'fast-mode-presence-verified',
              renewalMode: RENEWAL_MODE_FAST,
              ownAdsPresence: true,
              semanticComparisonPerformed: false,
              reinventoryPerformed: false
            };
            session.status = 'verified';
            session.stage = 'replacement-ready';
            session.verifiedAt = new Date().toISOString();
            session.workerTabId = null;
            session.lastError = null;
            await persistRenewalSession(session);
      
            const sourceMeta = source.listingMeta && typeof source.listingMeta === 'object' ? source.listingMeta : {};
            const fastListingMeta = {
              ...sourceMeta,
              publicUrl: session.newPublicUrl || null,
              endDateDisplay: presence.endDateDisplay || null,
              endDateIso: presence.endDateIso || null,
              // Phase 2 is intentionally skipped. Do not copy the old public listing date
              // onto the new ad and do not invent a replacement value.
              listingDateDisplay: null,
              listingDateIso: null,
              source: 'renewal-fast-mode-my-ads'
            };
            candidate.adId = newAdId;
            candidate.profileId = source.profileId || null;
            candidate.profileName = source.profileName || null;
            candidate.recordKind = 'renewal-candidate';
            candidate.publicUrl = session.newPublicUrl || null;
            candidate.endDateDisplay = presence.endDateDisplay || null;
            if (Object.prototype.hasOwnProperty.call(candidate, 'endDateIso')) candidate.endDateIso = presence.endDateIso || null;
            if (Object.prototype.hasOwnProperty.call(candidate, 'listingDateDisplay')) candidate.listingDateDisplay = null;
            if (Object.prototype.hasOwnProperty.call(candidate, 'listingDateIso')) candidate.listingDateIso = null;
            candidate.listingMeta = fastListingMeta;
            candidate.insertionMeta = renewalInsertionMeta(session);
            candidate.renewal = { ...(candidate.renewal || {}), ...renewalPublicSnapshot(session), updatedAt: new Date().toISOString() };
            await putInventoryRecordOnly(candidate);
            broadcastInventoryChanged('renewal-verified', { inventoryId: candidate.inventoryId, renewalId, status: session.status, newAdId, renewalMode: RENEWAL_MODE_FAST });
      
            await sendRenewalFeedback(session, 'Neue Anzeige gefunden', 'Die neue Anzeige wurde im richtigen Profil unter „Meine Anzeigen“ gefunden. Der Austausch kann jetzt sicher fortgesetzt werden.');
            await logDiagnostic('info', 'RENEWAL_FAST_MODE_PRESENCE_VERIFIED', {
              renewalId,
              sourceAdId: session.sourceAdId,
              newAdId,
              profileName: actualProfile || null,
              page: presence.page ?? null,
              pagesScanned: presence.pagesScanned ?? null,
              publicUrlAvailable: Boolean(session.newPublicUrl),
              endDateAvailable: Boolean(presence.endDateDisplay || presence.endDateIso),
              reinventoryPerformed: false,
              semanticComparisonPerformed: false,
              autoReplacementAllowed: Boolean(session.autoReplacementAllowed),
              attempt: attemptState.attempt,
              maxAttempts: renewalMaxPhaseAttempts(session),
              attemptId: attemptState.attemptId
            }, { module: 'background', operation: 'renewal-fast-verify', context: sessionCorrelationContext(session, { renewalId, adId: newAdId, workerTabId }) }).catch(() => {});
      
            if (session.autoReplacementAllowed) scheduleAutomaticRenewalReplacement(renewalId, 'fast-mode-presence-verified');
            return renewalPublicSnapshot(session);
          } catch (error) {
            lastError = error;
            session.workerTabId = null;
            await logRenewalPhaseAttemptFailed(session, 3, 'RENEWAL_FAST_MODE_PRESENCE_ATTEMPT_FAILED', 'renewal-fast-verify', error, {
              renewalMode: RENEWAL_MODE_FAST,
              workerTabId
            });
            if (isNonRetryableRenewalSafetyError(error) || !renewalPhaseAttemptAvailable(session, 3)) break;
          } finally {
            if (workerTabId) await closeManagedWorkerTab(workerTabId).catch(() => {});
          }
        }
      
        const error = lastError || new Error('Fast-Mode-Prüfung konnte innerhalb der konfigurierten Versuche nicht abgeschlossen werden.');
        session.status = 'verification-failed';
        session.stage = 'fast-presence-failed';
        session.workerTabId = null;
        session.lastError = String(error.message || error).slice(0, 800);
        await persistRenewalSession(session).catch(() => {});
        await sendRenewalFeedback(session, 'Neue Anzeige noch nicht eindeutig gefunden – bisherige Anzeige bleibt unverändert', 'Die neue Anzeige konnte im erwarteten Profil unter „Meine Anzeigen“ nicht eindeutig gefunden werden.', [session.lastError]).catch(() => {});
        await logDiagnostic('error', 'RENEWAL_FAST_MODE_VERIFICATION_FAILED', {
          renewalId,
          sourceAdId: session.sourceAdId,
          newAdId,
          message: session.lastError,
          ...renewalAttemptDetails(session, 3)
        }, { module: 'background', operation: 'renewal-fast-verify', context: sessionCorrelationContext(session, { renewalId, adId: newAdId }) }).catch(() => {});
        throw error;
      }

      return Object.freeze({ runFastRenewalVerification });
    }
  });
  KRDeps.register('KRRenewalVerificationFlow', API);
})();
