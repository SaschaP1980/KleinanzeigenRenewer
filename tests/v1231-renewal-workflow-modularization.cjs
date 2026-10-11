const assert = require('assert');
const fs = require('fs');
let passed = 0;
const ok = (name, fn) => { try { fn(); passed++; console.log('PASS ' + name); } catch (error) { console.error('FAIL ' + name); throw error; } };
const background = fs.readFileSync('background.js','utf8');
const modulePath = 'renewal-workflow-controller.js';

ok('renewal workflow module exists', () => assert.ok(fs.existsSync(modulePath)));
if (fs.existsSync(modulePath)) {
  const mod = fs.readFileSync(modulePath,'utf8');
  ok('renewal workflow registers through KRDeps', () => assert.match(mod, /KRDeps\.register\(['\"]KRRenewalWorkflowController['\"]/));
  ok('renewal workflow resolves KRDeps explicitly from globalThis for MV3 importScripts', () => assert.match(mod, /const\s+KRDeps\s*=\s*globalThis\.KRDeps/));
  ok('renewal workflow exposes factory API', () => assert.match(mod, /create\s*\(options\s*=\s*\{\}\)/));
  ok('module owns orchestration while the three extracted owners implement their original functions', () => {
    const implementations = {
      controller: mod,
      fast: fs.readFileSync('src/background/services/renewal-verification-flow.js','utf8'),
      safe: fs.readFileSync('src/background/services/renewal-reinventory-flow.js','utf8'),
      paid: fs.readFileSync('src/background/services/paid-checkout-recovery-service.js','utf8')
    };
    for (const [owner,names] of Object.entries({
      controller: ['createRenewalSkeleton','updateRenewalSkeleton','persistRenewalSession','sendRenewalFeedback','scheduleAutomaticRenewalReplacement','retryRenewalVerification','markRenewalPublishClicked','confirmPublishedRenewal','resumePendingRenewals'],
      fast: ['runFastRenewalVerification'], safe: ['runRenewalReinventory'], paid: ['tryRecoverAbortedPaidCheckout']
    })) for(const name of names) assert.match(implementations[owner],new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`), `${owner}: ${name}`);
  });
  ok('module does not create a new Chrome runtime message boundary', () => {
    for(const source of [mod,fs.readFileSync('src/background/services/renewal-verification-flow.js','utf8'),fs.readFileSync('src/background/services/renewal-reinventory-flow.js','utf8'),fs.readFileSync('src/background/services/paid-checkout-recovery-service.js','utf8')]) assert.doesNotMatch(source,/chrome\.runtime\.(?:sendMessage|connect)\s*\(/);
  });
}
ok('background imports renewal workflow module', () => assert.match(background, /renewal-workflow-controller\.js/));
ok('service worker retains emergency reset composition while the explicit safety controller owns implementation', () => {
  const emergencyReset = fs.readFileSync('src/background/controllers/workflow-emergency-reset-controller.js','utf8');
  assert.match(background, /workflow-emergency-reset-controller\.js/);
  assert.match(background, /async function resetActiveWorkflows\s*\(\)\s*\{\s*return requireWorkflowEmergencyResetController\(\)\.resetActiveWorkflows\(\);\s*\}/);
  assert.match(emergencyReset, /ACTIVE_WORKFLOWS_EMERGENCY_RESET/);
});
ok('background delegates renewal workflow through a controller', () => assert.match(background, /requireRenewalWorkflowController\s*\(/));
console.log(`${passed} PASS v1.23.1 renewal workflow modularization`);
