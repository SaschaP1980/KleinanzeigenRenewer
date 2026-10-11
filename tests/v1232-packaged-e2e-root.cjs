const assert=require('assert');
const fs=require('fs');
const child=fs.readFileSync('tests/e2e/run_browser_e2e.py','utf8');
assert.match(child,/KR_E2E_EXTENSION_ROOT/,'Browser E2E must support testing an unpacked packaged Chrome artifact root');
assert.match(child,/EXTENSION_ROOT/,'Browser E2E must separate test harness root from extension root');
console.log('PASS Browser E2E supports packaged Chrome artifact root');
