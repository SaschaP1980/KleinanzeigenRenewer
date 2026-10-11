const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('app.html', 'utf8');
const css = fs.readFileSync('app.css', 'utf8');
const js = require('./v12210-source-surface.cjs');
const bg = [fs.readFileSync('background.js', 'utf8'), fs.readFileSync('bulk-inventory-controller.js', 'utf8'), fs.readFileSync('src/background/services/bulk-worker-service.js', 'utf8'), fs.readFileSync('public-listing-evidence-service.js', 'utf8')].join('\n');
const runner = fs.readFileSync('inventory-runner.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
let failures = 0; let passes = 0;
function check(label, fn) { try { fn(); passes += 1; console.log(`PASS ${label}`); } catch (error) { failures += 1; console.error(`FAIL ${label}: ${error.message}`); } }
check('v1.18.2 version is declared', () => { assert.ok(['1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(manifest.version)); assert.ok(['1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(pkg.version)); });
check('inventory capture step labels use the clarified four-step wording', () => {
  assert.match(html, /data-capture-step="1"[\s\S]*(?:Bestand laden|Einstellungen)/);
  assert.match(html, /data-capture-step="2"[\s\S]*Anzeigen erfassen/);
  assert.match(html, /data-capture-step="3"[\s\S]*Bestand bestätigen/);
  assert.match(html, /data-capture-step="4"[\s\S]*Ergebnis/);
});
check('bulk inventory carries the configured safe or fast verification mode into the run', () => {
  assert.match(bg, /verificationMode/);
  assert.match(runner, /verificationMode/);
  assert.match(bg, /RENEWAL_MODE_FAST/);
});
check('fast bulk inventory skips the public readonly metadata worker and derives listing date from end date', () => {
  assert.match(bg, /deriveListingDateFromEndDate/);
  assert.match(bg, /skipReadOnlyMetadata/);
  assert.match(bg, /derived-end-date-60d/);
  assert.match(bg, /metadataPromise\s*=\s*skipReadOnlyMetadata/);
});
check('derived listing date is explicitly marked and visible with an Abgeleitet badge', () => {
  assert.match(bg, /listingDateDerived/);
  assert.match(bg, /listingDateSource/);
  assert.match(js, /Abgeleitet/);
  if (['1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(manifest.version)) assert.match(js, /Aus Enddatum berechnet\. Mit „Daten aktualisieren“ direkt prüfen\./);
  else assert.match(js, /60 Tage/);
  assert.match(css, /listing-date-derived-badge/);
});
check('safe bulk inventory keeps readonly metadata capture available', () => {
  assert.match(bg, /skipReadOnlyMetadata\s*=\s*verificationMode\s*===\s*RENEWAL_MODE_FAST/); assert.match(bg, /skipReadOnlyMetadata\s*\?\s*Promise\.resolve\(null\)\s*:\s*\(publicUrl\s*\?\s*(?:chrome\.tabs\.create|createAutomationTab)/);
  assert.match(bg, /(?:chrome\.tabs\.create|createAutomationTab)\([^\n]*publicUrl|metadataPromise/);
});
check('heuristic dates cannot overwrite a previously verified listing date', () => {
  assert.match(bg, /preserveVerifiedExistingDate/);
  assert.match(bg, /existingInventoryRecord\?\.listingMeta/);
  assert.match(bg, /preserveVerifiedExistingDate\s*\?\s*false/);
});
check('trash notice is centralized and repeated per-card note is removed', () => {
  assert.match(html, /Einträge können nicht zurück ins Inventar verschoben werden/);
  assert.doesNotMatch(js, /note\.textContent\s*=\s*['"]Einträge können nicht zurück ins Inventar verschoben werden/);
});
check('trash entries offer a 30-day retention restart action above permanent deletion', () => {
  assert.match(js, /30 Tage neu starten/);
  assert.match(js, /RESET_TRASH_RETENTION/);
  assert.match(bg, /resetTrashRetention/);
  assert.match(bg, /TRASH_RETENTION_RESET/);
  const resetIndex = js.indexOf("resetButton.textContent = '30 Tage neu starten'");
  const deleteIndex = js.indexOf("deleteButton.textContent = 'Endgültig löschen'");
  assert.ok(resetIndex >= 0 && deleteIndex > resetIndex, 'reset action must be created before permanent delete action');
});
if (failures) { console.error(`${failures} v1.18.2 contract group(s) failed; ${passes} passed`); process.exit(1); }
console.log(`${passes} v1.18.2 contract groups passed`);
