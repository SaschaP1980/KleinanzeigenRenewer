'use strict';
// KAR-220 S05: actual field transfer, not schema/version detection.
// Synthetic category-246 ARIA structure, no owner data or real site.
const assert=require('node:assert/strict'),test=require('node:test');
const {parseHTML}=require('linkedom');
require('../src/shared/runtime-deps.js');
const Fields=require('../src/content/template-form-fields.js');
const Verify=require('../src/content/template-verification.js');
const Service=require('../src/background/services/template-fill-service.js');
const clean=x=>String(x??'').replace(/\s+/g,' ').trim();
const attr=(overrides={})=>({key:'dekoration.stil',label:'Stil',technicalValue:null,displayValue:'Maritim',status:'captured',controlType:'combobox',...overrides});
function fixture(opts={}){
  const key='dekoration.stil', labels=opts.missing?['Modern']:opts.duplicate?['Maritim','Maritim']:['Maritim','Modern'];
  const {window,document}=parseHTML('<html><body><form><input type="hidden" name="categoryId" value="246"><div><input type="hidden" name="attributeMap[dekoration.stil]" value=""><button id="dekoration.stil" role="combobox" type="button" aria-expanded="false" aria-labelledby="dekoration.stil-selected-option"><span id="dekoration.stil-selected-option">Bitte wählen</span></button><ul id="menu" hidden role="listbox" aria-labelledby="'+(opts.mislinked?'wrong':key)+'">'+labels.map(l=>'<li role="option" aria-selected="false" tabindex="-1">'+l+'</li>').join('')+'</ul></div></form></body></html>');
  const form=document.querySelector('form'),control=document.getElementById(key),input=form.querySelector('input[name="attributeMap[dekoration.stil]"]'),menu=document.getElementById('menu'),shown=document.getElementById(key+'-selected-option');
  let clicks=0;
  control.addEventListener('click',()=>{menu.removeAttribute('hidden');control.setAttribute('aria-expanded','true');control.setAttribute('aria-controls',menu.id);});
  for(const opt of menu.querySelectorAll('[role="option"]'))opt.addEventListener('click',()=>{clicks++;if(opts.noReact)return;input.value=clean(opt.textContent)==='Maritim'?'synthetic-style':'synthetic-modern';shown.textContent=opts.wrongLabel?'Unbekannt':clean(opt.textContent);control.setAttribute('aria-expanded','false');menu.setAttribute('hidden','');});
  const old=Object.fromEntries(['document','HTMLInputElement','HTMLTextAreaElement','Event','KeyboardEvent'].map(k=>[k,globalThis[k]]));
  Object.assign(globalThis,{document,HTMLInputElement:window.HTMLInputElement,HTMLTextAreaElement:window.HTMLTextAreaElement,Event:window.Event,KeyboardEvent:window.KeyboardEvent});
  const fields=Fields.create({Form:null,SEARCH_KEY_DELAY_MS:0,SEARCH_SETTLE_MS:0,LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS:1,LOCAL_ATTRIBUTE_RETRY_DELAY_MS:0,clean,sleep:async()=>{},actionText:/^(Bestätigen|Abbrechen)$/,diagnostic(){},visible:el=>!el.closest('[hidden]'),visibleText:el=>clean(el.textContent),waitFor:async(fn,o)=>{for(let i=0;i<4;i++){const r=fn();if(r)return r;}throw Error(o?.description||'not settled');}});
  const verifier=Verify.create({checkedRadio:()=>null});
  return {form,input,control,shown,fields,verifier,clicks:()=>clicks,restore:()=>Object.assign(globalThis,old)};
}
async function withFixture(opts,fn){const f=fixture(opts);try{await fn(f)}finally{f.restore()}}
test('known technical selection retains normal exact fill and final readback',()=>withFixture({},async f=>{
  const t={categoryId:'246',dynamicAttributes:[attr({technicalValue:'synthetic-style'})]};
  assert.deepEqual(await f.fields.fillDynamicAttributes(t,'fixture'),[]);
  assert.equal(f.input.value,'synthetic-style');assert.equal(f.clicks(),1);
  assert.deepEqual(f.verifier.verify(t,f.form),[]);
}));
test('legacy visible-only selection is actually transferred and proven without changing source',()=>withFixture({},async f=>{
  const t={categoryId:'246',dynamicAttributes:[attr()]},before=JSON.stringify(t),proof=[];
  assert.deepEqual(await f.fields.fillDynamicAttributes(t,'fixture',p=>proof.push(p)),[]);
  assert.equal(f.input.value,'synthetic-style','saved style must not be silently skipped');
  assert.equal(f.clicks(),1);assert.equal(proof.length,1);assert.equal(proof[0].technicalValue,'synthetic-style');
  assert.equal(JSON.stringify(t),before,'source must remain unchanged');
  const resolved={...t,dynamicAttributes:[{...t.dynamicAttributes[0],...proof[0]}]};
  assert.deepEqual(f.verifier.verify(resolved,f.form),[]);
  f.input.value='wrong-after-fill';assert.ok(f.verifier.verify(resolved,f.form).length>0,'final readback must catch later change');
}));
for(const [name,opts,maxClicks] of [['duplicate',{duplicate:true},0],['missing',{missing:true},0],['mislinked',{mislinked:true},0],['no React commit',{noReact:true},1],['wrong label',{wrongLabel:true},1]]){
  test('legacy visible-only '+name+' reports a field error, no guessed proof',()=>withFixture(opts,async f=>{
    const proof=[],t={categoryId:'246',dynamicAttributes:[attr()]};
    const issues=await f.fields.fillDynamicAttributes(t,'fixture',p=>proof.push(p));
    assert.ok(issues.some(i=>i.includes('Stil')),'missing or ambiguous transfer must be reported');
    assert.equal(proof.length,0);assert.equal(f.clicks(),maxClicks);
  }));
}
test('explicit optional placeholder stays empty, no false review',()=>withFixture({},async f=>{
  const t={categoryId:'246',dynamicAttributes:[attr({technicalValue:'',displayValue:'Bitte wählen',status:'empty'})]};
  assert.deepEqual(await f.fields.fillDynamicAttributes(t,'fixture'),[]);
  assert.deepEqual(f.verifier.verify(t,f.form),[]);assert.equal(f.clicks(),0);
}));
test('unproven substantive visible-only saved value cannot pass final verification',()=>withFixture({},async f=>{
  const t={categoryId:'246',dynamicAttributes:[attr()]};
  assert.ok(f.verifier.verify(t,f.form).some(i=>i.includes('Stil')),'untransferred saved value must be reported');
}));
test('template payload preserves explicit empty versus captured status',()=>{
  const api=Service.create({storageLocal:{get:async()=>({}),set:async()=>{}}});
  const source={dynamicAttributes:[attr({technicalValue:'',displayValue:'Bitte wählen',status:'empty'}),attr({key:'dekoration.marke'})]};
  const before=JSON.stringify(source);const t=api.templatePayload(source);
  assert.deepEqual(t.dynamicAttributes.map(a=>a.status),['empty','captured']);
  assert.equal(JSON.stringify(source),before);
});

