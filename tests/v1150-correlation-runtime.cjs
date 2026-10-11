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
vm.runInNewContext(`${fields}\n${bg.slice(start, end)}\nglobalThis.__ctx = correlationContext; globalThis.__sessionCtx = sessionCorrelationContext;`, sandbox);

const merged = sandbox.__ctx(
  { operationId: 'op-first', renewalId: 'renewal-1', runId: 'run-1', ignored: 'x' },
  { operationId: 'op-second', fillId: 'fill-1', parentOperationId: 'parent-1' }
);
assert.deepStrictEqual(JSON.parse(JSON.stringify(merged)), {
  operationId: 'op-first',
  renewalId: 'renewal-1',
  runId: 'run-1',
  parentOperationId: 'parent-1',
  fillId: 'fill-1'
});

const session = sandbox.__sessionCtx(
  { operationId: 'op-2', parentOperationId: 'parent-2', renewalId: 'r-2', fillId: 'f-2', massBatchId: 'm-2' },
  { adId: '123', targetTabId: 55 }
);
assert.strictEqual(session.operationId, 'op-2');
assert.strictEqual(session.parentOperationId, 'parent-2');
assert.strictEqual(session.renewalId, 'r-2');
assert.strictEqual(session.fillId, 'f-2');
assert.strictEqual(session.massBatchId, 'm-2');
assert.strictEqual(session.adId, '123');
assert.strictEqual(session.targetTabId, 55);

// Legacy v1.14.5 objects remain valid and are not assigned invented IDs by the helper.
const legacy = sandbox.__ctx({ renewalId: 'legacy-renewal', fillId: 'legacy-fill' });
assert.strictEqual(legacy.operationId, undefined);
assert.strictEqual(legacy.parentOperationId, undefined);
assert.strictEqual(legacy.renewalId, 'legacy-renewal');
assert.strictEqual(legacy.fillId, 'legacy-fill');

console.log('PASS v1.15.0 correlation helper runtime semantics');
