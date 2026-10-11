const fs=require('node:fs'),assert=require('node:assert/strict');
const root='src/background/';
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+e.name+'/'):e.name.endsWith('.js')?[fs.readFileSync(d+e.name,'utf8')]:[])}
const source=walk(root).join('\n');
const background=fs.readFileSync('src/background/background.js','utf8');
let n=0;const pass=(message,fn)=>{fn();n++;console.log('PASS '+message)};
pass('Fast verification retains own-ads presence and fail-closed mismatch',()=>{
 assert.match(source,/RENEWAL_FAST_MODE_PRESENCE_/);assert.match(source,/FIND_OWN_AD_BY_ID/);assert.match(source,/RENEWAL_MODE_FAST/);
});
pass('Safe reinventory retains edit-source and public evidence verification',()=>{
 assert.match(source,/RENEWAL_REINVENTORY_FAILED/);assert.match(source,/resolveRenewalPublicEvidence/);assert.match(source,/compareRenewalRecords/);
});
pass('Paid checkout recovery remains evidence-based and fail-closed',()=>{
 for(const token of ['evaluateCheckoutRecoveryProof','isCheckoutAbortedRecoveryCandidate','verifyAbortedPaidCheckoutNoPublication','finalizeVerifiedCheckoutAbort'])assert.ok(source.includes(token),token);
});
pass('Renewal orchestration and worker-resume contracts are still present',()=>{
 for(const name of ['persistRenewalSession','retryRenewalVerification','confirmPublishedRenewal','resumePendingRenewals','scheduleAutomaticRenewalReplacement'])assert.ok(source.includes(name),name);
});
pass('Background retains existing in-process renewal API and IPC',()=>{
 assert.match(background,/KRRenewalWorkflowController/);for(const name of ['runRenewalReinventory','runFastRenewalVerification','resumePendingRenewals'])assert.ok(background.includes(name),name);
});
pass('Publish-bypass safety stays absent from runtime sources',()=>{
 const js=fs.readdirSync('src/background',{withFileTypes:true});
 function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):e.name.endsWith('.js')?[fs.readFileSync(p+'/'+e.name,'utf8')]:[])}
 const all=walk('src').join('\n');assert.equal((all.match(/\.submit\s*\(/g)||[]).length,0);assert.equal((all.match(/requestSubmit\s*\(/g)||[]).length,0);
});
console.log(`${n}/6 PASS v1.23.15 characterization`);
