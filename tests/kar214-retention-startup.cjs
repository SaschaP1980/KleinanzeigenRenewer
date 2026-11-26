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

const { indexedDB, IDBKeyRange } = require('fake-indexeddb');
let repoFactory;
vm.runInNewContext(readFileSync(path.resolve(__dirname,'../src/background/repositories/inventory-repository.js'),'utf8'),{globalThis:{KRDeps:{register(name,api){if(name==='KRInventoryRepository')repoFactory=api}}},Date,Number,String,Object,Math,Array,Map,Promise,Error});
let fixtureCount=0;
async function indexedFixture() {
  const repository=repoFactory.create({indexedDB, IDBKeyRange, dbName:'kar214-fixture-'+(++fixtureCount)});
  const aged={inventoryId:'aged',profileId:'profile-A',recordKind:'trash',trash:{trashedAt:new Date(now-60*day).toISOString(),expiresAt:new Date(now-30*day).toISOString()}};
  const active={inventoryId:'active',profileId:'profile-B',recordKind:'inventory'};
  const db=await repository.openDatabase();
  try {
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(['inventories','images'],'readwrite');
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      tx.objectStore('inventories').put(aged);tx.objectStore('inventories').put(active);
      tx.objectStore('images').put({imageKey:'img-aged',inventoryId:'aged',data:'aged fixture bytes'});
      tx.objectStore('images').put({imageKey:'img-active',inventoryId:'active',data:'active fixture bytes'});
    });
  } finally {db.close()}
  const images=async()=>{
    const db=await repository.openDatabase();
    try{return await new Promise((resolve,reject)=>{const req=db.transaction('images').objectStore('images').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
    finally{db.close()}
  };
  const expected={profileId:aged.profileId,trashedAt:aged.trash.trashedAt,expiresAt:aged.trash.expiresAt,retentionResetAt:undefined,retentionIndefinite:false};
  return {repository,aged,active,images,expected};
}
test('KAR-214 repository verifies identity and metadata inside the real IndexedDB transaction',async()=>{
  const f=await indexedFixture();
  assert.equal(await f.repository.deleteTrashIfEligible('aged',{...f.expected,profileId:'profile-B'},30,now),false);
  assert.equal(await f.repository.deleteTrashIfEligible('aged',{...f.expected,expiresAt:new Date(now+day).toISOString()},30,now),false);
  assert.equal(await f.repository.deleteTrashIfEligible('active',f.expected,30,now),false);
  assert.equal((await f.images()).length,2);
  assert.equal(await f.repository.deleteTrashIfEligible('aged',f.expected,30,now),true);
  assert.deepEqual((await f.repository.readAll()).map(r=>r.inventoryId),['active']);
  assert.deepEqual((await f.images()).map(r=>r.imageKey),['img-active']);
});
test('KAR-214 IndexedDB restart with persisted unlimited or failed hydration preserves records and images',async()=>{
  const f=await indexedFixture();
  let readPolicy=async()=> 'infinite';
  const create=()=>factory.create({inventoryRepository:f.repository,getRetentionDays:()=>readPolicy(),now:()=>now});
  assert.equal((await create().purgeExpired()).purged,0);
  readPolicy=async()=>{throw Error('unavailable')};
  assert.equal((await create().purgeExpired()).purged,0);
  assert.equal((await f.repository.readAll()).length,2);
  assert.equal((await f.images()).length,2);
});
test('KAR-214 stale IndexedDB preview cannot authorize deletion or setting change',async()=>{
  const f=await indexedFixture();let policy='infinite';
  const service=factory.create({inventoryRepository:f.repository,getRetentionDays:async()=>policy,setRetentionDays:async v=>{policy=v},getSelectedProfileId:async()=> 'profile-A',now:()=>now,tokenFactory:()=> 'transaction-fixture'});
  const preview=await service.previewRetentionChange(10,'profile-A');
  assert.equal(preview.affectedCount,1);
  await f.repository.mutate('aged',r=>({...r,trash:{...r.trash,retentionResetAt:new Date(now).toISOString()}}));
  await assert.rejects(()=>service.commitRetentionChange({token:preview.token,retentionDays:10,selectedProfileId:'profile-A',confirmed:true}),/zwischenzeitlich/);
  assert.equal(policy,'infinite');
  assert.equal((await f.repository.readAll()).length,2);
  assert.equal((await f.images()).length,2);
});

test('KAR-214 an unreviewed legacy row arriving during a policy write is not deleted on restart',async()=>{
  const f=await indexedFixture();let policy='infinite';
  const incoming={inventoryId:'unreviewed',profileId:'profile-B',recordKind:'trash',trash:{trashedAt:new Date(now-100*day).toISOString(),expiresAt:null,retentionIndefinite:true}};
  const service=factory.create({inventoryRepository:f.repository,getRetentionDays:async()=>policy,setRetentionDays:async v=>{policy=v;await f.repository.putMany([incoming]);},getSelectedProfileId:async()=> 'profile-A',now:()=>now,tokenFactory:()=> 'restart-consent'});
  const preview=await service.previewRetentionChange(10,'profile-A');
  assert.equal(preview.affectedCount,1);
  await service.commitRetentionChange({token:preview.token,retentionDays:10,selectedProfileId:'profile-A',confirmed:true});
  assert.ok(await f.repository.get('unreviewed'),'commit must not delete unseen row');
  const restarted=factory.create({inventoryRepository:f.repository,getRetentionDays:async()=>policy,now:()=>now});
  await restarted.purgeExpired();
  assert.ok(await f.repository.get('unreviewed'),'restart must not silently broaden explicit destructive consent');
});
test('KAR-214 a verified infinite trash move persists its unlimited marker',async()=>{
  const f=await indexedFixture();
  const service=factory.create({inventoryRepository:f.repository,getRetentionDays:async()=> 'infinite',now:()=>now});
  await service.moveToTrash('active');
  const stored=await f.repository.get('active');
  assert.equal(stored.trash.expiresAt,null);
  assert.equal(stored.trash.retentionIndefinite,true);
});

test('KAR-214 stale finite legacy expiry inserted during unlimited-to-finite commit is not consented after restart',async()=>{
  const f=await indexedFixture();let policy='infinite',revision=null;
  const incoming={inventoryId:'unreviewed-finite',profileId:'profile-B',recordKind:'trash',trash:{trashedAt:new Date(now-100*day).toISOString(),expiresAt:new Date(now-70*day).toISOString()}};
  const options={inventoryRepository:f.repository,getRetentionDays:async()=>policy,getRetentionRevision:async()=>revision,setRetentionDays:async(v,rev)=>{policy=v;revision=rev;await f.repository.putMany([incoming]);},getSelectedProfileId:async()=> 'profile-A',now:()=>now,tokenFactory:()=> 'restart-finite-consent'};
  const service=factory.create(options);
  const preview=await service.previewRetentionChange(10,'profile-A');
  assert.equal(preview.affectedCount,1);
  await service.commitRetentionChange({token:preview.token,retentionDays:10,selectedProfileId:'profile-A',confirmed:true});
  assert.ok(await f.repository.get('unreviewed-finite'));
  await factory.create(options).purgeExpired();
  assert.ok(await f.repository.get('unreviewed-finite'),'a stale finite stored date under old unlimited policy is not fresh consent');
});
test('KAR-214 reviewed non-expired rows receive a finite deadline and eventually expire',async()=>{
  const f=await indexedFixture();let policy='infinite',revision=null,at=now;
  await f.repository.mutate('aged',r=>({...r,trash:{trashedAt:new Date(now-2*day).toISOString(),expiresAt:null,retentionIndefinite:true}}));
  const options={inventoryRepository:f.repository,getRetentionDays:async()=>policy,getRetentionRevision:async()=>revision,setRetentionDays:async(v,rev)=>{policy=v;revision=rev;},getSelectedProfileId:async()=> 'profile-A',now:()=>at,tokenFactory:()=> 'reviewed-future'};
  const service=factory.create(options);
  const preview=await service.previewRetentionChange(10,'profile-A');
  assert.equal(preview.affectedCount,0);
  await service.commitRetentionChange({token:preview.token,retentionDays:10,selectedProfileId:'profile-A',confirmed:false});
  const row=await f.repository.get('aged');
  assert.equal(row.trash.expiresAt,new Date(now+8*day).toISOString());
  assert.equal(row.trash.retentionIndefinite,false);
  at=now+8*day;
  assert.equal((await factory.create(options).purgeExpired()).purged,1);
  assert.equal((await f.repository.readAll()).length,1);
  assert.equal((await f.images()).length,1);
});
