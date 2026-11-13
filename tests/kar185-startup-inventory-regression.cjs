'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the real app bootstrap slice under controlled async response failures.
// No authenticated Chrome account or remote Kleinanzeigen mutations are used.
const source = fs.readFileSync(path.join(__dirname, '../src/app/app.js'), 'utf8');
const start = source.search(/Promise\.all(?:Settled)?\(\[ensureUiActivityLoaded\(\)/);
assert.notEqual(start, -1, 'startup load orchestration missing');
const end = source.indexOf('schedulePageInspect(ACCOUNT_HEALTH_FALLBACK_MS);', start);
assert.ok(end > start, 'startup health timer marker missing');
const startup = source.slice(start, end);
const inventoryStart = source.indexOf('async function refreshInventories(');
const inventoryEnd = source.indexOf('\nasync function refreshRenewalProgressOnly(', inventoryStart);
assert.ok(inventoryStart >= 0 && inventoryEnd > inventoryStart,
  'real inventory refresh function boundaries must be present');
const inventoryFunction = source.slice(inventoryStart, inventoryEnd);
assert.match(inventoryFunction, /scopedProfileMessage\('LIST_INVENTORIES'\)/, 'inventory profile read must exist');
assert.match(inventoryFunction, /scopedProfileMessage\('LIST_TRASH'\)/, 'trash profile read must exist');

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

// Exercise the real refreshInventories() against a non-empty, profile-scoped
// in-memory store. The original bug left these headers at 0 until a profile
// switch; a failed storage read must also never zero a previously rendered list.
async function verifyPersistedCounts() {
  const inventory = Array.from({ length: 61 }, (_, i) => ({ inventoryId: 'inventory-' + i, profileId: 'profile-1' }));
  const trash = Array.from({ length: 90 }, (_, i) => ({ inventoryId: 'trash-' + i, profileId: 'profile-1' }));
  const inventoryHeaderCount = { textContent: '0' };
  const trashHeaderCount = { textContent: '0' };
  const reads = [];
  let renderedInventory = [], renderedTrash = [], rejectTrash = false;
  const context = {
    Promise, currentRecords: [], currentTrashRecords: [],
    currentRenewalConfiguration: null, currentInsertionLock: { locked: false },
    currentAppNotice: null, currentView: 'inventory',
    selectedProfileId: 'profile-1',
    massRenewalUiController: null, archiveTrashInsertionUiController: null,
    inventoryHeaderCount, trashHeaderCount,
    scopedProfileMessage: type => ({ type, profileId: 'profile-1' }),
    async runtimeMessage(message) {
      reads.push(message.type);
      if (message.type === 'GET_PROFILE_STATE') return { selectedProfileId: 'profile-1' };
      if (message.type === 'LIST_INVENTORIES') {
        assert.equal(message.profileId, 'profile-1', 'inventory read must be profile-scoped');
        return inventory;
      }
      if (message.type === 'LIST_TRASH') {
        assert.equal(message.profileId, 'profile-1', 'trash read must be profile-scoped');
        if (rejectTrash) throw Error('LIST_TRASH storage unavailable');
        return trash;
      }
      if (message.type === 'GET_APP_NOTICE') return null;
      if (message.type === 'GET_INSERTION_LOCK_STATE') return { locked: false };
      throw Error('unexpected read-only request: ' + message.type);
    },
    renderProfileSwitcher: () => {},
    syncArchiveInsertionUiFromLock: () => {},
    syncActionsActivityIndicator: () => {},
    renderAppNotice: () => {},
    syncRenewalProgressUi: () => {},
    renderInventories: records => { renderedInventory = records; },
    renderTrash: records => { renderedTrash = records; }
  };
  vm.runInNewContext(inventoryFunction, context, { filename: 'app.js refreshInventories', timeout: 1000 });
  await context.refreshInventories();
  assert.equal(inventoryHeaderCount.textContent, '61', 'inventory header must reflect saved inventory');
  assert.equal(trashHeaderCount.textContent, '90', 'trash header must reflect saved trash');
  assert.equal(renderedInventory.length, 61, 'inventory view receives saved inventory rows');
  assert.ok(reads.includes('LIST_INVENTORIES') && reads.includes('LIST_TRASH'),
    'startup inventory refresher reads both store collections');
  context.currentView = 'trash';
  await context.refreshInventories();
  assert.equal(renderedTrash.length, 90, 'trash view receives saved trash rows');
  rejectTrash = true;
  await assert.rejects(() => context.refreshInventories(), /LIST_TRASH storage unavailable/,
    'a failed local trash read must propagate as an error');
  assert.equal(inventoryHeaderCount.textContent, '61', 'failed reads cannot invent an empty inventory');
  assert.equal(trashHeaderCount.textContent, '90', 'failed reads cannot invent an empty trash');
}

(async () => {
  await verifyPersistedCounts();
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
  console.log('PASS KAR-185 startup isolation, 61 inventory/90 trash record counts and read-failure preservation');
})().catch(error => { console.error(error); process.exitCode = 1; });
