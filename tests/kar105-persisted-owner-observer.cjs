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
        assert.equal(Array.isArray(keys), true);
        return Object.fromEntries(keys.filter(k=>Object.prototype.hasOwnProperty.call(localValue,k)).map(k=>[k,structuredClone(localValue[k])]));
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
