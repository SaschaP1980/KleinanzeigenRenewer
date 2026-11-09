// KAR-99 P6 — test-first durable authorization before an automated external publish click.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Atomic = require('../src/background/services/cross-worker-atomic-admission.js');
const source = fs.readFileSync('src/content/template-publish-flow.js','utf8');
const bg = fs.readFileSync('src/background/background.js','utf8');
const registry = fs.readFileSync('src/shared/message-contract-registry.js','utf8');
const observer = fs.readFileSync('src/background/services/persisted-owner-observer.js','utf8');
let count=0;
const ok=(v,label)=>{assert.ok(v,label);count++;console.log('PASS KAR99-P6-PUBLISH '+label)};
const publish = source.slice(source.indexOf('async function autoPublishVerifiedRenewal('),source.indexOf('function findPostFillContinueButtons('));
const click=publish.indexOf('button.click();');
const permit=publish.indexOf("type: 'AUTHORIZE_AUTOMATIC_PUBLISH'");
ok(click>0 && permit>0 && permit<click,
 'automated remote publish requires background authorization before the real click');
ok(publish.lastIndexOf('await runtimeMessage(',permit)>=0,
 'the authorization must be awaited, not an asynchronous notification');
ok(publish.slice(permit,click).includes('catch'),
 'authorization rejection must halt the click rather than silently continue');
ok(registry.includes('"AUTHORIZE_AUTOMATIC_PUBLISH"')&&bg.includes('"AUTHORIZE_AUTOMATIC_PUBLISH":'),
 'published message contract and central routed handler are both present');
ok(bg.includes("AutoPublishIntentJournal.create(")
 &&bg.includes('lockName: AtomicMV3Admission.LOCK_NAME')
 &&bg.includes('lockManager: globalThis.navigator?.locks'),
 'production journal uses same origin-wide Web Lock and actual MV3 lock manager');
ok(observer.includes('karAutoPublishIntentV1_'),
 'read-only owner observer retains unresolved external-publish receipts after worker restart');
const Journal=require('../src/background/services/auto-publish-intent-journal.js');
const req={fillId:'fill-001',workflowId:'renewal-001',kind:'renewal',profileId:'same-profile',
 sourceAdId:'123456',targetTabId:27};
function disk(){
 const rows=Object.create(null);let writes=0;
 return {rows,get writes(){return writes},
 async get(keys){const ks=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
  return Object.fromEntries(ks.filter(k=>Object.hasOwn(rows,k)).map(k=>[k,structuredClone(rows[k])]))},
 async set(values){writes++;Object.assign(rows,structuredClone(values))}};
}
function locks(){
 const held=new Set();
 return {held,async request(name,opts,fn){
  assert.equal(name,Atomic.LOCK_NAME);assert.equal(opts.mode,'exclusive');
  assert.equal(opts.ifAvailable,true);
  if(held.has(name))return fn(null);
  held.add(name);try{return await fn({name})}finally{held.delete(name)}
 }};
}
let seq=0;
const make=(storageLocal,lockManager,id='worker-a')=>Journal.create({
 storageLocal,lockManager,lockName:Atomic.LOCK_NAME,workerInstanceId:id,
 clock:()=>12000+seq++,newToken:()=> 'receipt-'+(++seq)+'-unique'
});
const denies=async(p,code,label)=>{await assert.rejects(p,e=>e?.code===code,label);ok(true,label)};
(async()=>{
 const store=disk(),lm=locks(),a=make(store,lm),b=make(store,lm,'worker-b');
 await denies(make(disk(),null).begin(req),'KR_PUBLISH_INTENT_ATOMIC_UNAVAILABLE',
  'missing Web Lock fails closed');
 lm.held.add(Atomic.LOCK_NAME);
 await denies(a.begin(req),'KR_PUBLISH_INTENT_ATOMIC_BUSY',
  'contended shared lock blocks remote publication');
 ok(store.writes===0,'denied preflight cannot write an admitted receipt');
 lm.held.delete(Atomic.LOCK_NAME);
 await denies(a.begin({...req,profileId:''}),'KR_PUBLISH_INTENT_IDENTITY',
  'missing authenticated profile is rejected');
 const receipt=await a.begin(req);
 ok(receipt.state==='outcome-unverified'&&receipt.targetTabId===27,
  'valid same-account, same-tab intent is persisted before click');
 ok(store.writes===1&&Object.keys(store.rows).some(k=>k.startsWith(Journal.KEY_PREFIX)),
  'immutable per-attempt record is written exactly once');
 await denies(b.begin(req),'KR_PUBLISH_INTENT_UNRESOLVED',
  'new worker cannot repeat a possibly submitted publish after restart');
 const corrupted=disk();corrupted.rows[Journal.KEY_PREFIX+'bad_bad']={unexpected:true};
 await denies(make(corrupted,lm,'worker-c').begin({...req,fillId:'other-fill'}),
  'KR_PUBLISH_INTENT_CORRUPT','corrupted historical receipt blocks unrelated new remote mutation');
 console.log('PASS KAR99 P6 publish-boundary '+count+' assertions');
})().catch(e=>{console.error(e);process.exitCode=1});
