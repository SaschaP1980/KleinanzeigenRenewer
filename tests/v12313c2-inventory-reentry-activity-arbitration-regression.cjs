const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const activitySource = fs.readFileSync('src/app/app-activity-center.js', 'utf8');
const captureSource = fs.readFileSync('src/app/inventory-capture-controller.js', 'utf8');

function fakeClassList(initial = []) {
  const values = new Set(initial);
  return {
    add(...names) { for (const name of names) values.add(name); },
    remove(...names) { for (const name of names) values.delete(name); },
    toggle(name, force) {
      if (force === undefined) {
        if (values.has(name)) values.delete(name); else values.add(name);
      } else if (force) values.add(name); else values.delete(name);
      return values.has(name);
    },
    contains(name) { return values.has(name); }
  };
}

function loadActivityCenter(initialCurrent) {
  let api = null;
  const shortcut = { classList: fakeClassList([]) }; // controller has already made it visible
  const status = { classList: fakeClassList(['hidden']) };
  const statusDot = {};
  const statusTitle = {};
  const statusText = {};
  const statusFacts = { classList: fakeClassList(['hidden']) };
  const statusTime = {};
  const statusAction = { classList: fakeClassList(['hidden']) };
  const sandbox = {
    console, Date, Promise, Object, String, Number, Array, Math, setTimeout, clearTimeout,
    KRDeps: { register(name, value) { if (name === 'KRAppActivityCenter') api = value; } }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(activitySource, sandbox);
  assert.ok(api?.create, 'activity center must register');
  const center = api.create({
    storageLocal: {
      async get() {
        return {
          uiCurrentActivityV1: initialCurrent,
          uiActivityHistoryV1: [],
          uiActivityHistoryOverflowV1: false,
          uiActivityDismissedFingerprintsV1: {}
        };
      },
      async set() {}
    },
    document: { createElement() { throw new Error('not needed'); } },
    elements: {
      controlStatus: status,
      statusDot, statusTitle, statusText, statusFacts, statusTime, statusAction,
      inventoryCaptureProgressShortcut: shortcut
    }
  });
  return { center, shortcut, status };
}

(async () => {
  const recovery = {
    id: 'trash-template-recovery', slot: 'status', kind: 'waiting',
    title: 'Vorlagen-Inserat ist vorbereitet', text: 'Anzeige prüfen',
    createdAt: '2026-09-29T09:41:41.000Z', active: true
  };
  const { center, shortcut, status } = loadActivityCenter(recovery);
  await center.ensureLoaded();

  assert.equal(center.current()?.id, 'trash-template-recovery', 'competing recovery activity remains current');
  assert.equal(status.classList.contains('hidden'), false, 'current recovery status card remains visible');
  assert.equal(shortcut.classList.contains('hidden'), false,
    'inventory progress shortcut must remain visible independently of current-activity arbitration');
  console.log('PASS competing current activity cannot hide active inventory progress shortcut');

  assert.doesNotMatch(captureSource,
    /const activityId = target\.mode === 'bulk' \? `bulk:\$\{String\(target\.runId \|\| ''\)\}`/,
    'inventory shortcut must not reuse the bulk status activity identity');
  assert.match(captureSource, /inventory-shortcut:bulk:/,
    'bulk inventory shortcut must use a distinct activity identity');
  console.log('PASS inventory shortcut and bulk status have distinct activity identities');

  console.log('2/2 PASS v1.23.13_c2 inventory reentry/activity arbitration');
})().catch(error => { console.error(error); process.exitCode = 1; });
