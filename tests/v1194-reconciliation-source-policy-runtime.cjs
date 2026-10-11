const assert = require('node:assert/strict');
const P = require('../my-ads-readiness.js');
const R = require('../inventory-reconciliation.js');
let pass = 0;
function check(name, fn) { fn(); pass++; console.log('PASS ' + name); }
check('fresh reconciliation source recovery retains the two-attempt cap', () => {
  assert.equal(R.FRESH_RECONCILIATION_SOURCE_MAX_ATTEMPTS, 2);
});
check('valid page-one status is accepted through the shared readiness contract', () => {
  const r = P.evaluateMyAdsReadiness({isMyAdsPage:true,isProjectsTab:true,currentPage:1,expectedOnline:64,listingCount:64,hasNext:false,profileName:'Alice'}, {expectedOnline:64, expectedProfileName:'Alice'});
  assert.equal(r.state, 'ready');
});
check('page three is terminally invalid', () => {
  const r = P.evaluateMyAdsReadiness({isMyAdsPage:true,isProjectsTab:true,currentPage:3,expectedOnline:64,listingCount:64,hasNext:false,profileName:'Alice'}, {expectedOnline:64, expectedProfileName:'Alice'});
  assert.equal(r.state, 'invalid'); assert.equal(r.reasonCode, 'wrong-page');
});
check('wrong account is terminally invalid', () => {
  const r = P.evaluateMyAdsReadiness({isMyAdsPage:true,isProjectsTab:true,currentPage:1,expectedOnline:64,listingCount:64,hasNext:false,profileName:'Bob'}, {expectedOnline:64, expectedProfileName:'Alice'});
  assert.equal(r.state, 'invalid'); assert.equal(r.reasonCode, 'wrong-profile');
});
check('changed online count remains retryable waiting', () => {
  const r = P.evaluateMyAdsReadiness({isMyAdsPage:true,isProjectsTab:true,currentPage:1,expectedOnline:63,listingCount:63,hasNext:false,profileName:'Alice'}, {expectedOnline:64, expectedProfileName:'Alice'});
  assert.equal(r.state, 'waiting'); assert.equal(r.reasonCode, 'online-count-mismatch');
});
console.log(`v1.19.4 reconciliation source public-readiness contract: ${pass}/5 PASS`);
