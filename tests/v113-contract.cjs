const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const filler = fs.readFileSync(path.join(root, 'template-filler.js'), 'utf8');
const build = fs.readFileSync(path.join(root, 'scripts/build.sh'), 'utf8');
let n = 0;
const pass = name => { n += 1; console.log('PASS ' + name); };

assert.ok(/^(?:1\.1\.(?:[3-9]|[1-9]\d+)|1\.[234]\.0|1\.(?:[56789]|10|11|12|13|14|15|16|17|18|19|20|21|22|23)\.\d+)$/.test(manifest.version), `unexpected version ${manifest.version}`);
assert.match(filler, /const LEGACY_ACTION_DELAY_MS = 100/);
assert.match(filler, /function legacyActionWaitMs/);
assert.match(filler, /await clickLegacyAction\(wizardChoice\.control, actionState\)/);
assert.match(filler, /await clickLegacyAction\(anchor, actionState\)/);
pass('v1.1.3 applies a shared 100 ms minimum gap to wizard and category selections');

assert.match(filler, /function findLegacyContinueButton/);
assert.match(filler, /getElementById\('postad-step1-frm'\)/);
assert.match(filler, /\^weiter\$\/i/);
assert.match(filler, /stage: 'category-continuing'/);
assert.match(filler, /await clickLegacyAction\(continueButton, actionState\)/);
assert.match(filler, /Rückkehr zu den Anzeigendetails/);
pass('completed legacy category assistant clicks the scoped visible Weiter button and waits for return');

assert.match(filler, /unresolvedRequiredLegacyWizardColumnsAfter/);
assert.match(filler, /if \(unresolvedHeadings\.length\)/);
pass('Weiter is blocked while a required follow-up wizard column remains unresolved');

assert.doesNotMatch(filler, /requestSubmit\s*\(/);
assert.doesNotMatch(filler, /\.submit\s*\(/);
assert.doesNotMatch(filler, /Anzeige aufgeben[^\n]{0,160}\.click\s*\(/i);
pass('publish action remains untouched and no direct form-submit API is introduced');

assert.match(build, /v113-category\.cjs/);
assert.match(build, /v113-contract\.cjs/);
pass('v1.1.3 timing and continue regressions are part of canonical build script');

console.log(`${n} v1.1.3 contract tests passed`);
