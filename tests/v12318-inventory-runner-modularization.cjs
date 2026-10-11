'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const modules=[
 ['src/content/inventory-roster-parser.js','KRInventoryRosterParser'],
 ['src/content/inventory-readiness.js','KRInventoryReadiness'],
 ['src/content/inventory-status-overlay.js','KRInventoryStatusOverlay'],
 ['src/content/inventory-delete-operations.js','KRInventoryDeleteOperations'],
 ['src/content/inventory-run-loop.js','KRInventoryRunLoop']
];
let n=0;const pass=s=>{n++;console.log('PASS',s)};
for(const [file] of modules) assert.ok(fs.existsSync(file),`${file} missing`);
pass('five inventory-runner responsibility modules exist');
const runner=fs.readFileSync('src/content/inventory-runner.js','utf8');
for(const [,dep] of modules) assert.match(runner,new RegExp(`KRDeps\\.require\\(['\"]${dep}['\"]\\)`),`${dep} not consumed by facade`);
pass('inventory runner composes all five modules through KRDeps');
for(const fn of ['scanListings','waitForMyAdsReady','renderOverlay','deleteOwnAdById','processListing','runReconciliationLoop']) {
 assert.doesNotMatch(runner,new RegExp(`(?:async\\s+)?function\\s+${fn}\\s*\\(`),`${fn} must move out of facade`);
}
pass('major implementation bodies no longer live in inventory-runner facade');
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
const js=manifest.content_scripts[0].js;const ri=js.indexOf('src/content/inventory-runner.js');
for(const [file] of modules){const i=js.indexOf(file);assert.ok(i>=0&&i<ri,`${file} must load before inventory-runner.js`);}
pass('manifest loads extracted modules before inventory-runner');
const bg=fs.readFileSync('src/background/background.js','utf8');
for(const [file] of modules) assert.ok(bg.includes(file),`${file} missing from dynamic content bootstrap`);
pass('dynamic bootstrap includes all inventory modules');
const combined=[runner,...modules.map(([file])=>fs.readFileSync(file,'utf8'))].join('\n');
assert.doesNotMatch(combined,/\.submit\s*\(/);assert.doesNotMatch(combined,/requestSubmit\s*\(/);
pass('publish submit bypass invariant remains absent');
console.log(`${n}/6 PASS v1.23.18 inventory runner modularization`);
