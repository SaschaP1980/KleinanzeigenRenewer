'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p)),j=p=>JSON.parse(read(p));
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const policy=require('./current-patch-policy.cjs'),scope=j('docs/maintenance/KAR220_SUCCESSOR_SCOPE.json'),target=j('docs/maintenance/KAR210_BASELINE_TARGET.json');
assert.equal(policy.assertRestoredBaselineVersion(root),'2.0.4.0');
assert.ok(policy.isS05Version('2.0.4.0')&&policy.isS04Version('2.0.4.0')&&policy.isS03Version('2.0.4.0')&&policy.isS09Version('2.0.4.0'));
for(const v of ['2.0.4','2.0.4.1','2.0.5.0','2.1.0.0','2.00.4.0'])assert.equal(policy.isReviewedRestoreVersion(v),false);
assert.equal(policy.isS05Version('2.0.3.0'),false);
assert.equal(scope.sourceCheckpoint,'3ddfe8aa513a899c38b6e3768ca1f710ec33496d');
assert.deepEqual(scope.runtimeChanges,[{"path":"manifest.json","before":"df24bd73e846f7341f292263ba962b9e740767b0","after":"716f5fb5b24814f71e1e7d1715bdb720a34dd7ae"},{"path":"src/background/services/template-fill-service.js","before":"ba7157d56acc86e6374c186074dd501301504e08","after":"50425d9923131ff17ddfb5075c1cab87cb1c8e37"},{"path":"src/content/template-filler.js","before":"902706f9afbb7407a5fcf9968bd0e0c431ad1660","after":"80f0beccfde71f28caa5fdccb89c9a0760f8ebfd"},{"path":"src/content/template-form-fields.js","before":"4ca1cc83328096d7498f0480d3174be5054bf42c","after":"97b704f7c33cd9cd74832032f595230e4cc29bce"},{"path":"src/content/template-verification.js","before":"645ec67da2344c2ffdb195c0403584ed46f6c816","after":"cbbf86baac5d0e202b0c38b50d323f20a5d2b9e7"}]);
for(const row of scope.runtimeChanges){const original=target.expected.find(x=>x.path===row.path)?.sha;assert.equal(policy.expectedRestoredBlob('2.0.3.0',row.path,original),row.before);assert.equal(policy.expectedRestoredBlob('2.0.4.0',row.path,original),row.after);assert.equal(blob(read(row.path)),row.after);}
assert.deepEqual(policy.expectedRestoredPackage('2.0.4.0',target),policy.expectedRestoredPackage('2.0.3.0',target));
assert.equal(policy.expectedRestoredPackage('2.0.4.0',target).length,122);
assert.deepEqual(policy.expectedRestoredAbsent('2.0.4.0',target),policy.expectedRestoredAbsent('2.0.3.0',target));
assert.equal(scope.excluded.length,5);
console.log('PASS KAR-220 exact S05 successor; only reviewed field-transfer blobs and version changed');
