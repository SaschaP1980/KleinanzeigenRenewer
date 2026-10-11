const assert = require('node:assert/strict');
const R = require('../inventory-reconciliation.js');
let failures = 0; let passes = 0;
function check(label, fn) { try { fn(); passes += 1; console.log(`PASS ${label}`); } catch (error) { failures += 1; console.error(`FAIL ${label}: ${error.stack || error.message}`); } }

check('stable full rosters are complete and set-equal independent of page-local order', () => {
  const first = R.rosterEvidence({ 1: ['101', '102'], 2: ['103'] });
  const second = R.rosterEvidence({ 1: ['102', '101'], 2: ['103'] });
  assert.equal(R.completeRoster(first, 3), true);
  assert.equal(R.completeRoster(second, 3), true);
  assert.equal(R.sameIdSet(first.ids, second.ids), true);
});

check('duplicate IDs across pages invalidate completeness', () => {
  const evidence = R.rosterEvidence({ 1: ['101', '102'], 2: ['102', '103'] });
  assert.deepEqual(evidence.duplicates, ['102']);
  assert.equal(R.completeRoster(evidence, 3), false);
});

check('missing page sequence invalidates a non-empty roster', () => {
  const evidence = R.rosterEvidence({ 1: ['101'], 3: ['102'] });
  assert.equal(evidence.pagesContiguous, false);
  assert.equal(R.completeRoster(evidence, 2), false);
});

check('explicit invalid reason blocks an otherwise complete roster', () => {
  const evidence = R.rosterEvidence({ 1: ['101'] });
  assert.equal(R.completeRoster(evidence, 1, 'changed'), false);
});

check('reconciliation selects only active absent records of the target profile', () => {
  const records = [
    { inventoryId: '101', adId: '101', profileId: 'p1' },
    { inventoryId: '102', adId: '102', profileId: 'p1' },
    { inventoryId: '103', adId: '103', profileId: 'p1' },
    { inventoryId: 'trash-104', adId: '104', profileId: 'p1', recordKind: 'trash', trash: { trashedAt: '2026-09-18T00:00:00Z' } },
    { inventoryId: '201', adId: '201', profileId: 'p2' },
    { inventoryId: 'legacy-x', adId: '', profileId: 'p1' }
  ];
  const candidates = R.selectAbsentCandidates(records, 'p1', ['101'], new Set(['103']));
  assert.deepEqual(candidates.map(item => item.inventoryId), ['102']);
});

check('invalid and duplicate IDs are rejected when a page roster is normalized', () => {
  assert.throws(() => R.normalizeRosterIds(['101', 'bad']), /ungültige Anzeigen-ID/);
  assert.throws(() => R.normalizeRosterIds(['101', '101']), /doppelte Anzeigen-IDs/);
});

if (failures) { console.error(`${failures} v1.18.1 reconciliation runtime group(s) failed; ${passes} passed`); process.exit(1); }
console.log(`${passes} v1.18.1 reconciliation runtime groups passed`);
