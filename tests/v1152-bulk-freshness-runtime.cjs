const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const runnerSource = fs.readFileSync(path.join(root, 'inventory-runner.js'), 'utf8');
const bulkSource = fs.readFileSync(path.join(root, 'src/background/services/bulk-worker-service.js'), 'utf8');

const listeners = [];
const sandbox = {
  console, URL, setTimeout, clearTimeout, setInterval() { return 1; }, clearInterval() {}, Promise,
  location: { href: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS' },
  document: {
    body: { innerText: '' }, querySelector() { return null; }, querySelectorAll() { return []; },
    getElementById() { return null; }, documentElement: { append() {} },
    createElement() { return { style: {}, append() {}, replaceChildren() {} }; }
  },
  chrome: { runtime: { lastError: null, sendMessage(_m, cb) { cb({ ok: true, result: null }); }, onMessage: { addListener(fn) { listeners.push(fn); } } } }
};
sandbox.globalThis = sandbox;
vm.runInNewContext(runnerSource, sandbox, { filename: 'inventory-runner.js' });
const api = sandbox.KRInventoryRun;

const onePage = [{ adId: '1' }, { adId: '2' }, { adId: '3' }];
assert.deepEqual(
  JSON.parse(JSON.stringify(api.validateFreshBulkSnapshot({ expectedTotal: 3, listings: onePage, hasNextPage: false, detectedProfile: 'Konto A', expectedProfile: 'Konto A' }))),
  { expectedTotal: 3, listingCount: 3, hasNextPage: false, profileName: 'Konto A' }
);
assert.throws(
  () => api.validateFreshBulkSnapshot({ expectedTotal: 3, listings: onePage.slice(0, 2), hasNextPage: false, detectedProfile: 'Konto A', expectedProfile: 'Konto A' }),
  /Einseiten-Snapshot ist unvollständig/
);
assert.doesNotThrow(
  () => api.validateFreshBulkSnapshot({ expectedTotal: 64, listings: Array.from({ length: 25 }, (_, i) => ({ adId: String(i + 1) })), hasNextPage: true, detectedProfile: 'Konto A', expectedProfile: 'Konto A' })
);
assert.throws(
  () => api.validateFreshBulkSnapshot({ expectedTotal: 3, listings: onePage, hasNextPage: false, detectedProfile: 'Konto B', expectedProfile: 'Konto A' }),
  /Kleinanzeigen-Konto stimmt nicht mit dem ausgewählten Inventarprofil überein/
);
console.log('PASS 1: fresh bulk snapshot validation rejects stale/incomplete one-page DOMs and profile changes');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} source must be extractable`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') { depth -= 1; if (depth === 0) return source.slice(start, i + 1); }
  }
  throw new Error(`unterminated ${name}`);
}
const classifierSource = extractFunction(bulkSource, 'classifyBulkEditWorkerNavigation');
const ctx = { URL };
vm.createContext(ctx);
vm.runInContext(`${classifierSource}; this.classify = classifyBulkEditWorkerNavigation;`, ctx);
const classify = ctx.classify;

assert.equal(classify({ status: 'loading', url: 'https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=123' }, '123').state, 'waiting');
assert.equal(classify({ status: 'complete', url: 'https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=123' }, '123').state, 'ready');
const publicRedirect = classify({ status: 'complete', url: 'https://www.kleinanzeigen.de/s-anzeige/alt/123-1-2' }, '123');
assert.equal(publicRedirect.state, 'terminal');
assert.equal(publicRedirect.navigationReason, 'redirected-to-public-ad');
const wrongEdit = classify({ status: 'complete', url: 'https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=999' }, '123');
assert.equal(wrongEdit.state, 'terminal');
assert.equal(wrongEdit.navigationReason, 'wrong-edit-ad-id');
console.log('PASS 2: completed edit-worker redirects are terminal while loading/expected edit states are not');
