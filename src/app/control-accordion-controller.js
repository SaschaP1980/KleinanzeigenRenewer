(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const accordions = Array.isArray(options.accordions) ? options.accordions.filter(Boolean) : [];
      const logEvent = typeof options.logEvent === 'function' ? options.logEvent : async () => {};
      const getStyle = typeof options.getComputedStyle === 'function' ? options.getComputedStyle : globalThis.getComputedStyle;
      const matchMedia = typeof options.matchMedia === 'function' ? options.matchMedia : globalThis.matchMedia;
      const motion = new WeakMap();
      const watchdogGraceMs = Number.isFinite(Number(options.watchdogGraceMs)) ? Number(options.watchdogGraceMs) : 700;

      function reducedMotion() {
        return Boolean(matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
      }

      function header(accordion) {
        return accordion?.querySelector?.(':scope > .control-accordion-summary, :scope > summary') || null;
      }

      function isControlled(accordion) {
        return accordion?.dataset?.accordionMode === 'controlled';
      }

      function readOpen(accordion) {
        if (!accordion) return false;
        if (isControlled(accordion)) return accordion.dataset.open === 'true';
        return Boolean(accordion.open);
      }

      function writeOpen(accordion, shouldOpen) {
        if (!accordion) return;
        const open = Boolean(shouldOpen);
        if (!isControlled(accordion)) {
          accordion.open = open;
          return;
        }
        accordion.dataset.open = open ? 'true' : 'false';
        const summary = header(accordion);
        const panel = accordion.querySelector?.(':scope > .control-accordion-panel') || null;
        summary?.setAttribute?.('aria-expanded', open ? 'true' : 'false');
        if (panel) panel.hidden = !open;
      }

      function clearWatchdog(state) {
        if (!state?.watchdogTimer) return;
        clearTimeout(state.watchdogTimer);
        state.watchdogTimer = null;
      }

      function rect(element) {
        const value = element?.getBoundingClientRect?.();
        if (!value) return null;
        return {
          left: Math.round(value.left * 100) / 100,
          top: Math.round(value.top * 100) / 100,
          right: Math.round(value.right * 100) / 100,
          bottom: Math.round(value.bottom * 100) / 100,
          width: Math.round(value.width * 100) / 100,
          height: Math.round(value.height * 100) / 100
        };
      }

      function effectiveOpen(accordion) {
        const state = accordion ? motion.get(accordion) : null;
        return state ? Boolean(state.shouldOpen) : readOpen(accordion);
      }

      function diagnosticSnapshot(accordion) {
        if (!accordion) return null;
        const summary = header(accordion);
        const panel = accordion.querySelector(':scope > .control-accordion-panel');
        const body = panel?.firstElementChild || null;
        const state = motion.get(accordion);
        const summaryStyle = summary && getStyle ? getStyle(summary) : null;
        const panelStyle = panel && getStyle ? getStyle(panel) : null;
        const animations = typeof panel?.getAnimations === 'function'
          ? panel.getAnimations().slice(0, 6).map(animation => ({
              playState: String(animation.playState || ''),
              pending: Boolean(animation.pending),
              currentTime: Number.isFinite(Number(animation.currentTime)) ? Math.round(Number(animation.currentTime)) : null
            }))
          : [];
        return {
          id: accordion.id || null,
          open: readOpen(accordion),
          effectiveOpen: effectiveOpen(accordion),
          isAnimating: accordion.classList.contains('is-animating'),
          rect: rect(accordion),
          summaryRect: rect(summary),
          panelRect: rect(panel),
          bodyRect: rect(body),
          panelScrollHeight: Number(panel?.scrollHeight || 0),
          panelClientHeight: Number(panel?.clientHeight || 0),
          panelInlineHeight: panel?.style?.height || null,
          panelInlineOpacity: panel?.style?.opacity || null,
          panelOverflow: panelStyle?.overflow || null,
          panelPointerEvents: panelStyle?.pointerEvents || null,
          summaryPointerEvents: summaryStyle?.pointerEvents || null,
          storedAnimation: state ? {
            requestedOpen: Boolean(state.shouldOpen),
            playState: String(state.animation?.playState || ''),
            ageMs: Math.max(0, Date.now() - Number(state.startedAt || Date.now())),
            durationMs: Number(state.duration || 0)
          } : null,
          webAnimations: animations
        };
      }

      function finalizeMotion(accordion, state, { source = 'finished', recoveryEvent = '' } = {}) {
        if (!accordion || motion.get(accordion) !== state) return false;
        const panel = accordion.querySelector(':scope > .control-accordion-panel');
        const before = recoveryEvent ? diagnosticSnapshot(accordion) : null;
        clearWatchdog(state);
        motion.delete(accordion);
        try { state.animation?.cancel?.(); } catch {}
        writeOpen(accordion, state.shouldOpen);
        panel?.style.removeProperty('height');
        panel?.style.removeProperty('opacity');
        accordion.classList.remove('is-animating');
        if (recoveryEvent) {
          void logEvent(recoveryEvent, {
            source,
            accordionId: accordion.id || null,
            requestedOpen: Boolean(state.shouldOpen),
            ageMs: Math.max(0, Date.now() - Number(state.startedAt || Date.now())),
            before,
            after: diagnosticSnapshot(accordion)
          }, 'warning');
        }
        return true;
      }

      function cancelMotionForRestart(accordion, panel) {
        const state = motion.get(accordion);
        if (!state) return null;
        const currentHeight = panel?.getBoundingClientRect?.().height;
        clearWatchdog(state);
        motion.delete(accordion);
        try { state.animation?.cancel?.(); } catch {}
        panel?.style.removeProperty('height');
        panel?.style.removeProperty('opacity');
        accordion.classList.remove('is-animating');
        return Number.isFinite(currentHeight) ? currentHeight : null;
      }

      function sanitize(source = 'sanity-check') {
        for (const accordion of accordions) {
          const panel = accordion.querySelector(':scope > .control-accordion-panel');
          const state = motion.get(accordion);
          const isAnimating = accordion.classList.contains('is-animating');
          const ageMs = state ? Math.max(0, Date.now() - Number(state.startedAt || Date.now())) : 0;
          const playState = String(state?.animation?.playState || '');
          const stateStale = Boolean(state && (
            playState === 'finished'
            || playState === 'idle'
            || ageMs > Number(state.duration || 0) + watchdogGraceMs
          ));
          const orphanedClass = Boolean(isAnimating && !state);
          const orphanedInlineStyle = Boolean(!state && panel && (panel.style.height || panel.style.opacity));
          if (stateStale) {
            finalizeMotion(accordion, state, { source, recoveryEvent: 'UI_ACTIONS_ACCORDION_STALE_STATE_RECOVERED' });
            continue;
          }
          if (!orphanedClass && !orphanedInlineStyle) continue;
          const before = diagnosticSnapshot(accordion);
          panel?.style.removeProperty('height');
          panel?.style.removeProperty('opacity');
          accordion.classList.remove('is-animating');
          void logEvent('UI_ACTIONS_ACCORDION_STALE_STATE_RECOVERED', {
            source,
            accordionId: accordion.id || null,
            reason: orphanedClass ? 'orphaned-is-animating-class' : 'orphaned-inline-style',
            before,
            after: diagnosticSnapshot(accordion)
          }, 'warning');
        }
      }

      function animate(accordion, shouldOpen) {
        if (!accordion) return Promise.resolve();
        const panel = accordion.querySelector(':scope > .control-accordion-panel');
        const interruptedHeight = panel ? cancelMotionForRestart(accordion, panel) : null;
        if (!panel || reducedMotion() || typeof panel.animate !== 'function') {
          writeOpen(accordion, shouldOpen);
          accordion.classList.remove('is-animating');
          panel?.style.removeProperty('height');
          panel?.style.removeProperty('opacity');
          return Promise.resolve();
        }
        accordion.classList.add('is-animating');
        const duration = shouldOpen ? 210 : 175;
        const easing = 'cubic-bezier(.2,.72,.2,1)';
        if (shouldOpen) writeOpen(accordion, true);
        const startHeight = Number.isFinite(interruptedHeight) ? interruptedHeight : (shouldOpen ? 0 : panel.getBoundingClientRect().height);
        const endHeight = shouldOpen ? panel.scrollHeight : 0;
        const animation = panel.animate([
          { height: `${startHeight}px`, opacity: shouldOpen ? 0.45 : 1 },
          { height: `${endHeight}px`, opacity: shouldOpen ? 1 : 0.45 }
        ], { duration, easing, fill: 'both' });
        const state = { animation, shouldOpen: Boolean(shouldOpen), startedAt: Date.now(), duration, watchdogTimer: null };
        motion.set(accordion, state);
        state.watchdogTimer = setTimeout(() => {
          finalizeMotion(accordion, state, { source: 'animation-watchdog', recoveryEvent: 'UI_ACTIONS_ACCORDION_WATCHDOG_RECOVERED' });
        }, duration + watchdogGraceMs);
        return Promise.resolve(animation.finished).catch(() => {}).then(() => finalizeMotion(accordion, state, { source: 'animation-finished' }));
      }

      async function setOpen(target, shouldOpen) {
        if (!target || effectiveOpen(target) === Boolean(shouldOpen)) return;
        if (shouldOpen) {
          const others = accordions.filter(item => item && item !== target && effectiveOpen(item));
          await Promise.all([animate(target, true), ...others.map(item => animate(item, false))]);
          return;
        }
        await animate(target, false);
      }

      function install() {
        for (const accordion of accordions) {
          const summary = header(accordion);
          summary?.addEventListener('click', event => {
            if (!isControlled(accordion)) event.preventDefault();
            const requestedOpen = !effectiveOpen(accordion);
            void logEvent('UI_ACTIONS_ACCORDION_TOGGLE_REQUESTED', {
              accordionId: accordion.id || null,
              requestedOpen,
              state: diagnosticSnapshot(accordion)
            });
            void setOpen(accordion, requestedOpen);
          });
        }
      }

      install();
      return Object.freeze({ reducedMotion, header, sanitize, diagnosticSnapshot });
    }
  });

  globalThis.KRDeps?.register('KRControlAccordionController', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
