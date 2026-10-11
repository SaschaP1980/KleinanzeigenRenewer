const assert = require('assert');

delete globalThis.KRDeps;
delete require.cache[require.resolve('../runtime-deps.js')];
const deps = require('../runtime-deps.js');

let passed = 0;
function check(label, fn) {
  fn(); passed += 1; console.log(`PASS ${label}`);
}

check('registry is the single global dependency boundary', () => {
  assert.strictEqual(globalThis.KRDeps, deps);
  assert.deepStrictEqual(deps.names(), []);
});

check('register and strict require preserve API identity', () => {
  const api = Object.freeze({ value: 42 });
  assert.strictEqual(deps.register('KRExample', api), api);
  assert.strictEqual(deps.require('KRExample'), api);
  assert.strictEqual(deps.optional('KRExample'), api);
  assert.strictEqual(deps.has('KRExample'), true);
});

check('same API can be registered idempotently', () => {
  const api = deps.require('KRExample');
  assert.strictEqual(deps.register('KRExample', api), api);
});

check('conflicting duplicate registrations fail early', () => {
  assert.throws(() => deps.register('KRExample', {}), /Duplicate dependency: KRExample/);
});

check('missing strict dependency fails with load-order guidance', () => {
  assert.throws(() => deps.require('KRMissing'), /Missing dependency: KRMissing\. Check script\/import order\./);
  assert.strictEqual(deps.optional('KRMissing'), null);
});

check('invalid dependency names are rejected', () => {
  assert.throws(() => deps.register('Example', {}), /Invalid dependency name/);
  assert.throws(() => deps.optional(''), /Invalid dependency name/);
});

check('unregistered global aliases are ignored by the explicit registry', () => {
  const legacy = Object.freeze({ legacy: true });
  globalThis.KRLegacy = legacy;
  assert.strictEqual(deps.optional('KRLegacy'), null);
  assert.throws(() => deps.require('KRLegacy'), /Missing dependency: KRLegacy/);
  delete globalThis.KRLegacy;
});

check('registered names are deterministic', () => {
  deps.register('KRAlpha', Object.freeze({}));
  assert.deepStrictEqual(deps.names(), ['KRAlpha', 'KRExample']);
});

console.log(`${passed}/8 v1.22.4 runtime dependency registry runtime checks passed.`);
