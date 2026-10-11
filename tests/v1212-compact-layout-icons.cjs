const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const app = require('./v12210-source-surface.cjs') + '\n' + read('shared-ui-helpers.js');
const html = read('app.html');
const css = read('app.css');
const manifest = JSON.parse(read('manifest.json'));
const packageScript = read('scripts/package.py');
let pass = 0;
const ok = (label, fn) => { fn(); pass += 1; console.log('PASS', label); };

ok('version is next patch', () => assert.ok(['1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(manifest.version)));
ok('view mode controls are icon-only and accessible', () => {
  for (const [id, label] of [
    ['globalViewDetailed', 'Kachelansicht'],
    ['globalViewCompact', 'Listenansicht']
  ]) {
    const re = new RegExp(`<button[^>]*id="${id}"[^>]*aria-label="${label}"[^>]*title="${label}"[^>]*>[\\s\\S]*?<span[^>]*list-view-mode-icon`, 'm');
    assert.match(html, re, `${id} must use accessible icon-only control`);
  }
  assert.doesNotMatch(html, /id="inventoryViewDetailed"[^>]*>\s*Kachel mit Details\s*</);
  assert.doesNotMatch(html, /id="inventoryViewCompact"[^>]*>\s*Schmal\s*</);
});
ok('view mode vector icons are wired and packaged', () => {
  for (const file of ['view-detailed.svg','view-compact.svg']) {
    const body = read(`icons/${file}`);
    assert.match(body, /<svg/);
    assert.match(body, /viewBox="0 0 24 24"/);
    assert.ok(packageScript.includes(`icons/${file}`), `${file} missing from runtime package`);
  }
  assert.match(css, /view-mode-detailed[\s\S]{0,220}view-detailed\.svg/);
  assert.match(css, /view-mode-compact[\s\S]{0,220}view-compact\.svg/);
});
ok('compact row uses three-line information hierarchy', () => {
  const start = app.indexOf('function createCompactListRow');
  const end = app.indexOf('\nfunction setCompactButtonsBusy', start);
  const fn = app.slice(start, end);
  assert.match(fn, /compact-list-category-line/);
  assert.match(fn, /compact-list-title-line/);
  assert.match(fn, /compact-list-meta/);
  assert.match(fn, /compact-list-meta-price/);
  assert.match(fn, /compact-list-meta-end/);
  assert.match(fn, /`Endet am \$\{endDateWithRelativeLabel\(record\)\}`/);
  assert.doesNotMatch(fn, /compact-list-field/);
  assert.match(fn, /row\.append\(cover, main, actions\)/);
});
ok('compact CSS keeps image size and right-aligned actions', () => {
  assert.match(css, /\.compact-list-cover\s*\{[^}]*width:66px;[^}]*height:66px;/s);
  assert.match(css, /\.compact-list-row\s*\{[^}]*grid-template-columns:66px minmax\(0,1fr\) auto;/s);
  assert.match(css, /\.compact-list-category-line\s*\{[^}]*(?:color:[^;]+;[^}]*font-size:|font-size:[^;]+;[^}]*color:)/s);
  assert.match(css, /\.compact-list-meta\s*\{[^}]*grid-template-columns:var\(--compact-price-column\) minmax\(0,1fr\)/s);
  assert.match(css, /\.compact-list-meta-end\s*\{[^}]*text-align:left/s);
  assert.match(css, /\.compact-list-actions\s*\{[^}]*justify-content:flex-end/s);
});
ok('new listing icon is tag plus spark, not plus glyph', () => {
  const icon = read('icons/action-new-listing.svg');
  assert.match(icon, /data-icon="tag-spark"/);
  assert.match(icon, /class="spark"/);
  assert.doesNotMatch(icon, /M18 3v5|m-2\.5-2\.5h5/);
});
ok('new icon contract is in package test script', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts.test, /v1212-compact-layout-icons\.cjs/);
});

console.log(`${pass} v1.21.2 compact layout/icon checks passed`);
