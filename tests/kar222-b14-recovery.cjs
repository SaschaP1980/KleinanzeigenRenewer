// KAR-222 B14: expanded current-generation local recovery and real controller wiring.
// Fixture adapted from immutable KAR-199 witness; no real account/network.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {indexedDB,IDBKeyRange}=require('fake-indexeddb');
const Remote=require('../src/background/services/remote-delete-replacement-service.js');
const fs=require('node:fs');

let nonce=0;
const reqPromise=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
const transactionPromise=tx=>new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('transaction aborted'));tx.onerror=()=>reject(tx.error||new Error('transaction failed'));});
async function database(name) {
  const req=indexedDB.open(name,1);
  req.onupgradeneeded=()=> {
    const db=req.result;
    db.createObjectStore('inventories',{keyPath:'inventoryId'});
    const images=db.createObjectStore('images',{keyPath:'imageKey'});
    images.createIndex('inventoryId','inventoryId',{unique:false});
  };
  return reqPromise(req);
}
function session(overrides={}) {
  return {
    renewalId:'r199',sourceInventoryId:'100',skeletonInventoryId:'renewal:r199',
    sourceAdId:'100',newAdId:'200',profileId:'profile-1',
    status:'cancelled',stage:'emergency-reset-unverified',
    emergencyResetAt:'2026-11-17T06:11:53Z',newIdConfirmedAt:'2026-11-17T05:07:08Z',
    remoteVerificationRequired:true,remoteVerification:'unverified',
    comparison:{ownAdsPresence:true,status:'fast-mode-presence-verified'},renewalMode:'fast',
    ...overrides
  };
}
const imageMeta=(owner,index)=>({
  position:index,imageKey:owner+':'+index,locallyStored:true,
  mimeType:'image/jpeg',size:3,uploadReady:true
});
const row=(owner,index)=>({
  imageKey:owner+':'+index,inventoryId:owner,position:index,
  mimeType:'image/jpeg',blob:new Uint8Array([index+1,index+2,index+3]).buffer
});
const original={
  inventoryId:'100',adId:'100',profileId:'profile-1',recordKind:'inventory',
  title:'fixture listing',images:[imageMeta('100',0),imageMeta('100',1)],
  imageSummary:{discovered:2,locallyStored:2,uploadReadyJpeg:2},
  templateSchema:{fingerprint:'unchanged-source'}
};
function candidate(mode='fast') {
  const imageOwner=mode==='fast'?'100':'renewal:r199';
  return {
    inventoryId:'renewal:r199',adId:'200',profileId:'profile-1',
    recordKind:'renewal-candidate',title:'fixture listing copied',
    images:[imageMeta(imageOwner,0),imageMeta(imageOwner,1)],
    imageSummary:{discovered:2,locallyStored:2,uploadReadyJpeg:2},
    renewal:{renewalId:'r199',sourceAdId:'100',newAdId:'200',
      status:'verified',stage:'source-delete-started',autoReplacementAllowed:true}
  };
}
async function fixture({mode='fast',existingTarget=false,missingImage=false,empty=false,explicitEmpty=true,foreignImage=false,candidatePatch={},sess=session()}={}) {
  const name='kar199-recover-'+process.pid+'-'+(++nonce);
  const db=await database(name);
  const seedTx=db.transaction(['inventories','images'],'readwrite');
  const emptyPatch=empty?{images:[],imageSummary:{discovered:0,locallyStored:0,uploadReadyJpeg:0},extraction:{imageSetExplicitlyEmpty:explicitEmpty}}:{};
  seedTx.objectStore('inventories').put({...original,images:original.images.map(x=>({...x})),...emptyPatch});
  seedTx.objectStore('inventories').put({...candidate(mode),...emptyPatch,...candidatePatch});
  if(existingTarget) seedTx.objectStore('inventories').put({
    inventoryId:'200',adId:'200',profileId:'profile-1',recordKind:'inventory',
    title:'existing independent listing',images:[],schemaVersion:2
  });
  for(let i=0;!empty&&i<2;i++)if(!missingImage || i===0)seedTx.objectStore('images').put(row('100',i));
  if(!empty&&mode==='safe')for(let i=0;i<2;i++)seedTx.objectStore('images').put(row('renewal:r199',i));
  if(foreignImage)seedTx.objectStore('images').put({...row('foreign',0),imageKey:'200:0'});
  await transactionPromise(seedTx);db.close();
  const changes=[],notices=[],diagnostics=[],remoteCommands=[];
  const instance=Remote.create({
    openDatabase:()=>database(name),
    IDBKeyRangeCtor:IDBKeyRange,
    IMAGE_STORE:'images',INVENTORY_STORE:'inventories',
    isTrashRecord:record=>record?.recordKind==='trash',
    normalizeRenewalMode:x=>x,RENEWAL_MODE_FAST:'fast',
    logDiagnostic:async (...v)=>{diagnostics.push(v);},
    setAppNotice:async v=>{notices.push(v);},
    broadcastInventoryChanged:(...v)=>{changes.push(v);},
    sendTabRequestWithBootstrap:async (...v)=>{remoteCommands.push(v);throw Error('No remote request allowed');}
  });
  async function get(store,key) {
    const db=await database(name);
    try {return await reqPromise(db.transaction(store).objectStore(store).get(key));}
    finally {db.close();}
  }
  return {instance,sess, get, changes,notices,diagnostics,remoteCommands};
}

