'use strict';
// Synthetic technical 405 fixtures derived from owner's observed field names, NOT copied private archives.
const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const { webcrypto } = require('node:crypto');
globalThis.crypto ||= webcrypto;
const Schema = require('../src/shared/template-schema-core.js');
const Preflight = require('../src/content/template-schema-preflight.js');
let passed = 0;
const check = async (label, run) => { await run(); passed++; console.log('PASS KAR-134 preflight: '+label); };
const oldAttr = (key,value,display='') => ({ key, technicalValue:value, displayValue:display, label:key, controlType:'text' });
function fixture({ category='405', caseSize=true, label='44mm', caseValue='44',
  options=true, checkbox=true, requiredNew=false, busy=false, duplicate=false, legacy=false,
  savedKey='wearables.gehausegrosse', savedValue='44' } = {}) {
  const dom = '<html><body><form>' +
    '<input type="hidden" name="categoryId" value="'+category+'">' +
    (busy ? '<span aria-busy="true"></span>' : '') +
    '<input name="title" value="Not saved in fingerprint">' +
    '<textarea name="description">Not saved in fingerprint</textarea>' +
    (caseSize ? '<input type="hidden" name="attributeMap[wearables.case_size]" value="'+caseValue+'">' +
       '<button id="wearables.case_size" role="combobox">'+label+'</button>' : '') +
    (duplicate ? '<input type="hidden" name="attributeMap[wearables.case_size]" value="44">' : '') +
    (checkbox ? '<input type="checkbox" name="attributeMap[wearables.bluetooth]" checked>' : '') +
    (requiredNew ? '<input type="hidden" name="attributeMap[wearables.must_have]" value="">' : '') +
    '</form><astro-island component-url="PostListingForm" props="stub"></astro-island></body></html>';
  const { document } = parseHTML(dom);
  const definitions = {};
  if (caseSize) definitions['wearables.case_size']={ required: false,
    ...(options ? { localizedOptions: [{ value:'44', localizedValue:'44mm' },{ value:'46', localizedValue:'46mm' }] } : {}) };
  if (checkbox) definitions['wearables.bluetooth'] = { required: false };
  if (requiredNew) definitions['wearables.must_have'] = { required: true };
  const engine = Preflight.create({
    Schema,
    Form:{ decodeAstroProps: () => ({ postListingPage:{ category:{ id: Number(category), attributes:definitions } } }) },
    documentRoot: () => document,
    waitFor: async (getter) => { for(let i=0;i<6;i++){const x=getter();if(x)return x;}throw Error('no hydrated form'); }
  });
  const template = {categoryId: category, title:'Fake headline', description:'Fake description',
    dynamicAttributes:[oldAttr(savedKey,savedValue,'44')]};
  if(!legacy){
    const capture = {categoryId:category,dynamicAttributes:[oldAttr(savedKey,savedValue,'44')]};
    template.templateSchema = { snapshot:Schema.buildSchema(capture), fingerprint:null };
  }
  const complete = async () => {
    if(template.templateSchema) template.templateSchema.fingerprint=await Schema.fingerprint(template.templateSchema.snapshot);
    const observation=engine.inspectForm(document.querySelector('form'),template.categoryId,document);
    return { observation, report:await engine.evaluate(template,observation) };
  };
  return {document,engine,template,complete};
}
(async()=>{
  await check('archive-shaped category/technical attributes hash ignores saved data', async()=>{
    const original={category:{id:405,path:['Elektronik','Wearables','Smartwatches']},formFields:[{name:'title',type:'text',value:'PRIVATE'}],
      dynamicAttributes:[{key:'wearables.case_size',controlType:'combobox',technicalValue:'44'}]};
    const next={...original,formFields:[{name:'title',type:'text',value:'DIFFERENT'}],dynamicAttributes:[{...original.dynamicAttributes[0],technicalValue:'46'}]};
    assert.equal(await Schema.fingerprint(Schema.buildSchema(original)),await Schema.fingerprint(Schema.buildSchema(next)));
  });
  await check('exact 405 technical option and 44mm label admits mapped source for final readback',async()=>{
    const f=fixture(),{report,observation}=await f.complete();
    assert.equal(report.complete,true,report.issues.join('; '));
    assert.deepEqual(report.mappings,[{oldKey:'wearables.gehausegrosse',newKey:'wearables.case_size',technicalValue:'44',expectedDisplayLabel:'44mm'}]);
    assert.deepEqual(f.engine.verifyAfterFill(report,observation),[]);
    assert.equal(report.comparison.status,'schema-changed');
  });
  await check('no automatic mapping across category identities',async()=>{
    const f=fixture({category:'406'}),{report}=await f.complete();
    assert.equal(report.complete,false);
    assert.ok(report.issues.some(x=>x.includes('nicht vorhanden')));
  });
  await check('migrated technical ID is absent from offered options -> stop',async()=>{
    const f=fixture({savedValue:'48'}),{report}=await f.complete();
    assert.equal(report.complete,false);
    assert.ok(report.issues.some(x=>x.includes('nicht angeboten')));
  });
  await check('technical value matches but display option cannot be proven -> stop',async()=>{
    const f=fixture({options:false}),{report}=await f.complete();
    assert.equal(report.complete,false);
    assert.ok(report.issues.some(x=>x.includes('nicht eindeutig')));
  });
  await check('technical value matches but rendered label differs -> stop after fill',async()=>{
    const f=fixture({label:'Bitte wählen'}),{report,observation}=await f.complete();
    assert.equal(report.complete,true);
    assert.ok(f.engine.verifyAfterFill(report,observation).some(x=>x.includes('sichtbarer Auswahlwert')));
  });
  await check('legacy unversioned template never invents a prior fingerprint',async()=>{
    const f=fixture({legacy:true}),{report}=await f.complete();
    assert.equal(report.complete,true);
    assert.equal(report.sourceFingerprint,null);
    assert.equal(report.comparison.status,'legacy-unversioned');
    assert.ok(report.warnings.some(x=>x.includes('Ältere Vorlage')));
  });
  await check('missing populated original field blocks before time-consuming retries',async()=>{
    const f=fixture({caseSize:false}),{report}=await f.complete();
    assert.equal(report.complete,false);
    assert.ok(report.issues.some(x=>x.includes('nicht vorhanden')));
  });
  await check('new empty optional field is harmless',async()=>{
    const f=fixture(),form=f.document.querySelector('form');
    const cb=f.document.createElement('input');cb.type='checkbox';cb.name='attributeMap[wearables.other]';form.append(cb);
    const {report}=await f.complete();assert.equal(report.complete,true,report.issues.join('; '));
  });
  await check('new missing required field blocks before publication',async()=>{
    const f=fixture({requiredNew:true}),{report}=await f.complete();
    assert.equal(report.complete,false);
    assert.ok(report.issues.some(x=>x.includes('Pflichtmerkmal')));
  });
  await check('matching fingerprint never bypasses exact saved-value checks',async()=>{
    const f=fixture({savedKey:'wearables.case_size',savedValue:'46'}),{report}=await f.complete();
    assert.equal(report.complete,true);
    assert.equal(report.comparison.status,'schema-changed'); // differing snapshot field option evidence
    f.document.querySelector('input[name="attributeMap[wearables.case_size]"]').value='44';
    const verify=require('../src/content/template-verification.js').create({checkedRadio:()=>null});
    assert.ok(verify.verify({categoryId:405,dynamicAttributes:[oldAttr('wearables.case_size','46')]},f.document)
      .some(x=>x.includes('case_size')));
  });
  await check('changed stored fingerprint is rejected, no silent tamper override',async()=>{
    const f=fixture();f.template.templateSchema.fingerprint='0'.repeat(64);
    const obs=f.engine.inspectForm(f.document.querySelector('form'),f.template.categoryId,f.document);
    const report=await f.engine.evaluate(f.template,obs);
    assert.equal(report.complete,false);
    assert.ok(report.issues.some(x=>x.includes('Prüfsumme')));
  });
  await check('unknown saved schema version is rejected',async()=>{
    const f=fixture();f.template.templateSchema.snapshot.schemaVersion=17;
    const obs=f.engine.inspectForm(f.document.querySelector('form'),f.template.categoryId,f.document);
    const report=await f.engine.evaluate(f.template,obs);
    assert.equal(report.complete,false);
  });
  await check('duplicate technical control fails closed',async()=>{
    const f=fixture({duplicate:true});
    assert.throws(()=>f.engine.inspectForm(f.document.querySelector('form'),f.template.categoryId,f.document),/mehrfach/);
  });
  await check('incorrect category ID fails closed independently of schema hash',async()=>{
    const f=fixture();f.document.querySelector('[name="categoryId"]').value='999';
    assert.throws(()=>f.engine.inspectForm(f.document.querySelector('form'),f.template.categoryId,f.document),/Kategorie/);
  });
  await check('in-flight hydration is not treated as a finished form',async()=>{
    const f=fixture({busy:true});
    assert.throws(()=>f.engine.inspectForm(f.document.querySelector('form'),f.template.categoryId,f.document),/geladen/);
  });
  await check('bounded hydration observes the exact form repeatedly without changing it',async()=>{
    const f=fixture();const obs=await f.engine.afterHydration(f.template);
    assert.equal(obs.categoryId,'405');assert.equal(obs.dynamicCount,2);
  });
  await check('unhydrated missing category attributes cannot be approved',async()=>{
    const f=fixture({caseSize:false,checkbox:false});
    await assert.rejects(f.engine.afterHydration(f.template),/fehlen/);
  });
  await check('category-specific checkbox true state remains a native boolean',async()=>{
    const f=fixture();const obs=f.engine.inspectForm(f.document.querySelector('form'),405,f.document);
    assert.equal(obs.readbacks['wearables.bluetooth'],true);
    assert.equal(obs.schema.fields.find(x=>x.key==='attribute:wearables.bluetooth').kind,'checkbox');
  });
  console.log(passed+'/19 PASS KAR-134 schema capture/preflight');
})().catch(error=>{console.error(error);process.exitCode=1});
