// KAR-99 P1.3 managedTabs: historical P8 tab close callbacks + independently
// reconciled CURRENT Chrome/session tab ownership. Neither proves prior worker
// generation shutdown, detached work, remote outcome, or trusted updater IDLE.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Owners=require('../src/background/services/additional-owner-observer.js');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
const CLOSED='2026-11-12T07:00:00.000Z';
const USER={id:7,url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html',windowId:2};
const GONE={tabId:9,managed:true,role:'worker',lifecycleState:'gone',closedAt:CLOSED};
const DEFAULT_REGISTRY=()=>({
 '7':{tabId:7,managed:false,role:'user',lifecycleState:'active'},
 '9':structuredClone(GONE)
});
function fixture({noBrowser=false,noSession=false}={}){
 const local={},session={
  tabRegistryV1:DEFAULT_REGISTRY(),managedWorkerTabsV1:{'9':{closedAt:CLOSED}}
 };
 let writes=0,readCount=0,sessionReads=0,tabQueries=0;
 let brokenLocal=false,brokenSession=false,afterLocal=null,afterSession=null,browser=null;
 return {
  local,session,get writes(){return writes},get tabQueries(){return tabQueries},
  onLocalRead(fn){afterLocal=fn},onSessionRead(fn){afterSession=fn},
  onBrowserQuery(fn){browser=fn},failLocal(){brokenLocal=true},
  failSession(){brokenSession=true},
  storageLocal:{
   async get(keys){
    if(brokenLocal)throw Error('local unavailable');
    const names=keys===null?Object.keys(local):Array.isArray(keys)?keys:[keys];
    const out=Object.fromEntries(names.filter(k=>Object.hasOwn(local,k))
     .map(k=>[k,structuredClone(local[k])]));
    if(keys===null){readCount++;afterLocal?.(readCount,local)}
    return out;
   },async set(value){writes++;Object.assign(local,structuredClone(value))}
  },
  storageSession:{
   async get(keys){
    if(brokenSession)throw Error('session unavailable');
    if(noSession)return {};
    const names=keys===null?Object.keys(session):Array.isArray(keys)?keys:[keys];
    const out=Object.fromEntries(names.filter(k=>Object.hasOwn(session,k))
      .map(k=>[k,structuredClone(session[k])]));
    sessionReads++;afterSession?.(sessionReads,session);
    return out;
   }
  },
  queryBrowserTabsReadOnly:noBrowser?null:async()=>{
   tabQueries++;
   return structuredClone(browser?browser(tabQueries):[USER]);
  }
 };
}
function receipt(f,token,kind='AUTONOMOUS:tab-removed',finished=1200){
 f.local[Atomic.START_PREFIX+token]={schema:1,state:'admitted',
  token,operationType:kind,workerInstanceId:'earlier-generation',startedAtMs:1000};
 if(finished!==null)
  f.local[Atomic.FINISH_PREFIX+token]={schema:1,state:'completed',
   token,workerInstanceId:'earlier-generation',completedAtMs:finished};
}
function owner(f){return Owners.create({
 storageLocal:f.storageLocal,storageSession:f.storageSession,
 queryBrowserTabsReadOnly:f.queryBrowserTabsReadOnly,clock:()=>5000,
 workerInstanceId:'current-generation'
})}
const inspect=f=>owner(f).inspectManagedTabsClosureReadOnly();
function historicalOnly(p){
 assert.equal(p.schema,1);assert.equal(p.owner,'managedTabs');
 assert.equal(p.status,'callback-settled');assert.equal(p.eligibleForLease,false);
 assert.equal(p.priorGenerationClosed,false);assert.equal(p.detachedWorkVerified,false);
 assert.equal(p.remoteWorkVerified,false);assert.equal(p.liveTabsReconciled,true);
 assert.ok(Object.isFrozen(p));
}
test('real tab-removed P8 receipt plus Chrome and gone registry corroboration remains historical',async()=>{
 const f=fixture();receipt(f,'real_removed');const o=owner(f);
 const p=await o.inspectManagedTabsClosureReadOnly();
 historicalOnly(p);assert.equal(p.completedReceiptCount,1);
 assert.equal(p.verifiedUnmanagedTabCount,1);assert.equal(f.writes,0);
 assert.ok(f.tabQueries>=6);
 assert.notEqual((await o.observe()).observations.managedTabs.state,'idle');
});
test('routed BULK_CLOSE_WORKER callback can prove only historic settlement',async()=>{
 const f=fixture();receipt(f,'routed_closed','BULK_CLOSE_WORKER');
 historicalOnly(await inspect(f));
});
test('two exact eligible close sources are finite historical only',async()=>{
 const f=fixture();receipt(f,'removed1');receipt(f,'closed1','BULK_CLOSE_WORKER');
 const p=await inspect(f);historicalOnly(p);assert.equal(p.completedReceiptCount,2);
});
test('no original P8 receipt does not prove any callback',async()=>{
 const f=fixture();const p=await inspect(f);
 assert.equal(p.status,'unverified');assert.equal(p.eligibleForLease,false);
});
test('unfinished original worker tab callback must fail closed',async()=>{
 const f=fixture();receipt(f,'unsettled','BULK_CLOSE_WORKER',null);
 const p=await inspect(f);assert.equal(p.status,'unverified');
 assert.equal(p.reason,'DURABLE_ADMISSION_UNFINISHED');
});
test('finished close cannot hide a second unfinished tab callback',async()=>{
 const f=fixture();receipt(f,'exact_closed');
 receipt(f,'pending_close','BULK_CLOSE_WORKER',null);
 assert.equal((await inspect(f)).status,'unverified');
});
test('opening a tab is not equivalent to closing all managed tabs',async()=>{
 const f=fixture();receipt(f,'open_ad','OPEN_EDIT_AD');
 const p=await inspect(f);assert.equal(p.status,'unverified');
 assert.equal(p.reason,'OWNER_PROVENANCE_UNVERIFIED');
});
test('tab registry boot callback is not authoritative managed tab closure',async()=>{
 const f=fixture();receipt(f,'tab_boot','AUTONOMOUS:tab-registry-boot');
 assert.equal((await inspect(f)).status,'unverified');
});
test('other autonomous multi-owner recovery cannot establish tab closure',async()=>{
 const f=fixture();receipt(f,'bulk_recovery','AUTONOMOUS:bulk-runtime-recovery');
 assert.equal((await inspect(f)).status,'unverified');
});
test('routed emergency reset is not historical independent tab closure',async()=>{
 const f=fixture();receipt(f,'emergency_reset','RESET_ACTIVE_WORKFLOWS');
 assert.equal((await inspect(f)).status,'unverified');
});
test('unknown operation cannot be mistaken for an exact tab callback',async()=>{
 for(const kind of ['UNKNOWN_ROUTE','AUTONOMOUS:unregistered-tab-event']){
  const f=fixture();receipt(f,'unknown_tab',kind);
  assert.equal((await inspect(f)).status,'unverified');
 }
});
test('exact plus unknown fallback cannot produce partial attribution',async()=>{
 const f=fixture();receipt(f,'real_closed');
 receipt(f,'unknown_closed','FUTURE_UNREGISTERED_HANDLER');
 assert.equal((await inspect(f)).status,'unverified');
});
test('ongoing in-memory managedTabs task blocks prior finished P8 callback',async()=>{
 const f=fixture();receipt(f,'historic_closed');const o=owner(f);
 let finish;const pending=new Promise(resolve=>{finish=resolve});
 const task=o.track('managedTabs',()=>pending);
 const p=await o.inspectManagedTabsClosureReadOnly();
 assert.equal(p.status,'unverified');assert.equal(p.reason,'ACTUAL_IN_FLIGHT_OPERATION');
 finish();await task;historicalOnly(await o.inspectManagedTabsClosureReadOnly());
});
test('mutated finish receipt between two observed journals fails closed',async()=>{
 const f=fixture();receipt(f,'drifting_close');
 f.onLocalRead((n,rows)=>{
  if(n===2)rows[Atomic.FINISH_PREFIX+'drifting_close'].completedAtMs=1400;
 });
 assert.equal((await inspect(f)).status,'unverified');
});
test('orphan P8 finish is not closure',async()=>{
 const f=fixture();f.local[Atomic.FINISH_PREFIX+'orphan_close']={
  schema:1,state:'completed',token:'orphan_close',
  workerInstanceId:'earlier-generation',completedAtMs:1200
 };
 assert.equal((await inspect(f)).status,'unverified');
});
test('corrupt original start/finish worker proof fails closed',async()=>{
 const f=fixture();receipt(f,'bad_worker');
 f.local[Atomic.FINISH_PREFIX+'bad_worker'].workerInstanceId='other-worker';
 assert.equal((await inspect(f)).status,'unverified');
});
test('local source outage cannot prove tab completion',async()=>{
 const f=fixture();receipt(f,'closed_outage');f.failLocal();
 const p=await inspect(f);assert.equal(p.status,'unverified');
 assert.equal(p.eligibleForLease,false);
});
test('browser enumeration absent means UNKNOWN despite exact close receipt',async()=>{
 const f=fixture({noBrowser:true});receipt(f,'closed_no_chrome');
 const p=await inspect(f);assert.equal(p.status,'unverified');
 assert.equal(p.liveTabsReconciled,false);
});
test('session tab registry absent must fail despite Chrome returning only a user tab',async()=>{
 const f=fixture({noSession:true});receipt(f,'closed_no_session');
 const p=await inspect(f);assert.equal(p.status,'unverified');
 assert.equal(p.liveTabsReconciled,false);
});
test('active tracked managed tab still exists in session registry',async()=>{
 const f=fixture();receipt(f,'closed_active');
 f.session.tabRegistryV1['9'].lifecycleState='active';
 const p=await inspect(f);assert.equal(p.status,'unverified');
 assert.equal(p.liveTabsReconciled,false);
});
test('GONE tombstone cannot hide a still live managed browser tab',async()=>{
 const f=fixture();receipt(f,'closed_but_live');
 f.onBrowserQuery(()=>[USER,{id:9,url:'https://www.kleinanzeigen.de/',windowId:2}]);
 const p=await inspect(f);assert.equal(p.status,'unverified');
 assert.equal(p.liveTabsReconciled,false);
});
test('GONE managed tombstone without valid closedAt cannot prove closure',async()=>{
 const f=fixture();receipt(f,'closed_no_time');
 delete f.session.tabRegistryV1['9'].closedAt;
 assert.equal((await inspect(f)).status,'unverified');
});
test('unacknowledged legacy worker tab cannot prove browser reconciliation',async()=>{
 const f=fixture();receipt(f,'closed_legacy');
 f.session.managedWorkerTabsV1['11']={tabId:11};
 assert.equal((await inspect(f)).status,'unverified');
});
test('session registry changes between read passes fail closed',async()=>{
 const f=fixture();receipt(f,'closed_reg_drift');
 f.onSessionRead((n,rows)=>{
  if(n===4)rows.tabRegistryV1['7'].role='source';
 });
 assert.equal((await inspect(f)).status,'unverified');
});
test('browser tabs change during the independent double-query verification',async()=>{
 const f=fixture();receipt(f,'closed_browser_drift');
 f.onBrowserQuery(n=>n%2===0?[]:[USER]);
 assert.equal((await inspect(f)).status,'unverified');
});
test('duplicate Chrome tab ID fails even when registry agrees',async()=>{
 const f=fixture();receipt(f,'closed_duplicate');
 f.onBrowserQuery(()=>[USER,USER]);
 assert.equal((await inspect(f)).status,'unverified');
});
test('unknown live browser tab not in registry blocks reconciliation',async()=>{
 const f=fixture();receipt(f,'closed_unregistered');
 f.onBrowserQuery(()=>[USER,{id:11,url:'https://www.kleinanzeigen.de/',windowId:2}]);
 assert.equal((await inspect(f)).status,'unverified');
});
test('missing previously registered user tab is not proof of safe tab completion',async()=>{
 const f=fixture();receipt(f,'closed_missing_user');
 f.onBrowserQuery(()=>[]);
 assert.equal((await inspect(f)).status,'unverified');
});
test('persisted profile mismatch cannot certify tabs scoped to selected account',async()=>{
 const f=fixture();receipt(f,'closed_profile_mismatch');
 f.local.activeDetectedProfileV1={profileId:'user-A'};
 f.local.selectedInventoryProfileV1={profileId:'user-B'};
 const p=await inspect(f);assert.equal(p.status,'unverified');
 assert.equal(p.eligibleForLease,false);
});
test('browser source thrown error is not an empty verified tab census',async()=>{
 const f=fixture();receipt(f,'browser_throws');
 f.onBrowserQuery(()=>{throw Error('chrome.tabs.query failed')});
 const p=await inspect(f);assert.equal(p.status,'unverified');
 assert.equal(p.liveTabsReconciled,false);
});
test('session storage unavailable fails closed even with durable P8 finish',async()=>{
 const f=fixture();receipt(f,'missing_session');f.failSession();
 const p=await inspect(f);assert.equal(p.status,'unverified');
 assert.equal(p.liveTabsReconciled,false);
});
