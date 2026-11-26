'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const bg=fs.readFileSync('src/background/background.js','utf8');
function declaration(name){
 const re=new RegExp('(?:^|\\n)((?:async )?function '+name+'\\()','g');
 const found=[...bg.matchAll(re)];assert.equal(found.length,1,'single historical owner: '+name);
 const start=found[0].index+found[0][0].indexOf(found[0][1]),end=bg.indexOf('\n}',start);assert.ok(end>start,name);
 return bg.slice(start,end+2);
}
function load(ctx,names){vm.runInNewContext(names.map(declaration).join('\n'),ctx);}

test('actual historical URL owner, unchanged KAR-175 assertion body',()=>{
 const service={URL};load(service,['singleInventorySourceFromUrl','detectPublishedAdFromKnownUrl','publishedAdCandidateFromUrl']);
const edit=service.singleInventorySourceFromUrl('https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=123');
assert.equal(edit?.adId,'123');assert.equal(edit?.mode,'edit');
const publicUrl='https://www.kleinanzeigen.de/s-anzeige/demo/456-12-34';
const publicEntry=service.singleInventorySourceFromUrl(publicUrl);
assert.equal(publicEntry?.adId,'456');assert.equal(publicEntry?.mode,'public');
assert.equal(service.singleInventorySourceFromUrl('https://evil.invalid/s-anzeige/demo/456-12-34'),null);
assert.equal(service.singleInventorySourceFromUrl('http://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=123'),null);
const published=service.detectPublishedAdFromKnownUrl(publicUrl,'123');
assert.equal(published?.adId,'456');assert.equal(published?.kind,'public');assert.equal(published?.detectionSource,'tab-url');
assert.equal(service.detectPublishedAdFromKnownUrl(publicUrl,'456'),null,'same source cannot be new ad');
assert.equal(service.detectPublishedAdFromKnownUrl('https://evil.invalid/s-anzeige/demo/456-12-34'),null);
assert.equal(service.detectPublishedAdFromKnownUrl('not-url'),null);
const safeCandidate=service.publishedAdCandidateFromUrl(publicUrl,'123');
assert.equal(safeCandidate?.adId,'456');
assert.equal(safeCandidate?.kind,'public');
assert.equal(safeCandidate?.url,publicUrl);
assert.equal(service.publishedAdCandidateFromUrl(publicUrl,'456'),null);
assert.equal(service.publishedAdCandidateFromUrl('http://www.kleinanzeigen.de/s-anzeige/demo/456-12-34','123'),null);
assert.equal(service.publishedAdCandidateFromUrl('https://evil.invalid/s-anzeige/demo/456-12-34','123'),null);

});
test('actual historical diagnostic correlation early return, one read and safe storage failure',async()=>{
 const data={bulkInventoryRun:{bulkRunId:'bulkX',workerTabId:77},templateFillSessions:{f1:{fillId:'f1',renewalId:'r1',targetTabId:77}},renewalSessionsStore:{r1:{renewalId:'r1',fillId:'f1',massBatchId:'batch1'}},massRenewalBatch:{batchId:'batch1',items:[{renewalId:'r1',operationId:'op1'}]},archives:{}};
 const events=[];let deny=false;
 const ctx={chrome:{storage:{local:{get:async keys=>{events.push(Array.from(keys));if(deny)throw Error('fixture read failure');return data;}}}},RENEWAL_SESSIONS_KEY:'renewalSessionsStore',MASS_RENEWAL_BATCH_KEY:'massRenewalBatch',ARCHIVE_INSERTION_SESSIONS_KEY:'archives'};
 const fieldSource=bg.match(/const CORRELATION_CONTEXT_FIELDS = Object\.freeze\(\[[\s\S]*?\]\);/);assert.ok(fieldSource);
 vm.runInNewContext(fieldSource[0],ctx);load(ctx,['correlationContext','correlationContextFromBindings','resolveClientDiagnosticCorrelation']);
 const early=await ctx.resolveClientDiagnosticCorrelation({context:{operationId:'known'}},{tab:{id:77}});assert.equal(early.operationId,'known');assert.equal(events.length,0);
 const resolved=await ctx.resolveClientDiagnosticCorrelation({context:{fillId:'f1'}},{tab:{id:77}});assert.equal(resolved.renewalId,'r1');assert.equal(resolved.massBatchId,'batch1');assert.equal(resolved.bulkRunId,'bulkX');assert.equal(resolved.operationId,'op1');assert.equal(events.length,1);
 deny=true;const safe=await ctx.resolveClientDiagnosticCorrelation({context:{fillId:'f1'}},{tab:{id:77}});assert.equal(safe.fillId,'f1');assert.equal(safe.renewalId,undefined);assert.equal(events.length,2);
});
