'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = process.cwd();
const files = [
  ['src/shared/message-contract-registry.js', 'KRMessageContractRegistry'],
  ['src/shared/managed-navigation.js', 'KRManagedNavigation'],
  ['src/shared/platform-hardening.js', 'KRPlatformHardening'],
  ['src/content/paid-insertion-guard.js', 'KRPaidInsertionGuard'],
  ['src/shared/my-ads-readiness.js', 'KRMyAdsReadiness']
];

function execute(file, context) {
  const source = fs.readFileSync(file, 'utf8');
  vm.runInContext(source, context, { filename: file });
}

const context = vm.createContext({
  console,
  URL,
  setTimeout,
  clearTimeout,
  globalThis: null
});
context.globalThis = context;
execute('src/shared/runtime-deps.js', context);

const first = new Map();
for (const [file, name] of files) {
  execute(file, context);
  const api = context.KRDeps.require(name);
  assert.ok(api, `${name} must register on first load`);
  first.set(name, api);
}

for (const [file, name] of files) {
  assert.doesNotThrow(() => execute(file, context), `${name} must tolerate same-document rebootstrap`);
  assert.equal(context.KRDeps.require(name), first.get(name), `${name} must preserve the first registered API object`);
}

for (const [, name] of files) assert.equal(context.KRDeps.names().filter(value => value === name).length, 1, `${name} must remain registered exactly once`);
assert.throws(() => context.KRDeps.register('KRStrictDuplicateProbe', Object.freeze({ first: true })) && context.KRDeps.register('KRStrictDuplicateProbe', Object.freeze({ second: true })), /Duplicate dependency: KRStrictDuplicateProbe/, 'KRDeps.register must remain strict for genuine conflicting registrations');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const background = fs.readFileSync('src/background/background.js', 'utf8');
const match = background.match(/const CONTENT_SCRIPT_FILES = (\[[^\n]+\]);/);
assert.ok(match, 'dynamic bootstrap script list missing');
assert.deepEqual(JSON.parse(match[1]), manifest.content_scripts[0].js, 'static and dynamic bootstrap lists must stay identical');

console.log('5/5 PASS v1.23.17_c3 content rebootstrap');
