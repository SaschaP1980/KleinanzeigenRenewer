const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('app.js') + '\n' + read('app-layout-controller.js');
const actionsDiagnostics = read('actions-diagnostics-controller.js');
const html = read('app.html');
const css = read('app.css');
let pass = 0;
const ok = (label, fn) => { fn(); pass += 1; console.log('PASS', label); };

ok('sticky headers live inside geometry-stable slots with no flow spacer', () => {
  assert.match(html, /inventory-sticky-sentinel[\s\S]*?inventory-sticky-slot[\s\S]*?inventory-list-sticky-header[\s\S]*?id="inventoryList"/);
  assert.match(html, /trash-sticky-sentinel[\s\S]*?trash-sticky-slot[\s\S]*?trash-list-sticky-header[\s\S]*?id="trashList"/);
  assert.doesNotMatch(html, /list-sticky-flow-spacer/);
});

ok('pinned header is fixed over a slot and scroll anchoring is disabled', () => {
  assert.match(css, /\.list-sticky-slot\s*\{[^}]*overflow-anchor:none;/s);
  assert.match(css, /\.list-sticky-header\s*\{[^}]*overflow-anchor:none;/s);
  const stuck = css.match(/\.list-sticky-header\.is-stuck\s*\{([^}]*)\}/s)?.[1] || '';
  assert.match(stuck, /position:fixed/);
  assert.match(stuck, /left:var\(--list-sticky-left\)/);
  assert.match(stuck, /width:var\(--list-sticky-width\)/);
});

ok('body and fixed sticky layer share one canvas background contract', () => {
  assert.match(css, /--app-canvas-background:/);
  assert.match(css, /body\s*\{[^}]*background:var\(--app-canvas-background\)/s);
  const stuck = css.match(/\.list-sticky-header\.is-stuck\s*\{([^}]*)\}/s)?.[1] || '';
  assert.match(stuck, /background:var\(--app-canvas-background\)/);
  assert.doesNotMatch(stuck, /34vw|rgba\(15,20,23,\.96\)/);
});

ok('pinning freezes natural slot height without dynamic spacer compensation', () => {
  assert.match(app, /slot\.style\.height = `\$\{Math\.round\(headerRect\.height \* 100\) \/ 100\}px`/);
  assert.match(app, /header\.classList\.add\('is-stuck'\)/);
  assert.match(app, /header\.classList\.remove\('is-stuck'\)[\s\S]*?slot\.style\.height = ''/);
  assert.doesNotMatch(app, /compactHeight|StickyFlowSpacer|spacer\.style\.height/);
});

ok('temporary sticky diagnostics are retired after successful native acceptance', () => {
  for (const event of ['UI_STICKY_PINNED','UI_STICKY_UNPINNED','UI_STICKY_GEOMETRY_SAMPLE','UI_STICKY_WHEEL_SAMPLE','UI_STICKY_OSCILLATION_DETECTED']) {
    assert.ok(!app.includes(event), `retired sticky diagnostic still present: ${event}`);
  }
  assert.doesNotMatch(app, /captureStickyWheel|stickyDiagnosticsState|stickyGeometrySnapshot/);
});

ok('actions diagnostics remain active while sticky tracing is retired', () => {
  for (const event of ['UI_ACTIONS_STATE_SNAPSHOT','UI_ACTION_ATTEMPT','UI_ACTION_STATE_DESYNC_DETECTED']) {
    assert.ok(actionsDiagnostics.includes(event), `missing actions diagnostic ${event}`);
  }
});

ok('trash amber copy remains compact only on the visible pinned layer', () => {
  assert.match(css, /\.trash-intro-sticky\s*\{\s*display:none;/s);
  assert.match(css, /\.trash-list-sticky-header\.is-stuck \.trash-intro-full\s*\{\s*display:none;/s);
  assert.match(css, /\.trash-list-sticky-header\.is-stuck \.trash-intro-sticky\s*\{\s*display:inline;/s);
});

console.log(`${pass} v1.21.6 fixed-slot diagnostic checks passed`);
