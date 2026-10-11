'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = process.env.KR_ROOT ? path.resolve(process.env.KR_ROOT) : path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const P = require(path.join(root, 'my-ads-readiness.js'));
const bg = read('bulk-inventory-controller.js');
const reconciliationSource = read('src/background/services/bulk-reconciliation-service.js');
const runner = read('inventory-runner.js');
let pass = 0;
const ok = name => { pass += 1; console.log('PASS ' + name); };

{
  const unknown = P.evaluateMyAdsReadiness({
    isMyAdsPage:true,isProjectsTab:true,currentPage:1,profileName:'Alice',expectedOnline:null,listingCount:0,hasNext:false
  }, { expectedProfileName:'Alice' });
  assert.equal(unknown.state, 'waiting');
  assert.equal(unknown.reasonCode, 'online-count-pending');
  ok('unknown online count remains unknown and never aliases to zero');

  const explicitZero = P.evaluateMyAdsReadiness({
    isMyAdsPage:true,isProjectsTab:true,currentPage:1,profileName:'Alice',expectedOnline:0,listingCount:0,hasNext:false
  }, { expectedProfileName:'Alice' });
  assert.equal(explicitZero.state, 'ready');
  assert.equal(explicitZero.onlineCount, 0);
  ok('explicit empty inventory is a valid semantic readiness candidate');

  const hydrated = P.evaluateMyAdsReadiness({
    isMyAdsPage:true,isProjectsTab:true,currentPage:1,profileName:'Alice',expectedOnline:9,listingCount:9,hasNext:false
  }, { expectedProfileName:'Alice' });
  assert.equal(hydrated.state, 'ready');
  assert.equal(hydrated.onlineCount, 9);
  ok('matching non-empty count and cards are ready');

  const cardsPending = P.evaluateMyAdsReadiness({
    isMyAdsPage:true,isProjectsTab:true,currentPage:1,profileName:'Alice',expectedOnline:9,listingCount:0,hasNext:false
  }, { expectedProfileName:'Alice' });
  assert.equal(cardsPending.state, 'waiting');
  ok('browser-complete with unhydrated listing cards remains waiting');

  const transientZero = P.evaluateMyAdsReadiness({
    isMyAdsPage:true,isProjectsTab:true,currentPage:1,profileName:'Alice',expectedOnline:0,listingCount:0,hasNext:false
  }, { expectedProfileName:'Alice', expectedOnline:9 });
  assert.equal(transientZero.state, 'waiting');
  assert.equal(transientZero.reasonCode, 'online-count-mismatch');
  ok('reconciliation transient zero remains waiting for expected inventory');

  const wrongProfile = P.evaluateMyAdsReadiness({
    isMyAdsPage:true,isProjectsTab:true,currentPage:1,profileName:'Bob',expectedOnline:9,listingCount:9,hasNext:false
  }, { expectedProfileName:'Alice' });
  assert.equal(wrongProfile.state, 'invalid');
  assert.equal(wrongProfile.reasonCode, 'wrong-profile');
  ok('wrong account is terminally invalid rather than waited away');

  const wrongPage = P.evaluateMyAdsReadiness({
    isMyAdsPage:true,isProjectsTab:true,currentPage:2,profileName:'Alice',expectedOnline:9,listingCount:9,hasNext:false
  }, { expectedProfileName:'Alice' });
  assert.equal(wrongPage.state, 'invalid');
  assert.equal(wrongPage.reasonCode, 'wrong-page');
  ok('wrong page is terminally invalid rather than waited away');

}

