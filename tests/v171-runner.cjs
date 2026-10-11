const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, '../inventory-runner.js'), 'utf8');
const documentMock = {
  body: { innerText: '', textContent: '' },
  documentElement: null,
  querySelector() { return null; },
  querySelectorAll() { return []; },
  getElementById() { return null; },
  createElement() { return { set id(v) {}, set textContent(v) {} }; }
};
const context = {
  console,
  URL,
  setTimeout,
  clearTimeout,
  location: { href: 'https://www.kleinanzeigen.de/other-page' },
  document: documentMock,
  chrome: {
    runtime: {
      lastError: null,
      sendMessage(message, callback) { callback?.({ ok: true, result: null }); },
      onMessage: { addListener() {} }
    },
    storage: { onChanged: { addListener() {} } }
  },
  MutationObserver: undefined,
  addEventListener() {}
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'inventory-runner.js' });

const api = context.KRInventoryRun;
assert.ok(api?.publicUrlFromRoot);

const makeLink = href => ({ getAttribute(name) { return name === 'href' ? href : null; } });
const matching = makeLink('/s-anzeige/pyjama-schlafanzug-grau-blau-gr-s/3510907861-154-1759');
const unrelated = makeLink('/s-anzeige/anderes/9999999999-154-1759');
const ownerDocument = { querySelectorAll(selector) { return selector === 'a[href]' ? [unrelated, matching] : []; } };
const narrowRoot = { ownerDocument, querySelectorAll() { return []; } };

assert.equal(
  api.publicUrlFromRoot(narrowRoot, '3510907861'),
  'https://www.kleinanzeigen.de/s-anzeige/pyjama-schlafanzug-grau-blau-gr-s/3510907861-154-1759'
);
assert.equal(api.publicUrlFromRoot(narrowRoot, '1234567890'), '');
console.log('PASS v1.7.1 public URL lookup finds the matching read-only link outside the narrow edit-control subtree');
console.log('PASS v1.7.1 public URL lookup never assigns a read-only URL from another ad ID');
console.log('2 v1.7.1 runner behavior groups passed');
