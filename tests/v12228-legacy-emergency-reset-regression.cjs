const fs=require('fs'),assert=require('assert');
const Repo=require('../renewal-state-repository.js');
let n=0;const pass=s=>{n++;console.log('PASS',s)};
assert.equal(typeof Repo.isSafeLegacyManualEmergencyReset,'function','repository must expose conservative legacy emergency reset classifier');
const observed={renewalId:'e161b65e',status:'needs-review',stage:'manual-emergency-reset',newAdId:null,publishClickedAt:null,newIdConfirmedAt:null,newPublicUrl:null,comparison:null,publicAvailabilityPending:false,publicAvailability:null,phaseAttempts:{1:{attempt:1}},massBatchId:'batch',massBatchTerminal:false};
assert.equal(Repo.isSafeLegacyManualEmergencyReset(observed),true); assert.equal(Repo.renewalHoldsInsertionLock(observed),false); pass('observed pre-publish legacy reset is lock-free');
for (const [name,unsafe] of [
 ['publish click',{...observed,publishClickedAt:'2026-09-25T10:00:00.000Z'}],
 ['new ad id',{...observed,newAdId:'123456'}],
 ['submitted status',{...observed,status:'submitted'}],
 ['new id timestamp',{...observed,newIdConfirmedAt:'2026-09-25T10:00:00.000Z'}],
 ['public url',{...observed,newPublicUrl:'https://www.kleinanzeigen.de/s-anzeige/x/123456'}],
 ['comparison',{...observed,comparison:{status:'match'}}],
 ['later phase',{...observed,phaseAttempts:{1:{attempt:1},2:{attempt:1}}}]
]) { assert.equal(Repo.isSafeLegacyManualEmergencyReset(unsafe),false,`${name} must remain conservative`); assert.equal(Repo.renewalHoldsInsertionLock(unsafe),true,`${name} must keep insertion lock`); }
pass('all post-publish evidence keeps legacy reset locked');
const bg=require('./v1231-legacy-background-surface.cjs');
assert.match(bg,/isSafeLegacyManualEmergencyReset\(renewal\)/,'emergency reset/recovery must consult legacy classifier');
assert.match(bg,/RENEWAL_LEGACY_EMERGENCY_RESET_MIGRATED/,'startup recovery must terminalize safe legacy state with diagnostic event');
pass('background migrates and terminalizes safe legacy state');
const app=fs.readFileSync('app.js','utf8')+'\n'+fs.readFileSync('diagnostics-controls-controller.js','utf8'),html=fs.readFileSync('app.html','utf8');
assert.match(html,/id="diagnosticResetBlockReason"/,'diagnostics panel must expose visible blocker reason');
assert.match(app,/function diagnosticResetBlockReason\(/,'UI must derive concrete reset blocker reason');
assert.match(app,/(?:currentInsertionLock\?\.ownerId|lock\.ownerId)/,'lock blocker must include concrete owner when available');
assert.match(app,/(?:diagnosticResetBlockReasonElement|elements\.resetBlockReason)\.textContent\s*=\s*reason/,'visible blocker text must be synchronized');
pass('diagnostic reset explains the blocking workflow/lock');
console.log(`${n}/4 PASS v1.22.28 legacy emergency reset regression`);
