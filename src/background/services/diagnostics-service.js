(() => {
  'use strict';

  const API = Object.freeze({
    create(options = {}) {
      const storageLocal = options.storageLocal;
      if (!storageLocal?.get || !storageLocal?.set) throw new Error('KRDiagnosticsService requires storageLocal');
      const randomUUID = typeof options.randomUUID === 'function'
        ? options.randomUUID
        : () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const correlationContext = typeof options.correlationContext === 'function' ? options.correlationContext : () => ({});
      const getResetBlocker = typeof options.getResetBlocker === 'function' ? options.getResetBlocker : async () => '';
      const config = {
        maxDiagnostics: Math.max(1, Number(options.maxDiagnostics || 2500)),
        diagnosticsKey: String(options.diagnosticsKey || 'diagnosticsV2'),
        retentionMs: Math.max(1, Number(options.retentionMs || 14 * 24 * 60 * 60 * 1000)),
        galleryKey: String(options.galleryKey || 'galleryDiagnosticsV1'),
        boundaryKey: String(options.boundaryKey || 'diagnosticBoundaryV1'),
        galleryRetentionMs: Math.max(1, Number(options.galleryRetentionMs || 24 * 60 * 60 * 1000)),
        maxGalleryDiagnostics: Math.max(1, Number(options.maxGalleryDiagnostics || 8)),
        batchFlushMs: Math.max(1, Number(options.batchFlushMs || 1200)),
        batchMaxPending: Math.max(1, Number(options.batchMaxPending || 120))
      };

      let sessionId = randomUUID();
      let writeChain = Promise.resolve();
      let pendingEntries = [];
      let flushTimer = null;
      let storedCache = null;

      function redactUrl(raw) {
        try {
          const url = new URL(String(raw));
          if (!/^https?:$/.test(url.protocol)) return String(raw).slice(0, 1000);
          url.search = '';
          url.hash = '';
          return url.toString();
        } catch {
          return String(raw).slice(0, 1000);
        }
      }

      function redactEmbeddedSecrets(text) {
        let output = String(text || '');
        output = output.replace(/https?:\/\/[^\s\"'<>]+/gi, match => redactUrl(match));
        output = output.replace(/\b(csrf|token|access[_-]?token|refresh[_-]?token|session[_-]?token|tracking[_-]?token|authorization|bearer|password|secret)=([^\s&;,]+)/gi, '$1=[REDACTED]');
        return output;
      }

      function sanitize(value, key = '', depth = 0) {
        if (depth > 6) return '[MAX_DEPTH]';
        const normalizedKey = String(key || '').toLocaleLowerCase('en-US');
        if (/csrf|cookie|password|authorization|bearer|sessiontoken|trackingtoken|accesstoken|refreshtoken|secret/.test(normalizedKey)) return '[REDACTED]';
        if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          if (/profilename|displayname/.test(normalizedKey)) return `[REDACTED_PROFILE length=${value.length}]`;
          if (/description|contact|email|phone|street|addressline/.test(normalizedKey)) return `[REDACTED_TEXT length=${value.length}]`;
          if (/url|href|source/i.test(normalizedKey) || /^https?:\/\//i.test(value)) return redactUrl(value);
          return redactEmbeddedSecrets(value).slice(0, 1000);
        }
        if (Array.isArray(value)) return value.slice(0, 100).map(item => sanitize(item, key, depth + 1));
        if (typeof value === 'object') {
          const out = {};
          for (const [childKey, childValue] of Object.entries(value).slice(0, 100)) out[childKey] = sanitize(childValue, childKey, depth + 1);
          return out;
        }
        return String(value).slice(0, 300);
      }

      function aggregationRule(event, details = {}, meta = {}) {
        const name = String(event || '');
        if (name === 'INVENTORY_LIVE_REFRESH_APPLIED') {
          const reason = String(details?.reason || 'changed');
          const progressOnly = details?.progressOnly === true ? '1' : '0';
          const correlation = correlationContext(details, meta?.context || {});
          const scopeId = correlation.operationId || correlation.bulkRunId || correlation.runId || correlation.fillId || correlation.renewalId || '';
          return { windowMs: 30 * 1000, key: `${name}|${scopeId}|${reason}|${progressOnly}` };
        }
        if (name === 'PROFILE_RECOGNIZED') {
          const profileId = String(details?.profileId || meta?.context?.profileId || '');
          const unprofiledCount = Number(details?.unprofiledCount || 0);
          return { windowMs: 60 * 1000, key: `${name}|${profileId}|${unprofiledCount}` };
        }
        return null;
      }

      function aggregationKeyForStoredEvent(item) {
        return aggregationRule(item?.event, item?.details || {}, { context: item?.context || {} })?.key || null;
      }

      function representedEventCount(events) {
        return (Array.isArray(events) ? events : []).reduce((sum, event) => sum + Math.max(1, Number(event?.occurrences || 1)), 0);
      }

      function requiresImmediateFlush(level, event) {
        const severity = String(level || 'info').toLowerCase();
        if (severity === 'warning' || severity === 'error') return true;
        const name = String(event || '').toUpperCase();
        return /(?:SAFETY|INVARIANT|RECOVERY|GONE|DISCARDED|PUBLISHED|DELETE_VERIFIED|SOURCE_DELETE|REPLACED|COMPLETED|STOPPED|TERMINAL)/.test(name);
      }

      function createEntry(level, event, details = {}, meta = {}, now = new Date()) {
        const timestamp = now.toISOString();
        const eventName = String(event || 'UNKNOWN_EVENT').slice(0, 120);
        const sanitizedDetails = sanitize(details || {});
        const rawContext = sanitize(meta.context || {});
        const sanitizedContext = sanitize({ ...rawContext, ...correlationContext(sanitizedDetails, rawContext) });
        return {
          timestamp,
          time: timestamp,
          sessionId,
          severity: String(level || 'info'),
          level: String(level || 'info'),
          event: eventName,
          module: String(meta.module || 'background').slice(0, 80),
          operation: String(meta.operation || '').slice(0, 120),
          context: sanitizedContext,
          details: sanitizedDetails
        };
      }

      function appendEntry(retained, entry) {
        const eventName = String(entry?.event || 'UNKNOWN_EVENT');
        const aggregation = String(entry?.level || 'info') === 'info'
          ? aggregationRule(eventName, entry?.details || {}, { context: entry?.context || {} })
          : null;
        let aggregateIndex = -1;
        if (aggregation) {
          const nowMs = Date.parse(entry?.timestamp || entry?.time || '') || Date.now();
          for (let index = retained.length - 1; index >= 0; index -= 1) {
            const candidate = retained[index];
            if (String(candidate?.sessionId || '') !== sessionId) continue;
            if (String(candidate?.event || '') !== eventName) continue;
            if (aggregationKeyForStoredEvent(candidate) !== aggregation.key) continue;
            const candidateTime = Date.parse(candidate?.lastTimestamp || candidate?.timestamp || candidate?.time || '');
            if (!Number.isFinite(candidateTime) || nowMs - candidateTime > aggregation.windowMs) break;
            aggregateIndex = index;
            break;
          }
        }
        if (aggregateIndex >= 0) {
          const prior = retained.splice(aggregateIndex, 1)[0];
          const previous = retained.length ? retained[retained.length - 1] : null;
          retained.push({
            ...prior,
            ...entry,
            previousEvent: previous ? { timestamp: previous.timestamp || previous.time || null, event: previous.event || null, module: previous.module || null, operation: previous.operation || null } : null,
            occurrences: Math.max(1, Number(prior?.occurrences || 1)) + 1,
            firstTimestamp: prior?.firstTimestamp || prior?.timestamp || prior?.time || entry.timestamp,
            lastTimestamp: entry.timestamp
          });
        } else {
          const previous = retained.length ? retained[retained.length - 1] : null;
          retained.push({
            ...entry,
            previousEvent: previous ? { timestamp: previous.timestamp || previous.time || null, event: previous.event || null, module: previous.module || null, operation: previous.operation || null } : null
          });
        }
      }

      async function loadStoredCache() {
        if (Array.isArray(storedCache)) return storedCache;
        const stored = await storageLocal.get(config.diagnosticsKey);
        storedCache = Array.isArray(stored[config.diagnosticsKey]) ? stored[config.diagnosticsKey] : [];
        return storedCache;
      }

      function scheduleFlush() {
        if (flushTimer || !pendingEntries.length) return;
        if (typeof setTimeout !== 'function') { void flush().catch(() => {}); return; }
        flushTimer = setTimeout(() => {
          flushTimer = null;
          void flush().catch(() => {});
        }, config.batchFlushMs);
      }

      function flush() {
        if (flushTimer) {
          if (typeof clearTimeout === 'function') clearTimeout(flushTimer);
          flushTimer = null;
        }
        if (!pendingEntries.length) return writeChain;
        const pending = pendingEntries.splice(0, pendingEntries.length);
        const task = async () => {
          const now = new Date();
          const existing = await loadStoredCache();
          const cutoff = now.getTime() - config.retentionMs;
          const retained = existing.filter(item => {
            const time = Date.parse(item?.timestamp || item?.time || '');
            return !Number.isFinite(time) || time >= cutoff;
          });
          for (const entry of pending) appendEntry(retained, entry);
          const next = retained.slice(-config.maxDiagnostics);
          await storageLocal.set({ [config.diagnosticsKey]: next });
          storedCache = next;
        };
        writeChain = writeChain.then(task, task);
        return writeChain;
      }

      function log(level, event, details = {}, meta = {}) {
        pendingEntries.push(createEntry(level, event, details, meta));
        if (requiresImmediateFlush(level, event) || pendingEntries.length >= config.batchMaxPending) return flush();
        scheduleFlush();
        return Promise.resolve();
      }

      async function read() {
        await flush().catch(() => {});
        const current = await loadStoredCache();
        if (current.length) return current;
        const stored = await storageLocal.get('diagnostics');
        return Array.isArray(stored.diagnostics) ? stored.diagnostics.map(entry => ({
          timestamp: entry.time || new Date().toISOString(),
          time: entry.time || new Date().toISOString(),
          severity: entry.level || 'info',
          level: entry.level || 'info',
          event: entry.event || 'LEGACY_EVENT',
          module: 'legacy',
          operation: '',
          details: sanitize(entry.details || {})
        })) : [];
      }

      async function storeGallery(message, sender) {
        const now = new Date();
        const cutoff = now.getTime() - config.galleryRetentionMs;
        const stored = await storageLocal.get(config.galleryKey);
        const previous = Array.isArray(stored[config.galleryKey]) ? stored[config.galleryKey] : [];
        const retained = previous.filter(item => {
          const parsed = Date.parse(item?.capturedAt || '');
          return Number.isFinite(parsed) && parsed >= cutoff;
        });
        const capture = sanitize({
          capturedAt: now.toISOString(),
          sessionId,
          reason: String(message?.reason || 'gallery-extraction-failed').slice(0, 120),
          senderTabId: sender?.tab?.id ?? null,
          pageUrl: message?.pageUrl || sender?.tab?.url || null,
          diagnostics: message?.diagnostics || null
        });
        retained.push(capture);
        const next = retained.slice(-config.maxGalleryDiagnostics);
        await storageLocal.set({ [config.galleryKey]: next });
        await log('error', 'IMAGE_GALLERY_DIAGNOSTIC_CAPTURED', {
          reason: capture.reason || null,
          strategy: capture.diagnostics?.strategy || null,
          pageCandidateCount: capture.diagnostics?.pageCandidateCount || 0,
          rawDomSourceCount: capture.diagnostics?.rawDomSourceCount || 0,
          captureCountRetained: next.length
        }, { module: 'background', operation: 'gallery-diagnostics', context: { senderTabId: sender?.tab?.id ?? null } });
        return { stored: true, retained: next.length };
      }

      async function readRecentGallery() {
        const stored = await storageLocal.get(config.galleryKey);
        const entries = Array.isArray(stored[config.galleryKey]) ? stored[config.galleryKey] : [];
        const cutoff = Date.now() - config.galleryRetentionMs;
        return entries.filter(item => {
          const parsed = Date.parse(item?.capturedAt || '');
          return Number.isFinite(parsed) && parsed >= cutoff;
        }).slice(-config.maxGalleryDiagnostics).map(item => sanitize(item));
      }

      async function reset() {
        const blocker = await getResetBlocker();
        if (blocker) {
          const error = new Error(blocker);
          error.code = 'KR_DIAGNOSTIC_RESET_BUSY';
          throw error;
        }
        await flush();
        if (flushTimer) {
          if (typeof clearTimeout === 'function') clearTimeout(flushTimer);
          flushTimer = null;
        }
        pendingEntries = [];
        const now = new Date();
        const diagnosticBoundaryId = randomUUID();
        const diagnosticBoundaryStartedAt = now.toISOString();
        sessionId = diagnosticBoundaryId;
        await storageLocal.set({
          [config.diagnosticsKey]: [],
          diagnostics: [],
          [config.galleryKey]: [],
          [config.boundaryKey]: { diagnosticBoundaryId, diagnosticBoundaryStartedAt }
        });
        storedCache = [];
        await log('info', 'DIAGNOSTIC_SESSION_RESET', { diagnosticBoundaryId, diagnosticBoundaryStartedAt }, { module: 'background', operation: 'diagnostic-reset' });
        await flush();
        return { reset: true, diagnosticBoundaryId, diagnosticBoundaryStartedAt };
      }

      function state() {
        return Object.freeze({
          sessionId,
          pendingCount: pendingEntries.length,
          hasScheduledFlush: Boolean(flushTimer),
          cachedCount: Array.isArray(storedCache) ? storedCache.length : null
        });
      }

      return Object.freeze({
        sessionId: () => sessionId,
        state,
        redactUrl,
        sanitize,
        representedEventCount,
        read,
        flush,
        log,
        storeGallery,
        readRecentGallery,
        reset
      });
    }
  });
  globalThis.KRDeps?.register?.('KRDiagnosticsService', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
