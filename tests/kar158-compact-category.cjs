'use strict';
// KAR-158: compact category classification, shared inventory/trash presentation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

class TestElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.className = '';
    this.title = '';
    this.textContent = '';
    this.tabIndex = -1;
  }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener() {}
  closest() { return null; }
}
const document = { createElement: tag => new TestElement(tag) };
const modules = {};
const sandbox = { document, Element: TestElement, KRDeps: { register(name, api) { modules[name] = api; } } };
sandbox.globalThis = sandbox;
for (const name of ['shared-ui-helpers', 'inventory-formatting', 'record-card-view']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, 'src/app', name + '.js'), 'utf8'), sandbox, { filename: name + '.js' });
}
const helpers = modules.KRSharedUiHelpers.create({ document });
const formatting = modules.KRInventoryFormatting.create({ sharedUiHelpers: helpers });
const view = modules.KRRecordCardView.create({ document, Element: TestElement, formatting });
const field = (label, displayValue, technicalValue = '') => ({ label, displayValue, technicalValue });
const record = (title, categoryPath, dynamicAttributes, additional = {}) => ({
  inventoryId: 'i-001', adId: '3567032216', title,
  category: categoryPath == null ? null : { path: categoryPath },
  dynamicAttributes, images: [], price: { displayed: '55 €' },
  listingMeta: { endDateDisplay: '08.01.2027' }, ...additional
});
function compactCategory(value, trash = false) {
  const { row, actions } = view.createCompactListRow(value, { trash });
  assert.equal(row.children.length, 3, 'image/main/actions hierarchy preserved');
  assert.equal(row.children[2], actions, 'action element remains separate');
  const main = row.children[1];
  assert.equal(main.className, 'compact-list-main');
  assert.equal(main.children.length, 3, 'category/title/metadata hierarchy preserved');
  const categoryLine = main.children[0];
  assert.equal(categoryLine.className, 'compact-list-category-line');
  assert.equal(main.children[1].className, 'compact-list-title-line');
  assert.equal(main.children[2].className, 'compact-list-meta');
  assert.equal(main.children[1].children[0].textContent, value.title);
  assert.equal(main.children[2].children[0].textContent, value.price.displayed);
  return { text: categoryLine.textContent, tooltip: categoryLine.title, row };
}
function check(name, entry, expected) {
  const unchanged = JSON.stringify(entry);
  const inventory = compactCategory(entry);
  const trash = compactCategory(entry, true);
  assert.equal(inventory.text, expected, name + ' inventory');
  assert.equal(inventory.tooltip, expected, name + ' untruncated tooltip');
  assert.equal(trash.text, expected, name + ' trash');
  assert.equal(trash.tooltip, expected, name + ' trash tooltip');
  assert.ok(!inventory.row.className.includes('trash-card'));
  assert.ok(trash.row.className.includes('trash-card'));
  assert.equal(JSON.stringify(entry), unchanged, 'display must not mutate the saved record');
  console.log('PASS KAR-158 ' + name);
}
check('owner shoe: full category + saved Art',
  record('adidas Gazelle', ['Mode & Beauty', 'Damenschuhe'], [field('Art', 'Sneaker & Sportschuhe')]),
  'Mode & Beauty › Damenschuhe › Sneaker & Sportschuhe');
check('bathrobe: saved Typ, not inferred title',
  record('Bademantel', ['Familie, Kind & Baby', 'Baby- & Kinderkleidung'], [field('Typ', 'Unterwäsche')]),
  'Familie, Kind & Baby › Baby- & Kinderkleidung › Unterwäsche');
check('bike tube: first saved Art wins',
  record('Fahrradschlauch', ['Auto, Rad & Boot', 'Fahrräder & Zubehör'], [field('Art', 'Zubehör'), field('Typ', 'Cityräder')]),
  'Auto, Rad & Boot › Fahrräder & Zubehör › Zubehör');
check('reverse field order selects Typ',
  record('Fahrradschlauch', ['Auto, Rad & Boot', 'Fahrräder & Zubehör'], [field('Typ', 'Cityräder'), field('Art', 'Zubehör')]),
  'Auto, Rad & Boot › Fahrräder & Zubehör › Cityräder');
check('missing article type omits separator',
  record('Other', ['Kategorie A', 'Kategorie B'], [field('Zustand', 'Neu')]),
  'Kategorie A › Kategorie B');
check('conflicting saved duplicate labels fail neutral',
  record('Other', ['Mode & Beauty', 'Damenschuhe'], [field('Art', 'Sneaker'), field('ART', 'Sandalen')]),
  'Mode & Beauty › Damenschuhe');
check('exact existing final category segment is not duplicated',
  record('Other', ['Mode & Beauty', 'Sneaker & Sportschuhe'], [field('Art', 'Sneaker & Sportschuhe')]),
  'Mode & Beauty › Sneaker & Sportschuhe');
check('missing category remains neutral',
  record('Other', null, [field('Art', 'Sneaker & Sportschuhe')]),
  '–');
check('legacy categoryPath fallback',
  record('Legacy', null, [field('Typ', 'Unterwäsche')], { categoryPath: ['Familie, Kind & Baby', 'Kinderkleidung'] }),
  'Familie, Kind & Baby › Kinderkleidung › Unterwäsche');
check('long full path remains accessible via tooltip',
  record('Very long item', ['Familie, Kind & Baby', 'Baby- & Kinderkleidung', 'Oberbekleidung & Sets'], [field('Typ', 'Unterwäsche')]),
  'Familie, Kind & Baby › Baby- & Kinderkleidung › Oberbekleidung & Sets › Unterwäsche');

const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
assert.match(css, /\.compact-list-row\s*\{[^}]*minmax\(0,1fr\)/s, 'compact grid keeps min-width-safe content column');
assert.match(css, /\.compact-list-category-line\s*\{[^}]*overflow:hidden;[^}]*text-overflow:ellipsis;[^}]*white-space:nowrap;/s,
  'long classification remains a single truncated line');
console.log('PASS KAR-158 compact category/tooltip/DOM and CSS contract');
