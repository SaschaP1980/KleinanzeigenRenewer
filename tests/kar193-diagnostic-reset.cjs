'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Controls = require('../src/app/diagnostics-controls-controller.js');
const Router = require('../src/background/background-message-router.js');

const failure = code => Object.assign(new Error(code), { code });
const BUSY = failure('KR_UPDATE_FENCE_ATOMIC_BUSY');

function element() {
  return {
    textContent: '', disabled: false, hidden: true, style: {}, open: false,
    addEventListener() {},
    setAttribute() {}, removeAttribute() {}
  };
}
function fixture(runtimeMessage, options = {}) {
  const elements = Object.fromEntries([
    'occupancy','occupancyFill','occupancyText','occupancyRetry','occupancyStatus',
    'accordion','zipButton','resetButton','emergencyButton','status','resetBlockReason'
  ].map(key => [key, element()]));
  const events = [];
  const controller = Controls.create({
    elements, runtimeMessage, resetRetryDelayMs: 1, resetTimeoutMs: 15,
    logEvent: async (...args) => { events.push(args); },
    ...options
  });
  return { elements, events, controller };
}

test('KAR-193 reset retries only pre-admission atomic BUSY, then verifies result and refreshes real occupancy', async () => {
  let attempts = 0, actualResets = 0, occupancyReads = 0;
  const fx = fixture(async message => {
    if (message.type === 'RESET_DIAGNOSTICS') {
      attempts += 1;
      if (attempts < 3) throw BUSY;
      actualResets += 1;
      return { reset: true, diagnosticBoundaryId: 'new-session-193' };
    }
    if (message.type === 'GET_DIAGNOSTIC_OCCUPANCY') {
      occupancyReads += 1;
      return { current: 1, maximum: 2500 };
    }
    throw Error('unexpected route');
  });
  await fx.controller.resetDiagnostics();
  assert.equal(attempts, 3, 'only short-lived admission BUSY is retried');
  assert.equal(actualResets, 1, 'the reset side effect is never duplicated');
  assert.equal(occupancyReads, 1, 'the correct post-reset occupancy is fetched');
  assert.equal(fx.elements.occupancyText.textContent, '1 / 2.500 Einträge');
  assert.match(fx.elements.status.textContent, /Diagnose zurückgesetzt/);
  assert.equal(fx.elements.resetButton.disabled, false);
  assert.equal(fx.elements.zipButton.disabled, false);
  assert.equal(fx.events.filter(row => row[0] === 'USER_DIAGNOSTIC_RESET_SUCCEEDED').length, 1);
});

test('KAR-193 persistent BUSY is finite, visibly unsuccessful and preserves existing occupancy', async () => {
  let attempts = 0;
  const fx = fixture(async message => {
    assert.equal(message.type, 'RESET_DIAGNOSTICS');
    attempts += 1;
    throw BUSY;
  }, { resetRetryAttempts: 4 });
  fx.elements.occupancyText.textContent = '2.500 / 2.500 Einträge';
  await fx.controller.resetDiagnostics();
  assert.equal(attempts, 4);
  assert.equal(fx.elements.occupancyText.textContent, '2.500 / 2.500 Einträge');
  assert.match(fx.elements.status.textContent, /nicht zurückgesetzt/i);
  assert.match(fx.elements.status.textContent, /KR_UPDATE_FENCE_ATOMIC_BUSY/);
  assert.equal(fx.elements.zipButton.disabled, false);
  assert.equal(fx.events.filter(row => row[0] === 'USER_DIAGNOSTIC_RESET_FAILED').length, 1);
});

test('KAR-193 held update lease and storage/outcome uncertainties never trigger a second mutation', async () => {
  for (const code of ['KR_UPDATE_FENCE_BUSY', 'KR_UPDATE_FENCE_ATOMIC_STORAGE',
    'KR_DIAGNOSTIC_RESET_OUTCOME_UNVERIFIED']) {
    let attempts = 0;
    const fx = fixture(async message => {
      assert.equal(message.type, 'RESET_DIAGNOSTICS');
      attempts += 1;
      throw failure(code);
    });
    await fx.controller.resetDiagnostics();
    assert.equal(attempts, 1, code);
    assert.match(fx.elements.status.textContent, /nicht zurückgesetzt|nicht bestätigt|unbestätigt/i, code);
    assert.equal(fx.events.filter(row => row[0] === 'USER_DIAGNOSTIC_RESET_SUCCEEDED').length, 0);
  }
});

test('KAR-193 a response without an authenticated reset boundary is never reported as success', async () => {
  const fx = fixture(async msg => {
    assert.equal(msg.type, 'RESET_DIAGNOSTICS');
    return { reset: true };
  });
  await fx.controller.resetDiagnostics();
  assert.doesNotMatch(fx.elements.status.textContent, /^Diagnose zurückgesetzt/);
  assert.equal(fx.events.filter(row => row[0] === 'USER_DIAGNOSTIC_RESET_SUCCEEDED').length, 0);
});

test('KAR-193 a hung reset request times out without repeating an uncertain side effect', { timeout: 500 }, async () => {
  let attempts = 0;
  const fx = fixture(() => { attempts += 1; return new Promise(() => {}); });
  await Promise.race([
    fx.controller.resetDiagnostics(),
    new Promise((_, reject) => setTimeout(() => reject(Error('reset action hung')), 150))
  ]);
  assert.equal(attempts, 1);
  assert.equal(fx.elements.zipButton.disabled, false);
  assert.match(fx.elements.status.textContent, /nicht bestätigt|unbestätigt|Zeitüberschreitung/i);
});

test('KAR-193 P8 finalization BUSY after handler started is never mislabelled as safe-to-retry', async () => {
  let dispatched = 0, admitted = 0, safetyChecks = 0;
  const router = Router.create({
    MessageContractRegistry: { route: () => ({ action: 'accept' }), errorFor: () => Error('contract') },
    assertPlatformAccessAllowedForRequest: async () => { safetyChecks += 1; },
    handlers: { RESET_DIAGNOSTICS: async () => { dispatched += 1; return { reset: true, diagnosticBoundaryId: 'test' }; } },
    withWorkflowAdmission: async (type, admittedHandler) => {
      assert.equal(type, 'RESET_DIAGNOSTICS');
      admitted += 1;
      await admittedHandler(Object.freeze({ operationType: type, token: 'private-receipt' }));
      throw BUSY; // P8 finish acknowledgement missing AFTER the reset ran.
    }
  });
  await assert.rejects(
    router.dispatch({ type: 'RESET_DIAGNOSTICS' }, {}),
    /KR_DIAGNOSTIC_RESET_OUTCOME_UNVERIFIED/
  );
  assert.equal(dispatched, 1);
  assert.equal(admitted, 1);
  assert.equal(safetyChecks, 1);
});
