const fs=require('fs'),vm=require('vm'),assert=require('assert'),cp=require('child_process');
function load(files){const ctx={console,URL,setTimeout,clearTimeout};ctx.globalThis=ctx;vm.createContext(ctx);for(const f of files)vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});return ctx;}
function productionProbe(files, apiName){
  const script=`const fs=require('fs'),vm=require('vm');const c={console,URL,setTimeout,clearTimeout};c.globalThis=c;vm.createContext(c);for(const f of ${JSON.stringify(files)})vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});if(!c.KRDeps.require(${JSON.stringify(apiName)}))process.exit(2);if(c[${JSON.stringify(apiName)}]!==undefined)process.exit(3);`;
  cp.execFileSync(process.execPath,['-e',script],{cwd:process.cwd(),env:{...process.env,NODE_OPTIONS:''},stdio:'pipe'});
}
let p=0;const ok=(n,f)=>{f();p++;console.log('PASS',n)};
ok('legacy producer is registry-owned without duplicate production global API',()=>productionProbe(['src/shared/runtime-deps.js','src/shared/managed-navigation.js'],'KRManagedNavigation'));
ok('template fill service is registry-owned without duplicate production global API',()=>productionProbe(['src/shared/runtime-deps.js','src/background/services/template-fill-service.js'],'KRTemplateFillService'));
ok('missing required dependency fails closed',()=>{const c=load(['runtime-deps.js']);assert.throws(()=>c.KRDeps.require('KRDefinitelyMissing'),/Missing dependency/);});
ok('missing optional dependency remains explicitly absent',()=>{const c=load(['runtime-deps.js']);assert.strictEqual(c.KRDeps.optional('KRDefinitelyMissing'),null);});
ok('production source has exactly one intentional KR global publication',()=>{const files=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=require('path').join(d,e.name);if(e.isDirectory())walk(f);else if(e.name.endsWith('.js'))files.push(f);}};walk('src');const hits=[];for(const f of files){const s=fs.readFileSync(f,'utf8');for(const m of s.matchAll(/globalThis\.(KR[A-Z][A-Za-z0-9_]*)\s*=/g))hits.push([f.replaceAll('\\','/'),m[1]]);}assert.deepStrictEqual(hits,[['src/shared/runtime-deps.js','KRDeps']]);});
console.log(`${p}/5 PASS v1.22.22 cleanup runtime ownership`);
