const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const capture = fs.readFileSync(path.join(root, 'inventory-capture-controller.js'), 'utf8');
const appCapture = app + '\n' + capture;
const bg = require('./v12215-source-surface.cjs');
const runner = fs.readFileSync(path.join(root, 'inventory-runner.js'), 'utf8');

let n = 0;
function pass(message) { n += 1; console.log(`PASS ${n}: ${message}`); }

assert.match(appCapture, /START_BULK_INVENTORY_OPERATION/);
assert.match(appCapture, /sourceTabId(?:\s*:\s*fullInventoryTabId)?[,}]/);
pass('app starts bulk inventory through background fresh-source orchestration');

assert.match(bg, /async function startBulkInventoryOperation\s*\(/);
assert.match(bg, /FRESH_BULK_SOURCE_MAX_ATTEMPTS/);
assert.match(bg, /START_BULK_INVENTORY_FROM_FRESH_SOURCE/);
assert.match(bg, /createAutomationTab\([^\n]*MY_ADS_PROJECTS_URL/);
assert.match(bg, /ensureContentConnection\(\{\s*tabId:\s*sourceTabId\s*\}\)/);
assert.match(bg, /START_BULK_INVENTORY_FROM_FRESH_SOURCE/);
assert.match(bg, /BULK_AUTO_SOURCE_READY/);
pass('background prepares and verifies a fresh page-one source tab for every bulk capture');

assert.match(runner, /START_BULK_INVENTORY_FROM_FRESH_SOURCE/);
assert.doesNotMatch(runner, /message\?\.type === 'START_BULK_INVENTORY'\)/);
assert.match(runner, /validateFreshBulkSnapshot/);
assert.match(bg, /BULK_SOURCE_SNAPSHOT_CREATED/);
pass('runner only initializes a full bulk run after the fresh-source handshake and validates the snapshot');

assert.match(bg, /function classifyBulkEditWorkerNavigation\s*\(/);
assert.match(bg, /BULK_EDIT_WORKER_NOT_EDITABLE/);
assert.match(bg, /state:\s*'terminal'/);
assert.match(runner, /result\?\.state === 'terminal'/);
assert.match(bg, /retry:\s*true/);
pass('completed redirects away from the expected edit route are terminalized instead of polling for 90 seconds');

assert.match(bg, /(?:if \(message\?\.type === "START_BULK_INVENTORY_OPERATION"\) return startBulkInventoryOperation\(message\);|"START_BULK_INVENTORY_OPERATION"\s*:\s*Object\.freeze)/);
pass('background message router exposes the fresh bulk start action');

console.log(`${n} v1.15.2 bulk freshness/terminal worker contract tests passed`);
