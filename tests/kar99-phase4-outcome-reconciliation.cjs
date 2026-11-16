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
  attemptId:entry.attemptId,workerInstanceId:entry.workerInstanceId,
  admissionToken:entry.admissionToken??null,
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
    // KAR-171 W2: full-pagination evidence cannot find an ad on a page
    // beyond the actual number of pages scanned.
    ['target page outside scanned range',r=>({...proof(r),targetPagesScanned:1,targetFoundPage:2})],
    ['verification unavailable',async()=>{throw Error('network error')}]
  ]) {
    const d=storage(),k=init(d,verifier),a=await k.begin(req);
    await denied(k.resolveVerified({renewalId:req.renewalId,attemptId:a.attemptId}),
      'KR_PHASE4_JOURNAL_UNVERIFIED',name+' fails closed');
    ok(Object.keys(d.data).filter(x=>x.startsWith(Journal.RESOLUTION_KEY_PREFIX)).length===0,
      name+' never writes a false resolution');
  }
  // KAR-171 W2: a historically tampered local resolution is not an
  // independent remote result and must never be accepted on worker reentry.
  for (const [name,mutate] of [
    ['target found after last scanned page',r=>{r.targetPagesScanned=1;r.targetFoundPage=2;}],
    ['remote verification predates original intent',r=>{r.verifiedAtMs=intent.createdAtMs-1;}]
  ]) {
    const historical=storage();
    Object.assign(historical.data,structuredClone(db.data));
    const key=Object.keys(historical.data).find(x=>x.startsWith(Journal.RESOLUTION_KEY_PREFIX));
    mutate(historical.data[key]);
    await denied(init(historical,proof,'restarted-worker').observe(req.renewalId),
      'KR_PHASE4_JOURNAL_CORRUPT','tampered Phase-4 '+name+' fails closed');
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
  // R1: independent remote result must also revalidate the authoritative
  // live/account context INSIDE the origin Web Lock before durable commit.
  const strictDB=storage(),strictManager=require('./helpers/phase4-locks.cjs')();
  let lockHeld=false,liveName=req.profileId,networkReads=0,contextReads=0;
  let stagedBeforeLock=0,stagedClosed=0,stagedVerify=0;
  const wrappedLocks={
    request:(name,opts,task)=>strictManager.lockManager.request(name,opts,async lock=>{
      lockHeld=true;try{return await task(lock);}finally{lockHeld=false;}
    })
  };
  function strictPhase4(context){
    return Journal.create({
      storageLocal:strictDB,lockManager:wrappedLocks,
      lockName:strictManager.lockName,workerInstanceId:'r1-commit-worker',
      clock:()=>123000,newToken:()=> 'r1-commit-attempt',
      verifyRemoteOutcome:entry=>{networkReads++;return proof(entry);},
      requireCommitContext:true,
      prepareCommitContext:async original=>{
        if(lockHeld||networkReads<1)throw Error('staging must follow remote proof outside lock');
        stagedBeforeLock++;
        return Object.freeze({tabId:82,close:async()=>{stagedClosed++;}});
      },
      verifyCommitContext:context===null?null:(original,witness)=>{
        stagedVerify++;
        return witness?.tabId===82&&context?.(original,witness)===true;
      }
    });
  }
  const strictEntry=await strictPhase4(null).begin({...req,renewalId:'r1-commit'});
  await denied(strictPhase4(null).resolveVerified({
    renewalId:'r1-commit',attemptId:strictEntry.attemptId
  }),'KR_PHASE4_JOURNAL_UNVERIFIED',
    'R1: missing read-only commit source cannot prove Phase-4 outcome');
  ok(networkReads===0,'R1: missing trusted source denies before remote network verification');
  await denied(strictPhase4(()=>false).resolveVerified({
    renewalId:'r1-commit',attemptId:strictEntry.attemptId
  }),'KR_PHASE4_JOURNAL_UNVERIFIED','R1: negative account attestation fails closed');
  await denied(strictPhase4(()=>{throw Error('offline');}).resolveVerified({
    renewalId:'r1-commit',attemptId:strictEntry.attemptId
  }),'KR_PHASE4_JOURNAL_UNVERIFIED','R1: account source outage fails closed');
  liveName='switched-profile';
  await denied(strictPhase4(r=>r.profileId===liveName).resolveVerified({
    renewalId:'r1-commit',attemptId:strictEntry.attemptId
  }),'KR_PHASE4_JOURNAL_UNVERIFIED','R1: account switch at commit rejects remote evidence');
  ok(Object.keys(strictDB.data).every(k=>!k.startsWith(Journal.RESOLUTION_KEY_PREFIX)),
    'R1: no failed read-only identity proof persists a terminal receipt');
  liveName=req.profileId;
  const good=await strictPhase4(r=>{
    contextReads++;
    return lockHeld&&r.profileId===liveName&&r.sourceAdId===req.sourceAdId&&r.newAdId===req.newAdId;
  }).resolveVerified({renewalId:'r1-commit',attemptId:strictEntry.attemptId});
  ok(good.state==='resolved-confirmed'&&contextReads===1&&lockHeld===false,
    'R1: genuine read-only commit context is required inside origin Web Lock');
  ok(stagedBeforeLock===stagedClosed&&stagedBeforeLock>=4&&stagedVerify>=4,
    'R1: every staged live account witness is used under lock and closed on both denial and success');
  // R1: authenticated existing My Ads witness is a genuinely read-only
  // owner-source producer (no tab creation, account mutation or synthetic IDLE).
  const Additional=require('../src/background/services/additional-owner-observer.js');
  const commitDb=storage(),accountProfile='real-profile-one',accountName='Real Profile';
  commitDb.data.activeDetectedProfileV1={profileId:accountProfile};
  commitDb.data.selectedInventoryProfileV1={profileId:accountProfile};
  commitDb.data.profilesV1=[{profileId:accountProfile,displayName:accountName}];
  commitDb.data.renewalSessionsV1={
    'r1-remote':{profileId:accountProfile,sourceAdId:'11223344',newAdId:'55667788'},
    'r1-publish':{profileId:accountProfile,fillId:'r1-fill',
      sourceAdId:'11223344',targetTabId:42}
  };
  commitDb.data.archiveInsertionSessionsV1={
    'r1-archive':{targetProfileId:accountProfile,fillId:'r1-archive-fill',
      sourceAdId:'',targetTabId:52}
  };
  commitDb.data.templateFillSessions={
    'r1-fill':{fillId:'r1-fill',targetTabId:42,sourceAdId:'11223344'},
    'r1-archive-fill':{fillId:'r1-archive-fill',targetTabId:52,sourceAdId:''}
  };
  let browserTab={id:81,url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html'};
  let loggedIn=true,commitLiveName=accountName,readCount=0;
  const observer=Additional.create({
    storageLocal:commitDb,storageSession:{async get(){return {};}},
    workerInstanceId:'worker-commit',clock:()=>123000,
    queryBrowserTabsReadOnly:async()=>browserTab?[structuredClone(browserTab)]:[],
    readAccountPageStatusReadOnly:async()=>{readCount++;return {
      pageType:'my-ads',url:browserTab.url,auth:{loggedIn},profileName:commitLiveName
    }}
  });
  const originalPhase={renewalId:'r1-remote',profileId:accountName,
    sourceAdId:'11223344',newAdId:'55667788'};
  const originalPublish={kind:'renewal',workflowId:'r1-publish',fillId:'r1-fill',
    profileId:accountProfile,sourceAdId:'11223344',targetTabId:42};
  const originalArchive={kind:'archive',workflowId:'r1-archive',fillId:'r1-archive-fill',
    profileId:accountProfile,sourceAdId:'',targetTabId:52};
  const beforeReads=commitDb.data;
  ok(await observer.verifyRemoteCommitContextReadOnly(originalPhase,'phase4')===true
    &&readCount>=2,'R1: actual multi-read logged-in account matches source renewal at commit');
  ok(await observer.verifyRemoteCommitContextReadOnly(originalPublish,'publish')===true,
    'R1: trusted live account binds exact publish workflow, fill, target tab and Ad ID');
  ok(await observer.verifyRemoteCommitContextReadOnly(originalArchive,'publish')===true,
    'R1: archive publication binds actual target profile and corresponding fill');
  commitDb.data.renewalSessionsV1['r1-remote'].sourceAdId='tampered';
  ok(await observer.verifyRemoteCommitContextReadOnly(originalPhase,'phase4')===false,
    'R1: stale source Ad ID cannot pass live commit witness');
  commitDb.data.renewalSessionsV1['r1-remote'].sourceAdId='11223344';
  commitLiveName='Different Account';
  ok(await observer.verifyRemoteCommitContextReadOnly(originalPublish,'publish')===false,
    'R1: changed authenticated account cannot pass commit witness');
  commitLiveName=accountName;loggedIn=false;
  ok(await observer.verifyRemoteCommitContextReadOnly(originalPhase,'phase4')===false,
    'R1: logout during independent account observation fails closed');
  loggedIn=true;browserTab=null;
  ok(await observer.verifyRemoteCommitContextReadOnly(originalPhase,'phase4')===false,
    'R1: missing already-open My Ads tab stays unverified without opening one');
  // R1: no existing user's My Ads tab. A newly staged, separately owned
  // READ-ONLY witness is prepared before the commit lock, verified under
  // that lock, and closed on every success/denial path.
  let stagedOpens=0,stagedCloses=0,stagedReady=0,openedDuringLock=false;
  let stagedStatusReads=0,stagedLateAccountSwitchAt=null;
  const stagedOwner=Additional.create({
    storageLocal:commitDb,storageSession:{async get(){return {};}},
    workerInstanceId:'worker-commit',clock:()=>123000,
    queryBrowserTabsReadOnly:async()=>browserTab?[structuredClone(browserTab)]:[],
    readAccountPageStatusReadOnly:async tabId=>{
      assert.equal(tabId,82);
      if(!browserTab)throw Error('tab closed');
      stagedStatusReads++;
      return {pageType:'my-ads',url:browserTab.url,
        auth:{loggedIn},
        profileName:stagedStatusReads===stagedLateAccountSwitchAt
          ?'Other authenticated account':commitLiveName};
    },
    createManagedWorkerTab:async(opts,purpose,owner)=>{
      stagedOpens++;openedDuringLock=lockHeld;
      assert.equal(opts.active,false);
      assert.equal(owner.ownerType,'renewal');
      browserTab={id:82,url:opts.url};
      return {id:82};
    },
    waitForTabComplete:async()=>{stagedReady++;},
    ensureContentConnection:async()=>{},
    closeManagedWorkerTab:async id=>{
      assert.equal(id,82);stagedCloses++;browserTab=null;
    },
    myAdsProjectsUrl:'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS',
    tabLoadTimeoutMs:30000
  });
  browserTab=null;
  ok(await stagedOwner.verifyRemoteCommitContextReadOnly(originalPhase,'phase4')===false,
    'R1: no pre-existing My Ads tab remains fail closed');
  const stage=await stagedOwner.prepareRemoteCommitContextReadOnly(originalPhase,'phase4');
  ok(stage.tabId===82&&stagedOpens===1&&stagedReady===1&&!openedDuringLock,
    'R1: read-only witness is created and loaded outside origin lock');
  ok(await stagedOwner.verifyRemoteCommitContextReadOnly(originalPhase,'phase4',stage)===true,
    'R1: newly created authenticated My Ads witness enables genuine positive check');
  ok(await stagedOwner.verifyRemoteCommitContextReadOnly({
      ...originalPhase,workerInstanceId:'unrelated-worker'
    },'phase4',stage)===false,
    'R1: staged account witness is not reusable for different original Worker generation');
  ok(await stagedOwner.verifyRemoteCommitContextReadOnly({
      ...originalPhase,admissionToken:'unrelated-p8-token'
    },'phase4',stage)===false,
    'R1: staged account witness is not reusable for different P8 admission token');
  stagedStatusReads=0;stagedLateAccountSwitchAt=4;
  ok(await stagedOwner.verifyRemoteCommitContextReadOnly(originalPhase,'phase4',stage)===false,
    'R1: tab changing authenticated account after observer read is rejected by final direct PAGE_STATUS');
  stagedLateAccountSwitchAt=null;

  ok(await stagedOwner.verifyRemoteCommitContextReadOnly(originalPublish,'publish',stage)===false,
    'R1: staged witness cannot be reused for a different workflow identity');
  commitLiveName='different-account';
  ok(await stagedOwner.verifyRemoteCommitContextReadOnly(originalPhase,'phase4',stage)===false,
    'R1: staged page changing account during commit is rejected');
  commitLiveName=accountName;
  await stage.close();
  ok(stagedCloses===1&&browserTab===null&&
     await stagedOwner.verifyRemoteCommitContextReadOnly(originalPhase,'phase4',stage)===false,
    'R1: closing the stage revokes the witness and removes its managed tab');
  await stage.close();
  ok(stagedCloses===1,'R1: cleanup is idempotent even after restart-style retry');
  browserTab={id:81,url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html'};
  commitDb.data.templateFillSessions['r1-fill'].targetTabId=100;
  ok(await observer.verifyRemoteCommitContextReadOnly(originalPublish,'publish')===false,
    'R1: changed fill tab cannot authorize previously verified publication');
  commitDb.data.templateFillSessions['r1-fill'].targetTabId=42;
  ok(await observer.verifyRemoteCommitContextReadOnly(originalPhase,'irrelevant')===false,
    'R1: invalid remote context kind is never an account certificate');
  // KAR-171 R1 LIVE SOURCE PROBE: exercise the actual independently loaded
  // remote service, not a synthetic journal success callback.
  async function scanFixture({sourceProfileAfter=null,targetProfileAfter=null,targetPage=2}={}) {
    let nextTabId=0;
    const statuses=Object.create(null),closed=[];
    const service=Remote.create({
      normalizeProfileName:value=>String(value||'').trim(),
      createManagedWorkerTab:async()=>({id:++nextTabId}),
      waitForTabComplete:async()=>{},
      ensureContentConnection:async()=>{},
      closeManagedWorkerTab:async id=>{closed.push(id);},
      sendTabRequestWithBootstrap:async(tabId,message)=>{
        if(message.type==='MY_ADS_STATUS'){
          statuses[tabId]=(statuses[tabId]||0)+1;
          const after=tabId===1?sourceProfileAfter:targetProfileAfter;
          return {isMyAdsPage:true,isProjectsTab:true,
            profileName:statuses[tabId]>1&&after?after:req.profileId};
        }
        if(message.type==='VERIFY_OWN_AD_ABSENT_BY_ID')return {
          verified:true,adId:req.sourceAdId,
          evidence:'not-in-my-ads-full-pagination-scan',pagesScanned:3
        };
        if(message.type==='FIND_OWN_AD_BY_ID')return {
          found:true,adId:req.newAdId,
          evidence:'found-in-my-ads-full-pagination-scan',
          pagesScanned:2,page:targetPage
        };
        throw Error('unexpected probe message '+message.type);
      }
    });
    const result=await service.verifyPhase4RemoteOutcomeFresh({...req,
      attemptId:'attempt-001',workerInstanceId:'worker-origin',
      admissionToken:'original-p8-token'});
    return {result,statuses,closed};
  }
  await assert.rejects(scanFixture({sourceProfileAfter:'Different Account'}),
    /KR_PHASE4_JOURNAL_UNVERIFIED/);
  ok(true,'R1: source account change during full-pagination scan fails closed');
  await assert.rejects(scanFixture({targetProfileAfter:'Different Account'}),
    /KR_PHASE4_JOURNAL_UNVERIFIED/);
  ok(true,'R1: target account change during full-pagination scan fails closed');
  await assert.rejects(scanFixture({targetPage:3}),
    /KR_PHASE4_JOURNAL_UNVERIFIED/);
  ok(true,'R1: target page beyond scanned pagination fails closed in actual verifier');
  const fresh=await scanFixture();
  ok(fresh.result.sourceAbsent===true&&fresh.result.targetPresent===true
    &&fresh.result.attemptId==='attempt-001'
    &&fresh.result.workerInstanceId==='worker-origin'
    &&fresh.result.admissionToken==='original-p8-token'
    &&fresh.statuses[1]===2&&fresh.statuses[2]===2
    &&fresh.closed.join(',')==='1,2',
    'R1: valid independent source/target scans bracketed by two account reads each');

  // R1: P8 source and generation must still match the immutable original
  // Phase-4 attempt, including when a different Worker resumes verification.
  const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
  const token='r1-origin-p8-token-001';
  async function originalAdmission({before=null,during=null,transformProof=null}={}) {
    const d=storage();
    const start={schema:1,state:'admitted',token,
      operationType:'AUTONOMOUS:renewal-auto-phase4',
      workerInstanceId:'worker-origin',startedAtMs:122900};
    const key=Atomic.START_PREFIX+token;
    d.data[key]=structuredClone(start);
    const original=await init(d,proof,'worker-origin').begin({
      ...req,admissionReceipt:Object.freeze({...start})
    });
    if(before)before(d,key);
    const verify=x=>{
      if(during)during(d,key);
      const result=proof(x);
      return transformProof?transformProof(result):result;
    };
    return {d,promise:init(d,verify,'worker-restarted').resolveVerified({
      renewalId:original.renewalId,attemptId:original.attemptId
    })};
  }
  const authenticated=await originalAdmission();
  const confirmedOrigin=await authenticated.promise;
  ok(confirmedOrigin.state==='resolved-confirmed'
    &&confirmedOrigin.workerInstanceId==='worker-restarted',
    'R1: unchanged origin P8 token permits independently reverified read-only outcome after Worker restart');
  for(const [label,mutate] of [
    ['attempt ID changed',r=>({...r,attemptId:'different-attempt'})],
    ['origin Worker ID changed',r=>({...r,workerInstanceId:'unrelated-worker'})],
    ['origin P8 token changed',r=>({...r,admissionToken:'unrelated-p8-token'})],
    ['original P8 token absent',r=>({...r,admissionToken:null})]
  ]){
    const source=await originalAdmission({transformProof:mutate});
    await assert.rejects(source.promise,/KR_PHASE4_JOURNAL_UNVERIFIED/,
      'R1: Phase-4 rejects independent evidence from '+label);
    ok(!Object.keys(source.d.data).some(k=>k.startsWith(Journal.RESOLUTION_KEY_PREFIX)),
      'R1: '+label+' cannot commit positive source/target outcome');
  }
  for(const [name,mutation] of [
    ['P8 start removed',(d,key)=>{delete d.data[key];}],
    ['P8 origin worker replaced',(d,key)=>{d.data[key].workerInstanceId='worker-impersonator';}],
    ['P8 operation substituted',(d,key)=>{d.data[key].operationType='GET_DIAGNOSTIC_EXPORT';}],
    ['P8 finish forged',(d)=>{d.data[Atomic.FINISH_PREFIX+token]={
      schema:1,state:'completed',token,workerInstanceId:'worker-other',
      completedAtMs:122950};}]
  ]) {
    const changed=await originalAdmission({before:mutation});
    await assert.rejects(changed.promise,/KR_PHASE4_JOURNAL_UNVERIFIED/);
    ok(!Object.keys(changed.d.data).some(k=>k.startsWith(Journal.RESOLUTION_KEY_PREFIX)),
      'R1: '+name+' cannot persist remote resolution');
  }
  const drifted=await originalAdmission({during:(d,key)=>{
    d.data[key].workerInstanceId='worker-switch-during-scan';
  }});
  await assert.rejects(drifted.promise,/KR_PHASE4_JOURNAL_UNVERIFIED/);
  ok(!Object.keys(drifted.d.data).some(k=>k.startsWith(Journal.RESOLUTION_KEY_PREFIX)),
    'R1: origin P8 source changes during read-only remote probe cannot commit resolution');

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
