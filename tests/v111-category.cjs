const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const code = fs.readFileSync(path.join(__dirname, '../template-filler.js'), 'utf8');
const ctx = {};
vm.runInNewContext(code, ctx);
const api = ctx.KRTemplateFill;
let n = 0;
const pass = name => { n += 1; console.log('PASS ' + name); };

assert.equal(api.TARGET_PATH, '/p-anzeige-aufgeben-schritt2.html');
assert.equal(api.CATEGORY_PATH, '/p-kategorie-aendern.html');
assert.notEqual(api.TARGET_PATH, api.CATEGORY_PATH);
pass('new-ad and legacy category pages are both explicit fill lifecycle pages');

const pathLabels = ['Mode & Beauty', 'Damenbekleidung'];
assert.equal(api.deepestVisibleCategoryPathIndex(['Mode & Beauty'], pathLabels), 0);
assert.equal(api.deepestVisibleCategoryPathIndex(['Damenbekleidung'], pathLabels), 1);
assert.equal(api.deepestVisibleCategoryPathIndex(['Mode & Beauty', 'Damenbekleidung'], pathLabels), 1);
assert.equal(api.deepestVisibleCategoryPathIndex(['Elektronik'], pathLabels), -1);
pass('deepest currently visible category-path segment is selected without replaying parent levels');

assert.equal(api.deepestVisibleCategoryPathIndex(['  DAMENBEKLEIDUNG  '], pathLabels), 1);
pass('category path matching is whitespace-normalized and case-insensitive');

console.log(`${n} v1.1.1 category-lifecycle logic tests passed`);
