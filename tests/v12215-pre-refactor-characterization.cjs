const assert=require('assert');
const src=require('./v12215-source-surface.cjs');
let p=0;function ok(n,f){try{f();p++;console.log('PASS '+n)}catch(e){console.error('FAIL '+n);throw e}}
function has(name){return src.includes(`function ${name}(`)||src.includes(`async function ${name}(`)}
ok('mass renewal keeps terminal outcome classifier',()=>assert(has('massRenewalTerminalOutcome')));
ok('mass renewal keeps persisted batch read/write ownership',()=>{assert(has('readMassRenewalBatch'));assert(has('writeMassRenewalBatch'));});
ok('mass renewal keeps canonical item-derived counts and public snapshot',()=>{assert(has('massRenewalBatchCounts'));assert(has('massRenewalPublicSnapshot'));assert.match(src,/counts:\s*massRenewalBatchCounts\(batch\)/);});
ok('mass renewal keeps serialized mutation boundary with monotone revision',()=>{assert(has('mutateMassRenewalBatch'));assert.match(src,/revision\s*=\s*Math\.max\(0,\s*Number\(batch\.revision/);});
ok('mass renewal stop-after-current preserves queued cancellation semantics',()=>{assert(has('applyMassRenewalStopState'));assert.match(src,/stopAfterCurrentRequested/);assert.match(src,/item\.status\s*=\s*['"]cancelled['"]/);});
ok('mass renewal watchdog remains present and fail-safe',()=>{assert(has('runMassRenewalWatchdog'));assert.match(src,/MASS_RENEWAL_WATCHDOG_TIMEOUT/);assert.match(src,/progress-watchdog-timeout/);});
ok('renewal verification keeps semantic record comparison',()=>{assert(has('compareRenewalRecords'));assert.match(src,/requirePublicAvailability\s*=\s*true/);});
ok('fast renewal verification remains My Ads presence-only',()=>{assert(has('runFastRenewalVerification'));assert.match(src,/my-ads-presence-only/);assert.match(src,/semanticComparisonPerformed:\s*false/);});
ok('safe renewal verification remains fresh-edit-first with public enrichment',()=>{assert(has('runRenewalReinventory'));assert.match(src,/fresh-edit-reinventory/);assert.match(src,/requirePublicAvailability:\s*false/);assert.match(src,/RENEWAL_PUBLIC_ENRICHMENT_UNAVAILABLE/);});
ok('phase 4 still independently verifies source absence',()=>{assert(has('verifyRenewalSourceAbsenceFresh'));assert.match(src,/source-delete-verified/);assert.match(src,/post-delete/);});
console.log(`${p}/10 PASS v1.22.15 pre-refactor characterization`);
