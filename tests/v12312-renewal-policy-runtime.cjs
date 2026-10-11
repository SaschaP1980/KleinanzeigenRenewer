const assert=require('assert'); const P=require('../src/shared/renewal-policy.js'); let n=0; const ok=(c,m)=>{assert.ok(c,m);n++;console.log('PASS',m)};
ok(P.normalizeRenewalMode('FAST')==='fast'&&P.normalizeRenewalMode('x')==='safe','normalizes fast/safe mode fail-safe');
ok([P.normalizeRenewalPhaseAttempts(undefined),P.normalizeRenewalPhaseAttempts(0),P.normalizeRenewalPhaseAttempts(6),P.normalizeRenewalPhaseAttempts(4.6)].join(',')==='3,1,5,5','clamps phase attempts to 1..5 with default 3');
const s={maxPhaseAttempts:3,phaseAttempts:{'3':{attempt:2,attemptId:'a'}}};ok(P.renewalPhaseAttemptAvailable(s,3)===true&&P.renewalAttemptDetails(s,3).maxAttempts===3,'attempt availability preserves total-attempt semantics');
ok([1,2,3,4,5,9].map(P.renewalPhaseRetryDelayMs).join(',')==='0,1500,3500,6000,10000,10000','retry delay policy preserves bounded schedule');
ok(P.isNonRetryableRenewalSafetyError({code:'KR_EMERGENCY_RESET_GENERATION_CHANGED'})===true&&P.isNonRetryableRenewalSafetyError(new Error('temporary network issue'))===false,'safety retry classification remains fail-closed for emergency reset');
console.log(`${n}/5 PASS v1.23.12 renewal policy runtime`);
