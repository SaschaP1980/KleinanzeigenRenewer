'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const when='2026-11-26T20:00:00Z';
function actualFunction(path,name,context){
 const s=read(path);
 const pattern=new RegExp('^async function '+name+'\\([^\\n]*\\) \\{\\n[\\s\\S]*?^\\}','m');
 const found=s.match(pattern);assert.ok(found,'missing '+name);
 return vm.runInNewContext('('+found[0]+')',{Date,structuredClone,...context});
}
function captureFixture({stale=false}={}){
 const listeners={},messages=[],timers=[];let clicks=0,submits=0;
 class Button{constructor(){this.textContent='Anzeige aufgeben';this.disabled=false;this.isConnected=true;}closest(){return this;}scrollIntoView(){}click(){clicks++;const e=dispatch('click');if(!e.defaultPrevented){const s=dispatch('submit');if(!s.defaultPrevented)submits++;}}}
 const button=new Button();
 function dispatch(type,submitter=button){const event={target:button,submitter,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){}};listeners[type]?.(event);return event;}
 const ctx=vm.createContext({console,Element:Button,HTMLInputElement:class extends Button{},document:{addEventListener:(type,fn)=>listeners[type]=fn,querySelectorAll:()=>[button]},location:{pathname:'/p-anzeige-aufgeben-schritt2.html'},setTimeout:fn=>{timers.push(fn);return 1;},KRDeps:{register(_n,api){ctx.Flow=api;}}});
 vm.runInContext(read('src/content/template-publish-flow.js'),ctx);
 const api=ctx.Flow.create({clean:String,visible:()=>true,visibleText:b=>b.textContent,sleep:async()=>{},diagnostic:()=>{},updatePanel:()=>{},runtimeMessage:async m=>{messages.push(structuredClone(m));if(stale&&m.type==='UPDATE_TEMPLATE_FILL_SESSION')return {status:'running',stage:'publish-submitted',staleUpdateIgnored:true};return {accepted:true,status:'running',stage:m.stage};}});
 return {api,button,dispatch,messages,timers,clicks:()=>clicks,submits:()=>submits};
}
const managed={fillId:'f',renewalId:'r',stage:'form-verified',result:{complete:true,issues:[]}};
test('S06 managed auto publish accepts one normal verified click and native submit',async()=>{
 const h=captureFixture();await h.api.autoPublishVerifiedRenewal(managed);
 assert.equal(h.clicks(),1);assert.equal(h.submits(),1);assert.equal(h.messages.filter(m=>m.type==='RENEWAL_PUBLISH_CLICKED').length,1);
});
test('S06 ignored stale auto-publish-ready write must not trigger browser publish',async()=>{
 const h=captureFixture({stale:true});await h.api.autoPublishVerifiedRenewal(managed).catch(()=>{});
 assert.equal(h.clicks(),0);assert.equal(h.submits(),0);
});
test('S06 repeated auto publish on same managed document must not submit a second time',async()=>{
 const h=captureFixture();await h.api.autoPublishVerifiedRenewal(managed);await h.api.autoPublishVerifiedRenewal(managed).catch(()=>{});
 assert.equal(h.submits(),1);
});
function publishFixture({fill={},renewal={}}={}){
 let fills={f:{fillId:'f',renewalId:'r',targetTabId:42,status:'running',stage:'auto-publish-ready',...fill}};
 let sessions={r:{renewalId:'r',sourceAdId:'100',targetTabId:42,status:'draft',stage:'awaiting-publish',...renewal}};
 const writes=[];
 const handler=actualFunction('src/background/controllers/renewal-workflow-controller.js','markRenewalPublishClicked',{
  readFillSessions:async()=>structuredClone(fills),writeFillSessions:async x=>{fills=structuredClone(x);writes.push('fill');},
  readRenewalSessions:async()=>structuredClone(sessions),persistRenewalSession:async x=>{sessions[x.renewalId]=structuredClone(x);writes.push('renewal');},
  legacyOutcomeBlocked:()=>false,sendRenewalFeedback:async()=>{}
 });
 return {run:tabId=>handler({fillId:'f'},{tab:{id:tabId}}),fills:()=>fills,sessions:()=>sessions,writes};
}
test('S06 direct publish notification positive and wrong-tab negative',async()=>{
 const h=publishFixture();await assert.rejects(h.run(99));assert.deepEqual(h.writes,[]);
 await h.run(42);assert.equal(h.fills().f.stage,'publish-submitted');assert.equal(h.sessions().r.status,'submitted');
});
test('S06 delayed duplicate publish notification may not regress confirmed identity or terminal cancellation',async()=>{
 for(const patch of [
  {fill:{status:'complete',stage:'new-id-confirmed',newAdId:'200'},renewal:{status:'verified',stage:'replacement-ready',newAdId:'200',publishClickedAt:when}},
  {fill:{status:'error',stage:'manual-emergency-reset'},renewal:{status:'cancelled',stage:'emergency-reset-unverified',publishClickedAt:when}}
 ]){
  const h=publishFixture(patch),before=structuredClone([h.fills(),h.sessions()]);
  await h.run(42).catch(()=>{});
  assert.deepEqual([h.fills(),h.sessions()],before);
  assert.deepEqual(h.writes,[]);
 }
});
function discardFixture({renewal={},fill={},failRead=false}={}){
 let sessions={r:{renewalId:'r',sourceInventoryId:'100',sourceAdId:'100',skeletonInventoryId:'renewal:r',fillId:'f',targetTabId:42,status:'draft',stage:'target-tab-opened',...renewal}};
 let fills={f:{fillId:'f',renewalId:'r',targetTabId:42,stage:'form-ready',...fill}};
 const calls=[];
 const fn=actualFunction('src/background/background.js','discardRenewalDraft',{
  readRenewalSessions:async()=>structuredClone(sessions),getBulkRunState:async()=>({status:'complete'}),
  readFillSessions:async()=>{if(failRead)throw Error('fixture storage read failed');return structuredClone(fills);},
  writeFillSessions:async x=>{fills=structuredClone(x);calls.push('fill-write');},writeRenewalSessions:async x=>{sessions=structuredClone(x);calls.push('renewal-write');},
  deleteInventoryStorageRecord:async id=>calls.push(['delete-local',id]),closeRegistryTab:async id=>calls.push(['close-owned-tab',id]),
  logDiagnostic:async()=>{},sessionCorrelationContext:()=>({}),broadcastInventoryChanged:()=>{}
 });
 return {run:()=>fn({renewalId:'r'}),sessions:()=>sessions,fills:()=>fills,calls};
}
test('S06 existing local-only discard removes just draft and its fill, not source or remote listing',async()=>{
 const h=discardFixture();const r=await h.run();assert.equal(r.discarded,true);assert.deepEqual(h.calls,['fill-write','renewal-write',['delete-local','renewal:r'],['close-owned-tab',42]]);assert.deepEqual(h.sessions(),{});assert.deepEqual(h.fills(),{});
});
test('S06 existing discard refuses explicit submitted or confirmed target',async()=>{
 for(const renewal of [{status:'submitted'},{newAdId:'200'},{stage:'publish-submitted'}]){
  const h=discardFixture({renewal});await assert.rejects(h.run());assert.deepEqual(h.calls,[]);
 }
});
test('S06 discard must preserve persisted publish evidence even after failure or fill-only acknowledgement',async()=>{
 for(const options of [{renewal:{status:'verification-failed',stage:'fast-presence-failed',publishClickedAt:when}},{fill:{stage:'publish-submitted',publishClickedAt:when}},{failRead:true}]){
  const h=discardFixture(options),before=structuredClone([h.sessions(),h.fills()]);
  await h.run().catch(()=>{});
  assert.deepEqual(h.calls,[],JSON.stringify(options));assert.deepEqual([h.sessions(),h.fills()],before);
 }
});
const Remote=require('../src/background/services/remote-delete-replacement-service.js');
test('S06 independent absence proof cannot certify a different returned source ID',async()=>{
 const sent=[],closed=[];
 const api=Remote.create({createManagedWorkerTab:async()=>({id:42}),waitForTabComplete:async()=>{},ensureContentConnection:async()=>{},closeManagedWorkerTab:async id=>closed.push(id),correlationContext:()=>({}),sessionCorrelationContext:()=>({}),normalizeProfileName:String,renewalMaxPhaseAttempts:()=>1,logDiagnostic:async()=>{},
 sendTabRequestWithBootstrap:async(id,m)=>{sent.push(m);if(m.type==='MY_ADS_STATUS')return {isMyAdsPage:true,isProjectsTab:true,profileName:'Owner'};return {verified:true,adId:'999',pagesScanned:1,evidence:'not-in-my-ads-full-pagination-scan'};}});
 const proof=await api.verifyRenewalSourceAbsenceFresh({renewalId:'r',sourceAdId:'100',newAdId:'200'},'Owner',null,{attempt:1}).catch(()=>null);
 assert.notEqual(proof?.verified,true);assert.deepEqual(closed,[42]);
});
