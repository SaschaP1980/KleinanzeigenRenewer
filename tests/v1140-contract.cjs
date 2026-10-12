const { includesActivePatch } = require('./current-patch-policy.cjs');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const background = require('./v12215-source-surface.cjs');
const renewalStateRepository = require('../renewal-state-repository.js');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'mass-renewal-ui-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'archive-trash-insertion-ui-controller.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');

assert.ok(includesActivePatch(['1.13.8', '1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version));
assert.ok(includesActivePatch(['1.13.8', '1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], pkg.version));

// Action placement and 3-step modal UX.
assert.match(html, /archiveInsertButton[\s\S]*massRenewalButton[^>]*>Mehrere neu inserieren<\/button>/);
assert.match(html, /id="massRenewalDialog"/);
assert.match(html, /Anzeigen auswählen/);
assert.match(html, /<th[^>]*>Titelbild<\/th>/);
assert.match(html, /<th[^>]*>Anzeige<\/th>/);
assert.match(html, /<th[^>]*>Preis<\/th>/);
assert.match(html, /<th[^>]*>Endet am<\/th>/);
assert.match(css, /\.mass-renewal-table-wrap[^}]*overflow:auto/);
assert.match(css, /\.mass-renewal-table thead th[^}]*position:sticky/);
assert.match(background, /const MASS_RENEWAL_MAX_ITEMS = 10;/);
assert.match(app, /MASS_RENEWAL_MAX_ITEMS = 10/);

// Persistent strict-sequential orchestration.
assert.match(background, /MASS_RENEWAL_BATCH_KEY = "massRenewalBatchV1"/);
assert.match(background, /async function startMassRenewalBatch/);
assert.match(background, /async function startNextMassRenewalItem/);
assert.match(background, /async function resumeMassRenewalBatch/);
assert.match(background, /massBatchId/);
assert.match(background, /massBatchTerminal/);
assert.match(background, /START_MASS_RENEWAL_BATCH/);
assert.match(background, /GET_MASS_RENEWAL_BATCH_STATUS/);
assert.match(background, /RETRY_MASS_RENEWAL_ITEM/);
assert.match(background, /MASS_RENEWAL_ITEM_SUCCEEDED/);
assert.match(background, /MASS_RENEWAL_ITEM_ATTENTION_REQUIRED/);
assert.match(background, /MASS_RENEWAL_BATCH_COMPLETED/);

// Terminal attention must advance the queue; publish alone must not.
assert.match(background, /function massRenewalTerminalOutcome\(/);
const start = background.indexOf('function massRenewalTerminalOutcome');
const end = background.indexOf('\nasync function readMassRenewalBatch', start);
assert.ok(start >= 0 && end > start);
const helper = background.slice(start, end);
const ctx = { globalThis: null };
ctx.globalThis = ctx;
vm.runInNewContext(`${helper}\nglobalThis.outcomeForTest = massRenewalTerminalOutcome;`, ctx);
const outcome = ctx.outcomeForTest;
assert.strictEqual(outcome({ status: 'submitted', stage: 'publish-submitted' }), null);
assert.strictEqual(outcome({ status: 'new-id-confirmed', stage: 'new-id-confirmed' }), null);
assert.strictEqual(outcome({ status: 'verification-failed', stage: 'reinventorize-failed', newAdId: '351' }).status, 'needs-review');
assert.strictEqual(outcome({ status: 'verification-failed', stage: 'fill-failed', newAdId: null }).status, 'error');
assert.strictEqual(outcome({ status: 'waiting-for-online', stage: 'waiting-for-online', newAdId: '351' }).status, 'needs-review');
assert.strictEqual(outcome({ status: 'verified', stage: 'replacement-ready', autoReplacementFailedAt: '2026-09-15T00:00:00Z' }).status, 'needs-review');
assert.strictEqual(outcome({ status: 'verified', stage: 'replacement-ready', autoReplacementFailedAt: null, lastError: null }), null);

// The existing single-renewal workflow remains the engine for each item.
assert.match(background, /startTemplateFillUnlocked\(item\.inventoryId,[\s\S]*autoReplacementAllowed: true/);
assert.match(background, /renewalModeOverride: batch\.renewalMode/);
assert.strictEqual(renewalStateRepository.renewalHoldsInsertionLock({ renewalId: 'r', massBatchTerminal: true, status: 'verified' }), false);

// Summary supports phase retries, but only after a terminal item state.
assert.match(app, /renderMassRenewalSummary/);
assert.match(app, /RETRY_MASS_RENEWAL_ITEM/);
assert.match(app, /Erneut prüfen|Austausch abschließen|Neu inserieren erneut starten/);

const digest = crypto.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex');
assert.strictEqual(digest, '70507977688f3465a60227cd0261bd07d92fad620625cd7ebff8f0856d9c5ed3');
assert.deepStrictEqual(manifest.permissions, ['activeTab', 'storage', 'unlimitedStorage', 'scripting']);
assert.deepStrictEqual(manifest.host_permissions, [
  'https://www.kleinanzeigen.de/*',
  'https://kleinanzeigen.de/*',
  'https://img.kleinanzeigen.de/*'
]);

console.log('PASS v1.14.0 mass renewal strict-sequential batch contract');
