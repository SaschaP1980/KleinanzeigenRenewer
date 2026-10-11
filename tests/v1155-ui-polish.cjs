const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'mass-renewal-ui-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'archive-trash-insertion-ui-controller.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');

// All dismiss buttons in the activity-message area are pinned into the upper-right corner.
assert.match(css, /\.app-notice\s*\{[^}]*position\s*:\s*relative/s);
assert.match(css, /\.bulk-run\s*\{[^}]*position\s*:\s*relative/s);
assert.match(css, /\.message-dismiss, \.message-minimize\s*\{[^}]*position\s*:\s*absolute[^}]*top\s*:\s*[0-6]px[^}]*right\s*:\s*[0-6]px/s);

// Full-inventory enablement has one derived source of truth; v1.17.2 derives it from account binding rather than a pre-opened My Ads page.
assert.match(app, /let currentBulkRunState\s*=\s*null/);
assert.match(app, /let bulkStartInFlight\s*=\s*false/);
assert.match(app, /function syncFullInventoryButtonState\s*\(/);
assert.match(app, /const bulkBusy\s*=\s*bulkStartInFlight\s*\|\|/);
const inspectStart = app.indexOf('async function performInspectPage');
const inspectEnd = app.indexOf('\nfunction inspectPage', inspectStart);
assert.ok(inspectStart >= 0 && inspectEnd > inspectStart, 'performInspectPage block missing');
const inspect = app.slice(inspectStart, inspectEnd);
assert.doesNotMatch(inspect, /fullInventoryButton\.disabled\s*=\s*false/);
assert.doesNotMatch(inspect, /fullInventoryButton\.dataset\.pageReady/);
const fullState = app.slice(app.indexOf('function syncFullInventoryButtonState'), app.indexOf('\nfunction renderBulkState', app.indexOf('function syncFullInventoryButtonState')));
assert.match(fullState, /!gate\.allowed/);

// Left mass-renewal row circle reflects the highest item/phase severity.
assert.match(app, /function massRenewalRowSeverity\s*\(/);
assert.match(app, /index\.className\s*=\s*`mass-renewal-result-index\s+\$\{massRenewalRowSeverity\(item, phaseModel\)\}`/);
for (const tone of ['success', 'needs-review', 'error', 'active']) {
  assert.match(css, new RegExp(`\\.mass-renewal-result-index\\.${tone.replace('-', '\\-')}`));
}

console.log('PASS v1.15.5 UI polish contract');
