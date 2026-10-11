const fs=require('node:fs'); const assert=require('node:assert/strict');
const bg=require('./v12215-source-surface.cjs'); let n=0; const pass=m=>{n++; console.log('PASS '+m);};
const s=bg.indexOf('async function markMassRenewalItemSucceeded'); const e=bg.indexOf('\nasync function startMassRenewalBatch',s); assert.ok(s>=0&&e>s); const block=bg.slice(s,e);
assert.match(block,/const previousBatchStatus\s*=\s*String\(batch\.status/); pass('success recovery captures previous top-level batch status');
assert.match(block,/applyMassRenewalFinalState\(batch\)/); pass('successful item recovery re-derives top-level batch terminal state from final items');
assert.match(block,/batchStatusNormalized/); pass('successful recovery tracks whether stale top-level status changed');
assert.match(bg,/MASS_RENEWAL_BATCH_STATUS_NORMALIZED/); pass('top-level recovery normalization is diagnosable');

assert.match(bg,/async function normalizeMassRenewalBatchTopLevelStatus\(batchId/); pass('persisted stale terminal batch status has a canonical self-healing normalizer');
const gs=bg.indexOf('async function getMassRenewalBatchStatus'); const ge=bg.indexOf('\nasync function retryMassRenewalItem',gs); const getBlock=bg.slice(gs,ge);
assert.match(getBlock,/normalizeMassRenewalBatchTopLevelStatus\(current\.batchId, 'status-query'\)/); pass('status query self-heals a stale persisted top-level batch status');
console.log(`${n} v1.20.16 mass recovery status-normalization checks passed`);
