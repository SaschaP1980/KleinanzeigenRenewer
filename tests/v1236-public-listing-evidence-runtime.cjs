const assert=require('assert'),fs=require('fs'),vm=require('vm');let API=null;
const ctx={console,Date,Promise,String,Number,Boolean,RegExp,Error,URL,setTimeout,clearTimeout,KRDeps:{register(n,a){if(n==='KRPublicListingEvidenceService')API=a;}}};ctx.globalThis=ctx;
vm.createContext(ctx);vm.runInContext(fs.readFileSync('public-listing-evidence-service.js','utf8'),ctx,{filename:'public-listing-evidence-service.js'});assert.ok(API?.create);
let polls=0;
const svc=API.create({URL,readOnlyMetadataTimeoutMs:50,chromeTabs:{get:async()=>({status:'complete'})},delay:async()=>{},ensureContentConnection:async()=>{},sendTabRequestWithBootstrap:async()=>{polls++;return {adId:'123',listingDateDisplay:'28.09.2026',listingDateIso:'2026-09-28',endDateDisplay:'27.11.2026',endDateIso:'2026-11-27',sourceUrl:'https://www.kleinanzeigen.de/s-anzeige/test/123-1-2'}}});
let n=0;const pass=l=>{n++;console.log('PASS '+l)};
(async()=>{
 assert.equal(svc.normalizeKnownPublicAdUrl('https://www.kleinanzeigen.de/s-anzeige/Test/123-1-2/','123'),'https://www.kleinanzeigen.de/s-anzeige/Test/123-1-2');
 assert.equal(svc.normalizeKnownPublicAdUrl('https://evil.example/s-anzeige/Test/123-1-2','123'),'');pass('canonical public URL validation');
 const generated=svc.publicUrlForInventoryRecord({adId:'123',title:'Schöne Lampe',category:{id:'82'},locationData:{locationId:'1759'}});assert.match(generated,/\/s-anzeige\/schone-lampe\/123-82-1759$/);pass('public URL generation');
 const derived=svc.deriveListingDateFromEndDate('2026-11-27','',60);assert.equal(derived.listingDateIso,'2026-09-28');assert.equal(derived.listingDateDerived,true);pass('listing date derivation');
 const preserved=svc.mergeListingMetadata({listingMeta:{}},{listingDateIso:'2026-09-20',listingDateDisplay:'20.09.2026',listingDateSource:'readonly-detail'},null,{listingDateIso:'2026-09-28',listingDateDisplay:'28.09.2026',listingDateDerived:true});assert.equal(preserved.listingDateIso,'2026-09-20');assert.equal(preserved.listingDateDerived,false);pass('verified existing listing date preserved over derived fallback');
 const ro=await svc.extractReadOnlyMetadata(7,'123',50);assert.equal(ro.ok,true);assert.equal(ro.metadata.adId,'123');assert.equal(polls,1);pass('read-only metadata extraction');
 const snap=svc.publicAvailabilitySnapshot({online:true,method:'runtime',publicUrl:'u',checkedAt:'2026-09-28T00:00:00.000Z'});assert.equal(snap.status,'online');assert.equal(snap.verificationClass,'confirmed');pass('public availability snapshot');
 console.log(`${n}/6 PASS v1.23.6 public listing evidence runtime`);
})().catch(e=>{console.error(e);process.exitCode=1});
