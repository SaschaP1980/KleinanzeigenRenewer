'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const source=file=>fs.readFileSync(file,'utf8');
test('historical S02 source budget is measured and frozen; later nine-owner 30 percent target not claimed',()=>{
 const path='src/background/background.js',src=source(path);
 const chars=src.length,bytes=Buffer.byteLength(src,'utf8'),lines=src.split('\n').length;
 const target=JSON.parse(source('docs/maintenance/KAR210_BASELINE_TARGET.json'));
 const blob=crypto.createHash('sha1').update('blob '+bytes+'\0').update(src).digest('hex');
 const {assertRestoredBaselineVersion,expectedRestoredBlob}=require('./current-patch-policy.cjs');
 const version=assertRestoredBaselineVersion();
 assert.equal(blob,expectedRestoredBlob(version,path,target.expected.find(r=>r.path===path).sha));
 const delta=version==='2.0.0.1'?106:0;
 assert.deepEqual({chars,bytes,lines},{chars:195459+delta,bytes:195584+delta,lines:3323});
 const modules=[
 'src/background/services/inventory-capture-service.js',
 'src/background/services/inventory-refresh-service.js',
 'src/background/services/renewal-public-evidence-coordinator.js',
 'src/background/services/renewal-phase1-retry-service.js',
 'src/background/services/publish-intent-authorization-service.js',
 'src/background/controllers/manual-listing-navigation-controller.js',
 'src/background/services/diagnostic-correlation-service.js',
 'src/background/services/listing-url-evidence-service.js',
 'src/background/services/trash-template-publish-detection-service.js'
];

 for(const file of modules){assert.ok(target.absent.includes(file));assert.ok(!fs.existsSync(file));assert.ok(!target.packaged.includes(file));}
 console.log('S02 historical background:',chars,'characters,',bytes,'bytes,',lines,'lines; S11 KAR-175 donor budget not met/accepted');
});
test('original KAR-134 absence of synthetic UI/runtime actions and existing posting message boundary',()=>{
 const ui=source('src/app/inventory-card-renderer.js'),content=source('src/content/template-filler.js'),controller=source('src/background/controllers/template-fill-controller.js'),service=source('src/background/services/template-fill-service.js'),background=source('src/background/background.js');
 const runtime=[ui,content,controller,service,background].join('\n');
for (const label of [
  'Änderungsdialog testen', 'Schema OK testen',
  'Schema-Drift testen', 'Fingerprint-Warnung testen', 'Kategorie prüfen'
]) assert.ok(!ui.includes(label), 'development-only UI action remains: '+label);

for (const scenario of ['compatible', 'stage-drift', 'isolated-review']) {
  const exact = new RegExp("['\\\"]" + scenario + "['\\\"]");
  assert.doesNotMatch(runtime, exact, 'development-only runtime scenario '+scenario);
}
// KAR-201 classifies actual saved technical options as 'incompatible'.
 // That outcome is production evidence, not the retired development scenario.
assert.doesNotMatch(runtime, /(?:schemaTestScenario|testScenario|scenario)\s*(?:===?|:)\s*['"]incompatible['"]/,
  'retired synthetic incompatible scenario must not be reachable');
for (const obsolete of [
  'assessSyntheticCaseSize', 'assessSyntheticRemovedField',
  'createIsolatedStageReview', 'assessSyntheticStageDrift',
  'SYNTHETIC_REMOVED_FIELD_KEY', 'KAR134_ISOLATED_REVIEW_',
  'Testreferenzen übernehmen (nur Testspeicher)',
  'kr134:isolated-stage-monitor:v1:'
]) assert.ok(!runtime.includes(obsolete), 'development-only runtime helper remains: '+obsolete);

assert.doesNotMatch(ui, /Kategorie prüfen|makeCategoryCheckActions|schemaTestScenario/,
  'L15: the inventory never advertises a separate category checker');
assert.doesNotMatch(runtime, /'category-check'|runReadOnlySchemaTest|assessIndependentCategoryCheck/,
  'L15: standalone category-check runtime must not ship');

assert.match(background, /START_TRASH_TEMPLATE_FILL/, 'preserve existing message boundary');

});
