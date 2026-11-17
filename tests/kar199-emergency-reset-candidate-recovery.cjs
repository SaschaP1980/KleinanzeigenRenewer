// KAR-199 native blocker: an already cancelled emergency-reset renewal
// must become TWO independent local inventory records, never a remote DELETE.
// Real fake-indexeddb transactions, no real Kleinanzeigen account.
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
async function fixture({mode='fast',existingTarget=false,missingImage=false,sess=session()}={}) {
  const name='kar199-recover-'+process.pid+'-'+(++nonce);
  const db=await database(name);
  const seedTx=db.transaction(['inventories','images'],'readwrite');
  seedTx.objectStore('inventories').put({...original,images:original.images.map(x=>({...x}))});
  seedTx.objectStore('inventories').put(candidate(mode));
  if(existingTarget) seedTx.objectStore('inventories').put({
    inventoryId:'200',adId:'200',profileId:'profile-1',recordKind:'inventory',
    title:'existing independent listing',images:[],schemaVersion:2
  });
  for(let i=0;i<2;i++)if(!missingImage || i===0)seedTx.objectStore('images').put(row('100',i));
  if(mode==='safe')for(let i=0;i<2;i++)seedTx.objectStore('images').put(row('renewal:r199',i));
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
test('KAR-199: cancelled FAST renewal yields TWO standalone listings with cloned images',async()=>{
  const f=await fixture();
  const sourceBefore=await f.get('inventories','100');
  const srcImageBefore=await f.get('images','100:0');
  const result=await f.instance.recoverEmergencyResetCandidateAtomic(f.sess);
  assert.equal(result?.recovered,true);
  const source=await f.get('inventories','100'),target=await f.get('inventories','200');
  assert.deepEqual(source,sourceBefore,'original never moved to trash, overwritten, or changed');
  assert.equal(target.adId,'200');
  assert.equal(target.recordKind,'inventory');
  assert.equal(target.inventoryId,'200');
  assert.equal(target.renewal,undefined,'old workflow UI marker completely removed');
  assert.equal(target.recovery?.remoteVerification,'unverified',
    'local adoption must not claim remote deletion or current online presence');
  assert.equal(await f.get('inventories','renewal:r199'),undefined);
  assert.deepEqual((await f.get('images','100:0')).blob,srcImageBefore.blob);
  assert.deepEqual((await f.get('images','200:0')).blob,srcImageBefore.blob);
  assert.equal((await f.get('images','200:1')).inventoryId,'200');
  assert.deepEqual(target.images.map(v=>v.imageKey),['200:0','200:1']);
  assert.equal(f.remoteCommands.length,0);
});
test('KAR-199: repeat recovery is strictly idempotent and leaves 2 records',async()=>{
  const f=await fixture();
  await f.instance.recoverEmergencyResetCandidateAtomic(f.sess);
  const result=await f.instance.recoverEmergencyResetCandidateAtomic(f.sess);
  assert.equal(result?.alreadyRecovered,true);
  assert.equal((await f.get('inventories','100')).recordKind,'inventory');
  assert.equal((await f.get('inventories','200')).recordKind,'inventory');
  assert.equal(f.remoteCommands.length,0);
});
test('KAR-199: destination-ID collision aborts without any image or source mutation',async()=>{
  const f=await fixture({existingTarget:true});
  const originalTarget=await f.get('inventories','200');
  await assert.rejects(f.instance.recoverEmergencyResetCandidateAtomic(f.sess),/exist|collision|bereits|ID/i);
  assert.deepEqual(await f.get('inventories','200'),originalTarget);
  assert.ok(await f.get('inventories','renewal:r199'));
  assert.ok(await f.get('images','100:0'));
  assert.equal(await f.get('images','200:0'),undefined);
  assert.equal(f.remoteCommands.length,0);
});
test('KAR-199: unfinished/unknown publication is not silently converted',async()=>{
  const f=await fixture({sess:session({newIdConfirmedAt:null,comparison:null})});
  await assert.rejects(f.instance.recoverEmergencyResetCandidateAtomic(f.sess));
  assert.equal(await f.get('inventories','200'),undefined);
  assert.ok(await f.get('inventories','renewal:r199'));
  assert.equal(f.remoteCommands.length,0);
});
test('KAR-199: missing source JPEG rolls back the entire candidate transaction',async()=>{
  const f=await fixture({missingImage:true});
  const before=await f.get('inventories','renewal:r199');
  await assert.rejects(f.instance.recoverEmergencyResetCandidateAtomic(f.sess),/Bild|image|JPEG|missing|fehlt/i);
  assert.deepEqual(await f.get('inventories','renewal:r199'),before);
  assert.equal(await f.get('inventories','200'),undefined);
  assert.ok(await f.get('images','100:0'));
  assert.equal(f.remoteCommands.length,0);
});
test('KAR-199: SAFE-mode candidate blobs cloned without altering original blobs',async()=>{
  const f=await fixture({mode:'safe',sess:session({renewalMode:'safe',comparison:{ownAdsPresence:true,status:'verified'}})});
  const oldBlob=await f.get('images','100:0');
  const candidateBlob=await f.get('images','renewal:r199:0');
  await f.instance.recoverEmergencyResetCandidateAtomic(f.sess);
  assert.deepEqual((await f.get('images','100:0')).blob,oldBlob.blob);
  assert.deepEqual((await f.get('images','200:0')).blob,candidateBlob.blob);
  assert.ok(await f.get('inventories','100'));
  assert.equal(await f.get('inventories','renewal:r199'),undefined);
  assert.equal(f.remoteCommands.length,0);
});
test('KAR-199: startup and reset handlers both call same safe local recovery service',()=>{
  const reset=fs.readFileSync('src/background/controllers/workflow-emergency-reset-controller.js','utf8');
  const renew=fs.readFileSync('src/background/controllers/renewal-workflow-controller.js','utf8');
  const bootstrap=fs.readFileSync('src/background/background.js','utf8');
  assert.match(reset,/recoverEmergencyResetCandidateAtomic\(/);
  assert.match(renew,/recoverEmergencyResetCandidateAtomic\(/);
  assert.match(bootstrap,/recoverEmergencyResetCandidateAtomic/);
});
