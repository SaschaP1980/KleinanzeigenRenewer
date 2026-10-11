const fs = require('fs');
const assert = require('assert');
let n = 0; const pass = m => { n += 1; console.log(`PASS ${n}: ${m}`); };
const bg = require('./v12215-source-surface.cjs');
const repo = fs.readFileSync('inventory-repository.js','utf8');
const trash = fs.readFileSync('trash-service.js','utf8');
const app = require('./v12210-source-surface.cjs');
assert.match(bg, /const DB_VERSION = 2;/); assert.match(repo, /dbVersion \|\| 2/); pass('IndexedDB schema is upgraded to version 2');
assert.doesNotMatch(app, /indexedDB\.open\('kleinanzeigen-renewal', 1\)/); assert.match(app, /indexedDB\.open\('kleinanzeigen-renewal'\)/); pass('app-side direct DB opens are version-neutral so only background owns schema migration');
assert.match(repo, /createIndex\(["']profileId["'],\s*["']profileId["']/); pass('inventory store has a profileId index');
assert.match(repo, /createIndex\(["']trashExpiresAt["'],\s*["']trash\.expiresAt["']/); pass('inventory store has a trash expiry index');
assert.match(bg, /async function readInventoryRecordsForProfile\(/); pass('profile-scoped reader exists');
const listStart = bg.indexOf('async function listInventories');
const listEnd = bg.indexOf('\nasync function listTrashEntries', listStart);
assert.match(bg.slice(listStart, listEnd), /readInventoryRecordsForProfile\(profileId\)/); assert.doesNotMatch(bg.slice(listStart, listEnd), /readAllInventoryRecords/); pass('active inventory listing is profile-indexed instead of global getAll');
const trashStart = bg.indexOf('async function listTrashEntries');
const trashEnd = [
  bg.indexOf('\n\nasync function setAccountGateDiagnosticState', trashStart),
  bg.indexOf('\n\nfunction diagnosticInventorySummary', trashStart)
].filter(index => index > trashStart).sort((a, b) => a - b)[0] ?? bg.length;
assert.match(bg.slice(trashStart, trashEnd), /requireTrashService\(\)\.list\(profileId\)/); assert.match(trash, /repository\.readForProfile\(profileId\)/); assert.doesNotMatch(bg.slice(trashStart, trashEnd), /readAllInventoryRecords/); pass('trash listing is profile-indexed instead of global getAll');
const purgeStart = bg.indexOf('async function purgeExpiredTrash');
const purgeEnd = bg.indexOf('\nasync function listInventories', purgeStart);
assert.match(bg.slice(purgeStart, purgeEnd), /requireTrashService\(\)\.purgeExpired\(\)/); assert.match(trash, /repository\.readTrashExpiryState\(nowMs\)/); assert.match(repo, /index\(["']trashExpiresAt["']\)/); pass('trash expiry purge uses its index instead of scanning the inventory store');

const countStart = bg.indexOf('async function countUnprofiledInventories');
const countEnd = bg.indexOf('async function recognizeProfile', countStart);
assert.match(bg.slice(countStart, countEnd), /countUnassignedActive\(isTrashRecord\)/); assert.match(repo, /async function countUnassignedActive[\s\S]*?openCursor\(\)/); assert.doesNotMatch(bg.slice(countStart, countEnd), /listInventories\(/); pass('profile recognition counts legacy unassigned rows without list/purge getAll churn');
const reconcileStart = bg.indexOf('async function moveReconciliationCandidatesToTrash');
const reconcileEnd = bg.indexOf('\nasync function finishBulkReconciliation', reconcileStart);
assert.match(bg.slice(reconcileStart, reconcileEnd), /readInventoryRecordsForProfile\(state\.profileId\)/); pass('reconciliation scopes its inventory read by profile index');
const initStart = bg.indexOf('async function initBulkRun');
const initEnd = bg.indexOf('\nasync function bulkRunForSource', initStart);
assert.match(bg.slice(initStart, initEnd), /readInventoryRecordsForProfile\(profile\.profileId\)/); pass('delta inventory bootstrap reads known ids from the selected profile only');
assert.match(app, /async function readProfileInventoryRows[\s\S]*index\('profileId'\)\.getAll/); pass('profile backup snapshot uses the profile index when available');
assert.match(app, /async function readImagesForInventoryIds[\s\S]*index\('inventoryId'\)[\s\S]*getAll/); pass('profile backup image snapshot uses the existing inventoryId image index');

console.log(`${n} v1.20.2 A7 IndexedDB groups passed`);
