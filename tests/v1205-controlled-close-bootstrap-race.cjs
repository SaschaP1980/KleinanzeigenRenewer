const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const bg = fs.readFileSync('background.js', 'utf8');
const contentConnection = fs.readFileSync('content-connection-manager.js', 'utf8');
let n = 0;
const pass = label => { n += 1; console.log(`PASS ${n}: ${label}`); };

function functionSlice(name, nextName) {
  const start = bg.indexOf(`async function ${name}`);
  const end = bg.indexOf(`\nasync function ${nextName}`, start);
  assert.ok(start >= 0 && end > start, `${name} source slice missing`);
  return bg.slice(start, end);
}

(async () => {
  // Concrete v1.20.4 native race #1/#2: controlled target close can happen after
  // bootstrap started, either while executeScript rejects with "No tab" or while
  // the post-injection handshake rejects with "Receiving end does not exist".
  const helperStart = bg.indexOf('async function rethrowExpectedContentBootstrapCloseIfNeeded');
  const ensureStart = bg.indexOf('async function ensureContentConnection');
  assert.ok(helperStart >= 0 && helperStart < ensureStart, 'controlled-close reclassification helper must exist before ensureContentConnection');
  pass('bootstrap has a dedicated controlled-close reclassification helper');

  const helper = bg.slice(helperStart, ensureStart);
  assert.match(helper, /closeIntentReason/);
  assert.match(bg, /EXPECTED_CONTROLLED_CLOSE_INTENT_MAX_AGE_MS = 10000/);
  assert.match(helper, /CONTENT_SCRIPT_BOOTSTRAP_EXPECTED_TAB_CLOSE/);
  assert.match(helper, /expectedControlledTabCloseError/);
  pass('helper accepts an in-flight close intent and emits only neutral expected-close diagnostics');

  const ensureStart2 = contentConnection.indexOf('async function ensureContentConnection');
  const ensureEnd2 = contentConnection.indexOf('\n\n      return Object.freeze', ensureStart2);
  assert.ok(ensureStart2 >= 0 && ensureEnd2 > ensureStart2, 'ensureContentConnection moved source slice missing');
  const ensure = contentConnection.slice(ensureStart2, ensureEnd2);
  const injectCatch = ensure.slice(ensure.indexOf('chrome.scripting.executeScript'), ensure.indexOf('let lastError = null'));
  assert.match(injectCatch, /rethrowExpectedContentBootstrapCloseIfNeeded\(tabId, started, ['"]inject['"]\)/);
  assert.ok(injectCatch.indexOf('rethrowExpectedContentBootstrapCloseIfNeeded') < injectCatch.indexOf("CONTENT_SCRIPT_BOOTSTRAP_FAILED"));
  pass('inject failure checks controlled close before emitting bootstrap failure');

  const handshakeBlock = ensure.slice(ensure.indexOf('let lastError = null'));
  assert.match(handshakeBlock, /catch \(error\) \{[\s\S]*rethrowExpectedContentBootstrapCloseIfNeeded\(tabId, started, ['"]handshake['"]\)/);
  assert.ok(handshakeBlock.indexOf('rethrowExpectedContentBootstrapCloseIfNeeded') < handshakeBlock.lastIndexOf("CONTENT_SCRIPT_BOOTSTRAP_FAILED"));
  pass('handshake failure checks controlled close before emitting terminal bootstrap failure');


  const reasonStart = bg.indexOf('function isExpectedControlledTabCloseReason');
  const entryStart = bg.indexOf('async function expectedControlledTabCloseEntry');
  const entryEnd = bg.indexOf('\nfunction expectedControlledTabCloseError', entryStart);
  assert.ok(reasonStart >= 0 && entryStart > reasonStart && entryEnd > entryStart);
  let registryEntry = {
    lifecycleState: 'active',
    closeIntentReason: 'renewal-target-published',
    closeIntentAt: new Date(Date.now() - 100).toISOString(),
    managed: false,
    owner: { renewalId: 'renewal-fresh-intent' }
  };
  const entryCtx = {
    Date, Number, String, Object,
    TAB_STATES: { GONE: 'gone' },
    EXPECTED_CONTROLLED_CLOSE_INTENT_MAX_AGE_MS: 10000,
    tabRegistry: { get: async () => registryEntry }
  };
  vm.createContext(entryCtx);
  vm.runInContext(`${bg.slice(reasonStart, entryEnd)}; this.entry = expectedControlledTabCloseEntry;`, entryCtx);
  assert.equal((await entryCtx.entry(91))?.expectedCloseReason, 'renewal-target-published');
  pass('fresh in-flight controlled close intent is recognized before tombstone finalization');
  registryEntry = { ...registryEntry, closeIntentAt: new Date(Date.now() - 30000).toISOString() };
  assert.equal(await entryCtx.entry(91), null);
  pass('stale active close intent cannot suppress a later real connection failure');

  // Execute the real helper against the exact lifecycle condition from the native run.
  const logs = [];
  const ctx = {
    Date,
    Number,
    String,
    expectedControlledTabCloseEntry: async () => ({
      lifecycleState: 'gone',
      goneReason: 'renewal-target-published',
      closeIntentReason: null,
      role: 'renewal-target',
      managed: false,
      owner: { renewalId: 'renewal-1' }
    }),
    expectedControlledTabCloseError: (tabId, entry) => {
      const error = new Error('expected close');
      error.code = 'KR_TAB_EXPECTED_CLOSED';
      error.goneReason = entry.goneReason || entry.closeIntentReason;
      error.tabId = tabId;
      return error;
    },
    logDiagnostic: async (severity, event, details) => { logs.push({ severity, event, details }); }
  };
  vm.createContext(ctx);
  vm.runInContext(`${helper}; this.rethrow = rethrowExpectedContentBootstrapCloseIfNeeded;`, ctx);
  await assert.rejects(() => ctx.rethrow(77, Date.now() - 15, 'inject'), error => error?.code === 'KR_TAB_EXPECTED_CLOSED');
  assert.deepEqual(logs.map(item => [item.severity, item.event]), [['info', 'CONTENT_SCRIPT_BOOTSTRAP_EXPECTED_TAB_CLOSE']]);
  assert.equal(logs[0].details.phase, 'inject');
  pass('native inject-close race is reclassified as one neutral expected-close event');

  // The close-intent state exists before tabs.remove/onRemoved has finished. It must
  // already be sufficient to suppress the same error cascade.
  logs.length = 0;
  ctx.expectedControlledTabCloseEntry = async () => ({
    lifecycleState: 'active',
    goneReason: null,
    closeIntentReason: 'renewal-target-published',
    role: 'renewal-target',
    managed: false,
    owner: { renewalId: 'renewal-2' }
  });
  await assert.rejects(() => ctx.rethrow(88, Date.now() - 5, 'handshake'), error => error?.code === 'KR_TAB_EXPECTED_CLOSED');
  assert.equal(logs[0].details.goneReason, 'renewal-target-published');
  assert.equal(logs[0].details.phase, 'handshake');
  pass('close intent is enough to neutralize a bootstrap race before tombstone finalization');

  console.log(`${n}/8 PASS`);
})().catch(error => { console.error(error.stack || error); process.exit(1); });
