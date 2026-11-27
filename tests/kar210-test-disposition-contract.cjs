'use strict';
// KAR-210: omitted suites remain evidence, never successful product executions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root=path.resolve(__dirname,'..');
const {validateDispositions}=require('./kar210-test-disposition.cjs');
const LEDGER='docs/maintenance/KAR210_ACTIVE_TEST_DISPOSITIONS.json';
const {isS09Version,S09_SCOPE,isS04Version,isS06Version,S06_SCOPE,isS07Version}=require('./current-patch-policy.cjs');
const s07=isS07Version(JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8')).version);
const s06=isS06Version(JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8')).version);
const s04=isS04Version(JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8')).version);
const S04_LEDGER='docs/maintenance/KAR217_UPDATER_TEST_DISPOSITIONS.json';
const s09=isS09Version(JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8')).version);
const OWNERS=["package.json","scripts/build.sh","scripts/coverage-gate.sh",".github/workflows/kar-work-pr.yml",".github/workflows/kar-ci.yml",".github/workflows/kar-release.yml"];
for(const owner of OWNERS) for(const test of ["tests/kar148-article-type.cjs","tests/kar150-ui-preference.cjs","tests/kar164-trash-sort.cjs","tests/kar165-trash-retention-warning.cjs","tests/kar147-diagnostic-occupancy.cjs"]) {
  if(s09&&S09_SCOPE.reactivatedTests.includes(test)) continue;
  assert.ok(!fs.readFileSync(path.join(root,owner),'utf8').includes(test),'Later feature still active: '+test+' in '+owner);
}
for(const owner of OWNERS) for(const test of ["tests/kar201-legacy-options.cjs","tests/kar201-session-evidence.cjs","tests/kar201-native-display-only.cjs","tests/kar201-partial-archive-prefill.cjs","tests/kar201-manual-standalone.cjs"]) assert.ok(!fs.readFileSync(path.join(root,owner),'utf8').includes(test),'KAR-201 later feature still active: '+test+' in '+owner);
const data=JSON.parse(fs.readFileSync(path.join(root,LEDGER),'utf8'));
const inactive=validateDispositions(root);
assert.equal(inactive.size,(s09?87:91)+(s04?12:0)-(s06?S06_SCOPE.reactivatedTests.length:0)-(s07?1:0));
if(s06)for(const test of S06_SCOPE.reactivatedTests)assert.ok(!inactive.has(test));
if(s09) for(const test of S09_SCOPE.reactivatedTests) assert.ok(!inactive.has(test));
const read=p=>fs.readFileSync(path.join(root,p));
for(const owner of OWNERS) for(const test of inactive.keys())
  assert.ok(!read(owner).toString().replace(/\\/g,'/').includes(test),'Inactive path in active owner');
const exactZip=readOriginal('tests/kar191-diagnostic-zip-integrity.cjs');
assert.equal(readOriginal('tests/kar210-diagnostic-zip-integrity.cjs'),exactZip.slice(0,exactZip.indexOf('\nfunction element()')),'Independent ZIP integrity witness must remain exact');
const exactReset=readOriginal('tests/kar193-diagnostic-reset.cjs');
assert.equal(readOriginal('tests/kar210-diagnostic-reset-unknown.cjs'),exactReset.slice(0,exactReset.indexOf("test('KAR-193 reset retries"))+exactReset.slice(exactReset.indexOf("test('KAR-193 a response without"),exactReset.indexOf("test('KAR-193 P8 finalization")),'Independent reset RED witnesses must remain exact');
function readOriginal(p){return fs.readFileSync(path.join(root,p),'utf8');}
const exactUrl=readOriginal('tests/kar175-listing-url-evidence.cjs');
assert.ok(readOriginal('tests/kar210-kar175-correlation-url-baseline.cjs').includes(exactUrl.slice(exactUrl.indexOf('const edit=service.singleInventorySourceFromUrl'),exactUrl.indexOf('console.log('))),'Original pure URL assertion body must remain exact');
const exactCleanup=readOriginal('tests/kar134-runtime-cleanup.cjs');
const scopeSource=readOriginal('tests/kar210-kar175-budget-schema-baseline.cjs');
assert.ok(scopeSource.includes(exactCleanup.slice(exactCleanup.indexOf('for (const label of ['),exactCleanup.indexOf('assert.match(controller, /Boolean'))),'Independent cleanup assertions changed');
const exactPreflight=readOriginal('tests/kar134-schema-preflight.cjs');
const legacyStart=exactPreflight.indexOf('await assert.rejects(service.getTemplateFillSession({tab:{id:72}})');
assert.ok(legacyStart>=0&&readOriginal('tests/kar210-kar134-legacy-session-witness.cjs').includes(exactPreflight.slice(legacyStart,exactPreflight.indexOf('\n  });',legacyStart))),'Persisted legacy session denial assertion lost');
const cp35Witness=readOriginal('tests/kar210-cp35-owner-product-witness.cjs');
const original101=readOriginal('tests/kar101-autonomous-admission.cjs');
const original107=readOriginal('tests/kar107-autonomous-owner-coverage.cjs');
assert.ok(cp35Witness.includes(original101.slice(original101.indexOf("confirm(worker.includes('ensureBulkRuntimeRecovery()')"),original101.indexOf("confirm((mass.match"))),'original boot callback assertions retained');
assert.ok(cp35Witness.includes(original107.slice(original107.indexOf("  ok(lifecycle.includes('persistRenewalSession(renewal)')"),original107.indexOf("  const local="))),'original lifecycle and publish checks retained');
const cp36Witness=readOriginal('tests/kar210-cp36-phase4-product-witness.cjs');
const original113=readOriginal('tests/kar113-renewal-detached-admission.cjs');
for(const prefix of ['ok(controller.includes("const required','ok(bg.includes("renewalWorkflowController =']){const line=original113.split('\n').find(l=>l.startsWith(prefix));assert.ok(line&&cp36Witness.includes(line),'exact KAR113 product source check retained');}
const cp38Witness=readOriginal('tests/kar210-cp38-ingress-product-witness.cjs');
const ingress=readOriginal('tests/kar99-p6-ingress-closure.cjs');
for(const [start,end] of [['const ownDelete =','const verify ='],['const verify =','const archiveConfirm ='],['const contentDir =','// Execute the actual']])assert.ok(cp38Witness.includes(ingress.slice(ingress.indexOf(start),ingress.indexOf(end))),'original ingress source assertions retained');
const owners=readOriginal('tests/kar99-additional-owner-producers.cjs');
assert.ok(cp38Witness.includes(owners.slice(owners.indexOf("  const vm=require('node:vm');",owners.indexOf('// E3B:')),owners.indexOf('  const hints=ids=>'))),'exact PAGE_STATUS product fixture retained');
const invocation=spawnSync(process.execPath,[path.join(root,'tests/kar210-test-disposition.cjs'),data.entries[0].test],{cwd:root,encoding:'utf8'});
assert.notEqual(invocation.status,0,'Old per-test skip interface must be gone');
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'kar210-suite-'));
const copy=p=>{const dst=path.join(fixture,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(path.join(root,p),dst);};
const put=(p,v)=>{const dst=path.join(fixture,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,typeof v==='string'?v:JSON.stringify(v));};
let negatives=0;
const deny=()=>{assert.throws(()=>validateDispositions(fixture));negatives++;};
try {
  for(const p of new Set([...OWNERS,'manifest.json','package-lock.json','release/release-spec.json','scripts/product_version.py','scripts/package.py','coverage/safety-critical-public-apis.json','docs/maintenance/KAR210_BASELINE_RESTORE_LEDGER.json','docs/maintenance/KAR210_BASELINE_TARGET.json',LEDGER,...(s04?[S04_LEDGER]:[]),...(s06?['docs/maintenance/KAR222_SUCCESSOR_SCOPE.json',...S06_SCOPE.reactivatedTests,...S06_SCOPE.partialTests.map(e=>e.path)]:[]),...inactive.keys(),...data.deferredWitnesses.map(e=>e.test),...data.entries.map(e=>e.test),...data.entries.flatMap(e=>e.retained),...data.entries.filter(e=>e.featureAbsence||(s09&&S09_SCOPE.reactivatedTests.includes(e.test))).map(e=>e.module)])) copy(p);
  assert.equal(validateDispositions(fixture).size,inactive.size);
  if(s04){const l=JSON.parse(read(S04_LEDGER));l.entries.pop();put(S04_LEDGER,l);deny();copy(S04_LEDGER);}
  const entry=data.entries[0];
  put(entry.module,'// unexpectedly restored');deny();fs.unlinkSync(path.join(fixture,entry.module));
  put(entry.test,'// altered historical evidence');deny();copy(entry.test);
  const duplicate=structuredClone(data);duplicate.entries.push({...entry});put(LEDGER,duplicate);deny();copy(LEDGER);
  const missing=structuredClone(data);missing.entries.pop();put(LEDGER,missing);deny();copy(LEDGER);
  const wrong=structuredClone(data);wrong.entries[0].module='src/shared/runtime-deps.js';put(LEDGER,wrong);deny();copy(LEDGER);
  const safety=JSON.parse(read('coverage/safety-critical-public-apis.json'));safety.apis[0].tests.push(entry.test);
  put('coverage/safety-critical-public-apis.json',safety);deny();copy('coverage/safety-critical-public-apis.json');
  put('scripts/package.py',read('scripts/package.py').toString().replace('runtime=[','runtime=[\''+entry.module+'\','));deny();copy('scripts/package.py');
  const bad=JSON.parse(read('package.json'));bad.scripts.test+=' && node '+entry.test;
  put('package.json',bad);deny();copy('package.json');
  const wrap=JSON.parse(read('package.json'));wrap.scripts.test+=' && node tests/kar210-test-disposition.cjs '+entry.test;
  put('package.json',wrap);deny();copy('package.json');
  put('scripts/build.sh',read('scripts/build.sh').toString()+'\nnode '+entry.test+'\n');deny();copy('scripts/build.sh');
  const lost=JSON.parse(read('package.json'));lost.scripts.test=lost.scripts.test.replace('node '+entry.retained[0]+' && ','');
  put('package.json',lost);deny();copy('package.json');
  const witness=data.deferredWitnesses[0];put(witness.test,'// lost product witness');deny();copy(witness.test);
  const feature=data.entries.find(e=>e.featureAbsence);
  put(feature.module,read(feature.module).toString()+'\n'+feature.featureAbsence.marker);deny();copy(feature.module);
  const tampered=structuredClone(data);tampered.entries.find(e=>e.featureAbsence).featureAbsence.marker='unreviewed';
  put(LEDGER,tampered);deny();copy(LEDGER);
  const reset=structuredClone(data);reset.scopeResetDeferred.pop();put(LEDGER,reset);deny();copy(LEDGER);
  const post=data.scopeResetDeferred[0];put(post.test,'// altered later RED evidence');deny();copy(post.test);
  const manifest=JSON.parse(read('manifest.json'));manifest.version=manifest.version==='2.0.0.1'?'2.0.0.2':'2.0.0.1';put('manifest.json',manifest);deny();copy('manifest.json');
  if(s09) {
    const active=S09_SCOPE.reactivatedTests[0];
    const pkg=JSON.parse(read('package.json'));pkg.scripts.test=pkg.scripts.test.replace('node '+active+' && ','');
    put('package.json',pkg);deny();copy('package.json');
    const restored=data.entries.find(e=>e.test===active);
    put(restored.module,'// altered exact successor module');deny();copy(restored.module);
  }
  if(s06){
    const active=S06_SCOPE.reactivatedTests[0],pkg=JSON.parse(read('package.json'));
    pkg.scripts.test=pkg.scripts.test.replace('node '+active+' && ','');
    put('package.json',pkg);deny();copy('package.json');
    const scopePath='docs/maintenance/KAR222_SUCCESSOR_SCOPE.json',wrong=JSON.parse(read(scopePath));
    wrong.partialTests[0].deferred.pop();put(scopePath,wrong);deny();copy(scopePath);
    put(S06_SCOPE.partialTests[1].path,'// lost deferred evidence');deny();copy(S06_SCOPE.partialTests[1].path);
  }
  assert.equal(validateDispositions(fixture).size,inactive.size);
} finally {fs.rmSync(fixture,{recursive:true,force:true});}
console.log('PASS KAR-210 active suite separation: '+negatives+' fail-closed negatives, original evidence and inactive product witness preserved');
