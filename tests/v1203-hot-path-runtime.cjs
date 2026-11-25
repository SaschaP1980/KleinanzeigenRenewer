const root = require('node:path').resolve(__dirname, '..');
const historical = require('./kar210-historical-contract-context.cjs');
const restored = historical.isRestored(root);
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

if (restored) {
  const trashSource = fs.readFileSync('trash-service.js','utf8');
  const DAY = 86400000;
  let clock = Date.parse('2026-11-13T00:00:00Z'), reads = 0;
  const ClockDate = class extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return clock; }
  };
  const row = (id, expiry) => ({inventoryId:id,profileId:'p',recordKind:'trash',trash:{trashedAt:new Date(clock-29*DAY).toISOString(),expiresAt:expiry}});
  let rows = [row('future',new Date(clock+DAY).toISOString()),row('unknown',null),row('invalid','invalid'),{inventoryId:'live',profileId:'p',recordKind:'inventory'}];
  const removed=[];
  let afterRead=null;
  const repository = {
    readForProfile:async()=>[],get:async id=>rows.find(r=>r.inventoryId===id),mutate:async()=>null,
    readTrashExpiryState:async now=>{
      reads++;
      const expired=rows.filter(r=>r.recordKind==='trash' && Number.isFinite(Date.parse(r.trash.expiresAt)) && Date.parse(r.trash.expiresAt)<=now).map(r=>structuredClone(r));
      const future=rows.filter(r=>r.recordKind==='trash' && Date.parse(r.trash.expiresAt)>now).map(r=>Date.parse(r.trash.expiresAt));
      const state={expired,nextDueAt:future.length?Math.min(...future):null};
      if(afterRead)afterRead();
      return state;
    },
    deleteWithImages:async id=>{removed.push(id);rows=rows.filter(r=>r.inventoryId!==id);}
  };
  let api;
  vm.runInNewContext(trashSource,{Date:ClockDate,KRDeps:{register(name,value){assert.equal(name,'KRTrashService');api=value;}}});
  (async()=>{
    const service=api.create({inventoryRepository:repository});
    await service.purgeExpired();assert.equal(reads,1);assert.equal(removed.length,0);
    assert.equal((await service.purgeExpired()).skipped,true);assert.equal(reads,1);
    pass('historical stored expiry suppresses redundant scans');
    clock+=DAY;await service.purgeExpired();assert.equal(reads,2);assert.deepEqual(removed,['future']);
    assert.equal((await service.purgeExpired()).skipped,true);assert.equal(reads,2);
    pass('due fixed expiry purges once and empty schedule suppresses rescans');
    rows.push(row('newly-trash',new Date(clock-DAY).toISOString()));service.invalidatePurgeSchedule();await service.purgeExpired();
    assert.deepEqual(removed,['future','newly-trash']);assert.deepEqual(rows.map(r=>r.inventoryId),['unknown','invalid','live']);
    pass('cache invalidation discovers newly expired trash, preserves unknown/invalid and live records');
    rows.push(row('reset-race',new Date(clock-DAY).toISOString()));service.invalidatePurgeSchedule();
    afterRead=()=>{rows.find(r=>r.inventoryId==='reset-race').trash.expiresAt=new Date(clock+30*DAY).toISOString();};
    await service.purgeExpired();
    assert.ok(rows.some(r=>r.inventoryId==='reset-race'),'S02 safety witness: a record whose expiry was reset after selection must not be deleted');
    pass('stale expiry selection cannot delete a newly reset record');
  })().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
} else {
  const trashSource = fs.readFileSync('trash-service.js', 'utf8');
  const DAY_MS = 24 * 60 * 60 * 1000;
  let clock = Date.parse('2026-11-13T00:00:00.000Z');
  let policy = 30;
  let retentionReads = 0;
  let confirmedDeletes = 0;
  let rows = [
    { inventoryId: 'future', profileId: 'profile-A', recordKind: 'trash',
      trash: { trashedAt: new Date(clock - 29 * DAY_MS).toISOString() } }
  ];
  const repository = {
    readForProfile: async () => [],
    get: async () => null,
    mutate: async () => null,
    deleteWithImages: async () => {},
    readAll: async () => { retentionReads += 1; return rows.slice(); },
    deleteTrashIfEligible: async (id, expected, days, at) => {
      const record = rows.find(x => x.inventoryId === id);
      if (!record) return false;
      if (String(record.profileId) !== String(expected.profileId) ||
        String(record.trash.trashedAt) !== expected.trashedAt) return false;
      if (Date.parse(record.trash.trashedAt) + days * DAY_MS > at) return false;
      rows = rows.filter(x => x.inventoryId !== id);
      confirmedDeletes += 1;
      return true;
    }
  };
  const trashCtx = { console, Date, Promise, globalThis: null };
  trashCtx.globalThis = trashCtx;
  trashCtx.KRDeps = { register(name, api) { trashCtx[name] = api; } };
  vm.createContext(trashCtx);
  vm.runInContext(trashSource, trashCtx);
  
  (async () => {
    const service = trashCtx.KRTrashService.create({
      inventoryRepository: repository, now: () => clock,
      getRetentionDays: async () => policy
    });
    await service.purgeExpired();
    assert.equal(retentionReads, 1);
    assert.equal(confirmedDeletes, 0);
    pass('unknown purge schedule inspects persisted trash under the active policy');
    const skipped = await service.purgeExpired();
    assert.equal(skipped.skipped, true);
    assert.equal(retentionReads, 1);
    pass('next policy-derived expiry suppresses redundant scans');
    clock += DAY_MS;
    await service.purgeExpired();
    assert.equal(retentionReads, 2);
    assert.equal(confirmedDeletes, 1);
    assert.equal(rows.length, 0);
    pass('due expiry re-evaluates trash and uses exact-ID guarded deletion');
    clock += DAY_MS;
    const noFuture = await service.purgeExpired();
    assert.equal(noFuture.skipped, true);
    assert.equal(retentionReads, 2);
    pass('no future expiry suppresses redundant scans');
    rows.push({ inventoryId: 'newly-trash', profileId: 'profile-A', recordKind: 'trash',
      trash: { trashedAt: new Date(clock - 31 * DAY_MS).toISOString() } });
    service.invalidatePurgeSchedule();
    await service.purgeExpired();
    assert.equal(confirmedDeletes, 2);
    pass('newly added trash invalidates the skip cache before a safe purge');
    policy = 'infinite';
    service.invalidatePurgeSchedule();
    rows.push({ inventoryId: 'infinite', profileId: 'profile-A', recordKind: 'trash',
      trash: { trashedAt: new Date(clock - 360 * DAY_MS).toISOString() } });
    const before = retentionReads;
    const result = await service.purgeExpired();
    assert.equal(result.skipped, true);
    assert.equal(retentionReads, before);
    assert.equal(rows.length, 1);
    pass('infinite retention never scans or deletes entries by age');
    console.log(n + ' v1.20.3 hot-path runtime groups passed');
  })().catch(error => { console.error(error.stack || error); process.exit(1); });
  
}
