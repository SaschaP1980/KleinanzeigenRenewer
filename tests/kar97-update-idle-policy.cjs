// KAR-97 Wave 03A: test-first, pure fail-closed candidate classifier.
// Deliberately no NativeHost, Chrome runtime, file changes or update activation here.
'use strict';
const assert = require('node:assert/strict');
const Policy = require('../src/background/services/update-idle-policy.js');
const NOW = Date.UTC(2026, 9, 16, 10, 0, 0);
const GENERATION = 'worker-epoch-1';
const PROFILE = 'profile-fixture';
const owners = [
  'bulkInventory', 'bulkReconciliation', 'singleInventory', 'renewal',
  'massRenewal', 'templateFill', 'archiveInsertion', 'trashMutation',
  'insertionLock', 'managedTabs', 'profileTransition', 'accountTransition',
  'emergencyRecovery', 'diagnosticExport', 'nativeUpdateTransaction'
];
const make = () => ({
  schema: 1, workerGeneration: GENERATION, profileId: PROFILE,
  observedAtMs: NOW - 500,
  owners: Object.fromEntries(owners.map(id => [id, {
    confirmed: true, state: 'idle', workerGeneration: GENERATION,
    profileId: PROFILE, observedAtMs: NOW - 500
  }]))
});
const clone = v => structuredClone(v);
let checks = 0;
function expect(s, status, reason, why) {
  const result = Policy.evaluate(s, { nowMs: NOW });
  assert.deepEqual(result, { status, reason }, why);
  assert.equal('safeToApply' in result, false, 'candidate is never host authorization');
  console.log('PASS KAR97 ' + why);
  checks++;
}
const deny = (s, reason, why) => expect(s, 'blocked', reason, why);
assert.deepEqual(Policy.requiredOwners, owners, 'all relevant owners required');
checks++; console.log('PASS KAR97 exact required ownership surface');
const valid = make();
expect(valid, 'candidate-idle', 'ALL_OWNERS_IDLE', 'complete fresh authoritative snapshot only candidate');
const before = clone(valid);
deny(null, 'INVALID_SNAPSHOT', 'absent top-level snapshot fails closed');
deny({...make(), extra: 'allow'}, 'INVALID_SNAPSHOT', 'unknown top-level field rejected');
deny({...make(), workerGeneration: ''}, 'INVALID_SNAPSHOT', 'empty worker generation rejected');
deny({...make(), profileId: ''}, 'INVALID_SNAPSHOT', 'missing profile identity rejected');
deny({...make(), observedAtMs: null}, 'INVALID_SNAPSHOT', 'invalid clock field rejected');
deny({...make(), observedAtMs: NOW + 1}, 'FUTURE_SNAPSHOT', 'clock future snapshot rejected');
deny({...make(), observedAtMs: NOW - 10000}, 'STALE_SNAPSHOT', 'stale snapshot rejected');
let snap=make();delete snap.owners.bulkInventory;
deny(snap, 'OWNER_MISSING', 'missing bulk owner rejected');
snap=make();snap.owners.randomFutureOwner = snap.owners.bulkInventory;
deny(snap, 'OWNER_SET_INVALID', 'unrecognized owner means incomplete policy');
snap=make();snap.owners.renewal = null;
deny(snap, 'OWNER_UNKNOWN', 'null renewal owner rejected');
snap=make();snap.owners.renewal.confirmed = false;
deny(snap, 'OWNER_UNKNOWN', 'unconfirmed storage read rejected');
snap=make();snap.owners.renewal.state = 'unknown';
deny(snap, 'OWNER_UNKNOWN', 'ambiguous owner rejected');
snap=make();snap.owners.renewal.state = 'active';
deny(snap, 'OWNER_ACTIVE', 'active renewal rejected');
snap=make();snap.owners.bulkInventory.state = 'pending';
deny(snap, 'OWNER_NOT_IDLE', 'pending bulk operation rejected');
snap=make();snap.owners.emergencyRecovery.state = 'needs-review';
deny(snap, 'OWNER_NOT_IDLE', 'recovery requiring review rejected');
snap=make();snap.owners.managedTabs.workerGeneration = 'worker-epoch-previous';
deny(snap, 'OWNER_GENERATION_MISMATCH', 'worker restart mismatch rejected');
snap=make();snap.owners.profileTransition.profileId = 'other-profile';
deny(snap, 'OWNER_PROFILE_MISMATCH', 'cross profile transition mismatch rejected');
snap=make();snap.owners.insertionLock.observedAtMs = NOW - 10000;
deny(snap, 'OWNER_STALE', 'stale lock observation rejected');
snap=make();snap.owners.trashMutation.observedAtMs = NOW + 1;
deny(snap, 'OWNER_FUTURE', 'future owner observation rejected');
snap=make();snap.owners.renewal.hacked = true;
deny(snap, 'OWNER_UNKNOWN', 'extra owner read fields rejected');
snap=make();snap.owners.nativeUpdateTransaction.state='active';
deny(snap, 'OWNER_ACTIVE', 'concurrent native update transaction rejected');
snap=make();snap.owners.bulkReconciliation.state = 'pending';
deny(snap, 'OWNER_NOT_IDLE', 'unfinished bulk reconciliation rejected');
assert.deepEqual(Policy.evaluate(make()), { status:'blocked', reason:'INVALID_TIME' }, 'missing time fail closed');
checks++; console.log('PASS KAR97 missing authoritative current time rejected');
assert.deepEqual(valid,before,'pure evaluator does not mutate input');
checks++; console.log('PASS KAR97 input unmodified');
assert.equal(typeof Policy.apply, 'undefined', 'no update/apply method');
checks++; console.log('PASS KAR97 no privileged apply API');
console.log('PASS KAR97 total '+checks);
