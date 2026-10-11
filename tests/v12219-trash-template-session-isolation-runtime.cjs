'use strict';
const assert = require('assert');
const Controller = require('../archive-trash-insertion-ui-controller.js');

function classList() { return { add(){}, remove(){}, toggle(){}, contains(){ return false; } }; }
function makeDialog() { return { open:false, showModal(){this.open=true;}, close(){this.open=false;}, addEventListener(){}, classList:classList() }; }
function makeButton() { return { disabled:false, title:'', focus(){}, addEventListener(){}, classList:classList() }; }

(async () => {
  const oldRecord = { inventoryId:'old-inv', adId:'111', profileId:'p1', title:'Kulturtasche', images:[] };
  const newRecord = { inventoryId:'new-inv', adId:'222', profileId:'p1', title:'IKEA Leuchte', images:[] };
  const oldSession = { fillId:'old-fill', inventoryId:'old-inv', trashInventoryId:'old-inv', targetTabId:77, status:'complete', stage:'template-only-complete', newAdId:'' };
  const activities=[];
  let recoverResolve;
  let deferred = new Promise(resolve => { recoverResolve = resolve; });
  const elements = {
    trashTemplateDialog: makeDialog(), trashTemplateConfirm:makeButton(), trashTemplateInventory:makeButton(),
    trashTemplateTitle:{textContent:''}, trashTemplateIntro:{textContent:'',classList:classList()},
    trashTemplateSourceTitle:{textContent:''}, trashTemplateSourceMeta:{textContent:''},
    trashTemplateCover:{alt:'',removeAttribute(){}}, trashTemplateProgressMessage:{classList:classList()},
    trashTemplateProgressTitle:{textContent:''}, trashTemplateProgressText:{textContent:''},
    trashTemplateConfirmActions:{classList:classList()}, trashTemplateProgressActions:{classList:classList()},
    trashTemplateSteps:{querySelectorAll(){return [];}}
  };
  const api = Controller.create({
    elements,
    displayPriceWithType:()=>'', loadLocalPreview:async()=>{}, accountGateModel:()=>({allowed:true,tooltip:''}),
    runtimeMessage: async msg => {
      if (msg.type === 'GET_RECOVERABLE_TRASH_TEMPLATE_FILL') return deferred;
      if (msg.type === 'GET_TRASH_TEMPLATE_FILL_STATUS') return oldSession;
      return null;
    },
    publishTrashTemplateRecoveryActivity:a=>activities.push(a)
  });
  api.updateContext({ selectedProfileId:'p1', trashRecords:[oldRecord,newRecord], insertionLock:{locked:false} });

  // A stale async recovery started before the user opens a new local draft must not hijack it.
  const pendingRecovery = api.recoverTrashTemplateSession({ forceOpen:false });
  api.openTrashTemplateDialog(newRecord);
  recoverResolve(oldSession);
  await pendingRecovery;
  await Promise.resolve();
  let s = api.status();
  assert.strictEqual(s.trackedTrashTemplateRecord?.inventoryId, 'new-inv', 'stale recovery must not replace a newer local draft');
  assert.strictEqual(s.trackedTrashTemplateFillId, '', 'new unconfirmed draft must not adopt old fillId');
  assert.strictEqual(elements.trashTemplateSourceTitle.textContent, 'IKEA Leuchte');

  // A periodic lock/resync for a different old session must not hijack the open new draft either.
  deferred = Promise.resolve(oldSession);
  api.updateContext({ insertionLock:{locked:true,kind:'trash-template',ownerId:'old-fill',inventoryId:'old-inv'} });
  api.syncFromLock();
  await Promise.resolve(); await Promise.resolve();
  s = api.status();
  assert.strictEqual(s.trackedTrashTemplateRecord?.inventoryId, 'new-inv', 'lock resync must respect local draft ownership');
  assert.strictEqual(s.trackedTrashTemplateFillId, '');

  // Explicit user recovery is allowed to take ownership of the dialog.
  const reopened = await api.reopenTrashTemplateSession();
  assert.strictEqual(reopened, true);
  s = api.status();
  assert.strictEqual(s.trackedTrashTemplateFillId, 'old-fill');
  assert.strictEqual(s.trackedTrashTemplateRecord?.inventoryId, 'old-inv');
  assert.strictEqual(elements.trashTemplateSourceTitle.textContent, 'Kulturtasche');
  assert.ok(activities.length >= 1, 'recoverable session should remain represented by activity UI');

  console.log('v1.22.19 trash-template session isolation runtime: 9/9 PASS');
})().catch(error => { console.error(error); process.exit(1); });
