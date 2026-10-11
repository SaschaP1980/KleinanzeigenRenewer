const fs = require('node:fs');
const assert = require('node:assert/strict');

const bg = fs.readFileSync('background.js', 'utf8');
const profile = fs.readFileSync('profile-repository.js', 'utf8');
const inventory = fs.readFileSync('inventory-repository.js', 'utf8');
const images = fs.readFileSync('inventory-image-store.js', 'utf8');
const trash = fs.readFileSync('trash-service.js', 'utf8');
const profileManagement = fs.readFileSync('profile-management-controller.js', 'utf8');
let n = 0;
const pass = label => { n += 1; console.log(`PASS ${label}`); };

assert.match(bg, /^importScripts\("\.\.\/shared\/runtime-deps\.js", "\.\.\/shared\/message-contract-registry\.js", (?:"\.\.\/shared\/renewal-policy\.js", "background-message-router\.js", )?"repositories\/profile-repository\.js", "repositories\/inventory-repository\.js", "repositories\/inventory-image-store\.js", "services\/trash-service\.js",/);
pass('repository and trash modules load before background entrypoint');

for (const dep of ['KRProfileRepository','KRInventoryRepository','KRInventoryImageStore','KRTrashService']) assert.match(bg, new RegExp(`KRDeps\\.require\\('${dep}'\\)`));
pass('background consumes all v1.22.11 modules through KRDeps');

assert.doesNotMatch(bg, /indexedDB\.open\(/);
assert.doesNotMatch(bg, /sharedInventoryDatabasePromise/);
assert.match(inventory, /let sharedDatabasePromise = null/);
assert.match(inventory, /indexedDB\.open\(dbName, dbVersion\)/);
pass('IndexedDB connection and schema ownership moved to inventory repository');

assert.match(inventory, /createIndex\('profileId', 'profileId'\)/);
assert.match(inventory, /createIndex\('trashExpiresAt', 'trash\.expiresAt'\)/);
assert.match(inventory, /async function readForProfile/);
assert.match(inventory, /async function readTrashExpiryState[\s\S]*?index\('trashExpiresAt'\)[\s\S]*?openCursor\(\)/);
pass('inventory repository preserves indexed profile and trash-expiry hot paths');

assert.match(inventory, /async function commit\(record, stagedImages\)/);
assert.match(inventory, /db\.transaction\(\[inventoryStoreName, imageStoreName\], 'readwrite'\)/);
assert.match(inventory, /Vorhandener Bildbestand bleibt erhalten/);
assert.match(inventory, /async function deleteWithImages/);
pass('inventory repository owns atomic inventory-image persistence and deletion');

assert.match(profile, /async function read\(\)/);
assert.match(profile, /async function ensure\(profileName\)/);
assert.match(profile, /async function persistImportedProfile/);
assert.match(profile, /async function removeProfileMetadata/);
assert.doesNotMatch(bg, /chrome\.storage\.local\.get\(\[PROFILES_KEY, ACTIVE_PROFILE_KEY, SELECTED_PROFILE_KEY\]\)/);
pass('profile metadata persistence moved to profile repository');

assert.match(images, /async function get\(imageKey\)[\s\S]*?openSharedDatabase\(\)/);
assert.match(images, /async function deleteByInventoryId\(inventoryId\)[\s\S]*?index\('inventoryId'\)\.openKeyCursor/);
assert.match(bg, /requireInventoryImageStore\(\)\.get\(imageKey\)/);
pass('local image reads and scoped image cleanup moved to inventory image store');

assert.doesNotMatch(bg, /let trashPurgeNextDueAt = null/);
assert.match(trash, /let nextPurgeDueAt = null/);
assert.match(trash, /async function moveToTrash/);
assert.match(trash, /async function resetRetention/);
assert.match(trash, /async function purgeExpired/);
assert.match(trash, /repository\.readTrashExpiryState\(nowMs\)/);
pass('trash retention state and storage mechanics moved to trash service');

const deleteProfile = profileManagement.match(/async function deleteProfile\(message\) \{[\s\S]*?\n      \}\n\n      async function ensureProfile/)?.[0] || '';
assert.match(deleteProfile, /aktiver Renewal-Vorgang/);
assert.match(deleteProfile, /getInventoryRepository\(\)\.unassignProfileRecords/);
assert.match(deleteProfile, /requireProfileRepository\(\)\.removeProfileMetadata/);
assert.doesNotMatch(deleteProfile, /deleteInventoryStorageRecord\(/);
assert.match(bg, /async function deleteProfile\(message\) \{ return requireProfileManagementController\(\)\.deleteProfile\(message\); \}/);
pass('profile-management controller retains profile-deletion workflow gate while background keeps a thin facade');

assert.match(bg, /function openDatabase\(\) \{ return requireInventoryRepository\(\)\.openDatabase\(\); \}/);
assert.match(bg, /async function readProfiles\(\) \{ return requireProfileManagementController\(\)\.readProfiles\(\); \}/);
assert.match(bg, /async function getInventory\(inventoryId\) \{ return requireInventoryRepository\(\)\.get\(inventoryId\); \}/);
assert.match(bg, /async function getInventoryImage\(imageKey\) \{ return requireInventoryImageStore\(\)\.get\(imageKey\); \}/);
pass('background keeps thin compatibility facades for existing workflow call sites');

assert.doesNotMatch(bg, /requestSubmit\s*\(|\.submit\s*\(/);
pass('publish safety keeps direct form submit bypasses absent');

console.log(`${n}/${n} PASS v1.22.11 modularization contract`);
