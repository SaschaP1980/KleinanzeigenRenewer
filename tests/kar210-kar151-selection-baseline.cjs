'use strict';
const assert = require('node:assert/strict');
const test=require('node:test');
const fs = require('node:fs');
const path = require('node:path');
require('../src/shared/runtime-deps.js');
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

test('historical eligible expiry order, exact selection and keyboard, reordered request',async()=>{
 const records=[record('later','Blaue Schuhe','2027-02-03'),record('early','Grüne Jacke','2027-01-01'),record('middle','Schöne Schuhe','2027-01-10'),record('unready','No template','2027-01-02',false)];
 const h=ui(records),c=h.controls;await c.massRenewalButton.emit('click');
 assert.deepEqual(ids(c),['early','middle','later']);
 await select(c,'early');await select(c,'middle');
 const keyboardRow=rows(c).find(row=>row.dataset.massInventoryId==='middle');
 await keyboardRow.emit('keydown',{target:keyboardRow,key:' '});assert.equal(c.massRenewalSelectionCount.textContent,'1 von 10 ausgewählt');
 await keyboardRow.emit('keydown',{target:keyboardRow,key:'Enter'});assert.equal(c.massRenewalSelectionCount.textContent,'2 von 10 ausgewählt');
 await c.massRenewalNext.emit('click');assert.deepEqual(h.controller.status().orderedIds,['early','middle']);
 await c.massRenewalOrderList.children[0].children[3].children[2].emit('click');assert.deepEqual(h.controller.status().orderedIds,['middle','early']);
 await c.massRenewalStart.emit('click');assert.deepEqual(h.calls.map(call=>call.inventoryIds),[['middle','early']]);
});
test('historical selection cap, stale records pruned and blocked account cannot start',async()=>{
 const dozen=Array.from({length:12},(_,i)=>record(String(i),'Token'+i,'2027-01-'+String(i+1).padStart(2,'0')));
 const cap=ui(dozen);await cap.controls.massRenewalButton.emit('click');
 for(let i=0;i<10;i++)await select(cap.controls,String(i));
 const eleventh=checkbox(rows(cap.controls)[10]);assert.equal(eleventh.disabled,true);eleventh.checked=true;await eleventh.emit('change');assert.equal(cap.controller.status().selectedIds.length,10);
 await select(cap.controls,'0');assert.equal(checkbox(rows(cap.controls)[10]).disabled,false);await select(cap.controls,'10');assert.equal(new Set(cap.controller.status().selectedIds).size,10);
 cap.controller.updateContext({records:[record('unready','Only template missing','2027-04-01',false)]});cap.controller.renderSelection();
 assert.equal(cap.controller.status().selectedIds.length,0);assert.equal(cap.controls.massRenewalSelectionBody.children[0].children[0].textContent,'Für dieses Inventarprofil sind aktuell keine vollständig gespeicherten Vorlagen verfügbar.');
 const blocked=ui(dozen,{allowed:false});await blocked.controls.massRenewalButton.emit('click');blocked.controller.renderSelection();assert.equal(blocked.controller.status().selectedIds.length,0);assert.equal(blocked.controls.massRenewalNext.disabled,true);await blocked.controls.massRenewalStart.emit('click');assert.equal(blocked.calls.length,0);
});
