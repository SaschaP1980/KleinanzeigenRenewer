(() => {
  'use strict';

  function renewalPublishBoundaryReached(session) {
    if (!session) return false;
    if (/^\d+$/.test(String(session.newAdId || ''))) return true;
    if (String(session.publishClickedAt || '').trim()) return true;
    if (String(session.newIdConfirmedAt || '').trim()) return true;
    if (String(session.newPublicUrl || '').trim()) return true;
    if (session.comparison && typeof session.comparison === 'object') return true;
    if (session.publicAvailabilityPending === true || (session.publicAvailability && typeof session.publicAvailability === 'object')) return true;
    if (String(session.phase2CompletedAt || '').trim()) return true;
    const laterPhaseAttempt = Object.keys(session.phaseAttempts || {}).some(key => Number(key) >= 2);
    if (laterPhaseAttempt) return true;
    const status = String(session.status || '');
    if (['submitted', 'new-id-confirmed', 'reinventorizing', 'verifying', 'verified', 'replaced'].includes(status)) return true;
    return ['publish-submitted', 'new-id-confirmed'].includes(String(session.stage || ''));
  }

  function emergencyResetRenewalState(session, { now = new Date().toISOString(), issue = 'Der laufende Vorgang wurde durch den Notfall-Reset sicher beendet.' } = {}) {
    if (!session || typeof session !== 'object') return session;
    const next = { ...session };
    const remoteUncertain = renewalPublishBoundaryReached(session);
    next.status = 'cancelled';
    next.stage = remoteUncertain ? 'emergency-reset-unverified' : 'manual-emergency-reset';
    next.updatedAt = now;
    next.recoveryAt = now;
    next.emergencyResetAt = now;
    next.lastError = issue;
    if (next.massBatchId) next.massBatchTerminal = true;
    if (remoteUncertain) {
      next.remoteVerification = 'unverified';
      next.remoteVerificationRequired = true;
    } else {
      delete next.remoteVerification;
      delete next.remoteVerificationRequired;
    }
    return next;
  }

  function preserveEmergencyResetTombstones(existingSessions, incomingSessions) {
    const existing = existingSessions && typeof existingSessions === 'object' ? existingSessions : {};
    const incoming = incomingSessions && typeof incomingSessions === 'object' ? incomingSessions : {};
    const merged = { ...incoming };
    for (const [renewalId, current] of Object.entries(existing)) {
      if (!current?.emergencyResetAt) continue;
      const proposed = incoming[renewalId];
      if (!proposed || String(proposed.emergencyResetAt || '') !== String(current.emergencyResetAt || '')) merged[renewalId] = current;
    }
    return merged;
  }

  function isSafeLegacyManualEmergencyReset(session) {
    if (!session || String(session.stage || '') !== 'manual-emergency-reset') return false;
    if (String(session.status || '') !== 'needs-review') return false;
    return !renewalPublishBoundaryReached(session);
  }

  function isSafePrePublishPaidInsertion(session) {
    if (!session || String(session.stage || '') !== 'paid-insertion-required') return false;
    const phase = String(session?.paidInsertion?.phase || '');
    if (phase && phase !== 'pre-publish') return false;
    return !renewalPublishBoundaryReached(session);
  }

  function hasPostPublishEvidenceBeyondClick(session) {
    if (!session) return false;
    if (/^\d+$/.test(String(session.newAdId || ''))) return true;
    if (String(session.newIdConfirmedAt || '').trim()) return true;
    if (String(session.newPublicUrl || '').trim()) return true;
    if (session.comparison && typeof session.comparison === 'object') return true;
    if (session.publicAvailabilityPending === true || (session.publicAvailability && typeof session.publicAvailability === 'object')) return true;
    if (String(session.phase2CompletedAt || '').trim()) return true;
    if (Object.keys(session.phaseAttempts || {}).some(key => Number(key) >= 2)) return true;
    return false;
  }

  function isCheckoutAbortedRecoveryCandidate(session, evidence = {}) {
    if (!session) return false;
    const legacyReset = String(session.stage || '') === 'manual-emergency-reset' && String(session.status || '') === 'needs-review';
    const unverifiedReset = String(session.stage || '') === 'emergency-reset-unverified' && String(session.status || '') === 'cancelled' && session.remoteVerificationRequired === true;
    if (!legacyReset && !unverifiedReset) return false;
    if (!/^\d+$/.test(String(session.sourceAdId || ''))) return false;
    if (!String(session.publishClickedAt || '').trim()) return false;
    if (hasPostPublishEvidenceBeyondClick(session)) return false;
    const checkoutObserved = evidence.checkoutObserved === true
      || String(session.checkoutPath || '') === '/m-bestellung-aufnehmen.html'
      || String(session?.paidInsertion?.phase || '') === 'checkout';
    return checkoutObserved;
  }

  function normalizeProfile(value) { return String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('de-DE'); }
  function normalizeIds(values) {
    return [...new Set((Array.isArray(values) ? values : []).map(value => String(value || '')).filter(value => /^\d+$/.test(value)))];
  }

  function evaluateCheckoutRecoveryProof({ session, expectedProfile, baselineIds, roster } = {}) {
    const sourceAdId = String(session?.sourceAdId || '');
    const baseline = normalizeIds(baselineIds);
    const ids = normalizeIds(roster?.ids);
    const unknownIds = ids.filter(id => !baseline.includes(id));
    const expected = normalizeProfile(expectedProfile);
    const actual = normalizeProfile(roster?.profileName);
    const onlineCount = Number(roster?.onlineCount);
    const complete = roster?.complete === true && Number.isInteger(onlineCount) && onlineCount >= 0 && ids.length === onlineCount;
    const profileMatches = Boolean(expected && actual && expected === actual);
    const sourceKnownBeforeClick = /^\d+$/.test(sourceAdId) && baseline.includes(sourceAdId);
    const sourceStillPresent = /^\d+$/.test(sourceAdId) && ids.includes(sourceAdId);
    const verified = complete && profileMatches && sourceKnownBeforeClick && sourceStillPresent && unknownIds.length === 0;
    let reason = 'verified-no-new-remote-id';
    if (!complete) reason = 'remote-roster-incomplete';
    else if (!profileMatches) reason = 'profile-mismatch';
    else if (!sourceKnownBeforeClick) reason = 'source-not-in-prepublish-baseline';
    else if (!sourceStillPresent) reason = 'source-not-present-remotely';
    else if (unknownIds.length) reason = 'unknown-remote-id';
    return Object.freeze({ verified, reason, unknownIds: Object.freeze(unknownIds), remoteIds: Object.freeze(ids), baselineIds: Object.freeze(baseline), onlineCount: Number.isInteger(onlineCount) ? onlineCount : null, profileMatches, sourceKnownBeforeClick, sourceStillPresent, complete });
  }

  function renewalHoldsInsertionLock(session) {
    if (!session?.renewalId) return false;
    if (session.massBatchTerminal === true) return false;
    const status = String(session.status || '');
    if (['cancelled', 'replaced'].includes(status)) return false;
    if (isSafePrePublishPaidInsertion(session) || isSafeLegacyManualEmergencyReset(session)) return false;
    return true;
  }

  const API = Object.freeze({
    renewalPublishBoundaryReached, emergencyResetRenewalState, isSafeLegacyManualEmergencyReset, isSafePrePublishPaidInsertion,
    isCheckoutAbortedRecoveryCandidate, evaluateCheckoutRecoveryProof, renewalHoldsInsertionLock,
    create(options = {}) {
      const storageLocal = options.storageLocal;
      if (!storageLocal?.get || !storageLocal?.set) throw new Error('KRRenewalStateRepository requires storageLocal');
      const sessionsKey = String(options.sessionsKey || 'renewalSessionsV1');
      const maxAgeMs = Number(options.maxAgeMs || 30 * 24 * 60 * 60 * 1000);
      const normalizeRenewalMode = options.normalizeRenewalMode || (value => String(value || 'safe'));

      async function readRenewalSessions() {
        const stored = await storageLocal.get(sessionsKey);
        const sessions = stored[sessionsKey] && typeof stored[sessionsKey] === 'object' ? stored[sessionsKey] : {};
        const cutoff = Date.now() - maxAgeMs;
        let changed = false;
        for (const [renewalId, session] of Object.entries(sessions)) {
          if (!session?.createdAt || Date.parse(session.createdAt) < cutoff) {
            delete sessions[renewalId];
            changed = true;
          }
        }
        if (changed) await storageLocal.set({ [sessionsKey]: sessions });
        return sessions;
      }

      async function writeRenewalSessions(sessions) {
        const stored = await storageLocal.get(sessionsKey);
        const existing = stored[sessionsKey] && typeof stored[sessionsKey] === 'object' ? stored[sessionsKey] : {};
        await storageLocal.set({ [sessionsKey]: preserveEmergencyResetTombstones(existing, sessions) });
      }

      function renewalInsertionMeta(session) {
        const confirmedAt = String(session?.newIdConfirmedAt || '').trim();
        if (!confirmedAt || !Number.isFinite(Date.parse(confirmedAt))) return null;
        return { confirmedAt, source: 'renewal-new-id-confirmed', renewalMode: normalizeRenewalMode(session?.renewalMode) };
      }

      function renewalPublicSnapshot(session) {
        if (!session) return null;
        return {
          operationId: session.operationId || null,
          parentOperationId: session.parentOperationId || null,
          renewalId: session.renewalId,
          profileId: session.profileId || null,
          sourceInventoryId: session.sourceInventoryId,
          sourceAdId: session.sourceAdId,
          skeletonInventoryId: session.skeletonInventoryId,
          newAdId: session.newAdId || null,
          status: session.status,
          stage: session.stage,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          comparison: session.comparison || null,
          publicAvailabilityPending: session.publicAvailabilityPending === true,
          publicAvailability: session.publicAvailability ? structuredClone(session.publicAvailability) : null,
          renewalMode: normalizeRenewalMode(session.renewalMode),
          maxPhaseAttempts: typeof options.renewalMaxPhaseAttempts === 'function' ? options.renewalMaxPhaseAttempts(session) : session.maxPhaseAttempts,
          phaseAttempts: session.phaseAttempts && typeof session.phaseAttempts === 'object' ? structuredClone(session.phaseAttempts) : {},
          autoReplacementAllowed: Boolean(session.autoReplacementAllowed),
          startConfirmedAt: session.startConfirmedAt || null,
          newIdConfirmedAt: session.newIdConfirmedAt || null,
          publishClickedAt: session.publishClickedAt || null,
          checkoutObservedAt: session.checkoutObservedAt || null,
          checkoutPath: session.checkoutPath || null,
          checkoutRecovery: session.checkoutRecovery ? structuredClone(session.checkoutRecovery) : null,
          emergencyResetAt: session.emergencyResetAt || null,
          remoteVerification: session.remoteVerification || null,
          remoteVerificationRequired: session.remoteVerificationRequired === true,
          autoReplacementFailedAt: session.autoReplacementFailedAt || null,
          phase4AttemptsExhaustedAt: session.phase4AttemptsExhaustedAt || null,
          massBatchId: session.massBatchId || null,
          massBatchItemIndex: session.massBatchItemIndex ?? null,
          massBatchTerminal: session.massBatchTerminal === true
        };
      }

      return Object.freeze({ readRenewalSessions, writeRenewalSessions, renewalInsertionMeta, renewalPublicSnapshot });
    }
  });
  globalThis.KRDeps?.register?.('KRRenewalStateRepository', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
