'use strict';
// B16: actual current Phase-4 service, snapshot, compact/detail rendering and progress UI.
// No real browser account or network. The original KAR199 UI tests remain immutable.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const Repo=require('../src/background/repositories/renewal-state-repository.js');
const Remote=require('../src/background/services/remote-delete-replacement-service.js');
const Formatting=require('../src/app/inventory-formatting.js');
const Renderer=require('../src/app/inventory-card-renderer.js');
const Dialog=require('../src/app/renewal-dialog-controller.js');
const bg=fs.readFileSync('src/background/background.js','utf8');
const resetSource=bg.match(/^function resetRenewalPhaseAttempts\(session, phases = \[\]\) \{\n[\s\S]*?^\}/m);
assert.ok(resetSource);
const resetAttempts=vm.runInThisContext('('+resetSource[0]+')');
const when='2026-11-26T20:00:00Z';
const baseline={renewalId:'r',sourceInventoryId:'100',skeletonInventoryId:'renewal:r',sourceAdId:'100',newAdId:'200',profileId:'p',renewalMode:'fast',status:'verified',stage:'replacement-ready',autoReplacementAllowed:true,createdAt:when};
const repo=Repo.create({storageLocal:{get:async()=>({}),set:async()=>{}}});
const fmt=Formatting.create({sharedUiHelpers:{formatDate:()=>'',displayPriceWithType:()=>'',artLabel:()=>'',endDateWithRelativeLabel:()=>'',listingDatePresentation:()=>({label:'Inseriert am',derived:false}),listingDateLabel:()=>''}});
function record(patch={}){return {inventoryId:'renewal:r',adId:'200',profileId:'p',title:'fixture',recordKind:'renewal-candidate',images:[],renewal:repo.renewalPublicSnapshot({...baseline,...patch})};}
const unknown={phase4AttemptsExhaustedAt:when,sourceDeleteVerificationPendingAt:when,lastError:'unverified'};
test('B16 snapshot and status distinguish confirmed candidate with uncertain DELETE from ordinary replacement',()=>{
 const r=record(unknown);
 assert.equal(r.renewal.sourceDeleteVerificationOnly,true);
 assert.equal(fmt.renewalStatusLabel(r),'AUSTAUSCH UNGEKLÄRT');
 assert.equal(fmt.renewalStatusText(r),'Austausch ungeklärt · prüfen');
 assert.equal(fmt.renewalAutoCompletionPending(r),false);
 const n=record({autoReplacementAllowed:false});
 assert.equal(n.renewal.sourceDeleteVerificationOnly,false);
 assert.equal(fmt.renewalIsReplacementReady(n),true);
 assert.equal(fmt.renewalStatusLabel(n),'AUSTAUSCH BEREIT');
 const before=record({phase4AttemptsExhaustedAt:when,lastError:'preflight failed'});
 assert.equal(before.renewal.sourceDeleteVerificationOnly,false);
 assert.equal(fmt.renewalAutoCompletionPending(before),false);
 assert.equal(fmt.renewalIsReplacementReady(before),true);
});
test('B16 all existing prior-delete evidence types project verification-only; active stages remain active',()=>{
 for(const evidence of [{sourceDeleteTransportInterrupted:true},{sourceDeleteAction:{actionTriggered:true}},{sourceDeletedAt:when},{sourceDeleteVerificationPendingAt:when}]){
   assert.equal(record(evidence).renewal.sourceDeleteVerificationOnly,true);
 }
 const active=record({stage:'source-delete-started',sourceDeleteVerificationPendingAt:when});
 assert.equal(active.renewal.sourceDeleteVerificationOnly,false);
 assert.equal(fmt.renewalAutoCompletionPending(active),true);
});
function fixtureUi(r,mode,allowed=true){
 const {document,window}=parseHTML('<html><body></body></html>');
 const create=tag=>document.createElement(tag),el=()=>create('div');
 const list=el(),confirmations=[],messages=[],statuses=[];
 function iconButton({label,title}){const b=create('button');b.textContent=label;b.title=title;return b;}
 function infoLine(label,value){const d=el(),s=create('strong');s.textContent=String(value||'');d.append(s);return d;}
 const renderer=Renderer.create({document,formatting:fmt,sharedUiHelpers:{makeCompactIconButton:iconButton},recordCardView:{
  createCompactListRow(rec){const row=el(),actions=el();row.append(actions);return {row,actions};},cardTargetIsInteractive:()=>true,makeInfoLine:infoLine,buildFullImageStrip:el,rememberCompactButtonDisabled:b=>b,setCompactButtonsBusy:(buttons,busy)=>buttons.forEach(b=>b.disabled=busy)
 },elements:{inventoryList:list,inventoryCount:el(),trashCount:el(),inventoryHeaderCount:el(),trashHeaderCount:el(),clearInventoryButton:create('button')},
 accountGateModel:()=>({allowed,tooltip:'wrong account'}),selectedConcreteProfile:()=>({profileId:'p'}),requireAccountBoundAction:()=>allowed,confirmAction:async spec=>{confirmations.push(spec);return true;},getTrashRetentionDays:()=>30,
 runtimeMessage:async msg=>{messages.push(msg);return {completed:true};},setStatus:(...args)=>statuses.push(args),refreshInventories:async()=>{}});
 renderer.updateContext({selectedProfileId:'p',globalListViewMode:mode});renderer.renderInventories([r]);
 return {list,window,confirmations,messages,statuses,buttons:()=>[...list.querySelectorAll('button')]};
}
for(const mode of ['compact','detailed']){
 test('B16 actual '+mode+' renderer exposes verification-only action with matching consent and request',async()=>{
  const f=fixtureUi(record(unknown),mode);
  const button=f.buttons().find(b=>b.textContent==='Löschung prüfen');
  assert.ok(button,'missing read-only recovery action');assert.equal(button.disabled,false);
  button.dispatchEvent(new f.window.Event('click'));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.confirmations.length,1);assert.equal(f.confirmations[0].danger,false);
  assert.match(f.confirmations[0].text,/kein erneuter Löschbefehl/i);
  assert.deepEqual(f.messages,[{type:'FINISH_RENEWAL_REPLACEMENT',renewalId:'r',verificationOnly:true}]);
  const legacy=fixtureUi(record({stage:'source-delete-status-unverified'}),mode);
  assert.ok(!legacy.buttons().some(b=>['Austausch abschließen','Löschung prüfen','Erneut prüfen'].includes(b.textContent)&&!b.disabled));
  const ordinary=fixtureUi(record({autoReplacementAllowed:false}),mode);
  assert.ok(ordinary.buttons().some(b=>b.textContent==='Austausch abschließen'&&!b.disabled));
  const mismatch=fixtureUi(record(unknown),mode,false);
  assert.equal(mismatch.buttons().find(b=>b.textContent==='Löschung prüfen').disabled,true);
 });
}
test('B16 actual progress dialog terminal unknown is an error, never a spinner; ordinary Phase4 remains active',()=>{
 const {document}=parseHTML('<html><body></body></html>');
 const el=()=>document.createElement('div'),steps=el();
 for(let i=1;i<=4;i++){const e=el();e.dataset.phase=String(i);steps.append(e);}
 const msg=el(),title=el(),detail=el(),activity=[];
 const api=Dialog.create({elements:{renewalStartSteps:steps,renewalProgressMessage:msg,renewalProgressMessageTitle:title,renewalProgressMessageText:detail},publishUiActivity:x=>activity.push(x)});
 for(const patch of [unknown,{stage:'source-delete-outcome-unverified'},{stage:'source-delete-status-unverified'}]){
   api.showProgress(record(patch));
   assert.ok(steps.querySelector('[data-phase="4"]').classList.contains('phase-error'));
   assert.equal(title.textContent,'Austausch ungeklärt');
   assert.match(detail.textContent,/alte Anzeige noch nicht nachweislich gelöscht/);
   assert.equal(activity.at(-1).active,false);
 }
 api.showProgress(record({stage:'source-delete-started'}));
 assert.ok(steps.querySelector('[data-phase="4"]').classList.contains('phase-active'));
 assert.equal(activity.at(-1).active,true);
});
function serviceFixture({prior={},proof=true}={}){
 const row={...baseline,phaseAttempts:{'4':{attempt:3}},...prior};
 const sent=[],writes=[],workers=[],closed=[];let promotions=0;
 const stop=new Error('fixture reached guarded promotion');
 const api=Remote.create({
 readRenewalSessions:async()=>({r:row}),getInventory:async id=>({inventoryId:id,adId:id==='100'?'100':'200',profileName:'Owner'}),getBulkRunState:async()=>({status:'complete'}),
 assertMassRenewalManualActionAllowed:async()=>{},normalizeProfileName:s=>String(s||'').trim(),normalBrowserWindowId:async()=>1,
 persistRenewalSession:async s=>{writes.push(structuredClone(s));return s;},
 resetRenewalPhaseAttempts:resetAttempts,renewalMaxPhaseAttempts:()=>3,
 renewalAttemptState:()=>({attempt:row.phaseAttempts?.['4']?.attempt||0}),renewalPhaseAttemptAvailable:()=>!row.phaseAttempts?.['4']||row.phaseAttempts['4'].attempt<3,
 logRenewalPhaseAttemptStarted:async()=>{const n=(row.phaseAttempts?.['4']?.attempt||0)+1;row.phaseAttempts={...row.phaseAttempts,'4':{attempt:n}};return {attempt:n,attemptId:'a'+n};},
 delay:async()=>{},renewalPhaseRetryDelayMs:()=>0,renewalAttemptDetails:()=>({}),logRenewalPhaseAttemptFailed:async()=>{},isNonRetryableRenewalSafetyError:()=>false,logDiagnostic:async()=>{},sessionCorrelationContext:()=>({}),correlationContext:()=>({}),
 createManagedWorkerTab:async(_o,kind)=>{const id=1000+workers.length;workers.push({id,kind});return{id};},waitForTabComplete:async()=>{},ensureContentConnection:async()=>{},closeManagedWorkerTab:async id=>closed.push(id),
 isPhase4DeleteTransportInterruption:()=>false,
 sendTabRequestWithBootstrap:async(id,m)=>{sent.push({id,type:m.type,adId:m.adId});if(m.type==='MY_ADS_STATUS')return {isMyAdsPage:true,isProjectsTab:true,profileName:'Owner'};if(m.type==='VERIFY_OWN_AD_ABSENT_BY_ID')return {verified:proof,foundPage:proof?null:1,pagesScanned:1};if(m.type==='DELETE_OWN_AD_BY_ID')return{actionTriggered:true};throw Error('unexpected command');},
 openDatabase:async()=>{promotions++;throw stop;}
 });return {api,row,sent,writes,workers,closed,stop,promotions:()=>promotions};
}
test('B16 actual exhausted explicit retry resets existing budget and verifies without second DELETE',async()=>{
 const f=serviceFixture({prior:unknown});
 await assert.rejects(f.api.finishRenewalReplacement({type:'FINISH_RENEWAL_REPLACEMENT',renewalId:'r',verificationOnly:true}),e=>e===f.stop);
 assert.deepEqual(f.sent.map(m=>m.type),['MY_ADS_STATUS','VERIFY_OWN_AD_ABSENT_BY_ID']);
 assert.equal(f.promotions(),1);assert.deepEqual(f.closed,f.workers.map(w=>w.id));
});
test('B16 stale verification-only consent cannot turn into a new DELETE or reset budget',async()=>{
 const f=serviceFixture({prior:{phaseAttempts:{},autoReplacementAllowed:false}});
 await assert.rejects(f.api.finishRenewalReplacement({type:'FINISH_RENEWAL_REPLACEMENT',renewalId:'r',verificationOnly:true}),/Status|aktualisier|Prüfung/i);
 assert.deepEqual(f.sent,[]);assert.deepEqual(f.writes,[]);assert.equal(f.promotions(),0);
});
test('B16 ordinary exhausted pre-dispatch retry retains normal path; no fake prior deletion',async()=>{
 const f=serviceFixture({prior:{phase4AttemptsExhaustedAt:when,lastError:'preflight failed'}});
 await assert.rejects(f.api.finishRenewalReplacement({type:'FINISH_RENEWAL_REPLACEMENT',renewalId:'r'}),e=>e===f.stop);
 assert.deepEqual(f.sent.map(m=>m.type),['MY_ADS_STATUS','DELETE_OWN_AD_BY_ID','MY_ADS_STATUS','VERIFY_OWN_AD_ABSENT_BY_ID']);
});
