const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const bg = fs.readFileSync(path.join(root, 'diagnostic-export-service.js'), 'utf8');
const start = bg.indexOf('function diagnosticOperationScopeIds');
const end = bg.indexOf('\nasync function buildDiagnosticExport', start);
assert.ok(start >= 0 && end > start, 'diagnostic operation scope helper not found');
const sandbox = {};
sandbox.globalThis = sandbox;
vm.runInNewContext(`${bg.slice(start, end)}\nglobalThis.__scope = diagnosticOperationScopeIds;`, sandbox);

const events = [
  { context: { operationId: 'batch-op' } },
  { context: { operationId: 'child-1', parentOperationId: 'batch-op' }, severity: 'warning' },
  { context: { operationId: 'child-2', parentOperationId: 'batch-op' } },
  { context: { operationId: 'grandchild', parentOperationId: 'child-2' }, severity: 'error' },
  { context: { operationId: 'unrelated' }, severity: 'error' }
];
const scope = sandbox.__scope(events, 'batch-op');
const ids = [...scope].sort();
assert.deepStrictEqual(ids, ['batch-op', 'child-1', 'child-2', 'grandchild']);

const childScope = [...sandbox.__scope(events, 'child-1')].sort();
assert.deepStrictEqual(childScope, ['child-1']);

const noScope = sandbox.__scope(events, '');
assert.strictEqual(noScope.size, 0);

console.log('PASS v1.15.4 parent-child diagnostic rollup runtime semantics');
