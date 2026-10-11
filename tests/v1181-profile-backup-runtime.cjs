const assert = require('node:assert/strict');
if (!globalThis.crypto?.subtle) globalThis.crypto = require('node:crypto').webcrypto;
const B = require('../profile-backup.js');
const encoder = new TextEncoder();
let failures = 0; let passes = 0;
async function check(label, fn) { try { await fn(); passes += 1; console.log(`PASS ${label}`); } catch (error) { failures += 1; console.error(`FAIL ${label}: ${error.stack || error.message}`); } }
function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return encoder.encode(String(value ?? ''));
}
function entryMap(entries) { return new Map(entries.map(entry => [entry.name, asBytes(entry.data)])); }

(async () => {
  const profile = { profileId: 'profile-1', displayName: 'Backup Test', normalizedName: 'backup test', createdAt: '2026-09-01T00:00:00Z', lastSeenAt: '2026-09-18T00:00:00Z' };
  const activeInventory = [{ inventoryId: 'inv-101', adId: '101', profileId: 'profile-1', profileName: 'Backup Test', title: 'Aktiv', images: [{ imageKey: 'img-a' }] }];
  const trashEntries = [{ inventoryId: 'inv-202', adId: '202', profileId: 'profile-1', profileName: 'Backup Test', title: 'Papierkorb', recordKind: 'trash', trash: { trashedAt: '2026-09-17T00:00:00Z', expiresAt: '2026-10-17T00:00:00Z' }, images: [{ imageKey: 'img-b' }] }];
  const imageData = {
    'img-a': { imageKey: 'img-a', inventoryId: 'inv-101', mimeType: 'image/jpeg', blob: new Blob([Uint8Array.from([1,2,3])], { type: 'image/jpeg' }) },
    'img-b': { imageKey: 'img-b', inventoryId: 'inv-202', mimeType: 'image/png', blob: new Blob([Uint8Array.from([4,5,6,7])], { type: 'image/png' }) }
  };
  let archive;

  await check('profile backup round-trips active inventory, trash metadata and images', async () => {
    archive = await B.createProfileArchive({ profile, activeInventory, trashEntries }, {
      extensionVersion: '1.18.1', exportedAt: '2026-09-18T07:00:00.000Z',
      loadImage: async key => imageData[key],
      createZip: async entries => new Blob([entries.map(item => item.name).join('\n')], { type: 'application/zip' })
    });
    assert.equal(archive.manifest.workflowStateIncluded, false);
    assert.deepEqual(archive.manifest.counts, { activeInventory: 1, trashEntries: 1, images: 2, imageReferences: 2, uniqueImageFiles: 2 });
    const fakeFile = new Blob(['zip']); Object.defineProperty(fakeFile, 'name', { value: 'profile.zip' });
    const parsed = await B.parseProfileArchive(fakeFile, { readZip: async () => entryMap(archive.entries) });
    assert.equal(parsed.activeInventory[0].inventoryId, 'inv-101');
    assert.equal(parsed.trashEntries[0].trash.expiresAt, '2026-10-17T00:00:00Z');
    assert.deepEqual(parsed.images.map(image => [image.imageKey, image.inventoryId, image.size]), [['img-a','inv-101',3],['img-b','inv-202',4]]);
    assert.equal('file' in parsed.images[0], false);
  });

  await check('backup creation rejects cross-profile inventory data', async () => {
    await assert.rejects(() => B.createProfileArchive({ profile, activeInventory: [{ ...activeInventory[0], profileId: 'other' }], trashEntries: [] }, {
      loadImage: async key => imageData[key], createZip: async () => new Blob(['x'])
    }), /abweichender Profilzuordnung/);
  });

  await check('backup parser rejects workflow state reactivation', async () => {
    const map = entryMap(archive.entries);
    const manifest = JSON.parse(new TextDecoder().decode(map.get('backup-manifest.json')));
    manifest.workflowStateIncluded = true;
    map.set('backup-manifest.json', encoder.encode(JSON.stringify(manifest)));
    const fakeFile = new Blob(['zip']);
    await assert.rejects(() => B.parseProfileArchive(fakeFile, { readZip: async () => map }), /Workflow-Zustand/);
  });

  await check('backup parser rejects image ownership that differs from inventory references', async () => {
    const map = entryMap(archive.entries);
    const manifest = JSON.parse(new TextDecoder().decode(map.get('backup-manifest.json')));
    const store = JSON.parse(new TextDecoder().decode(map.get('image-store.json')));
    store[0].inventoryId = 'inv-202';
    const storeText = `${JSON.stringify(store, null, 2)}\n`;
    map.set('image-store.json', encoder.encode(storeText));
    manifest.files.imageStoreMetadata.sha256 = await B.sha256Hex(storeText);
    map.set('backup-manifest.json', encoder.encode(JSON.stringify(manifest)));
    const fakeFile = new Blob(['zip']);
    await assert.rejects(() => B.parseProfileArchive(fakeFile, { readZip: async () => map }), /abweichende Inventarzuordnung/);
  });

  if (failures) { console.error(`${failures} v1.18.1 profile-backup runtime group(s) failed; ${passes} passed`); process.exit(1); }
  console.log(`${passes} v1.18.1 profile-backup runtime groups passed`);
})();
