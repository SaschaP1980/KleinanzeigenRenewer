const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(__dirname, '..', 'image-extractor.js'), 'utf8');
const sandbox = { URL };
vm.runInNewContext(code, sandbox);

const base = 'https://www.kleinanzeigen.de/s-anzeige/schwalbe-fahrradschlauch/3514053771-217-1759';
const imageUrl = 'https://img.kleinanzeigen.de/api/v1/prod-ads/images/2f/2f1e9bd7-b2f9-4f42-95f2-c7e5a4cb7777?rule=$_57.JPG';

const attrs = new Map([
  ['src', imageUrl],
  ['class', 'viewad-image'],
  ['aria-label', ''],
  ['data-testid', '']
]);
const image = {
  tagName: 'IMG',
  id: 'viewad-image',
  currentSrc: imageUrl,
  naturalWidth: 1280,
  naturalHeight: 960,
  parentElement: null,
  getAttribute(name) { return attrs.get(name) || null; },
  querySelectorAll() { return []; }, // Important: Element.querySelectorAll never includes the element itself.
  matches(selector) {
    if (selector.includes('#viewad-image')) return true;
    return selector.split(',').some(part => part.trim() === 'img');
  }
};

const ogLogo = { content: 'https://static.kleinanzeigen.de/static/img/common/logo/logo-kleinanzeigen-og-vertical.png' };
const document = {
  querySelector(selector) {
    if (selector === 'meta[property="og:image"]') return ogLogo;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === 'script[type="application/ld+json"]') return [];
    if (selector.startsWith('#viewad-image')) return [image];
    if (selector.includes('img,source')) return [image];
    return [];
  }
};

const result = sandbox.KRImages.extract(document, base);
assert.equal(result.images.length, 1, 'trusted #viewad-image root must contribute itself as an image candidate');
assert.equal(result.images[0].url, imageUrl);
assert.equal(result.images[0].isPrimary, true);
assert.equal(result.diagnostics.strategy, 'gallery-dom');
assert.equal(result.diagnostics.galleryCandidates[0].trusted, true);
assert.equal(result.diagnostics.galleryCandidates[0].candidates, 1);
assert.equal(result.diagnostics.selectedRoot.tag, 'IMG');
assert.equal(result.diagnostics.selectedRoot.id, 'viewad-image');
console.log('PASS v1.16.4 self-root #viewad-image gallery extraction runtime case');
