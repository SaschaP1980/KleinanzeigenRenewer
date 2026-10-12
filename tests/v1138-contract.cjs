const { includesActivePatch } = require('./current-patch-policy.cjs');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const background = fs.readFileSync(path.join(root, 'background.js'), 'utf8');
const publicEvidence = fs.readFileSync(path.join(root, 'public-listing-evidence-service.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');

assert.ok(includesActivePatch(['1.13.7', '1.13.8', '1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version));
assert.ok(includesActivePatch(['1.13.7', '1.13.8', '1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], pkg.version));

// ZIP preview / informational content use the current deliberate vertical rhythm.
if (includesActivePatch(['1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version)) {
  assert.match(css, /\.archive-insert-flow\s*\{[^}]*display:grid;[^}]*gap:12px;[^}]*margin:0 0 16px;/s);
  assert.match(css, /\.archive-insert-flow\s*>\s*\.renewal-progress-message\s*\{\s*margin:0;\s*\}/s);
} else {
  assert.match(css, /\.archive-insert-dialog \.renewal-start-source \{ margin-top:12px; \}/);
  assert.match(css, /\.archive-insert-dialog \.renewal-start-safety \{ margin-top:12px; \}/);
}

// Read-only opening must prefer a known canonical public URL over the ambiguous ID-only fallback.
assert.match(background, /function normalizeKnownPublicAdUrl\(/);
assert.match(background, /publicUrlForInventoryRecord\(inventoryRecord\)/);
assert.match(background, /urlSource = 'inventory-public-url'/);
assert.match(background, /READONLY_AD_NAVIGATION_RESOLVED/);
assert.match(background, /finalUrl/);
assert.match(app, /OPEN_READONLY_AD', adId, inventoryId, publicUrl/);

const normalizeStart = publicEvidence.indexOf('function normalizeKnownPublicAdUrl');
assert.ok(normalizeStart >= 0);
const normalizeBrace = publicEvidence.indexOf('{', normalizeStart);
let normalizeDepth = 0; let normalizeEnd = -1;
for (let i = normalizeBrace; i < publicEvidence.length; i += 1) {
  if (publicEvidence[i] === '{') normalizeDepth += 1;
  else if (publicEvidence[i] === '}') { normalizeDepth -= 1; if (normalizeDepth === 0) { normalizeEnd = i + 1; break; } }
}
assert.ok(normalizeEnd > normalizeStart);
const normalizeHelper = publicEvidence.slice(normalizeStart, normalizeEnd);
const ctx = { URL, URLApi: URL, globalThis: null };
ctx.globalThis = ctx;
vm.runInNewContext(`${normalizeHelper}\nglobalThis.normalizeKnownPublicAdUrlForTest = normalizeKnownPublicAdUrl;`, ctx);
const normalize = ctx.normalizeKnownPublicAdUrlForTest;
const canonical = 'https://www.kleinanzeigen.de/s-anzeige/weihnachten-weihnachtsdeko-weihnachtsfiguren/3513336145-246-1759';
assert.strictEqual(normalize(canonical, '3513336145'), canonical);
assert.strictEqual(normalize(`${canonical}?foo=bar#x`, '3513336145'), canonical);
assert.strictEqual(normalize(canonical, '9999999999'), '');
assert.strictEqual(normalize('https://www.kleinanzeigen.de/s-anzeige/3513336145', '3513336145'), '');
assert.strictEqual(normalize('https://evil.example/s-anzeige/x/3513336145-246-1759', '3513336145'), '');

const digest = crypto.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex');
assert.strictEqual(digest, '70507977688f3465a60227cd0261bd07d92fad620625cd7ebff8f0856d9c5ed3');
assert.deepStrictEqual(manifest.permissions, ['activeTab', 'storage', 'unlimitedStorage', 'scripting']);
assert.deepStrictEqual(manifest.host_permissions, [
  'https://www.kleinanzeigen.de/*',
  'https://kleinanzeigen.de/*',
  'https://img.kleinanzeigen.de/*'
]);

console.log('PASS v1.13.8 ZIP modal spacing + canonical read-only URL contract');
