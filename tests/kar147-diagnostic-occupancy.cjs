const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function load(path, exportName) {
  const context = { console, Date, Promise, Object, Array, String, Number, Math, URL, setTimeout, clearTimeout, module: { exports: {} } };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path, 'utf8'), context, { filename: path });
  return context.module.exports;
}
function element() {
  const listeners = {};
  const attrs = {};
  return { textContent: '', style: {}, disabled: false, open: false,
    addEventListener(name, cb) { listeners[name] = cb; },
    fire(name) { listeners[name]?.(); },
    setAttribute(k, v) { attrs[k] = v; },
    getAttribute(k) { return attrs[k]; },
    removeAttribute(k) { delete attrs[k]; } };
}
async function main() {
  const serviceApi = load('src/background/services/diagnostics-service.js');
  const state = {};
  const service = serviceApi.create({
    storageLocal: {
      async get(k) { return { [k]: state[k] }; },
      async set(p) { Object.assign(state, p); }
    },
    maxDiagnostics: 3, batchFlushMs: 100000, randomUUID: () => 'test-session'
  });
  assert.equal((await service.occupancy()).current, 0);
  assert.equal((await service.occupancy()).maximum, 3);
  await service.log('info', 'FIRST');
  assert.equal((await service.occupancy()).current, 1, 'pending entries are committed before count');
  await service.log('info', 'SECOND');
  await service.log('info', 'THIRD');
  await service.log('info', 'FOURTH');
  assert.equal((await service.occupancy()).current, 3, 'retention rollover stays bounded');
  assert.equal(state.diagnosticsV2.length, 3);
  await service.reset();
  assert.equal((await service.occupancy()).current, 1, 'reset marker itself is a retained event');

  const ctrlApi = load('src/app/diagnostics-controls-controller.js');
  const occupancy = element(), fill = element(), text = element(), accordion = element();
  const reset = element(), zip = element(), emergency = element();
  let response = { current: 0, maximum: 2500 }, requests = 0, logs = 0;
  const controller = ctrlApi.create({
    elements: { occupancy, occupancyFill: fill, occupancyText: text, accordion,
      resetButton: reset, zipButton: zip, emergencyButton: emergency },
    runtimeMessage: async ({ type }) => {
      if (type === 'GET_DIAGNOSTIC_OCCUPANCY') { requests++; if (response instanceof Error) throw response; return response; }
      if (type === 'RESET_DIAGNOSTICS') { response = { current: 1, maximum: 2500 }; return { reset: true }; }
      return {};
    },
    logEvent: () => { logs++; }
  });
  accordion.open = true;
  accordion.fire('toggle');
  await controller.refreshOccupancy();
  assert.equal(text.textContent, '0 / 2.500 Einträge');
  assert.equal(fill.style.width, '0%');
  assert.equal(occupancy.getAttribute('aria-valuenow'), '0');
  response = { current: 10, maximum: 2500 };
  await controller.refreshOccupancy();
  assert.equal(text.textContent, '10 / 2.500 Einträge');
  assert.equal(fill.style.width, '0.4%');
  response = { current: 2500, maximum: 2500 };
  await controller.refreshOccupancy();
  assert.equal(fill.style.width, '100%');
  controller.onDiagnosticStorageChanged({ diagnosticsV2: { newValue: Array.from({ length: 4 }) } });
  assert.equal(text.textContent, '4 / 2.500 Einträge');
  await controller.resetDiagnostics();
  await controller.refreshOccupancy();
  assert.equal(text.textContent, '1 / 2.500 Einträge');
  response = { current: 9, maximum: 12 };
  await controller.refreshOccupancy();
  assert.equal(text.textContent, '9 / 12 Einträge', 'configured non-default cap');
  response = new Error('unavailable');
  await controller.refreshOccupancy();
  assert.equal(text.textContent, '— / — Einträge');
  assert.equal(occupancy.getAttribute('aria-valuenow'), undefined);
  assert.equal(occupancy.getAttribute('aria-valuetext'), 'Diagnosespeicher nicht verfügbar');
  assert.equal(logs, 1, 'display refresh must not log diagnostic events');
  assert.ok(requests > 0);

  const html = fs.readFileSync('app.html', 'utf8');
  const section = html.match(/id="diagnosticOccupancy"[\s\S]*?id="diagnosticZipButton"/)?.[0] || '';
  assert.match(section, /role="progressbar"/);
  assert.match(section, /diagnosticOccupancyText/);
  assert.doesNotMatch(section, /frei|free|Prozent|%|Diagnosespeicher<\//i);
  console.log('KAR-147 occupancy service, controller, lifecycle, accessibility and markup PASS');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
