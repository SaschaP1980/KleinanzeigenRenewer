// KAR-117: test-first immutable, restart-persistent, non-authoritative
// automatic Phase-4 remote-uncertainty evidence.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Journal=require('../src/background/services/phase4-uncertainty-journal.js');
const source=fs.readFileSync('src/background/controllers/renewal-workflow-controller.js','utf8');
const remote=fs.readFileSync('src/background/services/remote-delete-replacement-service.js','utf8');
const worker=fs.readFileSync('src/background/background.js','utf8');
let n=0;
function ok(cond,label){assert.ok(cond,label);++n;console.log('PASS KAR117 '+label);}
function storage() {
  const data=Object.create(null); let fail=false,partial=false,sets=0;
  return {
    data,get writes(){return sets;},
    setFailure(v){fail=v;},setPartial(v){partial=v;},
    async get(keys) {
      if(fail)throw Error('local storage unavailable');
      const ks=keys===null?Object.keys(data):(Array.isArray(keys)?keys:[keys]);
      return Object.fromEntries(ks.filter(k=>Object.hasOwn(data,k)).map(k=>[k,structuredClone(data[k])]));
    },
    async set(record){
      if(fail)throw Error('local storage unavailable');
      sets++;
      if(!partial)Object.assign(data,structuredClone(record));
    },
    async remove(){throw Error('journal must never remove or expire uncertainty')}
  };
}
function make(db,workerId='worker-a'){
  let i=0;
  return Journal.create({storageLocal:db,clock:()=>1700000000000,
    newToken:()=>workerId+'-unique-'+(++i).toString().padStart(7,'0'),
    workerInstanceId:workerId});
}
const req={renewalId:'r-1',profileId:'p_1',sourceAdId:'11111',newAdId:'22222'};
async function main(){
  ok(typeof Journal.create==='function','journal construction is an explicit module contract');
  const db=storage();
  const first=make(db,'worker-a');
  const initial=await first.observe('r-1');
  ok(initial.state==='unverified' && initial.attempts.length===0,'empty log is not positive idle evidence');
  const result=await first.begin(req);
  ok(result.state==='outcome-unverified' && result.renewalId===req.renewalId,
    'before-remote begin creates unresolved persistent record');
  ok(result.profileId===req.profileId&&result.sourceAdId===req.sourceAdId&&result.newAdId===req.newAdId,
    'journal retains source/new identity and profile scope');
  ok(db.writes===1&&Object.keys(db.data).length===1,'one record written under one unique immutable storage key');
  const oldKey=Object.keys(db.data)[0];ok(oldKey.startsWith(Journal.KEY_PREFIX),'record has bounded discoverable prefix');
  const second=make(db,'worker-b');
  const restarted=await second.observe('r-1');
  ok(restarted.state==='unverified'&&restarted.attempts.length===1,
    'new worker generation sees unresolved old remote attempt');
  await assert.rejects(second.begin(req),/KR_PHASE4_JOURNAL_UNRESOLVED/);
  ok(db.writes===1,'restarted Worker cannot overwrite/clear old attempt');
  await assert.rejects(second.begin({...req,profileId:'other_profile'}),/KR_PHASE4_JOURNAL_UNRESOLVED/);
  ok(true,'cross-profile reuse remains blocked even if caller requests a new scope');
  const different=await second.begin({...req,renewalId:'r-2'});
  ok(different.renewalId==='r-2'&&Object.keys(db.data).length===2,
    'separate renewal receives separate immutable record without replacing earlier entry');
  const corrupted=storage();corrupted.data[Journal.KEY_PREFIX+'broken']={unexpected:true};
  await assert.rejects(make(corrupted).begin(req),/KR_PHASE4_JOURNAL_CORRUPT/);
  ok(true,'malformed or contradictory journal prevents source deletion');
  const failed=storage();failed.setFailure(true);
  await assert.rejects(make(failed).begin(req),/KR_PHASE4_JOURNAL_STORAGE/);
  ok(true,'unavailable local storage prevents registering remote attempt');
  const noCommit=storage();noCommit.setPartial(true);
  await assert.rejects(make(noCommit).begin(req),/KR_PHASE4_JOURNAL_STORAGE/);
  ok(true,'missing post-write acknowledgement denies remote attempt');
  await assert.rejects(first.begin({...req,profileId:''}),/KR_PHASE4_JOURNAL_IDENTITY/);
  await assert.rejects(first.begin({...req,newAdId:'unverified'}),/KR_PHASE4_JOURNAL_IDENTITY/);
  ok(true,'unbound profile or new Ad-ID rejects journaling');
  ok(!source.includes('void (async () =>'), 'bare autonomous Phase4 execution remains prohibited');
  ok(remote.includes('await beginPhase4Attempt({'), 'durable journal begins inside shared remote service after fresh account check');
  ok(remote.indexOf('await beginPhase4Attempt({')<remote.indexOf("type: 'DELETE_OWN_AD_BY_ID'"),
    'Phase4 journal confirmation happens before the actual remote DELETE request');
  ok(source.includes("KR_PHASE4_JOURNAL_"),'journal rejection is classified as deferral not remote failure');
  ok(worker.includes('beginPhase4Attempt: current => requirePhase4UncertaintyJournal().begin(current)'),
    'real worker injects required journal into controller');
  ok(worker.includes('services/phase4-uncertainty-journal.js'),'module loads in actual MV3 Worker');
  ok(!worker.includes('getOwnerSnapshot: () => requirePersistedOwnerObserver()'),
    'journal does not grant trusted owner idle or update reserve');
  console.log('PASS KAR117 total '+n);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
