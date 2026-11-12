'use strict';
// Synthetic technical 405 fixtures derived from owner's observed field names, NOT copied private archives.
const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const { webcrypto } = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const fillerSource = fs.readFileSync(require.resolve('../src/content/template-filler.js'),'utf8');
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
  await check('normal edit-form posting session transports saved fields, retired probe sessions fail closed', async()=>{
    const now=new Date().toISOString();
    const records={
      shoe:{inventoryId:'shoe',adId:'15900',category:{id:159,path:['Mode & Beauty','Damenschuhe']},
        title:'PRIVATE TITLE',description:'PRIVATE DESCRIPTION',price:{value:12345},
        dynamicAttributes:[{key:'shoes.art',label:'Art',displayValue:'Sneaker & Sportschuhe',
          technicalValue:'secret-art-code'}],images:[]},
      watch:{inventoryId:'watch',adId:'40500',category:{id:405,path:['Elektronik','Wearables']}}
    };
    const db={templateFillSessions:{
      first:{fillId:'first',inventoryId:'shoe',targetTabId:71,status:'waiting',createdAt:now},
      second:{fillId:'second',inventoryId:'watch',schemaTestScenario:'category-check',
        targetTabId:72,status:'waiting',createdAt:now}
    }};
    const service=require('../src/background/services/template-fill-service.js').create({
      storageLocal:{get:async()=>db,set:async()=>{}},getInventory:async id=>records[id]
    });
    const normal=await service.getTemplateFillSession({tab:{id:71}});
    assert.equal(normal.template.categoryId,159);
    assert.equal(normal.template.title,'PRIVATE TITLE');
    assert.equal(normal.template.description,'PRIVATE DESCRIPTION');
    assert.equal(normal.template.dynamicAttributes[0].technicalValue,'secret-art-code');
    assert.equal(normal.schemaTestScenario,undefined);
    await assert.rejects(service.getTemplateFillSession({tab:{id:72}}),
      /Veralteter Schema-Testvorgang/,'old standalone sessions must fail before any form is read');
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

  await check('normal preflight reviews before filling dynamic values or uploading, and old tests cannot publish',()=>{
    const filler=fs.readFileSync(require.resolve('../src/content/template-filler.js'),'utf8');
    const controller=fs.readFileSync(require.resolve('../src/background/controllers/template-fill-controller.js'),'utf8');
    const normal=filler.slice(filler.indexOf('async function runFillSession('),
      filler.indexOf('async function runPendingFill('));
    assert.ok(normal.indexOf('SchemaPreflight.afterHydration(')>0);
    assert.ok(normal.indexOf('SchemaPreflight.evaluate(')>normal.indexOf('SchemaPreflight.afterHydration('));
    assert.ok(normal.indexOf('await reviewLivePostingSchema(')>normal.indexOf('SchemaPreflight.evaluate('));
    assert.ok(normal.indexOf('await reviewLivePostingSchema(')<normal.indexOf('fillDynamicAttributes('));
    assert.match(normal,/SchemaPreflight.verifyAfterFill/);
    assert.match(filler,/if \(session\.schemaTestScenario\) throw/);
    assert.match(controller,/if \(options\.schemaTestScenario != null\) throw/);
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
      {categoryId:'405',dynamicAttributes:[oldAttr('wearables.gehausegrosse','44','44mm')]});
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
    assert.equal(report.complete,true);
    assert.equal(report.mappings.length,1);
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
      {categoryId:'405',dynamicAttributes:[oldAttr('wearables.gehausegrosse','44','44mm')]});
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
    const observed=await f.engine.afterHydration({categoryId:'405',dynamicAttributes:[oldAttr('wearables.gehausegrosse','44','44mm')]});
    assert.equal(observed.optionProbe.verified,true);
    const focused={...observed,schema:{...observed.schema,fields:observed.schema.fields.filter(x=>x.key==='attribute:wearables.case_size')}};
    const old=Schema.buildSchema({categoryId:'405',dynamicAttributes:[{key:'wearables.gehausegrosse',controlType:'number'}]});
    const source={categoryId:'405',templateSchema:{snapshot:old,fingerprint:await Schema.fingerprint(old)},
      dynamicAttributes:[syntheticCaseAttr('44','44mm')]};
    const report=await f.engine.evaluate(source,focused);
    assert.equal(report.complete,false);
    assert.equal(report.complete,false);
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
    const observed=await f.engine.afterHydration(f.template);
    assert.equal(pop.opens,0,'unverified size 45 must not trigger an exploratory popup');
    assert.equal(observed.optionProbe,undefined);
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
  // Wave K2: runtime stage monitoring is tested with a synthetic create-form
  // and in-memory extension storage, never with actual Kleinanzeigen data.
  function monitoringPolicy() {
    const start=fillerSource.indexOf('  // KAR-134 K2 monitoring helpers');
    const end=fillerSource.indexOf('  // KAR-134 L4 real reference adoption',start);
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
    const block=fillerSource.slice(fillerSource.indexOf('async function runFillSession('),
      fillerSource.indexOf('async function runPendingFill('));
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
  // Wave L1: standalone category monitoring uses no archived listing
  // values and must be valid for more than the fixed Smartwatch category.
  const categoryCheckFixture = id => ({
    base:Schema.buildBaseSchema({ready:true,categorySelected:false,formMode:'posting-create',
      categoryChooser:'button',fields:[{name:'title',controlType:'text',visible:true}]}),
    category:Schema.buildCategorySchema({categoryId:id,leafConfirmed:true,observedPath:true,levels:[
      {label:'Root fixture',technicalId:null,kind:'branch'},
      {label:'Category fixture',technicalId:id,kind:'leaf'}]}),
    attributes:Schema.buildSchema({categoryId:id,dynamicAttributes:[
      {key:'fixture.category_field',controlType:'text',requiredState:'optional'}]})
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
  await check('L15 keeps inventory UI free of manual category checks and refuses standalone starts',()=>{
    const ui=fs.readFileSync(require.resolve('../src/app/inventory-card-renderer.js'),'utf8');
    const bg=fs.readFileSync(require.resolve('../src/background/controllers/template-fill-controller.js'),'utf8');
    const service=fs.readFileSync(require.resolve('../src/background/services/template-fill-service.js'),'utf8');
    assert.doesNotMatch(ui,/Kategorie prüfen|schemaTestScenario|makeCategoryCheckActions/);
    assert.doesNotMatch(bg,/ownerType: 'schema-test'|schema-test-category-review-required/);
    assert.match(bg,/options\.schemaTestScenario != null/);
    assert.match(service,/if \(session\.schemaTestScenario\) throw/);
  });
  await check('L15 natural posting flow observes F1 F2 F3 before saving or publishing',()=>{
    const block=fillerSource.slice(fillerSource.indexOf('async function runFillSession('),
      fillerSource.indexOf('async function runPendingFill('));
    assert.match(block,/captureCategoryNeutralForm/);
    assert.match(block,/monitorSchemaStage\('base'/);
    assert.match(block,/monitorSchemaStage\('category'/);
    assert.match(block,/monitorSchemaStage\('attributes'/);
    assert.match(block,/SchemaPreflight\.afterHydration/);
    assert.match(block,/reviewLivePostingSchema\(/);
    assert.ok(block.indexOf('await reviewLivePostingSchema(')<block.indexOf('fillDynamicAttributes('));
    assert.match(block,/SchemaPreflight\.verifyAfterFill/);
  });
  // Wave L5 step 2: a proven structural change gets a field-level, read-only
  // review. This is NEVER a request to change saved stage references.
  const reviewHelpers = () => {
    const start = fillerSource.indexOf('  // KAR-134 L2 change review');
    const end = fillerSource.indexOf('  // Real F1/F2/F3 review is part of the ordinary authenticated posting',start);
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
  await check('normal posting schema review never writes a baseline or submits an ad directly',()=>{
    const block=fillerSource.slice(fillerSource.indexOf('async function reviewLivePostingSchema('),
      fillerSource.indexOf('async function runFillSession('));
    assert.match(block,/buildStageChangeReview\(/);
    assert.match(block,/showStageChangeReviewDialog\(/);
    assert.match(block,/KAR134_CHANGE_REVIEW_ACKNOWLEDGED/);
    assert.match(block,/KAR134_CHANGE_REVIEW_DEFERRED/);
    assert.match(block,/stage:'schema-reference-review-required'/);
    assert.match(block,/referenceApproved:\s*false/);
    for(const forbidden of ['chrome.storage.local.set(', 'requestSubmit(', 'uploadImages(', 'autoPublishVerifiedRenewal('])
      assert.ok(!block.includes(forbidden),'unexpected automatic mutation: '+forbidden);
  });
  // Step 4 real adoption policy: entirely distinct from the isolated sandbox.
  const realApprovalPolicy = () => {
    const start = fillerSource.indexOf('  // KAR-134 L4 real reference adoption');
    const end = fillerSource.indexOf('  // Real F1/F2/F3 review is part of the ordinary authenticated posting',start);
    assert.ok(start > 0 && end > start,'genuine baseline adoption policy must exist');
    return vm.runInNewContext(fillerSource.slice(start,end)+
      '\n({buildRealSchemaAdoptionPlan,showStageChangeReviewDialog});',
      {Object,Array,Set,Map,SchemaCore:Schema}, {filename:'kar134-real-adoption-policy.js'});
  };
  const realResults = () => ({
    base:{status:'unchanged',previousFingerprint:'a'.repeat(64),currentFingerprint:'a'.repeat(64),changes:[]},
    category:{status:'not-fully-verified',previousFingerprint:'b'.repeat(64),currentFingerprint:'b'.repeat(64),changes:[]},
    attributes:{status:'changed',previousFingerprint:'c'.repeat(64),currentFingerprint:'d'.repeat(64),
      changes:[{type:'field-added',key:'attribute:wearables.new_feature'}]}
  });
  const realEvidence = () => ({
    base:stageFixture().base,category:stageFixture().category,attributes:stageFixture().attributes
  });
  await check('real F3 adoption requires exact category and stable F1/F2 structural evidence',()=>{
    const {buildRealSchemaAdoptionPlan}=realApprovalPolicy();
    const plan=buildRealSchemaAdoptionPlan(realResults(),realEvidence(),{
      categoryId:'405',fillId:'owner-real-405'});
    assert.equal(plan.eligible,true);
    assert.equal(plan.stage,'attributes');
    assert.equal(plan.categoryId,'405');
    assert.equal(plan.oldFingerprint,'c'.repeat(64));
    assert.equal(plan.newFingerprint,'d'.repeat(64));
    assert.equal(plan.fillId,'owner-real-405');
    assert.ok(!JSON.stringify(plan).includes('PRIVATE'));
  });
  await check('real reference adoption denies uncertain F3, unproven F2, F1 drift and mismatched leaf',()=>{
    const {buildRealSchemaAdoptionPlan}=realApprovalPolicy();
    const decide=(results=realResults(),observed=realEvidence(),categoryId='405')=>
      buildRealSchemaAdoptionPlan(results,observed,{categoryId,fillId:'owner-real-405'});
    assert.equal(decide({...realResults(),attributes:{
      ...realResults().attributes,changes:[{type:'option-evidence-uncertain',key:'attribute:x'}]}}).eligible,false);
    assert.equal(decide({...realResults(),category:{
      ...realResults().category,previousFingerprint:'a'.repeat(64)}}).eligible,false);
    assert.equal(decide({...realResults(),base:{
      ...realResults().base,status:'changed'}}).eligible,false);
    assert.equal(decide({...realResults(),attributes:{
      ...realResults().attributes,oldFingerprint:'d'.repeat(64),
      previousFingerprint:'d'.repeat(64)}}).eligible,false);
    assert.equal(decide(realResults(),realEvidence(),'159').eligible,false);
    const unverified=realEvidence();
    unverified.category={...unverified.category,leafConfirmed:false};
    assert.equal(decide(realResults(),unverified).eligible,false);
  });
  await check('real F2 with missing parent numeric IDs never obtains approval',()=>{
    const {buildRealSchemaAdoptionPlan}=realApprovalPolicy();
    const results=realResults();
    results.category={...results.category,status:'changed',previousFingerprint:'b'.repeat(64),
      currentFingerprint:'e'.repeat(64),changes:[{type:'category-depth-changed',before:4,after:3}]};
    results.attributes={...results.attributes,status:'unchanged',
      previousFingerprint:'d'.repeat(64),currentFingerprint:'d'.repeat(64),changes:[]};
    assert.equal(buildRealSchemaAdoptionPlan(results,realEvidence(),{
      categoryId:'405',fillId:'owner-real-405'}).eligible,false);
  });
  await check('real approval dialog requires second explicit click and never enables simulation control',()=>{
    const {buildRealSchemaAdoptionPlan,showStageChangeReviewDialog}=realApprovalPolicy();
    const {buildStageChangeReview}=reviewHelpers();
    const {document}=parseHTML('<html><body></body></html>');
    const review=buildStageChangeReview(realResults(),{categoryEvidence:'partial-ids'});
    const plan=buildRealSchemaAdoptionPlan(realResults(),realEvidence(),{
      categoryId:'405',fillId:'owner-real-405'});
    let commits=0,acknowledges=0;
    showStageChangeReviewDialog(review,{documentRoot:document,
      realAdoptionPlan:plan,onRealApprove:()=>{commits++;},
      onAcknowledge:()=>{acknowledges++;}});
    const dialog=document.querySelector('[role="dialog"]');
    assert.ok(dialog);
    const initial=[...dialog.querySelectorAll('button')];
    assert.equal(initial.length,3,'eligible real review gains an additional action');
    assert.match(initial[2].textContent,/F3|Strukturreferenz/);
    initial[2].click();
    assert.equal(commits,0,'first click must only open explicit confirmation');
    assert.ok(document.querySelector('[role="dialog"]'));
    const followUp=[...document.querySelectorAll('[role="dialog"] button')];
    assert.match(document.querySelector('[role="dialog"]').textContent,/bestätig|endgültig|unwiderruflich/i);
    assert.equal(followUp.length,2,'second step must support cancellation');
    followUp[1].click();
    assert.equal(commits,1);
    assert.equal(acknowledges,0);
    assert.equal(document.querySelector('[role="dialog"]'),null);
    showStageChangeReviewDialog(review,{documentRoot:document,realAdoptionPlan:{eligible:false}});
    assert.equal(document.querySelectorAll('[role="dialog"] button').length,2);
  });
  // Genuine adoption authority lives in the existing background fill controller,
  // not in the content script's writable chrome.storage object.
  const makeRealApprovalAuthority = async (options={}) => {
    const controllerSource=fs.readFileSync(require.resolve('../src/background/controllers/template-fill-controller.js'),'utf8');
    const start=controllerSource.indexOf('async function adoptVerifiedSchemaReference(');
    const end=controllerSource.indexOf('async function updateTemplateFillSession(',start);
    assert.ok(start>0&&end>start,'guarded background reference authority must exist');
    const oldSchema=Schema.buildSchema({categoryId:'405',dynamicAttributes:[
      {key:'wearables.bluetooth',controlType:'checkbox',requiredState:'unknown'}]});
    const freshSchema=Schema.buildSchema({categoryId:'405',dynamicAttributes:[
      {key:'wearables.bluetooth',controlType:'checkbox',requiredState:'unknown'},
      {key:'wearables.new_feature',controlType:'text',requiredState:'unknown'}]});
    const oldFingerprint=await Schema.fingerprint(oldSchema);
    const newFingerprint=await Schema.fingerprint(freshSchema);
    const key='kr134:stage-monitor:v1:attributes:405';
    const map=new Map([[key,{schemaVersion:1,snapshot:oldSchema,fingerprint:oldFingerprint}]]);
    let baselineWrites=0,gateCalls=0;
    const sessions={testSession:{fillId:'testSession',templateOnly:true,inventoryId:'watch',
      sourceAdId:'123456',targetTabId:42,status:'needs-review',
      stage:'schema-reference-review-required',
      createdAt:new Date().toISOString()}};
    const record={inventoryId:'watch',adId:'123456',profileId:'selected-profile',
      category:{id:405},categoryPath:['Elektronik','Wearables']};
    const storage={
      async get(key){return {[key]:map.get(key)};},
      async set(values){for(const [key,val] of Object.entries(values)){
        if(key.startsWith('kr134:stage-monitor:'))baselineWrites++;
        map.set(key,val);
      }}
    };
    const context={
      TemplateSchemaCore:Schema,cryptoApi:{randomUUID:()=> 'approval-nonce-1'},
      chromeApi:{storage:{local:storage}},
      getInventory:async()=>options.record||record,
      assertSelectedProfileMatchesLiveAccount:async()=>{gateCalls++;if(options.denyProfile)throw Error('profile mismatch');},
      writeFillSessions:async()=>{},getInsertionLockState:async()=>null,
      TEMPLATE_TARGET_URL:'https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html',
      logDiagnostic:()=>Promise.resolve(),sessionCorrelationContext:()=>({}),
      Date,URL,RegExp,Array,Object,Set,Map,Promise
    };
    const approve=vm.runInNewContext(controllerSource.slice(start,end)+
      '\n adoptVerifiedSchemaReference;',context,{filename:'kar134-reference-adoption-guard.js'});
    const sender={tab:{id:42,url:'https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html'}};
    return {
      approve,session:sessions.testSession,sessions,sender,oldSchema,freshSchema,
      oldFingerprint,newFingerprint,key,map,
      get baselineWrites(){return baselineWrites;},
      get gateCalls(){return gateCalls;}
    };
  };
  await check('real approval must prepare exact category-scoped F3 consent before any storage mutation',async()=>{
    const a=await makeRealApprovalAuthority();
    const result=await a.approve({referenceAdoption:{action:'prepare',
      stage:'attributes',categoryId:'405',
      oldFingerprint:a.oldFingerprint,newFingerprint:a.newFingerprint}},
      a.session,a.sessions,a.sender);
    assert.equal(result.pending,true);
    assert.equal(result.referenceApproved,false);
    assert.equal(a.baselineWrites,0);
    assert.equal(a.session.pendingSchemaReferenceApproval.token,result.token);
    assert.ok(a.gateCalls>=1);
  });
  await check('real approval serializes one F3 reference write, validates fingerprint and is not repeatable',async()=>{
    const a=await makeRealApprovalAuthority();
    const prep=await a.approve({referenceAdoption:{action:'prepare',stage:'attributes',
      categoryId:'405',oldFingerprint:a.oldFingerprint,newFingerprint:a.newFingerprint}},
      a.session,a.sessions,a.sender);
    const result=await a.approve({referenceAdoption:{action:'commit',stage:'attributes',
      categoryId:'405',token:prep.token,oldFingerprint:a.oldFingerprint,
      newFingerprint:a.newFingerprint,snapshot:a.freshSchema,freshObservationCapturedAt:Date.now()}},
      a.session,a.sessions,a.sender);
    assert.equal(result.referenceApproved,true);
    assert.equal(a.baselineWrites,1,'one production F3 ref is changed at most once');
    assert.equal(a.map.get(a.key).fingerprint,a.newFingerprint);
    assert.equal(a.map.get(a.key).priorReference.fingerprint,a.oldFingerprint);
    assert.ok(a.gateCalls>=2,'profile checked both before prepare and immediately before commit');
    await assert.rejects(a.approve({referenceAdoption:{action:'commit',stage:'attributes',
      categoryId:'405',token:prep.token,oldFingerprint:a.oldFingerprint,
      newFingerprint:a.newFingerprint,snapshot:a.freshSchema,freshObservationCapturedAt:Date.now()}},
      a.session,a.sessions,a.sender),/benutzt|abgelaufen|Bestätigung|nicht verfügbar/i);
    assert.equal(a.baselineWrites,1);
  });
  await check('real approval fails closed on profile change, tampered payload and stale baseline',async()=>{
    const a=await makeRealApprovalAuthority();
    const prep=await a.approve({referenceAdoption:{action:'prepare',stage:'attributes',
      categoryId:'405',oldFingerprint:a.oldFingerprint,newFingerprint:a.newFingerprint}},
      a.session,a.sessions,a.sender);
    const send=(extra={})=>a.approve({referenceAdoption:{action:'commit',stage:'attributes',
      categoryId:'405',token:prep.token,oldFingerprint:a.oldFingerprint,
      newFingerprint:a.newFingerprint,snapshot:a.freshSchema,freshObservationCapturedAt:Date.now(),...extra}},
      a.session,a.sessions,a.sender);
    await assert.rejects(send({token:'forged'}),/Bestätigung|Token|abgelaufen/i);
    await assert.rejects(send({categoryId:'159'}),/Kategorie|Identität|Zuordnung/i);
    await assert.rejects(send({snapshot:a.oldSchema}),/Fingerprint|Struktur/i);
    assert.equal(a.baselineWrites,0);
    a.map.set(a.key,{schemaVersion:1,snapshot:a.freshSchema,fingerprint:a.newFingerprint});
    await assert.rejects(send(),/veraltet|geändert|Fingerprint|Referenz/i);
    assert.equal(a.baselineWrites,0);
    const wrong=await makeRealApprovalAuthority({denyProfile:true});
    await assert.rejects(wrong.approve({referenceAdoption:{action:'prepare',
      stage:'attributes',categoryId:'405',oldFingerprint:wrong.oldFingerprint,
      newFingerprint:wrong.newFingerprint}},wrong.session,wrong.sessions,wrong.sender),/profile mismatch/);
    assert.equal(wrong.baselineWrites,0);
  });
  await check('genuine F3 approval remains in an authenticated production review with fresh live proof',()=>{
    const content=fillerSource.slice(fillerSource.indexOf('async function reviewLivePostingSchema('),
      fillerSource.indexOf('async function runFillSession('));
    const normal=fillerSource.slice(fillerSource.indexOf('async function runFillSession('),
      fillerSource.indexOf('async function runPendingFill('));
    const controller=fs.readFileSync(require.resolve('../src/background/controllers/template-fill-controller.js'),'utf8');
    const bootstrap=fs.readFileSync(require.resolve('../src/background/background.js'),'utf8');
    assert.match(content,/buildRealSchemaAdoptionPlan\(/);
    assert.match(content,/referenceAdoption:\s*\{\s*action:\s*'prepare'/);
    assert.match(content,/action:'commit'/);
    assert.match(content,/SchemaPreflight\.afterHydration\(/);
    assert.match(content,/KAR134_REAL_REFERENCE_ADOPTION_COMMITTED/);
    assert.match(normal,/await reviewLivePostingSchema\(/);
    assert.match(controller,/if \(message\?\.referenceAdoption\)/);
    assert.match(controller,/schema-reference-review-required/);
    assert.match(controller,/Boolean\(session\?\.schemaTestScenario\)/);
    assert.match(controller,/getInsertionLockState\(\)/);
    assert.match(controller,/assertSelectedProfileMatchesLiveAccount\(/);
    assert.match(bootstrap,/TemplateSchemaCore,\s*queueMicrotaskFn/);
    for(const forbidden of ['chrome.storage.local.set(', 'requestSubmit(', 'uploadImages('])
      assert.ok(!content.includes(forbidden));
  });
  assert.equal(passed,57,'KAR-134 retained production regression count must remain complete');
  console.log(passed+'/57 PASS KAR-134 schema capture/preflight');





})().catch(error=>{console.error(error);process.exitCode=1});
