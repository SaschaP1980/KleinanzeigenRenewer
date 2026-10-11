const fs = require('node:fs');
const assert = require('node:assert/strict');
const bg = require('./v12215-source-surface.cjs');
let n = 0; const pass = label => { n += 1; console.log('PASS ' + label); };

assert.match(bg, /async function compareRenewalRecords\(source, candidate, \{[^}]*requirePublicAvailability\s*=\s*true/s); pass('semantic comparison can explicitly decouple public availability');
assert.match(bg, /if \(requirePublicAvailability && !onlineConfirmed\)\s*\{/); pass('online uncertainty is only added when public availability is required');

const fastStart = bg.indexOf('async function runFastRenewalVerification');
const fastEnd = bg.indexOf('\nasync function runRenewalReinventory', fastStart);
const fast = bg.slice(fastStart, fastEnd);
assert.match(fast, /verification:\s*'my-ads-presence-only'/); pass('fast verification remains My Ads presence only');
assert.match(fast, /semanticComparisonPerformed:\s*false/); pass('fast verification still performs no semantic comparison');
assert.match(fast, /reinventor(?:y|ization)Performed:\s*false/); pass('fast verification still skips edit reinventory');

const safeStart = bg.indexOf('async function runRenewalReinventory');
const safeEnd = bg.indexOf('\nasync function retryRenewalVerification', safeStart);
const safe = bg.slice(safeStart, safeEnd);
assert.match(safe, /verification:\s*'fresh-edit-reinventory'/); pass('full verification still captures a fresh edit snapshot');
assert.match(safe, /compareRenewalRecords\(source, candidate, \{[\s\S]*requirePublicAvailability:\s*false[\s\S]*\}\)/); pass('full verification compares edit snapshot independently of public readiness');
assert.ok(safe.indexOf('compareRenewalRecords(source, candidate') < safe.indexOf('resolveRenewalPublicEvidence(newAdId')); pass('authoritative edit comparison runs before public enrichment');
assert.match(safe, /catch \(publicError\) \{[\s\S]*RENEWAL_PUBLIC_ENRICHMENT_UNAVAILABLE[\s\S]*publicAvailabilityPending/); pass('public enrichment failure degrades to Bald Online instead of blocking a semantic match');
assert.match(safe, /session\.status\s*=\s*'verified';[\s\S]*session\.stage\s*=\s*'replacement-ready'/); pass('matching edit snapshot is sufficient for replacement-ready');
assert.match(safe, /publicAvailabilityPending:\s*!readOnlyResult\.ok/); pass('full verification records unresolved public availability separately');
assert.match(safe, /scheduleAutomaticRenewalReplacement\(renewalId,\s*'edit-comparison-match'\)/); pass('automatic phase 4 may start after authoritative edit comparison match');

const finishStart = bg.indexOf('async function finishRenewalReplacement');
const finishEnd = bg.indexOf('\nasync function discardRenewalDraft', finishStart);
const finish = bg.slice(finishStart, finishEnd);
assert.match(finish, /VERIFY_OWN_AD_ABSENT_BY_ID|verifyRenewalSourceAbsenceFresh/); pass('phase 4 still independently verifies source absence');
assert.match(finish, /source-delete-verified/); pass('promotion still requires source-delete-verified state');
console.log(`${n}/14 PASS`);
