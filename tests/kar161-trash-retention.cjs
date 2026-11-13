'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('src/app/app.html');
const backgroundSource = read('src/background/background.js');
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
  console.log('KAR-161 discrete policy, preview safety, profile isolation and infinity: PASS');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
