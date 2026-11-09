// KAR-99/P7 RED-first: eight missing real owner classes, no fabricated idle.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Additional=require('../src/background/services/additional-owner-observer.js');
const bg=fs.readFileSync('src/background/background.js','utf8');
let n=0;
const ok=(condition,label)=>{assert.ok(condition,label);n++;console.log('PASS KAR99-P7 '+label)};
function db(local={},session={}) {
  let failLocal=false,failSession=false,writes=0;
  const get=(values,fail)=>async(keys)=>{
    if(fail())throw Error('read unavailable');
    const fields=keys===null?Object.keys(values):Array.isArray(keys)?keys:[keys];
    return Object.fromEntries(fields.filter(k=>Object.hasOwn(values,k)).map(k=>[k,structuredClone(values[k])]));
  };
  return {
    local:{get:get(local,()=>failLocal),set:async()=>{writes++;throw Error('read-only observer');}},
    session:{get:get(session,()=>failSession),set:async()=>{writes++;throw Error('read-only observer');}},
    localData:local,sessionData:session,failLocal:v=>failLocal=v,failSession:v=>failSession=v,
    get writes(){return writes;}
  };
}
function create(data){return Additional.create({storageLocal:data.local,storageSession:data.session,workerInstanceId:'worker-current',clock:()=>123000});}
(async()=>{
  const expected=['singleInventory','trashMutation','managedTabs','profileTransition',
    'accountTransition','emergencyRecovery','diagnosticExport','nativeUpdateTransaction'];
  ok(JSON.stringify(Additional.OWNERS)===JSON.stringify(expected),'exact eight named supplemental owner sources');
  const data=db(),owner=create(data),first=await owner.observe();
  ok(first.schema===1&&first.eligibleForLease===false,'supplemental observation never authorizes updater lease');
  ok(expected.every(k=>first.observations[k].state==='unknown'),'missing evidence yields eight unknowns, not idle');
  let finish;const waiting=new Promise(resolve=>finish=resolve);
  let entered=false;
  const running=owner.track(['singleInventory','trashMutation'],async()=>{entered=true;await waiting;return 17;});
  while(!entered)await Promise.resolve();
  const during=await owner.observe();
  ok(during.observations.singleInventory.state==='active'&&during.observations.trashMutation.state==='active',
    'real promise lifetime actively attributes single inventory and trash mutation');
  ok(during.observations.profileTransition.state==='unknown','unrelated owner not invented active or idle');
  finish();ok(await running===17,'tracked asynchronous task returns original result');
  const ended=await owner.observe();
  ok(ended.observations.singleInventory.state==='unknown'&&ended.observations.trashMutation.state==='unknown',
    'after in-process completion, no false cross-worker idle guarantee');
  await assert.rejects(owner.track(['notAnOwner'],()=>true),/unknown|requires|known/i);
  ok(true,'unknown owner registration rejected before task executes');
  const tabbed=db({},{
    tabRegistryV1:{'19':{tabId:19,managed:true,lifecycleState:'active',owner:{ownerType:'renewal',ownerId:'r-1'}}}
  });
  const observedTabs=await create(tabbed).observe();
  ok(observedTabs.observations.managedTabs.state==='active','real managed registry tab positively proves tab owner busy');
  tabbed.sessionData.tabRegistryV1['19'].lifecycleState='gone';
  const gone=await create(tabbed).observe();
  ok(gone.observations.managedTabs.state==='unknown','gone registry entry alone is no proof of idle');
  const legacy=db({}, {managedWorkerTabsV1:{'22':{kind:'worker'}}});
  ok((await create(legacy).observe()).observations.managedTabs.state==='active',
    'live legacy managed worker registry also blocks optimistic owner idle');
  const native=db({nativeUpdateWorkflowFenceV1:{schema:1,state:'reserved',profileId:'p',transactionId:'tx'}});
  ok((await create(native).observe()).observations.nativeUpdateTransaction.state==='active',
    'persisted reserved NativeHost update transaction is positive busy evidence');
  const mismatched=db({activeDetectedProfileV1:{profileId:'p1'},selectedInventoryProfileV1:{profileId:'p2'}});
  const mismatch=await create(mismatched).observe();
  ok(mismatch.context.profile.state==='unverified','different selected/live profile hints never prove current account');
  ok(mismatch.observations.profileTransition.state!=='idle'&&mismatch.observations.accountTransition.state!=='idle',
    'profile/account transitions cannot be inferred idle from disagreement');
  const storageFault=db();storageFault.failSession(true);
  const failed=await create(storageFault).observe();
  ok(failed.observations.managedTabs.state==='unknown','session storage failure leaves tab owner UNKNOWN');
  ok(failed.eligibleForLease===false,'broken source must not grant update lease');
  const crash=await create(db()).observe();
  ok(crash.context.worker.state==='unverified','restarted worker cannot inherit positive generation proof');
  ok(data.writes===0&&tabbed.writes===0&&legacy.writes===0,'read-only owner observation never migrates/mutates registry');
  ok(bg.includes("KRAdditionalOwnerObserver")&&bg.includes('requireAdditionalOwnerObserver().track('),
    'real background tracks all routed and autonomous P7 owner lifetimes through shared original work fence');
  ok(!bg.includes('getOwnerSnapshot: () => requireAdditionalOwnerObserver()'),
    'unverified P7 snapshots must never be promoted to positive updater reserve');
  console.log('PASS KAR99-P7 '+n+' focused checks');
})().catch(e=>{console.error(e);process.exitCode=1});
