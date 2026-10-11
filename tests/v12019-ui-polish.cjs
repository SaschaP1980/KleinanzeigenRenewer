const fs = require('node:fs');
const assert = require('node:assert/strict');
const css = fs.readFileSync('app.css', 'utf8');
let n = 0; const pass = label => { n += 1; console.log('PASS ' + label); };
assert.match(css, /\.control-panel\s*\{[^}]*top\s*:\s*var\(--app-content-sticky-top\)/s); pass('left sticky panel uses the dynamically measured shared content target');
assert.match(css, /\.content-view-navigation\s*\{[^}]*margin\s*:\s*0\s+-16px\s+-1px\s+0/s); pass('header view navigation reduces only the outer right scrollbar gap');
assert.match(css, /\.content-view-refresh-button\s*\{[^}]*border\s*:\s*1px solid #4de0b7[^}]*border-radius\s*:\s*9px 9px 0 0/s); pass('v1.20.18 cyan refresh Gold-Line styling stays unchanged');
console.log(`${n}/3 PASS`);
