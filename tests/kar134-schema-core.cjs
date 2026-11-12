'use strict';
// KAR-134 Wave A: synthetic technical form fixtures only (no user archive/PII).
const assert = require('node:assert/strict');
const { webcrypto, createHash } = require('node:crypto');
const Schema = require('../src/shared/template-schema-core.js');
let passed = 0;
const check = async (name, fn) => { await fn(); passed++; console.log('PASS KAR-134: ' + name); };
const base = () => ({
  categoryId: '405', categoryPath: ['Elektronik', 'Wearables', 'Smartwatches'],
  categoryPathVerified: true,
  title: 'SENSITIVE VALUE NEVER HASHED', account: 'not a schema field',
  fields: [
    { name: 'title', type: 'text', value: 'SENSITIVE VALUE NEVER HASHED', id: ':r-1234:', label: 'Titel' },
    { name: 'priceType', type: 'hidden', value: 'FIXED', label: 'Preisart' }
  ],
  dynamicAttributes: [
    { key: 'wearables.bluetooth', controlType: 'checkbox', requiredState: 'optional', technicalValue: true, label: 'Bluetooth' },
    { key: 'wearables.case_size', controlType: 'select', requiredState: 'required', technicalValue: '44', displayValue: '44mm',
      options: [{ value: '44', label: '44mm' }, { value: '46', label: '46mm' }] }
  ]
});
(async () => {
  await check('stable category-scoped SHA-256 for semantically equivalent reordered/localized forms', async () => {
    const a = base(), b = base();
    b.categoryPath = ['Electronics', 'Wearables', 'Smart Watches'];
    b.fields.reverse(); b.dynamicAttributes.reverse();
    b.dynamicAttributes[0].options.reverse();
    b.fields[0].label = 'Preisart neu'; b.fields[0].id = ':r-999:';
    b.dynamicAttributes[0].displayValue = '46 Millimeter';
    b.dynamicAttributes[0].technicalValue = '46'; // A saved value never affects the schema
    assert.deepEqual(Schema.buildSchema(a).fields, Schema.buildSchema(b).fields);
    const actual = await Schema.fingerprint(Schema.buildSchema(a), webcrypto);
    assert.match(actual, /^[a-f0-9]{64}$/);
    assert.equal(actual, await Schema.fingerprint(Schema.buildSchema(b), webcrypto));
    assert.equal(Schema.diff(Schema.buildSchema(a), Schema.buildSchema(b)).status, 'schema-identical');
    const bytes = JSON.stringify({ schemaVersion: 1, algorithm: 'SHA-256', categoryId: '405', fields: Schema.buildSchema(a).fields });
    assert.equal(actual, createHash('sha256').update(bytes).digest('hex'));
  });
  await check('never serializes account, title, saved value, localized options or transient DOM IDs', () => {
    const out = JSON.stringify(Schema.buildSchema(base()));
    for (const forbidden of ['SENSITIVE VALUE', 'not a schema field', ':r-1234:', '44mm', '46mm', '"technicalValue"', '"displayValue"']) {
      assert.ok(!out.includes(forbidden), 'Leaked ' + forbidden);
    }
    assert.ok(out.includes('"optionValues":["44","46"]'), 'platform technical option identifiers are retained');
  });
  await check('only independently verified category path is retained as optional non-hashed metadata', async () => {
    const x = base(); x.categoryPathVerified = false;
    const snap = Schema.buildSchema(x);
    assert.equal(snap.verifiedCategoryPath, null);
    assert.equal(await Schema.fingerprint(snap, webcrypto), await Schema.fingerprint(Schema.buildSchema(base()), webcrypto));
  });
  await check('renamed technical key creates a field-added and field-removed diff', () => {
    const x = base(), y = base();
    x.dynamicAttributes[1].key = 'wearables.gehausegrosse';
    const d = Schema.diff(Schema.buildSchema(x), Schema.buildSchema(y));
    assert.equal(d.status, 'schema-changed');
    assert.deepEqual(d.changes.filter(c => c.type === 'field-removed').map(c => c.key),
      ['attribute:wearables.gehausegrosse']);
    assert.deepEqual(d.changes.filter(c => c.type === 'field-added').map(c => c.key),
      ['attribute:wearables.case_size']);
    assert.equal(d.compatible, null, 'key similarities alone never authorize migration');
  });
  await check('checkbox versus hidden-backed control is a control-kind change', () => {
    const x = base(), y = base(); y.dynamicAttributes[0].controlType = 'hidden';
    assert.ok(Schema.diff(Schema.buildSchema(x), Schema.buildSchema(y)).changes
      .some(x => x.type === 'control-kind-changed' && x.key === 'attribute:wearables.bluetooth'));
  });
  await check('proven technical option set changed, labels do not matter', () => {
    const x = base(), y = base(); y.dynamicAttributes[1].options.push({ value: '48', label: '48 mm' });
    assert.equal(Schema.diff(Schema.buildSchema(x), Schema.buildSchema(y)).changes[0].type, 'valid-options-changed');
    const z = base(); z.dynamicAttributes[1].options[0].label = '44 Millimeter';
    assert.equal(Schema.diff(Schema.buildSchema(x), Schema.buildSchema(z)).changes.length, 0);
  });
  await check('provably changed requiredness versus uncertain requiredness', () => {
    const x = base(), y = base();
    y.dynamicAttributes[0].requiredState = 'required';
    assert.ok(Schema.diff(Schema.buildSchema(x), Schema.buildSchema(y)).changes.some(c => c.type === 'requiredness-changed'));
    y.dynamicAttributes[0].requiredState = 'unknown';
    assert.ok(Schema.diff(Schema.buildSchema(x), Schema.buildSchema(y)).changes.some(c => c.type === 'requiredness-uncertain'));
  });
  await check('new empty optional field is classified, not falsely declared blocking', () => {
    const x = base(), y = base();
    y.dynamicAttributes.push({ key: 'wearables.ekg', controlType: 'checkbox', requiredState: 'optional', technicalValue: false });
    const d = Schema.diff(Schema.buildSchema(x), Schema.buildSchema(y));
    assert.equal(d.changes[0].type, 'field-added');
    assert.equal(d.compatible, null, 'compatibility requires separate exact value verification');
  });
  await check('unopened custom select options are unknown, not an empty complete set', () => {
    const x = base(), y = base();
    x.dynamicAttributes[1].controlType = 'combobox'; x.dynamicAttributes[1].options = [];
    y.dynamicAttributes[1].controlType = 'combobox'; y.dynamicAttributes[1].optionsComplete = true;
    y.dynamicAttributes[1].options = [{ value: '44' }];
    assert.equal(Schema.buildSchema(x).fields.find(f => f.key.endsWith('case_size')).optionValues, null);
    assert.ok(Schema.diff(Schema.buildSchema(x), Schema.buildSchema(y)).changes.some(c => c.type === 'option-evidence-uncertain'));
  });
  await check('legacy unversioned snapshot has explicit unknown compatibility', () => {
    const d = Schema.diff(null, Schema.buildSchema(base()));
    assert.deepEqual(d, { status: 'legacy-unversioned', changes: [], compatible: null });
  });
  await check('category mismatch is categorically incompatible', () => {
    const x = base(), y = base(); y.categoryId = 406;
    assert.equal(Schema.diff(Schema.buildSchema(x), Schema.buildSchema(y)).status, 'category-mismatch');
    assert.equal(Schema.diff(Schema.buildSchema(x), Schema.buildSchema(y)).compatible, false);
  });
  await check('rejects invalid category, duplicate keys, duplicate options and absent crypto', async () => {
    for (const categoryId of ['', '405x', '0', null]) {
      const x = base(); x.categoryId = categoryId;
      assert.throws(() => Schema.buildSchema(x), /category ID/);
    }
    const x = base(); x.dynamicAttributes.push({ ...x.dynamicAttributes[0] });
    assert.throws(() => Schema.buildSchema(x), /Duplicate technical form field key/);
    const y = base(); y.dynamicAttributes[1].options.push({ value: '44', label: 'duplicate' });
    assert.throws(() => Schema.buildSchema(y), /Duplicate technical option/);
    await assert.rejects(Schema.fingerprint(Schema.buildSchema(base()), {}), /SHA-256 is unavailable/);
  });
  await check('unknown archive schema version fails closed', () => {
    const snap = Schema.buildSchema(base());
    assert.throws(() => Schema.diff({ ...snap, schemaVersion: 999 }, snap), /Incompatible form schema/);
  });

  // KAR-134 Wave K: three-stage monitoring requires evidence-sensitive F1/F2
  // contracts. These fixtures never contain real listing or account values.
  const baseNeutral = () => ({
    formMode: 'posting-create', ready: true, categorySelected: false, categoryChooser: 'button',
    fields: [
      {name:'title',controlType:'text',visible:true,requiredState:'required',value:'SECRET AD TITLE'},
      {name:'description',controlType:'textarea',visible:true,value:'SECRET DESCRIPTION'},
      {name:'priceAmount',controlType:'number',visible:true,value:'9999'},
      {name:'categoryId',controlType:'hidden',visible:false,value:'405'},
      {name:'csrfToken',controlType:'hidden',visible:false,value:'SECRET_TOKEN'}
    ]
  });
  const categoryObserved = () => ({
    categoryId:'405', leafConfirmed:true, observedPath:true, levels:[
      {label:'Elektronik',technicalId:'12',kind:'branch'},
      {label:'Wearables',technicalId:'102',kind:'branch'},
      {label:'Smartwatches',technicalId:'405',kind:'leaf'}
    ]
  });
  await check('F1 hashes category-neutral visible controls without values or category selections',async()=>{
    const a=baseNeutral(),b=baseNeutral();
    b.fields.reverse(); b.fields[0].value='ANOTHER PRIVATE VALUE';
    b.fields.find(x=>x.name==='title').value='DIFFERENT SECRET';
    const x=Schema.buildBaseSchema(a),y=Schema.buildBaseSchema(b);
    assert.deepEqual(x.fields,y.fields);
    assert.equal((await Schema.baseFingerprint(x,webcrypto)),await Schema.baseFingerprint(y,webcrypto));
    assert.match(await Schema.baseFingerprint(x,webcrypto),/^[a-f0-9]{64}$/);
    assert.equal(Schema.diffBaseSchemas(x,y).status,'base-identical');
    const serialized=JSON.stringify(x);
    for(const secret of ['SECRET','9999','categoryId','csrfToken']) assert.ok(!serialized.includes(secret));
  });
  await check('F1 detects changed visible field control or absent category chooser',()=>{
    const a=Schema.buildBaseSchema(baseNeutral()),b=baseNeutral();
    b.fields.find(x=>x.name==='priceAmount').controlType='text';
    const diff=Schema.diffBaseSchemas(a,Schema.buildBaseSchema(b));
    assert.equal(diff.status,'base-changed');
    assert.ok(diff.changes.some(x=>x.type==='control-kind-changed'&&x.key==='field:priceAmount'));
    const c=baseNeutral();c.categoryChooser='missing';
    assert.ok(Schema.diffBaseSchemas(a,Schema.buildBaseSchema(c)).changes.some(x=>x.type==='category-chooser-changed'));
  });
  await check('F1 never approves incomplete, category-selected or cross-mode observations',()=>{
    for(const change of [{ready:false},{categorySelected:true},{formMode:'posting-edit'}]){
      const b={...baseNeutral(),...change};
      if(change.formMode) assert.equal(Schema.diffBaseSchemas(
        Schema.buildBaseSchema(baseNeutral()),Schema.buildBaseSchema(b)).status,'base-not-comparable');
      else assert.throws(()=>Schema.buildBaseSchema(b),/category-neutral|settled/);
    }
    const a=baseNeutral();a.fields.push({...a.fields[0]});
    assert.throws(()=>Schema.buildBaseSchema(a),/Duplicate/);
  });
  await check('F1 missing baseline is unknown, never identical',()=>{
    const current=Schema.buildBaseSchema(baseNeutral());
    const diff=Schema.diffBaseSchemas(null,current);
    assert.equal(diff.status,'baseline-missing');assert.equal(diff.compatible,null);
  });
  await check('F2 fingerprint is stable across label localization, order-irrelevant metadata and values',async()=>{
    const a=Schema.buildCategorySchema(categoryObserved()),b=categoryObserved();
    b.levels[0].label='Electronics';b.levels[2].label='Smart Watches';b.title='SECRET AD';
    const other=Schema.buildCategorySchema(b);
    assert.equal(await Schema.categoryFingerprint(a,webcrypto),await Schema.categoryFingerprint(other,webcrypto));
    assert.equal(Schema.diffCategorySchemas(a,other).status,'category-identical');
    assert.ok(!JSON.stringify(a).includes('SECRET AD'));
  });
  await check('F2 different verified parent ID is provable category drift even with same leaf ID',()=>{
    const a=Schema.buildCategorySchema(categoryObserved()),b=categoryObserved();
    b.levels[1].technicalId='103';
    const d=Schema.diffCategorySchemas(a,Schema.buildCategorySchema(b));
    assert.equal(d.status,'category-changed');
    assert.ok(d.changes.some(c=>c.type==='ancestor-id-changed'));
    assert.equal(d.compatible,false);
  });
  await check('F2 changed path depth is detected only from fully observed navigation',()=>{
    const a=Schema.buildCategorySchema(categoryObserved()),b=categoryObserved();
    b.levels.splice(1,1);
    assert.equal(Schema.diffCategorySchemas(a,Schema.buildCategorySchema(b)).status,'category-changed');
    const incomplete={...categoryObserved(),observedPath:false};
    assert.equal(Schema.diffCategorySchemas(a,Schema.buildCategorySchema(incomplete)).status,'category-not-verified');
  });
  await check('F2 label-only ancestor identity remains evidence-limited, never claimed unchanged',async()=>{
    const a=categoryObserved(),b=categoryObserved();
    a.levels[0].technicalId=null; a.levels[1].technicalId=null;
    b.levels[0].technicalId=null; b.levels[1].technicalId=null;
    b.levels[1].label='Wearables und mehr';
    const x=Schema.buildCategorySchema(a),y=Schema.buildCategorySchema(b);
    assert.equal(await Schema.categoryFingerprint(x,webcrypto),await Schema.categoryFingerprint(y,webcrypto));
    assert.equal(Schema.diffCategorySchemas(x,x).status,'category-partially-verified');
    const drift=Schema.diffCategorySchemas(x,y);
    assert.equal(drift.status,'category-evidence-uncertain');
    assert.equal(drift.compatible,null);
    assert.ok(drift.changes.some(c=>c.type==='unverified-path-label-changed'));
  });
  await check('F2 never invents leaf/category IDs or silently accepts malformed path observations',()=>{
    const a=categoryObserved();a.levels[2].technicalId='999';
    assert.throws(()=>Schema.buildCategorySchema(a),/leaf|category ID/);
    const b=categoryObserved();b.levels[0].technicalId='not-numeric';
    assert.throws(()=>Schema.buildCategorySchema(b),/technical category ID/);
    const c=categoryObserved();c.leafConfirmed=false;
    assert.equal(Schema.diffCategorySchemas(null,Schema.buildCategorySchema(c)).status,'baseline-missing');
    assert.equal(Schema.diffCategorySchemas(Schema.buildCategorySchema(categoryObserved()),Schema.buildCategorySchema(c)).status,'category-not-verified');
  });
  console.log(passed + '/22 PASS KAR-134 schema core');

})().catch(error => { console.error(error); process.exitCode = 1; });
