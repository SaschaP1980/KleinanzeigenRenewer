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
async function evaluate({sourceKind='edit-form', stagePatch={}, reportPatch={},
    changes=validDiff(), categoryId='22'} = {}) {
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
    ...reportPatch
  };
  const session = {fillId:'synthetic-206',
    template:{categoryId,templateSchema:{source:sourceKind, snapshot:{categoryId}, fingerprint:'b'.repeat(64)}}};
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
