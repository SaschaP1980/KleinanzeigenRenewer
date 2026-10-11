const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const app = require('./v12210-source-surface.cjs') + '\n' + read('shared-ui-helpers.js');
const actionsDiagnostics = read('actions-diagnostics-controller.js');
const html = read('app.html');
const css = read('app.css');
let pass = 0;
const ok = (label, fn) => { fn(); pass += 1; console.log('PASS', label); };

ok('view controls use end-user terminology', () => {
  for (const [id, label] of [
    ['globalViewDetailed', 'Kachelansicht'],
    ['globalViewCompact', 'Listenansicht']
  ]) {
    assert.match(html, new RegExp(`id="${id}"[^>]*aria-label="${label}"[^>]*title="${label}"`));
  }
  assert.doesNotMatch(html, /aria-label="Kachel mit Details"|aria-label="Schmal"|aria-label="Detailansicht"|aria-label="Kompakte Ansicht"/);
});

ok('inventory and trash controls are wrapped in sticky section headers', () => {
  assert.match(html, /id="inventorySection"[\s\S]*?class="list-sticky-header inventory-list-sticky-header"[\s\S]*?class="section-title"[\s\S]*?class="inventory-toolbar"[\s\S]*?<div id="inventoryList"/);
  assert.match(html, /id="trashSection"[\s\S]*?class="list-sticky-header trash-list-sticky-header"[\s\S]*?class="section-title"[\s\S]*?class="trash-intro"[\s\S]*?<div id="trashList"/);
  assert.match(css, /\.list-sticky-slot\s*\{[^}]*overflow-anchor:none;/s);
  assert.match(css, /\.list-sticky-header\.is-stuck\s*\{[^}]*position:fixed;[^}]*top:var\(--list-sticky-top\);[^}]*z-index:/s);
});

ok('compact meta uses stable price column and left aligned time column', () => {
  assert.match(css, /\.compact-list-meta\s*\{[^}]*grid-template-columns:var\(--compact-price-column\) minmax\(0,1fr\);[^}]*column-gap:/s);
  assert.match(css, /--compact-price-column:150px/);
  assert.doesNotMatch(css, /\.compact-list-meta-end\s*\{[^}]*text-align:right/s);
});

ok('trash compact row shows retention deadline instead of listing end date', () => {
  const start = app.indexOf('function createCompactListRow');
  const end = app.indexOf('\nfunction setCompactButtonsBusy', start);
  const fn = app.slice(start, end);
  assert.match(fn, /trash \? trashRetentionPresentation\(record\) : `Endet am \$\{endDateWithRelativeLabel\(record\)\}`/);
  assert.match(app, /function trashRetentionPresentation\(record\)/);
  assert.match(app, /Im Papierkorb bis/);
});

ok('transient account checks avoid replacing action DOM when effective binding is unchanged', () => {
  assert.match(app, /function accountBoundControlsNeedRefresh\(/);
  assert.match(app, /const controlsNeedRefresh = accountBoundControlsNeedRefresh\(previousBinding, binding\);/);
  assert.match(app, /const stableAllowedBinding = Boolean\(previousBinding\?\.allowed === true && binding\.allowed === true && !controlsNeedRefresh\);/);
  assert.match(app, /if \(controlsNeedRefresh \|\| \(force && !stableAllowedBinding\)\) refreshRenderedAccountBoundControls/);
  assert.match(app, /if \(!wasHealthy\) \{\s*transitionAccountGate\(\{ type: 'CHECK_STARTED'/s);
  assert.match(app, /reason: detected\?\.probed \? 'probe-confirmed' : 'page-status-confirmed',[\s\S]*?forceRender: !wasHealthy/s);
});

ok('card action interactions are diagnostically captured', () => {
  assert.match(actionsDiagnostics, /function installInteractionDiagnostics\(root, scope\)/);
  assert.match(actionsDiagnostics, /UI_ACTION_INTERACTION/);
  assert.match(actionsDiagnostics, /installInteractionDiagnostics\(inventorySection, 'inventory'\)/);
  assert.match(actionsDiagnostics, /installInteractionDiagnostics\(trashSection, 'trash'\)/);
});

console.log(`${pass} v1.21.3 sticky/retention/interaction checks passed`);
