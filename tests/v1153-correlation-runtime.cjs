const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const bg = fs.readFileSync(path.join(root, 'background.js'), 'utf8');
const fields = bg.match(/const CORRELATION_CONTEXT_FIELDS = Object\.freeze\(\[[\s\S]*?\]\);/)?.[0] || '';
const start = bg.indexOf('function correlationContext');
const end = bg.indexOf('\nasync function resolveClientDiagnosticCorrelation', start);
assert.ok(fields && start >= 0 && end > start, 'correlation helper block not found');
const sandbox = {};
sandbox.globalThis = sandbox;
vm.runInNewContext(`${fields}\n${bg.slice(start, end)}\nglobalThis.__ctx = correlationContext; globalThis.__resolve = correlationContextFromBindings;`, sandbox);

const bindings = {
  bulkRun: { operationId: 'bulk-op', bulkRunId: 'bulk-run', runId: 'bulk-run', sourceTabId: 10, workerTabId: 11, metadataTabId: 12 },
  fillSessions: {
    f1: { operationId: 'renewal-op', parentOperationId: 'batch-op', renewalId: 'r1', fillId: 'f1', massBatchId: 'm1', targetTabId: 21 }
  },
  renewalSessions: {
    r1: { operationId: 'renewal-op', parentOperationId: 'batch-op', renewalId: 'r1', fillId: 'f1', massBatchId: 'm1', targetTabId: 21 }
  },
  massBatch: { operationId: 'batch-op', parentOperationId: null, batchId: 'm1', items: [{ operationId: 'renewal-op', parentOperationId: 'batch-op', renewalId: 'r1', index: 0 }] }
};

const fromBulkWorker = sandbox.__resolve({ senderTabId: 11 }, bindings);
assert.strictEqual(fromBulkWorker.operationId, 'bulk-op');
assert.strictEqual(fromBulkWorker.bulkRunId, 'bulk-run');
assert.strictEqual(fromBulkWorker.runId, 'bulk-run');

const fromFillTab = sandbox.__resolve({ senderTabId: 21 }, bindings);
assert.strictEqual(fromFillTab.operationId, 'renewal-op');
assert.strictEqual(fromFillTab.parentOperationId, 'batch-op');
assert.strictEqual(fromFillTab.renewalId, 'r1');
assert.strictEqual(fromFillTab.fillId, 'f1');
assert.strictEqual(fromFillTab.massBatchId, 'm1');

const item = sandbox.__resolve({ massBatchId: 'm1', renewalId: 'r1' }, bindings);
assert.strictEqual(item.operationId, 'renewal-op');
assert.strictEqual(item.parentOperationId, 'batch-op');

const batch = sandbox.__resolve({ massBatchId: 'm1' }, bindings);
assert.strictEqual(batch.operationId, 'batch-op');
assert.strictEqual(batch.parentOperationId, undefined);

const legacy = sandbox.__resolve({ renewalId: 'legacy-r' }, { renewalSessions: { 'legacy-r': { renewalId: 'legacy-r', fillId: 'legacy-f' } } });
assert.strictEqual(legacy.renewalId, 'legacy-r');
assert.strictEqual(legacy.fillId, 'legacy-f');
assert.strictEqual(legacy.operationId, undefined);

console.log('PASS v1.15.3 A2b correlation binding runtime semantics');
