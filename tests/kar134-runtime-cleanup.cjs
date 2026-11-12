'use strict';
// KAR-134 L15: the shipped extension has no manual schema-test action.
// Mocked historical preflight evidence belongs in tests, not in runtime/UI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = require('node:path');
const root = p.resolve(__dirname, '..');
const source = file => fs.readFileSync(p.join(root, file), 'utf8');
const ui = source('src/app/inventory-card-renderer.js');
const content = source('src/content/template-filler.js');
const controller = source('src/background/controllers/template-fill-controller.js');
const service = source('src/background/services/template-fill-service.js');
const background = source('src/background/background.js');
const runtime = [ui,content,controller,service,background].join('\n');

for (const label of [
  'Änderungsdialog testen', 'Schema OK testen',
  'Schema-Drift testen', 'Fingerprint-Warnung testen', 'Kategorie prüfen'
]) assert.ok(!ui.includes(label), 'development-only UI action remains: '+label);

for (const scenario of ['compatible', 'incompatible', 'stage-drift', 'isolated-review']) {
  const exact = new RegExp("['\\\"]" + scenario + "['\\\"]");
  assert.doesNotMatch(runtime, exact, 'development-only runtime scenario '+scenario);
}
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
assert.match(controller, /Boolean\(session\?\.schemaTestScenario\)/,
  'real F3 authority must explicitly reject old test sessions');
assert.match(service, /if \(session\.schemaTestScenario\) throw/,
  'all persisted test sessions must fail closed');
assert.match(content, /if \(session\.schemaTestScenario\) throw/,
  'content must reject legacy test sessions before normal publication');
assert.match(content, /reviewLivePostingSchema/,
  'schema review must remain reachable through the real production flow');
assert.match(content, /monitorSchemaStage\('attributes'/);
assert.match(content, /buildRealSchemaAdoptionPlan/);
assert.match(content, /KAR134_REAL_REFERENCE_ADOPTION_COMMITTED/);
assert.match(content, /showStageChangeReviewDialog/);
assert.match(background, /START_TRASH_TEMPLATE_FILL/, 'preserve existing message boundary');
console.log('PASS KAR-134 L15: no manual schema-check runtime and real F3 review retained');
