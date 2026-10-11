const fs = require('node:fs');
const assert = require('node:assert/strict');
const bg = fs.readFileSync('background.js', 'utf8');
const tabLoad = fs.readFileSync('tab-load-coordinator.js', 'utf8');
const lifecycle = fs.readFileSync('tab-lifecycle-observer.js', 'utf8');
let n = 0; const pass = label => { n += 1; console.log(`PASS ${n}: ${label}`); };

assert.match(bg, /const TAB_LOAD_SAFETY_POLL_MS\s*=\s*2000\s*;/);
pass('tab readiness keeps a slow safety/recovery poll');
assert.match(tabLoad, /const waiters\s*=\s*new Map\(\)/);
assert.match(tabLoad, /function notify\(/);
assert.match(tabLoad, /function waitForSignal\(/);
pass('tab readiness has an event-driven waiter registry inside extracted coordinator');

assert.doesNotMatch(tabLoad, /delay\(TAB_LOAD_POLL_MS\)/);
assert.match(tabLoad, /async function waitForComplete/);
assert.match(tabLoad, /waitForSignal\(/);
assert.match(tabLoad, /tab\?\.status\s*===\s*['"]complete['"]/);
assert.match(bg, /async function waitForTabComplete[\s\S]{0,240}requireTabLoadCoordinator\(\)\.waitForComplete/);
pass('waitForTabComplete is event-driven through extracted coordinator while preserving status=complete semantics');

const updated = bg.indexOf('chrome.tabs?.onUpdated?.addListener');
const removed = bg.indexOf('chrome.tabs?.onRemoved?.addListener');
assert.ok(updated >= 0 && removed >= 0);
assert.match(bg.slice(updated, updated + 900), /notifyTabLoadWaiters\(/);
assert.match(lifecycle, /async function handleRemoved[\s\S]*notifyTabLoadWaiters\(/);
pass('tab update and removal events wake readiness waiters');
assert.match(bg, /chrome\.storage\?\.onChanged\?\.addListener[\s\S]*PLATFORM_ACCESS_RESTRICTION_KEY[\s\S]*notifyAllTabLoadWaiters/);
pass('platform safety-stop changes wake readiness waits immediately');
console.log(`${n}/5 PASS`);
