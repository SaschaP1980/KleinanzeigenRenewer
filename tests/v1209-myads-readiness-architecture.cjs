'use strict';
const fs = require('fs');
const assert = require('assert');

const read = name => fs.readFileSync(name, 'utf8');
const routerBg = read('background.js');
const bg = [routerBg, read('bulk-inventory-controller.js'), read('src/background/services/bulk-reconciliation-service.js')].join('\n');
const app = read('app.js');
const capture = read('inventory-capture-controller.js');
const appCapture = app + '\n' + capture;
const runner = read('inventory-runner.js');
const manifest = JSON.parse(read('manifest.json'));

assert.ok(fs.existsSync('my-ads-readiness.js'), 'central MyAds readiness module must exist');
const policy = require('../my-ads-readiness.js');

let r = policy.evaluateMyAdsReadiness({ isMyAdsPage:true, isProjectsTab:true, currentPage:1, profileName:'Alice', expectedOnline:null, listingCount:0 }, { expectedProfileName:'Alice' });
assert.equal(r.state, 'waiting', 'unknown online count must remain waiting');
r = policy.evaluateMyAdsReadiness({ isMyAdsPage:true, isProjectsTab:true, currentPage:1, profileName:'Alice', expectedOnline:0, listingCount:0 }, { expectedProfileName:'Alice' });
assert.equal(r.state, 'ready', 'explicit zero is a valid candidate');
r = policy.evaluateMyAdsReadiness({ isMyAdsPage:true, isProjectsTab:true, currentPage:1, profileName:'Bob', expectedOnline:9, listingCount:9 }, { expectedProfileName:'Alice' });
assert.equal(r.state, 'invalid', 'wrong profile must fail immediately');
r = policy.evaluateMyAdsReadiness({ isMyAdsPage:true, isProjectsTab:true, currentPage:2, profileName:'Alice', expectedOnline:9, listingCount:9 }, { expectedProfileName:'Alice' });
assert.equal(r.state, 'invalid', 'wrong page must fail immediately');
r = policy.evaluateMyAdsReadiness({ isMyAdsPage:true, isProjectsTab:true, currentPage:1, profileName:'Alice', expectedOnline:0, listingCount:0 }, { expectedProfileName:'Alice', expectedOnline:9 });
assert.equal(r.state, 'waiting', 'transient remote count mismatch must wait within the bounded readiness window');

const scripts = manifest.content_scripts?.[0]?.js || [];
assert.ok(scripts.includes('src/shared/my-ads-readiness.js'), 'content must load central readiness policy');
assert.match(routerBg, /importScripts\([^\n]*"\.\.\/shared\/my-ads-readiness\.js"/, 'background must load central readiness policy');
assert.match(runner, /WAIT_FOR_MY_ADS_READY/, 'content must expose event-driven semantic readiness');
assert.match(runner, /MutationObserver/, 'semantic readiness must be DOM-event driven');
assert.match(appCapture, /START_BULK_INVENTORY_OPERATION/, 'UI must start one authoritative bulk operation');
assert.doesNotMatch(app, /type:\s*'PREPARE_BULK_INVENTORY_SOURCE'[\s\S]{0,1200}type:\s*'START_BULK_INVENTORY_FRESH'/, 'UI must not split prepare/start into separate workflow operations');
assert.match(bg, /async function startBulkInventoryOperation\(/, 'background must own the full bulk start lifecycle');
assert.doesNotMatch(bg, /async function waitForFreshReconciliationSourceStatus\(/, 'reconciliation must use the common readiness primitive instead of a local polling patch');
assert.match(bg, /type:\s*'WAIT_FOR_MY_ADS_READY'/, 'reconciliation/start must call the common readiness primitive');

console.log('v1.20.9 MyAds readiness architecture contract PASS');
