(() => {
  'use strict';

  const RENEWAL_MODE_SAFE = 'safe';
  const RENEWAL_MODE_FAST = 'fast';
  const RENEWAL_PHASE_ATTEMPTS_MIN = 1;
  const RENEWAL_PHASE_ATTEMPTS_MAX = 5;
  const RENEWAL_PHASE_ATTEMPTS_DEFAULT = 3;
  const RENEWAL_PHASE_RETRY_DELAYS_MS = Object.freeze([0, 1500, 3500, 6000, 10000]);

  function normalizeRenewalMode(value) {
    return String(value || '').toLowerCase() === RENEWAL_MODE_FAST ? RENEWAL_MODE_FAST : RENEWAL_MODE_SAFE;
  }

  function normalizeRenewalPhaseAttempts(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return RENEWAL_PHASE_ATTEMPTS_DEFAULT;
    return Math.min(RENEWAL_PHASE_ATTEMPTS_MAX, Math.max(RENEWAL_PHASE_ATTEMPTS_MIN, Math.round(parsed)));
  }

  function renewalMaxPhaseAttempts(session) {
    return normalizeRenewalPhaseAttempts(session?.maxPhaseAttempts);
  }

  function renewalAttemptState(session, phase) {
    const key = String(Number(phase));
    const attempts = session?.phaseAttempts && typeof session.phaseAttempts === 'object' ? session.phaseAttempts : {};
    const current = attempts[key] && typeof attempts[key] === 'object' ? attempts[key] : {};
    return {
      attempt: Math.max(0, Number(current.attempt || 0)),
      attemptId: String(current.attemptId || ''),
      lastError: current.lastError ? String(current.lastError) : null,
      updatedAt: current.updatedAt || null
    };
  }

  function beginRenewalPhaseAttempt(session, phase, { attempt = null, lastError = null } = {}) {
    const phaseNumber = Number(phase);
    const key = String(phaseNumber);
    const previous = renewalAttemptState(session, phaseNumber);
    const nextAttempt = attempt == null ? previous.attempt + 1 : Number(attempt);
    session.phaseAttempts = { ...(session.phaseAttempts || {}) };
    const state = {
      attempt: Math.max(1, nextAttempt),
      attemptId: crypto.randomUUID(),
      lastError: lastError ? String(lastError).slice(0, 800) : null,
      updatedAt: new Date().toISOString()
    };
    session.phaseAttempts[key] = state;
    return state;
  }

  function recordRenewalPhaseAttemptError(session, phase, error) {
    const key = String(Number(phase));
    const current = renewalAttemptState(session, phase);
    session.phaseAttempts = { ...(session.phaseAttempts || {}) };
    session.phaseAttempts[key] = {
      ...current,
      lastError: String(error?.message || error || '').slice(0, 800) || null,
      updatedAt: new Date().toISOString()
    };
    return session.phaseAttempts[key];
  }

  function renewalPhaseAttemptAvailable(session, phase) {
    return renewalAttemptState(session, phase).attempt < renewalMaxPhaseAttempts(session);
  }

  function renewalAttemptDetails(session, phase) {
    const state = renewalAttemptState(session, phase);
    return {
      phase: Number(phase),
      attempt: state.attempt,
      maxAttempts: renewalMaxPhaseAttempts(session),
      attemptId: state.attemptId || null
    };
  }

  function isNonRetryableRenewalSafetyError(error) {
    if (error?.code === 'KR_EMERGENCY_RESET_GENERATION_CHANGED') return true;
    const text = String(error?.message || error || '');
    return /Profil der Quellanzeige|Inventarprofil der Quellanzeige|anderen Kleinanzeigen-Profil|anderen Kleinanzeigen-Konto|Profil wechselte|Kleinanzeigen-Konto wechselte|keinen bestätigten Profilbezug|keinen bestätigten Kontobezug|Quell- oder Ziel-Anzeigen-ID ist ungültig|unterschiedliche neue Anzeigen-IDs|Quell-Inventareintrag wurde lokal nicht gefunden|Renewal-Kandidat[^.]*nicht gefunden|Kandidat aus Phase 2[^.]*nicht gefunden|Verifizierter Renewal-Kandidat wurde lokal nicht gefunden/i.test(text);
  }

  function renewalPhaseRetryDelayMs(attempt) {
    const index = Math.max(0, Math.min(RENEWAL_PHASE_RETRY_DELAYS_MS.length - 1, Number(attempt || 1) - 1));
    return RENEWAL_PHASE_RETRY_DELAYS_MS[index];
  }

  const api = Object.freeze({
    RENEWAL_MODE_SAFE,
    RENEWAL_MODE_FAST,
    RENEWAL_PHASE_ATTEMPTS_MIN,
    RENEWAL_PHASE_ATTEMPTS_MAX,
    RENEWAL_PHASE_ATTEMPTS_DEFAULT,
    normalizeRenewalMode,
    normalizeRenewalPhaseAttempts,
    renewalMaxPhaseAttempts,
    renewalAttemptState,
    beginRenewalPhaseAttempt,
    recordRenewalPhaseAttemptError,
    renewalPhaseAttemptAvailable,
    renewalAttemptDetails,
    isNonRetryableRenewalSafetyError,
    renewalPhaseRetryDelayMs
  });
  globalThis.KRDeps?.register?.('KRRenewalPolicy', api);
  if (typeof module !== 'undefined' && module?.exports) module.exports = api;
})();
