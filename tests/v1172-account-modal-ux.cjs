const { includesActivePatch } = require('./current-patch-policy.cjs');
const fs = require('fs');
const assert = require('assert');
const app = fs.readFileSync('app.js','utf8') + '\n' + fs.readFileSync('account-gate.js','utf8') + '\n' + fs.readFileSync('profile-account-ui-controller.js','utf8') + '\n' + fs.readFileSync('mass-renewal-ui-controller.js','utf8') + '\n' + fs.readFileSync('archive-trash-insertion-ui-controller.js','utf8');
const capture = fs.readFileSync('inventory-capture-controller.js','utf8');
const appCapture = app + '\n' + capture;
const html = fs.readFileSync('app.html','utf8');
const css = fs.readFileSync('app.css','utf8');
const background = fs.readFileSync('background.js','utf8') + '\n' + fs.readFileSync('bulk-inventory-controller.js','utf8') + '\n' + fs.readFileSync('mass-renewal-workflow-controller.js','utf8') + '\n' + fs.readFileSync('template-fill-controller.js','utf8') + '\n' + fs.readFileSync('insertion-lock-service.js','utf8') + '\n' + fs.readFileSync('archive-insertion-controller.js','utf8') + '\n' + fs.readFileSync('src/background/controllers/account-session-controller.js','utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json','utf8'));
function pass(label){ console.log('PASS '+label); }

assert.ok(includesActivePatch(['1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version)); pass('manifest keeps v1.17.2 account/modal contract');

assert.match(html, /id="actionAvailability"/);
assert.match(html, /id="actionAvailabilityTitle"/);
assert.match(html, /id="actionAvailabilityText"/);
assert.match(app, /function accountGateModel\(/);
assert.match(app, /Ausgewähltes Profil:[\s\S]*Angemeldet:/);
assert.match(app, /Nicht verfügbar: Ausgewähltes Profil und Kleinanzeigen-Konto stimmen nicht überein/); pass('actions expose a central account/profile gate and per-button reason');

const inspectStart = app.indexOf('async function performInspectPage');
const inspectEnd = app.indexOf('\nfunction inspectPage', inspectStart);
const inspect = app.slice(inspectStart, inspectEnd);
assert.match(inspect, /matchingKleinanzeigenTabs\(\)/);
assert.match(inspect, /PROBE_LIVE_KLEINANZEIGEN_ACCOUNT/);
assert.match(inspect, /ownAdTab/);
assert.match(inspect, /inventoryButton\.dataset\.pageReady\s*=\s*ownAdTab/); pass('any Kleinanzeigen page can trigger live-account confirmation while own-ad readiness stays separate');

const singleStateStart = capture.indexOf('function syncSingleInventoryButtonState');
const singleStateEnd = capture.indexOf('\nfunction isInventoryCaptureDialogVisible', singleStateStart);
const singleState = capture.slice(singleStateStart, singleStateEnd);
assert.match(singleState, /!pageReady\s*\|\|\s*!gate\.allowed/);
assert.match(singleState, /Öffne mindestens eine eigene Anzeige/); pass('single capture additionally requires at least one own ad');

const fullStateStart = app.indexOf('function syncFullInventoryButtonState');
const fullStateEnd = app.indexOf('\nfunction renderBulkState', fullStateStart);
const fullState = app.slice(fullStateStart, fullStateEnd);
assert.match(fullState, /!gate\.allowed/);
assert.doesNotMatch(fullState, /pageReady/);
assert.match(appCapture, /START_BULK_INVENTORY_OPERATION/);
assert.match(background, /async function startBulkInventoryOperation/);
assert.match(background, /bulk-source-auto/); pass('full capture no longer requires a pre-opened My Ads page and can create its own source');

const ensureStart = app.indexOf('async function ensureDetectedProfileSelectedForCapture');
const ensureEnd = app.indexOf('\nfunction messageTimestampText', ensureStart);
const ensure = app.slice(ensureStart, ensureEnd);
assert.doesNotMatch(ensure, /SET_SELECTED_PROFILE/);
assert.match(ensure, /profileId\s*!==\s*selectedId/); pass('capture never auto-switches the selected inventory profile');

assert.match(background, /async function probeLiveKleinanzeigenAccount/);
assert.match(background, /async function assertSelectedProfileMatchesLiveAccount/);
assert.match(background, /ACCOUNT_BOUND_ACTION_ALLOWED/);
assert.match(background, /purpose:\s*'renewal-start'/);
assert.match(background, /purpose:\s*'mass-renewal'/);
assert.match(background, /purpose:\s*'archive-insertion'/); pass('live write/start actions have a background account-binding guard');

for (const id of ['renewalStartDialog','archiveInsertDialog','massRenewalDialog','inventoryCaptureDialog','profileManagerDialog','actionConfirmDialog','trashTemplateDialog']) {
  assert.match(html, new RegExp(`<dialog id="${id}"`));
}
// KAR-85 adds exactly one named native updater dialog; all historical modal counts remain intact.
assert.equal((html.match(/<dialog\b/g) || []).length, includesActivePatch(['1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version) ? 8 : 7) + (html.includes('<dialog id="nativeUpdateDialog"') ? 1 : 0));
assert.match(app, /function syncModalScrollLock/);
assert.match(app, /document\.querySelector\('dialog\[open\]'\)/);
assert.match(app, /MutationObserver\(syncModalScrollLock\)/);
assert.match(css, /html\.modal-scroll-locked, body\.modal-scroll-locked\s*\{[^}]*overflow:hidden[^}]*overscroll-behavior:none/); pass('all native dialogs share a nested-safe background scroll lock');

for (const selector of ['mass-renewal-table-wrap','mass-renewal-result-list','inventory-capture-candidate-list','profile-manager-list']) {
  assert.match(css, new RegExp(`\\.${selector}\\s*\\{[^}]*overscroll-behavior:contain`));
}
assert.match(css, /\.profile-manager-list\s*\{[^}]*max-height:[^;}]+;[^}]*overflow:auto/);
assert.match(css, /\.renewal-start-dialog\s*\{[^}]*max-height:calc\(100dvh - 28px\)/);
assert.match(css, /\.mass-renewal-dialog\s*\{[^}]*max-height:calc\(100dvh - 28px\)/); pass('modal internals are viewport-bounded and stop scroll chaining');

assert.match(html, /Maximale Versuche je Phase · Standard: 3/);
assert.match(html, /Mehr Versuche erhöhen die Zuverlässigkeit, können den Ablauf aber verlängern/);
assert.doesNotMatch(html, /Vor einem erneuten Löschversuch prüft die App zuerst/); pass('retry microcopy is concise and consequence-oriented');

assert.doesNotMatch(background, /\.submit\s*\(/);
assert.doesNotMatch(background, /requestSubmit\s*\(/); pass('no publish submit bypass introduced');
