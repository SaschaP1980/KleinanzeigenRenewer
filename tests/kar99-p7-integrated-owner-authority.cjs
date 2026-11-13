// KAR-99/P7 real owner-specific producers and integrated fifteen-owner activity.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Policy=require('../lib/update-idle-policy.js');
const Additional=require('../src/background/services/additional-owner-observer.js');
const Persisted=require('../src/background/services/persisted-owner-observer.js');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
const bg=fs.readFileSync('src/background/background.js','utf8');
let checks=0;
function ok(value,name){assert.ok(value,name);checks++;console.log('PASS KAR99-P7-AUTH '+name);}
function db(local={},session={}){
  let badLocal=false,badSession=false,reads=0,writes=0;
  const storage=(data,broken)=>({
    async get(keys){reads++;if(broken())throw Error('READ_UNAVAILABLE');
      const selected=keys===null?Object.keys(data):Array.isArray(keys)?keys:[keys];
      return Object.fromEntries(selected.filter(x=>Object.hasOwn(data,x)).map(x=>[x,structuredClone(data[x])]));},
    async set(){writes++;throw Error('READ_ONLY_OBSERVER');}
  });
  return {local:storage(local,()=>badLocal),session:storage(session,()=>badSession),
    breakLocal:()=>{badLocal=true;},breakSession:()=>{badSession=true;},
    get reads(){return reads;},get writes(){return writes;}};
}
const REQUIRED=[...Policy.requiredOwners];
const EXTRA=[...Additional.OWNERS];
const OLD=[...Persisted.OWNERS];
ok(REQUIRED.length===15&&OLD.length===7&&EXTRA.length===8
   &&new Set([...OLD,...EXTRA]).size===15
   &&REQUIRED.every(x=>OLD.includes(x)||EXTRA.includes(x)),
  'exact fifteen-owner registry is partitioned into seven persisted and eight supplemental classes');
function expected(kind,source,names){
  const actual=Additional.ownersForOperation(kind,source);
  assert.deepEqual([...actual],[...names],source+':'+kind);
  ok(true,'specific producer '+source+':'+kind);
}
expected('CAPTURE_SINGLE_INVENTORY','routed',['singleInventory','managedTabs']);
expected('DELETE_TRASH_ENTRY','routed',['trashMutation']);
expected('SET_SELECTED_PROFILE','routed',['profileTransition']);
expected('RECOGNIZE_PROFILE','routed',['accountTransition','profileTransition']);
expected('RESET_ACTIVE_WORKFLOWS','routed',['emergencyRecovery','managedTabs']);
expected('GET_DIAGNOSTIC_EXPORT','routed',['diagnosticExport']);
expected('GET_NATIVE_UPDATE_STATUS','routed',[]);
expected('archive-postpublish-detached','autonomous',['managedTabs']);
expected('trash-purge-boot','autonomous',['trashMutation']);
expected('tab-removed','autonomous',['managedTabs']);
expected('renewal-resume','autonomous',['emergencyRecovery','managedTabs']);
const fallback=Additional.ownersForOperation('FUTURE_UNRECOGNIZED_ROUTE','routed');
ok(fallback.length===8&&EXTRA.every(x=>fallback.includes(x)),
  'unknown future routed operation remains conservatively tracked by all eight');
const unknownAutonomous=Additional.ownersForOperation('unknown-future-detached','autonomous');
ok(unknownAutonomous.length===8,
  'unknown detached operation conservatively tracks all eight rather than going unobserved');
