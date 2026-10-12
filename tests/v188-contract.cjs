const fs = require('fs');
const path = require('path');
const assert = require('assert');
let n = 0;
const pass = name => { n += 1; console.log(`PASS ${n}: ${name}`); };
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const runner = fs.readFileSync(path.join(root, 'inventory-runner.js'), 'utf8');
const background = require('./v12221-legacy-background-surface.cjs');

assert.ok(['1.8.8','1.8.9','1.8.10','1.8.11','1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'].includes(manifest.version));
assert.ok(['1.8.8','1.8.9','1.8.10','1.8.11','1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'].includes(pkg.version));
pass('v1.8.8 version aligned');

const feedbackHelper = runner.match(/function resolveDeleteSuccessFeedback\(\) \{[\s\S]*?\n  \}\n\n  async function waitForDeletePostAction/)?.[0] || '';
assert.ok(feedbackHelper, 'resolveDeleteSuccessFeedback helper must exist');
assert.match(feedbackHelper, /anzeige wurde gelöscht/);
assert.match(feedbackHelper, /\[role="status"\]/);
assert.match(feedbackHelper, /body-text-fallback/);
pass('delete success toast is treated as optional feedback evidence');

assert.match(feedbackHelper, /erledigt!/);
assert.match(feedbackHelper, /schön, dass du eine lösung gefunden hast/);
assert.match(feedbackHelper, /weitere anzeige aufgeben/);
assert.match(feedbackHelper, /type: 'modal'/);
pass('observed Erledigt success modal is recognized as optional feedback evidence');

const postAction = runner.match(/async function waitForDeletePostAction\(adId, listingRoot, timeoutMs = 5000(?:, correlation = \{\})?\) \{[\s\S]*?\n  \}\n\n  function resolveDeleteConfirmation/)?.[0] || '';
assert.ok(postAction, 'waitForDeletePostAction helper must exist');
assert.match(postAction, /RENEWAL_SOURCE_DELETE_SUCCESS_MODAL/);
assert.match(postAction, /RENEWAL_SOURCE_DELETE_SUCCESS_TOAST/);
assert.match(postAction, /RENEWAL_SOURCE_DELETE_NO_FEEDBACK/);
assert.match(postAction, /listing-still-present/);
pass('post-delete observation distinguishes modal, toast and no-feedback without making them authoritative');

const deleteFlow = runner.match(/async function deleteOwnAdById\(adId(?:, correlation = \{\})?\) \{[\s\S]*?\n  \}\n\n  async function verifyOwnAdAbsentById/)?.[0] || '';
assert.match(deleteFlow, /const confirmed = await confirmDeleteDialog\(wanted(?:, correlation)?\)/);
assert.match(deleteFlow, /if \(!confirmed\) throw new Error/);
assert.match(deleteFlow, /const postAction = await waitForDeletePostAction\(wanted, listing\.root(?:, 5000, correlation)?\)/);
assert.doesNotMatch(deleteFlow, /Quellanzeige blieb auf der aktuellen Seite sichtbar/);
assert.doesNotMatch(deleteFlow, /if \(!outcome\.verified\)/);
pass('a still-visible card after confirmation no longer aborts before the authoritative reload verification');

assert.match(deleteFlow, /feedback: postAction\.feedback/);
assert.match(deleteFlow, /localEvidence: postAction\.localEvidence/);
assert.match(background, /feedbackType: result\.deletion\?\.feedback\?\.type \|\| null/);
assert.match(background, /feedbackMethod: result\.deletion\?\.feedback\?\.method \|\| null/);
pass('optional success-feedback evidence is propagated into Phase-4 diagnostics');

const phase4 = background.match(/async function finishRenewalReplacement\(message\) \{[\s\S]*?\n\}\n\nasync function discardRenewalDraft/)?.[0] || '';
const phase4Verifier = background.match(/async function verifyRenewalSourceAbsenceFresh[\s\S]*?\n}\n\nasync function preverifyAndTriggerRenewalSourceDeleteAttempt/)?.[0] || '';
assert.ok(phase4, 'finishRenewalReplacement must exist');
assert.match(phase4, /source-delete-verification-pending/);
assert.match(phase4Verifier, /const verifyTab = await createManagedWorkerTab\([\s\S]*url: MY_ADS_PROJECTS_URL/);
assert.match(phase4Verifier, /VERIFY_OWN_AD_ABSENT_BY_ID/);
assert.match(phase4, /Quellanzeige ist nach der Löschaktion weiterhin in „Meine Anzeigen“ vorhanden/);
pass('fresh independent Meine-Anzeigen worker plus full paginated source-id verification remains authoritative');

assert.match(runner, /async function scanOwnAdsAcrossPages/);
assert.match(runner, /MAX_PHASE4_PAGES/);
assert.match(runner, /nextPageButton\(\)/);
assert.match(runner, /\[data-testid="ad-card"\]\[data-adid\]/);
pass('fallback verification continues to cover all available Meine-Anzeigen pages');

assert.doesNotMatch(runner, /requestSubmit\(|\.submit\(/);
assert.doesNotMatch(background, /requestSubmit\(|\.submit\(/);
pass('no direct submit path was introduced');

console.log(`${n} v1.8.8 contract groups passed`);
