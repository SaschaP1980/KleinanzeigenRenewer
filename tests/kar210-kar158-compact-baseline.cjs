'use strict';
// KAR-158: compact category classification, shared inventory/trash presentation.
const assert = require('node:assert/strict');
const test=require('node:test');
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

test('historical compact inventory and trash preserve layout, exact saved leaf and source record',()=>{
 for(const [entry,expected] of [
 [record('adidas Gazelle',['Mode & Beauty','Damenschuhe'],[field('Art','Sneaker & Sportschuhe')]),'Damenschuhe'],
 [record('Bademantel',['Familie, Kind & Baby','Baby- & Kinderkleidung'],[field('Typ','Unterwäsche')]),'Baby- & Kinderkleidung'],
 [record('Other',null,[field('Art','Sneaker & Sportschuhe')]),'–'],
 [record('Legacy',null,[],{categoryPath:['Familie, Kind & Baby','Kinderkleidung']}),'Kinderkleidung']
 ]){
 const unchanged=JSON.stringify(entry),inventory=compactCategory(entry),trash=compactCategory(entry,true);
 assert.equal(inventory.text,expected);assert.equal(trash.text,expected);
 assert.ok(!inventory.row.className.includes('trash-card'));assert.ok(trash.row.className.includes('trash-card'));
 assert.equal(JSON.stringify(entry),unchanged);
 }
});
test('original compact width and truncation CSS contracts',()=>{
const css = fs.readFileSync(path.join(root, 'src/app/app.css'), 'utf8');
assert.match(css, /\.compact-list-row\s*\{[^}]*minmax\(0,1fr\)/s, 'compact grid keeps min-width-safe content column');
assert.match(css, /\.compact-list-category-line\s*\{[^}]*overflow:hidden;[^}]*text-overflow:ellipsis;[^}]*white-space:nowrap;/s,
  'long classification remains a single truncated line');

});
