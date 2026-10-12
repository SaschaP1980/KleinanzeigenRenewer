const { includesActivePatch } = require('./current-patch-policy.cjs');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cryptoNode = require('crypto');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const imageExtractor = fs.readFileSync(path.join(root, 'image-extractor.js'), 'utf8');
const background = fs.readFileSync(path.join(root, 'background.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'background-message-router.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'diagnostic-export-service.js'), 'utf8');
const diagnosticsService = fs.readFileSync(path.join(root, 'diagnostics-service.js'), 'utf8');

assert.ok(includesActivePatch(['1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version));
assert.ok(includesActivePatch(['1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], packageJson.version));

// Removed UI instruction must never point at the deleted copy-diagnostics action.
assert.ok(!content.includes('Bilddiagnose der aktuellen Seite kopieren'));
assert.ok(!content.includes('Formular- und Bilddiagnose kopieren'));
assert.ok(content.includes('Support & Diagnose'));
assert.ok(content.includes('Diagnosedaten als ZIP herunterladen'));

// Public-ad gallery failure captures bounded structured diagnostics before failing closed.
assert.ok(content.includes("type: 'STORE_GALLERY_DIAGNOSTIC'"));
assert.ok(content.includes("storeGalleryDiagnostic('public-ad-gallery-unresolved', imageCapture.diagnostics)"));
assert.ok(content.includes("diagnostic('IMAGE_GALLERY_EXTRACTION_FAILED'"));

// Background retains recent captures separately so a service-worker restart does not hide them
// from the next standard diagnostic ZIP.
assert.ok(background.includes('const GALLERY_DIAGNOSTICS_KEY = "galleryDiagnosticsV1"'));
assert.ok(background.includes('const GALLERY_DIAGNOSTIC_RETENTION_MS = 24 * 60 * 60 * 1000'));
assert.ok(background.includes('function storeGalleryDiagnostic'));
assert.ok(background.includes('function readRecentGalleryDiagnostics'));
assert.ok(diagnosticsService.includes('IMAGE_GALLERY_DIAGNOSTIC_CAPTURED'));
assert.ok(background.includes("if (message?.type === \"STORE_GALLERY_DIAGNOSTIC\") return storeGalleryDiagnostic(message, sender);") || background.includes('"STORE_GALLERY_DIAGNOSTIC": Object.freeze'));
assert.ok(background.includes("{ name: 'image-gallery-diagnostics.json', text: jsonText(scopedGalleryDiagnostics) }"));
assert.ok(background.includes('Bild-/Galeriediagnosen in dieser Session')); 

// Image diagnostics must also expose rejected raw DOM sources. This matters when Kleinanzeigen
// moves the gallery to a new host or DOM shape: the diagnostic ZIP then shows what was present
// even though the strict extractor correctly rejected it.
const context = { URL, Date, console };
context.globalThis = context;
vm.runInNewContext(imageExtractor, context, { filename: 'image-extractor.js' });
assert.ok(context.KRImages?.extract, 'KRImages.extract wurde nicht registriert.');

const rawUrl = 'https://media.example.invalid/listing/photo-1.webp?token=secret&width=1200';
const fakeImg = {
  tagName: 'IMG',
  id: 'hero-image',
  naturalWidth: 1200,
  naturalHeight: 900,
  currentSrc: rawUrl,
  parentElement: null,
  getAttribute(name) {
    const attrs = {
      src: rawUrl,
      class: 'new-gallery-hero',
      'data-testid': 'new-gallery-image',
      width: '1200',
      height: '900'
    };
    return attrs[name] || null;
  }
};
const fakeDocument = {
  querySelector(selector) {
    if (selector === 'meta[property="og:image"]') return { content: rawUrl };
    return null;
  },
  querySelectorAll(selector) {
    if (selector === 'script[type="application/ld+json"]') return [];
    if (selector.includes('#viewad-image') || selector.includes('[data-testid*="gallery"')) return [];
    if (selector.startsWith('img,source')) return [fakeImg];
    return [];
  }
};
const capture = context.KRImages.extract(fakeDocument, 'https://www.kleinanzeigen.de/s-anzeige/example/3513234569-123-456');
assert.strictEqual(capture.images.length, 0, 'Strict extractor must still reject unknown hosts.');
assert.strictEqual(capture.diagnostics.version, 5);
assert.strictEqual(capture.diagnostics.strategy, 'unresolved');
assert.ok(capture.diagnostics.rawDomSourceCount >= 1);
assert.ok(capture.diagnostics.rawDomSources.some(item => item.host === 'media.example.invalid' && item.acceptedByExtractor === false));
const rawDiagnostic = capture.diagnostics.rawDomSources.find(item => item.host === 'media.example.invalid');
assert.ok(rawDiagnostic.url.includes('https://media.example.invalid/listing/photo-1.webp'));
assert.ok(!rawDiagnostic.url.includes('token='), 'Diagnostic URL must not expose query secrets.');
assert.strictEqual(capture.diagnostics.openGraphImage.acceptedByExtractor, false);

// Identity and permission contract stays fixed.
const digest = cryptoNode.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex');
assert.strictEqual(digest, '70507977688f3465a60227cd0261bd07d92fad620625cd7ebff8f0856d9c5ed3');
assert.deepStrictEqual(manifest.permissions, ['activeTab', 'storage', 'unlimitedStorage', 'scripting']);
assert.deepStrictEqual(manifest.host_permissions, [
  'https://www.kleinanzeigen.de/*',
  'https://kleinanzeigen.de/*',
  'https://img.kleinanzeigen.de/*'
]);

console.log('PASS v1.13.3 gallery diagnostics export contract');
