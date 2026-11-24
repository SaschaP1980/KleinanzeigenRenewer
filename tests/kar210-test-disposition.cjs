'use strict';
// KAR-210: exact baseline-only dispositions; never count an omitted test as PASS.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');

const RULES = Object.freeze({
  'tests/kar97-update-idle-policy.cjs': Object.freeze({module:'lib/update-idle-policy.js', matrix:'C02', step:'S04', status:'excluded-C', retained:Object.freeze(['tests/v1234-insertion-lock-runtime.cjs','tests/v1238-account-session-controller-runtime.cjs','tests/v1238-profile-management-controller-runtime.cjs'])}),
  'tests/kar134-schema-core.cjs': Object.freeze({module:'src/shared/template-schema-core.js', matrix:'A03', step:'S05', status:'deferred-A', retained:Object.freeze(['tests/v12322-title-field-stability.cjs','tests/kar132-modern-category-modal.cjs','tests/kar132-wearables-attributes.cjs'])})
});
const LEDGER = 'docs/maintenance/KAR210_ACTIVE_TEST_DISPOSITIONS.json';
const has = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const gitBlob = b => crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');

function resolveDisposition(root,test) {
  assert.ok(has(RULES,test),'Unreviewed test disposition: '+test);
  const file = rel => path.join(root,rel);
  const read = rel => fs.readFileSync(file(rel));
  const json = rel => JSON.parse(read(rel));
  const version = execFileSync('python3',[file('scripts/product_version.py'),'--root',root],{encoding:'utf8'}).trim();
  const rule=RULES[test];
  if (/^1\.\d+\.\d+$/.test(version)) return {status:'active',test};
  assert.equal(version,'2.0.0.0','Disposition is limited to the reviewed baseline; reconcile explicitly before any successor');
  const ledger=json(LEDGER);
  assert.equal(ledger.schema,1);
  assert.equal(ledger.issue,210);
  assert.equal(ledger.version,version);
  assert.deepEqual(ledger.entries.map(e=>e.test).sort(),Object.keys(RULES).sort(),'Missing, duplicate or unreviewed disposition');
  const source=json('docs/maintenance/KAR210_BASELINE_RESTORE_LEDGER.json');
  const target=json('docs/maintenance/KAR210_BASELINE_TARGET.json');
  assert.equal(source.issue,210);
  assert.equal(target.issue,210);
  assert.equal(target.version,version);
  const safety=json('coverage/safety-critical-public-apis.json');
  assert.ok(Array.isArray(safety.apis)&&safety.apis.length>=15,'Missing safety reference evidence');
  const commands=json('package.json').scripts.test.split(' && ');
  const allowlist=read('scripts/package.py').toString().split(/\r?\n/).find(s=>s.startsWith('runtime='));
  assert.ok(allowlist,'Missing explicit runtime packaging array');
  const packaged=[...allowlist.matchAll(/'([^']+)'/g)].map(m=>m[1]);
  assert.deepEqual(packaged,target.packaged,'Baseline package scope drift');
  for(const e of ledger.entries) {
    const expected=RULES[e.test];
    for(const key of ['module','matrix','step','status']) assert.equal(e[key],expected[key],'Unreviewed '+key+' for '+e.test);
    assert.deepEqual(e.retained,expected.retained);
    assert.equal(e.owner,'package.json');
    assert.ok(typeof e.reason==='string'&&e.reason.length>40);
    const record=source.tests.find(r=>r.path===e.test);
    assert.equal(record?.workBlob,e.blob,'Original test provenance mismatch');
    assert.match(e.blob,/^[a-f0-9]{40}$/);
    assert.equal(gitBlob(read(e.test)),e.blob,'Historical test source changed');
    assert.ok(target.absent.includes(e.module)&&source.laterPackageEntries.some(r=>r.path===e.module),'Excluded implementation lacks exact source disposition');
    assert.ok(!fs.existsSync(file(e.module))&&!packaged.includes(e.module),'Excluded or deferred implementation present');
    assert.ok(!safety.apis.some(api=>api.tests.includes(e.test)),'Safety-critical negative cannot be dispositioned');
    assert.equal(commands.filter(c=>c==='node tests/kar210-test-disposition.cjs '+e.test).length,1,'Missing exact disposition invocation');
    assert.ok(!commands.includes('node '+e.test)&&!commands.includes('node --test '+e.test),'Conflicting active invocation');
    for(const retained of e.retained) {
      assert.ok(fs.statSync(file(retained)).isFile(),'Retained baseline test absent: '+retained);
      assert.ok(commands.includes('node '+retained)||commands.includes('node --test '+retained),'Retained baseline test not invoked: '+retained);
    }
  }
  return {status:rule.status,test};
}

if(require.main===module) {
  try {
    assert.equal(process.argv.length,3,'Exactly one reviewed test path required');
    const root=path.resolve(__dirname,'..');
    const result=resolveDisposition(root,process.argv[2]);
    if(result.status==='active') {
      const run=spawnSync(process.execPath,[path.join(root,result.test)],{cwd:root,stdio:'inherit'});
      if(run.error) throw run.error;
      process.exitCode=run.status??1;
    } else {
      console.log('KAR210 NOT_EXECUTED '+result.status+' '+result.test);
    }
  } catch(error) {console.error(error);process.exitCode=1;}
}
module.exports={resolveDisposition};
