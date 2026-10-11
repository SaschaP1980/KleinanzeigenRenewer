const fs = require('node:fs');
const assert = require('node:assert/strict');
if (!globalThis.crypto?.subtle) globalThis.crypto = require('node:crypto').webcrypto;
const DiagnosticZip = require('../diagnostic-zip.js');
const InventoryImport = require('../inventory-import.js');
const ProfileBackup = require('../profile-backup.js');
let failures = 0; let passes = 0;
async function check(label, fn) { try { await fn(); passes += 1; console.log(`PASS ${label}`); } catch (error) { failures += 1; console.error(`FAIL ${label}: ${error.stack || error.message}`); } }

(async () => {
  const profile = { profileId: 'profile-real-zip', displayName: 'Real ZIP' };
  const activeInventory = [{ inventoryId: 'inv-active', adId: '123', profileId: profile.profileId, images: [{ imageKey: 'image-active' }] }];
  const trashEntries = [{ inventoryId: 'inv-trash', adId: '456', profileId: profile.profileId, recordKind: 'trash', trash: { trashedAt: '2026-09-18T00:00:00Z', expiresAt: '2026-10-18T00:00:00Z' }, images: [{ imageKey: 'image-trash' }] }];
  const images = {
    'image-active': { imageKey: 'image-active', inventoryId: 'inv-active', mimeType: 'image/jpeg', blob: new Blob([Uint8Array.from([0xff, 0xd8, 1, 2, 0xff, 0xd9])], { type: 'image/jpeg' }) },
    'image-trash': { imageKey: 'image-trash', inventoryId: 'inv-trash', mimeType: 'image/jpeg', blob: new Blob([Uint8Array.from([0xff, 0xd8, 3, 4, 0xff, 0xd9])], { type: 'image/jpeg' }) }
  };

  await check('real ZIP writer and reader round-trip a complete profile backup', async () => {
    const archive = await ProfileBackup.createProfileArchive({ profile, activeInventory, trashEntries }, {
      extensionVersion: '1.18.1', exportedAt: '2026-09-18T07:00:00.000Z',
      loadImage: async key => images[key], createZip: DiagnosticZip.createZip
    });
    assert.ok(archive.blob.size > 0);
    const parsed = await ProfileBackup.parseProfileArchive(archive.blob, { readZip: InventoryImport.readZip });
    assert.equal(parsed.activeInventory.length, 1);
    assert.equal(parsed.trashEntries.length, 1);
    assert.equal(parsed.images.length, 2);
    assert.equal(parsed.manifest.workflowStateIncluded, false);
  });

  await check('ordinary inventory ZIP reader defaults stay bounded after profile-specific limit support', async () => {
    const source = fs.readFileSync('inventory-import.js', 'utf8');
    assert.match(source, /const MAX_ENTRIES = 256;/);
    assert.match(source, /const MAX_TOTAL_UNCOMPRESSED = 256 \* 1024 \* 1024;/);
    assert.match(source, /const MAX_ENTRY_UNCOMPRESSED = 128 \* 1024 \* 1024;/);
  });

  if (failures) { console.error(`${failures} v1.18.1 profile-backup ZIP runtime group(s) failed; ${passes} passed`); process.exit(1); }
  console.log(`${passes} v1.18.1 profile-backup ZIP runtime groups passed`);
})();
