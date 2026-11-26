'use strict';
// Explicit successor: exact two-generation lineage, not general 2.x acceptance.
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p));
const json=p=>JSON.parse(read(p));
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const {isReviewedRestoreVersion,expectedRestoredBlob,isS09Version,assertRestoredBaselineVersion}=require('./current-patch-policy.cjs');
assert.equal(isReviewedRestoreVersion('2.0.2.0'),true,'S03 exact successor not yet admitted');
for(const invalid of ['2.0.2','2.0.2.1','2.0.5.0','2.1.0.0','2.00.2.0'])assert.equal(isReviewedRestoreVersion(invalid),false);
assert.equal(isS09Version('2.0.2.0'),true,'S09 retention capability must remain active');
const manifest=json('manifest.json');
if(manifest.version==='2.0.2.0'){
 const s03=json('docs/maintenance/KAR213_SUCCESSOR_SCOPE.json'),s09=json('docs/maintenance/KAR214_SUCCESSOR_SCOPE.json'),target=json('docs/maintenance/KAR210_BASELINE_TARGET.json');
 assert.equal(s03.version,'2.0.2.0');assert.equal(s03.issue,213);assert.equal(s03.step,'S03');assert.equal(s03.directBasis,'2.0.1.0');
 assert.equal(s03.sourceCommit,'61f917d384cdce0fc191188e5a99515907967dbe');
 assert.equal(s03.archiveSha256,'15e58983d23a0706a301e161c76bf52c4e2885667fb7214b6f80b8f1209c798a');
 assert.equal(s03.runtimeChanges.length,15);
 assert.deepEqual(s03.addedRuntime,[]);
 for(const row of s03.runtimeChanges){
   const historical=target.expected.find(x=>x.path===row.path)?.sha;
   assert.equal(row.before,expectedRestoredBlob('2.0.1.0',row.path,historical));
   assert.equal(row.after,blob(read(row.path)));
   assert.equal(expectedRestoredBlob('2.0.2.0',row.path,historical),row.after);
 }
 assert.equal(assertRestoredBaselineVersion(root),'2.0.2.0');
 for(const entry of s09.runtimeChanges.filter(x=>!s03.runtimeChanges.some(r=>r.path===x.path)))assert.equal(blob(read(entry.path)),entry.after);
 assert.throws(()=>expectedRestoredBlob('2.0.5.0','manifest.json',target.expected.find(x=>x.path==='manifest.json').sha));
}
console.log('PASS KAR-213 exact successor lineage; no generic future-version admission');
