const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const app = fs.readFileSync('app.js', 'utf8');
const activitySource = fs.readFileSync('app-activity-center.js', 'utf8');
const html = fs.readFileSync('app.html', 'utf8');
const css = fs.readFileSync('app.css', 'utf8');

assert.match(app, /UI_ACTIVITY_HISTORY_MAX_ITEMS\s*=\s*250\s*;/, 'history must have a hard 250 item cap');
assert.match(app, /UI_ACTIVITY_HISTORY_RETENTION_MS\s*=\s*30\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000\s*;/, 'history must expire after 30 days');
assert.match(app, /UI_ACTIVITY_HISTORY_OVERFLOW_KEY\s*=\s*['"]uiActivityHistoryOverflowV1['"]/, 'overflow state must persist so 250 and 250+ can be distinguished');

const sandbox = { console, Date, Promise, Object, String, Number, Array, Math, setTimeout, clearTimeout };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(activitySource, sandbox);
assert.ok(sandbox.KRAppActivityCenter?.create, 'activity center module must export create');
const center = sandbox.KRAppActivityCenter.create({
  storageLocal: { get: async () => ({}), set: async () => {} },
  maxItems: 250,
  retentionMs: 30 * 24 * 60 * 60 * 1000,
  document: { createElement() { throw new Error('not needed in retention test'); } },
  elements: {}
});

const now = Date.parse('2026-09-18T12:00:00.000Z');
const recent = Array.from({ length: 252 }, (_, index) => ({ id: `m${index}`, title: `M${index}`, createdAt: new Date(now - index * 1000).toISOString(), archivedAt: new Date(now - index * 1000).toISOString() }));
let result = center.retained(recent, false, now);
assert.equal(result.history.length, 250, 'history is capped at 250');
assert.equal(result.overflow, true, 'overflow is remembered when more than 250 recent items exist');

const aged = [
  { id: 'old', title: 'Old', createdAt: '2026-08-18T11:59:59.000Z', archivedAt: '2026-08-18T11:59:59.000Z' },
  { id: 'recent', title: 'Recent', createdAt: '2026-08-20T12:00:00.000Z', archivedAt: '2026-08-20T12:00:00.000Z' },
];
result = center.retained(aged, false, now);
assert.deepEqual(Array.from(result.history, item => item.id), ['recent'], 'items older than 30 days are removed');

assert.match(html, /id="messageHistoryOpen"(?![^>]*\bhidden\b)[^>]*data-count="0"[^>]*>\s*Weitere Meldungen anzeigen\s*<\/button>/, 'history trigger remains visible even at zero and exposes its count');
assert.match(activitySource, /messageHistoryOpen\.dataset\.count\s*=\s*badge/, 'history trigger count is updated from retained history');
assert.match(activitySource, /className\s*=\s*['"]message-history-item-remove['"]/, 'each history card has a dedicated remove button');
assert.match(activitySource, /function animateRemoval\(/, 'manual deletion has a removal animation helper');
assert.match(activitySource, /animateRemoval[\s\S]*reducedMotion\(\)/, 'removal animation respects reduced motion');
assert.match(css, /\.message-history-open::after\s*\{[^}]*content:\s*attr\(data-count\)/s, 'history count renders as a compact badge');
assert.match(css, /\.message-history-open\.is-zero::after\s*\{/s, 'zero count has a muted badge treatment');

console.log('PASS v1.19.7 activity history retention/count/manual deletion contract');
