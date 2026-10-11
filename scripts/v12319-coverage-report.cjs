#!/usr/bin/env node
'use strict';
const fs=require('node:fs'); const path=require('node:path');
const {loadAcorn}=require('./js-ast-loader.cjs'); const acorn=loadAcorn();
const ROOT=path.resolve(__dirname,'..'); const SRC=path.join(ROOT,'src');
const rawDir=path.resolve(process.argv[2]||path.join(ROOT,'coverage','raw'));
const outDir=path.resolve(process.argv[3]||path.join(ROOT,'coverage'));
fs.mkdirSync(outDir,{recursive:true});
function walkFiles(dir){let o=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())o.push(...walkFiles(p));else if(e.isFile())o.push(p);}return o;}
const srcAbs=walkFiles(SRC).filter(f=>f.endsWith('.js')).sort();
const sourceByRel=new Map(srcAbs.map(f=>[path.relative(ROOT,f).replace(/\\/g,'/'),fs.readFileSync(f,'utf8')]));
const byBase=new Map(srcAbs.map(f=>[path.basename(f),path.relative(ROOT,f).replace(/\\/g,'/')]));
function canonical(url, maxEnd){
 let u=String(url||''); if(!u)return null; let exact=false;
 try{if(u.startsWith('file://')){u=new URL(u).pathname; exact=true;}}catch{}
 u=u.replace(/\\/g,'/'); const idx=u.lastIndexOf('/src/');
 if(idx>=0){const rel=u.slice(idx+1); return sourceByRel.has(rel)?{rel,exact:true}:null;}
 const b=path.basename(u); const rel=byBase.get(b); if(!rel)return null;
 const src=sourceByRel.get(rel); if(Number.isFinite(maxEnd) && maxEnd!==src.length) return null; // reject legacy composite VM source
 return {rel,exact:false};
}
const scripts=new Map();
for(const f of walkFiles(rawDir).filter(p=>/^coverage-.*\.json$/.test(path.basename(p)))){
 let d;try{d=JSON.parse(fs.readFileSync(f,'utf8'));}catch{continue;}
 for(const s of d.result||[]){
  let maxEnd=0; for(const fn of s.functions||[]) for(const r of fn.ranges||[]) maxEnd=Math.max(maxEnd,Number(r.endOffset||0));
  const c=canonical(s.url,maxEnd); if(!c)continue;
  if(!scripts.has(c.rel)) scripts.set(c.rel,[]); scripts.get(c.rel).push({exact:c.exact,functions:s.functions||[]});
 }
}
function mergedRanges(rel){
 const entries=scripts.get(rel)||[]; const haveExact=entries.some(e=>e.exact); const use=haveExact?entries.filter(e=>e.exact):entries;
 const m=new Map();
 for(const e of use) for(const fn of e.functions||[]) for(const r of fn.ranges||[]){const k=`${r.startOffset}:${r.endOffset}`;m.set(k,(m.get(k)||0)+Number(r.count||0));}
 return [...m.entries()].map(([k,count])=>{const [start,end]=k.split(':').map(Number);return{start,end,count,len:end-start};}).sort((a,b)=>a.start-b.start||a.len-b.len);
}
function countAt(ranges,off){let best=null;for(const r of ranges){if(r.start<=off&&off<r.end){if(!best||r.len<best.len||(r.len===best.len&&r.count<best.count))best=r;}}return best?best.count:0;}
function meaningfulTokens(src){const out=[];const punct=new Set(['{','}','(',')','[',']',',',';','.',':','?.']);for(const t of acorn.tokenizer(src,{ecmaVersion:'latest',locations:true,allowHashBang:true})){if(t.type.label==='eof')break;if(punct.has(t.type.label))continue;out.push(t);}return out;}
function traverse(node,cb){if(!node||typeof node!=='object')return;cb(node);for(const [k,v] of Object.entries(node)){if(k==='loc'||k==='start'||k==='end')continue;if(Array.isArray(v)){for(const x of v)if(x&&typeof x.type==='string')traverse(x,cb);}else if(v&&typeof v.type==='string')traverse(v,cb);}}
function firstTokenOffset(tokens,node){if(!node)return null;for(const t of tokens){if(t.start>=node.start&&t.start<node.end)return t.start;}return node.start;}
function branchArms(ast,tokens,ranges){const branches=[];const c=node=>countAt(ranges,firstTokenOffset(tokens,node));traverse(ast,n=>{
 if(n.type==='IfStatement'){
   const test=c(n.test), yes=c(n.consequent); const arms=[{kind:'true',count:yes}];
   if(n.alternate) arms.push({kind:'false',count:c(n.alternate)}); else arms.push({kind:'false',count:Math.max(0,test-yes)});
   branches.push({type:'if',line:n.loc.start.line,arms});
 } else if(n.type==='ConditionalExpression'){
   const test=c(n.test), yes=c(n.consequent), no=c(n.alternate); branches.push({type:'conditional',line:n.loc.start.line,arms:[{kind:'true',count:yes},{kind:'false',count:no||Math.max(0,test-yes)}]});
 } else if(n.type==='LogicalExpression' && ['&&','||','??'].includes(n.operator)){
   const total=c(n.left), rhs=c(n.right); branches.push({type:`logical-${n.operator}`,line:n.loc.start.line,arms:[{kind:'rhs',count:rhs},{kind:'short-circuit',count:Math.max(0,total-rhs)}]});
 } else if(n.type==='SwitchStatement'){
   const arms=[];for(const cs of n.cases||[]){const target=cs.consequent?.[0]||cs.test;arms.push({kind:cs.test?'case':'default',count:target?c(target):0});} if(arms.length)branches.push({type:'switch',line:n.loc.start.line,arms});
 }
});return branches;}
const moduleRows=[];let totalLines=0,coveredLines=0,totalArms=0,coveredArms=0;
for(const [rel,src] of sourceByRel){
 const ranges=mergedRanges(rel); let ast;try{ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:'script',locations:true,ranges:true,allowHashBang:true});}catch(e){throw new Error(`${rel}: ${e.message}`);}
 const tokens=meaningfulTokens(src); const byLine=new Map(); for(const t of tokens){if(!byLine.has(t.loc.start.line))byLine.set(t.loc.start.line,[]);byLine.get(t.loc.start.line).push(t.start);}
 let lt=0,lc=0; for(const offs of byLine.values()){lt++;if(offs.some(o=>countAt(ranges,o)>0))lc++;}
 const bs=branchArms(ast,tokens,ranges); const arms=bs.flatMap(b=>b.arms); const bt=arms.length,bc=arms.filter(a=>a.count>0).length;
 totalLines+=lt;coveredLines+=lc;totalArms+=bt;coveredArms+=bc;
 moduleRows.push({module:rel,area:rel.split('/')[1]||'other',lines:{covered:lc,total:lt,percent:lt?+(100*lc/lt).toFixed(2):100},branches:{covered:bc,total:bt,percent:bt?+(100*bc/bt).toFixed(2):100},loaded:scripts.has(rel)});
}
const pubManifest=JSON.parse(fs.readFileSync(path.join(ROOT,'coverage/public-api-manifest.json'),'utf8'));
// Public execution from precise V8 function coverage, matched by implementation source position.
function publicCount(p){const entries=scripts.get(p.module)||[];const haveExact=entries.some(e=>e.exact);let count=0;for(const e of (haveExact?entries.filter(e=>e.exact):entries)){for(const fn of e.functions||[]){const root=fn.ranges?.[0];if(!root)continue;const overlaps=!(root.endOffset<=p.start||root.startOffset>=p.end);const near=Math.abs(root.startOffset-p.start)<=24;if(!overlaps&&!near)continue;const nm=String(fn.functionName||'');if(nm&&nm!==p.implName&&nm!==p.name&&!(root.startOffset>=p.start&&root.endOffset<=p.end))continue;count+=Number(root.count||0);}}return count;}
const tests=walkFiles(path.join(ROOT,'tests')).filter(f=>/\.(?:cjs|mjs|js)$/.test(f));const testText=new Map(tests.map(f=>[path.relative(ROOT,f).replace(/\\/g,'/'),fs.readFileSync(f,'utf8')]));
const safety=/delete|remove|publish|renew|reset|lock|reconcil|verify|verification|checkout|paid|archive|trash|profile|account|stop|abort|purge/i;
const publicRows=(pubManifest.functions||[]).map(p=>{const testFiles=[];for(const [f,txt] of testText){if(new RegExp(`\\b${p.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`).test(txt))testFiles.push(f);}const rawCount=publicCount(p);const runtimeExecuted=rawCount>0;return{...p,executionCount:runtimeExecuted?1:0,runtimeExecuted,safetyCritical:safety.test(p.name),testFiles:testFiles.slice(0,20)};});
const publicExecuted=publicRows.filter(r=>r.runtimeExecuted).length;
const areas={};for(const row of moduleRows){const a=row.area;areas[a]??={lines:{covered:0,total:0},branches:{covered:0,total:0},public:{covered:0,total:0}};areas[a].lines.covered+=row.lines.covered;areas[a].lines.total+=row.lines.total;areas[a].branches.covered+=row.branches.covered;areas[a].branches.total+=row.branches.total;}
for(const r of publicRows){const a=r.module.split('/')[1]||'other';areas[a]??={lines:{covered:0,total:0},branches:{covered:0,total:0},public:{covered:0,total:0}};areas[a].public.total++;if(r.runtimeExecuted)areas[a].public.covered++;}
for(const a of Object.values(areas)){for(const k of ['lines','branches','public'])a[k].percent=a[k].total?+(100*a[k].covered/a[k].total).toFixed(2):100;}
const summary={schemaVersion:1,engine:'Node/V8 precise coverage + Acorn source mapping',lineDefinition:'source lines containing meaningful JavaScript tokens; covered when V8 precise coverage reports execution for at least one token on the line',branchDefinition:'AST if/conditional/logical/switch arms mapped to V8 precise block counts',runtimeModules:sourceByRel.size,loadedRuntimeModules:moduleRows.filter(r=>r.loaded).length,publicFunctions:{covered:publicExecuted,total:publicRows.length,percent:publicRows.length?+(100*publicExecuted/publicRows.length).toFixed(2):100},lines:{covered:coveredLines,total:totalLines,percent:totalLines?+(100*coveredLines/totalLines).toFixed(2):100},branches:{covered:coveredArms,total:totalArms,percent:totalArms?+(100*coveredArms/totalArms).toFixed(2):100},areas};
fs.writeFileSync(path.join(outDir,'public-api-coverage.json'),JSON.stringify({schemaVersion:1,summary:summary.publicFunctions,functions:publicRows},null,2)+'\n');
fs.writeFileSync(path.join(outDir,'line-coverage.json'),JSON.stringify({schemaVersion:1,summary:summary.lines,areas:Object.fromEntries(Object.entries(areas).map(([k,v])=>[k,v.lines])),modules:moduleRows.map(r=>({module:r.module,...r.lines,loaded:r.loaded}))},null,2)+'\n');
fs.writeFileSync(path.join(outDir,'branch-coverage.json'),JSON.stringify({schemaVersion:1,summary:summary.branches,areas:Object.fromEntries(Object.entries(areas).map(([k,v])=>[k,v.branches])),modules:moduleRows.map(r=>({module:r.module,...r.branches,loaded:r.loaded}))},null,2)+'\n');
fs.writeFileSync(path.join(outDir,'coverage-summary.json'),JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'module-coverage.json'),JSON.stringify({schemaVersion:1,modules:moduleRows},null,2)+'\n');
let md=`# v1.23.19 Coverage Summary\n\n- Runtime modules: ${summary.runtimeModules} (${summary.loadedRuntimeModules} observed by V8)\n- Dynamic public-function coverage: **${summary.publicFunctions.covered}/${summary.publicFunctions.total} (${summary.publicFunctions.percent}%)**\n- Line coverage: **${summary.lines.covered}/${summary.lines.total} (${summary.lines.percent}%)**\n- Branch coverage: **${summary.branches.covered}/${summary.branches.total} (${summary.branches.percent}%)**\n\n| Area | Public functions | Lines | Branches |\n|---|---:|---:|---:|\n`;
for(const k of ['app','background','content','shared']){const a=areas[k]||{public:{},lines:{},branches:{}};md+=`| ${k} | ${a.public.covered||0}/${a.public.total||0} (${a.public.percent||0}%) | ${a.lines.covered||0}/${a.lines.total||0} (${a.lines.percent||0}%) | ${a.branches.covered||0}/${a.branches.total||0} (${a.branches.percent||0}%) |\n`;}
md+=`\nCoverage is measured from the complete automated Node regression suite plus the v1.23.19 public-API execution closure. Private helpers are not independent test targets; their line/branch coverage is reached transitively.\n`;
fs.writeFileSync(path.join(outDir,'coverage-summary.md'),md);
console.log(JSON.stringify(summary,null,2));
if(publicExecuted!==publicRows.length){console.error(`Public API coverage gate failed: ${publicExecuted}/${publicRows.length}`);process.exitCode=2;}
