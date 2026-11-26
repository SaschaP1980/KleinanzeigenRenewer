(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const elements = options.elements || {};
      const runtimeMessage = typeof options.runtimeMessage === 'function' ? options.runtimeMessage : async () => ({});
      const logEvent = typeof options.logEvent === 'function' ? options.logEvent : async () => {};
      const confirmAction = typeof options.confirmAction === 'function' ? options.confirmAction : async () => false;
      const onConfigurationChanged = typeof options.onConfigurationChanged === 'function' ? options.onConfigurationChanged : () => {};
      const onError = typeof options.onError === 'function' ? options.onError : () => {};
      const safeMode = String(options.safeMode || 'safe');
      const fastMode = String(options.fastMode || 'fast');
      const defaultAttempts = Number.isFinite(Number(options.defaultAttempts)) ? Number(options.defaultAttempts) : 3;
      let current = { renewalMode: safeMode, fastModeAcknowledged: false, maxPhaseAttempts: defaultAttempts };

      function normalizeMode(value) {
        return String(value || '').toLowerCase() === fastMode ? fastMode : safeMode;
      }

      function modeLabel(mode = current.renewalMode) {
        return normalizeMode(mode) === fastMode ? 'Schnellprüfung' : 'Vollprüfung';
      }

      function normalizeAttempts(value) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return defaultAttempts;
        return Math.min(5, Math.max(1, Math.round(parsed)));
      }

      function attemptLabel(value) {
        const count = normalizeAttempts(value);
        return `${count} ${count === 1 ? 'Versuch' : 'Versuche'}`;
      }

      function snapshot() {
        return { ...current };
      }

      function render(configuration = current) {
        current = {
          renewalMode: normalizeMode(configuration?.renewalMode),
          fastModeAcknowledged: configuration?.fastModeAcknowledged === true,
          maxPhaseAttempts: normalizeAttempts(configuration?.maxPhaseAttempts)
        };
        const fast = current.renewalMode === fastMode;
        elements.safeButton?.setAttribute('aria-pressed', String(!fast));
        elements.fastButton?.setAttribute('aria-pressed', String(fast));
        if (elements.indicator) {
          elements.indicator.textContent = modeLabel();
          elements.indicator.classList.toggle('fast', fast);
          elements.indicator.title = fast
            ? 'Schnellprüfung: Prüft nur, ob die neue Anzeige erfolgreich erstellt wurde. Der zusätzliche Datenvergleich entfällt.'
            : 'Vollprüfung: Vergleicht die neue Anzeige nach dem Einstellen noch einmal mit den gespeicherten Daten. Dauert etwas länger.';
        }
        if (elements.description) {
          elements.description.textContent = fast
            ? 'Schnellprüfung: Prüft nur, ob die neue Anzeige erfolgreich erstellt wurde. Der zusätzliche Datenvergleich entfällt.'
            : 'Vollprüfung: Vergleicht die neue Anzeige nach dem Einstellen noch einmal mit den gespeicherten Daten. Dauert etwas länger.';
        }
        if (elements.retryRange) elements.retryRange.value = String(current.maxPhaseAttempts);
        if (elements.retryValue) elements.retryValue.textContent = attemptLabel(current.maxPhaseAttempts);
        onConfigurationChanged(snapshot());
        return snapshot();
      }

      async function refresh() {
        return render(await runtimeMessage({ type: 'GET_RENEWAL_CONFIGURATION' }));
      }

      async function chooseMode(mode) {
        const requested = normalizeMode(mode);
        if (requested === current.renewalMode) return snapshot();
        let acknowledgeFastMode = false;
        if (requested === fastMode && !current.fastModeAcknowledged) {
          const confirmed = await confirmAction({
            title: 'Schnellprüfung aktivieren?',
            text: 'Bei der Schnellprüfung wird die zusätzliche Inhaltsprüfung der neu eingestellten Anzeige übersprungen.',
            detail: 'Die App prüft weiterhin, ob die neue Anzeige erfolgreich erstellt wurde und ob die bisherige Anzeige nach dem Löschen nicht mehr vorhanden ist. Das Kleinanzeigen-Konto wird weiterhin geprüft und der 30-Tage-Papierkorb bleibt aktiv.',
            confirmLabel: 'Schnellprüfung aktivieren'
          });
          if (!confirmed) return snapshot();
          acknowledgeFastMode = true;
        }
        render(await runtimeMessage({ type: 'SET_RENEWAL_MODE', renewalMode: requested, acknowledgeFastMode }));
        void logEvent('USER_RENEWAL_MODE_CHANGED', { renewalMode: current.renewalMode, fastModeAcknowledged: current.fastModeAcknowledged });
        return snapshot();
      }

      async function chooseAttempts(value) {
        const maxPhaseAttempts = normalizeAttempts(value);
        if (maxPhaseAttempts === current.maxPhaseAttempts) {
          if (elements.retryValue) elements.retryValue.textContent = attemptLabel(maxPhaseAttempts);
          return snapshot();
        }
        render(await runtimeMessage({ type: 'SET_RENEWAL_PHASE_ATTEMPTS', maxPhaseAttempts }));
        void logEvent('USER_RENEWAL_PHASE_ATTEMPTS_CHANGED', { maxPhaseAttempts: current.maxPhaseAttempts });
        return snapshot();
      }

      function install() {
        elements.safeButton?.addEventListener('click', () => { void chooseMode(safeMode).catch(error => onError('Prüfmodus konnte nicht geändert werden', error)); });
        elements.fastButton?.addEventListener('click', () => { void chooseMode(fastMode).catch(error => onError('Prüfmodus konnte nicht geändert werden', error)); });
        elements.retryRange?.addEventListener('input', () => {
          if (elements.retryValue) elements.retryValue.textContent = attemptLabel(elements.retryRange.value);
        });
        elements.retryRange?.addEventListener('change', () => { void chooseAttempts(elements.retryRange.value).catch(error => onError('Versuche konnten nicht geändert werden', error)); });
      }

      install();
      return Object.freeze({ modeLabel, current: snapshot, render, refresh });
    }
  });

  globalThis.KRDeps?.register('KRRenewalSettingsController', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
