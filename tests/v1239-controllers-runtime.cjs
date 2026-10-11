const fs=require('fs'),vm=require('vm'),assert=require('assert');
function load(file){const regs=new Map();const ctx={console,globalThis:null,module:{exports:{}},exports:{},setTimeout,clearTimeout,Date,Promise,URL,Blob:global.Blob};ctx.globalThis=ctx;ctx.KRDeps={register(n,v){regs.set(n,v)}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(file,'utf8'),ctx);return regs}
let n=0;
function el(){const listeners={};return {dataset:{},style:{height:'',opacity:'',removeProperty(k){this[k]=''}},classList:{s:new Set(),contains(x){return this.s.has(x)},add(x){this.s.add(x)},remove(x){this.s.delete(x)},toggle(x,v){if(v===undefined){v=!this.s.has(x)}v?this.s.add(x):this.s.delete(x);return v}},attrs:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){listeners[k]=fn},async trigger(k,event={}){const result=listeners[k]?.(event);await result;await Promise.resolve();await new Promise(resolve=>setTimeout(resolve,0));},querySelector(){return null},getBoundingClientRect(){return {left:0,top:0,right:10,bottom:10,width:10,height:10}},scrollHeight:10,clientHeight:10};}
(async()=>{
  {
    const api=load('src/app/control-accordion-controller.js').get('KRControlAccordionController');
    const a=el(),panel=el(),summary=el();a.dataset.accordionMode='controlled';a.dataset.open='true';a.querySelector=q=>q.includes('panel')?panel:summary;
    api.create({accordions:[a],getComputedStyle:()=>({overflow:'',pointerEvents:''}),matchMedia:()=>({matches:true})});
    await summary.trigger('click',{preventDefault(){}});
    assert.equal(a.dataset.open,'false');
    console.log('PASS controlled accordion toggles through installed public interaction');n++;
  }
  {
    const api=load('src/app/renewal-settings-controller.js').get('KRRenewalSettingsController');
    const safe=el(),fast=el(),range=el(),value=el(),indicator=el(),description=el();let calls=[];
    const c=api.create({safeMode:'safe',fastMode:'fast',defaultAttempts:3,elements:{safeButton:safe,fastButton:fast,retryRange:range,retryValue:value,indicator,description},runtimeMessage:async m=>{calls.push(m);if(m.type==='SET_RENEWAL_MODE')return{renewalMode:'fast',fastModeAcknowledged:true,maxPhaseAttempts:3};if(m.type==='SET_RENEWAL_PHASE_ATTEMPTS')return{renewalMode:'fast',fastModeAcknowledged:true,maxPhaseAttempts:5};return{renewalMode:'safe',fastModeAcknowledged:false,maxPhaseAttempts:3}},confirmAction:async()=>true});
    await fast.trigger('click');assert.equal(c.current().renewalMode,'fast');assert.ok(calls.some(x=>x.type==='SET_RENEWAL_MODE'));
    range.value='99';await range.trigger('change');assert.equal(c.current().maxPhaseAttempts,5);assert.ok(calls.some(x=>x.type==='SET_RENEWAL_PHASE_ATTEMPTS'&&x.maxPhaseAttempts===5));
    console.log('PASS renewal settings keeps acknowledgement and bounded attempts through installed interactions');n++;
  }
  {
    const api=load('src/app/diagnostics-controls-controller.js').get('KRDiagnosticsControlsController');const reset=el(),zip=el(),em=el(),status=el(),reason=el();const c=api.create({elements:{resetButton:reset,zipButton:zip,emergencyButton:em,status,resetBlockReason:reason},profileTransferLocked:()=>true});assert.match(c.resetBlockReason(),/Profilübertragung/);assert.equal(reset.disabled,true);console.log('PASS diagnostics reset remains fail-closed');n++;
  }
  console.log(`${n}/${n} PASS v1.23.9 controller runtime`);
})().catch(e=>{console.error(e);process.exit(1)});
