'use strict';
// KAR-213 S03: synthetic cross-generation evidence only, no Chrome account or remote I/O.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { IDBFactory, IDBKeyRange } = require('fake-indexeddb');
const ProfileBackup = require('../src/app/profile-backup.js');
const InventoryImport = require('../src/app/inventory-import.js');
const DiagnosticZip = require('../src/app/diagnostic-zip.js');
const BackupStorage = require('../src/app/profile-backup-storage-service.js');
const RenewalRepository = require('../src/background/repositories/renewal-state-repository.js');
if (!globalThis.crypto?.subtle) globalThis.crypto = require('node:crypto').webcrypto;

const profile = { profileId: 'synthetic-profile', displayName: 'Synthetic', normalizedName: 'synthetic', donorExtension: { futureFlag: true } };
const at = '2026-10-01T00:00:00.000Z';
const active = { inventoryId: '100', adId: '100', schemaVersion: 2, capturedAt: at, profileId: profile.profileId, profileName: profile.displayName, title: 'Synthetic active', images: [{imageKey:'100:0'}], dynamicAttributes: [{key:'material', technicalValue:'', displayValue:'Bitte wählen', status:'empty'}], futureOpaque: {a:1} };
const trash = { inventoryId:'200', adId:'200', schemaVersion:2, profileId:profile.profileId, profileName:profile.displayName, recordKind:'trash', capturedAt:at, images:[{imageKey:'200:0'}], trash:{trashedAt:at, expiresAt:null, retentionIndefinite:true, retentionRevision:'synthetic-revision'}, futureOpaque:{b:2} };
const data = [Uint8Array.of(255,216,1,2,255,217), Uint8Array.of(255,216,3,4,255,217)];
const imageRows = [active,trash].map((r,i)=>({imageKey:r.images[0].imageKey,inventoryId:r.inventoryId,mimeType:'image/jpeg',blob:new Blob([data[i]],{type:'image/jpeg'}),futureImageField:i}));
const roundtrip = async (version, rows) => {
  const a=await ProfileBackup.createProfileArchive({profile,activeInventory:rows.filter(r=>r.recordKind!=='trash'),trashEntries:rows.filter(r=>r.recordKind==='trash')},{extensionVersion:version,loadImage:async key=>imageRows.find(x=>x.imageKey===key),createZip:DiagnosticZip.createZip});
  return ProfileBackup.parseProfileArchive(a.blob,{readZip:InventoryImport.readZip});
};
function loadRegistry(files,extra={}) {
  const ctx=vm.createContext({console,Date,Promise,Set,Map,structuredClone,URL,setTimeout,clearTimeout,...extra});
  for(const path of ['src/shared/runtime-deps.js',...files]) vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
  return ctx.KRDeps;
}
test('W2 real ZIP codec and IndexedDB restore: mixed records, opaque metadata, image bytes, profile links and repeat restoration',async()=>{
  const idb=new IDBFactory();
  const api=loadRegistry(['src/background/repositories/inventory-repository.js']).require('KRInventoryRepository').create({indexedDB:idb,IDBKeyRange});
  const db=await api.openDatabase(); db.close();
  const backup=BackupStorage.create({indexedDB:idb,IDBKeyRange});
  const old={...trash,trash:{trashedAt:at,expiresAt:'2026-10-31T00:00:00.000Z'}};
  for(const [version,rows] of [['1.23.48',[active,old]],['1.25.36',[active,{...trash,trash:{trashedAt:at,expiresAt:null}}]],['2.0.1.0',[active,trash]]]){
    const parsed=await roundtrip(version,rows);
    assert.deepEqual(parsed.profile, {...profile,createdAt:null,lastSeenAt:null});
    assert.deepEqual(parsed.activeInventory,[rows[0]]);
    assert.deepEqual(parsed.trashEntries,[rows[1]]);
    assert.equal(parsed.manifest.workflowStateIncluded,false);
    for(let i=0;i<2;i++) assert.deepEqual(new Uint8Array(await parsed.images[i].blob.arrayBuffer()),data[i]);
    for(let i=0;i<2;i++){
      await backup.replaceProfileIndexedData({targetProfileId:profile.profileId,targetProfileName:profile.displayName,activeInventory:parsed.activeInventory,trashEntries:parsed.trashEntries,images:parsed.images});
      const snapshot=await backup.snapshotProfileIndexedData(profile.profileId);
      assert.deepEqual(snapshot.records.sort((a,b)=>a.inventoryId.localeCompare(b.inventoryId)),rows);
      assert.equal(snapshot.images.length,2);
      for(const image of snapshot.images){
        const index=imageRows.findIndex(x=>x.imageKey===image.imageKey);
        assert.equal(image.inventoryId,imageRows[index].inventoryId);
        assert.equal(image.futureImageField,index);
        assert.deepEqual(new Uint8Array(await image.blob.arrayBuffer()),data[index]);
      }
    }
  }
});
function localStore(initial) {
  let state=structuredClone(initial), writes=0;
  return {get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>Object.hasOwn(state,k)).map(k=>[k,structuredClone(state[k])])),set:async patch=>{writes++;Object.assign(state,structuredClone(patch));},remove:async k=>{delete state[k];},snapshot:()=>structuredClone(state),writes:()=>writes};
}
test('W2 imported profile opaque metadata survives actual profile repository finalization',async()=>{
  const local=localStore({profilesV1:[]});
  const repo=loadRegistry(['src/background/repositories/profile-repository.js']).require('KRProfileRepository').create({storageLocal:local});
  await repo.persistImportedProfile({targetProfileId:profile.profileId,incoming:profile});
  assert.deepEqual(local.snapshot().profilesV1[0].donorExtension,profile.donorExtension,'incoming unknown metadata lost on restore');
});
test('W3 expired unresolved donor renewal evidence is retained, not age-pruned on read',async()=>{
  const row={renewalId:'synthetic-old',createdAt:new Date(Date.now()-32*86400000).toISOString(),status:'verified',stage:'source-delete-outcome-unverified',sourceAdId:'100',newAdId:'200',autoReplacementAllowed:true,opaqueEvidence:{marker:true}};
  const local=localStore({renewalSessionsV1:{[row.renewalId]:row}});
  const repo=RenewalRepository.create({storageLocal:local});
  const read=await repo.readRenewalSessions();
  assert.deepEqual(read[row.renewalId],row,'unresolved donor session must survive read');
  assert.deepEqual(local.snapshot().renewalSessionsV1[row.renewalId],row);
  assert.equal(local.writes(),0);
});
const controllerPath='src/background/controllers/renewal-workflow-controller.js';
const controller=fs.readFileSync(controllerPath,'utf8');
function fixture(stage) {
  const api=loadRegistry(['src/background/services/renewal-verification-flow.js','src/background/services/renewal-reinventory-flow.js','src/background/services/paid-checkout-recovery-service.js',controllerPath]).require('KRRenewalWorkflowController');
  const block=controller.match(/const required = \{([\s\S]*?)\n      \};/);
  assert.ok(block,'actual dependency list');
  const deps=Object.fromEntries(block[1].split(',').map(x=>x.trim()).filter(Boolean).map(n=>[n,async()=>{}]));
  const row={renewalId:'synthetic-renewal',createdAt:new Date().toISOString(),status:'verified',stage,sourceAdId:'100',newAdId:'200',autoReplacementAllowed:true};
  const calls=[];
  Object.assign(deps,{readRenewalSessions:async()=>({[row.renewalId]:structuredClone(row)}),readFillSessions:async()=>({}),readDiagnostics:async()=>[],isCheckoutAbortedRecoveryCandidate:()=>false,isSafeLegacyManualEmergencyReset:()=>false,sessionCorrelationContext:()=>({}),finishRenewalReplacement:async msg=>{calls.push(msg);},RENEWAL_MODE_FAST:'fast',RENEWAL_MODE_SAFE:'safe',RENEWAL_PHASE_ATTEMPTS_DEFAULT:3,MY_ADS_PROJECTS_URL:'https://www.kleinanzeigen.de/m-meine-anzeigen.html',BULK_RETRY_POLL_MS:1,BULK_RETRY_TIMEOUT_MS:10,TAB_LOAD_TIMEOUT_PHASE4_MS:100,TAB_LOAD_TIMEOUT_RENEWAL_MS:100});
  return {api:api.create(deps),calls};
}
test('W3 persisted donor unverified delete state does not automatically enter replacement',async()=>{
  const {api,calls}=fixture('source-delete-outcome-unverified');
  await api.resumePendingRenewals(); await new Promise(setImmediate);
  assert.equal(calls.length,0,'unverified donor outcome scheduled automatic replacement');
});
test('W3 positive control: ordinary verified replacement-ready session still enters historical scheduler',async()=>{
  const {api,calls}=fixture('replacement-ready');
  await api.resumePendingRenewals(); await new Promise(setImmediate);
  assert.equal(calls.length,1);
  assert.equal(calls[0].automatic,true);
});

