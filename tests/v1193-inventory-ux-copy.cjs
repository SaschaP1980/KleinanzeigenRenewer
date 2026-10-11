const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'inventory-capture-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'src/app/inventory-capture-view.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'mass-renewal-ui-controller.js'), 'utf8');
const background = fs.readFileSync(path.join(root, 'background.js'), 'utf8');
const runner = fs.readFileSync(path.join(root, 'inventory-runner.js'), 'utf8');

let pass = 0;
function check(name, fn) {
  try { fn(); pass++; console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}: ${error.message}`); process.exitCode = 1; }
}

check('shared capture settings box has end-user heading', () => {
  assert.match(html, /Einstellungen für diese Erfassung/);
  assert.doesNotMatch(html, /Einstellungen für diesen Erfassungslauf/);
});

check('default new-only choice is presented before full reread choice', () => {
  const dialog = html.slice(html.indexOf('id="inventoryCaptureDialog"'));
  const newOnly = dialog.indexOf('Nur neue Anzeigen erfassen');
  const full = dialog.indexOf('Gesamten Bestand neu einlesen');
  assert.ok(newOnly >= 0 && full > newOnly, 'new-only must appear first');
  assert.doesNotMatch(dialog.slice(0, full + 200), /Alle Anzeigen aktualisieren/);
});

check('capture scope uses approved end-user copy', () => {
  assert.match(html + app, /Bereits gespeicherte Anzeigen werden nicht erneut eingelesen\. Nur neu hinzugekommene Anzeigen werden vollständig erfasst\./);
  assert.match(html + app, /Alle laufenden Anzeigen werden vollständig neu eingelesen\. Bereits gespeicherte Daten werden dabei aktualisiert\./);
  assert.match(html + app, /Wähle den passenden Umfang\. Für regelmäßige Erfassungen reicht meist „Nur neue Anzeigen erfassen“\./);
});

check('verification mode uses approved concise copy', () => {
  assert.match(app, /Schnellere Erfassung mit weniger zusätzlichen Prüfungen\. Einige Angaben können dabei abgeleitet werden\./);
  assert.match(app, /Alle verfügbaren Angaben werden direkt geprüft\. Dauert entsprechend länger\./);
});

check('scope and verification groups are visually contained by one shared settings box', () => {
  assert.match(html, /id="inventoryCaptureOptions"[^>]*aria-labelledby="inventoryCaptureOptionsTitle"/);
  assert.match(html, /id="inventoryCaptureOptionsTitle"[^>]*>Einstellungen für diese Erfassung</);
  assert.match(css, /\.inventory-capture-options\s*\{[^}]*border:/s);
  assert.match(css, /\.inventory-capture-option-group\s*\{[^}]*border:\s*0/s);
});

check('inventory end-user runtime copy no longer says Inventurlauf', () => {
  assert.doesNotMatch(app + background + runner, /Inventurlauf/);
  assert.match(runner, /Erfassung abgeschlossen – einige Anzeigen konnten nicht verarbeitet werden/);
  assert.match(runner, /Erfassung abgeschlossen – Prüfung nötig/);
  assert.match(runner, /Erfassung unterbrochen/);
  assert.match(runner, /„Meine Anzeigen“ ist nicht startbereit/);
});

check('mass renewal end-user runtime copy no longer says Massenlauf', () => {
  assert.doesNotMatch(app + background + runner, /Massenlauf/);
  assert.match(app, /Der Vorgang wird nach der aktuellen Anzeige beendet\./);
  assert.match(app, /Stopp nicht vorgemerkt/);
  assert.match(app, /Bitte versuche es erneut\./);
  assert.match(app, /Nicht ausgeführt – der Vorgang wurde vorher beendet\./);
  assert.match(app, /Der Vorgang wurde wie gewünscht beendet\./);
});

if (!process.exitCode) console.log(`v1.19.3 inventory UX copy: ${pass}/7 PASS`);
