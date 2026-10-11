const fs = require('node:fs');
const assert = require('node:assert/strict');
const app = fs.readFileSync('app.js','utf8') + '\n' + fs.readFileSync('mass-renewal-ui-controller.js','utf8') + '\n' + fs.readFileSync('archive-trash-insertion-ui-controller.js','utf8');
let n = 0; const pass = label => { n += 1; console.log('PASS ' + label); };

assert.match(app, /const ACCOUNT_HEALTH_FALLBACK_MS\s*=\s*60000\s*;/);
assert.match(app, /schedulePageInspect\(ACCOUNT_HEALTH_FALLBACK_MS\)/);
pass('account health uses a 60-second safety fallback instead of a 15-second primary poll');

assert.doesNotMatch(app, /setInterval\(\(\) => refreshBulkStatus\(\)\.catch\(\(\) => \{\}\),\s*1000\)/);
assert.match(app, /const BULK_RUN_STORAGE_KEY\s*=\s*['"]bulkInventoryRun['"]/);
assert.match(app, /chrome\.storage\.onChanged\.addListener/);
assert.match(app, /changes\[BULK_RUN_STORAGE_KEY\][\s\S]*renderBulkState/);
pass('bulk state is pushed from storage changes instead of polled every second');

const refreshStart = app.indexOf('async function refreshInventories');
const refreshEnd = app.indexOf('\nasync function refreshRenewalProgressOnly', refreshStart);
assert.ok(refreshStart >= 0 && refreshEnd > refreshStart);
const refreshBlock = app.slice(refreshStart, refreshEnd);
assert.doesNotMatch(refreshBlock, /refreshBulkStatus\(/);
pass('ordinary inventory refreshes no longer trigger an extra bulk-state read');

assert.match(app, /const MASS_RENEWAL_BATCH_STORAGE_KEY\s*=\s*['"]massRenewalBatchV1['"]/);
assert.match(app, /changes\[MASS_RENEWAL_BATCH_STORAGE_KEY\][\s\S]*applyMassRenewalBatchSnapshot/);
assert.match(app, /message\.reason === ['"]mass-renewal-updated['"][\s\S]*return/);
pass('mass-renewal progress is rendered from its storage event without a full inventory refresh');

assert.match(app, /const TAB_REGISTRY_STORAGE_KEY\s*=\s*['"]tabRegistryV1['"]/);
assert.match(app, /managedWorkerTabIds/);
assert.match(app, /areaName === ['"]session['"][\s\S]*TAB_REGISTRY_STORAGE_KEY/);
assert.doesNotMatch(app.slice(app.indexOf('async function matchingKleinanzeigenTabs'), app.indexOf('\nasync function performInspectPage')), /GET_MANAGED_WORKER_TAB_IDS/);
pass('managed-worker filtering uses the local tab-registry cache instead of a runtime roundtrip per health check');

assert.match(app, /function shouldInspectTabLifecycleEvent/);
assert.match(app, /if \(!relevant \|\| !shouldInspectTabLifecycleEvent\(tabId, tab\)\) return/);
assert.match(app, /managedWorkerTabIds\.has\(id\)[\s\S]*return false/);
pass('worker tab churn does not trigger expensive account inspection');

assert.doesNotMatch(app, /clearInterval\(bulkTimer\)/);
pass('page teardown has no legacy bulk polling timer to clear');

console.log(`${n}/7 PASS`);
