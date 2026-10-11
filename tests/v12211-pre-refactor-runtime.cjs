const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto').webcrypto;
const root = path.resolve(__dirname, '..');
const surface = require('./v12211-background-source-surface.cjs');

function extractFunction(name) {
  const markers = [`async function ${name}(`, `function ${name}(`];
  const starts = markers.map(marker => surface.indexOf(marker)).filter(index => index >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  if (start < 0) throw new Error(`${name} not found`);
  const bodyMarker = surface.indexOf(') {', start);
  const brace = bodyMarker >= 0 ? bodyMarker + 2 : surface.indexOf('{', start);
  let depth = 0, quote = '', escaped = false;
  for (let i = brace; i < surface.length; i += 1) {
    const ch = surface[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return surface.slice(start, i + 1);
  }
  throw new Error(`${name} body not closed`);
}

const local = {
  profilesV1: [{ profileId:'p1', displayName:'Alpha', normalizedName:'alpha', createdAt:'2026-09-01T00:00:00Z', lastSeenAt:'2026-09-02T00:00:00Z' }],
  activeDetectedProfileV1: { profileId:'p1' },
  selectedInventoryProfileV1: { profileId:'__unassigned__', source:'manual' }
};
const storageLocal = {
  async get(keys){ const names=Array.isArray(keys)?keys:[keys]; return Object.fromEntries(names.map(k=>[k,local[k]])); },
  async set(patch){ Object.assign(local, structuredClone(patch)); },
  async remove(keys){ for(const k of (Array.isArray(keys)?keys:[keys])) delete local[k]; }
};
let readProfiles, ensureProfile, recordMatchesProfile, profilePublicRecord, sanitizeImportedProfileMetadata, isTrashRecord, trashRecordFrom;
const repositoryBuild = fs.existsSync(path.join(root, 'profile-repository.js')) && fs.existsSync(path.join(root, 'trash-service.js'));
if (repositoryBuild) {
  const moduleContext = vm.createContext({ console, Date, crypto, structuredClone, globalThis:null, KRDeps:null });
  moduleContext.globalThis = moduleContext;
  vm.runInContext(fs.readFileSync(path.join(root,'profile-repository.js'),'utf8'), moduleContext);
  vm.runInContext(fs.readFileSync(path.join(root,'trash-service.js'),'utf8'), moduleContext);
  const profileRepo = moduleContext.KRProfileRepository.create({ storageLocal, profilesKey:'profilesV1', activeProfileKey:'activeDetectedProfileV1', selectedProfileKey:'selectedInventoryProfileV1', unassignedProfileId:'__unassigned__', randomUUID:()=>crypto.randomUUID() });
  readProfiles = () => profileRepo.read();
  ensureProfile = value => profileRepo.ensure(value);
  recordMatchesProfile = (record, profileId) => { const requested=String(profileId||''); if(!requested)return true; if(requested==='__unassigned__')return !String(record?.profileId||''); return String(record?.profileId||'')===requested; };
  profilePublicRecord = (profile,counts={}) => ({ profileId:String(profile?.profileId||''), displayName:String(profile?.displayName||''), createdAt:profile?.createdAt||null, lastSeenAt:profile?.lastSeenAt||null, inventoryCount:Number(counts.inventoryCount||0), trashCount:Number(counts.trashCount||0), totalCount:Number(counts.inventoryCount||0)+Number(counts.trashCount||0) });
  sanitizeImportedProfileMetadata = profile => { const profileId=String(profile?.profileId||'').trim(); const displayName=String(profile?.displayName||'').replace(/\s+/g,' ').trim(); if(!profileId||profileId==='__unassigned__'||!displayName)throw new Error('Die Profilsicherung enthält keine gültige Profilidentität.'); return { profileId, displayName, normalizedName:String(profile?.normalizedName||displayName).replace(/\s+/g,' ').trim()||displayName, createdAt:profile?.createdAt||null,lastSeenAt:profile?.lastSeenAt||null}; };
  const dummyRepo = { readForProfile:async()=>[], get:async()=>null, mutate:async()=>null, deleteWithImages:async()=>{}, readAll:async()=>[], putMany:async()=>0 };
  const trash = moduleContext.KRTrashService.create({ inventoryRepository:dummyRepo, retentionMs:30*24*60*60*1000 });
  isTrashRecord = trash.isTrashRecord;
  trashRecordFrom = trash.trashRecordFrom;
} else {
  const context = vm.createContext({
    console, Date, crypto, structuredClone,
    PROFILES_KEY:'profilesV1', ACTIVE_PROFILE_KEY:'activeDetectedProfileV1', SELECTED_PROFILE_KEY:'selectedInventoryProfileV1',
    UNASSIGNED_PROFILE_ID:'__unassigned__', TRASH_RETENTION_MS:30*24*60*60*1000,
    chrome:{storage:{local:storageLocal}}, invalidateTrashPurgeSchedule(){}
  });
  for (const name of ['normalizeProfileName','readProfiles','recordMatchesProfile','profilePublicRecord','normalizedProfileIdentityName','sanitizeImportedProfileMetadata','ensureProfile','isTrashRecord','trashRecordFrom']) {
    vm.runInContext(`${extractFunction(name)}\nthis.__${name}=${name};`, context);
  }
  readProfiles=context.__readProfiles; ensureProfile=context.__ensureProfile; recordMatchesProfile=context.__recordMatchesProfile;
  profilePublicRecord=context.__profilePublicRecord; sanitizeImportedProfileMetadata=context.__sanitizeImportedProfileMetadata;
  isTrashRecord=context.__isTrashRecord; trashRecordFrom=context.__trashRecordFrom;
}

(async()=>{
  let count=0; const pass=l=>{count+=1; console.log(`PASS ${l}`);};
  const state=await readProfiles();
  assert.equal(state.activeProfileId,'p1'); assert.equal(state.selectedProfileId,'__unassigned__'); assert.equal(state.selectedProfileSource,'manual');
  pass('profile storage keeps active and selected identity as separate persisted state');

  const same=await ensureProfile('  Alpha   '); assert.equal(same.profileId,'p1'); assert.equal(local.profilesV1.length,1); assert.equal(local.activeDetectedProfileV1.profileId,'p1');
  const created=await ensureProfile('Beta'); assert.notEqual(created.profileId,'p1'); assert.equal(local.profilesV1.length,2);
  pass('profile ensure reuses normalized identity and creates only genuinely new profile identities');

  assert.equal(recordMatchesProfile({profileId:'p1'},'p1'),true); assert.equal(recordMatchesProfile({profileId:null},'__unassigned__'),true); assert.equal(recordMatchesProfile({profileId:'p1'},'__unassigned__'),false);
  pass('profile matching preserves explicit unassigned bucket semantics');

  const publicProfile=profilePublicRecord({profileId:'p1',displayName:'Alpha',createdAt:'a',lastSeenAt:'b'},{inventoryCount:3,trashCount:2});
  assert.deepEqual(JSON.parse(JSON.stringify(publicProfile)),{profileId:'p1',displayName:'Alpha',createdAt:'a',lastSeenAt:'b',inventoryCount:3,trashCount:2,totalCount:5});
  pass('public profile counts preserve inventory trash and total semantics');

  const source={inventoryId:'i1',adId:'1',recordKind:'inventory',renewal:{status:'draft'}};
  const trashed=trashRecordFrom(source,'manual',{source:'test'},new Date('2026-09-24T00:00:00.000Z'));
  assert.equal(trashed.recordKind,'trash'); assert.equal(trashed.trash.reason,'manual'); assert.equal(trashed.trash.expiresAt,'2026-10-24T00:00:00.000Z'); assert.equal('renewal' in trashed,false); assert.equal(isTrashRecord(trashed),true);
  pass('trash conversion preserves 30-day retention and removes workflow-only renewal state');

  const sanitized=sanitizeImportedProfileMetadata({profileId:'p-backup',displayName:' Backup User ',normalizedName:'backup user'}); assert.equal(sanitized.displayName,'Backup User');
  assert.throws(()=>sanitizeImportedProfileMetadata({profileId:'__unassigned__',displayName:'X'}),/gültige Profilidentität/);
  pass('profile backup metadata sanitation stays fail-closed for invalid identities');

  console.log(`${count}/6 PASS v1.22.11 pre-refactor runtime`);
})().catch(error=>{ console.error(error.stack||error); process.exitCode=1; });
