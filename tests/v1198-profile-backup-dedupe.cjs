const assert = require('node:assert/strict');
if (!globalThis.crypto?.subtle) globalThis.crypto = require('node:crypto').webcrypto;
const B = require('../profile-backup.js');
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const asBytes = value => value instanceof Uint8Array ? value : value instanceof ArrayBuffer ? new Uint8Array(value) : encoder.encode(String(value ?? ''));
const entryMap = entries => new Map(entries.map(entry => [entry.name, asBytes(entry.data)]));

(async () => {
  const profile = { profileId: 'p1', displayName: 'Dedupe' };
  const same = Uint8Array.from([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
  const activeInventory = [
    { inventoryId: 'a', adId: '1', profileId: 'p1', images: [{ imageKey: 'a:0', position: 0, mimeType: 'image/jpeg' }] },
    { inventoryId: 'b', adId: '2', profileId: 'p1', images: [{ imageKey: 'b:0', position: 0, mimeType: 'image/jpeg' }] }
  ];
  const saved = {
    'a:0': { imageKey: 'a:0', inventoryId: 'a', mimeType: 'image/jpeg', blob: new Blob([same], { type: 'image/jpeg' }) },
    'b:0': { imageKey: 'b:0', inventoryId: 'b', mimeType: 'image/jpeg', blob: new Blob([same], { type: 'image/jpeg' }) }
  };
  const archive = await B.createProfileArchive({ profile, activeInventory, trashEntries: [] }, {
    extensionVersion: '1.19.8',
    exportedAt: '2026-09-18T18:00:00.000Z',
    loadImage: async key => saved[key],
    createZip: async entries => new Blob([entries.map(e => e.name).join('\n')], { type: 'application/zip' })
  });
  const imageFiles = archive.entries.filter(entry => /^images\/\d+\.bin$/.test(entry.name));
  assert.equal(imageFiles.length, 1, 'same SHA-256 payload must be stored physically once');
  assert.equal(archive.manifest.counts.imageReferences, 2);
  assert.equal(archive.manifest.counts.uniqueImageFiles, 1);
  assert.equal(archive.manifest.images.length, 2);
  assert.equal(archive.manifest.images[0].file, archive.manifest.images[1].file);
  assert.ok(Number(archive.manifest.deduplication?.savedBytes) >= same.length);

  const store = JSON.parse(decoder.decode(entryMap(archive.entries).get('image-store.json')));
  assert.equal(store.length, 2, 'logical image metadata must remain per imageKey');

  const parsed = await B.parseProfileArchive(new Blob(['zip']), { readZip: async () => entryMap(archive.entries) });
  assert.equal(parsed.images.length, 2, 'restore must reconstruct both logical image records');
  assert.deepEqual(parsed.images.map(i => [i.imageKey, i.inventoryId]), [['a:0','a'],['b:0','b']]);
  assert.deepEqual(await Promise.all(parsed.images.map(async i => [...new Uint8Array(await i.blob.arrayBuffer())])), [[...same],[...same]]);
  console.log('PASS profile backup stores identical image payload once and restores all logical references');
})().catch(error => { console.error(error); process.exit(1); });
