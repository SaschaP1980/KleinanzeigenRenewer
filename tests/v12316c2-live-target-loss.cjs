'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
require('../src/shared/runtime-deps.js');
const TrashTemplateUiController=require('../src/app/trash-template-ui-controller.js');
const ArchiveTrashInsertionUiController=require('../src/app/archive-trash-insertion-ui-controller.js');

function classList(initial=[]){const set=new Set(initial);return {add(...xs){xs.forEach(x=>set.add(x));},remove(...xs){xs.forEach(x=>set.delete(x));},toggle(x,force){if(force===undefined){if(set.has(x))set.delete(x);else set.add(x);return set.has(x);}if(force)set.add(x);else set.delete(x);return force;},contains(x){return set.has(x);}};}
function button(initialHidden=false){const listeners={};return {disabled:false,title:'',textContent:'',classList:classList(initialHidden?['hidden']:[]),addEventListener(type,fn){listeners[type]=fn;},async click(){return listeners.click?.({preventDefault(){}});},focus(){}};}
function node(){return {textContent:'',classList:classList(),removeAttribute(){},setAttribute(){}};}
function dialog(){const listeners={};return {open:false,showModal(){this.open=true;},close(){this.open=false;},addEventListener(type,fn){listeners[type]=fn;}};}
function steps(){return {querySelectorAll(){return [1,2,3].map(n=>({dataset:{templateStep:String(n)},classList:classList()}));}};}

async function liveOpenDialogTransition(){
  const d=dialog(),restart=button(true),inventory=button(false),title=node(),progressTitle=node(),progressText=node();
  const activities=[],logs=[];
  const session={fillId:'fill-live',templateOnly:true,trashInventoryId:'inv-1',sourceAdId:'123',targetTabId:77,status:'complete',stage:'template-only-complete',newAdId:null,result:{complete:true,issues:[]}};
  const record={inventoryId:'inv-1',adId:'123',profileId:'p1',title:'Vorlage',images:[]};
  const c=TrashTemplateUiController.create({
    document:{},
    elements:{trashTemplateDialog:d,trashTemplateClose:button(),trashTemplateCancel:button(),trashTemplateConfirm:button(),trashTemplateDone:button(),trashTemplateInventory:inventory,trashTemplateRestart:restart,trashTemplateTitle:title,trashTemplateIntro:node(),trashTemplateSourceTitle:node(),trashTemplateSourceMeta:node(),trashTemplateCover:node(),trashTemplateSteps:steps(),trashTemplateProgressMessage:node(),trashTemplateProgressTitle:progressTitle,trashTemplateProgressText:progressText,trashTemplateConfirmActions:node(),trashTemplateProgressActions:node()},
    runtimeMessage:async msg=>{if(msg.type==='GET_RECOVERABLE_TRASH_TEMPLATE_FILL'||msg.type==='GET_TRASH_TEMPLATE_FILL_STATUS')return session;throw new Error('unexpected '+msg.type);},
    publishTrashTemplateRecoveryActivity:a=>activities.push(a),logAppEvent:async(...a)=>logs.push(a),displayPriceWithType:()=> '10 €',loadLocalPreview:async()=>{}
  });
  c.updateContext({selectedProfileId:'p1',trashRecords:[record],insertionLock:{locked:false}});c.install();
  await c.recoverTrashTemplateSession({forceOpen:true,allowTakeover:true});
  assert.equal(d.open,true);assert.equal(c.status().trashTemplateDialogMode,'awaiting-publish');assert.equal(c.status().trackedTrashTemplateTabId,77);
  assert.equal(c.handleTrashTemplateTargetTabRemoved(88),false,'unrelated tab removal must be ignored');
  assert.equal(c.status().trashTemplateDialogMode,'awaiting-publish');
  assert.equal(c.handleTrashTemplateTargetTabRemoved(77),true,'tracked target removal must be consumed');
  assert.equal(d.open,true,'dialog must remain open');
  assert.equal(c.status().trashTemplateDialogMode,'target-missing');
  assert.match(title.textContent,/Tab.*geschlossen/i);assert.match(progressTitle.textContent,/Tab.*geschlossen/i);assert.match(progressText.textContent,/nicht mehr.*geöffnet|geschlossen/i);
  assert.equal(restart.classList.contains('hidden'),false);assert.equal(inventory.classList.contains('hidden'),true);
  assert.ok(activities.some(a=>/geschlossen/i.test(String(a.title)+' '+String(a.text))));
  assert.ok(logs.some(([event,details])=>event==='USER_TRASH_TEMPLATE_TARGET_REMOVED_LIVE'&&details?.tabId===77));
}

function wiringContract(){
  const app=fs.readFileSync('src/app/app.js','utf8');
  const facade=fs.readFileSync('src/app/archive-trash-insertion-ui-controller.js','utf8');
  assert.match(facade,/handleTrashTemplateTargetTabRemoved/,'facade must expose target-removal hook');
  assert.match(app,/chrome\.tabs\.onRemoved\.addListener[\s\S]{0,900}handleTrashTemplateTargetTabRemoved\(id\)/,'existing tabs.onRemoved path must notify the already-created UI controller');
  assert.doesNotMatch(app,/chrome\.tabs\.onRemoved\.addListener[\s\S]{0,900}requireArchiveTrashInsertionUiController\(\)\.handleTrashTemplateTargetTabRemoved/,'tab removal must not instantiate the insertion UI controller just for an unrelated tab');
}

(async()=>{await liveOpenDialogTransition();console.log('PASS tracked target-tab removal updates an already-open prepared dialog in place');wiringContract();console.log('PASS existing tabs.onRemoved path forwards target loss without adding a new runtime boundary');console.log('2/2 PASS v1.23.16_c2 live target-loss regression');})().catch(e=>{console.error('FAIL',e);process.exit(1);});
