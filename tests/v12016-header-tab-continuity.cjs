const fs=require('node:fs'); const assert=require('node:assert/strict');
const css=fs.readFileSync('app.css','utf8'); let n=0; const pass=m=>{n++; console.log('PASS '+m);};
assert.match(css,/\.app-header\s*\{[^}]*border-bottom:\s*1px solid #4de0b7/i); pass('header baseline is bright cyan');
assert.match(css,/\.content-view-navigation \.view-switch-button\s*\{[^}]*border-bottom-color:\s*#4de0b7/i); pass('inactive tab bottom edge preserves the bright-cyan baseline');
assert.match(css,/\.content-view-navigation \.view-switch-button:first-child\s*\{[^}]*border-right-color:\s*#4de0b7/i); pass('Inventar right seam is bright cyan');
assert.match(css,/\.content-view-navigation \.view-switch-button:last-child\s*\{[^}]*border-left-color:\s*#4de0b7/i); pass('Papierkorb left seam is bright cyan');
console.log(`${n} v1.20.16 continuous header-tab border checks passed`);
