const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = require('./v12212-source-surface.cjs');
let n = 0; const pass = label => { n += 1; console.log(`PASS ${label}`); };

function extract(name, nextMarker) {
  const start = src.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} missing`);
  const end = nextMarker ? src.indexOf(nextMarker, start) : -1;
  assert.ok(end > start, `end marker missing for ${name}`);
  return src.slice(start, end);
}
function load(code, extra = {}) {
  const context = { URL, console, ...extra, globalThis: null };
  context.globalThis = context; vm.createContext(context); vm.runInContext(code, context); return context;
}

{
  const code = extract('isKleinanzeigenTabUrl', '\n\nasync function reactivateDiscardedTabs');
  const ctx = load(`${code}; globalThis.fn=isKleinanzeigenTabUrl;`);
  assert.equal(ctx.fn('https://www.kleinanzeigen.de/m-meine-anzeigen.html'), true);
  assert.equal(ctx.fn('https://kleinanzeigen.de/s-anzeige/x/1-1-1'), true);
  assert.equal(ctx.fn('https://example.com/'), false);
  assert.equal(ctx.fn('http://www.kleinanzeigen.de/'), false);
  pass('managed-tab URL guard accepts only HTTPS Kleinanzeigen hosts');
}

{
  const code = extract('validKleinanzeigenTab', '\n\nfunction contentBootstrapNeedsNavigationWait');
  const ctx = load(`${code}; globalThis.fn=validKleinanzeigenTab;`);
  assert.equal(ctx.fn({ url:'https://www.kleinanzeigen.de/x' }), true);
  assert.equal(ctx.fn({ url:'https://sub.kleinanzeigen.de/x' }), true);
  assert.equal(ctx.fn({ url:'https://evil.example/x' }), false);
  pass('content target validation stays fail-closed outside Kleinanzeigen HTTPS');
}

{
  const code = extract('contentBootstrapNeedsNavigationWait', '\n\nasync function waitForContentBootstrapNavigation');
  const ctx = load(`${code}; globalThis.fn=contentBootstrapNeedsNavigationWait;`);
  assert.equal(ctx.fn({status:'loading'}), true);
  assert.equal(ctx.fn({status:'complete'}), false);
  assert.equal(ctx.fn({}), false);
  pass('content bootstrap defers only while tab navigation is loading');
}

{
  const code = extract('isExpectedControlledTabCloseReason', '\n\nasync function expectedControlledTabCloseEntry');
  const ctx = load(`${code}; globalThis.fn=isExpectedControlledTabCloseReason;`);
  for (const reason of ['renewal-target-published','managed-worker-closed','bulk-worker-saved','inventory-refresh-worker-finished','workflow-close']) assert.equal(ctx.fn(reason), true, reason);
  for (const reason of ['tabs.onRemoved','user-closed','',null]) assert.equal(ctx.fn(reason), false, String(reason));
  pass('controlled-close classifier preserves expected workflow close reasons only');
}

{
  const match = src.match(/const PLATFORM_REMOTE_ACTION_TYPES = new Set\((\[[\s\S]*?\])\);/);
  assert.ok(match);
  const types = vm.runInNewContext(match[1]);
  for (const type of ['ENSURE_CONTENT_CONNECTION','PROBE_LIVE_KLEINANZEIGEN_ACCOUNT','START_BULK_INVENTORY_OPERATION','START_MASS_RENEWAL_BATCH','START_TEMPLATE_FILL','START_ARCHIVE_INSERTION']) assert.ok(types.includes(type), type);
  assert.ok(!types.includes('LIST_INVENTORIES'));
  pass('platform request gate covers remote automation but not local inventory reads');
}

{
  const roles = { BULK_WORKER:'bulk-worker', RENEWAL_WORKER:'renewal-worker', ARCHIVE_WORKER:'archive-worker', WORKER:'worker' };
  const states = { GONE:'gone' };
  const code = extract('registryEntryIsOwnedWorker', '\n\nasync function observeTabLifecycleUpdate');
  const ctx = load(`${code}; globalThis.fn=registryEntryIsOwnedWorker;`, { TAB_ROLES: roles, TAB_STATES: states });
  assert.equal(ctx.fn({ lifecycleState:'active', managed:true, role:'x', owner:{ownerId:'1'} }), true);
  assert.equal(ctx.fn({ lifecycleState:'active', managed:false, role:'bulk-worker', owner:{operationId:'op'} }), true);
  assert.equal(ctx.fn({ lifecycleState:'active', managed:true, role:'x', owner:{} }), false);
  assert.equal(ctx.fn({ lifecycleState:'gone', managed:true, role:'x', owner:{ownerId:'1'} }), false);
  pass('discarded-worker recovery remains limited to live registry-owned workers');
}

console.log(`${n}/6 PASS v1.22.12 pre-refactor runtime`);
