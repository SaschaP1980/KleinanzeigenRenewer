const fs = require('node:fs');
const assert = require('node:assert/strict');
const filler = fs.readFileSync('template-filler.js','utf8');
const app = fs.readFileSync('app.js','utf8');
const renewalDialog = fs.readFileSync('renewal-dialog-controller.js','utf8');
const renewalUi = app + '\n' + renewalDialog;
const css = fs.readFileSync('app.css','utf8');
function pass(x){ console.log('PASS '+x); }

assert.match(filler, /INTERACTION_SETTLE_MS\s*=\s*200/);
assert.match(filler, /CATEGORY_OPEN_LOCAL_RETRY_DELAY_MS\s*=\s*300/);
assert.match(filler, /function normalizeLocalInteractionAttempts\(/);
assert.match(filler, /session\?\.maxPhaseAttempts/);
assert.match(filler, /await settleAfterInteraction\([^\n]*title/);
assert.match(filler, /openCategoryChooser\([^\)]*maxAttempts/);
assert.doesNotMatch(filler, /CATEGORY_OPEN_CLICK_ATTEMPTS\s*=\s*3/);
assert.match(filler, /CATEGORY_OPEN_LOCAL_RETRY/);
pass('field-to-field settling and local category retries use the configured phase-attempt count');

assert.match(renewalUi, /renewalStartSafety\?\.classList\.add\(['"]info['"]\)|classList\.toggle\(['"]info['"]/);
assert.match(css, /\.renewal-start-safety\.info\s*\{/);
assert.doesNotMatch(css.match(/\.renewal-start-safety\.info\s*\{[^}]*\}/)?.[0] || '', /#756746|196,164,82|#f2db99/i);
pass('renewal confirmation safety explanation is rendered as neutral information, not amber warning');

console.log('2 v1.19.8 renewal interaction groups passed');
