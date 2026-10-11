const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('app-layout-controller.js') + '\n' + read('app.js');
const html = read('app.html');
const css = read('app.css');
let pass = 0;
const ok = (label, fn) => { fn(); pass += 1; console.log('PASS', label); };

ok('sticky sections use independent sentinels before headers', () => {
  assert.match(html, /inventory-sticky-sentinel[\s\S]*?inventory-sticky-slot[\s\S]*?inventory-list-sticky-header[\s\S]*?id="inventoryList"/);
  assert.match(html, /trash-sticky-sentinel[\s\S]*?trash-sticky-slot[\s\S]*?trash-list-sticky-header[\s\S]*?id="trashList"/);
});

ok('sticky state is driven by sentinel geometry, not self-measurement', () => {
  const start = app.indexOf('function syncListStickyHeaders()');
  const end = app.indexOf('\nfunction scheduleListStickyHeaderSync()', start);
  const fn = app.slice(start, end);
  assert.match(fn, /sentinelTop = sentinel\.getBoundingClientRect\(\)\.top/);
  assert.match(fn, /setStickyHeaderPinned\(ctx, [^;]*sentinelTop < threshold\)/);
  assert.doesNotMatch(fn, /headerTop|sectionTop/);
});

ok('geometry compensation is isolated in the stable slot and cannot move the sentinel', () => {
  assert.match(app, /slot\.style\.height = `\$\{Math\.round\(headerRect\.height \* 100\) \/ 100\}px`/);
  assert.doesNotMatch(html, /list-sticky-flow-spacer/);
  assert.match(css, /\.list-sticky-slot\s*\{[^}]*overflow-anchor:none;/s);
});

ok('stuck header no longer uses a flat black rectangle', () => {
  const stuck = css.match(/\.list-sticky-header\.is-stuck\s*\{([^}]*)\}/s)?.[1] || '';
  assert.doesNotMatch(stuck, /background\s*:\s*#0f1417\s*;/);
  assert.match(stuck, /background:var\(--app-canvas-background\)/);
  assert.match(stuck, /background-attachment:fixed/);
  assert.match(stuck, /box-shadow/);
});

ok('trash retention compact copy remains tied to pinned state only', () => {
  assert.match(css, /\.trash-intro-sticky\s*\{\s*display:none;/s);
  assert.match(css, /\.trash-list-sticky-header\.is-stuck \.trash-intro-full\s*\{\s*display:none;/s);
  assert.match(css, /\.trash-list-sticky-header\.is-stuck \.trash-intro-sticky\s*\{\s*display:inline;/s);
});

ok('scroll and resize preserve sentinel sync while allowing targeted bottom diagnostics', () => {
  assert.match(app, /window\.addEventListener\('scroll',[\s\S]{0,260}scheduleListStickyHeaderSync\(\)[\s\S]{0,260}recordSidebarBottomDiagnostics\('scroll'\)[\s\S]{0,180}\{ passive:true \}\)/);
  assert.match(app, /window\.addEventListener\('resize',[\s\S]{0,260}scheduleListStickyHeaderSync\(\)[\s\S]{0,260}recordSidebarBottomDiagnostics\('resize'\)[\s\S]{0,180}\{ passive:true \}\)/);
});

console.log(`${pass} v1.21.5 sticky scroll hardening checks passed`);
