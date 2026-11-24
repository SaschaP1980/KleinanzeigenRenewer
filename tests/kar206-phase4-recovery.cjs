'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Journal=require('../src/background/services/phase4-uncertainty-journal.js');
const Remote=require('../src/background/services/remote-delete-replacement-service.js');
const background=fs.readFileSync('src/background/background.js','utf8');
const start=background.indexOf('function isPhase4DeleteTransportInterruption(error)');
const classify=vm.runInNewContext('('+background.slice(start,background.indexOf('\n}',start)+2)+')');
const BF='The page keeping the extension port is moved into back/forward cache, so the message channel is closed.';
async function run(){
 let passed=0,failed=0;
 async function check(n,f){try{await f();passed++;console.log('PASS '+n);}catch(e){failed++;console.log('FAIL '+n+': '+e.message);}}
 function fixture(opts={}){
  const session={renewalId:'r',sourceInventoryId:'old',skeletonInventoryId:'new',sourceAdId:'100',newAdId:'200',status:'verified',stage:opts.recovery?'source-delete-outcome-unverified':'replacement-ready'};
  const receipt={renewalId:'r',attemptId:'a',sourceAdId:'100',newAdId:'200',profileId:'Account'};
  let attempts=opts.existing?[receipt]:[],begins=0,deletes=0,resolves=0,started=0,closed=0;
  const persisted=[];
  const remote=Remote.create({
    readRenewalSessions:async()=>({r:session}),persistRenewalSession:async s=>{persisted.push({...s});},
    getInventory:async id=>({inventoryId:id,adId:id==='old'?'100':'200',profileName:'Account'}),
    getBulkRunState:async()=>null,assertMassRenewalManualActionAllowed:async()=>{},normalizeProfileName:s=>String(s||'').trim(),
    observePhase4Attempts:async()=>({attempts}),beginPhase4Attempt:async()=>{begins++;attempts=[receipt];return receipt;},
    resolvePhase4Attempt:async request=>{resolves++;assert.equal(request.attemptId,'a');throw Object.assign(Error('KR_PHASE4_JOURNAL_UNVERIFIED'),{code:'KR_PHASE4_JOURNAL_UNVERIFIED'});},
    normalBrowserWindowId:async()=>null,createManagedWorkerTab:async()=>({id:1}),waitForTabComplete:async()=>{},ensureContentConnection:async()=>{},closeManagedWorkerTab:async()=>{closed++;},
    sendTabRequestWithBootstrap:async(id,msg)=>{if(msg.type==='MY_ADS_STATUS')return {isMyAdsPage:true,isProjectsTab:true,profileName:'Account'};if(msg.type==='DELETE_OWN_AD_BY_ID'){deletes++;throw Error(opts.error||BF);}throw Error('Unexpected '+msg.type);},
    isPhase4DeleteTransportInterruption:classify,renewalPhaseAttemptAvailable:()=>started<2,renewalAttemptState:()=>({attempt:started}),delay:async()=>{},renewalPhaseRetryDelayMs:()=>0,
    logRenewalPhaseAttemptStarted:async()=>({attempt:++started,attemptId:'local'}),logRenewalPhaseAttemptFailed:async()=>{},renewalMaxPhaseAttempts:()=>3,renewalAttemptDetails:()=>({}),
    logDiagnostic:async()=>{},sessionCorrelationContext:()=>({}),correlationContext:()=>({}),setAppNotice:async()=>{},isNonRetryableRenewalSafetyError:()=>false
  });
  return {session,persisted,remote,counts:()=>({begins,deletes,resolves,started,closed})};
 }
 await check('actual Chrome BFCache error recognized, unrelated error not recognized',()=>{assert.equal(classify(Error(BF)),true);assert.equal(classify(Error('invalid account')),false);});
 await check('actual BFCache interruption returns original receipt and uncertainty',async()=>{const f=fixture();const r=await f.remote.preverifyAndTriggerRenewalSourceDeleteAttempt(f.session,'Account',null,{attempt:1,attemptId:'local'},0);assert.equal(r.transportInterrupted,true);assert.equal(r.attemptReceipt.attemptId,'a');assert.equal(f.counts().deletes,1);});
 await check('proof-only request without original receipt never starts delete',async()=>{const f=fixture({recovery:true});await assert.rejects(f.remote.finishRenewalReplacement({renewalId:'r',type:'FINISH_RENEWAL_REPLACEMENT',recoveryOnly:true}),/KR_PHASE4_JOURNAL_/);assert.equal(f.counts().begins,0);assert.equal(f.counts().deletes,0);assert.equal(f.session.stage,'source-delete-outcome-unverified');});
 await check('proof-only existing receipt is resolved and failure restores blocked state',async()=>{const f=fixture({recovery:true,existing:true});await assert.rejects(f.remote.finishRenewalReplacement({renewalId:'r',type:'FINISH_RENEWAL_REPLACEMENT',recoveryOnly:true}),/KR_PHASE4_JOURNAL_/);assert.equal(f.counts().resolves,1);assert.equal(f.counts().begins,0);assert.equal(f.counts().deletes,0);assert.equal(f.session.stage,'source-delete-outcome-unverified');});
 await check('unknown error after intent only reconciles that receipt, never repeats delete',async()=>{const f=fixture({error:'unexpected transport failure'});await assert.rejects(f.remote.finishRenewalReplacement({renewalId:'r',automatic:true}),/KR_PHASE4_JOURNAL_/);assert.equal(f.counts().begins,1);assert.equal(f.counts().deletes,1);assert.equal(f.counts().resolves,1);assert.equal(f.counts().started,1);assert.equal(f.session.stage,'source-delete-outcome-unverified');});
 await check('actual inventory recovery action only sends receipt-only FINISH, both layouts wired',async()=>{
   const code=fs.readFileSync('src/app/inventory-card-renderer.js','utf8');
   const a=code.indexOf('function phase4RecoveryOnly(record)'),b=code.indexOf('function renderCompactInventoryRow(record)',a);
   const requests=[],notices=[];let click;
   const ui=vm.runInNewContext(code.slice(a,b)+'\n({phase4RecoveryOnly,wirePhase4Recovery})',{
     requireAccountBoundAction:()=>true,runtimeMessage:async x=>{requests.push(x);return {notice:{kind:'success'}};},
     renderAppNotice:x=>notices.push(x),setStatus:()=>{},refreshInventories:async()=>{},setFriendlyErrorStatus:()=>{}
   });
   const record={adId:'200',renewal:{renewalId:'r',newAdId:'200',status:'verified',stage:'source-delete-outcome-unverified'}};
   const button={addEventListener:(name,fn)=>{assert.equal(name,'click');click=fn;}};
   assert.equal(ui.phase4RecoveryOnly(record),true);assert.equal(ui.phase4RecoveryOnly({...record,adId:'999'}),false);
   ui.wirePhase4Recovery(button,record,false);await click();assert.equal(requests.length,0);
   ui.wirePhase4Recovery(button,record,true);await click();assert.equal(requests.length,1);
   assert.equal(requests[0].type,'FINISH_RENEWAL_REPLACEMENT');assert.equal(requests[0].recoveryOnly,true);assert.equal(requests[0].renewalId,'r');
   assert.equal(notices.length,1);assert.equal(code.split('wirePhase4Recovery(').length-1,3);
 });
 await check('authoritative inventory read overlays only matching candidate and keeps record data',async()=>{
   const a=background.indexOf('async function listInventories(profileId)'),b=background.indexOf('\n}',a);
   const old={inventoryId:'new',profileId:'P',adId:'200',title:'fixture',renewal:{renewalId:'r',stage:'replacement-ready'}};
   const other={...old,inventoryId:'wrong'};
   const live={renewalId:'r',skeletonInventoryId:'new',profileId:'P',newAdId:'200',status:'verified',stage:'source-delete-outcome-unverified'};
   const list=vm.runInNewContext('('+background.slice(a,b+2)+')',{purgeExpiredTrash:async()=>{},readInventoryRecordsForProfile:async()=>[old,other],isTrashRecord:()=>false,readRenewalSessions:async()=>({r:live}),renewalPublicSnapshot:x=>x});
   const rows=await list('P');assert.equal(rows[0].renewal.stage,'source-delete-outcome-unverified');
   assert.equal(rows[1].renewal.stage,'replacement-ready');assert.equal(rows[0].title,'fixture');assert.equal(old.renewal.stage,'replacement-ready');
 });
 return {passed,failed};
}
module.exports=run;
if(require.main===module)run().then(r=>{console.log(JSON.stringify(r));if(r.failed)process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});
