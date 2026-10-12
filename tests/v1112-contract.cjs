const { includesActivePatch } = require('./current-patch-policy.cjs');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const manifest = JSON.parse(read('manifest.json'));
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const background = require('./v12215-source-surface.cjs');
let n = 0; const pass = msg => { n += 1; console.log('PASS', msg); };

assert.ok(includesActivePatch(['1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version));
assert.ok(includesActivePatch(['1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], pkg.version));
assert.ok(includesActivePatch(['1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], lock.version));
assert.ok(includesActivePatch(['1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], lock.packages[''].version));
assert.deepEqual(manifest.permissions, ['activeTab','storage','unlimitedStorage','scripting']);
assert.deepEqual(manifest.host_permissions, ['https://www.kleinanzeigen.de/*','https://kleinanzeigen.de/*','https://img.kleinanzeigen.de/*']);
const keyDigest = crypto.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex');
const extensionId = keyDigest.slice(0, 32).split('').map(c => String.fromCharCode(97 + Number.parseInt(c, 16))).join('');
assert.equal(keyDigest, '70507977688f3465a60227cd0261bd07d92fad620625cd7ebff8f0856d9c5ed3');
assert.equal(extensionId, 'hafahjhhgiipdegfkgacchmnacgblnah');
pass('v1.11.2 keeps fixed identity, permissions, hosts and package metadata');

const confirm = background.match(/async function confirmPublishedRenewal\(fill, detected\) \{[\s\S]*?\n\}\n\nasync function resumePendingRenewals/)?.[0] || '';
assert.match(confirm, /renewal\.newAdId = newAdId/);
assert.match(confirm, /await persistRenewalSession\(renewal\)/);
assert.match(confirm, /await sendRenewalFeedback\(renewal, 'Neue Anzeige veröffentlicht'/);
assert.match(confirm, /await retirePublishedRenewalTargetTab\(renewal\)/);
assert.ok(confirm.indexOf('await retirePublishedRenewalTargetTab(renewal)') > confirm.indexOf("RENEWAL_NEW_ID_CONFIRMED"));
pass('phase 1 retires its extension-owned target tab immediately after confirmed new ID and feedback');

const publishedCleanup = background.match(/async function closePublishedRenewalTargetTab\(session\) \{[\s\S]*?\n\}/)?.[0] || '';
const retire = background.match(/async function retirePublishedRenewalTargetTab\(session\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(publishedCleanup, /newAdId/);
assert.match(publishedCleanup, /\^\\d\+\$/);
assert.match(publishedCleanup, /renewalPublishedTargetTabStillOwned/);
assert.match(publishedCleanup, /RENEWAL_PUBLISHED_TARGET_TAB_CLOSED/);
assert.match(retire, /session\.targetTabId = null/);
assert.match(retire, /fill\.targetTabId = null/);
assert.match(retire, /!\['waiting', 'running'\]\.includes/);
pass('phase-1 cleanup only retires a confirmed owned Kleinanzeigen tab and clears persisted tab references safely');

const reinventorySource = fs.readFileSync(path.join(root,'src/background/services/renewal-reinventory-flow.js'),'utf8');
const reinventory = reinventorySource.match(/async function runRenewalReinventory\([\s\S]*?(?=\n\s+return Object\.freeze\()/)?.[0] || ''; // Scope just the relocated method, not its port declarations
assert.match(reinventory, /const editTab = await createManagedWorkerTab/);
assert.equal((reinventory.match(/createManagedWorkerTab/g) || []).length, 1, 'Phase 2 owns exactly one fresh edit worker per attempt');
assert.match(reinventory, /if \(workerTabId\) await closeManagedWorkerTab\(workerTabId\)/);
assert.match(reinventory, /resolveRenewalPublicEvidence\(newAdId,[\s\S]*session\)/);
pass('phase 2 retires its edit worker and phase 3 starts an independent fresh verification worker per attempt');

const publicWait = background.match(/async function waitForRenewalPublicAdComplete\(tabId, expectedAdId,[\s\S]*?\n\}/)?.[0] || '';
const freshCreate = background.match(/async function createFreshRenewalVerificationTab\(targetUrl, newAdId,[\s\S]*?\n\}/)?.[0] || '';
const freshProbe = background.match(/async function probeFreshRenewalPublicUrl\(url, expectedAdId,[\s\S]*?\n\}/)?.[0] || '';
const myAds = background.match(/async function findRenewalAdInMyAdsFresh\(adId, expectedProfileName,[\s\S]*?\n\}/)?.[0] || '';
const resolver = background.slice(background.indexOf('async function resolveRenewalPublicEvidence'), background.indexOf('\nasync function extractReadOnlyMetadata', background.indexOf('async function resolveRenewalPublicEvidence')));
assert.match(publicWait, /ManagedNavigation\.assessPublicAd\(tab, expectedAdId\)/);
assert.match(freshCreate, /url: 'about:blank'/);
assert.match(freshCreate, /registerManagedWorkerTab/);
assert.match(freshCreate, /updateAutomationTab\(tab\.id, \{ url: requestedUrl \}\)/);
assert.match(freshProbe, /createFreshRenewalVerificationTab\(url, expectedAdId, publicUrlVariant/);
assert.match(freshProbe, /finally \{[\s\S]*closeFreshRenewalVerificationTab/);
assert.match(myAds, /createFreshRenewalVerificationTab\(MY_ADS_PROJECTS_URL, adId, 'my-ads'/);
assert.match(resolver, /probeFreshRenewalPublicUrl\(canonicalKnownUrl, newAdId, 'canonical'/);
assert.match(resolver, /probeFreshRenewalPublicUrl\(directIdUrl, newAdId, 'id-direct'/);
assert.match(resolver, /findRenewalAdInMyAdsFresh\(newAdId, expectedProfileName, correlation\)/);
pass('phase 3 uses target-bound fresh tabs for canonical, id-direct and My Ads verification instead of recycling a worker');

const phase4 = background.match(/async function finishRenewalReplacement\(message\) \{[\s\S]*?\n\}\n\nasync function discardRenewalDraft/)?.[0] || '';
const phase4Delete = background.match(/async function preverifyAndTriggerRenewalSourceDeleteAttempt[\s\S]*?\n}\n\nasync function finishRenewalReplacement/)?.[0] || '';
const phase4Verifier = background.match(/async function verifyRenewalSourceAbsenceFresh[\s\S]*?\n}\n\nasync function preverifyAndTriggerRenewalSourceDeleteAttempt/)?.[0] || '';
assert.match(phase4Delete, /finally \{[\s\S]*closeManagedWorkerTab\(deleteTabId\)/);
assert.match(phase4Verifier, /finally \{[\s\S]*closeManagedWorkerTab\(verificationTabId\)/);
assert.match(phase4Verifier, /VERIFY_OWN_AD_ABSENT_BY_ID/);
assert.doesNotMatch(phase4, /verifyRenewalSourceAbsenceFresh\([^\n]*'pre-delete'/);
assert.ok(phase4.indexOf('preverifyAndTriggerRenewalSourceDeleteAttempt') < phase4.indexOf("'post-delete'"));
assert.match(phase4, /source-delete-verified/);
pass('phase 4 combines fresh preverify+delete in one worker and keeps a mandatory independent post-delete verification worker');

const compare = background.match(/async function compareRenewalRecords\(source, candidate,[\s\S]*?\n\}/)?.[0] || '';
assert.doesNotMatch(compare, /chrome\.tabs\.(create|update|remove)/);
assert.match(compare, /onlineConfirmed/);
assert.match(compare, /ownAdsPresence/);
pass('phase 3 semantic comparison remains local and creates no browser tabs');

const unchanged = {
  'app.js':'7bb99cd0da8a4caeb8aa62e611429494d78e6b6d49c6f71d092298a1d6aade60',
  'content.js':'020c4a03e5318fa212c12c10500ab467e4997111fcbe8503ac098e0fcd1fc0d1',
  'inventory-runner.js':'21b3a78553b216017c0e74ba3bcdddd24bd0f4756fe0d801bb73282969776318',
  'popup.js':'5f0d4fc74402111d9b7bdf5104a7bbe2c2b6cf70a830d13a976bd0a15cf16141',
  'popup.html':'c5129d573592e7bbb399ace63ae52af52242cb88af5ff61fda8231ce1f6a1ee7',
  'popup.css':'1691941fa817ea5ca69bc02219bdbd3fe815814ae1acb3a24df2704ddf76ef7d',
  'app.html':'b3c1de952a5be6a33d2c663bcf8c662e70808940b9c0d2f10130f6c0b6dd517f',
  'app.css':'5f4c5f7404a0d8c4ef867d1d8e5a70a2929595682190b3930106da5d158e6194',
  'icons/taskbar-16.png':'f42c199f711b29c8d680a0a411dd9debeeac7b1601c5b184f12daee46e4bb768',
  'icons/taskbar-32.png':'1333d46981860f686d9ac15227ad67c7346c07a01807d1e007428360570755d6',
  'icons/taskbar-48.png':'062444006dc3e0ab902bc8bb0eb5c0b0008652149c666e1de8a19045de7d0c64',
  'icons/app-icon-128.png':'8e91b7f9cbd919f22ba1db4ac8c7c5c815a61053670f1b902db406785bf1808f'
};
for (const [file, digest] of Object.entries(unchanged)) {
  if (includesActivePatch(['1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version)) continue; // v1.22.22 intentionally updates legacy/global wiring; historical patch-scope hashes are not applicable
  if (includesActivePatch(['1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version) && ['popup.js','popup.html','popup.css'].includes(file)) continue;
  if (includesActivePatch(['1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version) && ['app.js','content.js'].includes(file)) continue;
  if (includesActivePatch(['1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version) && ['inventory-runner.js','app.html','app.css'].includes(file)) continue;
  assert.equal(sha(file), digest, `${file} changed outside retained v1.11.2 scope`);
}
if (manifest.version === '1.11.2') assert.equal(sha('template-filler.js'), 'ec800e401375816b6aa538e21c11fe1f5f17529b46cf85ab061ef2c847b88fbc');
pass('v1.11.2 tab optimization remains intact while later category patches may evolve template-filler.js');

assert.doesNotMatch(background, /requestSubmit\(|\.submit\(/);
assert.match(phase4Delete, /expectedProfile\.toLocaleLowerCase\('de-DE'\) !== actualProfile\.toLocaleLowerCase\('de-DE'\)/);
assert.match(phase4Verifier, /expectedProfile\.toLocaleLowerCase\('de-DE'\) !== verifyProfile\.toLocaleLowerCase\('de-DE'\)/);
assert.match(phase4, /promoteRenewalCandidateAtomic\(session\)/);
pass('tab optimization keeps publish and destructive phase-4 safety gates intact');

console.log(`${n} v1.11.2 contract groups passed`);
