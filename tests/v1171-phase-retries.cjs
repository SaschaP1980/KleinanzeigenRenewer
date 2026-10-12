const fs = require('fs');
const assert = require('assert');
const background = require('./v12221-legacy-background-surface.cjs') + '\n' + fs.readFileSync('renewal-policy.js','utf8');
const app = fs.readFileSync('app.js','utf8') + '\n' + fs.readFileSync('renewal-settings-controller.js','utf8');
const html = fs.readFileSync('app.html','utf8');
const filler = fs.readFileSync('template-filler.js','utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json','utf8'));
function pass(s){ console.log('PASS '+s); }

assert.ok(['1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version)); pass('v1.17.1 retry policy remains preserved');

assert.match(background, /RENEWAL_PHASE_ATTEMPTS_KEY\s*=\s*["']renewalPhaseAttemptsV1["']/);
assert.match(background, /RENEWAL_PHASE_ATTEMPTS_DEFAULT\s*=\s*3/);
assert.match(background, /RENEWAL_PHASE_ATTEMPTS_MIN\s*=\s*1/);
assert.match(background, /RENEWAL_PHASE_ATTEMPTS_MAX\s*=\s*5/);
assert.match(background, /function normalizeRenewalPhaseAttempts/);
assert.match(background, /maxPhaseAttempts:\s*normalizeRenewalPhaseAttempts/);
assert.match(background, /SET_RENEWAL_PHASE_ATTEMPTS/);
assert.match(background, /maxPhaseAttemptsOverride:\s*batch\.maxPhaseAttempts/); pass('configuration persists bounded max attempts and batch freezes the value');

assert.match(html, /id="renewalRetryRange"[^>]*min="1"[^>]*max="5"[^>]*value="3"/);
assert.match(html, /Versuche je Phase/);
assert.match(html, /Maximale Versuche je Phase · Standard: 3/);
assert.match(html, /Mehr Versuche erhöhen die Zuverlässigkeit, können den Ablauf aber verlängern/);
assert.match(app, /renewalRetryRange/);
assert.match(app, /USER_RENEWAL_PHASE_ATTEMPTS_CHANGED/); pass('end-user retry control is wired with safety-focused microcopy');

assert.match(background, /phase1AttemptId/);
assert.match(background, /restartRenewalPhase1Attempt/);
assert.match(background, /RENEWAL_PHASE1_ATTEMPT_RESTARTED/);
assert.match(background, /phase1PublishBoundaryReached/);
assert.match(background, /newAdId[\s\S]{0,200}return true|publish-submitted[\s\S]{0,200}return true/); pass('phase 1 restarts have publish boundary and attempt correlation');

assert.doesNotMatch(filler, /CATEGORY_OPEN_FALLBACK_NAVIGATION_STARTED/);
assert.doesNotMatch(filler, /location\.assign\(fallbackUrl\)/);
assert.doesNotMatch(filler, /CATEGORY_OPEN_CLICK_ATTEMPTS\s*=\s*3/);
assert.match(filler, /INTERACTION_SETTLE_MS\s*=\s*200/);
assert.match(filler, /CATEGORY_OPEN_LOCAL_RETRY_DELAY_MS\s*=\s*300/);
assert.match(filler, /normalizeLocalInteractionAttempts/);
assert.match(filler, /session\?\.maxPhaseAttempts/);
assert.match(filler, /findCategoryChooser\(\)/); pass('category uses configured local semantic click retries with interaction settling and no hardcoded navigation fallback');

const safeStart = background.indexOf('async function runRenewalReinventory');
const safeEnd = background.indexOf('async function retryRenewalVerification', safeStart);
const safe = background.slice(safeStart, safeEnd);
assert.match(safe, /RENEWAL_PHASE2_ATTEMPT_STARTED/);
assert.match(safe, /RENEWAL_PHASE2_ATTEMPT_FAILED/);
assert.match(safe, /phase2CompletedAt/);
assert.match(safe, /RENEWAL_PHASE3_ATTEMPT_STARTED/);
assert.match(safe, /RENEWAL_PHASE3_ATTEMPT_FAILED/);
assert.match(safe, /requirePublicAvailability:\s*false/);
assert.match(safe, /publicAvailabilityPending/);
assert.match(safe, /semantic mismatch is authoritative evidence/i); pass('safe mode keeps bounded technical retries while public readiness is decoupled from the authoritative edit comparison');

const fastStart = background.indexOf('async function runFastRenewalVerification');
const fastEnd = background.indexOf('async function runRenewalReinventory', fastStart);
const fast = background.slice(fastStart, fastEnd);
assert.match(fast, /while \(renewalPhaseAttemptAvailable\(session, 3\)\)/);
assert.match(fast, /RENEWAL_PHASE3_ATTEMPT_STARTED/);
assert.match(fast, /RENEWAL_FAST_MODE_PRESENCE_ATTEMPT_FAILED/);
assert.match(fast, /createManagedWorkerTab[\s\S]*renewal-fast-presence/);
assert.doesNotMatch(fast, /const retryDelays = \[0, 1500, 3500\]/); pass('fast presence retries use configured phase-3 attempts and fresh workers');

const phase4Start = background.indexOf('async function finishRenewalReplacement');
const phase4End = background.indexOf('async function discardRenewalDraft', phase4Start);
const phase4 = background.slice(phase4Start, phase4End);
assert.match(background, /async function verifyRenewalSourceAbsenceFresh/);
assert.match(phase4, /RENEWAL_PHASE4_ATTEMPT_STARTED/);
assert.match(phase4, /RENEWAL_PHASE4_ATTEMPT_FAILED/);
assert.match(background, /RENEWAL_PHASE4_ATOMIC_PREVERIFY_DELETE_STARTED/);
assert.match(background, /VERIFY_OWN_AD_ABSENT_BY_ID/);
assert.match(phase4, /phase4AttemptsExhaustedAt/);
assert.doesNotMatch(phase4, /verifyRenewalSourceAbsenceFresh\([^\n]*'pre-delete'/);
assert.ok(phase4.indexOf('preverifyAndTriggerRenewalSourceDeleteAttempt') < phase4.indexOf("'post-delete'"));
assert.match(phase4, /source-delete-verified/); pass('phase 4 retries preverify atomically before delete and preserve independent post-delete absence proof');

assert.match(background, /resetRenewalPhaseAttempts\(session, \[2, 3\]\)/);
assert.match(background, /resetRenewalPhaseAttempts\(session, \[4\]\)/);
assert.match(background, /!renewal\?\.phase4AttemptsExhaustedAt/); pass('explicit user retry can start a new retry cycle without automatic infinite loops');

assert.doesNotMatch(background, /\.submit\s*\(/);
assert.doesNotMatch(background, /requestSubmit\s*\(/);
assert.doesNotMatch(filler, /\.submit\s*\(/);
assert.doesNotMatch(filler, /requestSubmit\s*\(/); pass('no submit bypass introduced');
