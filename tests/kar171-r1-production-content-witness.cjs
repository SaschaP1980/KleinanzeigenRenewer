// KAR-171 R1: private original-P8-bound content-side in-flight witness.
// It can observe an authenticated read-only request, never authorize an update.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const remote=fs.readFileSync('src/background/services/remote-delete-replacement-service.js','utf8');
const observer=fs.readFileSync('src/background/services/additional-owner-observer.js','utf8');
const runner=fs.readFileSync('src/content/inventory-runner.js','utf8');
const ops=fs.readFileSync('src/content/inventory-delete-operations.js','utf8');
const registry=fs.readFileSync('src/shared/message-contract-registry.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
test('original immutable P8 owner observer is the ONLY private opt-in source',()=>{
 assert.match(observer,/r1PrivateWitnessNonce/);
 assert.match(observer,/verifyFreshPhase4RemoteOutcomeReadOnly\([\s\S]*privateR1Witness/);
 assert.match(observer,/ORIGINAL_ACCOUNT_REMOTE_VERIFIED/);
 assert.match(observer,/r1Accepted:false,eligibleForLease:false/);
 assert.match(observer,/ORIGINAL_PHASE4_VALIDATION_UNAVAILABLE/);
});
test('real scanner forwards nonce only on fresh read-only source/target requests',()=>{
 assert.match(remote,/r1PrivateWitness/);
 assert.match(remote,/onR1ReadOnlyStage/);
 assert.match(remote,/r1ReadOnlyWitness/);
 assert.match(remote,/VERIFY_OWN_AD_ABSENT_BY_ID/);
 assert.match(remote,/FIND_OWN_AD_BY_ID/);
 assert.doesNotMatch(remote,/r1ReadOnlyWitness:[\s\S]{0,500}DELETE_OWN_AD_BY_ID/);
});
test('real content script receives and persists an independent bounded receipt',()=>{
 assert.match(runner,/kar171R1ContentWitnessV1/);
 assert.match(runner,/r1ReadOnlyWitness/);
 assert.match(runner,/state:'received'/);
 assert.match(runner,/state:'settled'/);
 assert.match(runner,/state:'failed'/);
 assert.match(runner,/chrome\.storage\.local\.set/);
 assert.match(runner,/readOnlyPageObserved/);
});
test('authenticated full pagination gives bounded page counts without IDs',()=>{
 assert.match(ops,/onReadOnlyPageObserved/);
 assert.match(ops,/seenAdIds\.size/);
 assert.match(ops,/pages\.length/);
 assert.match(ops,/await onReadOnlyPageObserved/);
});
test('no additional public message, permissions, or update authority',()=>{
 assert.equal(manifest.version,'1.25.21');
 assert.deepEqual(manifest.permissions,
   ['activeTab','storage','unlimitedStorage','scripting','nativeMessaging']);
 assert.doesNotMatch(registry,/KAR171_R1_CONTENT_(?:ACK|UPDATE)/);
 assert.doesNotMatch(runner,/chrome\.runtime\.reload\(/);
 assert.doesNotMatch(runner,/chrome\.storage\.local\.clear\(/);
});
