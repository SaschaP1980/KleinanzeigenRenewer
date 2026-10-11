const assert=require('assert');const fs=require('fs');
const m=JSON.parse(fs.readFileSync('manifest.json','utf8'));const p=JSON.parse(fs.readFileSync('package.json','utf8'));const a=JSON.parse(fs.readFileSync('architecture-progress-v1.23.2.json','utf8'));
let n=0;const ok=(s,f)=>{f();n++;console.log('PASS '+s)};
ok('v1.23.2 correction record remains valid in later 1.23.x',()=>{assert.match(m.version,/^1\.23\.\d+$/);assert.equal(p.version,m.version);assert.equal(p.displayVersion,m.version);assert.equal(a.version,'1.23.2')});
ok('correction records packaging defect and no product semantic change',()=>{assert.equal(a.releaseType,'correction-build');assert.equal(a.productRuntimeSemanticsChanged,false);assert.equal(a.packagingClosureGuard,true);assert.equal(a.packagedChromeE2E,true)});
ok('mass-renewal extraction shifts to v1.23.3',()=>{assert.equal(a.nextVersion,'1.23.3');assert.equal(a.nextExtraction,'mass-renewal-workflow')});
console.log(`${n}/3 PASS v1.23.2 correction version`);
