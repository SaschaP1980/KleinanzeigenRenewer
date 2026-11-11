// KAR-99 P1.3-F2E2D1 — RED-first actual 15-owner immutable P8 admission history.
// A finished JavaScript callback is historical, not live generation closure,
// independently verified remote outcome, or an updater lease.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Persisted = require('../src/background/services/persisted-owner-observer.js');
const Additional = require('../src/background/services/additional-owner-observer.js');
const Atomic = require('../src/background/services/cross-worker-atomic-admission.js');
const WORKER='new-worker', OLD='old-worker';
function disk() {
 const rows={};let writes=0,reads=0,afterRead=null;
 return {rows,get writes(){return writes;},get reads(){return reads;},
  afterRead(fn){afterRead=fn;},
  async get(keys){
   const all=keys===null;
   const names=all?Object.keys(rows):Array.isArray(keys)?keys:[keys];
   const out=Object.fromEntries(names.filter(k=>Object.hasOwn(rows,k))
     .map(k=>[k,structuredClone(rows[k])]));
   if(all){reads++;if(afterRead)afterRead(reads,rows);}
   return out;
  },
  async set(value){writes++;Object.assign(rows,structuredClone(value));}
 };
}
const session={async get(){return {};}};
function owners(storage){
 const a=Persisted.create({storageLocal:storage,storageSession:session,
   clock:()=>5000,workerInstanceId:WORKER});
 const b=Additional.create({storageLocal:storage,storageSession:session,
   clock:()=>5000,workerInstanceId:WORKER});
 return {a,b};
}
function add(db,token,operationType,worker=OLD,finish=null){
 db.rows[Atomic.START_PREFIX+token]={schema:1,state:'admitted',
   token,operationType,workerInstanceId:worker,startedAtMs:1000};
 if(finish!==null)db.rows[Atomic.FINISH_PREFIX+token]={
   schema:1,state:'completed',token,workerInstanceId:worker,completedAtMs:finish};
}
function bounded(row){
 assert.equal(row.historicalOnly,true);
 assert.equal(row.generationAuthority,'unverified');
 assert.equal(row.remoteOutcome,'unverified');
 assert.ok(['callback-finished','unfinished','no-records','unverified'].includes(row.state));
}
test('F2E2D1 RED: same prior-worker finished P8 callback is visible to both real owner producers',async()=>{
 const db=disk();add(db,'oldtoken_01','AUTONOMOUS:renewal-auto-phase4',OLD,1100);
 const {a,b}=owners(db);
 const p=await a.observe(),s=await b.observe();
 assert.equal(p.admissionHistory.renewal.state,'callback-finished');
 assert.equal(p.admissionHistory.insertionLock.state,'callback-finished');
 assert.equal(s.admissionHistory.managedTabs.state,'callback-finished');
 assert.equal(p.admissionHistory.renewal.entries[0].workerInstanceId,OLD);
 assert.equal(p.admissionHistory.renewal.entries[0].completedAtMs,1100);
 assert.equal(p.admissionHistory.renewal.entries[0].state,'callback-finished');
 assert.ok(p.admissionHistory.renewal.sourceRevision.includes('oldtoken_01'));
 assert.equal(p.admissionJournalRevision,s.admissionJournalRevision);
 assert.equal(p.observations.renewal.state,'unknown');
 assert.equal(s.observations.managedTabs.state,'unknown');
 bounded(p.admissionHistory.renewal);bounded(s.admissionHistory.managedTabs);
 assert.equal(p.eligibleForLease,false);assert.equal(s.eligibleForLease,false);
 assert.equal(db.writes,0);
});
test('F2E2D1 RED: missing completion after worker termination remains unfinished and ACTIVE',async()=>{
 const db=disk();add(db,'pending_01','AUTONOMOUS:renewal-auto-phase4');
 const {a,b}=owners(db);
 const p=await a.observe(),s=await b.observe();
 assert.equal(p.admissionHistory.renewal.state,'unfinished');
 assert.equal(s.admissionHistory.managedTabs.state,'unfinished');
 assert.equal(p.admissionHistory.renewal.entries[0].completedAtMs,null);
 assert.equal(p.observations.renewal.state,'active');
 assert.equal(s.observations.managedTabs.state,'active');
 bounded(p.admissionHistory.renewal);
 assert.equal(db.writes,0);
});
test('F2E2D1 RED: no admission journal cannot certify a single owner or prior worker',async()=>{
 const db=disk(),{a,b}=owners(db);
 const all=await b.observeAll(a);
 assert.equal(all.eligibleForLease,false);
 assert.deepEqual(Object.keys(all.admissionHistory).sort(),
   [...Persisted.OWNERS,...Additional.OWNERS].sort());
 assert.ok(Object.values(all.admissionHistory).every(x=>x.state==='no-records'));
 assert.ok(Object.values(all.observations).every(x=>x.state!=='idle'));
 assert.ok(Object.values(all.admissionHistory).every(x=>{
   bounded(x);return x.entries.length===0;
 }));
});
test('F2E2D1 RED: orphan/malformed P8 completion provides no historical proof',async()=>{
 const db=disk();db.rows[Atomic.FINISH_PREFIX+'unknown_1']={
  schema:1,state:'completed',token:'unknown_1',workerInstanceId:OLD,completedAtMs:2000
 };
 const {a,b}=owners(db);
 const all=await b.observeAll(a);
 assert.ok(Object.values(all.admissionHistory).every(x=>x.state==='unverified'));
 assert.equal(all.admissionJournalRevision,null);
 assert.ok(Object.values(all.observations).every(x=>x.state!=='idle'));
});
test('F2E2D1 RED: torn P8 journal across reads suppresses historical completions',async()=>{
 const db=disk();add(db,'race_001','AUTONOMOUS:renewal-auto-phase4',OLD,1100);
 db.afterRead((n,rows)=>{
  if(n===1)rows[Atomic.FINISH_PREFIX+'race_001'].completedAtMs=1300;
 });
 const {a}=owners(db);
 const p=await a.observe();
 assert.equal(p.admissionHistory.renewal.state,'unverified');
 assert.equal(p.admissionHistory.renewal.sourceRevision,null);
 assert.equal(p.admissionJournalRevision,null);
 assert.equal(p.eligibleForLease,false);
});
test('F2E2D1 RED: concurrent admitted operations are preserved even after one callback finished',async()=>{
 const db=disk();
 add(db,'finished_01','AUTONOMOUS:renewal-auto-phase4',OLD,1100);
 add(db,'open_01','AUTONOMOUS:renewal-auto-phase4',WORKER);
 const {a}=owners(db),p=await a.observe();
 assert.equal(p.admissionHistory.renewal.state,'unfinished');
 assert.equal(p.admissionHistory.renewal.entries.length,2);
 assert.equal(p.admissionHistory.renewal.entries.filter(x=>x.state==='unfinished').length,1);
 assert.equal(p.observations.renewal.state,'active');
});
test('F2E2D1 RED: aggregate must reject divergent producer journals from separate reads',async()=>{
 const db=disk();add(db,'token_001','AUTONOMOUS:renewal-auto-phase4',OLD,1100);
 const {a,b}=owners(db);
 const earlier=await a.observe();
 const fakePersisted={observe:async()=>({...earlier,
   admissionJournalRevision:'different-provenance'})};
 const all=await b.observeAll(fakePersisted);
 assert.equal(all.admissionJournalRevision,null);
 assert.ok(Object.values(all.admissionHistory).every(x=>x.state==='unverified'));
 assert.equal(all.eligibleForLease,false);
});
