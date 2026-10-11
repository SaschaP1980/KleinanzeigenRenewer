'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
// In npm test the bridge is preloaded through NODE_OPTIONS; this also makes
// the focused regression runnable directly with node.
require('./v12222-vm-legacy-bridge.cjs');

const contentStartup = `(() => {
  if (globalThis.__KR_CONTENT_V160__ === 'ready') return;
  globalThis.__KR_CONTENT_V160__ = 'ready';
  chrome.runtime.onMessage.addListener(() => {});
  chrome.runtime.sendMessage({ type: 'GET_PLATFORM_ACCESS_RESTRICTION' }, response => {
    globalThis.startupResponse = response;
  });
})();`;

const runtime = sendMessage => ({
  onMessage: { addListener() {} },
  ...(sendMessage ? { sendMessage } : {})
});

// A legacy isolated test gets only the missing Content startup response.
const legacy = { chrome: { runtime: runtime() } };
vm.runInNewContext('globalThis.legacyPreload = true;', legacy);
assert.equal(typeof legacy.chrome.runtime.sendMessage, 'undefined');
vm.runInNewContext(contentStartup, legacy);
assert.equal(legacy.startupResponse?.ok, true);
assert.equal(legacy.startupResponse?.result?.active, false);
assert.throws(
  () => legacy.chrome.runtime.sendMessage({ type: 'PUBLISH_AD' }, () => {}),
  /only supports GET_PLATFORM_ACCESS_RESTRICTION/
);

// Arbitrary VM code does not receive the compatibility response.
const unrelated = { chrome: { runtime: runtime() } };
vm.runInNewContext('globalThis.unrelated = true;', unrelated);
assert.equal(typeof unrelated.chrome.runtime.sendMessage, 'undefined');

// Tests that explicitly model an active safety restriction keep their mock.
const explicitReply = (_message, callback) =>
  callback({ ok: true, result: { active: true } });
const explicit = { chrome: { runtime: runtime(explicitReply) } };
vm.runInNewContext(contentStartup, explicit);
assert.equal(explicit.chrome.runtime.sendMessage, explicitReply);
assert.equal(explicit.startupResponse?.result?.active, true);

// A modern fixture with its own KRDeps registry must fail rather than gain
// an implicit success response for a missing chrome.runtime.sendMessage.
const modern = { KRDeps: { require() { return null; } }, chrome: { runtime: runtime() } };
assert.throws(() => vm.runInNewContext(contentStartup, modern), /sendMessage is not a function/);

console.log('PASS legacy Content startup VM stub is narrow and preserves explicit fail-closed mocks');
