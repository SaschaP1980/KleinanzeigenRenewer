(() => {
  'use strict';

  const REGISTRY_KEY = 'tabRegistryV1';
  const LEGACY_MANAGED_KEY = 'managedWorkerTabsV1';
  const DEFAULT_TOMBSTONE_MS = 30000;

  const ROLES = Object.freeze({
    USER: 'user',
    SOURCE: 'source',
    RENEWAL_TARGET: 'renewal-target',
    RENEWAL_WORKER: 'renewal-worker',
    BULK_SOURCE: 'bulk-source',
    BULK_WORKER: 'bulk-worker',
    ARCHIVE_TARGET: 'archive-target',
    TEMPLATE_TARGET: 'template-target',
    ARCHIVE_WORKER: 'archive-worker',
    WORKER: 'worker'
  });

  const STATES = Object.freeze({
    ACTIVE: 'active',
    DISCARDED: 'discarded',
    GONE: 'gone'
  });

  const OWNER_FIELDS = Object.freeze([
    'operationId', 'parentOperationId', 'renewalId', 'fillId', 'bulkRunId', 'runId',
    'massBatchId', 'archiveInsertionId', 'inventoryId', 'adId'
  ]);

  function text(value, max = 160) {
    return String(value ?? '').trim().slice(0, max);
  }

  function iso(now) {
    return new Date(now()).toISOString();
  }

  function roleForManagedKind(kind) {
    const value = text(kind, 80).toLowerCase();
    if (value.startsWith('renewal-')) return ROLES.RENEWAL_WORKER;
    if (value.startsWith('archive-')) return ROLES.ARCHIVE_WORKER;
    if (value.startsWith('bulk-')) return ROLES.BULK_WORKER;
    return ROLES.WORKER;
  }

  function roleForUrl(rawUrl) {
    try {
      const url = new URL(String(rawUrl || ''));
      if (url.protocol !== 'https:' || !/(^|\.)kleinanzeigen\.de$/i.test(url.hostname)) return ROLES.USER;
      if (url.pathname === '/m-meine-anzeigen.html') return ROLES.SOURCE;
      return ROLES.USER;
    } catch {
      return ROLES.USER;
    }
  }

  function ownerFrom(value = {}) {
    const owner = {};
    for (const field of OWNER_FIELDS) {
      const normalized = text(value?.[field], 180);
      if (normalized) owner[field] = normalized;
    }
    const ownerType = text(value?.ownerType, 80);
    const ownerId = text(value?.ownerId, 180);
    if (ownerType) owner.ownerType = ownerType;
    if (ownerId) owner.ownerId = ownerId;
    return owner;
  }

  function ownerMatches(actual = {}, expected = {}) {
    const wanted = ownerFrom(expected);
    const pairs = Object.entries(wanted);
    if (!pairs.length) return false;
    return pairs.every(([field, value]) => text(actual?.[field], field === 'ownerType' ? 80 : 180) === value);
  }

  function lifecycleError(code, message, tabId) {
    const error = new Error(message);
    error.code = code;
    error.tabId = Number(tabId || 0) || null;
    return error;
  }

  function isGoneError(error) {
    const message = String(error?.message || error || '');
    return error?.code === 'KR_TAB_GONE' || /KR_TAB_GONE|No tab with id|The tab was closed/i.test(message);
  }

  function isDiscardedError(error) {
    const message = String(error?.message || error || '');
    return error?.code === 'KR_TAB_DISCARDED' || /KR_TAB_DISCARDED|von Chrome verworfen|Chrome pausiert/i.test(message);
  }

  function create({ storageSession, now = () => Date.now(), tombstoneMs = DEFAULT_TOMBSTONE_MS } = {}) {
    if (!storageSession?.get || !storageSession?.set) throw new Error('TabRegistry benötigt chrome.storage.session.');

    async function readRaw() {
      const stored = await storageSession.get([REGISTRY_KEY, LEGACY_MANAGED_KEY]).catch(() => ({}));
      const registry = stored?.[REGISTRY_KEY] && typeof stored[REGISTRY_KEY] === 'object'
        ? { ...stored[REGISTRY_KEY] }
        : {};
      const legacy = stored?.[LEGACY_MANAGED_KEY] && typeof stored[LEGACY_MANAGED_KEY] === 'object'
        ? stored[LEGACY_MANAGED_KEY]
        : {};
      let migrated = false;
      for (const [key, value] of Object.entries(legacy)) {
        const id = Number(key || 0);
        if (!id || registry[key]) continue;
        const closedAt = text(value?.closedAt, 64) || null;
        registry[key] = {
          tabId: id,
          role: roleForManagedKind(value?.kind),
          kind: text(value?.kind, 80) || 'worker',
          managed: true,
          lifecycleState: closedAt ? STATES.GONE : STATES.ACTIVE,
          createdAt: text(value?.createdAt, 64) || iso(now),
          updatedAt: closedAt || iso(now),
          lastSeenAt: closedAt ? null : iso(now),
          discardedAt: null,
          closedAt,
          owner: {}
        };
        migrated = true;
      }
      if (migrated) await storageSession.set({ [REGISTRY_KEY]: registry }).catch(() => {});
      return registry;
    }

    async function writeRaw(registry) {
      await storageSession.set({ [REGISTRY_KEY]: registry }).catch(() => {});
    }

    async function prune(registry = null) {
      const entries = registry || await readRaw();
      const threshold = Number(tombstoneMs) || DEFAULT_TOMBSTONE_MS;
      const current = Number(now());
      let changed = false;
      for (const [key, entry] of Object.entries(entries)) {
        if (!Number(key || 0)) {
          delete entries[key];
          changed = true;
          continue;
        }
        if (entry?.lifecycleState !== STATES.GONE || !entry?.closedAt) continue;
        const closed = Date.parse(entry.closedAt);
        if (Number.isFinite(closed) && current - closed > threshold) {
          delete entries[key];
          changed = true;
        }
      }
      if (changed) await writeRaw(entries);
      return entries;
    }

    async function upsert(tabId, patch = {}) {
      const id = Number(tabId || 0);
      if (!id) return null;
      const registry = await readRaw();
      const key = String(id);
      const previous = registry[key] || {};
      const timestamp = iso(now);
      const nextOwner = { ...(previous.owner || {}), ...ownerFrom(patch.owner || patch) };
      const next = {
        ...previous,
        tabId: id,
        role: text(patch.role, 80) || previous.role || roleForUrl(patch.url || previous.url),
        kind: text(patch.kind, 80) || previous.kind || null,
        managed: Object.prototype.hasOwnProperty.call(patch, 'managed') ? Boolean(patch.managed) : Boolean(previous.managed),
        lifecycleState: text(patch.lifecycleState, 40) || previous.lifecycleState || STATES.ACTIVE,
        createdAt: previous.createdAt || text(patch.createdAt, 64) || timestamp,
        updatedAt: timestamp,
        lastSeenAt: Object.prototype.hasOwnProperty.call(patch, 'lastSeenAt') ? patch.lastSeenAt : (previous.lastSeenAt || timestamp),
        discardedAt: Object.prototype.hasOwnProperty.call(patch, 'discardedAt') ? patch.discardedAt : (previous.discardedAt || null),
        closedAt: Object.prototype.hasOwnProperty.call(patch, 'closedAt') ? patch.closedAt : (previous.closedAt || null),
        closeIntentReason: Object.prototype.hasOwnProperty.call(patch, 'closeIntentReason') ? patch.closeIntentReason : (previous.closeIntentReason || null),
        closeIntentAt: Object.prototype.hasOwnProperty.call(patch, 'closeIntentAt') ? patch.closeIntentAt : (previous.closeIntentAt || null),
        url: text(patch.url, 2000) || previous.url || null,
        windowId: patch.windowId !== null && patch.windowId !== undefined && Number.isInteger(Number(patch.windowId)) ? Number(patch.windowId) : (previous.windowId ?? null),
        owner: nextOwner
      };
      registry[key] = next;
      await writeRaw(registry);
      return next;
    }

    async function register(tabId, { role, kind = null, managed = false, owner = {}, url = null, windowId = null } = {}) {
      return upsert(tabId, {
        role: role || roleForUrl(url), kind, managed, owner, url, windowId,
        lifecycleState: STATES.ACTIVE, lastSeenAt: iso(now), discardedAt: null, closedAt: null,
        closeIntentReason: null, closeIntentAt: null
      });
    }

    async function registerManagedWorker(tabId, kind = 'worker', owner = {}) {
      return register(tabId, { role: roleForManagedKind(kind), kind, managed: true, owner });
    }

    async function observeTab(tab, { role = null, kind = null, managed = null, owner = {} } = {}) {
      const id = Number(tab?.id || 0);
      if (!id) return null;
      const registry = await readRaw();
      const previous = registry[String(id)] || null;
      const discarded = Boolean(tab?.discarded);
      return upsert(id, {
        role: role || previous?.role || roleForUrl(tab?.url),
        kind: kind || previous?.kind || null,
        managed: managed === null ? Boolean(previous?.managed) : Boolean(managed),
        owner,
        url: tab?.url || previous?.url || null,
        windowId: tab?.windowId ?? previous?.windowId ?? null,
        lifecycleState: discarded ? STATES.DISCARDED : STATES.ACTIVE,
        lastSeenAt: iso(now),
        discardedAt: discarded ? (previous?.discardedAt || iso(now)) : null,
        closedAt: null
      });
    }

    async function markDiscarded(tabId, discarded = true) {
      const id = Number(tabId || 0);
      if (!id) return null;
      const registry = await readRaw();
      const previous = registry[String(id)] || null;
      if (!previous) return null;
      return upsert(id, {
        lifecycleState: discarded ? STATES.DISCARDED : STATES.ACTIVE,
        lastSeenAt: iso(now),
        discardedAt: discarded ? (previous.discardedAt || iso(now)) : null,
        closedAt: null
      });
    }

    async function markClosing(tabId, reason = 'workflow-close') {
      const id = Number(tabId || 0);
      if (!id) return null;
      const registry = await readRaw();
      const key = String(id);
      const previous = registry[key];
      if (!previous) return null;
      if (previous.lifecycleState === STATES.GONE) return previous;
      const timestamp = iso(now);
      registry[key] = {
        ...previous,
        updatedAt: timestamp,
        closeIntentReason: text(reason, 120) || 'workflow-close',
        closeIntentAt: timestamp
      };
      await writeRaw(registry);
      return registry[key];
    }

    async function clearClosing(tabId) {
      const id = Number(tabId || 0);
      if (!id) return null;
      const registry = await readRaw();
      const key = String(id);
      const previous = registry[key];
      if (!previous || previous.lifecycleState === STATES.GONE) return previous || null;
      const timestamp = iso(now);
      registry[key] = { ...previous, updatedAt: timestamp, closeIntentReason: null, closeIntentAt: null };
      await writeRaw(registry);
      return registry[key];
    }

    async function markGone(tabId, reason = 'removed') {
      const id = Number(tabId || 0);
      if (!id) return null;
      const registry = await readRaw();
      const key = String(id);
      const previous = registry[key];
      if (!previous) return null;
      const closedAt = previous.closedAt || iso(now);
      const incomingReason = text(reason, 120) || 'removed';
      const genericGoneReason = /^(?:removed|tabs\.onRemoved|get-failed)$/i.test(incomingReason);
      const resolvedReason = text(previous.closeIntentReason, 120)
        || (previous.lifecycleState === STATES.GONE && previous.goneReason && genericGoneReason ? text(previous.goneReason, 120) : '')
        || incomingReason;
      registry[key] = {
        ...previous,
        lifecycleState: STATES.GONE,
        updatedAt: iso(now),
        closedAt,
        goneReason: resolvedReason,
        closeIntentReason: null,
        closeIntentAt: null
      };
      await writeRaw(registry);
      return registry[key];
    }

    async function releaseOwnership(tabId, expectedOwner = {}, { role = null, url = null, managed = null } = {}) {
      const id = Number(tabId || 0);
      if (!id) return { released: false, reason: 'invalid-tab-id', entry: null };
      const registry = await readRaw();
      const key = String(id);
      const previous = registry[key] || null;
      if (!previous) return { released: false, reason: 'missing', entry: null };
      if (previous.lifecycleState === STATES.GONE) {
        return { released: false, reason: 'gone-tombstone', entry: previous };
      }
      if (!ownerMatches(previous.owner || {}, expectedOwner)) {
        return { released: false, reason: 'owner-mismatch', entry: previous };
      }
      const timestamp = iso(now);
      const resolvedUrl = text(url, 2000) || previous.url || null;
      const next = {
        ...previous,
        role: text(role, 80) || roleForUrl(resolvedUrl),
        managed: managed === null ? Boolean(previous.managed) : Boolean(managed),
        updatedAt: timestamp,
        url: resolvedUrl,
        owner: {}
      };
      registry[key] = next;
      await writeRaw(registry);
      return { released: true, reason: 'released', entry: next };
    }

    async function get(tabId) {
      const registry = await prune();
      return registry[String(Number(tabId || 0))] || null;
    }

    async function snapshot() {
      const registry = await prune();
      return Object.values(registry).sort((a, b) => Number(a.tabId) - Number(b.tabId));
    }

    async function managedTabIds() {
      const entries = await snapshot();
      return entries.filter(entry => entry?.managed === true).map(entry => Number(entry.tabId)).filter(Boolean);
    }

    async function getTabOrThrow(tabId, tabsApi, { label = 'Kleinanzeigen-Tab', role = null, owner = {}, allowDiscarded = false } = {}) {
      const id = Number(tabId || 0);
      if (!id) throw lifecycleError('KR_TAB_GONE', `${label} ist nicht mehr vorhanden.`, tabId);
      const known = await get(id).catch(() => null);
      if (known?.lifecycleState === STATES.GONE) {
        throw lifecycleError('KR_TAB_GONE', `${label} ${id} ist nicht mehr vorhanden.`, id);
      }
      let tab = null;
      try {
        tab = await tabsApi.get(id);
      } catch (error) {
        if (isGoneError(error)) {
          await markGone(id, 'get-failed').catch(() => {});
          throw lifecycleError('KR_TAB_GONE', `${label} ${id} ist nicht mehr vorhanden.`, id);
        }
        throw error;
      }
      await observeTab(tab, { role, owner }).catch(() => {});
      if (tab?.discarded && !allowDiscarded) {
        throw lifecycleError('KR_TAB_DISCARDED', `${label} wurde von Chrome verworfen und muss zuerst aktiviert werden.`, id);
      }
      return tab;
    }

    async function closeTab(tabId, tabsApi, { label = 'Kleinanzeigen-Tab', reason = 'registry-close' } = {}) {
      const id = Number(tabId || 0);
      if (!id) return { closed: false, alreadyGone: true, entry: null };
      const known = await get(id).catch(() => null);
      if (known?.lifecycleState === STATES.GONE) {
        return { closed: false, alreadyGone: true, entry: known };
      }
      const closing = await markClosing(id, reason).catch(() => known);
      try {
        await tabsApi.remove(id);
      } catch (error) {
        if (!isGoneError(error)) {
          await clearClosing(id).catch(() => {});
          throw error;
        }
        const entry = await markGone(id, `${reason}-already-gone`).catch(() => closing || known);
        return { closed: false, alreadyGone: true, entry };
      }
      const entry = await markGone(id, reason).catch(() => closing || known);
      return { closed: true, alreadyGone: false, entry };
    }

    async function reloadTabOrThrow(tabId, tabsApi, { label = 'Kleinanzeigen-Tab', reloadProperties = undefined } = {}) {
      const id = Number(tabId || 0);
      const tab = await getTabOrThrow(id, tabsApi, { label, allowDiscarded: true });
      try {
        await tabsApi.reload(id, reloadProperties);
      } catch (error) {
        if (isGoneError(error)) {
          await markGone(id, 'reload-failed').catch(() => {});
          throw lifecycleError('KR_TAB_GONE', `${label} ${id} ist nicht mehr vorhanden.`, id);
        }
        throw error;
      }
      return tab;
    }

    return Object.freeze({
      ROLES, STATES,
      read: readRaw, snapshot, get, register, registerManagedWorker, observeTab,
      markGone, releaseOwnership, managedTabIds, getTabOrThrow,
      closeTab, reloadTabOrThrow
    });
  }

  const api = Object.freeze({
    DEFAULT_TOMBSTONE_MS, ROLES, STATES,
    roleForUrl, ownerMatches, isGoneError, isDiscardedError, create
  });

  globalThis.KRDeps?.register?.('KRTabRegistry', api);
  if (typeof module !== 'undefined' && module?.exports) module.exports = api;
})();
