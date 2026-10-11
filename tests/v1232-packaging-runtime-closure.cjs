const assert=require('assert');
const fs=require('fs');
const path=require('path');
const pkg=fs.readFileSync('scripts/package.py','utf8');
const m=pkg.match(/runtime\s*=\s*\[(.*?)\]\s*\n/s);
assert(m,'runtime list not found');
const runtime=[...m[1].matchAll(/['"]([^'"]+)['"]/g)].map(x=>x[1]);
const set=new Set(runtime);
const missing=[];
for(const name of runtime){
  if(!name.endsWith('.js') || !fs.existsSync(name)) continue;
  const src=fs.readFileSync(name,'utf8');
  for(const call of src.matchAll(/importScripts\s*\(([^)]*)\)/gs)){
    for(const q of call[1].matchAll(/['"]([^'"]+)['"]/g)){
      const dep=q[1];
      if(/^(?:https?:|chrome-extension:|data:)/.test(dep)) continue;
      const norm=path.posix.normalize(path.posix.join(path.posix.dirname(name),dep));
      if(!set.has(norm)) missing.push(`${name} -> ${norm}`);
    }
  }
}
assert.deepStrictEqual(missing,[],`Chrome runtime packaging misses local importScripts dependencies:\n${missing.join('\n')}`);
console.log('PASS Chrome runtime list closes over all local importScripts dependencies');
