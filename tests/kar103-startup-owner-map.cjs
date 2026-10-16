// KAR-103 bounded RED-first contract: autonomous worker maintenance must enter
// the same persisted update admission gate. This file intentionally does not
// authorize the update lease or turn source candidates into confirmed owners.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const worker = fs.readFileSync('src/background/background.js','utf8');
const ownerPolicy = require('../lib/update-idle-policy.js');
const boot = worker.slice(worker.indexOf("chrome.action?.onClicked?.addListener("));
let passed = 0;
function test(condition, description) {
  assert.ok(condition, description);
  passed++;
  console.log('PASS KAR103 ' + description);
}
test(boot.length > 700, 'find actual worker bootstrap/event site');
test(ownerPolicy.requiredOwners.length === 15, 'strict KAR-97 owner surface retained');
test(!/void\s+(?:reconcileTabRegistry|purgeExpiredTrash)\s*\(/.test(boot),
  'startup reconciliation and trash retention never bypass autonomous admission');
for (const [name, action, expected] of [
  ['tab-registry-boot', 'reconcileTabRegistry', 1],
  ['tab-registry-startup', 'reconcileTabRegistry', 1],
  ['trash-purge-boot', 'purgeExpiredTrash', 1],
  ['trash-purge-startup', 'purgeExpiredTrash', 1],
  ['trash-purge-installed', 'purgeExpiredTrash', 1]
]) {
  const re = new RegExp("withAutonomousAdmission\\('"+name+"',\\s*\\(\\)\\s*=>\\s*"+action+"\\(\\)\\)", 'g');
  test([...boot.matchAll(re)].length === expected, name + ' is admitted through shared fence exactly once');
}
test(boot.includes("chrome.runtime.onStartup?.addListener(() => { void withAutonomousAdmission('tab-registry-startup'"),
  'onStartup tab registry listener is guarded at callback entry');
test(boot.includes("chrome.runtime.onStartup?.addListener(() => { void withAutonomousAdmission('trash-purge-startup'"),
  'onStartup trash-purge listener is guarded at callback entry');
test(boot.includes("chrome.runtime.onInstalled?.addListener(() => { void withAutonomousAdmission('trash-purge-installed'"),
  'onInstalled trash-purge listener is guarded at callback entry');
test(worker.includes("return requireUpdateWorkflowFence().withAdmission('AUTONOMOUS:' + kind, task)"),
  'worker maintenance delegates to existing shared persistent fence');
// The ledger documents candidates and unknowns, not a forged all-idle snapshot.
const ledger = fs.readFileSync('docs/KAR103_OWNER_AUTHORITY_MAP.md','utf8');
const rows = ledger.split('\n').filter(l => /^\| `[A-Za-z]+` \|/.test(l));
const names = rows.map(line => line.match(/^\| `([A-Za-z]+)` \|/)[1]);
test(new Set(names).size === 15 && names.length === 15,
  'exactly fifteen unique source-grounded owner rows');
test(ownerPolicy.requiredOwners.every(name => names.includes(name)),
  'all KAR97 owners explicitly represented without extras');
for (const row of rows) {
  const pieces = row.split('|').map(x => x.trim());
  test(pieces.includes('UNVERIFIED'), 'unverified authority is explicit for '+pieces[1]);
}
test(/reserve[^\n]*unavailable|reserve remains unavailable/i.test(ledger),
  'owner map cannot be construed as a successful production update lease');
console.log('PASS KAR103 total '+passed);
