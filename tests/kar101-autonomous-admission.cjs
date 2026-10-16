// KAR-101 characterization and test-first RED for autonomous MV3 workflow ingress.
// A passing simple router test is not a substitute: worker callbacks must be fenced.
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const worker=fs.readFileSync('src/background/background.js','utf8');
const mass=fs.readFileSync('src/background/controllers/mass-renewal-workflow-controller.js','utf8');
const fill=fs.readFileSync('src/background/controllers/template-fill-controller.js','utf8');
let checks=0;
function confirm(condition,msg){ assert.ok(condition,msg);checks++;console.log('PASS KAR101 '+msg); }
confirm(worker.includes('void ensureBulkRuntimeRecovery().catch'), 'service worker boot asynchronously starts bulk runtime recovery');
confirm(worker.includes('void bulkRunWatchdogTick().catch'), 'service worker boot starts the bulk worker watchdog');
confirm(worker.includes('void resumePendingRenewals().finally('), 'service worker boot resumes renewals without router dispatch');
confirm(worker.includes('void resumePendingArchiveInsertions().catch'), 'service worker boot resumes archive insertion');
confirm(worker.includes('void maybeDetectTrashTemplatePublishedAd('), 'tabs listener directly starts trash publish detection');
confirm(worker.includes('void observeTabLifecycleUpdate(tab).catch'), 'tabs listener directly invokes lifecycle mutator');
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
console.log('PASS KAR101 '+checks+' tests');
