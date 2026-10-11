const assert=require('node:assert/strict');
const RecordCardView=require('../src/app/record-card-view.js');
const InventoryCardRenderer=require('../src/app/inventory-card-renderer.js');
const TrashCardRenderer=require('../src/app/trash-card-renderer.js');
const InventoryRenderController=require('../src/app/inventory-render-controller.js');
const ArchiveInsertionUiController=require('../src/app/archive-insertion-ui-controller.js');
const TrashTemplateUiController=require('../src/app/trash-template-ui-controller.js');
const ArchiveTrashInsertionUiController=require('../src/app/archive-trash-insertion-ui-controller.js');
const ProfileBackupStorageService=require('../src/app/profile-backup-storage-service.js');
const ProfileBackupController=require('../src/app/profile-backup-controller.js');
let pass=0; const p=async(n,f)=>{await f();pass++;console.log('PASS '+n)};
const formatting=new Proxy({}, { get(){ return ()=>''; } });
formatting.publicAvailabilityPending=()=>false; formatting.templateReady=()=>false; formatting.renewalIsReplacementReady=()=>false; formatting.renewalAutoCompletionPending=()=>false;
const sharedUiHelpers={makeCompactIconButton:()=>({addEventListener(){},classList:{add(){},remove(){},toggle(){}},dataset:{},disabled:false})};
(async()=>{
await p('rendering composition can be constructed without new IPC',()=>{
  const options={document:{},Element:function(){},InventoryView:{},formatting,sharedUiHelpers,elements:{}};
  const shared=RecordCardView.create(options);
  const inv=InventoryCardRenderer.create({...options,recordCardView:shared});
  const trash=TrashCardRenderer.create({...options,recordCardView:shared});
  assert.equal(typeof inv.renderInventories,'function'); assert.equal(typeof trash.renderTrash,'function');
  const facade=InventoryRenderController.create({...options,RecordCardView,InventoryCardRenderer,TrashCardRenderer});
  facade.updateContext({records:[],trashRecords:[],selectedProfileId:'p1'});
  assert.equal(typeof facade.renderInventories,'function'); assert.equal(typeof facade.renderTrash,'function');
});
await p('archive and trash-template UI owners compose through compatibility facade',()=>{
  const options={document:{},elements:{},ArchiveInsertionUiController,TrashTemplateUiController};
  const facade=ArchiveTrashInsertionUiController.create(options);
  facade.updateContext({renewalConfiguration:{renewalMode:'safe'},insertionLock:{locked:false},selectedProfileId:'p1',trashRecords:[]});
  facade.install(); const status=facade.status();
  assert.equal(status.archiveDialogMode,'closed'); assert.equal(status.trashTemplateDialogMode,'closed');
  assert.equal(typeof facade.handleArchiveStateChanged,'function'); assert.equal(typeof facade.reopenTrashTemplateSession,'function');
});
await p('trash-template UI preserves setStatus error reporting after owner split',()=>{
  const calls=[];
  const c=TrashTemplateUiController.create({document:{},elements:{},setStatus:(...args)=>calls.push(args)});
  assert.equal(c.openTrashTemplateDialog({inventoryId:'i1',adId:'10',profileId:'p1',title:'X'}),false);
  assert.deepEqual(calls,[['error','Vorlage kann nicht geöffnet werden','Der Vorlagen-Dialog ist in dieser App-Ansicht nicht verfügbar.']]);
});
await p('profile backup controller delegates snapshot and replace to storage service',()=>{
  const calls=[]; const storage={snapshotProfileIndexedData:async id=>{calls.push(['snapshot',id]);return {records:[],images:[]}},replaceProfileIndexedData:async payload=>{calls.push(['replace',payload.targetProfileId]);return {records:[],images:[],previousInventoryIds:[]}}};
  const c=ProfileBackupController.create({document:{querySelector(){return null}},crypto:{randomUUID(){return 'op'}},elements:{},profileBackupStorage:storage});
  return Promise.resolve().then(async()=>{await c.snapshotProfileIndexedData('p1');await c.replaceProfileIndexedData({targetProfileId:'p1'});assert.deepEqual(calls,[['snapshot','p1'],['replace','p1']]);});
});
await p('storage service is an explicit IndexedDB boundary',()=>{
  const svc=ProfileBackupStorageService.create({indexedDB:{open(){throw new Error('not opened during construction')}},IDBKeyRange:{only:v=>v}});
  assert.equal(typeof svc.snapshotProfileIndexedData,'function'); assert.equal(typeof svc.replaceProfileIndexedData,'function');
});
console.log(`${pass}/5 PASS v1.23.14 runtime`);
})().catch(e=>{console.error(e);process.exit(1)});
