const { includesActivePatch } = require('./current-patch-policy.cjs');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
let n = 0;
const pass = name => { n += 1; console.log(`PASS ${n}: ${name}`); };
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const background = require('./v12221-legacy-background-surface.cjs');

assert.ok(includesActivePatch(['1.8.11','1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version));
assert.ok(includesActivePatch(['1.8.11','1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], pkg.version));
pass('v1.8.11 version aligned');

const classifier = background.match(/function isPhase4DeleteTransportInterruption\(error\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(classifier, /message channel closed/);
assert.match(classifier, /message port closed/);
pass('Phase-4 classifier recognizes observed post-confirmation channel loss');

const phase4 = background.match(/async function finishRenewalReplacement\(message\) \{[\s\S]*?\n\}\n\nasync function discardRenewalDraft/)?.[0] || '';
const phase4Verifier = background.match(/async function verifyRenewalSourceAbsenceFresh[\s\S]*?\n}\n\nasync function preverifyAndTriggerRenewalSourceDeleteAttempt/)?.[0] || '';
const phase4Delete = background.match(/async function preverifyAndTriggerRenewalSourceDeleteAttempt[\s\S]*?\n}\n\nasync function finishRenewalReplacement/)?.[0] || '';
assert.ok(phase4, 'finishRenewalReplacement must exist');
assert.match(phase4Delete, /DELETE_OWN_AD_BY_ID/);
assert.match(phase4Delete, /if \(!isPhase4DeleteTransportInterruption\(error\)\) throw error/);
assert.match(phase4Delete, /RENEWAL_SOURCE_DELETE_TRANSPORT_INTERRUPTED/);
assert.match(phase4Delete, /delete-outcome-unknown-verify-independently/);
pass('post-confirmation transport interruption is non-fatal and explicitly diagnosed');

assert.match(phase4, /session\.stage = 'source-delete-verification-pending'/);
assert.match(phase4, /sourceDeleteTransportInterrupted = deleteTransportInterrupted/);
assert.match(phase4, /persistRenewalSession\(session\)/);
pass('ambiguous destructive transport state is persisted before authoritative verification');

assert.match(phase4Verifier, /const verifyTab = await createManagedWorkerTab\([\s\S]*url: MY_ADS_PROJECTS_URL/);
assert.match(phase4Verifier, /verificationTabId = verifyTab\.id/);
assert.match(phase4Verifier, /VERIFY_OWN_AD_ABSENT_BY_ID/);
assert.doesNotMatch(phase4Delete, /chrome\.tabs\.reload\(deleteTabId\)/);
pass('verification runs in a separate fresh My Ads worker independent of destructive-tab lifecycle');

assert.match(phase4, /while \(renewalPhaseAttemptAvailable\(session, 4\)\)/);
assert.match(phase4, /renewalPhaseRetryDelayMs/);
assert.match(phase4, /RENEWAL_PHASE4_ATTEMPT_STARTED/);
assert.match(phase4Verifier, /RENEWAL_SOURCE_DELETE_VERIFICATION_ATTEMPT/);
assert.match(phase4, /if \(verification\?\.verified\) break/);
pass('authoritative absence verification retries are bounded by the configured phase-attempt policy');

assert.match(phase4, /session\.stage = 'replacement-ready'/);
assert.match(phase4, /sourceDeleteVerificationFailedAt/);
assert.match(phase4, /Quellanzeige ist nach der Löschaktion weiterhin in „Meine Anzeigen“ vorhanden/);
pass('source still present never finalizes locally and returns to retryable safe state');

const verifiedIndex = phase4.indexOf("session.stage = 'source-delete-verified'");
const promoteIndex = phase4.indexOf('promoteRenewalCandidateAtomic(session)');
assert.ok(verifiedIndex >= 0 && promoteIndex > verifiedIndex);
pass('atomic local promotion remains strictly after authoritative source-deletion verification');

assert.match(phase4Verifier, /closeManagedWorkerTab\(verificationTabId\)/);
assert.match(phase4Delete, /closeManagedWorkerTab\(deleteTabId\)/);
pass('destructive and verification workers are cleaned up independently');

assert.doesNotMatch(background, /requestSubmit\(|\.submit\(/);
pass('no direct publish-submit path introduced');

console.log(`${n} v1.8.11 contract groups passed`);
