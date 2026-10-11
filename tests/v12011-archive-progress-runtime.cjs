const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('archive-trash-insertion-ui-controller.js', 'utf8');
const helperStart = source.indexOf('function setTrackedArchiveInsertionId');
const applyStart = source.indexOf('function applyArchiveInsertionSessionSnapshot');
const applyEnd = source.indexOf('\nasync function refreshArchiveInsertionProgress', applyStart);
assert.ok(helperStart >= 0 && applyStart > helperStart && applyEnd > applyStart);
const helperEnd = source.indexOf('\nfunction resetArchiveInsertDialog', helperStart);
const helper = source.slice(helperStart, helperEnd);
const apply = source.slice(applyStart, applyEnd);

const shown = [];
const logged = [];
const ctx = {
  trackedArchiveInsertionId: null,
  trackedArchiveInsertionRevision: 0,
  currentInsertionLock: { locked: false },
  showArchiveInsertionProgress(session, options) { shown.push({ session: { ...session }, options: { ...options } }); },
  logAppEvent(event, details, level) { logged.push({ event, details, level }); return Promise.resolve(); },
  String, Number, Math, Promise
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(`${helper}\n${apply}\nthis.setTracked = setTrackedArchiveInsertionId; this.apply = applyArchiveInsertionSessionSnapshot;`, ctx);

assert.strictEqual(ctx.apply({ archiveInsertionId: 'A', revision: 1, status: 'running', stage: 'filling' }, { source: 'event' }), true);
assert.strictEqual(ctx.trackedArchiveInsertionId, 'A');
assert.strictEqual(ctx.trackedArchiveInsertionRevision, 1);
assert.strictEqual(shown.length, 1);

assert.strictEqual(ctx.apply({ archiveInsertionId: 'A', revision: 3, status: 'complete', stage: 'complete' }, { source: 'event' }), true);
assert.strictEqual(ctx.trackedArchiveInsertionRevision, 3);
assert.strictEqual(shown.at(-1).session.status, 'complete');

assert.strictEqual(ctx.apply({ archiveInsertionId: 'A', revision: 2, status: 'saving', stage: 'inventory-saving' }, { source: 'late-event' }), false);
assert.strictEqual(ctx.trackedArchiveInsertionRevision, 3);
assert.strictEqual(shown.length, 2, 'stale snapshot must not repaint the modal');
assert.ok(logged.some(item => item.event === 'ARCHIVE_INSERTION_UI_SNAPSHOT_IGNORED'));

ctx.currentInsertionLock = { locked: true, kind: 'archive-insertion', ownerId: 'B' };
assert.strictEqual(ctx.apply({ archiveInsertionId: 'B', revision: 1, status: 'running', stage: 'filling' }, { source: 'lock-reentry' }), true);
assert.strictEqual(ctx.trackedArchiveInsertionId, 'B');
assert.strictEqual(ctx.trackedArchiveInsertionRevision, 1, 'new workflow must reset revision baseline');

assert.strictEqual(ctx.apply({ archiveInsertionId: 'C', revision: 9, status: 'complete', stage: 'complete' }, { source: 'cross-talk' }), false);
assert.strictEqual(ctx.trackedArchiveInsertionId, 'B');
assert.strictEqual(ctx.trackedArchiveInsertionRevision, 1);

console.log('PASS v1.20.11 archive progress runtime monotonicity');
