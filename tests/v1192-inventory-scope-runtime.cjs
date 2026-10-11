const assert = require('node:assert/strict');
const path = require('node:path');
const root = process.env.KR_ROOT ? path.resolve(process.env.KR_ROOT) : path.join(__dirname, '..');
let scope;
try { scope = require(path.join(root, 'inventory-scope.js')); }
catch (error) { console.error('FAIL inventory-scope module missing: ' + error.message); process.exit(1); }
let pass = 0;
function check(name, fn) { fn(); pass++; console.log('PASS ' + name); }
check('unknown scope normalizes to new-only', () => assert.equal(scope.normalizeInventoryScope('anything'), 'new-only'));
check('full scope stays all', () => assert.equal(scope.normalizeInventoryScope('all'), 'all'));
check('active ids are limited to selected profile and exclude trash', () => {
  const records = [
    { inventoryId:'101', adId:'101', profileId:'p1', recordKind:'inventory' },
    { inventoryId:'102', adId:'102', profileId:'p1', recordKind:'trash', trash:{trashedAt:'2026-01-01T00:00:00Z'} },
    { inventoryId:'103', adId:'103', profileId:'p2', recordKind:'inventory' },
    { inventoryId:'x', adId:'abc', profileId:'p1', recordKind:'inventory' }
  ];
  assert.deepEqual(scope.activeInventoryAdIds(records, 'p1'), ['101']);
});
check('new-only skips an existing active ad id', () => assert.equal(scope.shouldSkipExisting('new-only', ['101'], '101'), true));
check('new-only captures an unknown ad id', () => assert.equal(scope.shouldSkipExisting('new-only', ['101'], '104'), false));
check('full scope never skips existing ads', () => assert.equal(scope.shouldSkipExisting('all', ['101'], '101'), false));
console.log(`${pass} runtime checks passed`);
