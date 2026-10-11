const assert=require('assert'),fs=require('fs'),vm=require('vm');
const ArchiveVerificationService=require('../src/background/services/archive-insertion-verification-service.js');
const ArchiveRecoveryService=require('../src/background/services/archive-insertion-recovery-service.js');
let API=null;
const ctx={console,Date,Promise,Set,Map,Object,Array,String,Number,Boolean,RegExp,Error,URL,Uint8Array,KRDeps:{register(n,a){if(n==='KRArchiveInsertionController')API=a;}}};ctx.globalThis=ctx;
vm.createContext(ctx);vm.runInContext(fs.readFileSync('archive-insertion-controller.js','utf8'),ctx,{filename:'archive-insertion-controller.js'});assert.ok(API?.create);
let archiveSessions={}, fillSessions={}, diagnostics=[], broadcasts=[], notices=[]; let uuid=0;
const asyncNoop=async()=>{}; const noop=()=>{};
const profile={profileId:'p1',displayName:'Alice'};
const deps={
 readArchiveInsertionSessions:async()=>archiveSessions,writeArchiveInsertionSessions:async s=>{archiveSessions=s},archiveInsertionPublicSnapshot:s=>s?{archiveInsertionId:s.archiveInsertionId,status:s.status,stage:s.stage,newAdId:s.newAdId||null}:null,persistArchiveInsertionSession:async s=>{archiveSessions[s.archiveInsertionId]=s;return s},archiveInsertionMeta:s=>({confirmedAt:s.newIdConfirmedAt||null}),
 getInventory:async()=>null,isTrashRecord:()=>false,getInventoryImage:async()=>null,deleteImagesByInventoryId:asyncNoop,assertTemplateSourceReady:noop,inventoryImageSetExplicitlyEmpty:()=>true,
 compareRenewalRecords:async()=>({status:'match',matches:['title'],mismatches:[],uncertainties:[]}),normalizedScalar:v=>v==null?v:String(v).trim(),normalizedComparableBoolean:v=>Boolean(v),normalizeProfileName:v=>String(v||'').trim(),normalizeRenewalMode:v=>v==='fast'?'fast':'safe',ensureProfile:async()=>profile,saveInventory:async r=>r,openDatabase:async()=>({close(){},transaction(){throw new Error('not used')}}),
 normalBrowserWindowId:async()=>1,createManagedWorkerTab:async()=>({id:21}),closeManagedWorkerTab:asyncNoop,waitForTabComplete:asyncNoop,ensureContentConnection:asyncNoop,sendTabRequestWithBootstrap:async(tab,msg)=>msg.type==='MY_ADS_STATUS'?{isMyAdsPage:true,isProjectsTab:true,profileName:'Alice'}:{found:true,editUrl:'https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=999',publicUrl:'https://www.kleinanzeigen.de/s-anzeige/x/999-1-2'},updateAutomationTab:asyncNoop,reloadAutomationTab:asyncNoop,
 createAutomationTab:async()=>({id:11}),registerShadowTab:asyncNoop,closePublishedRenewalTargetTab:asyncNoop,assertSelectedProfileMatchesLiveAccount:asyncNoop,getRenewalConfiguration:async()=>({renewalMode:'safe'}),withInsertionStartGate:fn=>fn(),assertInsertionStartAvailable:asyncNoop,
 readFillSessions:async()=>fillSessions,writeFillSessions:async s=>{fillSessions=s},detectPublishedAdForFill:async()=>null,correlationContext:(...xs)=>Object.assign({},...xs.filter(x=>x&&typeof x==='object')),sessionCorrelationContext:(s,e={})=>({...e}),delay:asyncNoop,logDiagnostic:async(level,event,details)=>{diagnostics.push({level,event,details})},setAppNotice:async x=>{notices.push(x)},broadcastInventoryChanged:(...x)=>broadcasts.push(x),
 cryptoApi:{randomUUID:()=>`00000000-0000-4000-8000-${String(++uuid).padStart(12,'0')}`,subtle:require('crypto').webcrypto.subtle},chromeApi:{tabs:{get:async()=>({url:'https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=999'}),remove:asyncNoop}},
 MY_ADS_PROJECTS_URL:'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS',TAB_LOAD_TIMEOUT_RENEWAL_MS:1000,BULK_RETRY_TIMEOUT_MS:50,BULK_RETRY_POLL_MS:1,RENEWAL_MODE_FAST:'fast',TEMPLATE_TARGET_URL:'https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html',TAB_ROLES:{ARCHIVE_TARGET:'archive-target'},INVENTORY_STORE:'inventories',IMAGE_STORE:'images',
 archiveInsertionVerificationServiceApi:ArchiveVerificationService,archiveInsertionRecoveryServiceApi:ArchiveRecoveryService
};
const ctl=API.create(deps); let n=0; const pass=l=>{n++;console.log('PASS '+l)};
(async()=>{
 const cmp=await ctl.compareArchiveInsertionRecords({buyNow:{value:true},locationData:{street:'A',locationId:'1',addressVisibility:false}},{buyNow:{value:true},locationData:{street:'A',locationId:'1',addressVisibility:false}});assert.equal(cmp.status,'match');assert.equal(cmp.verificationScope,'archive-managed-fields');pass('managed-field comparison');
 assert.equal(ctl.normalizeArchiveEditUrl('https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=999','999').includes('adId=999'),true);assert.equal(ctl.normalizeArchiveEditUrl('https://example.com/x','999'),'');pass('edit url authority');
 const staging=await ctl.assertArchiveStagingReady({profileName:' Alice ',images:[],imageSummary:{explicitlyEmpty:true}},'archive:x');assert.deepEqual(JSON.parse(JSON.stringify(staging)),{sourceProfileName:'Alice',imageCount:0});pass('empty staging validation');
 const started=await ctl.startArchiveInsertion({archiveInsertionId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',stagingInventoryId:'archive:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',archiveType:'kleinanzeigen-renewal-inventory-export',archiveVersion:1,record:{adId:'123',title:'T',profileName:'Alice',images:[],imageSummary:{explicitlyEmpty:true}}});assert.equal(started.status,'draft');assert.equal(Object.values(fillSessions).length,1);assert.equal(Object.values(fillSessions)[0].status,'waiting');pass('gated archive start creates session and fill');
 const edit=await ctl.assertArchiveEditTab(21,'999');assert.ok(edit.includes('adId=999'));assert.ok(diagnostics.some(x=>x.event==='ARCHIVE_INSERT_EDIT_MODE_CONFIRMED'));pass('edit tab verification');
 const session={archiveInsertionId:'b',status:'complete',stage:'complete',newAdId:'999'};archiveSessions={b:session};await ctl.resumePendingArchiveInsertions();assert.equal(session.status,'complete');pass('terminal recovery is inert');
 console.log(`${n}/6 PASS v1.23.5 archive insertion controller runtime`);
})().catch(e=>{console.error(e);process.exitCode=1});
