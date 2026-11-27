'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p)),j=p=>JSON.parse(read(p));
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const policy=require('./current-patch-policy.cjs'),target=j('docs/maintenance/KAR210_BASELINE_TARGET.json');
const active=policy.assertRestoredBaselineVersion(root);
assert.ok(policy.isS07Version(active));
assert.deepEqual(policy.S07_SCOPE,{"issue":224,"directBasis":"2.0.5.1","sourceCommit":"6b1e8442c88791b87b826101a66d44fc8053ae09","archiveSha256":"91cd8e6b9219daac26560c5d78ba260d62a34b062b52245a51e451ff81f05f10","fixCommit":"d513b1fe6085799850cd434219f7f5892181c470","runtimeChanges":[{"path":"manifest.json","before":"3631798c04bdfa1cc2f0a829f7a41f95e4c1906f","after":"913d19148f2012a412161e9873b1ff2addd78a95"},{"path":"src/app/archive-insertion-ui-controller.js","before":"08688155593fff5fadf7ea4add280909b7724bac","after":"3c40e94a7763ccc0b6aa74da4ca116df5692163f"},{"path":"src/app/trash-template-ui-controller.js","before":"d8a1858f647e893c02d2bddc94b8bc48fa164677","after":"74762e2da0069716883d084afb959518f6a808ad"},{"path":"src/background/controllers/template-fill-controller.js","before":"cea111834e279b8a3cd6b6e1bfbcc65975a2d97e","after":"c5df136f528117ee10e5a74501c1e3143a01b6ad"},{"path":"src/background/services/archive-insertion-recovery-service.js","before":"5b1e64993f0039465d05da8bdfae44844903ac30","after":"234dbffe0d0f1c4586b15b08f01ac81359399657"},{"path":"src/background/services/template-fill-service.js","before":"50425d9923131ff17ddfb5075c1cab87cb1c8e37","after":"df41d6cb7837fe8153c22043233430580611f894"},{"path":"src/content/template-filler.js","before":"0ff704a8f14a8b700a0de7d62ebe42327cc8ec50","after":"1281e2c514cc7a412bbd5f6fca45d0454cd2d445"},{"path":"src/content/template-publish-flow.js","before":"f4dd2a6b7b0965d8d5a2e28039a40350df9e958b","after":"4b0a100e546113624339c28f762f6d979e896825"}]});
for(const v of ['2.0.6','2.0.6.2','2.0.7.0','2.1.0.0','2.00.6.0'])assert.equal(policy.isReviewedRestoreVersion(v),false);
for(const row of policy.S07_SCOPE.runtimeChanges){const original=target.expected.find(x=>x.path===row.path)?.sha;assert.equal(policy.expectedRestoredBlob('2.0.5.1',row.path,original),row.before);assert.equal(policy.expectedRestoredBlob('2.0.6.0',row.path,original),row.after);assert.equal(blob(read(row.path)),policy.expectedRestoredBlob(active,row.path,original));}
assert.deepEqual(policy.expectedRestoredPackage('2.0.6.0',target),policy.expectedRestoredPackage('2.0.5.1',target));
assert.equal(policy.expectedRestoredPackage('2.0.6.0',target).length,122);
assert.deepEqual(policy.expectedRestoredAbsent('2.0.6.0',target),policy.expectedRestoredAbsent('2.0.5.1',target));
console.log('PASS KAR-224 exact S07 successor, eight pinned changes, unchanged package scope');

if(policy.isS07HotfixVersion(active)) {
 assert.deepEqual(policy.S07_HOTFIX,{"issue":224,"directBasis":"2.0.6.0","sourceCommit":"9a5b658a42b204268e92011bf3a43ceb6701db71","archiveSha256":"9ba8b73976143c1e86f899583eece95a6b4fd6db1025c832a13e03d1ebb58609","fixCommit":"a459a30f9dead03c9cd49904ea78a6063506eb8a","runtimeChanges":[{"path":"manifest.json","before":"913d19148f2012a412161e9873b1ff2addd78a95","after":"09e20881e2f71e63efd5c29b9d9c39ae7429e635"},{"path":"src/app/app.js","before":"8b6a58eecabff1a014b2f2d345d50b64372dc90e","after":"92da0a01864818e5bd8f898ca9feb7f929da4b17"}]});
 for(const row of policy.S07_HOTFIX.runtimeChanges){const original=target.expected.find(x=>x.path===row.path)?.sha;assert.equal(policy.expectedRestoredBlob('2.0.6.0',row.path,original),row.before);assert.equal(policy.expectedRestoredBlob(active,row.path,original),row.after);assert.equal(blob(read(row.path)),row.after);}
 assert.deepEqual(policy.expectedRestoredPackage(active,target),policy.expectedRestoredPackage('2.0.6.0',target));
 console.log('PASS KAR-224 exact S07 hotfix: two pinned runtime changes, unchanged package');
}
