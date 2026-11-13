'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the real app bootstrap slice under controlled async response failures.
// No authenticated Chrome account or remote Kleinanzeigen mutations are used.
const source = fs.readFileSync(path.join(__dirname, '../src/app/app.js'), 'utf8');
const start = source.search(/Promise\\.all(?:Settled)?\\(\\[ensureUiActivityLoaded\\(\\)/);
assert.notEqual(start, -1, 'startup load orchestration missing');
const end = source.indexOf('schedulePageInspect(ACCOUNT_HEALTH_FALLBACK_MS);', start);
assert.ok(end > start, 'startup health timer marker missing');
const startup = source.slice(start, end);
const inventoryFunction = source.slice(source.indexOf('async function refreshInventories('));
assert.match(inventoryFunction, /scopedProfileMessage\\('LIST_INVENTORIES'\\)/, 'inventory profile read must exist');
assert.match(inventoryFunction, /scopedProfileMessage\\('LIST_TRASH'\\)/, 'trash profile read must exist');

async function run({ configError = false, inventoryError = false, inspectError = false } = {}) {
  const calls = [], notices = [];
  const resolve = name => () => { calls.push(name); return Promise.resolve(); };
  const rejects = (name, reason) => () => { calls.push(name); return Promise.reject(new Error(reason)); };
  const context = {
    Promise, setStatus: (...args) => notices.push(args), friendlyErrorMessage: e => e.message,
    ensureUiActivityLoaded: resolve('activity'), loadListViewModes: resolve('view'),
    refreshProfileState: resolve('profile'),
    refreshRenewalConfiguration: configError ? rejects('renewal', 'KR_UPDATE_FENCE_ATOMIC_BUSY') : resolve('renewal'),
    refreshTrashRetentionConfiguration: configError ? rejects('trash-setting', 'KR_UPDATE_FENCE_ATOMIC_BUSY') : resolve('trash-setting'),
    primeManagedWorkerTabCache: resolve('worker-cache'),
    inspectPage: inspectError ? rejects('inspect', 'probe failure') : resolve('inspect'),
    refreshInventories: inventoryError ? rejects('inventories', 'inventory read failed') : resolve('inventories'),
    refreshBulkStatus: resolve('bulk'),
    refreshMassRenewalBatchStatus: resolve('mass'),
    ACCOUNT_HEALTH_FALLBACK_MS: 100
  };
  vm.runInNewContext(startup, context, { timeout: 1000, filename: 'app.js startup snippet' });
  await new Promise(done => setTimeout(done, 10));
  return { calls, notices };
}

(async () => {
  let result = await run({ configError: true });
  assert.ok(result.calls.includes('inventories'),
    'startup must read inventory/trash even when optional settings fail with KR_UPDATE_FENCE_ATOMIC_BUSY');
  assert.ok(!result.notices.some(note => note[1] === 'Inventar konnte nicht geladen werden'),
    'optional settings failure is not an inventory load failure');
  result = await run({ inventoryError: true });
  assert.ok(result.calls.includes('inventories'), 'inventory read must be attempted');
  assert.ok(result.notices.some(note => note[1] === 'Inventar konnte nicht geladen werden' && note[2] === 'inventory read failed'),
    'actual inventory read failure must be explicit');
  result = await run({ inspectError: true });
  assert.ok(result.calls.includes('inventories'), 'inspection failure must not block inventory load');
  assert.ok(!result.notices.some(note => note[1] === 'Inventar konnte nicht geladen werden'),
    'inspection failure must not masquerade as inventory failure');
  result = await run();
  assert.ok(result.calls.includes('inventories') && result.calls.includes('inspect'),
    'normal startup must continue loading inventory and account inspection');
  assert.equal(result.notices.length, 0, 'normal startup must not report errors');
  console.log('PASS KAR-185 startup optional-settings isolation and actual inventory-read error reporting');
})().catch(error => { console.error(error); process.exitCode = 1; });
