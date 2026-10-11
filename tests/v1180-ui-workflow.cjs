const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('app.html', 'utf8');
const css = fs.readFileSync('app.css', 'utf8');
const js = require('./v12210-source-surface.cjs') + '\n' + fs.readFileSync('mass-renewal-ui-controller.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
let failures = 0;
let passes = 0;
function check(label, fn) {
  try { fn(); passes += 1; console.log(`PASS ${label}`); }
  catch (error) { failures += 1; console.error(`FAIL ${label}: ${error.message}`); }
}
check('v1.18.0 version and existing taskbar identity are preserved', () => {
  assert.ok(['1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version));
  assert.equal(manifest.name, 'kleinanzeigen Manager');
  assert.equal(manifest.action.default_title, 'Kleinanzeigen Renewal');
});
check('diagnostic status collapses completely while empty', () => {
  assert.match(css, /#diagnosticZipStatus:empty\s*\{[^}]*display\s*:\s*none/i);
  assert.doesNotMatch(css, /#diagnosticZipStatus\s*\{[^}]*min-height/i);
});
check('mass renewal has four steps including explicit order panel', () => {
  assert.match(html, /data-mass-step="1"[\s\S]*Anzeigen auswählen[\s\S]*data-mass-step="2"[\s\S]*Reihenfolge festlegen[\s\S]*data-mass-step="3"[\s\S]*Neu inserieren[\s\S]*data-mass-step="4"[\s\S]*Übersicht/);
  assert.match(html, /id="massRenewalOrderPanel"/);
  assert.match(html, /id="massRenewalOrderList"/);
  assert.match(html, /id="massRenewalNext"/);
  assert.match(html, /id="massRenewalBack"/);
});
check('mass selection supports whole-row toggling without checkbox double-toggle', () => {
  assert.match(js, /row\.dataset\.massInventoryId\s*=\s*String\(record\.inventoryId\)/);
  assert.match(js, /row\.addEventListener\(['"]click['"]/);
  assert.match(js, /event\.target\.closest\(['"]input/);
  assert.match(css, /\.mass-renewal-table tbody tr\.mass-renewal-selectable-row\s*\{[^}]*cursor\s*:\s*pointer/i);
  assert.match(css, /\.mass-renewal-table tbody tr\.mass-renewal-selectable-row\.selected/);
});
check('order list supports drag-and-drop plus up/down controls and feeds batch order', () => {
  assert.match(js, /let massRenewalOrderedIds\s*=\s*\[\]/);
  assert.match(js, /draggable\s*=\s*true/);
  assert.match(js, /dragstart/);
  assert.match(js, /dragover/);
  assert.match(js, /Nach oben/);
  assert.match(js, /Nach unten/);
  assert.match(js, /const inventoryIds = \[\.\.\.massRenewalOrderedIds\]/);
});
check('trash ZIP backup and app-styled scrollbars are present', () => {
  assert.match(js, /USER_TRASH_EXPORT_CLICK/);
  assert.match(js, /USER_TRASH_EXPORT_SUCCEEDED/);
  assert.match(js, /exportInventoryRecord\(record\)/);
  assert.match(css, /scrollbar-color\s*:/i);
  assert.match(css, /::-webkit-scrollbar-thumb/);
});
if (failures) {
  console.error(`${failures} v1.18.0 contract group(s) failed; ${passes} passed`);
  process.exit(1);
}
console.log(`${passes} v1.18.0 contract groups passed`);
