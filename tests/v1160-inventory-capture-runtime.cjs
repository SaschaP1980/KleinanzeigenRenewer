const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const fn = app.match(/function inventoryCaptureBulkProgressModel\(state\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.ok(fn, 'inventoryCaptureBulkProgressModel must exist');
const context = {};
vm.createContext(context);
vm.runInContext(`${fn}; this.model = inventoryCaptureBulkProgressModel;`, context);
const model = context.model;

const running = model({ status: 'running', successCount: 2, failedCount: 1, expectedTotal: 7, currentTitle: 'Langer Titel' });
assert.equal(running.terminal, false);
assert.equal(running.processed, 3);
assert.equal(running.total, 7);
assert.ok(running.percent >= 42 && running.percent <= 43);
assert.equal(running.title, 'Wird gerade erfasst');

const complete = model({ status: 'complete', successCount: 7, failedCount: 0, expectedTotal: 7 });
assert.equal(complete.terminal, true);
assert.equal(complete.kind, 'success');
assert.equal(complete.percent, 100);
assert.match(complete.facts, /7 gefunden/);

const partial = model({ status: 'complete-with-errors', successCount: 6, failedCount: 1, expectedTotal: 7 });
assert.equal(partial.terminal, true);
assert.equal(partial.kind, 'error');
assert.match(partial.facts, /1 fehlgeschlagen/);

const review = model({ status: 'needs-review', successCount: 5, failedCount: 0, expectedTotal: 7 });
assert.equal(review.terminal, true);
assert.equal(review.kind, 'waiting');

console.log('PASS v1.16.0 inventory capture bulk progress model runtime');
