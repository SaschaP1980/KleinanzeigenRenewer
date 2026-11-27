'use strict';
// Deliberately deferred cases are neither removed from source nor credited as PASS.
// The exact complete files remain executable without this filter for RED evidence.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),policy=require('./current-patch-policy.cjs');
assert.ok(policy.isS06Version(policy.assertRestoredBaselineVersion(root)));
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
for(const item of policy.S06_SCOPE.partialTests){
 const bytes=fs.readFileSync(path.join(root,item.path));
 assert.equal(crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),item.blob);
 for(const d of item.deferred)assert.ok(bytes.toString().includes("test('"+d.name+"'"),'Deferred test name not found');
 const pattern='^(?:'+item.deferred.map(d=>escape(d.name)).join('|')+')$';
 const r=spawnSync(process.execPath,['--test','--test-reporter=tap','--test-skip-pattern='+pattern,item.path],{cwd:root,encoding:'utf8',timeout:120000});
 process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
 assert.equal(r.status,0,'Active S06 product tests failed: '+item.path);
 const number=name=>Number(r.stdout.match(new RegExp('^# '+name+' (\\d+)$','m'))?.[1]);
 // Node 22 skip-pattern omits matching cases entirely from TAP counts.
 const sourceNames=[...bytes.toString().matchAll(/\btest\('([^']+)'/g)].map(m=>m[1]);
 assert.equal(sourceNames.length,item.total,'Pinned witness count');
 assert.equal(new Set(sourceNames).size,item.total,'Unique witness names');
 const expected=sourceNames.filter(name=>!item.deferred.some(d=>d.name===name));
 assert.equal(number('tests'),expected.length);assert.equal(number('pass'),expected.length);
 assert.equal(number('fail'),0);assert.equal(number('skipped'),0);
 const actual=r.stdout.split('\n').filter(l=>/^ok \d+ - /.test(l)).map(l=>l.replace(/^ok \d+ - /,''));
 assert.deepEqual(actual,expected,'All and only active named witnesses must execute');
 for(const d of item.deferred)console.log('DEFERRED (not PASS) '+d.step+' '+d.name+'; verified RED run '+d.redRun);
}
console.log('PASS S06 active partial witness gate; exactly four explicitly deferred cases, no PASS credit for them');
