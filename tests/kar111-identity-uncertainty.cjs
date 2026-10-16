// KAR-111: unresolved profile and worker-generation evidence must never
// accidentally become a positive all-idle/lease attestation.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Observer = require('../src/background/services/persisted-owner-observer.js');
const bg = fs.readFileSync('src/background/background.js','utf8');
let count = 0;
function ok(v,message) { assert.ok(v,message); count++;console.log('PASS KAR111 '+message); }
const active='activeDetectedProfileV1';
const selected='selectedInventoryProfileV1';
function make(localData={},sessionData={},after=null) {
  let gets=0,mutations=0;
  return {
    local:{
      async get(keys) {
        gets++;
        const data=gets>1 && after!==null ? after : localData;
        return Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>Object.prototype.hasOwnProperty.call(data,k)).map(k=>[k,structuredClone(data[k])]));
      },
      async set(){mutations++; throw Error('must not write');}
    },
    session:{
      async get(keys){return Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>Object.prototype.hasOwnProperty.call(sessionData,k)).map(k=>[k,structuredClone(sessionData[k])]));},
      async set(){mutations++;throw Error('must not write');}
    },
    get mutations(){return mutations;}
  };
}
async function run() {
  const p1={[active]:{profileId:'a-good-profile'},[selected]:{profileId:'a-good-profile'},bulkInventoryRun:{status:'running',runId:'bulk-1'}};
  const epoch={runtimeEpochV1:'stale-bulk-epoch',bulkRunRuntimeLeaseV1:{runId:'bulk-1',runtimeEpoch:'stale-bulk-epoch'}};
  const a=make(p1,epoch);
  const o=Observer.create({storageLocal:a.local,storageSession:a.session,clock:()=>12000,workerInstanceId:'worker-current'});
  const result=await o.observe();
  ok(result.eligibleForLease===false,'observer never grants lease');
  ok(result.context.profile.state==='unverified','matching stored profiles still cannot prove live profile authority');
  ok(result.context.profile.reason==='STORED_PROFILES_MATCH_BUT_LIVE_UNVERIFIED',
    'matching selected and detected profile only yields bounded evidence');
  ok(result.context.profile.profileId==='a-good-profile','matching identities retain a source-grounded profile referent');
  ok(result.context.worker.state==='unverified','persisted bulk epoch cannot prove current worker generation');
  ok(result.context.worker.workerInstanceId==='worker-current','current in-process worker has explicit identity referent');
  ok(result.context.worker.reason==='NO_CROSS_WORKER_GENERATION_PROOF',
    'worker identity remains unknown across restart despite matching stored bulk epoch');
  ok(result.observations.bulkInventory.state==='active','positive persisted bulk activity remains visible');
  ok(a.mutations===0,'raw identity reads cannot mutate storage');
  const mismatch=await Observer.create({storageLocal:make({...p1,[selected]:{profileId:'other-profile'}},epoch).local,
    storageSession:make({},epoch).session,clock:()=>12000,workerInstanceId:'instance-2'}).observe();
  ok(mismatch.context.profile.reason==='PROFILE_MISMATCH','selected-versus-detected mismatch is explicit');
  ok(mismatch.context.profile.profileId===null,'mismatched selected profile cannot be attributed');
  const missing=await Observer.create({storageLocal:make({bulkInventoryRun:p1.bulkInventoryRun},epoch).local,
    storageSession:make({},epoch).session,clock:()=>12000}).observe();
  ok(missing.context.profile.reason==='PROFILE_MISSING_OR_INVALID','missing identities never count as profile proof');
  ok(missing.context.worker.state==='unverified'&&missing.context.worker.workerInstanceId===null,
    'untracked worker instance is unknown');
  const after={...p1,[selected]:{profileId:'changed-during-check'}};
  const moving=make(p1,epoch,after);
  const drift=await Observer.create({storageLocal:moving.local,storageSession:moving.session,
    clock:()=>12000,workerInstanceId:'instance-moving'}).observe();
  ok(drift.context.profile.reason==='PROFILE_CHANGED_DURING_READ','identity change between raw reads cannot be certified');
  ok(drift.eligibleForLease===false,'torn profile read never authorizes lease');
  const broken=make(p1,epoch);
  broken.local.get=async()=>{throw Error('profile storage failed')};
  const failed=await Observer.create({storageLocal:broken.local,storageSession:broken.session,
    clock:()=>12000,workerInstanceId:'instance-broken'}).observe();
  ok(failed.context.profile.reason==='PROFILE_STORAGE_UNAVAILABLE','profile storage failure must fail closed');
  ok(Observer.OWNERS.every(name=>failed.observations[name].state==='unknown'),
    'storage exception must not reappear as empty/idle');
  const restarted=await Observer.create({storageLocal:make(p1,epoch).local,
    storageSession:make({},epoch).session,workerInstanceId:'worker-next',clock:()=>12000}).observe();
  ok(restarted.context.worker.workerInstanceId!=='worker-current',
    'two worker instances sharing stale bulk epoch do not share instance identity');
  ok(restarted.context.worker.state==='unverified','new worker still lacks cross-worker authority');
  ok(bg.includes('workerInstanceId: crypto.randomUUID()'),
    'live background assigns fresh worker-instance identity on observer creation');
  ok(!bg.includes('getOwnerSnapshot: () => requirePersistedOwnerObserver()'),
    'identity observations cannot be mistaken for an authoritative owner snapshot');
  console.log('PASS KAR111 total '+count);
}
run().catch(e=>{console.error(e);process.exitCode=1;});
