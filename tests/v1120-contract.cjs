const { includesActivePatch } = require('./current-patch-policy.cjs');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const manifest = JSON.parse(read('manifest.json'));
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const background = require('./v12215-source-surface.cjs');
const app = read('app.js') + '\n' + read('renewal-settings-controller.js') + '\n' + read('mass-renewal-ui-controller.js') + '\n' + read('archive-trash-insertion-ui-controller.js');
const html = read('app.html');
const css = read('app.css');
const runner = read('inventory-runner.js');
const filler = read('template-filler.js');
let n = 0;
const pass = message => { n += 1; console.log('PASS', message); };

assert.ok(includesActivePatch(['1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version));
assert.ok(includesActivePatch(['1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], pkg.version));
assert.ok(includesActivePatch(['1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], lock.version));
assert.ok(includesActivePatch(['1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], lock.packages[''].version));
const keyDigest = crypto.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex');
const extensionId = keyDigest.slice(0, 32).split('').map(c => String.fromCharCode(97 + Number.parseInt(c, 16))).join('');
assert.equal(keyDigest, '70507977688f3465a60227cd0261bd07d92fad620625cd7ebff8f0856d9c5ed3');
assert.equal(extensionId, 'hafahjhhgiipdegfkgacchmnacgblnah');
assert.deepEqual(manifest.permissions, ['activeTab','storage','unlimitedStorage','scripting']);
pass('v1.12.0 preserves fixed extension identity and permissions');

for (const id of ['renewalModeIndicator','renewalModeSafeButton','renewalModeFastButton','renewalModeDescription']) {
  assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${id} must be unique`);
}
assert.match(html, /Konfiguration/);
assert.match(html, /Safe-Mode/);
assert.match(html, /Fast-Mode/);
assert.match(css, /\.renewal-mode-toggle/);
assert.match(css, /\.renewal-mode-indicator/);
pass('left-side configuration exposes a persistent Safe/Fast mode switch and visible mode indicator');

assert.match(background, /const RENEWAL_MODE_KEY = ["']renewalModeV1["']/);
assert.match(background, /const RENEWAL_MODE_SAFE = ["']safe["']/);
assert.match(background, /const RENEWAL_MODE_FAST = ["']fast["']/);
assert.match(background, /GET_RENEWAL_CONFIGURATION/);
assert.match(background, /SET_RENEWAL_MODE/);
assert.match(app, /USER_RENEWAL_MODE_CHANGED/);
assert.match(app, /(Fast-Mode|Schnellprüfung) aktivieren/);
pass('renewal mode is persisted centrally and Fast-Mode requires an explicit first-use acknowledgement');

const start = background.match(/async function startTemplateFillUnlocked\([\s\S]*?\n\}\n\nasync function startTrashTemplateFill/)?.[0] || '';
assert.match(start, /renewalMode/);
assert.match(start, /createRenewalSkeleton\([^\n]+renewalMode/);
assert.match(start, /renewalMode[,\n]/);
pass('the selected mode is snapshotted into each new renewal session and skeleton');

const trashFill = background.match(/async function startTrashTemplateFillUnlocked\(inventoryId\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.doesNotMatch(trashFill, /\brenewalMode\b/);
pass('trash recovery remains mode-independent and cannot reference renewal-mode state');

const confirm = background.match(/async function confirmPublishedRenewal\([\s\S]*?\n\}\n\nasync function resumePendingRenewals/)?.[0] || '';
assert.match(confirm, /runFastRenewalVerification/);
assert.match(confirm, /runRenewalReinventory/);
assert.match(confirm, /renewalMode/);
pass('after Phase 1 the workflow branches explicitly between Fast-Mode and Safe-Mode');

const fastVerify = fs.readFileSync(path.join(root,'src/background/services/renewal-verification-flow.js'),'utf8'); // Owner moved in v1.23.15; original behavior assertions retained
assert.match(fastVerify, /MY_ADS_PROJECTS_URL/);
assert.match(fastVerify, /FIND_OWN_AD_BY_ID/);
assert.match(fastVerify, /expectedProfile/);
assert.match(fastVerify, /replacement-ready/);
assert.doesNotMatch(fastVerify, /EXTRACT_CURRENT_AD/);
assert.doesNotMatch(fastVerify, /compareRenewalRecords/);
pass('Fast-Mode skips re-inventory and semantic comparison and only verifies the new adId in the expected My Ads profile');

const promotion = background.match(/async function promoteRenewalCandidateAtomic\([\s\S]*?\n\}\n\nfunction renewalTargetTabStillOwned/)?.[0] || '';
assert.match(promotion, /RENEWAL_MODE_FAST/);
assert.match(promotion, /sourceInventoryId/);
assert.match(promotion, /images\.put/);
assert.match(promotion, /imageOwnerId/);
pass('Fast-Mode atomically clones source image blobs to the promoted new ad while retaining the old trash copy');

const phase4 = background.match(/async function finishRenewalReplacement\(message\) \{[\s\S]*?\n\}\n\nasync function discardRenewalDraft/)?.[0] || '';
const phase4Delete = background.match(/async function preverifyAndTriggerRenewalSourceDeleteAttempt[\s\S]*?\n}\n\nasync function finishRenewalReplacement/)?.[0] || '';
const phase4Verifier = background.match(/async function verifyRenewalSourceAbsenceFresh[\s\S]*?\n}\n\nasync function preverifyAndTriggerRenewalSourceDeleteAttempt/)?.[0] || '';
assert.match(phase4Delete, /DELETE_OWN_AD_BY_ID/);
assert.match(phase4Verifier, /VERIFY_OWN_AD_ABSENT_BY_ID/);
assert.match(phase4, /source-delete-verified/);
assert.match(phase4, /promoteRenewalCandidateAtomic\(session\)/);
assert.match(phase4Verifier, /expectedProfile\.toLocaleLowerCase\('de-DE'\) !== verifyProfile\.toLocaleLowerCase\('de-DE'\)/);
pass('Fast-Mode reuses the established Phase-4 delete, independent absence verification and atomic promotion safety boundary');

assert.match(app, /phase-skipped/);
assert.match(css, /\.phase-skipped/);
assert.match(app, /(Re-Inventarisierung entfällt|Zusätzliche Datenprüfung entfällt)/);
assert.match(app, /nur.*„Meine Anzeigen“/s);
pass('renewal progress UI makes the skipped Fast-Mode Phase 2 and reduced Phase 3 explicit');

assert.doesNotMatch(background + filler, /requestSubmit\s*\(/);
assert.doesNotMatch(background + filler, /\.submit\s*\(/);
assert.match(runner, /VERIFY_OWN_AD_ABSENT_BY_ID/);
pass('Fast-Mode does not weaken publish hard-gates or independent delete verification');

console.log(`${n} v1.12.0 contract groups passed`);
