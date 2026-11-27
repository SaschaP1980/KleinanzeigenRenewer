'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p)),j=p=>JSON.parse(read(p));
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const policy=require('./current-patch-policy.cjs');
assert.equal(policy.isReviewedRestoreVersion('2.0.3.0'),true,'S04 exact successor not yet admitted');
for(const v of ['2.0.3','2.0.3.1','2.0.4.1','2.0.6.1','2.1.0.0','2.00.3.0'])assert.equal(policy.isReviewedRestoreVersion(v),false);
assert.equal(policy.isS09Version('2.0.3.0'),true);
assert.equal(policy.isS03Version('2.0.3.0'),true);
assert.equal(policy.isS04Version('2.0.3.0'),true);
assert.equal(policy.isS04Version('2.0.2.0'),false);
const target=j('docs/maintenance/KAR210_BASELINE_TARGET.json'),scope=j('docs/maintenance/KAR217_SUCCESSOR_SCOPE.json');
assert.equal(scope.sourceCommit,'a88a3446560cb36c87a3ace599a0bbd0549c6f41');
assert.equal(scope.archiveSha256,'46cb5860015965fee5323dcedd290862672cc97e03e880180afc464ff3bf89ee');
assert.deepEqual(scope.addedRuntime,[]);
assert.equal(scope.runtimeChanges.length,6);
assert.equal(scope.removedRuntime.length,3);
for(const row of scope.runtimeChanges){
 const original=target.expected.find(x=>x.path===row.path)?.sha;
 assert.equal(policy.expectedRestoredBlob('2.0.2.0',row.path,original),row.before);
 assert.equal(policy.expectedRestoredBlob('2.0.3.0',row.path,original),row.after);
 assert.equal(blob(read(row.path)),policy.expectedRestoredBlob(j('manifest.json').version,row.path,original));
}
for(const row of scope.removedRuntime){
 const original=target.expected.find(x=>x.path===row.path)?.sha;
 assert.equal(policy.expectedRestoredBlob('2.0.2.0',row.path,original),row.before);
 assert.equal(policy.expectedRestoredBlob('2.0.3.0',row.path,original),null);
 assert.ok(!fs.existsSync(path.join(root,row.path)));
 assert.equal(blob(read(row.archive)),row.before);
 assert.ok(policy.expectedRestoredAbsent('2.0.3.0',target).includes(row.path));
}
assert.ok(policy.isS04Version(policy.assertRestoredBaselineVersion(root)));
const pack=read('scripts/package.py').toString().split('\n').find(l=>l.startsWith('runtime='));
assert.deepEqual([...pack.matchAll(/'([^']+)'/g)].map(m=>m[1]),policy.expectedRestoredPackage('2.0.3.0',target));
assert.equal(policy.expectedRestoredPackage('2.0.3.0',target).length,122);
const workflow=read('.github/workflows/kar-work-pr.yml').toString();
assert.ok(workflow.includes('if [[ "$GITHUB_HEAD_REF" == "work/KAR-213" || "$GITHUB_HEAD_REF" == "work/KAR-217" ]]; then'));
assert.ok(workflow.includes('for source in 1.23.48 1.25.36; do'));
assert.ok(workflow.includes('timeout --kill-after=15s 180s python3 tests/e2e/kar213-cold-upgrade-recovery.py --source "$source" --candidate-zip "$E2E_CHROME_ZIP"'));
console.log('PASS KAR-217 exact S04 successor, unchanged S03/S09 lineage and archived source blobs');
