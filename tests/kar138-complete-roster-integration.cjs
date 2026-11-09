'use strict';
// KAR-138 source-first RED: verified online Ad IDs govern active local reconciliation.
// Synthetic IDs only. No remote Kleinanzeigen calls, no real Chrome profile changes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.env.KR_ROOT ? path.resolve(process.env.KR_ROOT) : path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const controller = read('src/background/controllers/bulk-inventory-controller.js');
const loop = read('src/content/inventory-run-loop.js');
const recon = read('src/background/services/bulk-reconciliation-service.js');
const Policy = require(path.join(root, 'src/background/lib/inventory-reconciliation.js'));
const RosterService = require(path.join(root, 'src/background/services/bulk-reconciliation-service.js'));
let passed = 0;
const check = (name, action) => {
  try { action(); passed += 1; console.log('PASS KAR-138: ' + name); }
  catch (error) { console.error('FAIL KAR-138: ' + name + ': ' + error.message); process.exitCode = 1; }
};
const ids = Array.from({length: 61}, (_, i) => String(100001 + i));
const pages = {1:ids.slice(0,25), 2:ids.slice(25,50), 3:ids.slice(50)};
check('source must explicitly prove the terminal page rather than trusting a guessed page number', () => {
  assert.match(loop, /BULK_FINISH_RUN'[^}]*terminalPageVerified:\s*true/);
  assert.match(loop, /BULK_FINISH_RUN'[^}]*terminalAdIds(?:\s*[:,}])/);
  assert.match(controller, /message\.terminalPageVerified === true/);
});
check('first roster is admitted on exact IDs, even if expected header 60 differs from 61 online', () => {
  assert.match(controller, /assessFirstRosterForIndependentScan\(/);
  assert.doesNotMatch(controller, /if \(processed === expected && state\.failedCount === 0 && firstRosterComplete\)/);
  assert.match(controller, /moveReconciliationCandidatesToTrash\(state, firstRoster\.ids\)/);
});
check('each scanned page is bound to the same profile and stable online-count observation', () => {
  assert.match(loop, /BULK_RECORD_ROSTER_PAGE'[^}]*profileName:/);
  assert.match(loop, /BULK_RECORD_ROSTER_PAGE'[^}]*onlineCount:/);
  assert.match(recon, /Anzeigenkonto|Kleinanzeigen-Konto|Konto.*gewechselt/i);
});
check('strict negative first roster evidence never authorizes local trash', () => {
  for (const v of [
    {rosterPages:{1:ids.slice(0,25),3:ids.slice(50)},terminalPageVerified:true,invalidReason:null},
    {rosterPages:pages,terminalPageVerified:false,invalidReason:null},
    {rosterPages:pages,terminalPageVerified:true,invalidReason:'page-changed'},
    {rosterPages:{1:['bad-id']},terminalPageVerified:true,invalidReason:null}
  ]) {
    const outcome = Policy.assessFirstRosterForIndependentScan({
      expectedTotal:60,processedIds:ids,...v
    });
    assert.equal(outcome.canMoveToTrash,false);
    assert.equal(outcome.canStartIndependentScan,false);
  }
});
check('the authoritative ID set includes 61 unique IDs on three consecutive pages', () => {
  const outcome = Policy.assessFirstRosterForIndependentScan({
    rosterPages:pages,expectedTotal:60,processedIds:ids,terminalPageVerified:true
  });
  assert.equal(outcome.observedCount,61);
  assert.equal(outcome.countMismatch,true);
  assert.equal(outcome.canStartIndependentScan,true);
});
check('four same-title listings are still four different Ad IDs and never name-deduplicated', () => {
  const oldA={inventoryId:'i1',adId:'501001',profileId:'p1',title:'Same Windlicht'};
  const oldB={inventoryId:'i2',adId:'501002',profileId:'p1',title:'Same Windlicht'};
  const newC={inventoryId:'i3',adId:'501003',profileId:'p1',title:'Same Windlicht'};
  const newD={inventoryId:'i4',adId:'501004',profileId:'p1',title:'Same Windlicht'};
  assert.deepEqual(Policy.selectAbsentCandidates([oldA,oldB,newC,newD],'p1',['501003','501004']).map(x=>x.inventoryId),['i1','i2']);
});
async function transactionProof() {
  const localIds = [...ids, ...Array.from({length:22},(_,i)=>String(200001+i))];
  const records=localIds.map((id,i)=>({inventoryId:'local-'+i,adId:id,profileId:'p1',recordKind:'inventory'}));
  const changes=[];
  const context=()=>({});
  const service=RosterService.create({
    getBulkRunState:async()=>null, normalizeProfileName:x=>String(x||''), writeBulkRunState:async s=>s,
    logDiagnostic:async()=>{}, sessionCorrelationContext:context,releaseBulkSourceOwnership:async()=>{},
    readRenewalSessions:async()=>({active:{profileId:'p1',status:'running',sourceInventoryId:'local-61'}}),
    readFillSessions:async()=>({}),readMassRenewalBatch:async()=>null,
    isTrashRecord:r=>r.recordKind==='trash',
    readInventoryRecordsForProfile:async()=>records,
    openDatabase:async()=>({
      transaction() {
        const tx={objectStore(){return {put(v){changes.push(v)}}}};
        queueMicrotask(()=>tx.oncomplete?.());
        return tx;
      },close(){}
    }),
    trashRecordFrom:(record,reason,details)=>({...record,recordKind:'trash',trash:{trashedAt:'2026-11-09T00:00:00Z'},reason,details}),
    broadcastInventoryChanged:()=>{},
    normalBrowserWindowId:async()=>0, bulkRunOwnerExpectation:()=>({}),assertPlatformAccessAllowed:async()=>{},
    createAutomationTab:async()=>({}),registerShadowTab:async()=>{},updateAutomationTab:async()=>({}),
    waitForTabComplete:async()=>{},ensureContentConnection:async()=>{},sendTabRequestWithBootstrap:async()=>{},
    closeRegistryTab:async()=>{},scheduleBulkSourceTabClose:()=>{},inventoryReconciliationApi:Policy
  });
  const result=await service.moveReconciliationCandidatesToTrash({profileId:'p1',runId:'test-run',remoteRosterIds:ids,bulkRunId:'test-run'},ids);
  assert.equal(result.moved,21);
  assert.equal(changes.length,21);
  assert.ok(changes.every(v=>!ids.includes(v.adId)));
  assert.ok(changes.every(v=>v.recordKind==='trash'));
  assert.ok(changes.every(v=>v.adId!=='200001'));
  console.log('PASS KAR-138: 61 online / 83 local => 22 absent, 21 trashed and one protected (atomic local-only)',result.moved);
}
transactionProof().then(()=>{
  if(!process.exitCode)console.log('KAR-138: '+passed+' static/policy + 1 atomic local test PASS');
}).catch(e=>{console.error('FAIL KAR-138: '+(e.stack||e.message));process.exitCode=1;});
