'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=file=>fs.readFileSync(file,'utf8');
test('KAR-161 retained original independent bootstrap assertions',()=>{
const backgroundSource=read('src/background/background.js');
assert.match(backgroundSource, /function openDatabase\(\) \{ return requireInventoryRepository\(\)\.openDatabase\(\); \}/,
  'KAR-161 extraction must preserve the database facade used by renewal and inventory');
assert.match(backgroundSource, /let diagnosticsService = null;/,
  'KAR-161: diagnostics singleton must exist before eager startup logging and message routing');
assert.match(backgroundSource, /logDiagnostic\('info', 'DIAGNOSTIC_SESSION_STARTED'/,
  'KAR-161: real worker bootstrap eagerly calls diagnostics (browser smoke required)');

});
test('KAR-134 retained independent absence of standalone category-check and local-only details',()=>{
const ui=read('src/app/inventory-card-renderer.js'),content=read('src/content/template-filler.js'),background=read('src/background/controllers/template-fill-controller.js');
assert.doesNotMatch(ui,/Kategorie prüfen|makeCategoryCheckActions|schemaTestScenario/,
  'standalone manual category checker must not be reachable in inventory UI');
assert.doesNotMatch(content,/runReadOnlySchemaTest|assessIndependentCategoryCheck|scenario === 'category-check'/,
  'standalone category-test execution must be removed from the posting runtime');
assert.doesNotMatch(background,/ownerType: 'schema-test'|schema-test-category-review-required|isSchemaTest/,
  'standalone test sessions must not be created by background');

assert.ok(ui.includes("details.addEventListener('toggle'"),'actual local detail handler exists');
assert.doesNotMatch(ui.slice(ui.indexOf("details.addEventListener('toggle'"),
  ui.indexOf("details.addEventListener('toggle'")+450),
  /chrome\.tabs|runtimeMessage|START_TRASH_TEMPLATE_FILL/,
  'opening local details must not navigate or launch schema checks');

});
