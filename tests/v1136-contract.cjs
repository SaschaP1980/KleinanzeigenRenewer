const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const background = fs.readFileSync(path.join(root, 'background.js'), 'utf8');
const archiveWorkflow = fs.readFileSync(path.join(root, 'archive-insertion-controller.js'), 'utf8');
const archiveVerification = fs.readFileSync(path.join(root, 'src/background/services/archive-insertion-verification-service.js'), 'utf8');
const archiveRecovery = fs.readFileSync(path.join(root, 'src/background/services/archive-insertion-recovery-service.js'), 'utf8');
const backgroundSurface = background + '\n' + archiveWorkflow + '\n' + archiveVerification + '\n' + archiveRecovery;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'mass-renewal-ui-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'archive-trash-insertion-ui-controller.js'), 'utf8');

assert.ok(['1.13.5', '1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'].includes(manifest.version));
assert.ok(['1.13.5', '1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'].includes(pkg.version));

// ZIP imports are portable templates: source profile is provenance only.
assert.ok(backgroundSurface.includes('async function resolveArchiveTargetProfile'));
const startBody = archiveWorkflow.slice(archiveWorkflow.indexOf('async function startArchiveInsertion'));
assert.match(startBody, /const targetProfile = await resolveArchiveTargetProfile\(archiveInsertionId\)/);
assert.match(startBody, /sourceProfileName:\s*staging\.sourceProfileName \|\| null/);
assert.match(startBody, /targetProfileId:\s*targetProfile\.profileId/);
assert.match(startBody, /targetProfileName:\s*targetProfile\.displayName/);

const stagingBody = archiveVerification.slice(archiveVerification.indexOf('async function assertArchiveStagingReady'), archiveVerification.indexOf('async function resolveArchiveTargetProfile'));
assert.doesNotMatch(stagingBody, /Der Export besitzt keinen bestätigten Profilbezug/);
assert.match(stagingBody, /sourceProfileName/);

const findBody = archiveVerification.slice(archiveVerification.indexOf('async function findArchivePublishedAd'), archiveVerification.indexOf('\nasync function verifyAndSaveArchiveInsertion', archiveVerification.indexOf('async function findArchivePublishedAd')));
assert.match(findBody, /session\?\.targetProfileName/);
assert.doesNotMatch(findBody, /session\?\.sourceRecord\?\.profileName/);
assert.doesNotMatch(findBody, /Profil des exportierten Datensatzes/);
assert.match(findBody, /ARCHIVE_INSERT_TARGET_PROFILE_MISMATCH/);

// A v1.13.5 run that already published successfully but failed only at the obsolete
// source-profile equality gate is recoverable without publishing a duplicate ad.
const resumeBody = archiveRecovery.slice(archiveRecovery.indexOf('async function resumePendingArchiveInsertions'));
assert.match(resumeBody, /legacyPortableProfileFailure/);
assert.match(resumeBody, /Profil des exportierten Datensatzes/);
assert.match(resumeBody, /ARCHIVE_INSERT_LEGACY_PROFILE_GATE_RECOVERY_STARTED/);
assert.match(resumeBody, /runArchiveInsertionPostPublish\(session\.archiveInsertionId\)/);

// Saved inventory keeps source profile as provenance but belongs to the target profile.
assert.match(backgroundSurface, /sourceProfileName:\s*session\.sourceProfileName \|\| null/);
assert.match(backgroundSurface, /targetProfileName:\s*session\.targetProfileName \|\| actualProfile \|\| null/);

// Bulk progress belongs only to the profile whose My-Ads run produced it.
assert.ok(app.includes('function bulkStateMatchesSelectedProfile'));
const helperStart = app.indexOf('function bulkStateMatchesSelectedProfile');
const helperEnd = app.indexOf('\n\nfunction renderBulkState', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart);
const ctx = { UNASSIGNED_PROFILE_ID: '__unassigned__' };
ctx.globalThis = ctx;
vm.runInNewContext(`${app.slice(helperStart, helperEnd)}\nglobalThis.bulkStateMatchesSelectedProfileForTest = bulkStateMatchesSelectedProfile;`, ctx);
assert.strictEqual(ctx.bulkStateMatchesSelectedProfileForTest({ profileId: 'sascha' }, 'ka'), false);
assert.strictEqual(ctx.bulkStateMatchesSelectedProfileForTest({ profileId: 'ka' }, 'ka'), true);
assert.strictEqual(ctx.bulkStateMatchesSelectedProfileForTest(null, 'ka'), false);

const renderBulk = app.slice(app.indexOf('function renderBulkState'), app.indexOf('\nasync function refreshBulkStatus', app.indexOf('function renderBulkState')));
assert.match(renderBulk, /bulkStateMatchesSelectedProfile\(state\)/);
const profileSwitch = app.slice(app.indexOf('async function selectInventoryProfile'), app.indexOf('\nasync function deleteManagedProfile', app.indexOf('async function selectInventoryProfile')));
assert.match(profileSwitch, /await refreshBulkStatus\(\)/);

const digest = crypto.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex');
assert.strictEqual(digest, '70507977688f3465a60227cd0261bd07d92fad620625cd7ebff8f0856d9c5ed3');
assert.deepStrictEqual(manifest.permissions, ['activeTab', 'storage', 'unlimitedStorage', 'scripting']);
assert.deepStrictEqual(manifest.host_permissions, [
  'https://www.kleinanzeigen.de/*',
  'https://kleinanzeigen.de/*',
  'https://img.kleinanzeigen.de/*'
]);

console.log('PASS v1.13.6 portable ZIP target-profile + profile-scoped bulk-status contract');
