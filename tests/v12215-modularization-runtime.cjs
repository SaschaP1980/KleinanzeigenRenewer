const assert = require('assert/strict');
const Mass = require('../mass-renewal-controller.js');
const Verify = require('../renewal-verification-service.js');
let passed = 0;
const pass = msg => { passed += 1; console.log(`PASS ${msg}`); };
function storage(initial = {}) {
  const data = structuredClone(initial);
  return {
    data,
    async get(key) { return { [key]: structuredClone(data[key]) }; },
    async set(values) { Object.assign(data, structuredClone(values)); },
    async remove(key) { delete data[key]; }
  };
}
(async () => {
  const key = 'massRenewalBatchV1';
  const store = storage({ [key]: { batchId:'b1', revision:0, createdAt:new Date().toISOString(), status:'running', items:[], counter:0 } });
  const mass = Mass.create({ storageLocal: store, batchKey:key, broadcastInventoryChanged(){} });
  await Promise.all([
    mass.mutateMassRenewalBatch('b1', async batch => { const n=batch.counter; await new Promise(r=>setTimeout(r,15)); batch.counter=n+1; return {changed:true}; }),
    mass.mutateMassRenewalBatch('b1', async batch => { const n=batch.counter; batch.counter=n+1; return {changed:true}; })
  ]);
  assert.equal(store.data[key].counter, 2); assert.equal(store.data[key].revision, 2); pass('mass controller serializes concurrent mutations without lost updates');

  const stopBatch = { batchId:'b2', stopAfterCurrentRequested:true, status:'running', items:[{status:'success'},{status:'queued'},{status:'queued'}] };
  const stop = mass.applyMassRenewalStopState(stopBatch);
  assert.equal(stop.stopped, true); assert.equal(stop.cancelled, 2); assert.deepEqual(stopBatch.items.map(x=>x.status), ['success','cancelled','cancelled']); assert.equal(stopBatch.status,'stopped'); pass('mass controller preserves stop-after-current cancellation semantics');

  const verify = Verify.create();
  const base = { adId:'1', title:'Titel', description:'Beschreibung', category:{id:'42',path:['A','B']}, images:[], extraction:{imageSetExplicitlyEmpty:true} };
  const equal = await verify.compareRenewalRecords(base, {...base, adId:'2'}, { requirePublicAvailability:false });
  assert.equal(equal.status,'match'); pass('verification service matches semantically equal explicit-empty records without public requirement');
  const mismatch = await verify.compareRenewalRecords(base, {...base, adId:'2', title:'Anders'}, { requirePublicAvailability:false });
  assert.equal(mismatch.status,'mismatch'); assert.equal(mismatch.mismatches.some(x=>x.field==='title'), true); pass('verification service detects semantic title mismatch');
  const waiting = await verify.compareRenewalRecords(base, {...base, adId:'2'}, { requirePublicAvailability:true, onlineConfirmed:false, ownAdsPresence:true });
  assert.equal(waiting.status,'uncertain'); assert.equal(verify.renewalComparisonWaitsOnlyForOnline(waiting), true); assert.deepEqual(verify.renewalOutcomeForComparison(waiting), {status:'waiting-for-online',stage:'waiting-for-online'});
  const online = verify.markStoredComparisonOnline(waiting); assert.equal(online.status,'match'); assert.equal(online.onlineConfirmed,true); pass('verification service preserves waiting-for-online and later online promotion semantics');
  console.log(`${passed}/${passed} PASS v1.22.15 modularization runtime`);
})().catch(err => { console.error(err); process.exit(1); });
