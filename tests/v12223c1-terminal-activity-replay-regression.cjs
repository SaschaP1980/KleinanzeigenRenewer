const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const activitySource = fs.readFileSync('app-activity-center.js', 'utf8');
const appSource = fs.readFileSync('app.js', 'utf8');

function loadActivityCenter(initial = {}) {
  let api = null;
  let stored = structuredClone(initial);
  const sandbox = {
    console, Date, Promise, Object, String, Number, Array, Math, setTimeout, clearTimeout,
    KRDeps: { register(name, value) { if (name === 'KRAppActivityCenter') api = value; } }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(activitySource, sandbox);
  assert.ok(api?.create, 'KRAppActivityCenter must register through KRDeps');
  const center = api.create({
    storageLocal: {
      async get() { return structuredClone(stored); },
      async set(patch) { stored = { ...stored, ...structuredClone(patch) }; }
    },
    document: { createElement() { throw new Error('not needed'); } },
    elements: {}
  });
  return { center, stored: () => structuredClone(stored) };
}

const oldBulk = {
  id: 'bulk:run-old', slot: 'bulk', kind: 'ready', title: 'Erfassung abgeschlossen',
  text: '', facts: '10 gefunden · 1 neu · 9 vorhanden', badgeLabel: 'Abgeschlossen',
  createdAt: '2026-09-25T05:19:00.000Z', archivedAt: '2026-09-25T05:30:00.000Z', active: false
};
const recovery = {
  id: 'trash-template-recovery', slot: 'status', kind: 'waiting', title: 'Vorlagen-Inserat wird vorbereitet',
  text: 'Fortsetzbarer Vorgang', createdAt: '2026-09-25T06:00:00.000Z', active: true
};

(async () => {
  const { center } = loadActivityCenter({
    uiCurrentActivityV1: recovery,
    uiActivityHistoryV1: [oldBulk],
    uiActivityHistoryOverflowV1: false,
    uiActivityDismissedFingerprintsV1: {}
  });
  await center.ensureLoaded();
  assert.equal(center.current()?.id, 'trash-template-recovery');
  center.clear('trash-template-recovery');
  assert.equal(center.current(), null, 'successful reset clears the recovery activity');

  const replayed = center.publish({ ...oldBulk, archivedAt: '' }, { suppressArchivedReplay: true });
  assert.equal(replayed, false, 'unchanged archived terminal activity must not be re-promoted by a later refresh');
  assert.equal(center.current(), null, 'old terminal bulk activity remains history-only after recovery reset');

  const changed = { ...oldBulk, facts: '10 gefunden · 2 neu · 8 vorhanden', archivedAt: '' };
  const changedPublished = center.publish(changed, { suppressArchivedReplay: true });
  assert.equal(changedPublished, true, 'content-changed terminal activity may become current again');
  assert.equal(center.current()?.facts, changed.facts);

  assert.match(appSource, /publishUiActivity\([\s\S]{0,700}suppressArchivedReplay:\s*Boolean\(activityModel\.terminal\)/,
    'bulk renderer must request replay suppression only for terminal bulk activities');

  console.log('PASS v1.22.23_c1 terminal activity replay regression');
})().catch(error => { console.error(error); process.exitCode = 1; });
