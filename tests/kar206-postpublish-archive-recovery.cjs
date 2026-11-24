'use strict';
// KAR-206: owner-native ZIP publication succeeded; complete only by the
// original immutable publish intent plus independently verified new ad ID.
// Synthetic, no Kleinanzeigen, no real account, no remote mutation.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Source=require('../src/background/services/archive-insertion-recovery-service.js');

function fixture({status='filling',stage='publish-submitted',
  fillStatus='running',fillStage='publish-submitted',
  detection={adId:'990001',detectionSource:'confirmation-page'},
  target=17,hasIntent=true,remoteProofAccepted=true}={}) {
  const calls=[],logs=[];
  const id='synthetic-archive-206',fillId='synthetic-fill-206';
  const sessions={[id]:{archiveInsertionId:id,fillId,
    status,stage,targetTabId:target,newAdId:null,
    sourceAdId:'123456',stagingInventoryId:'archive:'+id}};
  const fills={[fillId]:{fillId,archiveInsertionId:id,
    targetTabId:target,sourceAdId:'123456',status:fillStatus,stage:fillStage}};
  const options={
    readArchiveInsertionSessions:async()=>sessions,
    readFillSessions:async()=>fills,
    getInventory:async()=>null,
    isTrashRecord:()=>false,
    persistArchiveInsertionSession:async row=>{calls.push('persist');sessions[row.archiveInsertionId]=row;},
    deleteImagesByInventoryId:async()=>{calls.push('delete-images');},
    logDiagnostic:async(_severity,event,data)=>{logs.push({event,reason:data?.reason||data?.message||null});},
    setAppNotice:async()=>{calls.push('notice');},
    broadcastInventoryChanged:()=>{calls.push('broadcast');},
    normalizeRenewalMode:v=>String(v||'fast'),
    cryptoApi:{randomUUID:()=> 'synthetic-uuid'},
    compareArchiveInsertionRecords:async()=>({status:'match'}),
    runArchiveInsertionPostPublish:async()=>{calls.push('post-publish');},
    confirmPublishedArchiveInsertion:async(fill,found)=>{
      calls.push('confirm');
      assert.equal(fill.fillId,fillId);
      assert.equal(found.adId,'990001');
      if(!remoteProofAccepted)throw Object.assign(Error('KR_PUBLISH_INTENT_UNVERIFIED'),
        {code:'KR_PUBLISH_INTENT_UNVERIFIED'});
      sessions[id].newAdId=found.adId;
      sessions[id].status='published';
    },
    detectPublishedAdForFill:async(tabId,sourceAdId)=>{
      calls.push('detect');
      assert.equal(tabId,target);
      assert.equal(sourceAdId,'123456');
      return detection;
    },
    withAutonomousAdmission:async(_name,fn)=>fn()
  };
  const api=Source.create(options);
  return {api,sessions,fills,calls,logs,id};
}
test('recover the exact v1.25.27 filling/publish-submitted ZIP state without republishing',async()=>{
  const f=fixture();
  await f.api.resumePendingArchiveInsertions();
  assert.deepEqual(f.calls,['detect','confirm']);
  assert.equal(f.sessions[f.id].status,'published');
  assert.equal(f.sessions[f.id].newAdId,'990001');
});
test('legacy submitted path also works using an explicitly wired detector',async()=>{
  const f=fixture({status:'submitted'});
  await f.api.resumePendingArchiveInsertions();
  assert.deepEqual(f.calls,['detect','confirm']);
});
test('no independent new-ID evidence means wait, never fabricate completion',async()=>{
  const f=fixture({detection:null});
  await f.api.resumePendingArchiveInsertions();
  assert.deepEqual(f.calls,['detect']);
  assert.equal(f.sessions[f.id].newAdId,null);
  assert.equal(f.sessions[f.id].status,'filling');
});
test('a denied immutable publish-intent verification remains unresolved and never republished',async()=>{
  const f=fixture({remoteProofAccepted:false});
  await f.api.resumePendingArchiveInsertions();
  assert.deepEqual(f.calls,['detect','confirm']);
  assert.equal(f.sessions[f.id].newAdId,null);
  assert.equal(f.sessions[f.id].status,'filling');
  assert.ok(f.logs.some(e=>e.event==='ARCHIVE_INSERT_RESUME_DEFERRED'));
});
test('never recover wrong workflow stage, unknown fill identity, or terminal blocked state',async()=>{
  const states=[
    {status:'filling',stage:'form-ready'},
    {status:'filling',stage:'auto-publish-ready'},
    {status:'needs-review',stage:'publish-submitted'},
    {status:'error',stage:'publish-submitted'},
    {status:'publish-blocked',stage:'publish-submitted'},
    {status:'complete',stage:'complete'},
    {status:'filling',stage:'publish-submitted',fillStage:'form-ready'},
    {status:'filling',stage:'publish-submitted',fillStatus:'needs-review'},
    {status:'filling',stage:'publish-submitted',target:0}
  ];
  for(const candidate of states){
    const f=fixture(candidate);
    await f.api.resumePendingArchiveInsertions();
    assert.equal(f.calls.includes('detect'),false,JSON.stringify(candidate));
    assert.equal(f.calls.includes('confirm'),false,JSON.stringify(candidate));
    assert.equal(f.sessions[f.id].newAdId,null);
  }
});
test('verification service admission, not recovery, owns any persisted publication success',()=>{
  const source=require('node:fs').readFileSync('src/background/services/archive-insertion-recovery-service.js','utf8');
  const verification=require('node:fs').readFileSync('src/background/services/archive-insertion-verification-service.js','utf8');
  const controller=require('node:fs').readFileSync('src/background/controllers/archive-insertion-controller.js','utf8');
  assert.match(source,/detectPublishedAdForFill/);
  assert.match(source,/confirmPublishedArchiveInsertion\(fill, detected\)/);
  assert.match(verification,/await resolvePublishIntent\(fill, detected\)/);
  assert.match(controller,/detectPublishedAdForFill/);
  assert.doesNotMatch(source,/\.click\s*\(|\.submit\s*\(|requestSubmit\s*\(/);
});
