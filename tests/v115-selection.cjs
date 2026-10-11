const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const filler = fs.readFileSync(path.join(__dirname, '../template-filler.js'), 'utf8');
let n = 0;
const pass = name => { n += 1; console.log('PASS ' + name); };

const typeStart = filler.indexOf('async function typeSearchableValue');
const typeEnd = filler.indexOf('\n  function setTextField', typeStart);
assert.ok(typeStart >= 0 && typeEnd > typeStart);
const typing = filler.slice(typeStart, typeEnd);
assert.match(typing, /control\.focus\(\)/);
assert.match(typing, /control\.click\(\)/);
assert.match(typing, /beforeinput/);
assert.match(typing, /inputType: 'insertText'/);
assert.match(typing, /for \(const char of wanted\)/);
assert.match(typing, /SEARCH_KEY_DELAY_MS/);
assert.doesNotMatch(typing, /element\.blur\(\)/);
pass('searchable controls are focused and typed incrementally with beforeinput/input semantics');

const chooseStart = filler.indexOf('async function chooseExactOption');
const chooseEnd = filler.indexOf('\n  function findAttributeControl', chooseStart);
assert.ok(chooseStart >= 0 && chooseEnd > chooseStart);
const choose = filler.slice(chooseStart, chooseEnd);
assert.match(choose, /await typeSearchableValue\(control, displayValue\)/);
assert.match(choose, /findExactSelectionOption\(control, displayValue\)/);
assert.match(choose, /ArrowDown/);
assert.match(choose, /option\.click\(\)/);
assert.ok(choose.indexOf('typeSearchableValue(control, displayValue)') < choose.indexOf('option.click()'));
pass('autocomplete waits for and selects an exact rendered option with keyboard-open fallback only');

const previewStart = filler.indexOf('function uploadedPreviewImages');
const previewEnd = filler.indexOf('\n  async function uploadImages', previewStart);
assert.ok(previewStart >= 0 && previewEnd > previewStart);
const preview = filler.slice(previewStart, previewEnd);
assert.match(preview, /img\[alt="Bild zur Anzeige"\]/);
assert.match(preview, /image\?\.complete/);
assert.match(preview, /naturalWidth/);
assert.match(preview, /naturalHeight/);
assert.match(preview, /IMAGE_PREVIEW_SERVER_TIMEOUT_MS/);
assert.match(preview, /image\.removeAttribute\('src'\)/);
assert.match(preview, /URL\.createObjectURL\(files\[index\]\)/);
assert.match(preview, /image\.dataset\.krLocalPreview = 'true'/);
pass('uploaded previews require real decoding and retry signed CDN thumbnails before local visual fallback');

const uploadStart = filler.indexOf('async function uploadImages');
const uploadEnd = filler.indexOf('\n  function verify', uploadStart);
assert.ok(uploadStart >= 0 && uploadEnd > uploadStart);
const upload = filler.slice(uploadStart, uploadEnd);
assert.match(upload, /serverseitig angelegte Bilder/);
assert.match(upload, /waitForServerPreviews\(input, files\.length\)/);
assert.match(upload, /applyLocalPreviewFallback\(previewState\.previews, files\)/);
assert.ok(upload.indexOf('adImages[') < upload.indexOf('waitForServerPreviews(input, files.length)'));
pass('image upload now gates server acknowledgement and decoded preview handling separately');

assert.match(filler, /previewUrlForDiagnostic/);
assert.match(filler, /return `\$\{url\.origin\}\$\{url\.pathname\}`/);
pass('preview diagnostics redact signed query parameters');

console.log(`${n} v1.1.5 selection/preview tests passed`);