test('W2 actual profile controller finalization also retains opaque incoming metadata without weakening identity validation',async()=>{
  const local=localStore({profilesV1:[]});
  const kr=loadRegistry(['src/background/repositories/profile-repository.js','src/background/controllers/profile-management-controller.js']);
  const api=kr.require('KRProfileManagementController').create({
    ProfileRepository:kr.require('KRProfileRepository'),storageLocal:local,profilesKey:'profilesV1',activeProfileKey:'activeDetectedProfileV1',selectedProfileKey:'selectedInventoryProfileV1',unassignedProfileId:'__unassigned__',
    normalizeProfileName:v=>String(v||'').trim(),randomUUID:()=> 'synthetic-new',purgeExpiredTrash:async()=>{},readAllInventoryRecords:async()=>[],getBulkRunState:async()=>null,isTrashRecord:r=>r.recordKind==='trash',readInventoryRecordsForProfile:async()=>[],readRenewalSessions:async()=>({}),readMassRenewalBatch:async()=>null,getInventoryRepository:()=>({}),logDiagnostic:async()=>{},broadcastInventoryChanged:()=>{},invalidateTrashPurgeSchedule:()=>{}
  });
  await assert.rejects(api.prepareProfileBackupImport({profile:{...profile,profileId:'__unassigned__'}}),/Profilidentität/);
  const result=await api.finalizeProfileBackupImport({profile,counts:{}});
  assert.equal(result.imported,true);
  assert.equal(local.snapshot().selectedInventoryProfileV1.profileId,profile.profileId);
  assert.deepEqual(local.snapshot().profilesV1[0].donorExtension,profile.donorExtension);
});
for(const [label,path,key,idField,stage,status,method,hours] of [
  ['archive','../src/background/services/archive-insertion-service.js','archiveInsertionSessionsV1','archiveInsertionId','publish-intent-blocked','publish-blocked','readArchiveInsertionSessions',48],
  ['fill','../src/background/services/template-fill-service.js','templateFillSessions','fillId','publish-intent-blocked','needs-review','readFillSessions',3],
]){
  test('W3 '+label+' unresolved donor state is not erased on read after historic TTL',async()=>{
    const row={[idField]:'synthetic-uncertain',createdAt:new Date(Date.now()-hours*3600000).toISOString(),stage,status,sourceAdId:'100',opaqueEvidence:{marker:true}};
    const local=localStore({[key]:{[row[idField]]:row}});
    const svc=require(path).create({storageLocal:local});
    const read=await svc[method]();
    assert.deepEqual(read[row[idField]],row);
    assert.deepEqual(local.snapshot()[key][row[idField]],row);
    assert.equal(local.writes(),0);
  });
}
test('W2 archived profile record and image restoration rejects cross-profile key collision without overwriting foreign records',async()=>{
  const idb=new IDBFactory();
  const api=loadRegistry(['src/background/repositories/inventory-repository.js']).require('KRInventoryRepository').create({indexedDB:idb,IDBKeyRange});
  const db=await api.openDatabase();db.close();
  const foreign={...active,profileId:'synthetic-other',profileName:'Other'};
  const backup=BackupStorage.create({indexedDB:idb,IDBKeyRange});
  await backup.replaceProfileIndexedData({targetProfileId:foreign.profileId,targetProfileName:foreign.profileName,activeInventory:[foreign],images:[imageRows[0]]});
  const parsed=await roundtrip('1.25.36',[active,trash]);
  await assert.rejects(backup.replaceProfileIndexedData({targetProfileId:profile.profileId,targetProfileName:profile.displayName,activeInventory:parsed.activeInventory,trashEntries:parsed.trashEntries,images:parsed.images}),/anderen lokalen Profil/);
  assert.deepEqual((await backup.snapshotProfileIndexedData(foreign.profileId)).records,[foreign]);
  assert.equal((await backup.snapshotProfileIndexedData(profile.profileId)).records.length,0);
  const [img]=(await backup.snapshotProfileIndexedData(foreign.profileId)).images;
  assert.deepEqual(new Uint8Array(await img.blob.arrayBuffer()),data[0]);
});
