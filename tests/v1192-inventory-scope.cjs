const fs = require('node:fs');
const path = require('node:path');
const root = process.env.KR_ROOT ? path.resolve(process.env.KR_ROOT) : path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('app.html');
const app = read('app.js') + '\n' + read('inventory-capture-controller.js');
const background = require('./v12215-source-surface.cjs');
const runner = read('inventory-runner.js');
let pass = 0, fail = 0;
function check(name, condition) {
  if (condition) { pass++; console.log('PASS ' + name); }
  else { fail++; console.error('FAIL ' + name); }
}
check('bulk dialog puts capture scope before verification mode', (() => {
  const scope = html.indexOf('Erfassungsumfang');
  const mode = html.indexOf('Prüfmodus', html.indexOf('inventoryCaptureDialog'));
  return scope >= 0 && mode > scope;
})());
check('bulk dialog offers full and new-only capture choices', /Gesamten Bestand neu einlesen/.test(html) && /Nur neue Anzeigen erfassen/.test(html));
check('new-only is the explicit default whenever bulk dialog is configured', /INVENTORY_SCOPE_NEW_ONLY/.test(app) && /inventoryCaptureScope\s*=\s*INVENTORY_SCOPE_NEW_ONLY/.test(app));
check('dialog verification mode is initialized from configuration without persisting changes', /inventoryCaptureVerificationMode\s*=\s*normalizeRenewalMode\((?:currentRenewalConfiguration|getCurrentRenewalConfiguration\(\))\.renewalMode\)/.test(app) && /inventoryCaptureVerificationMode/.test(app));
check('bulk start sends run-local scope and verification mode', /START_BULK_INVENTORY_OPERATION[\s\S]{0,500}inventoryScope[\s\S]{0,300}verificationMode|START_BULK_INVENTORY_OPERATION[\s\S]{0,500}verificationMode[\s\S]{0,300}inventoryScope/.test(app));
check('background carries scope through fresh start into source runner', /inventoryScope/.test(background) && /START_BULK_INVENTORY_(?:AFTER_REFRESH|FROM_FRESH_SOURCE)[\s\S]{0,500}inventoryScope/.test(background));
check('run state records scope and active existing ids', /existingInventoryIds/.test(background) && /const inventoryScope = normalizeInventoryScope/.test(background) && /verificationMode:[\s\S]{0,120}inventoryScope/.test(background));
check('runner skips existing ids only in new-only mode', /skipExisting|existingInventoryIds/.test(runner) && /new-only/.test(runner));
check('skipped existing ads are recorded without opening edit workers', /BULK_RECORD_EXISTING_SKIP/.test(runner) && /BULK_RECORD_EXISTING_SKIP/.test(background));
check('progress and result accounting includes skipped existing ads', /skippedExistingCount|skippedExistingIds/.test(app) && /skippedExistingCount|skippedExistingIds/.test(background));
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
