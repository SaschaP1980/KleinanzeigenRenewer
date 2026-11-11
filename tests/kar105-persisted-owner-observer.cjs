// KAR-105 test-first executable owner evidence characterization.
// Intentional hosted RED: missing new module is not an idle/lease permission.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Observer = require('../src/background/services/persisted-owner-observer.js');
const worker = fs.readFileSync('src/background/background.js', 'utf8');
let checks = 0;
function ok(value, name) { assert.ok(value, name); console.log('PASS KAR105 '+name); checks++; }
function storage(localValue = {}, sessionValue = {}) {
  const mutations = [];
  let localFailure = false, sessionFailure = false;
  return {
    mutations,
    local: {
      async get(keys) {
        if (localFailure) throw Error('unavailable local storage');
        assert.ok(keys===null || Array.isArray(keys));
        const names=keys===null?Object.keys(localValue):keys;
        return Object.fromEntries(names.filter(k=>Object.prototype.hasOwnProperty.call(localValue,k)).map(k=>[k,structuredClone(localValue[k])]));
      },
      async set(...a) { mutations.push(['local-set',a]); throw Error('observer must be read only'); },
      async remove(...a) { mutations.push(['local-remove',a]); throw Error('observer must be read only'); }
    },
    session: {
      async get(keys) {
        if (sessionFailure) throw Error('unavailable session storage');
        assert.equal(Array.isArray(keys), true);
        return Object.fromEntries(keys.filter(k=>Object.prototype.hasOwnProperty.call(sessionValue,k)).map(k=>[k,structuredClone(sessionValue[k])]));
      },
      async set(...a) { mutations.push(['session-set',a]); throw Error('observer must be read only'); }
    },
    failLocal(v=true) {localFailure=v;},
    failSession(v=true) {sessionFailure=v;}
  };
}
function create(db) { return Observer.create({storageLocal:db.local,storageSession:db.session, clock:()=>12000}); }
async function test() {
  const expected=['bulkInventory','bulkReconciliation','renewal','massRenewal','templateFill','archiveInsertion','insertionLock'];
  const db=storage({
    bulkInventoryRun:{status:'running',runId:'bulk-one',profileId:'profile-one'},
    renewalSessionsV1:{one:{status:'submitted',stage:'publish-submitted',profileId:'profile-one'}},
    massRenewalBatchV1:{status:'running',batchId:'batch-one',items:[{status:'queued'}]},
    templateFillSessions:{one:{status:'running',profileId:'profile-one'}},
    archiveInsertionSessionsV1:{one:{status:'waiting',profileId:'profile-one'}}
  },{
    bulkRunRuntimeLeaseV1:{runId:'bulk-one',runtimeEpoch:'old-worker'},
    runtimeEpochV1:'current-worker'
  });
  const observer=create(db), first=await observer.observe();
  ok(first.eligibleForLease === false, 'observation cannot grant lease');
  ok(Object.keys(first.observations).join(',')===expected.join(','), 'exact seven persisted owner observations');
  ok(expected.every(k=>first.observations[k].state==='active'||first.observations[k].state==='unknown'), 'never synthesize idle');
  ok(first.observations.bulkInventory.state==='active', 'running bulk is positively active');
  ok(first.observations.massRenewal.state==='active', 'queued mass batch remains active');
  ok(first.observations.renewal.state==='active', 'submitted renewal remains active');
  ok(first.observations.templateFill.state==='active', 'running fill remains active');
  ok(first.observations.archiveInsertion.state==='active', 'waiting archive cannot be considered idle');
  ok(first.observations.bulkReconciliation.state==='unknown' || first.observations.bulkReconciliation.state==='active', 'reconciliation not declared idle from bulk status alone');
  ok(first.observations.insertionLock.state==='active', 'persisted insertion lock collision remains active');
  ok(db.mutations.length===0, 'raw inspection never mutates storage or triggers expiry');
  const empty=create(storage());
  const noData=await empty.observe();
  ok(expected.every(k=>noData.observations[k].state==='unknown'), 'missing sessions and old worker restart never certify idle');
  const broken=storage({renewalSessionsV1:[]});
  const corrupt=await create(broken).observe();
  ok(corrupt.observations.renewal.state==='unknown', 'invalid persisted shape blocks authority');
  const failed=storage();
  failed.failLocal();
  const unknown=await create(failed).observe();
  ok(expected.every(k=>unknown.observations[k].state==='unknown'), 'failed local read cannot become empty/idle');
  const failedSession=storage();
  failedSession.failSession();
  const sessionUnknown=await create(failedSession).observe();
  ok(sessionUnknown.observations.bulkInventory.state==='unknown', 'session lease read failure blocks bulk authority');
  // P1.3-F2D: real immutable P8 admission receipts survive MV3 worker restart.
  // The production routed bridge tracks all seven persisted owners, whereas
  // autonomous work has specific names in AUTONOMOUS_PERSISTED_OWNER_KINDS.
  const startPrefix='karAtomicAdmissionStartV1_';
  const finishPrefix='karAtomicAdmissionFinishV1_';
  const token='prior_worker_persisted_123456789';
  function receiptDb(operationType) {
    const values={
      [startPrefix+token]:{schema:1,state:'admitted',token,
        operationType,workerInstanceId:'prior-worker',startedAtMs:11000}
    };
    const db=storage(values);
    return {db,values};
  }
  const cases={
    'AUTONOMOUS:bulk-runtime-recovery':['bulkInventory','bulkReconciliation'],
    'AUTONOMOUS:renewal-detached-verify':['renewal','insertionLock'],
    'AUTONOMOUS:mass-renewal-next-item':['massRenewal','insertionLock'],
    'AUTONOMOUS:archive-resume':['archiveInsertion','templateFill','insertionLock'],
    'AUTONOMOUS:renewal-publish-detection':['renewal','templateFill','archiveInsertion','insertionLock'],
    'AUTONOMOUS:tab-lifecycle-update':expected
  };
  for(const [kind,owners] of Object.entries(cases)) {
    const probe=receiptDb(kind);
    const observed=await create(probe.db).observe();
    ok(owners.every(name=>observed.observations[name].state==='active'
       &&observed.observations[name].reason==='DURABLE_ADMISSION_UNFINISHED'),
       'prior-worker '+kind+' attributes durable ACTIVE to exact persisted owners');
    ok(expected.filter(name=>!owners.includes(name)).every(name=>observed.observations[name].state==='unknown'),
       kind+' does not manufacture unrelated owner activity');
    ok(observed.eligibleForLease===false,'actual durable receipt does not grant updater reserve for '+kind);
  }
  const routedReceipt=receiptDb('START_TEMPLATE_FILL');
  const routedObserved=await create(routedReceipt.db).observe();
  ok(expected.every(name=>routedObserved.observations[name].state==='active'
       &&routedObserved.observations[name].reason==='DURABLE_ADMISSION_UNFINISHED'),
     'real routed admission persists all seven owner lifetimes across restart');
  routedReceipt.values[finishPrefix+token]={schema:1,state:'completed',token,
    workerInstanceId:'prior-worker',completedAtMs:11002};
  const finished=await create(routedReceipt.db).observe();
  ok(expected.every(name=>finished.observations[name].state==='unknown'
       &&finished.observations[name].reason==='DURABLE_CALLBACK_SETTLED_REMOTE_UNVERIFIED'),
     'valid finished callback remains UNKNOWN, not independently verified remote completion');
  const unknownReceipt=receiptDb('AUTONOMOUS:new-unclassified-worker');
  const unknownObserved=await create(unknownReceipt.db).observe();
  ok(expected.every(name=>unknownObserved.observations[name].state==='active'),
     'unclassified autonomous operation holds all seven owners ACTIVE');
  const forgedReceipt=receiptDb('AUTONOMOUS:bulk-watchdog');
  forgedReceipt.values[finishPrefix+token]={schema:1,state:'completed',token,
    workerInstanceId:'forged-worker',completedAtMs:11002};
  const forged=await create(forgedReceipt.db).observe();
  ok(expected.every(name=>forged.observations[name].state!=='idle')
     &&forged.observations.bulkInventory.reason==='DURABLE_ADMISSION_UNVERIFIED',
     'mismatched worker completion is never a verified settled receipt');
  const tornReceipt=receiptDb('AUTONOMOUS:mass-renewal-next-item');
  const originalGet=tornReceipt.db.local.get.bind(tornReceipt.db.local);
  let journalReads=0;
  tornReceipt.db.local.get=async keys=>{
    const returned=await originalGet(keys);
    if(keys===null&&++journalReads===1) {
      tornReceipt.values[finishPrefix+token]={schema:1,state:'completed',token,
        workerInstanceId:'prior-worker',completedAtMs:11002};
    }
    return returned;
  };
  const torn=await create(tornReceipt.db).observe();
  ok(journalReads===2&&torn.observations.massRenewal.state==='unknown'
     &&torn.observations.massRenewal.reason==='DURABLE_ADMISSION_UNVERIFIED',
     'changed full journal between independent reads fails closed');
  ok(tornReceipt.db.mutations.length===0&&routedReceipt.db.mutations.length===0,
     'persisted completion attribution is strictly read-only');
  // Cross-check every production autonomous mapping instead of relying only on
  // a second hand-maintained candidate table.
  const vm=require('node:vm');
  const declaration=worker.match(/const AUTONOMOUS_PERSISTED_OWNER_KINDS = Object\.freeze\((\{[\s\S]*?\})\);/);
  ok(Boolean(declaration),'real production autonomous owner map is auditable');
  const actual=vm.runInNewContext('('+declaration[1]+')',Object.create(null));
  const source=fs.readFileSync('src/background/services/persisted-owner-observer.js','utf8');
  const persistedMap=source.match(/const AUTONOMOUS_RECEIPT_OWNERS = Object\.freeze\((\{[\s\S]*?\})\);/);
  ok(Boolean(persistedMap),'persisted observer declares exact auditable journal operation map');
  const expectedMap=vm.runInNewContext('('+persistedMap[1]+')',Object.create(null));
  ok(JSON.stringify(actual)===JSON.stringify(expectedMap),
     'all production autonomous persisted owner mappings equal receipt attribution map');
  // KAR-99 F2E2: independent readback of the actual existing remote outcome
  // journals. These are durable source records, not a synthetic IDLE proof.
  const phaseIntentKey='karPhase4UncertainAttemptV1_renewalA_attemptA';
  const phaseResolvedKey='karPhase4VerifiedResolutionV1_renewalA_attemptA';
  const publishIntentKey='karAutoPublishIntentV1_fillA_attemptA';
  const publishResolvedKey='karAutoPublishVerifiedResolutionV1_fillA_attemptA';
  function remoteRows(profileId='profile-one') {
    return {
      activeDetectedProfileV1:{profileId:'profile-one'},
      selectedInventoryProfileV1:{profileId:'profile-one'},
      [phaseIntentKey]:{schema:1,state:'outcome-unverified',renewalId:'renewalA',
        attemptId:'attemptA',workerInstanceId:'old-worker',profileId,
        sourceAdId:'123',newAdId:'456',createdAtMs:1000},
      [phaseResolvedKey]:{schema:1,state:'resolved-confirmed',renewalId:'renewalA',
        attemptId:'attemptA',workerInstanceId:'old-worker',profileId,
        sourceAdId:'123',newAdId:'456',
        sourceEvidence:'not-in-my-ads-full-pagination-scan',
        targetEvidence:'found-in-my-ads-full-pagination-scan',
        sourcePagesScanned:2,targetPagesScanned:2,targetFoundPage:1,verifiedAtMs:1500},
      [publishIntentKey]:{schema:1,state:'outcome-unverified',fillId:'fillA',
        workflowId:'renewalA',attemptId:'attemptA',workerInstanceId:'old-worker',
        kind:'renewal',profileId,sourceAdId:'123',targetTabId:10,createdAtMs:1000},
      [publishResolvedKey]:{schema:1,state:'resolved-confirmed',fillId:'fillA',
        workflowId:'renewalA',attemptId:'attemptA',kind:'renewal',profileId,
        sourceAdId:'123',targetTabId:10,newAdId:'456',targetPresent:true,
        targetEvidence:'found-in-my-ads-full-pagination-scan',
        targetPagesScanned:2,targetFoundPage:1,verifiedAtMs:1500}
    };
  }
  const sameRemote=await create(storage(remoteRows())).observe();
  ok(sameRemote.observations.renewal.state==='unknown'
    &&sameRemote.eligibleForLease===false,
    'matching old-worker verified remote outcomes never create positive owner IDLE');
  const foreignRemote=await create(storage(remoteRows('different-profile'))).observe();
  ok(foreignRemote.observations.renewal.reason==='PHASE4_JOURNAL_PROFILE_MISMATCH'
    &&foreignRemote.observations.templateFill.reason==='PUBLISH_INTENT_PROFILE_MISMATCH',
    'independent stored profile reconciliation rejects historical foreign-account outcomes');
  const tornRows=remoteRows();
  const tornDb=storage(tornRows);
  const tornGet=tornDb.local.get.bind(tornDb.local);
  let remoteReads=0;
  tornDb.local.get=async keys=>{
    const snapshot=await tornGet(keys);
    if(keys===null && ++remoteReads===1)
      tornRows[publishResolvedKey].newAdId='789';
    return snapshot;
  };
  const changedRemote=await create(tornDb).observe();
  ok(remoteReads===2
    &&changedRemote.observations.renewal.reason==='PHASE4_JOURNAL_CHANGED_DURING_READ'
    &&changedRemote.observations.templateFill.reason==='PUBLISH_INTENT_CHANGED_DURING_READ',
    'remote resolution changed between two independent snapshots stays UNKNOWN');
  const profileRows=remoteRows();
  const changedProfileDb=storage(profileRows);
  const profileGet=changedProfileDb.local.get.bind(changedProfileDb.local);
  changedProfileDb.local.get=async keys=>{
    const rows=await profileGet(keys);
    if(Array.isArray(keys)&&keys.includes('selectedInventoryProfileV1')&&
       keys.includes('renewalSessionsV1'))
      profileRows.selectedInventoryProfileV1={profileId:'another-profile'};
    return rows;
  };
  const switchedRemote=await create(changedProfileDb).observe();
  ok(switchedRemote.observations.renewal.reason==='PHASE4_JOURNAL_PROFILE_UNVERIFIED'
    &&switchedRemote.observations.templateFill.reason==='PUBLISH_INTENT_PROFILE_UNVERIFIED',
    'stored profile switch during read never certifies old-worker remote resolution');
  ok(tornDb.mutations.length===0&&changedProfileDb.mutations.length===0,
    'read-only remote resolution reconciliation never mutates journals or profiles');
  const activity=create(storage());
  let finish;
  const pending=activity.track(['massRenewal','insertionLock'],()=>new Promise(resolve=>{finish=resolve;}));
  ok(activity.snapshotInFlight().massRenewal===1 && activity.snapshotInFlight().insertionLock===1,'actual pending async task is tracked for each owner');
  const whileRunning=await activity.observe();
  ok(whileRunning.observations.massRenewal.state==='active','in-flight work cannot be called idle even when persisted state absent');
  finish(true);await pending;
  ok(activity.snapshotInFlight().massRenewal===0&&activity.snapshotInFlight().insertionLock===0,'finally releases counters after success');
  await assert.rejects(activity.track('renewal',async()=>{throw Error('expected work fail');}),/expected work fail/);
  ok(activity.snapshotInFlight().renewal===0,'finally releases counter after exception');
  await assert.rejects(()=>activity.track('notARealOwner',()=>true),/owner/i);
  ok(activity.snapshotInFlight().bulkInventory===0,'unknown owner cannot be tracked as a real owner');
  ok(worker.includes('services/persisted-owner-observer.js'), 'worker imports read-only persisted owner observer');
  ok(worker.includes('requirePersistedOwnerObserver().track('), 'real admitted worker tasks are instrumented with in-flight tracker');
  ok(!worker.includes('getOwnerSnapshot: () => requirePersistedOwnerObserver()'), 'observer not wired as trusting lease authority');
  console.log('PASS KAR105 total '+checks);
}
test().catch(error=>{console.error(error);process.exitCode=1;});
