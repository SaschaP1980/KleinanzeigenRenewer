const fs = require('node:fs');
const assert = require('node:assert/strict');
const bg = require('./v12215-source-surface.cjs');
const diagnostics = fs.readFileSync('diagnostics-service.js', 'utf8');
const repo = fs.readFileSync('inventory-repository.js', 'utf8');
const trash = fs.readFileSync('trash-service.js', 'utf8');
let n = 0; const pass = label => { n += 1; console.log(`PASS ${n}: ${label}`); };

assert.match(bg, /function isTransientTemplateFillProgress\(/); pass('transient template-fill progress classifier exists');
assert.match(bg, /image-\\d\+-of-\\d\+-\(queued\|uploading\|checking\|stable\)/); pass('ordinary image micro-progress is explicitly transient');
const updateStart = bg.indexOf('async function updateTemplateFillSession');
const updateEnd = bg.indexOf('\nfunction ', updateStart + 40);
const updateBlock = bg.slice(updateStart, updateEnd > updateStart ? updateEnd : updateStart + 12000);
assert.match(updateBlock, /isTransientTemplateFillProgress\(requestedStage, requestedStatus, message\.result\)/); pass('fill update detects transient micro-progress');
assert.match(updateBlock, /queueMassRenewalProgress\(transientProgressSnapshot\)/); pass('transient batch progress is coalesced without immediate batch mutation');
assert.match(updateBlock, /transientProgress:\s*true/); pass('transient progress returns without pretending it was durably checkpointed');
assert.doesNotMatch(bg, /async function touchMassRenewalProgressForFill\(/); pass('old per-stage fill-session reread plus immediate mass-batch mutation path is removed');

assert.match(repo, /let sharedDatabasePromise = null;/); pass('inventory repository owns a reusable IndexedDB connection for hot reads');
assert.match(repo, /function openSharedDatabase\(/); pass('shared IndexedDB connection helper exists');
assert.match(repo, /onversionchange\s*=\s*\(\)\s*=>/); pass('shared connection closes safely on schema version change');
const profileReadStart = bg.indexOf('async function readInventoryRecordsForProfile');
const profileReadEnd = bg.indexOf('\nasync function purgeExpiredTrash', profileReadStart);
const profileReadBlock = bg.slice(profileReadStart, profileReadEnd);
assert.match(profileReadBlock, /requireInventoryRepository\(\)\.readForProfile\(profileId\)/); assert.match(repo, /async function readForProfile[\s\S]*?openSharedDatabase\(\)/); pass('profile-index hot reads reuse the shared DB connection');
const getStart = bg.indexOf('async function getInventory(inventoryId)'); const getEnd = bg.indexOf('\nasync function getInventoryImage', getStart); assert.match(bg.slice(getStart,getEnd), /requireInventoryRepository\(\)\.get\(inventoryId\)/); assert.match(repo, /async function get\(inventoryId\)[\s\S]*?openSharedDatabase\(\)/); pass('renewal skeleton reads reuse the shared DB connection');
const putStart = bg.indexOf('async function putInventoryRecordOnly'); const putEnd = bg.indexOf('\nfunction renewalInsertionMeta', putStart); assert.match(bg.slice(putStart,putEnd), /requireInventoryRepository\(\)\.put\(record\)/); assert.match(repo, /async function put\(record\)[\s\S]*?openSharedDatabase\(\)/); pass('renewal skeleton writes reuse the shared DB connection');

assert.match(trash, /let nextPurgeDueAt = null;/); pass('trash purge caches the next relevant expiry');
assert.match(bg, /function invalidateTrashPurgeSchedule\(/); assert.match(trash, /function invalidatePurgeSchedule\(/); pass('trash mutations can invalidate the cached purge schedule');
const purgeStart = bg.indexOf('async function purgeExpiredTrash');
const purgeEnd = bg.indexOf('\nasync function listInventories', purgeStart);
const purgeBlock = bg.slice(purgeStart, purgeEnd);
assert.match(purgeBlock, /requireTrashService\(\)\.purgeExpired\(\)/); assert.match(trash, /shouldSkipPurge\(nowMs\)/); pass('ordinary list reads skip expiry queries until the next due timestamp');
assert.match(trash, /repository\.readTrashExpiryState\(nowMs\)/); assert.match(repo, /async function readTrashExpiryState[\s\S]*?index\('trashExpiresAt'\)[\s\S]*?openCursor\(\)/); pass('purge determines the next expiry from the indexed cursor');

assert.match(bg, /const DIAGNOSTIC_BATCH_FLUSH_MS = 1200;/); pass('routine diagnostic flush window is widened for lower write churn');
assert.match(bg, /const DIAGNOSTIC_BATCH_MAX_PENDING = 120;/); pass('diagnostic pending buffer tolerates larger routine batches');
assert.match(diagnostics, /let storedCache = null;/); pass('diagnostic storage state is cached inside the diagnostics service per worker lifetime');
const flushStart = diagnostics.indexOf('function flush()');
const flushEnd = diagnostics.indexOf('\n      function log(', flushStart);
const flushBlock = diagnostics.slice(flushStart, flushEnd);
assert.match(flushBlock, /loadStoredCache\(\)/); assert.doesNotMatch(flushBlock, /storageLocal\.get\(config\.diagnosticsKey\)/); pass('routine diagnostic flush avoids a storage read-modify-read cycle on every batch');

console.log(`${n} v1.20.3 hot-path contract groups passed`);
