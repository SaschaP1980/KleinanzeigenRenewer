// KAR-124 RED-first: a previously persisted uncertain remote delete must
// count as active renewal/insertion-lock evidence across new MV3 workers.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Observer=require('../src/background/services/persisted-owner-observer.js');
const Journal=require('../src/background/services/phase4-uncertainty-journal.js');
let n=0;
function ok(v,msg){assert.ok(v,msg);n++;console.log('PASS KAR124 '+msg);}
function fakeStorage(){
 const map=Object.create(null);let reads=0,observerWrites=0,failJournal=false;
 return {
  map,
  get reads(){return reads;},
  get observerWrites(){return observerWrites;},
  failJournal(v){failJournal=v;},
  async get(keys){
   reads++;
   if(keys===null && failJournal)throw Error('raw journal read denied');
   const names=keys===null?Object.keys(map):Array.isArray(keys)?keys:[keys];
   return Object.fromEntries(names.filter(k=>Object.hasOwn(map,k)).map(k=>[k,structuredClone(map[k])]));
  },
  async set(r){observerWrites++;Object.assign(map,structuredClone(r))}
 };
}
function observer(storage){
 return Observer.create({storageLocal:storage,storageSession:{get:async()=>({})},clock:()=>123456,workerInstanceId:'new-worker'});
}
const request={renewalId:'r-123',profileId:'profile-x',sourceAdId:'10101',newAdId:'20202'};
async function main(){
 const local=fakeStorage();
 const fresh=observer(local);
 const empty=await fresh.observe();
 ok(empty.eligibleForLease===false,'missing journal cannot authorize lease');
 ok(empty.observations.renewal.state==='unknown','missing renewal row is unknown, never idle');
 const journal=Journal.create({storageLocal:local,clock:()=>1111,newToken:()=> 'unique-attempt-0001',workerInstanceId:'old-worker'});
 await journal.begin(request);
 const before=local.observerWrites;
 const restarted=await observer(local).observe();
 ok(restarted.observations.renewal.state==='active','unresolved receipt makes renewal positively active on fresh worker');
 ok(restarted.observations.insertionLock.state==='active','unresolved receipt makes insertion lock positively active');
 ok(restarted.observations.renewal.reason==='PHASE4_JOURNAL_UNRESOLVED','busy reason is explicitly anchored to immutable remote journal');
 ok(restarted.observations.insertionLock.reason==='PHASE4_JOURNAL_UNRESOLVED','insertion reason is the same positive proof');
 ok(restarted.context.worker.state==='unverified'&&restarted.eligibleForLease===false,
  'journal is never promoted to trusted MV3 generation or update reservation');
 ok(local.observerWrites===before,'observer never modifies/clears journal records');
 const wrongProfile=fakeStorage();
 wrongProfile.map[Journal.KEY_PREFIX+'r-123_unique-attempt-0001']=structuredClone(Object.values(local.map)[0]);
 wrongProfile.map.activeDetectedProfileV1={profileId:'wrong-profile'};
 wrongProfile.map.selectedInventoryProfileV1={profileId:'other-profile'};
 const mismatched=await observer(wrongProfile).observe();
 ok(mismatched.observations.renewal.state==='active'&&mismatched.context.profile.reason==='PROFILE_MISMATCH',
  'observed remote uncertainty remains active despite mismatch, never reassigned to another account');
 const corrupt=fakeStorage();corrupt.map[Journal.KEY_PREFIX+'garbage']={junk:true};
 const corrupted=await observer(corrupt).observe();
 ok(corrupted.observations.renewal.state==='unknown','corrupt journal blocks positive or negative idle proof');
 ok(corrupted.observations.insertionLock.state==='unknown','corrupt journal blocks insertion lock conclusion');
 const failed=fakeStorage();failed.failJournal(true);
 const unavailable=await observer(failed).observe();
 ok(unavailable.observations.renewal.state==='unknown','journal read failure fails closed for renewal');
 ok(unavailable.observations.insertionLock.state==='unknown','journal read failure fails closed for insertion lock');
 const ongoing=fakeStorage();
 ongoing.map.renewalSessionsV1={x:{status:'verifying'}};
 ongoing.failJournal(true);
 const concurrent=await observer(ongoing).observe();
 ok(concurrent.observations.renewal.state==='active',
  'read failure does not erase independent positive live-session evidence');
 const source=fs.readFileSync('src/background/services/persisted-owner-observer.js','utf8');
 ok(source.includes('storageLocal.get(null)'),'observer uses read-only dynamic journal-key scan');
 ok(!source.includes('storageLocal.set(')&&!source.includes('storageLocal.remove('),'observer has no mutating storage API');
 console.log('PASS KAR124 total '+n);
}
main().catch(e=>{console.error(e);process.exitCode=1});
