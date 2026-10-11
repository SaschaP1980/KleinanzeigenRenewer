const fs = require('fs');
const assert = require('assert');
const bg = fs.readFileSync('background.js','utf8');
const workflow = fs.existsSync('mass-renewal-workflow-controller.js') ? fs.readFileSync('mass-renewal-workflow-controller.js','utf8') : '';
const watchdog = fs.existsSync('src/background/services/mass-renewal-watchdog-service.js') ? fs.readFileSync('src/background/services/mass-renewal-watchdog-service.js','utf8') : '';
const surface = [bg, workflow, watchdog].join('\n');
const state = fs.readFileSync('mass-renewal-controller.js','utf8');
let pass=0;
function ok(cond,msg){assert.ok(cond,msg); console.log('PASS',msg); pass++;}
for (const name of [
  'startNextMassRenewalItem','reconcileMassRenewalBatchSession','markMassRenewalItemSucceeded',
  'startMassRenewalBatch','requestMassRenewalStopAfterCurrent','normalizeMassRenewalBatchTopLevelStatus',
  'getMassRenewalBatchStatus','retryMassRenewalItem','resumeMassRenewalBatch',
  'armMassRenewalWatchdog','runMassRenewalWatchdog','massRenewalWatchdogTick'
]) ok(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).test(surface), `mass-renewal surface retains ${name}`);
ok(surface.includes("MASS_RENEWAL_BATCH_STARTED"), 'batch-start diagnostic retained');
ok(surface.includes("MASS_RENEWAL_WATCHDOG_TIMEOUT"), 'watchdog timeout diagnostic retained');
ok(surface.includes("paid-insertion-required"), 'paid insertion stop semantics retained');
ok(state.includes('mutateMassRenewalBatch') && state.includes('finalizeMassRenewalBatchIfDone'), 'state controller owns serialized batch mutation/finalization');
console.log(`PASS_COUNT ${pass}`);
