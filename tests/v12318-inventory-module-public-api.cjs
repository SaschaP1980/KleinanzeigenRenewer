'use strict';
const assert=require('node:assert/strict');
require('../src/shared/runtime-deps.js');
const Roster=require('../src/content/inventory-roster-parser.js');
const Readiness=require('../src/content/inventory-readiness.js');
const Overlay=require('../src/content/inventory-status-overlay.js');
const DeleteOps=require('../src/content/inventory-delete-operations.js');
const RunLoop=require('../src/content/inventory-run-loop.js');
let passed=0;const pass=s=>{passed++;console.log('PASS '+s)};
const noop=()=>{}; const asyncNoop=async()=>{};
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();

class FakeElement {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.style={};this.dataset={};this.attrs={};this.textContent='';this.innerText='';this.disabled=false;this.parentElement=null;this.lastElementChild=null;}
  set id(v){this._id=String(v); if(global.__elements) global.__elements.set(this._id,this);} get id(){return this._id||'';}
  append(...els){for(const e of els){if(e&&typeof e==='object')e.parentElement=this;this.children.push(e);}this.lastElementChild=this.children.at(-1)||null;}
  replaceChildren(...els){this.children=[];this.append(...els);}
  remove(){this.removed=true;}
  setAttribute(k,v){this.attrs[k]=String(v);} getAttribute(k){return this.attrs[k]??null;} removeAttribute(k){delete this.attrs[k];}
  addEventListener(type,fn){this['on'+type]=fn;}
  querySelector(){return null;} querySelectorAll(){return [];} matches(){return false;} closest(){return null;} click(){this.clicked=true;}
}
global.__elements=new Map();
global.location={href:'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS',pathname:'/m-meine-anzeigen.html'};
global.sessionStorage={_m:new Map(),getItem(k){return this._m.get(k)||null;},setItem(k,v){this._m.set(k,String(v));}};
global.document={
  body:{innerText:'0 Anzeigen online / 0 gesamt',textContent:'0 Anzeigen online / 0 gesamt'},
  documentElement:new FakeElement('html'),
  createElement:tag=>new FakeElement(tag),
  getElementById:id=>global.__elements.get(id)||null,
  querySelector:()=>null,
  querySelectorAll:()=>[]
};
global.MutationObserver=undefined;
global.addEventListener=noop;
global.chrome={runtime:{sendMessage(){},lastError:null},storage:{onChanged:{addListener:noop}}};

