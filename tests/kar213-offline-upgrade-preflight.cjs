'use strict';
// Synthetic fixtures only. Never read or write a user's Chrome profile.
const test=require('node:test');
const assert=require('node:assert/strict');
const {inspectSnapshot}=require('../scripts/kar213-upgrade-preflight.cjs');
const now=Date.parse('2026-11-26T12:00:00Z'), t=now-1000;
const envelope=(storageLocal={},sourceVersion='1.25.36')=>({schema:1,sourceVersion,capturedAt:new Date(now).toISOString(),storageLocal});
const inspect=s=>inspectSnapshot(s,{nowMs:now});
const P='karAutoPublishIntentV1_', R='karAutoPublishVerifiedResolutionV1_';
const D='karPhase4UncertainAttemptV1_', V='karPhase4VerifiedResolutionV1_';
const S='karAtomicAdmissionStartV1_', F='karAtomicAdmissionFinishV1_';
const intent={schema:1,state:'outcome-unverified',fillId:'fill1',workflowId:'workflow1',attemptId:'attempt1',workerInstanceId:'worker1',profileId:'profile1',kind:'renewal',targetTabId:123,sourceAdId:'100',createdAtMs:t};
const publish={...intent,state:'resolved-confirmed',newAdId:'200',targetPresent:true,targetEvidence:'verified-edit-and-public-listing',targetEditAdId:'200',targetPublicAdId:'200',verifiedAtMs:t+100};
const attempt={schema:1,state:'outcome-unverified',renewalId:'workflow1',attemptId:'attempt2',workerInstanceId:'worker1',profileId:'profile1',sourceAdId:'100',newAdId:'200',createdAtMs:t};
const deletion={...attempt,state:'resolved-confirmed',verifiedAtMs:t+100,sourceEvidence:'not-in-my-ads-full-pagination-scan',sourcePagesScanned:2,targetEvidence:'found-in-my-ads-full-pagination-scan',targetPagesScanned:2,targetFoundPage:1};
const start={schema:1,state:'admitted',token:'token123456789',workerInstanceId:'worker1',operationType:'AUTONOMOUS:renewal-auto-phase4',startedAtMs:t-100};
const finish={schema:1,state:'completed',token:start.token,workerInstanceId:'worker1',completedAtMs:t+200};
const pair={[P+'fill1_attempt1']:intent,[R+'fill1_attempt1']:publish,[D+'workflow1_attempt2']:attempt,[V+'workflow1_attempt2']:deletion,[S+start.token]:start,[F+start.token]:finish};
function blocked(storage,code){const s=envelope(storage);const before=structuredClone(s);const result=inspect(s);assert.equal(result.status,'BLOCKED');assert.ok(result.findings.some(f=>f.code===code),JSON.stringify(result));assert.deepEqual(s,before);return result;}
test('empty known versions and consistent detached historical evidence are reviewable, never activation authorization',()=>{
 for(const version of ['1.23.48','1.25.36','2.0.1.0']) assert.equal(inspect(envelope({},version)).status,'READY_FOR_OFFLINE_REVIEW');
 const x=envelope({...pair,unknownFutureSetting:{opaque:123},trashRetentionDaysV1:'infinite'});
 const before=structuredClone(x), result=inspect(x);
 assert.equal(result.status,'READY_FOR_OFFLINE_REVIEW');
 assert.deepEqual(result.receipts,{publish:1,phase4:1,admission:1});
 assert.equal(result.activationAuthorized,false);
 assert.deepEqual(x,before);
 assert.equal(inspect(x).status,result.status);
});
test('lone attempts, orphan resolutions, and malformed or future receipts block without sessions',()=>{
 blocked({[P+'fill1_attempt1']:intent},'PUBLISH_UNRESOLVED');
 blocked({[R+'fill1_attempt1']:publish},'PUBLISH_ORPHAN_RESOLUTION');
 blocked({[D+'workflow1_attempt2']:attempt},'PHASE4_UNRESOLVED');
 blocked({[V+'workflow1_attempt2']:deletion},'PHASE4_ORPHAN_RESOLUTION');
 blocked({[S+start.token]:start},'ADMISSION_UNRESOLVED');
 blocked({[F+start.token]:finish},'ADMISSION_ORPHAN_RESOLUTION');
 blocked({...pair,[P+'fill1_attempt1']:{...intent,createdAtMs:now+1}},'PUBLISH_INVALID');
 blocked({...pair,[F+start.token]:{...finish,completedAtMs:now+1}},'ADMISSION_INVALID_RESOLUTION');
});
test('a paired row is not enough: IDs, times and independent target/source evidence must match',()=>{
 blocked({...pair,[R+'fill1_attempt1']:{...publish,profileId:'other'}},'PUBLISH_INVALID_RESOLUTION');
 blocked({...pair,[R+'fill1_attempt1']:{...publish,targetPublicAdId:'999'}},'PUBLISH_INVALID_RESOLUTION');
 blocked({...pair,[V+'workflow1_attempt2']:{...deletion,sourcePagesScanned:0}},'PHASE4_INVALID_RESOLUTION');
 blocked({...pair,[V+'workflow1_attempt2']:{...deletion,newAdId:'999'}},'PHASE4_INVALID_RESOLUTION');
 blocked({...pair,[F+start.token]:{...finish,workerInstanceId:'other'}},'ADMISSION_INVALID_RESOLUTION');
 blocked({...pair,[D+'workflow1_attempt2']:{...attempt,admissionToken:'unknown-token-12345'}},'PHASE4_INVALID_ADMISSION_LINK');
});
test('duplicate publish attempts and unrecognized receipt families fail closed',()=>{
 const i={...intent,attemptId:'other'},r={...publish,attemptId:'other'};
 blocked({...pair,[P+'fill1_other']:i,[R+'fill1_other']:r},'PUBLISH_DUPLICATE_ATTEMPT');
 blocked({karPhase4UnknownV2_x:{}},'UNKNOWN_RECEIPT_KEY');
});
test('unfinished workflows and uncertain terminal-looking stages cannot pass',()=>{
 blocked({renewalSessionsV1:{r:{renewalId:'r',status:'verified',stage:'source-delete-outcome-unverified'}}},'RENEWAL_NOT_SETTLED');
 blocked({templateFillSessions:{f:{fillId:'f',status:'complete',stage:'template-only-complete'}}},'FILL_NOT_SETTLED');
 blocked({archiveInsertionSessionsV1:{a:{archiveInsertionId:'a',status:'error',stage:'publish-intent-blocked'}}},'ARCHIVE_NOT_SETTLED');
 blocked({massRenewalBatchV1:{batchId:'b',status:'complete',items:[{status:'needs-review'}]}},'MASS_NOT_SETTLED');
 blocked({bulkInventoryRun:{status:'running'}},'BULK_NOT_SETTLED');
 blocked({renewalSessionsV1:null},'RENEWAL_INVALID_MAP');
});
test('historical completed or clearly unstarted cancelled workflows can pass',()=>{
 const s={renewalSessionsV1:{r:{renewalId:'r',status:'replaced',stage:'complete',sourceAdId:'100',newAdId:'200'}},archiveInsertionSessionsV1:{a:{archiveInsertionId:'a',status:'complete',stage:'complete',newAdId:'201'}},templateFillSessions:{f:{fillId:'f',status:'complete',stage:'new-id-confirmed',renewalId:'r',newAdId:'200'}},massRenewalBatchV1:{batchId:'b',status:'complete',currentIndex:null,items:[{status:'success',stage:'complete'}]},bulkInventoryRun:{status:'complete',stage:'finished'}};
 assert.equal(inspect(envelope(s)).status,'READY_FOR_OFFLINE_REVIEW');
 blocked({...s,templateFillSessions:{f:{...s.templateFillSessions.f,renewalId:'missing'}}},'FILL_NOT_SETTLED');
 blocked({renewalSessionsV1:{r:{renewalId:'r',status:'cancelled',stage:'target-tab-create-failed',newAdId:'200'}}},'RENEWAL_NOT_SETTLED');
});
test('unreleased or invalid updater fence and malformed retention settings block',()=>{
 blocked({nativeUpdateWorkflowFenceV1:{state:'held'}},'FENCE_NOT_RELEASED');
 const fence={schema:1,state:'released',transactionId:'tx',profileId:'profile1',workerGeneration:'worker',token:'token',createdAtMs:t-10,expiresAtMs:now+1000,cancelledAtMs:t,releasedAtMs:t+1};
 assert.equal(inspect(envelope({nativeUpdateWorkflowFenceV1:fence})).status,'READY_FOR_OFFLINE_REVIEW');
 blocked({nativeUpdateWorkflowFenceV1:{...fence,releasedAtMs:t-20}},'FENCE_NOT_RELEASED');
 blocked({trashRetentionDaysV1:0},'RETENTION_UNKNOWN');
 blocked({trashRetentionRevisionV1:'rev'},'RETENTION_UNKNOWN');
});
test('invalid envelope or unverified version blocks and output does not leak receipt IDs or payloads',()=>{
 assert.equal(inspect({}).status,'BLOCKED');
 assert.equal(inspect(envelope({},'1.24.0')).status,'BLOCKED');
 const out=JSON.stringify(blocked({[P+'fill1_attempt1']:intent},'PUBLISH_UNRESOLVED'));
 for(const value of ['fill1','profile1','workflow1','attempt1','worker1']) assert.ok(!out.includes(value));
});
