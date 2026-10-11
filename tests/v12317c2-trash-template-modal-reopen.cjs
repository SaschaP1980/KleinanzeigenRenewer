'use strict';
const assert=require('node:assert/strict');
require('../src/shared/runtime-deps.js');
const TrashTemplateUiController=require('../src/app/trash-template-ui-controller.js');

function classList(initial=[]){const set=new Set(initial);return {add(...xs){xs.forEach(x=>set.add(x));},remove(...xs){xs.forEach(x=>set.delete(x));},toggle(x,force){if(force===undefined){if(set.has(x))set.delete(x);else set.add(x);return set.has(x);}if(force)set.add(x);else set.delete(x);return force;},contains(x){return set.has(x);}};}
function button(initialHidden=false){const listeners={};return {disabled:false,title:'',textContent:'',classList:classList(initialHidden?['hidden']:[]),addEventListener(type,fn){listeners[type]=fn;},async click(){return listeners.click?.({preventDefault(){}});},focus(){}};}
function node(){return {textContent:'',classList:classList(),removeAttribute(){},setAttribute(){}};}
function dialog(){const listeners={};return {open:false,showCount:0,showModal(){this.open=true;this.showCount+=1;},close(){this.open=false;},addEventListener(type,fn){listeners[type]=fn;}};}
function steps(){return {querySelectorAll(){return [1,2,3].map(n=>({dataset:{templateStep:String(n)},classList:classList()}));}};}

async function main(){
  const d=dialog(),target=button(true),restart=button(true),inventory=button(false),done=button(false);
  const activities=[],focusCalls=[],checkCalls=[],logs=[];
  const session={fillId:'fill-1',templateOnly:true,trashInventoryId:'inv-1',inventoryId:'inv-1',sourceAdId:'123',targetTabId:77,status:'complete',stage:'template-only-complete',newAdId:null,result:{complete:true,issues:[]}};
  const record={inventoryId:'inv-1',adId:'123',profileId:'p1',title:'Vorlage',images:[]};
  let targetAvailable=true;
  const c=TrashTemplateUiController.create({
    document:{},
    elements:{trashTemplateDialog:d,trashTemplateClose:button(),trashTemplateCancel:button(),trashTemplateConfirm:button(),trashTemplateDone:done,trashTemplateInventory:inventory,trashTemplateRestart:restart,trashTemplateTarget:target,trashTemplateTitle:node(),trashTemplateIntro:node(),trashTemplateSourceTitle:node(),trashTemplateSourceMeta:node(),trashTemplateCover:node(),trashTemplateSteps:steps(),trashTemplateProgressMessage:node(),trashTemplateProgressTitle:node(),trashTemplateProgressText:node(),trashTemplateConfirmActions:node(),trashTemplateProgressActions:node()},
    runtimeMessage:async msg=>{if(msg.type==='GET_RECOVERABLE_TRASH_TEMPLATE_FILL'||msg.type==='GET_TRASH_TEMPLATE_FILL_STATUS')return session;throw new Error('unexpected '+msg.type);},
    checkTrashTemplateTargetTab:async id=>{checkCalls.push(id);return targetAvailable?{ok:true,reason:'available',tabId:id}:{ok:false,reason:'missing',tabId:id};},
    focusTrashTemplateTargetTab:async id=>{focusCalls.push(id);return targetAvailable?{ok:true,reason:'focused',tabId:id}:{ok:false,reason:'missing',tabId:id};},
    publishTrashTemplateRecoveryActivity:a=>activities.push(a),logAppEvent:async(...a)=>logs.push(a),displayPriceWithType:()=> '10 €',loadLocalPreview:async()=>{}
  });
  c.updateContext({selectedProfileId:'p1',trashRecords:[record],insertionLock:{locked:false}});c.install();
  await c.recoverTrashTemplateSession({forceOpen:true,allowTakeover:true});
  assert.equal(d.open,true);assert.equal(c.status().trashTemplateDialogMode,'awaiting-publish');
  assert.equal(target.classList.contains('hidden'),false,'prepared modal exposes an explicit target-tab action');

  await done.click();assert.equal(d.open,false,'user may close the modal while target remains open');
  const reopened=await c.reopenTrashTemplateSession();
  assert.equal(reopened,true);assert.equal(d.open,true,'status/recovery action must reopen the modal');
  assert.equal(focusCalls.length,0,'reopening status must not switch away to the Kleinanzeigen tab');
  assert.deepEqual(checkCalls,[77],'reopen verifies target existence without focusing it');
  assert.ok(activities.some(a=>a.action==='resume-trash-template'&&/Status öffnen|Dialog öffnen/i.test(String(a.actionLabel))), 'activity explicitly reopens status rather than implicitly focusing target');

  await target.click();
  assert.deepEqual(focusCalls,[77],'explicit modal action focuses the prepared Kleinanzeigen tab');
  assert.ok(logs.some(([event])=>event==='USER_TRASH_TEMPLATE_TARGET_OPEN_REQUESTED'),'explicit target action is diagnosed');

  targetAvailable=false;
  await target.click();
  assert.equal(c.status().trashTemplateDialogMode,'target-missing','missing target detected by explicit target action uses existing recovery state');
  assert.equal(restart.classList.contains('hidden'),false,'target-loss restart remains available');
  assert.equal(target.classList.contains('hidden'),true,'dead target action is hidden in target-loss state');

  console.log('1/1 PASS v1.23.17_c2 trash-template modal reopen');
}
main().catch(e=>{console.error('FAIL',e);process.exit(1);});
