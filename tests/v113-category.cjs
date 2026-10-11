const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const code = fs.readFileSync(path.join(__dirname, '../template-filler.js'), 'utf8');
const ctx = {};
vm.runInNewContext(code, ctx);
const api = ctx.KRTemplateFill;
let n = 0;
const pass = name => { n += 1; console.log('PASS ' + name); };

assert.equal(api.LEGACY_ACTION_DELAY_MS, 100);
pass('legacy category assistant uses fixed 100 ms minimum action gap');

assert.equal(api.legacyActionWaitMs(0, 1000), 0);
assert.equal(api.legacyActionWaitMs(1000, 1025), 75);
assert.equal(api.legacyActionWaitMs(1000, 1100), 0);
assert.equal(api.legacyActionWaitMs(1000, 1250), 0);
pass('action-gap helper enforces only the remaining portion of the 100 ms minimum');

console.log(`${n} v1.1.3 category timing tests passed`);
