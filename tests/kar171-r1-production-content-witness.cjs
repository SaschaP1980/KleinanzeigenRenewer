// KAR-171 R1: private original-P8-bound content-side in-flight witness.
// It can observe an authenticated read-only request, never authorize an update.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const remote=fs.readFileSync('src/background/services/remote-delete-replacement-service.js','utf8');
const observer=fs.readFileSync('src/background/services/additional-owner-observer.js','utf8');
const runner=fs.readFileSync('src/content/inventory-runner.js','utf8');
const ops=fs.readFileSync('src/content/inventory-delete-operations.js','utf8');
const registry=fs.readFileSync('src/shared/message-contract-registry.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
test('original immutable P8 owner observer is the ONLY private opt-in source',()=>{
 assert.match(observer,/r1PrivateWitnessNonce/);
 assert.match(observer,/verifyFreshPhase4RemoteOutcomeReadOnly\([\s\S]*privateR1Witness/);
 assert.match(observer,/ORIGINAL_ACCOUNT_REMOTE_VERIFIED/);
 assert.match(observer,/r1Accepted:false,eligibleForLease:false/);
 assert.match(observer,/ORIGINAL_PHASE4_VALIDATION_UNAVAILABLE/);
});
test('real scanner forwards nonce only on fresh read-only source/target requests',()=>{
 assert.match(remote,/r1PrivateWitness/);
 assert.match(remote,/onR1ReadOnlyStage/);
 assert.match(remote,/r1ReadOnlyWitness/);
 assert.match(remote,/VERIFY_OWN_AD_ABSENT_BY_ID/);
 assert.match(remote,/FIND_OWN_AD_BY_ID/);
 assert.doesNotMatch(remote,/r1ReadOnlyWitness:[\s\S]{0,500}DELETE_OWN_AD_BY_ID/);
});
test('real content script receives and persists an independent bounded receipt',()=>{
 assert.match(runner,/kar171R1ContentWitnessV1/);
 assert.match(runner,/r1ReadOnlyWitness/);
 assert.match(runner,/emit\('received'\)/);
 assert.match(runner,/emit\('settled'\)/);
 assert.match(runner,/emit\('failed'\)/);
 assert.match(runner,/chrome\.storage\.local\.set/);
 assert.match(runner,/onReadOnlyPageObserved/);
});
test('authenticated full pagination gives bounded page counts without IDs',()=>{
 assert.match(ops,/onReadOnlyPageObserved/);
 assert.match(ops,/seenAdIds\.size/);
 assert.match(ops,/pages\.length/);
 assert.match(ops,/await onReadOnlyPageObserved/);
});
test('no additional public message, permissions, or update authority',()=>{
 assert.equal(manifest.version,'1.25.34', 'current Work build must preserve R1 permission and IPC boundaries');
 assert.deepEqual(manifest.permissions,
   ['activeTab','storage','unlimitedStorage','scripting','nativeMessaging']);
 assert.doesNotMatch(registry,/KAR171_R1_CONTENT_(?:ACK|UPDATE)/);
 assert.doesNotMatch(runner,/chrome\.runtime\.reload\(/);
 assert.doesNotMatch(runner,/chrome\.storage\.local\.clear\(/);
});

const vm=require('node:vm');
function contentFixture({failure=false,badPage=false,manualHoldTimer=false}={}){
 const holdTimers=[];
 const writes=[],operations=[],calls=[];
 let receiver=null;
 const roster={isMyAdsUrl:()=>false,isMyAdsProjectsUrl:()=>true,
  parseOnlineCount:()=>({online:2}),scanListings:()=>[],
  currentPageNumber:()=>1,detectedProfileName:()=>'',pageFingerprint:()=>'none',
  nextPageButton:()=>null,isDisabledControl:()=>true,waitForPageChange:async()=>true,
  waitForListings:async()=>[]};
 const readiness={currentMyAdsStatusSnapshot:()=>({isMyAdsPage:true}),
  waitForMyAdsReady:async()=>({isMyAdsPage:true})};
 const operation=async(method,adId,correlation,options)=>{
  calls.push({method,adId,options});
  if (typeof options?.onReadOnlyPageObserved==='function'){
    await options.onReadOnlyPageObserved(badPage
      ?{pagesScanned:0,uniqueCards:2,expectedOnline:1}
      :{pagesScanned:1,uniqueCards:2,expectedOnline:2});
    if(failure)throw Error('SYNTHETIC_PRIVATE_SCAN_FAILURE');
  }
  return {verified:true,found:true,adId};
 };
 const deps={
  KRMessageContractRegistry:{route:()=>({action:'accept'})},
  KRInventoryRosterParser:{create:()=>roster},
  KRInventoryReadiness:{create:()=>readiness},
  KRInventoryStatusOverlay:{create:()=>({refreshFailureHighlights:async()=>{}})},
  KRInventoryDeleteOperations:{create:()=>({
   findOwnAdById:(id,context,options)=>operation('target',id,context,options),
   verifyOwnAdAbsentById:(id,context,options)=>operation('source',id,context,options),
   deleteOwnAdById:()=>{throw Error('MUTATION_NEVER_ALLOWED')},
   snapshotOwnAdRoster:async()=>({})})},
  KRInventoryRunLoop:{create:()=>({autoResume:()=>{throw Error('NO_AUTORUN')}})}
 };
 const context={
  chrome:{runtime:{onMessage:{addListener:fn=>{receiver=fn}},
    sendMessage:()=>{throw Error('NO_RUNTIME_IPC')}},
   storage:{local:{set:async payload=>{writes.push(structuredClone(payload.kar171R1ContentWitnessV1));}},
    onChanged:{addListener:()=>{}}}},
  KRDeps:{require:name=>deps[name],optional:()=>null,
    register:(name,obj)=>operations.push({name,obj})},
  document:{documentElement:null},
  location:{pathname:'/m-meine-anzeigen.html'},
  __KR_PLATFORM_ACCESS_RESTRICTED__:true,
  setTimeout:manualHoldTimer
   ?(fn,ms)=>{holdTimers.push({fn,ms});return holdTimers.length}
   :setTimeout,
  clearTimeout,console
 };
 context.globalThis=context;
 vm.runInNewContext(fs.readFileSync('src/content/inventory-runner.js','utf8'),
   vm.createContext(context),{filename:'inventory-runner.js'});
 assert.equal(typeof receiver,'function');
 const send=async m=>await new Promise(resolve=>{
  const returned=receiver(m,{},resolve);
  assert.equal(returned,true,'content read-only route must stay async');
 });
 return {writes,calls,send,operations,holdTimers};
}
test('normal source/target scans require no content witness storage writes',async()=>{
 const f=contentFixture();
 for(const type of ['VERIFY_OWN_AD_ABSENT_BY_ID','FIND_OWN_AD_BY_ID']){
  const response=await f.send({type,adId:'137000100',expectedProfileName:'synthetic'});
  assert.equal(response.ok,true);
 }
 assert.equal(f.calls.length,2);
 assert.equal(f.writes.length,0);
 assert.equal(f.calls.every(c=>c.options?.onReadOnlyPageObserved===null),true);
});
test('private original-P8 nonce receives actual source content and page counters',async()=>{
 const f=contentFixture(),nonce='a'.repeat(32),workerId='worker-fixture-123';
 const response=await f.send({type:'VERIFY_OWN_AD_ABSENT_BY_ID',adId:'137000100',
  r1ReadOnlyWitness:{schema:1,kind:'source',nonce,workerId}});
 assert.equal(response.ok,true);
 assert.deepEqual(f.writes.map(w=>w.state),['received','page-confirmed','settled']);
 assert.deepEqual(f.writes.map(w=>w.pagesScanned),[0,1,1]);
 for(const row of f.writes){
  assert.deepEqual(Object.keys(row).sort(),[
   'expectedOnline','kind','nonce','observedAtMs','pagesScanned','schema',
   'state','uniqueCards','workerId'].sort());
  assert.equal(row.nonce,nonce);assert.equal(row.workerId,workerId);
  assert.equal(row.kind,'source');
  assert.ok(!JSON.stringify(row).includes('137000100'));
 }
});
test('target private receipt is independently kind-bound to genuine read-only route',async()=>{
 const f=contentFixture(),nonce='b'.repeat(32);
 const response=await f.send({type:'FIND_OWN_AD_BY_ID',adId:'137000200',
  r1ReadOnlyWitness:{schema:1,kind:'target',nonce,workerId:'worker-fixture'}});
 assert.equal(response.ok,true);
 assert.equal(f.writes.length,3);
 assert.equal(f.writes.every(x=>x.kind==='target'),true);
});
test('invalid witness rejects BEFORE source scan and never writes',async()=>{
 const f=contentFixture();
 const response=await f.send({type:'VERIFY_OWN_AD_ABSENT_BY_ID',adId:'137000100',
  r1ReadOnlyWitness:{schema:1,kind:'target',nonce:'a'.repeat(32),workerId:'worker-1'}});
 assert.equal(response.ok,false);
 assert.equal(f.calls.length,0);
 assert.equal(f.writes.length,0);
});
test('failed private scan cannot produce settled status or positive response',async()=>{
 const f=contentFixture({failure:true}),nonce='c'.repeat(32);
 const response=await f.send({type:'FIND_OWN_AD_BY_ID',adId:'137000200',
  r1ReadOnlyWitness:{schema:1,kind:'target',nonce,workerId:'worker-fixture'}});
 assert.equal(response.ok,false);
 assert.deepEqual(f.writes.map(x=>x.state),['received','page-confirmed','failed']);
});
test('invalid content page counters fail closed without remote positive',async()=>{
 const f=contentFixture({badPage:true}),nonce='d'.repeat(32);
 const response=await f.send({type:'VERIFY_OWN_AD_ABSENT_BY_ID',adId:'137000100',
  r1ReadOnlyWitness:{schema:1,kind:'source',nonce,workerId:'worker-fixture'}});
 assert.equal(response.ok,false);
 assert.deepEqual(f.writes.map(x=>x.state),['received','failed']);
});

test('controlled hold is initiated only by a source-scoped private witness, and times out fail-closed',async()=>{
 const f=contentFixture({manualHoldTimer:true}),nonce='e'.repeat(32);
 let replied=false;
 const send=f.send({type:'VERIFY_OWN_AD_ABSENT_BY_ID',adId:'137000100',
  r1ReadOnlyWitness:{schema:2,kind:'source',nonce,workerId:'worker-fixture',holdMs:45000}
 }).then(v=>{replied=true;return v});
 for(let i=0;i<25;i++)await Promise.resolve();
 assert.equal(replied,false);
 assert.deepEqual(f.writes.map(x=>x.state),['received','page-confirmed','held-pending']);
 assert.equal(f.writes.at(-1).schema,2);
 assert.equal(f.writes.at(-1).holdUntilMs>=Date.now()+40000,true);
 assert.equal(f.holdTimers.length,1);
 assert.equal(f.holdTimers[0].ms,45000);
 f.holdTimers[0].fn();
 const result=await send;
 assert.equal(result.ok,false);
 assert.equal(f.writes.at(-1).state,'failed');
 assert.equal(f.writes.some(x=>x.state==='settled'),false);
 assert.equal(f.calls.length,1);
});
test('target hold requires precisely scoped kind and rejects arbitrary timing',async()=>{
 const f=contentFixture({manualHoldTimer:true});
 const response=await f.send({type:'FIND_OWN_AD_BY_ID',adId:'137000200',
  r1ReadOnlyWitness:{schema:2,kind:'target',nonce:'f'.repeat(32),
   workerId:'worker-fixture',holdMs:7200000}});
 assert.equal(response.ok,false);
 assert.equal(f.calls.length,0);
 assert.equal(f.writes.length,0);
 assert.equal(f.holdTimers.length,0);
});

test('controlled source owner script is inert outside v1.25.24 and has no stop or mutation route',()=>{
 const script=fs.readFileSync('docs/testing/KAR171_R1_CONTROLLED_SOURCE_HOLD_READ_ONLY.js','utf8');
 assert.match(script,/const MIN_VERSION='1\.25\.24'/);
 assert.match(script,/const EXT='hafahjhhgiipdegfkgacchmnacgblnah'/);
 assert.match(script,/r1PrivateHoldKind:'source'/);
 assert.match(script,/r1PrivateWitnessNonce/);
 assert.match(script,/runtimeVersion\(\)!==MIN_VERSION/);
 assert.match(script,/inspectOriginalRenewalRemoteLineageReadOnly/);
 assert.doesNotMatch(script,/chrome\.runtime\.reload\(/);
 assert.doesNotMatch(script,/chrome\.tabs\.(?:remove|update|create)\(/);
 assert.doesNotMatch(script,/\.requestSubmit\(|\.submit\(/);
 assert.doesNotMatch(script,/safeToApply:\s*true|eligibleForLease:\s*true|r1Accepted:\s*true/);
});
