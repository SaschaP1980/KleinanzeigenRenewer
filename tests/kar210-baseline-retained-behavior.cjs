'use strict';
// KAR-210: actual retained baseline behavior, independent of future A/B UI.
// Trash renderer fixture adapted from KAR-165; no warning-color requirement.
const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const test = require('node:test');
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-11-11T17:00:00.000Z');
const formattingModule = require('../src/app/inventory-formatting.js');
const recordCardModule = require('../src/app/record-card-view.js');
const trashCardModule = require('../src/app/trash-card-renderer.js');

const helpers = {
  formatDate: value => String(value || '–'),
  formatCalendarDate: value => new Date(value).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC'
  }),
  displayPriceWithType: () => '12 €',
  artLabel: () => '–'
};
const formatter = formattingModule.create({ sharedUiHelpers: helpers });
const presentationAt = (record, now = NOW) => formatter.trashRetentionPresentation(record, now);
const formatting = { ...formatter, trashRetentionPresentation: record => presentationAt(record) };

function recordWithExpiry(expiresAt, id = '165') {
  return {
    inventoryId: id, adId: id, profileId: 'profile-A', title: 'Testartikel',
    price: { displayed: '12 €' }, images: [],
    trash: { trashedAt: '2026-11-01T00:00:00Z', expiresAt },
    category: { path: ['Mode', 'Schuhe'] }
  };
}

function renderRecord(record, compact) {
  const { document, Element } = parseHTML('<html><body><div id="trash"></div><span id="count"></span><span id="inventory"></span><span id="trash-header"></span></body></html>');
  const recordCardView = recordCardModule.create({
    document, Element, formatting, loadLocalPreview: async () => {}
  });
  const trashList = document.querySelector('#trash');
  const renderer = trashCardModule.create({
    document, formatting, recordCardView,
    elements: {
      trashList, trashCount: document.querySelector('#count'),
      inventoryHeaderCount: document.querySelector('#inventory'),
      trashHeaderCount: document.querySelector('#trash-header')
    },
    sharedUiHelpers: {
      makeCompactIconButton: options => {
        const button = document.createElement('button');
        button.textContent = options.label;
        return button;
      }
    },
    selectedConcreteProfile: () => ({ id: 'profile-A' }),
    accountGateModel: () => ({ allowed: false, tooltip: 'Test only' }),
    insertionLockActive: () => false,
    syncListViewModeControls: () => {}
  });
  renderer.updateContext({ records: [], trashRecords: [record], selectedProfileId: 'profile-A',
    globalListViewMode: compact ? 'compact' : 'detailed' });
  renderer.renderTrash();
  const deadline = trashList.querySelector(compact ? '.compact-list-meta-end' : '.trash-expiry strong');
  assert.ok(deadline, 'retention deadline exists in both trash views');
  return { renderer, trashList, deadline };
}

test('baseline saved Art summary is read-only and does not guess from title', () => {
  const Helpers=require('../src/app/shared-ui-helpers.js');
  const api=Helpers.create({document:{createElement(){return {};}}});
  const record={title:'Unrelated title',dynamicAttributes:[
    {label:'Zustand',displayValue:'Neu'},
    {label:'Art',displayValue:'Original Art',technicalValue:'original'},
    {label:'Typ',displayValue:'Future feature'}]};
  const before=JSON.stringify(record);
  assert.equal(api.artLabel(record),'Original Art');
  assert.equal(api.artLabel({title:'Art inferred from title',dynamicAttributes:[]}),'–');
  assert.equal(api.artLabel({dynamicAttributes:[{label:' art ',technicalValue:'saved-id'}]}),'saved-id');
  assert.equal(JSON.stringify(record),before);
});

test('baseline detailed and compact trash retain deadline text and replace stale rows', () => {
  for(const compact of [false,true]) {
    const initial=recordWithExpiry(new Date(NOW+7*DAY).toISOString());
    const before=JSON.stringify(initial);
    const {renderer,trashList,deadline}=renderRecord(initial,compact);
    assert.equal(deadline.textContent,'Im Papierkorb bis 18.11.2026 (noch 7 Tage)');
    assert.equal(trashList.children.length,1);
    assert.equal(trashList.firstElementChild.dataset.inventoryId,'165');
    assert.equal(JSON.stringify(initial),before,'view must not mutate persisted record');
    for(const missing of [null,'','invalid-date','∞','Infinity']) {
      assert.equal(renderRecord(recordWithExpiry(missing),compact).deadline.textContent,'Aufbewahrung unbekannt');
    }
    const replacement=recordWithExpiry(new Date(NOW+3*DAY).toISOString(),'other');
    renderer.updateContext({trashRecords:[replacement],selectedProfileId:'profile-B'});
    renderer.renderTrash();
    assert.equal(trashList.children.length,1);
    assert.equal(trashList.firstElementChild.dataset.inventoryId,'other');
    const current=trashList.querySelector(compact?'.compact-list-meta-end':'.trash-expiry strong');
    assert.equal(current.textContent,'Im Papierkorb bis 14.11.2026 (noch 3 Tage)');
  }
});

test('baseline diagnostics flush, cap, redact and reset with blocker without occupancy API', async () => {
  const Diagnostics=require('../src/background/services/diagnostics-service.js');
  const stored={};let uuid=0, blocker='';
  const service=Diagnostics.create({
    storageLocal:{async get(k){return {[k]:stored[k]};},async set(p){Object.assign(stored,structuredClone(p));}},
    maxDiagnostics:3,batchFlushMs:100000,randomUUID:()=> 'fixture-'+(++uuid),
    getResetBlocker:async()=>blocker
  });
  try {
    for(const event of ['FIRST','SECOND','THIRD','FOURTH']) await service.log('info',event);
    const events=await service.read();
    assert.equal(events.length,3);
    assert.deepEqual(events.map(e=>e.event),['SECOND','THIRD','FOURTH']);
    assert.equal(stored.diagnosticsV2.length,3);
    await service.log('error','SENSITIVE_FIXTURE',{password:'private',url:'https://example.invalid/path?q=private'});
    const after=await service.read();
    assert.equal(after.length,3);
    assert.equal(after.at(-1).details.password,'[REDACTED]');
    assert.equal(after.at(-1).details.url,'https://example.invalid/path');
    blocker='busy';await assert.rejects(()=>service.reset(),e=>e?.code==='KR_DIAGNOSTIC_RESET_BUSY');
    assert.deepEqual((await service.read()).map(e=>e.event),after.map(e=>e.event));
    blocker='';const reset=await service.reset();
    assert.equal(reset.reset,true);
    assert.equal(service.sessionId(),reset.diagnosticBoundaryId);
    assert.deepEqual((await service.read()).map(e=>e.event),['DIAGNOSTIC_SESSION_RESET']);
  } finally {await service.flush();}
});
