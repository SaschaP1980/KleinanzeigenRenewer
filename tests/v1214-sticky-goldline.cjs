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

ok('natural sticky wrapper preserves pre-sticky visual styling', () => {
  const base = css.match(/\.list-sticky-header\s*\{([^}]*)\}/s)?.[1] || '';
  assert.match(base, /position:relative/);
  assert.doesNotMatch(base, /background\s*:/);
  assert.doesNotMatch(base, /box-shadow\s*:/);
  assert.doesNotMatch(base, /border(?:-bottom)?\s*:/);
  assert.doesNotMatch(base, /padding\s*:/);
  assert.doesNotMatch(base, /margin(?:-bottom)?\s*:/);
  assert.doesNotMatch(css, /\.list-sticky-header \.section-title\s*\{/);
  assert.doesNotMatch(css, /\.inventory-list-sticky-header \.inventory-toolbar\s*\{/);
  assert.doesNotMatch(css, /\.trash-list-sticky-header \.trash-intro\s*\{/);
});

ok('elevation exists only while header is pinned', () => {
  const stuck = css.match(/\.list-sticky-header\.is-stuck\s*\{([^}]*)\}/s)?.[1] || '';
  assert.match(stuck, /background\s*:/);
  assert.match(stuck, /box-shadow\s*:/);
  assert.doesNotMatch(stuck, /padding\s*:/);
  assert.doesNotMatch(stuck, /margin\s*:/);
});

ok('trash retention copy condenses only while sticky', () => {
  assert.match(html, /class="trash-intro-full">Einträge im Papierkorb werden 30 Tage lokal aufbewahrt\./);
  assert.match(html, /class="trash-intro-sticky">Papierkorb: Einträge werden 30 Tage lokal aufbewahrt\.<\/span>/);
  assert.match(css, /\.trash-intro-sticky\s*\{\s*display:none;/s);
  assert.match(css, /\.trash-list-sticky-header\.is-stuck \.trash-intro-full\s*\{\s*display:none;/s);
  assert.match(css, /\.trash-list-sticky-header\.is-stuck \.trash-intro-sticky\s*\{\s*display:inline;/s);
});

ok('sticky state is driven by actual scroll position', () => {
  assert.match(app, /function syncListStickyHeaders\(\)/);
  assert.match(app, /header\.classList\.add\('is-stuck'\)/);
  assert.match(app, /header\.classList\.remove\('is-stuck'\)/);
  assert.match(app, /window\.addEventListener\('scroll',[\s\S]{0,220}scheduleListStickyHeaderSync\(\)[\s\S]{0,220}\{ passive:true \}\)/);
  assert.match(app, /window\.addEventListener\('resize',[\s\S]{0,220}scheduleListStickyHeaderSync\(\)[\s\S]{0,220}\{ passive:true \}\)/);
});

ok('trash compacting preserves a geometry-stable slot to avoid list jump', () => {
  assert.match(html, /class="list-sticky-slot trash-sticky-slot"/);
  assert.doesNotMatch(html, /list-sticky-flow-spacer/);
  assert.match(app, /slot\.style\.height = `\$\{Math\.round\(headerRect\.height \* 100\) \/ 100\}px`/);
  assert.match(app, /header\.classList\.add\('is-stuck'\)/);
  assert.match(app, /header\.classList\.remove\('is-stuck'\)[\s\S]*?slot\.style\.height = ''/);
});

console.log(`${pass} v1.21.4 sticky gold-line checks passed`);
