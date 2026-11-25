'use strict';
// Actual baseline safety behavior, no excluded journal or P8 dependencies.
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
function capture(){
 const listeners={},signals=[];class Button{constructor(){this.textContent='Anzeige aufgeben';this.disabled=false;this.isConnected=true;}closest(){return this;}}
 const ctx=vm.createContext({console,Element:Button,HTMLInputElement:class extends Button{},document:{addEventListener:(type,fn)=>listeners[type]=fn},setTimeout:()=>0,KRDeps:{register(_n,api){ctx.Flow=api;}}});
 vm.runInContext(read('src/content/template-publish-flow.js'),ctx,{filename:'template-publish-flow.js'});
 const flow=ctx.Flow.create({clean:String,visible:()=>true,diagnostic:()=>{},updatePanel:()=>{},runtimeMessage:async m=>{signals.push(m);return {accepted:true};}});
 flow.armPublishDetection('managed');const button=new Button();
 const dispatch=(type,submitter=button)=>{const event={target:button,submitter,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},stopImmediatePropagation(){}};listeners[type](event);return event;};
 return {dispatch,signals};
}
test('managed publication: first click/native submit may pass, second explicit submit must not replay',()=>{
 const f=capture();f.dispatch('click');assert.equal(f.dispatch('submit').defaultPrevented,false);assert.equal(f.signals.length,1);
 assert.equal(f.dispatch('submit').defaultPrevented,true,'second submit not blocked');
});
test('managed publication: second implicit submit with null submitter must not replay',()=>{
 const f=capture();f.dispatch('click');assert.equal(f.dispatch('submit').defaultPrevented,false);
 assert.equal(f.dispatch('submit',null).defaultPrevented,true,'implicit duplicate submit not blocked');
});
test('managed initial/reentry publication capture must be armed before asynchronous work; not for user-owned template-only',async()=>{
 const body=read('src/content/template-filler.js'),a=body.indexOf('async function runPendingFill()'),b=body.indexOf('const API = Object.freeze(',a);assert.ok(a>=0&&b>a);
 for(const [session,kind,expected] of [[{renewalId:'r'},'target','fill'],[{archiveInsertionId:'a'},'target','fill'],[{renewalId:'r',stage:'auto-publish-ready'},'post-fill','postfill'],[{templateOnly:true},'target','fill']]){
  const events=[];const fn=vm.runInNewContext(body.slice(a,b)+'\nrunPendingFill;',{armMassRenewalHeartbeat:()=>{},pageKind:()=>kind,runtimeMessage:async()=>({fillId:'f',stage:'form-ready',...session}),activeCorrelationContext:{},panelTemplateOnly:false,panelArchiveInsertion:false,armPublishDetection:id=>events.push('armed:'+id),runFillSession:async()=>events.push('fill'),runPostFillSession:async()=>events.push('postfill')});
  await fn();assert.deepEqual(events,session.templateOnly?[expected]:['armed:f',expected]);
 }
});
function fastFixture({presence='found',switchOnScan=false,profile='Owner',newId='200'}={}){
 const ctx=vm.createContext({console});vm.runInContext(read('src/shared/runtime-deps.js'),ctx,{filename:'runtime-deps.js'});vm.runInContext(read('src/background/services/renewal-verification-flow.js'),ctx,{filename:'renewal-verification-flow.js'});
 const row={renewalId:'r',sourceInventoryId:'old',skeletonInventoryId:'new',sourceAdId:'100',newAdId:newId,renewalMode:'fast',status:'new-id-confirmed',autoReplacementAllowed:true};const calls=[],scheduled=[],writes=[],closed=[];let attempts=0,live=profile;
 const noop=async()=>{},empty=()=>({});const api=ctx.KRDeps.require('KRRenewalVerificationFlow').create({
  sessionPort:{readRenewalSessions:async()=>({r:row})},inventoryPort:{broadcastInventoryChanged:()=>{},putInventoryRecordOnly:async r=>writes.push(structuredClone(r)),getInventory:async id=>({inventoryId:id,adId:id==='old'?'100':null,profileName:'Owner',profileId:'p'})},
  tabPort:{ensureContentConnection:noop,createManagedWorkerTab:async()=>({id:73}),retirePublishedRenewalTargetTab:noop,normalBrowserWindowId:async()=>null,closeManagedWorkerTab:async id=>closed.push(id),waitForTabComplete:noop,sendTabRequestWithBootstrap:async(_id,m)=>{calls.push(m);if(m.type==='MY_ADS_STATUS')return {isMyAdsPage:true,isProjectsTab:true,profileName:live};if(m.type==='FIND_OWN_AD_BY_ID'){if(switchOnScan)live='Other';if(presence==='unavailable')throw Error('fixture network');return {found:presence!=='absent',adId:presence==='wrong-id'?'999':m.adId,page:1,pagesScanned:2};}throw Error('unexpected request');}},
  diagnosticsPort:{logDiagnostic:noop,sessionCorrelationContext:empty,logRenewalPhaseAttemptFailed:noop,correlationContext:empty,logRenewalPhaseAttemptStarted:async()=>({attempt:++attempts,attemptId:'a'})},
  policyPort:{normalizeRenewalMode:x=>x,isNonRetryableRenewalSafetyError:()=>true,renewalMaxPhaseAttempts:()=>1,renewalPhaseRetryDelayMs:()=>0,renewalAttemptState:()=>({attempt:attempts}),normalizeProfileName:s=>String(s||'').trim(),renewalAttemptDetails:empty,renewalPhaseAttemptAvailable:()=>attempts===0},
  validationPort:{renewalInsertionMeta:empty,renewalPublicSnapshot:s=>structuredClone(s)},flowPort:{persistRenewalSession:noop,scheduleAutomaticRenewalReplacement:id=>scheduled.push(id),sendRenewalFeedback:noop},configPort:{TAB_LOAD_TIMEOUT_RENEWAL_MS:100,RENEWAL_MODE_FAST:'fast',MY_ADS_PROJECTS_URL:'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS'},miscPort:{delay:noop}
 });return {run:()=>api.runFastRenewalVerification('r'),row,calls,scheduled,writes,closed};
}
test('Fast presence positive and negative controls: absent/failed/incorrect account and missing target never schedule replacement',async()=>{
 for(const opts of [{presence:'absent'},{presence:'unavailable'},{profile:'Other'},{newId:''}]){const f=fastFixture(opts);await assert.rejects(f.run());assert.equal(f.scheduled.length,0);assert.equal(f.writes.length,0);if(opts.newId!=='')assert.deepEqual(f.closed,[73]);}
 const f=fastFixture();await f.run();assert.deepEqual(f.scheduled,['r']);assert.equal(f.writes[0].adId,'200');assert.equal(f.row.status,'verified');assert.deepEqual(f.closed,[73]);
});
test('Fast presence must reject wrong exact target ID before marking verified or scheduling deletion',async()=>{
 const f=fastFixture({presence:'wrong-id'});await f.run().catch(()=>{});assert.equal(f.scheduled.length,0,'mismatched target evidence authorized replacement');assert.equal(f.writes.length,0);
});
test('Fast presence must not authorize replacement if live account changes during roster read',async()=>{
 const f=fastFixture({switchOnScan:true});await f.run().catch(()=>{});assert.equal(f.scheduled.length,0,'account change authorized replacement');assert.equal(f.writes.length,0);
});
test('historical submitted archive recovery detects existing publication without republishing',async()=>{
 const Recovery=require('../src/background/services/archive-insertion-recovery-service.js');
 const session={archiveInsertionId:'a',status:'submitted',targetTabId:42,sourceAdId:'100'},fill={archiveInsertionId:'a',targetTabId:42,fillId:'f'},detected={adId:'200'},calls=[],logs=[];
 const api=Recovery.create({readArchiveInsertionSessions:async()=>({a:session}),readFillSessions:async()=>({f:fill}),getInventory:async()=>null,isTrashRecord:()=>false,persistArchiveInsertionSession:async()=>{},deleteImagesByInventoryId:async()=>{},logDiagnostic:async(...a)=>logs.push(a),setAppNotice:async()=>{},broadcastInventoryChanged:()=>{},normalizeRenewalMode:()=> 'safe',compareArchiveInsertionRecords:async()=>({status:'mismatch'}),runArchiveInsertionPostPublish:async()=>assert.fail('must not run before identity confirmation'),detectPublishedAdForFill:async(id,source)=>{calls.push(['detect',id,source]);return detected;},confirmPublishedArchiveInsertion:async(f,d)=>calls.push(['confirm',f.fillId,d.adId]),cryptoApi:{randomUUID:()=> 'fixture'}});
 await api.resumePendingArchiveInsertions();assert.deepEqual(calls,[['detect',42,'100'],['confirm','f','200']]);assert.equal(logs.filter(x=>x[1]==='ARCHIVE_INSERT_RESUME_DEFERRED').length,0);
});
