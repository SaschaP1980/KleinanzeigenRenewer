// KAR-99 P6: only a real immutable dual-ID resolution may clear the
// positive uncertain-remote-work signal. Neither absent rows nor corrupt data
// can become a confirmed idle attestation. Test-first RED on the old observer.
'use strict';
const assert=require('node:assert/strict');
const Journal=require('../src/background/services/phase4-uncertainty-journal.js');
const Owner=require('../src/background/services/persisted-owner-observer.js');
let count=0;
function ok(condition,msg){assert.ok(condition,msg);count++;console.log('PASS KAR99-P6-OBS '+msg)}
function fake(){
 const map=Object.create(null);let writes=0,failRead=false;
 return {map,get writes(){return writes;},failRead:v=>failRead=v,
  async get(keys){
   if(failRead)throw Error('storage-unavailable');
   const ks=keys===null?Object.keys(map):Array.isArray(keys)?keys:[keys];
   return Object.fromEntries(ks.filter(x=>Object.hasOwn(map,x)).map(k=>[k,structuredClone(map[k])]));
  },
  async set(value){writes++;Object.assign(map,structuredClone(value))}
 };
}
const p={renewalId:'renewal-99',profileId:'Original Profile',
 sourceAdId:'12345678',newAdId:'98765432'};
const verified=receipt=>({
 profileId:receipt.profileId,sourceAdId:receipt.sourceAdId,newAdId:receipt.newAdId,
 sourceAbsent:true,targetPresent:true,
 sourceEvidence:'not-in-my-ads-full-pagination-scan',
 targetEvidence:'found-in-my-ads-full-pagination-scan',
 sourcePagesScanned:3,targetPagesScanned:2,targetFoundPage:2
});
const journal=d=>Journal.create({storageLocal:d,clock:()=>120000,
 newToken:()=> 'receipt-id-0000001',workerInstanceId:'worker-old',
 verifyRemoteOutcome:verified,...require('./helpers/phase4-locks.cjs')()});
const observer=d=>Owner.create({storageLocal:d,storageSession:{get:async()=>({})},
 clock:()=>120100,workerInstanceId:'worker-new'});
(async()=>{
 const d=fake(),j=journal(d),entry=await j.begin(p);
 const pending=await observer(d).observe();
 ok(pending.observations.renewal.state==='active'
     &&pending.observations.insertionLock.state==='active',
    'unresolved durable remote attempt is positively active across worker restart');
 await j.resolveVerified({renewalId:p.renewalId,attemptId:entry.attemptId});
 const readsBefore=d.writes;
 const completed=await observer(d).observe();
 ok(completed.eligibleForLease===false,'verified Phase-4 evidence does not certify all-owner IDLE');
 ok(completed.observations.renewal.state!=='active'
     &&completed.observations.insertionLock.state!=='active',
    'both authentic source+target resolution receipts cease being unresolved busy evidence');
 ok(completed.observations.renewal.state==='unknown'
     &&completed.observations.insertionLock.state==='unknown',
    'success does NOT promote a source receipt to an unverified positive IDLE');
 ok(d.writes===readsBefore,'observation remains strictly read-only');
 const disappeared=fake();Object.assign(disappeared.map,structuredClone(d.map));
 delete disappeared.map[Journal.RESOLUTION_KEY_PREFIX+p.renewalId+'_'+entry.attemptId];
 const unconfirmed=await observer(disappeared).observe();
 ok(unconfirmed.observations.renewal.state==='active'
     &&unconfirmed.observations.insertionLock.state==='active',
    'missing completion receipt remains unresolved ACTIVE');
 const corrupt=fake();Object.assign(corrupt.map,structuredClone(d.map));
 const key=Journal.RESOLUTION_KEY_PREFIX+p.renewalId+'_'+entry.attemptId;
 corrupt.map[key].newAdId='123123123';
 const forged=await observer(corrupt).observe();
 ok(forged.observations.renewal.state==='unknown'
     &&forged.observations.insertionLock.state==='unknown',
    'identity-tampered resolution yields UNKNOWN, not silent IDLE');
 const broken=fake();Object.assign(broken.map,structuredClone(d.map));broken.failRead(true);
 const unreadable=await observer(broken).observe();
 ok(unreadable.observations.renewal.state==='unknown'
     &&unreadable.observations.insertionLock.state==='unknown',
    'storage read failure remains UNKNOWN');
 const positive=fake();Object.assign(positive.map,structuredClone(d.map));
 positive.map.renewalSessionsV1={one:{status:'running'}};
 const stillActive=await observer(positive).observe();
 ok(stillActive.observations.renewal.state==='active',
    'independently active renewal retains positive busy evidence after resolving older receipt');
 const orphan=fake();orphan.map[key]=structuredClone(d.map[key]);
 const invalid=await observer(orphan).observe();
 ok(invalid.observations.renewal.state==='unknown'
     &&invalid.observations.insertionLock.state==='unknown',
    'resolution without matching original attempt is not a valid proof');
 console.log('PASS KAR99 P6 observer '+count+' assertions');
})().catch(e=>{console.error(e);process.exitCode=1});
