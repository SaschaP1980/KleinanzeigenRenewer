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
const assessSyntheticRemovedField = vm.runInNewContext(
  fillerSource.slice(policyStart, policyEnd) +
    '\n(typeof assessSyntheticRemovedField === "function" ? assessSyntheticRemovedField : null);',
  { Object, Array }, { filename: 'kar134-removed-field-policy.js' });

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
  await check('read-only generic category check transports only bounded Art/Typ navigation labels', async()=>{
    const now = new Date().toISOString();
    const records = {
      shoe: {inventoryId:'shoe',category:{id:159,path:['Mode & Beauty','Damenschuhe']},
        title:'PRIVATE TITLE',description:'PRIVATE DESCRIPTION',price:{value:12345},
        dynamicAttributes:[
          {key:'shoes.art',label:'Art',displayValue:'Sneaker & Sportschuhe',technicalValue:'secret-art-code'},
          {key:'shoes.color',label:'Farbe',displayValue:'PRIVATE COLOR',technicalValue:'private'},
          {key:'shoes.type',label:'Typ',displayValue:'Schuhe',technicalValue:'secret-type-code'}],
        images:[{imageKey:'PRIVATE-IMAGE'}]},
      watch: {inventoryId:'watch',category:{id:405,path:['Elektronik','Wearables']},
        dynamicAttributes:[{label:'Typ',displayValue:'Smartwatches'}]}
    };
    const db={templateFillSessions:{
      first:{fillId:'first',inventoryId:'shoe',schemaTestScenario:'category-check',
        targetTabId:71,status:'waiting',createdAt:now},
      second:{fillId:'second',inventoryId:'watch',schemaTestScenario:'compatible',
        targetTabId:72,status:'waiting',createdAt:now}
    }};
    const service=require('../src/background/services/template-fill-service.js').create({
      storageLocal:{get:async()=>db,set:async()=>{}},getInventory:async id=>records[id]
    });
    const shoe=await service.getTemplateFillSession({tab:{id:71}});
    assert.equal(shoe.template.categoryId,159);
    assert.deepEqual(shoe.template.categoryPath,['Mode & Beauty','Damenschuhe']);
    assert.deepEqual(shoe.template.dynamicAttributes,[]);
    assert.deepEqual(shoe.template.categoryNavigationHints,[
      {label:'Art',displayValue:'Sneaker & Sportschuhe'},
      {label:'Typ',displayValue:'Schuhe'}]);
    const serialized=JSON.stringify(shoe.template);
    for(const secret of ['PRIVATE TITLE','PRIVATE DESCRIPTION','PRIVATE COLOR','PRIVATE-IMAGE',
      'secret-art-code','secret-type-code','12345'])
      assert.equal(serialized.includes(secret),false,'schema test must not carry content: '+secret);
    const watch=await service.getTemplateFillSession({tab:{id:72}});
    assert.equal(watch.template.categoryNavigationHints,undefined,
      'only the generic category checker can receive restricted structural choice metadata');
  });
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

  await check('read-only 405 probe opens an exact linked popup and proves explicit technical IDs without selection', async()=>{
    const f=fixture({options:false});
    const control=f.document.getElementById('wearables.case_size');
    const technical=f.document.querySelector('input[name="attributeMap[wearables.case_size]"]');
    control.setAttribute('aria-controls','case-size-test-popup');
    let clicks=0;
    control.addEventListener('click',()=>{
      clicks++;
      const popup=f.document.createElement('div');
      popup.id='case-size-test-popup';
      popup.setAttribute('role','listbox');
      popup.getClientRects=()=>[{}];
      popup.innerHTML='<div role="option" data-value="44">44mm</div><div role="option" data-value="46">46mm</div>';
      f.document.body.append(popup);
    });
    const original=technical.value;
    const observed=await f.engine.afterHydration(
      {categoryId:'405',dynamicAttributes:[]}, {probeReadOnlyCaseSize:true});
    assert.equal(clicks,1);
    assert.equal(technical.value,original,'opening a dropdown cannot set a form value');
    assert.equal(observed.optionProbe.verified,true);
    assert.equal(observed.optionProbe.explicitTechnicalOptionCount,2);
    assert.deepEqual(observed.schema.fields.find(x=>x.key==='attribute:wearables.case_size').optionValues,['44','46']);
    assert.deepEqual(observed.optionLabels['wearables.case_size'],[
      {value:'44',label:'44mm'},{value:'46',label:'46mm'}]);
    const old=Schema.buildSchema({categoryId:'405',dynamicAttributes:[{key:'wearables.gehausegrosse',controlType:'number'}]});
    const source={categoryId:'405',templateSchema:{snapshot:old,fingerprint:await Schema.fingerprint(old)},
      dynamicAttributes:[syntheticCaseAttr('44','44mm')]};
    const focused={...observed,schema:{...observed.schema,fields:observed.schema.fields.filter(x=>x.key==='attribute:wearables.case_size')}};
    const report=await f.engine.evaluate(source,focused);
    assert.equal(assessSyntheticCaseSize('compatible',focused,report,'__KAR134_UNREPRESENTABLE_CASE_SIZE__').verdict,true);
  });
  await check('unlinked custom popup without technical ID cannot be mislabeled as a verified selection',async()=>{
    const f=fixture({options:false});
    const control=f.document.getElementById('wearables.case_size');
    control.setAttribute('aria-controls','case-size-missing-ids');
    control.addEventListener('click',()=>{
      const popup=f.document.createElement('div');
      popup.id='case-size-missing-ids';
      popup.setAttribute('role','listbox');
      popup.getClientRects=()=>[{}];
      popup.innerHTML='<div role="option">44mm</div><div role="option">46mm</div>';
      f.document.body.append(popup);
    });
    const observed=await f.engine.afterHydration(
      {categoryId:'405',dynamicAttributes:[]},{probeReadOnlyCaseSize:true});
    assert.equal(observed.optionProbe.popupFound,true);
    assert.equal(observed.optionProbe.renderedOptionCount,2);
    assert.equal(observed.optionProbe.explicitTechnicalOptionCount,0);
    assert.equal(observed.optionProbe.verified,false);
    assert.equal(observed.optionProbe.reason,'popup-technical-ids-not-proven');
    assert.equal(observed.schema.fields.find(x=>x.key==='attribute:wearables.case_size').optionValues,null);
  });
  await check('normal production hydration never opens a dropdown as side effect',async()=>{
    const f=fixture({options:false});
    const control=f.document.getElementById('wearables.case_size');
    let clicks=0;
    control.addEventListener('click',()=>{clicks++;});
    const observed=await f.engine.afterHydration({categoryId:'405',dynamicAttributes:[]});
    assert.equal(clicks,0);
    assert.equal(observed.optionProbe,undefined);
  });
  await check('case-size option probe never infers technical IDs from labels alone',async()=>{
    const f=fixture({options:false});
    const control=f.document.getElementById('wearables.case_size');
    control.setAttribute('aria-controls','case-size-unexpected-value');
    control.addEventListener('click',()=>{
      const popup=f.document.createElement('div');
      popup.id='case-size-unexpected-value';
      popup.setAttribute('role','listbox');
      popup.getClientRects=()=>[{}];
      popup.innerHTML='<div role="option" data-value="size-44">44mm</div>';
      f.document.body.append(popup);
    });
    const observed=await f.engine.afterHydration({categoryId:'405',dynamicAttributes:[]},
      {probeReadOnlyCaseSize:true});
    assert.equal(observed.optionProbe.verified,true);
    const focused={...observed,schema:{...observed.schema,fields:observed.schema.fields.filter(x=>x.key==='attribute:wearables.case_size')}};
    const old=Schema.buildSchema({categoryId:'405',dynamicAttributes:[{key:'wearables.gehausegrosse',controlType:'number'}]});
    const source={categoryId:'405',templateSchema:{snapshot:old,fingerprint:await Schema.fingerprint(old)},
      dynamicAttributes:[syntheticCaseAttr('44','44mm')]};
    const report=await f.engine.evaluate(source,focused);
    assert.equal(report.complete,false);
    assert.equal(assessSyntheticCaseSize('compatible',focused,report,'__KAR134_UNREPRESENTABLE_CASE_SIZE__').verdict,false);
  });

  // KAR-134 Wave I: these exact pairs were independently measured by the owner
  // after manual selection on the unpublished category-405 site form.
  function attachOwnerCaseSizePopup(f, labels=['Bitte wählen','38mm','44mm','45mm','Andere Größe']) {
    const control=f.document.getElementById('wearables.case_size');
    control.setAttribute('aria-controls','wearables.case_size-menu');
    let opens=0;
    control.addEventListener('click',()=>{
      opens++;
      const popup=f.document.createElement('ul');
      popup.id='wearables.case_size-menu';
      popup.setAttribute('role','listbox');
      popup.getClientRects=()=>[{}];
      popup.innerHTML=labels.map(label=>'<li role="option"><div>'+label+'</div></li>').join('');
      f.document.body.append(popup);
    });
    return {control,get opens(){return opens;}};
  }
  await check('owner-confirmed 405 pairs 44mm/44 and 38mm/38 map with label-only popup but no invented complete option schema',async()=>{
    for(const [technical,label] of [['44','44mm'],['38','38mm']]){
      const f=fixture({options:false,caseValue:'',savedValue:technical});
      const pop=attachOwnerCaseSizePopup(f);
      f.template.templateSchema.fingerprint=await Schema.fingerprint(f.template.templateSchema.snapshot);
      const observed=await f.engine.afterHydration(f.template);
      assert.equal(pop.opens,1);
      assert.equal(observed.optionProbe.reason,'owner-confirmed-case-size-pairs');
      assert.equal(observed.optionProbe.ownerVerifiedPairCount,2);
      assert.equal(observed.optionProbe.verified,false,'subset cannot be marked as a complete technical catalog');
      assert.equal(observed.schema.fields.find(x=>x.key==='attribute:wearables.case_size').optionValues,null);
      assert.deepEqual(observed.optionLabels['wearables.case_size'],[
        {value:'38',label:'38mm'},{value:'44',label:'44mm'}]);
      const report=await f.engine.evaluate(f.template,observed);
      assert.equal(report.complete,true,report.issues.join(';'));
      assert.deepEqual(report.mappings,[{oldKey:'wearables.gehausegrosse',
        newKey:'wearables.case_size',technicalValue:technical,expectedDisplayLabel:label}]);
      const hidden=f.document.querySelector('input[name="attributeMap[wearables.case_size]"]');
      hidden.value=technical;pop.control.textContent=label;
      const after=f.engine.inspectForm(f.document.querySelector('form'),405,f.document);
      assert.deepEqual(f.engine.verifyAfterFill(report,after),[]);
    }
  });
  await check('owner-confirmed pairs never bypass post-fill technical and displayed label readback',async()=>{
    const f=fixture({options:false,caseValue:'',savedValue:'44'});
    const pop=attachOwnerCaseSizePopup(f);
    f.template.templateSchema.fingerprint=await Schema.fingerprint(f.template.templateSchema.snapshot);
    const observed=await f.engine.afterHydration(f.template);
    const report=await f.engine.evaluate(f.template,observed);
    assert.equal(report.complete,true);
    const technical=f.document.querySelector('input[name="attributeMap[wearables.case_size]"]');
    technical.value='38';pop.control.textContent='44mm';
    let after=f.engine.inspectForm(f.document.querySelector('form'),405,f.document);
    assert.ok(f.engine.verifyAfterFill(report,after).some(x=>x.includes('technischer Wert')));
    technical.value='44';pop.control.textContent='38mm';
    after=f.engine.inspectForm(f.document.querySelector('form'),405,f.document);
    assert.ok(f.engine.verifyAfterFill(report,after).some(x=>x.includes('sichtbarer Auswahlwert')));
  });
  await check('other displayed case sizes remain blocked without owner-proven technical mapping',async()=>{
    const f=fixture({options:false,caseValue:'',savedValue:'45'});
    const pop=attachOwnerCaseSizePopup(f);
    f.template.templateSchema.fingerprint=await Schema.fingerprint(f.template.templateSchema.snapshot);
    const observed=await f.engine.afterHydration(f.template,{probeReadOnlyCaseSize:true});
    assert.equal(pop.opens,1);
    assert.equal(observed.optionProbe.ownerVerifiedPairCount,2);
    const report=await f.engine.evaluate(f.template,observed);
    assert.equal(report.complete,false);
    assert.ok(report.issues.some(x=>x.includes('nicht eindeutig')));
    assert.equal(observed.schema.fields.find(x=>x.key==='attribute:wearables.case_size').optionValues,null);
  });
  await check('duplicate visible 44mm options cannot gain owner-pair authority',async()=>{
    const f=fixture({options:false,caseValue:'',savedValue:'44'});
    attachOwnerCaseSizePopup(f,['Bitte wählen','44mm','44mm','Andere Größe']);
    f.template.templateSchema.fingerprint=await Schema.fingerprint(f.template.templateSchema.snapshot);
    const observed=await f.engine.afterHydration(f.template);
    assert.notEqual(observed.optionProbe.reason,'owner-confirmed-case-size-pairs');
    assert.equal(observed.optionProbe.ownerVerifiedPairCount||0,0);
    const report=await f.engine.evaluate(f.template,observed);
    assert.equal(report.complete,false);
  });
  // Wave J: a missing archived technical field is provable from the full live
  // schema even when technical dropdown options are unknown. It does not
  // prove that any real Kleinanzeigen field was actually removed.
  await check('native synthetic removed-field drift proves specific preflight rejection without a technical option catalog',async()=>{
    const f=fixture({options:false,caseValue:''});
    const observed=f.engine.inspectForm(f.document.querySelector('form'),405,f.document);
    const key='wearables.__kar134_removed_field_probe__';
    const label='KAR-134 Testmerkmal (synthetisch)';
    const snapshot=Schema.buildSchema({categoryId:'405',dynamicAttributes:[
      {key,controlType:'text',requiredState:'optional'}]});
    const template={categoryId:'405',templateSchema:{snapshot,fingerprint:await Schema.fingerprint(snapshot)},
      dynamicAttributes:[{...oldAttr(key,'SAVED_TEST_VALUE','synthetisch'),label,status:'captured'}]};
    const report=await f.engine.evaluate(template,observed);
    assert.equal(report.complete,false);
    assert.equal(observed.schema.fields.find(x=>x.key==='attribute:wearables.case_size').optionValues,null);
    assert.ok(report.issues.some(x=>x.includes(label) && x.includes('nicht vorhanden')));
    assert.equal(typeof assessSyntheticRemovedField,'function','native removed-field policy not implemented');
    const result=assessSyntheticRemovedField(observed,report,key,label);
    assert.equal(result.verdict,true);
    assert.equal(result.evidenceState,'synthetic-removed-field-proven');
    assert.equal(result.missingSavedFieldRejectionProven,true);
    assert.equal(result.caseFieldPresent,true);
  });
  await check('native removed-field negative cannot pass if synthetic key is offered by live form',async()=>{
    const f=fixture({options:false});
    const key='wearables.__kar134_removed_field_probe__',label='KAR-134 Testmerkmal (synthetisch)';
    const input=f.document.createElement('input');
    input.name='attributeMap['+key+']';input.type='text';input.value='';
    f.document.querySelector('form').append(input);
    const observed=f.engine.inspectForm(f.document.querySelector('form'),405,f.document);
    const snapshot=Schema.buildSchema({categoryId:'405',dynamicAttributes:[{key,controlType:'text'}]});
    const template={categoryId:'405',templateSchema:{snapshot,fingerprint:await Schema.fingerprint(snapshot)},
      dynamicAttributes:[{...oldAttr(key,'SAVED_TEST_VALUE'),label,status:'captured'}]};
    const report=await f.engine.evaluate(template,observed);
    assert.equal(typeof assessSyntheticRemovedField,'function');
    const result=assessSyntheticRemovedField(observed,report,key,label);
    assert.equal(result.verdict,false);
    assert.equal(result.evidenceState,'synthetic-field-present');
  });
  await check('native removed-field negative rejects generic error or unverified category',async()=>{
    const f=fixture({options:false});
    const observed=f.engine.inspectForm(f.document.querySelector('form'),405,f.document);
    const key='wearables.__kar134_removed_field_probe__',label='KAR-134 Testmerkmal (synthetisch)';
    assert.equal(typeof assessSyntheticRemovedField,'function');
    const unrelated={complete:false,comparison:{status:'schema-changed'},
      issues:['Ein neues Pflichtmerkmal ist nicht gesetzt.']};
    assert.equal(assessSyntheticRemovedField(observed,unrelated,key,label).verdict,false);
    assert.equal(assessSyntheticRemovedField({...observed,categoryId:'406'},unrelated,key,label).verdict,false);
    const misleading={...unrelated,issues:['Gespeichertes Merkmal „'+label+'“ ist im neuen Formular nicht vorhanden.']};
    assert.equal(assessSyntheticRemovedField({...observed,categoryId:'406'},misleading,key,label).verdict,false);
  });
  await check('positive read-only 405 simulation recognizes owner-proven pair while negative remains inconclusive',async()=>{
    const f=fixture({options:false,caseValue:''});
    attachOwnerCaseSizePopup(f);
    const observed=await f.engine.afterHydration({categoryId:'405',dynamicAttributes:[]},{probeReadOnlyCaseSize:true});
    const focused={...observed,schema:{...observed.schema,fields:observed.schema.fields.filter(x=>x.key==='attribute:wearables.case_size')}};
    const old=Schema.buildSchema({categoryId:'405',dynamicAttributes:[{key:'wearables.gehausegrosse',controlType:'number'}]});
    const fp=await Schema.fingerprint(old);
    const positive={categoryId:'405',templateSchema:{snapshot:old,fingerprint:fp},
      dynamicAttributes:[syntheticCaseAttr('44','44mm')]};
    const pass=await f.engine.evaluate(positive,focused);
    assert.equal(pass.complete,true);
    const positiveAssessment=assessSyntheticCaseSize('compatible',focused,pass,'__KAR134_UNREPRESENTABLE_CASE_SIZE__');
    assert.equal(positiveAssessment.verdict,true);
    assert.equal(positiveAssessment.optionEvidenceComplete,false);
    assert.equal(positiveAssessment.ownerVerifiedPair44,true);
    const negative={...positive,dynamicAttributes:[syntheticCaseAttr('__KAR134_UNREPRESENTABLE_CASE_SIZE__')]};
    const deny=await f.engine.evaluate(negative,focused);
    assert.equal(deny.complete,false);
    assert.equal(assessSyntheticCaseSize('incompatible',focused,deny,'__KAR134_UNREPRESENTABLE_CASE_SIZE__').verdict,false);
  });

  // Wave K2: runtime stage monitoring is tested with a synthetic create-form
  // and in-memory extension storage, never with actual Kleinanzeigen data.
  function monitoringPolicy() {
    const start=fillerSource.indexOf('  // KAR-134 K2 monitoring helpers');
    const end=fillerSource.indexOf('  // KAR-134 field-only native simulation.',start);
    assert.ok(start>0&&end>start,'F1/F2/F3 runtime monitoring helpers must be present');
    const context={
      SchemaCore:Schema,chrome:{storage:{local:{}}},
      globalThis:{crypto:webcrypto},Object,Array,Set,Map,Promise,
      document:{},visible:el=>el?.type!=='hidden',visibleText:el=>el?.textContent||'',
      diagnostic:()=>Promise.resolve(),registerSchemaMonitorWarning:()=>{},console
    };
    return vm.runInNewContext(fillerSource.slice(start,end)+
      '\n({captureCategoryNeutralForm, monitorSchemaStage});',context,
      {filename:'kar134-live-monitor-policy.js'});
  }
  const testStorage=()=>{
    const map=new Map();let writes=0;
    return {map,get writes(){return writes;},async get(key){return {[key]:map.get(key)};},
      async set(record){writes++;for(const[k,v]of Object.entries(record))map.set(k,v);}};
  };
  const neutralDom=()=>parseHTML('<html><body><form>'+
    '<input name="categoryId" type="hidden" value="">'+
    '<input name="title" value="PRIVATE TITLE">'+
    '<textarea name="description">PRIVATE TEXT</textarea>'+
    '<input type="hidden" name="csrfToken" value="SECRET">'+
    '<button type="button">Wähle deine Kategorie</button></form></body></html>').document;
  await check('F1 runtime captures real visible neutral controls without values or hidden identifiers',async()=>{
    const monitor=monitoringPolicy(),doc=neutralDom(),form=doc.querySelector('form');
    const result=monitor.captureCategoryNeutralForm(form,el=>el.getAttribute('type')!=='hidden',el=>el.textContent);
    assert.equal(result.status,'observed');
    assert.equal(result.schema.formMode,'posting-create');
    assert.equal(result.schema.categoryChooser,'button');
    assert.ok(result.schema.fields.some(x=>x.key==='field:title'));
    assert.ok(result.schema.fields.some(x=>x.key==='field:description'));
    assert.ok(!JSON.stringify(result.schema).includes('PRIVATE TITLE'));
    assert.ok(!JSON.stringify(result.schema).includes('SECRET'));
    form.querySelector('input[name="title"]').value='CHANGED SECRET';
    const unchanged=monitor.captureCategoryNeutralForm(form,el=>el.getAttribute('type')!=='hidden',el=>el.textContent);
    assert.equal(await Schema.baseFingerprint(result.schema,webcrypto),
      await Schema.baseFingerprint(unchanged.schema,webcrypto));
  });
  await check('F1 runtime skips preselected categories and loading forms, never invents initial baseline',()=>{
    const monitor=monitoringPolicy(),doc=neutralDom(),form=doc.querySelector('form');
    form.querySelector('input[name="categoryId"]').value='405';
    assert.equal(monitor.captureCategoryNeutralForm(form,()=>true,el=>el.textContent).status,'category-already-selected');
    form.querySelector('input[name="categoryId"]').value='';
    const spinner=doc.createElement('span');spinner.setAttribute('aria-busy','true');form.append(spinner);
    assert.equal(monitor.captureCategoryNeutralForm(form,()=>true,el=>el.textContent).status,'form-not-settled');
  });
  await check('stage monitoring creates a persistent first reference and then reads it without overwriting',async()=>{
    const monitor=monitoringPolicy(),storage=testStorage(),notices=[],events=[];
    const first=Schema.buildBaseSchema({formMode:'posting-create',ready:true,categorySelected:false,
      categoryChooser:'button',fields:[{name:'title',controlType:'text',visible:true}]});
    const deps={storage,onWarning:notice=>notices.push(notice),log:(...args)=>events.push(args)};
    const initial=await monitor.monitorSchemaStage('base',first,'synthetic-fill',deps);
    assert.equal(initial.status,'reference-created');assert.equal(storage.writes,1);
    assert.equal(notices.length,0);
    const repeat=await monitor.monitorSchemaStage('base',first,'synthetic-fill',deps);
    assert.equal(repeat.status,'unchanged');assert.equal(storage.writes,1);
    assert.equal(notices.length,0);
    assert.ok(events.some(x=>x[1]==='KAR134_STAGE_MONITOR_RESULT'));
  });
  await check('F1 proven control drift warns visibly without silently replacing baseline',async()=>{
    const monitor=monitoringPolicy(),storage=testStorage(),messages=[];
    const base=Schema.buildBaseSchema({formMode:'posting-create',ready:true,categorySelected:false,
      categoryChooser:'button',fields:[{name:'title',controlType:'text',visible:true}]});
    const changed=Schema.buildBaseSchema({formMode:'posting-create',ready:true,categorySelected:false,
      categoryChooser:'button',fields:[{name:'title',controlType:'textarea',visible:true}]});
    const cfg={storage,onWarning:msg=>messages.push(msg),log:()=>Promise.resolve()};
    await monitor.monitorSchemaStage('base',base,'f',cfg);
    const result=await monitor.monitorSchemaStage('base',changed,'f',cfg);
    assert.equal(result.status,'changed');assert.ok(messages.some(x=>x.includes('Basisformular')));
    assert.equal(storage.writes,1);assert.equal((await monitor.monitorSchemaStage('base',base,'f',cfg)).status,'unchanged');
  });
  await check('F2 missing numeric ancestor identity remains uncertain, while proven new parent ID warns',async()=>{
    const monitor=monitoringPolicy(),storage=testStorage(),warnings=[],config={storage,onWarning:m=>warnings.push(m),log:()=>Promise.resolve()};
    const path=()=>Schema.buildCategorySchema({categoryId:'405',observedPath:true,leafConfirmed:true,levels:[
      {label:'Elektronik',kind:'branch',technicalId:null},{label:'Wearables',kind:'branch',technicalId:null},
      {label:'Smartwatches',kind:'leaf',technicalId:'405'}]});
    const initial=path();
    assert.equal((await monitor.monitorSchemaStage('category',initial,'f',config)).status,'reference-created');
    const uncertain=path();uncertain.levels[1].label='Wearables neu';
    const inconclusive=await monitor.monitorSchemaStage('category',uncertain,'f',config);
    assert.equal(inconclusive.status,'uncertain');assert.ok(warnings.some(x=>x.includes('nicht eindeutig')));
    const proven=Schema.buildCategorySchema({categoryId:'405',observedPath:true,leafConfirmed:true,levels:[
      {label:'Elektronik',kind:'branch',technicalId:'12'},
      {label:'Wearables',kind:'branch',technicalId:'999'},
      {label:'Smartwatches',kind:'leaf',technicalId:'405'}]});
    const previous=Schema.buildCategorySchema({categoryId:'405',observedPath:true,leafConfirmed:true,levels:[
      {label:'Elektronik',kind:'branch',technicalId:'12'},
      {label:'Wearables',kind:'branch',technicalId:'102'},
      {label:'Smartwatches',kind:'leaf',technicalId:'405'}]});
    const storage2=testStorage(), config2={...config,storage:storage2};
    await monitor.monitorSchemaStage('category',previous,'f',config2);
    assert.equal((await monitor.monitorSchemaStage('category',proven,'f',config2)).status,'changed');
    assert.ok(warnings.some(x=>x.includes('Kategoriehierarchie')));
    assert.equal(storage2.writes,1);
  });
  await check('F3 monitors category-specific technical fields without mistaking unknown options for proof',async()=>{
    const monitor=monitoringPolicy(),storage=testStorage(),warnings=[],deps={storage,onWarning:m=>warnings.push(m),log:()=>Promise.resolve()};
    const before=Schema.buildSchema({categoryId:'405',dynamicAttributes:[
      {key:'wearables.case_size',controlType:'combobox',options:[],requiredState:'unknown'}]});
    const after=Schema.buildSchema({categoryId:'405',dynamicAttributes:[
      {key:'wearables.case_size',controlType:'combobox',optionsComplete:true,
        options:[{value:'44'}],requiredState:'unknown'}]});
    assert.equal((await monitor.monitorSchemaStage('attributes',before,'f',deps)).status,'reference-created');
    assert.equal((await monitor.monitorSchemaStage('attributes',after,'f',deps)).status,'uncertain');
    const actual=Schema.buildSchema({categoryId:'405',dynamicAttributes:[
      {key:'wearables.case_size',controlType:'combobox',options:[],requiredState:'unknown'},
      {key:'wearables.new_field',controlType:'text',requiredState:'optional'}]});
    assert.equal((await monitor.monitorSchemaStage('attributes',actual,'f',deps)).status,'changed');
    assert.ok(warnings.some(x=>x.includes('Kategorieformular')));
    assert.equal(storage.writes,1);
  });
  await check('corrupt persisted baseline is warned, not silently trusted or reset',async()=>{
    const monitor=monitoringPolicy(),storage=testStorage(),warnings=[],deps={storage,onWarning:m=>warnings.push(m),log:()=>Promise.resolve()};
    const a=Schema.buildBaseSchema({formMode:'posting-create',ready:true,categorySelected:false,
      categoryChooser:'button',fields:[{name:'title',controlType:'text',visible:true}]});
    await monitor.monitorSchemaStage('base',a,'f',deps);
    const [key]=storage.map.keys();
    storage.map.get(key).fingerprint='f'.repeat(64);
    const bad=await monitor.monitorSchemaStage('base',a,'f',deps);
    assert.equal(bad.status,'invalid-reference');
    assert.equal(storage.writes,1);
    assert.ok(warnings.some(x=>x.includes('Referenz')));
  });
  await check('unavailable storage never claims unchanged or creates false reference',async()=>{
    const monitor=monitoringPolicy(),warnings=[];
    const base=Schema.buildBaseSchema({formMode:'posting-create',ready:true,categorySelected:false,
      categoryChooser:'button',fields:[{name:'title',controlType:'text',visible:true}]});
    const failed=await monitor.monitorSchemaStage('base',base,'f',{
      storage:{get:async()=>{throw Error('storage denied')},set:async()=>{}},
      onWarning:m=>warnings.push(m),log:()=>Promise.resolve()});
    assert.equal(failed.status,'monitor-unavailable');
    assert.ok(warnings.some(x=>x.includes('nicht geprüft')));
  });
  await check('live monitor is bound before category selection, then category trail and hydrated fields',()=>{
    const block=fillerSource.slice(fillerSource.indexOf('async function runReadOnlySchemaTest('),
      fillerSource.indexOf('async function runFillSession('));
    assert.ok(block.indexOf("captureCategoryNeutralForm(")>0);
    assert.ok(block.indexOf("monitorSchemaStage('base'")<block.indexOf('await setCategory('));
    assert.ok(block.indexOf("monitorSchemaStage('category'")>block.indexOf('await setCategory('));
    assert.ok(block.indexOf("monitorSchemaStage('attributes'")>block.indexOf('await SchemaPreflight.afterHydration('));
    const categorySource=fs.readFileSync(require.resolve('../src/content/template-category-flow.js'),'utf8');
    assert.match(categorySource,/categoryPathEvidence/);
    assert.match(categorySource,/CATEGORY_MODAL_COMMIT_VERIFIED/);
  });

  await check('user-visible structural warning remains in the live status panel across progress messages',()=>{
    const from=fillerSource.indexOf('  function ensurePanel()');
    const to=fillerSource.indexOf('  async function runPostFillSession(',from);
    assert.ok(from>0 && to>from,'schema monitor warning must use the live overlay panel');
    const {document}=parseHTML('<html><body></body></html>');
    const context={document,panelTemplateOnly:true,panelArchiveInsertion:false,
      stageMonitorWarnings:[],Object,Array,Set,Map};
    const ui=vm.runInNewContext(fillerSource.slice(from,to)+
      '\n({updatePanel,registerSchemaMonitorWarning});',context,
      {filename:'kar134-live-warning-overlay.js'});
    ui.updatePanel('Schema-Test gestartet','F1 wird erfasst.',[],{safetyText:false});
    ui.registerSchemaMonitorWarning('Basisformular: Kleinanzeigen hat die Struktur verändert.');
    ui.registerSchemaMonitorWarning('Basisformular: Kleinanzeigen hat die Struktur verändert.');
    let region=document.querySelector('#kr134-schema-monitor-warnings');
    assert.ok(region,'missing warning region');
    assert.match(region.textContent,/Basisformular/);
    assert.equal(region.querySelectorAll('li').length,1,'duplicated warning must not multiply');
    ui.updatePanel('Schema-Test beendet','Test bestanden.',[],{safetyText:false});
    region=document.querySelector('#kr134-schema-monitor-warnings');
    assert.ok(region,'warning must remain visible after progress status update');
    assert.match(region.textContent,/Struktur verändert/);
    assert.match(document.querySelector('#kr-template-fill-status').textContent,/Test bestanden/);
  });
  // Wave K3: explicit synthetic previous F1/F2/F3 structural snapshots.
  // No historical archive, account information or persistent references used.
  const stageFixture = () => ({
    base: Schema.buildBaseSchema({ready:true,categorySelected:false,formMode:'posting-create',
      categoryChooser:'button',fields:[
        {name:'title',controlType:'text',visible:true,requiredState:'unknown'},
        {name:'description',controlType:'textarea',visible:true,requiredState:'unknown'}]}),
    category: Schema.buildCategorySchema({categoryId:'405',leafConfirmed:true,observedPath:true,levels:[
      {label:'Elektronik',technicalId:null,kind:'branch'},
      {label:'Wearables',technicalId:null,kind:'branch'},
      {label:'Smartwatches',technicalId:'405',kind:'leaf'}]}),
    attributes: Schema.buildSchema({categoryId:'405',dynamicAttributes:[
      {key:'wearables.case_size',controlType:'combobox',requiredState:'optional'}]})
  });
  const stagePolicy = () => {
    const a=fillerSource.indexOf('  // KAR-134 K3 synthetic fingerprint warning proof');
    const b=fillerSource.indexOf('  // KAR-134 field-only native simulation.',a);
    assert.ok(a>0&&b>a,'read-only F1/F2/F3 fingerprint warning proof policy is missing');
    return vm.runInNewContext(fillerSource.slice(a,b)+'\nassessSyntheticStageDrift;',
      {SchemaCore:Schema,Object,Array,Set,Map,Promise},
      {filename:'kar134-synthetic-stage-drift-proof.js'});
  };
  await check('native F1 F2 F3 synthetic previous snapshots prove three distinct stage drifts',async()=>{
    const policy=stagePolicy();
    const result=await policy(stageFixture());
    assert.equal(result.verdict,true);
    assert.equal(result.simulationOnly,true);
    assert.equal(result.referenceWrites,0);
    for(const stage of ['base','category','attributes']){
      const x=result.stages[stage];
      assert.equal(x.verdict,true,stage);
      assert.match(x.previousFingerprint,/^[0-9a-f]{64}$/);
      assert.match(x.currentFingerprint,/^[0-9a-f]{64}$/);
      assert.notEqual(x.previousFingerprint,x.currentFingerprint,stage);
      assert.equal(x.simulationOnly,true);
      assert.match(x.warningText,/TEST|SIMULATION/i);
    }
    assert.ok(result.stages.base.changeTypes.includes('field-removed'));
    assert.ok(result.stages.category.changeTypes.includes('category-depth-changed'));
    assert.ok(result.stages.attributes.changeTypes.includes('field-removed'));
    assert.equal(result.stages.category.categoryId,'405');
    assert.equal(result.stages.category.previousLeafId,'405');
  });
  await check('stage alarm cannot pass without proven live category path and hydrated field evidence',async()=>{
    const policy=stagePolicy();
    const base=stageFixture();
    assert.equal((await policy({...base,category:null})).verdict,false);
    assert.equal((await policy({...base,base:null})).verdict,false);
    assert.equal((await policy({...base,attributes:null})).verdict,false);
    const noPath={...base,category:{...base.category,observedPath:false}};
    assert.equal((await policy(noPath)).verdict,false);
    const wrongCategory={...base,attributes:{...base.attributes,categoryId:'406'}};
    assert.equal((await policy(wrongCategory)).verdict,false);
    const noAttrs={...base,attributes:{...base.attributes,fields:[]}};
    assert.equal((await policy(noAttrs)).verdict,false);
  });
  await check('F2 synthetic structural depth change does not invent technical parent IDs',async()=>{
    const result=await stagePolicy()(stageFixture());
    assert.equal(result.verdict,true);
    assert.equal(result.stages.category.changeTypes.filter(x=>x==='category-depth-changed').length,1);
    assert.equal(result.stages.category.verifiedAncestorIdsInvented,false);
    assert.equal(result.stages.category.previousLeafId,'405');
    assert.equal(result.stages.category.currentLeafId,'405');
  });
  await check('synthetic stage warning is separately named and read-only across all run contracts',()=>{
    const bg=fs.readFileSync(require.resolve('../src/background/controllers/template-fill-controller.js'),'utf8');
    const ui=fs.readFileSync(require.resolve('../src/app/inventory-card-renderer.js'),'utf8');
    assert.match(bg,/['"]stage-drift['"]/);
    assert.match(ui,/scenario:\s*['"]stage-drift['"]/);
    assert.match(ui,/Fingerprint-Warnung testen/);
    const block=fillerSource.slice(fillerSource.indexOf('async function runReadOnlySchemaTest('),
      fillerSource.indexOf('async function runFillSession('));
    assert.ok(block.includes("scenario === 'stage-drift'"));
    assert.ok(block.includes('assessSyntheticStageDrift('));
    assert.ok(block.includes('KAR134_STAGE_DRIFT_TEST_RESULT'));
    assert.ok(block.includes('registerSchemaMonitorWarning('));
    assert.ok(block.includes('schema-test-stage-drift'));
    const index=block.indexOf("scenario === 'stage-drift'");
    assert.ok(index>=0);
    // A structural test must take its own path before any archived-value probe.
    assert.ok(index<block.indexOf('const caseField'));
    for(const forbidden of ['fillDynamicAttributes(', 'uploadImages(', 'advanceAfterVerifiedFill(',
      'autoPublishVerifiedRenewal(', 'requestSubmit(', '.submit('])
      assert.ok(!block.includes(forbidden),'a read-only probe invokes a writer: '+forbidden);
  });
  await check('synthetic stage probe never persists a baseline, replacing the real monitor remains forbidden',()=>{
    const block=fillerSource.slice(fillerSource.indexOf('async function runReadOnlySchemaTest('),
      fillerSource.indexOf('async function runFillSession('));
    assert.ok(block.includes('syntheticStageDrift'));
    assert.ok(block.includes('monitorSchemaStage('));
    assert.ok(block.includes('if (!syntheticStageDrift)'));
    assert.ok(!block.includes('chrome.storage.local.set('));
    assert.ok(!block.includes('storage.set('));
    assert.ok(!fillerSource.slice(fillerSource.indexOf('  // KAR-134 K3 synthetic fingerprint warning proof'),
      fillerSource.indexOf('  // KAR-134 field-only native simulation.')).includes('monitorSchemaStage('));
  });
  // Wave L1: standalone category monitoring uses no archived listing
  // values and must be valid for more than the fixed Smartwatch category.
  const independentChecker = () => {
    const a=fillerSource.indexOf('  // KAR-134 L1 independent category-check verdict');
    const b=fillerSource.indexOf('  // KAR-134 field-only native simulation.',a);
    assert.ok(a>0&&b>a,'generic independent category verdict policy not implemented');
    return vm.runInNewContext(fillerSource.slice(a,b)+'\nassessIndependentCategoryCheck;',
      {Object,Array,Set}, {filename:'kar134-independent-category-check.js'});
  };
  const categoryCheckFixture = id => ({
    base:Schema.buildBaseSchema({ready:true,categorySelected:false,formMode:'posting-create',
      categoryChooser:'button',fields:[{name:'title',controlType:'text',visible:true}]}),
    category:Schema.buildCategorySchema({categoryId:id,leafConfirmed:true,observedPath:true,levels:[
      {label:'Root fixture',technicalId:null,kind:'branch'},
      {label:'Category fixture',technicalId:id,kind:'leaf'}]}),
    attributes:Schema.buildSchema({categoryId:id,dynamicAttributes:[
      {key:'fixture.category_field',controlType:'text',requiredState:'optional'}]})
  });
  await check('independent category check accepts two different numeric leaf categories without 405 assumptions',()=>{
    const checker=independentChecker();
    const stages={base:{status:'reference-created'},category:{status:'reference-created'},
      attributes:{status:'reference-created'}};
    for(const id of ['405','2077']){
      const observed=categoryCheckFixture(id);
      const verdict=checker(id,observed,stages);
      assert.equal(verdict.verdict,true,id);
      assert.equal(verdict.categoryId,id);
      assert.equal(verdict.partialEvidence,true,'unknown ancestor IDs remain explicit');
      assert.equal(verdict.status,'checked');
    }
    assert.equal(checker('2077',categoryCheckFixture('405'),stages).verdict,false);
  });
  await check('independent category check accepts repeated statuses and proven real drift as checked, not identical',()=>{
    const checker=independentChecker();
    const observed=categoryCheckFixture('2077');
    const result=checker('2077',observed,{
      base:{status:'unchanged'},category:{status:'not-fully-verified'},attributes:{status:'changed'}});
    assert.equal(result.verdict,true);
    assert.equal(result.status,'checked-with-change');
    assert.equal(result.partialEvidence,true);
    assert.deepEqual(Array.from(result.stageStatuses),['unchanged','not-fully-verified','changed']);
  });
  await check('independent category check does not claim success if F1, F2 or F3 is absent or unverified',()=>{
    const checker=independentChecker(),src=categoryCheckFixture('405');
    const ok={base:{status:'unchanged'},category:{status:'not-fully-verified'},attributes:{status:'unchanged'}};
    for(const stage of ['base','category','attributes']){
      const missing={...src,[stage]:null};
      assert.equal(checker('405',missing,ok).verdict,false,stage);
      assert.equal(checker('405',src,{...ok,[stage]:{status:'monitor-unavailable'}}).verdict,false,stage);
      assert.equal(checker('405',src,{...ok,[stage]:{status:'invalid-reference'}}).verdict,false,stage);
    }
    assert.equal(checker('0',src,ok).verdict,false);
    assert.equal(checker('405',{...src,category:{...src.category,leafConfirmed:false}},ok).verdict,false);
    assert.equal(checker('405',{...src,category:{...src.category,observedPath:false}},ok).verdict,false);
    assert.equal(checker('405',{...src,attributes:{...src.attributes,fields:[]}},ok).verdict,false);
  });
  await check('generic category fingerprints persist distinctly for two categories while F1 remains shared',async()=>{
    const monitor=monitoringPolicy(),store=testStorage();
    const deps={storage:store,onWarning:()=>{},log:()=>Promise.resolve()};
    const first=categoryCheckFixture('405'),second=categoryCheckFixture('2077');
    assert.equal((await monitor.monitorSchemaStage('base',first.base,'a',deps)).status,'reference-created');
    assert.equal((await monitor.monitorSchemaStage('base',second.base,'b',deps)).status,'unchanged');
    for(const category of [first,second]){
      const id=category.category.categoryId;
      assert.equal((await monitor.monitorSchemaStage('category',category.category,id,deps)).status,'reference-created');
      assert.equal((await monitor.monitorSchemaStage('attributes',category.attributes,id,deps)).status,'reference-created');
    }
    assert.equal(store.writes,5);
    assert.equal(store.map.size,5,'one shared F1 plus two category F2 and two category F3 references');
    const keys=[...store.map.keys()].join(' ');
    assert.match(keys,/category:405/);assert.match(keys,/category:2077/);
    assert.match(keys,/attributes:405/);assert.match(keys,/attributes:2077/);
    const repeat=await monitor.monitorSchemaStage('attributes',second.attributes,'c',deps);
    assert.equal(repeat.status,'unchanged');
    assert.equal(store.writes,5);
  });
  await check('standalone category check is available on generic inventory, with account gate and no template values',()=>{
    const ui=fs.readFileSync(require.resolve('../src/app/inventory-card-renderer.js'),'utf8');
    const bg=fs.readFileSync(require.resolve('../src/background/controllers/template-fill-controller.js'),'utf8');
    const service=fs.readFileSync(require.resolve('../src/background/services/template-fill-service.js'),'utf8');
    assert.match(ui,/scenario:\s*'category-check'/);
    assert.match(ui,/Kategorie prüfen/);
    assert.match(ui,/hasVerifiableCategoryPath/);
    assert.match(ui,/requireAccountBoundAction\(\)/);
    assert.match(bg,/'category-check'/);
    assert.match(bg,/category-check[\s\S]*?categoryId/);
    assert.match(bg,/assertSelectedProfileMatchesLiveAccount/);
    assert.match(bg,/assertInsertionStartAvailable/);
    assert.match(service,/session\.schemaTestScenario[\s\S]*?dynamicAttributes: \[\]/);
  });
  await check('standalone category-check runs F1 F2 F3 on arbitrary committed leaf without filling or publishing',()=>{
    const block=fillerSource.slice(fillerSource.indexOf('async function runReadOnlySchemaTest('),
      fillerSource.indexOf('async function runFillSession('));
    assert.match(block,/scenario === 'category-check'/);
    assert.match(block,/KAR134_CATEGORY_CHECK_RESULT/);
    assert.match(block,/assessIndependentCategoryCheck\(/);
    assert.match(block,/SchemaPreflight\.afterHydration\(/);
    assert.match(block,/monitorSchemaStage\('base'/);
    assert.match(block,/monitorSchemaStage\('category'/);
    assert.match(block,/monitorSchemaStage\('attributes'/);
    assert.match(block,/schema-test-category-check/);
    assert.ok(block.indexOf("scenario === 'category-check'") < block.indexOf("if (syntheticStageDrift)"));
    assert.ok(block.indexOf("scenario === 'category-check'") < block.indexOf("const caseField"));
    for(const forbidden of ['fillDynamicAttributes(', 'uploadImages(', 'advanceAfterVerifiedFill(',
      'autoPublishVerifiedRenewal(', 'requestSubmit(', '.submit(', 'fillCoreForm(', 'ensureStableTitleValue('])
      assert.ok(!block.includes(forbidden),'a category check may not fill/post listing: '+forbidden);
    assert.match(block,/remotePublishAttempted:\s*false/);
    assert.match(block,/archivedValuesRead:\s*categoryHintRead/);
    assert.match(block,/categoryNavigationHintsRead:\s*categoryHintRead/);
    assert.match(block,/archivedNonCategoryValuesRead:\s*false/);
  });
  // Wave L5 step 2: a proven structural change gets a field-level, read-only
  // review. This is NEVER a request to change saved stage references.
  const reviewHelpers = () => {
    const start = fillerSource.indexOf('  // KAR-134 L2 change review');
    const end = fillerSource.indexOf('  // KAR-134 K3 synthetic fingerprint warning proof',start);
    assert.ok(start>0&&end>start,'step-2 review policy/UI must be implemented');
    return vm.runInNewContext(fillerSource.slice(start,end)+
      '\n({buildStageChangeReview,showStageChangeReviewDialog});',
      {Object,Array,Set,Map}, {filename:'kar134-stage-review.js'});
  };
  await check('step-2 review distinguishes proven F3 field changes from partial F2 identity',()=>{
    const {buildStageChangeReview}=reviewHelpers();
    const model=buildStageChangeReview({
      base:{status:'unchanged',changes:[]},
      category:{status:'not-fully-verified',changes:[]},
      attributes:{status:'changed',changes:[
        {type:'field-removed',key:'attribute:wearables.case_size'},
        {type:'control-kind-changed',key:'attribute:wearables.bluetooth',before:'checkbox',after:'radio'}
      ]}
    });
    assert.equal(model.hasProvenChange,true);
    assert.equal(model.hasUncertainty,true);
    assert.deepEqual(Array.from(model.sections.map(section=>section.status)),
      ['unchanged','not-fully-verified','changed']);
    assert.match(model.sections[1].label,/F2/);
    assert.match(model.sections[1].note,/nicht vollständig/i);
    assert.match(model.sections[2].items.join(' '),/case_size/);
    assert.match(model.sections[2].items.join(' '),/checkbox|Kontrollkästchen/);
    assert.match(model.safetyText,/nicht|keine/i);
    const partiallyKnownDrift=buildStageChangeReview({
      base:{status:'unchanged'},
      category:{status:'changed',changes:[{type:'category-depth-changed',before:2,after:3}]},
      attributes:{status:'unchanged'}
    },{categoryEvidence:'partial-ids'});
    assert.equal(partiallyKnownDrift.hasProvenChange,true,'category depth change is independently proven');
    assert.equal(partiallyKnownDrift.hasUncertainty,true,'unverified ancestor IDs must remain visible');
    assert.match(partiallyKnownDrift.sections[1].note,/nicht vollständig belegt/i);
  });
  await check('step-2 review does not invent drift from uncertain F2 ancestor or option evidence',()=>{
    const {buildStageChangeReview}=reviewHelpers();
    const uncertain=buildStageChangeReview({
      base:{status:'reference-created',changes:[]},
      category:{status:'uncertain',changes:[{type:'unverified-path-label-changed',level:1}]},
      attributes:{status:'uncertain',changes:[{type:'option-evidence-uncertain',
        key:'attribute:shoes.art',before:null,after:['PRIVATE-OPTION-ID']}]}
    });
    assert.equal(uncertain.hasProvenChange,false);
    assert.equal(uncertain.hasUncertainty,true);
    assert.ok(!JSON.stringify(uncertain).includes('PRIVATE-OPTION-ID'),
      'uncertain option values must never leak into the review');
  });
  await check('step-2 dialog needs explicit acknowledgement, deferral never approves anything',()=>{
    const {buildStageChangeReview,showStageChangeReviewDialog}=reviewHelpers();
    const {document}=parseHTML('<html><body></body></html>');
    let acknowledged=0,deferred=0;
    const model=buildStageChangeReview({
      base:{status:'changed',changes:[{type:'field-added',key:'field:foo'}]},
      category:{status:'not-fully-verified',changes:[]},
      attributes:{status:'unchanged',changes:[]}
    });
    const show=()=>showStageChangeReviewDialog(model,{
      documentRoot:document,onAcknowledge:()=>{acknowledged++;},
      onDefer:()=>{deferred++;}
    });
    show();
    const dialog=document.querySelector('[role="dialog"]');
    assert.ok(dialog,'dialog must be actually rendered');
    assert.match(dialog.textContent,/F1/);
    assert.match(dialog.textContent,/F2/);
    assert.match(dialog.textContent,/F3/);
    assert.match(dialog.textContent,/nicht übernommen|nicht verändert/i);
    assert.ok(!dialog.innerHTML.includes('<script>'));
    const buttons=[...dialog.querySelectorAll('button')];
    assert.equal(buttons.length,2,'must expose acknowledge and defer distinctly');
    buttons[0].click();
    assert.equal(acknowledged,0);
    assert.equal(deferred,1);
    assert.equal(document.querySelector('[role="dialog"]'),null);
    show();
    [...document.querySelectorAll('[role="dialog"] button')][1].click();
    assert.equal(acknowledged,1);
    assert.equal(deferred,1);
    assert.equal(document.querySelector('[role="dialog"]'),null);
    assert.equal(showStageChangeReviewDialog(buildStageChangeReview({
      base:{status:'unchanged'},category:{status:'not-fully-verified'},attributes:{status:'unchanged'}
    }),{documentRoot:document}),null,'unchanged/partially proved must never show confirmed-drift modal');
  });
  await check('step-2 category-check wiring never authorizes reference acceptance or publication',()=>{
    const block=fillerSource.slice(fillerSource.indexOf("if (scenario === 'category-check')"),
      fillerSource.indexOf("if (syntheticStageDrift)",fillerSource.indexOf("if (scenario === 'category-check')")));
    assert.match(block,/buildStageChangeReview\(/);
    assert.match(block,/showStageChangeReviewDialog\(/);
    assert.match(block,/KAR134_CHANGE_REVIEW_ACKNOWLEDGED/);
    assert.match(block,/KAR134_CHANGE_REVIEW_DEFERRED/);
    assert.match(block,/reviewRequired/);
    assert.match(block,/referenceApproved:\s*false/);
    assert.ok(!block.includes('storage.set('));
    assert.ok(!block.includes('chrome.storage.local.set('));
    assert.ok(!block.includes('requestSubmit('));
    assert.ok(!block.includes('uploadImages('));
  });
  // Step 3: sandbox references must live only in a run-scoped, in-memory store.
  await check('isolated synthetic stage references show three proven changes without live fingerprint access',async()=>{
    const {createIsolatedStageReview}=monitoringPolicy();
    assert.equal(typeof createIsolatedStageReview,'function');
    const sandbox=await createIsolatedStageReview('local-check-405',stageFixture());
    assert.deepEqual(Array.from(['base','category','attributes'].map(k=>sandbox.results[k].status)),
      ['changed','changed','changed']);
    assert.equal(sandbox.state().referenceWrites,3,'three synthetic baselines only');
    assert.equal(sandbox.state().realReferenceReads,0);
    assert.equal(sandbox.state().realReferenceWrites,0);
    assert.match(sandbox.state().namespace,/kr134:isolated-stage-monitor:/);
    const model=buildIsolatedReviewModel(sandbox.results,sandbox.observed.category);
    assert.equal(model.hasProvenChange,true);
    assert.equal(model.simulationOnly,true);
    assert.match(model.safetyText,/SIMULATION|Testspeicher/i);
    assert.ok(model.sections.every(section=>section.status==='changed'));
  });
  await check('isolated test confirmation adopts only sandbox references then compares unchanged',async()=>{
    const {createIsolatedStageReview}=monitoringPolicy();
    const sandbox=await createIsolatedStageReview('local-accept-405',stageFixture());
    await assert.rejects(sandbox.approve({confirmed:false}),/Bestätigung|bestätigt/i);
    assert.equal(sandbox.state().referenceWrites,3);
    const adopted=await sandbox.approve({confirmed:true});
    assert.equal(adopted.accepted,true);
    assert.deepEqual(Array.from(['base','category','attributes'].map(k=>adopted.results[k].status)),
      ['unchanged','not-fully-verified','unchanged']);
    assert.equal(sandbox.state().referenceWrites,6);
    assert.equal(sandbox.state().realReferenceWrites,0);
    await assert.rejects(sandbox.approve({confirmed:true}),/bereits|abgeschlossen/i);
  });
  await check('isolated test rejection and simple acknowledgement do not approve or persist',async()=>{
    const {createIsolatedStageReview}=monitoringPolicy();
    const sandbox=await createIsolatedStageReview('local-reject-159',{
      ...stageFixture(),
      category:Schema.buildCategorySchema({categoryId:'159',leafConfirmed:true,observedPath:true,levels:[
        {label:'Mode & Beauty',technicalId:null,kind:'branch'},
        {label:'Damenschuhe',technicalId:null,kind:'branch'},
        {label:'Sneaker & Sportschuhe',technicalId:'159',kind:'leaf'}]}),
      attributes:Schema.buildSchema({categoryId:'159',dynamicAttributes:[
        {key:'shoes.art',controlType:'combobox',requiredState:'unknown'}]})
    });
    sandbox.defer();
    assert.equal(sandbox.state().accepted,false);
    assert.equal(sandbox.state().referenceWrites,3);
    assert.deepEqual(Array.from(['base','category','attributes'].map(k=>sandbox.results[k].status)),
      ['changed','changed','changed']);
    assert.equal(sandbox.state().realReferenceWrites,0);
    await assert.rejects(sandbox.approve({confirmed:true}),/abgelehnt|abgeschlossen/i);
  });
  await check('isolated test fails closed with missing stage, colliding synthetic key or live storage',async()=>{
    const {createIsolatedStageReview,monitorSchemaStage}=monitoringPolicy();
    const sample=stageFixture();
    await assert.rejects(createIsolatedStageReview('bad', {...sample,attributes:null}),/vollständig|erfasst/i);
    const colliding={...sample,attributes:{...sample.attributes,fields:[
      ...sample.attributes.fields,{key:'attribute:kr134.synthetic_previous_attribute',
        kind:'text',requiredState:'unknown',optionValues:null}]}};
    await assert.rejects(createIsolatedStageReview('collide',colliding),/Kollision|kollidiert/i);
    const dummy=testStorage();
    const blocked=await monitorSchemaStage('base',sample.base,'f',{
      storage:dummy,isolatedTest:true,log:()=>Promise.resolve(),onWarning:()=>{}});
    assert.equal(blocked.status,'monitor-unavailable');
    assert.equal(dummy.writes,0,'live-like storage must be rejected even in test mode');
  });
  await check('sandbox-only review dialog exposes explicit isolated adoption, normal dialog remains two buttons',()=>{
    const {buildStageChangeReview,showStageChangeReviewDialog}=reviewHelpers();
    const {document}=parseHTML('<html><body></body></html>');
    let accepted=0,deferred=0,acknowledged=0;
    const review=buildStageChangeReview({
      base:{status:'changed',changes:[{type:'field-removed',key:'field:kr134_synthetic_previous_base_field'}]},
      category:{status:'changed',changes:[{type:'category-depth-changed',before:4,after:3}]},
      attributes:{status:'changed',changes:[{type:'field-removed',key:'attribute:kr134.synthetic_previous_attribute'}]}
    });
    showStageChangeReviewDialog(review,{documentRoot:document,
      simulationOnly:true,onTestApprove:()=>{accepted++;},
      onAcknowledge:()=>{acknowledged++;},onDefer:()=>{deferred++;}});
    const dialog=document.querySelector('[role="dialog"]');
    assert.ok(dialog);
    assert.match(dialog.textContent,/TEST|Simulation|Testspeicher/);
    const buttons=[...dialog.querySelectorAll('button')];
    assert.equal(buttons.length,3);
    assert.match(buttons[2].textContent,/Testspeicher/);
    buttons[2].click();
    assert.equal(accepted,1);
    assert.equal(deferred,0);assert.equal(acknowledged,0);
    assert.equal(document.querySelector('[role="dialog"]'),null);
  });
  await check('isolated review run uses category path and prevents all production-stage storage calls',()=>{
    const ui=fs.readFileSync(require.resolve('../src/app/inventory-card-renderer.js'),'utf8');
    const bg=fs.readFileSync(require.resolve('../src/background/controllers/template-fill-controller.js'),'utf8');
    const svc=fs.readFileSync(require.resolve('../src/background/services/template-fill-service.js'),'utf8');
    const block=fillerSource.slice(fillerSource.indexOf('async function runReadOnlySchemaTest('),
      fillerSource.indexOf('async function runFillSession('));
    assert.match(ui,/scenario: 'isolated-review'/);
    assert.match(bg,/'isolated-review'/);
    assert.match(svc,/'isolated-review'/);
    assert.match(block,/scenario === 'isolated-review'/);
    assert.match(block,/createIsolatedStageReview\(/);
    assert.match(block,/KAR134_ISOLATED_REVIEW_/);
    assert.match(block,/referenceApproved:\s*false/);
    assert.ok(!block.includes('requestSubmit('));assert.ok(!block.includes('uploadImages('));
    assert.ok(!block.includes('autoPublishVerifiedRenewal('));
  });
  assert.equal(passed,73,'KAR-134 preflight regression count must remain complete');
  console.log(passed+'/73 PASS KAR-134 schema capture/preflight');





})().catch(error=>{console.error(error);process.exitCode=1});
