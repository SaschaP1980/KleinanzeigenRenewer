const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let listener = null;
const account = { textContent: 'Meine Anzeigen', getAttribute(name) { return name === 'href' ? '/m-meine-anzeigen.html?tab=PROJECTS' : ''; }, href: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS' };
const document = {
  body: { innerText: 'Meine Anzeigen', textContent: 'Meine Anzeigen' },
  title: 'Anzeige bearbeiten',
  querySelector() { return null; },
  querySelectorAll(selector) {
    if (selector === 'a,button') return [account];
    return [];
  }
};
const context = vm.createContext({
  document,
  location: { href: 'https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=3514237118', origin: 'https://www.kleinanzeigen.de', pathname: '/p-anzeige-bearbeiten.html' },
  URL,
  console,
  globalThis: null,
  chrome: { runtime: { onMessage: { addListener(fn) { listener = fn; } }, sendMessage(_m, cb) { cb?.(); }, getManifest() { return { version: '1.16.1' }; }, lastError: null } }
});
context.globalThis = context;
context.KRForm = { locate() { return { eligible: false }; } };
context.KRInventoryRun = { isMyAdsUrl() { return false; }, detectedProfileName() { return 'ka_test@example.invalid'; } };
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8'), context);
assert.ok(listener, 'content listener missing');
let response;
listener({ type: 'PAGE_STATUS' }, null, value => { response = value; });
assert.equal(response.ok, true, response.error);
assert.equal(response.result.auth.loggedIn, true);
assert.equal(response.result.auth.ownAd, true);
assert.equal(response.result.auth.viewMode, 'edit');
assert.equal(response.result.auth.evidence, 'existing-edit-url');
assert.equal(response.result.pageType, 'edit');
assert.equal(response.result.adId, '3514237118');
console.log('PASS v1.16.1 existing edit URL becomes single-inventory eligible before the dynamic form locator is ready');
