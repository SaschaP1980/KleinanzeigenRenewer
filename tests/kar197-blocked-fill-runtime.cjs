// KAR-197: concrete background content-to-archive/renewal status propagation
// against the real updateTemplateFillSession function, account-free.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/background/controllers/template-fill-controller.js','utf8');
const start=source.indexOf('async function updateTemplateFillSession');
const end=source.indexOf('\nasync function terminalizeTemplateFillOnPlatformError',start);
assert.ok(start>0&&end>start,'must execute real source function');

function harness(type='archive',initialStage='auto-publish-ready'){
  const fill={fillId:'syntheticFill',targetTabId:42,status:'running',stage:initialStage,
    archiveInsertionId:type==='archive'?'syntheticArchive':null,
    renewalId:type==='renewal'?'syntheticRenewal':null,sourceAdId:type==='renewal'?'123':'',
    result:{complete:true,issues:[],schemaPreflight:{verified:true,categoryId:'88',currentFingerprint:'f'.repeat(64)}}};
  let fills={syntheticFill:fill};
  const archive={archiveInsertionId:'syntheticArchive',fillId:fill.fillId,status:'filling',
    stage:'auto-publish-ready',sourceAdId:'',targetTabId:42,renewalMode:'fast',newAdId:''};
  const renewal={renewalId:'syntheticRenewal',fillId:fill.fillId,status:'draft',
    stage:'auto-publish-ready',sourceAdId:'123',targetTabId:42,newAdId:null};
  let archivePersist=0,renewalPersist=0,unwantedRetry=0;
  const sandbox={
    withTemplateFillMutation:async callback=>callback(),
    readFillSessions:async()=>fills,
    writeFillSessions:async next=>{fills=structuredClone(next);},
    logDiagnostic:async()=>{},
    TERMINAL_TEMPLATE_FILL_STATUSES:new Set(['complete','needs-review','error']),
    isTransientTemplateFillProgress:()=>false,
    sessionCorrelationContext:()=>({}),
    readArchiveInsertionSessions:async()=>({syntheticArchive:archive}),
    persistArchiveInsertionSession:async()=>{archivePersist++;},
    readRenewalSessions:async()=>({syntheticRenewal:renewal}),
    persistRenewalSession:async()=>{renewalPersist++;},
    evictTemplateImageTransfersForFill:()=>{},
    broadcastInventoryChanged:()=>{},
    recordRenewalPhaseAttemptError:()=>{unwantedRetry++;},
    canRetryRenewalPhase1:()=>{unwantedRetry++;return true;},
    restartRenewalPhase1Attempt:()=>{unwantedRetry++;},
    queueMicrotaskFn:fn=>fn(),
    withAutonomousAdmission:async()=>{unwantedRetry++;},
    URL,Date,console
  };
  vm.runInNewContext(source.slice(start,end)+'\nthis.update=updateTemplateFillSession;',sandbox);
  return {
    sandbox,archive,renewal,
    get fill(){return fills.syntheticFill;},
    get archivePersist(){return archivePersist;},
    get renewalPersist(){return renewalPersist;},
    get unwantedRetry(){return unwantedRetry;},
    async blocked(){
      return sandbox.update({fillId:'syntheticFill',status:'needs-review',
        stage:'publish-intent-blocked',publishBlockReason:'KR_PUBLISH_INTENT_ATOMIC_BUSY'}, {tab:{id:42}});
    }
  };
}

test('KAR-197 verified two-image ZIP fill becomes a durable publish-blocked archive',async()=>{
  const h=harness('archive');
  const result=await h.blocked();
  assert.equal(result.status,'needs-review');
  assert.equal(result.stage,'publish-intent-blocked');
  assert.equal(h.fill.result.complete,true,'verified template form result is retained');
  assert.equal(h.fill.result.schemaPreflight.verified,true,'schema proof is retained');
  assert.equal(h.fill.publishBlockReason,'KR_PUBLISH_INTENT_ATOMIC_BUSY');
  assert.equal(h.archive.status,'publish-blocked');
  assert.equal(h.archive.remoteVerificationRequired,true);
  assert.equal(h.archive.stage,'publish-intent-blocked');
  assert.equal(h.archive.lastError,'KR_PUBLISH_INTENT_ATOMIC_BUSY');
  assert.equal(h.archivePersist,1);
  const late=await h.sandbox.update({fillId:'syntheticFill',status:'running',
    stage:'auto-publish-ready'}, {tab:{id:42}});
  assert.equal(late.staleUpdateIgnored,true);
  assert.equal(h.fill.stage,'publish-intent-blocked');
  assert.equal(h.archive.status,'publish-blocked');
});

test('KAR-197 subsequent publish-submitted evidence cannot be downgraded by a stale block',async()=>{
  const h=harness('archive','publish-submitted');
  const result=await h.blocked();
  assert.equal(result.staleUpdateIgnored,true);
  assert.equal(h.fill.status,'running');
  assert.equal(h.fill.stage,'publish-submitted');
  assert.equal(h.archivePersist,0);
});

test('KAR-197 blocked managed renewal cannot invoke automatic Phase-1 retry',async()=>{
  const h=harness('renewal');
  await h.blocked();
  assert.equal(h.renewal.status,'verification-failed');
  assert.equal(h.renewal.stage,'publish-intent-blocked');
  assert.equal(h.renewal.lastError,'KR_PUBLISH_INTENT_ATOMIC_BUSY');
  assert.equal(h.renewalPersist,1);
  assert.equal(h.unwantedRetry,0,'uncertain publication must never be auto-retried');
});
