const { includesActivePatch } = require('./current-patch-policy.cjs');
const assert = require('assert');
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('manifest.json','utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json','utf8'));
const spec = JSON.parse(fs.readFileSync('release/release-spec.json','utf8'));
const arch = JSON.parse(fs.readFileSync('architecture-progress-v1.23.20_c1.json','utf8'));
function pass(name, fn) { fn(); console.log(`PASS ${name}`); }
pass('v1.23.20_c1 release evidence remains explicit under later correction builds',()=>{
  assert.equal(arch.packageVersion,'1.23.20_c1');
  if (manifest.version === '1.23.20') {
    assert.equal(manifest.version_name,'1.23.20_c1');
    assert.equal(pkg.version,'1.23.20');
    assert.equal(pkg.displayVersion,'1.23.20');
    assert.equal(lock.version,'1.23.20');
    assert.equal(lock.packages[''].version,'1.23.20');
    assert.equal(spec.packageVersion,'1.23.20_c1');
  } else {
    assert.ok(includesActivePatch(['1.23.22','1.23.23','1.23.24'], manifest.version));
    assert.equal(spec.directBasis,'1.23.20_c1');
  }
});
pass('correction basis and native-red cause remain archived',()=>{
  assert.equal(arch.directBasis,'1.23.20');
  assert.equal(arch.directBasisNativePerformancePreparationRed,true);
  assert.equal(arch.nativeEvidence.exportedEntries,35);
  assert.equal(arch.nativeEvidence.representedEvents,39);
  assert.equal(arch.nativeEvidence.startedEventPresent,false);
  assert.equal(arch.nativeEvidence.staleBatchId,'19b07d73-85fc-48f8-ab3c-df3c7ee80fcb');
});
pass('c1 series-final evidence remains archived',()=>{
  assert.equal(arch.seriesFinal,true);
  assert.equal(arch.nextPlannedBuild,null);
  assert.equal(arch.performanceRunRequired,true);
  assert.equal(arch.performanceGateVersion,'1.23.20_c1');
});
pass('correction remains narrowly scoped and fail-closed',()=>{
  assert.equal(arch.fix.newRuntimeBoundary,false);
  assert.equal(arch.fix.newMessageType,false);
  assert.equal(arch.fix.autoPublishChanged,false);
  assert.equal(arch.fix.draftWorkflowPersisted,false);
  assert.equal(arch.fix.sameTrackedBatchTerminalTransitionPreserved,true);
});

pass('public API coverage evidence is deterministic for release checkpoints',()=>{
  const report = fs.readFileSync('scripts/v12319-coverage-report.cjs','utf8');
  assert.match(report,/executionCount:runtimeExecuted\?1:0/,
    'public API report must normalize run-dependent V8 counts to binary execution evidence');
});
console.log('PASS v1.23.20_c1 version/release contract');
