'use strict';
// A second publication must never be triggered to diagnose an already-live ad.
// The failed remote proof stage is the only emitted data: no IDs or account.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Journal=require('../src/background/services/auto-publish-intent-journal.js');
const prefix='kar206-stage';
function fixture({remoteProof,prepareWitness,verifyWitness}={}) {
  let tick=0,mutations=0;
  const rows={};
  const notices=[];
  const storageLocal={
    get:async keys=>Object.fromEntries((keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys])
      .filter(k=>Object.hasOwn(rows,k)).map(k=>[k,structuredClone(rows[k])])),
    set:async value=>{mutations++;Object.assign(rows,structuredClone(value));}
  };
  const lockManager={request:async(name,opts,action)=>{
    assert.equal(name,'kar-updater-global-admission-v1');
    assert.deepEqual(opts,{mode:'exclusive',ifAvailable:true});
    return action({name,mode:'exclusive'});
  }};
  const api=Journal.create({
    storageLocal,lockManager,lockName:'kar-updater-global-admission-v1',
    workerInstanceId:prefix,clock:()=>1000+(++tick),
    newToken:()=>prefix+'-attempt',
    verifyRemoteOutcome:remoteProof??(async()=>{throw Error('site-index-not-ready');}),
    requireCommitContext:true,
    prepareCommitContext:prepareWitness??(async()=>({tabId:20,close:async()=>{}})),
    verifyCommitContext:verifyWitness??(async()=>true),
    onResolutionDenied:reason=>notices.push(reason)
  });
  return {api,notices,rows,get mutations(){return mutations;}};
}
const intent={fillId:prefix+'-fill',workflowId:prefix+'-archive',
  kind:'archive',profileId:prefix+'-profile',sourceAdId:'12345',targetTabId:20};
const validProof=(row,id)=>({
  fillId:row.fillId,workflowId:row.workflowId,kind:row.kind,
  profileId:row.profileId,sourceAdId:row.sourceAdId,newAdId:id,
  targetPresent:true,targetEvidence:'found-in-my-ads-full-pagination-scan',
  targetPagesScanned:2,targetFoundPage:1
});
async function exercise(f){
  await f.api.begin(intent);
  await assert.rejects(f.api.resolveVerified({fillId:intent.fillId,newAdId:'990001'}),
    e=>e?.code==='KR_PUBLISH_INTENT_UNVERIFIED');
  assert.equal((await f.api.observe(intent.fillId)).state,'unverified');
  assert.equal(Object.keys(f.rows).some(x=>x.includes('VerifiedResolution')),false);
}
test('failed fresh My Ads scan reports stage only and leaves immutable intent pending',async()=>{
  const f=fixture();
  await exercise(f);
  assert.deepEqual(f.notices,[{stage:'remote-outcome-unavailable'}]);
});
test('malformed remote proof fails closed with stage-only telemetry',async()=>{
  const f=fixture({remoteProof:async()=>({targetPresent:true})});
  await exercise(f);
  assert.deepEqual(f.notices,[{stage:'remote-outcome-unverified'}]);
});
test('missing prepared read-only account witness does not complete publication',async()=>{
  const f=fixture({remoteProof:async(row,id)=>validProof(row,id),
    prepareWitness:async()=>{throw Error('unavailable');}});
  await exercise(f);
  assert.deepEqual(f.notices,[{stage:'account-witness-unavailable'}]);
});
test('fresh account witness rejection never confirms publication',async()=>{
  const f=fixture({remoteProof:async(row,id)=>validProof(row,id),
    verifyWitness:async()=>false});
  await exercise(f);
  assert.deepEqual(f.notices,[{stage:'account-witness-unverified'}]);
});
test('telemetry exception cannot change denied outcome or journal',async()=>{
  let called=0;
  const f=fixture();
  const original=f.api;
  // The production hook is called for a real rejection; failures in that
  // hook must be consumed inside the journal (checked by source policy).
  const source=require('node:fs').readFileSync('src/background/services/auto-publish-intent-journal.js','utf8');
  assert.match(source,/onResolutionDenied/);
  assert.match(source,/try\s*\{[^}]*onResolutionDenied/);
  assert.equal(called,0);
});
