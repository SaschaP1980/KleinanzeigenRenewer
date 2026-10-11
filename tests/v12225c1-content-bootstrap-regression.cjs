const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
let pass = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); console.log(`PASS ${msg}`); pass += 1; };

const manifest = JSON.parse(read('manifest.json'));
const bg = read('background.js');
const content = read('content.js');
const inventory = read('inventory-runner.js');
const manifestFiles = manifest.content_scripts?.[0]?.js || [];
const match = bg.match(/const CONTENT_SCRIPT_FILES = \[(.*?)\];/s);
ok(Boolean(match), 'dynamic content bootstrap list exists');
const bootstrapFiles = [...match[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
assert.deepStrictEqual(bootstrapFiles, manifestFiles, 'dynamic bootstrap must inject the exact manifest content-script stack in the same order');
console.log('PASS dynamic bootstrap exactly mirrors manifest content-script stack'); pass += 1;
ok(bootstrapFiles[0] === 'src/shared/runtime-deps.js' && bootstrapFiles[1] === 'src/shared/message-contract-registry.js', 'registry loads immediately after runtime deps during dynamic bootstrap');

const contentRequire = content.indexOf("KRDeps.require('KRMessageContractRegistry')");
const contentReady = content.indexOf("globalThis.__KR_CONTENT_V160__ = 'ready'");
ok(/if \(globalThis\.__KR_CONTENT_V160__ === 'ready'\) return;/.test(content), 'content bootstrap ignores stale pre-fix boolean guard');
ok(contentRequire >= 0 && contentReady > contentRequire, 'content marks bootstrap ready only after registry dependency resolves');

const inventoryRequire = inventory.indexOf("KRDeps.require('KRMessageContractRegistry')");
const inventoryReady = inventory.indexOf("globalThis.__KR_INVENTORY_RUNNER_V160__ = 'ready'");
ok(/if \(globalThis\.__KR_INVENTORY_RUNNER_V160__ === 'ready'\) return;/.test(inventory), 'inventory bootstrap ignores stale pre-fix boolean guard');
ok(inventoryRequire >= 0 && inventoryReady > inventoryRequire, 'inventory marks bootstrap ready only after registry dependency resolves');

console.log(`${pass}/7 PASS`);
