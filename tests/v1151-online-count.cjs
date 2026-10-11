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

assert.deepEqual(
  JSON.parse(JSON.stringify(api.parseOnlineCount('7 Anzeigen online'))),
  { online: 7, total: null },
  'current single-page counter format must be accepted'
);
assert.deepEqual(
  JSON.parse(JSON.stringify(api.parseOnlineCount('64 Anzeigen online / 9331 gesamt'))),
  { online: 64, total: 9331 },
  'legacy/multi-page counter format must remain accepted'
);
assert.deepEqual(
  JSON.parse(JSON.stringify(api.parseOnlineCount('1.234 Anzeigen online'))),
  { online: 1234, total: null },
  'German thousands separators must remain supported for the online count'
);
assert.equal(api.parseOnlineCount('7 Anzeigen'), null, 'unqualified numbers must not be guessed');
assert.equal(api.parseOnlineCount('online: 7'), null, 'reordered words must not be guessed');

console.log('PASS v1.15.1 bulk online-count compatibility');
