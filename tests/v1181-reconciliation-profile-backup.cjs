const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('app.html', 'utf8');
const css = fs.readFileSync('app.css', 'utf8');
const js = require('./v12210-source-surface.cjs');
const bg = [fs.readFileSync('background.js', 'utf8'), fs.readFileSync('bulk-inventory-controller.js', 'utf8'), fs.readFileSync('src/background/services/bulk-reconciliation-service.js', 'utf8')].join('\n');
const runner = fs.readFileSync('inventory-runner.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
let failures = 0; let passes = 0;
function check(label, fn) { try { fn(); passes += 1; console.log(`PASS ${label}`); } catch (error) { failures += 1; console.error(`FAIL ${label}: ${error.message}`); } }
check('v1.18.1 version is declared', () => { assert.ok(['1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version)); assert.equal(pkg.version, manifest.version); });
check('bulk inventory records an explicit first remote roster', () => {
  assert.match(bg, /remoteRosterPages/);
  assert.match(bg, /BULK_RECORD_ROSTER_PAGE/);
  assert.match(runner, /type:\s*['"]BULK_RECORD_ROSTER_PAGE['"]/);
});
check('independent reconciliation scan is a separate visible step', () => {
  assert.match(html, /data-capture-step="3"[\s\S]*(?:Bestand prüfen|Bestand bestätigen)/);
  assert.match(html, /data-capture-step="4"[\s\S]*Ergebnis/);
  assert.match(runner, /runReconciliationLoop/);
  assert.match(bg, /BULK_FINISH_RECONCILIATION/);
  assert.match(js, /Bestand erneut prüfen|Bestand zur Sicherheit erneut prüfen|Der Anzeigenbestand wird erneut geprüft/);
});
check('reconciliation requires matching complete rosters before mutation', () => {
  assert.match(bg, /reconciliationRosterPages/);
  assert.match(bg, /firstRoster[\s\S]*secondRoster|remoteRosterIds[\s\S]*reconciliationRosterIds/);
  assert.match(bg, /Bestandsabgleich[\s\S]*übersprungen|reconciliation[\s\S]*skipped/i);
  assert.match(bg, /bulk-reconciliation-absent/);
});
check('reconciliation preserves workflow-protected records and uses trash', () => {
  assert.match(bg, /protectedInventoryIdsForReconciliation/);
  assert.match(bg, /trashRecordFrom\(record,\s*['"]bulk-reconciliation-absent['"]/);
  assert.match(bg, /BULK_RECONCILIATION_MOVED_TO_TRASH/);
});
check('profile manager exposes backup export and import', () => {
  assert.match(html, /id="profileBackupFileInput"/);
  assert.match(html, /id="profileImportButton"/);
  assert.match(js, /Inventarprofil sichern/);
  assert.match(html, /Profil aus Sicherung wiederherstellen/);
  assert.match(html, /profile-backup\.js/);
});
check('profile backup includes inventory trash and images with integrity manifest', () => {
  const backup = fs.readFileSync('profile-backup.js', 'utf8');
  assert.match(backup, /kleinanzeigen-renewal-profile-backup/);
  assert.match(backup, /activeInventory/);
  assert.match(backup, /trashEntries/);
  assert.match(backup, /images/);
  assert.match(backup, /sha256/i);
});
check('profile import is replace-only on identity conflict and never restores workflow sessions', () => {
  assert.match(bg, /PREPARE_PROFILE_BACKUP_IMPORT/);
  assert.match(bg, /FINALIZE_PROFILE_BACKUP_IMPORT/);
  assert.match(js, /Bestehendes Profil vollständig ersetzen/);
  assert.match(js, /replaceExisting/);
  const backup = fs.readFileSync('profile-backup.js', 'utf8');
  assert.doesNotMatch(backup, /renewalSessionsV1|massRenewalBatchV1|templateFillSessions/);
});
if (failures) { console.error(`${failures} v1.18.1 contract group(s) failed; ${passes} passed`); process.exit(1); }
console.log(`${passes} v1.18.1 contract groups passed`);
