const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('app.js','utf8');
const updateStart = source.indexOf('function updateManagedWorkerTabCache');
const updateEnd = source.indexOf('\nasync function primeManagedWorkerTabCache', updateStart);
const inspectStart = source.indexOf('function shouldInspectTabLifecycleEvent');
const inspectEnd = source.indexOf('\nchrome.tabs.onUpdated.addListener', inspectStart);
assert.ok(updateStart >= 0 && updateEnd > updateStart && inspectStart >= 0 && inspectEnd > inspectStart);
const context = {
  managedWorkerTabIds: new Set(),
  knownUserKleinanzeigenTabIds: new Set(),
  activeTabId: null,
  fullInventoryTabId: null
};
vm.createContext(context);
vm.runInContext(source.slice(updateStart, updateEnd) + '\n' + source.slice(inspectStart, inspectEnd), context);
let n=0; const pass = label => { n += 1; console.log('PASS ' + label); };
context.updateManagedWorkerTabCache({
  11: { tabId: 11, managed: true, lifecycleState: 'active' },
  12: { tabId: 12, managed: true, lifecycleState: 'gone' },
  13: { tabId: 13, managed: false, lifecycleState: 'active' }
});
assert.equal(context.managedWorkerTabIds.has(11), true);
assert.equal(context.managedWorkerTabIds.has(12), false);
assert.equal(context.managedWorkerTabIds.has(13), false);
pass('registry cache keeps only live managed workers');
assert.equal(context.shouldInspectTabLifecycleEvent(11, { active: true }), false);
pass('managed worker activity never triggers account inspection');
assert.equal(context.shouldInspectTabLifecycleEvent(21, { active: true }), true);
pass('active user tab activity triggers account inspection');
context.knownUserKleinanzeigenTabIds.add(22);
assert.equal(context.shouldInspectTabLifecycleEvent(22, { active: false }), true);
pass('known inactive user tab activity remains observable');
assert.equal(context.shouldInspectTabLifecycleEvent(23, { active: false }), false);
pass('untracked inactive tab churn is ignored');
console.log(`${n}/5 PASS`);
