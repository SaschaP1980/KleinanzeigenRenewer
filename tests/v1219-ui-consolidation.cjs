const { includesActivePatch } = require('./current-patch-policy.cjs');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const js = require('./v12210-source-surface.cjs');
const activity = fs.readFileSync(path.join(root, 'app-activity-center.js'), 'utf8');
const actionsDiagnostics = fs.readFileSync(path.join(root, 'actions-diagnostics-controller.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
let pass = 0;
function check(name, fn) { fn(); console.log(`PASS ${name}`); pass += 1; }
check('v1.21.9+ retained contract', () => assert.ok(includesActivePatch(['1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version)));
check('live Kleinanzeigen account is global in app header', () => {
  assert.match(html, /class="app-header-side"[\s\S]*id="profileDetectedText"/);
  assert.doesNotMatch(html, /class="profile-switcher"[\s\S]{0,700}class="profile-account-status"/);
});
check('profile block uses gear control and Anzeigen wording', () => {
  assert.match(html, /class="profile-switcher-controls"/);
  assert.match(html, /id="profileManageButton"[\s\S]*aria-label="Inventarprofile verwalten"/);
  assert.match(js, /inventoryCount \|\| 0\)} Anzeigen/);
});
check('detail actions are compact and ZIP export moved into action stack', () => {
  assert.match(css, /\.compact-action\s*\{[^}]*min-height:\s*(?:30|31|32)px/);
  assert.match(js, /actions\.append\(createButton, updateButton, exportButton, deleteButton\)/);
  assert.match(js, /footer\.append\(details, footerMeta\)/);
});
check('stored detail images open safely in a new tab', () => {
  assert.match(js, /stored-image-link/);
  assert.match(js, /link\.target = '_blank'/);
  assert.match(js, /link\.rel = 'noopener noreferrer'/);
});
check('select chevrons use controlled symmetric padding', () => {
  assert.match(css, /select:not\(\[multiple\]\)/);
  assert.match(css, /appearance:\s*none/);
  assert.match(css, /background-position:\s*right\s+11px\s+center/);
});
check('messages live in a permanent dock with one active surface', () => {
  assert.match(html, /id="messageDock"[\s\S]*class="control-activity"/);
  assert.match(css, /\.message-dock\s*\{/);
  assert.match(activity, /function fingerprint\(activity\)/);
  assert.match(js, /UI_ACTIVITY_DISMISSED_FINGERPRINTS_KEY/);
});
check('temporary sticky diagnostics are removed while actions diagnostics remain', () => {
  assert.doesNotMatch(js, /UI_STICKY_(?:PINNED|UNPINNED|GEOMETRY_SAMPLE|WHEEL_SAMPLE|OSCILLATION_DETECTED)/);
  assert.doesNotMatch(js, /captureStickyWheel/);
  assert.match(actionsDiagnostics, /UI_ACTIONS_STATE_SNAPSHOT/);
  assert.match(actionsDiagnostics, /UI_ACTION_ATTEMPT/);
});
console.log(`${pass}/8 PASS`);
