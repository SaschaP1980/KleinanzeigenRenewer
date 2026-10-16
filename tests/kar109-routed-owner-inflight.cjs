// KAR-109 RED-first: routed messages must count every persisted owner
// for the entire duration of the *already centrally admitted* handler.
'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const Router = require('../src/background/background-message-router.js');
const Observer = require('../src/background/services/persisted-owner-observer.js');
const Fence = require('../src/background/services/update-workflow-fence.js');
const bg = fs.readFileSync('src/background/background.js','utf8');
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; console.log('PASS KAR109 '+message); }
function store() {
  const data = {};
  return {
    async get(keys) {
      const names = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(names.filter(key => Object.prototype.hasOwnProperty.call(data,key)).map(key => [key,structuredClone(data[key])]));
    },
    async set(record) { Object.assign(data,structuredClone(record)); },
    put(name,value) { data[name] = structuredClone(value); }
  };
}
async function main() {
  const match = bg.match(/function withRoutedAdmission\(type, task\)\s*\{[^{}]*\}/);
  check(Boolean(match),'background defines an independently inspectable routed admission bridge');
  check(/withWorkflowAdmission:\s*\(type, task\)\s*=>\s*withRoutedAdmission\(type, task\)/.test(bg),
    'every non-exempt routed message uses the bridge');
  check(/requireUpdateWorkflowFence\(\)\.withAdmission\(type,\s*\(\)\s*=>\s*requirePersistedOwnerObserver\(\)\.track\(PersistedOwnerObserver\.OWNERS, task\)\)/.test(match[0]),
    'existing central fence contains all-seven tracking inside one admitted callback');
  check(Observer.OWNERS.length===7 && new Set(Observer.OWNERS).size===7,
    'all seven persisted workflow owners are counted without duplicate names');
  const local=store(),session=store();
  const observer=Observer.create({storageLocal:local,storageSession:session,clock:()=>12000});
  const fence=Fence.create({storageLocal:local,clock:()=>12000,newToken:()=> '12345678901234567890'});
  let bridge=vm.runInNewContext('('+match[0]+')',{requireUpdateWorkflowFence:()=>fence,requirePersistedOwnerObserver:()=>observer,PersistedOwnerObserver:Observer});
  function createRouter(handler,type) {
    return Router.create({
      MessageContractRegistry:{route:()=>({action:'accept'}),errorFor:()=>new Error('contract')},
      assertPlatformAccessAllowedForRequest:async()=>{},
      withWorkflowAdmission:bridge,
      handlers:{[type]:handler}
    });
  }
  const routed=['START_BULK_INVENTORY_OPERATION','START_MASS_RENEWAL_BATCH','START_TEMPLATE_FILL',
    'START_ARCHIVE_INSERTION','RETRY_RENEWAL_VERIFICATION','DELETE_TRASH_ENTRY',
    'GET_MASS_RENEWAL_BATCH_STATUS','UPDATE_TEMPLATE_FILL_SESSION'];
  for (const route of routed) {
    let release,entered=false;
    const router=createRouter(()=>{entered=true;return new Promise(resolve=>{release=resolve;});},route);
    const pending=router.dispatch({type:route},{tab:{id:11}});
    for(let t=0;t<40&&!entered;t++) await new Promise(setImmediate);
    check(entered,route+' entered only through routed admission');
    check(Observer.OWNERS.every(name=>observer.snapshotInFlight()[name]===1),
      route+' holds all seven owner counters until handler settles');
    const observed=await observer.observe();
    check(Observer.OWNERS.every(name=>observed.observations[name].state==='active'),
      route+' remains positively active even with no persisted session');
    release('done'); assert.equal(await pending,'done');
    check(Observer.OWNERS.every(name=>observer.snapshotInFlight()[name]===0),
      route+' releases counters in finally');
  }
  const rejected=createRouter(async()=>{throw Error('handler rejected');},'START_TEMPLATE_FILL');
  await assert.rejects(rejected.dispatch({type:'START_TEMPLATE_FILL'},{}),/handler rejected/);
  check(Observer.OWNERS.every(name=>observer.snapshotInFlight()[name]===0),
    'failing routed handler releases every counter');
  local.put(Fence.STORAGE_KEY,{schema:1,state:'reserved',workerGeneration:'generation-A',profileId:'profile-A',
    transactionId:'transaction-A',token:'0123456789abcdef',createdAtMs:100,expiresAtMs:60000});
  let executed=false;
  const blocked=createRouter(()=>{executed=true;return 'unsafe';},'START_BULK_INVENTORY_OPERATION');
  await assert.rejects(blocked.dispatch({type:'START_BULK_INVENTORY_OPERATION'},{}),/KR_UPDATE_FENCE_HELD/);
  check(!executed && Observer.OWNERS.every(name=>observer.snapshotInFlight()[name]===0),
    'held update lease denies handler before any work/counter begins');
  let readInvoked=0;
  const publicRead=createRouter(()=>{readInvoked++;return 'read';},'GET_BACKGROUND_EPOCH');
  assert.equal(await publicRead.dispatch({type:'GET_BACKGROUND_EPOCH'},{}),'read');
  check(readInvoked===1 && Observer.OWNERS.every(name=>observer.snapshotInFlight()[name]===0),
    'existing unfenced harmless diagnostic route remains permitted');
  const absent=vm.runInNewContext('('+match[0]+')',{requireUpdateWorkflowFence:()=>Fence.create({storageLocal:store(),clock:()=>12000,newToken:()=> '12345678901234567890'}),
    requirePersistedOwnerObserver:()=>{throw Error('KR_UPDATE_OWNER_OBSERVER_UNAVAILABLE');},PersistedOwnerObserver:Observer});
  await assert.rejects(absent('START_TEMPLATE_FILL',()=>{throw Error('must not run');}),/KR_UPDATE_OWNER_OBSERVER_UNAVAILABLE/);
  check(true,'missing tracker fails closed rather than running routed work unobserved');
  check(!bg.includes('getOwnerSnapshot: () => requirePersistedOwnerObserver()'),
    'owner tracking is not mistaken for positive idle lease authority');
  console.log('PASS KAR109 total '+checks);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
