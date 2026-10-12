const { includesActivePatch } = require('./current-patch-policy.cjs');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app-layout-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
let pass = 0;
const check = (name, fn) => { fn(); pass += 1; console.log(`PASS ${name}`); };
check('version is v1.21.7', () => assert.ok(includesActivePatch(['1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version)));
check('shared dynamic sticky top variable is used by fixed header', () => {
  assert.match(css, /--list-sticky-top:/);
  assert.match(css, /\.list-sticky-header\.is-stuck\s*\{[\s\S]*?top:\s*var\(--list-sticky-top\)/);
});
check('normal header creates a stable block formatting context', () => {
  assert.match(css, /\.list-sticky-header\s*\{[^}]*display:\s*flow-root/);
});
check('target includes app shell top gap', () => {
  assert.match(js, /function stickyShellTopGap\(\)/);
  assert.match(js, /--app-shell-top-gap/);
  assert.match(js, /headerBottom\s*\+\s*stickyShellTopGap\(\)/);
});
check('JS publishes exactly the same target to CSS', () => {
  assert.match(js, /--list-sticky-top/);
  assert.match(js, /style\.setProperty\(['"]--list-sticky-top['"]/);
});
check('pin decision uses the shared sticky target and avoids initial self-pin', () => {
  assert.match(js, /const threshold = stickyHeaderThreshold\(\)/);
  assert.match(js, /scrollY\s*>\s*0/);
  assert.match(js, /sentinelTop\s*<\s*threshold/);
});
console.log(`v1.21.7 sticky target/geometry contract: ${pass}/6 PASS`);
