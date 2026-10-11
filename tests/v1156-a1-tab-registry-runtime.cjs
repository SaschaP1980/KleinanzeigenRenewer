const assert = require('assert');
const path = require('path');

const root = process.env.KR_ROOT ? path.resolve(process.env.KR_ROOT) : path.resolve(__dirname, '..');
const api = require(path.join(root, 'tab-registry.js'));

function memoryStorage(seed = {}) {
  const data = JSON.parse(JSON.stringify(seed));
  return {
    data,
    async get(keys) {
      if (!Array.isArray(keys)) return { ...data };
      const out = {};
      for (const key of keys) if (Object.prototype.hasOwnProperty.call(data, key)) out[key] = data[key];
      return out;
    },
    async set(patch) { Object.assign(data, JSON.parse(JSON.stringify(patch))); }
  };
}

(async () => {
  let current = Date.parse('2026-09-16T08:00:00.000Z');
  const storage = memoryStorage({
    managedWorkerTabsV1: {
      '11': { kind: 'renewal-phase4-delete', createdAt: '2026-09-16T07:59:55.000Z', closedAt: null },
      '12': { kind: 'archive-import-presence', createdAt: '2026-09-16T07:59:50.000Z', closedAt: '2026-09-16T07:59:59.000Z' }
    }
  });
  const registry = api.create({ storageSession: storage, now: () => current, tombstoneMs: 30000 });

  // Legacy managed workers are migrated behind the new facade without changing tombstone behavior.
  const migrated = await registry.snapshot();
  const m11 = migrated.find(x => x.tabId === 11);
  const m12 = migrated.find(x => x.tabId === 12);
  assert.strictEqual(m11.role, api.ROLES.RENEWAL_WORKER);
  assert.strictEqual(m11.managed, true);
  assert.strictEqual(m11.lifecycleState, api.STATES.ACTIVE);
  assert.strictEqual(m12.role, api.ROLES.ARCHIVE_WORKER);
  assert.strictEqual(m12.lifecycleState, api.STATES.GONE);
  assert.deepStrictEqual((await registry.managedTabIds()).sort((a,b)=>a-b), [11,12]);

  // Existing user/source tabs can be shadow-classified without becoming managed workers.
  await registry.observeTab({ id: 21, url: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS', windowId: 3, discarded: false });
  const source = await registry.get(21);
  assert.strictEqual(source.role, api.ROLES.SOURCE);
  assert.strictEqual(source.managed, false);

  // Explicit workflow ownership survives observation/navigation updates.
  await registry.register(22, {
    role: api.ROLES.RENEWAL_TARGET,
    owner: { operationId: 'op-1', renewalId: 'ren-1', fillId: 'fill-1', ownerType: 'renewal', ownerId: 'ren-1' },
    url: 'about:blank'
  });
  await registry.observeTab({ id: 22, url: 'https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html', windowId: 3, discarded: false });
  const renewalTarget = await registry.get(22);
  assert.strictEqual(renewalTarget.role, api.ROLES.RENEWAL_TARGET);
  assert.strictEqual(renewalTarget.owner.renewalId, 'ren-1');
  assert.strictEqual(renewalTarget.owner.operationId, 'op-1');

  // Service-worker restart: a fresh facade instance reconstructs the persisted role/ownership
  // instead of creating a split or losing correlation.
  const restartedRegistry = api.create({ storageSession: storage, now: () => current, tombstoneMs: 30000 });
  const afterRestart = await restartedRegistry.get(22);
  assert.strictEqual(afterRestart.role, api.ROLES.RENEWAL_TARGET);
  assert.strictEqual(afterRestart.owner.renewalId, 'ren-1');
  assert.strictEqual(afterRestart.owner.operationId, 'op-1');
  assert.strictEqual(afterRestart.lifecycleState, api.STATES.ACTIVE);

  // Discarded is a first-class lifecycle state and produces a typed error.
  const tabsDiscarded = { async get(id) { return { id, url: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS', discarded: true, windowId: 3 }; } };
  await assert.rejects(() => registry.getTabOrThrow(21, tabsDiscarded), error => error.code === 'KR_TAB_DISCARDED' && error.tabId === 21);
  assert.strictEqual((await registry.get(21)).lifecycleState, api.STATES.DISCARDED);

  // Reactivation returns the same record to active rather than creating a split entry.
  await registry.observeTab({ id: 21, url: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS', discarded: false, windowId: 3 });
  assert.strictEqual((await registry.get(21)).lifecycleState, api.STATES.ACTIVE);

  // A close between query and message becomes GONE/tombstone and a late access gets KR_TAB_GONE.
  await registry.registerManagedWorker(31, 'renewal-reinventory', { operationId: 'op-2', renewalId: 'ren-2', ownerType: 'renewal', ownerId: 'ren-2' });
  const missingTabs = { async get() { const e = new Error('No tab with id: 31'); throw e; } };
  await assert.rejects(() => registry.getTabOrThrow(31, missingTabs), error => error.code === 'KR_TAB_GONE' && error.tabId === 31);
  const gone = await registry.get(31);
  assert.strictEqual(gone.lifecycleState, api.STATES.GONE);
  assert.strictEqual(gone.owner.renewalId, 'ren-2');
  assert.ok((await registry.managedTabIds()).includes(31), 'fresh tombstone must still hide the former managed worker');

  // Tombstones expire after the existing 30-second compatibility window.
  current += 31000;
  await registry.snapshot();
  assert.strictEqual(await registry.get(31), null);
  assert.ok(!(await registry.managedTabIds()).includes(12), 'old migrated tombstone should also expire');

  assert.strictEqual(api.roleForUrl('https://www.kleinanzeigen.de/s-anzeige/foo/123-1-2'), api.ROLES.USER);
  await registry.registerManagedWorker(41, 'bulk-edit-worker');
  assert.strictEqual((await registry.get(41)).role, api.ROLES.BULK_WORKER);
  assert.strictEqual(api.isGoneError(new Error('The tab was closed.')), true);
  assert.strictEqual(api.isDiscardedError(Object.assign(new Error('x'), { code: 'KR_TAB_DISCARDED' })), true);

  console.log('PASS v1.15.6 A1a TabRegistry lifecycle runtime semantics');
})().catch(error => { console.error(error); process.exit(1); });
