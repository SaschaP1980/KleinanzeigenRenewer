const fs=require('fs'); const assert=require('assert');
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const spec=JSON.parse(fs.readFileSync('release/release-spec.json','utf8'));
const progress=JSON.parse(fs.readFileSync('architecture-progress-v1.23.11.json','utf8'));
const finalizer=fs.readFileSync('scripts/release_finalize.py','utf8');
let pass=0; function p(n,f){f();pass++;console.log('PASS',n)}
p('v1.23.11 owner record remains intact while release metadata may advance',()=>{assert.equal(progress.version,'1.23.11');assert.equal(pkg.version,manifest.version);assert.equal(spec.version,manifest.version);if(manifest.version==='1.23.11')assert.equal(spec.nextPlannedBuild,'1.23.12');else assert.notEqual(spec.nextPlannedBuild,'1.23.12')});
p('cleanup result is recorded',()=>{assert.equal(progress.deadFunctionFacadesRemoved,33);assert.equal(progress.deadBindingsRemoved,2);assert.equal(progress.runtimeUniqueNamedFunctionsAfterCleanup,0)});
p('v1.23.10 native observation remains recorded in the v1.23.11 owner record',()=>{assert.equal(progress.directBasis,'1.23.10');assert.equal(progress.directBasisNativeGreen,true);assert.equal(progress.directBasisNativeObservation,'single-self-healed-ui-action-desync')});
p('current direct-basis observation is carried by the active release spec/finalizer',()=>{if(manifest.version==='1.23.11')assert.match(spec.directBasisObservation,/v1\.23\.11|UI_ACTION_STATE_DESYNC_DETECTED|354 Info/);else{assert.equal(typeof spec.directBasisObservation,'string');assert.ok(spec.directBasisObservation.includes(spec.directBasis));}assert.match(finalizer,/directBasisObservation/);assert.match(finalizer,/Nativer Befund der direkten Basis/)});
p('release hardening remains mandatory',()=>{assert.equal(progress.detachedReleaseSupervisor,true);assert.equal(progress.sourceDirtyInvalidation,true);assert.equal(progress.streamTimeoutSeparateFromGateStatus,true);assert.equal(progress.fiveMinuteChatHeartbeat,true)});
p('v1.23.11 cleaned orchestrators remain part of the current architecture surface',()=>{const paths=spec.architectureFiles.map(x=>x.path);assert.ok(paths.includes('src/app/app.js'));assert.ok(paths.includes('src/background/background.js'))});
console.log(`v1.23.11 version architecture: ${pass}/6 PASS`);
