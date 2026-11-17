'use strict';
// KAR-201 owner-observed native ARIA *structure*, with synthetic selection IDs.
// No raw owner HTML, account, ad ID, auth token, signed image URL or screenshot.
const assert = require('node:assert/strict');
const {parseHTML}=require('linkedom');
const {webcrypto}=require('node:crypto');
globalThis.crypto ||= webcrypto;
require('../src/shared/runtime-deps.js');
const Schema=require('../src/shared/template-schema-core.js');
const Preflight=require('../src/content/template-schema-preflight.js');
const FormFields=require('../src/content/template-form-fields.js');

const menus={
  stil:['Bitte wählen','Boho/Natürlich','Industrial','Klassisch/Vintage','Landhausstil/Shabby Chic',
    'Maritim','Modern/Minimalistisch','Retro/Mid-Century','Skandinavisch','Anderer Stil'],
  marke:['Bitte wählen','ASA Selection','Blomus','Butlers','Depot','Ferm Living','Fink',
    'Goebel/Hummel','Greengate','H&M Home','HAY','IKEA','Kähler','Leonardo','Meissen',
    'Nachtmann','PartyLite','Räder Design','Rivièra Maison','Rosenthal','Swarovski',
    'Villeroy & Boch','WMF','Yankee Candle','Zara Home','Andere Marke']
};
const syntheticTechnical={stil:'synthetic-modern-style',marke:'synthetic-brand-key'};
const selected={stil:'Maritim',marke:'IKEA'};
const clean=x=>String(x||'').replace(/\s+/g,' ').trim();
function fixture({duplicate=false,missing=false,mislinked=false,noReact=false,changeLabel=false}={}){
  const markup=key=>{
    const id='dekoration.'+key, list=menus[key].filter(x=>!(missing&&key==='stil'&&x===selected[key]));
    if(duplicate&&key==='stil')list.push(selected[key]);
    return '<div class="field"><input type="hidden" name="attributeMap['+id+']" value="">' +
      '<button id="'+id+'" role="combobox" type="button" aria-expanded="false" ' +
      'aria-labelledby="'+id+'-selected-option">'+
      '<span id="'+id+'-selected-option">Bitte wählen</span></button>' +
      '<ul id="'+id+'-menu" hidden role="listbox" aria-labelledby="'+(mislinked?'wrong':id)+'">' +
      list.map((label,i)=>'<li id="'+id+'-menu-option-'+i+'" role="option" aria-selected="false" '+
        'tabindex="-1"><div class="flex-1">'+label+'</div></li>').join('')+'</ul></div>';
  };
  const {window,document}=parseHTML('<html><body><form>'+
    '<input type="hidden" name="categoryId" value="246">'+markup('stil')+markup('marke')+
    '</form><astro-island component-url="PostListingForm" props="stub"></astro-island></body></html>');
  for(const [key,list] of Object.entries(menus)){
    const id='dekoration.'+key;
    const button=document.getElementById(id);
    const menu=document.getElementById(id+'-menu');
    const hidden=document.querySelector('input[name="attributeMap['+id+']"]');
    button.addEventListener('click',()=>{
      menu.removeAttribute('hidden');
      button.setAttribute('aria-expanded','true');
      button.setAttribute('aria-controls',menu.id);
      button.setAttribute('aria-activedescendant',id+'-menu-option-0');
    });
    for(const li of menu.querySelectorAll('li[role="option"]')){
      li.addEventListener('click',()=>{
        if(noReact)return;
        const label=clean(li.textContent);
        if(label==='Bitte wählen')return;
        hidden.value=syntheticTechnical[key]+(label===selected[key]?'':'-other');
        button.setAttribute('aria-expanded','false');
        document.getElementById(id+'-selected-option').textContent=
          changeLabel?'Unbekannter Anzeigetext':label;
      });
    }
  }
  const oldGlobals={};
  for(const k of ['document','HTMLInputElement','HTMLTextAreaElement','Event','KeyboardEvent']){
    oldGlobals[k]=globalThis[k];
  }
  Object.assign(globalThis,{document,HTMLInputElement:window.HTMLInputElement,
    HTMLTextAreaElement:window.HTMLTextAreaElement,Event:window.Event,KeyboardEvent:window.KeyboardEvent});
  const waitFor=async fn=>{for(let i=0;i<10;i++){const result=fn();if(result)return result;}throw Error('not settled');};
  const engine=Preflight.create({
    Schema,Form:{decodeAstroProps:()=>({postListingPage:{category:{id:246,attributes:{}}}})},
    documentRoot:()=>document,waitFor
  });
  const diagnostics=[];
  const formFields=FormFields.create({Form:null,SEARCH_KEY_DELAY_MS:0,SEARCH_SETTLE_MS:0,
    LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS:1,LOCAL_ATTRIBUTE_RETRY_DELAY_MS:0,
    clean,sleep:async()=>{},actionText:/^(?:Bestätigen|Abbrechen)$/,
    diagnostic:async(...args)=>{diagnostics.push(args);},
    visible:el=>!el.closest('[hidden]'),
    visibleText:el=>clean(el.textContent),waitFor});
  const template={categoryId:'246',
    dynamicAttributes:['stil','marke'].map(key=>({
      key:'dekoration.'+key,label:key==='stil'?'Stil':'Marke',
      technicalValue:null,displayValue:selected[key],status:'captured',controlType:'combobox'
    }))};
  async function preflight(){
    const observed=engine.inspectForm(document.querySelector('form'),'246',document);
    return engine.evaluate(template,observed);
  }
  function restore(){for(const [k,v] of Object.entries(oldGlobals))globalThis[k]=v;}
  return {document,formFields,preflight,template,restore,diagnostics};
}
async function test(label,options,{approve=true,expectedRecovered=2}={}){
  const f=fixture(options);
  try{
    const pre=await f.preflight();
    assert.equal(pre.complete,approve,'preflight should allow only display-only identity proof');
    if(!approve)return;
    assert.equal(pre.valueCompatibility,'unverified','saved visible labels do not prove a technical value');
    assert.deepEqual(pre.valueEvidence.filter(x=>x.reason==='display-only-exact-selection-required')
      .map(x=>x.key).sort(),['dekoration.marke','dekoration.stil']);
    const recovered=[];
    const issues=await f.formFields.fillDynamicAttributes(f.template,'synthetic-fill',x=>recovered.push(x));
    assert.equal(issues.length,expectedRecovered===2?0:issues.length,
      'unambiguous exact display selections should not fail');
    assert.equal(recovered.length,expectedRecovered,
      'only exact clicked and confirmed technical IDs may be carried');
    if(expectedRecovered===2){
      assert.deepEqual(recovered.map(x=>x.key).sort(),['dekoration.marke','dekoration.stil']);
      assert.ok(recovered.every(x=>x.technicalValue.startsWith('synthetic-')));
      assert.deepEqual(f.template.dynamicAttributes.map(x=>x.technicalValue),[null,null],
        'historical source must never be rewritten');
      const shown=[...f.document.querySelectorAll('button[role="combobox"]')].map(el=>
        clean(el.querySelector('span')?.textContent));
      assert.deepEqual(shown,['Maritim','IKEA']);
    }else{
      assert.ok(issues.length>0,'failed proof must reject publication');
    }
  }finally{f.restore()}
  console.log('PASS KAR-201 native-ARIA: '+label);
}
(async()=>{
  await test('unique style and brand labels recover hidden technical IDs only after real option click',{});
  await test('a missing visible option remains fail closed',{missing:true},{expectedRecovered:1});
  await test('duplicated label must not silently take first option',{duplicate:true},{expectedRecovered:1});
  await test('mislinked listbox must not choose another list',{mislinked:true},{expectedRecovered:0});
  await test('React does not update hidden backing value -> cannot recover',{noReact:true},{expectedRecovered:0});
  await test('postclick visible text mismatch -> cannot recover',{changeLabel:true},{expectedRecovered:0});
  console.log('PASS KAR-201: 6 native-structure regressions');
})().catch(e=>{console.error(e);process.exitCode=1;});
