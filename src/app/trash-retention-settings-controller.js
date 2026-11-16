(() => {
  'use strict';

  const STOPS = Object.freeze([10, 30, 60, 90, 180, 360, 'infinite']);
  const MIN_RECOVERY_INTERVAL_MS = 1500;
  const label = days => days === 'infinite' ? 'Unbegrenzt (∞)' : days + ' Tage';
  const description = days => days === 'infinite'
    ? 'Einträge bleiben bis zur ausdrücklichen endgültigen Löschung erhalten.'
    : 'Einträge werden nach ' + days + ' Tagen automatisch aus dem lokalen Papierkorb gelöscht.';

  const API = Object.freeze({
    create(options = {}) {
      const elements = options.elements || {};
      const range = elements.range;
      const value = elements.value;
      const runtimeMessage = options.runtimeMessage;
      const confirmAction = options.confirmAction;
      const getSelectedProfileId = options.getSelectedProfileId || (() => '');
      const onChanged = options.onChanged || (() => {});
      const onReconcile = options.onReconcile || (async () => {});
      const onStateChanged = options.onStateChanged || (() => {});
      const onError = options.onError || (() => {});
      const now = options.now || (() => Date.now());
      if (!range || !value || typeof runtimeMessage !== 'function' || typeof confirmAction !== 'function') {
        throw new Error('KRTrashRetentionSettingsController requires range, value and handlers');
      }

      // An unread preference is not the persisted legacy default. A real 30-day
      // default is returned by the background ONLY after its storage read succeeds.
      let current = null;
      let state = 'loading'; // loading | unavailable | ready
      let busy = false;
      let generation = 0;
      let pendingRefresh = null;
      let lastReadAttemptAt = -Infinity;

      function validated(days) {
        if (!STOPS.includes(days)) throw new Error('Ungültige Papierkorb-Aufbewahrung aus dem Hintergrund.');
        return days;
      }

      function show(days) {
        const index = STOPS.indexOf(days);
        range.value = String(index);
        range.hidden = false;
        range.disabled = busy;
        range.setAttribute('aria-valuetext', label(days));
        range.title = days === 'infinite'
          ? 'Unbegrenzt: Einträge bleiben erhalten, bis du sie ausdrücklich endgültig löschst.'
          : 'Aufbewahrung ' + days + ' Tage';
        value.textContent = label(days);
        if (elements.description) elements.description.textContent = description(days);
        return days;
      }

      function showUnknown(nextState) {
        const loading = nextState === 'loading';
        range.hidden = true; // Do not show a knob at the hardcoded HTML index 1 (30 days).
        range.disabled = true;
        range.setAttribute('aria-valuetext', loading ? 'Wird ermittelt' : 'Nicht verfügbar');
        range.title = loading ? 'Papierkorb-Aufbewahrung wird ermittelt.'
          : 'Papierkorb-Aufbewahrung konnte nicht ermittelt werden. Fenster erneut aktivieren, um die Einstellung zu prüfen.';
        value.textContent = loading ? 'Wird ermittelt …' : 'Nicht verfügbar';
        if (elements.description) elements.description.textContent = loading
          ? 'Die gespeicherte Aufbewahrungsdauer wird geprüft. Bis dahin kann sie nicht geändert werden.'
          : 'Die gespeicherte Aufbewahrungsdauer konnte nicht gelesen werden. Erneut prüfen, bevor du sie änderst.';
      }

      function setState(nextState, days = null) {
        current = nextState === 'ready' ? validated(days) : null;
        state = nextState;
        if (state === 'ready') show(current);
        else showUnknown(state);
        onStateChanged({ status: state, retentionDays: current });
        return current;
      }

      function render(days) {
        // Retained for existing callers; never silently normalize an invalid
        // or missing background response to a confirmed 30-day policy.
        return setState('ready', days);
      }

      function previewInput() {
        if (state !== 'ready' || busy) return;
        const proposed = STOPS[Number(range.value)];
        show(proposed === undefined ? current : proposed); // Display only; no write and no delete.
      }

      async function refresh() {
        if (busy) return current;
        if (pendingRefresh) return pendingRefresh;
        // Visibility/focus storms must not repeatedly probe a denied MV3 fence.
        if (state === 'unavailable' && now() - lastReadAttemptAt < MIN_RECOVERY_INTERVAL_MS) return current;
        lastReadAttemptAt = now();
        const tokenGeneration = ++generation;
        setState('loading');
        const task = (async () => {
          try {
            const result = await runtimeMessage({ type: 'GET_TRASH_RETENTION_CONFIGURATION' });
            const days = validated(result?.retentionDays);
            if (tokenGeneration !== generation) return current;
            // Refresh projections before revealing a verified policy, so cards
            // and configuration text never claim contradictory confirmed values.
            await onReconcile(days);
            if (tokenGeneration !== generation) return current;
            setState('ready', days);
            onChanged(days);
            return days;
          } catch (error) {
            if (tokenGeneration === generation) setState('unavailable');
            throw error;
          } finally {
            if (pendingRefresh === task) pendingRefresh = null;
          }
        })();
        pendingRefresh = task;
        return task;
      }

      async function choose() {
        if (busy || state !== 'ready' || range.disabled) return current;
        const proposed = STOPS[Number(range.value)];
        if (proposed === undefined || proposed === current) return show(current);
        const tokenGeneration = ++generation;
        busy = true;
        range.disabled = true;
        const selectedProfileId = String(getSelectedProfileId() || '');
        try {
          const preview = await runtimeMessage({
            type: 'PREVIEW_TRASH_RETENTION_CHANGE',
            retentionDays: proposed,
            selectedProfileId
          });
          if (preview.retentionDays !== current || preview.proposedDays !== proposed) {
            throw new Error('Die Einstellung wurde zwischenzeitlich geändert. Bitte erneut prüfen.');
          }
          const affected = Number(preview.affectedCount || 0);
          let confirmed = false;
          if (affected > 0) {
            confirmed = await confirmAction({
              title: 'Papierkorb-Einträge endgültig löschen?',
              text: 'Mit ' + label(proposed) + ' werden ' + affected + ' bereits gespeicherte ' + (affected === 1 ? 'Eintrag' : 'Einträge') + ' sofort dauerhaft aus dem lokalen Papierkorb gelöscht.',
              detail: 'Diese Daten und Bilder lassen sich über den Kleinanzeigen Manager danach nicht wiederherstellen. Alle betroffenen Inventarprofile werden berücksichtigt. Anzeigen auf Kleinanzeigen.de bleiben unverändert.',
              confirmLabel: affected === 1 ? '1 Eintrag endgültig löschen' : affected + ' Einträge endgültig löschen',
              danger: true
            });
            if (!confirmed) return show(current);
          }
          if (tokenGeneration !== generation) throw new Error('Einstellung veraltet.');
          const saved = await runtimeMessage({
            type: 'COMMIT_TRASH_RETENTION_CHANGE',
            token: preview.token, retentionDays: proposed,
            selectedProfileId, confirmed
          });
          const savedDays = validated(saved?.retentionDays);
          setState('loading');
          await onReconcile(savedDays);
          if (tokenGeneration !== generation) throw new Error('Einstellung veraltet.');
          setState('ready', savedDays);
          onChanged(savedDays);
          return savedDays;
        } catch (error) {
          onError('Papierkorb-Aufbewahrung konnte nicht geändert werden', error);
          // A failed write/preview is not proof that the last known policy is
          // still current. Fail closed until another authorized read succeeds.
          setState('unavailable');
          return null;
        } finally {
          busy = false;
          if (state === 'ready') show(current);
          else showUnknown(state);
          range.focus({ preventScroll: true });
        }
      }

      range.addEventListener('input', previewInput);
      range.addEventListener('change', () => { void choose(); });
      setState('loading');

      return Object.freeze({ refresh, render, current: () => current, status: () => state });
    }
  });

  globalThis.KRDeps?.register('KRTrashRetentionSettingsController', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
