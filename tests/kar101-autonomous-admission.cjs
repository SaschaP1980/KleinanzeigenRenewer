// KAR-101 characterization and test-first RED for autonomous MV3 workflow ingress.
// A passing simple router test is not a substitute: worker callbacks must be fenced.
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const worker=fs.readFileSync('src/background/background.js','utf8');
const mass=fs.readFileSync('src/background/controllers/mass-renewal-workflow-controller.js','utf8');
const fill=fs.readFileSync('src/background/controllers/template-fill-controller.js','utf8');
let checks=0;
function confirm(condition,msg){ assert.ok(condition,msg);checks++;console.log('PASS KAR101 '+msg); }
confirm(worker.includes('ensureBulkRuntimeRecovery()'), 'service worker boot asynchronously starts bulk runtime recovery');
confirm(worker.includes('bulkRunWatchdogTick()'), 'service worker boot starts the bulk worker watchdog');
confirm(worker.includes('resumePendingRenewals()'), 'service worker boot resumes renewals without router dispatch');
confirm(worker.includes('resumePendingArchiveInsertions()'), 'service worker boot resumes archive insertion');
confirm(worker.includes('maybeDetectTrashTemplatePublishedAd('), 'tabs listener directly starts trash publish detection');
confirm(worker.includes('observeTabLifecycleUpdate(tab)'), 'tabs listener directly invokes lifecycle mutator');
confirm((mass.match(/queueMicrotaskFn\(\(\) => \{ void startNextMassRenewalItem\(/g)||[]).length>=5,
  'mass renewal controller schedules future batches through out-of-router microtasks');
confirm((fill.match(/queueMicrotaskFn\(\(\) => \{ void restartRenewalPhase1Attempt\(/g)||[]).length===2,
  'template fill controller schedules independent phase-one retries');
confirm(worker.includes('const backgroundMessageRouter = BackgroundMessageRouter.create('), 'single message router exists but does not own these autonomous callbacks');

// The expected protection is a background-owned admission boundary, not an
// inert classifier, UI state or static annotation. This RED assertion must
// remain failed until workers have real code that gates autonomous callbacks.
confirm(/(?:function|const) withAutonomous(?:Update)?Admission\s*[=(]/.test(worker),
  'an authoritative autonomous callback admission entrypoint must be wired');
for(const [label,pattern] of [
 ['bulk recovery',/withAutonomous(?:Update)?Admission\(['"]bulk-runtime-recovery['"],\s*\(\)\s*=>\s*ensureBulkRuntimeRecovery\(/],
 ['bulk watchdog',/withAutonomous(?:Update)?Admission\(['"]bulk-watchdog['"],\s*\(\)\s*=>\s*bulkRunWatchdogTick\(/],
 ['renewal resume',/withAutonomous(?:Update)?Admission\(['"]renewal-resume['"],\s*\(\)\s*=>\s*resumePendingRenewals\(/],
 ['archive resume',/withAutonomous(?:Update)?Admission\(['"]archive-resume['"],\s*\(\)\s*=>\s*resumePendingArchiveInsertions\(/],
 ['trash publish event',/withAutonomous(?:Update)?Admission\(['"]trash-publish-detection['"],\s*\(\)\s*=>\s*maybeDetectTrashTemplatePublishedAd\(/],
 ['tab lifecycle event',/withAutonomous(?:Update)?Admission\(['"]tab-lifecycle-update['"],\s*\(\)\s*=>\s*observeTabLifecycleUpdate\(/]
])confirm(pattern.test(worker),'autonomous '+label+' uses the shared MV3 admission gate');
confirm(/function withAutonomousAdmission\(kind, task\)[\s\S]*?return requireUpdateWorkflowFence\(\)\.withAdmission\('AUTONOMOUS:' \+ kind, task\)/.test(worker),
  'autonomous admission delegates to the same persisted fence service as routed background messages');
confirm(/withAutonomousAdmission\('renewal-publish-detection',[\s\S]{0,100}async \(\) =>/.test(worker),
  'renewal post-publish detection IIFE is admitted before starting');
confirm(worker.includes("withAutonomousAdmission('tab-removed'")&&worker.includes("withAutonomousAdmission('tab-activated'"),
  'tab activation/removal callbacks are admitted through the same gate');
console.log('PASS KAR101 '+checks+' tests');
