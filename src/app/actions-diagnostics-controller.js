(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const doc = options.document || globalThis.document;
      const win = options.window || globalThis.window;
      const primaryActions = options.primaryActions || null;
      const actionsAccordion = options.actionsAccordion || null;
      const inventorySection = options.inventorySection || null;
      const trashSection = options.trashSection || null;
      const logEvent = typeof options.logEvent === 'function' ? options.logEvent : async () => {};
      const sidebarActionEntries = typeof options.sidebarActionEntries === 'function' ? options.sidebarActionEntries : () => [];
      const actionDisableModel = typeof options.actionDisableModel === 'function' ? options.actionDisableModel : () => ({ disabled: false, reason: '' });
      const snapshotContext = typeof options.snapshotContext === 'function' ? options.snapshotContext : () => ({});
      const accordionSnapshot = typeof options.accordionSnapshot === 'function' ? options.accordionSnapshot : () => null;
      const accordionHeader = typeof options.accordionHeader === 'function' ? options.accordionHeader : accordion => accordion?.querySelector?.(':scope > summary, :scope > button') || null;
      const sanitizeAccordionAnimations = typeof options.sanitizeAccordionAnimations === 'function' ? options.sanitizeAccordionAnimations : () => {};
      const readBackgroundEpoch = typeof options.readBackgroundEpoch === 'function' ? options.readBackgroundEpoch : async () => '';
      const fetchResyncState = typeof options.fetchResyncState === 'function' ? options.fetchResyncState : async () => ({});
      const applyResyncState = typeof options.applyResyncState === 'function' ? options.applyResyncState : async () => {};
      const attemptContext = typeof options.attemptContext === 'function' ? options.attemptContext : () => ({});
      const interactionContext = typeof options.interactionContext === 'function' ? options.interactionContext : () => ({});

      let snapshotTimer = null;
      let pendingSnapshotSource = '';
      let lastSnapshotSignature = '';
      let lastDesyncSignature = '';
      let lastSyncAt = 0;
      let lastSyncSource = 'startup';
      let resyncInFlight = null;
      let resyncTimer = null;
      let backgroundEpoch = '';

      function elementDescriptor(element) {
        if (!element || typeof element !== 'object') return null;
        return {
          tag: String(element.tagName || '').toLowerCase() || null,
          id: element.id || null,
          className: typeof element.className === 'string' ? element.className.slice(0, 180) : null,
          probeFor: element.dataset?.actionProbeFor || null,
          role: element.getAttribute?.('role') || null,
          ariaLabel: element.getAttribute?.('aria-label') || null
        };
      }

      function rectOf(element) {
        const rect = element?.getBoundingClientRect?.();
        if (!rect) return null;
        return {
          left: Math.round(rect.left * 100) / 100,
          top: Math.round(rect.top * 100) / 100,
          right: Math.round(rect.right * 100) / 100,
          bottom: Math.round(rect.bottom * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100
        };
      }

      function sidebarActionState(buttonId, button) {
        const expected = actionDisableModel(buttonId);
        const style = button ? win.getComputedStyle(button) : null;
        const shell = button?.closest?.('.control-action-attempt-shell') || null;
        if (shell) shell.title = String(button?.title || '');
        return {
          buttonId,
          disabled: button?.disabled === true,
          expectedDisabled: expected.disabled === true,
          disableReason: expected.reason,
          visible: Boolean(button && style && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0),
          pointerEvents: style?.pointerEvents || null,
          title: String(button?.title || ''),
          rect: rectOf(button)
        };
      }

      function stateSnapshot(source = 'snapshot') {
        const snapshot = {
          ...snapshotContext(),
          source,
          timestamp: new Date().toISOString(),
          lastSuccessfulSyncAt: lastSyncAt ? new Date(lastSyncAt).toISOString() : null,
          msSinceLastSuccessfulSync: lastSyncAt ? Math.max(0, Date.now() - lastSyncAt) : null,
          lastSyncSource: lastSyncSource || null,
          backgroundEpoch: backgroundEpoch || null,
          accordion: accordionSnapshot(actionsAccordion),
          actions: sidebarActionEntries().map(([buttonId, button]) => sidebarActionState(buttonId, button))
        };
        return snapshot;
      }

      function stateSignature(snapshot) {
        return JSON.stringify({
          gateKind: snapshot.gateKind,
          gateAllowed: snapshot.gateAllowed,
          selectedProfileId: snapshot.selectedProfileId,
          liveProfileId: snapshot.liveProfileId,
          pageReady: snapshot.pageReady,
          singleBusy: snapshot.singleBusy,
          bulkBusy: snapshot.bulkBusy,
          insertionLock: snapshot.insertionLock,
          mass: snapshot.mass,
          archiveDialogMode: snapshot.archiveDialogMode,
          renewalDialogMode: snapshot.renewalDialogMode,
          inventoryCapture: snapshot.inventoryCapture,
          actions: snapshot.actions.map(item => ({ buttonId: item.buttonId, disabled: item.disabled, expectedDisabled: item.expectedDisabled, disableReason: item.disableReason, visible: item.visible }))
        });
      }

      function emitDesyncIfNeeded(snapshot) {
        const mismatches = snapshot.actions.filter(item => item.disabled !== item.expectedDisabled);
        const signature = JSON.stringify(mismatches.map(item => [item.buttonId, item.disabled, item.expectedDisabled, item.disableReason]));
        if (!mismatches.length) {
          lastDesyncSignature = '';
          return;
        }
        if (signature === lastDesyncSignature) return;
        lastDesyncSignature = signature;
        void logEvent('UI_ACTION_STATE_DESYNC_DETECTED', { source: snapshot.source, mismatches, state: snapshot }, 'warning');
      }

      function recordSnapshot(source = 'state-change', { force = false } = {}) {
        const snapshot = stateSnapshot(source);
        const signature = stateSignature(snapshot);
        emitDesyncIfNeeded(snapshot);
        if (force || signature !== lastSnapshotSignature) {
          lastSnapshotSignature = signature;
          void logEvent('UI_ACTIONS_STATE_SNAPSHOT', snapshot);
        }
        return snapshot;
      }

      function scheduleSnapshot(source = 'state-change', { force = false } = {}) {
        pendingSnapshotSource = source || pendingSnapshotSource || 'state-change';
        if (snapshotTimer) return;
        snapshotTimer = setTimeout(() => {
          snapshotTimer = null;
          const pendingSource = pendingSnapshotSource || 'state-change';
          pendingSnapshotSource = '';
          recordSnapshot(pendingSource, { force });
        }, 40);
      }

      function markSynced(source = 'ui-sync') {
        lastSyncAt = Date.now();
        lastSyncSource = source;
      }

      function sidebarButtonAtPoint(clientX, clientY) {
        for (const [, button] of sidebarActionEntries()) {
          const rect = button.getBoundingClientRect();
          if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return button;
        }
        return null;
      }

      function installSidebarAttempts() {
        if (!primaryActions) return;
        const recordAttempt = phase => event => {
          const direct = event.target?.closest?.('button');
          const shell = event.target?.closest?.('.control-action-attempt-shell');
          const button = (direct && primaryActions.contains(direct) ? direct : null)
            || (shell?.dataset?.actionProbeFor ? doc.getElementById(shell.dataset.actionProbeFor) : null)
            || sidebarButtonAtPoint(Number(event.clientX || 0), Number(event.clientY || 0));
          if (!button || !primaryActions.contains(button)) return;
          const hitTarget = doc.elementFromPoint(Number(event.clientX || 0), Number(event.clientY || 0));
          const rect = button.getBoundingClientRect();
          const style = win.getComputedStyle(button);
          const hitStyle = hitTarget ? win.getComputedStyle(hitTarget) : null;
          void logEvent('UI_ACTION_ATTEMPT', {
            phase,
            buttonId: button.id || null,
            disabled: button.disabled === true,
            ...attemptContext(button),
            boundingRect: { left: Math.round(rect.left * 100) / 100, top: Math.round(rect.top * 100) / 100, width: Math.round(rect.width * 100) / 100, height: Math.round(rect.height * 100) / 100 },
            pointerEvents: style.pointerEvents || null,
            visibility: style.visibility || null,
            display: style.display || null,
            hitTarget: elementDescriptor(hitTarget),
            hitTargetPointerEvents: hitStyle?.pointerEvents || null,
            possibleOverlay: Boolean(hitTarget && hitTarget !== button && !button.contains(hitTarget) && !hitTarget.closest?.(`[data-action-probe-for="${button.id}"]`)),
            msSinceLastSuccessfulSync: lastSyncAt ? Math.max(0, Date.now() - lastSyncAt) : null,
            lastSyncSource: lastSyncSource || null,
            backgroundEpoch: backgroundEpoch || null
          });
          recordSnapshot(`attempt:${button.id}:${phase}`, { force: true });
        };
        primaryActions.addEventListener('pointerdown', recordAttempt('pointerdown'), true);
        primaryActions.addEventListener('click', recordAttempt('click'), true);
      }

      function pointInsideRect(rect, clientX, clientY) {
        return Boolean(rect && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom);
      }

      function installSurfacePointers() {
        if (!actionsAccordion) return;
        const record = phase => event => {
          const clientX = Number(event.clientX);
          const clientY = Number(event.clientY);
          if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
          const panel = actionsAccordion.querySelector(':scope > .control-accordion-panel');
          const summary = accordionHeader(actionsAccordion);
          const expectedButton = sidebarButtonAtPoint(clientX, clientY);
          const accordionRect = actionsAccordion.getBoundingClientRect();
          const panelRect = panel?.getBoundingClientRect?.() || null;
          const primaryRect = primaryActions?.getBoundingClientRect?.() || null;
          const targetInside = Boolean(event.target?.closest?.('#actionsAccordion'));
          const insideActionsGeometry = targetInside
            || pointInsideRect(accordionRect, clientX, clientY)
            || pointInsideRect(panelRect, clientX, clientY)
            || pointInsideRect(primaryRect, clientX, clientY)
            || Boolean(expectedButton);
          if (!insideActionsGeometry) return;
          const hitTarget = doc.elementFromPoint(clientX, clientY);
          const hitStack = typeof doc.elementsFromPoint === 'function'
            ? doc.elementsFromPoint(clientX, clientY).slice(0, 8).map(elementDescriptor)
            : [];
          const expectedShell = expectedButton?.closest?.('.control-action-attempt-shell') || null;
          const possibleOverlay = Boolean(expectedButton && hitTarget && hitTarget !== expectedButton && !expectedButton.contains(hitTarget) && !expectedShell?.contains(hitTarget));
          const panelStyle = panel ? win.getComputedStyle(panel) : null;
          const summaryStyle = summary ? win.getComputedStyle(summary) : null;
          void logEvent('UI_ACTIONS_POINTER_CAPTURE', {
            phase,
            clientX: Math.round(clientX * 100) / 100,
            clientY: Math.round(clientY * 100) / 100,
            eventTarget: elementDescriptor(event.target),
            hitTarget: elementDescriptor(hitTarget),
            hitStack,
            expectedButtonId: expectedButton?.id || null,
            possibleOverlay,
            targetInside,
            accordionRect: rectOf(actionsAccordion),
            panelRect: rectOf(panel),
            primaryActionsRect: rectOf(primaryActions),
            panelOverflow: panelStyle?.overflow || null,
            panelPointerEvents: panelStyle?.pointerEvents || null,
            summaryPointerEvents: summaryStyle?.pointerEvents || null,
            accordion: accordionSnapshot(actionsAccordion),
            backgroundEpoch: backgroundEpoch || null,
            msSinceLastSuccessfulSync: lastSyncAt ? Math.max(0, Date.now() - lastSyncAt) : null
          });
          if (phase === 'pointerdown') sanitizeAccordionAnimations('actions-pointerdown');
        };
        doc.addEventListener('pointerdown', record('pointerdown'), true);
        doc.addEventListener('click', record('click'), true);
      }

      async function detectEpoch(source = 'epoch-check') {
        try {
          const epoch = String(await readBackgroundEpoch() || '');
          if (!epoch) return null;
          const previous = backgroundEpoch;
          backgroundEpoch = epoch;
          if (previous && previous !== epoch) {
            void logEvent('UI_ACTIONS_BACKGROUND_EPOCH_CHANGED', { source, previousEpoch: previous, epoch });
            scheduleResync('background-reconnect');
            return { changed: true, previous, epoch };
          }
          return { changed: false, previous, epoch };
        } catch (error) {
          void logEvent('UI_ACTIONS_BACKGROUND_EPOCH_CHECK_FAILED', { source, message: String(error?.message || error || '') }, 'warning');
          return null;
        }
      }

      async function performResync(source = 'manual-resync') {
        sanitizeAccordionAnimations(`resync:${source}`);
        if (resyncInFlight) return resyncInFlight;
        resyncInFlight = (async () => {
          const started = performance.now();
          const before = recordSnapshot(`resync:${source}:before`, { force: true });
          void logEvent('UI_ACTIONS_RESYNC_STARTED', { source, backgroundEpoch: backgroundEpoch || null, before });
          try {
            const [epoch, state] = await Promise.all([
              readBackgroundEpoch().catch(() => ''),
              fetchResyncState(source)
            ]);
            const previousEpoch = backgroundEpoch;
            if (epoch) backgroundEpoch = String(epoch);
            if (previousEpoch && epoch && previousEpoch !== epoch) void logEvent('UI_ACTIONS_BACKGROUND_EPOCH_CHANGED', { source, previousEpoch, epoch });
            await applyResyncState(state, source);
            markSynced(`resync:${source}`);
            const after = recordSnapshot(`resync:${source}:after`, { force: true });
            void logEvent('UI_ACTIONS_RESYNC_COMPLETED', {
              source,
              durationMs: Math.round(performance.now() - started),
              previousEpoch: previousEpoch || null,
              backgroundEpoch: backgroundEpoch || null,
              after
            });
            return after;
          } catch (error) {
            void logEvent('UI_ACTIONS_RESYNC_FAILED', { source, durationMs: Math.round(performance.now() - started), message: String(error?.message || error || '') }, 'warning');
            throw error;
          } finally {
            resyncInFlight = null;
          }
        })();
        return resyncInFlight;
      }

      function scheduleResync(source = 'scheduled-resync', delayMs = 100) {
        if (resyncTimer) clearTimeout(resyncTimer);
        resyncTimer = setTimeout(() => {
          resyncTimer = null;
          void performResync(source).catch(() => {});
        }, Math.max(0, Number(delayMs) || 0));
      }

      function installInteractionDiagnostics(root, scope) {
        if (!root) return;
        const recordInteraction = phase => event => {
          const button = event.target?.closest?.('button');
          const card = button?.closest?.('.inventory-card');
          if (!button || !card || !root.contains(button)) return;
          void logEvent('UI_ACTION_INTERACTION', {
            phase,
            scope,
            actionLabel: String(button.getAttribute('aria-label') || button.textContent || '').trim().slice(0, 120),
            disabled: button.disabled === true,
            ...interactionContext(button, card, scope)
          }, 'info');
        };
        root.addEventListener('pointerdown', recordInteraction('pointerdown'), true);
        root.addEventListener('click', recordInteraction('click'), true);
      }

      function install() {
        installInteractionDiagnostics(inventorySection, 'inventory');
        installInteractionDiagnostics(trashSection, 'trash');
        installSidebarAttempts();
        installSurfacePointers();
      }

      function status() {
        return Object.freeze({
          backgroundEpoch: backgroundEpoch || null,
          lastSyncAt: lastSyncAt || 0,
          lastSyncSource: lastSyncSource || null,
          resyncInFlight: Boolean(resyncInFlight),
          snapshotPending: Boolean(snapshotTimer)
        });
      }

      return Object.freeze({
        install,
        status,
        markSynced,
        recordSnapshot,
        scheduleSnapshot,
        detectEpoch,
        scheduleResync
      });
    }
  });
  globalThis.KRDeps?.register?.('KRActionsDiagnosticsController', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
