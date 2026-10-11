const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const app = read('app.js');
const html = read('app.html');
const backup = read('profile-backup-controller.js');
const formatting = read('inventory-formatting.js');
const render = read('inventory-render-controller.js');

const activeApp = app;

let pass = 0;
const check = (name, fn) => { fn(); pass += 1; console.log(`PASS ${name}`); };

check('v1.22.10 modules load before app entrypoint', () => {
  for (const file of ['profile-backup-controller.js', 'inventory-formatting.js', 'inventory-render-controller.js']) {
    assert.ok(html.indexOf(file) >= 0, `${file} missing from app.html`);
    assert.ok(html.indexOf(file) < html.indexOf('app.js'), `${file} must load before app.js`);
  }
});

check('app consumes all v1.22.10 modules through KRDeps', () => {
  assert.match(activeApp, /KRDeps\.require\('KRProfileBackupController'\)/);
  assert.match(activeApp, /KRDeps\.require\('KRInventoryFormatting'\)/);
  assert.match(activeApp, /KRDeps\.require\('KRInventoryRenderController'\)/);
});

check('profile backup controller owns transfer and picker mutable state', () => {
  assert.match(backup, /let profileTransferLock = null/);
  assert.match(backup, /let profileBackupPickerActive = false/);
  assert.match(backup, /let profileBackupPickerCancelledAt = 0/);
  assert.doesNotMatch(activeApp, /let profileTransferLock\s*=\s*null/);
  assert.doesNotMatch(activeApp, /let profileBackupPickerActive\s*=\s*false/);
  assert.doesNotMatch(activeApp, /let profileBackupPickerCancelledAt\s*=\s*0/);
});

check('profile backup controller owns indexed snapshot and atomic replace mechanics', () => {
  for (const token of ['openProfileBackupDatabase', 'readProfileInventoryRows', 'readImagesForInventoryIds', 'snapshotProfileIndexedData', 'replaceProfileIndexedData']) {
    assert.match(backup, new RegExp(`function ${token}|async function ${token}`), `${token} missing from controller`);
    assert.doesNotMatch(activeApp, new RegExp(`function ${token}|async function ${token}`), `${token} must not remain active in app.js`);
  }
  assert.match(backup, /transaction\(\['inventories', 'images'\], 'readwrite'\)/);
  assert.match(backup, /PREPARE_PROFILE_BACKUP_IMPORT/);
  assert.match(backup, /FINALIZE_PROFILE_BACKUP_IMPORT/);
  assert.match(backup, /PROFILE_BACKUP_IMPORT_ROLLBACK_FAILED/);
});

check('app retains profile workflow safety blocker and thin backup delegates', () => {
  assert.match(activeApp, /function profileTransferStartBlocker\(\)/);
  assert.match(activeApp, /insertionLockActive\(\)/);
  assert.match(activeApp, /singleInventoryCaptureBusy\(\)/);
  assert.match(activeApp, /async function exportProfileBackup\(profile\) \{ return requireProfileBackupController\(\)\.exportProfileBackup\(profile\); \}/);
  assert.match(activeApp, /async function importProfileBackupFile\(file\) \{ return requireProfileBackupController\(\)\.importProfileBackupFile\(file\); \}/);
});

check('inventory formatting has one dedicated dependency-registered owner', () => {
  assert.match(formatting, /KRInventoryFormatting/);
  assert.match(formatting, /KRDeps\?\.register\?\.\('KRInventoryFormatting', API\)/);
  for (const fn of ['displayPrice', 'categoryLabel', 'compactCategoryLabel', 'listingDatePresentation', 'renewalStatusLabel', 'trashRetentionPresentation']) {
    assert.match(formatting, new RegExp(`function ${fn}\\(`), `${fn} missing from formatting module`);
  }
});

check('inventory render controller owns detailed and compact render implementation', () => {
  for (const fn of ['createCompactListRow', 'renderCompactInventoryRow', 'renderCompactTrashRow', 'buildFullImageStrip', 'makeInventoryExportActionButton']) {
    assert.match(render, new RegExp(`function ${fn}\\(`), `${fn} missing from render controller`);
    assert.doesNotMatch(activeApp, new RegExp(`function ${fn}\\(`), `${fn} must not remain active in app.js`);
  }
  assert.match(render, /let currentRecords = \[\]/);
  assert.match(render, /let currentTrashRecords = \[\]/);
  assert.match(render, /let globalListViewMode = 'detailed'/);
});

check('app remains render orchestrator through thin context-aware facades', () => {
  assert.match(activeApp, /function renderInventories\(records = currentRecords\)[\s\S]{0,700}controller\.updateContext\([\s\S]{0,400}controller\.renderInventories\(currentRecords\)/);
  assert.match(activeApp, /function renderTrash\(records = currentTrashRecords\)[\s\S]{0,700}controller\.updateContext\([\s\S]{0,400}controller\.renderTrash\(currentTrashRecords\)/);
});

check('historical lexical contracts use a test-only composed source surface', () => {
  assert.doesNotMatch(app, /legacyStaticContractMirrorV12210/);
  const surface = read('tests/v12210-source-surface.cjs');
  assert.match(surface, /profile-backup-controller\.js/);
  assert.match(surface, /inventory-render-controller\.js/);
  assert.match(surface, /inventory-formatting\.js/);
});

check('publish safety keeps direct form submit bypasses absent', () => {
  const runtime = [activeApp, backup, formatting, render, read('background.js'), read('template-filler.js')].join('\n');
  assert.doesNotMatch(runtime, /\.submit\s*\(/);
  assert.doesNotMatch(runtime, /requestSubmit\s*\(/);
});

console.log(`${pass}/10 PASS v1.22.10 modularization contract`);
