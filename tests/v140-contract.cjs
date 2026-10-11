const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const background = require('./v12215-source-surface.cjs');
const diagnosticsService = fs.readFileSync(path.join(root, 'diagnostics-service.js'), 'utf8');
const app = require('./v12210-source-surface.cjs') + '\n' + fs.readFileSync(path.join(root, 'tab-page-inspection-controller.js'), 'utf8');
const appHtml = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const appCss = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const runner = fs.readFileSync(path.join(root, 'inventory-runner.js'), 'utf8');
const filler = fs.readFileSync(path.join(root, 'template-filler.js'), 'utf8');
const packaging = fs.readFileSync(path.join(root, 'scripts/package.py'), 'utf8');
let n = 0;
const pass = name => { n += 1; console.log('PASS ' + name); };

assert.ok(['1.4.0','1.5.0','1.5.1','1.6.0','1.6.1','1.6.2','1.7.0','1.7.1','1.8.0','1.8.1','1.8.2','1.8.3','1.8.4','1.8.5','1.8.6','1.8.7','1.8.8','1.8.9','1.8.10','1.8.11','1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(manifest.version));
assert.deepEqual(manifest.permissions.sort(), ['activeTab', 'storage', 'unlimitedStorage', 'scripting'].sort());
pass('v1.4.0 retains the fixed permission surface');

assert.match(filler, /clean\(button\.textContent\) === 'Anzeige aufgeben'/);
assert.match(filler, /visible\(button\)/);
assert.doesNotMatch(filler, /normalizeText\(button\.textContent\)|isVisible\(button\)/);
assert.match(filler, /PUBLISH_BUTTON_SCROLL_FAILED/);
assert.match(filler, /Komfort-Fallback/);
pass('publish-button scrolling uses existing helpers and cannot invalidate a verified fill');

assert.match(appHtml, /Diagnosedaten herunterladen/);
assert.match(appHtml, /diagnostic-zip\.js/);
assert.match(packaging, /diagnostic-zip\.js/);
assert.match(background, /GET_DIAGNOSTIC_EXPORT/);
assert.match(background, /diagnostics\.jsonl/);
assert.match(background, /errors\.json/);
assert.match(background, /inventory-summary\.json/);
assert.match(background, /DIAGNOSTIC_RETENTION_MS/);
assert.match(diagnosticsService, /csrf\|cookie\|password/);
assert.match(diagnosticsService, /redactEmbeddedSecrets/);
assert.match(diagnosticsService, /access\[_-\]\?token/);
pass('persistent structured diagnostics and ZIP export are wired and redacted');

assert.match(app, /TAB_CONNECTION_RECOVERED/);
assert.match(app, /Receiving end does not exist/);
assert.match(app, /ENSURE_CONTENT_CONNECTION/);
assert.match(app, /TAB_MESSAGE_FAILED/);
pass('app waits and retries transient content-script connection failures');

assert.match(appCss, /\.inventory-list \{ display:grid; grid-template-columns:1fr;/);
assert.match(appCss, /\.inventory-card\.compact-card \{ display:grid; grid-template-columns:minmax\(0,1fr\) 220px;/);
assert.match(app, /makeInfoLine\('Endet am', endDateWithRelativeLabel\(record\)\)/);
pass('inventory is a one-column row list with visible end date');

assert.match(runner, /function endDateFromRoot/);
assert.match(runner, /Endet\\s\+am/);
assert.match(runner, /endDateDisplay: listing\.endDateDisplay/);
assert.match(background, /extracted\.listingMeta =/);
assert.match(background, /source:\s*(?:'my-ads-card\+edit'|derivedListingDate\s*\?[\s\S]*?'my-ads-card\+edit')/);
pass('Meine Anzeigen end date is carried into the persisted inventory record');

for (const event of ['USER_NEW_LISTING_CLICK','USER_DELETE_INVENTORY_CLICK','USER_RETRY_INVENTORY_CLICK','USER_BULK_INVENTORY_CLICK','USER_DIAGNOSTIC_ZIP_CLICK']) {
  assert.match(app, new RegExp(event));
}
assert.match(background, /TEMPLATE_FILL_STAGE/);
assert.match(background, /BULK_STAGE/);
assert.match(background, /BULK_ITEM_FINISHED/);
pass('automatic stages and app user actions are structured diagnostic events');

assert.doesNotMatch(background + app + runner + filler, /Anzeige aufgeben[^\n]{0,180}\.click\s*\(/i);
pass('v1.4.0 does not add automatic publication');

console.log(`${n} v1.4.0 contract groups passed`);
