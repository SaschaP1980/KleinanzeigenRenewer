const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const regs=new Map();
const sandbox={console,globalThis:null,Promise,WeakMap,Date,setTimeout,clearTimeout};sandbox.globalThis=sandbox;sandbox.KRDeps={register(n,v){regs.set(n,v)}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('control-accordion-controller.js','utf8'),sandbox);
const api=regs.get('KRControlAccordionController');
function classList(){const s=new Set();return{add:x=>s.add(x),remove:x=>s.delete(x),contains:x=>s.has(x)}}
let cancelCount=0;const removed=[];const panel={scrollHeight:140,getBoundingClientRect:()=>({height:140}),style:{height:'',opacity:'',removeProperty(n){removed.push(n);this[n]=''}},animate(){return{finished:Promise.resolve(),playState:'running',cancel(){cancelCount++;this.playState='idle'}}}};
let clickHandler=null;const summary={addEventListener(type,fn){if(type==='click')clickHandler=fn},setAttribute(){}};
const accordion={open:false,dataset:{},classList:classList(),querySelector(q){return q.includes('panel')?panel:summary}};
api.create({accordions:[accordion],matchMedia:()=>({matches:false}),getComputedStyle:()=>({overflow:'',pointerEvents:''})});
(async()=>{assert.equal(typeof clickHandler,'function');clickHandler({preventDefault(){}});await new Promise(r=>setTimeout(r,0));assert.equal(accordion.open,true);assert.equal(cancelCount,1);assert.ok(removed.includes('height'));clickHandler({preventDefault(){}});await new Promise(r=>setTimeout(r,0));assert.equal(accordion.open,false);assert.equal(cancelCount,2);console.log('PASS v1.19.7 installed accordion interaction releases finished WAAPI height so panels can grow and shrink')})().catch(e=>{console.error(e);process.exitCode=1});
