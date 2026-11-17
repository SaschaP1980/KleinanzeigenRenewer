// KAR-199: status timeouts persist a truthful, user-visible, non-destructive
// Phase-4 outcome. Synthetic same-account fixture; never connects to Kleinanzeigen.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Remote = require('../src/background/services/remote-delete-replacement-service.js');

function runFixture(statusPlan) {
  let statusIndex = 0;
  let journalStarts = 0;
  let deleteCalls = 0;
  let retryStarts = 0;
  const notices = [];
  const persisted = [];
  const session = {
    renewalId:'r199',sourceInventoryId:'old-local',skeletonInventoryId:'new-local',
    sourceAdId:'100',newAdId:'200',status:'verified',stage:'replacement-ready'
  };
  const goodStatus = {isMyAdsPage:true,isProjectsTab:true,profileName:'fixture-account'};
  const remote = Remote.create({
    readRenewalSessions:async () => ({r199:session}),
    persistRenewalSession:async state => {persisted.push({...state});return state;},
    getInventory:async id => id==='old-local'
      ? {inventoryId:id,profileName:'fixture-account',adId:'100'}
      : {inventoryId:id,profileName:'fixture-account',adId:'200'},
    assertMassRenewalManualActionAllowed:async () => {},
    getBulkRunState:async () => ({status:'complete'}),
    observePhase4Attempts:async () => ({attempts:[]}),
    beginPhase4Attempt:async () => {journalStarts++; return {attemptId:'intent-1'};},
    normalBrowserWindowId:async () => null,
    createManagedWorkerTab:async () => ({id:73}),
    waitForTabComplete:async () => ({status:'complete'}),
    ensureContentConnection:async () => ({ready:true}),
    closeManagedWorkerTab:async () => {},
    sendTabRequestWithBootstrap:async (_id, message) => {
      if(message.type==='MY_ADS_STATUS') {
        const action=statusPlan[statusIndex++];
        return action==='never'?new Promise(() => {}):goodStatus;
      }
      if(message.type==='DELETE_OWN_AD_BY_ID') {deleteCalls++;throw Error('DELETE must not be called');}
      throw Error('unexpected request '+message.type);
    },
    phase4StatusRequestTimeoutMs:35,
    normalizeProfileName:value=>String(value||'').trim(),
    renewalPhaseAttemptAvailable:()=>true,
    renewalAttemptState:()=>({attempt:0}),
    logRenewalPhaseAttemptStarted:async () => {retryStarts++;return {attempt:1,attemptId:'a1'};},
    renewalMaxPhaseAttempts:()=>3,
    setAppNotice:async notice => {notices.push(notice);return notice;},
    logDiagnostic:async () => {},
    sessionCorrelationContext:()=>({}),
    correlationContext:()=>({}),
    assertEmergencyResetGeneration:()=>true
  });
  return {
    run:()=>remote.finishRenewalReplacement({renewalId:'r199',automatic:true}),
    get session(){return session;},persisted,notices,
    get journalStarts(){return journalStarts;},
    get deleteCalls(){return deleteCalls;},
    get retryStarts(){return retryStarts;}
  };
}
function timely(promise) {
  return Promise.race([promise,new Promise((_,reject)=>setTimeout(
    ()=>reject(new Error('TEST_UNBOUNDED_PHASE4_RECOVERY')),600))]);
}

test('KAR-199 pre-intent status timeout creates recoverable user notice, no automatic retry', {timeout:3000}, async () => {
  const f=runFixture(['never']);
  await assert.rejects(timely(f.run()),e=>e?.code==='KR_PHASE4_STATUS_TIMEOUT');
  assert.equal(f.session.status,'verified');
  assert.equal(f.session.stage,'source-delete-status-unverified');
  assert.equal(f.persisted.at(-1).stage,'source-delete-status-unverified');
  assert.equal(f.notices.length,1);
  assert.match(f.notices[0].text,/Neue Anzeige bestätigt; alte Anzeige noch nicht nachweislich gelöscht/);
  assert.equal(f.journalStarts,0);
  assert.equal(f.deleteCalls,0);
  assert.equal(f.retryStarts,1);
});

test('KAR-199 post-intent status timeout preserves immutable uncertain delete boundary', {timeout:3000}, async () => {
  const f=runFixture(['ready','never']);
  await assert.rejects(timely(f.run()),e=>e?.code==='KR_PHASE4_JOURNAL_ACCOUNT_UNVERIFIED');
  assert.equal(f.session.status,'verified');
  assert.equal(f.session.stage,'source-delete-outcome-unverified');
  assert.equal(f.notices.length,1);
  assert.equal(f.journalStarts,1);
  assert.equal(f.deleteCalls,0);
  assert.equal(f.retryStarts,1);
});
