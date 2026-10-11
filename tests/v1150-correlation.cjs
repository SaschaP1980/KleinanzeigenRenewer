const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const bg = require('./v12215-source-surface.cjs');
const filler = fs.readFileSync(path.join(root, 'template-filler.js'), 'utf8');

// A2a foundation: explicit additive correlation fields exist and legacy IDs stay intact.
assert.match(bg, /CORRELATION_CONTEXT_FIELDS/);
assert.match(bg, /operationId/);
assert.match(bg, /parentOperationId/);
assert.match(bg, /bulkRunId/);
assert.match(bg, /function correlationContext/);

const bulkInit = bg.slice(bg.indexOf('async function initBulkRun'), bg.indexOf('\nasync function bulkRunForSource'));
assert.match(bulkInit, /const runId = crypto\.randomUUID\(\)/);
assert.match(bulkInit, /bulkRunId:\s*runId/);
assert.match(bulkInit, /operationId:\s*(?:crypto\.randomUUID\(\)|operationId\s*\|\|\s*crypto\.randomUUID\(\))/);
assert.match(bulkInit, /runId/);

const startFillStart = bg.indexOf('async function startTemplateFillUnlocked');
const startFill = bg.slice(startFillStart, bg.indexOf('\nasync function startTemplateFill(', startFillStart));
assert.match(startFill, /const operationId = (?:crypto|cryptoApi)\.randomUUID\(\)/);
assert.match(startFill, /operationId,/);
assert.match(startFill, /parentOperationId/);
assert.match(startFill, /renewalId,/);
assert.match(startFill, /fillId,/);

const massStart = bg.slice(bg.indexOf('async function startMassRenewalBatch'), bg.indexOf('\nasync function requestMassRenewalStopAfterCurrent'));
assert.match(massStart, /operationId:\s*(?:crypto|cryptoApi)\.randomUUID\(\)/);
const massAdvance = bg.slice(bg.indexOf('async function startNextMassRenewalItem'), bg.indexOf('\nasync function reconcileMassRenewalBatchSession'));
assert.match(massAdvance, /parentOperationId:\s*batch\.operationId/);
assert.match(massAdvance, /item\.operationId\s*=\s*started\.operationId/);

const getFill = bg.slice(bg.indexOf('async function getTemplateFillSession'), bg.indexOf('\nfunction bytesToBase64'));
assert.match(getFill, /operationId:\s*session\.operationId/);
assert.match(getFill, /parentOperationId:\s*session\.parentOperationId/);

assert.match(filler, /activeCorrelationContext/);
assert.match(filler, /operationId/);
assert.match(filler, /parentOperationId/);

// Safety identity remains unchanged.
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const digest = crypto.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex');
assert.strictEqual(digest, '70507977688f3465a60227cd0261bd07d92fad620625cd7ebff8f0856d9c5ed3');
assert.deepStrictEqual(manifest.permissions, ['activeTab', 'storage', 'unlimitedStorage', 'scripting']);
assert.deepStrictEqual(manifest.host_permissions, [
  'https://www.kleinanzeigen.de/*',
  'https://kleinanzeigen.de/*',
  'https://img.kleinanzeigen.de/*'
]);

console.log('PASS v1.15.0 A2a correlation foundation contract');
