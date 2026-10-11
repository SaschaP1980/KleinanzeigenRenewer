const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const runner = fs.readFileSync(path.join(root, 'inventory-runner.js'), 'utf8');
let n = 0; const pass = name => { n += 1; console.log('PASS ' + name); };

assert.match(css, /\.failure-list \{[^}]*min-width:0;[^}]*width:100%;[^}]*max-width:100%;/);
assert.match(css, /\.failure-card \{[^}]*min-width:0;[^}]*width:100%;[^}]*max-width:100%;[^}]*box-sizing:border-box;/);
assert.match(css, /\.failure-card-head[^\n]*min-width:0/);
assert.match(css, /\.failure-card h3 \{[^}]*overflow-wrap:anywhere;[^}]*word-break:break-word;/);
pass('nested retry card cannot overflow its parent even with long titles');

assert.match(runner, /KR_BULK_OVERLAY_DISMISSED_KEY/);
assert.match(runner, /function bulkOverlayMessageKey\(/);
assert.match(runner, /aria-label', 'Rückmeldung ausblenden'/);
assert.match(runner, /sessionStorage\.setItem\(KR_BULK_OVERLAY_DISMISSED_KEY/);
assert.match(runner, /panel\.style\.display = 'none'/);
assert.match(runner, /panel\.style\.display = 'block'/);
pass('bulk feedback overlay can be dismissed per message and reappears for a new message');

console.log(`${n} v1.15.7 UI polish contract groups passed`);
