// KAR-171 R1: no new Chrome permission, no idle P8 API polling,
// while an ACTIVE inventory operation retains its 15-second fail-closed watchdog.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const bg=fs.readFileSync('src/background/background.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
const marker='// KAR-171 R1: suspend the bulk watchdog during idle MV3 worker lifecycle.';
const endMarker='// Recover persisted workflows only when no platform safety stop is active.';
function timerBlock(){
 const start=bg.indexOf(marker),end=bg.indexOf(endMarker,start);
 assert.ok(start>=0&&end>start,'active-only watchdog block must exist in real worker');
 return bg.slice(start,end);
}
function timerHarness(){
 const state={calls:[],timer:null,period:null,ticks:0,readRecoveries:0};
 const ctx={
  bulkWatchdogActive:false,
  BULK_RUN_WATCHDOG_TICK_MS:15000,
  withAutonomousAdmission(name,task){
   state.calls.push(name);return Promise.resolve().then(task);
  },
  ensureBulkRuntimeRecovery(){state.readRecoveries++;return Promise.resolve();},
  bulkRunWatchdogTick(){state.ticks++;return Promise.resolve(null);},
  setInterval(fn,delay){state.timer=fn;state.period=delay;return 42;}
 };
 vm.runInNewContext(timerBlock(),ctx,{filename:'bulk-watchdog-conditional-real-source.js'});
 return {state,ctx};
}
function stateHarness(){
 const start=bg.indexOf('let bulkWatchdogActive = false;');
 const end=bg.indexOf('\nfunction normalizedBulkRosterIds',start);
 assert.ok(start>=0&&end>start,'active state ownership must be in actual background.js');
 let run=null;
 const guard={
  recoverExpiredWorkerRun:async()=>({recovered:false,state:run}),
  read:async()=>run,
  write:async x=>(run=x),
  mutate:async fn=>(run=fn(run))
 };
 const ctx={
  ensureBulkRuntimeRecovery:async()=>{},
  requireBulkRunGuard:()=>guard,Date,
  BULK_RUN_MAX_AGE_MS:9999999999
 };
 vm.createContext(ctx);
 vm.runInContext(bg.slice(start,end),ctx,{filename:'real-bulk-watchdog-state.js'});
 return {ctx,put:x=>{run=x;},current:()=>vm.runInContext('bulkWatchdogActive',ctx)};
}
test('MV3 idle does not require extra alarms permission or change existing identity contract',()=>{
 assert.equal(manifest.manifest_version,3);
 assert.equal(manifest.permissions.includes('alarms'),false);
 assert.equal(manifest.permissions.includes('nativeMessaging'),true);
 assert.doesNotMatch(bg,/chrome\.alarms\./);
 assert.match(bg,/if \(!bulkWatchdogActive\) return;/);
 assert.match(bg,/setInterval/);
});
test('inert timer never touches P8 or Chrome APIs while bulk work is idle',async()=>{
 const h=timerHarness();
 assert.equal(typeof h.state.timer,'function');
 assert.equal(h.state.period,15000);
 await Promise.resolve();await Promise.resolve();
 const count=h.state.calls.length,ticks=h.state.ticks;
 h.state.timer();await Promise.resolve();await Promise.resolve();
 h.state.timer();await Promise.resolve();await Promise.resolve();
 assert.equal(h.state.calls.length,count);
 assert.equal(h.state.ticks,ticks);
});
test('running bulk operation retains existing 15s P8 admission and recovery',async()=>{
 const h=timerHarness();
 await Promise.resolve();await Promise.resolve();
 h.ctx.bulkWatchdogActive=true;
 const count=h.state.calls.filter(x=>x==='bulk-watchdog').length,ticks=h.state.ticks;
 h.state.timer();await Promise.resolve();await Promise.resolve();
 assert.equal(h.state.calls.filter(x=>x==='bulk-watchdog').length,count+1);
 assert.equal(h.state.ticks,ticks+1);
 assert.equal(h.state.calls.at(-1),'bulk-watchdog');
});
test('bulk run state writes, mutations and terminal state disable timer immediately',async()=>{
 const h=stateHarness();
 assert.equal(h.current(),false);
 await h.ctx.writeBulkRunState({status:'running'});
 assert.equal(h.current(),true);
 await h.ctx.mutateBulkRunState(x=>({...x,status:'needs-review'}));
 assert.equal(h.current(),false);
 await h.ctx.writeBulkRunState({status:'running'});
 assert.equal(h.current(),true);
 await h.ctx.writeBulkRunState({status:'completed'});
 assert.equal(h.current(),false);
});
test('startup recovered active worker state arms watchdog; idle and missing state disarm it',async()=>{
 const h=stateHarness();
 h.put({status:'running'});
 await h.ctx.bulkRunWatchdogTick();
 assert.equal(h.current(),true);
 h.put({status:'completed'});
 await h.ctx.bulkRunWatchdogTick();
 assert.equal(h.current(),false);
 h.put({status:'running'});
 await h.ctx.getBulkRunState();
 assert.equal(h.current(),true);
 h.put(null);
 assert.equal(await h.ctx.getBulkRunState(),null);
 assert.equal(h.current(),false);
});
test('no watchdog changes to mutation, P8 or updater admission sources',()=>{
 const block=timerBlock();
 for(const forbidden of [
  'chrome.storage.local.set(', 'chrome.runtime.reload(', 'chrome.alarms.',
  'chrome.tabs.create(', 'UPDATE_APPLY', 'DELETE_OWN_AD_BY_ID',
  'requestSubmit(', 'eligibleForLease=true'
 ])assert.ok(!block.includes(forbidden));
});
