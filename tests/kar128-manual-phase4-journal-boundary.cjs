// KAR-128 test-first: manual and automatic Phase-4 remote DELETE must share
// a single verified-profile journal boundary inside RemoteDeleteReplacementService.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Remote=require('../src/background/services/remote-delete-replacement-service.js');
const Journal=require('../src/background/services/phase4-uncertainty-journal.js');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
const remoteSrc=fs.readFileSync('src/background/services/remote-delete-replacement-service.js','utf8');
const ctrlSrc=fs.readFileSync('src/background/controllers/renewal-workflow-controller.js','utf8');
const bg=fs.readFileSync('src/background/background.js','utf8');
let count=0;function ok(x,label){assert.ok(x,label);count++;console.log('PASS KAR128 '+label);}
function storage() {
 const map=Object.create(null);
 return {
  map,async get(k){const names=k===null?Object.keys(map):Array.isArray(k)?k:[k];return Object.fromEntries(names.filter(x=>Object.hasOwn(map,x)).map(x=>[x,structuredClone(map[x])]));},
  async set(r){Object.assign(map,structuredClone(r));}
 };
}
function harness(beginPort, switchProfileAfterReceipt=false, switchProfileDuringDiagnostic=false) {
 let deleteCalls=0,receiptStateAtDelete=null;
 let liveProfile='Source Profile';
 const db=storage();let i=0;
 const sharedLock=require('./helpers/phase4-locks.cjs')();
 const journal=Journal.create({storageLocal:db,newToken:()=> 'attempt-'+(++i),
   workerInstanceId:'worker-test',clock:()=>1337,...sharedLock});
 const atomic=Atomic.create({storageLocal:db,lockManager:sharedLock.lockManager,
   workerInstanceId:'worker-test',clock:()=>1337,
   newToken:()=> 'p8-verified-token-'+(++i)+'-long'});
 const opts={
  beginPhase4Attempt:async req=>{
    const receipt=await (beginPort?beginPort(req,journal):journal.begin(req));
    if(switchProfileAfterReceipt)liveProfile='Switched Account';
    return receipt;
  },
  createManagedWorkerTab:async()=>({id:42}),
  waitForTabComplete:async()=>true,
  ensureContentConnection:async()=>true,
  sendTabRequestWithBootstrap:async(_tab,request)=>{
    if(request.type==='MY_ADS_STATUS')return {isMyAdsPage:true,isProjectsTab:true,profileName:liveProfile};
    if(request.type==='DELETE_OWN_AD_BY_ID'){
      deleteCalls++;receiptStateAtDelete=Object.values(db.map).map(x=>x.state);
      return {actionTriggered:true};
    }
    throw Error('unexpected remote request '+request.type);
  },
  normalizeProfileName:s=>String(s||'').trim(),
  logDiagnostic:async (_severity,event)=>{
    if(switchProfileDuringDiagnostic&&event==='RENEWAL_PHASE4_ATOMIC_PREVERIFY_DELETE_STARTED')
      liveProfile='Switched Account';
  },
  closeManagedWorkerTab:async()=>{},
  sessionCorrelationContext:()=>({}),
  correlationContext:()=>({}),
  renewalMaxPhaseAttempts:()=>3,
  assertEmergencyResetGeneration:()=>true,
  isPhase4DeleteTransportInterruption:()=>false
 };
 const api=Remote.create(opts);
 return {api,db,journal,atomic,get deleteCalls(){return deleteCalls;},get receiptStateAtDelete(){return receiptStateAtDelete}};
}
const session={renewalId:'renewal-1',sourceAdId:'12345',newAdId:'67890'};
async function main(){
 ok(remoteSrc.includes('await beginPhase4Attempt({'),'shared service requires journal before DELETE');
 ok(remoteSrc.indexOf('await beginPhase4Attempt({')<remoteSrc.indexOf("type: 'DELETE_OWN_AD_BY_ID'"),
   'durable receipt precedes literal remote delete request');
 ok(!ctrlSrc.includes('await beginPhase4Attempt(current)'),
   'automatic caller does not duplicate the receipt before verified live profile');
 ok(bg.includes('beginPhase4Attempt: current => requirePhase4UncertaintyJournal().begin(current)'),
   'actual RemoteDeleteReplacementService receives shared journal implementation');
 // B2B: real shared P8 Web Lock start receipt must be the source of truth,
 // not an arbitrary caller-provided "admission" object or callback completion.
 const linked=harness();
 let acceptedReceipt=null;
 await linked.atomic.withAdmission('AUTONOMOUS:renewal-auto-phase4',async receipt=>{
   acceptedReceipt=receipt;
   await linked.api.preverifyAndTriggerRenewalSourceDeleteAttempt(
     session,'Source Profile',null,{attempt:1,attemptId:'p8'},0,receipt);
 });
 const linkedIntent=Object.values(linked.db.map).find(row=>row.state==='outcome-unverified');
 ok(linked.deleteCalls===1 && linkedIntent?.admissionToken===acceptedReceipt?.token,
    'real P8 receipt survives automatic Phase-4 and is persisted before remote DELETE');
 const correspondingStart=linked.db.map[Atomic.START_PREFIX+acceptedReceipt.token];
 const correspondingFinish=linked.db.map[Atomic.FINISH_PREFIX+acceptedReceipt.token];
 ok(correspondingStart?.operationType==='AUTONOMOUS:renewal-auto-phase4'
    && correspondingFinish?.state==='completed',
    'P8 durable start/finish attest exact automatic Phase-4 callback lifetime');
 const forged=harness();
 const forgedReceipt=Object.freeze({schema:1,state:'admitted',
    token:'p8-fake-token-no-source',operationType:'AUTONOMOUS:renewal-auto-phase4',
    workerInstanceId:'worker-test',startedAtMs:1337});
 await assert.rejects(forged.api.preverifyAndTriggerRenewalSourceDeleteAttempt(
    session,'Source Profile',null,{attempt:1},0,forgedReceipt),
    /KR_PHASE4_JOURNAL_ADMISSION_UNVERIFIED/);
 ok(forged.deleteCalls===0 && Object.values(forged.db.map).length===0,
    'forged receipt cannot create durable intent or trigger remote DELETE');
 const positive=harness();
 await positive.api.preverifyAndTriggerRenewalSourceDeleteAttempt(session,'Source Profile',null,{attempt:1,attemptId:'a'},0);
 ok(positive.deleteCalls===1,'verified manual/shared path makes exactly one delete request');
 ok(positive.receiptStateAtDelete?.length===1&&positive.receiptStateAtDelete[0]==='outcome-unverified',
   'remote delete sees the recorded and acknowledged durable intent');
 const record=Object.values(positive.db.map)[0];
 ok(record.profileId==='Source Profile'&&record.sourceAdId==='12345'&&record.newAdId==='67890',
   'journal identity grounded in fresh live same-profile My Ads evidence');
 await assert.rejects(positive.api.preverifyAndTriggerRenewalSourceDeleteAttempt(session,'Source Profile',null,{attempt:2,attemptId:'b'},0),/KR_PHASE4_JOURNAL_UNRESOLVED/);
 ok(positive.deleteCalls===1,'repeating source delete after uncertain first attempt is denied');
 const blocked=harness(()=>{throw Object.assign(new Error('KR_PHASE4_JOURNAL_STORAGE'),{code:'KR_PHASE4_JOURNAL_STORAGE'});});
 await assert.rejects(blocked.api.preverifyAndTriggerRenewalSourceDeleteAttempt(session,'Source Profile',null,{attempt:1},0),/KR_PHASE4_JOURNAL_STORAGE/);
 ok(blocked.deleteCalls===0,'storage or journal failure cannot start remote deletion');
 // A live account can switch during the journal's asynchronous storage write.
 // A durable receipt must remain unresolved, and no DELETE may be dispatched.
 const changed=harness(null,true);
 await assert.rejects(changed.api.preverifyAndTriggerRenewalSourceDeleteAttempt(session,'Source Profile',null,{attempt:1},0),
   /KR_PHASE4_JOURNAL_ACCOUNT_CHANGED/);
 ok(changed.deleteCalls===0,
   'postreceipt account switch denies remote source delete before a side effect');
 ok(Object.values(changed.db.map).length===1&&Object.values(changed.db.map)[0].state==='outcome-unverified',
   'account switch after durable write preserves unresolved immutable Phase-4 attempt');
 // A diagnostic write is asynchronous and must not separate the last
 // account readback from the actual remote DELETE request.
 const late=harness(null,false,true);
 await assert.rejects(late.api.preverifyAndTriggerRenewalSourceDeleteAttempt(session,'Source Profile',null,{attempt:1},0),
   /KR_PHASE4_JOURNAL_ACCOUNT_CHANGED/);
 ok(late.deleteCalls===0,
   'account switch during postreceipt diagnostic awaits is denied before DELETE');
 ok(Object.values(late.db.map).length===1&&Object.values(late.db.map)[0].state==='outcome-unverified',
   'late account switch retains irreversible uncertainty receipt');
 const mismatch=harness();
 await assert.rejects(mismatch.api.preverifyAndTriggerRenewalSourceDeleteAttempt(session,'Other Profile',null,{attempt:1},0),/Kleinanzeigen-Konto entspricht nicht/);
 ok(mismatch.deleteCalls===0&&Object.keys(mismatch.db.map).length===0,
   'mismatched fresh live profile blocks journal and remote side effect');
 ok(!bg.includes('getOwnerSnapshot: () => requirePersistedOwnerObserver()'),
   'journal is not mistaken for an authoritative lease');
 console.log('PASS KAR128 total '+count);
}
main().catch(e=>{console.error(e);process.exitCode=1});
