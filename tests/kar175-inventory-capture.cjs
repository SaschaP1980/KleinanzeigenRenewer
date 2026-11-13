'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const moduleSource = fs.readFileSync(path.join(root, 'src/background/services/inventory-capture-service.js'), 'utf8');
const background = fs.readFileSync(path.join(root, 'src/background/background.js'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'scripts/package.py'), 'utf8');
const registered = new Map(), calls = [];
const sampleImage = new Blob([Uint8Array.from([255, 216, 255, 20, 30, 40])], { type: 'image/jpeg' });
const ctx = {
  Blob, URL, AbortSignal, crypto: webcrypto,
  KRDeps: { register(key, api) { if (registered.has(key)) throw new Error('duplicate provider'); registered.set(key, api); } },
  fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, blob: async () => sampleImage }; },
  createImageBitmap: async () => ({ width: 1600, height: 1200, close() {} })
};
vm.runInNewContext(moduleSource, ctx, { filename: 'inventory-capture-service.js' });
assert.equal(registered.size, 1, 'service registers exactly one provider');
const provider = registered.get('KRInventoryCaptureService');
assert.equal(typeof provider?.create, 'function');
assert.match(background, /InventoryCaptureService\.create\(/);
assert.match(background, /return requireInventoryCaptureService\(\)\.saveInventory\(extracted, options\)/);
assert.match(pkg, /src\/background\/services\/inventory-capture-service\.js/);
assert.ok(background.length < 213227, 'entrypoint must shrink relative to KAR-175 baseline');

const events = [], commits = [], notifications = [];
let commit = async (record, images) => { commits.push({ record, images }); };
const svc = provider.create({
  templateSchemaCore: { buildSchema: row => ({ categoryId: row.categoryId }), fingerprint: async () => 'safe-fingerprint' },
  logDiagnostic: async (_level, event) => { events.push(event); },
  commitInventory: (...args) => commit(...args),
  broadcastInventoryChanged: (...args) => notifications.push(args)
});
(async () => {
  await assert.rejects(svc.saveInventory({}), /Keine eindeutige Anzeigen-ID/);
  assert.equal(commits.length, 0);
  const plain = await svc.saveInventory({ adId:'42', images:[], categoryId:'9', extraction: { capturedFromEditView:true } });
  assert.equal(plain.inventoryId, '42');
  assert.equal(plain.templateSchema.fingerprint, 'safe-fingerprint');
  assert.equal(plain.templateSchema.source, 'edit-form');
  assert.equal(commits[0].images.length, 0);
  assert.equal(notifications[0][0], 'saved');
  assert.ok(events.includes('INVENTORY_SAVED'));

  const url = 'https://img.kleinanzeigen.de/api/v1/prod-ads/images/ab/12345678-1234-1234-1234-1234567890ab';
  const image = { imageId:'id', downloadUrl:url, thumbnailWidth:250, thumbnailHeight:200 };
  const saved = await svc.saveInventory({ adId:'43', images:[image], extraction:{ requiresJpeg:true, requiresLargeJpeg:true } }, { inventoryIdOverride:'replacement-id' });
  assert.equal(saved.inventoryId, 'replacement-id');
  assert.equal(saved.images[0].mimeType, 'image/jpeg');
  assert.equal(saved.images[0].formatEvidence, 'file-signature-and-decode');
  assert.equal(saved.images[0].sha256.length, 64);
  assert.equal(saved.images[0].uploadReady, true);
  assert.equal(commits[1].images[0].imageKey, 'replacement-id:0');
  assert.ok(calls[0].url.includes('rule=%24_57.JPG'));
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.redirect, 'error');

  await assert.rejects(svc.saveInventory({ adId:'44', images:[{ imageId:'bad', downloadUrl:'https://evil.invalid/a.jpg' }] }), /Bild 1 konnte nicht gesichert werden/);
  assert.equal(commits.length, 2, 'failed download cannot partially commit');

  let release;
  commit = () => new Promise(resolve => { release = resolve; });
  const pending = svc.saveInventory({ adId:'45', images:[] });
  await assert.rejects(svc.saveInventory({ adId:'46', images:[] }), /Eine Erfassung läuft bereits/);
  for (let i = 0; i < 10 && !release; i++) await Promise.resolve();
  assert.equal(typeof release, 'function');
  release(); await pending;
  const retried = await svc.saveInventory({ adId:'47', images:[] });
  assert.equal(retried.inventoryId, '47');
  console.log('PASS KAR-175 inventory service: schema, safe JPEG, atomic commit, no partial write and single-flight recovery');
})().catch(error => { console.error(error); process.exitCode=1; });
