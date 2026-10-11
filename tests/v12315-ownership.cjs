const fs=require('node:fs'),assert=require('node:assert/strict');
let n=0;const ok=(msg,f)=>{f();console.log('PASS '+msg);n++};
const base='src/background/';const ctl=base+'controllers/renewal-workflow-controller.js';
const view=p=>fs.readFileSync(base+p,'utf8');
ok('dedicated Fast verification flow owns the actual implementation',()=>{
 const s=view('services/renewal-verification-flow.js');assert.match(s,/KRRenewalVerificationFlow/);assert.match(s,/async function runFastRenewalVerification\(/);
});
ok('dedicated reinventory flow owns Safe phase 2 and phase 3',()=>{
 const s=view('services/renewal-reinventory-flow.js');assert.match(s,/KRRenewalReinventoryFlow/);assert.match(s,/async function runRenewalReinventory\(/);
});
ok('dedicated paid checkout recovery service owns proof and finalize',()=>{
 const s=view('services/paid-checkout-recovery-service.js');assert.match(s,/KRPaidCheckoutRecoveryService/);assert.match(s,/async function verifyAbortedPaidCheckoutNoPublication\(/);assert.match(s,/async function finalizeVerifiedCheckoutAbort\(/);
});
ok('controller retains orchestrator ownership without hidden extracted implementations',()=>{
 const s=fs.readFileSync(ctl,'utf8');assert.doesNotMatch(s,/async function runFastRenewalVerification\(/);assert.doesNotMatch(s,/async function runRenewalReinventory\(/);assert.doesNotMatch(s,/async function verifyAbortedPaidCheckoutNoPublication\(/);for(const k of ['scheduleAutomaticRenewalReplacement','retryRenewalVerification','resumePendingRenewals'])assert.ok(s.includes(k));
});
ok('ports and loading order are explicit and do not add IPC boundaries',()=>{
 const bg=fs.readFileSync(base+'background.js','utf8');const parts=['services/renewal-verification-flow.js','services/renewal-reinventory-flow.js','services/paid-checkout-recovery-service.js'];const ctrl='controllers/renewal-workflow-controller.js';
 for(const p of parts){assert.ok(bg.indexOf(p)>=0&&bg.indexOf(p)<bg.indexOf(ctrl),p);assert.ok(view(p).includes('Port'),p)}
});
console.log(`${n}/5 PASS v1.23.15 ownership`);