assert.match(runner, /async function waitForMyAdsReady\(/);
assert.match(runner, /new Observer\(scheduleCheck\)/);
assert.match(runner, /observer\.observe\(document\.documentElement, \{ childList: true, subtree: true, characterData: true, attributes: true/);
assert.match(runner, /MY_ADS_ZERO_STABILITY_MS/);
assert.match(runner, /setInterval\(scheduleCheck, MY_ADS_SAFETY_RECHECK_MS\)/);
assert.match(runner, /async function startBulkInventoryFromFreshSource[\s\S]*?await waitForMyAdsReady\(\{ expectedProfileName \}\)/);
ok('content readiness is mutation-driven with only bounded safety rechecks and zero stabilization');

assert.doesNotMatch(bg, /async function waitForFreshReconciliationSourceStatus\s*\(/);
const reconciliationStart = reconciliationSource.indexOf('async function prepareFreshBulkReconciliationSource');
const reconciliationEnd = reconciliationSource.indexOf('return Object.freeze', reconciliationStart);
const reconciliation = reconciliationSource.slice(reconciliationStart, reconciliationEnd);
assert.match(reconciliation, /type:\s*'WAIT_FOR_MY_ADS_READY'/);
assert.match(reconciliation, /expectedOnline:\s*Number\(state\.expectedTotal \|\| 0\)/);
assert.match(reconciliation, /START_BULK_RECONCILIATION_SCAN'[\s\S]{0,200}readySnapshot:\s*status/);
assert.match(reconciliation, /error\?\.code === 'KR_MY_ADS_INVALID'\) break/);
ok('reconciliation consumes the same readiness primitive and passes the verified snapshot forward');

const start = bg.indexOf('async function startBulkInventoryOperation');
const end = bg.indexOf('async function bulkSourceWasAutoCreated', start);
assert.ok(start >= 0 && end > start, 'authoritative start operation missing');
const implementation = bg.slice(start, end);

async function startScenario(mode) {
  let nextTab = 300;
  let startCalls = 0;
  const created = [];
  const registered = [];
  const closed = [];
  const diagnostics = [];
  const startMessages = [];
  const context = {
    console,
    globalThis: null,
    crypto: { randomUUID: () => '11111111-1111-4111-8111-111111111111' },
    normalizeProfileName: v => String(v || '').trim(),
    getBulkRunState: async () => null,
    getRenewalConfiguration: async () => ({ renewalMode:'safe' }),
    normalizeRenewalMode: v => v === 'fast' ? 'fast' : 'safe',
    normalizeInventoryScope: v => v === 'all' ? 'all' : 'new-only',
    normalBrowserWindowId: async () => 7,
    FRESH_BULK_SOURCE_MAX_ATTEMPTS: 2,
    assertPlatformAccessAllowed: async () => null,
    createAutomationTab: async opts => { const tab={id:++nextTab,windowId:7,url:opts.url}; created.push(tab); return tab; },
    MY_ADS_PROJECTS_URL: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS',
    registerShadowTab: async (id, role, owner, options) => { registered.push({id,role,owner,options}); return {}; },
    TAB_ROLES: { SOURCE:'source' },
    logDiagnostic: async (level,event,details,meta) => { diagnostics.push({level,event,details,meta}); },
    waitForTabComplete: async () => ({}),
    TAB_LOAD_TIMEOUT_DEFAULT_MS: 30000,
    ensureContentConnection: async () => true,
    sendTabRequestWithBootstrap: async (id,msg) => {
      if (msg.type === 'PAGE_STATUS') return {auth:{loggedIn:true}};
      if (msg.type !== 'START_BULK_INVENTORY_FROM_FRESH_SOURCE') throw new Error('unexpected '+msg.type);
      startCalls += 1;
      startMessages.push({id,msg});
      if (mode === 'invalid') { const e=new Error('wrong profile'); e.code='KR_MY_ADS_INVALID'; throw e; }
      if (mode === 'retry' && startCalls === 1) { const e=new Error('not ready'); e.code='KR_MY_ADS_READINESS_TIMEOUT'; throw e; }
      return {
        operationId: msg.operationId, bulkRunId:'run-1', runId:'run-1', sourceTabId:id,
        profileName:'Alice', currentPage:1, expectedTotal:9, sourceReadinessWaitMs:420
      };
    },
    sessionCorrelationContext: (state, extra={}) => ({operationId:state?.operationId || extra.operationId, ...extra}),
    closeRegistryTab: async (id,reason) => { closed.push({id,reason}); return {}; },
    PLATFORM_ACCESS_RESTRICTION_ERROR_CODE: 'KR_PLATFORM_ACCESS_RESTRICTED',
    String, Number, Math, Error, Promise
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(implementation, context, {filename:'v1209-start-operation.js'});
  let result=null,error=null;
  try { result = await context.startBulkInventoryOperation({expectedProfileName:'Alice', inventoryScope:'all', verificationMode:'fast'}); }
  catch (e) { error=e; }
  return {result,error,created,registered,closed,diagnostics,startMessages};
}

(async () => {
  const success = await startScenario('success');
  assert.ifError(success.error);
  assert.equal(success.created.length, 1);
  assert.equal(success.startMessages.length, 1);
  assert.equal(success.startMessages[0].msg.operationId, '11111111-1111-4111-8111-111111111111');
  assert.equal(success.result.operationId, success.startMessages[0].msg.operationId);
  assert.ok(success.registered.some(x => x.owner.operationId === success.result.operationId));
  assert.ok(success.diagnostics.some(x => x.event === 'BULK_AUTO_SOURCE_READY' && x.details.operationId === success.result.operationId));
  ok('one operationId owns source creation, semantic readiness/start and resulting bulk run');

  const retry = await startScenario('retry');
  assert.ifError(retry.error);
  assert.equal(retry.created.length, 2);
  assert.equal(retry.startMessages.length, 2);
  assert.equal(retry.startMessages[0].msg.operationId, retry.startMessages[1].msg.operationId);
  assert.equal(retry.closed.length, 1);
  ok('readiness timeout may recover with one fresh source while preserving the same operation correlation');

  const invalid = await startScenario('invalid');
  assert.ok(invalid.error);
  assert.equal(invalid.error.code, 'KR_MY_ADS_INVALID');
  assert.equal(invalid.created.length, 1);
  assert.equal(invalid.startMessages.length, 1);
  assert.equal(invalid.closed.length, 1);
  ok('wrong account/page semantic invalidity fails immediately without a second source attempt');

  console.log(`v1.20.9 semantic MyAds readiness: ${pass}/13 PASS`);
})().catch(error => { console.error(error.stack || error); process.exit(1); });
