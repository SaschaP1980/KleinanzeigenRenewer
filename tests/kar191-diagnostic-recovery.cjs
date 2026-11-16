'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Router = require('../src/background/background-message-router.js');
const Controls = require('../src/app/diagnostics-controls-controller.js');

const BUSY = Object.assign(new Error('KR_UPDATE_FENCE_ATOMIC_BUSY'), { code: 'KR_UPDATE_FENCE_ATOMIC_BUSY' });

function dispatchFixture() {
  const seen = [], handled = [], safety = [];
  const handlers = {};
  for (const type of ['GET_DIAGNOSTIC_OCCUPANCY', 'GET_DIAGNOSTIC_EXPORT',
    'GET_DIAGNOSTICS', 'RESET_DIAGNOSTICS', 'LOG_DIAGNOSTIC_EVENT', 'DELETE_INVENTORY'])
    handlers[type] = async () => { handled.push(type); return { type }; };
  const router = Router.create({
    MessageContractRegistry: {
      route: () => ({ action: 'accept' }),
      errorFor: () => Error('contract rejected')
    },
    assertPlatformAccessAllowedForRequest: async message => { safety.push(message.type); },
    handlers,
    withWorkflowAdmission: async type => { seen.push(type); throw BUSY; }
  });
  return { router, seen, handled, safety };
}

test('KAR-191 safe occupancy read is available during workflow mutation admission contention', async () => {
  const fx = dispatchFixture();
  const result = await fx.router.dispatch({ type: 'GET_DIAGNOSTIC_OCCUPANCY' }, {});
  assert.equal(result.type, 'GET_DIAGNOSTIC_OCCUPANCY');
  assert.deepEqual(fx.seen, [], 'read-only occupancy must not request durable mutation admission');
  assert.deepEqual(fx.handled, ['GET_DIAGNOSTIC_OCCUPANCY']);
  assert.deepEqual(fx.safety, fx.handled, 'platform access safety still applies');
});

test('KAR-191 ZIP export retains durable P8 admission and owner tracking when its gate is busy', async () => {
  const fx = dispatchFixture();
  await assert.rejects(fx.router.dispatch({ type: 'GET_DIAGNOSTIC_EXPORT' }, {}),
    /KR_UPDATE_FENCE_ATOMIC_BUSY/);
  assert.deepEqual(fx.seen, ['GET_DIAGNOSTIC_EXPORT'],
    'export must not bypass its existing durable diagnosticExport owner receipt');
  assert.equal(fx.handled.length, 0, 'blocked export does not run without admission');
});

test('KAR-191 mutation admission remains fail-closed for reset, logging and remote operations', async () => {
  const fx = dispatchFixture();
  for (const type of ['RESET_DIAGNOSTICS', 'LOG_DIAGNOSTIC_EVENT', 'DELETE_INVENTORY'])
    await assert.rejects(fx.router.dispatch({ type }, {}), /KR_UPDATE_FENCE_ATOMIC_BUSY/);
  assert.equal(fx.handled.length, 0, 'denied mutations never execute');
  assert.deepEqual(fx.seen, ['RESET_DIAGNOSTICS', 'LOG_DIAGNOSTIC_EVENT', 'DELETE_INVENTORY']);
  assert.deepEqual(fx.safety, fx.seen);
});

function element() {
  const listeners = {};
  const attrs = {};
  return {
    textContent: '', style: {}, hidden: true, disabled: false, open: false,
    addEventListener: (name, callback) => { listeners[name] = callback; },
    fire: name => listeners[name]?.(),
    setAttribute: (name, value) => { attrs[name] = value; },
    removeAttribute: name => { delete attrs[name]; },
    getAttribute: name => attrs[name]
  };
}

test('KAR-191 unavailable occupancy is explicitly retryable; successful empty buffer is 0/2500', async () => {
  const ui = Object.fromEntries(['occupancy', 'occupancyFill', 'occupancyText', 'occupancyRetry', 'occupancyStatus',
    'accordion', 'zipButton', 'resetButton', 'emergencyButton', 'status'].map(name => [name, element()]));
  let response = BUSY;
  const controller = Controls.create({
    elements: ui,
    runtimeMessage: async request => {
      if (request.type !== 'GET_DIAGNOSTIC_OCCUPANCY') throw Error('unexpected request');
      if (response instanceof Error) throw response;
      return response;
    }
  });
  await controller.refreshOccupancy();
  assert.equal(ui.occupancyText.textContent, '— / — Einträge', 'not a fabricated empty buffer');
  assert.equal(ui.occupancyRetry.hidden, false, 'the failed read exposes a retry');
  assert.match(ui.occupancyStatus.textContent, /vorübergehend|nicht verfügbar|fehlgeschlagen/i);
  response = { current: 0, maximum: 2500 };
  await controller.refreshOccupancy();
  assert.equal(ui.occupancyText.textContent, '0 / 2.500 Einträge');
  assert.equal(ui.occupancyRetry.hidden, true);
  assert.equal(ui.occupancyStatus.textContent, '');
});

test('KAR-191 denied ZIP export reports useful persistent status and re-enables download', async () => {
  const ui = Object.fromEntries(['occupancy', 'occupancyFill', 'occupancyText', 'accordion',
    'zipButton', 'resetButton', 'emergencyButton', 'status'].map(name => [name, element()]));
  Controls.create({
    elements: ui,
    runtimeMessage: async request => {
      if (request.type === 'GET_DIAGNOSTIC_EXPORT') throw BUSY;
      return { current: 0, maximum: 2500 };
    }
  });
  ui.zipButton.fire('click');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ui.zipButton.disabled, false);
  assert.match(ui.status.textContent, /KR_UPDATE_FENCE_ATOMIC_BUSY|vorübergehend blockiert/i,
    'a denied download is visibly diagnosable even if the diagnostic system cannot log');
});
