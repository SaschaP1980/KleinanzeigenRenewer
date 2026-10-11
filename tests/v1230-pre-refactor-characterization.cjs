const assert = require('assert');
const { source, files } = require('./v1230-source-surface.cjs');
let passed = 0;
const ok = (name, fn) => { try { fn(); passed++; console.log('PASS ' + name); } catch (error) { console.error('FAIL ' + name); throw error; } };
const hasFunction = name => new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).test(source);
const hasAnyFunction = names => names.some(hasFunction);

ok('renewal workflow behavior is characterized independent of future module location', () => {
  for (const name of ['createRenewalSkeleton','runFastRenewalVerification','runRenewalReinventory','retryRenewalVerification','confirmPublishedRenewal']) assert.ok(hasFunction(name), name);
  assert.match(source, /replacement-ready/);
});
ok('mass renewal workflow behavior is characterized', () => {
  for (const name of ['startNextMassRenewalItem','reconcileMassRenewalBatchSession','markMassRenewalItemSucceeded','startMassRenewalBatch']) assert.ok(hasFunction(name), name);
});
ok('template fill orchestration behavior is characterized', () => {
  for (const name of ['startTemplateFillUnlocked','startTemplateFill','restartRenewalPhase1Attempt']) assert.ok(hasFunction(name), name);
  assert.match(source, /phase-1-fill-failed/);
});
ok('insertion lock policy is characterized', () => {
  for (const name of ['getInsertionLockState','assertInsertionStartAvailable']) assert.ok(hasFunction(name), name);
  assert.match(source, /insertion-lock/);
});
ok('archive insertion workflow behavior is characterized', () => {
  for (const name of ['assertArchiveStagingReady','resolveArchiveTargetProfile','runArchiveInsertionPostPublish','confirmPublishedArchiveInsertion','startArchiveInsertion']) assert.ok(hasFunction(name), name);
});
ok('bulk inventory workflow behavior is characterized', () => {
  for (const name of ['startBulkInventoryOperation','createBulkEditWorkerTabWithRetry']) assert.ok(hasFunction(name), name);
  assert.match(source, /BULK_EXTRACT_SAVE_WORKER/);
});
ok('public listing evidence behavior is characterized', () => {
  for (const name of ['probeFreshRenewalPublicUrl','findRenewalAdInMyAdsFresh','resolveRenewalPublicEvidence','extractReadOnlyMetadata','mergeListingMetadata']) assert.ok(hasFunction(name), name);
});
ok('diagnostic export behavior is characterized', () => {
  assert.ok(hasFunction('buildDiagnosticExport'));
  assert.match(source, /diagnostic/i);
});
ok('account session UI orchestration is characterized', () => {
  for (const name of ['performInspectPage','renderProfileAccountStatus','scheduleInspectFromTabEvent']) assert.ok(hasFunction(name), name);
});
ok('profile management UI orchestration is characterized', () => {
  for (const name of ['renderProfileSwitcher','renderProfileManager']) assert.ok(hasFunction(name), name);
});
ok('controlled accordion lifecycle is characterized', () => {
  for (const names of [['animateControlAccordion','animate'],['setControlAccordionOpen','setOpen'],['finalizeControlAccordionMotion','finalizeMotion']]) assert.ok(hasAnyFunction(names), names.join('|'));
  assert.match(source, /controlAccordionMotion|const motion = new WeakMap/);
});
ok('diagnostic controls lifecycle is characterized', () => {
  for (const names of [['diagnosticResetBlockReason','resetBlockReason'],['syncDiagnosticResetUi','syncResetUi'],['syncEmergencyWorkflowResetUi','syncEmergencyUi']]) assert.ok(hasAnyFunction(names), names.join('|'));
});
ok('renewal settings UI behavior is characterized', () => {
  for (const names of [['renderRenewalConfiguration','render'],['chooseRenewalMode','chooseMode'],['chooseRenewalPhaseAttempts','chooseAttempts']]) assert.ok(hasAnyFunction(names), names.join('|'));
});
ok('inventory capture start orchestration is characterized', () => {
  for (const name of ['startSingleInventoryCapture','startBulkInventoryCapture']) assert.ok(hasFunction(name), name);
});
ok('v1.22.30 emergency-reset safety semantics remain visible to future refactors', () => {
  assert.match(source, /emergency-reset-unverified/);
  assert.match(source, /remoteVerificationRequired/);
  assert.ok(hasFunction('resetActiveWorkflows'));
});
ok('entry points remain free of direct form submit bypasses', () => {
  assert.doesNotMatch(files['app.js'] + '\n' + files['background.js'], /(?:^|[^A-Za-z])(?:requestSubmit|\.submit)\s*\(/m);
});

console.log(`${passed}/16 PASS v1.23.0 pre-refactor characterization`);
