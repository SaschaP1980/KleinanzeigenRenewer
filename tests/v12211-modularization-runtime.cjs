const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let n = 0;
const pass = label => { n += 1; console.log(`PASS ${label}`); };

function loadModule(file, exportName, extra = {}) {
  const context = { console, Date, Promise, structuredClone, ...extra, globalThis: null };
  context.globalThis = context;
  context.KRDeps = { register(name, api) { context[name] = api; } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  return { context, api: context[exportName] };
}

(async () => {
  const state = {};
  const storageLocal = {
    async get(keys) { const out = {}; for (const key of keys) out[key] = state[key]; return out; },
    async set(values) { Object.assign(state, structuredClone(values)); },
    async remove(key) { delete state[key]; }
  };
  const { api: profileApi } = loadModule('profile-repository.js', 'KRProfileRepository');
  let uuidN = 0;
  const profiles = profileApi.create({ storageLocal, randomUUID: () => `profile-${++uuidN}`, nowIso: () => '2026-09-24T06:00:00.000Z' });
  const first = await profiles.ensure('Test Profil');
  const same = await profiles.ensure('Test Profil');
  assert.equal(first.profileId, same.profileId);
  await profiles.setSelected(first.profileId, 'manual');
  assert.equal((await profiles.read()).selectedProfileId, first.profileId);
  pass('profile repository preserves stable identity and selected-profile persistence');

  await profiles.removeProfileMetadata(first.profileId, { unassignedRecords: 2 });
  const removedState = await profiles.read();
  assert.equal(removedState.profiles.length, 0);
  assert.equal(removedState.selectedProfileId, '__unassigned__');
  assert.equal(removedState.selectedProfileSource, 'manual');
  pass('profile repository preserves current delete-to-unassigned selection semantics');

  let current = { inventoryId: 'inv-1', profileId: 'p1', recordKind: 'inventory' };
  let deleted = [];
  let expiryReads = 0;
  const repo = {
    readForProfile: async () => [current],
    get: async () => current,
    readAll: async () => [current],
    async mutate(id, mutator) { assert.equal(id, current.inventoryId); current = mutator(structuredClone(current)); return current; },
    async deleteWithImages(id) { deleted.push(id); },
    async readTrashExpiryState() { expiryReads += 1; return { expired: [], nextDueAt: Date.now() + 60000 }; },
    async putMany(rows) { current = rows[0] || current; return rows.length; }
  };
  const { api: trashApi } = loadModule('trash-service.js', 'KRTrashService');
  const trash = trashApi.create({ inventoryRepository: repo, retentionMs: 30 * 24 * 60 * 60 * 1000 });
  const trashed = await trash.moveToTrash('inv-1', 'runtime-test', { source: 'v12211' });
  assert.equal(trashed.recordKind, 'trash');
  assert.equal(trashed.trash.reason, 'runtime-test');
  await trash.purgeExpired();
  await trash.purgeExpired();
  assert.equal(expiryReads, 1, 'second purge should use cached next due time');
  assert.deepEqual(deleted, []);
  pass('trash service preserves move semantics and next-expiry hot-path cache');

  const { api: inventoryApi } = loadModule('inventory-repository.js', 'KRInventoryRepository', {
    indexedDB: { open() { throw new Error('not expected during construction'); } },
    IDBKeyRange: { only(value) { return value; } }
  });
  const inventory = inventoryApi.create({ indexedDB: { open() { throw new Error('not expected'); } }, IDBKeyRange: { only(value) { return value; } } });
  for (const name of ['openDatabase','openSharedDatabase','readAll','readForProfile','get','put','commit','deleteWithImages','countUnassignedActive','readTrashExpiryState','unassignProfileRecords','assignUnassignedRecords','mutate','putMany']) assert.equal(typeof inventory[name], 'function', `${name} missing`);
  pass('inventory repository exposes the complete storage contract required by background and trash service');

  console.log(`${n}/${n} PASS v1.22.11 modularization runtime`);
})().catch(error => { console.error(error.stack || error); process.exit(1); });
