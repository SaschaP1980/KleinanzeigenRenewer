const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const background = fs.readFileSync('src/background/background.js', 'utf8');
const router = fs.readFileSync('src/background/background-message-router.js', 'utf8');
const inventoryScope = require('../src/background/lib/inventory-scope.js');
let pass = 0;
function ok(label, fn) { fn(); pass += 1; console.log(`PASS ${label}`); }

ok('bulk capture routes still enter the bulk controller from the real background routing surface', () => {
  assert.match(router, /"START_BULK_INVENTORY_OPERATION"[\s\S]{0,120}handler:\s*"START_BULK_INVENTORY_OPERATION"/);
  assert.match(router, /"GET_BULK_RUN_FOR_SOURCE"[\s\S]{0,120}handler:\s*"GET_BULK_RUN_FOR_SOURCE"/);
  assert.match(background, /"START_BULK_INVENTORY_OPERATION"\s*:\s*\([^)]*\)\s*=>\s*startBulkInventoryOperation\(message\)/);
  assert.match(background, /"GET_BULK_RUN_FOR_SOURCE"\s*:\s*\([^)]*\)\s*=>\s*bulkRunForSource\(sender\)/);
});

ok('bulk controller composition root supplies a defined normalizeInventoryScope binding', () => {
  const declaration = background.match(/(?:const|let|var)\s+normalizeInventoryScope\s*=\s*InventoryScope\.normalizeInventoryScope(?:\.bind\(InventoryScope\))?\s*;/);
  assert.ok(declaration, 'background.js must define normalizeInventoryScope from authoritative KRInventoryScope before constructing KRBulkInventoryController');
  assert.match(background, /normalizeCorrelationId,\s*normalizeInventoryScope,\s*inventoryScopeApi:\s*InventoryScope/);
});

ok('composition-root inventory-scope binding preserves the authoritative normalization semantics', () => {
  const declaration = background.match(/(?:const|let|var)\s+normalizeInventoryScope\s*=\s*InventoryScope\.normalizeInventoryScope(?:\.bind\(InventoryScope\))?\s*;/);
  assert.ok(declaration);
  const context = { InventoryScope: inventoryScope };
  vm.createContext(context);
  vm.runInContext(`${declaration[0]} this.normalizeInventoryScope = normalizeInventoryScope;`, context);
  assert.equal(context.normalizeInventoryScope('all'), 'all');
  assert.equal(context.normalizeInventoryScope('new-only'), 'new-only');
  assert.equal(context.normalizeInventoryScope('anything-else'), 'new-only');
});

console.log(`${pass}/3 PASS v1.23.12_c1 bulk composition-root regression`);
