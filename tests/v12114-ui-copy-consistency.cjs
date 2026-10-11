const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const app = require('./v12210-source-surface.cjs') + '\n' + fs.readFileSync(path.join(root, 'inventory-capture-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'src/app/inventory-capture-view.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'mass-renewal-ui-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'archive-trash-insertion-ui-controller.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');

// Capture entry stays neutral while the intentionally distinct scope wording remains.
assert.match(html, /id="fullInventoryButton"[^>]*>Anzeigen erfassen<\/button>/);
assert.match(html, /id="inventoryCaptureScopeNewOnly"[\s\S]*?>\s*<span>Nur neue Anzeigen erfassen<\/span>/);
assert.match(html, /id="inventoryCaptureScopeAll"[\s\S]*?>\s*<span>Gesamten Bestand neu einlesen<\/span>/);
assert.doesNotMatch(html + app, /Alle Anzeigen neu erfassen/);
assert.match(app, /inventoryCaptureKicker\.textContent = 'ANZEIGEN ERFASSEN'/);
assert.match(app, /inventoryCaptureTitle\.textContent = 'Anzeigen erfassen'/);
assert.match(app, /inventoryCaptureStart\.textContent = 'Erfassung starten'/);

// Trash wording must describe the local state, not imply a Kleinanzeigen deletion.
assert.match(html, /Einträge im Papierkorb werden 30 Tage lokal aufbewahrt\./);
assert.doesNotMatch(html, /Gelöschte Einträge bleiben 30 Tage im Papierkorb/);
assert.match(app, /makeInfoLine\('Im Papierkorb'/);
assert.match(app, /\['Im Papierkorb', formatDate\(record\.trash\?\.trashedAt\)\]/);

// Compact/detailed trash actions share one order and one destructive label.
const compactTrash = app.match(/function renderCompactTrashRow[\s\S]*?\n}\n\nfunction /)?.[0] || '';
const detailedTrash = app.match(/function renderTrash\([\s\S]*?\n}\n\nfunction /)?.[0] || '';
assert.match(compactTrash, /label:\s*'Endgültig löschen'/);
assert.match(compactTrash, /actions\.append\(templateButton, resetButton, exportButton, deleteButton\)/);
assert.match(detailedTrash, /actions\.append\(templateButton, resetButton, exportButton, deleteButton\)/);

// Guided trash-template flow uses plain end-user language.
assert.match(html, /data-template-step="3"><span>3<\/span><strong>Selbst veröffentlichen und anschließend erfassen<\/strong>/);
assert.match(html, /id="trashTemplateConfirm"[^>]*>Anzeige vorbereiten<\/button>/);
assert.match(html, /id="trashTemplateInventory"[^>]*>Ins Inventar aufnehmen<\/button>/);

// Visible background-work hints complement aria/title hints.
for (const id of ['renewalBackgroundHint','archiveBackgroundHint','massRenewalBackgroundHint','inventoryCaptureBackgroundHint']) {
  assert.match(html, new RegExp(`id="${id}"[^>]*>Der Vorgang läuft im Hintergrund weiter, wenn du dieses Fenster schließt\\.<`));
}

// Single-capture nested progress is no longer a competing "Schritt" counter.
for (let step = 1; step <= 4; step += 1) assert.match(app, new RegExp(`count: 'Fortschritt ${step} von 4'`));

// Mass flow avoids developer jargon in visible status copy.
assert.match(app, /title: 'Vorgang nach aktueller Anzeige stoppen\?'/);
assert.match(app, /`Schritt \$\{activePhase\} von 4:/);
assert.match(app, /`Schritt \$\{failedPhase\} – Prüfung erforderlich:/);
assert.match(app, /return 'Letzten Schritt erneut starten';/);
assert.doesNotMatch(app, /'Batch nach aktueller Anzeige stoppen\?'/);

// Profile backup and empty-state copy are explicit.
assert.match(app, /backupButton\.textContent = 'Inventarprofil sichern'/);
assert.match(app, /Laufende Vorgänge werden nicht übernommen\./);
assert.match(app, /selectButton\.textContent = 'Inventar anzeigen'/);
assert.match(app, /Noch keine Anzeigen gespeichert\. Erfasse deine Anzeigen über „Anzeigen erfassen“ oder füge eine bereits geöffnete Anzeige hinzu\./);

// Search, diagnostics, status wording and sort labels.
assert.match(html, /placeholder="Titel durchsuchen …"/);
assert.match(html, /id="diagnosticResetButton"[^>]*>Diagnose zurücksetzen<\/button>/);
assert.match(css, /\.diagnostic-actions\s*\{[^}]*grid-template-columns:\s*minmax\(0,1fr\)/);
assert.doesNotMatch(app + html, /Online Status/);
assert.match(app, /function syncInventorySortDirectionLabels\(/);
assert.match(app, /'↑ A–Z'/);
assert.match(app, /'↓ Z–A'/);
assert.match(app, /'↑ Frühestes zuerst'/);
assert.match(app, /'↓ Spätestes zuerst'/);

// Before start: cancel; after/during work: close.
assert.match(html, /id="renewalStartCancel"[^>]*>Abbrechen<\/button>/);

// Main Prüfmodus help is simpler; the rejected retry-copy change remains untouched.
assert.match(html, /Vollprüfung: Vergleicht die neue Anzeige nach dem Einstellen noch einmal mit den gespeicherten Daten\. Dauert etwas länger\./);
assert.match(app, /Schnellprüfung: Prüft nur, ob die neue Anzeige erfolgreich erstellt wurde\. Der zusätzliche Datenvergleich entfällt\./);
assert.match(html, /Maximale Versuche je Phase · Standard: 3/);

console.log('v1.21.14 UI copy and consistency contract: PASS');
