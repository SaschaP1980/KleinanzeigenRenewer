'use strict';
// Synthetic storage and browser ports; actual historical in-process owners.
const assert=require('node:assert/strict');
require('../src/shared/runtime-deps.js');
const Lock=require('../src/background/services/insertion-lock-service.js');
const Renewal=require('../src/background/repositories/renewal-state-repository.js');
const Archive=require('../src/background/services/archive-insertion-service.js');
const Fill=require('../src/background/services/template-fill-service.js');
const keys={renewal:'renewalSessionsV1',archive:'archiveInsertionSessionsV1',fill:'templateFillSessions',mass:'mass'};
function fixture(){
 const rows={},writes=[],logs=[];let denied='';
 const local={async get(k){if(k===denied)throw Error('fixture owner read unavailable: '+k);return {[k]:structuredClone(rows[k])};},async set(p){writes.push(structuredClone(p));Object.assign(rows,structuredClone(p));}};
 function make(){
  const r=Renewal.create({storageLocal:local}),a=Archive.create({storageLocal:local}),f=Fill.create({storageLocal:local});
  return Lock.create({readRenewalSessions:r.readRenewalSessions,readArchiveInsertionSessions:a.readArchiveInsertionSessions,readFillSessions:f.readFillSessions,
    readMassRenewalBatch:async()=> (await local.get(keys.mass))[keys.mass]||null,
    renewalHoldsInsertionLock:Renewal.renewalHoldsInsertionLock,templateFillHoldsInsertionLock:f.templateFillHoldsInsertionLock,
    getInventory:async()=>null,logDiagnostic:async(...args)=>logs.push(args)});
 }
 function seed(kind){
  const createdAt=new Date().toISOString();for(const k of Object.values(keys))delete rows[k];
  if(kind==='renewal')rows[keys.renewal]={r:{renewalId:'r',sourceAdId:'123',status:'draft',stage:'phase1-started',createdAt}};
  if(kind==='archive')rows[keys.archive]={a:{archiveInsertionId:'a',status:'filling',stage:'publish-submitted',createdAt}};
  if(kind==='fill')rows[keys.fill]={f:{fillId:'f',templateOnly:true,status:'running',createdAt}};
  if(kind==='mass')rows[keys.mass]={batchId:'m',status:'running',items:[],createdAt};
 }
 return {make,seed,rows,writes,logs,deny:kind=>{denied=keys[kind]||'';}};
}
module.exports={fixture,keys};
