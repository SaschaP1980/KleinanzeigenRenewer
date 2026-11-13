'use strict';
// KAR-175 explicit source budget guard; independent of mutable GitHub metadata.
// These are issue acceptance budgets, NOT a claimed external editor/tool ceiling.
const fs=require('node:fs'),assert=require('node:assert/strict');
const path='src/background/background.js';
const src=fs.readFileSync(path,'utf8');
const chars=src.length,bytes=Buffer.byteLength(src,'utf8'),lines=src.split('\n').length;
const issueInitial={chars:212282,lines:3586}, refreshedMain={chars:213227,lines:3586};
const maxIssueChars=Math.floor(issueInitial.chars*0.70);
const maxRefreshedChars=Math.floor(refreshedMain.chars*0.70);
assert.ok(chars<=maxIssueChars,
  `KAR-175 regression: ${chars} > initial 30% budget ${maxIssueChars}; extract cohesive ownership instead of minifying`);
assert.ok(chars<=maxRefreshedChars,
  `KAR-175 regression: ${chars} > refreshed main budget ${maxRefreshedChars}`);
assert.ok(lines<2500,`KAR-175 background entrypoint has ${lines} lines (requires <2500)`);
assert.ok(bytes<150000,`KAR-175 background entrypoint has ${bytes} UTF-8 bytes (preferred <150000)`);
const modules=[
 'src/background/services/inventory-capture-service.js',
 'src/background/services/inventory-refresh-service.js',
 'src/background/services/renewal-public-evidence-coordinator.js',
 'src/background/services/renewal-phase1-retry-service.js',
 'src/background/services/publish-intent-authorization-service.js',
 'src/background/controllers/manual-listing-navigation-controller.js',
 'src/background/services/diagnostic-correlation-service.js',
 'src/background/services/listing-url-evidence-service.js',
 'src/background/services/trash-template-publish-detection-service.js'
];
const pack=fs.readFileSync('scripts/package.py','utf8');
for(const file of modules){
 assert.ok(fs.existsSync(file),`KAR-175 module missing: ${file}`);
 const text=fs.readFileSync(file,'utf8');
 assert.ok(text.length<30000,`KAR-175 module became a new unreviewed monolith: ${file} (${text.length} chars)`);
 assert.ok(pack.includes("'"+file+"'"),`KAR-175 runtime package missing module ${file}`);
}
console.log(`PASS KAR-175 entrypoint budget: ${chars} characters, ${bytes} UTF-8 bytes, ${lines} lines; ${((issueInitial.chars-chars)/issueInitial.chars*100).toFixed(3)}% below initial issue baseline; ${modules.length} bounded cohesive owners`);
