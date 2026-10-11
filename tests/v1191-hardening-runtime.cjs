const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, '../platform-hardening.js'), 'utf8');
const context = { globalThis: {} };
context.globalThis = context;
vm.runInNewContext(source, context, { filename: 'platform-hardening.js' });
const H = context.KRPlatformHardening;
let n = 0;
const pass = name => { n += 1; console.log('PASS ' + name); };

assert.ok(H && typeof H.detectAccessRestriction === 'function');
pass('shared hardening module exposes restriction detector');

const detected = H.detectAccessRestriction({
  url: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS',
  title: 'Kleinanzeigen',
  headings: ['IP-Bereich vorübergehend gesperrt']
});
assert.equal(detected?.restricted, true);
assert.equal(detected?.code, 'ip-range-temporarily-blocked');
pass('exact block-page headline is classified as platform access restriction');

assert.equal(H.detectAccessRestriction({
  title: 'Hilfe',
  headings: ['Warum wurde mein IP-Bereich gesperrt?']
}), null);
pass('generic help text about blocking is not misclassified');

assert.equal(H.detectAccessRestriction({
  title: 'Kleinanzeigen',
  headings: ['Meine Anzeigen']
}), null);
pass('normal Kleinanzeigen page is not classified as restricted');

const titleDetected = H.detectAccessRestriction({
  title: 'IP-Bereich vorübergehend gesperrt | Kleinanzeigen',
  headings: []
});
assert.equal(titleDetected?.restricted, true);
assert.equal(titleDetected?.matchedBy, 'title');
pass('exact restriction headline in document title is accepted as fallback evidence');

console.log(`${n} v1.19.1 hardening runtime tests passed`);
