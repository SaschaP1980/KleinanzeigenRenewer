const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

let n = 0; const pass = label => { n += 1; console.log('PASS ' + label); };

async function testActivityCenter() {
  const source = fs.readFileSync('app-activity-center.js', 'utf8');
  const ctx = { console, Date, Promise, Object, String, Number, Array, Math, setTimeout, clearTimeout };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  assert.ok(ctx.KRAppActivityCenter?.create);
  const writes = [];
  const center = ctx.KRAppActivityCenter.create({
    storageLocal: { get: async () => ({}), set: async value => { writes.push(value); } },
    elements: {},
    document: { createElement() { throw new Error('history DOM not used'); } },
    maxItems: 250,
    retentionMs: 30 * 24 * 60 * 60 * 1000
  });
  await center.ensureLoaded();
  assert.equal(center.publish({ id: 'a', slot: 'status', kind: 'ready', title: 'Fertig', text: 'A' }), true);
  assert.equal(center.current().id, 'a');
  assert.equal(center.publish({ id: 'b', slot: 'status', kind: '', title: 'Info', text: 'B' }), false, 'lower-priority item must not replace current item');
  assert.equal(center.current().id, 'a');
  assert.equal(center.publish({ id: 'c', slot: 'status', kind: 'error', title: 'Fehler', text: 'C' }), true);
  assert.equal(center.current().id, 'c');
  assert.equal(center.history()[0].id, 'a', 'replaced current item is archived');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.ok(writes.length >= 1);
  pass('extracted app activity center preserves priority, archival and persistence semantics');
}

async function testTabLoadCoordinator() {
  const source = fs.readFileSync('tab-load-coordinator.js', 'utf8');
  const ctx = { console, Date, Promise, Object, String, Number, Array, Math, Map, Set, setTimeout, clearTimeout };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  assert.ok(ctx.KRTabLoadCoordinator?.create);
  let tab = { id: 7, status: 'loading', url: 'https://www.kleinanzeigen.de/test' };
  const diagnostics = [];
  const coordinator = ctx.KRTabLoadCoordinator.create({
    safetyPollMs: 1000,
    assertPlatformAccessAllowed: async () => {},
    getTabOrThrow: async id => ({ ...tab, id }),
    getTab: async id => ({ ...tab, id }),
    logDiagnostic: async (...args) => { diagnostics.push(args); },
    tabMeta: value => ({ status: value.status }),
    assessNavigation: value => ({ state: value.status === 'complete' ? 'ready' : 'pending', reason: value.status }),
    readyState: 'ready',
    offTargetState: 'off-target'
  });
  const pending = coordinator.waitForComplete(7, { timeoutMs: 2000, label: 'Test-Tab' });
  setTimeout(() => { tab = { ...tab, status: 'complete' }; coordinator.notify(7, { kind: 'updated', status: 'complete' }); }, 15);
  const result = await pending;
  assert.equal(result.status, 'complete');
  assert.ok(diagnostics.some(entry => entry[1] === 'TAB_LOAD_TIMING'));
  pass('extracted tab-load coordinator wakes event-driven waits and keeps timing diagnostics');

  const offTarget = ctx.KRTabLoadCoordinator.create({
    safetyPollMs: 1000,
    assertPlatformAccessAllowed: async () => {},
    getTabOrThrow: async id => ({ id, status: 'complete', url: 'https://www.kleinanzeigen.de/falsch' }),
    getTab: async id => ({ id, status: 'complete', url: 'https://www.kleinanzeigen.de/falsch' }),
    logDiagnostic: async () => {},
    tabMeta: () => ({}),
    assessNavigation: () => ({ state: 'off-target', reason: 'wrong-url', currentUrl: 'https://www.kleinanzeigen.de/falsch' }),
    readyState: 'ready',
    offTargetState: 'off-target'
  });
  await assert.rejects(() => offTarget.waitForExpectedComplete(8, 'https://www.kleinanzeigen.de/richtig', { timeoutMs: 1200, label: 'Ziel-Tab' }), error => error?.code === 'KR_TAB_NAVIGATION_OFF_TARGET');
  pass('extracted tab-load coordinator preserves target-bound rejection semantics');
}

(async () => {
  await testActivityCenter();
  await testTabLoadCoordinator();
  console.log(`${n}/3 PASS`);
})().catch(error => { console.error(error.stack || error); process.exit(1); });
