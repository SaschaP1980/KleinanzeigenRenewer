'use strict';
// KAR-201 isolated MV3-style session test: synthetic data only, no live account.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
require('../src/shared/runtime-deps.js');
const Service = require('../src/background/services/template-fill-service.js');
const publishSource = fs.readFileSync(require.resolve('../src/content/template-publish-flow.js'), 'utf8');
const controllerSource = fs.readFileSync(require.resolve('../src/background/controllers/template-fill-controller.js'), 'utf8');
const start = controllerSource.indexOf('async function updateTemplateFillSession(');
const end = controllerSource.indexOf('async function terminalizeTemplateFillOnPlatformError(', start);
assert.ok(start > 0 && end > start, 'actual controller mutation function must remain reachable');

function makeStorage() {
  const map = new Map();
  return {
    map,
    async get(key) { return { [key]: map.get(key) }; },
    async set(values) { for (const [key,value] of Object.entries(values)) map.set(key,value); }
  };
}
function harness() {
  const local = makeStorage();
  const api = Service.create({
    storageLocal: local, getInventory: async id => ({
      inventoryId:id,adId:'synthetic',category:{id:246},title:'Fixture',
      description:'Fixture',dynamicAttributes:[],images:[]
    })
  });
  const sessions = {};
  const context = {
    withTemplateFillMutation: api.withTemplateFillMutation,
    readFillSessions: api.readFillSessions,
    writeFillSessions: api.writeFillSessions,
    TERMINAL_TEMPLATE_FILL_STATUSES: api.TERMINAL_TEMPLATE_FILL_STATUSES,
    isTransientTemplateFillProgress: api.isTransientTemplateFillProgress,
    templateFillProgressSnapshot: api.templateFillProgressSnapshot,
    evictTemplateImageTransfersForFill: api.evictTemplateImageTransfersForFill,
    broadcastInventoryChanged: () => {},
    logDiagnostic: async () => {},
    sessionCorrelationContext: () => ({}),
    Date, Object, Array, Set, Map, Promise, String, Number, Boolean
  };
  const update = vm.runInNewContext(controllerSource.slice(start,end) + '\nupdateTemplateFillSession;', context,
    { filename:'kar201-real-fill-controller.js' });
  async function reset() {
    const session = { fillId:'synthetic-fill', targetTabId:42, status:'running', stage:'form-ready',
      createdAt:new Date().toISOString(), inventoryId:'synthetic-inventory', templateOnly:false };
    sessions[session.fillId] = session;
    await local.set({ templateFillSessions:sessions });
    return session;
  }
  return { update, api, local, reset };
}
const gateSource=publishSource.slice(publishSource.indexOf('  function verifiedPublishGate('),
  publishSource.indexOf('  function verifiedSessionResult('));
assert.ok(gateSource.includes('proof?.verified === true'));
const verifiedPublishGate=vm.runInNewContext(gateSource+'\nverifiedPublishGate;', {Boolean,String,RegExp});

(async () => {
  const env = harness();
  const session = await env.reset();
  const proof = {
    verified:false, categoryId:'246', sourceFingerprint:null,
    currentFingerprint:'a'.repeat(64),
    comparisonStatus:'legacy-unversioned',
    valueCompatibility:'unverified',
    valueEvidence:[
      { key:'dekoration.color',status:'unverified',reason:'technical-options-unknown',
        controlKind:'combobox', optionSource:'unknown',optionCount:0 },
      { key:'dekoration.material',status:'incompatible',reason:'technical-value-not-offered',
        controlKind:'combobox',optionSource:'structured',optionCount:2 }
    ]
  };
  const msg={fillId:session.fillId,status:'needs-review',stage:'verified',
    result:{complete:false,issues:['Unconfirmed synthetic selections'],schemaPreflight:proof}};
  await env.update(msg,{tab:{id:42}});
  const persisted = (await env.api.readFillSessions())[session.fillId];
  assert.equal(persisted.status,'needs-review');
  assert.equal(persisted.result.schemaPreflight.verified,false);
  assert.equal(persisted.result.schemaPreflight.comparisonStatus,'legacy-unversioned');
  assert.equal(persisted.result.schemaPreflight.valueCompatibility,'unverified');
  assert.equal(persisted.result.schemaPreflight.valueEvidence.length,2);
  assert.equal(verifiedPublishGate({...persisted,renewalId:'synthetic-renewal'}),false);
  console.log('PASS KAR-201: failed session retains exact per-field proof without publish authority');

  const fresh = harness();const source=await fresh.reset();
  await fresh.update({...msg,result:{...msg.result,schemaPreflight:{
    ...proof, valueEvidence:[{key:'private/token-or-url',status:'unverified',reason:'UNKNOWN',
      optionCount:999999,extra:'secret'}],currentFingerprint:'INVALID'
  }}},{tab:{id:42}});
  const sanitized=(await fresh.api.readFillSessions())[source.fillId].result.schemaPreflight;
  assert.equal(sanitized.currentFingerprint,null);
  assert.equal(sanitized.valueEvidence[0].key,'unknown');
  assert.equal(sanitized.valueEvidence[0].reason,'unknown');
  assert.equal(sanitized.valueEvidence[0].optionCount,null);
  assert.equal(JSON.stringify(sanitized).includes('secret'),false);
  assert.equal(verifiedPublishGate({...source,renewalId:'synthetic',result:{complete:true,issues:[],schemaPreflight:sanitized}}),false);
  console.log('PASS KAR-201: invalid values and non-authoritative proof fail closed');

  const good=harness();const saved=await good.reset();
  await good.update({fillId:saved.fillId,status:'running',stage:'form-verified',
    result:{complete:true,issues:[],schemaPreflight:{
      verified:true,categoryId:'246',currentFingerprint:'b'.repeat(64),sourceFingerprint:null
    }}},{tab:{id:42}});
  const confirmed=(await good.api.readFillSessions())[saved.fillId];
  assert.equal(confirmed.result.schemaPreflight.verified,true);
  assert.equal(verifiedPublishGate({...confirmed,renewalId:'synthetic-renewal'}),true);
  console.log('PASS KAR-201: proven form-verified flow retains established publish gate');

  const forged=harness(); const old=await forged.reset();
  await forged.update({fillId:old.fillId,status:'needs-review',stage:'verified',
    result:{complete:false,issues:['Unconfirmed'],schemaPreflight:{
      verified:true,categoryId:'246',currentFingerprint:'c'.repeat(64)
    }}},{tab:{id:42}});
  const rejected=(await forged.api.readFillSessions())[old.fillId];
  assert.equal(rejected.result.schemaPreflight,null);
  assert.equal(verifiedPublishGate({...rejected,renewalId:'synthetic-renewal'}),false);
  console.log('PASS KAR-201: spoofed verified report on failed Fill never escalates');
})().catch(error=>{console.error(error);process.exitCode=1;});
