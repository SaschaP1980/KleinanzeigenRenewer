'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('src/app/app.html');
const backgroundSource = read('src/background/background.js');
assert.match(backgroundSource, /function openDatabase\(\) \{ return requireInventoryRepository\(\)\.openDatabase\(\); \}/,
  'KAR-161 extraction must preserve the database facade used by renewal and inventory');
assert.match(backgroundSource, /let diagnosticsService = null;/,
  'KAR-161: diagnostics singleton must exist before eager startup logging and message routing');
assert.match(backgroundSource, /logDiagnostic\('info', 'DIAGNOSTIC_SESSION_STARTED'/,
  'KAR-161: real worker bootstrap eagerly calls diagnostics (browser smoke required)');
const serviceSource = read('src/background/services/trash-service.js');
const { runInNewContext } = require('node:vm');

assert.match(html, /id="trashRetentionRange"[^>]*type="range"[^>]*min="0"[^>]*max="6"[^>]*step="1"/);
assert.match(html, /id="trashRetentionValue"/);
assert.match(html, /10.*30.*60.*90.*180.*360.*∞/s);
assert.ok(html.indexOf('id="trashRetentionRange"') > html.indexOf('id="configurationAccordion"'));
assert.ok(html.indexOf('id="trashRetentionRange"') < html.indexOf('</details>', html.indexOf('id="configurationAccordion"')));

let factory;
runInNewContext(serviceSource, { globalThis: { KRDeps: { register(name, value) { if (name === 'KRTrashService') factory = value; } }, crypto: { randomUUID: () => 'test-token' } }, Date, Number, String, Object, Math, Array, Map, Promise });
assert.ok(factory?.create, 'trash service registered');
const DAY = 86400000;
const now = Date.parse('2026-11-13T12:00:00.000Z');
let policy = 30;
let selectedProfile = 'profile-A';
let records = [
  { inventoryId: 'old', profileId: 'profile-A', recordKind: 'trash', trash: { trashedAt: new Date(now - 12*DAY).toISOString(), expiresAt: new Date(now + 18*DAY).toISOString() } },
  { inventoryId: 'new', profileId: 'profile-B', recordKind: 'trash', trash: { trashedAt: new Date(now - 9*DAY).toISOString(), expiresAt: new Date(now + 21*DAY).toISOString() } },
  { inventoryId: 'reset', profileId: 'profile-A', recordKind: 'trash', trash: { trashedAt: new Date(now - 360*DAY).toISOString(), retentionResetAt: new Date(now - 2*DAY).toISOString() } }
];
const repository = {
  readAll: async () => records.slice(),
  readForProfile: async profileId => records.filter(x => x.profileId === profileId),
  get: async id => records.find(x => x.inventoryId === id),
  mutate: async (id, mutator) => { const i = records.findIndex(x => x.inventoryId === id); if (i < 0) throw Error('missing'); records[i] = mutator(records[i]); return records[i]; },
  deleteWithImages: async id => { records = records.filter(x => x.inventoryId !== id); },
  deleteTrashIfEligible: async (id, expected, days, at) => {
    const r = records.find(x => x.inventoryId === id);
    if (!r || r.profileId !== expected.profileId || r.trash?.trashedAt !== expected.trashedAt || r.trash?.retentionResetAt !== expected.retentionResetAt) return false;
    const date = Date.parse(r.trash.retentionResetAt || r.trash.trashedAt);
    if (days === 'infinite' || date + days*DAY > at) return false;
    records = records.filter(x => x.inventoryId !== id); return true;
  }
};
const service = factory.create({ inventoryRepository: repository, getRetentionDays: async () => policy, setRetentionDays: async value => { policy = value; }, getSelectedProfileId: async () => selectedProfile, now: () => now, tokenFactory: () => 'test-token' });
async function main() {
  assert.equal((await service.getConfiguration()).retentionDays, 30);
  const preview = await service.previewRetentionChange(10, 'profile-A');
  assert.equal(preview.affectedCount, 1, 'only the >=10-day record requires immediate delete');
  assert.equal(records.length, 3, 'preview is read-only');
  await assert.rejects(() => service.commitRetentionChange({ token: preview.token, retentionDays: 10, selectedProfileId: 'profile-B', confirmed: true }), /profil|profile|veraltet|stale/i);
  assert.equal(policy, 30);
  selectedProfile = 'profile-A';
  const second = await service.previewRetentionChange(10, 'profile-A');
  assert.equal(second.affectedCount, 1);
  await service.commitRetentionChange({ token: second.token, retentionDays: 10, selectedProfileId: 'profile-A', confirmed: true });
  assert.equal(policy, 10);
  assert.deepEqual(records.map(x => x.inventoryId), ['new','reset']);
  const infinite = await service.previewRetentionChange('infinite','profile-A');
  assert.equal(infinite.affectedCount, 0);
  await service.commitRetentionChange({ token: infinite.token, retentionDays:'infinite', selectedProfileId:'profile-A' });
  assert.equal(policy,'infinite');
  assert.equal((await service.purgeExpired()).purged, 0);
  assert.equal((await service.list('profile-A'))[0].trash.expiresAt, null);
  // New policy MUST NOT delete an old trash record inserted after preview but
  // before the persisted setting is saved. This simulates a concurrent import
  // or MV3 restart recovery while a destructive-change dialog was open.
  let activePolicy = 30;
  let liveRows = [
    { inventoryId: 'consented', profileId: 'profile-A', recordKind: 'trash',
      trash: { trashedAt: new Date(now - 12*DAY).toISOString() } }
  ];
  const forged = { inventoryId: 'unpreviewed', profileId: 'profile-B', recordKind: 'trash',
    trash: { trashedAt: new Date(now - 360*DAY).toISOString() } };
  const cleanupRepository = {
    readAll: async () => liveRows.slice(),
    readForProfile: async p => liveRows.filter(x=>x.profileId===p),
    get: async id => liveRows.find(x=>x.inventoryId===id),
    mutate: async () => { throw Error('not used'); },
    deleteWithImages: async () => { throw Error('not used'); },
    async deleteTrashIfEligible(id, expected, days, at) {
      const row=liveRows.find(x=>x.inventoryId===id);
      if (!row || row.profileId!==expected.profileId || row.trash.trashedAt!==expected.trashedAt) return false;
      if (Date.parse(row.trash.trashedAt)+days*DAY>at) return false;
      liveRows=liveRows.filter(x=>x.inventoryId!==id);
      return true;
    }
  };
  const isolated = factory.create({
    inventoryRepository: cleanupRepository, now:()=>now, tokenFactory:()=> 'consent-token',
    getSelectedProfileId: async()=> 'profile-A',
    getRetentionDays: async()=>activePolicy,
    setRetentionDays: async days=>{
      activePolicy=days;
      if (days===10) liveRows.push(forged); // arrives between commit validation and cleanup
    }
  });
  const confirmedPreview=await isolated.previewRetentionChange(10,'profile-A');
  assert.equal(confirmedPreview.affectedCount,1);
  const consentedCommit=await isolated.commitRetentionChange({
    token:confirmedPreview.token, retentionDays:10,selectedProfileId:'profile-A',confirmed:true
  });
  assert.equal(consentedCommit.deletedCount,1);
  assert.deepEqual(liveRows.map(x=>x.inventoryId),['unpreviewed'],
    'no record outside the explicit reviewed candidate set may be deleted by the commit');
  assert.equal(activePolicy,10);

  // Advancing time between preview and confirmation can make a previously
  // ineligible existing item immediately due: stale dialogue must fail closed.
  let fakeNow=now;
  let agedPolicy=30;
  const ageRecords=[{inventoryId:'threshold',profileId:'profile-A',recordKind:'trash',
    trash:{trashedAt:new Date(now-10*DAY+60*1000).toISOString()}}];
  const agedRepo={
    ...cleanupRepository,
    readAll: async()=>ageRecords.slice(),
    readForProfile:async()=>ageRecords.slice(),
    deleteTrashIfEligible:async()=>{throw Error('stale consent must not delete');}
  };
  const aged=factory.create({inventoryRepository:agedRepo,now:()=>fakeNow,
    getRetentionDays:async()=>agedPolicy,setRetentionDays:async days=>{agedPolicy=days},
    getSelectedProfileId:async()=> 'profile-A',tokenFactory:()=> 'age-token'});
  const early=await aged.previewRetentionChange(10,'profile-A');
  assert.equal(early.affectedCount,0);
  fakeNow+=60*1000;
  await assert.rejects(()=>aged.commitRetentionChange({token:early.token,retentionDays:10,
    selectedProfileId:'profile-A'}),/veraltet|prüfen|Prüfung/i);
  assert.equal(agedPolicy,30,'do not commit a shorter policy after new expiry without fresh preview');
  console.log('KAR-161 discrete policy, preview safety, profile isolation and infinity: PASS');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
