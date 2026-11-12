// KAR-99 P1.3: real double-read durable P8 export callback closure,
// deliberately NOT positive owner IDLE or updater reserve authority.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Additional=require('../src/background/services/additional-owner-observer.js');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
function disk(){
 const rows={};let reads=0,writes=0,after=null,fail=false;
 return {rows,get writes(){return writes},afterRead(fn){after=fn},failReads(v){fail=v},
 async get(keys){
   if(fail)throw Error('read unavailable');
   const names=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
   const out=Object.fromEntries(names.filter(n=>Object.hasOwn(rows,n))
     .map(n=>[n,structuredClone(rows[n])]));
   if(keys===null){reads++;if(after)after(reads,rows);}
   return out;
 },async set(p){writes++;Object.assign(rows,structuredClone(p));}};
}
const session={async get(){return {}}};
function observer(db){return Additional.create({storageLocal:db,storageSession:session,
 workerInstanceId:'current-worker',clock:()=>5000});}
function receipt(db,token,type='GET_DIAGNOSTIC_EXPORT',completed=1200){
 db.rows[Atomic.START_PREFIX+token]={schema:1,state:'admitted',token,
   operationType:type,workerInstanceId:'prior-worker',startedAtMs:1000};
 if(completed!==null)db.rows[Atomic.FINISH_PREFIX+token]={schema:1,
   state:'completed',token,workerInstanceId:'prior-worker',completedAtMs:completed};
}
test('real prior-worker durable export start/finish is locally callback-settled, not IDLE',async()=>{
 const db=disk();receipt(db,'diagnostic_001');const a=observer(db);
 const proof=await a.inspectDiagnosticExportClosureReadOnly();
 assert.equal(proof.status,'callback-settled');
 assert.equal(proof.owner,'diagnosticExport');
 assert.equal(proof.completedReceiptCount,1);
 assert.equal(proof.eligibleForLease,false);
 assert.equal(proof.priorGenerationClosed,false);
 assert.equal(proof.consumerDeliveryVerified,false);
 assert.equal(db.writes,0);
 assert.ok(Object.isFrozen(proof));
 const original=await a.observe();
 assert.equal(original.observations.diagnosticExport.state,'unknown');
 assert.equal(original.eligibleForLease,false);
});
test('empty store is not a positive completed-export claim',async()=>{
 const proof=await observer(disk()).inspectDiagnosticExportClosureReadOnly();
 assert.equal(proof.status,'unverified');
 assert.equal(proof.eligibleForLease,false);
});
test('prior worker with unfinished export cannot be cleared by reboot',async()=>{
 const db=disk();receipt(db,'diagnostic_001','GET_DIAGNOSTIC_EXPORT',null);
 const proof=await observer(db).inspectDiagnosticExportClosureReadOnly();
 assert.equal(proof.status,'unverified');
 assert.equal(proof.reason,'DURABLE_ADMISSION_UNFINISHED');
});
test('unrelated generic callback cannot masquerade as diagnostic export',async()=>{
 const db=disk();receipt(db,'generic_001','UNKNOWN_ROUTE');
 const proof=await observer(db).inspectDiagnosticExportClosureReadOnly();
 assert.equal(proof.status,'unverified');
 assert.equal(proof.reason,'OWNER_PROVENANCE_UNVERIFIED');
});
test('unrelated operation mixed with real export blocks attribution',async()=>{
 const db=disk();receipt(db,'diagnostic_001');receipt(db,'generic_001','UNKNOWN_ROUTE');
 const proof=await observer(db).inspectDiagnosticExportClosureReadOnly();
 assert.equal(proof.status,'unverified');
 assert.equal(proof.eligibleForLease,false);
});
test('live tracked export blocks despite historic completed receipt',async()=>{
 const db=disk();receipt(db,'diagnostic_001');const a=observer(db);
 let release;const suspended=new Promise(resolve=>{release=resolve});
 const task=a.track('diagnosticExport',()=>suspended);
 const proof=await a.inspectDiagnosticExportClosureReadOnly();
 assert.equal(proof.status,'unverified');
 assert.equal(proof.reason,'ACTUAL_IN_FLIGHT_OPERATION');
 release();await task;
 assert.equal((await a.inspectDiagnosticExportClosureReadOnly()).status,'callback-settled');
});
test('durable journal changes between first and second source scans fail closed',async()=>{
 const db=disk();receipt(db,'diagnostic_001');
 db.afterRead((n,rows)=>{if(n===2)rows[Atomic.FINISH_PREFIX+'diagnostic_001'].completedAtMs=1300});
 const proof=await observer(db).inspectDiagnosticExportClosureReadOnly();
 assert.equal(proof.status,'unverified');
 assert.equal(proof.reason,'DURABLE_ADMISSION_UNVERIFIED');
});
test('orphan completion or storage failure cannot yield callback-settled',async()=>{
 const db=disk();db.rows[Atomic.FINISH_PREFIX+'orphan']={schema:1,state:'completed',
 token:'orphan',workerInstanceId:'prior-worker',completedAtMs:1200};
 assert.equal((await observer(db).inspectDiagnosticExportClosureReadOnly()).status,'unverified');
 const broken=disk();broken.failReads(true);
 assert.equal((await observer(broken).inspectDiagnosticExportClosureReadOnly()).status,'unverified');
});
