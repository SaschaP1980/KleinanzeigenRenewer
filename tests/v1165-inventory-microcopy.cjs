const { includesActivePatch } = require('./current-patch-policy.cjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'inventory-capture-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'src/app/inventory-capture-view.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
let n = 0;
const pass = msg => { n += 1; console.log(`PASS ${msg}`); };

assert.match(html, /data-capture-step="1"><span>1<\/span><strong>(?:Prüfen|Bestand laden|Einstellungen)<\/strong>/);
assert.match(html, /aria-label="Ablauf der Erfassung"/);
assert.match(html, /Welche Anzeige möchtest du erfassen\?/);
assert.match(html, /Erfassung wird vorbereitet …/);
pass('shared capture modal uses consistent user-facing step and preparation wording');

const confirmationTexts = [
  'Anzeigen erfassen',
  'Zur Sicherheit wird „Meine Anzeigen“ zuerst aktualisiert. Wähle anschließend, welche Anzeigen neu eingelesen werden sollen und wie sie geprüft werden.',
  'Erfassung starten',
  'Geöffnete Anzeige auswählen',
  'Wähle die Anzeige aus, die du erfassen möchtest. Ist dieselbe Anzeige mehrfach geöffnet, wird sie nur einmal angezeigt.',
  'Anzeige auswählen',
  'Anzeigendaten und Bilder werden gelesen und lokal im Inventar gespeichert. Die Anzeige auf Kleinanzeigen wird nicht verändert.'
];
if (includesActivePatch(['1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version)) confirmationTexts.push(
  'Auswahl im Überblick',
  'Nur neue Anzeigen werden erfasst. Bereits gespeicherte Anzeigen bleiben unverändert.',
  'Auf Kleinanzeigen selbst wird nichts geändert.'
); else confirmationTexts.push(
  'Standardmäßig werden bereits gespeicherte Anzeigen anhand ihrer Anzeigen-ID übersprungen und nur neue Anzeigen vollständig erfasst. Deine Anzeigen auf Kleinanzeigen bleiben unverändert.'
);
for (const text of confirmationTexts) assert.ok(app.includes(text), `missing microcopy: ${text}`);
pass('confirmation copy describes user intent without implementation jargon');

for (const text of [
  'Die Anzeige wird deinem Inventarprofil zugeordnet.',
  'Anzeigendaten und Bilder werden vollständig ausgelesen. Falls nötig, wird dafür kurz die Bearbeiten-Ansicht im Hintergrund geöffnet.',
  'Anzeigendaten und Bilder werden lokal im Inventar gespeichert.',
  'Die Inventaransicht wird mit den gespeicherten Daten aktualisiert.'
]) assert.ok(app.includes(text), `missing progress copy: ${text}`);
pass('single capture progress explains visible work without worker terminology');

for (const text of [
  'Erfassung teilweise abgeschlossen',
  'Erfassung abgeschlossen – Anzahl prüfen',
  'Einige Anzeigen konnten nicht vollständig gelesen werden.',
  'Die Erfassung wird vorbereitet.',
  'Anzeigen abgeschlossen'
]) assert.ok(app.includes(text), `missing bulk wording: ${text}`);
pass('bulk progress and terminal copy consistently uses Erfassung terminology');

assert.ok(app.includes('Geöffnete eigene Anzeigen werden gesucht …'));
assert.ok(app.includes("'geöffnete eigene Anzeige gefunden'"));
assert.ok(app.includes("'geöffnete eigene Anzeigen gefunden'"));
assert.doesNotMatch(app, /Read-only- und Bearbeiten-Ansichten derselben Anzeigen-ID/);
assert.doesNotMatch(app, /Hintergrund-Bearbeiten-Worker/);
assert.doesNotMatch(app, /Vollständige Bearbeiten-Daten/);
assert.doesNotMatch(app, /inventoryCandidateViewLabel\(candidate\)/);
pass('candidate UI removes technical view-mode language and reports found own ads');

console.log(`${n} v1.16.5 inventory microcopy contract groups passed`);
