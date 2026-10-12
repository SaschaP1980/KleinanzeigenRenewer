const assert=require('assert'); const fs=require('fs'); const crypto=require('crypto');
const m=JSON.parse(fs.readFileSync('manifest.json','utf8')); const p=JSON.parse(fs.readFileSync('package.json','utf8')); const a=JSON.parse(fs.readFileSync('architecture-progress-v1.23.3.json','utf8'));
let n=0; const ok=(s,f)=>{f();n++;console.log('PASS '+s)};
ok('version stays on or after v1.23.3 architecture baseline',()=>{assert.ok(['1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'].includes(m.version));assert.equal(p.version,m.version);assert.equal(p.displayVersion,m.version)});
ok('architecture progress records mass-renewal workflow extraction',()=>{assert.equal(a.step,'mass-renewal-workflow');assert.equal(a.extractedModule,'mass-renewal-workflow-controller.js');assert.equal(a.stateModuleRetained,'mass-renewal-controller.js')});
ok('no new runtime boundary and packaged E2E remain required',()=>{assert.equal(a.noNewRuntimeBoundary,true);assert.equal(a.packagingClosureGuard,true);assert.equal(a.packagedChromeE2E,true)});
ok('background imports and requires workflow controller',()=>{const b=fs.readFileSync('background.js','utf8');assert.ok(b.includes('mass-renewal-workflow-controller.js'));assert.ok(b.includes("KRDeps.require('KRMassRenewalWorkflowController')"))});
ok('v1.23.3 baseline keeps app byte-identical to v1.23.2',()=>{if(m.version==='1.23.3'){const h=crypto.createHash('sha256').update(fs.readFileSync('app.js')).digest('hex');assert.equal(h,'0c9fdbd23c72db746494a535854e722685d2128658018847d6f3d7066d5de599')}else{assert.ok(fs.statSync('app.js').size>0)}});
console.log(`${n}/5 PASS v1.23.3 version architecture`);
