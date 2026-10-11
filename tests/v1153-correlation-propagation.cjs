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

// Central client-event correlation must recover workflow context from persisted bindings.
assert.match(bg, /async function resolveClientDiagnosticCorrelation\s*\(/);
assert.match(bg, /senderTabId/);
assert.match(bg, /sourceTabId/);
assert.match(bg, /workerTabId/);
assert.match(bg, /metadataTabId/);
assert.match(bg, /targetTabId/);
assert.match(bg, /logClientDiagnostic[\s\S]*resolveClientDiagnosticCorrelation/);

// Renewal correlation must survive the publish -> verification -> phase-4 tail.
const confirmRenewal = between(bg, 'async function confirmPublishedRenewal', '\nasync function resumePendingRenewals');
assert.match(confirmRenewal, /RENEWAL_NEW_ID_CONFIRMED[\s\S]*sessionCorrelationContext\(renewal/);
const fastVerify = between(bg, 'async function runFastRenewalVerification', '\nasync function runRenewalReinventory');
assert.match(fastVerify, /RENEWAL_FAST_MODE_VERIFICATION_STARTED[\s\S]*sessionCorrelationContext\(session/);
assert.match(fastVerify, /RENEWAL_FAST_MODE_PRESENCE_ATTEMPT[\s\S]*sessionCorrelationContext\(session/);
const finishReplacement = between(bg, 'async function finishRenewalReplacement', '\nasync function discardRenewalDraft');
assert.match(finishReplacement, /RENEWAL_REPLACEMENT_COMPLETED[\s\S]*sessionCorrelationContext\(session/);
assert.match(finishReplacement, /RENEWAL_SOURCE_DELETE_VERIFIED[\s\S]*sessionCorrelationContext\(session/);

// Mass batch events use the batch operation for batch events and child operation for item events.
const massAdvance = between(bg, 'async function startNextMassRenewalItem', '\nasync function reconcileMassRenewalBatchSession');
assert.match(massAdvance, /MASS_RENEWAL_BATCH_COMPLETED[\s\S]*sessionCorrelationContext\(batch/);
const massSucceeded = between(bg, 'async function markMassRenewalItemSucceeded', '\nasync function startMassRenewalBatch');
assert.match(massSucceeded, /MASS_RENEWAL_ITEM_SUCCEEDED[\s\S]*sessionCorrelationContext\(session/);

// Deep bulk events retain the run operation, not only runId.
for (const event of ['BULK_WORKERS_OPENED', 'BULK_WORKER_SAVED', 'BULK_ITEM_FINISHED', 'BULK_INVENTORY_FINISHED']) {
  const single = bg.indexOf(`'${event}'`);
  const double = bg.indexOf(`"${event}"`);
  const index = single >= 0 ? single : double;
  assert.ok(index >= 0, `${event} missing`);
  const snippet = bg.slice(index, index + 1400);
  assert.match(snippet, /sessionCorrelationContext\(state/,
    `${event} must use the persisted bulk run correlation`);
}


// Generic background failures and mass lifecycle failures retain best-effort workflow correlation too.
assert.match(bg, /resolveClientDiagnosticCorrelation\(message, sender\)[\s\S]*BACKGROUND_REQUEST_FAILED/);
assert.match(bg, /MASS_RENEWAL_BATCH_MUTATION_FAILED[\s\S]*sessionCorrelationContext\(batch/);
assert.match(bg, /MASS_RENEWAL_WATCHDOG_CHECK_FAILED[\s\S]*sessionCorrelationContext\(failedItem \|\| failedBatch/);

// Inventory-runner phase-4 diagnostics receive explicit correlation from the owning renewal request.
assert.match(runner, /function diagnostic\(event, details = \{\}, severity = 'info', context = \{\}\)/);
assert.match(runner, /\bcontext,/);
assert.match(runner, /verifyOwnAdAbsentById\(message\.adId, message\.correlation/);
assert.match(runner, /deleteOwnAdById\(message\.adId, message\.correlation/);

console.log('PASS v1.15.3 A2b correlation propagation contract');
