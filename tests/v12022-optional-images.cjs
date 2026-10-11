const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const imageExtractor = fs.readFileSync(path.join(root, 'image-extractor.js'), 'utf8');
const formExtractor = fs.readFileSync(path.join(root, 'form-extractor.js'), 'utf8');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const background = require('./v12215-source-surface.cjs');
const templateFiller = fs.readFileSync(path.join(root, 'template-filler.js'), 'utf8');

const context = vm.createContext({ URL, globalThis: null });
context.globalThis = context;
vm.runInContext(imageExtractor, context);
assert.equal(typeof context.KRImages?.evaluateEditImageCompleteness, 'function', 'Edit image completeness policy helper must exist');

const decide = (images, diagnostics, evidence) => context.KRImages.evaluateEditImageCompleteness({ images, diagnostics }, evidence);

let result = decide([], {
  unsupportedLocalPreviews: 0,
  uploadPreviewImageCount: 0,
  hiddenImageSourceCount: 0,
  structuredImageSourceCount: 0
}, { source: 'post-listing-props', explicitImageArray: true, imageCount: 0 });
assert.equal(result.complete, true, 'Explicit structured zero-image listings must be valid');
assert.equal(result.reason, 'explicit-empty-image-set');

result = decide([], {
  unsupportedLocalPreviews: 0,
  uploadPreviewImageCount: 0,
  hiddenImageSourceCount: 0,
  structuredImageSourceCount: 0
}, { source: 'post-listing-props', explicitImageArray: false, imageCount: 0 });
assert.equal(result.complete, false, 'Unknown/implicit zero images must stay fail-closed');

result = decide([], {
  unsupportedLocalPreviews: 1,
  uploadPreviewImageCount: 1,
  hiddenImageSourceCount: 0,
  structuredImageSourceCount: 0
}, { source: 'post-listing-props', explicitImageArray: true, imageCount: 0 });
assert.equal(result.complete, false, 'blob:/data: local previews must stay blocked');
assert.equal(result.reason, 'unsupported-local-preview');

result = decide([], {
  unsupportedLocalPreviews: 0,
  uploadPreviewImageCount: 1,
  hiddenImageSourceCount: 0,
  structuredImageSourceCount: 0
}, { source: 'post-listing-props', explicitImageArray: true, imageCount: 0 });
assert.equal(result.complete, false, 'Visual preview contradicting explicit empty structured set must stay blocked');

result = decide([{ imageId: 'a' }], {
  unsupportedLocalPreviews: 0,
  uploadPreviewImageCount: 1,
  hiddenImageSourceCount: 1,
  structuredImageSourceCount: 1
}, { source: 'post-listing-props', explicitImageArray: true, imageCount: 1 });
assert.equal(result.complete, true, 'Normally captured images remain valid');

result = decide([{ imageId: 'a' }], {
  unsupportedLocalPreviews: 1,
  uploadPreviewImageCount: 2,
  hiddenImageSourceCount: 1,
  structuredImageSourceCount: 1
}, { source: 'post-listing-props', explicitImageArray: true, imageCount: 1 });
assert.equal(result.complete, false, 'Unsupported local preview blocks even if older images were captured');

assert.match(formExtractor, /explicitImageArray/);
assert.match(formExtractor, /imageEvidence/);
assert.match(imageExtractor, /uploadPreviewImageCount/);
assert.match(content, /evaluateEditImageCompleteness\(capture,\s*edit\.imageEvidence\)/);
assert.doesNotMatch(content, /if\s*\(!capture\.images\.length\s*\|\|\s*capture\.diagnostics\.unsupportedLocalPreviews\)/);
assert.match(content, /imageSetExplicitlyEmpty:\s*imageCompleteness\.explicitEmpty === true/);
assert.match(background, /function inventoryImageSetExplicitlyEmpty\(record\)/);
assert.match(background, /sourceExplicitEmpty && candidateExplicitEmpty/);
assert.match(background, /record\?\.extraction\?\.imageSetExplicitlyEmpty !== true/);
assert.match(background, /if \(!(?:templateImages|images)\.length\) \{[\s\S]*inventoryImageSetExplicitlyEmpty\(record\)/);
assert.match(templateFiller, /if \(!images\.length\) return \{ issues: \[\], complete: true, states: \[\] \}/);
assert.match(background, /Der leere Bildbestand des Exports ist nicht eindeutig bestätigt/);
assert.match(background, /if \(!sourceImages\.length\) \{[\s\S]*inventoryImageSetExplicitlyEmpty\(source\)[\s\S]*finish\(\)/);

console.log('PASS v1.20.22 optional image policy: explicit zero images valid end-to-end; ambiguous/local preview states remain fail-closed');
