const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('app.html', 'utf8');
const css = fs.readFileSync('app.css', 'utf8');
const js = fs.readFileSync('app.js', 'utf8') + '\n' + fs.readFileSync('inventory-capture-controller.js', 'utf8') + '\n' + fs.readFileSync('src/app/inventory-capture-view.js', 'utf8') + '\n' + fs.readFileSync('mass-renewal-ui-controller.js', 'utf8');
const bg = fs.readFileSync('background.js', 'utf8');
const trashService = fs.readFileSync('trash-service.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
let failures = 0; let passes = 0;
function check(label, fn) { try { fn(); passes += 1; console.log(`PASS ${label}`); } catch (error) { failures += 1; console.error(`FAIL ${label}: ${error.message}`); } }

check('manual trash helper returns the committed promise result instead of an out-of-scope local', () => {
  const start = bg.indexOf('async function moveInventoryToTrash');
  const end = bg.indexOf('\nasync function resetTrashRetention', start);
  assert.ok(start >= 0 && end > start, 'moveInventoryToTrash function not found');
  const fn = bg.slice(start, end);
  assert.match(fn, /return requireTrashService\(\)\.moveToTrash\(inventoryId, reason, context\)/);
  assert.match(trashService, /async function moveToTrash\(inventoryId, reason = 'manual', context = \{\}\)/);
  assert.match(trashService, /return repository\.mutate\(id, record => isTrashRecord\(record\) \? record : trashRecordFrom\(record, reason, context\)\)/);
  assert.doesNotMatch(fn, /if \(!trashed\)/);
});

check('bulk inventory modal exposes the active verification mode throughout the dialog', () => {
  assert.match(html, /id="inventoryCaptureModeNotice"/);
  assert.match(html, /id="inventoryCaptureModeText"/);
  if (['1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version)) {
    assert.match(html, /id="inventoryCaptureModeScope"/);
    assert.match(html, /id="inventoryCaptureModeVerification"/);
    assert.doesNotMatch(html, /id="inventoryCaptureModeBadge"/);
    assert.match(html, /Auswahl im Überblick/);
    assert.match(css, /\.inventory-capture-selection-overview/);
  } else {
    assert.match(html, /id="inventoryCaptureModeBadge"/);
    assert.match(css, /\.inventory-capture-mode-notice/);
  }
  assert.match(js, /function setInventoryCaptureModeNotice\(/);
  assert.match(js, /Schnellprüfung/);
  assert.match(js, /Vollprüfung/);
  assert.match(js, /Schnellere Erfassung mit weniger zusätzlichen Prüfungen|Schnellprüfung reduziert zusätzliche Prüfungen/);
  assert.match(js, /Alle verfügbaren Angaben werden direkt geprüft/);
  assert.match(js, /setInventoryCaptureModeNotice\(inventoryCaptureVerificationMode, inventoryCaptureScope\)/);
  assert.match(js, /setInventoryCaptureModeNotice\(state\?\.verificationMode/);
});

check('mass reorder controls are grouped at the far right as drag, up, down', () => {
  const start = js.indexOf('function renderMassRenewalOrder()');
  const end = js.indexOf('\nfunction massRenewalItemStatusLabel', start);
  assert.ok(start >= 0 && end > start, 'renderMassRenewalOrder function not found');
  const fn = js.slice(start, end);
  assert.match(fn, /controls\.append\(handle, up, down\)/);
  assert.match(fn, /row\.append\(position, image, main, controls\)/);
  assert.doesNotMatch(fn, /row\.append\(position, handle, image, main, controls\)/);
  assert.match(css, /\.mass-renewal-order-row\s*\{[^}]*grid-template-columns:36px 48px minmax\(0,1fr\) auto/);
  assert.match(css, /\.mass-renewal-order-buttons\s*\{[^}]*display:flex/);
});

if (failures) { console.error(`${failures} v1.18.3 contract group(s) failed; ${passes} passed`); process.exit(1); }
console.log(`${passes} v1.18.3 contract groups passed`);
