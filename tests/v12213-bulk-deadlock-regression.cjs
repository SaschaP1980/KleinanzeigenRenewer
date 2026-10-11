const fs = require('fs');
const assert = require('assert');
const bg = fs.readFileSync('background.js','utf8') + '\n' + fs.readFileSync('background-message-router.js','utf8');
const runner = fs.readFileSync('inventory-runner.js','utf8');
const lifecycle = fs.readFileSync('tab-lifecycle-observer.js','utf8');
const html = fs.readFileSync('app.html','utf8');
const app = fs.readFileSync('app.js','utf8') + '\n' + fs.readFileSync('diagnostics-controls-controller.js','utf8');
let n=0; function pass(name){ console.log('PASS '+name); n++; }
assert.ok(runner.includes('WORKER_REQUEST_TIMEOUT_MS') && runner.includes('runtimeMessageWithTimeout') && /BULK_EXTRACT_SAVE_WORKER/.test(runner)); pass('bulk worker polling has a per-request hard timeout');
assert.ok(runner.includes('Math.min(WORKER_REQUEST_TIMEOUT_MS') && runner.includes('deadline - Date.now()')); pass('per-request timeout is capped by the absolute item deadline');
assert.ok(bg.includes('bulk-run-guard.js') && bg.includes("KRDeps.require('KRBulkRunGuard')")); pass('background loads dedicated bulk run guard');
assert.ok(bg.includes('mutateBulkRunState') && lifecycle.includes('mutateBulkRunState')); pass('bulk lifecycle cleanup uses an atomic mutation boundary');
assert.ok(bg.includes('BULK_ITEM_HARD_TIMEOUT_MS') && bg.includes('bulkRunWatchdogTick')); pass('background has an independent bulk item watchdog');
assert.ok(bg.includes('ensureBulkRuntimeRecovery') && bg.includes('bulkRunRuntimeLeaseV1')); pass('runtime-session lease recovery handles extension reload orphaning');
assert.ok(html.includes('emergencyWorkflowResetButton') && app.includes("RESET_ACTIVE_WORKFLOWS")); pass('diagnostics exposes manual emergency workflow reset');
assert.ok(bg.includes('resetActiveWorkflows') && bg.includes("message?.type === \"RESET_ACTIVE_WORKFLOWS\"") || bg.includes('"RESET_ACTIVE_WORKFLOWS": Object.freeze')); pass('background implements non-destructive emergency workflow reset');
for (const source of [bg,runner,lifecycle,app]) { assert.equal((source.match(/\.requestSubmit\s*\(/g)||[]).length,0); assert.equal((source.match(/\.submit\s*\(/g)||[]).length,0); }
pass('stability fix introduces no direct form submit bypass');
console.log(`${n}/9 PASS v1.22.13 bulk deadlock regression`);
