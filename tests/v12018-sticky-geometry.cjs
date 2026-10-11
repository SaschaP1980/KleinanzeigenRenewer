const fs = require('node:fs');
const assert = require('node:assert/strict');
const css = fs.readFileSync('app.css', 'utf8');
let n = 0; const pass = label => { n += 1; console.log('PASS ' + label); };
assert.match(css, /:root\s*\{[^}]*--app-header-height\s*:\s*72px[^}]*--app-shell-top-gap\s*:\s*20px[^}]*--app-shell-bottom-gap\s*:\s*28px/s); pass('header height and shell top/bottom gaps are explicit shared geometry tokens');
assert.match(css, /\.app-header\s*\{[^}]*min-height\s*:\s*var\(--app-header-height\)/s); pass('sticky header is anchored to the shared header height token');
assert.match(css, /\.app-shell\s*\{[^}]*padding\s*:\s*var\(--app-shell-top-gap\)\s+24px\s+var\(--app-shell-bottom-gap\)/s); pass('app shell uses the shared top and bottom gap tokens');
assert.match(css, /\.control-panel\s*\{[^}]*position\s*:\s*sticky[^}]*top\s*:\s*var\(--app-content-sticky-top\)/s); pass('control panel sticky threshold uses the dynamically measured shared content target');
console.log(`${n}/4 PASS`);
