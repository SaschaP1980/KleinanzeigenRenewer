const fs = require('fs');
const assert = require('assert');
const files = {
  background: fs.readFileSync('background.js','utf8'),
  managed: fs.readFileSync('managed-tab-worker-service.js','utf8'),
  content: fs.readFileSync('content-connection-manager.js','utf8'),
  account: fs.readFileSync('account-probe-service.js','utf8'),
  accountSession: fs.readFileSync('account-session-controller.js','utf8'),
  platform: fs.readFileSync('platform-safety-controller.js','utf8'),
  lifecycle: fs.readFileSync('tab-lifecycle-observer.js','utf8'),
  router: fs.readFileSync('background-message-router.js','utf8'),
};
let pass = 0;
function ok(name, fn){ try { fn(); console.log('PASS '+name); pass++; } catch(e){ console.error('FAIL '+name); throw e; } }
ok('v1.22.12 modules load before background entrypoint', () => {
  const first = files.background.split('\n')[0];
  for (const name of ['managed-tab-worker-service.js','content-connection-manager.js','account-probe-service.js','platform-safety-controller.js','tab-lifecycle-observer.js']) assert(first.includes(name), name);
});
ok('background consumes all v1.22.12 modules through KRDeps', () => {
  for (const dep of ['KRManagedTabWorkerService','KRContentConnectionManager','KRAccountProbeService','KRPlatformSafetyController','KRTabLifecycleObserver']) assert(files.background.includes(`KRDeps.require('${dep}')`), dep);
});
ok('managed worker service owns worker tab registration creation closure and discarded reactivation', () => {
  for (const term of ['createManagedWorkerTab','registerManagedWorkerTab','closeManagedWorkerTab','reactivateDiscardedTabs']) assert(files.managed.includes(term), term);
  assert(files.background.includes("async function createManagedWorkerTab(createOptions, kind, owner = {}) { return requireManagedTabWorkerService().createManagedWorkerTab(createOptions, kind, owner); }"));
});
ok('content connection manager owns readiness bootstrap injection and controlled-close recovery', () => {
  for (const term of ['ensureContentConnection','KR_CONTENT_READY','executeScript','waitForContentBootstrapNavigation','expectedControlledTabCloseEntry']) assert(files.content.includes(term), term);
  assert(files.background.includes('return requireContentConnectionManager().ensureContentConnection(message)'));
});
ok('account probe service owns isolated retry and worker lifecycle', () => {
  for (const term of ['probeLiveKleinanzeigenAccount','ACCOUNT_PROBE_ATTEMPT_UNAVAILABLE','maxAttempts','closeManagedWorkerTab']) assert(files.account.includes(term), term);
});
ok('platform safety controller owns restriction cache gates tab wrappers and coordinated safety stop', () => {
  for (const term of ['readPlatformAccessRestriction','assertPlatformAccessAllowed','createAutomationTab','applyPlatformSafetyStop','activatePlatformAccessRestriction','clearPlatformAccessRestriction']) assert(files.platform.includes(term), term);
  assert(files.platform.includes("PLATFORM_ACCESS_ACTION_BLOCKED"));
});
ok('tab lifecycle observer owns discarded-worker reactivation and removal cleanup', () => {
  for (const term of ['observeTabLifecycleUpdate','TAB_REGISTRY_DISCARDED_WORKER_REACTIVATED','handleActivated','handleRemoved','source-tab-closed']) assert(files.lifecycle.includes(term), term);
});
ok('background remains orchestration facade for extracted services', () => {
  assert(files.background.includes('ManagedTabWorkerService.create({'));
  assert(files.background.includes('ContentConnectionManager.create({'));
  assert(files.accountSession.includes('AccountProbeService.create({'));
  assert(files.background.includes('PlatformSafetyController.create({'));
  assert(files.background.includes('TabLifecycleObserver.create({'));
});
ok('tab lifecycle listeners delegate activation and removal to observer', () => {
  assert(files.background.includes('requireTabLifecycleObserver().handleActivated(tabId)'));
  assert(files.background.includes('requireTabLifecycleObserver().handleRemoved(tabId)'));
});
ok('platform remote action gate remains ahead of request dispatch', () => {
  const gate = files.router.indexOf('await assertPlatformAccessAllowedForRequest(message)');
  const dispatch = files.router.indexOf('return handler(message, sender)');
  assert(gate >= 0 && dispatch > gate);
});
ok('publish safety keeps direct form submit bypasses absent', () => {
  const runtime = [files.background, files.router, files.managed, files.content, files.account, files.accountSession, files.platform, files.lifecycle].join('\n');
  assert.strictEqual((runtime.match(/\.requestSubmit\s*\(/g)||[]).length, 0);
  assert.strictEqual((runtime.match(/\.submit\s*\(/g)||[]).length, 0);
});
console.log(`${pass}/11 PASS v1.22.12 modularization contract`);
