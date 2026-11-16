'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Controller = require('../src/app/trash-retention-settings-controller.js');

const root = path.resolve(__dirname, '..');
const read = filename => fs.readFileSync(path.join(root, filename), 'utf8');
const app = read('src/app/app.js');
const html = read('src/app/app.html');
const inventoryCard = read('src/app/inventory-card-renderer.js');
const trashCard = read('src/app/trash-card-renderer.js');

function element() {
  const listeners = new Map();
  return {
    textContent: '', title: '', value: '1', disabled: false, hidden: false,
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { listeners.set(name, callback); },
    focus() {},
    fire(name) { const callback = listeners.get(name); return callback && callback(); }
  };
}

function fixture(initial = 'infinite') {
  const range = element();
  const value = element();
  const description = element();
  const records = {
    inventory: Array.from({ length: 61 }, (_, id) => ({ id })),
    trash: Array.from({ length: 90 }, (_, id) => ({
      id, retentionIndefinite: true, trashedAt: '2026-10-15T06:47:00Z'
    }))
  };
  let stored = initial, deny = true, requests = 0, mutations = 0, now = 10000;
  const transitions = [], reconciliations = [];
  const controller = Controller.create({
    elements: { range, value, description },
    now: () => now,
    getSelectedProfileId: () => 'profile-fixture',
    confirmAction: async () => { throw Error('no destructive confirmation in read-only fixture'); },
    runtimeMessage: async message => {
      if (message.type !== 'GET_TRASH_RETENTION_CONFIGURATION') {
        mutations += 1;
        throw Error('read-only fixture cannot mutate retention');
      }
      requests += 1;
      if (deny) { const error = Error('KR_UPDATE_FENCE_ATOMIC_BUSY'); error.code = 'KR_UPDATE_FENCE_ATOMIC_BUSY'; throw error; }
      return { retentionDays: stored };
    },
    onStateChanged: state => transitions.push({ ...state }),
    onReconcile: async days => {
      reconciliations.push(days);
      assert.equal(records.inventory.length, 61);
      assert.equal(records.trash.length, 90);
    }
  });
  return {
    controller, range, value, description, records, transitions, reconciliations,
    allow(days = stored) { stored = days; deny = false; },
    deny() { deny = true; },
    advance() { now += 3000; },
    get requests() { return requests; },
    get mutations() { return mutations; }
  };
}

(async () => {
  // Permanent RED on unfixed v1.24.1: never present the hardcoded 30-day
  // fallback as a saved policy before or after a denied configuration read.
  const state = fixture();
  assert.equal(state.controller.status(), 'loading');
  assert.equal(state.controller.current(), null);
  assert.equal(state.range.disabled, true);
  assert.equal(state.range.hidden, true, 'unverified slider knob must not imply 30 days');
  assert.doesNotMatch(state.value.textContent + state.description.textContent, /30 Tage/);

  await assert.rejects(() => state.controller.refresh(), /KR_UPDATE_FENCE_ATOMIC_BUSY/);
  assert.equal(state.controller.status(), 'unavailable');
  assert.equal(state.controller.current(), null);
  assert.equal(state.range.disabled, true);
  assert.doesNotMatch(state.value.textContent + state.description.textContent, /30 Tage/);
  state.range.value = '0';
  state.range.fire('input');
  state.range.fire('change');
  assert.equal(state.mutations, 0, 'no writes allowed while policy is unverified');
  assert.equal(state.records.trash.length, 90, 'old trash cannot be purged by a UI read failure');

  state.advance();
  state.allow('infinite');
  await state.controller.refresh();
  assert.equal(state.controller.status(), 'ready');
  assert.equal(state.controller.current(), 'infinite');
  assert.equal(state.value.textContent, 'Unbegrenzt (∞)');
  assert.match(state.description.textContent, /ausdrücklichen endgültigen Löschung/);
  assert.equal(state.range.disabled, false);
  assert.equal(state.range.hidden, false);
  assert.equal(state.reconciliations.at(-1), 'infinite');
  assert.equal(state.records.inventory.length, 61);
  assert.equal(state.records.trash.length, 90);
  assert.equal(state.mutations, 0);

  state.advance();
  state.deny();
  await assert.rejects(() => state.controller.refresh(), /KR_UPDATE_FENCE_ATOMIC_BUSY/);
  assert.equal(state.controller.status(), 'unavailable', 'stale verified policy must not survive a failed refresh');
  assert.equal(state.controller.current(), null);
  assert.doesNotMatch(state.value.textContent, /Unbegrenzt|30 Tage/);

  for (const days of [10, 30, 60, 90, 180, 360, 'infinite']) {
    const f = fixture(days);
    f.allow(days);
    await f.controller.refresh();
    assert.equal(f.controller.current(), days);
    assert.equal(f.value.textContent, days === 'infinite' ? 'Unbegrenzt (∞)' : String(days) + ' Tage');
    assert.equal(f.mutations, 0);
  }
  // Background returns the documented 30-day fallback only after a
  // successful read of a missing or malformed stored preference.
  const legacy = fixture(30);
  legacy.allow(30);
  await legacy.controller.refresh();
  assert.equal(legacy.value.textContent, '30 Tage');

  const malformed = fixture('invalid');
  malformed.allow('invalid');
  await assert.rejects(() => malformed.controller.refresh(), /Ungültig|ungültig|invalid/i);
  assert.equal(malformed.controller.status(), 'unavailable');
  assert.equal(malformed.controller.current(), null);

  // Rapid repeated refocuses must not flood a denied MV3 admission fence.
  const rapid = fixture();
  await assert.rejects(() => rapid.controller.refresh(), /KR_UPDATE_FENCE_ATOMIC_BUSY/);
  for (let i = 0; i < 20; i++) await rapid.controller.refresh().catch(() => {});
  assert.ok(rapid.requests <= 2, 'bounded recovery after repeated denied reads');

  // Rendered HTML must be neutral even before scripts load; controller and
  // app banner have one verified/unknown status, never a 30-day guess.
  assert.match(html, /id="trashRetentionValue"[^>]*>Wird ermittelt/);
  assert.match(html, /id="trashRetentionRange"[^>]*disabled[^>]*hidden/);
  assert.doesNotMatch(html.match(/<div class="trash-intro">.*?<\/div>/s)?.[0] || '', /30 Tage/);
  assert.match(app, /let currentTrashRetentionDays = null;/);
  assert.match(app, /onStateChanged/);
  assert.match(app, /refreshTrashRetentionExplanations\(/);
  assert.match(app, /currentTrashRetentionDays == null/);
  assert.match(inventoryCard, /const requireVerifiedTrashRetention =/);
  assert.match(inventoryCard, /getTrashRetentionDays/);
  assert.doesNotMatch(inventoryCard, /30 Tage/, 'inventory actions must not announce hardcoded retention');
  assert.match(trashCard, /function requireVerifiedRetention/);
  assert.match(trashCard, /RESET_TRASH_RETENTION/);
  assert.match(app, /retryUnavailableTrashRetentionConfiguration/);
  assert.doesNotMatch(html, /Einträge werden nach 30 Tagen automatisch/, 'static settings description remains neutral');

  console.log('PASS KAR-186 cold-start 61/90 records, denied fence, verified recovery, finite/infinite/legacy, write guard and honest UI');
})().catch(error => { console.error(error); process.exitCode = 1; });
