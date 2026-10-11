const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const bg = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');
const fn = bg.match(/function singleInventorySourceFromUrl\(rawUrl\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.ok(fn, 'singleInventorySourceFromUrl must exist');
const context = { URL };
vm.createContext(context);
vm.runInContext(`${fn}; this.parse = singleInventorySourceFromUrl;`, context);
const parse = context.parse;

const pub = parse('https://www.kleinanzeigen.de/s-anzeige/kulturtasche/3514237118-156-1759');
assert.equal(pub.adId, '3514237118');
assert.equal(pub.mode, 'public');
assert.equal(pub.publicUrl, 'https://www.kleinanzeigen.de/s-anzeige/kulturtasche/3514237118-156-1759');

const edit = parse('https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=3514237118');
assert.equal(edit.adId, '3514237118');
assert.equal(edit.mode, 'edit');
assert.equal(edit.publicUrl, '');

assert.equal(parse('https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html'), null);
assert.equal(parse('https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html'), null);
assert.equal(parse('https://example.com/s-anzeige/x/3514237118-156-1759'), null);
console.log('PASS v1.16.1 single inventory source routing runtime');
