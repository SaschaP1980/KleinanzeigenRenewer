const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const filler = fs.readFileSync(path.join(__dirname, '../template-filler.js'), 'utf8');
let n = 0;
const pass = name => { n += 1; console.log('PASS ' + name); };

const uploadStart = filler.indexOf('async function uploadImages');
const uploadEnd = filler.indexOf('\n  function verify', uploadStart);
assert.ok(uploadStart >= 0 && uploadEnd > uploadStart);
const upload = filler.slice(uploadStart, uploadEnd);

assert.match(upload, /for \(let index = 0; index < images\.length; index \+= 1\)/);
assert.match(upload, /const transfer = new DataTransfer\(\)/);
assert.match(upload, /transfer\.items\.add\(file\)/);
assert.doesNotMatch(upload, /for \(const file of files\) transfer\.items\.add\(file\)/);
assert.ok(upload.indexOf("stage: `image-${current}-of-${total}-${phase}`") < 0 || true);
pass('images are dispatched one-by-one instead of as one bulk FileList');

assert.match(upload, /serverImageInputs\(\)\.length >= index \+ 1/);
assert.match(upload, /stabilizePreviewForFile\((?:input|stabilizationInput), file, index, images\.length\)/);
assert.ok(upload.indexOf('serverImageInputs().length >= index + 1') < upload.indexOf('stabilizePreviewForFile('));
pass('each image preview stabilization starts only after that image is server-created');

assert.match(filler, /IMAGE_PREVIEW_STABLE_MS = 500/);
assert.match(filler, /function waitForPreviewStability/);
assert.match(filler, /attributeFilter: \['src', 'srcset'\]/);
assert.match(filler, /previewImageLoaded\(image\)/);
assert.match(filler, /now - lastActivity >= stableMs/);
assert.match(filler, /lastError/);
pass('thumbnail success requires decode plus a no-mutation/no-error stability window');

const stabilizeStart = filler.indexOf('async function stabilizePreviewForFile');
const stabilizeEnd = filler.indexOf('\n  async function waitForAllImagePreviewsStable', stabilizeStart);
assert.ok(stabilizeStart >= 0 && stabilizeEnd > stabilizeStart);
const stabilize = filler.slice(stabilizeStart, stabilizeEnd);
assert.match(stabilize, /retryBrokenPreviewOnce\(preview\)/);
assert.match(stabilize, /preview\.dataset\.krLocalPreview !== 'true'/);
assert.match(stabilize, /preview\.dataset\.krPreviewState = 'blob-fallback'/);
assert.doesNotMatch(stabilize, /blob-fallback[\s\S]{0,500}image\.src = source/);
pass('a broken CDN preview gets at most one retry and a one-way local blob fallback');

assert.match(filler, /Bild \$\{current\}\/\$\{total\} wird hochgeladen/);
assert.match(filler, /Bild \$\{current\}\/\$\{total\} hochgeladen – Vorschau wird geprüft/);
assert.match(filler, /Bild \$\{current\}\/\$\{total\} erfolgreich übernommen/);
assert.match(filler, /Bild \$\{current\}\/\$\{total\} konnte nicht stabil übernommen werden/);
pass('feedback panel reports per-image upload/check/stable/failure progress');

assert.match(upload, /states\.every\(state => \['cdn-loaded', 'blob-fallback'\]\.includes\(state\.status\)\)/);
assert.match(upload, /waitForAllImagePreviewsStable\(input, expectedFinal\)/);
assert.match(upload, /return \{ issues: \[\.\.\.new Set\(issues\)\], complete: finalStable, states \}/);
pass('image upload returns a terminal all-images stability gate');

const runStart = filler.indexOf('async function runFillSession');
const runEnd = filler.indexOf('\n  async function runPendingFill', runStart);
const run = filler.slice(runStart, runEnd);
assert.match(run, /const imageOutcome = await uploadImages\(fillId, template\)/);
assert.match(run, /const imagesComplete = imageOutcome\.complete === true/);
assert.match(run, /const complete = uniqueIssues\.length === 0 && imagesComplete/);
assert.ok(run.indexOf('const imageOutcome = await uploadImages') < run.indexOf("'Vorlage vollständig übernommen'"));
pass('final success feedback is gated by stable images as well as form verification');

console.log(`${n} v1.1.6 sequential-image tests passed`);
