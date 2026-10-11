'use strict';
const assert = require('assert');
const Controller = require('../archive-trash-insertion-ui-controller.js');

function classList(){ return { add(){}, remove(){}, toggle(){}, contains(){return false;} }; }
function makeDialog(){ return { open:false, showModal(){this.open=true;}, close(){this.open=false;}, addEventListener(){}, classList:classList() }; }
function makeButton(){ return { disabled:false, title:'', focus(){}, addEventListener(){}, classList:classList() }; }

(async()=>{
  const image = { imageKey:'old-inv:0', position:0, isPrimary:true, sha256:'abc' };
  const record = { inventoryId:'old-inv', adId:'111', profileId:'p1', title:'Kulturtasche', price:{value:3,type:'fixed'}, images:[image] };
  const session = { fillId:'old-fill', inventoryId:'old-inv', trashInventoryId:'old-inv', targetTabId:77, status:'complete', stage:'template-only-complete', newAdId:'' };
  const previewCalls=[];
  const messages=[];
  const elements={
    trashTemplateDialog:makeDialog(), trashTemplateConfirm:makeButton(), trashTemplateInventory:makeButton(),
    trashTemplateTitle:{textContent:''}, trashTemplateIntro:{textContent:'',classList:classList()},
    trashTemplateSourceTitle:{textContent:''}, trashTemplateSourceMeta:{textContent:''},
    trashTemplateCover:{alt:'',src:'',removeAttribute(name){ if(name==='src') this.src=''; }},
    trashTemplateProgressMessage:{classList:classList()}, trashTemplateProgressTitle:{textContent:''}, trashTemplateProgressText:{textContent:''},
    trashTemplateConfirmActions:{classList:classList()}, trashTemplateProgressActions:{classList:classList()},
    trashTemplateSteps:{querySelectorAll(){return [];}}
  };
  const api=Controller.create({
    elements,
    displayPriceWithType:()=> '3 € · FP',
    loadLocalPreview: async (img, rec, imgMeta)=>{ previewCalls.push({img,rec,imgMeta}); img.src='blob:preview'; },
    accountGateModel:()=>({allowed:true,tooltip:''}),
    runtimeMessage: async msg=>{
      messages.push(msg);
      if(msg.type==='GET_RECOVERABLE_TRASH_TEMPLATE_FILL') return session;
      if(msg.type==='LIST_TRASH') return [record];
      return null;
    }
  });
  // Simulate app restart: recoverable session exists before the UI's local trash cache is populated.
  api.updateContext({selectedProfileId:'p1',trashRecords:[],insertionLock:{locked:false}});
  const reopened=await api.reopenTrashTemplateSession();
  assert.strictEqual(reopened,true);
  const s=api.status();
  assert.strictEqual(s.trackedTrashTemplateRecord?.inventoryId,'old-inv','recovery must resolve the source record even when the local trash cache is empty');
  assert.strictEqual(elements.trashTemplateSourceTitle.textContent,'Kulturtasche');
  assert.match(elements.trashTemplateSourceMeta.textContent,/111/);
  assert.strictEqual(previewCalls.length,1,'recovery must invoke the local preview loader exactly once');
  assert.strictEqual(previewCalls[0].imgMeta.imageKey,'old-inv:0');
  assert.strictEqual(elements.trashTemplateCover.src,'blob:preview');
  assert.ok(messages.some(m=>m.type==='LIST_TRASH'),'recovery must refresh trash records on a cache miss');
  console.log('v1.22.20 trash-template preview recovery runtime: 7/7 PASS');
})().catch(error=>{console.error(error);process.exit(1);});
