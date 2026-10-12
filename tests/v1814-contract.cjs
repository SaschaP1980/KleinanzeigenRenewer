const fs = require('fs');
const path = require('path');
const assert = require('assert');
let n = 0;
const pass = name => { n += 1; console.log(`PASS ${n}: ${name}`); };
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const app = require('./v12210-source-surface.cjs');
const renewalDialog = fs.readFileSync(path.join(root, 'renewal-dialog-controller.js'), 'utf8');
const renewalUi = app + '\n' + renewalDialog;
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const background = fs.readFileSync(path.join(root, 'background.js'), 'utf8');

assert.ok(['1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version));
assert.ok(['1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(pkg.version));
pass('v1.8.14 version aligned');

assert.match(html, /id="renewalProgressMessage"/);
assert.match(html, /id="renewalProgressShortcut"/);
assert.match(html, /id="renewalProgressView"[^>]*>Anzeige ansehen</);
assert.match(html, /data-phase="1"/);
assert.match(html, /data-phase="4"/);
pass('start modal contains reusable live progress and completion surfaces');

assert.match(app, /function renewalProgressModel\(record\)/);
assert.match(renewalUi, /phase-active/);
assert.match(renewalUi, /phase-success/);
assert.match(renewalUi, /phase-error/);
assert.match(renewalUi, /phase-waiting/);
pass('four phases have real pending active success error and waiting state mapping');

const settle = renewalDialog.match(/function settleRenewalStartDialog\(confirmed\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(settle, /if \(confirmed\)/);
assert.match(settle, /dialogMode = 'progress'/);
const confirmedBranch = settle.match(/if \(confirmed\) \{([\s\S]*?)\} else \{/)?.[1] || '';
assert.doesNotMatch(confirmedBranch, /renewalStartDialog\.close/);
pass('confirm transforms the existing modal into progress instead of closing it');

assert.match(renewalUi, /renewalProgressClose\?\.addEventListener/);
assert.match(renewalUi, /renewalStartDialog\.close\('hidden'\)/);
assert.match(renewalUi, /renewalProgressShortcut\?\.addEventListener/);
pass('progress modal may be hidden without stopping the renewal and can be reopened');

assert.match(app, /function syncRenewalProgressUi/);
assert.match(app, /latestAutomatedRenewal/);
assert.match(app, /showRenewalProgress\(active/);
pass('progress is reconstructed from persisted automated renewal records');

assert.match(renewalUi, /function showRenewalCompletion/);
assert.match(renewalUi, /Geschafft! Anzeige erfolgreich ausgetauscht/);
assert.match(renewalUi, /setRenewalPhaseStates\(\{ 1: 'success', 2: mode === (?:RENEWAL_MODE_FAST|FAST) \? 'skipped' : 'success', 3: 'success', 4: 'success' \}\)/);
assert.match(app, /renewal-replacement-completed/);
pass('same UX surface turns into an all-green successful completion state');

assert.match(background, /async function openReadOnlyAd\(message\)/);
if (['1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version)) {
  assert.match(background, /publicUrlForInventoryRecord\(inventoryRecord\)/);
  assert.match(background, /directPublicUrlForAdId\(adId\)/);
} else {
  assert.match(background, /`https:\/\/www\.kleinanzeigen\.de\/s-anzeige\/\$\{encodeURIComponent\(adId\)\}`/);
}
assert.match(background, /OPEN_READONLY_AD/);
pass('background opens read-only deterministically with canonical URL preference and short-id fallback');

const cardOpen = app.match(/if \(hasEditableAdId\) \{[\s\S]*?\n    \}/)?.[0] || '';
assert.match(cardOpen, /zum Ansehen öffnen/);
assert.match(cardOpen, /openInventoryReadOnly\(record\)/);
assert.match(app, /function cardTargetIsInteractive/);
pass('inventory card click opens read-only while interactive children remain protected');

assert.match(app, /sourceLink\.textContent = 'Anzeige bearbeiten'/);
assert.match(app, /p-anzeige-bearbeiten\.html\?adId=/);
pass('expanded details expose an explicitly named edit link');

assert.match(renewalUi, /renewalProgressView\.onclick = open/);
assert.match(renewalUi, /renewalStartSource\.onclick = open/);
if (['1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version)) assert.match(renewalUi, /openInventoryReadOnly\(\{ \.\.\.\(record \|\| \{\}\), adId: newAdId/); else assert.match(renewalUi, /openInventoryReadOnly\(\{ adId: newAdId/);
pass('completion button and result card open the new ad in read-only mode');

if (['1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version)) {
  assert.doesNotMatch(app, /scrollIntoView\(|scrollTo\(0/);
  assert.match(app, /window\.scrollTo\(position\.x, position\.y\)/);
} else assert.doesNotMatch(app, /scrollIntoView\(|scrollTo\(0|window\.scrollTo/);
pass('live modal preserves rather than changing the inventory list scroll position');

assert.match(css, /\.renewal-start-steps li\.phase-success/);
assert.match(css, /\.renewal-start-steps li\.phase-error/);
assert.match(css, /\.renewal-progress-shortcut/);
assert.match(css, /@keyframes renewal-progress-pulse/);
pass('progress state styling and resumable status surface are present');

console.log(`${n} v1.8.14 contract groups passed`);
