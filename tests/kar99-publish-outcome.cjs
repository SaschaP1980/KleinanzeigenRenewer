// KAR-99 P6 RED-first: a before-remote intent must only be resolved
// by an independent My Ads verifier; never by a tab redirect or client claim.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
const Journal=require('../src/background/services/auto-publish-intent-journal.js');
const publish=fs.readFileSync('src/content/template-publish-flow.js','utf8');
const bg=fs.readFileSync('src/background/background.js','utf8');
let n=0;
function ok(cond,label){assert.ok(cond,label);n++;console.log('PASS KAR99-P6-OUTCOME '+label);}
async function deny(fn,code,label){await assert.rejects(fn,e=>e?.code===code,label);ok(true,label);}
function disk(){
 const rows=Object.create(null);let writes=0;
 return {rows,get writes(){return writes;},
 async get(keys){const names=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
  return Object.fromEntries(names.filter(x=>Object.hasOwn(rows,x)).map(x=>[x,structuredClone(rows[x])]))},
 async set(value){writes++;Object.assign(rows,structuredClone(value))}};
}
function locks(){
 const held=new Set();
 return {held,async request(name,opts,action){
  assert.equal(name,Atomic.LOCK_NAME);assert.equal(opts.mode,'exclusive');assert.equal(opts.ifAvailable,true);
  if(held.has(name))return action(null);
  held.add(name);try{return await action({name})}finally{held.delete(name);}
 }};
}
const request={fillId:'fill-main',workflowId:'renewal-main',kind:'renewal',
 profileId:'profile-1',sourceAdId:'1234',targetTabId:7};
const proof=(intent,newAdId)=>({
 fillId:intent.fillId,workflowId:intent.workflowId,kind:intent.kind,
 profileId:intent.profileId,sourceAdId:intent.sourceAdId,newAdId,
 targetPresent:true,targetEvidence:'found-in-my-ads-full-pagination-scan',
 targetPagesScanned:3,targetFoundPage:2
});
let seq=0;
const create=(store,manager,worker='worker-1',verify=proof)=>Journal.create({
 storageLocal:store,lockManager:manager,lockName:Atomic.LOCK_NAME,
 workerInstanceId:worker,clock:()=>1000+ ++seq,
 newToken:()=> 'publish-attempt-'+ ++seq,verifyRemoteOutcome:verify
});
(async()=>{
 ok(typeof Journal.create==='function','actual P6 journal module is loaded');
 ok(publish.includes('event.preventDefault()')&&publish.includes('event.stopImmediatePropagation()'),
  'manual managed publish is intercepted before a real external mutation');
 ok(publish.includes("type: 'AUTHORIZE_AUTOMATIC_PUBLISH'")&&
   publish.includes('armPublishDetection(fillId)'),
  'manual and automatic managed submit use one journal authorization');
 ok(bg.includes('verifyAutoPublishRemoteOutcomeFresh(')&&
   bg.includes("type:'MY_ADS_STATUS'")&&bg.includes("type:'FIND_OWN_AD_BY_ID'"),
  'background owns independent exact-ID same-account My Ads result verifier');
 const store=disk(),manager=locks(),a=create(store,manager);
 const receipt=await a.begin(request);
 ok(receipt.state==='outcome-unverified','durable original intent exists');
 await deny(a.resolveVerified({fillId:'unknown',newAdId:'7890'}),
  'KR_PUBLISH_INTENT_UNRESOLVED','missing attempt cannot resolve');
 await deny(a.resolveVerified({fillId:request.fillId,newAdId:'bad'}),
  'KR_PUBLISH_INTENT_IDENTITY','invalid new ad ID is denied');
 await deny(a.resolveVerified({fillId:request.fillId,newAdId:request.sourceAdId}),
  'KR_PUBLISH_INTENT_IDENTITY','source ID cannot be misclassified as published target');
 const restart=create(store,manager,'worker-after-crash');
 const before=await restart.observe(request.fillId);
 ok(before.state==='unverified'&&before.attempts.length===1&&before.resolutions.length===0,
  'worker restart retains exact unresolved attempt');
 const bad=create(store,manager,'bad-worker',async i=>({...proof(i,'7890'),profileId:'wrong-profile'}));
 await deny(bad.resolveVerified({fillId:request.fillId,newAdId:'7890'}),
  'KR_PUBLISH_INTENT_UNVERIFIED','wrong-profile remote proof cannot resolve');
 ok((await a.observe(request.fillId)).state==='unverified',
  'failed verifier never erases uncertainty');
 manager.held.add(Atomic.LOCK_NAME);
 await deny(restart.resolveVerified({fillId:request.fillId,newAdId:'7890'}),
  'KR_PUBLISH_INTENT_ATOMIC_BUSY','cross-worker lock contention cannot commit a resolution');
 manager.held.delete(Atomic.LOCK_NAME);
 const resolved=await restart.resolveVerified({fillId:request.fillId,newAdId:'7890'});
 ok(resolved.state==='resolved-confirmed'&&resolved.newAdId==='7890'&&resolved.targetPagesScanned===3,
  'independently authenticated evidence persists immutable exact target');
 const observed=await a.observe(request.fillId);
 ok(observed.state==='resolved'&&observed.resolutions.length===1&&observed.attempts.length===1,
  'fresh worker sees original and independent resolution');
 await deny(a.begin(request),'KR_PUBLISH_INTENT_UNRESOLVED',
  'even verified old attempt cannot create a duplicate click');
 const conflict=create(store,manager,'conflict',async i=>proof(i,'9999'));
 await deny(conflict.resolveVerified({fillId:request.fillId,newAdId:'9999'}),
  'KR_PUBLISH_INTENT_UNRESOLVED','conflicting later target cannot rewrite a verified result');
 const corrupt=disk();
 Object.assign(corrupt.rows,structuredClone(store.rows));
 const key=Object.keys(corrupt.rows).find(x=>x.startsWith(Journal.RESOLUTION_KEY_PREFIX));
 corrupt.rows[key].profileId='changed';
 await deny(create(corrupt,manager).observe(request.fillId),
  'KR_PUBLISH_INTENT_CORRUPT','corrupted resolution is fail-closed');
 console.log('PASS KAR99 P6 independently verified publication '+n+' assertions');
})().catch(error=>{console.error(error);process.exitCode=1;});
