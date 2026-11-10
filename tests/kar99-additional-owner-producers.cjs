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
function create(data, ports={}){return Additional.create({storageLocal:data.local,storageSession:data.session,workerInstanceId:'worker-current',clock:()=>123000,...ports});}
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
  // P1.3-E1 test-first source corroboration: a gone registry tombstone
  // cannot by itself hide a physically present Chrome tab.
  const goneButLive=db({}, {tabRegistryV1:{
    '41':{tabId:41,managed:true,lifecycleState:'gone',closedAt:'2026-11-10T00:00:00Z'}
  }});
  let queried=0;
  const contradiction=await create(goneButLive,{queryBrowserTabsReadOnly:async()=>{
    queried++;return [{id:41,url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html'}];
  }}).observe();
  ok(queried===1&&contradiction.observations.managedTabs.state==='unknown'
    &&contradiction.observations.managedTabs.reason==='GONE_MANAGED_TAB_STILL_OPEN',
    'real Chrome tab still present after managed GONE blocks any positive idle assertion');
  const queryUnavailable=await create(db(),{queryBrowserTabsReadOnly:async()=>{
    throw Error('CHROME_QUERY_REJECTED');
  }}).observe();
  ok(queryUnavailable.observations.managedTabs.state==='unknown'
    &&queryUnavailable.observations.managedTabs.reason==='LIVE_TABS_QUERY_FAILED',
    'Chrome tab enumeration failure is explicitly UNKNOWN, never IDLE');
  const malformedTabs=await create(db(),{queryBrowserTabsReadOnly:async()=>[
    {id:9},{id:9}
  ]}).observe();
  ok(malformedTabs.observations.managedTabs.state==='unknown'
    &&malformedTabs.observations.managedTabs.reason==='LIVE_TABS_INVALID',
    'duplicate or malformed real tab IDs cannot be treated as complete enumeration');
  const torn=db({}, {tabRegistryV1:{
    '51':{tabId:51,managed:true,lifecycleState:'gone'}
  }});
  let sessionReads=0;
  const rawSessionGet=torn.session.get.bind(torn.session);
  torn.session.get=async keys=>{
    const result=await rawSessionGet(keys);
    if(++sessionReads===1) torn.sessionData.tabRegistryV1['51'].lifecycleState='active';
    return result;
  };
  const changed=await create(torn,{queryBrowserTabsReadOnly:async()=>[]}).observe();
  ok(sessionReads>=2&&changed.observations.managedTabs.state==='unknown'
    &&changed.observations.managedTabs.reason==='TAB_REGISTRY_CHANGED_DURING_READ',
    'torn registry snapshot during Chrome query blocks unverified idle');
  const stillActive=await create(tabbed,{queryBrowserTabsReadOnly:async()=>{
    throw Error('CHROME_QUERY_REJECTED');
  }}).observe();
  ok(stillActive.observations.managedTabs.state==='unknown',
    'previously closed tab without live query cannot be promoted to idle');
  const ongoing=db({}, {tabRegistryV1:{
    '61':{tabId:61,managed:true,lifecycleState:'active'}
  }});
  const persistedActive=await create(ongoing,{queryBrowserTabsReadOnly:async()=>{
    throw Error('CHROME_QUERY_REJECTED');
  }}).observe();
  ok(persistedActive.observations.managedTabs.state==='active',
    'positive busy registry evidence remains ACTIVE even if Chrome API fails');
  ok(goneButLive.writes===0&&torn.writes===0,
    'live Chrome/registry corroboration remains strictly read-only');
  ok(bg.includes('queryBrowserTabsReadOnly:()=>chrome.tabs.query({})'),
    'actual production background injects real read-only Chrome tab enumeration');
  const legacy=db({}, {managedWorkerTabsV1:{'22':{kind:'worker'}}});
  ok((await create(legacy).observe()).observations.managedTabs.state==='active',
    'live legacy managed worker registry also blocks optimistic owner idle');
  const native=db({nativeUpdateWorkflowFenceV1:{schema:1,state:'reserved',profileId:'p',transactionId:'tx'}});
  ok((await create(native).observe()).observations.nativeUpdateTransaction.state==='active',
    'persisted reserved NativeHost update transaction is positive busy evidence');
  // KAR-99 P1.3-E2 / RED: observe already-open My Ads content read-only,
  // without claiming a stable, authenticated account ID or an updater lease.
  const accountLocal={
    profilesV1:[{profileId:'profile-A',displayName:'Fixture account'}],
    activeDetectedProfileV1:{profileId:'profile-A'},
    selectedInventoryProfileV1:{profileId:'profile-A'}
  };
  const adPageUrl='https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS';
  const myAdsTabs=[{id:77,url:adPageUrl}];
  const statusFor=(name='Fixture account',url=adPageUrl)=>({
    pageType:'my-ads',url,auth:{loggedIn:true},profileName:name,
    accountId:'forged-account-id-must-not-be-trusted'
  });
  let statusCalls=0;
  const labelMatch=await create(db(accountLocal),{
    queryBrowserTabsReadOnly:async()=>structuredClone(myAdsTabs),
    readAccountPageStatusReadOnly:async id=>{statusCalls++;assert.equal(id,77);return statusFor();}
  }).observe();
  ok(statusCalls===1&&labelMatch.context.profile.state==='unverified'
    &&labelMatch.context.profile.reason==='LIVE_ACCOUNT_NAME_MATCH_STABLE_ID_UNVERIFIED'
    &&labelMatch.eligibleForLease===false,
    'matching site display name is a hint, NEVER a verified stable account ID');
  const whitespace=await create(db(accountLocal),{
    queryBrowserTabsReadOnly:async()=>structuredClone(myAdsTabs),
    readAccountPageStatusReadOnly:async()=>statusFor('Fixture   account')
  }).observe();
  ok(whitespace.context.profile.reason==='LIVE_ACCOUNT_NAME_MATCH_STABLE_ID_UNVERIFIED',
    'site account display whitespace is normalized before comparing saved labels');
  const switched=await create(db(accountLocal),{
    queryBrowserTabsReadOnly:async()=>structuredClone(myAdsTabs),
    readAccountPageStatusReadOnly:async()=>statusFor('Other logged in account')
  }).observe();
  ok(switched.context.profile.reason==='LIVE_ACCOUNT_PROFILE_NAME_MISMATCH'
    &&switched.observations.accountTransition.state==='unknown',
    'live account switch contradicting selected profile remains unverified');
  const conflicting=await create(db(accountLocal),{
    queryBrowserTabsReadOnly:async()=>[...myAdsTabs,{id:78,url:adPageUrl}],
    readAccountPageStatusReadOnly:async id=>statusFor(id===77?'Fixture account':'Another account')
  }).observe();
  ok(conflicting.context.profile.reason==='LIVE_ACCOUNT_TABS_DISAGREE',
    'two already-open My Ads tabs reporting different logins cannot attest identity');
  const missingScript=await create(db(accountLocal),{
    queryBrowserTabsReadOnly:async()=>structuredClone(myAdsTabs),
    readAccountPageStatusReadOnly:async()=>{throw Error('Receiving end does not exist');}
  }).observe();
  ok(missingScript.context.profile.reason==='LIVE_ACCOUNT_STATUS_UNAVAILABLE',
    'absent content script is UNKNOWN; observation must not bootstrap/navigate');
  let calls=0;
  const tabsGone=await create(db(accountLocal),{
    queryBrowserTabsReadOnly:async()=>++calls===1?structuredClone(myAdsTabs):[],
    readAccountPageStatusReadOnly:async()=>statusFor()
  }).observe();
  ok(calls>=2&&tabsGone.context.profile.reason==='LIVE_ACCOUNT_TABS_CHANGED',
    'My Ads tab disappearing across fresh query prevents account attribution');
  // P1.3-E3A RED-first: same URL/tab and unchanged stored profile do NOT
  // prove account continuity while PAGE_STATUS itself can switch logins.
  let midReadCalls=0;
  const accountSwitchedMidRead=await create(db(accountLocal),{
    queryBrowserTabsReadOnly:async()=>structuredClone(myAdsTabs),
    readAccountPageStatusReadOnly:async()=>
      statusFor(++midReadCalls===1?'Fixture account':'Other logged in account')
  }).observe();
  ok(midReadCalls===2&&accountSwitchedMidRead.context.profile.reason===
    'LIVE_ACCOUNT_STATUS_CHANGED_DURING_READ'
    &&accountSwitchedMidRead.observations.accountTransition.state==='unknown'
    &&accountSwitchedMidRead.eligibleForLease===false,
    'unchanged My Ads tab and profile hints cannot hide account switch between content readbacks');
  let logoutReads=0;
  const logoutMidRead=await create(db(accountLocal),{
    queryBrowserTabsReadOnly:async()=>structuredClone(myAdsTabs),
    readAccountPageStatusReadOnly:async()=>{
      const result=statusFor();
      if(++logoutReads===2)result.auth.loggedIn=false;
      return result;
    }
  }).observe();
  ok(logoutReads===2&&logoutMidRead.context.profile.reason===
    'LIVE_ACCOUNT_STATUS_CHANGED_DURING_READ',
    'same displayed name after logout never proves authenticated session continuity');
  let statusReadFailures=0;
  const statusLostMidRead=await create(db(accountLocal),{
    queryBrowserTabsReadOnly:async()=>structuredClone(myAdsTabs),
    readAccountPageStatusReadOnly:async()=>{
      if(++statusReadFailures===2)throw Error('content script disconnected');
      return statusFor();
    }
  }).observe();
  ok(statusReadFailures===2&&statusLostMidRead.context.profile.reason===
    'LIVE_ACCOUNT_STATUS_CHANGED_DURING_READ',
    'failed second content readback must remain UNKNOWN, never a positive identity');
  const missingReader=await create(db(accountLocal),{
    queryBrowserTabsReadOnly:async()=>structuredClone(myAdsTabs)
  }).observe();
  ok(missingReader.context.profile.reason==='LIVE_ACCOUNT_SOURCE_UNAVAILABLE',
    'missing read-only page reader is explicitly unverified');
  const noTab=await create(db(accountLocal),{
    queryBrowserTabsReadOnly:async()=>[]
  }).observe();
  ok(noTab.context.profile.reason==='LIVE_ACCOUNT_MY_ADS_TAB_ABSENT',
    'no already-open My Ads tab never triggers a navigation-based probe');
  const changedLocal=db(structuredClone(accountLocal));
  const firstGet=changedLocal.local.get.bind(changedLocal.local);
  let reads=0;
  changedLocal.local.get=async keys=>{
    const result=await firstGet(keys);
    if (++reads===2) changedLocal.localData.selectedInventoryProfileV1.profileId='another-profile';
    return result;
  };
  const rechecked=await create(changedLocal,{
    queryBrowserTabsReadOnly:async()=>structuredClone(myAdsTabs),
    readAccountPageStatusReadOnly:async()=>statusFor()
  }).observe();
  ok(rechecked.context.profile.reason==='LIVE_ACCOUNT_PROFILE_CHANGED_DURING_READ',
    'profile storage change during site observation invalidates attribution');
  ok(bg.includes("readAccountPageStatusReadOnly:tabId=>sendTabRequest(tabId,{type:'PAGE_STATUS'})"),
    'production probe is non-bootstrapping existing PAGE_STATUS message');
  ok(changedLocal.writes===0,
    'live account verification never writes account or profile storage');
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
