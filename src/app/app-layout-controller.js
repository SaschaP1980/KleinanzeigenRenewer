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
      let lastSampleAt = 0;
      let lastBaselineAt = 0;
      let lastSnapshot = null;
      let wasBottomReached = false;
      let lastStickyActive = null;
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

      function sidebarSnapshot(source = 'scroll') {
        const root = doc.documentElement;
        const body = doc.body;
        const scrolling = doc.scrollingElement || root;
        const controlPanel = elements.controlPanel;
        if (!root || !body || !controlPanel) return null;
        const now = Date.now();
        const scrollY = Number(win.scrollY || scrolling?.scrollTop || 0);
        const clientHeight = Number(root.clientHeight || win.innerHeight || 0);
        const docScrollHeight = Number(root.scrollHeight || 0);
        const bodyScrollHeight = Number(body.scrollHeight || 0);
        const scrollHeight = Math.max(docScrollHeight, bodyScrollHeight);
        const maxScrollY = Math.max(0, scrollHeight - clientHeight);
        const distanceToBottom = Math.max(0, maxScrollY - scrollY);
        const panelRect = controlPanel.getBoundingClientRect();
        const headerRect = elements.appHeader?.getBoundingClientRect?.() || null;
        const shellRect = doc.querySelector('.app-shell')?.getBoundingClientRect?.() || null;
        const contentRect = doc.querySelector('.content-column')?.getBoundingClientRect?.() || null;
        const styles = win.getComputedStyle(controlPanel);
        const rootStyles = win.getComputedStyle(root);
        const stickyTopRaw = rootStyles.getPropertyValue('--app-content-sticky-top').trim();
        const stickyTop = Number.parseFloat(stickyTopRaw);
        const stickyActive = Number.isFinite(stickyTop) && scrollY > 0 && Math.abs(panelRect.top - stickyTop) <= 1.25;
        const previous = lastSnapshot;
        return {
          source,
          activeTab: getCurrentView() === 'trash' ? 'trash' : 'inventory',
          viewMode: getViewMode(),
          timestamp: new Date(now).toISOString(),
          sampleDeltaMs: previous ? now - Number(previous.sampleAt || now) : null,
          sampleAt: now,
          scrollY,
          innerHeight: Number(win.innerHeight || 0), clientHeight,
          documentScrollHeight: docScrollHeight, bodyScrollHeight, scrollHeight, maxScrollY, distanceToBottom,
          scrollDirection: lastWheelDeltaY > 0 ? 'down' : lastWheelDeltaY < 0 ? 'up' : 'unknown',
          lastDeltaY: lastWheelDeltaY,
          controlPanel: { top: panelRect.top, bottom: panelRect.bottom, height: panelRect.height, left: panelRect.left, width: panelRect.width },
          computed: { position: styles.position, top: styles.top, transform: styles.transform, marginTop: styles.marginTop, paddingTop: styles.paddingTop, overflowAnchor: styles.overflowAnchor },
          cssVars: { appContentStickyTop: stickyTopRaw, appHeaderHeight: rootStyles.getPropertyValue('--app-header-height').trim(), appShellTopGap: rootStyles.getPropertyValue('--app-shell-top-gap').trim() },
          appHeaderBottom: headerRect?.bottom ?? null, appHeaderHeight: headerRect?.height ?? null,
          appShell: shellRect ? { top:shellRect.top, bottom:shellRect.bottom, height:shellRect.height } : null,
          contentColumn: contentRect ? { top:contentRect.top, bottom:contentRect.bottom, height:contentRect.height } : null,
          stickyActive,
          visualViewport: win.visualViewport ? { height: win.visualViewport.height, offsetTop: win.visualViewport.offsetTop, pageTop: win.visualViewport.pageTop, scale: win.visualViewport.scale } : null,
          scrollbarWidth: Math.max(0, Number(win.innerWidth || 0) - Number(root.clientWidth || 0))
        };
      }

      function recordSidebarDiagnostics(source = 'scroll') {
        const now = Date.now();
        const root = doc.documentElement;
        const body = doc.body;
        const scrolling = doc.scrollingElement || root;
        const controlPanel = elements.controlPanel;
        if (!root || !body || !controlPanel) return;
        const scrollY = Number(win.scrollY || scrolling?.scrollTop || 0);
        const clientHeight = Number(root.clientHeight || win.innerHeight || 0);
        const scrollHeight = Math.max(Number(root.scrollHeight || 0), Number(body.scrollHeight || 0));
        const distanceToBottom = Math.max(0, Math.max(0, scrollHeight - clientHeight) - scrollY);
        const nearBottom = distanceToBottom <= 250;
        const baselineDue = now - lastBaselineAt >= 1500;
        if (!nearBottom && !baselineDue && source !== 'startup' && source !== 'resize') return;
        const snapshot = sidebarSnapshot(source);
        if (!snapshot) return;
        const previous = lastSnapshot;
        const topChanged = previous && Math.abs(Number(previous.controlPanel?.top) - Number(snapshot.controlPanel?.top)) >= 0.5;
        const geometryChanged = previous && (topChanged || Math.abs(Number(previous.controlPanel?.height) - Number(snapshot.controlPanel?.height)) >= 0.5 || Math.abs(Number(previous.scrollHeight) - Number(snapshot.scrollHeight)) >= 1 || Math.abs(Number(previous.appHeaderBottom) - Number(snapshot.appHeaderBottom)) >= 0.5 || Math.abs(Number(previous.scrollbarWidth) - Number(snapshot.scrollbarWidth)) >= 1);
        const reachedBottom = snapshot.distanceToBottom <= 2;
        if (nearBottom && (now - lastSampleAt >= 180 || (reachedBottom && !wasBottomReached) || geometryChanged)) {
          lastSampleAt = now; void logEvent('UI_SIDEBAR_SCROLL_SAMPLE', snapshot);
        } else if (!nearBottom && now - lastBaselineAt >= 1500) {
          lastBaselineAt = now; void logEvent('UI_SIDEBAR_SCROLL_SAMPLE', { ...snapshot, baseline: true });
        }
        if (geometryChanged) void logEvent('UI_SIDEBAR_GEOMETRY_CHANGED', { before: previous, after: snapshot });
        if (lastStickyActive !== null && lastStickyActive !== snapshot.stickyActive) void logEvent('UI_SIDEBAR_STICKY_STATE_CHANGED', { before: lastStickyActive, after: snapshot.stickyActive, snapshot });
        lastStickyActive = snapshot.stickyActive;
        if (reachedBottom && !wasBottomReached) void logEvent('UI_SIDEBAR_BOTTOM_REACHED', { before: previous, after: snapshot });
        wasBottomReached = reachedBottom;
        if (nearBottom && topChanged) {
          recentTopChanges.push({ at: now, top: snapshot.controlPanel.top, distanceToBottom: snapshot.distanceToBottom });
          recentTopChanges = recentTopChanges.filter(item => now - item.at <= 1200);
          if (recentTopChanges.length >= 4) {
            void logEvent('UI_SIDEBAR_BOTTOM_OSCILLATION_DETECTED', { activeTab: snapshot.activeTab, viewMode: snapshot.viewMode, changes: recentTopChanges.slice(-8), snapshot }, 'info');
            recentTopChanges = [];
          }
        }
        lastSnapshot = snapshot;
      }

      function noteWheel(deltaY) { lastWheelDeltaY = Number(deltaY || 0); }

      return Object.freeze({ shellTopGap: stickyShellTopGap, headerThreshold: stickyHeaderThreshold, syncPinnedHeaderGeometry, setPinned: setStickyHeaderPinned, syncStickyHeaders: syncListStickyHeaders, scheduleStickyHeaderSync: scheduleListStickyHeaderSync, recordSidebarDiagnostics, noteWheel });
    }
  });
  globalThis.KRDeps?.register?.('KRAppLayoutController', API);
})();