const Repo=require('../src/background/repositories/renewal-state-repository.js');
const Reset=require('../src/background/controllers/workflow-emergency-reset-controller.js');
const vm=require('node:vm');
test('B14 Safe uses current semantic match and separate positive My Ads presence',async()=>{
 const f=await fixture({mode:'safe',sess:session({renewalMode:'safe',comparison:{status:'match',ownAdsPresence:null},lastOwnAdsPresence:true})});
 const before=await f.get('inventories','100');
 assert.equal((await f.instance.recoverEmergencyResetCandidateAtomic(f.sess)).recovered,true);
 assert.deepEqual(await f.get('inventories','100'),before);
 assert.equal((await f.get('inventories','200')).recovery.remoteVerification,'unverified');
 assert.equal(await f.get('images','renewal:r199:0'),undefined);
 assert.equal(f.remoteCommands.length,0);
});
test('B14 explicit zero-image evidence is preserved; unknown empty image set is rejected',async()=>{
 const f=await fixture({empty:true});
 assert.equal((await f.instance.recoverEmergencyResetCandidateAtomic(f.sess)).imageCount,0);
 assert.deepEqual((await f.get('inventories','200')).images,[]);
 const g=await fixture({empty:true,explicitEmpty:false});
 await assert.rejects(g.instance.recoverEmergencyResetCandidateAtomic(g.sess),/Bild|image/i);
 assert.ok(await g.get('inventories','renewal:r199'));
 assert.equal(await g.get('inventories','200'),undefined);
});
test('B14 foreign primary image key must never be overwritten, transaction rolls back',async()=>{
 const f=await fixture({foreignImage:true});
 const source=await f.get('inventories','100'),foreign=await f.get('images','200:0');
 await assert.rejects(f.instance.recoverEmergencyResetCandidateAtomic(f.sess));
 assert.deepEqual(await f.get('inventories','100'),source);
 assert.deepEqual(await f.get('images','200:0'),foreign);
 assert.ok(await f.get('inventories','renewal:r199'));
 assert.equal(await f.get('inventories','200'),undefined);
});
test('B14 unverified Safe presence, wrong profile/ID and unknown candidate leave all local records unchanged',async()=>{
 for(const opts of [
  {mode:'safe',sess:session({renewalMode:'safe',comparison:{status:'match',ownAdsPresence:null},lastOwnAdsPresence:false})},
  {candidatePatch:{profileId:'wrong'}},{candidatePatch:{adId:'201'}},{candidatePatch:{renewal:{renewalId:'r199',sourceAdId:'100',newAdId:'200',status:'verifying'}}}
 ]){
  const f=await fixture(opts),before=await f.get('inventories','renewal:r199');
  await assert.rejects(f.instance.recoverEmergencyResetCandidateAtomic(f.sess));
  assert.deepEqual(await f.get('inventories','renewal:r199'),before);
  assert.equal(await f.get('inventories','200'),undefined);
  assert.equal(f.remoteCommands.length,0);
 }
});
function resetHarness(f,{writeFails=false}={}){
 const row={...f.sess,status:'verified',stage:'replacement-ready',emergencyResetAt:null,createdAt:new Date().toISOString()};
 const data={renewalSessionsV1:{r199:row}};let generation=0,adoptions=0;
 const storage={async get(k){return {[k]:structuredClone(data[k])};},async set(p){if(writeFails)throw Error('fixture write failed');Object.assign(data,structuredClone(p));}};
 const repo=Repo.create({storageLocal:storage});
 const noop=async()=>{};
 const reset=Reset.create({
  bumpEmergencyResetGeneration:()=>++generation,resetMassRenewalWorkflowRuntimeState:()=>{},
  automaticReplacementInFlight:new Set(),renewalPhase1RetryInFlight:new Set(),renewalPublishDetectionInFlight:new Set(),trashTemplatePublishDetectionInFlight:new Set(),
  mutateBulkRunState:async fn=>fn(null),closeRegistryTabs:noop,closeRegistryTab:noop,releaseBulkSourceOwnership:noop,
  readFillSessions:async()=>({}),writeFillSessions:noop,requireTemplateFillService:()=>({isEmergencyResettableSession:()=>false}),
  RenewalStateRepository:Repo,readRenewalSessions:repo.readRenewalSessions,writeRenewalSessions:repo.writeRenewalSessions,
  renewalHoldsInsertionLock:Repo.renewalHoldsInsertionLock,isSafeLegacyManualEmergencyReset:Repo.isSafeLegacyManualEmergencyReset,isSafePrePublishPaidInsertion:Repo.isSafePrePublishPaidInsertion,emergencyResetRenewalState:Repo.emergencyResetRenewalState,
  readArchiveInsertionSessions:async()=>({}),writeArchiveInsertionSessions:noop,readMassRenewalBatch:async()=>null,writeMassRenewalBatch:noop,touchMassRenewalItemProgress:()=>{},
  getTabRegistrySnapshot:async()=>[],TAB_STATES:{GONE:'gone'},logDiagnostic:noop,sessionCorrelationContext:()=>({}),broadcastInventoryChanged:()=>{},
  recoverEmergencyResetCandidateAtomic:async s=>{adoptions++;assert.equal((await repo.readRenewalSessions()).r199.status,'cancelled');return f.instance.recoverEmergencyResetCandidateAtomic(s);}
 });
 return {reset,repo,adoptions:()=>adoptions};
}
test('B14 real reset controller adopts only after persisted cancellation, keeps unverified tombstone; repeat is harmless',async()=>{
 const f=await fixture(),h=resetHarness(f);
 const result=await h.reset.resetActiveWorkflows();
 assert.equal(result.remoteVerificationAttempted,false);
 assert.equal(h.adoptions(),1);
 assert.equal((await f.get('inventories','200')).recordKind,'inventory');
 const row=(await h.repo.readRenewalSessions()).r199;
 assert.equal(row.status,'cancelled');assert.equal(row.remoteVerificationRequired,true);
 await h.reset.resetActiveWorkflows();
 assert.deepEqual((await h.repo.readRenewalSessions()).r199,row);
 assert.equal(f.remoteCommands.length,0);
});
test('B14 reset persistence failure never adopts or changes source/candidate',async()=>{
 const f=await fixture(),h=resetHarness(f,{writeFails:true});
 await h.reset.resetActiveWorkflows().catch(()=>{});
 assert.equal(h.adoptions(),0);
 assert.ok(await f.get('inventories','renewal:r199'));
 assert.equal(await f.get('inventories','200'),undefined);
});
function startupHarness(f){
 const ctx=vm.createContext({console,Date,Promise,Set,Map,structuredClone,URL,setTimeout,clearTimeout});
 for(const path of ['src/shared/runtime-deps.js','src/background/services/renewal-verification-flow.js','src/background/services/renewal-reinventory-flow.js','src/background/services/paid-checkout-recovery-service.js','src/background/controllers/renewal-workflow-controller.js'])vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
 const API=ctx.KRDeps.require('KRRenewalWorkflowController');
 const source=fs.readFileSync('src/background/controllers/renewal-workflow-controller.js','utf8');
 const block=source.match(/const required = \{([\s\S]*?)\n      \};/);
 assert.ok(block);
 const deps=Object.fromEntries(block[1].split(',').map(s=>s.trim()).filter(Boolean).map(n=>[n,async()=>{}]));
 let adoptions=0;const remote=[],logs=[];
 Object.assign(deps,{readRenewalSessions:async()=>({r199:structuredClone(f.sess)}),readFillSessions:async()=>({}),
 readDiagnostics:async()=>[],sessionCorrelationContext:()=>({}),isSafeLegacyManualEmergencyReset:()=>false,isCheckoutAbortedRecoveryCandidate:()=>false,
 logDiagnostic:async(...a)=>logs.push(a),recoverEmergencyResetCandidateAtomic:async row=>{adoptions++;return f.instance.recoverEmergencyResetCandidateAtomic(row);},
 finishRenewalReplacement:async()=>remote.push('finish'),detectPublishedAdForFill:async()=>remote.push('detect'),createManagedWorkerTab:async()=>remote.push('worker'),
 RENEWAL_MODE_FAST:'fast',RENEWAL_MODE_SAFE:'safe',RENEWAL_PHASE_ATTEMPTS_DEFAULT:3,MY_ADS_PROJECTS_URL:'https://www.kleinanzeigen.de/m-meine-anzeigen.html',BULK_RETRY_POLL_MS:1,BULK_RETRY_TIMEOUT_MS:10,TAB_LOAD_TIMEOUT_PHASE4_MS:100,TAB_LOAD_TIMEOUT_RENEWAL_MS:100});
 return {api:API.create(deps),remote,logs,adoptions:()=>adoptions};
}
test('B14 real startup resumes cancelled verified candidate locally, before mass terminal skip, no remote work',async()=>{
 const f=await fixture({sess:session({massBatchId:'batch',massBatchTerminal:true})}),h=startupHarness(f);
 await h.api.resumePendingRenewals();
 assert.equal(h.adoptions(),1);
 assert.equal((await f.get('inventories','200')).recordKind,'inventory');
 assert.deepEqual(h.remote,[]);assert.equal(f.remoteCommands.length,0);
});
test('B14 startup collision remains unresolved and never starts remote workflow',async()=>{
 const f=await fixture({existingTarget:true}),h=startupHarness(f);
 await h.api.resumePendingRenewals();
 assert.equal(h.adoptions(),1);
 assert.ok(await f.get('inventories','renewal:r199'));
 assert.equal((await f.get('inventories','200')).title,'existing independent listing');
 assert.deepEqual(h.remote,[]);
});
