const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app-layout-controller.js'), 'utf8') + '\n' + require('./v12210-source-surface.cjs');
const actionsDiagnostics = fs.readFileSync(path.join(root, 'actions-diagnostics-controller.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const zipIcon = path.join(root, 'icons', 'action-zip-export.svg');
let pass = 0;
function check(name, fn) { fn(); console.log(`PASS ${name}`); pass += 1; }
check('v1.21.10+ retained', () => assert.ok(['1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version)));
check('global account status has relaxed width and higher header placement', () => {
  assert.match(css, /\.app-header-side\s*\{[^}]*max-width:\s*none/);
  assert.match(css, /\.global-account-status\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(css, /\.global-account-status\s*\{[^}]*transform:\s*translateY\(-\d+(?:\.\d+)?px\)/);
  assert.doesNotMatch(css, /\.global-account-status \.profile-detected-text\s*\{[^}]*text-overflow:\s*ellipsis/);
});
check('profile select typography is compact without a foreign font', () => {
  assert.match(css, /\.profile-select\s*\{[^}]*font-size:\s*10px/);
  assert.match(css, /\.profile-select\s*\{[^}]*letter-spacing:\s*-?\.0?\d+em/);
  assert.doesNotMatch(css, /\.profile-select\s*\{[^}]*font-family:\s*[^;}]*(?:Narrow|Condensed)/i);
});
check('sidebar sticky position uses the dynamically measured app content target', () => {
  assert.match(css, /\.control-panel\s*\{[^}]*top:\s*var\(--app-content-sticky-top\)/);
  assert.match(js, /--app-content-sticky-top/);
  assert.match(js, /appHeader\?\.getBoundingClientRect\?\.\(\)\.bottom/);
});
check('detail ZIP export is a real action in the right stack', () => {
  assert.match(js, /actions\.append\(createButton, updateButton, exportButton, deleteButton\)/);
  assert.match(css, /\.inventory-actions \.inventory-export-button\s*\{[^}]*position:\s*static/);
  assert.match(css, /\.inventory-actions \.inventory-export-button\s*\{[^}]*min-height:\s*31px/);
});
check('compact inventory view has a dedicated ZIP export icon action in order', () => {
  assert.ok(fs.existsSync(zipIcon), 'ZIP icon file missing');
  const icon = fs.readFileSync(zipIcon, 'utf8');
  assert.match(icon, /<svg/);
  assert.match(css, /\.compact-action-icon\.action-zip-export[^}]*action-zip-export\.svg/);
  assert.match(js, /makeCompactIconButton\(\{\s*icon:\s*'zip-export',[\s\S]{0,180}label:\s*'Als ZIP exportieren'/);
  assert.match(js, /actions\.append\(createButton, updateButton, exportButton, deleteButton\)/);
  assert.match(js, /actions\.append\(finishButton, updateButton, exportButton, deleteButton\)/);
});
check('message dock is positioned after diagnostics in the sidebar', () => {
  const diagnosticsAt = html.indexOf('id="diagnosticsAccordion"');
  const dockAt = html.indexOf('id="messageDock"');
  assert.ok(diagnosticsAt >= 0 && dockAt > diagnosticsAt, `expected message dock after diagnostics, got diagnostics=${diagnosticsAt}, dock=${dockAt}`);
});
check('temporary sticky diagnostics remain removed while actions diagnostics remain active', () => {
  assert.doesNotMatch(js, /UI_STICKY_(?:PINNED|UNPINNED|GEOMETRY_SAMPLE|WHEEL_SAMPLE|OSCILLATION_DETECTED)/);
  assert.match(actionsDiagnostics, /UI_ACTIONS_STATE_SNAPSHOT/);
  assert.match(actionsDiagnostics, /UI_ACTION_ATTEMPT/);
});
console.log(`${pass}/8 PASS`);
