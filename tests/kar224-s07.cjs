'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const noop=()=>{},asyncNoop=async()=>{};
function recovery({detected={adId:'200'},status='submitted',fillTab=42,current=false,fillStage='publish-submitted',fillSource='100'}={}){
 const API=require('../src/background/services/archive-insertion-recovery-service.js');
 const row={archiveInsertionId:'a',status:current?'filling':status,...(current?{stage:'publish-submitted',fillId:'f'}:{}),targetTabId:42,sourceAdId:'100'},fill={archiveInsertionId:'a',targetTabId:fillTab,fillId:'f',...(current?{status:'running',stage:fillStage,sourceAdId:fillSource}:{})},calls=[],logs=[];
 const service=API.create({readArchiveInsertionSessions:async()=>({a:row}),readFillSessions:async()=>({f:fill}),getInventory:async()=>null,isTrashRecord:()=>false,persistArchiveInsertionSession:asyncNoop,deleteImagesByInventoryId:asyncNoop,logDiagnostic:async(...a)=>logs.push(a),setAppNotice:asyncNoop,broadcastInventoryChanged:noop,normalizeRenewalMode:()=> 'safe',compareArchiveInsertionRecords:async()=>({status:'mismatch'}),runArchiveInsertionPostPublish:async()=>assert.fail('must not run before identity confirmation'),detectPublishedAdForFill:async(id,source)=>{calls.push(['detect',id,source]);return detected;},confirmPublishedArchiveInsertion:async(f,d)=>calls.push(['confirm',f.fillId,d.adId]),cryptoApi:{randomUUID:()=> 'fixture'}});
 return {run:()=>service.resumePendingArchiveInsertions(),calls,logs,row};
}
test('submitted archive resumes exact ID detection without republishing',async()=>{
 for(const current of [false,true]){const f=recovery({current});await f.run();assert.deepEqual(f.calls,[['detect',42,'100'],['confirm','f','200']]);assert.equal(f.logs.length,0);}
});
test('archive recovery remains inert for detached, unmatched and unknown outcomes',async()=>{
 for(const options of [{status:'needs-review'},{fillTab:77},{detected:null},{detected:{adId:'100'}},{detected:{adId:'invalid'}},{detected:{adId:'200',candidateCount:2}},{current:true,fillStage:'verified'},{current:true,fillSource:'wrong'}]){
 const f=recovery(options);await f.run();assert.ok(!f.calls.some(c=>c[0]==='confirm'));assert.equal(f.row.newAdId,undefined);
 }
});
function capture(){
 const listeners={},signals=[];class Button{constructor(){this.textContent='Anzeige aufgeben';this.disabled=false;this.isConnected=true;}closest(){return this;}}
 const ctx=vm.createContext({console,Element:Button,HTMLInputElement:class extends Button{},document:{addEventListener:(type,fn)=>listeners[type]=fn},setTimeout:()=>0,location:{pathname:'/p-anzeige-aufgeben-schritt2.html'},KRDeps:{register(_n,api){ctx.Flow=api;}}});
 vm.runInContext(read('src/content/template-publish-flow.js'),ctx);
 const flow=ctx.Flow.create({clean:String,visible:()=>true,diagnostic:noop,updatePanel:noop,runtimeMessage:async m=>{signals.push(m);return {accepted:true};}});
 const button=new Button();const form={querySelectorAll:()=>[button]};button.form=form;
 const dispatch=(type,trust=true,submitter=button)=>{const event={target:type==='submit'?form:button,submitter,isTrusted:trust,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},stopImmediatePropagation(){}};listeners[type](event);return event;};
 return {flow,dispatch,signals};
}
test('partial managed form requires explicit release, then only one trusted manual click and submit',()=>{
 const f=capture();f.flow.armPublishDetection('f');f.flow.armPublishDetection('f','manual-review');
 assert.equal(f.dispatch('click').defaultPrevented,true);
 assert.equal(f.dispatch('submit').defaultPrevented,true);
 f.flow.armPublishDetection('f','manual-standalone');
 assert.equal(f.dispatch('click',false).defaultPrevented,true);
 assert.equal(f.dispatch('submit',false).defaultPrevented,true);
 assert.equal(f.dispatch('submit',true).defaultPrevented,true,'submit without human click');
 assert.equal(f.dispatch('click').defaultPrevented,false);
 assert.equal(f.dispatch('submit').defaultPrevented,false);
 assert.equal(f.dispatch('submit').defaultPrevented,true);
 assert.equal(f.dispatch('click').defaultPrevented,true);
 assert.deepEqual(f.signals,[]);
});
function fixture({trash=false}={}){
 let API;const ctx=vm.createContext({console,URL,Date,structuredClone,KRDeps:{register(n,a){API=a;}}});
 vm.runInContext(read('src/background/controllers/template-fill-controller.js'),ctx);
 const source={inventoryId:trash?'trash':'archive:a',adId:'100',profileId:'p1',profileName:'Alice',title:'T',category:{id:'246'},images:[{imageKey:'1'}],dynamicAttributes:[{key:'dekoration.color',label:'Farbe',required:false}]};
 const fill={fillId:'f',archiveInsertionId:trash?null:'a',templateOnly:trash,trashInventoryId:trash?'trash':null,inventoryId:source.inventoryId,archiveTemplate:trash?null:source,targetProfileId:'p1',targetProfileName:'Alice',sourceAdId:'100',targetTabId:42,status:'needs-review',stage:'verified',result:{complete:false,issues:['Merkmal „Farbe“ stimmt nicht mit der Vorlage überein.'],manualStandaloneReviewEligible:true,manualCategoryId:'246',manualImageCount:1}};
 const archive={archiveInsertionId:'a',fillId:'f',sourceAdId:'100',targetTabId:42,targetProfileId:'p1',targetProfileName:'Alice',sourceRecord:source,status:'needs-review',stage:'manual-review'};
 let fills={f:fill},archives=trash?{}:{a:archive};const calls=[];let account='p1',locked=false;
 const deps={readFillSessions:async()=>fills,writeFillSessions:async s=>{fills=s;calls.push('fill-write')},withTemplateFillMutation:fn=>Promise.resolve().then(fn),isRecoverableTrashTemplateSession:()=>false,resolvePublishedInventory:asyncNoop,broadcastInventoryChanged:noop,getInventory:async()=>source,isTrashRecord:()=>trash,assertTemplateSourceReady:noop,createAutomationTab:async()=>assert.fail('no new tab'),deleteInventoryStorageRecord:async()=>assert.fail('no source deletion'),delay:asyncNoop,registerShadowTab:asyncNoop,updateAutomationTab:async()=>assert.fail('no navigation'),logDiagnostic:asyncNoop,correlationContext:()=>({}),sessionCorrelationContext:()=>({}),assertSelectedProfileMatchesLiveAccount:async()=>({profileId:account}),getInsertionLockState:async()=>({locked}),assertInsertionStartAvailable:asyncNoop,withInsertionStartGate:fn=>fn(),getRenewalConfiguration:async()=>({renewalMode:'safe'}),normalizeRenewalMode:x=>x,normalizeRenewalPhaseAttempts:x=>x,readRenewalSessions:async()=>({}),writeRenewalSessions:asyncNoop,createRenewalSkeleton:async()=>assert.fail('no skeleton'),persistRenewalSession:asyncNoop,isTransientTemplateFillProgress:()=>false,templateFillProgressSnapshot:()=>({}),queueMassRenewalProgress:noop,readArchiveInsertionSessions:async()=>archives,persistArchiveInsertionSession:async a=>{archives[a.archiveInsertionId]=a;calls.push('archive-write')},recordRenewalPhaseAttemptError:noop,canRetryRenewalPhase1:()=>false,restartRenewalPhase1Attempt:asyncNoop,evictTemplateImageTransfersForFill:noop,classifyKleinanzeigenInsertionErrorUrl:()=>({isError:false}),cryptoApi:{randomUUID:()=> 'fixture'},chromeApi:{tabs:{remove:async()=>assert.fail('no tab removal')}},queueMicrotaskFn:noop,TEMPLATE_TARGET_URL:'https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html',TAB_ROLES:{},TERMINAL_TEMPLATE_FILL_STATUSES:new Set(['complete','needs-review','error'])};
 const ctl=API.create(deps),sender={tab:{id:42,url:deps.TEMPLATE_TARGET_URL},url:deps.TEMPLATE_TARGET_URL};
 const approve=(over={},from=sender)=>ctl.updateTemplateFillSession({fillId:'f',manualStandaloneApproval:{ownerReviewed:true,...over}},from);
 return {ctl,source,fill,archive,approve,sender,calls,setAccount:v=>account=v,setLocked:v=>locked=v};
}
test('manual standalone approval persists terminal review, never a successful managed publication',async()=>{
 for(const trash of [false,true]){
 const f=fixture({trash});const result=await f.approve();
 assert.equal(result.manualDetached,true);assert.equal(result.autoPublishAllowed,false);
 assert.equal(f.fill.stage,'manual-standalone');assert.equal(f.fill.status,'needs-review');assert.equal(f.fill.newAdId,undefined);
 if(!trash){assert.equal(f.archive.status,'needs-review');assert.equal(f.archive.stage,'manual-standalone');assert.equal(f.archive.newAdId,undefined);}
 assert.equal(f.source.title,'T');
 }
});
test('manual standalone approval denies missing review, wrong tab/account, concurrent workflow and ineligible partial result',async()=>{
 for(const mutate of [f=>{f.fill.result.manualStandaloneReviewEligible=false},f=>{f.fill.renewalId='r'},f=>{f.fill.publishClickedAt='past'},f=>{f.setAccount('other')},f=>{f.setLocked(true)},f=>{f.archive.newAdId='999'},f=>{f.fill.result.manualImageCount=0},f=>{f.fill.result.manualCategoryId='22'}]){
 const f=fixture();mutate(f);await assert.rejects(f.approve());assert.equal(f.fill.stage,'verified');assert.deepEqual(f.calls,[]);
 }
 const f=fixture();await assert.rejects(f.approve({ownerReviewed:false}));await assert.rejects(f.approve({}, {tab:{id:43},url:f.sender.url}));await assert.rejects(f.approve({}, {tab:{id:42},url:'https://example.test/'}));assert.deepEqual(f.calls,[]);
});
