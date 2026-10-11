const fs=require('fs'),vm=require('vm'),assert=require('assert');
function load(files){const ctx={console,URL,setTimeout,clearTimeout};ctx.globalThis=ctx;vm.createContext(ctx);for(const f of files)vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});return ctx;}
let p=0; const ok=(n,f)=>{f();p++;console.log('PASS',n)};
ok('legacy producer remains resolvable through KRDeps contract',()=>{const c=load(['runtime-deps.js','managed-navigation.js']);assert.ok(c.KRDeps.require('KRManagedNavigation'));});
ok('already modular producer remains resolvable through KRDeps contract',()=>{const c=load(['runtime-deps.js','account-probe-service.js']);assert.ok(c.KRDeps.require('KRAccountProbeService'));});
ok('app pure helper remains resolvable through KRDeps contract',()=>{const c=load(['runtime-deps.js','account-gate.js']);assert.ok(c.KRDeps.require('KRAccountGate'));});
ok('registry preserves duplicate-same-object semantics',()=>{const c=load(['runtime-deps.js']);const o={};assert.strictEqual(c.KRDeps.register('KRProbe',o),o);assert.strictEqual(c.KRDeps.register('KRProbe',o),o);assert.strictEqual(c.KRDeps.require('KRProbe'),o);});
console.log(`${p}/4 PASS v1.22.22 pre-refactor runtime`);
