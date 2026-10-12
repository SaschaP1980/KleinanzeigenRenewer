const fs = require('fs');
const path = require('path');
const assert = require('assert');
let n = 0;
const pass = name => { n += 1; console.log(`PASS ${n}: ${name}`); };
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const background = require('./v12211-background-source-surface.cjs');
const app = require('./v12210-source-surface.cjs') + '\n' + fs.readFileSync(path.join(root, 'mass-renewal-ui-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'archive-trash-insertion-ui-controller.js'), 'utf8');
const appHtml = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const filler = fs.readFileSync(path.join(root, 'template-filler.js'), 'utf8');

assert.ok(['1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'].includes(manifest.version));
assert.ok(['1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'].includes(pkg.version));
pass('v1.8.12 version aligned');

assert.match(background, /const TRASH_RETENTION_MS = 30 \* 24 \* 60 \* 60 \* 1000/);
assert.match(background, /recordKind: 'trash'/);
assert.match(background, /expiresAt/);
pass('trash records have a fixed 30-day retention contract');

const deleteInventory = background.match(/async function deleteInventory\(inventoryId\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(deleteInventory, /moveInventoryToTrash/);
assert.doesNotMatch(deleteInventory, /deleteInventoryStorageRecord\(id\)/);
assert.match(background, /LIST_TRASH/);
assert.match(background, /DELETE_TRASH_ENTRY/);
pass('normal inventory deletion is soft-delete and trash has explicit list/permanent-delete APIs');

const promote = background.match(/async function promoteRenewalCandidateAtomic\(session\) \{[\s\S]*?\n\}\n\nfunction renewalTargetTabStillOwned/)?.[0] || '';
assert.match(promote, /trashRecordFrom\(source, 'renewal-replaced'/);
assert.match(promote, /inventories\.put\(trashedSource\)/);
assert.match(promote, /inventories\.put\(promoted\)/);
assert.doesNotMatch(promote, /sourceImageCursor/);
pass('phase 4 atomically keeps the old source and its images in trash while promoting the new record');

const phase4 = background.match(/async function finishRenewalReplacement\(message\) \{[\s\S]*?\n\}\n\nasync function discardRenewalDraft/)?.[0] || '';
assert.match(phase4, /setAppNotice/);
assert.match(phase4, /Austausch erfolgreich abgeschlossen|Neu inseriert/);
assert.match(phase4, /closeCompletedRenewalTargetTab\(session\)/);
assert.match(phase4, /trashInventoryId/);
pass('successful phase 4 creates a persistent app notice and performs target-tab cleanup');

assert.match(background, /function renewalTargetTabStillOwned/);
assert.match(background, /url\.pathname\.startsWith\('\/p-anzeige-aufgeben'\)/);
assert.match(background, /RENEWAL_TARGET_TAB_CLEANUP_SKIPPED/);
pass('target-tab cleanup is ownership- and URL-guarded instead of blindly closing the tab');

assert.match(appHtml, /id="trashSection"/);
assert.match(appHtml, /id="trashViewButton"/);
assert.match(appHtml, /Als Vorlage neu inserieren/);
assert.match(app, /START_TRASH_TEMPLATE_FILL/);
assert.match(app, /Endgültig löschen/);
assert.match(app + appHtml, /Einträge können nicht zurück ins Inventar verschoben werden/);
pass('app exposes a dedicated trash recovery view without inventory restore');

const trashStart = background.match(/async function startTrashTemplateFillUnlocked\(inventoryId\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(trashStart, /templateOnly: true/);
assert.doesNotMatch(trashStart, /createRenewalSkeleton/);
assert.doesNotMatch(trashStart, /renewalId = crypto\.randomUUID/);
pass('trash recovery starts a standalone template-only fill without a renewal skeleton/session');

assert.match(filler, /if \(session\?\.templateOnly\) return await prepareTemplateOnlyComplete\(session\)/);
assert.match(filler, /stage: 'template-only-complete'/);
assert.match(filler, /publishTriggered: false/);
assert.match(filler, /if \(!session\?\.templateOnly\) armPublishDetection\(fillId\)/);
assert.match(filler, /advanceAfterVerifiedFill\(\{ fillId, renewalId: session\.renewalId \|\| null, templateOnly: Boolean\(session\.templateOnly\)/);
pass('template-only recovery cannot enter the automatic publish path');

assert.match(background, /async function purgeExpiredTrash/);
assert.match(background, /TRASH_EXPIRED_PURGED/);
assert.match(background, /onStartup\?\.addListener/);
assert.match(background, /onInstalled\?\.addListener/);
pass('expired trash is purged opportunistically on lifecycle startup and before list operations');

const clear = background.match(/async function clearInventories\(profileId\) \{[\s\S]*?\n\}\n\nasync function getBulkRunState/)?.[0] || '';
assert.match(clear, /trashRecordFrom\(record, 'inventory-cleared'/);
assert.doesNotMatch(clear, /objectStore\(IMAGE_STORE\)\.clear/);
pass('clear-inventory now retains records/images in the 30-day trash instead of hard deleting');

assert.match(appHtml, /id="appNotice"/);
assert.match(app, /GET_APP_NOTICE/);
assert.match(app, /DISMISS_APP_NOTICE/);
pass('completion notice is visible and dismissible in the app');

assert.doesNotMatch(background, /requestSubmit\(|\.submit\(/);
assert.doesNotMatch(filler, /requestSubmit\(|\.submit\(/);
pass('no direct submit/requestSubmit publish bypass introduced');

console.log(`${n} v1.8.12 contract groups passed`);
