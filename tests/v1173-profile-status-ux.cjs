const fs = require('fs');
const assert = require('assert');
const app = fs.readFileSync('app.js','utf8') + '\n' + fs.readFileSync('mass-renewal-ui-controller.js','utf8') + '\n' + fs.readFileSync('archive-trash-insertion-ui-controller.js','utf8');
const html = fs.readFileSync('app.html','utf8');
const css = fs.readFileSync('app.css','utf8');
const background = require('./v12221-legacy-background-surface.cjs');
const inventoryRunner = fs.readFileSync('inventory-runner.js','utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json','utf8'));
function pass(label){ console.log('PASS '+label); }

assert.ok(['1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version)); pass('manifest keeps v1.17.3 UX contract');

const selectStart = app.indexOf('async function selectInventoryProfile');
const selectEnd = app.indexOf('\nasync function deleteManagedProfile', selectStart);
const select = app.slice(selectStart, selectEnd);
assert.match(select, /beginProfileSwitchAccountCheck\(\)/);
assert.match(select, /inspectPage\(\{\s*forceFresh:\s*true\s*\}\)/); pass('profile switch immediately gates actions and performs a fresh live-account check');

const inspectStart = app.indexOf('function inspectPage');
const inspectEnd = app.indexOf('\nfunction schedulePageInspect', inspectStart);
const inspect = app.slice(inspectStart, inspectEnd);
assert.match(inspect, /forceFresh/);
assert.match(inspect, /inspectInFlight\.catch/); pass('forced account check waits for any in-flight inspection and then runs fresh');

assert.match(app, /function renderConfirmedLiveAccountStatus\(/);
assert.match(app, /Aktionen sind gesperrt, bis Konto und Inventarprofil übereinstimmen/); pass('global account status explicitly reflects profile mismatch');

assert.match(app, /function bulkRunCardActionModel\(/);
assert.match(app, /Fortschritt minimieren/);
assert.match(app, /message-minimize/);
assert.match(app, /message-chevron/);
assert.match(css, /\.message-minimize/);
assert.match(css, /\.message-chevron/); pass('running bulk progress uses a chevron minimize action');

assert.match(html, /Maximale Versuche je Phase · Standard: 3<br>Mehr Versuche erhöhen die Zuverlässigkeit, können den Ablauf aber verlängern\./);
assert.doesNotMatch(html, /Legt fest, wie oft ein Schritt bei vorübergehenden Problemen erneut versucht wird/); pass('retry microcopy is compact and phase-consistent');

for (const obsolete of [
  'Kein Kleinanzeigen-Konto bestätigt',
  'Kleinanzeigen-Sitzungen',
  'Kleinanzeigen-Profil besitzt ein getrenntes lokales Inventar',
  'zusätzliche Inhaltskontrolle',
  'nochmals ausgelesen',
  'benötigt Aufmerksamkeit',
  'mit Aufmerksamkeit',
  'Austausch benötigt Aufmerksamkeit'
]) {
  assert.ok(!app.includes(obsolete) && !html.includes(obsolete) && !background.includes(obsolete) && !inventoryRunner.includes(obsolete), `obsolete UI copy remains: ${obsolete}`);
}
assert.match(html, /Für jedes erkannte Kleinanzeigen-Konto führt die App ein eigenes Inventar/);
assert.match(app, /Kein Kleinanzeigen-Konto erkannt/);
assert.match(app, /Prüfung erforderlich/);
assert.match(app, /mit Prüfbedarf/);
assert.match(background, /Das aktuell angemeldete Kleinanzeigen-Konto konnte für Phase 4 nicht eindeutig erkannt werden/);
assert.match(inventoryRunner, /Kleinanzeigen-Konto stimmt nicht mit dem ausgewählten Inventarprofil überein/);
pass('visible account, verification and attention copy is user-facing and consistent');

assert.doesNotMatch(app, /SET_SELECTED_PROFILE[\s\S]{0,500}currentProfile\s*=\s*recognized/); pass('fresh account check does not auto-switch the selected inventory profile');
