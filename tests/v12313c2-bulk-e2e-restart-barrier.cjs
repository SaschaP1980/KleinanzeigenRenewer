const fs = require('node:fs');
const assert = require('node:assert/strict');

const source = fs.readFileSync('tests/e2e/run_browser_e2e.py', 'utf8');
const start = source.indexOf('def scenario_bulk_runtime_lease_recovery');
const end = source.indexOf('\ndef scenario_accordion_rapid_toggle', start);
assert.ok(start >= 0 && end > start, 'bulk runtime lease recovery scenario must exist');
const scenario = source.slice(start, end);

assert.match(scenario, /GET_BACKGROUND_EPOCH/, 'bulk recovery E2E must capture/wait for background epoch');
assert.match(scenario, /epoch_before|epochBefore/, 'bulk recovery E2E must capture pre-restart epoch');
assert.match(scenario, /epoch_after|epochAfter/, 'bulk recovery E2E must confirm a new post-restart epoch');
assert.match(scenario, /epoch_after\s*!=\s*epoch_before|epochAfter\s*!=\s*epochBefore/, 'bulk recovery E2E must prove a real service-worker restart before state assertions');
assert.match(scenario, /last_status_error|lastStatusError/, 'bulk recovery E2E failure must preserve the last runtime status error');
console.log('5/5 PASS v1.23.13_c2 bulk E2E restart barrier contract');