(async()=>{
  const roster=Roster.create({MY_ADS_PATH:'/m-meine-anzeigen.html',PAGE_CHANGE_TIMEOUT_MS:1,normalize:clean,normalizeKey:v=>clean(v).toLocaleLowerCase('de-DE'),sleep:asyncNoop});
  assert.deepEqual(Object.keys(roster).sort(),['isMyAdsUrl','isMyAdsProjectsUrl','parseOnlineCount','adIdFromHref','editUrlForAdId','detectedProfileName','publicUrlFromRoot','currentPageNumber','nextPageButton','isDisabledControl','endDateFromRoot','scanListings','pageFingerprint','waitForPageChange','waitForListings'].sort());
  assert.equal(roster.isMyAdsUrl(),true);assert.equal(roster.isMyAdsProjectsUrl(),true);
  assert.deepEqual(roster.parseOnlineCount('12 Anzeigen online / 15 gesamt'),{online:12,total:15});
  assert.equal(roster.adIdFromHref('/p-anzeige-bearbeiten.html?adId=123456'),'123456');
  assert.match(roster.editUrlForAdId('123456'),/adId=123456/);
  const profileRoot={querySelectorAll:()=>[{textContent:'Angemeldet als: konto@example.test Ausloggen'}],body:{innerText:''}};
  assert.equal(roster.detectedProfileName(profileRoot),'konto@example.test');
  const publicLink={getAttribute:()=>'/s-anzeige/test/123456-1-2'};
  const publicRoot={querySelectorAll:()=>[publicLink],ownerDocument:null};
  assert.match(roster.publicUrlFromRoot(publicRoot,'123456'),/123456-1-2/);
  const pageRoot={querySelector:()=>({textContent:'2'})};assert.equal(roster.currentPageNumber(pageRoot),2);
  const next={getAttribute:()=>null};const navRoot={querySelector:()=>next};assert.equal(roster.nextPageButton(navRoot),next);assert.equal(roster.isDisabledControl(next),false);
  assert.deepEqual(roster.endDateFromRoot({innerText:'Endet am 31.12.2026'}),{endDateDisplay:'31.12.2026',endDateIso:'2026-12-31'});
  const emptyRoot={querySelectorAll:()=>[],querySelector:()=>null};assert.deepEqual(roster.scanListings(emptyRoot),[]);assert.equal(roster.pageFingerprint(emptyRoot),'');
  assert.equal(await roster.waitForPageChange(1,''),false);assert.deepEqual(await roster.waitForListings(),[]);
  pass('all fifteen roster/parser public methods execute through their public API');

  const readiness=Readiness.create({
    MyAdsReadiness:{evaluateMyAdsReadiness:()=>({state:'ready',onlineCount:0,profileName:'konto@example.test'})},MY_ADS_READY_TIMEOUT_MS:10,MY_ADS_ZERO_STABILITY_MS:0,MY_ADS_SAFETY_RECHECK_MS:50,
    normalize:clean,normalizeKey:v=>clean(v).toLocaleLowerCase('de-DE'),parseOnlineCount:roster.parseOnlineCount,scanListings:()=>[],isMyAdsUrl:()=>true,isMyAdsProjectsUrl:()=>true,currentPageNumber:()=>1,isDisabledControl:()=>true,nextPageButton:()=>null,detectedProfileName:()=> 'konto@example.test'
  });
  assert.deepEqual(Object.keys(readiness).sort(),['currentMyAdsStatusSnapshot','readinessError','waitForMyAdsReady','validateFreshBulkSnapshot'].sort());
  const snap=readiness.currentMyAdsStatusSnapshot();assert.equal(snap.expectedOnline,0);assert.equal(snap.isProjectsTab,true);
  const err=readiness.readinessError({state:'pending',reason:'wait',reasonCode:'pending'},undefined,snap,0);assert.equal(err.code,'KR_MY_ADS_NOT_READY');
  const ready=await readiness.waitForMyAdsReady({expectedProfileName:'konto@example.test',expectedOnline:0,timeoutMs:10});assert.equal(ready.expectedOnline,0);
  assert.deepEqual(readiness.validateFreshBulkSnapshot({expectedTotal:0,listings:[],hasNextPage:false,detectedProfile:'konto@example.test',expectedProfile:'konto@example.test'}),{expectedTotal:0,listingCount:0,hasNextPage:false,profileName:'konto@example.test'});
  assert.throws(()=>readiness.validateFreshBulkSnapshot({expectedTotal:1,listings:[],hasNextPage:false,detectedProfile:'A',expectedProfile:'B'}),/Kleinanzeigen-Konto/);
  pass('all four readiness public methods execute including fail-closed profile mismatch');

  let runtimeCalls=[];
  const overlay=Overlay.create({normalizeKey:v=>clean(v).toLocaleLowerCase('de-DE'),runtimeMessage:async m=>{runtimeCalls.push(m);return null;},isMyAdsUrl:()=>false,scanListings:()=>[]});
  assert.deepEqual(Object.keys(overlay).sort(),['refreshFailureHighlights','renderOverlay'].sort());
  await overlay.refreshFailureHighlights();
  overlay.renderOverlay({runId:'r1',status:'running',stage:'scanning-page',processedIds:[],expectedTotal:0},'Erfassung läuft');
  assert.ok(global.__elements.get('kr-bulk-inventory-status'));pass('both failure/status overlay public methods execute through their public API');

  const diagnostics=[];
  const deleteOps=DeleteOps.create({
    MAX_PHASE4_PAGES:3,sleep:asyncNoop,normalize:clean,normalizeKey:v=>clean(v).toLocaleLowerCase('de-DE'),diagnostic:(e,d,s,c)=>diagnostics.push({e,d,s,c}),
    isMyAdsProjectsUrl:()=>true,scanListings:()=>[],currentPageNumber:()=>1,pageFingerprint:()=>'',nextPageButton:()=>null,isDisabledControl:()=>true,waitForPageChange:async()=>false,waitForListings:async()=>[],parseOnlineCount:()=>({online:0,total:0}),detectedProfileName:()=> 'konto@example.test'
  });
  assert.deepEqual(Object.keys(deleteOps).sort(),['snapshotOwnAdRoster','deleteOwnAdById','findOwnAdById','verifyOwnAdAbsentById'].sort());
  const rosterResult=await deleteOps.snapshotOwnAdRoster({operationId:'op'});assert.equal(rosterResult.complete,true);assert.deepEqual(rosterResult.ids,[]);
  const absentDelete=await deleteOps.deleteOwnAdById('123456',{operationId:'op'});assert.equal(absentDelete.actionTriggered,false);assert.equal(absentDelete.alreadyAbsentCandidate,true);
  const found=await deleteOps.findOwnAdById('123456',{});assert.equal(found.found,false);
  const verified=await deleteOps.verifyOwnAdAbsentById('123456',{});assert.equal(verified.verified,true);
  await assert.rejects(()=>deleteOps.deleteOwnAdById('bad',{}),/ungültig/);
  pass('all four delete/verification public methods execute with no-click absent and invalid-id fail-closed paths');

  const loopMessages=[];let overlays=0;let highlights=0;
  const run=RunLoop.create({
    RUN_POLL_MS:1,WORKER_TIMEOUT_MS:5,WORKER_REQUEST_TIMEOUT_MS:2,sleep:asyncNoop,
    runtimeMessage:async m=>{loopMessages.push(m);if(m.type==='BULK_INIT_RUN')return {runId:'r1',status:'complete',stage:'complete',expectedTotal:0};if(m.type==='GET_BULK_RUN_FOR_SOURCE')return null;return null;},
    runtimeMessageWithTimeout:asyncNoop,diagnostic:noop,MyAdsReadiness:{evaluateMyAdsReadiness:()=>({state:'ready',onlineCount:0,profileName:'konto@example.test'})},
    isMyAdsUrl:()=>true,currentPageNumber:()=>1,scanListings:()=>[],nextPageButton:()=>null,isDisabledControl:()=>true,pageFingerprint:()=>'',waitForPageChange:async()=>false,waitForListings:async()=>[],
    waitForMyAdsReady:async()=>({expectedOnline:0,hasNext:false,profileName:'konto@example.test',observedAt:'2026-10-01T00:00:00.000Z',readinessWaitMs:1}),
    validateFreshBulkSnapshot:()=>({expectedTotal:0,listingCount:0,hasNextPage:false,profileName:'konto@example.test'}),readinessError:()=>new Error('not-ready'),renderOverlay:()=>{overlays++;},refreshFailureHighlights:async()=>{highlights++;}
  });
  assert.deepEqual(Object.keys(run).sort(),['runLoop','startBulkInventoryFromFreshSource','autoResume'].sort());
  await run.runLoop(null);const started=await run.startBulkInventoryFromFreshSource('konto@example.test','op','safe','new-only');assert.equal(started.runId,'r1');await new Promise(r=>setImmediate(r));
  await run.autoResume();assert.ok(loopMessages.some(m=>m.type==='BULK_INIT_RUN'));assert.ok(highlights>=1);
  const reconciliationMessages=[];
  const failClosedRun=RunLoop.create({
    RUN_POLL_MS:1,WORKER_TIMEOUT_MS:5,WORKER_REQUEST_TIMEOUT_MS:2,sleep:asyncNoop,
    runtimeMessage:async m=>{reconciliationMessages.push(m);if(m.type==='BULK_FAIL_RUN')return {status:'failed',stage:'reconciliation-failed'};return null;},runtimeMessageWithTimeout:asyncNoop,diagnostic:noop,
    MyAdsReadiness:{evaluateMyAdsReadiness:()=>({state:'invalid',reason:'profile mismatch',reasonCode:'profile-mismatch'})},isMyAdsUrl:()=>true,currentPageNumber:()=>1,scanListings:()=>[],nextPageButton:()=>null,isDisabledControl:()=>true,pageFingerprint:()=>'',waitForPageChange:async()=>false,waitForListings:async()=>[],
    waitForMyAdsReady:async()=>({expectedOnline:0,profileName:'wrong'}),validateFreshBulkSnapshot:()=>({}),readinessError:()=>new Error('reconciliation-not-ready'),renderOverlay:noop,refreshFailureHighlights:asyncNoop
  });
  await failClosedRun.runLoop({status:'running',stage:'reconciliation-ready',profileName:'konto@example.test',expectedTotal:0},null);
  assert.ok(reconciliationMessages.some(m=>m.type==='BULK_FAIL_RUN'&&/reconciliation-not-ready/.test(m.error)));
  pass('all three bulk/reconciliation run-loop public methods execute including reconciliation fail-closed');

  console.log(`${passed}/5 PASS v1.23.18 inventory module public API closure`);
})().catch(error=>{console.error(error);process.exitCode=1;});
