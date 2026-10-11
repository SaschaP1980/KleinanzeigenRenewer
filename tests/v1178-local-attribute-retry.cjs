const fs=require('node:fs'); const vm=require('node:vm'); const assert=require('node:assert/strict');
const filler=fs.readFileSync('template-filler.js','utf8'); let n=0; const pass=l=>{n++;console.log('PASS '+l);};
assert.match(filler,/const LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS = 3;/); pass('dynamic attributes have three local attempts');
const s=filler.indexOf('async function fillDynamicAttributeWithRetries'); const e=filler.indexOf('\n  async function fillDynamicAttributes',s); assert.ok(s>=0&&e>s,'local dynamic-attribute retry helper must exist');
assert.match(filler.slice(s,e),/findAttributeControl\(/); pass('control is resolved inside the local retry helper');
assert.match(filler.slice(s,e),/chooseExactOption\(/); pass('each local attempt uses strict exact selection');
assert.match(filler.slice(s,e),/for \(let attempt = 1; attempt <= LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS; attempt \+= 1\)/); pass('local retry loop is bounded');
const state={chooseCalls:0};
const hidden={name:'attributeMap[brand]',value:'',isConnected:true};
const context={
  document:{querySelectorAll:()=>[hidden]},
  waitFor:async fn=>fn(),
  findAttributeControl:()=>({id:'brand-control'}),
  chooseExactOption:async function(_control,_display,technicalInput,technical){ state.chooseCalls++; if(state.chooseCalls===1) throw new Error('Auswahl wurde nicht angeboten'); technicalInput.value=technical; },
  diagnostic:()=>Promise.resolve(), sleep:async()=>{},
  String, Error
};
vm.createContext(context);
vm.runInContext(`const LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS=3; const LOCAL_ATTRIBUTE_RETRY_DELAY_MS=1; ${filler.slice(s,e)}; this.run=fillDynamicAttributeWithRetries;`,context);
(async()=>{
  const out=await context.run({key:'brand',label:'Marke',displayValue:'Up Fashion',technicalValue:'brand-7'},'fill-1');
  assert.equal(state.chooseCalls,2); pass('a transient first selection failure is recovered locally on the second attempt');
  assert.equal(out.attempt,2); pass('successful local retry reports the recovery attempt');
  console.log(`${n} v1.17.8 local attribute retry groups passed`);
})().catch(error=>{console.error(error);process.exit(1);});
