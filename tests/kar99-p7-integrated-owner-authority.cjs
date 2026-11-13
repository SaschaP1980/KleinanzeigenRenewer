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
  // KAR-171 W3D1: a real, independently read 7+8 owner closure matrix
  // must never promote a historical callback, missing Chromium witness,
  // previous MV3 Worker, or a released local fence into updater permission.
  ok(typeof additional.inspectAllOwnerClosureReadOnly==='function',
    'private real 15-owner closure matrix is exposed without an app message route');
  const emptyMatrix=await additional.inspectAllOwnerClosureReadOnly(persisted);
  ok(emptyMatrix.schema===1&&emptyMatrix.eligibleForLease===false
    &&emptyMatrix.priorGenerationClosed===false
    &&emptyMatrix.currentLiveAccountVerified===false
    &&emptyMatrix.nativeHostOutcomeVerified===false
    &&Object.keys(emptyMatrix.owners).length===15
    &&REQUIRED.every(name=>emptyMatrix.owners[name]?.eligibleForLease===false
      &&emptyMatrix.owners[name]?.status==='unverified'),
    'all 15 real source owners remain unverified without prior completion or native oracle');
  ok(emptyMatrix.browserTabsReconciled===false,
    'absent Chrome tab reader cannot be upgraded to a verified current tab source');
  const browserScope=db({
    activeDetectedProfileV1:{profileId:'profile-A'},
    selectedInventoryProfileV1:{profileId:'profile-A'}
  },{tabRegistryV1:{},managedWorkerTabsV1:{}});
  const browserPersisted=Persisted.create({storageLocal:browserScope.local,
    storageSession:browserScope.session,workerInstanceId:'worker-new',clock:()=>123000});
  const browserObserver=Additional.create({storageLocal:browserScope.local,
    storageSession:browserScope.session,workerInstanceId:'worker-new',clock:()=>123000,
    queryBrowserTabsReadOnly:async()=>[]});
  const browserMatrix=await browserObserver.inspectAllOwnerClosureReadOnly(browserPersisted);
  ok(browserMatrix.browserTabsReconciled===true
    &&browserMatrix.eligibleForLease===false
    &&browserMatrix.currentLiveAccountVerified===false,
    'two independent real Chrome+session empty-tab checks reconcile without granting owner IDLE');
  let tabReads=0;
  const driftingBrowser=Additional.create({storageLocal:browserScope.local,
    storageSession:browserScope.session,workerInstanceId:'worker-new',clock:()=>123000,
    queryBrowserTabsReadOnly:async()=>{
      tabReads++;
      return tabReads<=2?[]:[{id:81,url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html'}];
    }});
  const browserDrift=await driftingBrowser.inspectAllOwnerClosureReadOnly(browserPersisted);
  ok(browserDrift.browserTabsReconciled===false&&browserDrift.eligibleForLease===false,
    'new Chrome tab during 15-owner capture invalidates independent live-tab proof');
  const token='prior_diag_123456';
  const completedRows={
    activeDetectedProfileV1:{profileId:'profile-A'},
    selectedInventoryProfileV1:{profileId:'profile-A'},
    [Atomic.START_PREFIX+token]:{schema:1,state:'admitted',token,
      operationType:'GET_DIAGNOSTIC_EXPORT',workerInstanceId:'worker-before-restart',
      startedAtMs:122500},
    [Atomic.FINISH_PREFIX+token]:{schema:1,state:'completed',token,
      workerInstanceId:'worker-before-restart',completedAtMs:122700}
  };
  const completeStore=db(completedRows,{tabRegistryV1:{},managedWorkerTabsV1:{}});
  const completeP=Persisted.create({storageLocal:completeStore.local,
    storageSession:completeStore.session,workerInstanceId:'worker-new',clock:()=>123000});
  const completeA=Additional.create({storageLocal:completeStore.local,
    storageSession:completeStore.session,workerInstanceId:'worker-new',clock:()=>123000});
  const completeMatrix=await completeA.inspectAllOwnerClosureReadOnly(completeP);
  ok(completeMatrix.owners.diagnosticExport.status==='historical-callback-settled'
    &&completeMatrix.owners.diagnosticExport.priorGenerationClosed===false
    &&completeMatrix.owners.nativeUpdateTransaction.status==='unverified'
    &&completeMatrix.eligibleForLease===false,
    'authentic prior-worker diagnostic callback is historical only, never all-owner idle');
  // KAR-171 W3D2A: an old-worker autonomous P8 callback is historical
  // ONLY when its per-owner witness references the EXACT same immutable
  // P8 journal, owner subset and selected profile as the 15-owner bracket.
  const renewalToken='prior_renewal_12345';
  const renewalDb=db({
    activeDetectedProfileV1:{profileId:'profile-A'},
    selectedInventoryProfileV1:{profileId:'profile-A'},
    [Atomic.START_PREFIX+renewalToken]:{schema:1,state:'admitted',
      token:renewalToken,operationType:'AUTONOMOUS:renewal-detached-verify',
      workerInstanceId:'worker-before-restart',startedAtMs:122500},
    [Atomic.FINISH_PREFIX+renewalToken]:{schema:1,state:'completed',
      token:renewalToken,workerInstanceId:'worker-before-restart',
      completedAtMs:122700}
  },{});
  const realRenewal=Persisted.create({storageLocal:renewalDb.local,
    storageSession:renewalDb.session,workerInstanceId:'worker-new',
    clock:()=>123000});
  const renewalAdditional=Additional.create({storageLocal:renewalDb.local,
    storageSession:renewalDb.session,workerInstanceId:'worker-new',
    clock:()=>123000});
  const authenticRenewal=await renewalAdditional.inspectAllOwnerClosureReadOnly(realRenewal);
  ok(authenticRenewal.owners.renewal.status==='historical-callback-settled'
    &&authenticRenewal.owners.renewal.eligibleForLease===false,
    'authentic persisted autonomous callback is only historically settled');
  for(const [label,mutate] of [
    ['different global P8 revision',parts=>{parts[0]='other-p8-revision';}],
    ['different per-owner receipt revision',parts=>{parts[1]='other-owner-revision';}],
    ['different stored profile witness',parts=>{parts[2]='other-profile';}],
    ['different persisted workflow state',parts=>{parts[3]={fabricated:'local-storage'};}],
    ['different persisted MV3 session',parts=>{parts[4]={fabricated:'session-storage'};}],
    ['malformed witness revision',()=>null]
  ]) {
    const tampered={
      ...realRenewal,
      async inspectPersistedOwnerCallbackClosureReadOnly(owner){
        const actual=await realRenewal.inspectPersistedOwnerCallbackClosureReadOnly(owner);
        if(owner!=='renewal'||actual.status!=='callback-settled')return actual;
        const parts=JSON.parse(actual.sourceRevision);
        const modified=mutate(parts);
        return {...actual,sourceRevision:modified===null
          ?'not-json-revision':JSON.stringify(parts)};
      }
    };
    const result=await renewalAdditional.inspectAllOwnerClosureReadOnly(tampered);
    ok(result.owners.renewal.status==='unverified'
      &&result.owners.renewal.sourceRevision===null
      &&result.eligibleForLease===false
      &&result.sourcesStable===true,
      label+' cannot borrow a stable aggregate P8 revision');
  }
  ok(renewalDb.writes===0,'cross-generation owner revision binding is strictly read-only');
  const wrongSite=Additional.create({storageLocal:completeStore.local,
    storageSession:completeStore.session,workerInstanceId:'worker-new',clock:()=>123000,
    queryBrowserTabsReadOnly:async()=>[{
      id:81,url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html'
    }],
    readAccountPageStatusReadOnly:async()=>({
      pageType:'my-ads',url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html',
      auth:{loggedIn:true},profileName:'Different signed-in account'
    })});
  const conflictingAccount=await wrongSite.inspectAllOwnerClosureReadOnly(completeP);
  ok(conflictingAccount.sourcesStable===false
    &&conflictingAccount.owners.diagnosticExport.status==='unverified'
    &&conflictingAccount.eligibleForLease===false,
    'live Kleinanzeigen account mismatch invalidates even locally settled callbacks');
  ok(completeStore.writes===0,'15-owner historical closure only reads actual storage');
  const unfinishedRows={...completedRows};
  delete unfinishedRows[Atomic.FINISH_PREFIX+token];
  const unfinishedStore=db(unfinishedRows,{tabRegistryV1:{},managedWorkerTabsV1:{}});
  const unfinishedP=Persisted.create({storageLocal:unfinishedStore.local,
    storageSession:unfinishedStore.session,workerInstanceId:'worker-new',clock:()=>123000});
  const unfinishedA=Additional.create({storageLocal:unfinishedStore.local,
    storageSession:unfinishedStore.session,workerInstanceId:'worker-new',clock:()=>123000});
  const unfinishedMatrix=await unfinishedA.inspectAllOwnerClosureReadOnly(unfinishedP);
  ok(unfinishedMatrix.status==='blocked'
    &&unfinishedMatrix.owners.diagnosticExport.status==='blocked'
    &&unfinishedMatrix.eligibleForLease===false,
    'unfinished prior-worker admission remains BUSY after service-worker restart');
  let persistedReads=0;
  const changingPersisted={
    ...completeP,
    async observe(){
      persistedReads++;
      if(persistedReads===2)
        completedRows.selectedInventoryProfileV1={profileId:'different-profile'};
      return completeP.observe();
    }
  };
  const driftMatrix=await completeA.inspectAllOwnerClosureReadOnly(changingPersisted);
  ok(driftMatrix.status==='unverified'
    &&driftMatrix.owners.diagnosticExport.status!=='historical-callback-settled'
    &&driftMatrix.eligibleForLease===false,
    'mid-capture selected profile transition invalidates historical owner proof');
  const absentSource=await completeA.inspectAllOwnerClosureReadOnly({
    observe:()=>completeP.observe()
  });
  ok(absentSource.owners.renewal.status==='unverified'
    &&absentSource.eligibleForLease===false,
    'missing persisted per-owner source cannot be substituted by a policy-shaped idle snapshot');
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
