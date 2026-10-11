'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = process.env.KR_ROOT ? path.resolve(process.env.KR_ROOT) : path.resolve(__dirname, '..');
const controller = fs.readFileSync(path.join(root, 'bulk-inventory-controller.js'), 'utf8');
const reconciliation = fs.readFileSync(path.join(root, 'src/background/services/bulk-reconciliation-service.js'), 'utf8');
const bg = [controller, reconciliation].join('\n');
const runner = fs.readFileSync(path.join(root, 'inventory-runner.js'), 'utf8');
const P = require(path.join(root, 'my-ads-readiness.js'));
let pass = 0;
const ok = name => { pass += 1; console.log('PASS ' + name); };

{
  const transient = P.evaluateMyAdsReadiness({
    isMyAdsPage:true,isProjectsTab:true,currentPage:1,expectedOnline:0,listingCount:0,profileName:'Alice',hasNext:false
  }, {expectedOnline:9, expectedProfileName:'Alice'});
  assert.equal(transient.state, 'waiting');
  ok('historical reconciliation 0-vs-N race remains classified as semantic waiting');

  const realEmpty = P.evaluateMyAdsReadiness({
    isMyAdsPage:true,isProjectsTab:true,currentPage:1,expectedOnline:0,listingCount:0,profileName:'Alice',hasNext:false
  }, {expectedOnline:0, expectedProfileName:'Alice'});
  assert.equal(realEmpty.state, 'ready');
  ok('genuinely empty expected inventory remains semantically valid');

  const wrongPage = P.evaluateMyAdsReadiness({
    isMyAdsPage:true,isProjectsTab:true,currentPage:2,expectedOnline:9,listingCount:9,profileName:'Alice',hasNext:false
  }, {expectedOnline:9, expectedProfileName:'Alice'});
  assert.equal(wrongPage.state, 'invalid');
  ok('wrong page remains a terminal semantic failure');
}

assert.doesNotMatch(bg, /waitForFreshReconciliationSourceStatus/);
assert.match(bg, /type:\s*'WAIT_FOR_MY_ADS_READY'/);
assert.match(bg, /expectedOnline:\s*Number\(state\.expectedTotal \|\| 0\)/);
ok('reconciliation no longer owns a local 500-ms readiness polling patch');

const start = reconciliation.indexOf('async function prepareFreshBulkReconciliationSource');
const end = reconciliation.indexOf('return Object.freeze', start);
const block = reconciliation.slice(start, end);
assert.match(block, /START_BULK_RECONCILIATION_SCAN'[\s\S]{0,200}readySnapshot:\s*status/);
assert.match(runner, /runLoop\(state, message\.readySnapshot \|\| null\)/);
ok('the same verified readiness snapshot is handed from background into reconciliation start');

assert.match(runner, /Number\(lastSnapshot\.expectedOnline\) === 0/);
assert.match(runner, /MY_ADS_ZERO_STABILITY_MS/);
ok('zero inventory is stabilized so an early transient zero cannot immediately become authoritative');

assert.match(block, /error\?\.code === 'KR_MY_ADS_INVALID'\) break/);
assert.match(block, /PLATFORM_ACCESS_RESTRICTION_ERROR_CODE/);
ok('semantic invalidity and platform safety remain fail-closed and are not waited away');

console.log(`v1.20.7 reconciliation race guarantee preserved by v1.20.9 architecture: ${pass}/7 PASS`);
