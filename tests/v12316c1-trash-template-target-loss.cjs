'use strict';
const assert=require('node:assert/strict');
require('../src/shared/runtime-deps.js');
const TrashTemplateUiController=require('../src/app/trash-template-ui-controller.js');
const TemplateFillController=require('../src/background/controllers/template-fill-controller.js');

function classList(initial=[]){
  const set=new Set(initial);return {add(...xs){xs.forEach(x=>set.add(x));},remove(...xs){xs.forEach(x=>set.delete(x));},toggle(x,force){if(force===undefined){if(set.has(x))set.delete(x);else set.add(x);return set.has(x);}if(force)set.add(x);else set.delete(x);return force;},contains(x){return set.has(x);}};
}
function button(initialHidden=false){
  const listeners={};return {disabled:false,title:'',textContent:'',classList:classList(initialHidden?['hidden']:[]),addEventListener(type,fn){listeners[type]=fn;},async click(){return listeners.click?.({preventDefault(){}});},focus(){}};
}
function node(){return {textContent:'',classList:classList(),removeAttribute(){},setAttribute(){}};}
function dialog(){const listeners={};return {open:false,showModal(){this.open=true;},close(){this.open=false;},addEventListener(type,fn){listeners[type]=fn;}};}
function steps(){return {querySelectorAll(){return [1,2,3].map(n=>({dataset:{templateStep:String(n)},classList:classList()}));}};}

async function testUiMissingTarget(){
  const d=dialog(), restart=button(true), inventory=button(false), done=button(false);
  const title=node(), intro=node(), progress=node(), progressTitle=node(), progressText=node(), confirmActions=node(), progressActions=node();
  const activities=[];const logs=[];const starts=[];
  const session={fillId:'fill-old',templateOnly:true,trashInventoryId:'inv-1',sourceAdId:'123',targetTabId:77,status:'complete',stage:'template-only-complete',newAdId:null,result:{complete:true,issues:[]}};
  const record={inventoryId:'inv-1',adId:'123',profileId:'p1',title:'Vorlage',images:[]};
  const c=TrashTemplateUiController.create({
    document:{},
    elements:{trashTemplateDialog:d,trashTemplateClose:button(),trashTemplateCancel:button(),trashTemplateConfirm:button(),trashTemplateDone:done,trashTemplateInventory:inventory,trashTemplateRestart:restart,trashTemplateTitle:title,trashTemplateIntro:intro,trashTemplateSourceTitle:node(),trashTemplateSourceMeta:node(),trashTemplateCover:node(),trashTemplateSteps:steps(),trashTemplateProgressMessage:progress,trashTemplateProgressTitle:progressTitle,trashTemplateProgressText:progressText,trashTemplateConfirmActions:confirmActions,trashTemplateProgressActions:progressActions},
    runtimeMessage:async msg=>{if(msg.type==='GET_RECOVERABLE_TRASH_TEMPLATE_FILL'||msg.type==='GET_TRASH_TEMPLATE_FILL_STATUS')return session;throw new Error('unexpected '+msg.type);},
    focusTrashTemplateTargetTab:async()=>({ok:false,reason:'missing',tabId:77}),
    confirmAction:async()=>true,
    onStartTrashTemplate:async(_record,opts)=>{starts.push(opts);return {fillId:'fill-new',tabId:88,operationId:'op-new'};},
    publishTrashTemplateRecoveryActivity:a=>activities.push(a),
    logAppEvent:async(...a)=>logs.push(a),
    displayPriceWithType:()=> '10 €',
    loadLocalPreview:async()=>{}
  });
  c.updateContext({selectedProfileId:'p1',trashRecords:[record],insertionLock:{locked:false}});c.install();
  await c.recoverTrashTemplateSession({forceOpen:false,allowTakeover:true});
  const opened=await c.reopenTrashTemplateSession();
  assert.equal(opened,true);assert.equal(d.open,true);
  assert.equal(c.status().trashTemplateDialogMode,'target-missing');
  assert.match(title.textContent,/Tab.*geschlossen|Tab.*nicht mehr/i);
  assert.match(progressText.textContent,/nicht mehr.*geöffnet|geschlossen/i);
  assert.equal(restart.classList.contains('hidden'),false);
  assert.equal(inventory.classList.contains('hidden'),true);
  assert.ok(activities.some(a=>/Tab.*geschlossen|nicht mehr geöffnet/i.test(String(a.title)+' '+String(a.text))));
  await restart.click();
  await new Promise(r=>setTimeout(r,0));
  assert.deepEqual(starts,[{supersedeFillId:'fill-old'}]);
  assert.equal(c.status().trackedTrashTemplateFillId,'fill-new');
  assert.ok(logs.some(([event])=>event==='USER_TRASH_TEMPLATE_TARGET_LOSS_RESTARTED'));
}

