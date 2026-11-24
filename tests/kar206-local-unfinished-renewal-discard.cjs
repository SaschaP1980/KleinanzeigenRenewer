'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Service=require('../src/background/services/renewal-local-discard-service.js');
const Formatting=require('../src/app/inventory-formatting.js');
const renewalId='synthetic-206-1';
const candidateId='renewal:'+renewalId;
function fixture({sessionPatch={},candidatePatch={},fillPatch={},bulk=null,journalState=null}={}) {
  const renewal={renewalId,sourceInventoryId:'old-inventory',sourceAdId:'10001',
    skeletonInventoryId:candidateId,status:'cancelled',stage:'emergency-reset-unverified',
    emergencyResetAt:'2026-11-24T05:54:00.000Z',
    remoteVerification:'unverified',remoteVerificationRequired:true,newAdId:null,
    profileId:'test-profile',fillId:'fill-206-1',...sessionPatch};
  const candidate={inventoryId:candidateId,recordKind:'renewal-draft',adId:null,profileId:'test-profile',
    renewal:{renewalId,status:'submitted',stage:'publish-submitted',newAdId:null},...candidatePatch};
  const sessions={[renewalId]:renewal};
  const records={'old-inventory':{inventoryId:'old-inventory',adId:'10001',profileId:'test-profile'},[candidateId]:candidate};
  const fills={[renewal.fillId]:{fillId:renewal.fillId,renewalId,status:'cancelled',stage:'emergency-reset-unverified',...fillPatch}};
  const calls=[],diagnostics=[];
  const options={
    readRenewalSessions:async()=>sessions,writeRenewalSessions:async()=>{calls.push('renewals-write');},
    readFillSessions:async()=>fills,writeFillSessions:async()=>{calls.push('fills-write');},
    getInventory:async id=>records[id]||null,
    deleteInventoryStorageRecord:async id=>{calls.push('local-delete:'+id);delete records[id];return {inventoryId:id};},
    getBulkRunState:async()=>bulk,
    closeRegistryTab:async()=>{calls.push('tab-close');},
    logDiagnostic:async (_level,event)=>{diagnostics.push(event);},
    broadcastInventoryChanged:(event)=>{calls.push('broadcast:'+event);},
    sessionCorrelationContext:()=>({}),
    ...(journalState?{observePublishIntent:async()=>journalState}: {})
  };
  return {svc:Service.create(options),sessions,records,fills,calls,diagnostics};
}
test('only selected cancelled post-publish orphan is removed locally, tombstone and other inventory remain',async()=>{
  const f=fixture();
  const result=await f.svc.discardUnfinishedLocal({renewalId,inventoryId:candidateId});
  assert.equal(result.discarded,true);
  assert.equal(f.records[candidateId],undefined);
  assert.equal(f.records['old-inventory'].adId,'10001');
  assert.equal(f.sessions[renewalId].status,'cancelled');
  assert.equal(f.sessions[renewalId].remoteVerificationRequired,true);
  assert.equal(f.fills['fill-206-1'].status,'cancelled');
  assert.deepEqual(f.calls,['local-delete:'+candidateId,'broadcast:renewal-unfinished-local-discard']);
  assert.ok(f.diagnostics.includes('RENEWAL_UNFINISHED_LOCAL_DISCARDED'));
});
test('an active published or uncertain renewal must be emergency-reset first',async()=>{
  for (const patch of [
    {status:'submitted',stage:'publish-submitted',emergencyResetAt:null},
    {status:'running',stage:'publish-submitted'},
    {status:'cancelled',stage:'manual-emergency-reset'},
    {status:'cancelled',stage:'emergency-reset-unverified',emergencyResetAt:null},
    {status:'cancelled',stage:'emergency-reset-unverified',remoteVerificationRequired:false},
    {status:'cancelled',stage:'emergency-reset-unverified',newAdId:'20002'},
    {status:'cancelled',stage:'emergency-reset-unverified',newIdConfirmedAt:'2026-11-24T05:17:00Z'},
    {status:'cancelled',stage:'emergency-reset-unverified',comparison:{ownAdsPresence:true}},
    {status:'replaced',stage:'complete'}
  ]) {
    const f=fixture({sessionPatch:patch});
    await assert.rejects(f.svc.discardUnfinishedLocal({renewalId,inventoryId:candidateId}));
    assert.ok(f.records[candidateId],JSON.stringify(patch));
    assert.deepEqual(f.calls,[]);
  }
});
test('wrong or masquerading record, wrong profile/ID, and another active batch block removal',async()=>{
  const scenarios=[
    {candidatePatch:{recordKind:'inventory'}},
    {candidatePatch:{adId:'20002'}},
    {candidatePatch:{profileId:'other-profile'}},
    {candidatePatch:{renewal:{renewalId:'other',status:'submitted',stage:'publish-submitted'}}},
    {sessionPatch:{skeletonInventoryId:'old-inventory'}},
    {sessionPatch:{sourceInventoryId:candidateId}},
    {fillPatch:{status:'running'}},
    {bulk:{status:'running'}}
  ];
  for(const scenario of scenarios) {
    const f=fixture(scenario);
    await assert.rejects(f.svc.discardUnfinishedLocal({renewalId,inventoryId:candidateId}));
    assert.ok(f.records[candidateId],JSON.stringify(scenario));
    assert.deepEqual(f.calls,[]);
  }
  const f=fixture();
  await assert.rejects(f.svc.discardUnfinishedLocal({renewalId,inventoryId:'old-inventory'}));
  assert.ok(f.records[candidateId]);
  assert.deepEqual(f.calls,[]);
});
test('existing pre-publish Entwurf verwerfen retains its former source and image semantics',async()=>{
  const f=fixture({
    sessionPatch:{status:'draft',stage:'draft-created',emergencyResetAt:null,
      remoteVerificationRequired:false},
    candidatePatch:{renewal:{renewalId,status:'draft',stage:'draft-created',newAdId:null}},
    fillPatch:{status:'running',stage:'draft-created'}
  });
  const result=await f.svc.discardDraft({renewalId});
  assert.equal(result.discarded,true);
  assert.equal(f.sessions[renewalId],undefined);
  assert.ok(f.records['old-inventory']);
  assert.equal(f.records[candidateId],undefined);
  assert.deepEqual(f.calls,['fills-write','renewals-write',
    'local-delete:'+candidateId,'broadcast:renewal-draft-discarded']);
});
test('after cancelled reset, target with confirmed new ID or unresolved unrelated renewal never qualifies',async()=>{
  const f=fixture();
  const second='synthetic-206-2';
  f.sessions[second]={...f.sessions[renewalId],renewalId:second,
    skeletonInventoryId:'renewal:'+second,sourceInventoryId:'other-source'};
  f.records['other-source']={inventoryId:'other-source',adId:'40004'};
  f.records['renewal:'+second]={...f.records[candidateId],
    inventoryId:'renewal:'+second,renewal:{...f.records[candidateId].renewal,renewalId:second}};
  await f.svc.discardUnfinishedLocal({renewalId,inventoryId:candidateId});
  assert.ok(f.records['renewal:'+second]);
  assert.ok(f.sessions[second]);
});
test('UI displays targeted action only for unconfirmed post-publish orphan; never normal records',()=>{
  const f=Formatting.create({sharedUiHelpers:{}});
  const pending={recordKind:'renewal-draft',adId:null,
    renewal:{renewalId,status:'submitted',stage:'publish-submitted',newAdId:null}};
  assert.equal(f.canDiscardUnfinishedRenewal(pending),true);
  assert.equal(f.canDiscardUnfinishedRenewal({...pending,recordKind:'inventory'}),false);
  assert.equal(f.canDiscardUnfinishedRenewal({...pending,adId:'20002'}),false);
  assert.equal(f.canDiscardUnfinishedRenewal({...pending,renewal:{...pending.renewal,newAdId:'20002'}}),false);
  assert.equal(f.canDiscardUnfinishedRenewal({...pending,renewal:{...pending.renewal,status:'draft'}}),false);
});
test('new client route is P8-fenced and label appears in both inventory views',()=>{
  const registry=fs.readFileSync('src/shared/message-contract-registry.js','utf8');
  const router=fs.readFileSync('src/background/background-message-router.js','utf8');
  const background=fs.readFileSync('src/background/background.js','utf8');
  const cards=fs.readFileSync('src/app/inventory-card-renderer.js','utf8');
  for(const src of [registry,router,background,cards]) assert.match(src,/DISCARD_UNFINISHED_RENEWAL_LOCAL/);
  assert.match(cards,/Unfertigen Austausch lokal verwerfen/);
  assert.match(background,/KRRenewalLocalDiscardService/);
  assert.doesNotMatch(router,/UNFENCED_ROUTES[\s\S]{0,400}DISCARD_UNFINISHED_RENEWAL_LOCAL/);
  assert.doesNotMatch(Service.create.toString(),/chrome\.tabs|\.submit\s*\(|requestSubmit\s*\(|delete.*remote/i);
});

test('explicit blocked-draft retry requires exact terminal no-click identity and authoritative empty journal',async()=>{
  const patch={status:'verification-failed',stage:'publish-intent-blocked',lastError:'KR_PUBLISH_INTENT_ATOMIC_BUSY',emergencyResetAt:null,remoteVerificationRequired:false};
  const fillPatch={status:'needs-review',stage:'publish-intent-blocked',sourceAdId:'10001',targetTabId:42,result:{complete:true,issues:[]}};
  for(const journalState of [null,{state:'unverified',attempts:[{}],resolutions:[]},{state:'missing',attempts:[],resolutions:[{}]}]){
    const f=fixture({sessionPatch:{...patch,targetTabId:42},fillPatch,journalState});
    await assert.rejects(f.svc.discardDraft({renewalId}));assert.deepEqual(f.calls,[]);
  }
  const f=fixture({sessionPatch:{...patch,targetTabId:42},fillPatch,journalState:{state:'missing',attempts:[],resolutions:[]}});
  assert.equal((await f.svc.discardDraft({renewalId})).discarded,true);assert.ok(f.records['old-inventory']);
});
