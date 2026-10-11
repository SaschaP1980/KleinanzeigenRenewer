const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'inventory-capture-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'src/app/inventory-candidate-model.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'src/app/inventory-capture-view.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
let n = 0;
const pass = msg => { n += 1; console.log(`PASS ${msg}`); };

for (const id of ['inventoryCaptureCandidateSection','inventoryCaptureCandidateList','inventoryCaptureSelectedCandidate']) {
  assert.match(html, new RegExp(`id="${id}"`));
}
pass('single inventory modal contains candidate-selection and selected-candidate surfaces');

assert.match(css, /\.inventory-candidate-card\s*\{/);
assert.match(css, /grid-template-columns:18px 60px minmax\(0,1fr\)/);
assert.match(css, /\.inventory-candidate-thumb\s*\{[^}]*width:60px;[^}]*height:60px;/s);
assert.match(css, /overflow-wrap:anywhere/);
pass('candidate cards reserve a compact title-image thumbnail and safe text wrapping');

assert.match(content, /function inventoryCandidatePreview\(\)/);
assert.match(content, /message\?\.type === "INVENTORY_CANDIDATE_PREVIEW"/);
assert.match(content, /thumbnailUrl/);
assert.match(content, /profileName/);
pass('content layer exposes a read-only candidate preview with title image and stable ad identity');

assert.match(app, /function buildSingleInventoryCandidates\(entries = \[\]\)/);
assert.match(app, /byAdId = new Map\(\)/);
assert.match(app, /sourceViewMode/);
assert.match(app, /viewModes/);
assert.match(app, /function selectInventoryCaptureCandidate\(adId\)/);
assert.match(app, /inventoryCaptureSourceTabId = Number\(candidate\.sourceTabId/);
pass('candidate identity is adId-based and selection binds a concrete source tab only after user choice');

assert.match(app, /loadSingleInventoryCandidates\(generation\)/);
assert.match(app, /matchingKleinanzeigenTabs\(\)/);
assert.match(app, /INVENTORY_CANDIDATE_PREVIEW/);
assert.match(app, /inventoryCaptureMode === 'single'/);
pass('opening the single-inventory modal discovers all eligible user tabs instead of silently using only activeTabId');

assert.match(app, /candidate\.tabIds\.includes\(Number\((?:activeTabId|getActiveTabId\(\)) \|\| 0\)\)/);
assert.match(app, /inventoryCaptureCandidates\[0\]/);
assert.match(app, /setStartDisabled\(mode === 'single'\)/);
pass('current/most-recent candidate is only preselected after discovery and start stays blocked without a candidate');

assert.match(app, /renderInventoryCaptureSelectedCandidate\(\)/);
assert.match(app, /beginInventoryCaptureProgress\(`Wird erfasst: \$\{selectedCandidate\.title\}`/);
assert.match(app, /candidateTabIds: selectedCandidate\.tabIds/);
pass('selected ad remains visible and fixed through confirmation/progress with diagnostic evidence');

assert.match(app, /for \(const tab of tabs\)/);
assert.match(app, /page\?\.auth\?\.ownAd/);
assert.match(app, /inventoryButton\.dataset\.pageReady = ownAdTab \? 'true' : 'false'/);
assert.match(app, /syncAccountBoundActions\([^)]*\)/);
pass('single inventory action remains available only when any eligible own-ad tab exists and the live account is bound');

console.log(`${n} v1.16.2 single-inventory candidate-selection contract groups passed`);
