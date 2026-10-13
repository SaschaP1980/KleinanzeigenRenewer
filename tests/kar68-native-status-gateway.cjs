// KAR-68 independent strict read-only extension-side Native Messaging security checks.
'use strict';
const assert = require('node:assert/strict');
const gateway = require('../tools/native-update-status-gateway.js');
const sha = 'a'.repeat(64), commit = 'b'.repeat(40);
const goodId = '0123456789abcdef0123456789abcdef';
const okHealth = id => ({protocol:1,requestId:id,ok:true,operation:'health',hostVersion:'1',capabilities:['health','check']});
const okCheck = id => ({protocol:1,requestId:id,ok:true,operation:'check',installed:'1.23.28',approved:'1.23.29',sha256:sha,sourceCommit:commit});
let checks = 0;
function check(ok, why) { assert.ok(ok, why); checks++; console.log('PASS KAR-68 '+why); }
const create = (send, opts = {}) => gateway.create({
  transport: send, getPlatform:()=> 'win', newNonce:()=>goodId,
  schedule:setTimeout,cancel:clearTimeout,timeoutMs:3000,...opts
});
async function run() {
  let calls=0;
  const good=create((host,msg)=>{calls++;check(host==='de.kleinanzeigenrenewer.updater','fixed host');check(Object.keys(msg).sort().join() === 'operation,protocol,requestId','exact native request keys');return okHealth(msg.requestId)});
  const health=await good.request('health');
  check(health.ok===true&&health.operation==='health','valid health response');
  check(calls===1,'single one-shot transport request');
  check((await good.request('apply_update')).error==='OPERATION_DENIED','no update/apply operation');
  check((await good.request('rollback')).error==='OPERATION_DENIED','no rollback operation');
  check(calls===1,'unknown operations never reach transport');
  check((await create(()=>{throw Error('called')},{getPlatform:()=> 'linux'}).request('check')).error==='UNSUPPORTED_PLATFORM','Windows-only');
  check((await create(()=>{throw Error('called')},{newNonce:()=> 'invalid'}).request('health')).error==='NONCE_INVALID','invalid nonce rejected');
  check((await create(msg=>okHealth(msg.requestId),{newNonce:()=>goodId}).request('health')).ok,'first unique nonce accepted');
  const reuse=create((_,p)=>okHealth(p.requestId));
  await reuse.request('health');
  check((await reuse.request('health')).error==='NONCE_REUSED','replayed local nonce denied');
  check((await create(()=>Promise.reject(new Error('No Native Messaging host found'))).request('health')).error==='HOST_UNAVAILABLE','missing host maps to bounded error');
  check((await create(()=>okHealth('f'.repeat(32))).request('health')).error==='INVALID_RESPONSE','stale cross-request reply denied');
  check((await create((_,p)=>({...okHealth(p.requestId),command:'powershell'})).request('health')).error==='INVALID_RESPONSE','unknown native fields denied');
  check((await create((_,p)=>({...okHealth(p.requestId),capabilities:['health','health']})).request('health')).error==='INVALID_RESPONSE','duplicate native capabilities denied');
  check((await create((_,p)=>({...okHealth(p.requestId),protocol:2})).request('health')).error==='INVALID_RESPONSE','protocol mismatch denied');
  check((await create((_,p)=>({protocol:1,requestId:p.requestId,ok:false,error:'CHECK_FAILED'})).request('check')).error==='CHECK_FAILED','allowlisted native failure preserved');
  check((await create((_,p)=>({protocol:1,requestId:p.requestId,ok:false,error:'RUN_SHELL'})).request('check')).error==='INVALID_RESPONSE','unrecognized host error denied');
  check((await create((_,p)=>okCheck(p.requestId)).request('check')).approved==='1.23.29','validated approved check');
  check((await create((_,p)=>({...okCheck(p.requestId),sha256:'0'})).request('check')).error==='INVALID_RESPONSE','invalid package digest denied');
  check((await create((_,p)=>({...okCheck(p.requestId),sourceCommit:'x'})).request('check')).error==='INVALID_RESPONSE','invalid git pin denied');
  check((await create((_,p)=>({...okCheck(p.requestId),approved:'999.01.2'})).request('check')).error==='INVALID_RESPONSE','noncanonical version denied');
  check((await create((_,p)=>({...okCheck(p.requestId),path:'C:\\Temp\\attack'})).request('check')).error==='INVALID_RESPONSE','injected filesystem path denied');
  check((await create((_,p)=>({...okCheck(p.requestId),installed:'not installed'})).request('check')).installed==='not installed','not installed state accepted');
  check((await create(()=>null).request('health')).error==='INVALID_RESPONSE','null response denied');
  check((await create(()=>Array(8193).fill('x').join('')).request('health')).error==='INVALID_RESPONSE','malformed/overlong payload denied');
  const blocked=create(()=>new Promise(()=>{}),{schedule:fn=>{fn();return 1},cancel:()=>{}});
  check((await blocked.request('health')).error==='TIMEOUT','timeout fail closed');
  let finish;
  const waiting=create(()=>new Promise(resolve=>{finish=resolve}));
  const first=waiting.request('health');
  await Promise.resolve();await Promise.resolve();await Promise.resolve();
  check((await waiting.request('check')).error==='BUSY','parallel request denied');
  finish(okHealth(goodId));
  check((await first).ok===true,'in-flight original request validated');
  check(checks>=28,'minimum gateway policy assertions');
  console.log('PASS KAR-68 Native update gateway: '+checks+' assertions');
}
run().catch(e=>{console.error(e);process.exitCode=1});
