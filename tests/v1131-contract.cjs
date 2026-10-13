const { includesActivePatch } = require('./current-patch-policy.cjs');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cryptoNode = require('crypto');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
if (!globalThis.crypto) globalThis.crypto = cryptoNode.webcrypto;

const InventoryExport = require(path.join(root, 'inventory-export.js'));
const InventoryImport = require(path.join(root, 'src/app/inventory-import.js'));

function loadZipWriter() {
  return require(path.join(root, 'diagnostic-zip.js'));
}

(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'mass-renewal-ui-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'archive-trash-insertion-ui-controller.js'), 'utf8');
  const background = require('./v12216-source-surface.cjs');
  const filler = fs.readFileSync(path.join(root, 'template-filler.js'), 'utf8');
  const packagePy = fs.readFileSync(path.join(root, 'scripts/package.py'), 'utf8');

  assert.ok(includesActivePatch(['1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version));
  assert.ok(includesActivePatch(['1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], packageJson.version));
  assert.ok(html.indexOf('src/app/inventory-import.js') < html.indexOf('app.js'));
  assert.ok(packagePy.includes("'src/app/inventory-import.js'"));

  const actionsStart = includesActivePatch(['1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version) ? html.indexOf('id="actionsAccordion"') : html.indexOf('id="controlActionsLabel"');
  const actionsEnd = includesActivePatch(['1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version) ? html.indexOf('id="configurationAccordion"', actionsStart) : html.indexOf('</section>', actionsStart);
  const actionsBlock = html.slice(actionsStart, actionsEnd);
  assert.ok(actionsBlock.indexOf('Anzeigen erfassen') < actionsBlock.indexOf('Geöffnete Anzeige erfassen'));
  assert.ok(actionsBlock.indexOf('Geöffnete Anzeige erfassen') < actionsBlock.indexOf('Aus ZIP neu inserieren'));
  assert.ok(!/NEUE ANZEIGE/i.test(actionsBlock), 'Keine zusätzliche Aktions-Untergruppe erwartet.');

  assert.ok(html.includes('id="archiveInsertDialog"'));
  assert.ok(html.includes(includesActivePatch(['1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version) ? 'ZIP hierher ziehen' : 'ZIP-Datei hierher ziehen'));
  assert.ok(html.includes('id="archiveChooseFile"'));
  assert.ok(html.includes('id="archiveInsertConfirm"'));
  assert.ok(html.includes(includesActivePatch(['1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version) ? '>Anzeige inserieren<' : '>Artikel inserieren<'));
  assert.ok(html.includes('Neue Anzeige erstellen'));
  assert.ok(html.includes(includesActivePatch(['1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version) ? 'Unter „Meine Anzeigen“ finden' : 'Neue Anzeige finden'));
  assert.ok(html.includes('Neue Anzeige überprüfen'));
  assert.ok(html.includes('Ins Inventar aufnehmen'));
  assert.ok(css.includes('.archive-dropzone'));

  assert.ok(app.includes('InventoryImport.parseInventoryArchive'));
  assert.ok(app.includes("type: 'START_ARCHIVE_INSERTION'"));
  assert.ok(app.includes("type: 'GET_ARCHIVE_INSERTION_STATUS'"));
  assert.ok(app.includes(includesActivePatch(['1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version) ? "'Zusätzliche Inhaltsprüfung wird übersprungen'" : (['1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3'].includes(manifest.version) ? "'Inhaltsvergleich entfällt'" : (['1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2'].includes(manifest.version) ? "'Zusätzliche Inhaltsprüfung entfällt'" : "'Zusätzliche Überprüfung entfällt'"))));
  if (includesActivePatch(['1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version)) {
    assert.ok(app.includes("message?.type === 'ARCHIVE_INSERTION_STATE_CHANGED'"));
    assert.ok(app.includes('applyArchiveInsertionSessionSnapshot'));
  } else {
    assert.ok(app.includes("reason === 'archive-insertion-updated'"));
  }
  assert.ok(app.includes("kind || '') === 'archive-insertion'"));

  assert.ok(background.includes('ARCHIVE_INSERTION_SESSIONS_KEY'));
  assert.ok(background.includes('async function startArchiveInsertion'));
  assert.ok(background.includes('async function findArchivePublishedAd'));
  assert.ok(background.includes('async function verifyAndSaveArchiveInsertion'));
  assert.ok(background.includes('async function compareArchiveInsertionRecords'));
  assert.ok(background.includes("verificationScope: 'archive-managed-fields'"));
  assert.ok(background.includes("checkManagedField('buyNow.value'"));
  assert.ok(background.includes("checkManagedField('location.addressVisibility'"));
  assert.ok(background.includes('async function promoteArchiveTemplateToInventory'));
  assert.ok(background.includes("session.status = 'needs-review'"));
  assert.ok(background.includes("source: 'archive-import-new-id-confirmed'"));
  assert.ok(background.includes('message?.type === "START_ARCHIVE_INSERTION"') || background.includes('\"START_ARCHIVE_INSERTION\": Object.freeze'));
  assert.ok(background.includes('message?.type === "GET_ARCHIVE_INSERTION_STATUS"') || background.includes('\"GET_ARCHIVE_INSERTION_STATUS\": Object.freeze'));
  assert.ok(background.includes("!['complete', 'needs-review', 'error', 'cancelled'].includes"));
  assert.ok(!background.slice(background.indexOf('async function startArchiveInsertion'), background.indexOf('async function getTemplateFillSession')).includes('source-delete-verified'));

  assert.ok(filler.includes('(session?.renewalId || session?.archiveInsertionId)'));
  assert.ok(filler.includes("['publish-submitted', 'new-id-confirmed'].includes"));
  assert.ok(filler.includes('archiveInsertionId: session.archiveInsertionId || null'));
  assert.match(filler, /session\.archiveInsertionId\s*\?\s*verifyArchiveTemplate\(template(?:,\s*verificationForm)?\)\s*:\s*verify\(template(?:,\s*verificationForm)?\)/);
  assert.match(filler, /function verifyArchiveTemplate\(template(?:,\s*root\s*=\s*document)?\)/);
  assert.ok(filler.includes('ZIP-Neu-Inserat läuft'));

  // End-to-end archive compatibility: an archive emitted by Phase 1 must be accepted by Phase 2.
  const record = {
    inventoryId: '3509738343',
    adId: '3509738343',
    title: 'ZIP Import Testanzeige',
    description: 'Vollständige Beschreibung für den Importtest.',
    schemaVersion: 2,
    capturedAt: '2026-09-15T03:00:00.000Z',
    profileId: 'profile-1',
    profileName: 'Testprofil',
    extraction: { capturedFromEditView: true, templateComplete: true },
    category: { id: '154', path: ['Mode & Beauty', 'Damenbekleidung'] },
    price: { value: '25', type: 'FIXED' },
    images: [{ imageKey: '3509738343:0', position: 0, mimeType: 'image/jpeg', size: 8, isPrimary: true }]
  };
  const jpegBytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);
  const jpegBlob = new Blob([jpegBytes], { type: 'image/jpeg' });
  const zipWriter = loadZipWriter();
  const exported = await InventoryExport.createInventoryArchive(record, {
    extensionVersion: '1.13.1',
    exportedAt: '2026-09-15T04:00:00.000Z',
    loadImage: async imageKey => imageKey === '3509738343:0' ? {
      imageKey,
      inventoryId: record.inventoryId,
      position: 0,
      isPrimary: true,
      mimeType: 'image/jpeg',
      size: jpegBlob.size,
      blob: jpegBlob
    } : null,
    createZip: zipWriter.createZip
  });
  Object.defineProperty(exported.blob, 'name', { value: 'phase1-export.zip', configurable: true });
  const parsed = await InventoryImport.parseInventoryArchive(exported.blob);
  assert.strictEqual(parsed.archiveType, InventoryImport.ARCHIVE_TYPE);
  assert.strictEqual(parsed.archiveVersion, 1);
  assert.strictEqual(parsed.record.title, record.title);
  assert.strictEqual(parsed.images.length, 1);
  assert.strictEqual(parsed.images[0].position, 0);
  assert.strictEqual(parsed.images[0].isPrimary, true);
  assert.strictEqual(parsed.images[0].mimeType, 'image/jpeg');
  assert.strictEqual(parsed.images[0].size, jpegBlob.size);

  const digest = cryptoNode.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex');
  assert.strictEqual(digest, '70507977688f3465a60227cd0261bd07d92fad620625cd7ebff8f0856d9c5ed3');
  assert.deepStrictEqual(manifest.permissions, require('./current-patch-policy.cjs').expectedManifestPermissions(manifest.version));
  assert.deepStrictEqual(manifest.host_permissions, [
    'https://www.kleinanzeigen.de/*',
    'https://kleinanzeigen.de/*',
    'https://img.kleinanzeigen.de/*'
  ]);

  console.log('PASS v1.13.1 Phase 2 ZIP import/new-listing contract');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
