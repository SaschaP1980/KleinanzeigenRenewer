// KAR-171: test-first verification of the independent, observer-only APP
// extension-document monitor. No native browser, account, worker or remote site.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path='docs/testing/KAR171_R1_CONTENT_PENDING_MONITOR_READ_ONLY.js';
const src=fs.readFileSync(path,'utf8');
const KEY='kar171R1ContentWitnessV1';
const nonce='a'.repeat(32),workerId='owner-worker-generation';
function fixture({version='1.25.22',pathname='/src/app/app.html',extensionId='hafahjhhgiipdegfkgacchmnacgblnah'}={}){
 const logs=[],handlers=new Set(),timers=new Map(),calls={set:0,remove:0,send:0},clock={now:1000000};
 let timerId=0;
 const ctx={
  location:{protocol:'chrome-extension:',hostname:extensionId,pathname},
  document:{},
  chrome:{runtime:{id:extensionId,getManifest:()=>({version}),sendMessage:()=>{calls.send++;throw Error('FORBIDDEN_SEND')}},
   storage:{local:{get:async()=>{throw Error('FORBIDDEN_STORAGE_GET')},set:async()=>{calls.set++;throw Error('FORBIDDEN_WRITE')},remove:async()=>{calls.remove++;throw Error('FORBIDDEN_DELETE')}},
    onChanged:{addListener:fn=>handlers.add(fn),removeListener:fn=>handlers.delete(fn)}}},
  Date:{now:()=>clock.now},
  setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId},
  clearTimeout:id=>timers.delete(id),
  console:{info:(tag,json)=>logs.push({tag,...JSON.parse(json)})}
 };
 ctx.globalThis=ctx;
 vm.runInNewContext(src,vm.createContext(ctx),{filename:path});
 const send=(row,areaName='local',key=KEY)=>{
  for(const h of [...handlers])h({[key]:{newValue:row}},areaName);
 };
 const row=(kind,state,{pagesScanned=0,uniqueCards=0,expectedOnline=null,observedAtMs=clock.now,nonceOverride=nonce,workerOverride=workerId}={})=>({
  schema:1,kind,nonce:nonceOverride,workerId:workerOverride,
  state,pagesScanned,uniqueCards,expectedOnline,observedAtMs
 });
 return {logs,handlers,timers,calls,clock,ctx,send,row};
}
test('wrong extension, version or non-App document cannot arm independent listener',()=>{
 for(const o of [{version:'1.25.21'},{pathname:'/src/background/background.js'},{extensionId:'wrong'}]){
  const f=fixture(o);
  assert.equal(f.handlers.size,0);
  assert.equal(f.calls.set+f.calls.remove+f.calls.send,0);
  assert.equal(f.logs.at(-1).r1Accepted,false);
 }
});
test('observer listens to live content events only, never replays stored baseline',()=>{
 const f=fixture();
 assert.equal(f.handlers.size,1);
 assert.equal(f.logs[0].status,'MONITOR_ARMED');
 assert.equal(f.calls.set+f.calls.remove+f.calls.send,0);
 f.send(f.row('source','received'),'session');
 f.send(f.row('source','received'),'local','other-key');
 assert.equal(f.logs.length,1);
 f.send(f.row('source','received'));
 assert.equal(f.logs.at(-1).status,'CONTENT_RECEIVED_UNSETTLED');
 assert.equal(f.ctx.__KAR171_R1_PENDING_MONITOR__.snapshot().status,'RECENT_UNSETTLED_CANDIDATE_ONLY');
 assert.equal(f.calls.set+f.calls.remove+f.calls.send,0);
});
test('real source then target sequences are independently ordered and terminal',()=>{
 const f=fixture();
 f.send(f.row('source','received'));
 f.clock.now+=10;
 f.send(f.row('source','page-confirmed',{pagesScanned:1,uniqueCards:2,expectedOnline:3}));
 assert.equal(f.logs.at(-1).status,'PAGE_CONFIRMED_UNSETTLED');
 f.clock.now+=20;
 f.send(f.row('source','settled',{pagesScanned:1,uniqueCards:2,expectedOnline:3}));
 assert.equal(f.logs.at(-1).status,'CONTENT_SETTLED');
 assert.equal(f.ctx.__KAR171_R1_PENDING_MONITOR__.snapshot().status,'NO_LIVE_PENDING_WINDOW');
 f.clock.now+=10;
 f.send(f.row('target','received'));
 f.clock.now+=10;
 f.send(f.row('target','page-confirmed',{pagesScanned:1,uniqueCards:3,expectedOnline:3}));
 f.clock.now+=10;
 f.send(f.row('target','settled',{pagesScanned:1,uniqueCards:3,expectedOnline:3}));
 assert.equal(f.logs.at(-1).status,'CONTENT_SETTLED');
 assert.equal(f.logs.some(r=>r.r1Accepted!==false||r.eligibleForLease!==false),false);
 for(const l of f.logs){
  assert.equal(JSON.stringify(l).includes(nonce),false);
  assert.equal(JSON.stringify(l).includes(workerId),false);
 }
});
test('missing terminal, invalid transition or another nonce closes evidence fail-closed',()=>{
 const f=fixture();
 f.send(f.row('source','received'));
 f.send(f.row('target','received'));
 assert.equal(f.logs.at(-1).status,'UNVERIFIED_CONCURRENT_OR_MISSING_TERMINAL');
 assert.equal(f.ctx.__KAR171_R1_PENDING_MONITOR__.snapshot().status,'AMBIGUOUS_EVIDENCE');
});
test('page counts and state ordering are strict, including repeated page and timestamp regression',()=>{
 const f=fixture();
 f.send(f.row('source','received'));
 f.send(f.row('source','page-confirmed',{pagesScanned:1,uniqueCards:1,expectedOnline:2}));
 f.send(f.row('source','page-confirmed',{pagesScanned:1,uniqueCards:1,expectedOnline:2}));
 assert.equal(f.logs.at(-1).status,'UNVERIFIED_NONMONOTONIC_CONTENT');
 assert.equal(f.ctx.__KAR171_R1_PENDING_MONITOR__.snapshot().status,'AMBIGUOUS_EVIDENCE');
 const g=fixture();
 g.send(g.row('source','received'));
 g.send(g.row('source','settled',{observedAtMs:g.clock.now-1}));
 assert.equal(g.logs.at(-1).status,'UNVERIFIED_NONMONOTONIC_CONTENT');
});
test('stale or malformed witness cannot produce a live pending candidate',()=>{
 const f=fixture();
 f.send(f.row('source','received',{observedAtMs:f.clock.now-60000}));
 assert.equal(f.logs.at(-1).status,'UNVERIFIED_MALFORMED_OR_STALE_CONTENT');
 assert.equal(f.ctx.__KAR171_R1_PENDING_MONITOR__.snapshot().status,'AMBIGUOUS_EVIDENCE');
 const g=fixture();
 g.send(g.row('source','received',{nonceOverride:'raw-private-adid'}));
 assert.equal(g.logs.at(-1).status,'UNVERIFIED_MALFORMED_OR_STALE_CONTENT');
});
test('live candidate becomes stale without new content-side events',()=>{
 const f=fixture();
 f.send(f.row('source','received'));
 f.clock.now+=2000;
 assert.equal(f.ctx.__KAR171_R1_PENDING_MONITOR__.snapshot().status,'NO_LIVE_PENDING_WINDOW');
});
test('content failure is terminal, never a positive remote or lease status',()=>{
 const f=fixture();
 f.send(f.row('target','received'));
 f.send(f.row('target','failed'));
 assert.equal(f.logs.at(-1).status,'CONTENT_FAILED');
 assert.equal(f.ctx.__KAR171_R1_PENDING_MONITOR__.snapshot().status,'NO_LIVE_PENDING_WINDOW');
 assert.equal(f.calls.send+f.calls.set+f.calls.remove,0);
});
test('Stop only detaches observer listener; automatic timeout also detaches',()=>{
 const f=fixture();
 const ctl=f.ctx.__KAR171_R1_PENDING_MONITOR__;
 ctl.stop();
 assert.equal(f.handlers.size,0);
 assert.equal(f.logs.at(-1).status,'MONITOR_STOPPED');
 const g=fixture();
 const timeout=[...g.timers.values()][0];
 assert.ok(timeout.ms>0&&timeout.ms<=180000);
 timeout.fn();
 assert.equal(g.handlers.size,0);
 assert.equal(g.logs.at(-1).status,'MONITOR_EXPIRED');
});
