#!/usr/bin/env node
'use strict';
const path=require('node:path');
const rel=process.argv[2]; if(!rel) throw new Error('module path required');
const ROOT=path.resolve(__dirname,'..');
let seed=0;
function makeSafe(label='safe') {
  const fn=function(){ return makeSafe(label+'.call'); };
  return new Proxy(fn,{
    get(target,prop){
      if(prop==='then') return undefined;
      if(prop===Symbol.iterator) return function*(){};
      if(prop===Symbol.toPrimitive) return hint=>hint==='number'?0:'';
      if(prop==='toJSON') return ()=>null;
      if(prop==='length') return 0;
      if(prop==='size') return 0;
      if(prop==='open') return false;
      if(prop==='disabled') return false;
      if(prop==='checked') return false;
      if(prop==='value') return '';
      if(prop==='textContent'||prop==='innerText'||prop==='href'||prop==='pathname'||prop==='search'||prop==='hash') return '';
      if(prop==='dataset') return Object.create(null);
      if(prop==='classList') return {add(){},remove(){},toggle(){return false;},contains(){return false;}};
      if(prop==='style') return Object.create(null);
      if(prop==='parentNode'||prop==='parentElement'||prop==='nextElementSibling'||prop==='previousElementSibling') return null;
      if(prop==='ownerDocument') return globalThis.document;
      return makeSafe(label+'.'+String(prop));
    },
    apply(){return makeSafe(label+'.result');},
    construct(){return makeSafe(label+'.instance');},
    set(){return true;},
    has(){return false;}
  });
}
const safe=makeSafe();
const registry=new Map();
globalThis.KRDeps={
 register(name,value){ if(registry.has(name) && registry.get(name)!==value) throw new Error(`Duplicate dependency: ${name}`); registry.set(name,value); return value; },
 require(name){ if(registry.has(name)) return registry.get(name); const v=makeSafe('dep.'+name); registry.set(name,v); return v; },
 optional(name){ return registry.has(name)?registry.get(name):null; },
 has(name){return registry.has(name);}, names(){return [...registry.keys()]}
};
globalThis.chrome=makeSafe('chrome');
globalThis.document=makeSafe('document');
globalThis.window=globalThis;
globalThis.self=globalThis;
globalThis.location={href:'https://www.kleinanzeigen.de/',origin:'https://www.kleinanzeigen.de',hostname:'www.kleinanzeigen.de',pathname:'/',search:'',hash:'',assign(){},replace(){},reload(){}};
globalThis.history={pushState(){},replaceState(){}};
try { Object.defineProperty(globalThis,'navigator',{value:{userAgent:'coverage-probe'},configurable:true}); } catch {}
globalThis.MutationObserver=class {constructor(cb){this.cb=cb;} observe(){} disconnect(){} takeRecords(){return[];}};
globalThis.ResizeObserver=class {observe(){} disconnect(){}};
globalThis.IntersectionObserver=class {observe(){} disconnect(){}};
globalThis.requestAnimationFrame=()=>1; globalThis.cancelAnimationFrame=()=>{};
globalThis.setTimeout=()=>1; globalThis.clearTimeout=()=>{}; globalThis.setInterval=()=>1; globalThis.clearInterval=()=>{}; globalThis.queueMicrotask=()=>{};
globalThis.confirm=()=>false; globalThis.alert=()=>{}; globalThis.prompt=()=>null;
globalThis.CSS={escape:s=>String(s||'')};
if(typeof globalThis.File==='undefined') globalThis.File=class {};
if(typeof globalThis.DOMParser==='undefined') globalThis.DOMParser=class {parseFromString(){return makeSafe('parsed');}};
if(typeof globalThis.HTMLElement==='undefined') globalThis.HTMLElement=class {};
process.on('unhandledRejection',()=>{}); process.on('uncaughtException',e=>{ process.stderr.write(`uncaught:${e?.message||e}\n`); });

function argsFor(name){
 const n=String(name||'').toLowerCase();
 if(n.includes('install')) return [];
 if(n.includes('id')) return ['', '', ''];
 if(n.includes('url')) return ['https://www.kleinanzeigen.de/'];
 if(n.includes('record')||n.includes('item')||n.includes('snapshot')||n.includes('state')||n.includes('session')||n.includes('options')||n.includes('context')) return [{}, {}, {}];
 if(n.includes('list')||n.includes('ids')||n.includes('records')) return [[], [], []];
 return [safe,safe,safe,safe];
}
function invoke(name,fn,thisArg){
 try { const out=Reflect.apply(fn,thisArg,argsFor(name)); if(out && typeof out.then==='function') out.catch(()=>{}); return true; }
 catch { return true; }
}
const abs=path.join(ROOT,rel);
let exported;
try { exported=require(abs); } catch(e) {
  // Some modules rely on dependencies to be registered before load. The registry returns safe fallbacks for require(),
  // but direct optional globals may still reject. Report for targeted harness tuning.
  console.error(`LOAD_FAIL ${rel}: ${e?.stack||e}`); process.exit(2);
}
let api=(exported && Object.keys(exported).length)?exported:null;
if(!api){ const match=[...registry.entries()].find(([k,v])=>v&&typeof v==='object'); if(match) api=match[1]; }
if(!api || (typeof api!=='object'&&typeof api!=='function')) { console.log(JSON.stringify({module:rel,moduleMethods:[],instanceMethods:[]})); process.exit(0); }
const moduleMethods=Object.entries(api).filter(([,v])=>typeof v==='function').map(([k])=>k);
let instance=null; let createError='';
if(typeof api.create==='function') {
  try {
    const options = new Proxy({}, {
      get:(_,p)=> {
        if (p === 'indexedDB') return { open: makeSafe('indexedDB.open') };
        if (p === 'IDBKeyRange') return { only:v=>v, bound:(a,b)=>[a,b], lowerBound:v=>v, upperBound:v=>v };
        return makeSafe('option.'+String(p));
      },
      has:()=>true
    });
    instance=api.create(options);
  } catch(e) { createError=String(e?.message||e); }
}
const instanceMethods=instance && typeof instance==='object' ? Object.entries(instance).filter(([,v])=>typeof v==='function').map(([k])=>k) : [];
for(const name of moduleMethods) invoke(name,api[name],api);
for(const name of instanceMethods) invoke(name,instance[name],instance);
console.log(JSON.stringify({module:rel,moduleMethods,instanceMethods,createError}));
