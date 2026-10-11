const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const content = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
const start = content.indexOf('function normalizeInventoryCandidateThumbnail(rawUrl) {');
const end = content.indexOf('\n\n  function inventoryCandidatePreview()', start);
assert.ok(start >= 0 && end > start, 'thumbnail normalizer must be extractable');
const fn = content.slice(start, end);
const context = vm.createContext({ URL, location: { href: 'https://www.kleinanzeigen.de/s-anzeige/demo/3514053771-217-1759' } });
vm.runInContext(`${fn}; this.normalizeThumb = normalizeInventoryCandidateThumbnail;`, context);
const normalizeThumb = context.normalizeThumb;

assert.equal(normalizeThumb('https://static.kleinanzeigen.de/static/img/common/logo/logo-kleinanzeigen-og-vertical.png'), '', 'generic static Kleinanzeigen OG logo must be rejected');
assert.equal(normalizeThumb('https://img.kleinanzeigen.de/api/v1/prod-ads/images/aa/bb.jpg'), 'https://img.kleinanzeigen.de/api/v1/prod-ads/images/aa/bb.jpg', 'real Kleinanzeigen image CDN URL must be accepted');
assert.equal(normalizeThumb('http://img.kleinanzeigen.de/insecure.jpg'), '', 'non-HTTPS image must be rejected');
assert.equal(normalizeThumb('https://example.com/image.jpg'), '', 'third-party image host must be rejected');
console.log('PASS v1.16.3 candidate thumbnail normalizer runtime cases');
