const fs = require('fs');
const assert = require('assert');
let n = 0; const pass = m => { n += 1; console.log(`PASS ${n}: ${m}`); };
const registry = fs.readFileSync('tab-registry.js','utf8');
const background = fs.readFileSync('background.js','utf8');
assert.match(registry, /async function markClosing\(/); pass('TabRegistry exposes an explicit closing-intent transition');
assert.match(registry, /closeIntentReason/); pass('registry entries retain the planned close reason before physical removal');
const closeStart = registry.indexOf('async function closeTab');
const closeEnd = registry.indexOf('\n    async function reloadTabOrThrow', closeStart);
const close = registry.slice(closeStart, closeEnd);
assert.ok(close.indexOf('markClosing') >= 0 && close.indexOf('markClosing') < close.indexOf('tabsApi.remove'), 'close intent must be persisted before tabs.remove'); pass('close intent is persisted before chrome removes the tab');
assert.match(registry, /async function markGone[\s\S]*closeIntentReason[\s\S]*goneReason/); pass('markGone preserves a pending controlled-close reason over generic onRemoved');
assert.match(background, /expectedControlledTabCloseEntry[\s\S]*isExpectedControlledTabCloseReason\(goneReason\)[\s\S]*isExpectedControlledTabCloseReason\(closeIntentReason\)/); pass('background classifies both finalized tombstones and in-flight controlled close intents as expected closes');

(async () => {
  const api = require('../tab-registry.js');
  const backing = {};
  const storageSession = {
    async get(keys) {
      const out = {};
      for (const key of Array.isArray(keys) ? keys : [keys]) if (Object.prototype.hasOwnProperty.call(backing, key)) out[key] = backing[key];
      return out;
    },
    async set(values) { Object.assign(backing, JSON.parse(JSON.stringify(values))); }
  };
  let tick = Date.parse('2026-09-20T18:00:00Z');
  const reg = api.create({ storageSession, now: () => (tick += 1) });
  await reg.register(77, { role: api.ROLES.RENEWAL_TARGET, managed: true, owner: { renewalId: 'renewal-race-1' } });
  let duringRemove = null;
  const tabsApi = {
    async remove(id) {
      await reg.markGone(id, 'tabs.onRemoved');
      duringRemove = await reg.get(id);
    }
  };
  const result = await reg.closeTab(77, tabsApi, { reason: 'renewal-target-published' });
  assert.equal(duringRemove?.goneReason, 'renewal-target-published'); pass('onRemoved race observes the planned controlled-close reason before closeTab resumes');
  assert.equal(result.entry?.goneReason, 'renewal-target-published'); pass('final tombstone keeps the controlled-close reason');
  console.log(`${n} v1.20.2 expected-close race groups passed`);
})().catch(error => { console.error(error); process.exitCode = 1; });
