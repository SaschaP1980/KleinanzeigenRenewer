'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const bg=fs.readFileSync('src/background/background.js','utf8');
function declaration(name){
 const re=new RegExp('(?:^|\\n)((?:async )?function '+name+'\\()','g');
 const found=[...bg.matchAll(re)];assert.equal(found.length,1,'single historical owner: '+name);
 const start=found[0].index+found[0][0].indexOf(found[0][1]),end=bg.indexOf('\n}',start);assert.ok(end>start,name);
 return bg.slice(start,end+2);
}
function load(ctx,names){vm.runInNewContext(names.map(declaration).join('\n'),ctx);}

const ManagedNavigation=require('../src/shared/managed-navigation.js');
let publicProvider;
vm.runInNewContext(fs.readFileSync('src/background/services/public-listing-evidence-service.js','utf8'),{URL,KRDeps:{register(name,api){assert.equal(name,'KRPublicListingEvidenceService');publicProvider=api;}}});
assert.equal(typeof publicProvider?.create,'function');
const PublicEvidence=publicProvider.create({URL});
const url='https://www.kleinanzeigen.de/s-anzeige/demo/123-12-34';
const wrong='https://www.kleinanzeigen.de/s-anzeige/demo/999-12-34';
function fixture(){
 let next=100,profile='Account One',mode='ready',restricted=false,pending=false;
 const events=[],created=[],registered=[],closed=[],requests=[],focus=[],records=new Map(),tabs=new Map();
 const ctx={URL,ManagedNavigation,normalBrowserWindowId:async()=>5,renewalAttemptState:()=>({attempt:1}),
  correlationContext:x=>x||{},sessionCorrelationContext:(_x,y)=>y||{},
  createAutomationTab:async opts=>{const id=++next;created.push({id,...opts});tabs.set(id,{id,url:opts.url,status:'complete'});return {id,windowId:5};},
  registerManagedWorkerTab:async(id,role,owner)=>{assert.equal(tabs.get(id).url,'about:blank');registered.push({id,role,owner});},
  updateAutomationTab:async(id,opts)=>{assert.ok(registered.some(x=>x.id===id));if(restricted){const e=Error('platform access restricted');e.code='KR_PLATFORM_ACCESS_RESTRICTED';throw e;}tabs.set(id,{id,url:opts.url,status:'complete'});},
  closeManagedWorkerTab:async id=>{closed.push(id);tabs.delete(id);},
  waitForRenewalPublicAdComplete:async()=>{},waitForExpectedTabComplete:async()=>{},ensureContentConnection:async()=>{},
  waitForRenewalPublicReadOnlyReady:async(id,expected)=>{assert.equal(expected,'123');tabs.get(id).url=mode==='ready'?url:wrong;return {ok:true,metadata:{sourceUrl:url},durationMs:2};},
  chrome:{tabs:{get:async id=>tabs.get(id)},windows:{update:async(id,v)=>focus.push([id,v.focused])}},
  sendTabRequestWithBootstrap:async(id,msg)=>{requests.push({id,type:msg.type,adId:msg.adId});if(msg.type==='MY_ADS_STATUS')return {isMyAdsPage:true,isProjectsTab:true,profileName:profile};if(msg.type==='FIND_OWN_AD_BY_ID')return {found:false,adId:msg.adId,page:1};throw Error('unexpected route');},
  normalizeProfileName:x=>String(x||'').trim(),isNonRetryableRenewalSafetyError:e=>e?.code==='KR_PLATFORM_ACCESS_RESTRICTED',
  normalizeKnownPublicAdUrl:PublicEvidence.normalizeKnownPublicAdUrl,directPublicUrlForAdId:PublicEvidence.directPublicUrlForAdId,publicUrlForInventoryRecord:PublicEvidence.publicUrlForInventoryRecord,
  getInventory:async id=>records.get(id)||null,waitForTabComplete:async id=>{if(pending)throw Error('fixture pending');return {url};},
  logDiagnostic:async(_l,event)=>events.push(event),
  READONLY_METADATA_TIMEOUT_MS:500,RENEWAL_PUBLIC_READONLY_READINESS_TIMEOUT_MS:500,TAB_LOAD_TIMEOUT_RENEWAL_MS:1000,RENEWAL_DIRECT_READONLY_TIMEOUT_MS:250,MY_ADS_PROJECTS_URL:'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS'};
 load(ctx,['renewalVerificationAttemptNumber','classifyRenewalVerificationFailure','renewalEvidenceFailureClass','createFreshRenewalVerificationTab','closeFreshRenewalVerificationTab','probeFreshRenewalPublicUrl','findRenewalAdInMyAdsFresh','resolveRenewalPublicEvidence','openEditAd','openReadOnlyAd']);
 return {ctx,events,created,registered,closed,requests,focus,records,setMode:v=>mode=v,setProfile:v=>profile=v,setRestricted:v=>restricted=v,setPending:v=>pending=v};
}
test('historical public evidence exact target, off-target, fresh registration/cleanup and wrong account',async()=>{
 const f=fixture(),s=f.ctx;
 assert.equal(s.renewalEvidenceFailureClass([{verificationClass:'off-target'}]),'off-target');
 assert.equal(s.renewalEvidenceFailureClass([{verificationClass:'transient-navigation-failure'},{verificationClass:'off-target'}]),'transient-navigation-failure');
 const good=await s.probeFreshRenewalPublicUrl(url,'123','canonical');assert.equal(good.ok,true);assert.equal(good.verificationClass,'confirmed');assert.equal(good.freshTab,true);assert.equal(good.observedAdId,'123');assert.equal(f.created[0].url,'about:blank');assert.equal(f.closed.length,1);
 f.setMode('off-target');const bad=await s.probeFreshRenewalPublicUrl(url,'123','canonical');assert.equal(bad.ok,false);assert.equal(bad.verificationClass,'off-target');assert.equal(bad.observedAdId,'999');assert.equal(f.closed.length,2);
 const unresolved=await s.resolveRenewalPublicEvidence('123','Account One',{newPublicUrl:url});assert.equal(unresolved.verificationClass,'off-target');assert.equal(unresolved.ownAdsPresence,false);assert.equal(unresolved.method,'public-unresolved');assert.ok(f.requests.some(x=>x.type==='FIND_OWN_AD_BY_ID'&&x.adId==='123'));
 const before=f.requests.filter(x=>x.type==='FIND_OWN_AD_BY_ID').length;f.setProfile('Other Account');
 const mismatch=await s.resolveRenewalPublicEvidence('123','Account One',{newPublicUrl:''});assert.equal(mismatch.myAds.found,null);assert.equal(mismatch.ownAdsPresence,null);assert.equal(f.requests.filter(x=>x.type==='FIND_OWN_AD_BY_ID').length,before);
 f.setRestricted(true);await assert.rejects(s.probeFreshRenewalPublicUrl(url,'123','canonical'),/platform access restricted/);
 assert.equal(f.created.length,f.registered.length);assert.equal(f.created.length,f.closed.length);assert.equal(new Set(f.closed).size,f.closed.length);
 assert.ok(f.events.includes('RENEWAL_PUBLIC_VERIFICATION_CONFIRMED'));
});
test('historical manual navigation exact ID, trusted inventory URL priority and pending evidence',async()=>{
 const f=fixture(),s=f.ctx;
 await assert.rejects(s.openEditAd({adId:'bad'}),/Anzeigen-ID/);await assert.rejects(s.openReadOnlyAd({adId:'bad'}),/Anzeigen-ID/);assert.equal(f.created.length,0);
 const edit=await s.openEditAd({adId:'123'});assert.equal(edit.adId,'123');assert.match(f.created[0].url,/p-anzeige-bearbeiten\.html\?adId=123/);
 f.records.set('inv',{adId:'123',publicUrl:url});
 const normal=await s.openReadOnlyAd({adId:'123',inventoryId:'inv',publicUrl:'https://evil.invalid/123'});assert.equal(normal.urlSource,'inventory-public-url');assert.equal(normal.finalUrl,url);assert.equal(normal.url,url);
 f.setPending(true);const pending=await s.openReadOnlyAd({adId:'123',inventoryId:'absent',publicUrl:wrong});assert.equal(pending.urlSource,'id-fallback');assert.equal(pending.url,'https://www.kleinanzeigen.de/s-anzeige/123');assert.ok(f.events.includes('READONLY_AD_NAVIGATION_PENDING'));assert.equal(f.focus.length,3);
 assert.ok(f.created.every(x=>x.active===true));assert.equal(f.closed.length,0,'manual user tabs remain open');
});
