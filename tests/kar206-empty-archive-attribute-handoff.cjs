'use strict';
// KAR-206: synthetic reproduction of an optional, unselected archive field
// from a real user ZIP. No user account, listing ID, title, images or tokens.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const archiveSrc=fs.readFileSync('src/background/services/template-fill-service.js','utf8');
const Preflight=require('../src/content/template-schema-preflight.js');
const F='a'.repeat(64);
const START='function templatePayload(record) {';
const start=archiveSrc.indexOf(START);
const end=archiveSrc.indexOf('\n      function ',start+START.length);
assert.ok(start>=0&&end>start,'exact live template handoff must exist');
const transfer=vm.runInNewContext('('+archiveSrc.slice(start,end).trim()+')');
const emptyAttr=(key,label='Bitte wählen',status='empty')=>({
 key:'baby_kinderkleidung.'+key,label:key,technicalValue:'',
 displayValue:label,status,controlType:'button',required:false
});
const selectedAttr=(key,technicalValue,displayValue)=>({
 key:'baby_kinderkleidung.'+key,label:key,technicalValue,
 displayValue,status:'captured',controlType:'button',required:false
});
const record=attributes=>({
 inventoryId:'synthetic-inventory',adId:'0000000000',title:'Synthetic',
 description:'fixture only',category:{id:'22',path:[]},categoryPath:[],
 templateSchema:{snapshot:{synthetic:true},fingerprint:F},
 dynamicAttributes:attributes,images:[]
});
const handoff=attributes=>transfer(record(attributes));
const evaluate=async (attributes,{required=[]}={})=>{
 const preflight=Preflight.create({
  Schema:{
   buildSchema:()=>({}),fingerprint:async()=>F,
   diff:()=>({status:'schema-changed',
     changes:[{type:'control-kind-changed',
       key:'attribute:baby_kinderkleidung.altersgruppe',
       before:'button',after:'combobox'}]})
  },Form:{},waitFor:async()=>{}
 });
 const saved=handoff(attributes);
 const fields=attributes.map(a=>({
  key:'attribute:'+a.key,kind:'combobox',
  requiredState:required.includes(a.key)?'required':'optional',
  optionValues:null
 }));
 const form={
  ownerDocument:{getElementById:()=>null},
  querySelector:()=>({value:'22'}),
  querySelectorAll:()=>[]
 };
 return preflight.evaluate(saved,{
  categoryId:'22',schema:{fields},form,
  optionProvenance:{},optionLabels:{},readbacks:{}
 });
};
test('handoff preserves empty/selected status exactly, without changing technical IDs',()=>{
 const attrs=[
  emptyAttr('altersgruppe'),
  emptyAttr('material'),
  emptyAttr('eigenschaften'),
  selectedAttr('groesse','158','158')
 ];
 const out=handoff(attrs).dynamicAttributes;
 assert.equal(out.length,4);
 assert.deepEqual(Array.from(out,x=>x.status),
  ['empty','empty','empty','captured']);
 assert.deepEqual(Array.from(out,x=>x.technicalValue),
  ['','','','158']);
 assert.deepEqual(Array.from(out,x=>x.displayValue),
  ['Bitte wählen','Bitte wählen','Bitte wählen','158']);
});
test('three genuinely empty optional placeholders are not fabricated selections',async()=>{
 const report=await evaluate([
  emptyAttr('altersgruppe'),emptyAttr('material'),
  emptyAttr('eigenschaften')
 ]);
 assert.equal(report.complete,true,JSON.stringify(report.issues));
 assert.equal(report.issues.length,0);
 assert.equal(report.valueCompatibility,'confirmed');
 assert.equal(report.comparison.status,'schema-changed');
 assert.match(report.warnings.join(' '),/Kleinanzeigen/);
});
test('captured visible value without technical ID remains blocked',async()=>{
 const report=await evaluate([emptyAttr('altersgruppe','Blau','captured')]);
 assert.equal(report.complete,false);
 assert.match(report.issues.join(' '),/ohne eindeutig gespeicherten technischen Wert/);
 assert.equal(report.valueEvidence[0].reason,'display-only-unsafe-control');
});
test('invalid status=empty with a substantive visible choice fails closed',async()=>{
 const report=await evaluate([emptyAttr('material','Baumwolle','empty')]);
 assert.equal(report.complete,false);
 assert.match(report.issues.join(' '),/ohne eindeutig gespeicherten technischen Wert/);
 assert.equal(report.valueEvidence[0].status,'incompatible');
});
test('a placeholder without proven empty state remains blocked',async()=>{
 const report=await evaluate([{...emptyAttr('material','Bitte wählen'),status:undefined}]);
 assert.equal(report.complete,false);
 assert.equal(report.valueEvidence[0].reason,'display-only-unsafe-control');
});
test('empty required category choice remains blocked by required-field guard',async()=>{
 const attr=emptyAttr('material');
 const report=await evaluate([attr],{required:[attr.key]});
 assert.equal(report.complete,false);
 assert.match(report.issues.join(' '),/Pflichtmerkmal/);
});
test('nonempty selected technical ID is preserved even if contradictory empty status',async()=>{
 const report=await evaluate([
  {...selectedAttr('groesse','158','158'),status:'empty'}
 ]);
 assert.equal(report.complete,true);
 assert.equal(report.valueCompatibility,'unverified');
 assert.equal(report.valueEvidence[0].reason,'technical-options-unknown');
});
