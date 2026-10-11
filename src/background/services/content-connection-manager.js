(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const tabRegistry = options.tabRegistry;
      const chromeTabs = options.chromeTabs;
      const chromeScripting = options.chromeScripting;
      const chrome = { scripting: chromeScripting };
      const waits = Array.isArray(options.bootstrapWaitsMs) ? options.bootstrapWaitsMs : [80, 140, 240, 400, 650];
      const navigationWaitMs = Number(options.navigationWaitMs || 30000);
      const contentScriptFiles = Array.isArray(options.contentScriptFiles) ? options.contentScriptFiles : [];
      const delay = typeof options.delay === 'function' ? options.delay : ms => new Promise(resolve => setTimeout(resolve, ms));
      const log = typeof options.logDiagnostic === 'function' ? options.logDiagnostic : async () => {};
      const sendTabRequest = options.sendTabRequest;
      if (!tabRegistry || !chromeTabs || !chromeScripting?.executeScript || typeof sendTabRequest !== 'function') throw new Error('KRContentConnectionManager dependencies missing');

      function isExpectedControlledTabCloseReason(reason) {
        const value = String(reason || '');
        return /^(?:renewal-target-(?:published|completed)|renewal-draft-discarded|renewal-phase1-retry|renewal-resume-cleanup|managed-worker-closed|bulk-worker-(?:replaced|saved|closed)|bulk-retry-worker-(?:finished|failed)|inventory-refresh-worker-(?:finished|failed)|bulk-run-failed|bulk-source-gone-cleanup|bulk-auto-source-(?:stale|prepare-failed|preflight-failed|finished|failed|terminal)|workflow-close)$/.test(value);
      }
      async function expectedControlledTabCloseEntry(tabId) {
        const id = Number(tabId || 0);
        if (!id) return null;
        const entry = await tabRegistry.get(id).catch(() => null);
        if (!entry) return null;
        const goneReason = entry.lifecycleState === options.goneState ? String(entry.goneReason || '') : '';
        const closeIntentAt = Date.parse(String(entry.closeIntentAt || ''));
        const age = Number.isFinite(closeIntentAt) ? Math.max(0, Date.now() - closeIntentAt) : Number.POSITIVE_INFINITY;
        const closeIntentReason = age <= Number(options.expectedCloseIntentMaxAgeMs || 10000) ? String(entry.closeIntentReason || '') : '';
        const expectedReason = isExpectedControlledTabCloseReason(goneReason) ? goneReason : (isExpectedControlledTabCloseReason(closeIntentReason) ? closeIntentReason : '');
        if (!expectedReason) return null;
        const owner = entry.owner && typeof entry.owner === 'object' ? entry.owner : {};
        const correlated = entry.managed === true || Object.values(owner).some(value => String(value || '').trim());
        return correlated ? { ...entry, expectedCloseReason: expectedReason } : null;
      }
      function expectedControlledTabCloseError(tabId, entry) {
        const id = Number(tabId || 0) || null;
        const reason = String(entry?.expectedCloseReason || entry?.goneReason || entry?.closeIntentReason || 'workflow-close');
        const error = new Error(`KR_TAB_EXPECTED_CLOSED: Kleinanzeigen-Tab ${id || ''} wurde vom Workflow planmäßig geschlossen.`.trim());
        error.code = 'KR_TAB_EXPECTED_CLOSED'; error.tabId = id; error.goneReason = reason; return error;
      }
      async function getContentConnectionTabOrThrow(tabId) {
        try { return await tabRegistry.getTabOrThrow(tabId, chromeTabs, { label: 'Kleinanzeigen-Tab' }); }
        catch (error) {
          if (options.isGoneError?.(error)) {
            const entry = await expectedControlledTabCloseEntry(tabId);
            if (entry) throw expectedControlledTabCloseError(tabId, entry);
          }
          throw error;
        }
      }
      function kleinanzeigenTabMeta(tab) {
        let path = ''; try { path = new URL(tab?.url || '').pathname; } catch { path = ''; }
        return { tabId: tab?.id ?? null, path, status: tab?.status || null, discarded: Boolean(tab?.discarded), windowId: tab?.windowId ?? null };
      }
      function validKleinanzeigenTab(tab) {
        try { const url = new URL(tab?.url || ''); return url.protocol === 'https:' && /(^|\.)kleinanzeigen\.de$/i.test(url.hostname); } catch { return false; }
      }
      function contentBootstrapNeedsNavigationWait(tab) { return String(tab?.status || '') === 'loading'; }
      async function waitForContentBootstrapNavigation(tabId, initialTab = null) {
        const started = Date.now(); let tab = initialTab;
        while (Date.now() - started < navigationWaitMs) {
          tab = await getContentConnectionTabOrThrow(tabId);
          if (!contentBootstrapNeedsNavigationWait(tab)) return tab;
          await delay(150);
        }
        const error = new Error('Content Script wartet auf den Abschluss der laufenden Navigation.'); error.code = 'KR_CONTENT_NAVIGATION_PENDING'; throw error;
      }
      async function rethrowExpectedContentBootstrapCloseIfNeeded(tabId, started, phase) {
        const entry = await expectedControlledTabCloseEntry(tabId); if (!entry) return false;
        const goneReason = String(entry.expectedCloseReason || entry.goneReason || entry.closeIntentReason || 'workflow-close');
        await log('info', 'CONTENT_SCRIPT_BOOTSTRAP_EXPECTED_TAB_CLOSE', { tabId, phase: String(phase || 'bootstrap'), durationMs: Math.max(0, Date.now() - Number(started || Date.now())), goneReason, role: entry.role || null }, { module: 'background', operation: 'content-bootstrap', context: { tabId, ...(entry.owner || {}) } }).catch(() => {});
        throw expectedControlledTabCloseError(tabId, entry);
      }
      async function inspectReady(tabId, tab, started, meta = {}) {
        const ready = await sendTabRequest(tabId, { type: 'KR_CONTENT_READY' });
        if (ready?.platformAccessRestriction?.restricted) {
          await options.activatePlatformAccessRestriction?.({ evidence: ready.platformAccessRestriction }, { tab });
          throw options.platformAccessRestrictionError?.(await options.readPlatformAccessRestriction?.()) || new Error('Plattformzugriff eingeschränkt.');
        }
        const modules = ready?.modules || {};
        if (ready?.ready && modules.images && modules.form && modules.templateFill && modules.inventoryRun) {
          const durationMs = Date.now() - started;
          await log('info', 'CONTENT_CONNECTION_READY', { ...kleinanzeigenTabMeta(tab), ...meta, durationMs, modules }, { module: 'background', operation: 'content-bootstrap', context: { tabId } }).catch(() => {});
          return { ...ready, ...meta, tab: kleinanzeigenTabMeta(tab), durationMs };
        }
        return null;
      }
      async function ensureContentConnection(message) {
        const tabId = Number(message?.tabId);
        await options.assertPlatformAccessAllowed?.({ operation: 'content-bootstrap', requestType: 'ENSURE_CONTENT_CONNECTION', context: { tabId: tabId || null } });
        if (!tabId) throw new Error('Kleinanzeigen-Tab-ID fehlt.');
        let tab = await getContentConnectionTabOrThrow(tabId);
        if (!validKleinanzeigenTab(tab)) throw new Error('Der Zieltab ist keine unterstützte Kleinanzeigen-Seite.');
        const started = Date.now();
        try { const connected = await inspectReady(tabId, tab, started, { bootstrapped: false }); if (connected) return connected; } catch { /* receiver missing or platform callback handled below via retry path */ }

        tab = await getContentConnectionTabOrThrow(tabId);
        if (contentBootstrapNeedsNavigationWait(tab)) {
          await log('info', 'CONTENT_SCRIPT_BOOTSTRAP_DEFERRED_LOADING', { ...kleinanzeigenTabMeta(tab), maxWaitMs: navigationWaitMs }, { module: 'background', operation: 'content-bootstrap', context: { tabId } }).catch(() => {});
          try { tab = await waitForContentBootstrapNavigation(tabId, tab); }
          catch (error) {
            if (error?.code === 'KR_TAB_EXPECTED_CLOSED') {
              const entry = await expectedControlledTabCloseEntry(tabId);
              await log('info', 'CONTENT_SCRIPT_BOOTSTRAP_EXPECTED_TAB_CLOSE', { tabId, durationMs: Date.now() - started, goneReason: entry?.goneReason || error?.goneReason || null, role: entry?.role || null }, { module: 'background', operation: 'content-bootstrap', context: { tabId, ...(entry?.owner || {}) } }).catch(() => {}); throw error;
            }
            if (options.isGoneError?.(error)) { await log('warning', 'CONTENT_SCRIPT_BOOTSTRAP_TAB_GONE', { tabId, durationMs: Date.now() - started }, { module: 'background', operation: 'content-bootstrap', context: { tabId } }).catch(() => {}); throw error; }
            await log('warning', 'CONTENT_SCRIPT_BOOTSTRAP_NAVIGATION_TIMEOUT', { ...kleinanzeigenTabMeta(await chromeTabs.get(tabId).catch(() => tab)), durationMs: Date.now() - started, maxWaitMs: navigationWaitMs }, { module: 'background', operation: 'content-bootstrap', context: { tabId } }).catch(() => {}); throw error;
          }
          try { const connected = await inspectReady(tabId, tab, started, { bootstrapped: false, navigationDeferred: true }); if (connected) return connected; } catch { /* inject below */ }
        }

        await log('info', 'CONTENT_SCRIPT_BOOTSTRAP_STARTED', { ...kleinanzeigenTabMeta(tab) }, { module: 'background', operation: 'content-bootstrap', context: { tabId } }).catch(() => {});
        try { await chrome.scripting.executeScript({ target: { tabId }, files: contentScriptFiles }); }
        catch (error) {
          await rethrowExpectedContentBootstrapCloseIfNeeded(tabId, started, 'inject');
          const latestTab = await chromeTabs.get(tabId).catch(() => tab);
          if (contentBootstrapNeedsNavigationWait(latestTab)) {
            await log('info', 'CONTENT_SCRIPT_BOOTSTRAP_DEFERRED_LOADING', { ...kleinanzeigenTabMeta(latestTab), phase: 'inject-race' }, { module: 'background', operation: 'content-bootstrap', context: { tabId } }).catch(() => {});
            const pending = new Error('Content Script wartet auf eine neu gestartete Navigation.'); pending.code = 'KR_CONTENT_NAVIGATION_PENDING'; throw pending;
          }
          await log('error', 'CONTENT_SCRIPT_BOOTSTRAP_FAILED', { ...kleinanzeigenTabMeta(latestTab), phase: 'inject', message: String(error.message || error).slice(0, 500) }, { module: 'background', operation: 'content-bootstrap', context: { tabId } }).catch(() => {});
          throw new Error(`Content Script konnte nicht verbunden werden: ${error.message}`);
        }
        let lastError = null;
        for (let attempt = 0; attempt < waits.length; attempt += 1) {
          await delay(waits[attempt]);
          try {
            const connected = await inspectReady(tabId, await chromeTabs.get(tabId).catch(() => tab), started, { bootstrapped: true, attempt: attempt + 1 });
            if (connected) {
              await log('info', 'CONTENT_SCRIPT_BOOTSTRAP_SUCCEEDED', { ...connected.tab, attempt: attempt + 1, durationMs: connected.durationMs, modules: connected.modules || {} }, { module: 'background', operation: 'content-bootstrap', context: { tabId } }).catch(() => {});
              return connected;
            }
            lastError = new Error('Content Script meldet unvollständige Module.');
          } catch (error) { await rethrowExpectedContentBootstrapCloseIfNeeded(tabId, started, 'handshake'); lastError = error; }
        }
        await rethrowExpectedContentBootstrapCloseIfNeeded(tabId, started, 'handshake');
        await log('error', 'CONTENT_SCRIPT_BOOTSTRAP_FAILED', { ...kleinanzeigenTabMeta(await chromeTabs.get(tabId).catch(() => tab)), phase: 'handshake', durationMs: Date.now() - started, message: String(lastError?.message || lastError || 'Handshake fehlgeschlagen').slice(0, 500) }, { module: 'background', operation: 'content-bootstrap', context: { tabId } }).catch(() => {});
        throw new Error(`Content Script nicht verbunden: ${lastError?.message || 'Handshake fehlgeschlagen'}`);
      }

      return Object.freeze({ isExpectedControlledTabCloseReason, expectedControlledTabCloseEntry, expectedControlledTabCloseError, getContentConnectionTabOrThrow, kleinanzeigenTabMeta, validKleinanzeigenTab, contentBootstrapNeedsNavigationWait, waitForContentBootstrapNavigation, ensureContentConnection });
    }
  });
  globalThis.KRDeps?.register?.('KRContentConnectionManager', API);
})();
