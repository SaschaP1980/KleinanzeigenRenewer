const fs = require('fs');
const path = require('path');
const assert = require('assert');
let n = 0;
const pass = name => { n += 1; console.log(`PASS ${n}: ${name}`); };
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const app = require('./v12210-source-surface.cjs') + '\n' + fs.readFileSync(path.join(root, 'shared-ui-helpers.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'mass-renewal-ui-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'archive-trash-insertion-ui-controller.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
const popup = fs.readFileSync(path.join(root, 'popup.js'), 'utf8');
const view = fs.readFileSync(path.join(root, 'inventory-view.js'), 'utf8');

assert.ok(['1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version));
assert.ok(['1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(pkg.version));
assert.deepEqual([...manifest.permissions].sort(), ['activeTab','storage','unlimitedStorage','scripting'].sort());
pass('v1.10.0 metadata and permission surface are aligned');

assert.match(html, /Eigene Anzeigen erfassen, verwalten und kontrolliert neu einstellen/);
assert.match(html, />Geöffnete Anzeige erfassen</);
assert.match(html, />Anzeigen erfassen</);
assert.match(html, />Alle in Papierkorb</);
assert.match(html, /Diagnosedaten herunterladen/);
assert.match(html, /Titel suchen/);
assert.match(html, /Gespeichert am/);
pass('main app copy uses end-user terminology');

assert.match(html, /Anzeige neu inserieren und bisherige ersetzen\?/);
assert.match(html, /Bisherige Anzeige löschen/);
assert.match(html, />(?:Prüfen|Neue Anzeige prüfen|Neue Anzeige finden)</);
assert.doesNotMatch(html, />Verifizieren</);
assert.match(html, /Jetzt neu inserieren und austauschen/);
assert.match(html, /id="renewalProgressEdit"[^>]*>Anzeige bearbeiten</);
assert.match(html, /id="renewalProgressView"[^>]*>Anzeige ansehen</);
pass('renewal dialog and completion actions use plain Kleinanzeigen-like language');

assert.match(css, /\.renewal-start-actions \{ gap:14px; \}/);
assert.match(css, /\.renewal-start-actions \.primary \{ width:auto;/);
assert.match(css, /#renewalStartConfirm \{ min-width:300px; max-width:420px; \}/);
pass('modal actions are compact and separated');

assert.match(app, /const previewUrlCache = new Map\(\)/);
assert.match(app, /cached && cached\.signature === signature/);
assert.match(app, /window\.addEventListener\('pagehide', clearPreviewUrls\)/);
assert.doesNotMatch(app.match(/function renderInventories[\s\S]*?function trashReasonLabel/)?.[0] || '', /clearPreviewUrls\(\)/);
assert.doesNotMatch(app.match(/function renderTrash[\s\S]*?function renderBulkState/)?.[0] || '', /clearPreviewUrls\(\)/);
assert.doesNotMatch(app, /renewalStartCover\.removeAttribute\('src'\)/);
assert.match(app, /reason === 'renewal-updated'\) await refreshRenewalProgressOnly\(\)/);
pass('local image previews stay stable and renewal progress no longer rebuilds the whole inventory list');

assert.match(app, /function endDateWithRelativeLabel\(record, now = new Date\(\)\)/);
assert.match(app, /\(heute\)/);
assert.match(app, /\(morgen\)/);
assert.match(app, /\(in \$\{days\} Tagen\)/);
assert.match(app, /sortKey: 'endDate', direction: 'asc'/);
assert.match(view, /: 'endDate';/);
assert.match(view, /options\.direction === 'desc' \? 'desc' : 'asc'/);
pass('end date shows relative days and remains the ascending default sort');

assert.match(html, /id="actionConfirmDialog"/);
assert.match(app, /function confirmAction/);
assert.doesNotMatch(app, /\bconfirm\s*\(/);
pass('destructive and migration confirmations use the styled in-app modal');

assert.match(app, /sourceLink\.textContent = 'Anzeige bearbeiten'/);
assert.match(app, /zum Ansehen öffnen/);
assert.match(app, /openInventoryReadOnly\(record\)/);
pass('inventory cards open viewing mode while details expose explicit editing');

assert.match(app, /friendlyErrorMessage/);
assert.doesNotMatch(app, /setStatus\([^\n]*error\.message\)/);
assert.match(app, /Prüfung erforderlich/);
assert.doesNotMatch(app, /text = renewal\.lastError/);
pass('technical errors are kept out of normal status copy');

if (['1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version)) {
  assert.match(popupHtml, /kleinanzeigen Manager/);
  assert.match(popupHtml, /Manager wird in einem eigenen Fenster geöffnet/);
  assert.match(popupHtml, /Manager öffnen/);
  assert.match(popup, /Manager geöffnet/);
} else {
  assert.match(popupHtml, /Kleinanzeigen Inventar/);
  assert.match(popupHtml, /Dein Inventar wird in einem eigenen Fenster geöffnet/);
  assert.match(popupHtml, /Inventar öffnen/);
  assert.match(popup, /Inventar geöffnet/);
}
pass('toolbar launcher copy is end-user friendly');

assert.match(app, /purgePreviewUrlsForRecord\(record\)/);
pass('permanent trash deletion releases cached preview URLs without global image churn');

console.log(`${n} v1.10.0 contract groups passed`);
