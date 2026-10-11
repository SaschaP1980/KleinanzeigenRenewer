const fs=require('fs'); const assert=require('assert');
const exists=p=>fs.existsSync(p); const read=p=>fs.readFileSync(p,'utf8'); let pass=0;
function ok(name,fn){fn();pass++;console.log('PASS',name)}
ok('inventory and trash card renderers exist as separate owners',()=>{
  assert.ok(exists('src/app/inventory-card-renderer.js'));
  assert.ok(exists('src/app/trash-card-renderer.js'));
});
ok('genuinely shared record primitives have a dedicated view owner',()=>{
  assert.ok(exists('src/app/record-card-view.js'));
  const s=read('src/app/record-card-view.js');
  assert.match(s,/KRRecordCardView/); assert.match(s,/buildFullImageStrip/); assert.match(s,/createCompactListRow/);
});
ok('inventory render controller is orchestration only',()=>{
  const s=read('src/app/inventory-render-controller.js');
  assert.doesNotMatch(s,/function renderCompactInventoryRow\s*\(/);
  assert.doesNotMatch(s,/function renderCompactTrashRow\s*\(/);
  assert.doesNotMatch(s,/function renderInventories\s*\(/);
  assert.doesNotMatch(s,/function renderTrash\s*\(/);
  assert.match(s,/KRInventoryCardRenderer|InventoryCardRenderer/);
  assert.match(s,/KRTrashCardRenderer|TrashCardRenderer/);
});
ok('archive insertion and trash-template UI have separate owners',()=>{
  assert.ok(exists('src/app/archive-insertion-ui-controller.js'));
  assert.ok(exists('src/app/trash-template-ui-controller.js'));
  const a=read('src/app/archive-insertion-ui-controller.js');
  const t=read('src/app/trash-template-ui-controller.js');
  assert.match(a,/KRArchiveInsertionUiController/); assert.doesNotMatch(a,/USER_TRASH_TEMPLATE_FILL_STARTED/);
  assert.match(t,/KRTrashTemplateUiController/); assert.doesNotMatch(t,/USER_ARCHIVE_INSERT_CONFIRMED/);
});
ok('compatibility facade composes archive and trash-template owners',()=>{
  const s=read('src/app/archive-trash-insertion-ui-controller.js');
  assert.match(s,/KRArchiveInsertionUiController|ArchiveInsertionUiController/);
  assert.match(s,/KRTrashTemplateUiController|TrashTemplateUiController/);
  assert.ok(s.split('\n').length < 220, `facade too large: ${s.split('\n').length}`);
});
ok('profile backup IndexedDB mechanics moved to storage service',()=>{
  assert.ok(exists('src/app/profile-backup-storage-service.js'));
  const svc=read('src/app/profile-backup-storage-service.js');
  const ctl=read('src/app/profile-backup-controller.js');
  assert.match(svc,/KRProfileBackupStorageService/);
  assert.match(svc,/snapshotProfileIndexedData/);
  assert.match(svc,/replaceProfileIndexedData/);
  assert.doesNotMatch(ctl,/indexedDB\.open\(/);
});
console.log(`${pass}/6 PASS v1.23.14 ownership`);
