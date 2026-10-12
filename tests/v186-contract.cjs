const { includesActivePatch } = require('./current-patch-policy.cjs');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');
let n = 0;
const pass = name => { n += 1; console.log(`PASS ${n}: ${name}`); };
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const runner = fs.readFileSync(path.join(root, 'src/content/inventory-runner.js'), 'utf8');
const deleteOperations = fs.readFileSync(path.join(root, 'src/content/inventory-delete-operations.js'), 'utf8');
const rosterParser = fs.readFileSync(path.join(root, 'src/content/inventory-roster-parser.js'), 'utf8');
const background = require('./v12221-legacy-background-surface.cjs');

assert.ok(includesActivePatch(['1.8.6','1.8.7','1.8.8','1.8.9','1.8.10','1.8.11','1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version));
assert.ok(includesActivePatch(['1.8.6','1.8.7','1.8.8','1.8.9','1.8.10','1.8.11','1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], pkg.version));
pass('v1.8.6 diagnostic regression retained');

const helperStart = runner.indexOf("function diagnostic(event, details = {}, severity = 'info', context = {})");
const helperEnd = runner.indexOf('\n  }', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'inventory-runner diagnostic helper must exist');
const helper = runner.slice(helperStart, helperEnd + 4);
assert.match(helper, /type: 'LOG_DIAGNOSTIC_EVENT'/);
assert.match(helper, /module: 'inventory-runner'/);
assert.match(helper, /operation: 'phase4-own-ads'/);
assert.match(helper, /catch \{ \/\* Diagnose darf den Seitenablauf niemals beeinflussen\. \*\/ \}/);
pass('inventory-runner owns a best-effort diagnostic helper');

const sandbox = {
  chrome: { runtime: { lastError: null, sendMessage() { throw new Error('diagnostic transport down'); } } }
};
assert.doesNotThrow(() => vm.runInNewContext(`${helper}\ndiagnostic('REGRESSION_TEST', { ok: true });`, sandbox));
pass('diagnostic transport failure is contained and cannot abort phase 4');

assert.match(deleteOperations, /const \{[\s\S]*diagnostic[\s\S]*\} = options;/);
assert.match(runner, /InventoryDeleteOperations\.create\(\{[\s\S]*diagnostic/);
pass('phase-4 diagnostics receive the defined best-effort helper through the public owner contract');

for (const event of [
  'RENEWAL_SOURCE_DELETE_CONFIRMED',
  'RENEWAL_SOURCE_DELETE_ALREADY_ABSENT_CANDIDATE',
  'RENEWAL_SOURCE_DELETE_TARGET_RESOLVED',
  'RENEWAL_SOURCE_DELETE_CLICKED',
  'RENEWAL_SOURCE_DELETE_LOCAL_OUTCOME',
  'RENEWAL_SOURCE_DELETE_VERIFICATION_FAILED',
  'RENEWAL_SOURCE_DELETE_VERIFIED'
]) {
  assert.match(deleteOperations, new RegExp(`diagnostic\\('${event}'`));
}
pass('all phase-4 diagnostic events use the defined helper');

assert.match(rosterParser, /function isMyAdsProjectsUrl/);
assert.match(deleteOperations, /async function scanOwnAdsAcrossPages/);
assert.match(rosterParser, /\[data-testid="ad-card"\]\[data-adid\]/);
assert.match(deleteOperations, /svg\[data-title="trashOutline"\]/);
assert.match(deleteOperations, /async function verifyOwnAdAbsentById/);
pass('v1.8.5 page, card, delete-control and pagination safeguards remain');

const phase4 = background.match(/async function finishRenewalReplacement[\s\S]*?\n}\n\nasync function discardRenewalDraft/)?.[0] || '';
const phase4Verifier = background.match(/async function verifyRenewalSourceAbsenceFresh[\s\S]*?\n}\n\nasync function preverifyAndTriggerRenewalSourceDeleteAttempt/)?.[0] || '';
assert.match(phase4Verifier, /type: 'VERIFY_OWN_AD_ABSENT_BY_ID'/);
assert.match(phase4, /verifyRenewalSourceAbsenceFresh\(session/);
assert.match(phase4, /promoteRenewalCandidateAtomic\(session\)/);
assert.ok(phase4.indexOf('verifyRenewalSourceAbsenceFresh(session') < phase4.indexOf("session.stage = 'source-delete-verified'"));
assert.ok(phase4.indexOf("session.stage = 'source-delete-verified'") < phase4.indexOf('promoteRenewalCandidateAtomic(session)'));
pass('local promotion remains after authoritative source-absence verification');

assert.doesNotMatch(runner + '\n' + deleteOperations + '\n' + rosterParser, /requestSubmit\(|\.submit\(/);
assert.doesNotMatch(phase4, /fetch\([^)]*(delete|remove)/i);
pass('no direct submit or private delete API path was introduced');

console.log(`${n} v1.8.6 contract groups passed`);
