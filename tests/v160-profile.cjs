const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../inventory-runner.js'), 'utf8');
const listeners = [];
const profileNode = { textContent: 'angemeldet als: test.profil@example.invalid   Ausloggen' };
const sandbox = {
  console, URL, setTimeout, clearTimeout, Promise,
  location: { href: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS' },
  document: {
    body: { innerText: 'Header angemeldet als: test.profil@example.invalid Ausloggen' },
    querySelector() { return null; },
    querySelectorAll(selector) { return selector.includes('header') ? [profileNode] : []; },
    getElementById() { return null; },
    documentElement: { append() {} },
    createElement() { return { style: {}, append() {}, replaceChildren() {} }; }
  },
  chrome: {
    runtime: {
      lastError: null,
      sendMessage(_message, cb) { cb({ ok: true, result: null }); },
      onMessage: { addListener(fn) { listeners.push(fn); } }
    }
  }
};
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: 'inventory-runner.js' });
assert.equal(sandbox.KRInventoryRun.detectedProfileName(sandbox.document), 'test.profil@example.invalid');
console.log('PASS profile prerequisite extracts exactly the visible value after "angemeldet als:"');
