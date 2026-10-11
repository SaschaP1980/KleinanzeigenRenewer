#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),SRC=path.join(ROOT,'src');
function files(dir){let o=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())o.push(...files(p));else if(e.isFile()&&p.endsWith('.js'))o.push(p);}return o;}
const runtime=files(SRC).sort(); const rel=f=>path.relative(ROOT,f).replace(/\\/g,'/'); const rels=runtime.map(rel); const byBase=new Map(runtime.map(f=>[path.basename(f),rel(f)]));
const texts=new Map(runtime.map(f=>[rel(f),fs.readFileSync(f,'utf8')]));
const provider=new Map();
for(const [r,s] of texts){for(const line of s.split(/\r?\n/)){if(!/register/.test(line))continue;const m=line.match(/register[^('\"]*\(\s*['\"](KR[A-Za-z0-9_]+)['\"]/);if(m)provider.set(m[1],r);}}
const graph=new Map(rels.map(r=>[r,new Set()])); const missingDeps=[];
for(const [r,s] of texts){for(const m of s.matchAll(/KRDeps\.(?:require|optional)\(\s*['"](KR[A-Za-z0-9_]+)['"]\s*\)/g)){const p=provider.get(m[1]);if(p){if(p!==r)graph.get(r).add(p);}else if(m[1]!=='KRMessageContractRegistry')missingDeps.push({module:r,dependency:m[1]});}}
const roots=new Set();
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'manifest.json'),'utf8'));
if(manifest.background?.service_worker){const b=byBase.get(path.basename(manifest.background.service_worker));if(b)roots.add(b);}
for(const cs of manifest.content_scripts||[])for(const j of cs.js||[]){const b=byBase.get(path.basename(j));if(b)roots.add(b);}
for(const html of ['app.html','popup.html']){const p=path.join(ROOT,html);if(!fs.existsSync(p))continue;const s=fs.readFileSync(p,'utf8');for(const m of s.matchAll(/<script[^>]+src=['"]([^'"]+\.js)['"]/g)){const b=byBase.get(path.basename(m[1]));if(b)roots.add(b);}}
// Explicit script/import references and bootstrap lists make modules reachable from their owner.
for(const [r,s] of texts){for(const m of s.matchAll(/['"]([^'"]+\.js)['"]/g)){const b=byBase.get(path.basename(m[1]));if(b)graph.get(r).add(b);}}
const reachable=new Set(),stack=[...roots];while(stack.length){const r=stack.pop();if(reachable.has(r))continue;reachable.add(r);for(const n of graph.get(r)||[])stack.push(n);}
// Some HTML/manifest script modules only communicate via KRDeps and need reverse provider reachability: already rooted when explicit script entry.
const unreachable=rels.filter(r=>!reachable.has(r));
let cycles=[];const temp=new Set(),perm=new Set(),trail=[];function dfs(n){if(perm.has(n))return;if(temp.has(n)){const i=trail.indexOf(n);cycles.push([...trail.slice(i),n]);return;}temp.add(n);trail.push(n);for(const x of graph.get(n)||[])dfs(x);trail.pop();temp.delete(n);perm.add(n);}for(const n of rels)dfs(n);
const uniqueCycles=[];const cycleKeys=new Set();for(const c of cycles){const core=c.slice(0,-1);const k=[...core].sort().join('|');if(!cycleKeys.has(k)){cycleKeys.add(k);uniqueCycles.push(c);}}
const result={schemaVersion:1,runtimeModules:rels.length,providers:provider.size,roots:[...roots].sort(),reachable:reachable.size,unreachable,missingDependencies:missingDeps,cycles:uniqueCycles};
const out=path.join(ROOT,'coverage','architecture-audit.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(unreachable.length||missingDeps.length||uniqueCycles.length)process.exitCode=2;
