// KAR-107 RED-first: real autonomous callbacks must count every persisted
// workflow owner they can mutate, even when the tab event crosses workflows.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Observer = require('../src/background/services/persisted-owner-observer.js');
const worker = fs.readFileSync('src/background/background.js','utf8');
const lifecycle = fs.readFileSync('src/background/controllers/tab-lifecycle-observer.js','utf8');
const template = fs.readFileSync('src/background/controllers/template-fill-controller.js','utf8');
const part = worker.match(/const AUTONOMOUS_PERSISTED_OWNER_KINDS = Object\.freeze\((\{[\s\S]*?\})\);/);
assert.ok(part, 'real background autonomous owner map must be available');
const names = vm.runInNewContext('('+part[1]+')', Object.create(null));
let checks = 0;
function ok(condition, message) { assert.ok(condition, message); checks++; console.log('PASS KAR107 '+message); }
const required = Object.freeze({
  'renewal-publish-detection': ['renewal','templateFill','archiveInsertion','insertionLock'],
  'trash-publish-detection': ['templateFill','insertionLock'],
  'template-error-terminalize': ['renewal','templateFill','archiveInsertion','insertionLock'],
  'tab-removed': ['bulkInventory','bulkReconciliation','renewal','templateFill','archiveInsertion','insertionLock'],
  'tab-lifecycle-update': ['bulkInventory','bulkReconciliation','renewal','massRenewal','templateFill','archiveInsertion','insertionLock'],
  'mass-renewal-watchdog-timer': ['massRenewal','insertionLock'],
  'archive-resume': ['archiveInsertion','templateFill','insertionLock']
});
async function main() {
  for (const [kind, owners] of Object.entries(required)) {
    ok(worker.includes("withAutonomousAdmission('"+kind+"'"),
      kind+' is a real source-called autonomous boundary');
    ok(Array.isArray(names[kind]) && owners.every(owner=>names[kind].includes(owner)),
      kind+' tracks every relevant persisted owner');
    ok(new Set(names[kind]).size === names[kind].length,
      kind+' cannot count the same owner twice');
  }
  ok(lifecycle.includes('persistRenewalSession(renewal)'), 'removed-tab path updates renewal state');
  ok(lifecycle.includes('persistArchiveInsertionSession(archive)'), 'removed-tab path updates archive state');
  ok(lifecycle.includes('writeFillSessions(sessions)'), 'removed-tab path updates fill state');
  ok(lifecycle.includes('mutateBulkRunState(run =>'), 'removed-tab path updates bulk state');
  ok(template.includes('await persistRenewalSession(renewal)'),'platform-error terminalization updates renewal');
  ok(template.includes('await persistArchiveInsertionSession(archive)'),'platform-error terminalization updates archive');
  ok(worker.includes('await confirmPublishedArchiveInsertion(fill, detected)'),'publish detection updates archive state');
  ok(worker.includes('await confirmPublishedRenewal(fill, detected)'),'publish detection updates renewal state');
  ok(worker.includes('async function maybeDetectTrashTemplatePublishedAd'),'independent trash-template publish detection exists');
  const local={async get(){return {};}};const session={async get(){return {};}};
  const activity=Observer.create({storageLocal:local,storageSession:session,clock:()=>12345});
  for (const [kind, owners] of Object.entries(required)) {
    let resolve;
    const deferred=activity.track(names[kind],()=>new Promise(done=>{resolve=done;}));
    ok(owners.every(owner=>activity.snapshotInFlight()[owner]===1),
      kind+' stays active while asynchronous callback is unfinished');
    const evidence=await activity.observe();
    ok(owners.every(owner=>evidence.observations[owner].state==='active'),
      kind+' marks active even without persisted session rows');
    resolve();
    await deferred;
    ok(owners.every(owner=>activity.snapshotInFlight()[owner]===0),
      kind+' releases all owners after completion');
  }
  ok(!worker.includes('getOwnerSnapshot: () => requirePersistedOwnerObserver()'),
    'tracking alone cannot authorize an update lease');
  console.log('PASS KAR107 total '+checks);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
