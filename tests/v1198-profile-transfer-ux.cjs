const fs = require('node:fs');
const assert = require('node:assert/strict');
const app = require('./v12210-source-surface.cjs') + '\n' + fs.readFileSync('archive-trash-insertion-ui-controller.js','utf8');
const html = fs.readFileSync('app.html','utf8');
function pass(x){ console.log('PASS '+x); }

assert.match(app, /let profileTransferLock\s*=\s*null/);
assert.match(app, /function acquireProfileTransferLock\(/);
assert.match(app, /function releaseProfileTransferLock\(/);
assert.match(app, /operationId/);
assert.match(app, /profileTransferLocked\(\)/);
assert.match(app, /Profil(?:sicherung|wiederherstellung) läuft/);
pass('profile backup and restore use one exclusive operation-correlated transfer lock');

assert.match(app, /profileBackupPickerActive/);
assert.match(app, /profileBackupFileInput\?\.addEventListener\(['"]cancel['"]/);
assert.match(app, /profileManagerDialog\?\.addEventListener\(['"]cancel['"][\s\S]*pickerCancelRecent/);
assert.match(app, /if \(!file\) return/);
pass('cancelling the native profile backup file picker keeps profile management open');

assert.match(app, /function friendlyProfileBackupImportError\(/);
assert.match(app, /Die ausgewählte Datei ist keine gültige Profilsicherung\./);
assert.match(app, /function friendlyArchiveImportError\(/);
assert.match(app, /Die ausgewählte Datei ist kein gültiger Anzeigenexport\./);
assert.match(app, /USER_PROFILE_BACKUP_IMPORT_FAILED/);
assert.match(app, /USER_ARCHIVE_IMPORT_VALIDATION_FAILED/);
pass('invalid ZIPs expose user-facing errors while technical details remain diagnostic');

assert.match(app, /ZIP konnte nicht verwendet werden/);
assert.match(app, /Profilsicherung konnte nicht wiederhergestellt werden/);
pass('activity/status messages use the same friendly ZIP error classification');

assert.match(html, /id="profileImportButton"/);
console.log('4 v1.19.8 profile transfer/UX groups passed');
