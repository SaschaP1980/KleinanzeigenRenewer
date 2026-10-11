const fs = require('node:fs');
const assert = require('node:assert/strict');
const bg = require('./v12212-source-surface.cjs');
let n = 0; const pass = label => { n += 1; console.log(`PASS ${label}`); };

assert.match(bg, /async function createManagedWorkerTab\([\s\S]*?url:\s*'about:blank'[\s\S]*?active:\s*false[\s\S]*?registerManagedWorkerTab[\s\S]*?updateAutomationTab/);
assert.match(bg, /managed-worker-create-failed/);
pass('managed workers register from about:blank before target navigation and clean up on failure');

assert.match(bg, /async function reactivateDiscardedTabs[\s\S]*?not-kleinanzeigen[\s\S]*?already-active[\s\S]*?reloadTabOrThrow/);
pass('discarded-tab reactivation remains Kleinanzeigen-scoped and explicit');

assert.match(bg, /async function ensureContentConnection[\s\S]*?KR_CONTENT_READY[\s\S]*?CONTENT_SCRIPT_BOOTSTRAP_DEFERRED_LOADING[\s\S]*?chrome\.scripting\.executeScript[\s\S]*?CONTENT_SCRIPT_BOOTSTRAP_SUCCEEDED/);
assert.match(bg, /modules\.images\s*&&\s*modules\.form\s*&&\s*modules\.templateFill\s*&&\s*modules\.inventoryRun/);
pass('content connection retains readiness handshake navigation deferral and bounded bootstrap');

assert.match(bg, /KR_TAB_EXPECTED_CLOSED/);
assert.match(bg, /CONTENT_SCRIPT_BOOTSTRAP_EXPECTED_TAB_CLOSE/);
pass('content bootstrap preserves expected controlled-close classification');

assert.match(bg, /async function probeLiveKleinanzeigenAccount[\s\S]*?maxAttempts[\s\S]*?createManagedWorkerTab[\s\S]*?waitForExpectedTabComplete[\s\S]*?PAGE_STATUS[\s\S]*?MY_ADS_STATUS[\s\S]*?finally\s*\{[\s\S]*?closeManagedWorkerTab/);
pass('account probe remains retry-bounded and always closes its managed worker');

assert.match(bg, /reason:\s*'login-redirect'/);
assert.match(bg, /transient:\s*true/);
assert.match(bg, /reason:\s*'confirmed'/);
pass('account probe preserves confirmed definitive-logout and transient outcomes');

assert.match(bg, /const PLATFORM_REMOTE_ACTION_TYPES = new Set\(\[[\s\S]*?'START_MASS_RENEWAL_BATCH'[\s\S]*?'START_ARCHIVE_INSERTION'/);
assert.match(bg, /async function assertPlatformAccessAllowedForRequest/);
pass('platform safety keeps remote-action request gate');

assert.match(bg, /async function applyPlatformSafetyStop[\s\S]*?platform-access-restricted[\s\S]*?closeRegistryTabs[\s\S]*?KR_PLATFORM_SAFETY_STOP/);
pass('platform restriction still terminalizes workflows closes workers and broadcasts stop to tabs');

assert.match(bg, /chrome\.tabs\?\.onUpdated\?\.addListener[\s\S]*?notifyTabLoadWaiters[\s\S]*?observeTabLifecycleUpdate/);
assert.match(bg, /chrome\.tabs\?\.onRemoved\?\.addListener[\s\S]*?markGone[\s\S]*?source-tab-closed/);
pass('tab lifecycle listeners preserve load notification registry observation and removal cleanup');

assert.doesNotMatch(bg, /requestSubmit\s*\(|\.submit\s*\(/);
pass('target refactor scope contains no direct publish submit bypass');

console.log(`${n}/10 PASS v1.22.12 pre-refactor characterization`);
