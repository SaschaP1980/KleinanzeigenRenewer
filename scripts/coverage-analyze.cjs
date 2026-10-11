#!/usr/bin/env node
'use strict';
const fs=require('node:fs'); const path=require('node:path'); const {inventory,parseFile,filesUnder,walk,loadAcorn}=require('./runtime-api-inventory.cjs');
const acorn=loadAcorn(); const ROOT=path.resolve(__dirname,'..'); const SRC=path.join(ROOT,'src');
const covDir=path.resolve(process.argv[2]||path.join(ROOT,'coverage','raw'));
function allFiles(dir){if(!fs.existsSync(dir))return[];let out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...allFiles(p));else out.push(p);}return out;}
const srcFiles=filesUnder(SRC); const byBase=new Map(srcFiles.map(f=>[path.basename(f),path.relative(ROOT,f).replace(/\\/g,'/')]));
function canonical(url){
  let u=String(url||''); if(!u)return null;
  try{if(u.startsWith('file://'))u=new URL(u).pathname;}catch{}
  u=u.replace(/\\/g,'/');
  const idx=u.lastIndexOf('/src/'); if(idx>=0)return u.slice(idx+1);
  const b=path.basename(u); return byBase.get(b)||null;
}
const cov=new Map();
for(const f of allFiles(covDir).filter(p=>/^coverage-.*\.json$/.test(path.basename(p)))){
 let d; try{d=JSON.parse(fs.readFileSync(f,'utf8'));}catch{continue;}
 for(const script of d.result||[]){ const rel=canonical(script.url); if(!rel)continue; const exact=String(script.url||'').includes('/src/')||String(script.url||'').startsWith('file:'); const key=rel; if(!cov.has(key))cov.set(key,[]); cov.get(key).push({exact,functions:script.functions||[],url:script.url}); }
}
function functionCount(pub){
 const entries=cov.get(pub.module)||[]; let exactCount=0, genericCount=0, exactSeen=false;
 for(const e of entries){
   for(const fn of e.functions){
     const r=fn.ranges?.[0]; if(!r)continue;
     if(e.exact){
       // Exact source file: source offsets are authoritative; aliases may have a different public property name.
       const overlaps = !(r.endOffset <= pub.start || r.startOffset >= pub.end);
       const nearStart = Math.abs(Number(r.startOffset||0) - Number(pub.start||0)) <= 24;
       if(!overlaps && !nearStart) continue;
       // Prefer the smallest covering/overlapping function range to avoid counting an enclosing factory.
       const fnName=String(fn.functionName||'');
       const plausibleName = !fnName || fnName===pub.implName || fnName===pub.name;
       if(!plausibleName && !(r.startOffset>=pub.start && r.endOffset<=pub.end)) continue;
       exactSeen=true; exactCount+=Number(r.count||0);
     } else if(String(fn.functionName||'')===String(pub.implName||pub.name)) genericCount+=Number(r.count||0);
   }
 }
 return exactSeen?exactCount:genericCount;
}
const inv=inventory();
const rows=inv.functions.map(f=>({...f,executionCount:functionCount(f)}));
const executed=rows.filter(r=>r.executionCount>0);
const byArea={}; for(const r of rows){const a=r.module.split('/')[1]||'other';byArea[a]??={total:0,executed:0};byArea[a].total++;if(r.executionCount>0)byArea[a].executed++;}
console.log(JSON.stringify({total:rows.length,executed:executed.length,percent:rows.length?executed.length*100/rows.length:100,byArea,uncovered:rows.filter(r=>!r.executionCount).map(r=>({module:r.module,line:r.line,name:r.name,owner:r.owner}))},null,2));
