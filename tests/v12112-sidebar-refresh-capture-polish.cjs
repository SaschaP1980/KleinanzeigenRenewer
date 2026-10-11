const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app-layout-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'inventory-capture-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'src/app/inventory-candidate-model.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'src/app/inventory-capture-view.js'), 'utf8');
const actions = fs.readFileSync(path.join(root, 'actions-diagnostics-controller.js'), 'utf8');
const actionCode = js + '\n' + actions;
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
let pass = 0;
function check(name, fn) { fn(); console.log(`PASS ${name}`); pass += 1; }
check('v1.21.12+ retained', () => assert.ok(['1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(manifest.version)));
check('sidebar height uses shared bottom-gap geometry contract', () => {
  assert.match(css, /--app-shell-bottom-gap\s*:\s*28px/);
  assert.match(css, /\.app-shell\s*\{[^}]*padding:\s*var\(--app-shell-top-gap\)\s+24px\s+var\(--app-shell-bottom-gap\)/s);
  assert.match(css, /\.control-panel\s*\{[^}]*min-height:\s*calc\(100vh\s*-\s*var\(--app-content-sticky-top\)\s*-\s*var\(--app-shell-bottom-gap\)\s*-\s*1px\)/s);
});
check('message history keeps a visible bottom border at max scroll', () => {
  assert.match(css, /\.message-history-list\s*\{[^}]*padding-bottom:\s*2px/s);
  assert.match(css, /\.message-history-list\s*\{[^}]*scroll-padding-bottom:\s*2px/s);
  assert.match(css, /\.message-history-list\s*\{[^}]*box-sizing:\s*border-box/s);
});
check('global refresh has explicit busy and success feedback', () => {
  assert.match(html, /id="refreshButton"[^>]*aria-label="Ansicht und Kontostatus aktualisieren"[^>]*title="Ansicht und Kontostatus aktualisieren"/);
  assert.match(css, /content-view-refresh-button\.is-refreshing/);
  assert.match(css, /content-view-refresh-button\.is-success/);
  assert.match(js, /setGlobalRefreshVisual/);
  assert.match(js, /Wird aktualisiert/);
  assert.match(js, /Ansicht aktualisiert/);
});
check('content section titles render count inline with title', () => {
  assert.match(css, /\.inventory-section \.section-title > div:first-child\s*\{[^}]*display:\s*flex[^}]*align-items:\s*baseline/s);
  assert.match(css, /\.inventory-section \.section-title p::before\s*\{[^}]*content:\s*['"]·['"]/s);
});
check('single capture candidates are classified locally by stable ad id', () => {
  assert.match(js, /function inventoryCaptureCandidateStorageState\(adId\)/);
  assert.match(js, /snapshot\.inventoryIds\?\.has\?\./);
  assert.match(js, /snapshot\.trashIds\?\.has\?\./);
  assert.match(js, /runtimeMessage\(scopedProfileMessage\('LIST_INVENTORIES'\)\)/);
  assert.match(js, /runtimeMessage\(scopedProfileMessage\('LIST_TRASH'\)\)/);
  assert.match(js, /return 'new'/);
  assert.match(js, /return 'trash'/);
});
check('candidate dialog renders NEU and PAPIERKORB badges without guessing unknown ids', () => {
  assert.match(css, /\.inventory-candidate-badge\.new/);
  assert.match(css, /\.inventory-candidate-badge\.trash/);
  assert.match(js, /badge\.textContent\s*=\s*storageState === 'new' \? 'NEU' : 'PAPIERKORB'/);
  assert.match(js, /if \(selectable && \(storageState === 'new' \|\| storageState === 'trash'\)\)/);
});
check('bottom diagnostics remain until sidebar fix is natively verified', () => {
  assert.match(js, /UI_SIDEBAR_BOTTOM_REACHED/);
  assert.match(js, /UI_SIDEBAR_GEOMETRY_CHANGED/);
});
check('actions diagnostics remain active', () => {
  assert.match(actionCode, /UI_ACTIONS_STATE_SNAPSHOT/);
  assert.match(actionCode, /UI_ACTION_ATTEMPT/);
});
console.log(`${pass}/9 PASS`);
