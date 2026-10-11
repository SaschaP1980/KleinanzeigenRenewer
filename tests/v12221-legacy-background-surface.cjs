const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
let background=fs.readFileSync(path.join(root,'background.js'),'utf8');
const modulePath=path.join(root,'remote-delete-replacement-service.js');
if(!fs.existsSync(modulePath)){
const massWorkflowPath=path.join(root,'mass-renewal-workflow-controller.js');
if(fs.existsSync(massWorkflowPath)){
  const massWorkflow=fs.readFileSync(massWorkflowPath,'utf8');
  const massNames=['findMassRenewalSessionForItem','startNextMassRenewalItem','reconcileMassRenewalBatchSession','markMassRenewalItemSucceeded','startMassRenewalBatch','requestMassRenewalStopAfterCurrent','normalizeMassRenewalBatchTopLevelStatus','getMassRenewalBatchStatus','retryMassRenewalItem','resumeMassRenewalBatch','latestMassRenewalProgressMs','armMassRenewalWatchdog','runMassRenewalWatchdog','massRenewalWatchdogTick'];
  for(const name of massNames){const impl=block(massWorkflow,name);const facade=block(background,name);if(impl&&facade)background=background.replace(facade,impl);else if(impl&&!facade)background += '\n' + impl;}
}
module.exports=background;return;}
const service=fs.readFileSync(modulePath,'utf8');
function block(src,name){const m=new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(src);if(!m)return'';let i=src.indexOf('{',m.index),d=0,q=null,esc=false;for(let j=i;j<src.length;j++){const c=src[j];if(q){if(esc){esc=false;continue}if(c==='\\\\'){esc=true;continue}if(c===q)q=null;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{')d++;else if(c==='}'&&--d===0)return src.slice(m.index,j+1)}return'';}
const names=['removeReplacementReadyLocal','promoteRenewalCandidateAtomic','renewalTargetTabStillOwned','renewalPublishedTargetTabStillOwned','closePublishedRenewalTargetTab','retirePublishedRenewalTargetTab','closeCompletedRenewalTargetTab','verifyRenewalSourceAbsenceFresh','preverifyAndTriggerRenewalSourceDeleteAttempt','finishRenewalReplacement'];
for(const name of names){const impl=block(service,name);const facade=block(background,name);if(impl&&facade)background=background.replace(facade,impl);}
const renewalWorkflowPath=path.join(root,'renewal-workflow-controller.js');
if(fs.existsSync(renewalWorkflowPath)){
  const renewalWorkflow=[renewalWorkflowPath,'renewal-verification-flow.js','renewal-reinventory-flow.js','paid-checkout-recovery-service.js'].map(p=>fs.existsSync(p)?fs.readFileSync(p,'utf8'):'').join('\n');
  const renewalNames=['createRenewalSkeleton','updateRenewalSkeleton','sendRenewalFeedback','persistRenewalSession','scheduleAutomaticRenewalReplacement','runFastRenewalVerification','runRenewalReinventory','retryRenewalVerification','markRenewalPublishClicked','confirmPublishedRenewal','checkoutRecoveryEvidenceForRenewal','checkoutRecoveryBaselineForRenewal','verifyAbortedPaidCheckoutNoPublication','finalizeVerifiedCheckoutAbort','tryRecoverAbortedPaidCheckout','resumePendingRenewals'];
  for(const name of renewalNames){const impl=block(renewalWorkflow,name);const facade=block(background,name);if(impl&&facade)background=background.replace(facade,impl);else if(impl&&!facade)background += '\n' + impl;}
}

const massWorkflowPath=path.join(root,'mass-renewal-workflow-controller.js');
if(fs.existsSync(massWorkflowPath)){
  const massWorkflow=fs.readFileSync(massWorkflowPath,'utf8');
  const massNames=['findMassRenewalSessionForItem','startNextMassRenewalItem','reconcileMassRenewalBatchSession','markMassRenewalItemSucceeded','startMassRenewalBatch','requestMassRenewalStopAfterCurrent','normalizeMassRenewalBatchTopLevelStatus','getMassRenewalBatchStatus','retryMassRenewalItem','resumeMassRenewalBatch','latestMassRenewalProgressMs','armMassRenewalWatchdog','runMassRenewalWatchdog','massRenewalWatchdogTick'];
  for(const name of massNames){const impl=block(massWorkflow,name);const facade=block(background,name);if(impl&&facade)background=background.replace(facade,impl);else if(impl&&!facade)background += '\n' + impl;}
}
const templateControllerPath=path.join(root,'template-fill-controller.js');
const insertionLockPath=path.join(root,'insertion-lock-service.js');
const templateController=fs.existsSync(templateControllerPath)?fs.readFileSync(templateControllerPath,'utf8'):'';
const insertionLock=fs.existsSync(insertionLockPath)?fs.readFileSync(insertionLockPath,'utf8'):'';
const emergencyResetPath=path.join(root,'src/background/controllers/workflow-emergency-reset-controller.js');
const emergencyReset=fs.existsSync(emergencyResetPath)?fs.readFileSync(emergencyResetPath,'utf8'):'';
const routerPath=path.join(root,'background-message-router.js');
const policyPath=path.join(root,'renewal-policy.js');
const router=fs.existsSync(routerPath)?fs.readFileSync(routerPath,'utf8'):'';
const policy=fs.existsSync(policyPath)?fs.readFileSync(policyPath,'utf8'):'';
module.exports=[policy,router,templateController,insertionLock,emergencyReset,background].filter(Boolean).join('\n');
