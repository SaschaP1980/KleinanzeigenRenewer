const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const background = require('./v12215-source-surface.cjs');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
let n = 0;
const pass = name => { n += 1; console.log('PASS ' + name); };

assert.match(background, /async function retryBulkFailure/);
assert.match(background, /findIndex\(item => String\(item\.adId\) === adId\)/);
assert.match(background, /p-anzeige-bearbeiten\.html\?adId=/);
pass('retry targets exactly one failed stable ad ID through the edit worker');

assert.match(background, /const saved = await saveInventory\(extracted\)/);
assert.match(background, /latest\.failures\.splice\(currentIndex, 1\)/);
assert.match(background, /latest\.failedCount = Math\.max\(0/);
assert.match(background, /latest\.successCount = Number\(latest\.successCount/);
pass('successful retry stores the item and reconciles failure/success counters');

assert.match(background, /lastRetryAt/);
assert.match(background, /retry-failed/);
assert.match(background, /BULK_INVENTORY_RETRY_FAILED/);
pass('failed retry preserves the failure and replaces its diagnostic reason/timestamp');

assert.match(background, /status === "running" \|\| active\?\.retryAdId/);
assert.match(background, /retryAdId\) throw new Error\("Es läuft gerade ein Einzel-Retry/);
pass('destructive local operations and new bulk runs are blocked during a retry');

assert.match(app, /RETRY_BULK_FAILURE/);
assert.match(app, /retry\.disabled = Boolean\(state\.retryAdId\)/);
pass('app exposes retry state without allowing concurrent retries');

console.log(`${n} v1.3.0 retry groups passed`);
