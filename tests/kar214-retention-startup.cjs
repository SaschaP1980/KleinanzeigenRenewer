'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = readFileSync(path.resolve(__dirname,'../src/background/services/trash-service.js'),'utf8');
let factory;
vm.runInNewContext(source,{globalThis:{KRDeps:{register(name,api){if(name==='KRTrashService')factory=api}},crypto:{randomUUID:()=> 'kar214-token'}},Date,Number,String,Object,Math,Array,Map,Promise});
const day = 86400000;
const now = Date.now();
function fixture(readPolicy, trashOverride = {}) {
  let rows = [{inventoryId:'trash-A',profileId:'profile-A',recordKind:'trash',trash:{trashedAt:new Date(now-60*day).toISOString(),expiresAt:new Date(now-30*day).toISOString(),...trashOverride}}];
  const deleted = [];
  const repository = {
    readAll:async()=>rows.slice(),readForProfile:async p=>rows.filter(r=>r.profileId===p),get:async id=>rows.find(r=>r.inventoryId===id),
    mutate:async()=>{throw Error('unexpected mutation')},
    deleteWithImages:async id=>{deleted.push(id);rows=rows.filter(r=>r.inventoryId!==id)},
    deleteTrashIfEligible:async(id,expected,days,at)=>{
      const row=rows.find(r=>r.inventoryId===id);
      if(!row||row.profileId!==expected.profileId||row.trash.trashedAt!==expected.trashedAt||days==='infinite'||Date.parse(row.trash.trashedAt)+days*day>at)return false;
      deleted.push(id);rows=rows.filter(r=>r.inventoryId!==id);return true;
    }
  };
  const service=factory.create({inventoryRepository:repository,getRetentionDays:readPolicy,now:()=>now});
  return {service,deleted,rows:()=>rows};
}
test('KAR-214 persisted infinite policy overrides stale historical expiresAt before boot purge',async()=>{
  const f=fixture(async()=> 'infinite');
  const result=await f.service.purgeExpired();
  assert.equal(result.purged,0,'persisted unlimited policy must preserve an old finite deadline');
  assert.deepEqual(f.deleted,[]);
  assert.equal(f.rows().length,1);
});
test('KAR-214 unreadable persisted retention is not a confirmed finite policy',async()=>{
  const f=fixture(async()=>{throw Error('fixture storage unavailable')});
  await f.service.purgeExpired().catch(()=>{});
  assert.deepEqual(f.deleted,[],'unverified retention cannot authorize age-based deletion');
  assert.equal(f.rows().length,1);
});
test('KAR-214 verified finite policy still permits eligible expiry',async()=>{
  const f=fixture(async()=>30);
  const result=await f.service.purgeExpired();
  assert.equal(result.purged,1);
  assert.deepEqual(f.deleted,['trash-A']);
});

test('KAR-214 confirmed missing policy preserves longer or unknown legacy expiry',async()=>{
  for (const preference of [undefined,'malformed']) {
    for (const metadata of [{expiresAt:null},{expiresAt:new Date(now+100*day).toISOString()},{retentionIndefinite:true}]) {
      const f=fixture(async()=>preference,metadata);
      assert.equal((await f.service.getConfiguration()).retentionDays,30);
      assert.equal((await f.service.purgeExpired()).purged,0);
      assert.equal(f.rows().length,1);
    }
  }
});
test('KAR-214 valid historical default expiry is retained',async()=>{
  const f=fixture(async()=>undefined);
  assert.equal((await f.service.getConfiguration()).retentionDays,30);
  assert.equal((await f.service.purgeExpired()).purged,1);
});
test('KAR-214 invalid actual trash timestamp is not normalized into deletion eligibility',async()=>{
  const f=fixture(async()=>30,{trashedAt:'2026-02-30T00:00:00.000Z'});
  assert.equal((await f.service.purgeExpired()).purged,0);
  assert.equal(f.rows().length,1);
});
