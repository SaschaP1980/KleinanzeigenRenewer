const fs=require('fs'),assert=require('assert');
const Repo=require('../renewal-state-repository.js');
const bg=fs.readFileSync('background.js','utf8');
const emergencyReset=fs.readFileSync('src/background/controllers/workflow-emergency-reset-controller.js','utf8');
const remote=fs.readFileSync('remote-delete-replacement-service.js','utf8');
const fillService=fs.readFileSync('template-fill-service.js','utf8');
const massWorkflow=[
  fs.existsSync('mass-renewal-workflow-controller.js')?fs.readFileSync('mass-renewal-workflow-controller.js','utf8'):'',
  fs.existsSync('src/background/services/mass-renewal-watchdog-service.js')?fs.readFileSync('src/background/services/mass-renewal-watchdog-service.js','utf8'):''
].join('\n');
const archiveService=fs.readFileSync('archive-insertion-service.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const profile=fs.readFileSync('profile-backup-controller.js','utf8');
let pass=0, fail=0;
function check(name,fn){try{fn();pass++;console.log('PASS',name);}catch(error){fail++;console.error('FAIL',name,'-',error.message);}}
const resetBody=(emergencyReset.match(/async function resetActiveWorkflows\(\)\s*\{([\s\S]*?)\n\}\n\n/)||[])[1]||'';
check('1 local emergency reset performs no checkout/remote recovery',()=>{
  assert.ok(resetBody,'resetActiveWorkflows body not found');
  assert.doesNotMatch(resetBody,/tryRecoverAbortedPaidCheckout|verifyAbortedPaidCheckoutNoPublication|MY_ADS_STATUS/);
});
check('2 reset diagnostics explicitly state account independence and no remote verification',()=>{
  assert.match(resetBody,/accountIndependent\s*:\s*true/);
  assert.match(resetBody,/remoteVerificationAttempted\s*:\s*false/);
});
check('3 renewal repository exposes a deterministic emergency-reset transition',()=>{
  assert.equal(typeof Repo.emergencyResetRenewalState,'function');
});
check('4 post-publish renewal becomes cancelled/unverified and releases global insertion lock',()=>{
  const s={renewalId:'r-post',status:'submitted',stage:'publish-submitted',publishClickedAt:'2026-09-26T10:00:00.000Z',newAdId:null};
  const next=Repo.emergencyResetRenewalState(s,{now:'2026-09-26T11:00:00.000Z',issue:'reset'});
  assert.equal(next.status,'cancelled'); assert.equal(next.stage,'emergency-reset-unverified');
  assert.equal(next.remoteVerification,'unverified'); assert.equal(next.remoteVerificationRequired,true);
  assert.equal(Repo.renewalHoldsInsertionLock(next),false);
});
check('5 safe pre-publish renewal cancels without invented remote uncertainty',()=>{
  const s={renewalId:'r-pre',status:'running',stage:'phase1-started',publishClickedAt:null,newAdId:null,phaseAttempts:{1:{attempt:1}}};
  const next=Repo.emergencyResetRenewalState(s,{now:'2026-09-26T11:00:00.000Z',issue:'reset'});
  assert.equal(next.status,'cancelled'); assert.equal(next.stage,'manual-emergency-reset');
  assert.notEqual(next.remoteVerificationRequired,true); assert.notEqual(next.remoteVerification,'unverified');
  assert.equal(Repo.renewalHoldsInsertionLock(next),false);
});
check('6 renewal public snapshot exports reset and remote-verification evidence',()=>{
  assert.match(fs.readFileSync('renewal-state-repository.js','utf8'),/emergencyResetAt/);
  assert.match(fs.readFileSync('renewal-state-repository.js','utf8'),/remoteVerificationRequired/);
  assert.match(fs.readFileSync('renewal-state-repository.js','utf8'),/remoteVerification/);
});
check('7 global reset owns a monotonic generation fence',()=>{
  assert.match(bg,/emergencyResetGeneration/);
  assert.match(resetBody,/emergencyResetGeneration\s*\+=\s*1|bumpEmergencyResetGeneration\s*\(/);
});
check('8 phase 4 rechecks reset generation immediately before DELETE_OWN_AD_BY_ID',()=>{
  assert.match(remote,/(?:assertEmergencyResetGeneration|assertResetGeneration)[\s\S]{0,900}DELETE_OWN_AD_BY_ID/);
});
check('9 renewal persistence preserves terminal emergency-reset tombstones against stale writes',()=>{
  assert.match(fs.readFileSync('renewal-state-repository.js','utf8'),/preserveEmergencyResetTombstones/);
});
check('10 fill persistence preserves terminal emergency-reset tombstones against stale writes',()=>{
  assert.match(fillService,/preserveEmergencyResetTombstones/);
});
check('11 archive persistence preserves terminal emergency-reset tombstones against stale writes',()=>{
  assert.match(archiveService,/preserveEmergencyResetTombstones/);
});
check('12 emergency reset clears in-flight sets/watchdog timer and terminalizes bulk/mass work',()=>{
  assert.match(resetBody,/resetMassRenewalWorkflowRuntimeState\s*\(\)/);
  assert.match(massWorkflow,/massRenewalAdvanceInFlight\.clear\s*\(\)/);
  assert.match(resetBody,/automaticReplacementInFlight\.clear\s*\(\)/);
  assert.match(resetBody,/renewalPhase1RetryInFlight\.clear\s*\(\)/);
  assert.match(resetBody,/renewalPublishDetectionInFlight\.clear\s*\(\)/);
  assert.match(massWorkflow,/clearTimeoutFn\s*\(massRenewalWatchdogTimer\)/);
  assert.match(resetBody,/not-started-manual-emergency-reset/);
});
check('13 app-side reset releases profile-transfer/local workflow state without account probe',()=>{
  assert.match(profile,/handleEmergencyWorkflowReset|emergencyReset/);
  assert.match(app,/handleEmergencyWorkflowReset[\s\S]{0,900}ProfileBackupController|ProfileBackupController[\s\S]{0,900}handleEmergencyWorkflowReset/);
});
check('14 v1.22.29 checkout reconciliation remains available but is not the reset controller',()=>{
  assert.match(bg,/async function verifyAbortedPaidCheckoutNoPublication/);
  assert.match(bg,/async function tryRecoverAbortedPaidCheckout/);
  assert.doesNotMatch(resetBody,/tryRecoverAbortedPaidCheckout/);
});
console.log(`${pass}/14 PASS v1.22.30 global emergency reset contract; ${fail} FAIL`);
if(fail) process.exit(1);
