const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync('trash-service.js', 'utf8');
const committed = [];
const record = { inventoryId: '3514237118', adId: '3514237118', title: 'Kulturtasche/Reisetasche für Kinder', recordKind: 'inventory' };
const repository = {
  readForProfile: async () => [],
  get: async id => id === record.inventoryId ? { ...record } : null,
  deleteWithImages: async () => {},
  readAll: async () => [],
  putMany: async () => {},
  async mutate(id, mutator) {
    assert.equal(id, record.inventoryId);
    const next = mutator({ ...record });
    committed.push(structuredClone(next));
    return next;
  }
};
const context = { console, Date, Promise, structuredClone, globalThis: null };
context.globalThis = context;
context.KRDeps = { register(name, api) { context[name] = api; } };
vm.createContext(context);
vm.runInContext(source, context);

(async () => {
  const service = context.KRTrashService.create({ inventoryRepository: repository, retentionMs: 30 * 24 * 60 * 60 * 1000 });
  const result = await service.moveToTrash(record.inventoryId, 'manual', { source: 'runtime-regression' });
  assert.equal(result.inventoryId, record.inventoryId);
  assert.equal(result.recordKind, 'trash');
  assert.equal(result.trash.reason, 'manual');
  assert.equal(committed.length, 1);
  assert.equal(committed[0].recordKind, 'trash');
  console.log('PASS manual trash move commits and returns the trashed record without ReferenceError');
})().catch(error => {
  console.error(`FAIL manual trash move commits and returns the trashed record without ReferenceError: ${error.stack || error.message}`);
  process.exit(1);
});
