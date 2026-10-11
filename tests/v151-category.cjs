const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const filler = fs.readFileSync(path.join(root, 'template-filler.js'), 'utf8');
let n = 0;
const pass = name => { n += 1; console.log('PASS ' + name); };

const finalizerStart = filler.indexOf('async function finalizeLegacyCategorySelection');
const finalizerEnd = filler.indexOf('\n  async function runLegacyCategorySelection', finalizerStart);
assert.ok(finalizerStart >= 0 && finalizerEnd > finalizerStart);
const finalizer = filler.slice(finalizerStart, finalizerEnd);

assert.match(finalizer, /await sleep\(LEGACY_ACTION_DELAY_MS\)/);
assert.match(finalizer, /location\.pathname !== CATEGORY_PATH/);
assert.match(finalizer, /findLegacyWizardAttributeChoice\(template, selectedWizardAttributes\)/);
assert.match(finalizer, /findLegacyContinueButton\(\)/);
assert.match(finalizer, /stage: 'category-continuing'/);
assert.match(finalizer, /await clickLegacyAction\(continueButton, actionState\)/);
assert.match(finalizer, /Rückkehr zu den Anzeigendetails/);
pass('final category selection waits, then accepts navigation, required wizard attributes, or explicit Weiter');

const directLeaf = filler.slice(
  filler.indexOf('const direct = findLegacyCategoryAnchorById(wanted);'),
  filler.indexOf('const match = findDeepestLegacyPathAnchor(path);')
);
assert.match(directLeaf, /stage: 'category-leaf-selected'/);
assert.match(directLeaf, /await clickLegacyAction\(direct, actionState\)/);
assert.match(directLeaf, /finalizeLegacyCategorySelection/);
assert.doesNotMatch(directLeaf, /clickLegacyAction\(direct, actionState\);\s*return \{ pendingNavigation: true/);
pass('direct final leaf no longer assumes that the leaf click navigates automatically');

const genericFinal = filler.slice(
  filler.indexOf('const isLeafByPath = index === path.length - 1;'),
  filler.indexOf("description: `Unterkategorien nach", filler.indexOf('const isLeafByPath = index === path.length - 1;'))
);
assert.match(genericFinal, /if \(isLeafByPath\) \{/);
assert.match(genericFinal, /finalizeLegacyCategorySelection/);
assert.doesNotMatch(genericFinal, /isLeafByPath && !isParent\) return \{ pendingNavigation: true/);
pass('generic final path node uses the same completion gate regardless of parent/leaf classification');

assert.match(finalizer, /category-attribute-selected/);
assert.ok(finalizer.indexOf('findLegacyWizardAttributeChoice') < finalizer.indexOf('findLegacyContinueButton'));
pass('existing multi-stage required-attribute flow remains ahead of the final Weiter action');

assert.match(finalizer, /weder eine Navigation noch weitere Pflichtmerkmale oder „Weiter“ wurden verfügbar/);
pass('stalled final category selection now fails explicitly instead of remaining silently running');

console.log(`${n} v1.5.1 category completion regression groups passed`);
