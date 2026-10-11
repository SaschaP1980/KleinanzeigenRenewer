const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const captureController = fs.readFileSync(path.join(root, 'inventory-capture-controller.js'), 'utf8');
const captureView = fs.readFileSync(path.join(root, 'src/app/inventory-capture-view.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'shared-ui-helpers.js'), 'utf8') + '\n' + captureController + '\n' + captureView;
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
let n = 0;
const pass = msg => { n += 1; console.log(`PASS ${msg}`); };

assert.ok(['1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version));
pass('manifest version retains v1.16.3 result/thumbnail contract');

assert.match(content, /function normalizeInventoryCandidateThumbnail\(rawUrl\)/);
assert.match(content, /parsed\.hostname === 'img\.kleinanzeigen\.de'/);
assert.match(content, /const ogThumbnail = normalizeInventoryCandidateThumbnail\(meta\('og:image'\)\)/);
assert.match(content, /if \(ogThumbnail\)[\s\S]*?else \{[\s\S]*?KRImages\?\.extract\(document, location\.href\)/);
pass('public candidate preview validates og:image before falling back to the real gallery');

assert.match(content, /thumbnailSource = 'og-image'/);
assert.match(content, /thumbnailSource = 'gallery'/);
assert.match(content, /thumbnailSource = 'edit-images'/);
assert.match(content, /thumbnailSource,/);
pass('candidate preview records a non-sensitive thumbnail source');

assert.match(app, /candidateThumbnails: inventoryCaptureCandidates\.map\(candidate => \(\{ adId: candidate\.adId, hasThumbnail: Boolean\(candidate\.thumbnailUrl\), thumbnailSource:/);
pass('candidate diagnostics expose only thumbnail presence/source, not the image URL');

assert.match(html, /id="inventoryCaptureResultDetails"/);
assert.match(app, /function renderInventoryCaptureResultDetails\(record\)/);
assert.match(app, /inventory-capture-result-card/);
assert.match(app, /loadLocalPreview\(cover, record, primaryImage\)/);
pass('single-inventory result has a dedicated persisted-record detail card with local cover image');

for (const expression of [
  /\['Kategorie', categoryLabel\(record\)\]/,
  /\['Art', artLabel\(record\)\]/,
  /\['Preis', displayPriceWithType\(record\)\]/,
  /\['Endet am', endDateWithRelativeLabel\(record\)\]/,
  /\[listingDatePresentation\(record\)\.label, listingDateLabel\(record\)\]/,
  /Gespeichert \$\{formatDate\(record\.capturedAt\)\}/,
  /ID \$\{record\.adId\}/
]) assert.match(app, expression);
pass('result detail card mirrors the inventory overview facts plus saved timestamp and ad id');

const persistedResultOwner = ['1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version) ? captureController : app;
assert.match(persistedResultOwner, /await refreshInventories\(\);[\s\S]*?const persistedRecord = (?:getCurrentRecords\(\)|currentRecords)\.find/);
assert.match(persistedResultOwner, /setInventoryCaptureResult\('success'[\s\S]*?, persistedRecord\);/);
pass('success result is rendered from the persisted/refreshed inventory record');

assert.match(css, /\.inventory-capture-result-card\s*\{/);
assert.match(css, /grid-template-columns:112px minmax\(0,1fr\)/);
assert.match(css, /\.inventory-capture-result-cover\s*\{[^}]*object-fit:cover;/s);
assert.match(css, /\.inventory-capture-result-fact\s*\{/);
pass('result detail card has bounded responsive layout and thumbnail styling');

console.log(`${n} v1.16.3 single-inventory result/thumbnail contract groups passed`);
