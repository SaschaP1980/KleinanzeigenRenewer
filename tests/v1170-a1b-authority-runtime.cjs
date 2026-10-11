const path = require('node:path');
const assert = require('node:assert/strict');
const api = require(path.join(__dirname, '..', 'tab-registry.js'));
let n = 0; const pass = name => { n += 1; console.log('PASS ' + name); };

function memoryStorage(initial = {}) {
  const data = structuredClone(initial);
  return {
    async get(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      const out = {};
      for (const key of list) if (Object.prototype.hasOwnProperty.call(data, key)) out[key] = structuredClone(data[key]);
      return out;
    },
    async set(patch) { Object.assign(data, structuredClone(patch)); },
    data
  };
}

(async () => {
  let now = Date.parse('2026-09-16T20:00:00Z');
  const storage = memoryStorage();
  const registry = api.create({ storageSession: storage, now: () => now, tombstoneMs: 30000 });

  await registry.register(41, {
    role: api.ROLES.BULK_SOURCE,
    owner: { operationId: 'op-1', bulkRunId: 'run-1', runId: 'run-1', ownerType: 'bulk', ownerId: 'run-1' },
    url: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS'
  });
  const mismatch = await registry.releaseOwnership(41, { bulkRunId: 'run-old', ownerType: 'bulk', ownerId: 'run-old' });
  assert.equal(mismatch.released, false);
  assert.equal(mismatch.reason, 'owner-mismatch');
  assert.equal((await registry.get(41)).owner.runId, 'run-1');
  pass('late old owner cannot release a newer bulk owner');

  const released = await registry.releaseOwnership(41, { bulkRunId: 'run-1', runId: 'run-1', ownerType: 'bulk', ownerId: 'run-1' });
  assert.equal(released.released, true);
  assert.deepEqual((await registry.get(41)).owner, {});
  assert.equal((await registry.get(41)).role, api.ROLES.SOURCE);
  assert.equal((await registry.get(41)).lifecycleState, api.STATES.ACTIVE);
  pass('terminal bulk ownership release preserves the live source tab and restores URL-derived role');

  await registry.registerManagedWorker(51, 'bulk-edit-worker', { operationId: 'op-1', runId: 'run-1', ownerType: 'bulk', ownerId: 'run-1' });
  await registry.markGone(51, 'test-gone');
  let gets = 0;
  await assert.rejects(
    () => registry.getTabOrThrow(51, { async get() { gets += 1; return { id: 51 }; } }, { label: 'Worker' }),
    error => error.code === 'KR_TAB_GONE' && error.tabId === 51
  );
  assert.equal(gets, 0);
  assert.equal((await registry.get(51)).owner.runId, 'run-1');
  pass('known tombstone classifies late requests as KR_TAB_GONE without touching chrome.tabs.get');

  const goneRelease = await registry.releaseOwnership(51, { runId: 'run-1', ownerType: 'bulk', ownerId: 'run-1' });
  assert.equal(goneRelease.released, false);
  assert.equal(goneRelease.reason, 'gone-tombstone');
  assert.equal((await registry.get(51)).owner.runId, 'run-1');
  pass('gone tombstones retain correlation ownership for the compatibility window');

  await registry.registerManagedWorker(61, 'renewal-reinventory', { renewalId: 'ren-1', ownerType: 'renewal', ownerId: 'ren-1' });
  let removes = 0;
  const closeTabs = { async remove(id) { removes += 1; assert.equal(id, 61); } };
  const closeResult = await registry.closeTab(61, closeTabs, { reason: 'test-close' });
  assert.equal(closeResult.closed, true);
  assert.equal(removes, 1);
  const closed = await registry.get(61);
  assert.equal(closed.lifecycleState, api.STATES.GONE);
  assert.equal(closed.owner.renewalId, 'ren-1');
  pass('central close creates a correlated gone tombstone');

  const closeAgain = await registry.closeTab(61, { async remove() { throw new Error('must not remove twice'); } }, { reason: 'test-close-again' });
  assert.equal(closeAgain.alreadyGone, true);
  pass('central close is idempotent for an existing tombstone');

  await registry.register(71, { role: api.ROLES.RENEWAL_WORKER, owner: { renewalId: 'ren-2', ownerType: 'renewal', ownerId: 'ren-2' }, url: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html' });
  await registry.observeTab({ id: 71, url: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html', windowId: 4, discarded: true }, { role: api.ROLES.RENEWAL_WORKER });
  let reloads = 0;
  const reloadTabs = {
    async get(id) { assert.equal(id, 71); return { id, url: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html', windowId: 4, discarded: true }; },
    async reload(id) { assert.equal(id, 71); reloads += 1; }
  };
  const beforeReload = await registry.reloadTabOrThrow(71, reloadTabs, { label: 'Discarded worker' });
  assert.equal(beforeReload.discarded, true);
  assert.equal(reloads, 1);
  assert.equal((await registry.get(71)).lifecycleState, api.STATES.DISCARDED);
  pass('discarded worker reload is centralized without prematurely claiming active lifecycle');

  await registry.observeTab({ id: 71, url: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html', windowId: 4, discarded: false }, { role: api.ROLES.RENEWAL_WORKER });
  assert.equal((await registry.get(71)).lifecycleState, api.STATES.ACTIVE);
  assert.equal((await registry.get(71)).owner.renewalId, 'ren-2');
  pass('post-reload observation reactivates the same correlated registry entry');

  await registry.register(81, { role: api.ROLES.BULK_SOURCE, owner: { runId: 'run-2', ownerType: 'bulk', ownerId: 'run-2' }, url: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html' });
  const missingTabs = { async get() { throw new Error('No tab with id: 81'); } };
  await assert.rejects(() => registry.getTabOrThrow(81, missingTabs, { label: 'Bulk source' }), error => error.code === 'KR_TAB_GONE');
  assert.equal((await registry.get(81)).lifecycleState, api.STATES.GONE);
  pass('live disappearance is normalized into KR_TAB_GONE and persisted as tombstone');

  now += 31000;
  await registry.snapshot();
  assert.equal(await registry.get(81), null);
  assert.equal(await registry.get(51), null);
  pass('A1a 30-second tombstone expiry remains unchanged');

  console.log(`${n} v1.17.0 A1b authority runtime groups passed`);
})().catch(error => { console.error(error); process.exit(1); });
