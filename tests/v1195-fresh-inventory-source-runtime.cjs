const assert = require('node:assert/strict');
const P = require('../my-ads-readiness.js');
let pass = 0;
function check(name, fn) { fn(); pass++; console.log('PASS ' + name); }
check('fresh inventory source recovery is capped at two attempts', () => assert.equal(P.FRESH_SOURCE_MAX_ATTEMPTS, 2));
check('page one with matching account and hydrated cards is accepted', () => {
  const r = P.evaluateMyAdsReadiness({isMyAdsPage:true,isProjectsTab:true,currentPage:1,profileName:'Alice',expectedOnline:1,listingCount:1,hasNext:false}, {expectedProfileName:'Alice'});
  assert.equal(r.state, 'ready');
});
check('page three is rejected even in a fresh tab', () => {
  const r = P.evaluateMyAdsReadiness({isMyAdsPage:true,isProjectsTab:true,currentPage:3,profileName:'Alice',expectedOnline:1,listingCount:1,hasNext:false}, {expectedProfileName:'Alice'});
  assert.equal(r.state, 'invalid'); assert.equal(r.reasonCode, 'wrong-page');
});
check('wrong account is rejected', () => {
  const r = P.evaluateMyAdsReadiness({isMyAdsPage:true,isProjectsTab:true,currentPage:1,profileName:'Bob',expectedOnline:1,listingCount:1,hasNext:false}, {expectedProfileName:'Alice'});
  assert.equal(r.state, 'invalid'); assert.equal(r.reasonCode, 'wrong-profile');
});
check('non-projects page is rejected', () => {
  const r = P.evaluateMyAdsReadiness({isMyAdsPage:true,isProjectsTab:false,currentPage:1,profileName:'Alice',expectedOnline:1,listingCount:1,hasNext:false}, {expectedProfileName:'Alice'});
  assert.equal(r.state, 'invalid'); assert.equal(r.reasonCode, 'not-projects');
});
console.log(`v1.19.5 fresh inventory source public-readiness contract: ${pass}/5 PASS`);
