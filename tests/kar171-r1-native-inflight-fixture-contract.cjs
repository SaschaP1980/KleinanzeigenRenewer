// KAR-171: permanent source safety contract for the isolated, real-Chromium
// mid-query service-worker termination test. Actual MV3 execution is verified
// independently by the dedicated hosted Python/Playwright job.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const script=fs.readFileSync('tests/e2e/kar171_r1_inflight_mv3_probe.py','utf8');
const scanner=fs.readFileSync('src/background/services/remote-delete-replacement-service.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
const npm=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.match(npm.scripts['test:r1-mv3-inflight'],/python3 tests\/e2e\/kar171_r1_inflight_mv3_probe\.py/);
test('test-only fixture loads unmodified real R1 service, no remote site grants',()=>{
 assert.match(script,/shutil\.copy2\(PRODUCTION_SCANNER,/);
 assert.match(script,/importScripts\('remote-delete-replacement-service\.js'\)/);
 assert.match(script,/verifyPhase4RemoteOutcomeFresh\(receipt\)/);
 assert.match(script,/"permissions": \["storage"\]/);
 assert.match(script,/and not manifest\.get\("host_permissions"\)/);
 assert.match(script,/and not manifest\.get\("content_scripts"\)/);
 assert.doesNotMatch(script,/https:\/\/(?:www\.)?kleinanzeigen\.de/);
 assert.match(scanner,/verifyPhase4RemoteOutcomeFresh/);
 assert.equal(manifest.version,'1.25.21');
});
test('real worker target closure occurs ONLY after source read is in flight',()=>{
 const signal=script.indexOf('page.wait_for_function');
 const close=script.indexOf('cdp.send("Target.closeTarget"');
 assert.ok(signal>0&&close>signal);
 assert.match(script,/SOURCE_QUERY_ACKED_PENDING/);
 assert.match(script,/new_epoch != epoch1/);
 assert.match(script,/genuine_mv3_termination_and_new_worker_generation/);
});
test('restarted worker must fail stale result, then perform fresh source and target checks',()=>{
 assert.match(script,/mode="target-absent"/);
 assert.match(script,/REMOTE_UNVERIFIED/);
 assert.match(script,/mode="ok"/);
 assert.match(script,/REMOTE_VERIFIED/);
 assert.match(script,/count\("VERIFY_OWN_AD_ABSENT_BY_ID"\)/);
 assert.match(script,/count\("FIND_OWN_AD_BY_ID"\)/);
 assert.match(script,/mode="account-change"/);
 assert.match(script,/late_account_drift_denied_without_mutation/);
 assert.match(script,/require\(end == baseline,/);
});
test('fixture grants neither browser website host privileges nor update authority',()=>{
 assert.match(script,/ownerNativeScan": False/);
 assert.match(script,/r1Accepted": False/);
 assert.match(script,/eligibleForLease": False/);
 assert.doesNotMatch(script,/sendTabRequestWithBootstrap.*DELETE_OWN_AD_BY_ID/);
 assert.doesNotMatch(script,/chrome\.runtime\.reload\(/);
 assert.doesNotMatch(script,/connectNative\(/);
 assert.doesNotMatch(script,/chrome\.tabs\.(?:create|remove|update)\(/);
});
test('a target-query interruption is independently proven and cannot replay stale source success',()=>{
 assert.match(script,/mode==='hold-target'/);
 assert.match(script,/TARGET_QUERY_ACKED_PENDING/);
 assert.match(script,/msg\("hold", mode="target"/);
 assert.match(script,/target_pending_stage_proven/);
 assert.match(script,/second_mv3_termination_during_target_query/);
 assert.match(script,/post_target_interrupt_replay_denied/);
 assert.match(script,/post_target_interrupt_fresh_source_target_verified/);
 assert.match(script,/target_epoch != source_epoch/);
});

test('independent extension receiver ACK is required before real worker termination',()=>{
 // The original fixture parked a promise INSIDE the worker. That alone does
 // not prove another browser context received a query. This regression
 // requires an independent, persisted, non-authorizing content receipt.
 assert.match(script,/synthetic-receiver\.html/);
 assert.match(script,/synthetic-receiver\.js/);
 assert.match(script,/TESTONLY_REMOTE_QUERY/);
 assert.match(script,/SOURCE_QUERY_ACKED_PENDING/);
 assert.match(script,/TARGET_QUERY_ACKED_PENDING/);
 assert.match(script,/receiverPage\.goto/);
 assert.match(script,/independent_receiver_ack_source_and_target/);
 assert.match(script,/receiverAckSource/);
 assert.match(script,/receiverAckTarget/);
 assert.match(script,/kind:'source'/);
 assert.match(script,/kind:'target'/);
 assert.match(script,/ownerNativeScan": False/);
 assert.doesNotMatch(script,/https:\/\/(?:www\.)?kleinanzeigen\.de/);
});
