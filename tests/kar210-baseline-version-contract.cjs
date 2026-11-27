'use strict';
// Test the S02-only version contract without relaxing any historical PATCH predicate.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {assertRestoredBaselineVersion,isCurrentPatchVersion,includesSupportedRelease,includesActivePatch}=require('./current-patch-policy.cjs');
const {assertPendingS02Release}=require('./kar210-historical-contract-context.cjs');
const root=path.resolve(__dirname,'..');
const metadata=['manifest.json','package.json','package-lock.json','release/release-spec.json'];
const active=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8')).version;
const s07=active==='2.0.6.0';
const s06Hotfix=active==='2.0.5.1'||s07;
const s06=active==='2.0.5.0'||s06Hotfix;
const s05=active==='2.0.4.0'||s06;
const s04=active==='2.0.3.0'||s05;
const s03=active==='2.0.2.0'||s04;
const s09=['2.0.1.0','2.0.2.0'].includes(active)||s04;
assert.equal(assertRestoredBaselineVersion(root),active);
for(const v of ['2.0.0.0','2.0.0.1','2.0.0','2.00.0.0']) {
  assert.equal(isCurrentPatchVersion(v),false);
  assert.equal(includesActivePatch(['1.23.24'],v),false);
  assert.equal(includesSupportedRelease(['1.23.24'],v),false);
}
assert.equal(isCurrentPatchVersion('1.25.12'),true);
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'kar210-metadata-'));
let n=0,releaseNegatives=0;
try {
  for(const f of [...metadata,'scripts/product_version.py']){const dst=path.join(fixture,f);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(path.join(root,f),dst);}
  const read=p=>JSON.parse(fs.readFileSync(path.join(fixture,p),'utf8'));
  const write=(p,x)=>fs.writeFileSync(path.join(fixture,p),JSON.stringify(x));
  assert.equal(assertRestoredBaselineVersion(fixture),active);
  const mutations=[
    ['manifest.json',m=>m.version='2.0.0'],
    ['package.json',p=>p.version='2.0.0.0'],
    ['package.json',p=>p.displayVersion='2.0.0'],
    ['package-lock.json',l=>l.packages[''].version=s07?'2.0.7':s06?'2.0.6':s05?'2.0.5':s04?'2.0.4':s03?'2.0.3':s09?'2.0.2':'2.0.1'],
    ['release/release-spec.json',s=>s.packageVersion=s09?'2.0.1.1':'2.0.1.0'],
    ['manifest.json',m=>m.key='ZmFrZQ=='],
    ['manifest.json',m=>m.permissions.push('tabs')],
    ['manifest.json',m=>m.host_permissions.push('https://example.invalid/*')],
    ['release/release-spec.json',s=>s.directBasis='1.25.12'],
    ['release/release-spec.json',s=>s.goldBaseline='1.23.48'],
    ['release/release-spec.json',s=>s.performanceRunRequired=false],
    ['release/release-spec.json',s=>s.safety.runtimeSubmitCalls=1],
    ['release/release-spec.json',s=>s.safety.runtimeRequestSubmitCalls=1],
    ['release/release-spec.json',s=>s.safety.noNewRuntimeBoundary=false],
    ['release/release-spec.json',s=>s.safety.publishViaVisibleGuardedControlOnly=false],
    ['release/release-spec.json',s=>s.safety.unsafePostPublishRemainsFailClosed=false]
  ];
  for(const [f,mutate] of mutations){const x=read(f);mutate(x);write(f,x);assert.throws(()=>assertRestoredBaselineVersion(fixture));n++;fs.copyFileSync(path.join(root,f),path.join(fixture,f));}
  assertPendingS02Release(fixture);
  const releaseMutations=[
    s=>s.validationStatus='RELEASE_GREEN',
    s=>s.directBasisNativeGreen=!(s07||(s09&&!s06)),
    s=>s.directBasisNativePending=s07||(s09&&!s06),
    s=>s.nativeSmokeRequired=false,
    s=>s.nextPlannedBuild='2.0.0.1',
    s=>s.nextPlannedBuildGoal='Automatically start next step',
    s=>s.nativeSmokeChecks=[],
    s=>s.performanceBudget.status='accepted',
    s=>s.performanceBudget.fastHardwareMeanSeconds=26,
    s=>s.performanceBudget.slowThreeSeconds=136,
    s=>s.performanceBudget.acceptanceStep='S02',
    s=>s.performanceRule='Native performance accepted',
    s=>s.performanceGoldlines.reverse(),
    s=>s.performanceGoldlines[0].totalSeconds=85.8085,
    s=>s.performanceGoldlines[1].hardware=s.performanceGoldlines[0].hardware,
    s=>s.coverage.status='accepted',
    s=>s.coverage.publicFunctions={covered:1,total:1,percent:100}
  ];
  for(const mutate of releaseMutations){
    const f='release/release-spec.json',x=read(f);mutate(x);write(f,x);
    assert.throws(()=>assertPendingS02Release(fixture));releaseNegatives++;
    fs.copyFileSync(path.join(root,f),path.join(fixture,f));
  }
  assertPendingS02Release(fixture);
  // A coherent successor still needs explicit review, not merely metadata parity.
  for(const f of metadata){const x=read(f);if(f==='manifest.json')x.version='2.0.0.1';if(f==='package.json')x.displayVersion='2.0.0.1';if(f.startsWith('release/')){x.version=x.packageVersion='2.0.0.1';delete x.hotfix;}write(f,x);}
  assert.throws(()=>assertRestoredBaselineVersion(fixture));n++;
  if(s09) {
    for(const f of metadata)fs.copyFileSync(path.join(root,f),path.join(fixture,f));
    const spec=read('release/release-spec.json');spec.s09.sourceCommit='0'.repeat(40);write('release/release-spec.json',spec);
    assert.throws(()=>assertRestoredBaselineVersion(fixture));n++;
  }
  if(s03) {
    for(const f of metadata)fs.copyFileSync(path.join(root,f),path.join(fixture,f));
    const spec=read('release/release-spec.json');spec.s03.sourceCommit='0'.repeat(40);write('release/release-spec.json',spec);
    assert.throws(()=>assertRestoredBaselineVersion(fixture));n++;
  }
  if(s04) {
    for(const f of metadata)fs.copyFileSync(path.join(root,f),path.join(fixture,f));
    const spec=read('release/release-spec.json');spec.s04.sourceCommit='0'.repeat(40);write('release/release-spec.json',spec);
    assert.throws(()=>assertRestoredBaselineVersion(fixture));n++;
    for(const f of metadata)fs.copyFileSync(path.join(root,f),path.join(fixture,f));
    const m=read('manifest.json');m.permissions.push('nativeMessaging');write('manifest.json',m);
    assert.throws(()=>assertRestoredBaselineVersion(fixture));n++;
  }
  if(s06) {
    for(const f of metadata)fs.copyFileSync(path.join(root,f),path.join(fixture,f));
    const spec=read('release/release-spec.json');spec.s06.sourceCommit='0'.repeat(40);write('release/release-spec.json',spec);
    assert.throws(()=>assertRestoredBaselineVersion(fixture));n++;
  }
  if(s06Hotfix) {
    for(const f of metadata)fs.copyFileSync(path.join(root,f),path.join(fixture,f));
    const spec=read('release/release-spec.json');spec.s06Hotfix.runtimeChanges[1].after='0'.repeat(40);write('release/release-spec.json',spec);
    assert.throws(()=>assertRestoredBaselineVersion(fixture));n++;
    for(const f of metadata)fs.copyFileSync(path.join(root,f),path.join(fixture,f));
    const missing=read('release/release-spec.json');delete missing.s06Hotfix;write('release/release-spec.json',missing);
    assert.throws(()=>assertRestoredBaselineVersion(fixture));n++;
  }
  if(s07) {
    for(const f of metadata)fs.copyFileSync(path.join(root,f),path.join(fixture,f));
    const spec=read('release/release-spec.json');spec.s07.runtimeChanges[1].after='0'.repeat(40);write('release/release-spec.json',spec);
    assert.throws(()=>assertRestoredBaselineVersion(fixture));n++;
  }
  if(active==='2.0.0.1') {
    for(const f of metadata)fs.copyFileSync(path.join(root,f),path.join(fixture,f));
    const spec=read('release/release-spec.json');spec.hotfix.runtimeBlob='0'.repeat(40);write('release/release-spec.json',spec);
    assert.throws(()=>assertRestoredBaselineVersion(fixture));n++;
  }
}finally{fs.rmSync(fixture,{recursive:true,force:true});}
console.log('PASS KAR-210 explicit baseline version: '+n+' negative fixtures, legacy predicates unchanged');
console.log('PASS KAR-210 pending release policy: '+releaseNegatives+' negative fixtures, no premature native/coverage/performance acceptance');
