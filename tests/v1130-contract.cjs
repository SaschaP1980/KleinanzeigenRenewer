const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cryptoNode = require('crypto');
const root = path.resolve(__dirname, '..');
if (!globalThis.crypto) globalThis.crypto = cryptoNode.webcrypto;
const InventoryExport = require(path.join(root, 'inventory-export.js'));

(async () => {
  const record = {
    inventoryId: '3509738343',
    adId: '3509738343',
    title: 'Hartan SKY Kinderwagen/Buggy/Kombi-Kinderwagen-Set',
    schemaVersion: 2,
    capturedAt: '2026-09-14T02:50:00.000Z',
    profileId: 'profile-1',
    profileName: 'Testprofil',
    description: 'Vollständiger Beschreibungstext',
    formFields: [{ name: 'foo', value: 'bar', label: 'Foo' }],
    dynamicAttributes: [{ label: 'Art', technicalValue: 'STROLLER', displayValue: 'Kinderwagen' }],
    images: [
      { imageKey: '3509738343:2', position: 2, mimeType: 'image/png', isPrimary: false },
      { imageKey: '3509738343:0', position: 0, mimeType: 'image/jpeg', isPrimary: true },
      { imageKey: '3509738343:1', position: 1, mimeType: 'image/webp', isPrimary: false }
    ]
  };
  const blobs = {
    '3509738343:0': new Blob([Uint8Array.from([1, 2, 3, 4])], { type: 'image/jpeg' }),
    '3509738343:1': new Blob([Uint8Array.from([5, 6, 7])], { type: 'image/webp' }),
    '3509738343:2': new Blob([Uint8Array.from([8, 9])], { type: 'image/png' })
  };
  const stored = Object.fromEntries(Object.entries(blobs).map(([imageKey, blob]) => [imageKey, {
    imageKey,
    inventoryId: record.inventoryId,
    blob,
    capturedAt: record.capturedAt,
    mimeType: blob.type,
    sourceUrl: `https://img.kleinanzeigen.de/${imageKey}`
  }]));
  let capturedEntries = null;
  const result = await InventoryExport.createInventoryArchive(record, {
    extensionVersion: '1.13.0',
    exportedAt: '2026-09-15T03:00:00.000Z',
    loadImage: async imageKey => stored[imageKey] || null,
    createZip: async entries => {
      capturedEntries = entries;
      return new Blob(['zip'], { type: 'application/zip' });
    }
  });

  assert.strictEqual(result.manifest.archiveType, 'kleinanzeigen-renewal-inventory-export');
  assert.strictEqual(result.manifest.archiveVersion, 1);
  assert.strictEqual(result.manifest.sourceExtensionVersion, '1.13.0');
  assert.deepStrictEqual(result.manifest.images.map(item => item.imageKey), ['3509738343:0', '3509738343:1', '3509738343:2']);
  assert.deepStrictEqual(result.manifest.images.map(item => item.file), ['images/001.jpg', 'images/002.webp', 'images/003.png']);
  assert.strictEqual(result.manifest.images[0].isPrimary, true);
  assert.strictEqual(result.manifest.completeness.expectedImages, 3);
  assert.strictEqual(result.manifest.completeness.includedImages, 3);
  assert.strictEqual(result.manifest.completeness.allLocalImagesIncluded, true);
  assert.deepStrictEqual(capturedEntries.map(entry => entry.name), [
    'export-manifest.json', 'record.json', 'image-store.json',
    'images/001.jpg', 'images/002.webp', 'images/003.png'
  ]);
  assert.ok(String(capturedEntries.find(entry => entry.name === 'record.json').data).includes('Vollständiger Beschreibungstext'));
  assert.ok(String(capturedEntries.find(entry => entry.name === 'record.json').data).includes('formFields'));
  assert.ok(String(capturedEntries.find(entry => entry.name === 'image-store.json').data).includes('sourceUrl'));
  assert.ok(result.filename.endsWith('.zip'));
  assert.ok(!/[<>:"/\\|?*]/.test(result.filename));

  const bad = JSON.parse(JSON.stringify(record));
  bad.images = [{ imageKey: '3509738343:0', position: 0, mimeType: 'image/jpeg', sha256: '00'.repeat(32) }];
  await assert.rejects(() => InventoryExport.createInventoryArchive(bad, {
    loadImage: async imageKey => stored[imageKey],
    createZip: async () => new Blob(['zip'])
  }), /Integritätsprüfung/);

  const app = require('./v12210-source-surface.cjs');
  const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(['1.13.0', '1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version));
  assert.ok(['1.13.0', '1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(packageJson.version));
  assert.ok(html.indexOf('inventory-export.js') < html.indexOf('app.js'));
  assert.ok(app.includes(['1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version) ? "exportButton.textContent = 'Als ZIP exportieren';" : "exportButton.textContent = 'Exportieren';"));
  assert.ok(app.includes('footer.append(details, footerMeta);'));
  assert.ok(app.includes('actions.append(createButton, updateButton, exportButton, deleteButton);'));

  assert.ok(app.includes("USER_INVENTORY_EXPORT_SUCCEEDED"));
  assert.ok(css.includes('.inventory-export-button'));
  assert.deepStrictEqual(manifest.permissions, ['activeTab', 'storage', 'unlimitedStorage', 'scripting']);
  assert.deepStrictEqual(manifest.host_permissions, [
    'https://www.kleinanzeigen.de/*',
    'https://kleinanzeigen.de/*',
    'https://img.kleinanzeigen.de/*'
  ]);

  console.log('PASS v1.13.0 Phase 1 export archive contract');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
