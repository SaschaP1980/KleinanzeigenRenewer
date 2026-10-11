const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const code = fs.readFileSync(path.join(__dirname, '../form-extractor.js'), 'utf8');
const ctx = { URL };
vm.runInNewContext(code, ctx);

function tagged(value) {
  if (Array.isArray(value)) return [1, value.map(tagged)];
  if (value && typeof value === 'object') {
    return [0, Object.fromEntries(Object.entries(value).map(([key, item]) => [key, tagged(item)]))];
  }
  return [0, value];
}
function topLevel(object) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, tagged(value)]));
}

const props = topLevel({
  postListingPage: {
    editMode: true,
    adData: {
      id: 123,
      categoryId: 154,
      attributes: {
        'kleidung_damen.condition': { name: 'kleidung_damen.condition', value: 'like_new' }
      },
      images: [{
        dynamicRuleThumbnailUrl: 'https://img.kleinanzeigen.de/api/v1/prod-ads/images/aa/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?jwt=thumb',
        dynamicRuleXXLargeUrl: 'https://img.kleinanzeigen.de/api/v1/prod-ads/images/aa/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?jwt=large',
        title: null
      }]
    },
    address: { location: { id: 1759, name: 'Testort', zipCode: '00000' }, streetName: null, visible: false },
    category: {
      id: 154,
      name: 'Damenbekleidung',
      parentName: 'Mode & Beauty',
      attributes: {
        'kleidung_damen.condition': {
          attributeId: 'kleidung_damen.condition',
          localizedName: 'Zustand',
          required: true,
          selectable: true,
          render: 'DROPDOWN',
          localizedOptions: [
            { value: 'like_new', localizedValue: 'Sehr Gut' },
            { value: 'new', localizedValue: 'Neu' }
          ]
        }
      }
    },
    availableShippingOptions: { options: [] }
  }
});

let n = 0;
const pass = name => { n += 1; console.log('PASS ' + name); };

const decoded = ctx.KRForm.decodeAstroProps(JSON.stringify(props));
assert.equal(decoded.postListingPage.adData.id, 123);
assert.equal(decoded.postListingPage.category.parentName, 'Mode & Beauty');
pass('Astro tagged props decode nested objects and arrays');

const island = { getAttribute(name) { return name === 'props' ? JSON.stringify(props) : null; } };
const textarea = {};
const form = {
  getAttribute(name) { return name === 'action' ? '/s-anzeige-bearbeiten.html?adId=123' : null; },
  querySelector(selector) { return selector === 'textarea' ? textarea : null; },
  querySelectorAll() { return []; },
  contains() { return false; }
};
const documentMock = {
  querySelector(selector) {
    if (selector === 'astro-island[component-url*="PostListingForm"]') return island;
    return null;
  },
  querySelectorAll(selector) { return selector === 'form' ? [form] : []; },
  getElementById() { return null; }
};
const extracted = ctx.KRForm.extract(documentMock, 'https://www.kleinanzeigen.de/s-anzeige-bearbeiten.html?adId=123');
assert.deepEqual(Array.from(extracted.categoryPath), ['Mode & Beauty', 'Damenbekleidung']);
assert.equal(extracted.structuredImages.length, 1);
assert.match(extracted.structuredImages[0].xxLargeUrl, /jwt=large/);
pass('public extract exposes structured category path and explicit XXLarge image source');

const condition = extracted.dynamicAttributes.find(item => item.key === 'kleidung_damen.condition');
assert.equal(condition.technicalValue, 'like_new');
assert.equal(condition.displayValue, 'Sehr Gut');
pass('public extract maps structured technical condition value to clean visible label');

console.log(`${n} v0.1.7 structured-props tests passed`);
