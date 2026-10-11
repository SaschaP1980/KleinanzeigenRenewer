(() => {
  'use strict';

  const STATES = Object.freeze({
    CHECKING: 'checking',
    CONFIRMED: 'confirmed',
    TRANSIENT: 'transient-unavailable',
    MISSING: 'missing',
    AMBIGUOUS: 'ambiguous',
    RESTRICTED: 'restricted'
  });

  function text(value, max = 240) {
    return String(value ?? '').trim().slice(0, max);
  }

  function normalizeProfile(profile) {
    const profileId = text(profile?.profileId, 180);
    if (!profileId) return null;
    return {
      profileId,
      displayName: text(profile?.displayName, 240) || 'Kleinanzeigen-Konto'
    };
  }

  function normalizeNames(values) {
    return [...new Set((Array.isArray(values) ? values : []).map(value => text(value, 240)).filter(Boolean))].slice(0, 8);
  }

  function createInitial(now = Date.now()) {
    const changedAt = new Date(now).toISOString();
    return Object.freeze({
      status: STATES.CHECKING,
      profile: null,
      ambiguousNames: Object.freeze([]),
      reason: 'startup',
      source: 'startup',
      confirmedAt: null,
      changedAt,
      generation: 0
    });
  }

  function transition(previous, event = {}, now = Date.now()) {
    const prior = previous && typeof previous === 'object' ? previous : createInitial(now);
    const type = text(event.type, 80).toUpperCase();
    const changedAt = new Date(now).toISOString();
    const reason = text(event.reason, 160) || type.toLocaleLowerCase('de-DE') || 'unknown';
    const source = text(event.source, 120) || 'account-inspection';
    let status = prior.status;
    let profile = normalizeProfile(prior.profile);
    let ambiguousNames = normalizeNames(prior.ambiguousNames);
    let confirmedAt = prior.confirmedAt || null;

    if (type === 'CHECK_STARTED') {
      status = STATES.CHECKING;
      ambiguousNames = [];
    } else if (type === 'CONFIRMED') {
      profile = normalizeProfile(event.profile);
      if (!profile) throw new Error('CONFIRMED benötigt ein gültiges Profil.');
      status = STATES.CONFIRMED;
      ambiguousNames = [];
      confirmedAt = text(event.confirmedAt, 64) || changedAt;
    } else if (type === 'TRANSIENT_FAILURE') {
      status = STATES.TRANSIENT;
      ambiguousNames = [];
      if (event.clearProfile === true) profile = null;
    } else if (type === 'MISSING') {
      status = STATES.MISSING;
      profile = null;
      ambiguousNames = [];
    } else if (type === 'AMBIGUOUS') {
      status = STATES.AMBIGUOUS;
      profile = null;
      ambiguousNames = normalizeNames(event.names);
    } else if (type === 'RESTRICTED') {
      status = STATES.RESTRICTED;
      profile = null;
      ambiguousNames = [];
    } else {
      throw new Error(`Unbekannte Account-Gate-Transition: ${type || '(leer)'}`);
    }

    return Object.freeze({
      status,
      profile,
      ambiguousNames: Object.freeze(ambiguousNames),
      reason,
      source,
      confirmedAt,
      changedAt,
      generation: Number(prior.generation || 0) + 1
    });
  }

  function selectedProfileIdentity(selected) {
    const profileId = text(selected?.profileId, 180);
    return profileId ? { profileId, displayName: text(selected?.displayName, 240) || 'Unbenannt' } : null;
  }

  function model(state, selectedProfile) {
    const selected = selectedProfileIdentity(selectedProfile);
    const current = normalizeProfile(state?.profile);
    const status = text(state?.status, 80) || STATES.CHECKING;
    if (!selected) {
      return {
        allowed: false,
        kind: 'selection',
        title: 'Aktionen nicht verfügbar',
        text: 'Wähle ein konkretes Inventarprofil aus, um Aktionen mit Kleinanzeigen zu verwenden.',
        tooltip: 'Nicht verfügbar: Wähle zuerst ein konkretes Inventarprofil aus.'
      };
    }
    if (status === STATES.RESTRICTED) {
      return {
        allowed: false,
        kind: 'restricted',
        title: 'Zugriff vorübergehend eingeschränkt',
        text: 'Kleinanzeigen hat den Zugriff vorübergehend eingeschränkt. Aktionen bleiben gesperrt, bis die Sperre aufgehoben ist.',
        tooltip: 'Nicht verfügbar: Kleinanzeigen hat den Zugriff vorübergehend eingeschränkt.'
      };
    }
    if (status === STATES.CHECKING) {
      return {
        allowed: false,
        kind: 'checking',
        title: 'Kleinanzeigen-Konto wird geprüft',
        text: 'Die Aktionen werden freigegeben, sobald die App das angemeldete Kleinanzeigen-Konto erkannt hat.',
        tooltip: 'Noch nicht verfügbar: Das Kleinanzeigen-Konto wird gerade geprüft.'
      };
    }
    if (status === STATES.AMBIGUOUS) {
      const names = normalizeNames(state?.ambiguousNames).slice(0, 3).join(' · ');
      return {
        allowed: false,
        kind: 'ambiguous',
        title: 'Kleinanzeigen-Konto nicht eindeutig',
        text: names
          ? `Mehrere unterschiedliche Konten wurden erkannt: ${names}. Schließe Tabs, in denen ein anderes Kleinanzeigen-Konto angemeldet ist, und versuche es erneut.`
          : 'Das angemeldete Kleinanzeigen-Konto konnte nicht eindeutig bestimmt werden.',
        tooltip: 'Nicht verfügbar: Das angemeldete Kleinanzeigen-Konto ist nicht eindeutig.'
      };
    }
    if (status === STATES.MISSING || !current) {
      return {
        allowed: false,
        kind: status === STATES.TRANSIENT ? 'transient-unavailable' : 'missing-account',
        title: status === STATES.TRANSIENT ? 'Konto nicht erkannt' : 'Nicht angemeldet',
        text: status === STATES.TRANSIENT
          ? 'Die letzte Kontoprüfung war vorübergehend nicht möglich. Die App versucht es automatisch erneut.'
          : 'Bitte melde dich zuerst bei Kleinanzeigen an. Lokale Funktionen bleiben verfügbar.',
        tooltip: status === STATES.TRANSIENT
          ? 'Vorübergehend nicht verfügbar: Das Kleinanzeigen-Konto wird erneut geprüft.'
          : 'Nicht verfügbar: Öffne eine Kleinanzeigen-Seite und melde dich an.'
      };
    }
    if (String(current.profileId) !== String(selected.profileId)) {
      return {
        allowed: false,
        kind: 'mismatch',
        title: 'Aktionen gesperrt',
        text: `Ausgewähltes Profil: ${selected.displayName || 'Unbenannt'} · Angemeldet: ${current.displayName || 'Unbekannt'}. Wähle das passende Inventarprofil oder wechsle das Kleinanzeigen-Konto.`,
        tooltip: 'Nicht verfügbar: Ausgewähltes Profil und Kleinanzeigen-Konto stimmen nicht überein.'
      };
    }
    return {
      allowed: true,
      kind: status === STATES.TRANSIENT ? 'ready-transient' : 'ready',
      title: '',
      text: '',
      tooltip: '',
      transient: status === STATES.TRANSIENT
    };
  }

  function gateSignature(state, selectedProfile) {
    const gate = model(state, selectedProfile);
    return [
      text(state?.status, 80),
      text(state?.profile?.profileId, 180),
      text(selectedProfile?.profileId, 180),
      gate.kind,
      gate.allowed ? '1' : '0'
    ].join('|');
  }

  const api = Object.freeze({ STATES, createInitial, transition, model, gateSignature, normalizeProfile });
  globalThis.KRDeps?.register?.('KRAccountGate', api);
  if (typeof module !== 'undefined' && module?.exports) module.exports = api;
})();
