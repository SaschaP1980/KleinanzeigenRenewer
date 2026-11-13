'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/background/controllers/manual-listing-navigation-controller.js','utf8');
const bg=fs.readFileSync('src/background/background.js','utf8');
let owner=null;vm.runInNewContext(src,{KRDeps:{register(n,x){assert.equal(n,'KRManualListingNavigationController');owner=x;}}});
assert.throws(()=>owner.create({}),/requires trusted/);
assert.match(bg,/requireManualListingNavigationController\(\)\.openReadOnlyAd\(message\)/);
assert.match(bg,/requireManualListingNavigationController\(\)\.openEditAd\(message\)/);
const events=[],created=[],focus=[],records=new Map();
let failWait=false,nextId=10;
const options={
 navigationPort:{normalBrowserWindowId:async()=>20,createAutomationTab:async opts=>{created.push(opts);return {id:++nextId,windowId:20};},
 waitForTabComplete:async id=>{if(failWait)throw Error('fixture navigation pending');return {url:'https://www.kleinanzeigen.de/s-anzeige/demo/123'};},
 chrome:{windows:{update:async(id,opts)=>{focus.push(id);}},tabs:{get:async()=>({url:'https://www.kleinanzeigen.de/s-anzeige/pending/123'})}}},
 evidencePort:{getInventory:async id=>records.get(id)||null,
 normalizeKnownPublicAdUrl:(raw,adId)=>String(raw||'').includes(String(adId))?String(raw):'',
 publicUrlForInventoryRecord:r=>r.publicUrl||'',directPublicUrlForAdId:id=>'https://www.kleinanzeigen.de/s-anzeige/direct/'+id},
 diagnosticsPort:{logDiagnostic:async(level,event)=>{events.push(event);}}
};
const svc=owner.create(options);
assert.deepEqual(Object.keys(svc).sort(),['openEditAd','openReadOnlyAd']);
(async()=>{
 await assert.rejects(svc.openEditAd({adId:'not-number'}),/Anzeigen-ID/);
 await assert.rejects(svc.openReadOnlyAd({adId:'not-number'}),/Anzeigen-ID/);
 const edit=await svc.openEditAd({adId:'123'});
 assert.equal(edit.adId,'123');assert.match(created[0].url,/p-anzeige-bearbeiten\.html\?adId=123/);
 records.set('inv',{adId:'123',publicUrl:'https://www.kleinanzeigen.de/s-anzeige/known/123'});
 const normal=await svc.openReadOnlyAd({adId:'123',inventoryId:'inv',publicUrl:'https://evil.invalid/123'});
 assert.equal(normal.urlSource,'inventory-public-url');assert.equal(normal.tabId,12);
 assert.equal(normal.finalUrl,'https://www.kleinanzeigen.de/s-anzeige/demo/123');
 failWait=true;
 const pending=await svc.openReadOnlyAd({adId:'123',inventoryId:'absent'});
 assert.equal(pending.urlSource,'id-fallback');
 assert.ok(events.includes('READONLY_AD_NAVIGATION_PENDING'));assert.ok(events.includes('READONLY_AD_OPENED'));
 assert.equal(focus.length,3);
 console.log('PASS KAR-175 Wave 6 manual listing navigation: exact-ID, trusted URL preference, browser focus and pending evidence');
})().catch(e=>{console.error(e);process.exitCode=1});
