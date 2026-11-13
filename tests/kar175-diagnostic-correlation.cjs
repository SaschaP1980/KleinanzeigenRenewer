'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/background/services/diagnostic-correlation-service.js','utf8');
const bg=fs.readFileSync('src/background/background.js','utf8');
let owner=null;vm.runInNewContext(src,{KRDeps:{register(n,x){assert.equal(n,'KRDiagnosticCorrelationService');owner=x;}}});
assert.throws(()=>owner.create({}),/requires correlation/);
assert.match(bg,/requireDiagnosticCorrelationService\(\)\.resolveClientDiagnosticCorrelation\(message, sender\)/);
const events=[];const data={
 bulkInventoryRun:{bulkRunId:'bulkX',workerTabId:77},
 templateFillSessions:{f1:{fillId:'f1',renewalId:'r1',targetTabId:77}},
 renewalSessionsStore:{r1:{renewalId:'r1',fillId:'f1',massBatchId:'batch1'}},
 massRenewalBatch:{batchId:'batch1',items:[{renewalId:'r1',operationId:'op1'}]},
 archives:{}
};
const svc=owner.create({correlationContext:(...objects)=>Object.assign({},...objects.filter(x=>x&&typeof x==='object')),
  storageLocal:{get:async keys=>{events.push(keys);return data;}},
  RENEWAL_SESSIONS_KEY:'renewalSessionsStore',MASS_RENEWAL_BATCH_KEY:'massRenewalBatch',
  ARCHIVE_INSERTION_SESSIONS_KEY:'archives'});
assert.deepEqual(Object.keys(svc),['resolveClientDiagnosticCorrelation']);
(async()=>{
 const early=await svc.resolveClientDiagnosticCorrelation({context:{operationId:'known'}},{tab:{id:77}});
 assert.equal(early.operationId,'known');assert.equal(events.length,0,'known correlation requires no storage read');
 const resolved=await svc.resolveClientDiagnosticCorrelation({context:{fillId:'f1'}},{tab:{id:77}});
 assert.equal(resolved.renewalId,'r1');
 assert.equal(resolved.massBatchId,'batch1');
 assert.equal(events.length,1);
 console.log('PASS KAR-175 Wave 6 diagnostics: no-fetch early return and read-only fill/renewal/bulk/mass correlation');
})().catch(e=>{console.error(e);process.exitCode=1});
