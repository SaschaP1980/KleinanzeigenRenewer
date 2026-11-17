'use strict';
// KAR-201 regression from owner v1.25.10 ZIP diagnostic, synthetic fixtures only.
// Source archive has 11 image records; native UI must retain manual review
// while continuing independently safe text and image prefill.
const assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');
const {webcrypto}=require('node:crypto');
const fs=require('node:fs'),vm=require('node:vm');
globalThis.crypto ||= webcrypto;
require('../src/shared/runtime-deps.js');
const Schema=require('../src/shared/template-schema-core.js');
const Preflight=require('../src/content/template-schema-preflight.js');
const source=fs.readFileSync(require.resolve('../src/content/template-filler.js'),'utf8');

function fixture({fingerprinted=false,missingRequired=false,category='246'}={}){
  const inputs=['art','condition','material','color','stil','marke'].map(key=>
    '<input type="hidden" name="attributeMap[dekoration.'+key+']" value="">' +
    // Styling labels are currently untrusted; no stable live UI peer evidence
    (key==='stil'||key==='marke' ? '' : '<button id="dekoration.'+key+'" role="combobox">Bitte wählen</button>')).join('');
  const {document}=parseHTML('<html><body><form>'+
    '<input type="hidden" name="categoryId" value="'+category+'">'+
    '<input name="title" value="Synthetic listing"><textarea name="description"></textarea>'+
    (missingRequired?'<input name="priceAmount" required>':'')+
    inputs+'</form><astro-island component-url="PostListingForm" props="stub"></astro-island></body></html>');
  const attrs=['art','condition','material','color','stil','marke'].map(key=>({
    key:'dekoration.'+key,displayValue:key==='stil'?'Maritim':key==='marke'?'IKEA':key==='art'?'Weitere Dekoration':key==='color'?'Andere Farben':'Wie neu',
    technicalValue: ['stil','marke'].includes(key)?null:'synthetic-'+key,
    status:'captured',label:key,controlType:'combobox'
  }));
  const t={categoryId:'246',title:'Synthetic listing',description:'Fixture',
    images:Array.from({length:11},(_,i)=>({imageKey:'test-'+i})),dynamicAttributes:attrs};
  const pf=Preflight.create({Schema,Form:{decodeAstroProps:()=>({postListingPage:{category:{id:246,attributes:{}}}})},
    documentRoot:()=>document,waitFor:async f=>{for(let i=0;i<5;i++){const x=f();if(x)return x;}throw Error('not settled');}});
  return {document,template:t,engine:pf};
}

function makeRuntime({report,template}){
  const begin=source.indexOf('  async function runFillSession(session) {');
  const end=source.indexOf('  async function runPendingFill()',begin);
  assert.ok(begin!==-1&&end>begin,'actual product runner must be exercised');
  const events=[],calls={images:0,attributes:[],publish:0},cat={value:'246'};
  const input={value:''};
  const form={
    querySelector(selector){if(selector==='input[name="categoryId"]')return cat;
      if(selector==='input[name="title"]')return {value:template.title};
      if(selector==='textarea[name="description"]')return input;
      if(selector==='input[name="priceAmount"]')return input;
      return null;},
    querySelectorAll(){return []},ownerDocument:{getElementById(){return null}}
  };
  const schema={...report,comparison:report.comparison||{status:'legacy-unversioned'},
    warnings:[],mappings:[],sourceFingerprint:null,currentFingerprint:'a'.repeat(64)};
  const context={
    SchemaCore:null,SchemaPreflight:{
      afterHydration:async()=>({dynamicCount:6,schema:{fields:[]}}),
      evaluate:async()=>schema,inspectForm:()=>({schema:{fields:[]},form}),
      verifyAfterFill:rep=>rep.complete?[]:['Formularschema-Vorprüfung ist nicht erfolgreich abgeschlossen.']},
    template:null,document:{querySelector:()=>form},
    captureCategoryNeutralForm:()=>({status:'unavailable'}),
    updatePanel:(...args)=>events.push({event:'panel',args}),
    monitorSchemaStage:async()=>({status:'reference-created'}),
    registerSchemaMonitorWarning:()=>{},
    paidInsertionDetection:()=>({required:false}),
    stopForPaidInsertion:()=>{throw Error('unexpected paid handling')},
    reviewLivePostingSchema:async()=>true,
    diagnostic:(...args)=>{events.push({event:'diagnostic',args});return Promise.resolve()},
    runtimeMessage:async m=>{events.push({event:'message',m});return m;},
    waitFor:async fn=>fn(),
    resolveActivePostingForm:()=>form,
    chooseRadio:()=>true,
    ensureStableTitleValue:async()=>form,
    setCategory:async()=>({confirmed:true}),
    setTextField:(node,value)=>{node.value=value},
    fillDynamicAttributes:async t=>{calls.attributes.push(t.dynamicAttributes.map(x=>x.key));return []},
    fillShipping:async()=>[],fillBuyNow:async()=>[],fillPriceType:async()=>[],fillLocation:async()=>[],
    uploadImages:async(_id,t)=>{calls.images++;assert.equal(t.images.length,11);
      return {complete:true,issues:[],states:Array.from({length:11},(_,i)=>({index:i,status:'complete'}))}},
    verify:()=>[],verifyArchiveTemplate:()=>[],
    settleAfterInteraction:async()=>{},
    advanceAfterVerifiedFill:()=>{calls.publish++;throw Error('MUST NOT AUTO PUBLISH')},
    persistedSchemaPreflight:(r,_t,verified)=>({verified,comparisonStatus:r.comparison.status,valueCompatibility:r.valueCompatibility}),
    updateSchemaMonitor:()=>{},stagedCategoryPathEvidence:null,SchemaMonitor:null,
    clean:x=>String(x||'').trim(),Set,Map,String,Boolean,Number,Date,Promise,
  };
  const run=vm.runInNewContext(source.slice(begin,end)+'\nrunFillSession;',context);
  return {run,calls,events};
}