test('required missing selection and contradictory empty status report concrete errors',()=>withFixture({},async f=>{
  for(const a of [attr({technicalValue:'',displayValue:'Bitte wählen',status:'empty',required:true}),attr({status:'empty'})]){
    const t={categoryId:'246',dynamicAttributes:[a]};
    assert.ok((await f.fields.fillDynamicAttributes(t,'fixture',()=>assert.fail('no proof allowed'))).some(i=>i.includes('Stil')));
    assert.ok(f.verifier.verify(t,f.form).some(i=>i.includes('Stil')));
  }
  assert.equal(f.clicks(),0);
}));
test('known technical choice must not click a duplicate label without unique technical option proof',()=>withFixture({duplicate:true},async f=>{
  const t={categoryId:'246',dynamicAttributes:[attr({technicalValue:'synthetic-style'})]};
  const issues=await f.fields.fillDynamicAttributes(t,'fixture');
  assert.ok(issues.some(i=>i.includes('Stil')),'ambiguous actual dropdown must be reported');
  assert.equal(f.clicks(),0,'do not choose first of duplicate labels');
}));
test('linked dropdown exact technical option ID resolves equal labels',()=>withFixture({duplicate:true},async f=>{
  const options=[...f.form.querySelectorAll('[role="option"]')];
  for(const [i,opt] of options.entries()){
    const id=i?'synthetic-style':'synthetic-other';
    opt.setAttribute('data-value',id);
    opt.addEventListener('click',()=>{f.input.value=id;});
  }
  const t={categoryId:'246',dynamicAttributes:[attr({technicalValue:'synthetic-style'})]};
  assert.deepEqual(await f.fields.fillDynamicAttributes(t,'fixture'),[]);
  assert.equal(f.input.value,'synthetic-style');assert.equal(f.clicks(),1);
  assert.deepEqual(f.verifier.verify(t,f.form),[]);
}));
test('linked dropdown exact technical option ID survives a changed visible label',()=>withFixture({missing:true},async f=>{
  const opt=f.form.querySelector('[role="option"]');
  opt.setAttribute('data-value','synthetic-style');
  opt.addEventListener('click',()=>{f.input.value='synthetic-style';});
  const t={categoryId:'246',dynamicAttributes:[attr({technicalValue:'synthetic-style'})]};
  assert.deepEqual(await f.fields.fillDynamicAttributes(t,'fixture'),[]);
  assert.equal(f.input.value,'synthetic-style');assert.equal(f.clicks(),1);
  assert.deepEqual(f.verifier.verify(t,f.form),[]);
}));
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../src/content/template-filler.js'),'utf8');
const start=source.indexOf('async function runFillSession('),end=source.indexOf('  async function runPendingFill(',start);
assert.ok(start>=0&&end>start,'actual fill-runner boundary');
for(const [name,opts,mutation,expected] of [
  ['normal renewal',{},null,true],['archive insertion',{},null,true],
  ['missing legacy value',{missing:true},null,false],['technical value changed after upload',{},'technical',false],
  ['visible label changed after upload',{},'label',false]
]){
  test('actual fill runner: '+name,()=>withFixture(opts,async f=>{
    const t={categoryId:'246',dynamicAttributes:[attr()],images:[{imageKey:'1'},{imageKey:'2'},{imageKey:'3'}]};
    const before=JSON.stringify(t),uploads=[],advances=[],messages=[];
    const context={document:f.form.ownerDocument,updatePanel(){},diagnostic(){},runtimeMessage:async m=>{messages.push(m)},
      waitFor:async fn=>fn(),ensureStableTitleValue:async()=>f.form,setCategory:async()=>({confirmed:true}),
      resolveActivePostingForm:()=>f.form,paidInsertionDetection:()=>({required:false}),chooseRadio:()=>true,
      fillDynamicAttributes:f.fields.fillDynamicAttributes,fillShipping:async()=>[],fillBuyNow:async()=>[],
      setTextField(){},settleAfterInteraction:async()=>{},fillPriceType:async()=>[],fillLocation:async()=>[],
      uploadImages:async(_id,template)=>{uploads.push(template.images.map(x=>x.imageKey));
        for(const [i,image] of template.images.entries()){const e=f.form.ownerDocument.createElement('input');e.type='hidden';e.name='adImages['+i+'].url';e.value=image.imageKey;f.form.appendChild(e)}
        if(mutation==='technical')f.input.value='wrong-after-upload';
        if(mutation==='label')f.shown.textContent='wrong-after-upload';
        return {complete:true,issues:[],states:[]};},
      verifyArchiveTemplate:f.verifier.verifyArchiveTemplate,verify:f.verifier.verify,
      advanceAfterVerifiedFill:async s=>{advances.push(s);return {}}
    };
    if(source.includes('function manualReviewEvidence(')) {
      const a=source.indexOf('  function manualReviewEvidence('), b=source.indexOf('  async function runFillSession(',a);
      assert.ok(a>=0&&b>a);context.armPublishDetection=()=>true;
      Object.assign(context,vm.runInNewContext(source.slice(a,b)+'\n({manualReviewEvidence,offerManualReview});',context));
    }
    const run=vm.runInNewContext(source.slice(start,end)+'\nrunFillSession;',context);
    const result=await run({fillId:'fixture',renewalId:'renewal',archiveInsertionId:name==='archive insertion'?'archive':null,template:t});
    assert.equal(result.complete,expected);assert.equal(advances.length,expected?1:0);
    assert.equal(messages.at(-1).status,expected?'running':'needs-review');
    assert.deepEqual(uploads,[['1','2','3']]);assert.equal(JSON.stringify(t),before);
  }));
}
