(() => {
  'use strict';

  const STOPS = Object.freeze([10, 30, 60, 90, 180, 360, 'infinite']);
  const label = value => value === 'infinite' ? 'Unbegrenzt (∞)' : value + ' Tage';
  const description = value => value === 'infinite'
    ? 'Einträge bleiben bis zur ausdrücklichen endgültigen Löschung erhalten.'
    : 'Einträge werden nach ' + value + ' Tagen automatisch aus dem lokalen Papierkorb gelöscht.';

  const API = Object.freeze({
    create(options = {}) {
      const elements = options.elements || {};
      const range = elements.range;
      const value = elements.value;
      const runtimeMessage = options.runtimeMessage;
      const confirmAction = options.confirmAction;
      const getSelectedProfileId = options.getSelectedProfileId || (() => '');
      const onChanged = options.onChanged || (() => {});
      const onError = options.onError || (() => {});
      if (!range || !value || typeof runtimeMessage !== 'function' || typeof confirmAction !== 'function') {
        throw new Error('KRTrashRetentionSettingsController requires range, value and handlers');
      }
      let current = 30;
      let busy = false;
      let generation = 0;

      function normalized(value) { return STOPS.includes(value) ? value : 30; }
      function show(retentionDays) {
        const days = normalized(retentionDays);
        const index = STOPS.indexOf(days);
        range.value = String(index);
        range.setAttribute('aria-valuetext', label(days));
        range.title = days === 'infinite'
          ? 'Unbegrenzt: Einträge bleiben erhalten, bis du sie ausdrücklich endgültig löschst.'
          : 'Aufbewahrung ' + days + ' Tage';
        value.textContent = label(days);
        if (elements.description) elements.description.textContent = description(days);
        return days;
      }

      function render(days) {
        current = normalized(days);
        show(current);
        return current;
      }

      function previewInput() {
        const proposed = STOPS[Number(range.value)];
        show(proposed === undefined ? current : proposed); // Display only; no write and no delete.
      }

      async function refresh() {
        if (busy) return current;
        const result = await runtimeMessage({ type: 'GET_TRASH_RETENTION_CONFIGURATION' });
        render(result?.retentionDays);
        onChanged(current);
        return current;
      }

      async function choose() {
        if (busy) return current;
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
            if (!confirmed) return render(current);
          }
          if (tokenGeneration !== generation) throw new Error('Einstellung veraltet.');
          const saved = await runtimeMessage({
            type: 'COMMIT_TRASH_RETENTION_CHANGE',
            token: preview.token, retentionDays: proposed,
            selectedProfileId, confirmed
          });
          render(saved.retentionDays);
          onChanged(current);
          return current;
        } catch (error) {
          onError('Papierkorb-Aufbewahrung konnte nicht geändert werden', error);
          try {
            const config = await runtimeMessage({ type: 'GET_TRASH_RETENTION_CONFIGURATION' });
            render(config.retentionDays);
            onChanged(current);
          } catch {
            render(current);
          }
          return current;
        } finally {
          busy = false;
          range.disabled = false;
          show(current);
          range.focus({ preventScroll: true });
        }
      }

      range.addEventListener('input', previewInput);
      range.addEventListener('change', () => { void choose(); });

      return Object.freeze({ refresh, render, current: () => current });
    }
  });

  globalThis.KRDeps?.register('KRTrashRetentionSettingsController', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
