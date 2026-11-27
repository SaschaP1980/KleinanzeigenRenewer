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

