const fs = require('fs');
const assert = require('assert');
const exists = fs.existsSync('mass-renewal-workflow-controller.js');
assert.ok(exists, 'mass-renewal-workflow-controller.js must exist');
const src = fs.readFileSync('mass-renewal-workflow-controller.js','utf8');
const bg = fs.readFileSync('background.js','utf8');
assert.ok(src.includes("KRDeps.register('KRMassRenewalWorkflowController'"), 'controller must register through KRDeps');
assert.ok(bg.includes('mass-renewal-workflow-controller.js'), 'background must import workflow controller');
assert.ok(bg.includes("KRDeps.require('KRMassRenewalWorkflowController')"), 'background must require workflow controller');
for (const name of ['startNextMassRenewalItem','reconcileMassRenewalBatchSession','startMassRenewalBatch','retryMassRenewalItem','resumeMassRenewalBatch','runMassRenewalWatchdog']) {
  assert.ok(src.includes(`function ${name}(`) || src.includes(`async function ${name}(`), `${name} must move to workflow controller`);
}
assert.ok(src.includes('function resetRuntimeState()'), 'controller must own mass workflow runtime reset');
assert.ok(bg.includes('resetMassRenewalWorkflowRuntimeState()'), 'background emergency reset must delegate mass workflow runtime reset');
assert.ok(!bg.includes('massRenewalAdvanceInFlight.clear()'), 'background must not reach into controller-local advance state');
console.log('PASS v1.23.3 mass renewal workflow modularization');
