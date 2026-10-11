const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
function findUnique(base){
  const skip=new Set(['tests','node_modules','build','.git','.run']); const hits=[];
  function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(ent.name))continue;const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p);else if(ent.name===base)hits.push(p);}}
  walk(root); assert.equal(hits.length,1,`${base} must exist exactly once, got ${hits.length}`); return fs.readFileSync(hits[0],'utf8');
}
const bg=findUnique('background.js'); const router=findUnique('background-message-router.js'); const all=[bg,router];
for(const name of ['diagnostic-export-service.js']){try{all.push(findUnique(name));}catch{}}
const src=all.join('\n'); let n=0; const pass=(label,fn)=>{fn();n++;console.log('PASS '+label)};
pass('diagnostic export builder remains characterized independent of source location',()=>assert.match(src,/async function buildDiagnosticExport\s*\(/));
pass('diagnostic export keeps manual-boundary and service-worker-session scoping',()=>{assert.match(src,/DIAGNOSTIC_BOUNDARY_KEY/);assert.match(src,/manual-reset-session/);assert.match(src,/current-service-worker-session/);});
pass('diagnostic export keeps required diagnostic files',()=>{for(const name of ['summary.txt','diagnostics.jsonl','errors.json','fill-sessions.json','renewal-sessions.json','mass-renewal-batch.json','inventory-summary.json','profiles.json','account-gate-state.json','environment.json'])assert.ok(src.includes(name),name);});
pass('diagnostic export keeps optional bulk and gallery payloads',()=>{assert.ok(src.includes('bulk-run.json'));assert.ok(src.includes('image-gallery-diagnostics.json'));});
pass('diagnostic export keeps current correlation precedence',()=>{for(const token of ['latestOperationId','latestBulkRunId','latestRunId','latestFillId','latestRenewalId','diagnosticOperationScopeIds'])assert.ok(src.includes(token),token);});
pass('diagnostic export keeps extension and message-contract environment evidence',()=>{assert.match(src,/versionName:\s*manifest\.version_name/);assert.match(src,/MessageContractRegistry\.snapshot\(\)/);});
pass('diagnostic export keeps diagnostic redaction boundary',()=>{assert.match(src,/sanitizeDiagnosticValue/);assert.match(src,/Datenschutz:/);});
pass('background retains GET_DIAGNOSTIC_EXPORT request contract',()=>assert.match(router,/["']GET_DIAGNOSTIC_EXPORT["']\s*:\s*Object\.freeze/));
pass('diagnostic reset remains separate from export',()=>{assert.match(bg,/RESET_DIAGNOSTICS/);assert.match(bg,/resetDiagnostics/);});
pass('publish safety remains zero direct submit calls in entry point',()=>{assert.doesNotMatch(bg,/(?:^|[^A-Za-z])(?:requestSubmit|\.submit)\s*\(/m);});
console.log(`${n}/10 PASS v1.23.7 pre-refactor diagnostic-export characterization`);
