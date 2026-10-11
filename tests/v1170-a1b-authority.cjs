const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const registry = fs.readFileSync(path.join(root, 'tab-registry.js'), 'utf8');
const background = require('./v12215-source-surface.cjs');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
let n = 0; const pass = name => { n += 1; console.log('PASS ' + name); };

assert.ok(['1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(manifest.version));
pass('v1.17.0 manifest version');

for (const token of ['releaseOwnership', 'closeTab', 'reloadTabOrThrow', 'ownerMatches']) assert.match(registry, new RegExp(token));
assert.match(registry, /known\?\.lifecycleState === STATES\.GONE/);
assert.match(registry, /allowDiscarded = false/);
pass('TabRegistry exposes guarded ownership, close, reload and tombstone-preflight primitives');

assert.match(background, /function bulkRunOwnerExpectation\(/);
assert.match(background, /function bulkRunOwnsRegistryTab\(/);
assert.match(background, /async function releaseBulkSourceOwnership\(/);
assert.match(background, /bulk-source-operation-attempt-failed/);
assert.match(background, /bulk-finished/);
assert.match(background, /bulk-failed/);
assert.match(background, /bulk-stale/);
assert.match(background, /bulk-retry-finished/);
assert.match(background, /bulk-retry-failed/);
pass('bulk source ownership is released on all terminal/preflight paths with owner guards');

const reconcile = background.match(/async function reconcileTabRegistry\(\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.ok(reconcile);
assert.match(reconcile, /bulkRunActiveForRegistry\(bulk\)/);
assert.match(reconcile, /releaseBulkSourceOwnership\(bulk, 'reconcile-terminal'\)/);
assert.match(reconcile, /bulkActive && Number\(bulk\.sourceTabId/);
pass('service-worker reconciliation does not resurrect terminal bulk ownership');

const freshBulkStart = background.slice(background.indexOf('async function startBulkInventoryOperation'), background.indexOf('async function probeLiveKleinanzeigenAccount'));
assert.ok(freshBulkStart);
assert.match(freshBulkStart, /registerShadowTab\(sourceTabId, TAB_ROLES\.SOURCE/);
assert.match(freshBulkStart, /ownerType: 'bulk'/);
assert.match(freshBulkStart, /closeRegistryTab\(sourceTabId, 'bulk-source-operation-attempt-failed'/);
pass('authoritative bulk start uses registry lifecycle and closes a failed fresh provisional source');

const closeBulk = background.match(/async function closeBulkWorker\(message, sender\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.ok(closeBulk);
assert.match(closeBulk, /closeRegistryTabs/);
assert.doesNotMatch(closeBulk, /chrome\.tabs\.remove/);
pass('bulk worker close path is routed through TabRegistry close semantics');

assert.match(background, /async function reactivateDiscardedTabs\(/);
assert.match(background, /REACTIVATE_DISCARDED_TABS/);
assert.match(background, /tabRegistry\.reloadTabOrThrow/);
assert.match(background, /async function observeTabLifecycleUpdate\(/);
assert.match(background, /registryEntryIsOwnedWorker/);
assert.match(background, /TAB_REGISTRY_DISCARDED_WORKER_REACTIVATED/);
const reactivateUi = app.match(/async function reactivateDiscardedKleinanzeigenTabs\(\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.ok(reactivateUi);
assert.match(reactivateUi, /REACTIVATE_DISCARDED_TABS/);
assert.doesNotMatch(reactivateUi, /chrome\.tabs\.reload/);
pass('discarded reactivation is delegated from UI to the background lifecycle facade without focus changes');

assert.equal((background.match(/\.requestSubmit\s*\(/g) || []).length, 0);
assert.equal((background.match(/\.submit\s*\(/g) || []).length, 0);
assert.match(background, /VERIFY_OWN_AD_ABSENT_BY_ID/);
assert.match(background, /source-delete-verified/);
pass('phase-4 and no-submit safety contracts remain present');

for (const key of ['operationId','parentOperationId','renewalId','fillId','bulkRunId','massBatchId']) assert.match(background, new RegExp(key));
pass('A2 correlation identifiers remain retained');

console.log(`${n} v1.17.0 A1b authority contract groups passed`);
