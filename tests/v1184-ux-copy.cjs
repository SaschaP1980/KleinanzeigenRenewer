const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('app.html', 'utf8');
const css = fs.readFileSync('app.css', 'utf8');
const app = require('./v12210-source-surface.cjs') + '\n' + fs.readFileSync('mass-renewal-ui-controller.js', 'utf8') + '\n' + fs.readFileSync('archive-trash-insertion-ui-controller.js', 'utf8');
const captureController = fs.readFileSync('inventory-capture-controller.js', 'utf8');
const captureView = fs.readFileSync('src/app/inventory-capture-view.js', 'utf8');
const capture = captureController + '\n' + captureView;
const js = app + '\n' + capture;
const runner = fs.readFileSync('inventory-runner.js', 'utf8');
const filler = fs.readFileSync('template-filler.js', 'utf8');
let failures = 0; let passes = 0;
function check(label, fn) { try { fn(); passes += 1; console.log(`PASS ${label}`); } catch (error) { failures += 1; console.error(`FAIL ${label}: ${error.message}`); } }

check('inventory mode copy is user-facing and avoids implementation terms', () => {
  const start = captureView.indexOf('function renderInventoryCaptureOptions');
  const end = captureView.indexOf('\n      function setInventoryCaptureModeNotice', start);
  assert.ok(start >= 0 && end > start);
  const fn = captureView.slice(start, end);
  assert.match(fn, /Schnellere Erfassung mit weniger zusätzlichen Prüfungen\. Einige Angaben können dabei abgeleitet werden\./);
  assert.match(fn, /Alle verfügbaren Angaben werden direkt geprüft\. Dauert entsprechend länger\./);
  assert.doesNotMatch(fn, /Read-only|read-only|Tab pro Anzeige/);
});

check('derived listing-date badge is compact amber and has a short actionable tooltip', () => {
  assert.match(js, /Aus Enddatum berechnet\. Mit „Daten aktualisieren“ direkt prüfen\./);
  const match = css.match(/\.listing-date-derived-badge\s*\{([^}]*)\}/);
  assert.ok(match, 'listing-date-derived-badge CSS missing');
  const block = match[1];
  assert.match(block, /min-height:15px/);
  assert.match(block, /padding:0 4px/);
  assert.match(block, /color:#f2c14e/);
  assert.match(block, /border:1px solid #8b6f24/);
  assert.match(block, /text-transform:none/);
});

check('inventory reconciliation copy explains the safety check without remote/full-scan jargon', () => {
  const start = js.indexOf('function inventoryCaptureBulkProgressModel');
  const end = js.indexOf('\nfunction syncInventoryCaptureBulkModal', start);
  assert.ok(start >= 0 && end > start);
  const fn = js.slice(start, end);
  assert.match(fn, /Bestand erneut prüfen|Bestand zur Sicherheit erneut prüfen/);
  assert.match(fn, /Die beiden Prüfungen liefern unterschiedliche Ergebnisse\./);
  assert.doesNotMatch(fn, /Remote-Bestand|Remote-Bestände|Vollscan|Vollscans/);
  assert.match(js, /Danach wird dein Anzeigenbestand zur Sicherheit ein zweites Mal geprüft\./);
  assert.doesNotMatch(runner, /Remote-Bestand erneut prüfen/);
});

check('profile backup actions use save/restore wording', () => {
  assert.match(js, /backupButton\.textContent = 'Inventarprofil sichern'/);
  assert.match(html, /id="profileImportButton"[^>]*>Profil aus Sicherung wiederherstellen<\/button>/);
  assert.match(js, /Profil „\$\{profile\.displayName \|\| 'Profil'\}“ wird gesichert …/);
  assert.match(js, /Profil gesichert:/);
});

check('profile removal wording matches the actual non-destructive behavior', () => {
  assert.match(js, /deleteButton\.textContent = 'Profil entfernen'/);
  assert.match(js, /title: 'Profil aus der Verwaltung entfernen\?'/);
  assert.match(js, /confirmLabel: 'Profil entfernen'/);
  assert.match(js, /Profil wird entfernt …/);
  assert.doesNotMatch(js, /confirmLabel: 'Profil löschen'/);
});

check('mass renewal copy is concise and natural', () => {
  assert.match(html, /Wähle bis zu 10 Anzeigen aus\. Sie werden im aktuell gewählten Prüfmodus nacheinander neu inseriert\./);
  assert.match(html, /<strong>Reihenfolge<\/strong>/);
  assert.match(html, /Die Anzeigen werden von oben nach unten neu inseriert\./);
  assert.match(html, /id="massRenewalProgressTitle">Anzeigen werden vorbereitet …<\/strong>/);
  assert.match(js, /massRenewalProgressTitle\.textContent = 'Anzeigen werden neu inseriert …'/);
  assert.doesNotMatch(html + js, /streng nacheinander|Reihenfolge der Abarbeitung|Neu-Inserate werden/);
});

check('ZIP fast-mode step uses plain-language skip wording', () => {
  assert.match(js, /Zusätzliche Inhaltsprüfung wird übersprungen/);
  assert.doesNotMatch(js, /Inhaltsvergleich entfällt/);
});

check('renewal progress avoids the unnecessary automatic label', () => {
  assert.match(html, /id="renewalProgressShortcutTitle">Austausch läuft<\/strong>/);
  assert.match(js, /Austausch nicht abgeschlossen|Austausch konnte nicht abgeschlossen werden/);
  assert.match(js, /Austausch läuft · \$\{renewalModeLabel/);
  assert.doesNotMatch(html + js, /Automatischer Austausch|Automatik läuft/);
  assert.match(filler, /Austausch läuft – die Anzeige wird anschließend veröffentlicht und geprüft/);
});

check('visible inventory workflow copy consistently says Erfassung', () => {
  assert.match(html, /id="inventoryCaptureTitle">Anzeigen erfassen<\/h2>/);
  assert.match(js, /title \|\| 'Erfassung läuft …'/);
  assert.match(runner, /Erfassung erneut versuchen/);
  assert.doesNotMatch(html + js + runner, /Inventarisierung starten\?|Inventarisierung läuft|Inventarisierung erneut versuchen/);
});

if (failures) { console.error(`${failures} v1.18.4 UX contract group(s) failed; ${passes} passed`); process.exit(1); }
console.log(`${passes} v1.18.4 UX contract groups passed`);
