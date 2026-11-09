// KAR-99 P6 adversarial integration: actual journal + actual Background
// independent-My-Ads verifier, with NO browser network or live account.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Journal=require('../src/background/services/auto-publish-intent-journal.js');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
let checks=0;
function pass(label){checks++;console.log('PASS KAR99-P6-ADVERSARIAL '+label);}
async function rejects(task,code,label){
  await assert.rejects(task,error=>error?.code===code,label);
  pass(label);
}
function disk(){
  const rows=Object.create(null);
  const db={rows,mode:'ok',async get(keys){
    if(db.mode==='read-fail')throw Error('storage unreadable');
    const names=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
    return Object.fromEntries(names.filter(k=>Object.hasOwn(rows,k))
      .map(k=>[k,structuredClone(rows[k])]));
  },async set(values){
    if(db.mode==='write-fail')throw Error('storage write blocked');
    Object.assign(rows,structuredClone(values));
    if(db.mode==='write-then-crash')throw Error('worker interrupted after storage persisted');
    if(db.mode==='resolution-write-then-crash'&&
       Object.keys(values).some(k=>k.startsWith(Journal.RESOLUTION_KEY_PREFIX)))
      throw Error('worker interrupted after verified result persisted');
  }};
  return db;
}
function locks(){
  const held=new Set();
  return {held,async request(name,opts,action){
    assert.equal(name,Atomic.LOCK_NAME);
    assert.deepEqual(opts,{mode:'exclusive',ifAvailable:true});
    if(held.has(name))return action(null);
    held.add(name);
    try{return await action({name});}finally{held.delete(name);}
  }};
}
let serial=0;
function journal(store,lock,verify,worker='worker-a'){
  return Journal.create({storageLocal:store,lockManager:lock,
    lockName:Atomic.LOCK_NAME,workerInstanceId:worker,
    clock:()=>100000+(++serial),newToken:()=>'attempt-'+(++serial),
    verifyRemoteOutcome:verify});
}
const bg=fs.readFileSync('src/background/background.js','utf8');
const open=bg.indexOf('async function verifyAutoPublishRemoteOutcomeFresh(');
const close=bg.indexOf('async function resolveManagedPublishIntent(',open);
assert(open>=0&&close>open,'production verification function must exist');
const actualVerifier=bg.slice(open,close);
function environment(options={}){
  const expected={profileId:'profile-one',displayName:'Account One'};
  const session={fillId:'fill-one',profileId:expected.profileId,
    targetProfileId:expected.profileId,targetProfileName:expected.displayName,
    targetTabId:99,sourceAdId:'1234'};
  const state={profileId:expected.profileId,pageProfile:expected.displayName,
    closed:[],created:[],queries:[],scans:0};
  const sandbox={
    readRenewalSessions:async()=>({'renew-one':session}),
    readArchiveInsertionSessions:async()=>({'archive-one':session}),
    normalizeProfileName:v=>String(v||'').trim(),
    assertSelectedProfileMatchesLiveAccount:async input=>{
      state.queries.push({kind:'account',purpose:input.purpose});
      if(state.profileId!==expected.profileId)
        throw Error('live account no longer matches selected inventory');
      return expected;
    },
    createManagedWorkerTab:async(...args)=>{
      state.created.push(args);
      if(options.failAt==='new-tab')throw Error('worker destroyed on tab creation');
      return {id:333};
    },
    waitForTabComplete:async()=>{
      if(options.failAt==='load')throw Error('navigation timeout');
    },
    ensureContentConnection:async()=>{
      if(options.failAt==='connect')throw Error('disconnected content worker');
    },
    sendTabRequestWithBootstrap:async(tab,message)=>{
      assert.equal(tab,333);
      state.queries.push({kind:message.type,adId:message.adId});
      if(message.type==='MY_ADS_STATUS'){
        if(options.failAt==='myads-status')throw Error('My Ads unreachable');
        if(options.switchBeforeStatus&&state.queries.filter(x=>x.kind==='MY_ADS_STATUS').length===1)
          state.pageProfile='Account Two';
        return {isMyAdsPage:true,isProjectsTab:true,profileName:state.pageProfile};
      }
      assert.equal(message.type,'FIND_OWN_AD_BY_ID');
      assert.equal(message.adId,'5678');
      state.scans++;
      if(options.failAt==='network')throw Error('pagination lost');
      if(options.switchOnScan)state.profileId='profile-two';
      if(options.pageSwitchOnScan)state.pageProfile='Account Two';
      if(options.unknown)return {found:false,adId:message.adId,pagesScanned:3,
        evidence:'not-in-my-ads-full-pagination-scan'};
      if(options.falsePositive)return {found:true,adId:'9999',page:1,pagesScanned:3,
        evidence:'found-in-my-ads-full-pagination-scan'};
      return {found:true,adId:message.adId,page:1,pagesScanned:3,
        evidence:'found-in-my-ads-full-pagination-scan'};
    },
    closeManagedWorkerTab:async id=>{state.closed.push(id);},
    MY_ADS_PROJECTS_URL:'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS',
    TAB_LOAD_TIMEOUT_PHASE4_MS:10000
  };
  const verify=vm.runInNewContext(actualVerifier+
    '\nverifyAutoPublishRemoteOutcomeFresh;',sandbox);
  return {verify,state,session};
}
function input(kind='renewal'){
  return {fillId:'fill-one',workflowId:kind==='archive'?'archive-one':'renew-one',
    kind,profileId:'profile-one',sourceAdId:'1234',targetTabId:99};
}
async function withAttempt(env,kind='renewal'){
  const store=disk(),lock=locks(),first=journal(store,lock,env.verify);
  await first.begin(input(kind));
  return {store,lock,first,
    resume:()=>journal(store,lock,env.verify,'worker-after-restart')};
}
(async()=>{
  // A remote publish may have happened even when its new ID is unknown.
  const env=environment(),entry=await withAttempt(env);
  await rejects(entry.resume().resolveVerified({fillId:'fill-one',newAdId:''}),
    'KR_PUBLISH_INTENT_IDENTITY','unknown new Ad-ID cannot create a success receipt');
  assert.equal((await entry.resume().observe('fill-one')).state,'unverified');
  await rejects(entry.resume().begin(input()),'KR_PUBLISH_INTENT_UNRESOLVED',
    'crashed worker with no new ID cannot automatically publish again');
  assert.equal(env.state.scans,0);
  pass('no speculative remote scanning or mutation without exact new ID');

  for(const [reason,mode] of [
    ['account switched before My Ads status',{switchBeforeStatus:true}],
    ['account changed during pagination',{switchOnScan:true}],
    ['My Ads profile changed while scanning',{pageSwitchOnScan:true}],
    ['remote target absent after complete scan',{unknown:true}],
    ['wrong exact Ad ID in candidate',{falsePositive:true}],
    ['network interrupted mid-pagination',{failAt:'network'}],
    ['tab navigation aborted',{failAt:'load'}],
    ['content worker disconnected',{failAt:'connect'}]
  ]){
    const context=environment(mode),work=await withAttempt(context);
    await rejects(work.resume().resolveVerified({fillId:'fill-one',newAdId:'5678'}),
      'KR_PUBLISH_INTENT_UNVERIFIED',reason);
    assert.equal((await work.resume().observe('fill-one')).state,'unverified');
    assert.equal(Object.values(work.store.rows).filter(x=>x.state==='resolved-confirmed').length,0);
    if(context.state.created.length)assert.deepEqual(context.state.closed,[333]);
    pass(reason+' preserves journal uncertainty and closes verification tab');
  }

  const archive=environment(),arc=await withAttempt(archive,'archive');
  const archived=await arc.resume().resolveVerified({fillId:'fill-one',newAdId:'5678'});
  assert.equal(archived.kind,'archive');
  assert.equal(archive.state.scans,1);
  pass('ZIP publication independently verified under exact target account');

  // If storage write commits, then service worker dies before acknowledgement,
  // the next worker MUST preserve the uncertain before-remote intent.
  const storage=disk(),gate=locks(),first=journal(storage,gate,environment().verify);
  storage.mode='write-then-crash';
  await rejects(first.begin(input()),'KR_PUBLISH_INTENT_STORAGE',
    'interruption after intent write does not claim authorization');
  storage.mode='ok';
  assert.equal((await journal(storage,gate,environment().verify,'second-worker').observe('fill-one')).state,'unverified');
  await rejects(journal(storage,gate,environment().verify,'second-worker').begin(input()),
    'KR_PUBLISH_INTENT_UNRESOLVED','restart does not replay post-crash publication');

  // Interrupt remote verifier itself. There may have been a real publish; no
  // outcome can be marked successful until independently verified.
  const interruptedStore=disk(),interruptLock=locks();
  const pause=journal(interruptedStore,interruptLock,async()=>{
    throw Error('MV3 service worker terminated while scanning');
  });
  await pause.begin(input());
  await rejects(journal(interruptedStore,interruptLock,async()=>{
    throw Error('MV3 service worker terminated while scanning');
  },'restart').resolveVerified({fillId:'fill-one',newAdId:'5678'}),
    'KR_PUBLISH_INTENT_UNVERIFIED','worker interrupted during verifier leaves receipt unresolved');
  assert.equal((await pause.observe('fill-one')).state,'unverified');

  // Crash AFTER immutable result is written: a new worker may read verified
  // proof but is still forbidden from re-clicking the original operation.
  const finishedStore=disk(),finishedLocks=locks(),verifiedEnv=environment();
  const finished=journal(finishedStore,finishedLocks,verifiedEnv.verify);
  await finished.begin(input());
  finishedStore.mode='resolution-write-then-crash';
  await rejects(finished.resolveVerified({fillId:'fill-one',newAdId:'5678'}),
    'KR_PUBLISH_INTENT_STORAGE','write-ack crash does not falsely return success');
  finishedStore.mode='ok';
  assert.equal((await journal(finishedStore,finishedLocks,verifiedEnv.verify,'restart').observe('fill-one')).state,'resolved');
  await rejects(journal(finishedStore,finishedLocks,verifiedEnv.verify,'restart').begin(input()),
    'KR_PUBLISH_INTENT_UNRESOLVED','recovered verified result never permits another click');

  // Real content click/submit capture after an authorized publish must reject
  // a second submit, including a keyboard submission with null submitter.
  const original={KRDeps:globalThis.KRDeps,document:globalThis.document,
    Element:globalThis.Element,HTMLInputElement:globalThis.HTMLInputElement};
  globalThis.KRDeps={register(){}};
  const flow=require('../src/content/template-publish-flow.js');
  class Button{
    constructor(){this.textContent='Anzeige aufgeben';this.disabled=false;this.isConnected=true;}
    closest(){return this;}
  }
  class Input extends Button{}
  globalThis.Element=Button;
  globalThis.HTMLInputElement=Input;
  const events={};let submits=0;
  globalThis.document={addEventListener:(type,fn)=>events[type]=fn};
  const b=new Button();
  function dispatch(type,submitter=b){
    const event={target:b,submitter,defaultPrevented:false,
      preventDefault(){this.defaultPrevented=true;},
      stopImmediatePropagation(){}};
    events[type](event);
    if(type==='click'&&!event.defaultPrevented)submits++;
    return event;
  }
  let normalSubmitPassed=false;
  b.click=()=>{
    const click=dispatch('click');
    if (!click.defaultPrevented) {
      const nativeSubmit=dispatch('submit',b);
      normalSubmitPassed=!nativeSubmit.defaultPrevented;
    }
  };
  flow.create({clean:String,visible:()=>true,diagnostic:()=>{},
    updatePanel:()=>{},runtimeMessage:async()=>({authorized:true})})
    .armPublishDetection('p6-manual-replay');
  dispatch('click');
  for(let i=0;i<15;i++)await Promise.resolve();
  assert.equal(submits,1);
  assert.equal(normalSubmitPassed,true,
    'first native form submit produced synchronously by authorized click must pass');
  pass('exactly one authorized native submit is allowed');
  // This was unguarded before this Wave: submitted=true permitted any
  // subsequent submit with null or the same submitter indefinitely.
  assert.equal(dispatch('submit',null).defaultPrevented,true,
    'a second implicit submit must be prevented even after first authorization');
  pass('second implicit submit cannot replay remote action');
  assert.equal(dispatch('submit',b).defaultPrevented,true,
    'a second form submit with prior submitter must not reuse approval');
  pass('second form submit cannot reuse prior authorization');
  Object.assign(globalThis,original);
  // Admission can take several awaited storage/lock steps after first live
  // account check. Switching the account between that check and the durable
  // receipt must not return a usable click authorization.
  const authorizeStart=bg.indexOf('async function authorizeAutomaticPublish(');
  const authorizeEnd=bg.indexOf('function requireRenewalWorkflowController()',authorizeStart);
  assert(authorizeStart>=0&&authorizeEnd>authorizeStart,
    'production automatic/manual publish handler must be present');
  const actualAuthorize=bg.slice(authorizeStart,authorizeEnd);
  function admissionRig(changeAfterJournal){
    let live='profile-one',checks=0,writes=0;
    const fill={fillId:'fill-one',targetTabId:99,status:'running',
      stage:'auto-publish-ready',sourceAdId:'1234',renewalId:'renew-one',
      result:{complete:true,issues:[]}};
    const renewal={fillId:'fill-one',targetTabId:99,
      profileId:'profile-one',sourceAdId:'1234'};
    const auth=vm.runInNewContext(actualAuthorize+
      '\nauthorizeAutomaticPublish;',{
      URL,
      readFillSessions:async()=>({'fill-one':fill}),
      readRenewalSessions:async()=>({'renew-one':renewal}),
      readArchiveInsertionSessions:async()=>({}),
      assertSelectedProfileMatchesLiveAccount:async()=>{
        checks++;
        if(live!=='profile-one')throw Error('live Kleinanzeigen account changed');
        return {profileId:live,displayName:'Account One'};
      },
      requireAutoPublishIntentJournal:()=>({begin:async()=>{
        writes++;
        if(changeAfterJournal)live='profile-two';
        return {attemptId:'durable-intent-1'};
      }})
    });
    return {call:()=>auth({fillId:'fill-one'},{tab:{id:99},
      url:'https://www.kleinanzeigen.de/p-anzeige-aufgeben.html'}),
      get checks(){return checks;},get writes(){return writes;}};
  }
  const switched=admissionRig(true);
  await assert.rejects(switched.call(),undefined,
    'a changed live account after journal commit must deny click authorization');
  assert.equal(switched.writes,1,'immutable pre-click receipt remains after denied approval');
  assert.equal(switched.checks,2,'account binding must be rechecked after receipt readback');
  pass('account switch during async journal write denies remote click and retains receipt');
  const stable=admissionRig(false);
  const allowed=await stable.call();
  assert.equal(allowed.authorized,true,'stable account may still publish normally');
  assert.equal(stable.checks,2,'stable account is verified before and after durable receipt');
  pass('stable account retains legitimate one-shot authorization');
  console.log('PASS KAR99 P6 adversarial '+checks+' checks');
})().catch(e=>{console.error(e);process.exitCode=1;});