const data=db(),worker='same-mv3-worker';
const persisted=Persisted.create({storageLocal:data.local,storageSession:data.session,workerInstanceId:worker,clock:()=>123000});
const additional=Additional.create({storageLocal:data.local,storageSession:data.session,workerInstanceId:worker,clock:()=>123000});
async function waitUntil(predicate){for(let i=0;i<250&&!predicate();i++)await Promise.resolve();assert.ok(predicate(),'operation entered');}
(async()=>{
  const before=await additional.observeAll(persisted);
  ok(before.schema===1&&before.eligibleForLease===false&&before.observedAtMs===123000
    &&Object.keys(before.observations).length===15
    &&REQUIRED.every(x=>Object.hasOwn(before.observations,x)),
    'actual read-only integrated observation contains all fifteen named owners');
  ok(REQUIRED.every(x=>before.observations[x].state==='unknown'),
    'no in-flight or generation proof produces UNKNOWN, never fabricated IDLE');
  // KAR-171 W3C: the second independent owner observer must not turn a
  // future-dated prior-worker P8 completion into a historical callback proof.
  for (const [label,startedAtMs,completedAtMs] of [
    ['future-start',123100,123200],
    ['future-finish',122900,123200]
  ]) {
    const token='prior_'+label;
    const seeded=db({
      [Atomic.START_PREFIX+token]:{
        schema:1,state:'admitted',token,
        operationType:'AUTONOMOUS:trash-purge-boot',
        workerInstanceId:'worker-before-restart',startedAtMs
      },
      [Atomic.FINISH_PREFIX+token]:{
        schema:1,state:'completed',token,
        workerInstanceId:'worker-before-restart',completedAtMs
      }
    });
    const observer=Additional.create({storageLocal:seeded.local,
      storageSession:seeded.session,workerInstanceId:'worker-after-restart',
      clock:()=>123000});
    const history=await observer.observe();
    ok(history.eligibleForLease===false
       &&history.admissionHistory.trashMutation.state==='unverified',
      label+': supplemental prior-worker history is unknown, never callback-finished');
    ok(seeded.writes===0,label+': supplemental observer does not alter evidence');
  }
  let release;const pending=new Promise(r=>release=r);let running=false;
  const op=additional.track(Additional.ownersForOperation('CAPTURE_SINGLE_INVENTORY','routed'),
    async()=>{running=true;await pending;return 7;});
  await waitUntil(()=>running);
  const during=await additional.observeAll(persisted);
  ok(during.observations.singleInventory.state==='active'
    &&during.observations.managedTabs.state==='active'
    &&during.observations.trashMutation.state==='unknown'
    &&during.observations.diagnosticExport.state==='unknown',
    'delayed Promise marks only actual matched owner producers ACTIVE');
  release();ok(await op===7,'same real async task result survives tracked lifetime');
  const after=await additional.observeAll(persisted);
  ok(after.observations.singleInventory.state==='unknown'
    &&after.observations.managedTabs.state==='unknown',
    'completed in-process task does not claim cross-worker idle');
  // Independently attribute EVERY supplemental owner, rather than testing
  // only a sample or assigning all eight to an unrelated async request.
  for(const name of EXTRA){
    const individual=Additional.create({storageLocal:data.local,storageSession:data.session,
      workerInstanceId:worker,clock:()=>123000});
    let finishIndividual;
    const operation=individual.track(name,()=>new Promise(r=>{finishIndividual=r;}));
    await waitUntil(()=>typeof finishIndividual==='function');
    const activeSnapshot=await individual.observeAll(persisted);
    ok(activeSnapshot.observations[name].state==='active'
      &&EXTRA.filter(x=>x!==name).every(x=>activeSnapshot.observations[x].state==='unknown'),
      'each owner individually marks only '+name+' ACTIVE during its asynchronous operation');
    finishIndividual(name);
    assert.equal(await operation,name);
    const released=await individual.observeAll(persisted);
    ok(released.observations[name].state==='unknown',
      name+' returns to UNKNOWN, not an invented cross-worker IDLE after completion');
  }
  // Positive managed-tab evidence must disappear safely on exact tab GONE,
  // while separate pending tabs.onRemoved handlers remain tracked.
  const tabRows={'41':{tabId:41,managed:true,lifecycleState:'active'}};
  const tabStorage=db({}, {tabRegistryV1:tabRows});
  const tabObserver=Additional.create({storageLocal:tabStorage.local,storageSession:tabStorage.session,
    workerInstanceId:worker,clock:()=>123000});
  const tabPersisted=Persisted.create({storageLocal:tabStorage.local,storageSession:tabStorage.session,
    workerInstanceId:worker,clock:()=>123000});
  ok((await tabObserver.observeAll(tabPersisted)).observations.managedTabs.state==='active',
    'persisted newly created managed tab is positive ACTIVE evidence');
  tabRows['41'].lifecycleState='gone';
  ok((await tabObserver.observeAll(tabPersisted)).observations.managedTabs.state==='unknown',
    'removed managed tab alone never certifies all managed tabs IDLE');
  let tabFinish;
  const tabRemoved=tabObserver.track(Additional.ownersForOperation('tab-removed','autonomous'),
    ()=>new Promise(resolve=>{tabFinish=resolve;}));
  await waitUntil(()=>typeof tabFinish==='function');
  ok((await tabObserver.observeAll(tabPersisted)).observations.managedTabs.state==='active',
    'pending tab removal callback remains ACTIVE even after persisted GONE');
  tabFinish();await tabRemoved;
  // NativeHost applies are not implemented; a recorded in-flight reservation
  // is BUSY, while a released marker never fabricates evidence of no apply.
  const txnRows={nativeUpdateWorkflowFenceV1:{schema:1,state:'reserved',profileId:'p'}};
  const nativeStorage=db(txnRows,{});
  const nativeObserver=Additional.create({storageLocal:nativeStorage.local,storageSession:nativeStorage.session,
    workerInstanceId:worker,clock:()=>123000});
  const nativePersisted=Persisted.create({storageLocal:nativeStorage.local,storageSession:nativeStorage.session,
    workerInstanceId:worker,clock:()=>123000});
  ok((await nativeObserver.observeAll(nativePersisted)).observations.nativeUpdateTransaction.state==='active',
    'durable reserved native update transaction blocks candidate idle');
  txnRows.nativeUpdateWorkflowFenceV1.state='released';
  ok((await nativeObserver.observeAll(nativePersisted)).observations.nativeUpdateTransaction.state==='unknown',
    'released native transaction alone does not attest no outstanding host activity');
  // Even a malformed or forged positive IDLE from one producer must not
  // leak into the combined non-authorizing P7 evidence.
  const fakeIdle=await additional.observeAll({observe:async()=>({
    schema:1,observations:{renewal:{state:'idle',reason:'FAKE_PROOF'}}
  })});
  ok(fakeIdle.observations.renewal.state==='unknown'
    &&fakeIdle.observations.renewal.reason==='UNVERIFIED_IDLE_ATTESTATION'
    &&fakeIdle.eligibleForLease===false,
    'spoofed persisted IDLE is demoted to UNKNOWN before all-15 composition');
  const beforeCrash=Additional.create({storageLocal:data.local,storageSession:data.session,workerInstanceId:'older',clock:()=>122999});
  const restart=await beforeCrash.observeAll(persisted);
  ok(restart.context.worker.state==='unverified'
    &&REQUIRED.every(x=>restart.observations[x].state!=='idle'),
    'worker generation disagreement cannot yield trusted all-idle');
  const missing=await additional.observeAll({observe:async()=>({schema:1,observations:{renewal:{state:'active',reason:'REAL_WORK'}}})});
  ok(missing.observations.renewal.state==='active'
    &&OLD.filter(x=>x!=='renewal').every(x=>missing.observations[x].state==='unknown'),
    'partial persisted source preserves true positive busy while missing owners fail closed');
  data.breakSession();
  const unreadable=await additional.observeAll(persisted);
  ok(unreadable.observations.managedTabs.state==='unknown'
    &&unreadable.eligibleForLease===false,
    'session-storage failure cannot produce any lease approval');
  data.breakLocal();
  const disconnected=await additional.observeAll(persisted);
  ok(REQUIRED.every(x=>['active','unknown'].includes(disconnected.observations[x].state)),
    'total storage failure never manufactures IDLE');
  ok(data.writes===0,'all-15 observation never writes, prunes or migrates persistent state');
  ok(bg.includes('AdditionalOwnerObserver.ownersForOperation(type, \'routed\')')
    &&bg.includes('AdditionalOwnerObserver.ownersForOperation(kind, \'autonomous\')'),
    'real background routed and autonomous entrypoints use specific audited operation owners');
  ok(bg.includes('const ownerWorkerInstanceId = crypto.randomUUID();')
    &&(bg.match(/workerInstanceId:ownerWorkerInstanceId/g)||[]).length===3,
    'both real observer sources and atomic arbitration share one current Worker generation without claiming old-worker completion');
  ok(!bg.includes('getOwnerSnapshot: () => requireAdditionalOwnerObserver()'),
    'untrusted all-15 read-only evidence never becomes a positive update lease source');
  console.log('PASS KAR99 P7 integrated owner authority '+checks+' checks');
})().catch(e=>{console.error(e);process.exitCode=1});
