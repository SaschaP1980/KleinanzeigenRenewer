const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const Policy = require('../src/shared/renewal-policy.js');

const source = fs.readFileSync('background.js', 'utf8');
const mutStart = source.indexOf('function beginRenewalPhaseAttempt');
const mutEnd = source.indexOf('async function logRenewalPhaseAttemptStarted', mutStart);
const phase1Start = source.indexOf('function phase1PublishBoundaryReached');
const phase1End = source.indexOf('async function restartRenewalPhase1Attempt', phase1Start);
assert.ok(mutStart >= 0 && mutEnd > mutStart && phase1Start >= 0 && phase1End > phase1Start);

let uuid = 0;
const context = {
  RenewalPolicy: Policy,
  normalizeRenewalPhaseAttempts: Policy.normalizeRenewalPhaseAttempts,
  renewalMaxPhaseAttempts: Policy.renewalMaxPhaseAttempts,
  renewalAttemptState: Policy.renewalAttemptState,
  renewalPhaseAttemptAvailable: Policy.renewalPhaseAttemptAvailable,
  renewalAttemptDetails: Policy.renewalAttemptDetails,
  crypto: { randomUUID: () => `attempt-${++uuid}` },
  Date,
  console
};
vm.createContext(context);
vm.runInContext(source.slice(mutStart, mutEnd), context);
vm.runInContext(source.slice(phase1Start, phase1End), context);

let n = 0;
const pass = label => { n += 1; console.log(`PASS ${label}`); };

assert.equal(Policy.normalizeRenewalPhaseAttempts(undefined), 3);
assert.equal(Policy.normalizeRenewalPhaseAttempts(0), 1);
assert.equal(Policy.normalizeRenewalPhaseAttempts(6), 5);
assert.equal(Policy.normalizeRenewalPhaseAttempts(4.6), 5);
pass('retry configuration clamps to 1..5 with default 3');

const session = { maxPhaseAttempts: 3, phaseAttempts: {} };
assert.equal(Policy.renewalPhaseAttemptAvailable(session, 3), true);
const a1 = context.beginRenewalPhaseAttempt(session, 3);
const a2 = context.beginRenewalPhaseAttempt(session, 3);
const a3 = context.beginRenewalPhaseAttempt(session, 3);
assert.deepEqual([a1.attempt, a2.attempt, a3.attempt], [1, 2, 3]);
assert.notEqual(a1.attemptId, a2.attemptId);
assert.equal(Policy.renewalPhaseAttemptAvailable(session, 3), false);
assert.equal(Policy.renewalAttemptDetails(session, 3).maxAttempts, 3);
pass('configured count means total attempts, not retries plus initial attempt');

context.recordRenewalPhaseAttemptError(session, 3, new Error('temporary'));
assert.equal(Policy.renewalAttemptState(session, 3).lastError, 'temporary');
context.resetRenewalPhaseAttempts(session, [3]);
assert.equal(Policy.renewalAttemptState(session, 3).attempt, 0);
assert.equal(Policy.renewalPhaseAttemptAvailable(session, 3), true);
pass('explicit retry reset opens a fresh bounded cycle');

const phase1 = { renewalId: 'r1', maxPhaseAttempts: 3, phaseAttempts: { '1': { attempt: 1, attemptId: 'a1' } }, status: 'draft', stage: 'failed', newAdId: null };
assert.equal(context.canRetryRenewalPhase1(phase1, { stage: 'failed' }), true);
phase1.newAdId = '3514872335';
assert.equal(context.canRetryRenewalPhase1(phase1, { stage: 'failed' }), false);
phase1.newAdId = null;
assert.equal(context.canRetryRenewalPhase1(phase1, { stage: 'publish-submitted' }), false);
phase1.stage = 'failed';
phase1.publishClickedAt = '2026-09-17T00:00:00.000Z';
assert.equal(context.canRetryRenewalPhase1(phase1, { stage: 'failed' }), false);
delete phase1.publishClickedAt;
phase1.status = 'submitted';
assert.equal(context.canRetryRenewalPhase1(phase1, { stage: 'failed' }), false);
pass('phase 1 retries stop permanently at any persisted publish/new-id boundary');

console.log(`${n} v1.17.1 retry-policy runtime groups passed`);
