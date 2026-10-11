(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const storageLocal = options.storageLocal;
      const doc = options.document || globalThis.document;
      const elements = options.elements || {};
      const messageTimestampText = typeof options.messageTimestampText === 'function' ? options.messageTimestampText : value => String(value || '');
      const reducedMotion = typeof options.reducedMotion === 'function' ? options.reducedMotion : () => false;
      const logEvent = typeof options.logEvent === 'function' ? options.logEvent : async () => {};
      const setCurrentStatusAction = typeof options.setCurrentStatusAction === 'function' ? options.setCurrentStatusAction : () => {};
      const keys = {
        current: String(options.keys?.current || 'uiCurrentActivityV1'),
        history: String(options.keys?.history || 'uiActivityHistoryV1'),
        overflow: String(options.keys?.overflow || 'uiActivityHistoryOverflowV1'),
        dismissed: String(options.keys?.dismissed || 'uiActivityDismissedFingerprintsV1')
      };
      const legacyArchiveInsertStatusId = String(options.legacyArchiveInsertStatusId || 'status:Anzeige aus ZIP wird inseriert');
      const maxItems = Math.max(1, Number(options.maxItems || 250));
      const retentionMs = Math.max(1, Number(options.retentionMs || 30 * 24 * 60 * 60 * 1000));

      let currentActivity = null;
      let history = [];
      let historyOverflow = false;
      let dismissedFingerprints = {};
      let loaded = false;
      let loadPromise = null;
      let persistQueue = Promise.resolve();

      function normalize(activity) {
        if (!activity || typeof activity !== 'object') return null;
        const id = String(activity.id || '').trim();
        const title = String(activity.title || '').trim();
        if (!id || !title) return null;
        return {
          id,
          slot: String(activity.slot || 'status'),
          kind: ['ready', 'error', 'waiting'].includes(String(activity.kind || '')) ? String(activity.kind) : '',
          title,
          text: String(activity.text || '').trim(),
          facts: String(activity.facts || '').trim(),
          badgeLabel: String(activity.badgeLabel || '').trim(),
          createdAt: activity.createdAt || new Date().toISOString(),
          archivedAt: activity.archivedAt ? String(activity.archivedAt) : '',
          active: activity.active === true,
          action: String(activity.action || ''),
          actionLabel: String(activity.actionLabel || ''),
          actionData: activity.actionData && typeof activity.actionData === 'object' ? { ...activity.actionData } : null
        };
      }

      function fingerprint(activity) {
        const item = normalize(activity);
        if (!item) return '';
        return [item.slot, item.kind, item.title, item.text, item.facts, item.badgeLabel, item.active ? '1' : '0', item.action, item.actionLabel].join('\u241f');
      }

      function dismissUntilChanged(activity) {
        const item = normalize(activity);
        if (!item) return;
        const nextFingerprint = fingerprint(item);
        if (!nextFingerprint) return;
        dismissedFingerprints = { ...dismissedFingerprints, [item.id]: nextFingerprint };
      }

      function priority(activity) {
        if (!activity) return 0;
        if (['retry-platform-access', 'reactivate-discarded'].includes(String(activity.action || ''))) return 120;
        if (activity.active) return 100;
        if (activity.kind === 'error') return 90;
        if (activity.kind === 'waiting') return 85;
        if (activity.kind === 'ready') return 70;
        return 60;
      }

      function timestamp(activity) {
        const value = Date.parse(activity?.createdAt || 0);
        return Number.isFinite(value) ? value : 0;
      }

      function retained(sourceHistory, overflow = false, nowMs = Date.now()) {
        const source = Array.isArray(sourceHistory) ? sourceHistory : [];
        const cutoff = Number(nowMs) - retentionMs;
        const recent = source.filter(item => {
          const itemTimestamp = Date.parse(item?.archivedAt || item?.createdAt || '');
          return !Number.isFinite(itemTimestamp) || itemTimestamp >= cutoff;
        });
        const countOverflow = recent.length > maxItems;
        const limited = recent.slice(0, maxItems);
        const nextOverflow = limited.length >= maxItems && (Boolean(overflow) || countOverflow);
        const changed = limited.length !== source.length
          || nextOverflow !== Boolean(overflow)
          || limited.some((item, index) => item !== source[index]);
        return { history: limited, overflow: nextOverflow, changed };
      }

      function applyRetention(nowMs = Date.now()) {
        const next = retained(history, historyOverflow, nowMs);
        history = next.history;
        historyOverflow = next.overflow;
        return next.changed;
      }

      function countText(sourceHistory = history, overflow = historyOverflow) {
        const count = Array.isArray(sourceHistory) ? sourceHistory.length : 0;
        if (count > maxItems || (overflow && count >= maxItems)) return `${maxItems}+`;
        return String(count);
      }

      function removeHistoryEntry(sourceHistory, target) {
        const source = Array.isArray(sourceHistory) ? sourceHistory : [];
        const targetId = String(target?.id || '');
        const targetCreatedAt = String(target?.createdAt || '');
        const targetArchivedAt = String(target?.archivedAt || '');
        const index = source.findIndex(item => String(item?.id || '') === targetId
          && String(item?.createdAt || '') === targetCreatedAt
          && String(item?.archivedAt || '') === targetArchivedAt);
        if (index < 0) return { history: source.slice(), removed: false };
        return { history: source.filter((_, itemIndex) => itemIndex !== index), removed: true };
      }

      function renderVisibility() {
        const {
          controlStatus, statusDot, statusTitle, statusText, statusFacts, statusTime, statusAction,
          messageHistoryOpen, bulkRunStatus, appNotice, renewalProgressShortcut, inventoryCaptureProgressShortcut
        } = elements;
        const currentSlot = String(currentActivity?.slot || '');
        if (currentSlot === 'status' && currentActivity) {
          if (statusDot) statusDot.className = `status-dot ${currentActivity.kind || ''}`;
          if (statusTitle) statusTitle.textContent = currentActivity.title || '';
          if (statusText) statusText.textContent = currentActivity.text || '';
          if (statusFacts) {
            statusFacts.textContent = currentActivity.facts || '';
            statusFacts.classList.toggle('hidden', !currentActivity.facts);
          }
          if (statusTime) statusTime.textContent = messageTimestampText(currentActivity.createdAt);
          setCurrentStatusAction(String(currentActivity.action || ''));
          if (statusAction) {
            const label = String(currentActivity.actionLabel || '');
            statusAction.classList.toggle('hidden', !label);
            statusAction.textContent = label;
          }
        }
        for (const [slot, element] of [
          ['status', controlStatus],
          ['renewal-shortcut', renewalProgressShortcut],
          ['app-notice', appNotice],
          ['bulk', bulkRunStatus]
        ]) {
          if (!element) continue;
          element.classList.toggle('hidden', !currentActivity || slot !== currentSlot);
        }
        if (statusTime) statusTime.textContent = currentSlot === 'status' && currentActivity ? messageTimestampText(currentActivity.createdAt) : '';
        if (messageHistoryOpen) {
          const badge = countText();
          messageHistoryOpen.dataset.count = badge;
          messageHistoryOpen.classList.toggle('is-zero', history.length === 0);
          messageHistoryOpen.setAttribute('aria-label', badge === `${maxItems}+`
            ? `Weitere Meldungen anzeigen, mehr als ${maxItems} gespeichert`
            : `Weitere Meldungen anzeigen, ${badge} gespeichert`);
        }
      }

      function persist() {
        applyRetention();
        const current = currentActivity ? { ...currentActivity } : null;
        const persistedHistory = history.map(item => ({ ...item }));
        const overflow = Boolean(historyOverflow);
        persistQueue = persistQueue
          .catch(() => {})
          .then(() => storageLocal.set({
            [keys.current]: current,
            [keys.history]: persistedHistory,
            [keys.overflow]: overflow,
            [keys.dismissed]: { ...dismissedFingerprints }
          }))
          .catch(() => {});
        return persistQueue;
      }

      function archive(activity) {
        const item = normalize(activity);
        if (!item) return;
        const existingIndex = history.findIndex(entry => String(entry?.id || '') === item.id && String(entry?.createdAt || '') === String(item.createdAt || ''));
        if (existingIndex >= 0) history.splice(existingIndex, 1);
        history.unshift({ ...item, archivedAt: new Date().toISOString(), active: false, action: '', actionLabel: '', actionData: null });
        applyRetention();
      }

      function publish(activity, options = {}) {
        const next = normalize(activity);
        if (!next) return false;
        if (!loaded) {
          void ensureLoaded().then(() => publish(next));
          return true;
        }
        const dismissedFingerprint = String(dismissedFingerprints?.[next.id] || '');
        const nextFingerprint = fingerprint(next);
        const suppressArchivedReplay = options?.suppressArchivedReplay === true;
        if (suppressArchivedReplay && String(currentActivity?.id || '') !== next.id
          && history.some(item => String(item?.id || '') === next.id && fingerprint(item) === nextFingerprint)) {
          renderVisibility();
          return false;
        }
        if (dismissedFingerprint && dismissedFingerprint === nextFingerprint) {
          renderVisibility();
          return false;
        }
        if (dismissedFingerprint && dismissedFingerprint !== nextFingerprint) {
          const updated = { ...dismissedFingerprints };
          delete updated[next.id];
          dismissedFingerprints = updated;
        }
        const current = currentActivity;
        if (current && current.id === next.id) {
          currentActivity = { ...current, ...next };
        } else if (!current || priority(next) > priority(current) || (priority(next) === priority(current) && timestamp(next) >= timestamp(current))) {
          if (current) archive(current);
          currentActivity = next;
        } else {
          renderVisibility();
          return false;
        }
        renderVisibility();
        void persist();
        return true;
      }

      function clear(activityId = '') {
        if (!currentActivity) return;
        const expected = String(activityId || '').trim();
        if (expected && String(currentActivity.id || '') !== expected) return;
        currentActivity = null;
        renderVisibility();
        void persist();
      }

      function kindLabel(item) {
        if (item?.badgeLabel) return item.badgeLabel;
        if (item?.kind === 'error') return 'Fehler';
        if (item?.kind === 'waiting') return 'Hinweis';
        if (item?.kind === 'ready') return 'Abgeschlossen';
        return 'Info';
      }

      function animateRemoval(card) {
        if (!card || reducedMotion() || typeof card.animate !== 'function') return Promise.resolve();
        const height = Math.max(0, Number(card.getBoundingClientRect?.().height || 0));
        const animation = card.animate([
          { opacity: 1, transform: 'translateY(0)', height: `${height}px`, paddingTop: '10px', paddingBottom: '10px', borderWidth: '1px' },
          { opacity: 0, transform: 'translateY(-4px)', height: '0px', paddingTop: '0px', paddingBottom: '0px', borderWidth: '0px' }
        ], { duration: 180, easing: 'cubic-bezier(.2,.72,.2,1)', fill: 'forwards' });
        return animation.finished.catch(() => {});
      }

      function deleteHistoryItem(item) {
        const result = removeHistoryEntry(history, item);
        if (!result.removed) return false;
        history = result.history;
        if (history.length < maxItems) historyOverflow = false;
        renderVisibility();
        void persist();
        void logEvent('USER_MESSAGE_HISTORY_ITEM_DELETED', { id: String(item?.id || ''), remaining: history.length });
        return true;
      }

      function renderHistory() {
        const { messageHistoryList, messageHistoryEmpty, messageHistoryClear } = elements;
        if (!messageHistoryList || !messageHistoryEmpty) return;
        const retentionChanged = applyRetention();
        if (retentionChanged) {
          renderVisibility();
          void persist();
        }
        messageHistoryList.replaceChildren();
        messageHistoryEmpty.classList.toggle('hidden', history.length > 0);
        if (messageHistoryClear) messageHistoryClear.disabled = history.length === 0;
        for (const item of history) {
          const card = doc.createElement('article');
          card.className = `message-history-item${item.kind ? ` ${item.kind}` : ''}`;
          const head = doc.createElement('div');
          head.className = 'message-history-item-head';
          const title = doc.createElement('strong');
          title.textContent = item.title || 'Meldung';
          const controls = doc.createElement('div');
          controls.className = 'message-history-item-controls';
          const badge = doc.createElement('span');
          badge.className = 'message-history-item-kind';
          badge.textContent = kindLabel(item);
          const remove = doc.createElement('button');
          remove.type = 'button';
          remove.className = 'message-history-item-remove';
          remove.setAttribute('aria-label', 'Meldung löschen');
          remove.title = 'Meldung löschen';
          remove.textContent = '×';
          remove.addEventListener('click', async () => {
            remove.disabled = true;
            if (!deleteHistoryItem(item)) {
              remove.disabled = false;
              return;
            }
            await animateRemoval(card);
            card.remove();
            messageHistoryEmpty.classList.toggle('hidden', history.length > 0);
            if (messageHistoryClear) messageHistoryClear.disabled = history.length === 0;
          });
          controls.append(badge, remove);
          head.append(title, controls);
          if (item.facts) {
            const facts = doc.createElement('p');
            facts.className = 'message-history-facts';
            facts.textContent = item.facts;
            card.append(head, facts);
          } else {
            card.append(head);
          }
          const text = doc.createElement('p');
          text.textContent = item.text || '';
          const time = doc.createElement('p');
          time.className = 'message-timestamp';
          time.textContent = messageTimestampText(item.createdAt);
          card.append(text, time);
          messageHistoryList.append(card);
        }
      }

      async function ensureLoaded() {
        if (loaded) return;
        if (loadPromise) return loadPromise;
        loadPromise = storageLocal.get([keys.current, keys.history, keys.overflow, keys.dismissed])
          .then(stored => {
            currentActivity = normalize(stored?.[keys.current]) || null;
            if (currentActivity) currentActivity = { ...currentActivity, slot: 'status', action: '', actionLabel: '', actionData: null };
            history = Array.isArray(stored?.[keys.history]) ? stored[keys.history].map(normalize).filter(Boolean) : [];
            historyOverflow = stored?.[keys.overflow] === true;
            dismissedFingerprints = stored?.[keys.dismissed] && typeof stored[keys.dismissed] === 'object' && !Array.isArray(stored[keys.dismissed])
              ? { ...stored[keys.dismissed] }
              : {};
            let migrationChanged = false;
            if (String(currentActivity?.id || '') === legacyArchiveInsertStatusId) {
              const stale = currentActivity;
              const alreadyArchived = history.some(item => String(item?.id || '') === String(stale.id || '')
                && String(item?.createdAt || '') === String(stale.createdAt || ''));
              if (!alreadyArchived) {
                history.unshift({ ...stale, archivedAt: new Date().toISOString(), active: false, action: '', actionLabel: '', actionData: null });
              }
              currentActivity = null;
              migrationChanged = true;
            }
            const retentionChanged = applyRetention();
            loaded = true;
            renderVisibility();
            if (retentionChanged || migrationChanged) void persist();
          })
          .catch(() => {
            currentActivity = null;
            history = [];
            historyOverflow = false;
            dismissedFingerprints = {};
            loaded = true;
            renderVisibility();
          })
          .finally(() => { loadPromise = null; });
        return loadPromise;
      }

      function clearHistory() {
        const removed = history.length;
        history = [];
        historyOverflow = false;
        renderHistory();
        renderVisibility();
        return persist().then(() => removed);
      }

      return Object.freeze({
        normalize,
        fingerprint,
        dismissUntilChanged,
        priority,
        timestamp,
        retained,
        archive,
        publish,
        clear,
        renderHistory,
        ensureLoaded,
        clearHistory,
        current: () => currentActivity ? { ...currentActivity } : null,
        history: () => history.map(item => ({ ...item })),
        historyOverflow: () => historyOverflow,
        isLoaded: () => loaded
      });
    }
  });
  globalThis.KRDeps?.register?.('KRAppActivityCenter', API);
})();
