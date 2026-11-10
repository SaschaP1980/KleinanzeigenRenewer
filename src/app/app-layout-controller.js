(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const win = options.window || globalThis.window;
      const doc = options.document || globalThis.document;
      const elements = options.elements || {};
      const logEvent = typeof options.logEvent === 'function' ? options.logEvent : async () => {};
      const getCurrentView = typeof options.getCurrentView === 'function' ? options.getCurrentView : () => 'inventory';
      const getViewMode = typeof options.getViewMode === 'function' ? options.getViewMode : () => 'detailed';
      let stickyHeaderSyncFrame = 0;
      let lastWheelDeltaY = 0;
      // Only the rare genuine bottom-clamp oscillation needs diagnostics.
      // Routine scroll/geometry snapshots were retired after native acceptance.
      let lastBottomTop = null;
      let recentTopChanges = [];

      function stickyShellTopGap() {
        const raw = win.getComputedStyle(doc.documentElement).getPropertyValue('--app-shell-top-gap');
        const gap = Number.parseFloat(raw);
        return Number.isFinite(gap) ? gap : 20;
      }

      function stickyHeaderThreshold() {
        const measuredHeaderBottom = elements.appHeader?.getBoundingClientRect?.().bottom;
        const headerBottom = Number.isFinite(measuredHeaderBottom) ? measuredHeaderBottom : 72;
        const target = headerBottom + stickyShellTopGap();
        const roundedHeaderBottom = Math.round(headerBottom * 100) / 100;
        const roundedTarget = Math.round(target * 100) / 100;
        const occlusionHeight = Math.max(0, Math.round((target - headerBottom) * 100) / 100);
        doc.documentElement.style.setProperty('--list-sticky-app-header-bottom', `${roundedHeaderBottom}px`);
        doc.documentElement.style.setProperty('--app-content-sticky-top', `${roundedTarget}px`);
        doc.documentElement.style.setProperty('--list-sticky-top', `${roundedTarget}px`);
        doc.documentElement.style.setProperty('--list-sticky-occlusion-height', `${occlusionHeight}px`);
        return target;
      }

      function contexts() {
        return [
          { scope: 'inventory', section: elements.inventorySection, sentinel: elements.inventoryStickySentinel, slot: elements.inventoryStickySlot, header: elements.inventoryStickyHeader, occlusion: elements.inventoryStickyOcclusion },
          { scope: 'trash', section: elements.trashSection, sentinel: elements.trashStickySentinel, slot: elements.trashStickySlot, header: elements.trashStickyHeader, occlusion: elements.trashStickyOcclusion }
        ];
      }

      function syncPinnedHeaderGeometry(ctx) {
        if (!ctx?.slot || !ctx?.header || !ctx.header.classList.contains('is-stuck')) return;
        const rect = ctx.slot.getBoundingClientRect();
        const left = `${Math.round(rect.left * 100) / 100}px`;
        const width = `${Math.round(rect.width * 100) / 100}px`;
        ctx.header.style.setProperty('--list-sticky-left', left);
        ctx.header.style.setProperty('--list-sticky-width', width);
        if (ctx.occlusion) {
          ctx.occlusion.style.setProperty('--list-sticky-left', left);
          ctx.occlusion.style.setProperty('--list-sticky-width', width);
        }
      }

      function setStickyHeaderPinned(ctx, shouldPin) {
        const { slot, header, occlusion } = ctx || {};
        if (!slot || !header) return;
        const pinned = header.classList.contains('is-stuck');
        if (pinned === shouldPin) {
          if (pinned) syncPinnedHeaderGeometry(ctx);
          if (occlusion) occlusion.classList.toggle('is-active', Boolean(shouldPin));
          return;
        }
        if (shouldPin) {
          const headerRect = header.getBoundingClientRect();
          const slotRect = slot.getBoundingClientRect();
          const left = `${Math.round(slotRect.left * 100) / 100}px`;
          const width = `${Math.round(slotRect.width * 100) / 100}px`;
          slot.style.height = `${Math.round(headerRect.height * 100) / 100}px`;
          header.style.setProperty('--list-sticky-left', left);
          header.style.setProperty('--list-sticky-width', width);
          if (occlusion) {
            occlusion.style.setProperty('--list-sticky-left', left);
            occlusion.style.setProperty('--list-sticky-width', width);
            occlusion.classList.add('is-active');
          }
          header.classList.add('is-stuck');
        } else {
          header.classList.remove('is-stuck');
          header.style.removeProperty('--list-sticky-left');
          header.style.removeProperty('--list-sticky-width');
          if (occlusion) {
            occlusion.classList.remove('is-active');
            occlusion.style.removeProperty('--list-sticky-left');
            occlusion.style.removeProperty('--list-sticky-width');
          }
          slot.style.height = '';
        }
      }

      function syncListStickyHeaders() {
        stickyHeaderSyncFrame = 0;
        const threshold = stickyHeaderThreshold();
        for (const ctx of contexts()) {
          const { section, sentinel, header } = ctx;
          if (!section || !sentinel || !header || section.classList.contains('hidden')) {
            setStickyHeaderPinned(ctx, false);
            continue;
          }
          const sentinelTop = sentinel.getBoundingClientRect().top;
          const scrollY = Number(win.scrollY || doc.scrollingElement?.scrollTop || 0);
          setStickyHeaderPinned(ctx, scrollY > 0 && sentinelTop < threshold);
        }
      }

      function scheduleListStickyHeaderSync() {
        if (stickyHeaderSyncFrame) return;
        stickyHeaderSyncFrame = win.requestAnimationFrame(syncListStickyHeaders);
      }

      function recordSidebarDiagnostics(source = 'scroll') {
        const root = doc.documentElement;
        const body = doc.body;
        const scrolling = doc.scrollingElement || root;
        const controlPanel = elements.controlPanel;
        if (!root || !body || !controlPanel) return;

        const scrollY = Number(win.scrollY || scrolling?.scrollTop || 0);
        const clientHeight = Number(root.clientHeight || win.innerHeight || 0);
        const scrollHeight = Math.max(Number(root.scrollHeight || 0), Number(body.scrollHeight || 0));
        const distanceToBottom = Math.max(0, Math.max(0, scrollHeight - clientHeight) - scrollY);
        // Skip all geometry readback outside the historically affected bottom zone.
        if (distanceToBottom > 250) {
          lastBottomTop = null;
          recentTopChanges = [];
          return;
        }

        const top = Number(controlPanel.getBoundingClientRect().top);
        if (!Number.isFinite(top)) return;
        const now = Date.now();
        if (lastBottomTop !== null) {
          const delta = top - lastBottomTop;
          if (Math.abs(delta) >= 0.5) {
            recentTopChanges.push({ at: now, top, delta });
            recentTopChanges = recentTopChanges.filter(item => now - item.at <= 1200);
            // A single gradual release of CSS sticky position is legitimate;
            // only repeated direction reversals indicate actual oscillation.
            let reversals = 0;
            for (let i = 1; i < recentTopChanges.length; i += 1) {
              if (Math.sign(recentTopChanges[i].delta) !== Math.sign(recentTopChanges[i - 1].delta)) reversals += 1;
            }
            if (recentTopChanges.length >= 4 && reversals >= 2) {
              void logEvent('UI_SIDEBAR_BOTTOM_OSCILLATION_DETECTED', {
                activeTab: getCurrentView() === 'trash' ? 'trash' : 'inventory',
                viewMode: getViewMode(), source, scrollY, distanceToBottom,
                lastWheelDeltaY, changes: recentTopChanges.slice(-8)
              }, 'warning');
              recentTopChanges = [];
            }
          }
        }
        lastBottomTop = top;
      }

      function noteWheel(deltaY) { lastWheelDeltaY = Number(deltaY || 0); }

      return Object.freeze({ shellTopGap: stickyShellTopGap, headerThreshold: stickyHeaderThreshold, syncPinnedHeaderGeometry, setPinned: setStickyHeaderPinned, syncStickyHeaders: syncListStickyHeaders, scheduleStickyHeaderSync: scheduleListStickyHeaderSync, recordSidebarDiagnostics, noteWheel });
    }
  });
  globalThis.KRDeps?.register?.('KRAppLayoutController', API);
})();
