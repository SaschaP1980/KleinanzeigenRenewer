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

assert.equal(api.TARGET_PATH, '/p-anzeige-aufgeben-schritt2.html');
pass('new-ad target path is exact');

const available = {
  sizeGroups: [
    { id: 'SMALL', name: 'Klein', packageSize: 'SMALL' },
    { id: 'MEDIUM', name: 'Mittel', packageSize: 'MEDIUM' },
    { id: 'LARGE', name: 'Groß', packageSize: 'LARGE' }
  ],
  options: [
    { id: 'HERMES_001', packageSize: 'SMALL' },
    { id: 'HERMES_002', packageSize: 'SMALL' },
    { id: 'DHL_001', packageSize: 'SMALL' },
    { id: 'HERMES_003', packageSize: 'MEDIUM' },
    { id: 'DHL_002', packageSize: 'MEDIUM' }
  ]
};
let plan = api.inferShippingPackageSize(available, [{ id: 'HERMES_001' }, { id: 'HERMES_002' }, { id: 'DHL_001' }]);
assert.equal(plan.packageSize, 'SMALL');
assert.equal(plan.label, 'Klein');
pass('saved carrier IDs map to the current shipping size group');

plan = api.inferShippingPackageSize(available, [{ id: 'HERMES_003' }, { id: 'DHL_002' }]);
assert.equal(plan.packageSize, 'MEDIUM');
assert.equal(plan.label, 'Mittel');
pass('different category shipping IDs map generically');

assert.equal(api.inferShippingPackageSize(available, [{ id: 'HERMES_001' }, { id: 'DHL_002' }]), null);
assert.equal(api.inferShippingPackageSize(available, [{ id: 'UNKNOWN' }]), null);
pass('ambiguous or unavailable shipping IDs are rejected instead of guessed');

console.log(`${n} v1.1.0 template-fill logic tests passed`);
