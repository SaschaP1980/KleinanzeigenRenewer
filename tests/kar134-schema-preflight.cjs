'use strict';
// Synthetic technical 405 fixtures derived from owner's observed field names, NOT copied private archives.
const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const { webcrypto } = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const fillerSource = fs.readFileSync(require.resolve('../src/content/template-filler.js'),'utf8');
const policyStart = fillerSource.indexOf('  function assessSyntheticCaseSize(');
const policyEnd = fillerSource.indexOf('  // KAR-134 field-only native simulation.', policyStart);
assert.ok(policyStart > 0 && policyEnd > policyStart, 'private schema-test policy must be isolated before any page writes');
const assessSyntheticCaseSize = vm.runInNewContext(
  fillerSource.slice(policyStart, policyEnd) + '\nassessSyntheticCaseSize;',
  { Object, Array }, { filename: 'kar134-read-only-policy.js' });

globalThis.crypto ||= webcrypto;
require('../src/shared/runtime-deps.js');
const Schema = require('../src/shared/template-schema-core.js');
const Preflight = require('../src/content/template-schema-preflight.js');
let passed = 0;
const check = async (label, run) => { await run(); passed++; console.log('PASS KAR-134 preflight: '+label); };
const oldAttr = (key,value,display='') => ({ key, technicalValue:value, displayValue:display, label:key, controlType:'text' });
const syntheticCaseAttr = (value, display='synthetic') => ({
  ...oldAttr('wearables.gehausegrosse', value, display),
  label: 'Gehäusegröße (synthetischer Test)', status: 'captured'
});
function fixture({ category='405', caseSize=true, label='44mm', caseValue='44',
  options=true, checkbox=true, bluetoothRequired=false, requiredNew=false, busy=false, duplicate=false, legacy=false,
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
  const checkedBluetooth = document.querySelector('input[name="attributeMap[wearables.bluetooth]"]');
  if (checkedBluetooth) checkedBluetooth.checked = true; // linkedom does not hydrate HTML checked property like a browser
  const definitions = {};
  if (caseSize) definitions['wearables.case_size']={ required: false,
    ...(options ? { localizedOptions: [{ value:'44', localizedValue:'44mm' },{ value:'46', localizedValue:'46mm' }] } : {}) };
  if (checkbox) definitions['wearables.bluetooth'] = { required: bluetoothRequired };
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
    const f=fixture();f.template.templateSchema.snapshot={...f.template.templateSchema.snapshot,schemaVersion:17};
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
  await check('required checkbox must be checked at final readback, not just present as boolean false',async()=>{
    const f=fixture({bluetoothRequired:true});
    const {report,observation}=await f.complete();
    const control=f.document.querySelector('input[name="attributeMap[wearables.bluetooth]"]');
    control.checked=false;
    const failures=f.engine.verifyAfterFill({...report,complete:true},observation);
    assert.ok(failures.some(issue=>issue.includes('wearables.bluetooth')),failures.join(';'));
  });
  await check('legacy previously visible selection with no technical value blocks instead of being discarded',async()=>{
    const f=fixture({legacy:true});
    f.template.dynamicAttributes[0].technicalValue=null;
    f.template.dynamicAttributes[0].displayValue='44mm';
    f.template.dynamicAttributes[0].status='captured';
    const {report}=await f.complete();
    assert.equal(report.complete,false);
    assert.ok(report.issues.some(issue=>issue.includes('ohne eindeutig gespeicherten technischen Wert')));
  });
  await check('truly empty optional selection with no saved value never blocks',async()=>{
    const f=fixture({legacy:true});
    f.template.dynamicAttributes[0].technicalValue='';
    f.template.dynamicAttributes[0].displayValue='Bitte auswählen';
    f.template.dynamicAttributes[0].status='empty';
    const {report}=await f.complete();
    assert.equal(report.complete,true,report.issues.join(';'));
  });

  await check('read-only 405 simulation accepts 44/44mm on current select and reports synthetic schema drift',async()=>{
    const f=fixture();
    const observed=f.engine.inspectForm(f.document.querySelector('form'),405,f.document);
    const focused={...observed,schema:{...observed.schema,fields:observed.schema.fields.filter(field=>field.key==='attribute:wearables.case_size')}};
    const old=Schema.buildSchema({categoryId:'405',dynamicAttributes:[{key:'wearables.gehausegrosse',controlType:'number'}]});
    const source={categoryId:'405',templateSchema:{snapshot:old,fingerprint:await Schema.fingerprint(old)},
      dynamicAttributes:[oldAttr('wearables.gehausegrosse','44','44mm')]};
    const report=await f.engine.evaluate(source,focused);
    assert.equal(report.complete,true,report.issues.join(';'));
    assert.equal(report.comparison.status,'schema-changed');
    assert.equal(report.mappings.length,1);
    assert.equal(report.mappings[0].expectedDisplayLabel,'44mm');
    const assessment=assessSyntheticCaseSize('compatible',focused,report,'__KAR134_UNREPRESENTABLE_CASE_SIZE__');
    assert.equal(assessment.verdict,true);
    assert.equal(assessment.optionEvidenceComplete,true);
    assert.equal(assessment.mapping44Proven,true);
  });
  await check('read-only 405 simulation blocks guaranteed absent technical option',async()=>{
    const f=fixture();
    const observed=f.engine.inspectForm(f.document.querySelector('form'),405,f.document);
    const focused={...observed,schema:{...observed.schema,fields:observed.schema.fields.filter(field=>field.key==='attribute:wearables.case_size')}};
    const old=Schema.buildSchema({categoryId:'405',dynamicAttributes:[{key:'wearables.gehausegrosse',controlType:'number'}]});
    const source={categoryId:'405',templateSchema:{snapshot:old,fingerprint:await Schema.fingerprint(old)},
      dynamicAttributes:[syntheticCaseAttr('__KAR134_UNREPRESENTABLE_CASE_SIZE__')]};
    const report=await f.engine.evaluate(source,focused);
    assert.equal(report.complete,false);
    assert.ok(report.issues.some(issue=>issue.includes('nicht angeboten')));
    const assessment=assessSyntheticCaseSize('incompatible',focused,report,'__KAR134_UNREPRESENTABLE_CASE_SIZE__');
    assert.equal(assessment.verdict,true);
    assert.equal(assessment.specificInvalidRejectionProven,true);
  });
  await check('read-only test branch precedes filler/publisher and has no write primitive',async()=>{
    const fs=require('node:fs');
    const filler=fs.readFileSync(require.resolve('../src/content/template-filler.js'),'utf8');
    const background=fs.readFileSync(require.resolve('../src/background/controllers/template-fill-controller.js'),'utf8');
    const probe=filler.slice(filler.indexOf('async function runReadOnlySchemaTest'),filler.indexOf('async function runFillSession'));
    assert.ok(probe.includes('SchemaPreflight.afterHydration'));
    assert.ok(probe.includes('SchemaPreflight.evaluate'));
    for(const forbidden of ['fillDynamicAttributes(', 'uploadImages(', 'advanceAfterVerifiedFill(', 'autoPublishVerifiedRenewal(', 'button.click(', 'submit(', 'requestSubmit('])
      assert.ok(!probe.includes(forbidden),'unexpected write path in read-only probe: '+forbidden);
    assert.ok(filler.indexOf('if (session.schemaTestScenario)')<filler.indexOf("if (kind === 'post-fill' ||"));
    assert.ok(background.includes('schemaTestScenario: isSchemaTest ? schemaTestScenario : null'));
    assert.ok(background.includes("if (isSchemaTest) {"));
  });

  await check('unproven live options make both native scenarios inconclusive, not falsely green',async()=>{
    const f=fixture({options:false});
    const observed=f.engine.inspectForm(f.document.querySelector('form'),405,f.document);
    const focused={...observed,schema:{...observed.schema,fields:observed.schema.fields.filter(field=>field.key==='attribute:wearables.case_size')}};
    const old=Schema.buildSchema({categoryId:'405',dynamicAttributes:[{key:'wearables.gehausegrosse',controlType:'number'}]});
    for(const scenario of ['compatible','incompatible']){
      const technicalValue=scenario==='compatible'?'44':'__KAR134_UNREPRESENTABLE_CASE_SIZE__';
      const source={categoryId:'405',templateSchema:{snapshot:old,fingerprint:await Schema.fingerprint(old)},
        dynamicAttributes:[syntheticCaseAttr(technicalValue,'44mm')]};
      const report=await f.engine.evaluate(source,focused);
      assert.equal(report.complete,false);
      const verdict=assessSyntheticCaseSize(scenario,focused,report,'__KAR134_UNREPRESENTABLE_CASE_SIZE__');
      assert.equal(verdict.verdict,false,'no option list is not proof of a correct rejection');
      assert.equal(verdict.optionEvidenceComplete,false);
      assert.equal(verdict.evidenceState,'case-size-option-evidence-missing');
    }
  });
  await check('missing case-size technical field cannot produce false-positive negative test',async()=>{
    const f=fixture({caseSize:false});
    const observed=f.engine.inspectForm(f.document.querySelector('form'),405,f.document);
    const old=Schema.buildSchema({categoryId:'405',dynamicAttributes:[{key:'wearables.gehausegrosse',controlType:'number'}]});
    const source={categoryId:'405',templateSchema:{snapshot:old,fingerprint:await Schema.fingerprint(old)},
      dynamicAttributes:[syntheticCaseAttr('__KAR134_UNREPRESENTABLE_CASE_SIZE__')]};
    const report=await f.engine.evaluate(source,observed);
    assert.equal(report.complete,false);
    const verdict=assessSyntheticCaseSize('incompatible',observed,report,'__KAR134_UNREPRESENTABLE_CASE_SIZE__');
    assert.equal(verdict.verdict,false);
    assert.equal(verdict.caseFieldPresent,false);
    assert.equal(verdict.evidenceState,'case-size-field-missing');
  });
  await check('generic form mismatch alone is never proof that invalid technical ID was rejected',async()=>{
    const f=fixture();
    const observed=f.engine.inspectForm(f.document.querySelector('form'),405,f.document);
    const focused={...observed,schema:{...observed.schema,fields:observed.schema.fields.filter(field=>field.key==='attribute:wearables.case_size')}};
    const generic={complete:false,issues:['Neue Auswahl ist nicht eindeutig bestätigt.'],mappings:[]};
    const verdict=assessSyntheticCaseSize('incompatible',focused,generic,'__KAR134_UNREPRESENTABLE_CASE_SIZE__');
    assert.equal(verdict.optionEvidenceComplete,true);
    assert.equal(verdict.verdict,false);
    assert.equal(verdict.specificInvalidRejectionProven,false);
    assert.equal(verdict.evidenceState,'invalid-value-rejection-not-proven');
  });
  await check('visible 44mm label remains required even with valid technical option 44',async()=>{
    const f=fixture();
    const observed=f.engine.inspectForm(f.document.querySelector('form'),405,f.document);
    const focused={...observed,schema:{...observed.schema,fields:observed.schema.fields.filter(field=>field.key==='attribute:wearables.case_size')}};
    const old=Schema.buildSchema({categoryId:'405',dynamicAttributes:[{key:'wearables.gehausegrosse',controlType:'number'}]});
    const source={categoryId:'405',templateSchema:{snapshot:old,fingerprint:await Schema.fingerprint(old)},
      dynamicAttributes:[oldAttr('wearables.gehausegrosse','44','44mm')]};
    const report=await f.engine.evaluate(source,focused);
    assert.equal(report.complete,true);
    const stale={...focused,optionLabels:{...focused.optionLabels,
      'wearables.case_size':[{value:'44',label:'44 mm'}]}};
    const verdict=assessSyntheticCaseSize('compatible',stale,report,'__KAR134_UNREPRESENTABLE_CASE_SIZE__');
    assert.equal(verdict.verdict,false);
    assert.equal(verdict.technical44Offered,true);
    assert.equal(verdict.visible44mmProven,false);
  });
  console.log(passed+'/29 PASS KAR-134 schema capture/preflight');
})().catch(error=>{console.error(error);process.exitCode=1});