function noop(){}
async function testBackgroundSupersede(){
  let created=0;let sessions={
    old:{fillId:'old',templateOnly:true,trashInventoryId:'inv-1',inventoryId:'inv-1',sourceAdId:'123',targetTabId:77,status:'complete',stage:'template-only-complete',result:{complete:true,issues:[]},updatedAt:'2026-09-30T10:00:00Z'}
  };
  const logs=[];
  const read=async()=>structuredClone(sessions); const write=async next=>{sessions=structuredClone(next);};
  const options={
    readFillSessions:read,writeFillSessions:write,withTemplateFillMutation:async fn=>fn(),
    isRecoverableTrashTemplateSession:s=>s?.templateOnly===true,resolvePublishedInventory:async()=>({}),broadcastInventoryChanged:noop,
    getInventory:async()=>({inventoryId:'inv-1',adId:'123',profileId:'p1'}),isTrashRecord:()=>true,assertTemplateSourceReady:noop,
    createAutomationTab:async()=>{created++;return {id:88};},registerShadowTab:async()=>{},updateAutomationTab:async()=>{},
    logDiagnostic:async(level,event,details)=>logs.push({level,event,details}),correlationContext:()=>({}),sessionCorrelationContext:()=>({}),
    assertSelectedProfileMatchesLiveAccount:async()=>{},getInsertionLockState:async()=>({locked:false}),assertInsertionStartAvailable:async()=>{},withInsertionStartGate:async fn=>fn(),
    getRenewalConfiguration:async()=>({renewalMode:'safe',maxPhaseAttempts:3}),normalizeRenewalMode:v=>v||'safe',normalizeRenewalPhaseAttempts:v=>Number(v)||3,
    readRenewalSessions:async()=>({}),writeRenewalSessions:async()=>{},createRenewalSkeleton:async()=>({inventoryId:'skel'}),persistRenewalSession:async()=>{},
    isTransientTemplateFillProgress:()=>false,templateFillProgressSnapshot:()=>({}),queueMassRenewalProgress:noop,
    readArchiveInsertionSessions:async()=>({}),persistArchiveInsertionSession:async()=>{},recordRenewalPhaseAttemptError:noop,canRetryRenewalPhase1:()=>false,restartRenewalPhase1Attempt:async()=>{},
    evictTemplateImageTransfersForFill:noop,classifyKleinanzeigenInsertionErrorUrl:()=>({isError:false}),
    cryptoApi:{randomUUID:(()=>{let n=0;return()=>['new-fill','new-op','x3'][n++]||`x${n}`;})()},
    chromeApi:{tabs:{get:async id=>{assert.equal(id,77);throw new Error('No tab with id: 77.');},remove:async()=>{}}},queueMicrotaskFn:queueMicrotask,
    TEMPLATE_TARGET_URL:'https://www.kleinanzeigen.de/p-anzeige-aufgeben.html',TAB_ROLES:{TEMPLATE_TARGET:'template-target',RENEWAL_TARGET:'renewal-target'},TERMINAL_TEMPLATE_FILL_STATUSES:new Set(['complete','needs-review','error','cancelled'])
  };
  const c=TemplateFillController.create(options);
  const out=await c.startTrashTemplateFill('inv-1',{supersedeFillId:'old'});
  assert.equal(created,1);assert.equal(out.supersededFillId,'old');
  assert.equal(sessions.old.status,'cancelled');
  assert.equal(sessions.old.stage,'template-only-target-tab-lost-superseded');
  assert.equal(sessions.old.supersededByFillId,'new-fill');
  assert.equal(sessions['new-fill'].targetTabId,88);
  assert.ok(logs.some(x=>x.event==='TRASH_TEMPLATE_TARGET_LOST_RESTARTED'));

  // Fail closed when the old target still exists: no second target tab is created.
  sessions={old:{fillId:'old',templateOnly:true,trashInventoryId:'inv-1',inventoryId:'inv-1',sourceAdId:'123',targetTabId:77,status:'complete',stage:'template-only-complete',updatedAt:'2026-09-30T10:00:00Z'}};created=0;
  options.chromeApi.tabs.get=async()=>({id:77,url:'https://www.kleinanzeigen.de/p-anzeige-aufgeben.html'});
  const c2=TemplateFillController.create(options);
  await assert.rejects(()=>c2.startTrashTemplateFill('inv-1',{supersedeFillId:'old'}),/noch geöffnet|nicht.*neu/i);
  assert.equal(created,0);assert.equal(sessions.old.status,'complete');assert.equal(sessions.old.stage,'template-only-complete');
}

(async()=>{await testUiMissingTarget();console.log('PASS missing target tab renders explicit recovery state and restarts deliberately');await testBackgroundSupersede();console.log('PASS restart supersedes only a background-confirmed lost target and fails closed otherwise');console.log('2/2 PASS v1.23.16_c1 trash-template target-loss regression');})().catch(e=>{console.error('FAIL',e);process.exit(1);});
