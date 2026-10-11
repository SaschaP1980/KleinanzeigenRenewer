const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bg = require('./v12215-source-surface.cjs');
const runner = fs.readFileSync(path.join(root, 'inventory-runner.js'), 'utf8');

function between(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.ok(start >= 0, `missing start ${startNeedle}`);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(end > start, `missing end ${endNeedle}`);
  return source.slice(start, end);
}

// Bulk correlation must exist before the fresh source is created and remain authoritative through init.
const freshStart = between(bg, 'async function startBulkInventoryOperation', '\nasync function probeLiveKleinanzeigenAccount');
assert.match(freshStart, /const operationId\s*=\s*crypto\.randomUUID\(\)/);
assert.match(freshStart, /BULK_SOURCE_OPERATION_OPENED[\s\S]*operationId/);
assert.match(freshStart, /START_BULK_INVENTORY_FROM_FRESH_SOURCE[\s\S]*operationId/);

const initBulk = between(bg, 'async function initBulkRun', '\nasync function bulkRunForSource');
assert.match(initBulk, /const operationId\s*=\s*normalizeCorrelationId\(message\.operationId\)/);
assert.match(initBulk, /operationId:\s*operationId\s*\|\|\s*crypto\.randomUUID\(\)/);

const afterRefresh = between(runner, 'async function startBulkInventoryFromFreshSource', '\n  async function autoResume');
assert.match(afterRefresh, /operationId\s*=\s*''/);
assert.match(afterRefresh, /type:\s*'BULK_INIT_RUN'[\s\S]*operationId/);
assert.match(runner, /START_BULK_INVENTORY_FROM_FRESH_SOURCE[\s\S]*message\.operationId/);

// Summary must roll direct and nested child operations into a parent operation scope.
assert.match(bg, /function diagnosticOperationScopeIds\s*\(/);
assert.match(bg, /parentOperationId/);
assert.match(bg, /diagnosticOperationScopeIds\(sessionEvents, latestOperationId\)/);

// Expected absence during deletion verification must not emit a warning.
const verifyAbsent = between(runner, 'async function verifyOwnAdAbsentById', '\n  async function processListing');
assert.match(verifyAbsent, /findOwnAdById\(wanted, correlation, \{\s*notFoundSeverity:\s*'info'/);

console.log('PASS v1.15.4 A2 closeout contract');
