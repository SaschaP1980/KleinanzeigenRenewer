'use strict';
// Narrow, test-only S02 context. Never change legacy version predicates or alias
// an absent module globally. Existing non-S02 tests execute their original path.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {assertRestoredBaselineVersion}=require('./current-patch-policy.cjs');
function isRestored(root) {
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
  if(manifest.version!=='2.0.0.0') return false;
  assert.equal(assertRestoredBaselineVersion(root),'2.0.0.0');
  return true;
}
function captureOwner(root) {
  const extracted='src/background/services/inventory-capture-service.js';
  if(!isRestored(root))return extracted;
  const actual='src/background/background.js';
  const target=JSON.parse(fs.readFileSync(path.join(root,'docs/maintenance/KAR210_BASELINE_TARGET.json'),'utf8'));
  assert.equal(target.issue,210);assert.equal(target.version,'2.0.0.0');
  assert.ok(target.absent.includes(extracted));assert.ok(!target.packaged.includes(extracted));
  assert.equal(fs.existsSync(path.join(root,extracted)),false,'later owner must remain absent');
  const buf=fs.readFileSync(path.join(root,actual)),blob=crypto.createHash('sha1').update('blob '+buf.length+'\0').update(buf).digest('hex');
  assert.equal(blob,target.expected.find(x=>x.path===actual)?.sha,'actual historical capture owner must remain exact');
  assert.ok(target.packaged.includes(actual));
  return actual;
}
function legacyPatchMetadata(root) {
  const paths=["manifest.json","package.json","package-lock.json","release/release-spec.json"];
  const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/kar210-legacy-patch-metadata.json'),'utf8'));
  assert.equal(fixture.schemaVersion,1);
  assert.equal(fixture.sourceCommit,'4d7ae5130730776927748e2517fdf9aadaf098cd');
  assert.deepEqual(fixture.files.map(x=>x.path),paths);
  const expected={"manifest.json":"97f453b3620a62ae8b49d2ec917f98c39601d9ae","package.json":"b0a00e1fa899202931b477e7f6c0327d4e3142d7","package-lock.json":"8779e68f29afb60a9e56bf8f2f0f8352b87d5a05","release/release-spec.json":"82f17111116930278804e5e6fa0eae2484ba2fb8"};
  const values=fixture.files.map(f=>{
    const b=Buffer.from(f.content,'utf8');
    const hash=crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
    assert.equal(f.blob,expected[f.path]);assert.equal(hash,expected[f.path],'exact historical metadata blob: '+f.path);
    return JSON.parse(f.content);
  });
  assert.equal(values[0].version,'1.25.12');
  return Object.fromEntries(['manifest','pkg','lock','spec'].map((k,i)=>[k,values[i]]));
}
// Only these individually reviewed later extracted owners are eligible for S02 rebinding.
function historicalBackgroundOwner(root, extracted) {
  const allowed=['src/background/services/renewal-public-evidence-coordinator.js','src/background/controllers/manual-listing-navigation-controller.js','src/background/services/listing-url-evidence-service.js','src/background/services/diagnostic-correlation-service.js','src/background/services/renewal-phase1-retry-service.js','src/background/services/trash-template-publish-detection-service.js','src/background/controllers/trash-management-controller.js','src/background/services/inventory-refresh-service.js'];
  assert.ok(allowed.includes(extracted),'unreviewed historical owner');
  if(!isRestored(root)) return extracted;
  const actual=captureOwner(root);
  const target=JSON.parse(fs.readFileSync(path.join(root,'docs/maintenance/KAR210_BASELINE_TARGET.json'),'utf8'));
  assert.ok(target.absent.includes(extracted));
  assert.ok(!target.packaged.includes(extracted));
  assert.equal(fs.existsSync(path.join(root,extracted)),false);
  return actual;
}
// Exact S02 pending release contract, not a release/coverage acceptance shortcut.
function assertPendingS02Release(root) {
  assert.equal(isRestored(root),true,'only the exact restored S02 baseline qualifies');
  const spec=JSON.parse(fs.readFileSync(path.join(root,'release/release-spec.json'),'utf8'));
  assert.equal(spec.validationStatus,'SOURCE_RESTORED_GATES_PENDING');
  assert.equal(spec.version,'2.0.0.0');assert.equal(spec.packageVersion,'2.0.0.0');
  assert.equal(spec.directBasis,'1.23.48');assert.equal(spec.directBasisNativeGreen,false);
  assert.equal(spec.directBasisNativePending,true);
  assert.equal(spec.nativeSmokeRequired,true);
  assert.equal(spec.nextPlannedBuild,'TBD');
  assert.equal(spec.nextPlannedBuildGoal,'Determined by separately authorized open GitHub Issues.');
  assert.ok(spec.nativeSmokeChecks.some(x=>/Do not install this intermediate checkpoint on live data/.test(x)&&/S03 compatibility and S04 updater removal/.test(x)));
  assert.ok(spec.nativeSmokeChecks.some(x=>/separately authorized native acceptance/.test(x)&&/Chrome identity, boot, profile\/locks/.test(x)&&/matched Fast-3 budgets/.test(x)));
  assert.equal(spec.performanceRunRequired,true);
  assert.deepEqual(spec.performanceBudget,{mode:'fast',fastHardwareMeanSeconds:25,slowHardwareMeanSeconds:45,fastThreeSeconds:75,slowThreeSeconds:135,acceptanceStep:'S12',status:'pending'});
  assert.match(spec.performanceRule,/25 s\/ad faster hardware \(Fast-3 <=75 s\)/);
  assert.match(spec.performanceRule,/45 s\/ad slower hardware \(Fast-3 <=135 s\)/);
  assert.match(spec.performanceRule,/separately authorized native operations only after S03\/S04\/S05/);
  assert.match(spec.performanceRule,/Historical Goldlines retained as historical evidence; no new measurement/);
  assert.deepEqual(spec.performanceGoldlines.map(x=>[x.label,x.version,x.mode,x.totalSeconds,x.averageSeconds,x.result]),[
    ['bestehende Referenzmessung','1.23.20_c1','fast',61.277,20.426,'3/3 erfolgreich, 0 Warnungen, 0 Fehler'],
    ['alter Rechner','1.23.20_c1','fast',110.34,36.771,'3/3 erfolgreich, 0 Warnungen, 0 Fehler']
  ]);
  assert.notEqual(spec.performanceGoldlines[0].hardware,spec.performanceGoldlines[1].hardware);
  assert.equal(spec.coverage.status,'pending');
  assert.deepEqual(spec.coverage.publicFunctions,{covered:null,total:null,percent:null});
  return spec;
}
module.exports={isRestored,captureOwner,legacyPatchMetadata,historicalBackgroundOwner,assertPendingS02Release};
