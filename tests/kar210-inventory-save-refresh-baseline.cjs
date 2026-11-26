'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/background/background.js','utf8');
function fn(name){const a=source.indexOf('async function '+name+'('),b=source.indexOf('\n}',a);assert.ok(a>=0&&b>a,name);return source.slice(a,b+2);}
const copy=x=>structuredClone(x);
test('actual historical saveInventory stages all images and commits once, fails without partial commit and releases single-flight',async()=>{
 const commits=[],broadcasts=[],events=[],downloads=[];let rejectImage='',commitBlock=null,entered=null;
 const ctx={inventorySaveRunning:false,logDiagnostic:async(_l,e)=>events.push(e),broadcastInventoryChanged:(...args)=>broadcasts.push(args),
 downloadInventoryImage:async (image,jpeg,large)=>{downloads.push([image.imageId,jpeg,large]);if(image.imageId===rejectImage)throw Error('fixture image denied');return {mimeType:'image/jpeg',formatEvidence:'file-signature-and-decode',size:3,blob:new Blob(['abc']),sha256:'a'.repeat(64)};},
 commitInventory:async(record,images)=>{if(commitBlock){entered();await commitBlock;}commits.push({record:copy(record),images:copy(images)});}};
 const save=vm.runInNewContext('('+fn('saveInventory')+')',ctx);
 await assert.rejects(save({}),/Keine eindeutige Anzeigen-ID/);assert.equal(commits.length,0);
 const plain=await save({adId:'42',images:[],profileId:'p'});assert.equal(plain.inventoryId,'42');assert.equal(plain.profileId,'p');assert.equal(plain.imageSummary.locallyStored,0);
 const input={adId:'43',profileId:'p',images:[{imageId:'first'},{imageId:'second'}],extraction:{requiresJpeg:true,requiresLargeJpeg:true}};
 const saved=await save(copy(input),{inventoryIdOverride:'replacement-id'});assert.equal(saved.inventoryId,'replacement-id');assert.equal(saved.profileId,'p');assert.deepEqual(Array.from(saved.images,x=>x.imageKey),['replacement-id:0','replacement-id:1']);assert.deepEqual(Array.from(saved.images,x=>x.imageId),['first','second']);assert.ok(saved.images.every(x=>x.uploadReady));assert.deepEqual(downloads,[['first',true,true],['second',true,true]]);
 rejectImage='second';await assert.rejects(save(copy(input)),/Bild 2 konnte nicht gesichert werden/);assert.equal(commits.length,2);assert.equal(broadcasts.length,2);rejectImage='';
 let release;commitBlock=new Promise(r=>release=r);const ready=new Promise(r=>entered=r);const pending=save({adId:'45',images:[]});await ready;
 await assert.rejects(save({adId:'46',images:[]}),/Eine Erfassung läuft bereits/);release();await pending;commitBlock=null;
 assert.equal((await save({adId:'47',images:[]})).inventoryId,'47');assert.equal(commits.length,4);assert.equal(broadcasts.length,4);assert.ok(events.includes('INVENTORY_SAVED'));
});
function refreshFixture(){
 const rows=new Map(),events=[],writes=[],broadcasts=[],probes=[],closures=[],saves=[],tabs=[];let gateError=null,bulk={status:'idle'},renewals={},online=true,failWait=false;
 const ctx={crypto:{randomUUID:()=> 'fixture-op'},getInventory:async id=>copy(rows.get(id)),assertSelectedProfileMatchesLiveAccount:async args=>{assert.equal(args.expectedProfileId,'bound');if(gateError)throw gateError;},publicAvailabilityPending:r=>r.pending===true,getBulkRunState:async()=>bulk,readRenewalSessions:async()=>renewals,normalizeKnownPublicAdUrl:u=>String(u||''),publicUrlForInventoryRecord:r=>r.publicUrl||'',directPublicUrlForAdId:id=>'https://www.kleinanzeigen.de/s-anzeige/'+id,
 logDiagnostic:async(_l,e)=>events.push(e),probeFreshRenewalPublicUrl:async(url,id,variant)=>{probes.push([id,variant]);return {ok:online&&variant==='canonical',resolvedUrl:url,publicUrlVariant:variant,metadata:{endDateDisplay:'01.01.2027'}};},mergeListingMetadata:(_r,e)=>({...e,mergedFromReadOnly:true}),publicAvailabilitySnapshot:x=>({...x}),putInventoryRecordOnly:async r=>writes.push(copy(r)),broadcastInventoryChanged:(...a)=>broadcasts.push(a),renewalEvidenceFailureClass:()=> 'temporarily-unavailable',
 normalBrowserWindowId:async()=>77,createAutomationTab:async o=>{tabs.push(o);return {id:o.url.includes('bearbeiten')?101:102};},extractReadOnlyMetadata:async()=>({ok:true,metadata:{endDateDisplay:'01.01.2027'},durationMs:2}),waitForTabComplete:async()=>{if(failWait)throw Error('fixture worker timeout');},ensureContentConnection:async()=>{},sendTabRequestWithBootstrap:async(id,m)=>{assert.equal(id,101);assert.equal(m.type,'EXTRACT_CURRENT_AD');return {adId:'123',images:[],title:'Existing'};},delay:async()=>{},saveInventory:async(r,o)=>{saves.push({r:copy(r),o:copy(o)});return {...r,inventoryId:o.inventoryIdOverride,imageSummary:{discovered:0}};},closeRegistryTabs:async(ids,why)=>closures.push({ids:Array.from(ids),why}),RENEWAL_DIRECT_READONLY_TIMEOUT_MS:3500,READONLY_METADATA_TIMEOUT_MS:15000,TAB_LOAD_TIMEOUT_RENEWAL_MS:45000,BULK_RETRY_TIMEOUT_MS:1000,BULK_RETRY_POLL_MS:1};
 vm.runInNewContext(fn('checkInventoryOnlineStatus')+'\n'+fn('refreshInventoryRecord'),ctx);
 return {ctx,rows,events,writes,broadcasts,probes,closures,saves,tabs,setGate:v=>gateError=v,setBulk:v=>bulk=v,setRenewals:v=>renewals=v,setOnline:v=>online=v,setFailWait:v=>failWait=v};
}
test('actual historical inventory online-status and refresh enforce account, ID, workflow gates before worker or write',async()=>{
 const f=refreshFixture(),a=f.ctx.checkInventoryOnlineStatus,b=f.ctx.refreshInventoryRecord;
 for(const call of [a,b])await assert.rejects(call({inventoryId:'absent'}),/nicht gefunden/);
 f.rows.set('bad',{adId:'wrong',profileId:'bound',pending:true});for(const call of [a,b])await assert.rejects(call({inventoryId:'bad'}),/gültige Anzeigen-ID/);
 f.rows.set('row',{adId:'123',profileId:'bound',pending:true});f.setGate(Error('fixture account mismatch'));for(const call of [a,b])await assert.rejects(call({inventoryId:'row'}),/account mismatch/);
 f.setGate(null);f.setBulk({status:'running'});for(const call of [a,b])await assert.rejects(call({inventoryId:'row'}),/laufenden Erfassung/);
 f.setBulk({status:'idle'});f.setRenewals({r:{sourceInventoryId:'row',status:'running'}});await assert.rejects(b({inventoryId:'row'}),/Renewal-Vorgangs gesperrt/);
 assert.deepEqual(f.tabs,[]);assert.deepEqual(f.writes,[]);assert.deepEqual(f.saves,[]);assert.deepEqual(f.probes,[]);
});
test('actual historical read-only online evidence and manual refresh preserve identity and close workers on failure',async()=>{
 const f=refreshFixture(),row={adId:'123',profileId:'bound',profileName:'fixture',pending:true,publicUrl:'https://www.kleinanzeigen.de/s-anzeige/dummy/123',listingMeta:{}};
 f.rows.set('row',row);
 const a=await f.ctx.checkInventoryOnlineStatus({inventoryId:'row'});assert.equal(a.online,true);assert.equal(a.record.listingMeta.publicAvailability.status,'online');assert.equal(f.broadcasts.at(-1)[0],'inventory-online-status-confirmed');assert.deepEqual(f.probes,[['123','canonical']]);
 f.setOnline(false);const p=await f.ctx.checkInventoryOnlineStatus({inventoryId:'row'});assert.equal(p.pending,true);assert.equal(p.record.listingMeta.publicAvailability.status,'pending');assert.equal(f.broadcasts.at(-1)[0],'inventory-online-status-pending');
 const saved=await f.ctx.refreshInventoryRecord({inventoryId:'row'});assert.equal(saved.inventoryId,'row');assert.equal(saved.adId,'123');assert.equal(saved.profileId,'bound');assert.equal(saved.listingMeta.mergedFromReadOnly,true);assert.deepEqual(f.closures.at(-1),{ids:[101,102],why:'inventory-refresh-worker-finished'});
 f.setFailWait(true);await assert.rejects(f.ctx.refreshInventoryRecord({inventoryId:'row'}),/fixture worker timeout/);assert.deepEqual(f.closures.at(-1),{ids:[101,102],why:'inventory-refresh-worker-failed'});assert.equal(f.saves.length,1);assert.ok(f.events.includes('INVENTORY_REFRESH_FAILED'));
});
