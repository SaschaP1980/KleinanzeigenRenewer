// KAR-113: source-anchored RED-first guard of six detached renewal launches.
// These checks preserve KAR-101's one central asynchronous admission boundary.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const controller=fs.readFileSync('src/background/controllers/renewal-workflow-controller.js','utf8');
const bg=fs.readFileSync('src/background/background.js','utf8');
let n=0;
function ok(value,why){assert.ok(value,why);++n;console.log('PASS KAR113 '+why);}
function times(s,phrase){return s.split(phrase).length-1;}
ok(controller.includes("const required = {"),"controller retains strict injected dependency contract");
ok(/withAutonomousAdmission,/.test(controller),"renewal controller receives fail-closed admission dependency");
ok(/withAutonomousAdmission,/.test(controller.slice(controller.indexOf('const required = {'),controller.indexOf('for (const [name, value]'))),
  "autonomous admission dependency is required, not optional");
ok(bg.includes("renewalWorkflowController = RenewalWorkflowController.create({"),"real background constructs renewal controller");
ok(/withAutonomousAdmission,/.test(bg.slice(bg.indexOf("renewalWorkflowController = RenewalWorkflowController.create({"),bg.indexOf("return renewalWorkflowController;"))),
  "worker injects the shared admission function into renewal controller");
ok(/'renewal-detached-verify': \['renewal', 'insertionLock'\]/.test(bg),
  "detached verification is mapped to affected persisted owners");
ok(/'renewal-detached-retry': \['renewal', 'insertionLock'\]/.test(bg),
  "detached retries are mapped to affected persisted owners");
ok(times(controller,"withAutonomousAdmission('renewal-detached-verify', () => runFastRenewalVerification(")===2,
  "both publish and resumed Fast verification are admitted");
ok(times(controller,"withAutonomousAdmission('renewal-detached-verify', () => runRenewalReinventory(")===2,
  "both publish and resumed Safe reinventory are admitted");
ok(times(controller,"withAutonomousAdmission('renewal-detached-retry', () => retryRenewalVerification(")===2,
  "both persisted waiting/online retries are admitted");
for(const [label,re] of [['Fast',/\bvoid\s+runFastRenewalVerification\(/],
  ['Safe',/\bvoid\s+runRenewalReinventory\(/],
  ['Retry',/\bvoid\s+retryRenewalVerification\(/]]) {
  ok(!re.test(controller),label+" can never start directly as untracked detached work");
}
ok(bg.includes("return requireUpdateWorkflowFence().withAdmission('AUTONOMOUS:' + kind, task)"),
  "detached paths use the same KAR-99 update-fence admission, not a second mutex");
ok(bg.includes("task = () => requirePersistedOwnerObserver().track(names, admittedTask)"),
  "admitted detached tasks are counted for their actual asynchronous lifetime");
ok(!bg.includes("getOwnerSnapshot: () => requirePersistedOwnerObserver()"),
  "source tracking does not grant false all-idle permission");
console.log('PASS KAR113 total '+n);
