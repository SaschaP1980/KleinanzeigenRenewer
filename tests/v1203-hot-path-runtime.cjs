const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const TemplateFillService = require('../template-fill-service.js');
let n = 0; const pass = label => { n += 1; console.log(`PASS ${n}: ${label}`); };
const templateService = TemplateFillService.create({
  storageLocal: { async get(key) { return { [key]: {} }; }, async set() {} }
});
const classify = templateService.isTransientTemplateFillProgress;
assert.equal(classify('image-1-of-20-uploading', 'running', null), true); pass('image uploading progress is transient');
assert.equal(classify('image-20-of-20-stable', 'running', null), true); pass('image stable progress is transient');
assert.equal(classify('image-7-of-20-failed', 'running', null), false); pass('failed image progress remains durable');
assert.equal(classify('form-verified', 'running', { complete: true }), false); pass('verified form checkpoint remains durable');
assert.equal(classify('awaiting-publish', 'running', { complete: true }), false); pass('publish gate checkpoint remains durable');
assert.equal(classify('category-selecting', 'running', null), false); pass('category navigation remains durable in this conservative phase');

const trashSource = fs.readFileSync('trash-service.js', 'utf8');
let clock = 1000;
class FakeDate extends Date {
  constructor(...args) { super(...(args.length ? args : [clock])); }
  static now() { return clock; }
}
let expiryReads = 0;
const repository = {
  readForProfile: async () => [],
  get: async () => null,
  mutate: async () => null,
  deleteWithImages: async () => {},
  readAll: async () => [],
  readTrashExpiryState: async () => { expiryReads += 1; return { expired: [], nextDueAt: 5000 }; }
};
const trashCtx = { console, Date: FakeDate, Promise, globalThis: null };
trashCtx.globalThis = trashCtx;
trashCtx.KRDeps = { register(name, api) { trashCtx[name] = api; } };
vm.createContext(trashCtx);
vm.runInContext(trashSource, trashCtx);

(async () => {
  const service = trashCtx.KRTrashService.create({ inventoryRepository: repository, retentionMs: 30 * 24 * 60 * 60 * 1000 });
  await service.purgeExpired();
  assert.equal(expiryReads, 1); pass('unknown purge schedule performs one indexed expiry check');
  const skipped = await service.purgeExpired();
  assert.equal(skipped.skipped, true); assert.equal(expiryReads, 1); pass('future expiry suppresses redundant purge query through public purgeExpired');
  clock = 5000;
  await service.purgeExpired();
  assert.equal(expiryReads, 2); pass('due expiry re-enables indexed purge query through public purgeExpired');
  repository.readTrashExpiryState = async () => { expiryReads += 1; return { expired: [], nextDueAt: null }; };
  await service.purgeExpired();
  const readsAfterNoFuture = expiryReads;
  clock = 6000;
  const noFuture = await service.purgeExpired();
  assert.equal(noFuture.skipped, true); assert.equal(expiryReads, readsAfterNoFuture); pass('no future trash expiry suppresses redundant checks through public purgeExpired');
  console.log(`${n} v1.20.3 hot-path runtime groups passed`);
})().catch(error => { console.error(error.stack || error); process.exit(1); });
