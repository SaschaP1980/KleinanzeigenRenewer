const assert = require('assert');
const fs = require('fs');
const { source: legacySource } = require('./v1230-source-surface.cjs');
// Logical characterization surface follows the three real v1.23.15 function owners.
const source = legacySource + ['renewal-verification-flow.js','renewal-reinventory-flow.js','paid-checkout-recovery-service.js'].map(file=>fs.readFileSync('src/background/services/'+file,'utf8')).join('\n');
let passed = 0;
const ok = (name, fn) => { try { fn(); passed++; console.log('PASS ' + name); } catch (error) { console.error('FAIL ' + name); throw error; } };
const hasFunction = name => new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).test(source);

ok('renewal skeleton lifecycle is characterized', () => {
  for (const name of ['createRenewalSkeleton','updateRenewalSkeleton','persistRenewalSession']) assert.ok(hasFunction(name), name);
  assert.match(source, /renewal-draft-created/);
  assert.match(source, /renewal-updated/);
});
ok('renewal feedback is best-effort and diagnostic', () => {
  assert.ok(hasFunction('sendRenewalFeedback'));
  assert.match(source, /RENEWAL_FEEDBACK_EMITTED/);
  assert.match(source, /RENEWAL_FEEDBACK/);
});
ok('automatic replacement workflow is characterized', () => {
  assert.ok(hasFunction('scheduleAutomaticRenewalReplacement'));
  assert.match(source, /RENEWAL_AUTO_REPLACEMENT_STARTED/);
  assert.match(source, /RENEWAL_AUTO_REPLACEMENT_FAILED/);
});
ok('fast renewal verification is characterized', () => {
  assert.ok(hasFunction('runFastRenewalVerification'));
  assert.match(source, /RENEWAL_FAST_MODE_VERIFICATION_STARTED/);
  assert.match(source, /RENEWAL_FAST_MODE_PRESENCE_VERIFIED/);
});
ok('safe renewal reinventory is characterized', () => {
  assert.ok(hasFunction('runRenewalReinventory'));
  assert.match(source, /RENEWAL_REINVENTORY_STARTED/);
  assert.match(source, /RENEWAL_VERIFICATION_FINISHED/);
});
ok('manual verification retry keeps fast safe branching', () => {
  assert.ok(hasFunction('retryRenewalVerification'));
  assert.match(source, /RENEWAL_VERIFICATION_RETRY_STARTED/);
  assert.match(source, /RENEWAL_MODE_FAST/);
});
ok('publish boundary handling is characterized', () => {
  for (const name of ['markRenewalPublishClicked','confirmPublishedRenewal']) assert.ok(hasFunction(name), name);
  assert.match(source, /publish-submitted/);
  assert.match(source, /RENEWAL_NEW_ID_CONFIRMED/);
});
ok('checkout recovery remains read-only verification before local recovery', () => {
  for (const name of ['checkoutRecoveryEvidenceForRenewal','checkoutRecoveryBaselineForRenewal','verifyAbortedPaidCheckoutNoPublication','finalizeVerifiedCheckoutAbort','tryRecoverAbortedPaidCheckout']) assert.ok(hasFunction(name), name);
  assert.match(source, /RENEWAL_CHECKOUT_RECOVERY_VERIFICATION_STARTED/);
  assert.match(source, /checkout-aborted-verified/);
});
ok('service-worker renewal resume is characterized', () => {
  assert.ok(hasFunction('resumePendingRenewals'));
  assert.match(source, /RENEWAL_RESUME_DEFERRED/);
  assert.match(source, /RENEWAL_LEGACY_EMERGENCY_RESET_MIGRATED/);
});
ok('emergency reset remains outside renewal workflow extraction boundary', () => {
  assert.ok(hasFunction('resetActiveWorkflows'));
  assert.match(source, /ACTIVE_WORKFLOWS_EMERGENCY_RESET/);
});
console.log(`${passed}/10 PASS v1.23.1 pre-refactor renewal characterization`);
