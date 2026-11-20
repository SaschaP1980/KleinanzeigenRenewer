// KAR-171 R1: fail-closed MV3 idle/watchdog recovery scheduling regression.
// Tests the actual background entrypoint's extracted scheduler block, not a
// fabricated policy. Browser clocks / inactivity require separate native proof.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const bg=fs.readFileSync('src/background/background.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
const startMark='// KAR-171 R1: MV3 sleep-safe bulk watchdog alarm.';
const endMark='// Recover persisted workflows only when no platform safety stop is active.';
const start=bg.indexOf(startMark),end=bg.indexOf(endMark,start);
function block(){
 assert.ok(start>=0&&end>start,'watchdog block must be present in real service worker source');
 return bg.slice(start,end);
}
function harness({existing=null,error=false,throwCreate=false}={}){
 const observations={listener:null,gets:[],creates:[],ticks:[],admissions:[],intervals:[]};
 const scope={
  chrome:{
   runtime:{get lastError(){return error?{message:'fixture alarm store error'}:null}},
   alarms:{
    onAlarm:{addListener(cb){observations.listener=cb;}},
    get(name,cb){observations.gets.push(name);cb(existing);},
    create(name,details){observations.creates.push({name,details});if(throwCreate)throw Error('private alarm failure');}
   }
  },
  withAutonomousAdmission:(name,task)=>{
   observations.admissions.push(name);
   return Promise.resolve().then(task);
  },
  bulkRunWatchdogTick:()=>{
   observations.ticks.push('tick');return Promise.resolve(null);
  },
  setInterval:(_cb,delay)=>{observations.intervals.push(delay);throw Error('FORBIDDEN_KEEPALIVE_INTERVAL');},
  console:{error(){throw Error('PRIVATE_ERROR_LEAK');}}
 };
 vm.runInNewContext(block(),scope,{filename:'real-kar171-mv3-watchdog.js',timeout:1000});
 return observations;
}
test('idle watchdog no longer polls with 15-second setInterval; correct MV3 manifest permission',()=>{
 assert.doesNotMatch(bg,/setInterval\s*\([\s\S]{0,120}bulk-watchdog/,
   'continuous 15s Chrome-API poll prevents worker idle');
 assert.ok(manifest.permissions.includes('alarms'),'alarm permission required');
 assert.equal(manifest.manifest_version,3);
 const src=block();
 assert.match(src,/chrome\.alarms\.onAlarm\.addListener/);
 assert.match(src,/chrome\.alarms\.get/);
 assert.match(src,/chrome\.alarms\.create/);
 assert.doesNotMatch(src,/PUBLISH|DELETE_OWN_AD_BY_ID|chrome\.runtime\.reload/);
});
test('cold worker registers alarm before callback; absent alarm is created only once at 1-minute cadence',async()=>{
 const h=harness();
 assert.equal(typeof h.listener,'function');
 assert.equal(h.gets.length,1);assert.equal(h.creates.length,1);
 assert.equal(h.creates[0].name,h.gets[0]);
 assert.equal(h.creates[0].details.periodInMinutes,1);
 assert.equal(h.intervals.length,0);assert.equal(h.ticks.length,0);
 await h.listener({name:'unrelated-alarm'});
 assert.equal(h.admissions.length,0);assert.equal(h.ticks.length,0);
 await h.listener({name:h.gets[0]});
 await Promise.resolve();await Promise.resolve();
 assert.deepEqual(h.admissions,['bulk-watchdog']);
 assert.equal(h.ticks.length,1,'actual watchdog invoked only on matching Chrome alarm');
});
test('persisted alarm is not reset every time MV3 worker restarts',()=>{
 const h=harness({existing:{name:'kar-bulk-run-watchdog',periodInMinutes:1}});
 assert.equal(h.gets.length,1);
 assert.equal(h.creates.length,0,'no recurrence postponement on boot');
 assert.equal(h.intervals.length,0);
});
test('stale/wrong-frequency alarm is repaired; alarm store read error fails closed',()=>{
 const stale=harness({existing:{name:'kar-bulk-run-watchdog',periodInMinutes:0.5}});
 assert.equal(stale.creates.length,1);
 assert.equal(stale.creates[0].details.periodInMinutes,1);
 const bad=harness({error:true});assert.equal(bad.creates.length,0);
});
test('alarm registration does not mutate site, P8, accounts or grant updater lease',()=>{
 const src=block();
 for(const forbidden of [
   'DELETE_OWN_AD_BY_ID','requestSubmit(','chrome.runtime.reload(',
   'UPDATE_APPLY','eligibleForLease=true','chrome.storage.local.set(',
   'chrome.tabs.create(','chrome.runtime.connectNative('
 ])assert.ok(!src.includes(forbidden));
});
