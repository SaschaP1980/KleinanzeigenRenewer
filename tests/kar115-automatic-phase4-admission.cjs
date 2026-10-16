// KAR-115 RED-first: autonomous Phase 4 must be admitted before attempting
// remote replacement, and denied admission must NOT fabricate remote failure.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const controllerText=fs.readFileSync('src/background/controllers/renewal-workflow-controller.js','utf8');
const bg=fs.readFileSync('src/background/background.js','utf8');
let checks=0;
function ok(cond,msg){assert.ok(cond,msg);checks++;console.log('PASS KAR115 '+msg);}
function harness(admit) {
  let API;
  const context=vm.createContext({
    console, Date, Promise, Set, Map, structuredClone,
    KRDeps: {
      require: () => ({create: () => ({runFastRenewalVerification: async()=>{},runRenewalReinventory:async()=>{}})}),
      register: (_name,x)=>{API=x;}
    }
  });
  vm.runInContext(controllerText,context,{filename:'renewal-workflow-controller.js'});
  const block=controllerText.match(/const required = \{([\s\S]*?)\n      \};/);
  assert.ok(block,'required deps found');
  const deps=Object.fromEntries(block[1].split(',').map(s=>s.trim()).filter(Boolean).map(name=>[name,async()=>{}]));
  let writes=0,remote=0,reads=0,feedback=0;
  const stored={rid:{renewalId:'rid',status:'verified',stage:'replacement-ready',autoReplacementAllowed:true,newAdId:'12345'}};
  deps.readRenewalSessions=async()=>{reads++;return structuredClone(stored)};
  deps.writeRenewalSessions=async()=>{writes++};
  deps.finishRenewalReplacement=async (...args)=>{remote++;return args};
  deps.logDiagnostic=async()=>{};
  deps.sendTabRequestWithBootstrap=async()=>{feedback++};
  deps.sessionCorrelationContext=(s,x)=>({...x,renewalId:s?.renewalId});
  deps.withAutonomousAdmission=admit;
  return {ctrl:API.create(deps),data:()=>({writes,remote,reads,feedback,stored})};
}
async function ticks(){for(let i=0;i<15;i++)await Promise.resolve();}
async function main(){
  ok(/withAutonomousAdmission,/.test(controllerText.slice(controllerText.indexOf('const required = {'),controllerText.indexOf('for (const [name, value]'))),
    'Phase 4 controller requires shared autonomous admission dependency');
  ok(bg.includes("'renewal-auto-phase4': ['renewal', 'insertionLock']"),
    'Phase 4 mapped to renewal and insertion lock');
  ok(controllerText.includes("withAutonomousAdmission('renewal-auto-phase4', async () =>"),
    'Phase 4 task begins inside central admission, not a bare detached async IIFE');
  const denied=harness(async()=>{const e=new Error('KR_UPDATE_FENCE_HELD');e.code='KR_UPDATE_FENCE_HELD';throw e;});
  ok(denied.ctrl.scheduleAutomaticRenewalReplacement('rid')===true,'denied attempt starts pending admission');
  await ticks();
  ok(denied.data().remote===0,'blocked admission never starts remote replacement');
  ok(denied.data().writes===0,'blocked admission never persists fabricated replacement failure');
  ok(denied.ctrl.scheduleAutomaticRenewalReplacement('rid')===true,'denial releases local in-flight guard for later recovery');
  await ticks();
  ok(denied.data().writes===0,'repeated refusal still does not alter remote outcome');
  let resolve;
  let admissions=0;
  const permitted=harness(async(kind,task)=>{admissions++;assert.equal(kind,'renewal-auto-phase4');return new Promise(done=>{resolve=async()=>done(await task());});});
  ok(permitted.ctrl.scheduleAutomaticRenewalReplacement('rid')===true,'permitted Phase 4 is scheduled');
  ok(permitted.ctrl.scheduleAutomaticRenewalReplacement('rid')===false,'duplicate in-process schedule is rejected');
  ok(permitted.data().remote===0,'remote replacement waits for admission decision');
  await resolve();await ticks();
  ok(admissions===1&&permitted.data().remote===1,'exactly one admitted remote replacement runs');
  ok(permitted.ctrl.scheduleAutomaticRenewalReplacement('rid')===true,'completed operation releases in-flight guard');
  await resolve();await ticks();
  ok(permitted.data().remote===2,'subsequent recovery is evaluated as a separate admitted attempt');
  ok(!bg.includes('getOwnerSnapshot: () => requirePersistedOwnerObserver()'),'observer still cannot authorize positive idle');
  console.log('PASS KAR115 total '+checks);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
