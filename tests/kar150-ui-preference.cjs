'use strict';
const assert = require('node:assert/strict');
const Ui = require('../src/app/mass-renewal-ui-controller.js');

function element() {
  const listeners = new Map();
  const classes = new Set();
  return {
    open: false, checked: false, disabled: false, textContent: '', dataset: {},
    classList: {
      toggle(name, active) { if (active) classes.add(name); else classes.delete(name); },
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); }
    },
    addEventListener(name, listener) { listeners.set(name, listener); },
    async emit(name) {
      const fn = listeners.get(name);
      assert.ok(fn, 'missing listener for ' + name);
      return fn({ target: this, preventDefault() {}, key: '', dataTransfer: { getData() { return ''; } } });
    },
    append() {}, replaceChildren() {}, querySelectorAll() { return []; }, querySelector() { return null; },
    setAttribute() {}, showModal() { this.open = true; }, close() { this.open = false; }
  };
}
const document = { createElement: () => element(), createTextNode: text => ({ textContent: text }) };
const settingKey = 'massRenewalStopOnErrorPreferenceV1';

function storage(initial, { failRead = false, failWrite = false } = {}) {
  const data = new Map();
  if (initial !== undefined) data.set(settingKey, initial);
  return {
    data,
    async get(key) {
      if (failRead) throw Error('simulated read failure');
      return { [key]: data.get(key) };
    },
    async set(value) {
      if (failWrite) throw Error('simulated write failure');
      for (const [key, entry] of Object.entries(value)) data.set(key, entry);
    }
  };
}
function makeUi(store) {
  const events = [];
  const controls = {
    massRenewalButton: element(), massRenewalDialog: element(), massRenewalClose: element(),
    massRenewalCancel: element(), massRenewalNext: element(), massRenewalBack: element(),
    massRenewalStart: element(), massRenewalOrderList: element(), massRenewalStopOnError: element(),
    massRenewalStopOnErrorStatus: element(), massRenewalSelectionBody: element()
  };
  const controller = Ui.create({
    document, storageLocal: store, elements: controls,
    runtimeMessage: async msg => {
      if (msg.type === 'GET_MASS_RENEWAL_BATCH_STATUS') return null;
      throw Error('unexpected message: ' + msg.type);
    },
    accountGateModel: () => ({ allowed: true, tooltip: '' }),
    requireAccountBoundAction: () => true,
    setStatus: (...args) => events.push(args),
    logAppEvent: async () => {},
    templateReady: () => true,
    insertionLockActive: () => false,
    normalizeRenewalMode: value => String(value || 'safe')
  });
  controller.install();
  return { controls, controller, events };
}
async function settleSwitch(control) {
  // Event handler intentionally fire-and-forgets the durable write. Await its
  // storage round trip and UI re-enable without using wall-clock sleeps.
  for (let i = 0; i < 30 && control.disabled; i += 1) await Promise.resolve();
}

async function main() {
  let checks = 0;
  const pass = value => { checks += 1; console.log('PASS ' + value); };
  const saved = storage();
  let ui = makeUi(saved);
  await ui.controls.massRenewalButton.emit('click');
  assert.equal(ui.controls.massRenewalStopOnError.checked, true);
  assert.equal(ui.controls.massRenewalStopOnError.disabled, false);
  assert.equal(saved.data.has(settingKey), false);
  pass('first wizard opens with ON only when no durable preference exists');

  ui.controls.massRenewalStopOnError.checked = false;
  await ui.controls.massRenewalStopOnError.emit('change');
  await settleSwitch(ui.controls.massRenewalStopOnError);
  assert.equal(saved.data.get(settingKey), false);
  assert.equal(ui.controls.massRenewalStopOnError.disabled, false);
  pass('switching OFF persists immediately without pressing Start');

  await ui.controls.massRenewalClose.emit('click');
  await ui.controls.massRenewalButton.emit('click');
  assert.equal(ui.controls.massRenewalStopOnError.checked, false);
  pass('cancel/close and reopen restore OFF');

  // A newly created UI instance models app reload / browser restart.
  ui = makeUi(saved);
  await ui.controls.massRenewalButton.emit('click');
  assert.equal(ui.controls.massRenewalStopOnError.checked, false);
  pass('new UI/controller instance rehydrates durable OFF');

  ui.controls.massRenewalStopOnError.checked = true;
  await ui.controls.massRenewalStopOnError.emit('change');
  await settleSwitch(ui.controls.massRenewalStopOnError);
  assert.equal(saved.data.get(settingKey), true);
  pass('switching back ON persists the new durable preference');

  const readFailure = makeUi(storage(false, { failRead: true }));
  await readFailure.controls.massRenewalButton.emit('click');
  assert.equal(readFailure.controls.massRenewalStopOnError.disabled, true);
  assert.equal(readFailure.controls.massRenewalStart.disabled, true);
  assert.match(readFailure.controls.massRenewalStopOnErrorStatus.textContent, /nicht verfügbar/);
  pass('failed storage read prevents an unsafe start');

  const writeFailure = makeUi(storage(true, { failWrite: true }));
  await writeFailure.controls.massRenewalButton.emit('click');
  writeFailure.controls.massRenewalStopOnError.checked = false;
  await writeFailure.controls.massRenewalStopOnError.emit('change');
  await settleSwitch(writeFailure.controls.massRenewalStopOnError);
  assert.equal(writeFailure.controls.massRenewalStart.disabled, true);
  assert.equal(writeFailure.controls.massRenewalStopOnError.checked, true);
  assert.match(writeFailure.controls.massRenewalStopOnErrorStatus.textContent, /fehlgeschlagen/);
  pass('failed storage write keeps Start locked and restores last confirmed value');

  console.log(checks + ' KAR-150 UI persistence assertions PASS');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