(async()=>{
  const f=fixture(),observed=f.engine.inspectForm(f.document.querySelector('form'),'246',f.document);
  const report=await f.engine.evaluate(f.template,observed);
  assert.equal(report.complete,false);
  assert.equal(report.issues.length,2);
  assert.equal(report.valueEvidence.filter(x=>x.reason==='display-only-unsafe-control').length,2);
  assert.equal(report.partialContinuationEligible,true,'only unsafe optional values must allow safe partial prefill');
  assert.deepEqual([...report.partialSkipKeys].sort(),['dekoration.marke','dekoration.stil']);
  const rt=makeRuntime({report,template:f.template});
  const result=await rt.run({fillId:'synthetic-fill',archiveInsertionId:'synthetic-zip',
    template:f.template});
  assert.equal(result.complete,false,'partial success cannot satisfy publish gate');
  assert.equal(rt.calls.images,1,'all 11 images must reach the importer despite style/brand uncertainty');
  assert.equal(rt.calls.publish,0,'partial fill must not advance to publish');
  assert.deepEqual(rt.calls.attributes[0].sort(),[
    'dekoration.art','dekoration.color','dekoration.condition','dekoration.material'].sort(),
    'unsafe label-only attributes skipped; other attributes retained');
  const final=rt.events.filter(e=>e.event==='message'&&e.m?.result?.complete===false).at(-1);
  assert.equal(final.m.stage,'verified');
  assert.equal(final.m.status,'needs-review');
  assert.equal(final.m.result.schemaPreflight.verified,false);
  assert.ok(final.m.result.issues.some(s=>s.toLowerCase().includes('stil')));
  assert.ok(final.m.result.issues.some(s=>s.toLowerCase().includes('marke')));
  console.log('PASS KAR-201: safe partial ZIP prefill preserves images, other attributes, manual review and publish ban');

  const required=fixture({missingRequired:true}),o=required.engine.inspectForm(required.document.querySelector('form'),'246',required.document);
  const invalid=await required.engine.evaluate(required.template,o);
  assert.equal(invalid.complete,false);
  assert.equal(invalid.partialContinuationEligible,false,'structural/required-field failures remain hard stops');
  const cat=fixture({category:'405'}),diff=await cat.engine.evaluate(cat.template,cat.engine.inspectForm(cat.document.querySelector('form'),'405',cat.document));
  assert.equal(diff.partialContinuationEligible,false,'wrong category fails early');
  console.log('PASS KAR-201: only isolated recoverable option problems admit partial prefill');
})().catch(err=>{console.error(err);process.exitCode=1});
