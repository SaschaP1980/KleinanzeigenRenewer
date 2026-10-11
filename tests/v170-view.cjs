const assert = require('node:assert/strict');
const view = require('../inventory-view.js');
let n = 0; const pass = name => { n += 1; console.log('PASS ' + name); };

const records = [
  { adId:'3', title:'Zebra Jacke', capturedAt:'2026-09-13T12:00:00Z', listingMeta:{ listingDateIso:'2026-09-10', endDateIso:'2026-11-10' } },
  { adId:'1', title:'Äpfel Deko', capturedAt:'2026-09-12T12:00:00Z', listingMeta:{ listingDateIso:'2026-09-12', endDateIso:'2026-11-12' } },
  { adId:'2', title:'Alpha Schuhe', capturedAt:'2026-09-11T12:00:00Z', listingMeta:{} }
];

assert.deepEqual(view.deriveInventoryView(records,{query:'apfel',sortKey:'title',direction:'asc'}).map(r=>r.adId),['1']);
assert.deepEqual(view.deriveInventoryView(records,{query:'alpha schuhe',sortKey:'title',direction:'asc'}).map(r=>r.adId),['2']);
pass('title full-text search is case/diacritic insensitive and supports multiple terms');

assert.deepEqual(view.deriveInventoryView(records,{sortKey:'title',direction:'asc'}).map(r=>r.adId),['2','1','3']);
assert.deepEqual(view.deriveInventoryView(records,{sortKey:'title',direction:'desc'}).map(r=>r.adId),['3','1','2']);
pass('title sorting supports ascending and descending order');

assert.deepEqual(view.deriveInventoryView(records,{sortKey:'listingDate',direction:'asc'}).map(r=>r.adId),['3','1','2']);
assert.deepEqual(view.deriveInventoryView(records,{sortKey:'listingDate',direction:'desc'}).map(r=>r.adId),['1','3','2']);
assert.deepEqual(view.deriveInventoryView(records,{sortKey:'endDate',direction:'desc'}).map(r=>r.adId),['1','3','2']);
pass('missing listing/end dates remain at the end in both directions');

assert.deepEqual(view.deriveInventoryView(records,{sortKey:'inventoryDate',direction:'desc'}).map(r=>r.adId),['3','1','2']);
assert.deepEqual(view.deriveInventoryView(records,{sortKey:'inventoryDate',direction:'asc'}).map(r=>r.adId),['2','1','3']);
pass('inventory date sorting uses capturedAt');

assert.deepEqual(view.priceTypeParts({type:'FIXED',typeDisplay:'Festpreis'}),{short:'FP',long:'Festpreis'});
assert.deepEqual(view.priceTypeParts({type:'NEGOTIABLE',typeDisplay:'Verhandlungsbasis'}),{short:'VB',long:'Verhandlungsbasis'});
assert.deepEqual(view.priceTypeParts({typeDisplay:'Festpreis'}),{short:'FP',long:'Festpreis'});
assert.equal(view.priceTypeParts({}),null);
pass('compact price type rendering only uses recognized stored price types');

console.log(`${n} v1.7.0 view logic groups passed`);
