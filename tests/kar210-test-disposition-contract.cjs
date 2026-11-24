'use strict';
// KAR-210: explicit test disposition is not a product PASS or a coverage waiver.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const { resolveDisposition } = require('./kar210-test-disposition.cjs');
const ledger = JSON.parse(fs.readFileSync(path.join(root, 'docs/maintenance/KAR210_ACTIVE_TEST_DISPOSITIONS.json'), 'utf8'));
const names = ['tests/kar97-update-idle-policy.cjs', 'tests/kar134-schema-core.cjs'];
assert.deepEqual(ledger.entries.map(e=>e.test).sort(), names.slice().sort());
const read = p => fs.readFileSync(path.join(root,p));
const hash = b => crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
for (const e of ledger.entries) {
  assert.equal(hash(read(e.test)),e.blob);
  assert.equal(resolveDisposition(root,e.test).status,e.status);
  const run = spawnSync(process.execPath,[path.join(root,'tests/kar210-test-disposition.cjs'),e.test],{cwd:root,encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  assert.match(run.stdout,/NOT_EXECUTED/);
  assert.doesNotMatch(run.stdout,/\bPASS\b/);
}
const fixture = fs.mkdtempSync(path.join(os.tmpdir(),'kar210-disposition-'));
const copy = p => { const dst=path.join(fixture,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(path.join(root,p),dst); };
const put = (p,v) => {const dst=path.join(fixture,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,typeof v==='string'?v:JSON.stringify(v));};
const deny = (fn) => assert.throws(fn);
try {
  for (const p of ['manifest.json','package.json','package-lock.json','release/release-spec.json','scripts/product_version.py','scripts/package.py','coverage/safety-critical-public-apis.json','docs/maintenance/KAR210_BASELINE_RESTORE_LEDGER.json','docs/maintenance/KAR210_BASELINE_TARGET.json','docs/maintenance/KAR210_ACTIVE_TEST_DISPOSITIONS.json',...names,...ledger.entries.flatMap(e=>e.retained)]) copy(p);
  const entry=ledger.entries.find(e=>e.test===names[0]);
  assert.equal(resolveDisposition(fixture,entry.test).status,'excluded-C');
  deny(()=>resolveDisposition(fixture,'tests/v1234-insertion-lock-runtime.cjs'));
  put(entry.module,'// unexpectedly restored');
  deny(()=>resolveDisposition(fixture,entry.test));
  fs.unlinkSync(path.join(fixture,entry.module));
  put(entry.test,'// altered historic evidence');
  deny(()=>resolveDisposition(fixture,entry.test));copy(entry.test);
  const bad=structuredClone(ledger);bad.entries.push({...entry});
  put('docs/maintenance/KAR210_ACTIVE_TEST_DISPOSITIONS.json',bad);deny(()=>resolveDisposition(fixture,entry.test));copy('docs/maintenance/KAR210_ACTIVE_TEST_DISPOSITIONS.json');
  const safety=JSON.parse(read('coverage/safety-critical-public-apis.json'));safety.apis[0].tests.push(entry.test);
  put('coverage/safety-critical-public-apis.json',safety);deny(()=>resolveDisposition(fixture,entry.test));copy('coverage/safety-critical-public-apis.json');
  const pack=read('scripts/package.py').toString();put('scripts/package.py',pack.replace('runtime=[','runtime=[\''+entry.module+'\','));
  deny(()=>resolveDisposition(fixture,entry.test));copy('scripts/package.py');
  const manifest=JSON.parse(read('manifest.json'));manifest.version='2.0.0.1';put('manifest.json',manifest);
  deny(()=>resolveDisposition(fixture,entry.test));copy('manifest.json');
  const previous=structuredClone(ledger);previous.entries[0].module='src/shared/runtime-deps.js';
  put('docs/maintenance/KAR210_ACTIVE_TEST_DISPOSITIONS.json',previous);deny(()=>resolveDisposition(fixture,entry.test));copy('docs/maintenance/KAR210_ACTIVE_TEST_DISPOSITIONS.json');
  const pkg=JSON.parse(read('package.json'));
  pkg.scripts.test=pkg.scripts.test.replace('node '+entry.retained[0]+' && ','');
  put('package.json',pkg);deny(()=>resolveDisposition(fixture,entry.test));copy('package.json');
  const wrongOwner=JSON.parse(read('package.json'));wrongOwner.scripts.test=wrongOwner.scripts.test.replace('node tests/kar210-test-disposition.cjs '+entry.test,'node '+entry.test);
  put('package.json',wrongOwner);deny(()=>resolveDisposition(fixture,entry.test));copy('package.json');
  // Historical 1.x continues to execute the original suite, not disposition it.
  const version='1.25.12';for(const p of ['manifest.json','package.json','package-lock.json','release/release-spec.json']){
    const j=JSON.parse(read(p));j.version=version;if(p==='package.json')j.displayVersion=version;if(p==='package-lock.json')j.packages[''].version=version;if(p==='release/release-spec.json')j.packageVersion=version;put(p,j);
  }
  assert.equal(resolveDisposition(fixture,entry.test).status,'active');
} finally {fs.rmSync(fixture,{recursive:true,force:true});}
console.log('PASS KAR-210 explicit baseline disposition contract: two source-bound records, historical invocation and fail-closed negatives');
