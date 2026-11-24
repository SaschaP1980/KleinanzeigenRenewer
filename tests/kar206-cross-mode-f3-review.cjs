'use strict';
// KAR-206: independent live F3 evidence must not confuse edit-form capture
// with posting-create representation. Synthetic fixtures; no site or account.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../src/content/template-filler.js'), 'utf8');
const start = source.indexOf('  // KAR-206: the archived F3 fingerprint') >= 0
  ? source.indexOf('  // KAR-206: the archived F3 fingerprint')
  : source.indexOf('  // Real F1/F2/F3 review is part of the ordinary authenticated posting');
const end = source.indexOf('  async function runFillSession(', start);
assert.ok(start > 0 && end > start, 'Review must remain in the real posting flow');
const section = source.slice(start, end);
const hash = 'a'.repeat(64);
const stable = () => ({status:'unchanged', previousFingerprint:hash,
  currentFingerprint:hash, changes:[]});
const validDiff = () => ([
  {type:'control-kind-changed',key:'attribute:synthetic.choice',
    before:'button',after:'combobox'},
  {type:'requiredness-uncertain',key:'attribute:synthetic.choice',
    before:'unknown',after:'required'},
  {type:'valid-options-changed',key:'field:adType',before:['OFFER'],after:['OFFER','WANTED']},
  {type:'valid-options-changed',key:'field:buyNow',before:[],after:['false','true']}
]);
// Reproduce the exact STRUCTURAL shape of the owner's v1.25.25 diagnosis.
// Attribute keys and conversion types only, never a private listing payload.
const observedCategory22Diff = () => ([
  ...['altersgruppe','art','color','eigenschaften','groesse','material','type']
    .map(key => ({type:'control-kind-changed',
      key:'attribute:baby_kinderkleidung.'+key,before:'button',after:'combobox'})),
  {type:'control-kind-changed',key:'attribute:baby_kinderkleidung.brand',
    before:'text',after:'combobox'},
  {type:'control-kind-changed',key:'attribute:baby_kinderkleidung.condition',
    before:'button',after:'hidden'},
  ...['art','groesse','type'].map(key=>({type:'requiredness-uncertain',
    key:'attribute:baby_kinderkleidung.'+key,before:'unknown',after:'required'})),
  {type:'valid-options-changed',key:'field:adType',
    before:['OFFER'],after:['OFFER','WANTED']},
  {type:'valid-options-changed',key:'field:buyNow',
    before:[],after:['false','true']}
]);
const category22Attrs = () => ([
  {key:'baby_kinderkleidung.brand',status:'empty',technicalValue:'',
    displayValue:'Bitte wählen'},
  {key:'baby_kinderkleidung.condition',status:'captured',
    technicalValue:'synthetic-condition-id',displayValue:'Synthetic condition'}
]);
const category22Values = () => ([
  {key:'baby_kinderkleidung.condition',status:'unverified',
    reason:'technical-options-unknown'},
  {key:'baby_kinderkleidung.groesse',status:'confirmed',
    reason:'already-selected-exact-readback'}
]);
async function evaluate({sourceKind='edit-form', stagePatch={}, reportPatch={},
    changes=validDiff(), categoryId='22',
    attributes=category22Attrs(), valueEvidence=category22Values()} = {}) {
  const events = [], transitions = [];
  let reviewCount = 0;
  const deps = {
    buildStageChangeReview:stages => ({
      hasProvenChange:stages.attributes?.status==='changed',
      hasUncertainty:true,
      sections:[{stage:'attributes',verified:stages.attributes?.status==='changed'}]
    }),
    buildRealSchemaAdoptionPlan:()=>({eligible:false}),
    runtimeMessage:async message => {
      transitions.push(message.stage || 'other');
      return {status:message.status,stage:message.stage};
    },
    updatePanel:()=>{},
    diagnostic:async(_fillId,event,data)=>{events.push({event,data});},
    showStageChangeReviewDialog:(_review,actions)=>{
      reviewCount += 1;
      actions.onDefer();
    },
    SchemaPreflight:{afterHydration:async()=>{throw Error('Unexpected live recheck');},
      evaluate:async()=>{throw Error('Unexpected live recheck');}},
    SchemaCore:{fingerprint:async()=>hash},
    pageKind:()=> 'target',
    resolveActivePostingForm:()=>null,
    stagedCategoryPathEvidence:null
  };
  const review = new Function('deps','with(deps) { '+section+
    '\nreturn reviewLivePostingSchema; }')(deps);
  const stages = {
    base:stable(),category:{...stable(),status:'not-fully-verified'},
    attributes:stable(),...stagePatch
  };
  const report = {
    complete:true,issues:[],valueCompatibility:'unverified',
    sourceFingerprint:'b'.repeat(64),currentFingerprint:hash,
    comparison:{status:'schema-changed',changes},
    valueEvidence,
    ...reportPatch
  };
  const session = {fillId:'synthetic-206',
    template:{categoryId,dynamicAttributes:attributes,templateSchema:{source:sourceKind,
      snapshot:{categoryId,fields:[
        {key:'attribute:baby_kinderkleidung.brand',kind:'text',requiredState:'unknown',optionValues:null},
        {key:'attribute:baby_kinderkleidung.condition',kind:'button',requiredState:'unknown',optionValues:null}
      ]},fingerprint:'b'.repeat(64)}}};
  const observed = {
    base:{stage:'base',formMode:'posting-create'},
    category:{stage:'category',categoryId,
      leafConfirmed:true,observedPath:true,evidence:'partial-ids',
      levels:[{technicalId:null},{technicalId:categoryId}]},
    attributes:{categoryId,fields:[{key:'attribute:synthetic.choice'}]}
  };
  const allowed = await review(session,observed,stages,report);
  return {allowed,reviewCount,events,transitions};
}
test('verified edit capture with same independent F1/F2/F3 live reference proceeds to actual fill and readback',async()=>{
  const r=await evaluate();
  assert.equal(r.allowed,true,'cross-mode representational differences are not proven live drift');
  assert.equal(r.reviewCount,0,'do not block core re-insertion for unrelated edit/create differences');
  assert.ok(r.events.some(x=>x.event==='KAR206_CROSS_MODE_SCHEMA_NONCOMPARABLE'),
    'record narrowly scoped privacy-safe reason');
  assert.equal(r.transitions.includes('schema-reference-review-pending'),false);
});
test('native v1.25.25 category-22 fourteen schema-mode differences resume verified fill',async()=>{
  const changes=observedCategory22Diff();
  assert.equal(changes.length,14);
  assert.equal(changes.filter(x=>x.type==='control-kind-changed').length,9);
  assert.equal(changes.filter(x=>x.type==='requiredness-uncertain').length,3);
  const r=await evaluate({changes});
  assert.equal(r.allowed,true,'a stable create-form F3 may not be blocked by known edit/create differences');
  assert.equal(r.reviewCount,0,'no artificial F3 modal on the real 14-change pattern');
  assert.ok(r.events.some(x=>x.event==='KAR206_CROSS_MODE_SCHEMA_NONCOMPARABLE'));
  assert.equal(r.transitions.includes('schema-reference-review-pending'),false);
});
test('category-22 exceptional fields need exact trusted source semantics',async()=>{
  const changes=observedCategory22Diff();
  const brand='baby_kinderkleidung.brand',condition='baby_kinderkleidung.condition';
  const scenarios=[
    {attributes:category22Attrs().filter(x=>x.key!==brand)},
    {attributes:category22Attrs().map(x=>x.key===brand?{...x,status:'captured'}:x)},
    {attributes:category22Attrs().map(x=>x.key===brand?{...x,displayValue:'Synthetic brand'}:x)},
    {attributes:category22Attrs().map(x=>x.key===brand?{...x,technicalValue:'brand-technical'}:x)},
    {attributes:category22Attrs().filter(x=>x.key!==condition)},
    {attributes:category22Attrs().map(x=>x.key===condition?{...x,status:'empty'}:x)},
    {attributes:category22Attrs().map(x=>x.key===condition?{...x,technicalValue:''}:x)},
    {valueEvidence:category22Values().filter(x=>x.key!==condition)},
    {valueEvidence:category22Values().map(x=>x.key===condition?{...x,status:'incompatible'}:x)}
  ];
  for(const scenario of scenarios) {
    const r=await evaluate({changes,...scenario});
    assert.equal(r.allowed,false,JSON.stringify(scenario));
    assert.equal(r.reviewCount,1);
  }
});
test('new conversion shapes are accepted only for the observed category 22 field identities',async()=>{
  const changes=observedCategory22Diff();
  const cases=[
    changes.map(x=>x.key==='attribute:baby_kinderkleidung.brand'
      ?{...x,key:'attribute:unrelated.brand'}:x),
    changes.map(x=>x.key==='attribute:baby_kinderkleidung.condition'
      ?{...x,key:'attribute:unrelated.condition'}:x),
    changes.map(x=>x.key==='attribute:baby_kinderkleidung.condition'
      ?{...x,after:'checkbox'}:x),
    changes.map(x=>x.key==='attribute:baby_kinderkleidung.brand'
      ?{...x,before:'hidden'}:x)
  ];
  for(const diff of cases){
    const r=await evaluate({changes:diff});
    assert.equal(r.allowed,false,JSON.stringify(diff));
    assert.equal(r.reviewCount,1);
  }
  const otherCategory=await evaluate({changes,categoryId:'405'});
  assert.equal(otherCategory.allowed,false,'category specific evidence cannot migrate to other numeric category');
});
test('current live F3 drift or incompatible saved selection still blocks the 14-change fixture',async()=>{
  const changes=observedCategory22Diff();
  const changed=await evaluate({changes,stagePatch:{attributes:{...stable(),status:'changed',
    currentFingerprint:'f'.repeat(64),changes:[{type:'field-added'}]}}});
  assert.equal(changed.allowed,false);
  assert.equal(changed.reviewCount,1);
  const incompatible=await evaluate({changes,reportPatch:{valueCompatibility:'incompatible'}});
  assert.equal(incompatible.allowed,false);
  assert.equal(incompatible.reviewCount,1);
  const invalid=await evaluate({changes,reportPatch:{complete:false,issues:['required field missing']}});
  assert.equal(invalid.allowed,false);
  assert.equal(invalid.reviewCount,1);
});
test('a truly different F3 current form still requires review',async()=>{
  const r=await evaluate({stagePatch:{attributes:{...stable(),status:'changed',
    currentFingerprint:'d'.repeat(64),changes:validDiff()}}});
  assert.equal(r.allowed,false);
  assert.equal(r.reviewCount,1);
});
test('legacy, public or unknown archive source cannot use edit-mode exception',async()=>{
  for (const sourceKind of ['public-detail',null,'unverified','']){
    const r=await evaluate({sourceKind});
    assert.equal(r.allowed,false,String(sourceKind));
    assert.equal(r.reviewCount,1);
  }
});
test('unknown or changed F1/F2/F3 references cannot be treated as stable',async()=>{
  const cases=[
    {base:{...stable(),status:'reference-created'}},
    {base:{...stable(),currentFingerprint:'d'.repeat(64)}},
    {category:{...stable(),status:'changed'}},
    {category:{...stable(),status:'not-fully-verified',changes:[{type:'category-changed'}]}},
    {attributes:{...stable(),status:'reference-created'}},
    {attributes:{...stable(),currentFingerprint:'d'.repeat(64)}}
  ];
  for (const stagePatch of cases){
    const r=await evaluate({stagePatch});
    assert.equal(r.allowed,false,JSON.stringify(stagePatch));
    assert.equal(r.reviewCount,1);
  }
});
test('preflight issue, invalid evidence or changed source category keeps review',async()=>{
  const cases=[
    {complete:false,issues:['selected source value missing']},
    {complete:true,issues:['missing required attribute']},
    {complete:true,valueCompatibility:'incompatible'},
    {complete:true,sourceFingerprint:null},
    {complete:true,currentFingerprint:'not-a-hash'}
  ];
  for (const reportPatch of cases) {
    const r=await evaluate({reportPatch});
    assert.equal(r.allowed,false,JSON.stringify(reportPatch));
    assert.equal(r.reviewCount,1);
  }
});
test('genuine structural additions/removals and unproven control conversions keep review',async()=>{
  const cases=[
    [{type:'field-removed',key:'attribute:synthetic.choice'}],
    [{type:'field-added',key:'attribute:synthetic.new'}],
    [{type:'control-kind-changed',key:'attribute:synthetic.choice',before:'checkbox',after:'combobox'}],
    [{type:'control-kind-changed',key:'attribute:synthetic.choice',before:'button',after:'text'}],
    [{type:'requiredness-changed',key:'attribute:synthetic.choice',before:'optional',after:'required'}],
    [{type:'valid-options-changed',key:'attribute:synthetic.choice',before:['A'],after:['B']}],
    [{type:'requiredness-uncertain',key:'attribute:synthetic.choice',before:'optional',after:'unknown'}]
  ];
  for (const changes of cases) {
    const r=await evaluate({changes});
    assert.equal(r.allowed,false,JSON.stringify(changes));
    assert.equal(r.reviewCount,1);
  }
});
test('review stays before dynamic filling, image upload, pre-publish gate and native publish',()=>{
  const fill=source.slice(source.indexOf('  async function runFillSession('),
    source.indexOf('  async function runPendingFill('));
  assert.ok(fill.indexOf('await reviewLivePostingSchema(')>0);
  assert.ok(fill.indexOf('await reviewLivePostingSchema(')<fill.indexOf('fillDynamicAttributes('));
  assert.match(fill,/SchemaPreflight\.verifyAfterFill\(/);
  assert.match(fill,/verifyArchiveTemplate\(/);
  assert.match(fill,/persistedSchemaPreflight\(/);
  assert.match(fill,/advanceAfterVerifiedFill\(/);
  assert.doesNotMatch(section,/\.submit\s*\(|requestSubmit\s*\(/);
});
