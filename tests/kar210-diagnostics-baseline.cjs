'use strict';
// Historical diagnostic UI and router; no occupancy or updater admission.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Router=require('../src/background/background-message-router.js');
const Controls=require('../src/app/diagnostics-controls-controller.js');
const Zip=require('../src/app/diagnostic-zip.js');
function element(){const listeners={};return {textContent:'',disabled:false,addEventListener:(n,fn)=>listeners[n]=fn,fire:n=>listeners[n]?.(),setAttribute(){},removeAttribute(){}};}
function elements(){return Object.fromEntries(['zipButton','resetButton','emergencyButton','status','resetBlockReason'].map(n=>[n,element()]));}
test('historical router requires message contract and platform safety before diagnostic or destructive handler',async()=>{
 const types=['GET_DIAGNOSTIC_EXPORT','GET_DIAGNOSTICS','RESET_DIAGNOSTICS','LOG_DIAGNOSTIC_EVENT','DELETE_INVENTORY'];
 let contract=true,allowed=true;const seen=[],handled=[];
 const router=Router.create({MessageContractRegistry:{route:()=>({action:contract?'accept':'reject'}),errorFor:()=>Error('fixture contract rejected')},assertPlatformAccessAllowedForRequest:async m=>{seen.push(m.type);if(!allowed)throw Error('fixture denied');},handlers:Object.fromEntries(types.map(type=>[type,async()=>{handled.push(type);return {type};}]))});
 contract=false;for(const type of types)await assert.rejects(router.dispatch({type},{}),/contract rejected/);assert.deepEqual(seen,[]);assert.deepEqual(handled,[]);
 contract=true;allowed=false;for(const type of types)await assert.rejects(router.dispatch({type},{}),/fixture denied/);assert.deepEqual(seen,types);assert.deepEqual(handled,[]);
 allowed=true;for(const type of types)assert.equal((await router.dispatch({type},{})).type,type);assert.deepEqual(handled,types);
});
test('actual historical reset respects workflow blocker and executes once for success or rejected request',async()=>{
 for(const kind of ['blocked','success','rejected']){
  const ui=elements(),requests=[],events=[];
  const controller=Controls.create({elements:ui,insertionLockActive:()=>kind==='blocked',runtimeMessage:async m=>{requests.push(m.type);if(kind==='rejected')throw Error('fixture reset failed');return {reset:true,diagnosticBoundaryId:'fixture-boundary'};},logEvent:async(...args)=>events.push(args)});
  await controller.resetDiagnostics();
  if(kind==='blocked'){assert.equal(ui.resetButton.disabled,true);assert.deepEqual(requests,[]);assert.match(ui.resetBlockReason.textContent,/blockiert/);}
  else{assert.deepEqual(requests,['RESET_DIAGNOSTICS']);assert.equal(ui.resetButton.disabled,false);assert.equal(ui.zipButton.disabled,false);assert.match(ui.status.textContent,kind==='success'?/^Diagnose zurückgesetzt/:/fixture reset failed/);}
  assert.equal(events.filter(x=>x[0]==='USER_DIAGNOSTIC_RESET_SUCCEEDED').length,kind==='success'?1:0);
 }
});
test('actual historical diagnostic ZIP action delivers valid bytes once, or restores controls on error',async()=>{
 const source=fs.readFileSync('src/app/diagnostics-controls-controller.js','utf8');
 for(const kind of ['success','rejected','empty']){
  const ui=elements(),calls=[],logs=[],downloads=[],urls=[];let done;const finished=new Promise(r=>done=r);
  const sandbox={module:{exports:{}},URL:{createObjectURL(blob){urls.push(blob);return 'blob:fixture';},revokeObjectURL(){}},setTimeout:()=>0};vm.runInNewContext(source,sandbox);
  const doc={createElement:()=>({click(){downloads.push(this.download);},remove(){}}),body:{append(){}}};
  sandbox.module.exports.create({elements:ui,document:doc,DiagnosticZip:Zip,runtimeMessage:async m=>{calls.push(m.type);if(kind==='rejected')throw Error('fixture denied');return {filename:'fixture.zip',files:kind==='empty'?[]:[{name:'summary.txt',text:'synthetic'}]};},logEvent:async(...args)=>{logs.push(args);if(/SUCCEEDED|FAILED/.test(args[0]))done();}});
  ui.zipButton.fire('click');await finished;await Promise.resolve();
  assert.deepEqual(calls,['GET_DIAGNOSTIC_EXPORT']);assert.equal(ui.zipButton.disabled,false);
  if(kind==='success'){assert.deepEqual(downloads,['fixture.zip']);assert.equal(urls.length,1);const b=Buffer.from(await urls[0].arrayBuffer());assert.equal(b.readUInt32LE(0),0x04034b50);assert.ok(b.includes(Buffer.from([0x50,0x4b,0x05,0x06])));assert.match(ui.status.textContent,/1 Diagnosedateien als ZIP erstellt/);}
  else{assert.deepEqual(downloads,[]);assert.deepEqual(urls,[]);assert.match(ui.status.textContent,/konnten nicht erstellt werden/);}
  assert.equal(logs.filter(x=>x[0]==='USER_DIAGNOSTIC_ZIP_SUCCEEDED').length,kind==='success'?1:0);
 }
});
