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
 const publishOwner=fs.readFileSync('src/background/services/publish-intent-authorization-service.js','utf8');
 ok(bg.includes('requirePublishIntentAuthorizationService().verifyAutoPublishRemoteOutcomeFresh(intent, newAdId)') &&
   publishOwner.includes('async function verifyAutoPublishRemoteOutcomeFresh(') &&
   publishOwner.includes("type:'MY_ADS_STATUS'") &&
   publishOwner.includes("type:'FIND_OWN_AD_BY_ID'"),
  'trusted in-process owner independently verifies exact-ID and same-account My Ads evidence');
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
 // KAR-171 W2: a positive remote result must identify a found page that
 // was actually inspected by the full-pagination scan.
 const impossible=create(store,manager,'invalid-pagination',
   async (i,newId)=>({...proof(i,newId),targetPagesScanned:1,targetFoundPage:2}));
 await deny(impossible.resolveVerified({fillId:request.fillId,newAdId:'7890'}),
   'KR_PUBLISH_INTENT_UNVERIFIED','found page outside scanned pages cannot confirm publication');
 ok((await a.observe(request.fillId)).state==='unverified',
   'impossible pagination leaves the original publication intent unresolved');
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
 // Historical local receipts must also reject impossible pagination after
 // worker restart, even when the new remote proof function is not invoked.
 const impossibleHistory=disk();
 Object.assign(impossibleHistory.rows,structuredClone(store.rows));
 const impossibleKey=Object.keys(impossibleHistory.rows).find(x=>x.startsWith(Journal.RESOLUTION_KEY_PREFIX));
 impossibleHistory.rows[impossibleKey].targetPagesScanned=1;
 impossibleHistory.rows[impossibleKey].targetFoundPage=2;
 await deny(create(impossibleHistory,manager).observe(request.fillId),
   'KR_PUBLISH_INTENT_CORRUPT','historical publication receipt beyond scanned pages fails closed');
 // R1: proof of publication is never commit-authoritative without a new
 // read-only live context bound inside the same origin Web Lock.
 const strictDisk=disk(),strictLocks=locks(),commitObservations=[];
 let liveContext='profile-1',remoteChecked=false;
 let publishStaged=0,publishClosed=0;
 function strictPublish(commitProof){
   return Journal.create({storageLocal:strictDisk,lockManager:strictLocks,
     lockName:Atomic.LOCK_NAME,workerInstanceId:'r1-commit-worker',
     clock:()=>100000,newToken:()=> 'r1-commit-attempt',
     verifyRemoteOutcome:(i,id)=>{remoteChecked=true;return proof(i,id);},
     requireCommitContext:true,
     prepareCommitContext:async()=>{
       if(strictLocks.held.has(Atomic.LOCK_NAME)||!remoteChecked)
         throw Error('commit witness prepared during lock or before remote');
       publishStaged++;
       return Object.freeze({tabId:88,close:async()=>{publishClosed++;}});
     },
     verifyCommitContext:(original,witness)=>
       witness?.tabId===88&&commitProof?.(original,witness)===true});
 }
 const strictEntry=await strictPublish(null).begin({
   fillId:'r1-commit',workflowId:'r1-work',kind:'renewal',
   profileId:'profile-1',sourceAdId:'1234',targetTabId:7});
 await deny(()=>strictPublish(null).resolveVerified({fillId:'r1-commit',newAdId:'7890'}),
   'KR_PUBLISH_INTENT_UNVERIFIED','R1: missing read-only commit context is rejected');
 ok(!remoteChecked,'R1: absent commit-context source stops before remote scan');
 await deny(()=>strictPublish(()=>false).resolveVerified({fillId:'r1-commit',newAdId:'7890'}),
   'KR_PUBLISH_INTENT_UNVERIFIED','R1: negative authenticated context rejects remote success');
 await deny(()=>strictPublish(()=>{throw Error('unavailable');}).resolveVerified({fillId:'r1-commit',newAdId:'7890'}),
   'KR_PUBLISH_INTENT_UNVERIFIED','R1: failed live-source lookup is never positive');
 liveContext='different-account';
 await deny(()=>strictPublish(()=>liveContext==='profile-1').resolveVerified({fillId:'r1-commit',newAdId:'7890'}),
   'KR_PUBLISH_INTENT_UNVERIFIED','R1: account switched after scan cannot confirm publication');
 ok(Object.keys(strictDisk.rows).every(k=>!k.startsWith(Journal.RESOLUTION_KEY_PREFIX)),
   'R1: denied publication has no persisted positive result');
 liveContext='profile-1';
 const strictConfirmed=await strictPublish(intent=>{
   commitObservations.push({held:strictLocks.held.has(Atomic.LOCK_NAME),attemptId:intent.attemptId});
   return liveContext===intent.profileId;
 }).resolveVerified({fillId:'r1-commit',newAdId:'7890'});
 ok(strictConfirmed.state==='resolved-confirmed'&&commitObservations.length===1
    &&commitObservations[0].held===true&&commitObservations[0].attemptId===strictEntry.attemptId,
    'R1: stable live context is independently checked inside origin lock at durable commit');
 ok(publishStaged===publishClosed&&publishStaged>=4,
    'R1: staged read-only publication proof is always closed on deny or success');
 // R1: A publication result with an original P8 admission must be tied
 // to the real, unmodified START source throughout the independent scan.
 // The same immutable attempt may be inspected by a later Worker.
 async function originalP8Publish({kind='renewal',before,during}={}) {
   const db=disk(),manager=locks(),token='original-publish-p8-token-001';
   const original={schema:1,state:'admitted',token,
     operationType:'AUTHORIZE_AUTOMATIC_PUBLISH',
     workerInstanceId:'worker-origin',startedAtMs:100};
   const key=Atomic.START_PREFIX+token;
   db.rows[key]=structuredClone(original);
   const input=kind==='archive'?{
     fillId:'archive-fill',workflowId:'archive-workflow',kind:'archive',
     profileId:'profile-1',sourceAdId:'',targetTabId:9
   }:request;
   const entry=await create(db,manager,'worker-origin').begin({
     ...input,admissionReceipt:Object.freeze({...original})
   });
   if(before)before(db.rows,key,token,entry);
   let probes=0;
   const scanner=(i,id)=>{
     probes++;
     if(during)during(db.rows,key,token,entry);
     return proof(i,id);
   };
   return {db,entry,token,get probes(){return probes;},
     scan:()=>create(db,manager,'worker-after-restart',scanner)
       .resolveVerified({fillId:input.fillId,newAdId:'7890'})};
 }
 for(const kind of ['renewal','archive']) {
   const stable=await originalP8Publish({kind});
   const result=await stable.scan();
   ok(result.state==='resolved-confirmed'&&stable.probes===1
     &&result.attemptId===stable.entry.attemptId
     &&result.fillId===stable.entry.fillId,
     'R1: '+kind+' P8-token-bound exact publication verified after Worker restart');
 }
 for(const [label,mutate] of [
   ['removed origin START',(rows,key)=>{delete rows[key];}],
   ['replaced origin Worker',(rows,key)=>{rows[key].workerInstanceId='wrong-worker';}],
   ['changed origin operation',(rows,key)=>{rows[key].operationType='GET_DIAGNOSTIC_EXPORT';}],
   ['forged P8 FINISH',(rows,key,token,entry)=>{rows[Atomic.FINISH_PREFIX+token]={
     schema:1,state:'completed',token,workerInstanceId:'wrong-worker',
     completedAtMs:entry.createdAtMs+1};}]
 ]) {
   const x=await originalP8Publish({before:mutate});
   await deny(x.scan,'KR_PUBLISH_INTENT_UNVERIFIED',
     'R1: '+label+' fails before trusting publication');
   ok(x.probes===0&&!Object.keys(x.db.rows).some(k=>k.startsWith(Journal.RESOLUTION_KEY_PREFIX)),
     'R1: '+label+' cannot run remote verifier or persist success');
 }
 for(const [label,mutate] of [
   ['Worker identity changes during scan',(rows,key)=>{rows[key].workerInstanceId='changed';}],
   ['original P8 START disappears midscan',(rows,key)=>{delete rows[key];}],
   ['P8 FINISH appears during scan',(rows,key,token,entry)=>{rows[Atomic.FINISH_PREFIX+token]={
      schema:1,state:'completed',token,workerInstanceId:'worker-origin',
      completedAtMs:entry.createdAtMs+1};}]
 ]) {
   const x=await originalP8Publish({during:mutate});
   await deny(x.scan,'KR_PUBLISH_INTENT_UNVERIFIED',
     'R1: '+label+' cannot commit original publication outcome');
   ok(x.probes===1&&!Object.keys(x.db.rows).some(k=>k.startsWith(Journal.RESOLUTION_KEY_PREFIX)),
     'R1: '+label+' leaves original publication attempt unresolved');
 }
 // Exercise the actual capture listeners (not only source-text assertions).
 const original={KRDeps:globalThis.KRDeps,document:globalThis.document,
   Element:globalThis.Element,HTMLInputElement:globalThis.HTMLInputElement};
 globalThis.KRDeps={register(){}};
 const Flow=require('../src/content/template-publish-flow.js');
 class ElementStub {
  constructor(){this.textContent='Anzeige aufgeben';this.disabled=false;this.isConnected=true;}
  closest(){return this;}
 }
 class InputStub extends ElementStub {}
 globalThis.Element=ElementStub;globalThis.HTMLInputElement=InputStub;
 function rig(fillId,authorization){
  const events=Object.create(null);let remote=0,signals=0,denials=0;
  globalThis.document={addEventListener(type,fn){events[type]=fn;}};
  const button=new ElementStub();
  function synthetic(type,submitter=button){
   const e={target:button,submitter,defaultPrevented:false,stopped:false,
     preventDefault(){this.defaultPrevented=true;},
     stopImmediatePropagation(){this.stopped=true;}};
   events[type](e);
   if(type==='click'&&!e.defaultPrevented)remote++;
   return e;
  }
  button.click=()=>synthetic('click');
  const api=Flow.create({
   clean:s=>String(s||'').trim(),visible:()=>true,
   runtimeMessage:m=>m.type==='AUTHORIZE_AUTOMATIC_PUBLISH'?authorization():
     (m.type==='RENEWAL_PUBLISH_CLICKED'?(signals++,Promise.resolve({accepted:true})):
       Promise.resolve({})),
   diagnostic:()=>{denials++},updatePanel:()=>{},sleep:async()=>{},
   PaidInsertionGuard:{detect:()=>({required:false})}
  });
  api.armPublishDetection(fillId);
  return {synthetic,get remote(){return remote;},get signals(){return signals;},get denials(){return denials;}};
 }
 let approve;
 const promise=new Promise(resolve=>approve=resolve);
 const allowed=rig('manual-event-001',()=>promise);
 const intercepted=allowed.synthetic('click');
 ok(intercepted.defaultPrevented&&intercepted.stopped&&allowed.remote===0,
  'manual click is synchronously suppressed before background authorization');
 approve({authorized:true});
 for(let k=0;k<14;k++)await Promise.resolve();
 ok(allowed.remote===1&&allowed.signals===1,
  'one authorized manual click crosses UI boundary after durable approval');
 const repeat=allowed.synthetic('click');
 ok(repeat.defaultPrevented&&allowed.remote===1,
  'second manual click cannot replay publication');
 const refused=rig('manual-event-denied',async()=>({authorized:false}));
 const refusedEvent=refused.synthetic('click');
 for(let k=0;k<14;k++)await Promise.resolve();
 ok(refusedEvent.defaultPrevented&&refused.remote===0,
  'denied background authorization never clicks external publish');
 const implicit=rig('manual-keyboard-unknown',async()=>({authorized:true}));
 const enter=implicit.synthetic('submit',null);
 ok(enter.defaultPrevented&&enter.stopped&&implicit.remote===0,
  'implicit submit without submitter fails closed');
 Object.assign(globalThis,original);
 console.log('PASS KAR99 P6 independently verified publication '+n+' assertions');
})().catch(error=>{console.error(error);process.exitCode=1;});
