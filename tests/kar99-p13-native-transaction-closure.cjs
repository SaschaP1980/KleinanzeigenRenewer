// KAR-99 P1.3 nativeUpdateTransaction: READ-ONLY actual persisted fence.
// A locally recorded release can never substitute for independent NativeHost
// apply/rollback state inspection, prior MV3 worker closure, or updater IDLE.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Owners=require('../src/background/services/additional-owner-observer.js');
const Fence=require('../src/background/services/update-workflow-fence.js');
const KEY=Fence.STORAGE_KEY, PROFILE='account-one';
function reserved(){
 return {schema:1,state:'reserved',token:'nonce-1234567890',
  profileId:PROFILE,workerGeneration:'earlier-worker',
  transactionId:'transaction-1',createdAtMs:1000,expiresAtMs:61000};
}
const cancelled=()=>({...reserved(),state:'cancelled',cancelledAtMs:1200});
const released=()=>({...cancelled(),state:'released',releasedAtMs:1400});
function disk(){
 const rows={activeDetectedProfileV1:{profileId:PROFILE},
  selectedInventoryProfileV1:{profileId:PROFILE}};
 let writes=0,reads=0,fail=false,onRead=null;
 return {rows,get writes(){return writes},onRead(fn){onRead=fn},
  fail(v){fail=v},
  async get(keys){
   if(fail)throw Error('local storage inaccessible');
   const names=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
   const result=Object.fromEntries(names.filter(k=>Object.hasOwn(rows,k))
    .map(k=>[k,structuredClone(rows[k])]));
   reads++;onRead?.(reads,rows,keys);
   return result;
  },
  async set(value){writes++;Object.assign(rows,structuredClone(value))}
 };
}
const create=(d,clock=()=>5000)=>Owners.create({
 storageLocal:d,storageSession:{async get(){return {}}},
 workerInstanceId:'current-worker',clock
});
const inspect=(d,clock)=>create(d,clock).inspectNativeUpdateTransactionClosureReadOnly();
function invariant(p){
 assert.equal(p.schema,1);assert.equal(p.owner,'nativeUpdateTransaction');
 assert.equal(p.eligibleForLease,false);
 assert.equal(p.nativeHostOutcomeVerified,false);
 assert.equal(p.noPendingApplyVerified,false);
 assert.equal(p.noPendingRollbackVerified,false);
 assert.equal(p.priorGenerationClosed,false);
 assert.ok(Object.isFrozen(p));
}
test('exact locally released 10-field fence is only historical local receipt',async()=>{
 const d=disk();d.rows[KEY]=released();const o=create(d);
 const p=await o.inspectNativeUpdateTransactionClosureReadOnly();
 invariant(p);
 assert.equal(p.status,'local-release-recorded');
 assert.equal(p.localReleaseRecorded,true);
 assert.equal(p.transactionState,'released');
 assert.equal(typeof p.sourceRevision,'string');
 assert.equal(d.writes,0);
 assert.notEqual((await o.observe()).observations.nativeUpdateTransaction.state,'idle');
});
test('reserved original fence is held, including after lease expiry',async()=>{
 const d=disk();d.rows[KEY]=reserved();
 const p=await inspect(d,()=>200000);
 invariant(p);assert.equal(p.status,'blocked');
 assert.equal(p.transactionState,'reserved');
 assert.equal(p.localReleaseRecorded,false);
 assert.equal(d.writes,0);
});
test('cancelled persisted tombstone is held even after restart',async()=>{
 const d=disk();d.rows[KEY]=cancelled();
 const p=await inspect(d,()=>200000);
 invariant(p);assert.equal(p.status,'blocked');
 assert.equal(p.transactionState,'cancelled');
 assert.equal(p.localReleaseRecorded,false);
});
test('missing transaction is unknown, never an empty successful host result',async()=>{
 const p=await inspect(disk());
 invariant(p);assert.equal(p.status,'unverified');
 assert.equal(p.localReleaseRecorded,false);
});
test('explicit null transaction is not a positive local release',async()=>{
 const d=disk();d.rows[KEY]=null;
 const p=await inspect(d);
 invariant(p);assert.equal(p.status,'unverified');
});
test('released string state alone cannot be used as release attestation',async()=>{
 const d=disk();d.rows[KEY]={schema:1,state:'released'};
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('caller confirmed:true and forged source field cannot establish release',async()=>{
 const d=disk();d.rows[KEY]={...released(),confirmed:true,
  source:'independent-native-transaction-inspection'};
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('active fence cannot be released by a caller-provided proof object',async()=>{
 const d=disk();d.rows[KEY]={...cancelled(),confirmed:true};
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('invalid state remains unverified without guessing terminality',async()=>{
 const d=disk();d.rows[KEY]={...released(),state:'maybe-released'};
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('invalid schema cannot attest a released native transaction',async()=>{
 const d=disk();d.rows[KEY]={...released(),schema:2};
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('missing release timestamp is not a released receipt',async()=>{
 const d=disk();const row=released();delete row.releasedAtMs;d.rows[KEY]=row;
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('released timestamp before cancellation is a corrupt tombstone',async()=>{
 const d=disk();d.rows[KEY]={...released(),releasedAtMs:1100};
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('cancellation before original reservation is corrupt',async()=>{
 const d=disk();d.rows[KEY]={...released(),cancelledAtMs:900};
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('expiry earlier than original reservation is corrupt',async()=>{
 const d=disk();d.rows[KEY]={...released(),expiresAtMs:900};
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('non-safe integer timestamp cannot prove stable release',async()=>{
 const d=disk();d.rows[KEY]={...released(),releasedAtMs:1.5};
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('released timestamp in the future does not prove a current receipt',async()=>{
 const d=disk();d.rows[KEY]={...released(),releasedAtMs:999999};
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('invalid token and generation cannot pass owner identity checks',async()=>{
 for(const [key,value] of [['token','not valid'],['workerGeneration','no spaces allowed'],
  ['profileId',''],['transactionId','../unsafe']]){
  const d=disk();d.rows[KEY]={...released(),[key]:value};
  const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
 }
});
test('released receipt must describe same current detected/selected profile',async()=>{
 const d=disk();d.rows[KEY]=released();
 d.rows.selectedInventoryProfileV1={profileId:'different-account'};
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('released receipt scoped to different persisted owner is not accepted',async()=>{
 const d=disk();d.rows[KEY]={...released(),profileId:'other-account'};
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('missing current selected profile cannot prove scope for released receipt',async()=>{
 const d=disk();d.rows[KEY]=released();delete d.rows.selectedInventoryProfileV1;
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('missing current detected profile cannot prove scope for released receipt',async()=>{
 const d=disk();d.rows[KEY]=released();delete d.rows.activeDetectedProfileV1;
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('local storage read error is unverified and read-only',async()=>{
 const d=disk();d.rows[KEY]=released();d.fail(true);
 const p=await inspect(d);invariant(p);
 assert.equal(p.status,'unverified');assert.equal(d.writes,0);
});
test('changed transaction state during observation cannot launder release',async()=>{
 const d=disk();d.rows[KEY]=released();
 d.onRead((n,rows)=>{if(n===2)rows[KEY].state='cancelled'});
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('token or worker generation drift during independent read fails closed',async()=>{
 for(const key of ['token','workerGeneration','transactionId']){
  const d=disk();d.rows[KEY]=released();
  d.onRead((n,rows)=>{if(n===2)rows[KEY][key]='changed-'+key});
  const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
 }
});
test('profile drift during repeated persisted reads fails closed',async()=>{
 const d=disk();d.rows[KEY]=released();
 d.onRead((n,rows)=>{if(n===2)rows.selectedInventoryProfileV1={profileId:'other'}});
 const p=await inspect(d);invariant(p);assert.equal(p.status,'unverified');
});
test('in-flight nativeUpdateTransaction owner blocks historic local release',async()=>{
 const d=disk();d.rows[KEY]=released();const o=create(d);
 let resolve;const held=new Promise(done=>{resolve=done});
 const task=o.track('nativeUpdateTransaction',()=>held);
 const p=await o.inspectNativeUpdateTransactionClosureReadOnly();
 invariant(p);assert.equal(p.status,'blocked');
 resolve();await task;
 const later=await o.inspectNativeUpdateTransactionClosureReadOnly();
 invariant(later);assert.equal(later.status,'local-release-recorded');
});
test('valid released local receipt cannot invoke native health/check or recovery',async()=>{
 const d=disk();d.rows[KEY]=released();
 const o=create(d);
 assert.equal(typeof o.recover,'undefined');
 const p=await o.inspectNativeUpdateTransactionClosureReadOnly();
 invariant(p);assert.equal(p.nativeHostOutcomeVerified,false);
 assert.equal(d.writes,0);
});

test('R2 private Windows pending transaction blocks even without a local MV3 fence',async()=>{
 const d=disk();let reads=0;
 const observer=Owners.create({storageLocal:d,storageSession:{async get(){return {}}},
  workerInstanceId:'current-worker',clock:()=>5000,
  readNativeTransactionReadOnly:async()=>{
   reads++;
   return Object.freeze({ok:true,operation:'inspect_transaction',
    status:'blocked',journal:'present',lock:'absent',receipt:'present',
    journalFormat:'legacy-pending',journalFingerprint:'a'.repeat(64),
    receiptFormat:'legacy-installed',receiptFingerprint:'b'.repeat(64),
    transactionPhase:'pending-install-or-rollback',
    identityBound:false,nativeOutcomeVerified:false,
    rollbackVerified:false,eligibleForLease:false});
  }});
 const p=await observer.inspectNativeUpdateTransactionClosureReadOnly();
 invariant(p);
 assert.equal(reads,1);
 assert.equal(p.status,'blocked');
 assert.equal(p.reason,'NATIVE_HOST_TRANSACTION_BLOCKED');
 assert.equal(p.nativeHostEvidence.status,'blocked');
 assert.equal(p.nativeHostEvidence.journalFingerprint,'a'.repeat(64));
 assert.equal(p.nativeHostEvidence.identityBound,false);
 assert.equal(d.writes,0);
});
test('R2 valid native installed receipt cannot upgrade local release to terminal success',async()=>{
 const d=disk();d.rows[KEY]=released();
 const observer=Owners.create({storageLocal:d,storageSession:{async get(){return {}}},
  workerInstanceId:'current-worker',clock:()=>5000,
  readNativeTransactionReadOnly:async()=>({ok:true,operation:'inspect_transaction',
   status:'unverified',journal:'absent',lock:'absent',receipt:'present',
   journalFormat:'unknown',journalFingerprint:null,
   receiptFormat:'legacy-installed',receiptFingerprint:'b'.repeat(64),
   transactionPhase:'unknown',identityBound:false,nativeOutcomeVerified:false,
   rollbackVerified:false,eligibleForLease:false})});
 const p=await observer.inspectNativeUpdateTransactionClosureReadOnly();
 invariant(p);
 assert.equal(p.status,'local-release-recorded');
 assert.equal(p.localReleaseRecorded,true);
 assert.equal(p.nativeHostEvidence.receiptFingerprint,'b'.repeat(64));
 assert.equal(p.nativeHostOutcomeVerified,false);
 assert.equal(d.writes,0);
});
test('R2 native host unavailable, forged identity or false success never grants authority',async()=>{
 for(const response of [
   null,{ok:false,error:'HOST_UNAVAILABLE'},
   {ok:true,operation:'inspect_transaction',status:'unverified',
     identityBound:true,nativeOutcomeVerified:true,rollbackVerified:true,
     eligibleForLease:true}
 ]){
   const d=disk();d.rows[KEY]=released();
   const o=Owners.create({storageLocal:d,storageSession:{async get(){return {}}},
     workerInstanceId:'current-worker',clock:()=>5000,
     readNativeTransactionReadOnly:async()=>response});
   const p=await o.inspectNativeUpdateTransactionClosureReadOnly();
   invariant(p);
   assert.equal(p.nativeHostEvidence,null);
   assert.equal(p.status,'local-release-recorded');
   assert.equal(d.writes,0);
 }
});

test('R2 genuine manual Windows pending artifact blocks despite absent local P8 transaction',async()=>{
 const d=disk();
 const o=Owners.create({storageLocal:d,storageSession:{async get(){return {}}},
   workerInstanceId:'current-worker',clock:()=>5000,
   readNativeTransactionReadOnly:async()=>({
     ok:true,operation:'inspect_transaction',status:'blocked',
     journal:'absent',lock:'absent',receipt:'present',transactionPhase:'unknown',
     journalFormat:'unknown',journalFingerprint:null,
     receiptFormat:'legacy-installed',receiptFingerprint:'c'.repeat(64),
     manualPresence:'present',manualTransaction:'pending',
     manualTransactionId:'a'.repeat(32),manualTransactionFingerprint:'b'.repeat(64),
     manualTransactionOrigin:'manual-operator',manualReceiptMatches:false,
     identityBound:false,nativeOutcomeVerified:false,rollbackVerified:false,
     eligibleForLease:false
   })});
 const proof=await o.inspectNativeUpdateTransactionClosureReadOnly();
 invariant(proof);assert.equal(proof.status,'blocked');
 assert.equal(proof.reason,'NATIVE_HOST_TRANSACTION_BLOCKED');
 assert.equal(proof.nativeHostEvidence.manualTransaction,'pending');
 assert.equal(proof.nativeHostEvidence.manualTransactionId,'a'.repeat(32));
 assert.equal(proof.nativeHostEvidence.manualReceiptMatches,false);
 assert.equal(d.writes,0);
});
test('R2 matching manual file-receipt evidence is never original Worker P8 terminality',async()=>{
 const d=disk();d.rows[KEY]=released();
 const o=Owners.create({storageLocal:d,storageSession:{async get(){return {}}},
   workerInstanceId:'current-worker',clock:()=>5000,
   readNativeTransactionReadOnly:async()=>({
     ok:true,operation:'inspect_transaction',status:'unverified',
     journal:'absent',lock:'absent',receipt:'present',transactionPhase:'unknown',
     journalFormat:'unknown',journalFingerprint:null,
     receiptFormat:'legacy-installed',receiptFingerprint:'c'.repeat(64),
     manualPresence:'present',manualTransaction:'files-installed-unbound',
     manualTransactionId:'a'.repeat(32),manualTransactionFingerprint:'b'.repeat(64),
     manualTransactionOrigin:'manual-operator',manualReceiptMatches:true,
     identityBound:false,nativeOutcomeVerified:false,rollbackVerified:false,
     eligibleForLease:false
   })});
 const proof=await o.inspectNativeUpdateTransactionClosureReadOnly();
 invariant(proof);
 assert.equal(proof.status,'local-release-recorded');
 assert.equal(proof.localReleaseRecorded,true);
 assert.equal(proof.nativeHostEvidence.manualTransaction,'files-installed-unbound');
 assert.equal(proof.nativeHostEvidence.manualReceiptMatches,true);
 assert.equal(proof.nativeHostEvidence.manualTransactionOrigin,'manual-operator');
 assert.equal(proof.nativeHostEvidence.manualTransactionId,'a'.repeat(32));
 assert.equal(proof.nativeHostOutcomeVerified,false);
 assert.equal(d.writes,0);
});

function nativePhase(overrides={}) {
 return Object.freeze({
  ok:true,operation:'inspect_transaction',status:'unverified',
  journal:'absent',lock:'absent',receipt:'present',
  transactionPhase:'unknown',journalFingerprint:null,
  receiptFingerprint:'c'.repeat(64),
  manualTransaction:'files-installed-unbound',
  manualTransactionId:'a'.repeat(32),manualTransactionFingerprint:'b'.repeat(64),
  manualTransactionOrigin:'manual-operator',manualReceiptMatches:true,
  identityBound:false,nativeOutcomeVerified:false,rollbackVerified:false,
  eligibleForLease:false,...overrides
 });
}
function liveNativeObserver(d, fn) {
 return Owners.create({storageLocal:d,storageSession:{async get(){return {}}},
   workerInstanceId:'current-worker',clock:()=>5000,
   readNativeTransactionReadOnly:fn});
}
test('R2: native Windows transaction starting during five local reads must block',async()=>{
 const d=disk();d.rows[KEY]=released();
 let reads=0;
 const obs=liveNativeObserver(d,async()=>{
  reads++;
  return reads===1?nativePhase():nativePhase({
   status:'blocked',journal:'present',
   transactionPhase:'pending-install-or-rollback',
   journalFingerprint:'e'.repeat(64)
  });
 });
 const proof=await obs.inspectNativeUpdateTransactionClosureReadOnly();
 invariant(proof);
 assert.ok(reads>=2,'native host must be sampled again after durable local reads');
 assert.equal(proof.status,'blocked');
 assert.equal(proof.reason,'NATIVE_HOST_TRANSACTION_BLOCKED');
 assert.equal(proof.nativeHostEvidence.journal,'present');
 assert.equal(proof.localReleaseRecorded,false);
 assert.equal(d.writes,0);
});
test('R2: native manual transaction fingerprint changes during local source read => unverified',async()=>{
 const d=disk();d.rows[KEY]=released();let reads=0;
 const obs=liveNativeObserver(d,async()=>{
  reads++;
  return nativePhase({manualTransactionFingerprint:(reads===1?'b':'d').repeat(64)});
 });
 const proof=await obs.inspectNativeUpdateTransactionClosureReadOnly();
 invariant(proof);
 assert.ok(reads>=2,'second native inspection required');
 assert.equal(proof.status,'unverified');
 assert.equal(proof.reason,'NATIVE_HOST_SOURCE_CHANGED_DURING_READ');
 assert.equal(proof.nativeHostEvidence,null);
 assert.equal(proof.localReleaseRecorded,false);
 assert.equal(d.writes,0);
});
test('R2: interrupted/unavailable host after initial proof cannot certify local release',async()=>{
 const d=disk();d.rows[KEY]=released();let reads=0;
 const obs=liveNativeObserver(d,async()=>{
  if(++reads===1)return nativePhase();
  throw Error('native host disconnected');
 });
 const proof=await obs.inspectNativeUpdateTransactionClosureReadOnly();
 invariant(proof);
 assert.ok(reads>=2);
 assert.equal(proof.status,'unverified');
 assert.equal(proof.reason,'NATIVE_HOST_SOURCE_CHANGED_DURING_READ');
 assert.equal(proof.nativeHostEvidence,null);
 assert.equal(d.writes,0);
});
test('R2: stable twice verified NativeHost manual source remains only historical local receipt',async()=>{
 const d=disk();d.rows[KEY]=released();let reads=0;
 const obs=liveNativeObserver(d,async()=>{reads++;return nativePhase()});
 const proof=await obs.inspectNativeUpdateTransactionClosureReadOnly();
 invariant(proof);
 assert.equal(reads,2);
 assert.equal(proof.status,'local-release-recorded');
 assert.equal(proof.localReleaseRecorded,true);
 assert.equal(proof.nativeHostEvidence.manualTransactionFingerprint,'b'.repeat(64));
 assert.equal(proof.nativeHostOutcomeVerified,false);
 assert.equal(proof.eligibleForLease,false);
 assert.equal(d.writes,0);
});
