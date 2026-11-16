'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const view = require('../src/app/inventory-view.js');
const iso = value => value ? { expiresAt: value } : {};
const item = (inventoryId, expiresAt, extra = {}) => ({
  inventoryId, adId: inventoryId, profileId: 'profile-A', title: 'Entry ' + inventoryId,
  recordKind: 'trash', trash: { ...iso(expiresAt), ...extra }
});
const input = [
  item('d', '2027-01-02T01:00:00.000Z'),
  item('h', 'not-a-timestamp'),
  item('c', '2027-02-15T00:00:00.000Z'),
  item('g', null),
  item('a', '2027-01-02T01:00:00.000Z'),
  item('i', '2027-02-30T00:00:00.000Z'),
  item('f', '2028-01-01T00:00:00.000Z', { retentionIndefinite: true }),
  item('b', '2026-12-30T23:59:59.999Z')
];
const baseline = JSON.stringify(input);
const ids = values => values.map(x => x.inventoryId);
assert.equal(typeof view.deriveTrashView, 'function', 'KAR-164: expose a pure trash ordering view model');
assert.deepEqual(ids(view.deriveTrashView(input, { direction: 'asc' })),
  ['b','a','d','c','f','g','h','i'], 'ascending: finite earliest first, infinity then unknown/invalid');
assert.deepEqual(ids(view.deriveTrashView(input, { direction: 'desc' })),
  ['c','a','d','b','f','g','h','i'], 'descending reverses only finite deadlines, not the special-value group order');
assert.deepEqual(ids(view.deriveTrashView([...input].reverse(), { direction: 'asc' })),
  ['b','a','d','c','f','g','h','i'], 'equal timestamps and invalid records have a deterministic canonical ID tie');
assert.deepEqual(ids(view.deriveTrashView([...input].reverse(), { direction: 'desc' })),
  ['c','a','d','b','f','g','h','i'], 'ties do not change on opposite direction or input refresh');
assert.deepEqual(view.deriveTrashView([], { direction: 'asc' }), [], 'empty trash');
assert.deepEqual(view.deriveTrashView([input[0]], { direction: 'desc' }), [input[0]], 'single item');
assert.deepEqual(ids(view.deriveTrashView(input)), ['c','a','d','b','f','g','h','i'], 'default descending');
assert.notStrictEqual(view.deriveTrashView(input), input, 'derive view without sorting persisted array');
assert.equal(JSON.stringify(input), baseline, 'sorting must leave all input records and deadlines unchanged');

const timezoneCases = [
  item('utc', '2026-12-31T23:30:00.000Z'),
  item('plus-two', '2027-01-01T00:30:00.000+02:00'),
  item('bad-month', '2027-13-01T00:00:00.000Z'),
  item('minus-five', '2027-01-01T00:30:00.000-05:00')
];
assert.deepEqual(ids(view.deriveTrashView(timezoneCases, { direction: 'asc' })),
  ['plus-two', 'utc', 'minus-five', 'bad-month'],
  'timezone offsets cross the year boundary by instant, never localized display date');
assert.deepEqual(ids(view.deriveTrashView(timezoneCases, { direction: 'desc' })),
  ['minus-five', 'utc', 'plus-two', 'bad-month'],
  'descending reverses canonical instants, not timezone strings');
assert.deepEqual(ids(view.deriveTrashView([
  item('infinite-even-with-stale-date', '2026-01-01T00:00:00Z', { retentionIndefinite: true }),
  item('finite', '2027-01-01T00:00:00Z')
])), ['finite', 'infinite-even-with-stale-date'],
  'true unlimited retention overrides a stale deadline without synthesizing expiry');


const html = read('src/app/app.html');
const app = read('src/app/app.js');
assert.match(html, /id="trashSortAsc"[^>]*aria-pressed="false"/, 'ascending control accessible and initially inactive');
assert.match(html, /id="trashSortDesc"[^>]*aria-pressed="true"/, 'descending control accessible and initially active');
assert.match(html, /id="trashSortAsc"[\s\S]*?id="trashSortDesc"/, 'both directions offered together');
assert.match(html, /Papierkorb bis/, 'sort criterion visible');
assert.match(app, /function setTrashSortDirection\(direction\)/, 'separate trash sort state, not inventory sort');
const trashRendererSource = read('src/app/trash-card-renderer.js');
assert.match(app, /controller\.updateContext\(\{[^\n]*trashViewState\s*\}\)/, 'pass presentation-only direction to renderer');
assert.match(app, /controller\.renderTrash\(currentTrashRecords\)/, 'preserve existing raw render facade');
assert.match(trashRendererSource, /InventoryView\.deriveTrashView\(currentTrashRecords,\s*trashViewState\)/, 'renderer sorts a copy only');
assert.match(app, /trashSortAsc\.addEventListener\('click',\s*\(\)\s*=>\s*\{[\s\S]*?setTrashSortDirection\('asc'\)/);
assert.match(app, /trashSortDesc\.addEventListener\('click',\s*\(\)\s*=>\s*\{[\s\S]*?setTrashSortDirection\('desc'\)/);
console.log('KAR-164 canonical expiry order, infinity/unknown, stable ties, read-only and UI bindings: PASS');
