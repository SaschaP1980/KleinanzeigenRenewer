const fs=require('fs'),assert=require('assert');
assert.ok(fs.existsSync('public-listing-evidence-service.js'),'public-listing-evidence-service.js must exist');
const bg=fs.readFileSync('background.js','utf8');
const bulk=fs.readFileSync('bulk-inventory-controller.js','utf8');
const svc=fs.readFileSync('public-listing-evidence-service.js','utf8');
assert.match(bulk,/KRDeps\??\.register\??\.\('KRBulkInventoryController'/);
assert.match(svc,/KRDeps\??\.register\??\.\('KRPublicListingEvidenceService'/);
assert.match(bg,/public-listing-evidence-service\.js/);
assert.match(bg,/KRDeps\.require\('KRPublicListingEvidenceService'\)/);
for(const name of ['startBulkInventoryOperation','recordBulkRosterPage','finishBulkReconciliation','createBulkEditWorkerTabWithRetry','openBulkWorker','classifyBulkEditWorkerNavigation','resolveBulkWorkerLifecycle','extractSaveBulkWorker','prepareFreshBulkReconciliationSource','finishBulkRun','retryBulkFailure']) {
  assert.ok(bulk.includes(`function ${name}(`)||bulk.includes(`async function ${name}(`),name+' must live in bulk controller');
}
for(const name of ['normalizeKnownPublicAdUrl','publicUrlForInventoryRecord','directPublicUrlForAdId','extractReadOnlyMetadata','deriveListingDateFromEndDate','mergeListingMetadata']) {
  assert.ok(svc.includes(`function ${name}(`)||svc.includes(`async function ${name}(`),name+' must live in public listing evidence service');
}
assert.ok(!/async function startBulkInventoryOperation\([^]*?BULK_AUTO_SOURCE_READY/.test(bg),'background must not own fresh bulk start body');
assert.ok(!/async function retryBulkFailure\([^]*?BULK_INVENTORY_RETRY_SUCCEEDED/.test(bg),'background must not own bulk retry body');
console.log('PASS v1.23.6 bulk/public modularization ownership');
