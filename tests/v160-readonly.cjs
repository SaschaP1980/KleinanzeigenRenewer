const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

let listener = null;
const dateNode = text => ({ textContent: text, children: [] });
const document = {
  body: { innerText: 'Deine Anzeige Endet am: 11.11.2026 Aktiv seit 04.07.2011 Pyjama 12.09.2026 6 Besucher', textContent: '' },
  querySelector() { return null; },
  querySelectorAll(selector) {
    if (selector === 'time') return [];
    if (selector === 'span,div,p') return [dateNode('12.09.2026'), dateNode('Aktiv seit 04.07.2011')];
    return [];
  }
};
const context = vm.createContext({
  document,
  location: { href: 'https://www.kleinanzeigen.de/s-anzeige/pyjama/3510907861-154-1759', origin: 'https://www.kleinanzeigen.de', pathname: '/s-anzeige/pyjama/3510907861-154-1759' },
  URL,
  console,
  globalThis: null,
  chrome: {
    runtime: {
      onMessage: { addListener(fn) { listener = fn; } },
      sendMessage(_message, cb) { if (cb) cb(); },
      getManifest() { return { version: '1.6.0' }; },
      lastError: null
    }
  }
});
context.globalThis = context;
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8'), context);
assert.ok(listener, 'content message listener missing');
let response = null;
listener({ type: 'EXTRACT_READONLY_METADATA' }, null, value => { response = value; });
assert.equal(response.ok, true, response.error);
assert.equal(response.result.adId, '3510907861');
assert.equal(response.result.endDateDisplay, '11.11.2026');
assert.equal(response.result.endDateIso, '2026-11-11');
assert.equal(response.result.listingDateDisplay, '12.09.2026');
assert.equal(response.result.listingDateIso, '2026-09-12');
assert.ok(!JSON.stringify(response.result).includes('04.07.2011'));
console.log('PASS read-only metadata keeps end date and public listing date separate without using profile active-since date');
