const fs=require('fs'),assert=require('assert');
const app=fs.readFileSync('app.js','utf8'), inv=fs.readFileSync('inventory-capture-controller.js','utf8');
let n=0; const pass=s=>{n++;console.log('PASS',s)};
assert.match(app,/function\s+syncInventoryActionStates\s*\(/); pass('shared inventory action sync exists');
assert.match(app,/function\s+syncArchiveInsertionUiFromLock\([\s\S]*?syncInventoryActionStates\(['"]insertion-lock-sync['"]\)/); pass('insertion lock sync reconciles inventory actions before snapshot');
assert.ok(/bulkStartInFlight\s*=\s*true;[\s\S]{0,240}syncInventoryActionStates\(['"]bulk-start['"]\)/.test(app) || /setBulkStartInFlight\(true\);[\s\S]{0,240}syncInventoryActionStates\(['"]bulk-start['"]\)/.test(inv)); pass('bulk start synchronizes both inventory actions');
assert.ok(/bulkStartInFlight\s*=\s*false;[\s\S]{0,240}syncInventoryActionStates\(['"]bulk-start-finished['"]\)/.test(app) || /setBulkStartInFlight\(false\);[\s\S]{0,240}syncInventoryActionStates\(['"]bulk-start-finished['"]\)/.test(inv)); pass('bulk start completion synchronizes both inventory actions');
assert.match(inv,/const\s+actionDisableModel\s*=\s*(?:typeof\s+options\.actionDisableModel[^;]+\?\s*)?options\.actionDisableModel/); assert.match(inv,/actionDisableModel\(['"]inventoryButton['"]\)/); pass('single inventory button consumes authoritative selector');
console.log(`${n}/5 PASS`);
