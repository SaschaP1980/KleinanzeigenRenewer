#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { loadAcorn } = require('./js-ast-loader.cjs');
const acorn = loadAcorn();
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function filesUnder(dir) {
  const out=[];
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) out.push(...filesUnder(p));
    else if(ent.isFile() && p.endsWith('.js')) out.push(p);
  }
  return out.sort();
}
function walk(node, fn, parent=null) {
  if (!node || typeof node!=='object') return;
  fn(node,parent);
  for (const [k,v] of Object.entries(node)) {
    if (k==='loc' || k==='start' || k==='end') continue;
    if (Array.isArray(v)) {
      for (const x of v) if (x && typeof x.type==='string') walk(x,fn,node);
    } else if (v && typeof v.type==='string') {
      walk(v,fn,node);
    }
  }
}
function propName(p) {
  if (!p) return null;
  if (!p.computed && p.key?.type==='Identifier') return p.key.name;
  if (p.key?.type==='Literal') return String(p.key.value);
  return null;
}
function unwrapFreeze(expr) {
  if (expr?.type==='CallExpression' && expr.arguments?.length && expr.callee?.type==='MemberExpression' && !expr.callee.computed && expr.callee.object?.name==='Object' && expr.callee.property?.name==='freeze') return expr.arguments[0];
  return expr;
}
function memberPath(node) {
  if (!node) return '';
  if (node.type==='ChainExpression') return memberPath(node.expression);
  if (node.type==='Identifier') return node.name;
  if (node.type==='MemberExpression') {
    const base=memberPath(node.object); const prop=node.computed ? (node.property?.type==='Literal'?String(node.property.value):'') : node.property?.name;
    return base && prop ? `${base}.${prop}` : '';
  }
  return '';
}
function isRegisterCall(node) {
  if (node?.type!=='CallExpression') return false;
  const p=memberPath(node.callee);
  return /(?:^|\.)KRDeps\.register$/.test(p) || p==='KRDeps.register' || p.endsWith('.register') && node.arguments?.[0]?.type==='Literal' && /^KR/.test(String(node.arguments[0].value||''));
}
function parseFile(file) {
  const source=fs.readFileSync(file,'utf8');
  const ast=acorn.parse(source,{ecmaVersion:'latest',sourceType:'script',locations:true,ranges:true,allowHashBang:true});
  const vars=new Map(); const funcsByName=new Map(); const funcNodes=[];
  walk(ast,(n,parent)=>{
    if(n.type==='VariableDeclarator' && n.id?.type==='Identifier') vars.set(n.id.name,n.init);
    if(n.type==='FunctionDeclaration' && n.id?.name) { if(!funcsByName.has(n.id.name)) funcsByName.set(n.id.name,[]); funcsByName.get(n.id.name).push(n); funcNodes.push(n); }
    if((n.type==='FunctionExpression'||n.type==='ArrowFunctionExpression') && parent?.type==='VariableDeclarator' && parent.id?.type==='Identifier') { if(!funcsByName.has(parent.id.name)) funcsByName.set(parent.id.name,[]); funcsByName.get(parent.id.name).push(n); funcNodes.push(n); }
    if(n.type==='Property' && (n.method || n.value?.type==='FunctionExpression'||n.value?.type==='ArrowFunctionExpression')) funcNodes.push(n.value);
  });
  const publicFns=[]; const seen=new Set();
  function addFunction(name,node,owner,kind='function') {
    if(!node || !['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(node.type)) return;
    const key=`${node.start}:${node.end}:${owner}:${name}`; if(seen.has(key)) return; seen.add(key);
    publicFns.push({module:path.relative(ROOT,file).replace(/\\/g,'/'), owner, name, implName: node.id?.name || name, kind, start:node.start,end:node.end,line:node.loc.start.line,endLine:node.loc.end.line});
  }
  function resolveIdentifier(name) {
    const f=funcsByName.get(name); if(f?.length) return f[f.length-1];
    const v=vars.get(name); if(v && ['FunctionExpression','ArrowFunctionExpression'].includes(v.type)) return v;
    return null;
  }
  function addObject(expr, owner, allowInstance=true, depth=0) {
    if(depth>8 || !expr) return;
    expr=unwrapFreeze(expr);
    if(expr?.type==='Identifier') {
      const init=vars.get(expr.name);
      if(init) return addObject(init,owner,allowInstance,depth+1);
      return;
    }
    if(expr?.type==='CallExpression' && expr.callee?.type==='Identifier') {
      const fn=resolveIdentifier(expr.callee.name);
      if(fn) return addReturns(fn,owner,allowInstance,depth+1);
      return;
    }
    if(expr?.type!=='ObjectExpression') return;
    for(const p of expr.properties||[]) {
      if(p.type!=='Property') continue;
      const name=propName(p); if(!name) continue;
      let fn=null;
      if(p.method && p.value) fn=p.value;
      else if(['FunctionExpression','ArrowFunctionExpression'].includes(p.value?.type)) fn=p.value;
      else if(p.value?.type==='Identifier') fn=resolveIdentifier(p.value.name);
      if(fn) {
        addFunction(name,fn,owner,owner==='module'?'module-api':'instance-api');
        if(allowInstance && name==='create') addReturns(fn,'instance',false,depth+1);
      }
    }
  }
  function addReturns(fn, owner, allowInstance, depth=0) {
    if(!fn?.body) return;
    if(fn.body.type!=='BlockStatement') { addObject(fn.body,owner,allowInstance,depth+1); return; }
    const visit=(node,isRoot=false)=>{
      if(!node||typeof node!=='object') return;
      if(!isRoot && ['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(node.type)) return;
      if(node.type==='ReturnStatement' && node.argument) { addObject(node.argument,owner,allowInstance,depth+1); return; }
      for(const [k,v] of Object.entries(node)){
        if(k==='loc'||k==='start'||k==='end') continue;
        if(Array.isArray(v)) for(const x of v) if(x&&typeof x.type==='string') visit(x,false);
        else if(v&&typeof v.type==='string') visit(v,false);
      }
    };
    visit(fn.body,true);
  }
  // Explicit module.exports / exports.* assignments.
  walk(ast,(n,parent)=>{
    if(n.type==='AssignmentExpression') {
      const lhs=memberPath(n.left);
      if(lhs==='module.exports') addObject(n.right,'module',true);
      else if(/^module\.exports\./.test(lhs) || /^exports\./.test(lhs)) {
        const name=lhs.split('.').pop(); let fn=null;
        if(['FunctionExpression','ArrowFunctionExpression'].includes(n.right?.type)) fn=n.right;
        else if(n.right?.type==='Identifier') fn=resolveIdentifier(n.right.name);
        if(fn) addFunction(name,fn,'module','module-api');
      }
    }
    if(isRegisterCall(n) && n.arguments?.[1]) addObject(n.arguments[1],'module',true);
  });
  // UMD factory pattern: wrapper receives a function that returns the exported API.
  walk(ast,(n,parent)=>{
    if(n.type!=='CallExpression' || !['FunctionExpression','ArrowFunctionExpression'].includes(n.callee?.type)) return;
    const calleeText=source.slice(n.callee.start,n.callee.end);
    if(!/module\.exports|KRDeps/.test(calleeText)) return;
    for(const arg of n.arguments||[]) if(['FunctionExpression','ArrowFunctionExpression'].includes(arg?.type)) addReturns(arg,'module',true,0);
  });
  return {file:path.relative(ROOT,file).replace(/\\/g,'/'), source, ast, publicFns};
}
function inventory() {
  const modules=filesUnder(SRC).map(parseFile);
  const functions=modules.flatMap(m=>m.publicFns).sort((a,b)=>a.module.localeCompare(b.module)||a.line-b.line||a.name.localeCompare(b.name));
  return {generatedAt:new Date().toISOString(),modules:modules.map(m=>m.file),functions};
}
if(require.main===module) {
  const out=inventory();
  if(process.argv.includes('--json')) process.stdout.write(JSON.stringify(out,null,2)+'\n');
  else {
    const byArea={}; for(const f of out.functions){const area=f.module.split('/')[1]||'other';byArea[area]=(byArea[area]||0)+1;}
    console.log(`Runtime public functions: ${out.functions.length}`); console.log(byArea);
    for(const f of out.functions) console.log(`${f.module}:${f.line} ${f.owner}.${f.name}`);
  }
}
module.exports={inventory,parseFile,filesUnder,walk,loadAcorn};
