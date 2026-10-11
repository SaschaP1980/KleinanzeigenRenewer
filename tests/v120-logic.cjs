const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../inventory-runner.js'), 'utf8');
const listeners = [];
const sandbox = {
  console,
  URL,
  setTimeout,
  clearTimeout,
  setInterval() { return 1; },
  clearInterval() {},
  Promise,
  location: { href: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS' },
  document: {
    body: { innerText: '' },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return null; },
    documentElement: { append() {} },
    createElement() { return { style: {}, append() {}, replaceChildren() {} }; }
  },
  chrome: {
    runtime: {
      lastError: null,
      sendMessage(message, cb) { cb({ ok: true, result: null }); },
      onMessage: { addListener(fn) { listeners.push(fn); } }
    }
  }
};
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: 'inventory-runner.js' });
const api = sandbox.KRInventoryRun;
let n = 0;
const pass = name => { n += 1; console.log('PASS ' + name); };

assert.equal(api.isMyAdsUrl('https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS'), true);
assert.equal(api.isMyAdsUrl('https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=1'), false);
pass('Meine-Anzeigen URL is scoped exactly');

assert.deepEqual(JSON.parse(JSON.stringify(api.parseOnlineCount('J.A. 66 Anzeigen online / 9.318 gesamt'))), { online: 66, total: 9318 });
assert.equal(api.parseOnlineCount('keine passende Zahl'), null);
pass('header online/total count parsing supports German thousands separators');

assert.equal(api.adIdFromHref('https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=3510907861'), '3510907861');
assert.equal(api.adIdFromHref('https://www.kleinanzeigen.de/s-anzeige/foo/3510907861-154-1759'), '3510907861');
assert.equal(api.editUrlForAdId('3510907861'), 'https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=3510907861');
pass('stable ad IDs are recognized from edit and public links');

console.log(`${n} v1.2.0 pure inventory-runner logic tests passed`);
