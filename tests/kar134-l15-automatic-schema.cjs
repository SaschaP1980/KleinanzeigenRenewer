'use strict';
// KAR-134 L15: production schema monitoring is part of existing workflows,
// never a separately exposed inventory action or a synthetic posting session.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const ui = read('src/app/inventory-card-renderer.js');
const content = read('src/content/template-filler.js');
const background = read('src/background/controllers/template-fill-controller.js');
const service = read('src/background/services/template-fill-service.js');
const root = read('src/background/background.js');
// KAR-175: schema capture is now owned by the atomic inventory capture service;
// assert the actual production owner, not its background composition facade.
const capture = read('src/background/services/inventory-capture-service.js');

assert.doesNotMatch(ui,/Kategorie prüfen|makeCategoryCheckActions|schemaTestScenario/,
  'standalone manual category checker must not be reachable in inventory UI');
assert.doesNotMatch(content,/runReadOnlySchemaTest|assessIndependentCategoryCheck|scenario === 'category-check'/,
  'standalone category-test execution must be removed from the posting runtime');
assert.doesNotMatch(background,/ownerType: 'schema-test'|schema-test-category-review-required|isSchemaTest/,
  'standalone test sessions must not be created by background');
assert.match(background,/schemaTestScenario[^\n]{0,150}(?:throw|Unbekannt)/,
  'obsolete test scenarios must be rejected at the background start boundary');
assert.match(service,/session\.schemaTestScenario[^\n]{0,150}(?:throw|Veralteter)/,
  'persisted obsolete category-check sessions must fail closed');

const productionReview = content.slice(content.indexOf('async function reviewLivePostingSchema('),
  content.indexOf('async function runFillSession('));
const normalFill = content.slice(content.indexOf('async function runFillSession('),
  content.indexOf('async function runPendingFill('));
assert.ok(normalFill.length>1000,'normal filling code must remain');
assert.match(normalFill,/reviewLivePostingSchema\(/,
  'real preflight must call the built-in production review');
assert.match(normalFill,/captureCategoryNeutralForm\(/,'F1 remains automatic');
assert.match(normalFill,/monitorSchemaStage\('category'/,'F2 remains automatic');
assert.match(normalFill,/monitorSchemaStage\('attributes'/,'F3 remains automatic');
assert.match(normalFill,/SchemaPreflight\.evaluate\(/,'pre-publication value check remains');
assert.match(productionReview,/buildStageChangeReview\(/,'real verified structural drift must reach review');
assert.match(productionReview,/showStageChangeReviewDialog\(/,'normal workflow must show real drift review');
assert.match(productionReview,/buildRealSchemaAdoptionPlan\(/,'F3 plan must be available in normal workflow');
assert.match(productionReview,/KAR134_REAL_REFERENCE_ADOPTION_COMMITTED/,
  'real F3 double-consent remains in normal workflow');
assert.match(productionReview,/stage:'schema-reference-review-pending'/,
  'genuine reference approval must pause publication');
assert.match(content,/if \(session\.schemaTestScenario\)\s*throw/,
  'old persisted test sessions cannot resume inside normal flow');

assert.match(background,/stage !== 'schema-reference-review-pending'/,
  'real F3 background authority must be bound to the normal review stage');
assert.match(background,/session\?\.schemaTestScenario/,
  'real F3 must reject obsolete test-mode sessions');
assert.match(background,/lock\?\.locked/,
  'background authority must guard conflicting insertion owners');
assert.match(background,/assertSelectedProfileMatchesLiveAccount/,
  'real F3 account/profile authority must remain');
assert.match(background,/pendingSchemaReferenceApproval/,
  'real F3 approval must be one-use and expiration bounded');
assert.match(background,/request\.freshObservationCapturedAt/,
  'real F3 approval needs fresh real form readback');
assert.match(background,/previousFingerprint|oldFingerprint/,
  'real F3 must verify baseline compare-and-swap');

assert.match(capture,/capturedFromEditView\s*===\s*true/,
  'only verified edit-form capture may establish saved schema');
assert.match(capture,/TemplateSchemaCore\.buildSchema\(extracted\)/);
assert.match(capture,/TemplateSchemaCore\.fingerprint\(snapshot\)/);
assert.match(root,/extractSingleInventoryEdit/,'existing capture and refresh worker retained');
assert.doesNotMatch(ui.slice(ui.indexOf("details.addEventListener('toggle'"),
  ui.indexOf("details.addEventListener('toggle'")+450),
  /chrome\.tabs|runtimeMessage|START_TRASH_TEMPLATE_FILL/,
  'opening local details must not navigate or launch schema checks');
console.log('PASS KAR-134 L15: invisible schema monitoring, normal F3 authority and evidence-only capture');
