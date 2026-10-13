const { includesActivePatch } = require('./current-patch-policy.cjs');
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
const archiveRecovery = fs.readFileSync(path.join(root, 'src/background/services/archive-insertion-recovery-service.js'), 'utf8');
const backgroundSurface = background + '\n' + archiveWorkflow + '\n' + archiveRecovery;
const app = require('./v12210-source-surface.cjs') + '\n' +
  fs.readFileSync(path.join(root, 'tab-page-inspection-controller.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(root, 'archive-trash-insertion-ui-controller.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const tabRegistry = fs.existsSync(path.join(root, 'tab-registry.js')) ? fs.readFileSync(path.join(root, 'tab-registry.js'), 'utf8') : '';

assert.ok(includesActivePatch(['1.13.6', '1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version));
assert.ok(includesActivePatch(['1.13.6', '1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], pkg.version));

// Export/ZIP-import UI uses user-facing Anzeige/ZIP terminology instead of internal archive/datensatz language.
assert.match(app, /exportButton\.textContent = 'Als ZIP exportieren'/);
assert.match(app, /Speichert diese Anzeige mit allen Bildern in der richtigen Reihenfolge als ZIP\./);
assert.match(app, /exportButton\.textContent = 'ZIP wird erstellt …'/);
assert.match(app, /setStatus\('ready', 'ZIP erstellt'/);
assert.match(html, /<h2 id="archiveInsertTitle">Anzeige aus ZIP neu inserieren<\/h2>/);
assert.match(html, /<strong>ZIP hierher ziehen<\/strong>/);
assert.match(html, /Verwende ein ZIP, das über „Als ZIP exportieren“ erstellt wurde\./);
assert.match(html, /<span>ZIP geprüft<\/span>/);
assert.match(html, /<li data-phase="2"><span>2<\/span><strong>Unter „Meine Anzeigen“ finden<\/strong><\/li>/);
assert.match(html, /id="archiveInsertConfirm"[^>]*>Anzeige inserieren<\/button>/);
assert.match(app, /ZIP erfolgreich geprüft · \$\{parsed\.images\.length\}/);
assert.doesNotMatch(app, /Archivversion \$\{parsed\.archiveVersion\}/);
if (includesActivePatch(['1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version)) assert.match(app, /Zusätzliche Inhaltsprüfung wird übersprungen/);
else assert.match(app, /Inhaltsvergleich entfällt/);
assert.match(app, /Anzeige erfolgreich inseriert/);
assert.match(app, /Anzeige erfolgreich erstellt/);
assert.match(app, /Danach wird geprüft, ob sie unter „Meine Anzeigen“ erscheint\./);
assert.match(app, /noch einmal mit den Daten aus dem ZIP verglichen/);

// Recovery is idempotent when the already-published ad is already inventoried and semantically matches.
assert.match(archiveRecovery, /async function completeRecoveredArchiveInsertionIfAlreadyInventoried/);
const recoveryHelperStart = archiveRecovery.indexOf('async function completeRecoveredArchiveInsertionIfAlreadyInventoried');
const recoveryHelperEnd = archiveRecovery.indexOf('\nasync function resumePendingArchiveInsertions', recoveryHelperStart);
assert.ok(recoveryHelperStart >= 0 && recoveryHelperEnd > recoveryHelperStart);
const recoveryHelper = archiveRecovery.slice(recoveryHelperStart, recoveryHelperEnd);
assert.match(recoveryHelper, /compareArchiveInsertionRecords/);
assert.match(recoveryHelper, /comparison\.status !== 'match'/);
assert.match(recoveryHelper, /ARCHIVE_INSERT_RECOVERY_ALREADY_INVENTORIED/);
assert.match(recoveryHelper, /session\.status = 'complete'/);
assert.match(recoveryHelper, /deleteImagesByInventoryId\(session\.stagingInventoryId\)/);

const resumeStart = archiveRecovery.indexOf('async function resumePendingArchiveInsertions');
const resumeBody = archiveRecovery.slice(resumeStart);
assert.match(resumeBody, /completeRecoveredArchiveInsertionIfAlreadyInventoried\(session\)/);

// Closed tabs after successful work are lifecycle state, not error-level diagnostic noise.
assert.match(app, /if \(!tabBeforeBootstrap\) return classifyTabLifecycleFailure/);
assert.match(app, /if \(!tabAfterRetries\) return classifyTabLifecycleFailure/);
assert.match(background, /function isNormalTabGoneLifecycleError/);
assert.match(background, /BACKGROUND_REQUEST_TAB_GONE/);
assert.match(background, /lifecycleGone \? 'info' : 'error'/);
if (includesActivePatch(['1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version)) {
  assert.match(tabRegistry, /KR_TAB_GONE/);
  assert.match(tabRegistry, /error\.code = code/);
  assert.match(background, /tabRegistry\.getTabOrThrow/);
} else {
  assert.match(background, /error\.code = 'KR_TAB_GONE'/);
}

const digest = crypto.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex');
assert.strictEqual(digest, '70507977688f3465a60227cd0261bd07d92fad620625cd7ebff8f0856d9c5ed3');
assert.deepStrictEqual(manifest.permissions, require('./current-patch-policy.cjs').expectedManifestPermissions(manifest.version));
assert.deepStrictEqual(manifest.host_permissions, [
  'https://www.kleinanzeigen.de/*',
  'https://kleinanzeigen.de/*',
  'https://img.kleinanzeigen.de/*'
]);


(async () => {
  const persisted = [];
  const deleted = [];
  const events = [];
  let existingRecord = null;
  let comparisonStatus = 'match';
  const ctx = {
    getInventory: async () => existingRecord,
    isTrashRecord: () => false,
    compareArchiveInsertionRecords: async () => ({ status: comparisonStatus }),
    persistArchiveInsertionSession: async session => persisted.push({ ...session }),
    deleteImagesByInventoryId: async id => deleted.push(id),
    logDiagnostic: async (level, event) => events.push({ level, event }),
    setAppNotice: async () => {},
    broadcastInventoryChanged: () => {},
    normalizeRenewalMode: value => value === 'fast' ? 'fast' : 'safe',
    crypto: { randomUUID: () => 'notice-id' },
    Date,
    console
  };
  ctx.globalThis = ctx;
  vm.runInNewContext(`${recoveryHelper}
globalThis.completeRecoveredArchiveInsertionIfAlreadyInventoriedForTest = completeRecoveredArchiveInsertionIfAlreadyInventoried;`, ctx);
  const run = ctx.completeRecoveredArchiveInsertionIfAlreadyInventoriedForTest;

  existingRecord = { inventoryId: '351', adId: '351', profileId: 'target', capturedAt: '2026-09-15T06:00:00.000Z', archiveImport: { archiveInsertionId: 'other' } };
  const session = { archiveInsertionId: 'run', newAdId: '351', targetProfileId: 'target', stagingInventoryId: 'archive:run', sourceRecord: { adId: 'old' }, renewalMode: 'fast', status: 'error' };
  assert.strictEqual(await run(session), true);
  assert.strictEqual(session.status, 'complete');
  assert.strictEqual(session.stage, 'complete');
  assert.strictEqual(session.lastError, null);
  assert.deepStrictEqual(deleted, ['archive:run']);
  assert.ok(events.some(item => item.event === 'ARCHIVE_INSERT_RECOVERY_ALREADY_INVENTORIED'));

  comparisonStatus = 'mismatch';
  existingRecord = { inventoryId: '352', adId: '352', profileId: 'target', archiveImport: { archiveInsertionId: 'different' } };
  const collisionSession = { archiveInsertionId: 'run2', newAdId: '352', targetProfileId: 'target', stagingInventoryId: 'archive:run2', sourceRecord: { adId: 'old2' }, status: 'error' };
  assert.strictEqual(await run(collisionSession), false);
  assert.strictEqual(collisionSession.status, 'error');

  comparisonStatus = 'match';
  existingRecord = { inventoryId: '353', adId: '353', profileId: 'other', archiveImport: { archiveInsertionId: 'different' } };
  const wrongProfileSession = { archiveInsertionId: 'run3', newAdId: '353', targetProfileId: 'target', stagingInventoryId: 'archive:run3', sourceRecord: { adId: 'old3' }, status: 'error' };
  assert.strictEqual(await run(wrongProfileSession), false);

  console.log('PASS v1.13.7 archive UX + idempotent recovery + tab lifecycle contract');
})().catch(error => { console.error(error); process.exit(1); });
