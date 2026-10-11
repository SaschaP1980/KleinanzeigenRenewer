const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const filler = fs.readFileSync(path.join(__dirname, '../template-filler.js'), 'utf8');
let n = 0;
const pass = name => { n += 1; console.log('PASS ' + name); };

const chooseStart = filler.indexOf('async function chooseExactOption');
const chooseEnd = filler.indexOf('\n  function findAttributeControl', chooseStart);
assert.ok(chooseStart >= 0 && chooseEnd > chooseStart);
const choose = filler.slice(chooseStart, chooseEnd);

assert.match(choose, /searchableInput/);
assert.match(choose, /(?:nativeValueSetter|typeSearchableValue)\(control, displayValue\)/);
assert.match(choose, /findExactSelectionOption\(control, displayValue\)/);
assert.match(choose, /option\.click\(\)/);
const typeOrSetIndex = Math.max(choose.indexOf('nativeValueSetter(control, displayValue)'), choose.indexOf('typeSearchableValue(control, displayValue)'));
assert.ok(typeOrSetIndex >= 0 && typeOrSetIndex < choose.indexOf('option.click()'));
pass('searchable attributes type first and then select an exact rendered suggestion');

assert.match(filler, /function associatedChoiceRoots/);
assert.match(filler, /aria-controls/);
assert.match(filler, /aria-owns/);
assert.match(filler, /\[role="listbox"\],\[role="menu"\]/);
assert.match(filler, /visibleText\(element\).*wanted/s);
assert.match(filler, /function findExactNearbyChoice/);
assert.match(filler, /verticalDistance >= -4 && verticalDistance <= 500/);
pass('autocomplete suggestion lookup uses associated choice roots and a strict nearby exact-text fallback');

assert.match(filler, /function findSelectionConfirmButton/);
assert.match(filler, /\^bestätigen\$\/i/);
assert.match(choose, /const confirmButton = findSelectionConfirmButton\(control, option\)/);
assert.match(choose, /confirmButton\.click\(\)/);
assert.ok(choose.indexOf('confirmButton.click()') < choose.indexOf('Technischer Wert'));
pass('modal selections explicitly confirm before technical-value verification');

const shippingStart = filler.indexOf('async function fillShipping');
const shippingEnd = filler.indexOf('\n  async function fillPriceType', shippingStart);
assert.ok(shippingStart >= 0 && shippingEnd > shippingStart);
const shipping = filler.slice(shippingStart, shippingEnd);
assert.match(shipping, /radio\.click\(\)/);
assert.doesNotMatch(shipping, /inferShippingPackageSize/);
assert.doesNotMatch(shipping, /shipping\.methods/);
assert.doesNotMatch(shipping, /shippingOptions/);
pass('shipping fill keeps only Versand möglich/Nur Abholung and ignores methods and package sizes');

console.log(`${n} v1.1.4 selection logic tests passed`);
