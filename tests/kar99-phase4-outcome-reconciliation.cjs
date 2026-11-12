// P6 RED-first: independent remote source+target proof, crash-durable immutable resolution.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Journal = require('../src/background/services/phase4-uncertainty-journal.js');
const Remote = require('../src/background/services/remote-delete-replacement-service.js');
const background = fs.readFileSync('src/background/background.js', 'utf8');
const remoteCode = fs.readFileSync('src/background/services/remote-delete-replacement-service.js', 'utf8');
let n = 0;
const ok = (x, name) => { assert.ok(x, name); n++; console.log('PASS KAR99-P6 '+name); };
const denied = async (p, code, name) => { await assert.rejects(p,e=>e?.code===code,name);ok(true,name); };
function storage() {
  const data=Object.create(null); let writeFail=false,readFail=false;
  return { data, setWriteFail:x=>writeFail=x,setReadFail:x=>readFail=x,
    async get(k) {
      if (readFail) throw Error('disk not readable');
      const names=k===null?Object.keys(data):Array.isArray(k)?k:[k];
      return Object.fromEntries(names.filter(x=>Object.hasOwn(data,x)).map(x=>[x,structuredClone(data[x])]));
    },
    async set(p) {if(writeFail)throw Error('disk not writable');Object.assign(data,structuredClone(p));}
  };
}
const req={renewalId:'renewal-001',profileId:'Real Profile',sourceAdId:'11223344',newAdId:'55667788'};
const proof=entry=>({
  profileId:entry.profileId, sourceAdId:entry.sourceAdId,newAdId:entry.newAdId,
  sourceAbsent:true,targetPresent:true,
  sourceEvidence:'not-in-my-ads-full-pagination-scan',targetEvidence:'found-in-my-ads-full-pagination-scan',
  sourcePagesScanned:3,targetPagesScanned:2,targetFoundPage:2
});
function init(db,verifyRemoteOutcome,worker='worker-new') {
  return Journal.create({storageLocal:db,clock:()=>123000,newToken:()=> 'attempt-safe-0001',
    workerInstanceId:worker,verifyRemoteOutcome,...require('./helpers/phase4-locks.cjs')()});
}
(async()=>{
  const db=storage(),j=init(db,proof);
  const intent=await j.begin(req);
  ok(intent.state==='outcome-unverified'&&intent.profileId===req.profileId,'durable unverified pre-remote intent exists');
  const resumed=init(db,proof,'worker-after-restart');
  const resolved=await resumed.resolveVerified({renewalId:req.renewalId,attemptId:intent.attemptId});
  ok(resolved.state==='resolved-confirmed'&&resolved.workerInstanceId==='worker-after-restart',
    'new worker persists independent verified source and target outcome');
  ok(resolved.sourceAdId===req.sourceAdId&&resolved.newAdId===req.newAdId,
    'immutable resolution remains bound to exact original source and target Ad IDs');
  const state=await resumed.observe(req.renewalId);
  ok(state.attempts.length===1&&state.resolutions.length===1&&state.resolutions[0].attemptId===intent.attemptId,
    'both original intent and independent immutable resolution survive restart');
  await denied(resumed.begin(req),'KR_PHASE4_JOURNAL_UNRESOLVED',
    'confirmed prior remote DELETE never authorizes a second DELETE');
  const again=await init(db,proof,'third-worker').resolveVerified({renewalId:req.renewalId,attemptId:intent.attemptId});
  ok(again.attemptId===resolved.attemptId,'duplicate verification remains idempotent without overwriting immutable receipt');
  const corrupt=storage();const corruptJ=init(corrupt,proof);const receipt=await corruptJ.begin(req);
  corrupt.data[Journal.RESOLUTION_KEY_PREFIX+req.renewalId+'_'+receipt.attemptId]={bad:true};
  await denied(corruptJ.resolveVerified({renewalId:req.renewalId,attemptId:receipt.attemptId}),
    'KR_PHASE4_JOURNAL_CORRUPT','tampered resolution cannot certify successful deletion');
  for(const [name,verifier] of [
    ['source still present',r=>({...proof(r),sourceAbsent:false})],
    ['target missing',r=>({...proof(r),targetPresent:false})],
    ['profile changed',r=>({...proof(r),profileId:'Different Account'})],
    ['target ID changed',r=>({...proof(r),newAdId:'33445566'})],
    ['proof incomplete',r=>({...proof(r),targetEvidence:'unknown'})],
    ['verification unavailable',async()=>{throw Error('network error')}]
  ]) {
    const d=storage(),k=init(d,verifier),a=await k.begin(req);
    await denied(k.resolveVerified({renewalId:req.renewalId,attemptId:a.attemptId}),
      'KR_PHASE4_JOURNAL_UNVERIFIED',name+' fails closed');
    ok(Object.keys(d.data).filter(x=>x.startsWith(Journal.RESOLUTION_KEY_PREFIX)).length===0,
      name+' never writes a false resolution');
  }
  const absent=init(storage(),proof);
  await denied(absent.resolveVerified({renewalId:req.renewalId,attemptId:'missing'}),
    'KR_PHASE4_JOURNAL_UNRESOLVED','no original before-remote receipt means no successful outcome');
  const noVerifier=init(storage(),null);
  const orphan=await noVerifier.begin(req);
  await denied(noVerifier.resolveVerified({renewalId:req.renewalId,attemptId:orphan.attemptId}),
    'KR_PHASE4_JOURNAL_UNVERIFIED','missing trusted verifier fails closed');
  const failedStore=storage(),failed=init(failedStore,proof),e=await failed.begin(req);
  failedStore.setWriteFail(true);
  await denied(failed.resolveVerified({renewalId:req.renewalId,attemptId:e.attemptId}),
    'KR_PHASE4_JOURNAL_STORAGE','persisting successful verification requires storage write');
  const unreadable=storage(),r=init(unreadable,proof),rIntent=await r.begin(req);
  unreadable.setReadFail(true);
  await denied(r.resolveVerified({renewalId:req.renewalId,attemptId:rIntent.attemptId}),
    'KR_PHASE4_JOURNAL_STORAGE','indeterminate readback must never count as verified');
  ok(remoteCode.includes("scanFresh('target',targetId,'FIND_OWN_AD_BY_ID')"),
    'real remote verifier independently finds published target by exact ID in My Ads');
  ok(remoteCode.includes("scanFresh('source',sourceId,'VERIFY_OWN_AD_ABSENT_BY_ID')"),
    'real remote verifier independently proves source absence by exact ID');
  ok(background.includes('verifyRemoteOutcome:'),
    'live worker constructs verifier from real remote service rather than UI-supplied proof');
  ok(remoteCode.includes('await resolvePhase4Attempt('),
    'actual Phase-4 replacement gates promotion on the verified durable outcome');
  console.log('PASS KAR99 P6 '+n+' focused assertions');
})().catch(e=>{console.error(e);process.exitCode=1});
