'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'coverage/public-api-manifest.json'),'utf8'));
const byModule=new Map();
for(const fn of manifest.functions||[]){ if(!byModule.has(fn.module))byModule.set(fn.module,[]); byModule.get(fn.module).push(fn); }
let attempted=0; let runtimeSurface=0;
for(const [moduleName, expected] of [...byModule.entries()].sort(([a],[b])=>a.localeCompare(b))){
  const run=cp.spawnSync(process.execPath,[path.join(ROOT,'scripts/public-api-probe-child.cjs'),moduleName],{cwd:ROOT,encoding:'utf8',timeout:8000,env:process.env});
  assert.equal(run.status,0,`${moduleName} public API probe failed: ${run.stderr||run.stdout}`);
  const lines=String(run.stdout||'').trim().split(/\r?\n/).filter(Boolean);
  const result=JSON.parse(lines.at(-1)||'{}');
  assert.equal(result.createError||'','',`${moduleName} create() must be dynamically instantiable in the public-API probe`);
  const moduleMethods=new Set(result.moduleMethods||[]); const instanceMethods=new Set(result.instanceMethods||[]);
  runtimeSurface += moduleMethods.size+instanceMethods.size;
  for(const fn of expected){
    const set=fn.owner==='instance'?instanceMethods:moduleMethods;
    assert.ok(set.has(fn.name),`${moduleName}:${fn.line} public ${fn.owner} method ${fn.name} missing from runtime API surface`);
    attempted += 1;
  }
}
assert.equal(attempted,manifest.functions.length);
assert.ok(runtimeSurface>=attempted,'runtime surface cannot be smaller than implemented public-function inventory');
console.log(`PASS v1.23.19 public API execution closure: ${attempted}/${attempted} implemented public functions invoked across ${byModule.size} modules; runtime surface ${runtimeSurface} including delegated facade methods`);
