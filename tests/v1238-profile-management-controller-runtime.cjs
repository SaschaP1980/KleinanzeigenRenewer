const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={console,crypto:require('node:crypto').webcrypto};ctx.globalThis=ctx;vm.createContext(ctx);
for(const f of ['src/shared/runtime-deps.js','src/background/repositories/profile-repository.js','src/background/controllers/profile-management-controller.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const Controller=ctx.KRDeps.require('KRProfileManagementController');
let store={};const storageLocal={get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,store[k]])),set:async patch=>Object.assign(store,patch),remove:async key=>{for(const k of Array.isArray(key)?key:[key])delete store[k];}};
let records=[];let bulk=null;let renewals={};let mass=null;let logs=[];let broadcasts=[];let purges=0;let unassignCalls=[];let assignCalls=[];
const inventoryRepo={
  countUnassignedActive:async isTrash=>records.filter(r=>!r.profileId&&!isTrash(r)).length,
  assignUnassignedRecords:async profile=>{let n=0;records=records.map(r=>{if(!r.profileId){n++;return {...r,profileId:profile.profileId,profileName:profile.displayName};}return r;});assignCalls.push(profile.profileId);return n;},
  unassignProfileRecords:async(id,name)=>{let n=0;records=records.map(r=>{if(r.profileId===id){n++;const x={...r};delete x.profileId;x.profileName=name;return x;}return r;});unassignCalls.push(id);return n;}
};
let uuid=0;
const make=()=>Controller.create({
  ProfileRepository:ctx.KRDeps.require('KRProfileRepository'),storageLocal,profilesKey:'profiles',activeProfileKey:'active',selectedProfileKey:'selected',unassignedProfileId:'__unassigned__',normalizeProfileName:v=>String(v||'').replace(/\s+/g,' ').trim(),randomUUID:()=>`p-${++uuid}`,
  purgeExpiredTrash:async()=>{purges++;},readAllInventoryRecords:async()=>records,getBulkRunState:async()=>bulk,isTrashRecord:r=>r.trash===true,readInventoryRecordsForProfile:async id=>records.filter(r=>r.profileId===id),readRenewalSessions:async()=>renewals,readMassRenewalBatch:async()=>mass,getInventoryRepository:()=>inventoryRepo,
  logDiagnostic:async(...a)=>logs.push(a),broadcastInventoryChanged:(...a)=>broadcasts.push(a),invalidateTrashPurgeSchedule:()=>{}
});
let n=0;const pass=l=>{n++;console.log('PASS '+l)};
(async()=>{
  store={profiles:[{profileId:'p1',displayName:'Alpha',normalizedName:'alpha',createdAt:'2026-01-01',lastSeenAt:'2026-02-01'},{profileId:'p2',displayName:'Beta',normalizedName:'beta',createdAt:'2026-01-01',lastSeenAt:'2026-01-15'}],active:{profileId:'p1'},selected:{profileId:'missing',source:'manual'}};
  records=[{profileId:'p1'},{profileId:'p1',trash:true},{profileId:'p2'},{trash:true},{}];bulk={status:'running',profileId:'p2'};logs=[];broadcasts=[];
  let c=make(); let state=await c.getProfileState();
  assert.equal(state.selectedProfileId,'p1');assert.equal(store.selected.profileId,'p1');assert.equal(store.selected.source,'automatic');assert.equal(state.profiles[0].profileId,'p1');assert.equal(state.profiles[0].inventoryCount,1);assert.equal(state.profiles[0].trashCount,1);assert.equal(state.unassigned.inventoryCount,1);assert.equal(state.unassigned.trashCount,1);assert.equal(state.activeBulkProfileId,'p2');pass('profile state preserves counts active-first ordering and deterministic selection fallback');

  state=await c.setSelectedProfile({profileId:'__unassigned__'});assert.equal(state.selectedProfileId,'__unassigned__');assert.ok(logs.some(x=>x[1]==='PROFILE_VIEW_SELECTED'));assert.ok(broadcasts.some(x=>x[0]==='profile-selected'));pass('manual unassigned selection is allowed only when unassigned records exist and is diagnosed');

  store.selected={profileId:'p2',source:'manual'};const recognized=await c.recognizeProfile({profileName:'Alpha'});assert.equal(recognized.profile.profileId,'p1');assert.equal(store.selected.profileId,'p2');assert.equal(store.selected.source,'manual');assert.ok(logs.some(x=>x[1]==='PROFILE_RECOGNIZED'));pass('recognition preserves an explicit manual profile selection');

  store.selected={profileId:'__unassigned__',source:'manual'};const migrated=await c.assignUnprofiledInventories({profileId:'p1'});assert.ok(migrated.migrated>=1);assert.equal(store.selected.profileId,'p1');assert.equal(store.selected.source,'migration');assert.ok(assignCalls.includes('p1'));pass('legacy unassigned inventory migration rebinds selection explicitly');

  renewals={r1:{profileId:'p2',status:'running'}};await assert.rejects(()=>c.deleteProfile({profileId:'p2'}),/aktive[rn] Renewal-Vorgang/);pass('profile deletion remains blocked by active renewal work');
  renewals={};bulk={status:'running',profileId:'p2'};await assert.rejects(()=>c.deleteProfile({profileId:'p2'}),/läuft noch eine Erfassung/);pass('profile deletion remains blocked by active bulk work');
  bulk=null;const deleted=await c.deleteProfile({profileId:'p2'});assert.equal(deleted.deletedProfileId,'p2');assert.ok(unassignCalls.includes('p2'));assert.ok(!store.profiles.some(p=>p.profileId==='p2'));assert.ok(logs.some(x=>x[1]==='PROFILE_DELETED'));pass('profile deletion unassigns inventory before removing profile metadata');

  store.profiles=[{profileId:'p1',displayName:'Alpha',normalizedName:'alpha'}];mass={status:'running'};await assert.rejects(()=>c.prepareProfileBackupImport({profile:{profileId:'new',displayName:'New'}}),/Massen-Neuinserats/);mass=null;const prep=await c.prepareProfileBackupImport({profile:{profileId:'p1',displayName:'Alpha'},counts:{activeInventory:2}});assert.equal(prep.conflict,true);assert.equal(prep.targetProfileId,'p1');pass('profile backup import retains conflict detection and active-work safety');
  console.log(`${n}/8 PASS v1.23.8 profile management controller runtime`);
})().catch(e=>{console.error(e);process.exit(1)});
