const fs=require('fs'),assert=require('assert');
const Repo=require('../renewal-state-repository.js');
let pass=0; const ok=(n,f)=>{f(); pass++; console.log('PASS',n)};
assert.equal(typeof Repo.isCheckoutAbortedRecoveryCandidate,'function','checkout recovery candidate policy missing');
assert.equal(typeof Repo.evaluateCheckoutRecoveryProof,'function','checkout recovery proof policy missing');
const session={renewalId:'e161',profileId:'p1',sourceAdId:'3522627185',status:'needs-review',stage:'manual-emergency-reset',newAdId:null,publishClickedAt:'2026-09-25T10:24:27.781Z',newIdConfirmedAt:null,newPublicUrl:null,comparison:null,publicAvailability:null,phaseAttempts:{1:{attempt:1}}};
ok('real checkout legacy shape requires explicit checkout evidence',()=>{
  assert.equal(Repo.isCheckoutAbortedRecoveryCandidate(session,{checkoutObserved:false}),false);
  assert.equal(Repo.isCheckoutAbortedRecoveryCandidate(session,{checkoutObserved:true}),true);
});
ok('proof passes only when complete fresh roster is entirely pre-click known and source is present',()=>{
  const r=Repo.evaluateCheckoutRecoveryProof({session,expectedProfile:'konto@example',baselineIds:['3522626672','3522627185','3522628088'],roster:{profileName:'konto@example',complete:true,onlineCount:3,ids:['3522626672','3522627185','3522628088']}});
  assert.equal(r.verified,true); assert.deepStrictEqual(r.unknownIds,[]);
});
ok('unknown remote id keeps recovery fail-closed',()=>{
  const r=Repo.evaluateCheckoutRecoveryProof({session,expectedProfile:'konto@example',baselineIds:['3522626672','3522627185'],roster:{profileName:'konto@example',complete:true,onlineCount:3,ids:['3522626672','3522627185','9999999999']}});
  assert.equal(r.verified,false); assert.deepStrictEqual(r.unknownIds,['9999999999']);
});
ok('missing source, wrong account or incomplete roster keep lock',()=>{
  const base={session,expectedProfile:'konto@example',baselineIds:['3522626672','3522627185']};
  assert.equal(Repo.evaluateCheckoutRecoveryProof({...base,roster:{profileName:'konto@example',complete:true,onlineCount:1,ids:['3522626672']}}).verified,false);
  assert.equal(Repo.evaluateCheckoutRecoveryProof({...base,roster:{profileName:'other@example',complete:true,onlineCount:2,ids:['3522626672','3522627185']}}).verified,false);
  assert.equal(Repo.evaluateCheckoutRecoveryProof({...base,roster:{profileName:'konto@example',complete:false,onlineCount:2,ids:['3522626672','3522627185']}}).verified,false);
});
const runner=fs.readFileSync('inventory-runner.js','utf8');
ok('MY_ADS_STATUS supports a read-only full-roster pagination snapshot',()=>{assert.match(runner,/message\?\.fullRoster\s*===\s*true/);assert.match(runner,/snapshotOwnAdRoster/);});
const bg=require('./v1231-legacy-background-surface.cjs');
ok('background owns explicit checkout recovery verification with diagnostics',()=>{assert.match(bg,/verifyAbortedPaidCheckoutNoPublication/);assert.match(bg,/RENEWAL_CHECKOUT_RECOVERY_VERIFICATION_(?:CONFIRMED|BLOCKED)/);});
ok('recovery finalizes local renewal only after verified result and never deletes source',()=>{assert.match(bg,/checkout-aborted-verified/);assert.doesNotMatch(bg,/verifyAbortedPaidCheckoutNoPublication[\s\S]{0,5000}DELETE_OWN_AD_BY_ID/);});
console.log(`${pass}/7 PASS`);
