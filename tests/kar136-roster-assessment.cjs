'use strict';
// KAR-136: RED-first characterization for independently safe inventory count-drift admission.
// Synthetic IDs and titles only. Never mutate a live account or local inventory.
const assert = require('node:assert/strict');
const Reconciliation = require('../src/background/lib/inventory-reconciliation.js');
let passed = 0;
function check(name, fn) {
  try { fn(); passed += 1; console.log('PASS KAR-136: ' + name); }
  catch (error) { console.error('FAIL KAR-136: ' + name + ': ' + error.message); process.exitCode = 1; }
}
const range = (start, count) => Array.from({ length: count }, (_, i) => String(start + i));
const actual61 = range(100001, 61);
const firstPages = { 1: actual61.slice(0, 25), 2: actual61.slice(25, 50), 3: actual61.slice(50) };
const assess = (params) => {
  assert.equal(typeof Reconciliation.assessFirstRosterForIndependentScan, 'function',
    'missing read-only KAR-136 assessment policy: source-first RED');
  return Reconciliation.assessFirstRosterForIndependentScan(params);
};
const call = (extra = {}) => assess({
  rosterPages: firstPages, expectedTotal: 60, processedIds: actual61,
  terminalPageVerified: true, invalidReason: null, ...extra
});
check('observed 61 unique IDs vs nominal 60 allows read-only independent scan but never local trash', () => {
  const result = call();
  assert.equal(result.status, 'independent-scan-required');
  assert.equal(result.observedCount, 61);
  assert.equal(result.nominalExpectedCount, 60);
  assert.equal(result.countMismatch, true);
  assert.equal(result.canStartIndependentScan, true);
  assert.equal(result.absenceProven, false);
  assert.equal(result.canMoveToTrash, false);
});
check('distinct ad IDs sharing the exact same title remain distinct', () => {
  const listings = [{ adId: '100001', title: 'Same title' }, { adId: '100002', title: 'Same title' }];
  const result = assess({ rosterPages: { 1: listings.map(x => x.adId) },
    expectedTotal: 2, processedIds: listings.map(x => x.adId),
    terminalPageVerified: true });
  assert.equal(result.observedCount, 2);
  assert.equal(result.canStartIndependentScan, true);
  assert.equal(result.canMoveToTrash, false);
});
check('missing proven terminal page blocks even equal first-scan IDs', () => {
  const result = call({ terminalPageVerified: false });
  assert.equal(result.canStartIndependentScan, false);
  assert.equal(result.reason, 'terminal-page-unverified');
});
check('noncontiguous pagination never proves a complete first roster', () => {
  const result = call({ rosterPages: { 1: firstPages[1], 3: firstPages[2] } });
  assert.equal(result.canStartIndependentScan, false);
  assert.equal(result.reason, 'missing-page');
});
check('same exact ID duplicated across pages is not a second advertisement', () => {
  const result = call({ rosterPages: { 1: firstPages[1], 2: ['100001', ...firstPages[2]] } });
  assert.equal(result.canStartIndependentScan, false);
  assert.equal(result.reason, 'duplicate-ad-id');
  assert.equal(result.canMoveToTrash, false);
});
check('non-numeric ID fails closed rather than counting as a listing', () => {
  const result = call({ rosterPages: { 1: ['invalid-ad-id'] } });
  assert.equal(result.canStartIndependentScan, false);
  assert.equal(result.reason, 'invalid-ad-id');
});
check('processed IDs different from the roster fail closed', () => {
  const result = call({ processedIds: [...actual61.slice(0, 60), '999999'] });
  assert.equal(result.canStartIndependentScan, false);
  assert.equal(result.reason, 'processed-roster-mismatch');
});
check('normal matching count still requires a second independent roster', () => {
  const result = assess({ rosterPages: { 1: ['100001', '100002'] }, expectedTotal: 2,
    processedIds: ['100001', '100002'], terminalPageVerified: true });
  assert.equal(result.countMismatch, false);
  assert.equal(result.canStartIndependentScan, true);
  assert.equal(result.absenceProven, false);
  assert.equal(result.canMoveToTrash, false);
});
console.log(passed + '/8 PASS KAR-136 roster assessment');
