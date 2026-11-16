// KAR-197: source-identical, synthetic ZIP publish-blocked view and insertion-lock safety.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
globalThis.KRDeps={register(){}};
const UI=require('../src/app/archive-insertion-ui-controller.js');
const Lock=require('../src/background/services/insertion-lock-service.js');
const Archive=require('../src/background/services/archive-insertion-service.js');
const Diagnostics=require('../src/background/services/diagnostics-service.js');

function element(){
  const classes=new Set();
  return {
    textContent:'',
    classList:{add(...names){names.forEach(n=>classes.add(n));},
      remove(...names){names.forEach(n=>classes.delete(n));},
      contains(n){return classes.has(n);},
      toggle(n,force){const set=force===undefined?!classes.has(n):force; if(set)classes.add(n);else classes.delete(n);return set;}},
    get classNames(){return [...classes]}
  };
}
const blocked=Object.freeze({
  archiveInsertionId:'synthetic-archive',fillId:'synthetic-fill',
  status:'publish-blocked',stage:'publish-intent-blocked',
  lastError:'KR_PUBLISH_INTENT_ATOMIC_BUSY',remoteVerificationRequired:true,
  revision:3,renewalMode:'fast'
});
test('KAR-197 ZIP dialog shows blocked/unknown instead of continuing and preserves Fast mode',()=>{
  const elements={
    archiveInsertTitle:element(),archiveProgressMessage:element(),
    archiveProgressMessageTitle:element(),archiveProgressMessageText:element(),
    archiveBackgroundHint:element(),archiveProgressView:element(),archiveProgressEdit:element(),
    archivePhase3Label:element()
  };
  const ui=UI.create({elements,normalizeRenewalMode:x=>String(x||'safe'),fastMode:'fast'});
  assert.equal(ui.applyArchiveInsertionSessionSnapshot(blocked,{source:'test'}),true);
  assert.match(elements.archiveInsertTitle.textContent,/gesperrt/);
  assert.match(elements.archiveProgressMessageTitle.textContent,/gesperrt/);
  assert.match(elements.archiveProgressMessageText.textContent,/KR_PUBLISH_INTENT_ATOMIC_BUSY/);
  assert.match(elements.archiveProgressMessageText.textContent,/nicht unabhängig bestätigt/);
  assert.match(elements.archiveProgressMessageText.textContent,/Keine erneute Veröffentlichung/);
  assert.doesNotMatch(elements.archiveProgressMessageTitle.textContent,/Inserieren läuft/);
  assert.equal(elements.archiveBackgroundHint.classList.contains('hidden'),true);
  assert.equal(elements.archiveProgressView.classList.contains('hidden'),true);
  assert.equal(elements.archiveProgressEdit.classList.contains('hidden'),true);
  assert.equal(elements.archivePhase3Label.textContent,'Zusätzliche Inhaltsprüfung wird übersprungen');
  const model=ui.archiveProgressModel(blocked);
  assert.equal(model.fast,true);
  assert.equal(model.states[1],'error');
  assert.equal(model.states[3],'skipped');
  assert.equal(ui.applyArchiveInsertionSessionSnapshot({...blocked,status:'filling',revision:2},{source:'stale'}),false,
    'stale running event must not repaint a blocked ZIP session');
  assert.match(elements.archiveProgressMessageTitle.textContent,/gesperrt/);
});

test('KAR-197 archive status remains persisted, observable, and insertion-lock owned', async()=>{
  const rows=Object.create(null);
  const local={
    async get(key){return typeof key==='string'?{[key]:structuredClone(rows[key])}:structuredClone(rows);},
    async set(patch){Object.assign(rows,structuredClone(patch));}
  };
  rows.archiveInsertionSessionsV1={['synthetic-archive']:{...blocked,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),sourceTitle:'Synthetic',targetTabId:42}};
  const archive=Archive.create({storageLocal:local,normalizeRenewalMode:x=>x});
  const observed=await archive.getArchiveInsertionStatus({archiveInsertionId:'synthetic-archive'});
  assert.equal(observed.status,'publish-blocked');
  assert.equal(observed.remoteVerificationRequired,true);
  assert.equal(observed.lastError,'KR_PUBLISH_INTENT_ATOMIC_BUSY');
  const lock=Lock.create({
    readRenewalSessions:async()=>({}),
    readArchiveInsertionSessions:()=>archive.readArchiveInsertionSessions(),
    readFillSessions:async()=>({}),
    readMassRenewalBatch:async()=>null,
    renewalHoldsInsertionLock:()=>false,
    templateFillHoldsInsertionLock:()=>false,
    getInventory:async()=>null,
    logDiagnostic:async()=>{}
  });
  const state=await lock.getInsertionLockState();
  assert.equal(state.locked,true);
  assert.equal(state.kind,'archive-insertion');
  assert.equal(state.ownerId,'synthetic-archive');
  assert.equal(state.status,'publish-blocked');
  assert.match(lock.insertionLockMessage(state),/Keine erneute Veröffentlichung|keine erneute Veröffentlichung/);
  await assert.rejects(lock.assertInsertionStartAvailable({kind:'archive-insertion'}),
    /ungeklärt/,'new listing must remain blocked until independent outcome verification');
});

test('KAR-197 journal contention telemetry emits bounded private-free sample only on observed BUSY', async()=>{
  const rows=Object.create(null);
  const store={
    async get(keys){
      const names=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
      return Object.fromEntries(names.filter(k=>Object.hasOwn(rows,k)).map(k=>[k,structuredClone(rows[k])]));
    },
    async set(patch){Object.assign(rows,structuredClone(patch));}
  };
  const diagnostics=Diagnostics.create({storageLocal:store,randomUUID:()=> 'synthetic-diagnostic',
    maxDiagnostics:100,batchFlushMs:2});
  await diagnostics.recordPublishIntentSample({phase:'begin',busyAttempts:0,outcome:'ok'});
  await diagnostics.recordPublishIntentSample({phase:'begin',busyAttempts:2,waitMs:123,holdMs:17,
    outcome:'ok',token:'SECRET_SYNTHETIC_TOKEN',profileId:'SECRET_PROFILE'});
  await diagnostics.flush();
  const events=(await diagnostics.read()).filter(row=>row.event==='PUBLISH_INTENT_LOCK_CONTENTION');
  assert.equal(events.length,1,'no telemetry when lock acquisition did not contend');
  assert.equal(events[0].details?.busyAttempts,2);
  assert.equal(events[0].details?.waitMs,123);
  assert.equal(events[0].details?.holdMs,17);
  assert.ok(!JSON.stringify(events).includes('SECRET_'),'no account or intent token in diagnostics');
});
