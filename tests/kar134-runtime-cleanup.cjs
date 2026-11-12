'use strict';
// KAR-134 L14: the shipped extension exposes the real category schema check only.
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
  'Schema-Drift testen', 'Fingerprint-Warnung testen'
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

assert.match(ui, /scenario:\s*'category-check'/, 'independent category checking must remain');
assert.match(controller, /schemaTestScenario\s*===\s*'category-check'/,
  'controller must only admit the real category check');
assert.match(controller, /session\?\.schemaTestScenario\s*!==\s*'category-check'/,
  'genuine F3 approval must stay restricted to category checks');
assert.match(content, /runReadOnlySchemaTest/);
assert.match(content, /monitorSchemaStage\('attributes'/);
assert.match(content, /buildRealSchemaAdoptionPlan/);
assert.match(content, /KAR134_REAL_REFERENCE_ADOPTION_COMMITTED/);
assert.match(content, /showStageChangeReviewDialog/);
assert.match(background, /START_TRASH_TEMPLATE_FILL/, 'preserve existing message boundary');
console.log('PASS KAR-134 L14: no shipped test-only scenarios, real category and F3 contracts retained');
