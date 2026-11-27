'use strict';
// Historical refresh and local retention only; no later loading-generation/policy implementation.
const assert=require('node:assert/strict'),test=require('node:test'),vm=require('node:vm'),fs=require('node:fs');
const s09=require('./current-patch-policy.cjs').isS09Version(require('../manifest.json').version);
let Trash;
vm.runInNewContext(fs.readFileSync('src/background/services/trash-service.js','utf8'),{KRDeps:{register(name,api){if(name==='KRTrashService')Trash=api;}}});
assert.equal(typeof Trash?.create,'function');
const copy=x=>structuredClone(x);
test('actual historical profile-scoped refresh renders persisted 61/90 and retains verified rows on rejected read',async()=>{
 const source=fs.readFileSync('src/app/app.js','utf8');
 const a=source.indexOf('async function refreshInventories('),b=source.indexOf('\nasync function refreshRenewalProgressOnly(',a);assert.ok(a>=0&&b>a);
 const saved={LIST_INVENTORIES:Array.from({length:61},(_,i)=>({inventoryId:'i'+i,profileId:'p'})),LIST_TRASH:Array.from({length:90},(_,i)=>({inventoryId:'t'+i,profileId:'p'}))};
 let fail='',calls=[],renders=[];
 const context={currentRecords:[],currentTrashRecords:[],currentInsertionLock:{},currentAppNotice:null,currentView:'inventory',selectedProfileId:'p',massRenewalUiController:null,archiveTrashInsertionUiController:null,inventoryHeaderCount:{textContent:'0'},trashHeaderCount:{textContent:'0'},renderProfileSwitcher:()=>{},scopedProfileMessage:type=>({type,profileId:'p'}),
 runtimeMessage:async m=>{calls.push(m);if(m.type===fail)throw Error('fixture unavailable');if(m.type in saved){assert.equal(m.profileId,'p');return copy(saved[m.type]);}if(m.type==='GET_PROFILE_STATE')return {selectedProfileId:'p'};if(m.type==='GET_APP_NOTICE')return null;if(m.type==='GET_INSERTION_LOCK_STATE')return {locked:false};throw Error('Unexpected request '+m.type);},syncArchiveInsertionUiFromLock(){},syncActionsActivityIndicator(){},renderAppNotice(){},syncRenewalProgressUi(){},renderInventories:r=>renders.push(['inventory',r.length]),renderTrash:r=>renders.push(['trash',r.length])};
 vm.runInNewContext(source.slice(a,b),context);
 await context.refreshInventories();
 assert.equal(context.inventoryHeaderCount.textContent,'61');assert.equal(context.trashHeaderCount.textContent,'90');assert.deepEqual(renders,[['inventory',61]]);
 const before=copy([context.currentRecords,context.currentTrashRecords]);
 for(const type of ['LIST_INVENTORIES','LIST_TRASH']){fail=type;await assert.rejects(context.refreshInventories(),/fixture unavailable/);assert.deepEqual([context.currentRecords,context.currentTrashRecords],before);assert.equal(context.inventoryHeaderCount.textContent,'61');assert.equal(context.trashHeaderCount.textContent,'90');assert.equal(renders.length,1);}
 fail='';context.currentView='trash';await context.refreshInventories();assert.deepEqual(renders.at(-1),['trash',90]);
 saved.LIST_INVENTORIES=[];saved.LIST_TRASH=[];await context.refreshInventories();assert.equal(context.inventoryHeaderCount.textContent,'0');assert.equal(context.trashHeaderCount.textContent,'0');assert.deepEqual(renders.at(-1),['trash',0]);
 assert.ok(calls.every(m=>['GET_PROFILE_STATE','LIST_INVENTORIES','LIST_TRASH','GET_APP_NOTICE','GET_INSERTION_LOCK_STATE'].includes(m.type)));
});
test('actual historical trash service preserves fixed retention and never mutates on scoped listing or failed read',async()=>{
 const day=86400000,now=Date.now(),future=new Date(now+day).toISOString(),past=new Date(now-day).toISOString();
 const rows=[{inventoryId:'live',profileId:'p',recordKind:'inventory',images:[{imageKey:'live:0'}]},{inventoryId:'known',profileId:'p',recordKind:'trash',trash:{trashedAt:past,expiresAt:future}},{inventoryId:'unknown',profileId:'p',recordKind:'trash',trash:{trashedAt:past,expiresAt:null}},{inventoryId:'invalid',profileId:'p',recordKind:'trash',trash:{trashedAt:past,expiresAt:'invalid'}},{inventoryId:'foreign',profileId:'q',recordKind:'trash',trash:{trashedAt:past,expiresAt:future}},{inventoryId:'expired',profileId:'p',recordKind:'trash',trash:{trashedAt:s09?new Date(now-31*day).toISOString():past,expiresAt:past}}];
 let fail=false,mutations=0,deletes=[];
 const repository={readForProfile:async p=>{if(fail)throw Error('read failed');return copy(rows.filter(r=>r.profileId===p));},readAll:async()=>copy(rows),get:async id=>copy(rows.find(r=>r.inventoryId===id)),mutate:async(id,fn)=>{mutations++;const i=rows.findIndex(r=>r.inventoryId===id);rows[i]=fn(copy(rows[i]));return copy(rows[i]);},deleteWithImages:async id=>{deletes.push(id);rows.splice(rows.findIndex(r=>r.inventoryId===id),1);}};
 if(s09) repository.deleteTrashIfEligible=async(id,expected,days,nowMs)=>{const row=rows.find(r=>r.inventoryId===id);assert.equal(days,30);assert.ok(row&&row.recordKind==='trash'&&row.profileId===expected.profileId&&row.trash.trashedAt===expected.trashedAt&&row.trash.expiresAt===expected.expiresAt&&Date.parse(row.trash.expiresAt)<=nowMs);assert.equal(expected.respectStoredDeadline,true);await repository.deleteWithImages(id);return true;};
 const service=Trash.create({inventoryRepository:repository});
 const before=copy(rows);assert.deepEqual((await service.list('p')).map(x=>x.inventoryId).sort(),['expired','invalid','known','unknown']);
 fail=true;await assert.rejects(service.list('p'),/read failed/);assert.deepEqual(rows,before);assert.equal(mutations,0);assert.deepEqual(deletes,[]);
 await assert.rejects(service.deleteEntry('live'),/Papierkorb/);assert.deepEqual(deletes,[]);
 const result=await service.purgeExpired();assert.equal(result.purged,1);assert.deepEqual(deletes,['expired']);
 assert.ok(rows.some(x=>x.inventoryId==='unknown'));assert.ok(rows.some(x=>x.inventoryId==='invalid'));assert.ok(rows.some(x=>x.inventoryId==='foreign'));assert.ok(rows.some(x=>x.inventoryId==='live'));
 const moved=await service.moveToTrash('live');assert.equal(Date.parse(moved.trash.expiresAt)-Date.parse(moved.trash.trashedAt),30*day);assert.deepEqual(moved.images,before[0].images);
 const reset=await service.resetRetention('live');assert.equal(Date.parse(reset.trash.expiresAt)-Date.parse(reset.trash.retentionResetAt),30*day);assert.deepEqual(reset.images,before[0].images);
});
test('retained independent CI runner assertions from KAR-188 and KAR-186',()=>{
 const mainCi=fs.readFileSync('.github/workflows/kar-ci.yml','utf8');
 assert.match(mainCi,/runs-on: ubuntu-24\.04/,'main Playwright/Chromium CI requires a supported runner');
 assert.doesNotMatch(mainCi,/    runs-on: ubuntu-latest\n    timeout-minutes: 30/);
 const workPrYaml=fs.readFileSync('.github/workflows/kar-work-pr.yml','utf8');
 const browserJob=workPrYaml.split('  browser_e2e:')[1]?.split('  windows_updater:')[0]||'';
 assert.match(browserJob,/runs-on: ubuntu-24[.]04/);assert.doesNotMatch(browserJob,/runs-on: ubuntu-latest/);
});
