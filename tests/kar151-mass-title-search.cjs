'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const InventoryView = require('../src/app/inventory-view.js');
const Ui = require('../src/app/mass-renewal-ui-controller.js');

function element(tag = 'div') {
  const handlers = new Map();
  const classes = new Set();
  const node = {
    tagName: tag.toUpperCase(), children: [], parentElement: null,
    className: '', dataset: {}, attributes: {}, value: '', title: '',
    type: '', hidden: false, disabled: false, checked: false,
    textContent: '', open: false, focused: false,
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      toggle(name, enabled) {
        if (enabled) classes.add(name); else classes.delete(name);
        return Boolean(enabled);
      },
      contains(name) { return classes.has(name); }
    },
    append(...children) {
      for (const child of children) {
        this.children.push(child);
        if (child && typeof child === 'object') child.parentElement = this;
      }
    },
    replaceChildren(...children) { this.children = []; this.append(...children); },
    addEventListener(type, callback) { handlers.set(type, callback); },
    emit(type, overrides = {}) {
      assert.ok(handlers.has(type), 'missing event handler ' + type);
      return handlers.get(type)({
        target: this, preventDefault() {}, key: '',
        dataTransfer: { getData: () => '', setData() {} },
        ...overrides
      });
    },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    closest(selector) {
      let current = this;
      while (current) {
        if (selector === 'tr' && current.tagName === 'TR') return current;
        if (selector === 'input' && current.tagName === 'INPUT') return current;
        current = current.parentElement;
      }
      return null;
    },
    querySelectorAll(selector) {
      const found = [];
      function scan(parent) {
        for (const child of parent.children || []) {
          if (selector === 'input[type="checkbox"]' && child.tagName === 'INPUT' && child.type === 'checkbox') found.push(child);
          if (selector === 'tr[data-mass-inventory-id]' && child.tagName === 'TR' && child.dataset.massInventoryId) found.push(child);
          if (selector === '.mass-renewal-order-row' && child.className === 'mass-renewal-order-row') found.push(child);
          scan(child);
        }
      }
      scan(this);
      return found;
    },
    querySelector() { return null; },
    focus() { this.focused = true; },
    showModal() { this.open = true; },
    close() { this.open = false; },
    getBoundingClientRect() { return { top: 0, height: 62 }; }
  };
  return node;
}
const document = {
  createElement: tag => element(tag),
  createTextNode: value => ({ textContent: value })
};
function record(id, title, end, ready = true) {
  return {
    inventoryId: id, adId: 'ad-' + id, title, templateReady: ready,
    listingMeta: { endDateIso: end }, images: [],
    price: { displayed: '10 €' }
  };
}
function ui(records, { allowed = true } = {}) {
  const calls = [];
  const keys = [
    'massRenewalButton', 'massRenewalDialog', 'massRenewalClose',
    'massRenewalCancel', 'massRenewalBack', 'massRenewalNext',
    'massRenewalStart', 'massRenewalStopOnError', 'massRenewalSearchInput',
    'massRenewalSearchClear', 'massRenewalSelectionPanel', 'massRenewalOrderPanel',
    'massRenewalSelectionBody', 'massRenewalOrderList', 'massRenewalSelectionCount'
  ];
  const controls = Object.fromEntries(keys.map(name => [name, element()]));
  const controller = Ui.create({
    document, elements: controls, inventoryView: InventoryView,
    storageLocal: { async get() { return {}; }, async set() {} },
    runtimeMessage: async message => {
      if (message.type === 'GET_MASS_RENEWAL_BATCH_STATUS') return null;
      if (message.type === 'START_MASS_RENEWAL_BATCH') {
        calls.push(message);
        return { batchId: 'fixture-batch', status: 'running', renewalMode: 'safe', items: [] };
      }
      throw new Error('Unexpected remote call ' + message.type);
    },
    accountGateModel: () => ({ allowed, tooltip: '' }),
    requireAccountBoundAction: () => allowed,
    templateReady: entry => entry.templateReady === true,
    insertionLockActive: () => false,
    logAppEvent: async () => {},
    setStatus: () => {},
    normalizeRenewalMode: mode => mode || 'safe',
    displayPrice: entry => entry.price?.displayed || '',
    endDateWithRelativeLabel: entry => entry.listingMeta?.endDateIso || ''
  });
  controller.updateContext({
    records, trashRecords: [], renewalConfiguration: { renewalMode: 'safe' },
    insertionLock: { locked: false }
  });
  controller.install();
  return { controls, controller, calls };
}
function rows(controls) {
  return controls.massRenewalSelectionBody.querySelectorAll('tr[data-mass-inventory-id]');
}
function ids(controls) { return rows(controls).map(row => row.dataset.massInventoryId); }
function checkbox(row) { return row.querySelectorAll('input[type="checkbox"]')[0]; }
async function filter(controls, value) {
  controls.massRenewalSearchInput.value = value;
  await controls.massRenewalSearchInput.emit('input');
}
async function select(controls, id) {
  const row = rows(controls).find(row => row.dataset.massInventoryId === id);
  assert.ok(row, 'expected visible row: ' + id);
  const check = checkbox(row);
  check.checked = !check.checked;
  await check.emit('change');
}
async function run() {
  let checks = 0;
  const pass = description => { checks++; console.log('PASS ' + description); };
  const records = [
    record('later', 'Blaue Schuhe', '2027-02-03'),
    record('early', 'Grüne Jacke', '2027-01-01'),
    record('middle', 'Schöne Schuhe', '2027-01-10'),
    record('accent', 'Mädchen Bläue Tasche', '2027-01-19'),
    record('no-template', 'Blaue Jacke ohne Vorlage', '2027-01-02', false)
  ];
  const h = ui(records);
  const c = h.controls;
  await c.massRenewalButton.emit('click');
  assert.deepEqual(ids(c), ['early', 'middle', 'accent', 'later']);
  assert.equal(c.massRenewalSearchClear.hidden, true);
  pass('only eligible rows appear and their initial expiry ordering is stable');

  await filter(c, '   SCHUHE   SCHONE   ');
  assert.deepEqual(ids(c), ['middle']);
  await filter(c, 'schone schuhe');
  assert.deepEqual(ids(c), ['middle']);
  await filter(c, '  BLÄUE  MÄDCHEN ');
  assert.deepEqual(ids(c), ['accent']);
  await filter(c, 'mäd TAS');
  assert.deepEqual(ids(c), ['accent']);
  pass('NFKD, case, whitespace, multi-term order and partial-word title matching reuse inventory semantics');

  await filter(c, 'not-present');
  assert.deepEqual(ids(c), []);
  assert.equal(c.massRenewalSelectionBody.children[0].children[0].textContent, 'Keine Anzeigen mit diesem Titel gefunden.');
  assert.equal(c.massRenewalSearchClear.hidden, false);
  await c.massRenewalSearchClear.emit('click');
  assert.deepEqual(ids(c), ['early', 'middle', 'accent', 'later']);
  assert.equal(c.massRenewalSearchInput.value, '');
  assert.equal(c.massRenewalSearchInput.focused, true);
  pass('no-hit state, accessible clearing and restored default ordering');

  await filter(c, 'jacke');
  await select(c, 'early');
  await filter(c, 'schone');
  await select(c, 'middle');
  await filter(c, 'xyz');
  assert.equal(c.massRenewalSelectionCount.textContent, '2 von 10 ausgewählt');
  assert.equal(c.massRenewalNext.disabled, false);
  await filter(c, '');
  assert.equal(checkbox(rows(c).find(row => row.dataset.massInventoryId === 'early')).checked, true);
  assert.equal(checkbox(rows(c).find(row => row.dataset.massInventoryId === 'middle')).checked, true);
  const keyboardRow = rows(c).find(row => row.dataset.massInventoryId === 'middle');
  await keyboardRow.emit('keydown', { target: keyboardRow, key: ' ' });
  assert.equal(c.massRenewalSelectionCount.textContent, '1 von 10 ausgewählt');
  await keyboardRow.emit('keydown', { target: keyboardRow, key: 'Enter' });
  assert.equal(c.massRenewalSelectionCount.textContent, '2 von 10 ausgewählt');
  pass('hidden selections persist, keyboard toggling works, and Next uses global selection');

  await filter(c, 'schone');
  await c.massRenewalNext.emit('click');
  assert.deepEqual(h.controller.status().orderedIds, ['early', 'middle']);
  assert.deepEqual(c.massRenewalOrderList.children.map(row => row.dataset.massInventoryId), ['early', 'middle']);
  pass('Step 2 contains all selected IDs, including invisible ones, in default expiry order');

  // Move the first item down and re-enter Step 2 while search hides it.
  await c.massRenewalOrderList.children[0].children[3].children[2].emit('click');
  assert.deepEqual(h.controller.status().orderedIds, ['middle', 'early']);
  await c.massRenewalBack.emit('click');
  await filter(c, 'jacke');
  await c.massRenewalNext.emit('click');
  assert.deepEqual(h.controller.status().orderedIds, ['middle', 'early']);
  await c.massRenewalStart.emit('click');
  assert.deepEqual(h.calls.map(call => call.inventoryIds), [['middle', 'early']]);
  assert.equal(h.calls[0].stopOnError, true);
  pass('reorder, Back, filter and Forward preserve exact confirmed start order once each');

  const dozen = Array.from({ length: 12 }, (_, i) =>
    record(String(i), 'Token' + String(i).padStart(2, '0'), '2027-01-' + String(i + 1).padStart(2, '0')));
  const cap = ui(dozen);
  await cap.controls.massRenewalButton.emit('click');
  for (let i = 0; i < 10; i++) {
    await filter(cap.controls, 'Token' + String(i).padStart(2, '0'));
    await select(cap.controls, String(i));
  }
  await filter(cap.controls, 'Token10');
  const eleventh = checkbox(rows(cap.controls)[0]);
  assert.equal(eleventh.disabled, true);
  eleventh.checked = true;
  await eleventh.emit('change');
  assert.equal(cap.controller.status().selectedIds.length, 10);
  assert.equal(cap.controls.massRenewalSelectionCount.textContent, '10 von 10 ausgewählt');
  await filter(cap.controls, 'Token00');
  await select(cap.controls, '0');
  await filter(cap.controls, 'Token10');
  assert.equal(checkbox(rows(cap.controls)[0]).disabled, false);
  await select(cap.controls, '10');
  assert.equal(cap.controller.status().selectedIds.length, 10);
  assert.equal(new Set(cap.controller.status().selectedIds).size, 10);
  pass('max-ten cap includes hidden items; deselecting one frees space for another');

  cap.controller.updateContext({ records: [record('unready', 'Only template missing', '2027-04-01', false)] });
  cap.controller.renderSelection();
  await filter(cap.controls, 'any text');
  assert.equal(cap.controls.massRenewalSelectionBody.children[0].children[0].textContent,
    'Für dieses Inventarprofil sind aktuell keine vollständig gespeicherten Vorlagen verfügbar.');
  assert.equal(cap.controller.status().selectedIds.length, 0);
  pass('no eligible entries is distinct from no search hits and purges stale profile selections');

  const blocked = ui(records, { allowed: false });
  await blocked.controls.massRenewalButton.emit('click');
  blocked.controller.renderSelection();
  assert.equal(blocked.controller.status().selectedIds.length, 0);
  assert.equal(blocked.controls.massRenewalNext.disabled, true);
  pass('account gate remains fail closed');

  const html = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'app.css'), 'utf8');
  assert.match(html, /id="massRenewalSearchInput"[^>]*aria-label="Anzeigen nach Titel suchen"/);
  assert.match(html, /id="massRenewalSearchClear"[^>]*aria-label="Titelsuche zurücksetzen"/);
  assert.match(css, /\.mass-renewal-table-wrap \{ max-height:clamp\(160px,calc\(100dvh - 350px\),420px\)/);
  assert.match(css, /\.mass-renewal-actions \{ position:sticky; bottom:-20px/);
  pass('search controls remain accessible and the list/footer have bounded viewport styles');

  console.log(checks + ' KAR-151 DOM and selection assertions PASS');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
