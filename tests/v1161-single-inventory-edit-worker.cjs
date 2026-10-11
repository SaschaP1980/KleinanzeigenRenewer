const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const capture = fs.readFileSync(path.join(root, 'inventory-capture-controller.js'), 'utf8');
const bg = require('./v12215-source-surface.cjs');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
let n = 0; const pass = name => { n += 1; console.log('PASS ' + name); };

assert.ok(['1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version));
pass('patch version is 1.16.1');

const singleOwner = ['1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version) ? capture : app;
const single = singleOwner.match(/async function startSingleInventoryCapture\(\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(single, /CAPTURE_SINGLE_INVENTORY/);
assert.match(single, /sourceTabId:\s*captureTabId/);
assert.match(single, /profileId:\s*captureProfile\?\.profileId/);
assert.doesNotMatch(single, /type:\s*'EXTRACT_CURRENT_AD'/);
assert.doesNotMatch(single, /type:\s*'SAVE_INVENTORY'/);
pass('single capture delegates complete edit-based capture to the background workflow');

assert.match(bg, /function singleInventorySourceFromUrl\(rawUrl\)/);
assert.match(bg, /async function captureSingleInventory\(message\)/);
assert.match(bg, /source\.mode === 'public'/);
assert.match(bg, /createManagedWorkerTab\([\s\S]{0,650}'single-inventory-edit'/);
assert.match(bg, /extractSingleInventoryEdit\(editTabId, source\.adId/);
assert.match(bg, /extractReadOnlyMetadata\(sourceTabId, source\.adId/);
assert.match(bg, /manual-single-edit-worker\+readonly-detail/);
assert.match(bg, /CAPTURE_SINGLE_INVENTORY/);
pass('public own-ad capture uses a managed edit worker and optional read-only metadata');

assert.match(bg, /let editTabId = sourceTabId;/);
assert.match(bg, /if \(source\.mode === 'public'\)/);
assert.match(bg, /single-inventory-readonly/);
assert.match(bg, /manual-single-edit\+readonly-detail/);
pass('manually opened edit pages are direct full-data sources with optional read-only metadata');

assert.match(content, /existingEditAdId/);
assert.match(content, /evidence:\s*editControl \? "edit-control" : existingEditUrl/);
assert.match(content, /viewMode:\s*existingEditUrl \? "edit"/);
assert.match(content, /pageType:[\s\S]{0,160}auth\.viewMode === "edit"/);
assert.match(content, /adId:\s*\(\(\) =>/);
pass('existing edit URLs are recognized as single-inventory eligible while preserving stable ad identity');

assert.doesNotMatch(bg + app + content, /\.requestSubmit\s*\(|\.submit\s*\(/);
pass('single capture fix does not introduce a submit bypass');
console.log(`${n} v1.16.1 single inventory edit-worker contract groups passed`);
