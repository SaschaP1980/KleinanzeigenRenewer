// KAR-199: real Phase-4 service contract, synthetic no-account tab responses only.
// RED on v1.25.5: MY_ADS_STATUS can stay pending forever after a successful content handshake.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Remote = require('../src/background/services/remote-delete-replacement-service.js');

function fixture(statusPlan, deletePlan = 'resolve') {
  const sent = [];
  const diagnostics = [];
  const closed = [];
  let begins = 0;
  const status = {isMyAdsPage: true, isProjectsTab: true, profileName: 'fixture-account'};
  const instance = Remote.create({
    createManagedWorkerTab: async () => ({id: 73}),
    waitForTabComplete: async () => ({status: 'complete'}),
    ensureContentConnection: async () => ({ready: true}),
    phase4StatusRequestTimeoutMs: 35,
    phase4DeleteRequestTimeoutMs: 35,
    phase4ReadOnlyRequestTimeoutMs: 35,
    sendTabRequestWithBootstrap: async (tabId, message) => {
      assert.equal(tabId, 73);
      sent.push(message.type);
      if (message.type === 'MY_ADS_STATUS') {
        const next = statusPlan.shift();
        if (next === 'never') return new Promise(() => {});
        return next === 'wrong-account' ? {...status, profileName:'wrong'} : status;
      }
      if (message.type === 'DELETE_OWN_AD_BY_ID') {
        if (deletePlan === 'never') return new Promise(() => {});
        return {actionTriggered: true};
      }
      throw Error('unexpected message type: ' + message.type);
    },
    normalizeProfileName: value => String(value || '').trim(),
    closeManagedWorkerTab: async id => { closed.push(id); },
    beginPhase4Attempt: async () => { begins++; return {attemptId:'intent-1'}; },
    logDiagnostic: async (severity, event, details) => { diagnostics.push({severity,event,details}); },
    renewalMaxPhaseAttempts: () => 3,
    sessionCorrelationContext: () => ({}),
    correlationContext: () => ({}),
    assertEmergencyResetGeneration: () => true
  });
  const session = {renewalId:'fixture-renewal',profileId:'fixture-account',sourceAdId:'100',newAdId:'200'};
  const call = () => instance.preverifyAndTriggerRenewalSourceDeleteAttempt(session, 'fixture-account', null, {attempt:1,attemptId:'a1'}, 0, {token:'fixture'});
  return {call, sent, closed, diagnostics, get begins(){return begins;}};
}

// Guard the test itself so the known v1.25.5 deadlock becomes a deterministic RED.
function boundedTest(promise) {
  return Promise.race([promise, new Promise((_, reject) =>
    setTimeout(() => reject(Object.assign(new Error('TEST_UNBOUNDED_AWAIT'), {code:'TEST_UNBOUNDED_AWAIT'})), 600)
  )]);
}

test('KAR-199 first MY_ADS_STATUS never answers: bounded recovery, no phase-4 intent or DELETE', {timeout: 3000}, async () => {
  const f = fixture(['never']);
  await assert.rejects(boundedTest(f.call()), error => error?.code === 'KR_PHASE4_STATUS_TIMEOUT');
  assert.equal(f.begins, 0, 'status did not authorize durable delete intent');
  assert.deepEqual(f.sent, ['MY_ADS_STATUS']);
  assert.deepEqual(f.closed, [73], 'worker is closed on no-response');
  assert.equal(f.diagnostics.some(x => x.event === 'RENEWAL_PHASE4_STATUS_TIMEOUT'), true);
});

test('KAR-199 after durable intent, second status timeout never dispatches DELETE', {timeout: 3000}, async () => {
  const f = fixture(['ready','never']);
  await assert.rejects(boundedTest(f.call()), error =>
    error?.code === 'KR_PHASE4_JOURNAL_ACCOUNT_UNVERIFIED');
  assert.equal(f.begins, 1, 'exactly one durable intent');
  assert.deepEqual(f.sent, ['MY_ADS_STATUS', 'MY_ADS_STATUS']);
  assert.deepEqual(f.closed, [73]);
});

test('KAR-199 after DELETE dispatch, missing response is transport uncertainty, not another click', {timeout: 3000}, async () => {
  const f = fixture(['ready','ready'], 'never');
  const result = await boundedTest(f.call());
  assert.equal(result.transportInterrupted, true);
  assert.equal(result.attemptReceipt.attemptId, 'intent-1');
  assert.equal(f.begins, 1);
  assert.equal(f.sent.filter(x => x === 'DELETE_OWN_AD_BY_ID').length, 1);
  assert.deepEqual(f.closed, [73]);
});
