const { includesActivePatch } = require('./current-patch-policy.cjs');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
let n = 0;
const pass = name => { n += 1; console.log(`PASS ${n}: ${name}`); };
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const background = require('./v12215-source-surface.cjs');
const app = require('./v12210-source-surface.cjs');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');

assert.ok(includesActivePatch(['1.8.9','1.8.10','1.8.11','1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version));
assert.ok(includesActivePatch(['1.8.9','1.8.10','1.8.11','1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], pkg.version));
pass('v1.8.9 state-machine contract retained');

const visibilityClassifier = background.match(/function renewalComparisonHasOnlyVisibilityUncertainty\(comparison\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.ok(visibilityClassifier, 'visibility-only classifier must exist');
assert.match(visibilityClassifier, /comparison\.status !== 'uncertain'/);
assert.match(visibilityClassifier, /mismatches\.length/);
assert.match(visibilityClassifier, /new Set\(\['online', 'ownAdsPresence'\]\)/);
const classifier = background.match(/function renewalComparisonWaitsOnlyForOnline\(comparison\) \{[\s\S]*?\n\}\n\nfunction renewalOutcomeForComparison/)?.[0] || '';
assert.ok(classifier, 'online-only classifier must exist');
assert.match(classifier, /renewalComparisonHasOnlyVisibilityUncertainty\(comparison\)/);
assert.match(classifier, /uncertainties\.length === 1/);
assert.match(classifier, /field \|\| ''\) === 'online'/);
pass('publication latency keeps the strict online-only state while current verification can separately retry broader visibility transport uncertainty');

const outcome = background.match(/function renewalOutcomeForComparison\(comparison\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(outcome, /status: 'verified', stage: 'replacement-ready'/);
assert.match(outcome, /status: 'waiting-for-online', stage: 'waiting-for-online'/);
assert.match(outcome, /status: 'verification-failed', stage: 'verification-failed'/);
pass('comparison outcomes separate match, online wait, and genuine verification failure');

assert.match(app, /status === 'waiting-for-online'\) return 'VERÖFFENTLICHUNG NOCH NICHT BESTÄTIGT'/);
assert.match(app, /label === 'VERÖFFENTLICHUNG NOCH NICHT BESTÄTIGT'\) return 'Erneut prüfen'/);
assert.match(app, /label === 'PRÜFUNG ERFORDERLICH'\) return 'Erneut prüfen'/);
assert.match(css, /renewal-waiting-for-online/);
pass('UI exposes a distinct online-wait state and active retry wording');

const buttonBlock = app.match(/const retryableRenewal = \['waiting-for-online', 'verification-failed'\][\s\S]*?actions\.append\(renewalButton\);/)?.[0] || '';
assert.ok(buttonBlock, 'retryable renewal action block must exist');
assert.match(buttonBlock, /renewalButton\.disabled = !retryableRenewal/);
assert.match(buttonBlock, /RETRY_RENEWAL_VERIFICATION/);
assert.match(buttonBlock, /Prüfung läuft/);
pass('waiting and failed renewal states no longer expose a disabled dead-end action');

const retry = background.match(/async function retryRenewalVerification\(message\) \{[\s\S]*?\n\}\n\nasync function markRenewalPublishClicked/)?.[0] || '';
assert.ok(retry, 'retryRenewalVerification must exist');
assert.match(retry, /runRenewalReinventory\(renewalId\)/);
assert.match(retry, /RENEWAL_VERIFICATION_RETRY_STARTED/);
pass('online and failed retry states remain actively recoverable through the current verification path');

const resume = background.match(/async function resumePendingRenewals\(\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(resume, /status \|\| ''\) === 'verification-failed'/);
assert.match(resume, /renewalComparisonWaitsOnlyForOnline\(renewal\?\.comparison\)/);
assert.match(resume, /RENEWAL_LEGACY_ONLINE_WAIT_MIGRATED/);
assert.match(resume, /status \|\| ''\) === 'waiting-for-online'/);
assert.match(resume, /retryRenewalVerification/);
pass('persisted v1.8.8 online-only failures migrate and resume automatically');

assert.match(background, /recordKind: session\.newAdId \? 'renewal-candidate' : 'renewal-draft'/);
pass('published renewal records remain candidates while waiting for public availability');

assert.match(background, /(?:message\?\.type === "RETRY_RENEWAL_VERIFICATION"|"RETRY_RENEWAL_VERIFICATION"\s*:\s*Object\.freeze)/);
assert.doesNotMatch(background, /requestSubmit\(|\.submit\(/);
pass('retry message is wired without introducing a direct publish-submit path');

console.log(`${n} v1.8.9 contract groups passed`);
