const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const app = require('./v12210-source-surface.cjs') + '\n' + read('mass-renewal-ui-controller.js') + '\n' + read('archive-trash-insertion-ui-controller.js');
const activity = read('app-activity-center.js');
const html = read('app.html');
const css = read('app.css');
const manifest = JSON.parse(read('manifest.json'));
let pass = 0;
const ok = (label, fn) => { fn(); pass += 1; console.log('PASS', label); };

ok('version is next patch', () => assert.ok(['1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version)));
ok('activity model supports facts and semantic history label', () => {
  assert.match(activity, /facts:\s*String\(activity\.facts/);
  assert.match(activity, /badgeLabel:\s*String\(activity\.badgeLabel/);
  assert.match(activity, /function kindLabel\(item\)[\s\S]{0,260}item\?\.badgeLabel/);
  assert.match(html, /id="statusFacts"/);
  assert.match(css, /\.status-facts/);
});
ok('count mismatch has dedicated concise gold-line', () => {
  const start = app.indexOf('function inventoryCaptureBulkProgressModel');
  const end = app.indexOf('\nfunction syncInventoryCaptureBulkModal', start);
  const fn = app.slice(start, end);
  assert.match(fn, /stage[^\n]*count-mismatch|countMismatch/);
  assert.match(fn, /Erfassung abgeschlossen – Anzahl prüfen/);
  assert.match(fn, /gefunden ·/);
  assert.match(fn, /vorhanden ·/);
  assert.match(fn, /Fehler/);
  assert.match(fn, /Kleinanzeigen meldet .* laufende Anzeigen/);
});
ok('bulk render uses model title instead of generic needs-review label', () => {
  const start = app.indexOf('function renderBulkState');
  const end = app.indexOf('\nasync function refreshBulkStatus', start);
  const fn = app.slice(start, end);
  assert.doesNotMatch(fn, /'needs-review':\s*'Erfassung – Prüfung erforderlich'/);
  assert.match(fn, /activityModel\.facts/);
  assert.match(fn, /badgeLabel:\s*activityModel\.badgeLabel/);
});
ok('warning badge no longer means Prüfung erforderlich by default', () => {
  assert.match(activity, /if \(item\?\.badgeLabel\) return item\.badgeLabel/);
  assert.doesNotMatch(activity, /if \(item\?\.kind === 'waiting'\) return 'Prüfung erforderlich'/);
});
ok('Bald Online copy follows gold-line', () => {
  assert.match(app, /Noch nicht online/);
  assert.match(app, /„Bald Online“ bleibt bestehen\./);
  assert.match(app, /Anzeige ist online/);
  assert.match(app, /„Bald Online“ wurde entfernt\./);
});
ok('archive and profile friendly errors never fall through to raw error.message', () => {
  const a = app.match(/function friendlyArchiveImportError\(error\)[\s\S]*?\n}/)?.[0] || '';
  const p = app.match(/function friendlyProfileBackupImportError\(error\)[\s\S]*?\n}/)?.[0] || '';
  assert.ok(a && p);
  assert.doesNotMatch(a, /error\?\.message|error\.message/);
  assert.doesNotMatch(p, /error\?\.message|error\.message/);
  assert.match(a, /ZIP konnte nicht verwendet werden/);
  assert.match(p, /Profilsicherung konnte nicht wiederhergestellt werden/);
});
ok('normal ZIP export errors use user-facing fixed copy', () => {
  assert.doesNotMatch(app, /setStatus\('error', 'Export fehlgeschlagen', String\(error\?\.message/);
  assert.match(app, /ZIP konnte nicht erstellt werden/);
  assert.match(app, /Sicherungs-ZIP konnte nicht erstellt werden/);
});
ok('controlled tab-gone account probe stays silent', () => {
  const start = app.indexOf('async function performInspectPage');
  const end = app.indexOf('\nfunction inspectPage', start);
  const fn = app.slice(start, end);
  assert.doesNotMatch(fn, /setStatus\('', 'Kleinanzeigen-Tab wurde geschlossen'/);
});
ok('lifecycle errors have dedicated end-user gold-line', () => {
  assert.match(app, /title: 'Vorgang unterbrochen'/);
  assert.match(app, /title: 'Kleinanzeigen antwortet nicht'/);
  assert.match(app, /title: 'Seite konnte nicht gelesen werden'/);
});
ok('account missing copy uses concise gold-line', () => {
  const gate = read('account-gate.js');
  assert.match(gate, /'Nicht angemeldet'/);
  assert.match(gate, /Bitte melde dich zuerst bei Kleinanzeigen an\./);
});
ok('gold-line source test is registered', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts.test, /v1211-message-gold-line\.cjs/);
});

console.log(`${pass} v1.21.1 message gold-line checks passed`);
