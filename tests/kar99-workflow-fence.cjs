// KAR-99 test-first: admission, persistence, fail-closed restart and races.
'use strict';
const assert = require('node:assert/strict');
const Fence = require('../src/background/services/update-workflow-fence.js');
const Router = require('../src/background/background-message-router.js');
const Policy = require('../lib/update-idle-policy.js');
let checks=0;
function pass(message){ checks++;console.log('PASS KAR99 '+message); }
const clock=()=>100000;
const profile='profile-one', generation='worker-one';
const snapshot=()=>({
  schema:1, workerGeneration:generation, profileId:profile, observedAtMs:99999,
  owners:Object.fromEntries(Policy.requiredOwners.map(k=>[k,{confirmed:true,state:'idle',workerGeneration:generation,profileId:profile,observedAtMs:99999}]))
});
function memory(){
  const records={};let failRead=false,failWrite=false;
  return {
    records, failRead(v){failRead=v}, failWrite(v){failWrite=v},
    async get(key){if(failRead)throw Error('disk unavailable');return Object.prototype.hasOwnProperty.call(records,key)?{[key]:structuredClone(records[key])}:{};},
    async set(patch){if(failWrite)throw Error('disk unavailable');Object.assign(records,structuredClone(patch));},
    async remove(key){delete records[key];}
  };
}
const init=(storage,overrides={})=>Fence.create({
  storageLocal:storage, policy:Policy, getOwnerSnapshot:async()=>snapshot(), clock,
  newToken:()=>('nonce-one-'+Math.random().toString(36).slice(2)), ...overrides
});
const reject=async(p,code,label)=>{await assert.rejects(p,e=>e.code===code,label);pass(label)};
(async()=>{
  const storage=memory(),gate=init(storage);
  assert.equal(await gate.withAdmission('START_TEMPLATE_FILL',async()=>42),42);pass('ordinary requests allowed absent lease');
  assert.equal((await gate.status()).state,'unlocked');pass('status unlocked and no apply operation');
  await reject(init(storage,{getOwnerSnapshot:null}).reserve({profileId:profile,workerGeneration:generation,transactionId:'tx1'}),'KR_UPDATE_FENCE_OWNER_UNAVAILABLE','requires trusted provider on missing observation');
  const missing=init(storage,{getOwnerSnapshot:async()=>null});
  await reject(missing.reserve({profileId:profile,workerGeneration:generation,transactionId:'tx1'}),'KR_UPDATE_FENCE_NOT_IDLE','missing owner observation fails closed');
  const active=init(storage,{getOwnerSnapshot:async()=>{let s=snapshot();s.owners.renewal.state='active';return s}});
  await reject(active.reserve({profileId:profile,workerGeneration:generation,transactionId:'tx1'}),'KR_UPDATE_FENCE_NOT_IDLE','active renewal prevents reservation');
  storage.failRead(true);
  await reject(gate.withAdmission('START_TEMPLATE_FILL',async()=>true),'KR_UPDATE_FENCE_STORAGE','storage read failure denies admission');
  storage.failRead(false);
  const one=await gate.reserve({profileId:profile,workerGeneration:generation,transactionId:'tx1'});
  assert.equal(one.state,'reserved');pass('reservation persisted only after complete idle');
  await reject(gate.withAdmission('START_TEMPLATE_FILL',async()=>true),'KR_UPDATE_FENCE_HELD','held lease blocks start');
  await reject(gate.withAdmission('SET_SELECTED_PROFILE',async()=>true),'KR_UPDATE_FENCE_HELD','held lease blocks profile switch');
  const otherWorker=init(storage,{getOwnerSnapshot:async()=>snapshot()});
  await reject(otherWorker.reserve({profileId:profile,workerGeneration:'worker-two',transactionId:'tx2'}),'KR_UPDATE_FENCE_HELD','second worker cannot steal lease');
  await reject(gate.cancel({token:'wrong',workerGeneration:generation,profileId:profile}),'KR_UPDATE_FENCE_OWNERSHIP','wrong token cannot clear lease');
  const rebooted=init(storage);
  await reject(rebooted.withAdmission('START_TEMPLATE_FILL',async()=>true),'KR_UPDATE_FENCE_HELD','restart preserves held fence');
  storage.records[Fence.STORAGE_KEY].expiresAtMs=99999;
  await reject(rebooted.withAdmission('START_TEMPLATE_FILL',async()=>true),'KR_UPDATE_FENCE_HELD','expired lease remains fail-closed');
  await reject(rebooted.cancel({token:one.token,workerGeneration:'other',profileId:profile}),'KR_UPDATE_FENCE_OWNERSHIP','restart generation mismatch cannot cancel');
  storage.records[Fence.STORAGE_KEY].expiresAtMs=110000;
  const cancellation=await rebooted.cancel({token:one.token,workerGeneration:generation,profileId:profile});
  assert.equal(cancellation.state,'cancelled');pass('matching owner cancels reservation to explicit tombstone');
  await reject(rebooted.withAdmission('START_TEMPLATE_FILL',async()=>true),'KR_UPDATE_FENCE_HELD','cancel tombstone still fenced awaiting recovery');
  await reject(rebooted.recover({profileId:'other',confirmed:true}),'KR_UPDATE_FENCE_OWNERSHIP','wrong profile cannot recover');
  assert.equal((await rebooted.recover({profileId:profile,confirmed:true})).state,'released');pass('explicit matching reviewed recovery releases fence');
  assert.equal(await rebooted.withAdmission('START_TEMPLATE_FILL',async()=>43),43);pass('normal route resumes only after confirmed recovery');
  const racing=memory();let startResolve;const waiting=new Promise(resolve=>startResolve=resolve);
  const rGate=init(racing);let began=false;
  const first=rGate.withAdmission('START_BULK_INVENTORY_OPERATION',async()=>{began=true;await waiting;return 'done';});
  while(!began)await Promise.resolve();
  const contender=rGate.reserve({profileId:profile,workerGeneration:generation,transactionId:'tx2'});
  startResolve();
  assert.equal(await first,'done');assert.equal((await contender).state,'reserved');pass('in-flight start completes before lease; no half-admission');
  const idle2=memory(),gate2=init(idle2);
  let admitted=false;const reservation=gate2.reserve({profileId:profile,workerGeneration:generation,transactionId:'tx3'});
  const after=gate2.withAdmission('START_BULK_INVENTORY_OPERATION',async()=>{admitted=true});
  await reservation;
  await reject(after,'KR_UPDATE_FENCE_HELD','simultaneous fence beats later start');
  assert.equal(admitted,false);
  const failure=memory();failure.failWrite(true);
  await reject(init(failure).reserve({profileId:profile,workerGeneration:generation,transactionId:'tx4'}),'KR_UPDATE_FENCE_STORAGE','storage write failure rejects reservation');
  assert.equal(typeof gate.apply,'undefined');pass('no native apply API');
  const registry={route(){return {action:'accept'}},errorFor(){return Error('bad')}};
  const safe=Router.create({MessageContractRegistry:registry,assertPlatformAccessAllowedForRequest:async()=>{},handlers:{
   START_TEMPLATE_FILL:async()=>5,GET_NATIVE_UPDATE_STATUS:async()=>7
  },withWorkflowAdmission:gate2.withAdmission});
  await reject(safe.dispatch({type:'START_TEMPLATE_FILL'},{}),'KR_UPDATE_FENCE_HELD','router denies mutations through fence');
  assert.equal(await safe.dispatch({type:'GET_NATIVE_UPDATE_STATUS'},{}),7);pass('read-only status remains available');
  console.log('PASS KAR99 '+checks+' focused checks');
})().catch(e=>{console.error(e);process.exitCode=1});
