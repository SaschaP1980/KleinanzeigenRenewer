const fs = require('fs');
const path = require('path');
const assert = require('assert');
let n = 0;
const pass = name => { n += 1; console.log(`PASS ${n}: ${name}`); };
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const renewalWorkflow = fs.readFileSync(path.join(root, 'renewal-workflow-controller.js'), 'utf8');
const background = renewalWorkflow + '\n' + fs.readFileSync(path.join(root, 'remote-delete-replacement-service.js'), 'utf8') + '\n' + require('./v12221-legacy-background-surface.cjs');
const app = require('./v12210-source-surface.cjs') + '\n' + fs.readFileSync(path.join(root, 'mass-renewal-ui-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'archive-trash-insertion-ui-controller.js'), 'utf8');
const renewalDialog = fs.readFileSync(path.join(root, 'renewal-dialog-controller.js'), 'utf8');
const renewalUi = app + '\n' + renewalDialog;
const appHtml = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const appCss = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const filler = fs.readFileSync(path.join(root, 'template-filler.js'), 'utf8');

assert.ok(['1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'].includes(manifest.version));
assert.ok(['1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'].includes(pkg.version));
pass('v1.8.13 contract retained on compatible release');

assert.match(appHtml, /id="renewalStartDialog"/);
assert.match(appHtml, /Anzeige neu inserieren und bisherige ersetzen\?/);
assert.match(appHtml, /id="renewalStartCover"/);
assert.match(appHtml, /id="renewalStartTitle"/);
assert.match(appHtml, /Jetzt neu inserieren und austauschen/);
assert.match(appCss, /\.renewal-start-dialog::backdrop/);
pass('custom styled start modal shows source title/image and explicit confirmation action');

assert.match(appHtml, /(?:Ausfüllen|Neu inserieren|Neue Anzeige einstellen)/);
assert.match(appHtml, /(?:Veröffentlichen|Re-Inventarisieren|Neue Anzeige kontrollieren|Zusätzliche Datenprüfung entfällt)/);
assert.match(appHtml, /(?:Prüfen|Neue Anzeige prüfen|Neue Anzeige finden)/);
assert.match(appHtml, /Bisherige Anzeige löschen/);
assert.match(appHtml, /Einträge im Papierkorb werden 30 Tage lokal aufbewahrt/);
assert.match(appHtml, /Als Vorlage neu inserieren/);
pass('modal explains all four phases, deletion consequence and trash recovery');

const createListener = app.match(/createButton\.addEventListener\('click',[\s\S]*?\n    \}\);\n\n    const updateButton/)?.[0] || '';
assert.match(createListener, /confirmAutomatedRenewalStart\(record\)/);
assert.match(createListener, /autoReplacementAllowed: true/);
assert.match(createListener, /startConfirmationVersion: 1/);
assert.doesNotMatch(createListener, /\bconfirm\(/);
pass('normal Neu inserieren requires app-modal consent and never uses browser confirm');

assert.match(renewalUi, /function confirmAutomatedRenewalStart\(record\)/);
assert.match(renewalUi, /loadLocalPreview\(renewalStartCover, record, primaryImage\)/);
assert.match(app, /USER_FULL_RENEWAL_CONFIRMATION_CANCELLED/);
assert.match(app, /USER_FULL_RENEWAL_CONFIRMATION_ACCEPTED/);
pass('modal uses the local title image and cancellation starts no renewal request');

const startFill = background.match(/async function startTemplateFillUnlocked\(inventoryId,[\s\S]*?\n\}\n\nasync function startTrashTemplateFill/)?.[0] || '';
assert.match(startFill, /autoReplacementAllowed = false/);
assert.match(startFill, /startConfirmedAt/);
assert.match(startFill, /startConfirmationVersion/);
assert.match(startFill, /autoReplacementAllowed: Boolean\(autoReplacementAllowed\)/);
pass('explicit full-run consent is persisted in renewal and fill state');

assert.match(background, /function scheduleAutomaticRenewalReplacement/);
assert.match(background, /RENEWAL_AUTO_REPLACEMENT_STARTED/);
assert.match(background, /finishRenewalReplacement\(\{ renewalId: id, automatic: true \}\)/);
assert.match(background, /RENEWAL_AUTO_REPLACEMENT_FAILED/);
pass('verified consented renewals have a dedicated automatic phase-4 scheduler');

const reinventory = fs.readFileSync(path.join(root,'src/background/services/renewal-reinventory-flow.js'),'utf8'); // Owner moved in v1.23.15; original behavior assertions retained
assert.match(reinventory, /if \(comparison\.status !== 'match'\) \{[\s\S]*return renewalPublicSnapshot\(session\);[\s\S]*scheduleAutomaticRenewalReplacement\(renewalId, 'edit-comparison-match'\)/);
pass('automatic phase 4 is gated behind a complete authoritative edit match');

const resume = renewalWorkflow.match(/async function resumePendingRenewals\(\) \{[\s\S]*?\n\}\n\n      return Object\.freeze/)?.[0] || '';
assert.match(resume, /renewal\?\.autoReplacementAllowed/);
assert.match(resume, /startsWith\('source-delete'\)/);
assert.match(resume, /scheduleAutomaticRenewalReplacement\(renewal\.renewalId, 'service-worker-resume'\)/);
pass('service-worker recovery resumes consented verified/source-delete automatic renewals');

const trashStart = background.match(/async function startTrashTemplateFillUnlocked\(inventoryId\) \{[\s\S]*?\n\}\n\nasync function startTemplateFill/)?.[0] || '';
assert.match(trashStart, /templateOnly: true/);
assert.doesNotMatch(trashStart, /autoReplacementAllowed: true/);
assert.doesNotMatch(trashStart, /startConfirmationVersion/);
assert.match(filler, /if \(session\?\.templateOnly\) return await prepareTemplateOnlyComplete\(session\)/);
pass('trash recovery remains template-only and cannot inherit full-renewal authorization');

const phase4 = background.match(/async function finishRenewalReplacement\(message\) \{[\s\S]*?\n\}\n\nasync function discardRenewalDraft/)?.[0] || '';
const phase4Verifier = background.match(/async function verifyRenewalSourceAbsenceFresh[\s\S]*?\n}\n\nasync function preverifyAndTriggerRenewalSourceDeleteAttempt/)?.[0] || '';
assert.match(phase4Verifier, /VERIFY_OWN_AD_ABSENT_BY_ID/);
assert.match(phase4, /verifyRenewalSourceAbsenceFresh\(session/);
assert.match(phase4, /promoteRenewalCandidateAtomic\(session\)/);
assert.match(phase4, /setAppNotice/);
assert.match(phase4, /closeCompletedRenewalTargetTab\(session\)/);
pass('automatic full run reuses the existing strict phase-4 verification, trash promotion and completion UX');

assert.match(filler, /verifiedPublishGate\(session\)/);
assert.match(filler, /session\.result\.issues\.length === 0/);
assert.match(filler, /candidates\.length !== 1/);
assert.doesNotMatch(background, /requestSubmit\(|\.submit\(/);
assert.doesNotMatch(filler, /requestSubmit\(|\.submit\(/);
pass('auto publish hard gate and no-submit bypass remain intact');

console.log(`${n} v1.8.13 contract groups passed`);
